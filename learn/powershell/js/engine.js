/* ============ utilities ============ */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
const ri=(r,min,max)=>min+Math.floor(r()*(max-min+1));
function fakeHash(s){let h1=0xdeadbeef^s.length,h2=0x41c6ce57^s.length;
  for(let i=0;i<s.length;i++){const ch=s.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  let out='';for(let i=0;i<8;i++){out+=((h1=Math.imul(h1^(h1>>>15),0x85EBCA6B))>>>0).toString(16).padStart(8,'0');}
  return out.slice(0,64).toUpperCase();}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ============ virtual filesystem ============ */
const F=(content,opts={})=>({type:'file',content:content,hidden:!!opts.hidden});
const D=(children={},hidden=false)=>({type:'dir',children:children,hidden:hidden});
let HOMEP=['C:','Users','cadet'];

function normPath(cwd,raw){
  raw=(raw||'.').trim().replace(/^["']|["']$/g,'').replace(/\//g,'\\');
  let parts;
  if(/^[a-z]:/i.test(raw)){parts=[raw[0].toUpperCase()+':'];raw=raw.slice(2);}
  else if(raw.startsWith('\\')){parts=[cwd[0]];}
  else if(raw==='~'||raw.startsWith('~\\')){parts=HOMEP.slice();raw=raw.replace(/^~\\?/,'');}
  else parts=cwd.slice();
  for(const seg of raw.split('\\')){
    if(!seg||seg==='.')continue;
    if(seg==='..'){if(parts.length>1)parts.pop();}
    else parts.push(seg);
  }
  return parts;
}
function getNode(root,parts){
  let node=root;
  for(let i=1;i<parts.length;i++){
    if(!node||node.type!=='dir')return null;
    const key=Object.keys(node.children).find(k=>k.toLowerCase()===String(parts[i]).toLowerCase());
    if(!key)return null;
    parts[i]=key;node=node.children[key];
  }
  return node;
}
function wcRegex(pat){return new RegExp('^'+pat.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$','i');}
function hasWC(s){return /[*?]/.test(s);}
function pjoin(parts){return parts[0]+'\\'+parts.slice(1).join('\\');}

/* resolve a path string that may contain a wildcard in its LAST segment.
   returns {dirParts, dirNode, matches:[{name,node}]} or {error} */
function resolveWC(root,cwd,raw,showHidden){
  const parts=normPath(cwd,raw);
  const last=parts[parts.length-1];
  if(parts.length>1&&hasWC(last)){
    const dirParts=parts.slice(0,-1);
    const dirNode=getNode(root,dirParts);
    if(!dirNode||dirNode.type!=='dir')return{error:"Cannot find path '"+pjoin(dirParts)+"' because it does not exist."};
    const re=wcRegex(last);
    const matches=Object.entries(dirNode.children)
      .filter(([n,nd])=>re.test(n)&&(showHidden||!nd.hidden))
      .map(([n,nd])=>({name:n,node:nd,parts:dirParts.concat(n)}));
    return{dirParts,dirNode,matches,pattern:last};
  }
  const node=getNode(root,parts);
  if(!node)return{error:"Cannot find path '"+pjoin(parts)+"' because it does not exist."};
  return{dirParts:parts.slice(0,-1),matches:[{name:parts[parts.length-1]||parts[0],node,parts}]};
}

/* ============ parsing ============ */
function tokenize(s){const t=[];let cur='',q=null;
  for(const ch of s){
    if(q){if(ch===q){q=null;}else cur+=ch;}
    else if(ch==='"'||ch==="'"){q=ch;}
    else if(/\s/.test(ch)){if(cur!==''){t.push(cur);cur='';}}
    else cur+=ch;
  }
  if(cur!=='')t.push(cur);return t;}
function splitPipes(s){const segs=[];let cur='',q=null;
  for(const ch of s){
    if(q){cur+=ch;if(ch===q)q=null;}
    else if(ch==='"'||ch==="'"){q=ch;cur+=ch;}
    else if(ch==='|'){segs.push(cur);cur='';}
    else cur+=ch;
  }
  segs.push(cur);return segs.map(x=>x.trim()).filter(Boolean);}

const ALIAS={ls:'get-childitem',dir:'get-childitem',gci:'get-childitem',
  cd:'set-location',sl:'set-location',chdir:'set-location',
  pwd:'get-location',gl:'get-location',
  cat:'get-content',type:'get-content',gc:'get-content',
  cp:'copy-item',copy:'copy-item',cpi:'copy-item',
  mv:'move-item',move:'move-item',mi:'move-item',
  rm:'remove-item',del:'remove-item',ri:'remove-item',erase:'remove-item',
  ren:'rename-item',rni:'rename-item',
  ps:'get-process',gps:'get-process',kill:'stop-process',spps:'stop-process',
  cls:'clear-host',clear:'clear-host',
  sls:'select-string',ni:'new-item',sc:'set-content',ac:'add-content',
  echo:'write-output',write:'write-output',
  man:'get-help',help:'get-help',
  measure:'measure-object',sort:'sort-object',select:'select-object'};

const FLAGSPEC={
 'get-childitem':{value:['path','filter'],all:['recurse','force','path','filter','name','file','directory']},
 'set-location':{value:['path'],all:['path']},
 'get-location':{value:[],all:[]},
 'get-content':{value:['path'],all:['path','raw','force']},
 'select-string':{value:['pattern','path'],all:['pattern','path','casesensitive','notmatch','simplematch']},
 'copy-item':{value:['path','destination'],all:['path','destination','recurse','force']},
 'move-item':{value:['path','destination'],all:['path','destination','force']},
 'remove-item':{value:['path'],all:['path','recurse','force']},
 'rename-item':{value:['path','newname'],all:['path','newname','force']},
 'new-item':{value:['path','name','itemtype','value'],all:['path','name','itemtype','value','force']},
 'set-content':{value:['path','value'],all:['path','value','force']},
 'add-content':{value:['path','value'],all:['path','value','force']},
 'get-filehash':{value:['path','algorithm'],all:['path','algorithm']},
 'get-process':{value:['name','id'],all:['name','id']},
 'stop-process':{value:['name','id'],all:['name','id','force']},
 'measure-object':{value:[],all:['line','word','character','sum','average']},
 'sort-object':{value:[],all:['descending','unique']},
 'select-object':{value:['first','last'],all:['first','last','unique']},
 'write-output':{value:[],all:[]},
 'get-help':{value:['name'],all:['name','full','examples']},
 'get-alias':{value:['name'],all:['name']},
 'clear-host':{value:[],all:[]},
 'get-filehash':{value:['path','algorithm'],all:['path','algorithm']},
 'tree':{value:[],all:['force']},
 'get-scheduledtask':{value:['taskname'],all:['taskname']},
 'disable-scheduledtask':{value:['taskname'],all:['taskname']},
 'enable-scheduledtask':{value:['taskname'],all:['taskname']}
};
function parseArgs(cmd,tokens){
  const spec=FLAGSPEC[cmd]||{value:[],all:[]};
  const flags={},pos=[];
  for(let i=0;i<tokens.length;i++){
    const t=tokens[i];
    if(t.length>1&&t[0]==='-'&&isNaN(Number(t))){
      let name=t.slice(1).toLowerCase();
      const match=spec.all.find(f=>f===name)||spec.all.find(f=>f.startsWith(name));
      if(match)name=match;
      if(spec.value.includes(name)&&i+1<tokens.length&&!(tokens[i+1][0]==='-'&&isNaN(Number(tokens[i+1])))){
        flags[name]=tokens[++i];
      }else flags[name]=true;
    }else pos.push(t);
  }
  return{flags,pos};
}

/* ============ command implementations ============ */
/* each returns {lines:[..], error?, clear?} ; ctx={flags,pos,input,ST} */
function fmtEntry(name,node){
  const mode=node.type==='dir'
    ?(node.hidden?'d--h--':'d-----')
    :(node.hidden?'-a-h--':'-a----');
  const len=node.type==='file'?String(node.content.length):'';
  return mode.padEnd(10)+len.padStart(9)+'  '+name;
}
function listDir(pathParts,node,flags,out){
  out.push('');
  out.push('    Directory: '+pjoin(pathParts));
  out.push('');
  out.push('Mode         Length  Name');
  out.push('----         ------  ----');
  const entries=Object.entries(node.children)
    .filter(([n,nd])=>flags.force||!nd.hidden)
    .filter(([n,nd])=>!flags.filter||wcRegex(flags.filter).test(n))
    .filter(([n,nd])=>!(flags.file&&nd.type==='dir')&&!(flags.directory&&nd.type==='file'))
    .sort((a,b)=>(a[1].type===b[1].type)?a[0].localeCompare(b[0]):(a[1].type==='dir'?-1:1));
  if(!entries.length)out.push('  (empty)');
  for(const[n,nd]of entries)out.push(fmtEntry(n,nd));
}
const CMDS={
 'get-childitem'({flags,pos,ST}){
   const raw=flags.path||pos[0]||'.';
   const out=[];
   const res=resolveWC(ST.fs,ST.cwd,raw,!!flags.force);
   if(res.error)return{error:'Get-ChildItem : '+res.error};
   if(res.pattern){ // wildcard listing
     if(!res.matches.length)return{lines:[]};
     out.push('');out.push('    Directory: '+pjoin(res.dirParts));out.push('');
     out.push('Mode         Length  Name');out.push('----         ------  ----');
     for(const m of res.matches)out.push(fmtEntry(m.name,m.node));
     return{lines:out};
   }
   const target=res.matches[0];
   if(target.node.type==='file'){
     out.push('');out.push('    Directory: '+pjoin(res.dirParts));out.push('');
     out.push('Mode         Length  Name');out.push('----         ------  ----');
     out.push(fmtEntry(target.name,target.node));return{lines:out};
   }
   if(flags.name){
     const lines=[];
     const walk=(rel,node)=>{
       for(const[n,nd]of Object.entries(node.children)){
         if(!flags.force&&nd.hidden)continue;
         const p=rel?rel+'\\'+n:n;
         if(!flags.filter||wcRegex(flags.filter).test(n))lines.push(p);
         if(nd.type==='dir'&&flags.recurse)walk(p,nd);
       }
     };
     walk('',target.node);
     return{lines};
   }
   if(flags.recurse){
     const walk=(parts,node)=>{
       listDir(parts,node,flags,out);
       for(const[n,nd]of Object.entries(node.children)){
         if(nd.type==='dir'&&(flags.force||!nd.hidden))walk(parts.concat(n),nd);
       }
     };
     walk(target.parts,target.node);
     return{lines:out};
   }
   listDir(target.parts,target.node,flags,out);
   return{lines:out};
 },
 'set-location'({flags,pos,ST}){
   const raw=flags.path||pos[0]||'~';
   const parts=normPath(ST.cwd,raw);
   const node=getNode(ST.fs,parts);
   if(!node)return{error:"Set-Location : Cannot find path '"+pjoin(parts)+"' because it does not exist."};
   if(node.type!=='dir')return{error:"Set-Location : Cannot set location because path '"+pjoin(parts)+"' resolved to a file."};
   ST.cwd=parts;return{lines:[]};
 },
 'get-location'({ST}){return{lines:['','Path','----',pjoin(ST.cwd),'']};},
 'get-content'({flags,pos,ST}){
   const raw=flags.path||pos[0];
   if(!raw)return{error:'Get-Content : You must specify a file path. Example: Get-Content notes.txt'};
   const res=resolveWC(ST.fs,ST.cwd,raw,true);
   if(res.error)return{error:'Get-Content : '+res.error};
   const lines=[];
   for(const m of res.matches){
     if(m.node.type==='dir')return{error:"Get-Content : Access to path '"+pjoin(m.parts)+"' is denied (it is a directory)."};
     lines.push(...m.node.content.split('\n'));
   }
   if(!res.matches.length)return{error:"Get-Content : Cannot find a file matching '"+raw+"'."};
   return{lines};
 },
 'select-string'({flags,pos,input,ST}){
   let pattern=flags.pattern, path=flags.path;
   const p=pos.slice();
   if(pattern===undefined&&p.length)pattern=p.shift();
   if(path===undefined&&p.length)path=p.shift();
   if(pattern===undefined)return{error:'Select-String : A -Pattern is required. Example: Select-String -Pattern "FAILED" -Path auth.log'};
   let re;try{re=new RegExp(flags.simplematch?pattern.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):pattern,flags.casesensitive?'':'i');}catch(e){return{error:'Select-String : invalid pattern.'};}
   const test=l=>flags.notmatch?!re.test(l):re.test(l);
   if(input){return{lines:input.filter(test)};}
   if(!path)return{error:'Select-String : Provide a -Path, or pipe text into Select-String.'};
   const res=resolveWC(ST.fs,ST.cwd,path,true);
   if(res.error)return{error:'Select-String : '+res.error};
   const lines=[];
   for(const m of res.matches){
     if(m.node.type!=='file')continue;
     m.node.content.split('\n').forEach((l,i)=>{if(test(l))lines.push(m.name+':'+(i+1)+':'+l);});
   }
   return{lines};
 },
 'measure-object'({input}){
   const n=input?input.filter(l=>l.trim()!=='').length:0;
   return{lines:['','Count    : '+n,'']};
 },
 'sort-object'({flags,input}){
   let l=(input||[]).slice().sort((a,b)=>a.localeCompare(b));
   if(flags.unique)l=[...new Set(l)];
   if(flags.descending)l.reverse();
   return{lines:l};
 },
 'select-object'({flags,input}){
   let l=(input||[]).filter(x=>x.trim()!=='');
   if(flags.unique)l=[...new Set(l)];
   if(flags.first)l=l.slice(0,Number(flags.first));
   if(flags.last)l=l.slice(-Number(flags.last));
   return{lines:l};
 },
 'get-filehash'({flags,pos,ST}){
   const raw=flags.path||pos[0];
   if(!raw)return{error:'Get-FileHash : You must specify a file path.'};
   const res=resolveWC(ST.fs,ST.cwd,raw,true);
   if(res.error)return{error:'Get-FileHash : '+res.error};
   const lines=['','Algorithm  Hash                                                              Path','---------  ----                                                              ----'];
   for(const m of res.matches){
     if(m.node.type!=='file')return{error:'Get-FileHash : cannot hash a directory.'};
     lines.push('SHA256     '+fakeHash(m.node.content)+'  '+pjoin(m.parts));
   }
   lines.push('');
   return{lines};
 },
 'copy-item'({flags,pos,ST}){return moveCopy(flags,pos,ST,false);},
 'move-item'({flags,pos,ST}){return moveCopy(flags,pos,ST,true);},
 'remove-item'({flags,pos,ST}){
   const raw=flags.path||pos[0];
   if(!raw)return{error:'Remove-Item : You must specify a path.'};
   const res=resolveWC(ST.fs,ST.cwd,raw,true);
   if(res.error)return{error:'Remove-Item : '+res.error};
   if(!res.matches.length)return{error:"Remove-Item : Cannot find a file matching '"+raw+"'."};
   for(const m of res.matches){
     if(m.node.type==='dir'&&Object.keys(m.node.children).length&&!flags.recurse)
       return{error:"Remove-Item : The item at '"+pjoin(m.parts)+"' has children and the -Recurse parameter was not specified."};
     if(m.node.hidden&&!flags.force)
       return{error:"Remove-Item : The item '"+m.name+"' is hidden. Use -Force to remove hidden items."};
     const parent=getNode(ST.fs,m.parts.slice(0,-1));
     delete parent.children[m.parts[m.parts.length-1]];
   }
   return{lines:[]};
 },
 'rename-item'({flags,pos,ST}){
   const raw=flags.path||pos[0];const newname=flags.newname||pos[1];
   if(!raw||!newname)return{error:'Rename-Item : Usage: Rename-Item <path> <newName>'};
   const parts=normPath(ST.cwd,raw);
   const node=getNode(ST.fs,parts);
   if(!node)return{error:"Rename-Item : Cannot find path '"+pjoin(parts)+"'."};
   const parent=getNode(ST.fs,parts.slice(0,-1));
   if(parent.children[newname])return{error:"Rename-Item : An item named '"+newname+"' already exists."};
   delete parent.children[parts[parts.length-1]];
   parent.children[newname]=node;
   return{lines:[]};
 },
 'new-item'({flags,pos,ST}){
   let raw=flags.path||pos[0]||'.';
   if(flags.name){raw=(flags.path||pos[0]||'.')+'\\'+flags.name;}
   const parts=normPath(ST.cwd,raw);
   const parent=getNode(ST.fs,parts.slice(0,-1));
   if(!parent||parent.type!=='dir')return{error:"New-Item : Cannot find the parent path '"+pjoin(parts.slice(0,-1))+"'."};
   const name=parts[parts.length-1];
   const existing=Object.keys(parent.children).find(k=>k.toLowerCase()===name.toLowerCase());
   if(existing&&!flags.force)return{error:"New-Item : An item with the name '"+name+"' already exists."};
   const isDir=(flags.itemtype||'file').toLowerCase().startsWith('d');
   parent.children[existing||name]=isDir?D({}):F(flags.value?String(flags.value):'');
   return{lines:['','    Created: '+pjoin(parts)+(isDir?'  [directory]':'  [file]'),'']};
 },
 'set-content'({flags,pos,ST}){return setAdd(flags,pos,ST,false);},
 'add-content'({flags,pos,ST}){return setAdd(flags,pos,ST,true);},
 'get-process'({flags,pos,ST}){
   let procs=ST.processes.filter(p=>!p.stopped);
   const name=flags.name||pos[0];
   if(name){const re=wcRegex(name);procs=procs.filter(p=>re.test(p.name));
     if(!procs.length)return{error:"Get-Process : Cannot find a process with the name '"+name+"'."};}
   const lines=['','   Id  CPU(s)  ProcessName','   --  ------  -----------'];
   for(const p of procs.sort((a,b)=>a.name.localeCompare(b.name)))
     lines.push(String(p.id).padStart(5)+'  '+String(p.cpu).padStart(6)+'  '+p.name);
   lines.push('');
   return{lines};
 },
 'stop-process'({flags,pos,ST}){
   const name=flags.name;const id=flags.id!==undefined?Number(flags.id):(pos[0]&&!isNaN(pos[0])?Number(pos[0]):undefined);
   let targets=[];
   if(name){const re=wcRegex(name);targets=ST.processes.filter(p=>!p.stopped&&re.test(p.name));}
   else if(id!==undefined){targets=ST.processes.filter(p=>!p.stopped&&p.id===id);}
   else return{error:'Stop-Process : Specify -Name <processName> or -Id <processId>.'};
   if(!targets.length)return{error:'Stop-Process : No matching process found.'};
   if(targets.some(p=>p.protected))return{error:"Stop-Process : Access denied. Critical system process cannot be stopped."};
   targets.forEach(p=>p.stopped=true);
   return{lines:targets.map(p=>'Stopped process '+p.name+' (Id '+p.id+')')};
 },
 'write-output'({pos}){return{lines:[pos.join(' ')]};},
 'clear-host'(){return{lines:[],clear:true};},
 'get-alias'(){
   const lines=['','Alias           Cmdlet','-----           ------'];
   Object.entries(ALIAS).forEach(([a,c])=>lines.push(a.padEnd(16)+c));
   lines.push('');return{lines};
 },
 'get-help'({flags,pos}){
   const topic=(flags.name||pos[0]||'').toLowerCase();
   const canonical=ALIAS[topic]||topic;
   if(canonical&&HELP[canonical])return{lines:['',...HELP[canonical],'']};
   const lines=['','Simulated PowerShell — available cmdlets:',''];
   Object.keys(HELP).forEach(k=>lines.push('  '+k.padEnd(18)+HELP[k][1].trim()));
   lines.push('','Type Get-Help <cmdlet> for details, e.g. Get-Help Get-ChildItem','');
   return{lines};
 },
 'tree'({flags,ST}){
   const out=[pjoin(ST.cwd)];
   const walk=(node,prefix)=>{
     const entries=Object.entries(node.children).filter(([n,nd])=>flags.force||!nd.hidden);
     entries.forEach(([n,nd],i)=>{
       const last=i===entries.length-1;
       out.push(prefix+(last?'└── ':'├── ')+n+(nd.type==='dir'?'\\':''));
       if(nd.type==='dir')walk(nd,prefix+(last?'    ':'│   '));
     });
   };
   walk(getNode(ST.fs,ST.cwd.slice()),'');
   return{lines:out};
 }
};
CMDS['get-scheduledtask']=function({flags,pos,ST}){
  const tasks=ST.schedTasks||[];
  const name=flags.taskname||pos[0];
  if(name){
    const re=wcRegex(name);
    const ts=tasks.filter(t=>re.test(t.name));
    if(!ts.length)return{error:"Get-ScheduledTask : No scheduled task matching '"+name+"' was found."};
    const lines=[];
    for(const t of ts){
      lines.push('','TaskName : '+t.name,'State    : '+(t.disabled?'Disabled':'Ready'),
        'Trigger  : '+t.trigger,'Action   : '+t.action,'Author   : '+t.author);
    }
    lines.push('');
    return{lines};
  }
  const lines=['','TaskName                       State      Trigger','--------                       -----      -------'];
  for(const t of tasks)lines.push(t.name.padEnd(31)+(t.disabled?'Disabled':'Ready').padEnd(11)+t.trigger);
  lines.push('','Tip: Get-ScheduledTask -TaskName <name> shows full detail, including the Action it runs.','');
  return{lines};
};
CMDS['disable-scheduledtask']=function({flags,pos,ST}){
  const name=flags.taskname||pos[0];
  if(!name)return{error:'Disable-ScheduledTask : Specify -TaskName <name>.'};
  const re=wcRegex(name);
  const ts=(ST.schedTasks||[]).filter(t=>re.test(t.name)&&!t.disabled);
  if(!ts.length)return{error:"Disable-ScheduledTask : No enabled task matching '"+name+"' was found."};
  ts.forEach(t=>t.disabled=true);
  return{lines:ts.map(t=>t.name.padEnd(31)+'Disabled')};
};
CMDS['enable-scheduledtask']=function({flags,pos,ST}){
  const name=flags.taskname||pos[0];
  if(!name)return{error:'Enable-ScheduledTask : Specify -TaskName <name>.'};
  const re=wcRegex(name);
  const ts=(ST.schedTasks||[]).filter(t=>re.test(t.name)&&t.disabled);
  if(!ts.length)return{error:"Enable-ScheduledTask : No disabled task matching '"+name+"' was found."};
  ts.forEach(t=>t.disabled=false);
  return{lines:ts.map(t=>t.name.padEnd(31)+'Ready')};
};
function setAdd(flags,pos,ST,append){
  const raw=flags.path||pos[0];const val=flags.value!==undefined?String(flags.value):pos.slice(1).join(' ');
  if(!raw)return{error:(append?'Add':'Set')+"-Content : You must specify a path."};
  const parts=normPath(ST.cwd,raw);
  let node=getNode(ST.fs,parts);
  if(!node){
    const parent=getNode(ST.fs,parts.slice(0,-1));
    if(!parent||parent.type!=='dir')return{error:"Cannot find parent path '"+pjoin(parts.slice(0,-1))+"'."};
    node=F('');parent.children[parts[parts.length-1]]=node;
  }
  if(node.type!=='file')return{error:'Cannot write content to a directory.'};
  node.content=append&&node.content?node.content+'\n'+val:val;
  return{lines:[]};
}
function moveCopy(flags,pos,ST,isMove){
  const label=isMove?'Move-Item':'Copy-Item';
  const src=flags.path||pos[0];const dst=flags.destination||pos[1];
  if(!src||!dst)return{error:label+' : Usage: '+label+' <source> <destination>'};
  const res=resolveWC(ST.fs,ST.cwd,src,true);
  if(res.error)return{error:label+' : '+res.error};
  if(!res.matches.length)return{error:label+" : Cannot find a file matching '"+src+"'."};
  const dstParts=normPath(ST.cwd,dst);
  let dstNode=getNode(ST.fs,dstParts.slice());
  for(const m of res.matches){
    if(m.node.type==='dir'&&!flags.recurse&&!isMove)
      return{error:"Copy-Item : '"+m.name+"' is a directory. Use -Recurse to copy directories."};
    let targetParent,targetName;
    if(dstNode&&dstNode.type==='dir'){targetParent=dstNode;targetName=m.name;}
    else{
      targetParent=getNode(ST.fs,dstParts.slice(0,-1));
      if(!targetParent||targetParent.type!=='dir')return{error:label+" : Cannot find destination path '"+pjoin(dstParts.slice(0,-1))+"'."};
      targetName=dstParts[dstParts.length-1];
    }
    const clone=JSON.parse(JSON.stringify(m.node));
    targetParent.children[targetName]=clone;
    if(isMove){
      const parent=getNode(ST.fs,m.parts.slice(0,-1));
      delete parent.children[m.parts[m.parts.length-1]];
    }
  }
  return{lines:[]};
}
const HELP={
 'get-childitem':['Get-ChildItem (alias: ls, dir)','  Lists files and folders.','  -Recurse   include every subfolder','  -Force     also show hidden items','  -Filter x  only names matching a pattern, e.g. -Filter *.txt','  Example: Get-ChildItem C:\\Users\\cadet\\Documents -Recurse'],
 'set-location':['Set-Location (alias: cd)','  Changes your current directory.','  Examples: cd Documents   |   cd ..   |   cd C:\\Logs   |   cd ~'],
 'get-location':['Get-Location (alias: pwd)','  Prints the directory you are currently in.'],
 'get-content':['Get-Content (alias: cat, type)','  Prints the contents of a file.','  Example: Get-Content welcome.txt'],
 'select-string':['Select-String (alias: sls)','  Searches text for a pattern — PowerShell\'s "grep".','  Example: Select-String -Pattern "FAILED" -Path auth.log','  Pipeline: Get-Content auth.log | Select-String "203.0.113.7"'],
 'measure-object':['Measure-Object (alias: measure)','  Counts items piped into it.','  Example: Get-Content log.txt | Select-String "FAILED" | Measure-Object'],
 'sort-object':['Sort-Object (alias: sort)','  Sorts piped lines. -Descending  -Unique'],
 'select-object':['Select-Object (alias: select)','  Picks piped lines: -First 5  -Last 3  -Unique'],
 'get-filehash':['Get-FileHash','  Computes a SHA256 fingerprint of a file — used to identify malware.','  Example: Get-FileHash C:\\Users\\cadet\\Downloads\\installer.exe'],
 'copy-item':['Copy-Item (alias: cp, copy)','  Copies a file. Example: Copy-Item report.txt C:\\Backup'],
 'move-item':['Move-Item (alias: mv, move)','  Moves a file. Example: Move-Item report.txt C:\\Users\\cadet\\Documents\\Reports'],
 'remove-item':['Remove-Item (alias: rm, del)','  Deletes a file or folder.','  -Recurse   delete a folder and its contents','  -Force     delete hidden items'],
 'rename-item':['Rename-Item (alias: ren)','  Renames an item. Example: Rename-Item old.txt new.txt'],
 'new-item':['New-Item (alias: ni)','  Creates a file or folder.','  Example: New-Item -ItemType Directory -Path C:\\Quarantine','  Example: New-Item -ItemType File -Path notes.txt'],
 'set-content':['Set-Content (alias: sc)','  Writes text into a file (creates it if needed).','  Example: Set-Content -Path manifest.txt -Value "3 files quarantined"'],
 'add-content':['Add-Content (alias: ac)','  Appends text to a file.'],
 'get-process':['Get-Process (alias: ps)','  Lists running processes. -Name x filters by name.'],
 'stop-process':['Stop-Process (alias: kill)','  Ends a process. Example: Stop-Process -Name badproc  or  Stop-Process -Id 4021'],
 'get-filehash2':null,
 'write-output':['Write-Output (alias: echo)','  Prints text to the console.'],
 'get-alias':['Get-Alias','  Shows shortcut names for cmdlets.'],
 'clear-host':['Clear-Host (alias: cls, clear)','  Clears the screen.'],
 'tree':['tree','  Draws the folder structure below your current directory. -Force shows hidden.'],
 'get-scheduledtask':['Get-ScheduledTask','  Lists automated tasks Windows runs on a schedule.','  -TaskName x  show one task in detail (trigger + the Action it runs)','  Example: Get-ScheduledTask -TaskName MidnightWhisper'],
 'disable-scheduledtask':['Disable-ScheduledTask','  Turns a scheduled task off so it stops running.','  Example: Disable-ScheduledTask -TaskName MidnightWhisper'],
 'enable-scheduledtask':['Enable-ScheduledTask','  Turns a disabled scheduled task back on.']
};
delete HELP['get-filehash2'];

/* ============ executor ============ */
function execute(rawInput,ST){
  const segs=splitPipes(rawInput);
  if(!segs.length)return{lines:[],cmds:[]};
  let input=null,result={lines:[]},cmds=[];
  for(const seg of segs){
    const tokens=tokenize(seg);
    if(!tokens.length)continue;
    let name=tokens.shift().toLowerCase();
    name=ALIAS[name]||name;
    cmds.push(name);
    const fn=CMDS[name];
    if(!fn){
      return{error:"The term '"+esc(name)+"' is not recognized as a cmdlet in this simulator.\nType Get-Help to see what is available.",cmds};
    }
    const{flags,pos}=parseArgs(name,tokens);
    result=fn({flags,pos,input,ST,raw:seg});
    if(result.error)return{...result,cmds};
    input=result.lines;
  }
  return{...result,cmds};
}
/* ════════════════════════════════════════════════════════════════════
   SCENARIO RANDOMIZATION POOLS
   Add your own names/values here — scenarios pick from these at random.
   ════════════════════════════════════════════════════════════════════ */
const NAMES=['harper','quinn','rowan','avery','sasha','ellis','marlow','tatum','remy','jordan','casey','skyler'];
const CODEWORDS=['ORBITAL','LANTERN','GRANITE','VECTOR','MERIDIAN','CITADEL','FALCON','NIMBUS','ZENITH','AURORA'];
const DEPTS=['Finance','Logistics','Research','Operations','Facilities'];
const TRAINDIRS=['Alpha','Bravo','Charlie','Delta','Echo'];
const MALPROC=['svchelper','winupdaterx','syncagentd','netdaemon','taskhostr','updservc'];
const PAYLOADS=['telemetry_sync','driver_update','flash_patch','codec_pack','cache_mgr'];
const BADFILES=['invoice_scan','shipping_label','crew_roster_new','bonus_details','timesheet_v2'];
const HOSTS=['RANGE-WS-03','RANGE-WS-11','RANGE-LAB-07','RANGE-SOC-02'];
const SHARKS=['Chompers','Giggles','Fin Diesel','Sir Snacksalot','Bruce II','Toothy McGee','Duchess Nibbles'];
const SNACKS=['nacho cheese','gummy worms','pickle chips','marshmallow fluff'];
const SECRETS=['orange zest','crushed cardamom','a pinch of black pepper','smoked maple sugar'];
const SILLYNAMES=['totally_not_a_presentation.honk','definitely_a_potato.wav.nope','boring_stuff_nobody_wants.zzz'];
const GHOST_WHISPER=['MidnightWhisper','WitchingHourAudio','GraveyardEcho'];
const GHOST_SCRIBE=['PhantomScribe','GhostWriter','SpectralMemo'];
const GHOST_SHUFFLE=['PoltergeistShuffle','SpectralSort','BansheeReindex'];

