import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText,
  businessFingerprint,
  sourceFingerprint,
  applyDeterministicRules,
  dedupeBySourceFingerprint,
  reconcileAccountTransfers,
  suggestReconciliation,
  updatePairStats,
  adjustScoreWithFeedback,
  BASIC_PT_BR_FINANCE_RULES,
} from '../src/index.mjs';

test('normalizes financial descriptions deterministically', () => {
  assert.equal(normalizeText('  Pix – João & Cia.  '), 'PIX JOAO CIA');
});

test('keeps source identity separate from business similarity', () => {
  const tx = {accountId:'acc-1',date:'2026-09-13',description:'PIX JOAO',amountCents:5000,direction:'debit'};
  assert.equal(businessFingerprint(tx), businessFingerprint({...tx}));
  assert.notEqual(
    sourceFingerprint(tx,{source:'csv',documentId:'extrato-setembro',rowIndex:10}),
    sourceFingerprint(tx,{source:'csv',documentId:'extrato-setembro',rowIndex:11}),
  );
});

test('applies highest priority matching rule and explains the decision', () => {
  const tx = {accountId:'acc-1',date:'2026-09-13',description:'POSTO SHELL CENTRO',amountCents:25000,direction:'debit'};
  const rules = [
    {id:'generic-debit',priority:10,match:{direction:'debit'},assign:{category:'Despesa'}},
    {id:'shell-fuel',priority:100,match:{description:{kind:'contains',value:'SHELL'},direction:'debit',amountCents:{min:1000,max:100000}},assign:{category:'Combustível'},reason:'Fornecedor de combustível'},
  ];
  const result = applyDeterministicRules(tx,rules);
  assert.equal(result.matched,true);
  assert.equal(result.ruleId,'shell-fuel');
  assert.equal(result.assignments.category,'Combustível');
  assert.equal(result.confidence,1);
  assert.match(result.reason,/combustível/i);
});

test('deduplicates exact source rows without collapsing legitimate repeated payments', () => {
  const tx = {accountId:'acc-1',date:'2026-09-13',description:'PIX FUNCIONARIO',amountCents:5000,direction:'debit'};
  const a = {...tx,sourceFingerprint:sourceFingerprint(tx,{source:'csv',documentId:'file-a',rowIndex:1})};
  const sameSource = {...tx,sourceFingerprint:a.sourceFingerprint};
  const anotherRow = {...tx,sourceFingerprint:sourceFingerprint(tx,{source:'csv',documentId:'file-a',rowIndex:2})};
  const out = dedupeBySourceFingerprint([a],[sameSource,anotherRow]);
  assert.equal(out.accepted.length,1);
  assert.equal(out.duplicates.length,1);
  assert.equal(out.accepted[0].sourceFingerprint,anotherRow.sourceFingerprint);
});

test('reconciles internal transfers, withdrawals and returns deterministically', () => {
  const accounts = [
    {id:'biz-a',ownership:'business'},
    {id:'biz-b',ownership:'business'},
    {id:'personal',ownership:'personal'},
  ];
  const tx = [
    {id:'t1',accountId:'biz-a',date:'2026-09-10',amountCents:10000,direction:'debit'},
    {id:'t2',accountId:'biz-b',date:'2026-09-10',amountCents:10000,direction:'credit'},
    {id:'t3',accountId:'biz-a',date:'2026-09-11',amountCents:7000,direction:'debit'},
    {id:'t4',accountId:'personal',date:'2026-09-11',amountCents:7000,direction:'credit'},
    {id:'t5',accountId:'personal',date:'2026-09-12',amountCents:3000,direction:'debit'},
    {id:'t6',accountId:'biz-b',date:'2026-09-12',amountCents:3000,direction:'credit'},
  ];
  const out = reconcileAccountTransfers(tx,accounts);
  assert.deepEqual(out.internalTransfers.map(x=>[x.debitId,x.creditId]),[['t1','t2']]);
  assert.deepEqual(out.withdrawals.map(x=>[x.debitId,x.creditId]),[['t3','t4']]);
  assert.deepEqual(out.returns.map(x=>[x.debitId,x.creditId]),[['t5','t6']]);
});

test('suggests an explainable obligation match', () => {
  const tx = [{id:'tx-1',accountId:'biz',date:'2026-09-13',description:'PIX JOAO SILVA',amountCents:125000,direction:'debit',category:'Equipe'}];
  const obligations = [{id:'ob-1',beneficiaryName:'João Silva',amountCents:125000,dueDate:'2026-09-12',category:'Equipe',employeeId:'e1'}];
  const suggestions = suggestReconciliation(tx,obligations,[]);
  assert.equal(suggestions.length,1);
  assert.equal(suggestions[0].transactionId,'tx-1');
  assert.equal(suggestions[0].allocations[0].obligationId,'ob-1');
  assert.ok(suggestions[0].confidence >= 0.9);
  assert.match(suggestions[0].reason,/valor exato/i);
});

test('uses accepted/rejected feedback without machine learning', () => {
  let stats = updatePairStats(undefined,'accepted');
  stats = updatePairStats(stats,'accepted');
  const raised = adjustScoreWithFeedback(0.7,stats);
  const rejected = adjustScoreWithFeedback(0.7,{accepted:0,rejected:2,manual:0});
  assert.ok(raised > 0.7);
  assert.ok(rejected < 0.7);
});

test('ships optional basic pt-BR rules without making them mandatory', () => {
  const result = applyDeterministicRules({description:'POSTO IPIRANGA',direction:'debit',amountCents:10000},BASIC_PT_BR_FINANCE_RULES);
  assert.equal(result.assignments.category,'Combustível');
});
