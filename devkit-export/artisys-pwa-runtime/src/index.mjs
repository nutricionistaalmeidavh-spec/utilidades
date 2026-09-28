export function createCachePlan(options={}) {
  const version=String(options.version??'1');
  const shell=[...new Set(options.shell??[])];
  return Object.freeze({cacheName:`${options.prefix??'artisys'}-${version}`,version,shell:Object.freeze(shell),offlineFallback:options.offlineFallback??null});
}
export function shouldActivateUpdate(currentVersion,nextVersion){return String(currentVersion)!==String(nextVersion);}
export function buildServiceWorkerConfig(plan){return {cacheName:plan.cacheName,precache:[...plan.shell],offlineFallback:plan.offlineFallback};}
