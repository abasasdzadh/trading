/**
 * Trade Journal
 * ============
 * Personal trading journal for reflection, pattern analysis,
 * and performance improvement through structured note-taking.
 *
 * Features:
 *   - Add / update / delete journal entries
 *   - Filter by symbol, direction, date range, tags
 *   - Aggregate statistics (common emotions, mistakes, tag distribution)
 *   - Export / import for backup and migration
 *
 * Task ID: 2-e
 */

import { generateId } from '../core/utils.js';

// ---------------------------------------------------------------------------
// TradeJournal
// ---------------------------------------------------------------------------

export class TradeJournal {
  /**
   * @param {import('../core/storage.js').StorageService} storage
   */
  constructor(storage) {
    this.storage = storage;
    this._entries = [];
    this._initialised = false;
  }

  // -----------------------------------------------------------------------
  // Initialisation
  // -----------------------------------------------------------------------

  async _ensureInit() {
    if (this._initialised) return;
    this._entries = (await this.storage.getSignals('journalEntries')) ?? [];
    this._initialised = true;
  }

  async _persist() {
    await this.storage.setSignals('journalEntries', this._entries);
  }

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  /**
   * Add a new journal entry.
   *
   * @param {{
   *   tradeId?: string,
   *   date: string|number,
   *   symbol: string,
   *   direction: 'long'|'short',
   *   entryPrice: number,
   *   exitPrice: number,
   *   pnl: number,
   *   notes: string,
   *   emotion: string,
   *   marketCondition: string,
   *   strategy: string,
   *   lessonsLearned: string,
   *   tags?: string[]
   * }} entry
   * @returns {Promise<Object>} The created entry
   */
  async addEntry(entry) {
    await this._ensureInit();

    const newEntry = {
      id:               generateId(),
      tradeId:          entry.tradeId ?? null,
      date:             entry.date ?? Date.now(),
      symbol:           entry.symbol,
      direction:        entry.direction,
      entryPrice:       entry.entryPrice,
      exitPrice:        entry.exitPrice,
      pnl:              entry.pnl,
      notes:            entry.notes ?? '',
      emotion:          entry.emotion ?? '',
      marketCondition:  entry.marketCondition ?? '',
      strategy:         entry.strategy ?? '',
      lessonsLearned:   entry.lessonsLearned ?? '',
      tags:             entry.tags ?? [],
      createdAt:        Date.now(),
      updatedAt:        Date.now(),
    };

    this._entries.push(newEntry);
    await this._persist();
    return { ...newEntry };
  }

  /**
   * Get journal entries, optionally filtered.
   *
   * @param {{
   *   symbol?: string,
   *   direction?: string,
   *   startDate?: number,
   *   endDate?: number,
   *   tag?: string,
   *   emotion?: string,
   *   strategy?: string,
   *   limit?: number
   * }} [filter]
   * @returns {Promise<Object[]>}
   */
  async getEntries(filter = {}) {
    await this._ensureInit();

    let results = [...this._entries];

    if (filter.symbol) {
      results = results.filter((e) => e.symbol === filter.symbol);
    }
    if (filter.direction) {
      results = results.filter((e) => e.direction === filter.direction);
    }
    if (filter.startDate !== undefined) {
      results = results.filter((e) => e.date >= filter.startDate);
    }
    if (filter.endDate !== undefined) {
      results = results.filter((e) => e.date <= filter.endDate);
    }
    if (filter.tag) {
      results = results.filter((e) => e.tags && e.tags.includes(filter.tag));
    }
    if (filter.emotion) {
      results = results.filter((e) => e.emotion === filter.emotion);
    }
    if (filter.strategy) {
      results = results.filter((e) => e.strategy === filter.strategy);
    }

    // Sort by date descending (most recent first)
    results.sort((a, b) => {
      const ta = typeof a.date === 'number' ? a.date : new Date(a.date).getTime();
      const tb = typeof b.date === 'number' ? b.date : new Date(b.date).getTime();
      return tb - ta;
    });

    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Update an existing journal entry.
   * @param {string} id
   * @param {Object} updates — Partial entry fields to update
   * @returns {Promise<Object|null>} Updated entry or null if not found
   */
  async updateEntry(id, updates) {
    await this._ensureInit();

    const entry = this._entries.find((e) => e.id === id);
    if (!entry) return null;

    Object.assign(entry, updates, { updatedAt: Date.now() });
    await this._persist();
    return { ...entry };
  }

  /**
   * Delete a journal entry by ID.
   * @param {string} id
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteEntry(id) {
    await this._ensureInit();

    const idx = this._entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    this._entries.splice(idx, 1);
    await this._persist();
    return true;
  }

  // -----------------------------------------------------------------------
  // Statistics
  // -----------------------------------------------------------------------

  /**
   * Compute aggregate journal statistics.
   * @returns {Promise<Object>}
   */
  async getStats() {
    await this._ensureInit();

    const entries = this._entries;
    if (entries.length === 0) {
      return {
        totalEntries:    0,
        avgPnL:           0,
        bestTrade:        0,
        worstTrade:       0,
        commonEmotions:   [],
        commonMistakes:   [],
        tagDistribution:  {},
      };
    }

    // Average PnL
    const totalPnL = entries.reduce((s, e) => s + (e.pnl ?? 0), 0);
    const avgPnL = totalPnL / entries.length;

    // Best / worst trade
    const pnls = entries.map((e) => e.pnl ?? 0);
    const bestTrade = Math.max(...pnls);
    const worstTrade = Math.min(...pnls);

    // Common emotions
    const emotionCounts = {};
    for (const e of entries) {
      if (e.emotion) {
        emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
      }
    }
    const commonEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));

    // Common mistakes — extracted from lessonsLearned
    const mistakeKeywords = ['fomo', 'revenge', 'overtrade', 'moved stop', 'no stop', 'too large', 'impulse', 'chase', 'panic', 'greed'];
    const mistakeCounts = {};
    for (const e of entries) {
      const text = (e.lessonsLearned ?? '').toLowerCase();
      for (const kw of mistakeKeywords) {
        if (text.includes(kw)) {
          mistakeCounts[kw] = (mistakeCounts[kw] || 0) + 1;
        }
      }
    }
    const commonMistakes = Object.entries(mistakeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mistake, count]) => ({ mistake, count }));

    // Tag distribution
    const tagDistribution = {};
    for (const e of entries) {
      if (e.tags && Array.isArray(e.tags)) {
        for (const tag of e.tags) {
          tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
        }
      }
    }

    return {
      totalEntries:   entries.length,
      avgPnL:         Math.round(avgPnL * 100) / 100,
      bestTrade:      Math.round(bestTrade * 100) / 100,
      worstTrade:     Math.round(worstTrade * 100) / 100,
      commonEmotions,
      commonMistakes,
      tagDistribution,
    };
  }

  // -----------------------------------------------------------------------
  // Export / Import
  // -----------------------------------------------------------------------

  /** Export all journal entries as JSON string. */
  async exportJournal() {
    await this._ensureInit();
    return JSON.stringify(this._entries, null, 2);
  }

  /**
   * Import journal entries from JSON string.
   * Replaces all existing entries.
   * @param {string} json
   */
  async importJournal(json) {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error('Import data must be a JSON array of journal entries.');
    }

    // Validate each entry has required fields
    for (const entry of parsed) {
      if (!entry.symbol || entry.direction === undefined) {
        throw new Error('Each journal entry must have at least symbol and direction.');
      }
      // Ensure it has an ID
      if (!entry.id) entry.id = generateId();
    }

    this._entries = parsed;
    await this._persist();
  }
}

export default TradeJournal;
