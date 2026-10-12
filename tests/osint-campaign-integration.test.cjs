const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const C=require('../learn/osint/campaign-player/player-core.js');

const root=path.resolve(__dirname,'..');
const osint=path.join(root,'learn/osint');

function loadLab({embedded=false,site='osint'}={}){
  const elements=new Map(),listeners=new Map(),messages=[],copied=[];
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
    URL,URLSearchParams,crypto:webcrypto,clearInterval(){},setTimeout(){return 1;},clearTimeout(){},
    document:{querySelector:element,querySelectorAll:()=>[],getElementById:id=>element('#'+id),body:element('body')},
    location:{hash:site==='linkedup'?'#/person/mandy':'#/search',search:embedded?'?campaignEmbed=1':'',pathname:'/learn/'+site+'/',href:'https://mrqcyber.example/learn/'+site+'/'},
    localStorage:storage(),sessionStorage:storage(),navigator:{clipboard:{writeText(value){copied.push(value);return Promise.resolve();}}},history:{replaceState(){}},
    scrollTo(){},addEventListener(type,callback){listeners.set(type,callback);}
  });
  context.window=context;
  context.parent=embedded?{postMessage(value){messages.push(value);}}:context;
  // Execute the actual page's complete script order, including app startup.
  const siteRoot=path.join(root,'learn',site);
  const html=fs.readFileSync(path.join(siteRoot,'index.html'),'utf8');
  for(const match of html.matchAll(/<script\s+src="([^"]+)"/g)){
    const file=path.resolve(siteRoot,match[1].split('?')[0]);
    vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:path.relative(root,file)});
  }
  const evaluate=source=>vm.runInContext(source,context);
  return {
    evaluate,
    render(route=context.location.hash){context.location.hash=route;evaluate('render()');return element('#main').innerHTML;},
    changeFilter(selector,value){const control=element(selector);control.value=value;assert.equal(typeof control.onchange,'function');control.onchange();return context.location.hash;},
    click(selector){const control=element(selector);assert.equal(typeof control.onclick,'function');control.onclick();return element('#main').innerHTML;},
    messages(){return JSON.parse(JSON.stringify(messages));},
    copied(){return [...copied];},
    search(query){
      context.query=query;
      evaluate('search(query)');
      return Array.from(element('#main').innerHTML.matchAll(/<h3><a href="([^"]+)"/g),match=>match[1]);
    },
    openScope(ids,pageId='mandy-feed'){
      const page=evaluate('CAMPAIGN_ACTIVITY.pages.find(page=>page.id==='+JSON.stringify(pageId)+')');
      assert(page,'The guided investigation must retain its opening source page.');
      listeners.get('message')({source:context.parent,data:{type:'campaign-source-open',pageId:page.id,allowedArtifactIds:ids,route:'#/search'}});
    }
  };
}

test('Compass connects the governor’s community and campaign accounts as Mandy Schmear',()=>{
  const lab=loadLab();
  assert(lab.search('Mandy Schmear').includes('#/profile/mandy'));
  assert(lab.search('Mandy Schmear').includes('#/profile/campaign-mandy'));
  assert(lab.search('mandy.schmear.community').includes('#/profile/mandy'));
  assert(lab.search('mandy.schmear').includes('#/profile/campaign-mandy'));
  for(const query of ['Mandy Tinkerman','Tinkerman','mandy.tinkerman'])assert.equal(lab.search(query).length,0,query);
  assert(lab.search('Capitol').includes('#/capitol'));
  assert(lab.search('High Five').some(href=>href.startsWith('#/campaign-case/')));
  assert.equal(lab.evaluate('PROFILES.mandy.name'),'Mandy Schmear');
  assert.equal(lab.evaluate('PROFILES["campaign-mandy"].name'),'Mandy Schmear');
  assert.equal(lab.evaluate('PROFILES.mandy.handle'),'mandy.schmear.community');
  assert.equal(lab.evaluate('PROFILES["campaign-mandy"].handle'),'mandy.schmear');
});

