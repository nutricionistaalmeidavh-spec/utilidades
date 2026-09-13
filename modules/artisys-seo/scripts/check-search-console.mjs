import {
  loadSearchConsoleOverview,
  normalizeSearchConsoleSiteUrl
} from '../src/index.mjs';
import { createLocalSearchConsoleRuntime } from './google-local-runtime.mjs';

function argValue(name) {
  const prefix = `--${name}=`;
  const item = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return item ? item.slice(prefix.length) : undefined;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function defaultPeriod() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

const jsonMode = process.argv.includes('--json');
const requestedSite = argValue('site') || process.env.ARTISYS_SEO_SITE;

try {
  const runtime = await createLocalSearchConsoleRuntime();
  const sites = await runtime.client.listSites();
  const verifiedSites = sites.filter((site) => site?.siteUrl && site.permissionLevel !== 'siteUnverifiedUser');

  let targetSite = requestedSite ? normalizeSearchConsoleSiteUrl(requestedSite) : null;
  if (targetSite && !verifiedSites.some((site) => site.siteUrl === targetSite)) {
    throw new Error(`A conta Google autorizada não possui acesso verificado a ${targetSite}.`);
  }
  if (!targetSite && verifiedSites.length === 1) targetSite = verifiedSites[0].siteUrl;

  if (!targetSite) {
    const result = { ok: true, tokenRefresh: true, sites: verifiedSites, message: 'OAuth e refresh token válidos. Informe --site=<dominio> para consultar métricas quando houver mais de uma propriedade.' };
    if (jsonMode) console.log(JSON.stringify(result, null, 2));
    else {
      console.log('Google OAuth: OK');
      console.log(`Propriedades verificadas: ${verifiedSites.length}`);
      for (const site of verifiedSites) console.log(`- ${site.siteUrl} (${site.permissionLevel})`);
      console.log(result.message);
    }
    process.exit(0);
  }

  const period = defaultPeriod();
  const overview = await loadSearchConsoleOverview({
    client: runtime.client,
    siteUrl: targetSite,
    ...period,
    rowLimit: 10
  });
  const result = { ok: true, tokenRefresh: true, propertyAccess: true, overview };

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('Google OAuth: OK');
    console.log(`Search Console: OK (${overview.siteUrl})`);
    console.log(`Período: ${overview.period.startDate} a ${overview.period.endDate}`);
    console.log(`Impressões: ${overview.metrics.impressions}`);
    console.log(`Cliques: ${overview.metrics.clicks}`);
    console.log(`CTR: ${(overview.metrics.ctr * 100).toFixed(2)}%`);
    console.log(`Posição média: ${overview.metrics.position ?? 'sem dados'}`);
    if (overview.topQueries.length) {
      console.log('Top buscas:');
      for (const row of overview.topQueries) console.log(`- ${row.query}: ${row.clicks} cliques / ${row.impressions} impressões`);
    }
  }
} catch (error) {
  const result = { ok: false, error: error?.message || String(error) };
  if (jsonMode) console.error(JSON.stringify(result, null, 2));
  else console.error(`Falha na verificação do Search Console: ${result.error}`);
  process.exitCode = 1;
}
