const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const osint=path.join(root,'learn/osint');

function loadLab({embedded=false}={}){
  const elements=new Map(),listeners=new Map();
  function element(selector){
    if(!elements.has(selector))elements.set(selector,{
      innerHTML:'',textContent:'',dataset:{},style:{},open:false,
      classList:{add(){}},setAttribute(){},removeAttribute(){},
      addEventListener(){},focus(){},querySelector(){return null;},querySelectorAll(){return [];}
    });
    return elements.get(selector);
  }
  const storage=()=>{
    const entries=new Map();
    return {getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
  };
  const context=vm.createContext({
    URL,URLSearchParams,
    document:{querySelector:element,querySelectorAll:()=>[],getElementById:id=>element('#'+id),body:element('body')},
    location:{hash:'#/search',search:embedded?'?campaignEmbed=1':'',pathname:'/learn/osint/',href:'https://mrqcyber.example/learn/osint/'},
    localStorage:storage(),sessionStorage:storage(),navigator:{},history:{replaceState(){}},
    scrollTo(){},addEventListener(type,callback){listeners.set(type,callback);}
  });
  context.window=context;
  context.parent=embedded?{postMessage(){}}:context;
  // Execute the actual page's complete script order, including app startup.
  const html=fs.readFileSync(path.join(osint,'index.html'),'utf8');
  for(const match of html.matchAll(/<script\s+src="([^"]+)"/g)){
    const file=path.resolve(osint,match[1].split('?')[0]);
    vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:path.relative(root,file)});
  }
  const evaluate=source=>vm.runInContext(source,context);
  return {
    evaluate,
    search(query){
      context.query=query;
      evaluate('search(query)');
      return Array.from(element('#main').innerHTML.matchAll(/<h3><a href="([^"]+)"/g),match=>match[1]);
    },
    openScope(ids){
      const page=evaluate('CAMPAIGN_ACTIVITY.pages.find(page=>page.id==="mandy-feed")');
      assert(page,'The guided investigation must retain its opening source page.');
      listeners.get('message')({source:context.parent,data:{type:'campaign-source-open',pageId:page.id,allowedArtifactIds:ids,route:'#/search'}});
    }
  };
}

test('the public page loads regional and campaign data together and finds both Mandy identities',()=>{
  const lab=loadLab();
  assert(lab.search('Mandy Tinkerman').includes('#/profile/mandy'));
  assert(lab.search('Mandy Schmear').includes('#/profile/campaign-mandy'));
  assert(lab.search('Capitol').includes('#/capitol'));
  assert(lab.search('High Five').some(href=>href.startsWith('#/campaign-case/')));
  assert.equal(lab.evaluate('PROFILES.mandy.name'),'Mandy Tinkerman');
  assert.equal(lab.evaluate('PROFILES["campaign-mandy"].name'),'Mandy Schmear');
});

test('campaign object comments remain searchable alongside the regional array comments',()=>{
  const lab=loadLab();
  const comment=lab.evaluate('POSTS["campaign-mandy-incident"].comments.find(comment=>!Array.isArray(comment))');
  assert(comment?.name,'Use an actual campaign object comment to exercise the mixed data formats.');
  assert.doesNotThrow(()=>lab.search(comment.name));
  assert(lab.search(comment.name).includes('#/post/campaign-mandy-incident'));
  assert(lab.search('Mandy Tinkerman').includes('#/post/mandy-campaign'));
});

test('embedded collection changes remove and restore campaign profiles and posts without stale search results',()=>{
  const lab=loadLab({embedded:true});
  const early=Array.from(lab.evaluate('CAMPAIGN_ACTIVITY.pages.find(page=>page.id==="mandy-feed").artifactIds'));
  const all=Array.from(lab.evaluate('CAMPAIGN_ACTIVITY.caseData.artifacts.filter(item=>CAMPAIGN_GUIDED_LAB.isCompassArtifact(item.id)).map(item=>item.id)'));
  const exists=expression=>lab.evaluate('Boolean('+expression+')');

  assert(!exists('PROFILES["campaign-mandy"]'));
  assert(!lab.search('Mandy Schmear').includes('#/profile/campaign-mandy'));
  assert(lab.search('Mandy Tinkerman').includes('#/profile/mandy'));

  lab.openScope(early);
  assert(exists('PROFILES["campaign-mandy"]'));
  assert(lab.search('Mandy Schmear').includes('#/profile/campaign-mandy'));
  assert(!exists('PROFILES["campaign-leon"]'));
  assert(!exists('POSTS["campaign-benny-2023-speech"]'));
  assert(!lab.search('Leon Tusk').includes('#/profile/campaign-leon'));
  assert(!lab.search('Benny Schmear').includes('#/post/campaign-benny-2023-speech'));

  lab.openScope(all);
  assert(exists('PROFILES["campaign-leon"]'));
  assert(exists('POSTS["campaign-benny-2023-speech"]'));
  assert(lab.search('Leon Tusk').includes('#/profile/campaign-leon'));
  assert(lab.search('Benny Schmear').includes('#/post/campaign-benny-2023-speech'));

  lab.openScope(early);
  assert(!exists('PROFILES["campaign-leon"]'));
  assert(!exists('POSTS["campaign-benny-2023-speech"]'));
  assert(!lab.search('Leon Tusk').includes('#/profile/campaign-leon'));
  assert(!lab.search('Benny Schmear').includes('#/post/campaign-benny-2023-speech'));
  assert(lab.search('Mandy Tinkerman').includes('#/profile/mandy'));
});
