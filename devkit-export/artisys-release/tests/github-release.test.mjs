import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureGitHubRelease, uploadReleaseAsset, releaseTagForVersion } from '../src/github-release.mjs';

test('releaseTagForVersion normalizes a semantic version', () => {
  assert.equal(releaseTagForVersion('1.3.2'), 'v1.3.2');
  assert.equal(releaseTagForVersion('v1.3.2'), 'v1.3.2');
});

test('ensureGitHubRelease reuses an existing release by tag', async () => {
  const calls=[];
  const fetchImpl=async (url, options={}) => {
    calls.push({url:String(url),options});
    return {ok:true,status:200,json:async()=>({id:42,tag_name:'v1.0.0',assets:[]}),text:async()=>''};
  };
  const release=await ensureGitHubRelease({token:'x',repo:'o/r',tag:'v1.0.0',name:'R 1.0.0',fetchImpl});
  assert.equal(release.id,42);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/releases\/tags\/v1\.0\.0$/);
});

test('ensureGitHubRelease creates release when tag does not exist', async () => {
  const calls=[];
  const fetchImpl=async (url, options={}) => {
    calls.push({url:String(url),options});
    if ((options.method||'GET')==='GET') return {ok:false,status:404,json:async()=>({}),text:async()=>''};
    return {ok:true,status:201,json:async()=>({id:7,tag_name:'v1.2.3',assets:[]}),text:async()=>''};
  };
  const release=await ensureGitHubRelease({token:'x',repo:'o/r',tag:'v1.2.3',name:'R 1.2.3',body:'notes',fetchImpl});
  assert.equal(release.id,7);
  assert.equal(calls.length,2);
  const body=JSON.parse(calls[1].options.body);
  assert.equal(body.tag_name,'v1.2.3');
  assert.equal(body.draft,false);
});

test('uploadReleaseAsset deletes same-name asset then uploads replacement', async () => {
  const calls=[];
  const fetchImpl=async (url, options={}) => {
    calls.push({url:String(url),options});
    return {ok:true,status:(options.method==='DELETE'?204:201),json:async()=>({id:99,name:'app.exe'}),text:async()=>''};
  };
  await uploadReleaseAsset({token:'x',repo:'o/r',releaseId:8,name:'app.exe',data:Buffer.from('abc'),contentType:'application/octet-stream',existingAssets:[{id:3,name:'app.exe'}],fetchImpl});
  assert.ok(calls.some(call=>call.options.method==='DELETE' && call.url.endsWith('/releases/assets/3')));
  assert.ok(calls.some(call=>call.options.method==='POST' && call.url.includes('/releases/8/assets?name=app.exe')));
});
