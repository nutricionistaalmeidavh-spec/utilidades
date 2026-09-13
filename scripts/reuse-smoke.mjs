import assert from 'node:assert/strict';

const contracts = {
  'artisys-backup': ['createBackupManifest', 'verifyBackupManifest'],
  'artisys-importer': ['mapRow', 'validateRows', 'previewImport'],
  'artisys-auth-rbac': ['createPolicy', 'can', 'requirePermission'],
  'artisys-storage': ['MemoryStorage', 'namespaceStorage'],
  'artisys-audit-log': ['createAuditEntry', 'MemoryAuditLog'],
  'artisys-sync': ['MemorySyncQueue', 'resolveLastWriteWins'],
  'artisys-pwa-runtime': ['createCachePlan', 'shouldActivateUpdate', 'buildServiceWorkerConfig'],
  'artisys-webview-bridge': ['createBridgeMessage', 'encodeBridgeMessage', 'parseBridgeMessage', 'postToNative'],
  'artisys-inventory': ['createInventory', 'availableQuantity', 'applyMovement', 'reserveStock', 'releaseStock'],
  'artisys-os': ['createServiceOrder', 'canTransition', 'transitionServiceOrder'],
  'artisys-catalog': ['createCatalogItem', 'searchCatalog', 'resolveVariant'],
  'artisys-pricing': ['resolveUnitPrice', 'applyPercentDiscount', 'quoteLine'],
  'artisys-settings': ['createMemorySettings', 'namespaceSettings'],
  'artisys-multitenancy': ['createTenantContext', 'assertTenantAccess', 'scopeRecord', 'filterTenantRecords'],
  'artisys-feature-flags': ['resolveFeatureFlag', 'isFeatureEnabled', 'mergeFeatureFlags'],
  'artisys-checklists': ['createChecklist', 'setChecklistItem', 'checklistProgress'],
  'artisys-reporting': ['filterRows', 'groupBy', 'aggregate', 'toCsv'],
  'artisys-seo': ['defineSeoConfig', 'buildPageSeo', 'auditSeoDocument', 'buildSeoDashboardModel', 'withSearchConsoleReadonlyScope', 'normalizeSearchConsoleSiteUrl', 'createSearchConsoleClient', 'createGoogleRefreshTokenProvider', 'loadSearchConsoleOverview'],
};

for (const [moduleId, expectedExports] of Object.entries(contracts)) {
  const entry = await import(`../modules/${moduleId}/src/index.mjs`);
  for (const name of expectedExports) {
    assert.equal(typeof entry[name], 'function', `${moduleId} must export ${name}`);
  }
}

console.log(`Reusable API smoke passed for ${Object.keys(contracts).length} modules.`);
