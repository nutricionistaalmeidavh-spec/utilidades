import test from 'node:test';
import assert from 'node:assert/strict';
import { PIPELINE_PROFILES, createPipelinePlan, runPipeline, normalizePipelineConfig, createJsonReport } from '../src/index.mjs';

test('release profile keeps installer before qa and deploy after evidence', () => {
  assert.deepEqual(PIPELINE_PROFILES.release, ['deps','lint','test','build','installer','qa','security','evidence','deploy','publish']);
  assert.ok(PIPELINE_PROFILES.release.indexOf('installer') < PIPELINE_PROFILES.release.indexOf('qa'));
  assert.ok(PIPELINE_PROFILES.release.indexOf('evidence') < PIPELINE_PROFILES.release.indexOf('deploy'));
});

test('normalizes config and preserves custom required stages', () => {
  const cfg = normalizePipelineConfig({product:'PDV',version:'1.0.0',profile:'full',requiredSteps:['build','installer'],steps:{build:'npm run build'}});
  assert.equal(cfg.profile,'full');
  assert.deepEqual(cfg.requiredSteps,['build','installer']);
  assert.equal(cfg.steps.build.command,'npm run build');
});

test('creates pipeline plan with skipped optional stages and blocked required missing stage', () => {
  const plan = createPipelinePlan({product:'x',version:'1',profile:'full',requiredSteps:['installer'],steps:{build:'npm run build'}});
  assert.equal(plan.steps.find(s=>s.id==='build').status,'ready');
  assert.equal(plan.steps.find(s=>s.id==='lint').status,'skipped');
  assert.equal(plan.steps.find(s=>s.id==='installer').status,'missing-required');
});

test('runs configured stages sequentially and stops on failure', async () => {
  const calls=[];
  const result = await runPipeline({product:'x',version:'1',profile:'release',steps:{build:'build',installer:'installer',qa:'qa',security:'security'}}, {
    executor: async step => { calls.push(step.id); return step.id === 'qa' ? {exitCode:2,stdout:'',stderr:'qa failed'} : {exitCode:0,stdout:'ok',stderr:''}; }
  });
  assert.deepEqual(calls,['build','installer','qa']);
  assert.equal(result.status,'blocked');
  assert.equal(result.failedStep,'qa');
});

test('dry run reports stages without executing commands', async () => {
  let executed=0;
  const result = await runPipeline({product:'x',version:'1',profile:'quick',steps:{build:'npm run build'}}, {dryRun:true, executor:async()=>{executed++; return {exitCode:0}}});
  assert.equal(executed,0);
  assert.equal(result.status,'pass');
  assert.equal(result.steps.find(s=>s.id==='build').status,'dry-run');
});

test('json report is serializable', () => {
  const report = createJsonReport({product:'x',version:'1',profile:'quick',status:'pass',steps:[{id:'build',status:'pass',exitCode:0,stdout:'ok',stderr:''}]});
  const parsed=JSON.parse(report);
  assert.equal(parsed.product,'x');
  assert.equal(parsed.steps[0].stdout,'ok');
});
