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

export function buildSeoDashboardModel(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input must be an object');
  if (typeof input.siteName !== 'string' || input.siteName.trim() === '') throw new TypeError('siteName is required');
  if (!Array.isArray(input.reports)) throw new TypeError('reports must be an array');

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

  return {
    siteName: input.siteName.trim(),
    healthScore,
    summary,
    cards: [
      { id: 'health', label: 'Saúde do SEO', value: healthScore, suffix: healthScore === null ? undefined : '/100' },
      { id: 'pages', label: 'Páginas auditadas', value: pages.length },
      { id: 'problems', label: 'Problemas', value: totals.problems },
      { id: 'critical', label: 'Críticos', value: totals.critical }
    ],
    pages,
    capabilities: {
      technicalSeo: 'ready',
      audit: 'ready',
      dashboard: 'ready',
      googleSearch: 'not-connected',
      analytics: 'not-connected',
      conversions: 'not-connected'
    },
    navigation: [
      { id: 'overview', label: 'Visão geral', status: 'ready' },
      { id: 'pages', label: 'Páginas', status: 'ready' },
      { id: 'audit', label: 'Auditoria', status: 'ready' },
      { id: 'keywords', label: 'Keywords', status: 'not-connected' },
      { id: 'indexing', label: 'Indexação', status: 'not-connected' },
      { id: 'schema', label: 'Schema', status: 'ready' },
      { id: 'google-search', label: 'Google Search', status: 'not-connected' },
      { id: 'analytics', label: 'Analytics', status: 'not-connected' },
      { id: 'conversions', label: 'Conversões', status: 'not-connected' }
    ]
  };
}
