/**
 * api-client.js — HTTP Client with Retry, Timeout, and Error Handling
 * =====================================================================
 * Centralised fetch wrapper for all API communication in the Trading
 * Analyzer application.
 *
 * Features:
 *  - Configurable request timeout via AbortController
 *  - Automatic retry with exponential back-off
 *  - CORS error detection (TypeError + no response)
 *  - HTTP 429 rate-limit detection
 *  - Automatic JSON / text response parsing
 *  - Request/response interceptor hooks
 *
 * Task ID: 2-a
 */

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

/**
 * Custom error for HTTP request failures with extra metadata.
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {object} options
   * @param {number}  [options.status]       — HTTP status code (0 if network error).
   * @param {string}  [options.statusText]   — HTTP status text.
   * @param {string}  [options.url]          — Request URL.
   * @param {'timeout'|'cors'|'rate_limit'|'network'|'http'|'parse'} [options.code]
   *   — Machine-readable error code.
   * @param {*}       [options.data]         — Parsed response body (if available).
   * @param {boolean} [options.retried]      — Whether this was the final retry attempt.
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.statusText = options.statusText ?? '';
    this.url = options.url ?? '';
    this.code = options.code ?? 'network';
    this.data = options.data ?? null;
    this.retried = options.retried ?? false;
  }
}

// ---------------------------------------------------------------------------
// Default Headers
// ---------------------------------------------------------------------------

const DEFAULT_HEADERS = Object.freeze({
  'Accept':       'application/json',
  'Content-Type': 'application/json',
});

// ---------------------------------------------------------------------------
// ApiClient
// ---------------------------------------------------------------------------

export class ApiClient {
  /**
   * @param {object} [options]
   * @param {number} [options.timeout=15000]   — Request timeout in ms.
   * @param {number} [options.retries=2]        — Number of retry attempts on failure.
   * @param {number} [options.retryDelay=1000]  — Base delay before retry (ms).
   * @param {object} [options.headers]          — Default headers to merge.
   */
  constructor(options = {}) {
    this.timeout    = options.timeout    ?? 15_000;
    this.retries    = options.retries    ?? 2;
    this.retryDelay = options.retryDelay ?? 1_000;
    this.defaultHeaders = { ...DEFAULT_HEADERS, ...options.headers };

    // Internal state
    this._lastCORS = false;
    this._lastRateLimit = false;
    this._requestInterceptors = [];
    this._responseInterceptors = [];
  }

  // -------------------------------------------------------------------------
  // Interceptors
  // -------------------------------------------------------------------------

  /**
   * Add a request interceptor.
   * @param {function(object): object} fn — Receives the RequestInit, returns modified RequestInit.
   * @returns {Function} Remove function.
   */
  addRequestInterceptor(fn) {
    this._requestInterceptors.push(fn);
    return () => {
      this._requestInterceptors = this._requestInterceptors.filter((f) => f !== fn);
    };
  }

  /**
   * Add a response interceptor.
   * @param {function(Response, object): Response} fn — Receives Response and request options.
   * @returns {Function} Remove function.
   */
  addResponseInterceptor(fn) {
    this._responseInterceptors.push(fn);
    return () => {
      this._responseInterceptors = this._responseInterceptors.filter((f) => f !== fn);
    };
  }

  // -------------------------------------------------------------------------
  // Main Request Method
  // -------------------------------------------------------------------------

  /**
   * Perform an HTTP request with timeout, retries, and error handling.
   *
   * @param {string} url     — The URL to fetch.
   * @param {object} [options]
   * @param {string}  [options.method='GET']
   * @param {object}  [options.headers]
   * @param {*}       [options.body]
   * @param {string}  [options.responseType='json'] — 'json' | 'text' | 'blob' | 'arrayBuffer'
   * @param {AbortSignal} [options.signal]         — External abort signal.
   * @param {boolean} [options.skipRetry=false]    — Disable retry for this request.
   * @param {boolean} [options.raw=false]           — Return raw Response (skip parsing).
   * @returns {Promise<*>}
   */
  async request(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      responseType = 'json',
      signal: externalSignal = null,
      skipRetry = false,
      raw = false,
    } = options;

    // Build request options
    /** @type {RequestInit} */
    let reqOptions = {
      method,
      headers: { ...this.defaultHeaders, ...headers },
      body: body !== null ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    };

    // Run request interceptors
    for (const interceptor of this._requestInterceptors) {
      reqOptions = interceptor(reqOptions) ?? reqOptions;
    }

    // Reset state tracking
    this._lastCORS = false;
    this._lastRateLimit = false;

    const maxAttempts = skipRetry ? 1 : this.retries + 1;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Link external signal
      if (externalSignal) {
        if (externalSignal.aborted) {
          clearTimeout(timeoutId);
          throw new ApiError('Request was aborted by the caller.', {
            url, code: 'network',
          });
        }
        externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      let response;
      try {
        response = await fetch(url, {
          ...reqOptions,
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Timeout detection
        if (fetchError.name === 'AbortError') {
          if (externalSignal?.aborted) {
            throw new ApiError('Request was aborted by the caller.', { url, code: 'network' });
          }
          lastError = new ApiError(`Request timed out after ${this.timeout}ms.`, {
            url, code: 'timeout', retried: attempt < maxAttempts,
          });
          if (attempt < maxAttempts) {
            await this._backoff(attempt);
            continue;
          }
          break;
        }

        // CORS error — fetch throws TypeError with no response when CORS blocks
        if (fetchError instanceof TypeError) {
          this._lastCORS = true;
          lastError = new ApiError(
            `CORS error: unable to fetch ${url}. The server may not allow cross-origin requests.`,
            { url, code: 'cors', retried: attempt < maxAttempts },
          );
          // CORS errors are unlikely to resolve on retry, but try once more
          if (attempt < maxAttempts) {
            await this._backoff(attempt);
            continue;
          }
          break;
        }

        // Generic network error
        lastError = new ApiError(`Network error: ${fetchError.message}`, {
          url, code: 'network', retried: attempt < maxAttempts,
        });
        if (attempt < maxAttempts) {
          await this._backoff(attempt);
          continue;
        }
        break;
      }

      clearTimeout(timeoutId);

      // Run response interceptors
      for (const interceptor of this._responseInterceptors) {
        response = interceptor(response, reqOptions) ?? response;
      }

      // Rate limit detection
      if (response.status === 429) {
        this._lastRateLimit = true;
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 30_000)
          : this._backoffMs(attempt);

        lastError = new ApiError('Rate limit exceeded. The server returned HTTP 429.', {
          url, status: 429, statusText: response.statusText,
          code: 'rate_limit', retried: attempt < maxAttempts,
        });

        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        break;
      }

      // HTTP error responses (4xx, 5xx)
      if (!response.ok) {
        let data = null;
        try {
          data = await response.json();
        } catch {
          // Response body might not be JSON; try text
          try { data = await response.clone().text(); } catch { /* ignore */ }
        }

        lastError = new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          { url, status: response.status, statusText: response.statusText, code: 'http', data, retried: false },
        );
        // Don't retry HTTP errors (except 429 handled above)
        break;
      }

      // Success — parse body
      if (raw) return response;

      try {
        if (responseType === 'json') {
          return await response.json();
        }
        if (responseType === 'text') {
          return await response.text();
        }
        if (responseType === 'blob') {
          return await response.blob();
        }
        if (responseType === 'arrayBuffer') {
          return await response.arrayBuffer();
        }
        // Default to JSON
        return await response.json();
      } catch (parseError) {
        throw new ApiError(`Failed to parse response: ${parseError.message}`, {
          url, status: response.status, code: 'parse',
        });
      }
    }

    // All attempts exhausted
    throw lastError || new ApiError('Request failed after all retries.', { url, code: 'network' });
  }

  // -------------------------------------------------------------------------
  // Convenience Shorthand Methods
  // -------------------------------------------------------------------------

  /** @param {string} url @param {object} [options] @returns {Promise<*>} */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * @param {string} url
   * @param {*}      body
   * @param {object} [options]
   * @returns {Promise<*>}
   */
  async post(url, body, options = {}) {
    return this.request(url, { ...options, method: 'POST', body });
  }

  /**
   * @param {string} url
   * @param {*}      body
   * @param {object} [options]
   * @returns {Promise<*>}
   */
  async put(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body });
  }

  /**
   * @param {string} url
   * @param {*}      body
   * @param {object} [options]
   * @returns {Promise<*>}
   */
  async patch(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PATCH', body });
  }

  /** @param {string} url @param {object} [options] @returns {Promise<*>} */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  // -------------------------------------------------------------------------
  // Status Helpers
  // -------------------------------------------------------------------------

  /**
   * Check whether the last request encountered a CORS error.
   * @returns {boolean}
   */
  getCorsStatus() {
    return this._lastCORS;
  }

  /**
   * Check whether the last request was rate-limited.
   * @returns {boolean}
   */
  getRateLimitStatus() {
    return this._lastRateLimit;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  /**
   * Exponential backoff with jitter.
   * @param {number} attempt — Current attempt number (1-based).
   * @returns {Promise<void>}
   * @private
   */
  async _backoff(attempt) {
    const ms = this._backoffMs(attempt);
    await new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Calculate backoff delay in milliseconds.
   * Uses exponential backoff with a cap at 10s and ±25% jitter.
   *
   * @param {number} attempt
   * @returns {number}
   * @private
   */
  _backoffMs(attempt) {
    const base = this.retryDelay;
    const exponential = base * Math.pow(2, attempt - 1);
    const capped = Math.min(exponential, 10_000);
    // Add jitter (±25%)
    const jitter = capped * 0.25;
    return Math.round(capped + (Math.random() * 2 - 1) * jitter);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an ApiClient with sensible defaults.
 *
 * @param {object} [options] — Same options as ApiClient constructor.
 * @returns {ApiClient}
 */
export function createDefault(options = {}) {
  return new ApiClient(options);
}

/**
 * Shared singleton client for typical usage.
 */
export const apiClient = new ApiClient();
