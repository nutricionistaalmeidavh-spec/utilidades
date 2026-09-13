function countSeverities(issues) {
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const issue of issues) {
    if (Object.hasOwn(counts, issue.severity)) counts[issue.severity] += 1;
  }
  return counts;
}

function pageStatus(score, counts) {
  if (counts.critical > 0 || score < 70) return 'critical';
  if (score >= 90) return 'healthy';
  return 'attention';
}

function normalizeGoogleSearch(value) {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== 'object') throw new TypeError('googleSearch must be an object');
  const metrics = value.metrics;
  if (!metrics || typeof metrics !== 'object') throw new TypeError('googleSearch.metrics must be an object');
  for (const key of ['clicks', 'impressions', 'ctr']) {
    if (!Number.isFinite(metrics[key]) || metrics[key] < 0) throw new RangeError(`googleSearch.metrics.${key} must be a non-negative number`);
  }
  if (metrics.position !== null && (!Number.isFinite(metrics.position) || metrics.position < 0)) {
    throw new RangeError('googleSearch.metrics.position must be null or a non-negative number');
  }
  return value;
}

export function buildSeoDashboardModel(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input must be an object');
  if (typeof input.siteName !== 'string' || input.siteName.trim() === '') throw new TypeError('siteName is required');
  if (!Array.isArray(input.reports)) throw new TypeError('reports must be an array');
  const googleSearch = normalizeGoogleSearch(input.googleSearch);

  const pages = input.reports.map((report, index) => {
    if (!report || typeof report !== 'object') throw new TypeError('report must be an object');
    if (!Number.isFinite(report.score) || report.score < 0 || report.score > 100) throw new RangeError('report.score must be between 0 and 100');
    const issues = Array.isArray(report.issues) ? report.issues : [];
    const severity = countSeverities(issues);
    return {
      path: typeof report.path === 'string' && report.path ? report.path : `page-${index + 1}`,
      score: report.score,
      problems: issues.length,
      ...severity,
      status: pageStatus(report.score, severity)
    };
  });

  const totals = pages.reduce((acc, page) => {
    acc.problems += page.problems;
    acc.critical += page.critical;
    acc.warning += page.warning;
    acc.info += page.info;
    return acc;
  }, { problems: 0, critical: 0, warning: 0, info: 0 });
  const healthScore = pages.length ? Math.round(pages.reduce((sum, page) => sum + page.score, 0) / pages.length) : null;
  const summary = { pages: pages.length, ...totals };

  const cards = [
    { id: 'health', label: 'Saúde do SEO', value: healthScore, suffix: healthScore === null ? undefined : '/100' },
    { id: 'pages', label: 'Páginas auditadas', value: pages.length },
    { id: 'problems', label: 'Problemas', value: totals.problems },
    { id: 'critical', label: 'Críticos', value: totals.critical }
  ];

  if (googleSearch) {
    cards.push(
      { id: 'google-impressions', label: 'Impressões no Google', value: googleSearch.metrics.impressions },
      { id: 'google-clicks', label: 'Cliques do Google', value: googleSearch.metrics.clicks },
      { id: 'google-ctr', label: 'CTR no Google', value: Number((googleSearch.metrics.ctr * 100).toFixed(2)), suffix: '%' },
      { id: 'google-position', label: 'Posição média', value: googleSearch.metrics.position }
    );
  }

  const googleStatus = googleSearch ? 'ready' : 'not-connected';

  return {
    siteName: input.siteName.trim(),
    healthScore,
    summary,
    cards,
    pages,
    googleSearch,
    capabilities: {
      technicalSeo: 'ready',
      audit: 'ready',
      dashboard: 'ready',
      googleSearch: googleStatus,
      analytics: 'not-connected',
      conversions: 'not-connected'
    },
    navigation: [
      { id: 'overview', label: 'Visão geral', status: 'ready' },
      { id: 'pages', label: 'Páginas', status: 'ready' },
      { id: 'audit', label: 'Auditoria', status: 'ready' },
      { id: 'keywords', label: 'Keywords', status: googleStatus },
      { id: 'indexing', label: 'Indexação', status: 'not-connected' },
      { id: 'schema', label: 'Schema', status: 'ready' },
      { id: 'google-search', label: 'Google Search', status: googleStatus },
      { id: 'analytics', label: 'Analytics', status: 'not-connected' },
      { id: 'conversions', label: 'Conversões', status: 'not-connected' }
    ]
  };
}
