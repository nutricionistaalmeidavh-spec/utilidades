import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeDesktopShellConfig, createDesktopShellManifest, resolveDesktopAction } from '../src/index.mjs';
test('builds desktop manifest with safe defaults',()=>{ const m=createDesktopShellManifest({appId:'com.artisys.pdv',userDataDir:'./data'}); assert.equal(m.updateChannel,'stable'); assert.equal(m.telemetry,false); });
test('normalizes deep link schemes',()=>{ const c=normalizeDesktopShellConfig({appId:'a',userDataDir:'x',deepLinkSchemes:['Artisys','pdv']}); assert.deepEqual(c.deepLinkSchemes,['artisys','pdv']); });
test('resolves settings action',()=>{ const a=resolveDesktopAction('open-settings',{appId:'a',userDataDir:'x'}); assert.equal(a.type,'open-settings'); });