test('campaign object comments remain searchable alongside the regional array comments',()=>{
  const lab=loadLab();
  const comment=lab.evaluate('POSTS["campaign-mandy-incident"].comments.find(comment=>!Array.isArray(comment))');
  assert(comment?.name,'Use an actual campaign object comment to exercise the mixed data formats.');
  assert.doesNotThrow(()=>lab.search(comment.name));
  assert(lab.search(comment.name).includes('#/post/campaign-mandy-incident'));
  assert(lab.search('Mandy Schmear').includes('#/post/mandy-campaign'));
});

test('embedded collection changes remove and restore campaign profiles and posts without stale search results',()=>{
  const lab=loadLab({embedded:true});
  const early=Array.from(lab.evaluate('CAMPAIGN_ACTIVITY.pages.find(page=>page.id==="mandy-feed").artifactIds'));
  const all=Array.from(lab.evaluate('CAMPAIGN_ACTIVITY.caseData.artifacts.filter(item=>CAMPAIGN_GUIDED_LAB.isCompassArtifact(item.id)).map(item=>item.id)'));
  const exists=expression=>lab.evaluate('Boolean('+expression+')');

  assert(!exists('PROFILES["campaign-mandy"]'));
  assert(!lab.search('Mandy Schmear').includes('#/profile/campaign-mandy'));
  assert(lab.search('Mandy Schmear').includes('#/profile/mandy'));
  assert.doesNotMatch(lab.render('#/profile/mandy'),/href="#\/profile\/campaign-mandy"/);

  lab.openScope(early);
  assert(exists('PROFILES["campaign-mandy"]'));
  assert(lab.search('Mandy Schmear').includes('#/profile/campaign-mandy'));
  assert.match(lab.render('#/profile/mandy'),/href="#\/profile\/campaign-mandy"/);
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
  assert(lab.search('Mandy Schmear').includes('#/profile/mandy'));
});

test('both Frame accounts, the Capitol, and LinkedUP render the governor’s existing Schmear photographs',()=>{
  const lab=loadLab();
  const community=lab.render('#/profile/mandy');
  const campaign=lab.render('#/profile/campaign-mandy');
  assert.match(community,/Community account/);
  assert.match(campaign,/Campaign account/);
  assert.match(community,/href="#\/profile\/campaign-mandy"/);
  assert.match(campaign,/href="#\/profile\/mandy"/);
  const base='https://mrqcyber.example/learn/osint/';
  const images=(html,url=base)=>Array.from(html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g),match=>new URL(match[1],url).pathname);
  const portrait='/learn/osint/campaign-player/images/mandy-schmear-reference.png';
  const setting='/learn/osint/campaign-player/images/community-listening.png';
  assert(images(community).includes(portrait));
  assert(images(campaign).includes(portrait));
  assert(images(community).includes(setting));
  const capitol=lab.render('#/capitol');
  assert.match(capitol,/Governor Mandy Schmear/);
  assert(images(capitol).includes(portrait));
  assert.doesNotMatch(capitol,/November 2027|not on this year.s ballot/i);
  const linked=loadLab({site:'linkedup'});
  const professional=linked.render('#/person/mandy');
  assert.match(professional,/Mandy Schmear/);
  assert(images(professional,'https://mrqcyber.example/learn/linkedup/').includes(portrait));
  assert(images(professional,'https://mrqcyber.example/learn/linkedup/').includes(setting));
  for(const html of [community,campaign,capitol,professional])assert.doesNotMatch(html,/Tinkerman|mandy-portrait\.jpg|mandy-visit\.jpg/i);
});

const feedPosts=html=>Array.from(html.matchAll(/<article class="post" id="([^"]+)">([\s\S]*?)<\/article>/g),match=>({id:match[1],html:match[2]}));
const feedIds=html=>feedPosts(html).map(post=>post.id);

