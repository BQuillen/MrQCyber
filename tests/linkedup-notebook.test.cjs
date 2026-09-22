const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const code = fs.readFileSync('learn/linkedup/notebook.js', 'utf8');
function setup(saved) {
  const data = new Map();
  if (saved) data.set('mrq-linkedup-v1', JSON.stringify(saved));
  const localStorage = {getItem:k=>data.get(k)||null, setItem:(k,v)=>data.set(k,v), removeItem:k=>data.delete(k), key:i=>[...data.keys()][i], get length(){return data.size;}};
  const context = vm.createContext({localStorage, crypto:webcrypto, URL, location:{href:'https://classroom.example/learn/linkedup/#/notebook',origin:'https://classroom.example',pathname:'/learn/linkedup/'}, $:()=>null});
  vm.runInContext(code + '\nlet state=loadNotebookState(); const esc=s=>String(s??\'\').replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;", "\'":"&#39;"}[c]));', context);
  return {run:source=>vm.runInContext(source,context), localStorage};
}
test('existing student drafts migrate without losing work or duplicating it',()=>{
  const {run}=setup({findings:[{about:'Lena',text:'Teaching',why:'Earlier note'}],draft:{angle:'Workshop',action:'Review the opportunity',annotations:'Evidence analysis',changes:'Adjust tone',unsupported:'Unverified title',verification:'Call the company',body:'Revised draft',review:'Legacy review'}});
  const first=run('JSON.stringify(state)');
  run('state=normalizeNotebook(state)');
  assert.equal(run('JSON.stringify(state)'),first);
  assert.match(run('state.draft.angle'),/Workshop[\s\S]+Review the opportunity/);
  assert.equal(run('state.draft.analysis'),'Evidence analysis');
  assert.match(run('state.draft.reflection'),/Adjust tone[\s\S]+Unverified title[\s\S]+Call the company/);
  assert.equal(run('state.draft.body'),'Revised draft');
  assert.equal(run('state.findings[0].why'),'Earlier note');
});
test('field updates preserve newer saved findings from another tab',()=>{
  const {run,localStorage}=setup({findings:[],draft:{subject:'Existing subject'}});
  localStorage.setItem('mrq-linkedup-v1',JSON.stringify({findings:[{id:'other',about:'Sam',text:'Access matters',favorite:true}],draft:{subject:'Newer subject'}}));
  run('updateNotebook(next=>{next.draft.prompt="My prompt";})');
  assert.equal(run('state.findings.length'),1);
  assert.equal(run('state.draft.subject'),'Newer subject');
  assert.equal(run('state.draft.prompt'),'My prompt');
});
test('prompt packet includes only starred evidence',()=>{
  const {run}=setup({findings:[{about:'Used',text:'Teaching',favorite:true,context:'Public post'},{about:'Unused',text:'Do not include',favorite:false}],draft:{target:'Lena',angle:'Workshop role',prompt:'Professional tone'}});
  const packet=run('promptPacket()');
  assert.match(packet,/Teaching/);assert.match(packet,/Public post/);assert.doesNotMatch(packet,/Do not include/);
});
test('highlighted email escapes pasted markup and source links stay within research pages',()=>{
  const {run}=setup();
  assert.equal(run('highlightedEmail("==<script>alert(1)</script>==")'),'<mark>&lt;script&gt;alert(1)&lt;/script&gt;</mark>');
  assert.equal(run('safeSource("javascript:alert(1)")'),'');
  assert.equal(run('safeSource("https://outside.example/learn/linkedup/#/person/lena")'),'');
  assert.equal(run('safeSource("#/login")'),'');
  assert.equal(run('safeSource("#/post/lena-1")'),'https://classroom.example/learn/linkedup/#/post/lena-1');
  assert.equal(run('safeSource("#/company-post/current-classroom-model")'),'https://classroom.example/learn/linkedup/#/company-post/current-classroom-model');
  assert.equal(run('safeSource("https://outside.example/learn/linkedup/#/company-post/current-classroom-model")'),'');
});
