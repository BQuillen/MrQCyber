'use strict';

const CompassSearch=(()=>{
  const words=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(word=>word&&!['and','the','a','an'].includes(word));
  const compact=value=>words(value).join('');

  function buildIndex(profiles,world,pages,region=null,posts={},articles={}){
    const records=new Map();
    const add=entry=>{
      const previous=records.get(entry.href);
      records.set(entry.href,{...previous,...entry,keys:[previous?.keys,entry.keys].filter(Boolean).join(' ')});
    };
    for(const page of pages){
      add({...page,href:page.href||'#'+page.route,kind:'page',identity:[page.title,...(page.handles||[])]});
    }
    for(const [name,href,site,text,aliases] of [
      ['Frame','#/social','frame.training','Photos, public profiles, and everyday moments.',['Frame','Instagram']],
      ['LinkedUP','../linkedup/','linkedup.training','Professional profiles, companies, and public conversations.',['LinkedUP','Linked Up','LinkedIn']],
      ['Cedar & Finch','#/work','cedarfinch.training','Independent design studio in Lexington. Identities, spaces, and websites.',['Cedar & Finch','Cedar and Finch']],
      ['Riverdale Thunder','#/club','thunder.training','Youth soccer, community events, and news from the club.',['Riverdale Thunder']],
      ['The Lexington Ledger','#/news','ledger.training','Local news, neighborhood stories, arts, and sport.',['Lexington Ledger','Ledger']],
      ['PlaySpace','#/gaming','playspace.training','Find public player profiles by username.',['PlaySpace','Play Space','Roblox']]
    ])add({title:name,href,site,text,kind:'site',identity:aliases,handles:[],keys:aliases.join(' ')});

    for(const [id,p] of Object.entries(profiles)){
      add({title:[p.name,p.accountLabel,'Frame'].filter(Boolean).join(' · '),href:'#/profile/'+id,site:'frame.training / '+p.handle,text:p.bio,kind:'profile',identity:[p.name,p.handle],keys:[p.name,p.handle,p.bio,p.accountLabel].filter(Boolean).join(' '),handles:[]});
    }
    for(const [id,p] of Object.entries(world.people)){
      const employer=world.companies[p.company]?.name||'';
      add({title:p.name+' · LinkedUP',href:'../linkedup/#/person/'+id,site:'linkedup.training / people / '+id,text:[p.headline,employer,p.location].filter(Boolean).join(' · '),kind:'profile',identity:[p.name],keys:[p.name,p.headline,p.bio,p.location,employer,...p.skills,...p.education.map(e=>e.school)].join(' ')});
    }
    for(const [id,c] of Object.entries(world.companies)){
      add({title:c.name+' · LinkedUP',href:'../linkedup/#/company/'+id,site:'linkedup.training / companies / '+id,text:[c.sector,c.location,c.about].join(' · '),kind:'company',identity:[c.name],keys:[c.name,c.tag,c.about,c.sector,c.location,...c.specialties].join(' ')});
      for(const post of c.updates){
        const comments=post.comments.filter(([author])=>world.community?.[author]&&!world.people[author]);
        if(!comments.length)continue;
        add({title:c.name+' · '+(post.title||post.date),href:'../linkedup/#/company-post/'+post.id,site:'linkedup.training / company updates',text:comments.map(([author,text])=>world.community[author].name+': '+text).join(' '),kind:'page',identity:comments.map(([author])=>world.community[author].name),keys:comments.map(([author,text])=>[world.community[author].name,world.community[author].headline,text].join(' ')).join(' ')});
      }
    }
    if(region){
      add({title:'The Capitol · Governor Mandy Schmear',href:'#/capitol',site:'capitol.training',text:'Government updates, legislation, public records, staff, and visitor information in Frankfort.',kind:'site',identity:['Capitol','The Capitol','Governor Mandy Schmear'],keys:'Frankfort government Mandy Schmear Ada Wynn Naomi Keene education policy Hugo Mercer constituent services governor legislation news staff visit'});
      add({title:'Brainstorm · Community conversations',href:'#/brainstorm',site:'brainstorm.training',text:'Residents compare notes on local life, services, schools, and civic questions.',kind:'site',identity:['Brainstorm'],keys:'Brainstorm forum community discussions'});
      add({title:'The Lexington Ledger',href:'#/news',site:'ledger.training',text:'Reporting from Lexington, Frankfort, and Louisville. Politics, education, weather, utilities, transportation, and community life.',kind:'site',identity:['News','News Sites','News Site','Ledger','Lexington Ledger','The Lexington Ledger'],keys:'news sites newspaper Lexington Ledger archive'});
      for(const[id,s]of Object.entries(region.sites)){
        const c=world.companies[id];
        add({title:c.name+' · Official website',href:'#/site/'+id,site:id+'.training',text:c.tag+' · '+s.area,kind:'site',identity:[c.name],keys:[c.name,c.about,c.sector,...c.specialties,s.area,...s.initiatives,...s.leadership.flat()].join(' ')});
      }
      for(const[id,a]of Object.entries(region.articles))add({title:a.title,href:'#/story/'+id,site:'ledger.training / '+a.topic.toLowerCase(),text:a.summary,kind:'page',identity:[a.title],keys:[a.city,a.topic,region.authors[a.author].name,...a.body].join(' ')});
      for(const[id,a]of Object.entries(region.authors))add({title:a.name+' · The Lexington Ledger',href:'#/reporter/'+id,site:'ledger.training / newsroom',text:a.beat+' · '+a.bio,kind:'profile',identity:[a.name],keys:a.name+' '+a.beat+' '+a.bio});
      for(const[id,d]of Object.entries(region.documents))add({title:d.title,href:'#/document/'+id,site:'publicrecords.training / '+id,text:d.issuer+' · '+d.date+' · '+d.status,kind:'page',identity:[d.title],keys:d.sections.flat().join(' ')});
      for(const j of region.jobs)add({title:j.title+' · '+world.companies[j.company].name,href:'#/job/'+j.id,site:j.company+'.training / careers',text:j.location+' · '+j.text,kind:'page',identity:[j.title],keys:j.reports+' '+world.companies[j.company].name});
      for(const t of region.threads)add({title:t.title+' · Brainstorm',href:'#/discussion/'+t.id,site:'brainstorm.training / '+t.city,text:t.body,kind:'page',identity:[t.title],keys:[t.author,t.tag,t.city,...t.comments.flat()].join(' ')});
      add({title:'Community calendar',href:'#/calendar',site:'ledger.training / calendar',text:'Public meetings, neighborhood events, workshops, and community plans.',kind:'page',identity:['Community calendar','Calendar'],keys:region.events.map(e=>[e.title,e.host,e.place,e.city,e.date].join(' ')).join(' ')});
      for(const[id,p]of Object.entries(posts)){
        const owner=profiles[p.owner];
        add({title:owner.name+' · '+p.date,href:'#/post/'+id,site:'frame.training / '+owner.handle,text:p.text,kind:'page',identity:[],keys:[owner.name,owner.handle,...p.comments.map(comment=>{const [name,text]=Array.isArray(comment)?[profiles[comment[0]]?.name||comment[0],comment[1]]:[comment.name,comment.text];return name+' '+String(text||'').replace(/\S+@\S+/g,'');})].join(' ')});
      }
      for(const[id,a]of Object.entries(articles))if(['news','work','club'].includes(a.service))add({title:a.title,href:'#/article/'+id,site:({news:'ledger',work:'cedarfinch',club:'thunder'}[a.service])+'.training',text:a.body.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,220),kind:'page',identity:[a.title],keys:a.date+' '+a.body.replace(/<[^>]+>/g,' ')});
      for(const[id,p]of Object.entries(world.people))for(const post of p.posts)add({title:p.name+' · '+post.date,href:'../linkedup/#/post/'+post.id,site:'linkedup.training / posts',text:post.text,kind:'page',identity:[],keys:p.name+' '+post.comments.map(([author,text])=>world.people[author].name+' '+text).join(' ')});
      for(const[id,c]of Object.entries(world.companies))for(const post of c.updates)add({title:c.name+' · '+(post.title||post.date),href:'../linkedup/#/company-post/'+post.id,site:'linkedup.training / company updates',text:post.text,kind:'page',identity:[],keys:c.name+' '+post.comments.map(([author,text])=>(world.people[author]||world.community[author]).name+' '+text).join(' ')});
    }
    // Keep displayed site names searchable as the destination directory grows.
    for(const [name,description,href] of region?.destinations||[]){
      const existing=records.get(href);
      add({...(existing||{title:name,href,site:'compass.training / destinations',text:description,kind:'site'}),identity:[...(existing?.identity||[]),name],keys:name+' '+description});
    }
    return [...records.values()].map(record=>({...record,
      terms:new Set(words([record.title,record.site,record.text,record.keys].join(' '))),
      titleTerms:new Set(words(record.title)),
      identities:record.identity.map(identity=>({compact:compact(identity),terms:new Set(words(identity))}))
    }));
  }

  function find(index,query){
    const terms=words(query),joined=terms.join('');
    if(!terms.length)return [];
    return index.flatMap(r=>{
      // Handle-only channels remain discoverable by their handle or by the site's name.
      if(r.handles?.length&&!r.handles.some(handle=>joined.includes(compact(handle)))&&!terms.includes(r.site.split('.')[0]))return [];
      const exact=r.identities.some(identity=>identity.compact===joined);
      if(!exact&&!terms.every(term=>r.terms.has(term)))return [];
      const nameMatch=r.identities.some(identity=>terms.every(term=>identity.terms.has(term)));
      const titleMatch=terms.every(term=>r.titleTerms.has(term));
      const score=(exact?100:nameMatch?70:titleMatch?40:10)+({site:4,profile:3,company:2,page:0}[r.kind]);
      return [{r,score}];
    }).sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title));
  }
  return {buildIndex,find};
})();