test('Benny’s default Frame feed displays every post and keeps its source beneath that post',async()=>{
  const lab=loadLab(),html=lab.render('#/profile/campaign-benny'),posts=feedPosts(html);
  assert.equal(posts.length,13);
  assert.deepEqual(posts.map(post=>post.id),Array.from(lab.evaluate('PROFILES["campaign-benny"].posts')));
  assert(posts.some(post=>post.id==='campaign-benny-2023-speech'));
  assert(posts.some(post=>post.id==='campaign-benny-2023-whiteboard'));
  assert(!html.includes('Load older posts'),'Campaign history should not hide the requested dated posts behind pagination.');
  const header=html.slice(0,html.indexOf('<article class="post"'));
  assert(!header.includes('data-campaign-cite'),'No aggregate citation controls belong in the profile header.');
  assert(!/preserved public posts|Source references/.test(header));
  assert(!header.includes('BENNY-SPEECH-04')&&!header.includes('BENNY-BOARD-04'),'The header does not enumerate every source supporting the feed.');
  const expectedSources=new Set();
  for(const post of posts){
    const source=lab.evaluate('POSTS['+JSON.stringify(post.id)+'].artifactId');
    expectedSources.add(source);
    assert.deepEqual(Array.from(post.html.matchAll(/data-campaign-cite="([^"]+)"/g),match=>match[1]),[source],post.id);
    assert(post.html.includes('Copy source ID · '+source),post.id);
    assert(post.html.includes('href="#/campaign-case/source-'+source+'"'),post.id+' retains its source details');
  }
  for(const id of expectedSources)lab.evaluate('CampaignLabBridge.cite('+JSON.stringify(id)+')');
  await Promise.resolve();
  assert.deepEqual(lab.copied(),[...expectedSources]);
});

test('the Frame year and month controls find September and October posts and retain older year-only links',()=>{
  const lab=loadLab();
  let html=lab.render('#/profile/campaign-benny');
  assert(html.includes('id="profile-year-filter"')&&html.includes('id="profile-month-filter"'));
  assert.equal(lab.changeFilter('#profile-year-filter','2023'),'#/profile/campaign-benny?year=2023');
  html=lab.render();
  assert.equal(feedIds(html).length,8);
  assert(feedIds(html).includes('campaign-benny-2023-speech')&&feedIds(html).includes('campaign-benny-2023-whiteboard'));
  assert.equal(lab.changeFilter('#profile-month-filter','09'),'#/profile/campaign-benny?year=2023&month=09');
  html=lab.render();
  assert.equal(feedIds(html).length,5);
  assert(feedIds(html).includes('campaign-benny-2023-speech'));
  assert(!feedIds(html).includes('campaign-benny-2023-whiteboard'));
  assert.equal(lab.changeFilter('#profile-month-filter','10'),'#/profile/campaign-benny?year=2023&month=10');
  html=lab.render();
  assert.deepEqual(feedIds(html),['campaign-benny-2023-rain','campaign-benny-2023-whiteboard','campaign-benny-2023-biscuits']);
  assert.equal(lab.changeFilter('#profile-year-filter','2026'),'#/profile/campaign-benny?year=2026','Changing year clears the previous month.');
  assert.equal(feedIds(lab.render()).length,5);
  assert.equal(feedIds(lab.render('#/profile/campaign-benny?year=2023')).length,8,'Existing year-only source links still work.');
  assert.equal(feedIds(lab.render('#/profile/campaign-benny')).length,13,'All dates restores the whole feed.');
});

test('expanded feeds and date filters preserve scoped source permissions and per-post citations',()=>{
  const lab=loadLab({embedded:true});
  lab.openScope(['FRAME-02'],'benny-feed');
  let html=lab.render('#/profile/campaign-benny');
  assert.equal(feedIds(html).length,5);
  assert(!html.includes('campaign-benny-2023-speech')&&!html.includes('campaign-benny-2023-whiteboard'));
  assert(!html.includes('value="2023"'),'Hidden years are not offered by the date filter.');
  assert.equal(feedIds(lab.render('#/profile/campaign-benny?year=2023&month=09')).length,5,'A manually edited date cannot expand the evidence collection.');
  const before=lab.messages().filter(message=>message.type==='campaign-source-cite').length;
  for(const id of ['BENNY-SPEECH-04','PAIGE-MESSAGES-04','PRIVATE-PLAN-02'])lab.evaluate('CampaignLabBridge.cite('+JSON.stringify(id)+')');
  assert.equal(lab.messages().filter(message=>message.type==='campaign-source-cite').length,before);
  const scope=Array.from(lab.evaluate('CAMPAIGN_ACTIVITY.tracks[0].sections[0].availableArtifactIds'));
  lab.openScope(scope,'benny-feed');
  html=lab.render('#/profile/campaign-benny');
  assert.equal(feedIds(html).length,13);
  for(const post of feedPosts(html)){
    const source=lab.evaluate('POSTS['+JSON.stringify(post.id)+'].artifactId');
    assert(post.html.includes('data-campaign-cite="'+source+'"'),post.id);
  }
  lab.evaluate('CampaignLabBridge.cite("BENNY-SPEECH-04")');
  assert.deepEqual(lab.messages().filter(message=>message.type==='campaign-source-cite').at(-1),{type:'campaign-source-cite',artifactId:'BENNY-SPEECH-04'});
  assert.equal(lab.evaluate('CAMPAIGN_GUIDED_LAB.isRouteAvailable("#/campaign-case/source-PRIVATE-PLAN-02")'),false);
  assert.equal(lab.evaluate('CAMPAIGN_GUIDED_LAB.isRouteAvailable("#/profile/campaign-leon")'),false);
  assert(!html.includes('PRIVATE-PLAN-02')&&!html.includes('PAIGE-MESSAGES-04'));
  const location=lab.messages().filter(message=>message.type==='campaign-source-location').at(-1);
  assert(location.artifactIds.includes('BENNY-SPEECH-04'),'The parent still receives the source metadata needed for navigation and citing.');
  for(const id of location.artifactIds)assert(scope.includes(id));
  lab.openScope(['FRAME-02'],'benny-feed');
  assert.equal(feedIds(lab.render('#/profile/campaign-benny')).length,5,'Returning to an earlier collection removes the additional posts again.');
});

test('ordinary Frame profiles retain their existing posts, pagination, and evidence controls',()=>{
  const lab=loadLab(),initial=lab.render('#/profile/casey');
  assert.match(initial,/Casey Selvin/);
  assert.deepEqual(feedIds(initial),['p101','p107','p108']);
  assert(!initial.includes('profile-year-filter'));
  for(const post of feedPosts(initial))assert(post.html.includes('data-record="/post/'+post.id+'"'),post.id);
  const expanded=lab.click('#older');
  assert.deepEqual(feedIds(expanded),['p101','p107','p108','p102','p109','p103']);
  assert(expanded.includes('data-record="/post/p103"'));
  assert.equal(feedIds(lab.render('#/profile/campaign-benny')).length,13,'The separate ordinary-feed pagination cannot hide campaign posts.');
});

test('the publication-event question opens Benny’s full Frame feed while preserving its KQL investigation',()=>{
  const lab=loadLab({embedded:true});
  const activity=JSON.parse(lab.evaluate('JSON.stringify(CAMPAIGN_ACTIVITY)')),state=C.createState(activity);
  const target=C.locate(activity,'Y2-07a');
  for(const q of C.questions(activity,'year2')){
    if(q.id===target.question.id)break;
    C.setAnswer(activity,state,q.id,q.type==='choice'?q.validation.correctOption:q.type==='fill'?q.validation.accepted[0]:'My source explanation.');
    assert.equal(C.submit(activity,state,q.id).ok,true,q.id);
  }
  assert.deepEqual(target.question.workspace,{mode:'query',tableName:'DisclosurePublicationEvents',starterQuery:'DisclosurePublicationEvents',pageId:'benny-feed'});
  assert.equal(C.pageAvailable(activity,state,'Y2-07a','benny-feed'),true);
  assert.equal(lab.evaluate('CAMPAIGN_GUIDED_LAB.routeForPage("benny-feed")'),'/profile/campaign-benny');
  const scoped=C.scopedCase(activity,state,'Y2-07a');
  assert(scoped.artifacts.some(artifact=>artifact.id==='PUBLICATION-AUDIT-04'));
  lab.openScope(scoped.artifacts.map(artifact=>artifact.id),'benny-feed');
  const html=lab.render('#/profile/campaign-benny');
  assert(feedIds(html).includes('campaign-benny-2023-speech'));
  assert(feedIds(html).includes('campaign-benny-2023-whiteboard'));
  assert(C.validateAnswer(target.question,'DP-402').ok);
});
