/**
 * i18n.js — Internationalization (English / Persian)
 * ===============================================
 * Provides translation strings and RTL support.
 */

const TRANSLATIONS = {
  en: {
    // Sidebar
    'sidebar.analysis': 'Analysis',
    'sidebar.trading': 'Trading',
    'sidebar.tools': 'Tools',
    'nav.dashboard': 'Dashboard',
    'nav.chart': 'Chart',
    'nav.markets': 'Markets',
    'nav.scanner': 'Scanner',
    'nav.signals': 'Signals',
    'nav.strategies': 'Strategies',
    'nav.backtest': 'Backtest',
    'nav.paper-trading': 'Paper Trading',
    'nav.journal': 'Journal',
    'nav.alerts': 'Alerts',
    'nav.settings': 'Settings',
    'nav.about': 'About',

    // General
    'app.name': 'Trading Analyzer',
    'app.loading': 'Loading...',
    'app.error': 'Error',
    'app.save': 'Save',
    'app.cancel': 'Cancel',
    'app.close': 'Close',
    'app.delete': 'Delete',
    'app.edit': 'Edit',
    'app.add': 'Add',
    'app.search': 'Search...',
    'app.refresh': 'Refresh',
    'app.export': 'Export',
    'app.import': 'Import',
    'app.clear': 'Clear',
    'app.confirm': 'Confirm',
    'app.yes': 'Yes',
    'app.no': 'No',
    'app.noData': 'No data available',

    // Settings page
    'settings.title': 'Settings',
    'settings.subtitle': 'Configure your trading analyzer',
    'settings.tab.general': 'General',
    'settings.tab.providers': 'Providers',
    'settings.tab.indicators': 'Indicators',
    'settings.tab.strategies': 'Strategies',
    'settings.tab.risk': 'Risk',
    'settings.tab.data': 'Data',
    'settings.theme': 'Theme',
    'settings.theme.dark': 'Dark',
    'settings.theme.light': 'Light',
    'settings.language': 'Language',
    'settings.lang.en': 'English',
    'settings.lang.fa': 'Persian',
    'settings.demoMode': 'Demo Mode',
    'settings.defaultSymbol': 'Default Symbol',
    'settings.defaultTimeframe': 'Default Timeframe',
    'settings.autoRefresh': 'Auto Refresh',
    'settings.refreshInterval': 'Refresh Interval (seconds)',
    'settings.saveGeneral': 'Save General Settings',
    'settings.marketProvider': 'Market Provider',
    'settings.aiProvider': 'AI Provider',
    'settings.apiKey': 'API Key',
    'settings.model': 'Model',
    'settings.baseUrl': 'Base URL',
    'settings.saveMarket': 'Save Market Provider',
    'settings.saveAI': 'Save AI Provider',
    'settings.indicatorsConfig': 'Indicators Configuration',
    'settings.strategiesConfig': 'Strategies Configuration',
    'settings.riskPerTrade': 'Risk Per Trade (%)',
    'settings.defaultSLMethod': 'Default SL Method',
    'settings.atrPeriod': 'ATR Period',
    'settings.atrMultiplier': 'ATR Multiplier',
    'settings.tpRatio': 'TP Ratio',
    'settings.saveRisk': 'Save Risk Settings',
    'settings.saveIndicators': 'Save Indicators',
    'settings.saveStrategies': 'Save Strategies',
    'settings.exportData': 'Export Data',
    'settings.importData': 'Import Data',
    'settings.clearAll': 'Clear All Data',
    'settings.clearConfirm': 'Are you sure you want to clear ALL data? This cannot be undone.',
    'settings.dataHint': 'Export or import all your application data. Credentials are excluded from exports for security.',
    'settings.saved': 'Settings saved',
    'settings.marketSaved': 'Market provider saved',
    'settings.aiSaved': 'AI provider saved',
    'settings.indicatorsSaved': 'Indicators saved',
    'settings.strategiesSaved': 'Strategies saved',
    'settings.riskSaved': 'Risk settings saved',
    'settings.exported': 'Data exported successfully',
    'settings.imported': 'Imported {imported} items, skipped {skipped}',
    'settings.cleared': 'All data cleared',
    'settings.importFailed': 'Failed to import data: ',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Market overview and quick insights',
    'dashboard.totalSignals': 'Total Signals',
    'dashboard.winRate': 'Win Rate',
    'dashboard.avgScore': 'Avg Score',
    'dashboard.activeAlerts': 'Active Alerts',
    'dashboard.recentSignals': 'Recent Signals',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.marketOverview': 'Market Overview',

    // Signals
    'signals.title': 'Signals',
    'signals.subtitle': 'AI-powered trading signals',
    'signals.generate': 'Generate Signal',
    'signals.symbol': 'Symbol',
    'signals.timeframe': 'Timeframe',
    'signals.direction': 'Direction',
    'signals.score': 'Score',
    'signals.reasoning': 'Reasoning',
    'signals.long': 'Long',
    'signals.short': 'Short',
    'signals.neutral': 'Neutral',

    // Chart
    'chart.title': 'Chart',
    'chart.indicators': 'Indicators',
    'chart.timeframe': 'Timeframe',
    'chart.analyze': 'Analyze',
    'chart.aiAnalysis': 'AI Analysis',

    // Scanner
    'scanner.title': 'Scanner',
    'scanner.subtitle': 'Scan multiple symbols for opportunities',
    'scanner.startScan': 'Start Scan',
    'scanner.scanning': 'Scanning...',
    'scanner.results': 'Scan Results',

    // Backtest
    'backtest.title': 'Backtest',
    'backtest.subtitle': 'Test strategies on historical data',
    'backtest.run': 'Run Backtest',
    'backtest.results': 'Results',
    'backtest.totalReturn': 'Total Return',
    'backtest.maxDrawdown': 'Max Drawdown',
    'backtest.sharpeRatio': 'Sharpe Ratio',
    'backtest.totalTrades': 'Total Trades',
    'backtest.winRate': 'Win Rate',

    // Paper Trading
    'paper-trading.title': 'Paper Trading',
    'paper-trading.subtitle': 'Practice trading with virtual money',
    'paper-trading.buy': 'Buy',
    'paper-trading.sell': 'Sell',
    'paper-trading.close': 'Close Position',
    'paper-trading.balance': 'Balance',
    'paper-trading.pnl': 'P&L',
    'paper-trading.openPositions': 'Open Positions',
    'paper-trading.closedTrades': 'Closed Trades',

    // Journal
    'journal.title': 'Journal',
    'journal.subtitle': 'Track your trading decisions and lessons',
    'journal.newEntry': 'New Entry',
    'journal.date': 'Date',
    'journal.notes': 'Notes',

    // Alerts
    'alerts.title': 'Alerts',
    'alerts.subtitle': 'Price and signal alerts',
    'alerts.create': 'Create Alert',
    'alerts.active': 'Active',
    'alerts.triggered': 'Triggered',

    // About
    'about.title': 'About',
    'about.description': 'AI Trading Analyzer is a client-side trading decision support system. All data processing happens in your browser — no server required.',
    'about.version': 'Version',
    'about.features': 'Features',

    // Markets
    'markets.title': 'Markets',
    'markets.subtitle': 'Browse and compare market data',

    // Strategies
    'strategies.title': 'Strategies',
    'strategies.subtitle': 'Configure and test trading strategies',

    // Demo banner
    'demo.banner': 'Demo Mode — Using simulated data. Configure API keys in Settings for live data.',

    // Risk
    'risk.stopLoss': 'Stop Loss',
    'risk.takeProfit': 'Take Profit',
    'risk.positionSize': 'Position Size',

    // 404
    'notfound.title': 'Page Not Found',
    'notfound.description': 'The page you are looking for does not exist.',
    'notfound.goDashboard': 'Go to Dashboard',
  },

  fa: {
    // Sidebar
    'sidebar.analysis': 'تحلیل',
    'sidebar.trading': 'معاملات',
    'sidebar.tools': 'ابزارها',
    'nav.dashboard': 'داشبورد',
    'nav.chart': 'نمودار',
    'nav.markets': 'بازارها',
    'nav.scanner': 'اسکنر',
    'nav.signals': 'سیگنال‌ها',
    'nav.strategies': 'استراتژی‌ها',
    'nav.backtest': 'بک‌تست',
    'nav.paper-trading': 'معاملات آزمایشی',
    'nav.journal': 'دفترچه',
    'nav.alerts': 'هشدارها',
    'nav.settings': 'تنظیمات',
    'nav.about': 'درباره',

    // General
    'app.name': 'تحلیلگر معاملات',
    'app.loading': 'در حال بارگذاری...',
    'app.error': 'خطا',
    'app.save': 'ذخیره',
    'app.cancel': 'لغو',
    'app.close': 'بستن',
    'app.delete': 'حذف',
    'app.edit': 'ویرایش',
    'app.add': 'افزودن',
    'app.search': 'جستجو...',
    'app.refresh': 'بازنشانی',
    'app.export': 'خروجی',
    'app.import': 'ورودی',
    'app.clear': 'پاک کردن',
    'app.confirm': 'تایید',
    'app.yes': 'بله',
    'app.no': 'خیر',
    'app.noData': 'داده‌ای موجود نیست',

    // Settings page
    'settings.title': 'تنظیمات',
    'settings.subtitle': 'تنظیمات تحلیلگر معاملات خود را پیکربندی کنید',
    'settings.tab.general': 'عمومی',
    'settings.tab.providers': 'ارائه‌دهندگان',
    'settings.tab.indicators': 'اندیکاتورها',
    'settings.tab.strategies': 'استراتژی‌ها',
    'settings.tab.risk': 'ریسک',
    'settings.tab.data': 'داده‌ها',
    'settings.theme': 'پوسته',
    'settings.theme.dark': 'تاریک',
    'settings.theme.light': 'روشن',
    'settings.language': 'زبان',
    'settings.lang.en': 'انگلیسی',
    'settings.lang.fa': 'فارسی',
    'settings.demoMode': 'حالت دمو',
    'settings.defaultSymbol': 'نماد پیش‌فرض',
    'settings.defaultTimeframe': 'تایم‌فریم پیش‌فرض',
    'settings.autoRefresh': 'بازنشانی خودکار',
    'settings.refreshInterval': 'فاصله بازنشانی (ثانیه)',
    'settings.saveGeneral': 'ذخیره تنظیمات عمومی',
    'settings.marketProvider': 'ارائه‌دهنده بازار',
    'settings.aiProvider': 'ارائه‌دهنده هوش مصنوعی',
    'settings.apiKey': 'کلید API',
    'settings.model': 'مدل',
    'settings.baseUrl': 'آدرس پایه',
    'settings.saveMarket': 'ذخیره ارائه‌دهنده بازار',
    'settings.saveAI': 'ذخیره ارائه‌دهنده هوش مصنوعی',
    'settings.indicatorsConfig': 'تنظیمات اندیکاتورها',
    'settings.strategiesConfig': 'تنظیمات استراتژی‌ها',
    'settings.riskPerTrade': 'ریسک هر معامله (٪)',
    'settings.defaultSLMethod': 'روش حد ضرر پیش‌فرض',
    'settings.atrPeriod': 'دوره ATR',
    'settings.atrMultiplier': 'ضریب ATR',
    'settings.tpRatio': 'نسبت سود',
    'settings.saveRisk': 'ذخیره تنظیمات ریسک',
    'settings.saveIndicators': 'ذخیره اندیکاتورها',
    'settings.saveStrategies': 'ذخیره استراتژی‌ها',
    'settings.exportData': 'خروجی داده‌ها',
    'settings.importData': 'ورود داده‌ها',
    'settings.clearAll': 'پاک کردن همه داده‌ها',
    'settings.clearConfirm': 'آیا مطمئن هستید که می‌خواهید همه داده‌ها را پاک کنید؟ این عمل قابل بازگشت نیست.',
    'settings.dataHint': 'خروجی یا ورودی تمام داده‌های برنامه. کلیدهای API برای امنیت از خروجی حذف می‌شوند.',
    'settings.saved': 'تنظیمات ذخیره شد',
    'settings.marketSaved': 'ارائه‌دهنده بازار ذخیره شد',
    'settings.aiSaved': 'ارائه‌دهنده هوش مصنوعی ذخیره شد',
    'settings.indicatorsSaved': 'اندیکاتورها ذخیره شدند',
    'settings.strategiesSaved': 'استراتژی‌ها ذخیره شدند',
    'settings.riskSaved': 'تنظیمات ریسک ذخیره شد',
    'settings.exported': 'داده‌ها با موفقیت خروجی گرفته شد',
    'settings.imported': '{imported} مورد وارد شد، {skipped} مورد رد شد',
    'settings.cleared': 'همه داده‌ها پاک شد',
    'settings.importFailed': 'خطا در ورود داده‌ها: ',

    // Dashboard
    'dashboard.title': 'داشبورد',
    'dashboard.subtitle': 'نمای کلی بازار و بینش سریع',
    'dashboard.totalSignals': 'کل سیگنال‌ها',
    'dashboard.winRate': 'نرخ برد',
    'dashboard.avgScore': 'میانگین امتیاز',
    'dashboard.activeAlerts': 'هشدارهای فعال',
    'dashboard.recentSignals': 'سیگنال‌های اخیر',
    'dashboard.quickActions': 'عملیات سریع',
    'dashboard.marketOverview': 'نمای کلی بازار',

    // Signals
    'signals.title': 'سیگنال‌ها',
    'signals.subtitle': 'سیگنال‌های معاملاتی مبتنی بر هوش مصنوعی',
    'signals.generate': 'تولید سیگنال',
    'signals.symbol': 'نماد',
    'signals.timeframe': 'تایم‌فریم',
    'signals.direction': 'جهت',
    'signals.score': 'امتیاز',
    'signals.reasoning': 'دلیل‌یابی',
    'signals.long': 'خرید',
    'signals.short': 'فروش',
    'signals.neutral': 'خنثی',

    // Chart
    'chart.title': 'نمودار',
    'chart.indicators': 'اندیکاتورها',
    'chart.timeframe': 'تایم‌فریم',
    'chart.analyze': 'تحلیل',
    'chart.aiAnalysis': 'تحلیل هوش مصنوعی',

    // Scanner
    'scanner.title': 'اسکنر',
    'scanner.subtitle': 'اسکن چندین نماد برای یافتن فرصت‌ها',
    'scanner.startScan': 'شروع اسکن',
    'scanner.scanning': 'در حال اسکن...',
    'scanner.results': 'نتایج اسکن',

    // Backtest
    'backtest.title': 'بک‌تست',
    'backtest.subtitle': 'آزمایش استراتژی‌ها روی داده‌های تاریخی',
    'backtest.run': 'اجرای بک‌تست',
    'backtest.results': 'نتایج',
    'backtest.totalReturn': 'بازده کل',
    'backtest.maxDrawdown': 'حداکثر افت',
    'backtest.sharpeRatio': 'نسبت شارپ',
    'backtest.totalTrades': 'کل معاملات',
    'backtest.winRate': 'نرخ برد',

    // Paper Trading
    'paper-trading.title': 'معاملات آزمایشی',
    'paper-trading.subtitle': 'تمرین معامله‌گری با پول مجازی',
    'paper-trading.buy': 'خرید',
    'paper-trading.sell': 'فروش',
    'paper-trading.close': 'بستن موقعیت',
    'paper-trading.balance': 'موجودی',
    'paper-trading.pnl': 'سود/ضرر',
    'paper-trading.openPositions': 'موقعیت‌های باز',
    'paper-trading.closedTrades': 'معاملات بسته شده',

    // Journal
    'journal.title': 'دفترچه',
    'journal.subtitle': 'پیگیری تصمیمات و درس‌های معاملاتی خود',
    'journal.newEntry': 'ورودی جدید',
    'journal.date': 'تاریخ',
    'journal.notes': 'یادداشت‌ها',

    // Alerts
    'alerts.title': 'هشدارها',
    'alerts.subtitle': 'هشدار قیمت و سیگنال',
    'alerts.create': 'ایجاد هشدار',
    'alerts.active': 'فعال',
    'alerts.triggered': 'فعال شده',

    // About
    'about.title': 'درباره',
    'about.description': 'تحلیلگر معاملات هوش مصنوعی یک سیستم پشتیبانی تصمیم‌گیری معاملاتی سمت کلاینت است. تمام پردازش داده‌ها در مرورگر شما انجام می‌شود — نیازی به سرور نیست.',
    'about.version': 'نسخه',
    'about.features': 'ویژگی‌ها',

    // Markets
    'markets.title': 'بازارها',
    'markets.subtitle': 'مرور و مقایسه داده‌های بازار',

    // Strategies
    'strategies.title': 'استراتژی‌ها',
    'strategies.subtitle': 'پیکربندی و آزمایش استراتژی‌های معاملاتی',

    // Demo banner
    'demo.banner': 'حالت دمو — از داده‌های شبیه‌سازی شده استفاده می‌شود. برای داده‌های زنده، کلیدهای API را در تنظیمات پیکربندی کنید.',

    // Risk
    'risk.stopLoss': 'حد ضرر',
    'risk.takeProfit': 'حد سود',
    'risk.positionSize': 'حجم موقعیت',

    // 404
    'notfound.title': 'صفحه یافت نشد',
    'notfound.description': 'صفحه‌ای که دنبال آن هستید وجود ندارد.',
    'notfound.goDashboard': 'رفتن به داشبورد',
  }
};

let _currentLang = 'en';

export function t(key, replacements = {}) {
  const dict = TRANSLATIONS[_currentLang] || TRANSLATIONS.en;
  let text = dict[key] || TRANSLATIONS.en[key] || key;
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

export function setLanguage(lang) {
  _currentLang = lang;
  const isRTL = lang === 'fa';
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);

  // Update sidebar labels
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
}

export function getLanguage() {
  return _currentLang;
}

export function isRTL() {
  return _currentLang === 'fa';
}

export default { t, setLanguage, getLanguage, isRTL };
