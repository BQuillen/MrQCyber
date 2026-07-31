/* ════════════════════════════════════════════════════════════════════
   TERMINAL + UI WIRING
   ════════════════════════════════════════════════════════════════════ */
const ST={fs:null,cwd:HOMEP.slice(),processes:[],schedTasks:[],history:[],hIdx:-1,scenario:null,tasks:[],seed:0};
const termEl=document.getElementById('term');
const cmdEl=document.getElementById('cmd');
const promptEl=document.getElementById('prompt');

function print(html,cls){const d=document.createElement('div');d.className=cls||'out';d.innerHTML=html;termEl.appendChild(d);termEl.scrollTop=termEl.scrollHeight;}
function printLines(lines,cls){if(lines&&lines.length)print(esc(lines.join('\n')),cls);}
function promptStr(){return 'PS '+pjoin(ST.cwd)+'>';}
function refreshPrompt(){promptEl.textContent=promptStr()+' ';}

function loadScenario(idx,seed){
  ST.seed=seed!==undefined?seed:Math.floor(Math.random()*90000)+10000;
  const r=mulberry32(ST.seed);
  const sc=SCENARIOS[idx];
  const built=sc.build(r);
  HOMEP=['C:','Users',built.user||'cadet'];
  ST.fs=built.fs;ST.cwd=HOMEP.slice();
  ST.processes=built.processes||[];ST.schedTasks=built.schedTasks||[];
  ST.scenario={...sc,...built};
  ST.tasks=built.tasks.map(t=>({...t,done:false}));
  ST.history=[];ST.hIdx=-1;
  document.getElementById('varLabel').textContent='Variation #'+ST.seed;
  document.getElementById('scenarioSel').value=idx;
  const db=document.getElementById('diffBadge');
  db.textContent=sc.diffLabel;db.className='diff d'+sc.diff;
  document.getElementById('brief').innerHTML=built.brief;
  document.getElementById('newCmds').innerHTML=(built.newCmds||[]).map(nc=>
    '<div class="ncmd"><code>'+nc[0]+'</code><span class="nd">'+nc[1]+'</span></div>').join('');
  const si=built.sys;
  document.getElementById('sysinfo').innerHTML=
    '<div><span class="k">Hostname</span><span class="v t">'+si.host+'</span></div>'+
    '<div><span class="k">Logged in as</span><span class="v">'+si.user+'</span></div>'+
    '<div><span class="k">OS</span><span class="v">'+si.os+'</span></div>'+
    '<div style="margin-top:7px;color:var(--muted);font-family:\'Exo 2\';font-size:12px;line-height:1.5">'+si.note+'</div>';
  document.getElementById('termTitle').textContent='Windows PowerShell — '+si.host;
  document.getElementById('doneBanner').classList.remove('show');
  termEl.innerHTML='';
  print('Ops Range — simulated PowerShell session','banner');
  print('Scenario: '+esc(sc.title)+'   (variation #'+ST.seed+')','banner');
  print('Type <span style="color:var(--teal)">Get-Help</span> for available commands. Objectives are tracked on the left.','sys-line');
  print('');
  renderTasks();refreshPrompt();cmdEl.focus();
}
function renderTasks(){
  const wrap=document.getElementById('tasks');wrap.innerHTML='';
  ST.tasks.forEach((t,i)=>{
    const d=document.createElement('div');d.className='task'+(t.done?' done':'');
    d.innerHTML='<div class="tick"></div><div class="txt">'+t.text+
      (t.done?'':'<button class="hintbtn" data-i="'+i+'">▸ hint</button><div class="hint" id="hint'+i+'">'+t.hint+'</div>')+'</div>';
    wrap.appendChild(d);
  });
  wrap.querySelectorAll('.hintbtn').forEach(b=>b.addEventListener('click',()=>{
    document.getElementById('hint'+b.dataset.i).classList.toggle('show');
  }));
  const done=ST.tasks.filter(t=>t.done).length;
  document.getElementById('pbar').style.width=(done/ST.tasks.length*100)+'%';
  document.getElementById('plabel').textContent=done+' / '+ST.tasks.length+' complete';
}
function checkTasks(ev){
  let changed=false;
  ST.tasks.forEach(t=>{
    if(!t.done){try{if(t.check(ev)){t.done=true;changed=true;}}catch(e){}}
  });
  if(changed){
    renderTasks();
    const done=ST.tasks.filter(t=>t.done).length;
    if(done===ST.tasks.length){
      print('◈ MISSION COMPLETE — all objectives met.','ok');
      document.getElementById('doneMsg').innerHTML=ST.scenario.done;
      document.getElementById('doneBanner').classList.add('show');
    }else{
      print('✓ objective complete ('+done+'/'+ST.tasks.length+')','ok');
    }
  }
}
function runCommand(raw){
  print('<span class="pr">'+esc(promptStr())+'</span> '+esc(raw),'in');
  if(!raw.trim()){return;}
  ST.history.push(raw);ST.hIdx=ST.history.length;
  const result=execute(raw,ST);
  if(result.clear){termEl.innerHTML='';}
  if(result.error){print(esc(result.error),'err');}
  else printLines(result.lines);
  refreshPrompt();
  checkTasks({raw:raw.toLowerCase(),cmds:result.cmds||[],output:(result.lines||[]).join('\n'),error:result.error||'',ST});
}
/* input handling */
function tabComplete(){
  const v=cmdEl.value;
  const qcount=(v.match(/"/g)||[]).length;
  let idx;
  if(qcount%2===1){idx=v.lastIndexOf('"');}
  else{idx=v.lastIndexOf(' ')+1;}
  const frag=v.slice(idx).replace(/^"/,'');
  if(!frag)return;
  const norm=frag.replace(/\//g,'\\');
  const cut=norm.lastIndexOf('\\');
  const dirPart=cut>=0?norm.slice(0,cut+1):'';
  const prefix=cut>=0?norm.slice(cut+1):norm;
  const dirParts=normPath(ST.cwd,dirPart||'.');
  const dirNode=getNode(ST.fs,dirParts);
  if(!dirNode||dirNode.type!=='dir')return;
  const cands=Object.keys(dirNode.children).filter(k=>k.toLowerCase().startsWith(prefix.toLowerCase()));
  if(!cands.length)return;
  if(cands.length===1){
    let completed=dirPart+cands[0];
    const node=dirNode.children[cands[0]];
    if(node.type==='dir')completed+='\\';
    if(/\s/.test(completed))completed='"'+completed+'"';
    cmdEl.value=v.slice(0,qcount%2===1?v.lastIndexOf('"'):idx)+completed;
  }else{
    let common=cands[0];
    for(const c of cands)while(!c.toLowerCase().startsWith(common.toLowerCase()))common=common.slice(0,-1);
    if(common.length>prefix.length){cmdEl.value=v.slice(0,idx)+dirPart+common;}
    else print(cands.join('    '),'sys-line');
  }
}
/* header controls */
const sel=document.getElementById('scenarioSel');
SCENARIOS.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.title;sel.appendChild(o);});
sel.addEventListener('change',()=>loadScenario(Number(sel.value)));
document.getElementById('newVar').addEventListener('click',()=>loadScenario(Number(sel.value)));
document.getElementById('nextBtn').addEventListener('click',()=>{
  const next=(Number(sel.value)+1)%SCENARIOS.length;loadScenario(next);
});
/* copy full terminal transcript for instructor review */
function terminalTranscript(){
  return Array.from(termEl.children).map(el=>el.textContent).join('\n');
}
async function copyTranscriptTo(btn){
  const defaultLabel=btn.dataset.label||(btn.dataset.label=btn.textContent);
  const text=terminalTranscript();
  let ok=true;
  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(text);
    }else{
      const ta=document.createElement('textarea');
      ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.focus();ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }catch(e){ok=false;}
  btn.textContent=ok?'✓ Copied!':'Copy failed — select text manually';
  setTimeout(()=>{btn.textContent=defaultLabel;},2200);
}
document.getElementById('copyBtn').addEventListener('click',e=>copyTranscriptTo(e.currentTarget));
document.getElementById('copyBtnHeader').addEventListener('click',e=>copyTranscriptTo(e.currentTarget));
/* view toggle: missions <-> dictionary */
const mainEl=document.querySelector('main');
const dictView=document.getElementById('dictView');
const navRange=document.getElementById('navRange');
const navDict=document.getElementById('navDict');
function showRange(){dictView.hidden=true;mainEl.style.display='';navRange.classList.add('active');navDict.classList.remove('active');cmdEl.focus();}
function showDict(){dictView.hidden=false;mainEl.style.display='none';navDict.classList.add('active');navRange.classList.remove('active');document.getElementById('dictSearch').focus();}
navRange.addEventListener('click',showRange);
navDict.addEventListener('click',showDict);
/* dictionary rendering + search */
function renderDict(filter){
  const q=(filter||'').toLowerCase();
  const body=document.getElementById('dictBody');
  let html='',count=0;
  for(const cat of DICT){
    const hits=cat.entries.filter(e=>!q||
      (e.n+' '+e.a+' '+e.w+' '+e.s+' '+e.ex.join(' ')+' '+e.c).toLowerCase().includes(q));
    if(!hits.length)continue;
    html+='<div class="dict-cat">'+cat.cat+'</div><div class="dict-grid">';
    for(const e of hits){
      count++;
      html+='<div class="dcard"><span class="dn">'+e.n+'</span>'+
        (e.a!=='—'?'<span class="da">'+e.a+'</span>':'')+
        '<div class="dw">'+e.w+'</div>'+
        '<div class="ds">'+esc(e.s)+'</div>'+
        e.ex.map(x=>'<div class="dex">&gt; '+esc(x)+'</div>').join('')+
        '<div class="dc">'+e.c+'</div></div>';
    }
    html+='</div>';
  }
  body.innerHTML=html||'<p style="color:var(--muted)">No commands match that filter.</p>';
  document.getElementById('dictCount').textContent=count+' command'+(count===1?'':'s');
}
document.getElementById('dictSearch').addEventListener('input',e=>renderDict(e.target.value));
renderDict('');
/* reference drawer (quick sheet inside missions view) */
const REF=[['pwd','where am I?'],['ls  /  ls -Recurse -Force','list files · dig into subfolders · show hidden'],['cd <folder>  /  cd ..','move around'],['cat <file>','read a file'],['Select-String "x" file','search inside files (grep)'],['… | Measure-Object','count results'],['Get-FileHash <file>','fingerprint a file'],['Get-Process / Stop-Process','see & kill processes'],['Get-ScheduledTask','list automated tasks'],['Disable-ScheduledTask','turn a task off'],['New-Item -ItemType Directory','make a folder'],['Move-Item src dst','move a file'],['Remove-Item <file> -Force','delete (hidden needs -Force)'],['Set-Content -Path f -Value "x"','write text to a file'],['tree','draw the folder map'],['Tab','autocomplete file names'],['↑ / ↓','command history']];
document.getElementById('refbody').innerHTML=REF.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('');
/* keyboard: redirect keystrokes to the prompt even if focus drifted (e.g. clicking transcript text to read/select it),
   so history/typing always reach the terminal like a real one would. Leaves real controls (buttons, the scenario
   select, the dictionary search box) alone. */
document.addEventListener('keydown',e=>{
  if(!dictView.hidden)return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const ae=document.activeElement,tag=ae?ae.tagName:'';
  if(ae!==cmdEl&&(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA'||tag==='BUTTON'||tag==='A'))return;
  if(ae!==cmdEl)cmdEl.focus();
  if(e.key==='Enter'){const v=cmdEl.value;cmdEl.value='';runCommand(v);}
  else if(e.key==='ArrowUp'){e.preventDefault();if(ST.hIdx>0){ST.hIdx--;cmdEl.value=ST.history[ST.hIdx]||'';}}
  else if(e.key==='ArrowDown'){e.preventDefault();if(ST.hIdx<ST.history.length){ST.hIdx++;cmdEl.value=ST.history[ST.hIdx]||'';}}
  else if(e.key==='Tab'){e.preventDefault();tabComplete();}
});
/* boot */
loadScenario(0);
