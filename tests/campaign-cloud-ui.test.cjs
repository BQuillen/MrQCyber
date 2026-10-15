const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { TextEncoder } = require('node:util');
const folder = process.env.CAMPAIGN_PLAYER_TEST_DIR || path.join(__dirname, '../learn/osint/campaign-player');
const C = require(path.join(folder, 'player-core.js'));
const Q = require(path.join(folder, 'query-engine.js'));
const copy = x => x == null ? x : JSON.parse(JSON.stringify(x));
class Element {
  constructor(tag, doc) { this.tagName = tag; this.ownerDocument = doc; this.children = []; this.attributes = {}; this.listeners = {}; this.value = ''; this._text = ''; this.contentWindow = {}; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map(x => x.textContent).join(''); }
  set className(v) { this.attributes.class = v; }
  get className() { return this.attributes.class || ''; }
  get options() { return this.children.filter(n => n.tagName === 'option'); }
  setAttribute(k,v) { this.attributes[k] = String(v); if (['value','id','href'].includes(k)) this[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  append(...items) { items.forEach(x => { const n = x instanceof Element ? x : Object.assign(new Element('#text', this.ownerDocument), { textContent:x }); n.parentElement = this; this.children.push(n); }); }
  replaceChildren(...items) { this.children = []; this._text = ''; this.append(...items); }
  addEventListener(k,fn) { (this.listeners[k] ||= []).push(fn); }
  async fire(k,extra={}) { for (const fn of this.listeners[k] || []) await fn({target:this,preventDefault(){},...extra}); }
  click() { return this.disabled ? Promise.resolve() : this.fire('click'); }
  focus() { this.ownerDocument.activeElement = this; }
  closest(tag) { return this.tagName === tag ? this : this.parentElement?.closest(tag); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(n => n !== this); }
  querySelectorAll(sel) { if(sel === '.question-progress p span:last-child') return walk(this).filter(n=>n.tagName==='span').slice(-1); return walk(this).filter(n => sel.startsWith('.') ? n.className.split(' ').includes(sel.slice(1)) : n.tagName === sel); }
  querySelector(sel) { return this.querySelectorAll(sel)[0]; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}
function walk(n) { return [n,...n.children.flatMap(walk)]; }
function button(n,label) { const found=walk(n).find(x=>x.tagName==='button'&&x.textContent===label); assert.ok(found,'Missing '+label); return found; }
function input(n,label) { const found=walk(n).find(x=>x.getAttribute('aria-label')===label); assert.ok(found,'Missing '+label); return found; }
function store() { const map = new Map(); return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}; }
function activity() {
  const question=id=>({id,title:id,prompt:'Find the evidence',type:'fill',validation:{accepted:['yes']},hints:['Read the record'],workspace:{mode:'query',tableName:'Records',starterQuery:'Records\n| take 5'},report:{section:'timeline'}});
  return {id:'cloud-ui-case',revision:'1',scoring:{pointsPerQuestion:5,hintCost:1},tracks:[{id:'year1',label:'Year 1',sections:[{id:'first',title:'First section',availableArtifactIds:['A'],availableTableNames:['Records'],questions:[question('Y1-01'),question('Y1-02')]}]}],pages:[{id:'records',title:'Records',public:false,artifactIds:['A']}],caseData:{contentRevision:'1',artifacts:[{id:'A',type:'table',title:'Records',columns:['id'],rows:[['R-1']]}],discoveryChannels:{A:['data']},queryTables:{Records:{artifactId:'A',types:{id:'string'}}}}};
}
async function tick() { for(let i=0;i<15;i++) await Promise.resolve(); }
async function harness({sdk=true,guestAnswer='practice',remoteAnswer='account answer',cloudLimit=8*1024*1024,resumeSignedIn=false,signInFailure=null}={}) {
  const a=activity(), guest=C.createState(a); C.setAnswer(a,guest,'Y1-01',guestAnswer); C.revealHint(a,guest,'Y1-01',0);
  const local=store(),session=store(); local.setItem(C.STORAGE_KEY,JSON.stringify(guest));
  const document={},ids=['question-panel','workspace-toolbar','workspace-content','save-status','announcement','progress-status','finding-count','track-switch','report-toggle','backup','restore','export-report','import-file','cloud-account','cloud-status','cloud-dialog'];
  const nodes=new Map(ids.map(id=>[id,Object.assign(new Element('div',document),{id})])); nodes.get('cloud-dialog').hidden=true;
  const body=new Element('body',document); body.append(...nodes.values());
  Object.assign(document,{body,getElementById:id=>nodes.get(id)||walk(body).find(n=>n.id===id),createElement:tag=>new Element(tag,document),createTextNode:t=>Object.assign(new Element('#text',document),{textContent:t})});
  const location={hash:'#/year1'},history={replaceState(_a,_b,h){location.hash=h;}},events={},mounted=[],blobs=[],calls={save:[],sdk:[],keepLocal:0,useCloud:0,signOut:[]};
  let opts, snap={user:null,ready:false,dirty:false,state:null,conflict:null}, failSave=false, failRecovery=false;
  const remote=C.createState(a); C.setAnswer(a,remote,'Y1-01',remoteAnswer);
  const emit=(kind,message)=>opts.onStatus({kind,message,user:snap.user,dirty:snap.dirty});
  const controller={
    getSnapshot:()=>copy(snap),
    getConflictCopies:()=>snap.conflict?{local:copy(snap.state),remote:copy(remote),source:'cloud'}:null,
    getBackups:()=>snap.user?[{id:'backup-1',kind:'device',savedAt:'2026-10-09T18:00:00Z',state:copy(guest)}]:[],
    async resume(){ await Promise.resolve(); if(resumeSignedIn){snap={user:{id:'returning',email:'returning@students.mrqcyber.com'},ready:true,dirty:false,state:copy(remote),conflict:null};opts.onRemote(copy(remote),{source:'cloud',user:snap.user});emit('saved','Saved online.');return true;}emit('signed-out','Sign in to save across devices.'); return false; },
    async signIn(name){ await Promise.resolve(); snap={user:{id:name,email:name+'@students.mrqcyber.com'},ready:!signInFailure,dirty:false,state:copy(remote),conflict:null};if(signInFailure){emit(signInFailure,'Account progress could not load.');return false;} opts.onRemote(copy(remote),{source:'cloud',user:snap.user}); emit('saved','Saved online.'); return true; },
    save(value){ if(!snap.user||!snap.ready)return false; calls.save.push(copy(value));snap.state=copy(value);snap.dirty=true;emit('saving','Saving online…');return true;},
    async flush(){ if(failSave){emit('offline','Offline—waiting to sync.');return false;}snap.dirty=false;emit('saved','Saved online.');return true;},
    async retry(){return this.flush();},
    async signOut(options={}){calls.signOut.push(options);if(snap.dirty&&!options.allowPending&&!await this.flush())return false;snap={user:null,ready:false,dirty:false,state:null,conflict:null};emit('signed-out','Sign in to save across devices.');return true;},
    async useCloud(options={}){calls.useCloud++;if(failRecovery&&!options.backupDownloaded){emit('error','Browser storage is full.');return false;}calls.resolution=options;snap.conflict=null;snap.dirty=false;opts.onRemote(copy(remote));emit('saved','Saved online.');return true;},
    async keepLocal(options={}){calls.keepLocal++;if(failRecovery&&!options.backupDownloaded){emit('error','Browser storage is full.');return false;}calls.resolution=options;snap.conflict=null;snap.dirty=false;emit('saved','Saved online.');return true;}
  };
  const window={CAMPAIGN_ACTIVITY:a,CampaignPlayerCore:C,CampaignQuery:Q,CAMPAIGN_CLOUD_CONFIG:{url:'https://example.supabase.co',publishableKey:'public-test',assignmentId:'fall',emailDomain:'students.mrqcyber.com'},localStorage:local,sessionStorage:session,addEventListener(k,fn){(events[k]||=[]).push(fn);},CampaignCloudSync:{MAX_BYTES:cloudLimit,create(options){opts=options;return controller;}},CampaignPlayerEditor:{mount(_host,options){const api={getValue:()=>options.initialQuery,getRestoredRun:()=>null,destroy(){},focus(){}};mounted.push({options,api});return api;}}};
  if(sdk)window.supabase={createClient(...args){calls.sdk.push(args);return {};}};
  const context=vm.createContext({window,document,location,history,localStorage:local,TextEncoder,Blob,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:test';},revokeObjectURL(){}},setTimeout(){return 1;},clearTimeout(){},console});
  vm.runInContext(fs.readFileSync(path.join(folder,'cloud-ui.js'),'utf8'),context);
  let adapter;const mount=window.CampaignCloudUI.mount;window.CampaignCloudUI={mount(value){adapter=value;return mount(value);}};
  let source=fs.readFileSync(path.join(folder,'player.js'),'utf8'),end=source.lastIndexOf('\n})();');
  source=source.slice(0,end)+'\nglobalThis.testPlayer={get state(){return state;},getBackupContext:options=>cloudSession.getBackupContext(options),save,replaceSessionState};'+source.slice(end);
  vm.runInContext(source,context); await tick();
  return {a,guest,remote,local,session,nodes,body,calls,mounted,blobs,api:context.testPlayer,controller,adapter,
    async login(name='P2-Student07'){await nodes.get('cloud-account').click();const d=nodes.get('cloud-dialog');input(d,'Class username').value=name;input(d,'Password').value='example-password';await walk(d).find(n=>n.tagName==='form').fire('submit');await tick();},
    async edit(answer){const field=input(nodes.get('question-panel'),'Answer');field.value=answer;await field.fire('input');},
    async account(){await nodes.get('cloud-account').click();return nodes.get('cloud-dialog');},
    failSave(){failSave=true;},emit,
    failRecovery(){failRecovery=true;},
    loseCache(){snap.locallySaved=false;failSave=true;},
    notReady(kind='not-enrolled'){snap.ready=false;emit(kind,kind==='not-enrolled'?'Ask your teacher to assign this account.':'Online progress storage has not been set up yet.');},
    conflict(){snap.conflict={state:copy(remote),revision:4};emit('conflict','Different progress in another session.');opts.onConflict({local:snap.state,remote});},
    async event(type,event){for(const fn of events[type]||[])await fn(event);}
  };
}
test('online controls use tab-scoped auth and never upload practice during startup or sign-in',async()=>{
  const h=await harness(); assert.equal(h.calls.save.length,0); assert.equal(h.nodes.get('cloud-dialog').open,true);
  const auth=h.calls.sdk[0][2].auth;assert.equal(auth.storage,h.session);assert.equal(auth.persistSession,true);assert.equal(auth.autoRefreshToken,true);assert.equal(auth.detectSessionInUrl,false);
  await h.login();assert.equal(h.api.state.responses['Y1-01'].answer,'account answer');assert.equal(h.api.state.responses['Y1-01'].hints.length,0);assert.equal(h.calls.save.length,0);assert.equal(JSON.parse(h.local.getItem(C.STORAGE_KEY)).responses['Y1-01'].answer,'practice');
});
test('account edits bypass guest storage and signing out restores only the separate practice copy',async()=>{
  const h=await harness();await h.login();await h.edit('new account work');assert.equal(h.calls.save.at(-1).responses['Y1-01'].answer,'new account work');assert.equal(JSON.parse(h.local.getItem(C.STORAGE_KEY)).responses['Y1-01'].answer,'practice');
  await button(await h.account(),'Sign out').click();await tick();assert.equal(h.api.state.responses['Y1-01'].answer,'practice');
  await h.login('P2-Student08');assert.equal(h.api.state.responses['Y1-01'].answer,'account answer');assert.equal(h.api.state.responses['Y1-01'].hints.length,0);
});
test('practice import needs explicit confirmation and leaves the original guest backup intact',async()=>{
  const h=await harness();await h.login();const d=await h.account();await button(d,'Copy this browser’s practice work').click();assert.equal(h.calls.save.length,0);assert.equal(h.api.state.responses['Y1-01'].answer,'account answer');
  await button(d,'Confirm copy my practice work').click();assert.equal(h.calls.save.at(-1).responses['Y1-01'].answer,'practice');assert.equal(h.api.state.responses['Y1-01'].hints.length,1);assert.equal(JSON.parse(h.local.getItem(C.STORAGE_KEY)).responses['Y1-01'].answer,'practice');
});
test('offline status is distinct and pending sign-out requires an explicit preserve-copy choice',async()=>{
  const h=await harness();await h.login();await h.edit('unsynced');h.failSave();const d=await h.account();await button(d,'Sign out').click();await tick();assert.match(h.nodes.get('cloud-status').textContent,/Offline/);assert.equal(h.controller.getSnapshot().user.id,'P2-Student07');assert.match(d.textContent,/have not reached the server/);
  await button(d,'Download unsynced backup').click();assert.equal(h.blobs.length,1);await button(d,'Sign out and keep an offline copy').click();await tick();assert.equal(h.calls.signOut.at(-1).allowPending,true);assert.equal(h.api.state.responses['Y1-01'].answer,'practice');
});
test('conflict overwrite takes a second explicit action and loading online replaces the screen',async()=>{
  const h=await harness();await h.login();await h.edit('conflicting work');h.conflict();const d=h.nodes.get('cloud-dialog');assert.equal(h.calls.keepLocal,0);await button(d,'Use this copy online').click();assert.equal(h.calls.keepLocal,0);await button(d,'Confirm use this copy').click();await tick();assert.equal(h.calls.keepLocal,1);
  h.conflict();await button(d,'Load online version').click();await tick();assert.equal(h.calls.useCloud,1);assert.equal(h.api.state.responses['Y1-01'].answer,'account answer');
});
test('stale query callbacks cannot write into a newly loaded account at the same question',async()=>{
  const h=await harness();const previous=h.mounted.at(-1);await h.login();const before=h.calls.save.length;previous.options.onDraftChange('Records | count');previous.options.onRun({query:'Records | count'});assert.equal(h.calls.save.length,before);assert.notEqual(h.api.state.responses['Y1-01'].query,'Records | count');
});
test('missing online SDK leaves browser practice usable and never claims online saving',async()=>{
  const h=await harness({sdk:false});await h.edit('local continuation');assert.equal(JSON.parse(h.local.getItem(C.STORAGE_KEY)).responses['Y1-01'].answer,'local continuation');assert.match(h.nodes.get('cloud-status').textContent,/unavailable/);assert.equal(h.calls.save.length,0);
});
test('an authenticated account without loaded progress cannot close into another copy',async()=>{
  const h=await harness();await h.login();h.notReady();const d=await h.account();assert.equal(button(d,'Return to investigation').disabled,true);let prevented=false;await d.fire('cancel',{preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(d.open,true);assert.match(d.textContent,/teacher to assign/);
  assert.equal(h.controller.save(h.api.state),false);await button(d,'Sign out').click();await tick();assert.equal(h.controller.getSnapshot().user,null);assert.equal(button(d,'Continue in browser practice').disabled,false);
});
test('setup and expired-session errors retain recovery and explicit sign-out paths',async()=>{
  const h=await harness();await h.login();h.notReady('error');let d=await h.account();assert.match(d.textContent,/has not been set up/);assert.equal(button(d,'Return to investigation').disabled,true);assert.ok(button(d,'Retry online connection'));
  await button(d,'Sign out').click();await tick();await h.login();h.emit('auth-required','Your session has expired. Sign in again.');d=await h.account();assert.match(d.textContent,/expired/);assert.ok(button(d,'Download progress backup'));await button(d,'Sign out').click();await tick();await h.login();assert.equal(h.api.state.responses['Y1-01'].answer,'account answer');
});
test('alternate conflict copies download only from the signed-in account controls',async()=>{
  const h=await harness();await h.login();const d=await h.account();await button(d,'Download device copy · 2026-10-09T18:00:00Z').click();assert.equal(h.blobs.length,1);const saved=JSON.parse(await h.blobs[0].text());assert.equal(saved.responses['Y1-01'].answer,'practice');
  await button(d,'Sign out').click();await tick();assert.doesNotMatch(d.textContent,/Alternate copies/);
});
test('a conflict blocked by recovery storage requires downloading the losing copy and acknowledging it',async()=>{
  const h=await harness();await h.login();await h.edit('copy to preserve');h.conflict();h.failRecovery();const d=h.nodes.get('cloud-dialog');await button(d,'Load online version').click();await tick();assert.equal(h.calls.resolution,undefined);assert.equal(h.api.state.responses['Y1-01'].answer,'copy to preserve');
  await button(d,'Download the version being replaced').click();const backup=JSON.parse(await h.blobs.at(-1).text());assert.equal(backup.responses['Y1-01'].answer,'copy to preserve');assert.equal(h.calls.resolution,undefined);
  await button(d,'I saved the backup — continue').click();await tick();assert.equal(h.calls.resolution.backupDownloaded,true);assert.equal(h.api.state.responses['Y1-01'].answer,'account answer');
});
test('uncached sign-out never promises an offline copy and requires the current player backup',async()=>{
  const h=await harness();await h.login();await h.edit('only in memory');h.loseCache();const d=await h.account();await button(d,'Sign out').click();await tick();assert.doesNotMatch(d.textContent,/Sign out and keep an offline copy/);assert.match(d.textContent,/could not save the current work/);
  await button(d,'Download unsynced backup').click();const backup=JSON.parse(await h.blobs.at(-1).text());assert.equal(backup.responses['Y1-01'].answer,'only in memory');assert.ok(h.controller.getSnapshot().user);
  await button(d,'I saved my backup — sign out').click();await tick();assert.equal(h.calls.signOut.at(-1).backupDownloaded,true);assert.equal(h.controller.getSnapshot().user,null);
});
test('cloud imports validate their online size before replacing current answers',async()=>{
  const h=await harness({guestAnswer:'large practice '.repeat(500),cloudLimit:2500});await h.login();const d=await h.account();await button(d,'Copy this browser’s practice work').click();await button(d,'Confirm copy my practice work').click();await tick();assert.equal(h.api.state.responses['Y1-01'].answer,'account answer');assert.equal(h.calls.save.length,0);assert.match(d.textContent,/online-save limit/);
  const file=h.nodes.get('import-file'),raw=JSON.stringify(h.guest);file.files=[{size:raw.length,text:async()=>raw}];await file.fire('change');assert.equal(h.api.state.responses['Y1-01'].answer,'account answer');assert.match(h.nodes.get('save-status').textContent,/online-save limit/);
});
test('signed-out startup requires a clear account or browser-practice choice',async()=>{
  const h=await harness(),d=h.nodes.get('cloud-dialog');
  assert.equal(d.open,true);assert.match(d.textContent,/reopen your saved responses/);assert.match(d.textContent,/1 practice response/);assert.match(d.textContent,/Sign in before downloading a backup of your account work/);
  let prevented=false;await d.fire('cancel',{preventDefault(){prevented=true;}});assert.equal(prevented,true);
  assert.deepEqual(copy(h.api.getBackupContext()),{mode:'practice',username:null,status:'signed-out'});
  await button(d,'Continue in browser practice').click();assert.equal(d.open,false);assert.equal(h.api.state.responses['Y1-01'].answer,'practice');assert.equal(h.calls.save.length,0);
});
test('returning authenticated sessions load their account and close the login dialog',async()=>{
  const h=await harness({resumeSignedIn:true});
  assert.equal(h.nodes.get('cloud-dialog').open,false);assert.equal(h.api.state.responses['Y1-01'].answer,'account answer');assert.equal(h.calls.save.length,0);
  assert.deepEqual(copy(h.api.getBackupContext()),{mode:'account',username:'returning',status:'saved'});
});
test('sign-out explains how to reopen account work before exposing separate practice',async()=>{
  const h=await harness({guestAnswer:''});await h.login();await h.edit('account response to preserve');const d=await h.account();await button(d,'Sign out').click();await tick();
  assert.equal(d.open,true);assert.match(d.textContent,/Sign back in to view or download your account work/);assert.match(h.nodes.get('cloud-status').textContent,/Browser practice is separate/);
  assert.equal(h.api.state.responses['Y1-01'].answer,'');assert.equal(h.calls.save.at(-1).responses['Y1-01'].answer,'account response to preserve');
  assert.deepEqual(copy(h.api.getBackupContext()),{mode:'practice',username:null,status:'signed-out'});
});
test('online-unavailable fallback reports practice ownership to backup controls',async()=>{
  const h=await harness({sdk:false});assert.deepEqual(copy(h.api.getBackupContext()),{mode:'practice',username:null,status:'error'});
});
test('a canceled backup cannot enable sign-out when the only copy is in memory',async()=>{
  const h=await harness();await h.login();await h.edit('only in memory');h.loseCache();const d=await h.account();await button(d,'Sign out').click();await tick();
  h.adapter.downloadBackup=async()=>false;await button(d,'Download unsynced backup').click();await tick();
  assert.doesNotMatch(d.textContent,/I saved my backup/);assert.ok(h.controller.getSnapshot().user);assert.equal(h.calls.signOut.length,1);
});
test('failed account hydration keeps current backups attributed to practice and recovery copies to their account',async()=>{
  for(const kind of ['not-enrolled','error']){
    const h=await harness({signInFailure:kind});await h.login('test-student');
    assert.equal(h.api.state.responses['Y1-01'].answer,'practice');
    assert.deepEqual(copy(h.api.getBackupContext()),{mode:'practice',username:null,status:kind});
    const d=await h.account();await button(d,'Download progress backup').click();
    const currentBackup=JSON.parse(await h.blobs.at(-1).text());
    assert.equal(currentBackup.responses['Y1-01'].answer,'practice');assert.equal(currentBackup._backup.mode,'practice');assert.equal(currentBackup._backup.username,null);
    await button(d,'Download device copy · 2026-10-09T18:00:00Z').click();
    const alternate=JSON.parse(await h.blobs.at(-1).text());assert.equal(alternate._backup.mode,'account');assert.equal(alternate._backup.username,'test-student');
  }
});
test('session-ready callbacks label practice after startup, explicit practice choice and sign-out',async()=>{
  const h=await harness();assert.match(h.nodes.get('save-status').textContent,/Browser practice/);
  await button(h.nodes.get('cloud-dialog'),'Continue in browser practice').click();assert.match(h.nodes.get('save-status').textContent,/Browser practice/);
  await h.login();assert.match(h.nodes.get('save-status').textContent,/Account work/);
  const d=await h.account();await button(d,'Sign out').click();await tick();assert.match(h.nodes.get('save-status').textContent,/Browser practice/);
});
