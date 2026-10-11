const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context=vm.createContext({});
for(const file of ['learn/osint/data.js','learn/linkedup/world.js','learn/osint/regional-data.js','learn/osint/search.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const {region,world,profiles,posts,articles,search,index}=vm.runInContext('({region:REGION,world:WORLD,profiles:PROFILES,posts:POSTS,articles:ARTICLES,search:CompassSearch,index:CompassSearch.buildIndex(PROFILES,WORLD,SEARCH_INDEX,REGION,POSTS,ARTICLES)})',context);
const found=q=>Array.from(search.find(index,q),x=>x.r.href);
const linkExists=href=>{
  const url=new URL(href,'https://mrqcyber.example/learn/osint/');
  const [,type,id]=url.hash.split('?')[0].split('/');
  if(url.pathname==='/learn/linkedup/'){
    if(!type)return true;
    if(type==='person')return !!world.people[id];
    if(type==='company')return !!world.companies[id];
    if(type==='company-post')return Object.values(world.companies).some(c=>c.updates.some(p=>p.id===id));
    if(type==='post')return Object.values(world.people).some(p=>p.posts.some(x=>x.id===id));
    if(type==='document')return !!world.docs[id];
    return false;
  }
  const collections={story:region.articles,document:region.documents,site:region.sites,profile:profiles,post:posts,article:articles,reporter:region.authors};
  if(collections[type])return !!collections[type][id];
  if(type==='discussion')return region.threads.some(t=>t.id===id);
  if(type==='job')return region.jobs.some(j=>j.id===id);
  return ['capitol','calendar','brainstorm','social','destinations','news','work','club','gaming','search','directory','tiktok','twitch'].includes(type);
};
test('public expansion links resolve to real people, companies, articles, and records',()=>{
  const links=[...region.destinations.map(d=>d[2]),...region.events.map(e=>e.href)];
  for(const a of Object.values(region.articles)){assert(region.authors[a.author]);links.push(...a.links.map(l=>l[1]));for(const id of a.related)assert(region.articles[id]);}
  for(const d of Object.values(region.documents))links.push(...d.links.map(l=>l[1]));
  for(const[id,s]of Object.entries(region.sites)){assert(world.companies[id]);links.push(...s.links.map(l=>l[1]));for(const d of s.documents)assert(region.documents[d]);for(const [, ,p]of s.leadership)if(p)assert(world.people[p]);}
  for(const t of region.threads){links.push(...t.links.map(l=>l[1]));if(t.profile)assert(world.people[t.profile]);for(const[,,p]of t.comments)if(p)assert(world.people[p]);}
  for(const href of links)assert(linkExists(href),href);
});
test('social references, histories, and company conversations remain valid after expansion',()=>{
  const postIds=[];
  for(const [id,p]of Object.entries(world.people)){
    assert(world.companies[p.company],id);
    for(const h of p.history)assert(world.companies[h.company],id+': '+h.company);
    for(const other of p.connections)assert(world.people[other],id+': '+other);
    for(const post of p.posts){postIds.push(post.id);for(const[author]of post.comments)assert(world.people[author],post.id+': '+author);}
  }
  for(const c of Object.values(world.companies))for(const p of c.updates){postIds.push(p.id);for(const[a]of p.comments)assert(world.people[a]||world.community[a],p.id+': '+a);}
  assert.equal(new Set(postIds).size,postIds.length);
  for(const p of Object.values(posts)){assert(profiles[p.owner]);for(const[author]of p.comments)assert(profiles[author],author);}
  for(const p of Object.values(profiles))for(const id of p.posts)assert(posts[id]);
});
test('new photographs exist and every developed new person has a second setting',()=>{
  const check=name=>assert(fs.existsSync(path.join('learn',world.localImages.includes(name)?'linkedup':'osint','assets',name+'.jpg')),name);
  for(const id of ['mandy','ada','rowan','vera','mara-bell','nina-cho','rafael-cruz']){
    const p=world.people[id];if(profiles[id])assert.equal(p.name,profiles[id].name);
    const names=new Set([p.image,...p.posts.map(p=>p.image).filter(Boolean)]);
    assert(names.size>=2,id);for(const name of names)check(name);
    for(const post of profiles[id]?.posts||[])for(const image of posts[post].images)check(image);
  }
  for(const a of Object.values(region.articles))check(a.image);
  for(const id of Object.keys(region.sites))check(world.companies[id].image);
});
test('Compass finds the new identities, usernames, organizations, topics, and follow-up documents',()=>{
  for(const id of ['mandy','ada','rowan','vera'])for(const query of [world.people[id].name,...world.people[id].name.split(' '),profiles[id].handle])assert(found(query).includes('#/profile/'+id),query);
  for(const [query,href]of [['Fence','#/site/fence'],['Brainstorm','#/brainstorm'],['Capitol','#/capitol'],['Nia Calder','#/reporter/nia-calder'],['route history','#/document/review-memo'],['drain covers','#/story/drains-delay'],['Mandy Tinkerman','#/story/election-calendar'],['Meridian Civil Works','#/site/meridian']])assert(found(query).includes(href),query);
  assert.equal(new Set(index.map(r=>r.href)).size,index.length);
  assert(!index.some(r=>/\/(?:account|login|settings|notebook|report|messages)(?:$|\?)/.test(r.href)));
  assert(!found('casey.selvin13@mail.example').length);
});
test('Compass suggestions and every public company website are searchable by name',()=>{
  for(const [name,,href] of region.destinations)assert(found(name).includes(href),name);
  for(const [id] of Object.entries(region.sites))assert(found(world.companies[id].name).includes('#/site/'+id),id);
  for(const [query,href] of [['Frame','#/social'],['LinkedUp','../linkedup/'],['Linked Up','../linkedup/'],['News Sites','#/news'],['news site','#/news'],['The Ledger','#/news'],['The Capitol','#/capitol'],['Brainstorm','#/brainstorm']])assert.equal(found(query)[0],href,query);
});
test('timeline keeps future events in the future and distinguishes advocacy from government',()=>{
  assert.equal(new Date('2026-11-03T12:00:00Z').getUTCDay(),2);
  for(const a of Object.values(region.articles))assert(a.date<='2026-10-26');
  for(const e of region.events)assert(e.date>'2026-10-26');
  assert.match(posts['mandy-campaign'].text,/Political advocacy/);
  assert.match(posts['mandy-campaign'].text,/not a government notice/);
  assert.match(region.articles['election-calendar'].body.join(' '),/November 2027/);
  assert.match(region.documents['learning-access'].status,/not enacted/);
  assert.match(region.documents['review-memo'].sections.flat().join(' '),/does not.*Governor/);
  assert.match(region.articles['camera-demo'].correction,/Corrected 23 October/);
});
test('LinkedUP can load the shared region without loading the Frame application',()=>{
  const linked=vm.createContext({});
  for(const file of ['learn/linkedup/world.js','learn/osint/regional-data.js'])vm.runInContext(fs.readFileSync(file,'utf8'),linked);
  assert.equal(vm.runInContext('WORLD.people.mandy.name',linked),'Mandy Tinkerman');
});
