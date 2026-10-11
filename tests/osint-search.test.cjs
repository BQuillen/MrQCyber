const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context=vm.createContext({});
for(const file of ['learn/osint/data.js','learn/linkedup/world.js','learn/osint/search.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const {profiles,world,articles,search,index}=vm.runInContext('({profiles:PROFILES,world:WORLD,articles:ARTICLES,search:CompassSearch,index:CompassSearch.buildIndex(PROFILES,WORLD,SEARCH_INDEX)})',context);
const results=query=>Array.from(search.find(index,query),item=>item.r);

test('every public profile can be found by its full, first, or last name',()=>{
  for(const [network,people] of [['frame',profiles],['linkedup',world.people]]){
    for(const [id,person] of Object.entries(people)){
      const href=network==='frame'?'#/profile/'+id:'../linkedup/#/person/'+id;
      const parts=person.name.split(' ');
      for(const query of [person.name,parts[0],parts.at(-1)]){
        assert(results(query).some(result=>result.href===href),network+': '+query+' → '+id);
      }
    }
  }
});

test('Ellis Park is consistent across both networks and the library articles',()=>{
  assert.equal(profiles.ellis.name,'Ellis Park');
  assert.equal(world.people.ellis.name,'Ellis Park');
  assert.equal(results('Ellis Park')[0].title,'Ellis Park · Frame');
  assert(results('Ellis Park').some(result=>result.href==='../linkedup/#/person/ellis'));
  assert.match(articles['library-project'].body,/librarian Ellis Park/);
  assert.match(articles['news-library'].body,/Librarian Ellis Park/);
  assert.doesNotMatch(JSON.stringify({profiles,articles,world}),/Ellis Morgan/);
  assert.equal(results('Ellis Morgan').length,0);
});

test('company names and website names lead directly to their public pages',()=>{
  for(const [id,company] of Object.entries(world.companies)){
    assert(results(company.name).some(result=>result.href==='../linkedup/#/company/'+id),company.name);
  }
  for(const [query,href] of [['Frame','#/social'],['LinkedUP','../linkedup/'],['Linked Up','../linkedup/'],['Cedar and Finch','#/work'],['Cedar & Finch','#/work'],['PlaySpace','#/gaming']]){
    assert.equal(results(query)[0].href,href,query);
  }
});

test('case, punctuation, usernames, and all query terms are handled consistently',()=>{
  assert(results('  ELLIS   PARK ').some(result=>result.href==='#/profile/ellis'));
  assert.equal(results('@ellis.reads')[0].href,'#/profile/ellis');
  assert(results('casey_thunder13').some(result=>result.href==='#/tiktok/casey'));
  assert(results('Twitch').some(result=>result.href==='#/twitch/casey'));
  assert(!results('Casey Selvin').some(result=>result.href==='#/twitch/casey'));
  assert.equal(results('Ellis Quillen').length,0);
  assert.equal(results('').length,0);
  assert.equal(results('! @ &').length,0);
});

test('comment-only people lead to their existing conversations without empty profile links',()=>{
  for(const [id,person] of Object.entries(world.community)){
    const matches=results(person.name);
    assert(matches.some(result=>result.href.startsWith('../linkedup/#/company-post/')),person.name);
    assert(!matches.some(result=>result.href.endsWith('/person/'+id)),person.name);
  }
});

test('new public profiles are included automatically; destinations are unique and public',()=>{
  const expanded=search.buildIndex({...profiles,newperson:{name:'Nora Voss',handle:'nora.notes',bio:'Lexington photographer'}},world,[]);
  assert(search.find(expanded,'Voss').some(({r})=>r.href==='#/profile/newperson'));
  assert.equal(new Set(index.map(record=>record.href)).size,index.length);
  for(const result of index)assert(!/\/(?:login|account|messages|settings|notebook|report)(?:$|[/?#])/.test(result.href),result.href);
  assert.equal(results('casey.selvin13@mail.example').length,0);
});
