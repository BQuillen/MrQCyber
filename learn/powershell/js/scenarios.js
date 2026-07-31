/* ── filesystem helpers ─────────────────────────────────────────── */
function baseFS(user){
  user=user||'cadet';
  return D({
    'Users':D({[user]:D({
      'Desktop':D({}),'Documents':D({}),'Downloads':D({}),'Pictures':D({}),
      'AppData':D({'Local':D({'Temp':D({})}),'Roaming':D({})},true)
    })}),
    'Windows':D({'System32':D({'drivers':D({})})}),
    'Program Files':D({'Common Files':D({})})
  });
}
function homeNode(fs,user){return fs.children.Users.children[user||'cadet'];}
const BENIGN_PROCS=r=>[
  {name:'explorer',id:ri(r,1000,1999),cpu:(r()*3).toFixed(2)},
  {name:'svchost',id:ri(r,500,999),cpu:(r()*2).toFixed(2),protected:true},
  {name:'winlogon',id:ri(r,400,499),cpu:'0.10',protected:true},
  {name:'msedge',id:ri(r,2000,2999),cpu:(2+r()*8).toFixed(2)},
  {name:'onenote',id:ri(r,3000,3499),cpu:(r()*2).toFixed(2)},
  {name:'teams',id:ri(r,3500,3999),cpu:(1+r()*4).toFixed(2)}
];
const LEGIT_TASKS=r=>[
  {name:'OneDrive Standalone Update',trigger:'Daily 03:00',action:'C:\\Program Files\\OneDrive\\update.exe',author:'Microsoft'},
  {name:'GoogleUpdateTaskMachine',trigger:'Hourly',action:'C:\\Program Files\\Google\\update.exe',author:'Google LLC'},
  {name:'Defender Scheduled Scan',trigger:'Weekly Sun 02:00',action:'C:\\Windows\\System32\\MpCmdRun.exe',author:'Microsoft'},
  {name:'Adobe Acrobat Update',trigger:'Daily 12:00',action:'C:\\Program Files\\Adobe\\armsvc.exe',author:'Adobe Inc.'}
];

/* ════════════════════════════════════════════════════════════════════
   SCENARIOS — ordered easiest → hardest.
   Each entry: {id, title, diff (0-3), diffLabel, build(r)}
   build(r) returns {fs, user?, processes, schedTasks?, sys, brief,
                     newCmds:[[cmd,desc]...], tasks:[...], done}
   See the AUTHORING TEMPLATE comment block at the bottom of the
   scenario list for a copy-paste starting point.
   ════════════════════════════════════════════════════════════════════ */
const SCENARIOS=[

/* ══ 1 · BOOT CAMP ══════════════════════════════════════════════ */
{id:'boot',title:'1 · Boot Camp: Find Your Way',diff:0,diffLabel:'Intro',
 build(r){
  const fs=baseFS();const H=homeNode(fs);
  const code=pick(r,CODEWORDS);
  const tf=pick(r,TRAINDIRS);
  H.children.Documents.children['welcome.txt']=F(
"Welcome to the Ops Range, cadet.\n\nEvery mission here runs from the command line. Your first task:\nsomewhere inside Documents\\Training is a file whose name starts\nwith 'mission_'. Find it and read it to get your code word.\n\nTip: 'ls' lists a folder, 'cd <name>' steps into it, 'cd ..' steps back.");
  const tr=D({});TRAINDIRS.forEach(n=>tr.children[n]=D({}));
  tr.children[tf].children['mission_briefing.txt']=F('*** EYES ONLY ***\n\nCODE WORD: '+code+'\n\nReport this code word to your instructor to confirm completion.');
  TRAINDIRS.filter(n=>n!==tf).forEach(n=>{tr.children[n].children['readme.txt']=F('Nothing to see in sector '+n+'. Keep looking.');});
  H.children.Documents.children['Training']=tr;
  H.children.Desktop.children['shortcuts.txt']=F('Useful commands: pwd, ls, cd, cat. Try Get-Help any time.');
  return{fs,processes:BENIGN_PROCS(r),
   sys:{host:pick(r,HOSTS),user:'cadet',os:'Windows 11 Enterprise (simulated)',
     note:'A standard analyst workstation. Your files live under C:\\Users\\cadet. Nothing unusual is installed — yet.'},
   brief:'You just badged into the training floor. Learn to move around a Windows filesystem using PowerShell. A briefing file is waiting in your <b>Documents</b> folder, and a code word is hidden somewhere in <code>Documents\\Training</code>.',
   newCmds:[['pwd','where am I? (Get-Location)'],['ls','list files and folders (Get-ChildItem)'],['cd','move between folders (Set-Location)'],['cat','read a file (Get-Content)'],['Get-Help','built-in manual for every command']],
   tasks:[
    {text:'Print your current directory with <code>pwd</code> (Get-Location).',hint:'Type <code>pwd</code> and press Enter.',
     check:ev=>ev.cmds.includes('get-location')},
    {text:'List the contents of your home folder with <code>ls</code>.',hint:'Type <code>ls</code> while in C:\\Users\\cadet.',
     check:ev=>ev.cmds.includes('get-childitem')&&pjoin(ev.ST.cwd).toLowerCase()==='c:\\users\\cadet'},
    {text:'Move into <code>Documents</code> with <code>cd</code>.',hint:'<code>cd Documents</code> — then run <code>ls</code> to look around.',
     check:ev=>pjoin(ev.ST.cwd).toLowerCase().endsWith('\\documents')},
    {text:'Read <code>welcome.txt</code> with <code>cat</code> (Get-Content).',hint:'<code>cat welcome.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.toLowerCase().includes('welcome to the ops range')},
    {text:'Find and read the <code>mission_</code> file hidden in Training to reveal the code word.',
     hint:'Step into each folder (<code>cd Training</code>, <code>ls</code>, <code>cd Alpha</code>…) — or from Documents try <code>ls Training -Recurse</code> to see everything at once.',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes(code)}
   ],
   done:'Code word acquired: <b>'+code+'</b>. Give it to your instructor. You can now navigate any Windows box without a mouse — that\'s the foundation for everything that follows.'};
 }},

/* ══ 2 · THE MISSING REPORT ═════════════════════════════════════ */
{id:'report',title:'2 · The Missing Report',diff:1,diffLabel:'Beginner',
 build(r){
  const fs=baseFS();const H=homeNode(fs);
  const who=pick(r,NAMES);
  const dept=pick(r,DEPTS);const year=String(ri(r,2022,2025));
  const fname='q3_report_'+who+'.txt';
  const archive=D({});
  ['2022','2023','2024','2025'].forEach(y=>{
    archive.children[y]=D({});
    DEPTS.forEach(d=>archive.children[y].children[d]=D({}));
  });
  archive.children[year].children[dept].children[fname]=F('Q3 REPORT — '+dept.toUpperCase()+'\nPrepared by: '+who+'\nStatus: FINAL\n\nVendor costs came in 4% under budget.\nThis is the version Director Vasquez needs.');
  const dy=pick(r,['2022','2023','2024','2025'].filter(y=>y!==year));
  archive.children[dy].children[pick(r,DEPTS)].children['q3_report_'+who+'_DRAFT.txt']=F('Status: DRAFT — do not submit.\nNumbers not verified.');
  archive.children[year].children[pick(r,DEPTS.filter(d=>d!==dept))].children['q2_report_'+who+'.txt']=F('Old quarter. Not the one you need.');
  H.children.Documents.children['Archive']=archive;
  H.children.Documents.children['sticky_note.txt']=F("From: Director Vasquez\n\nCadet — "+who+" filed the Q3 report somewhere in Documents\\Archive\nbefore going on leave, and nobody can find it. I need the FINAL\nversion (not a draft!) moved into Documents\\Reports by end of day.\nThat folder doesn't exist yet. Make it happen.");
  return{fs,processes:BENIGN_PROCS(r),
   sys:{host:pick(r,HOSTS),user:'cadet',os:'Windows 11 Enterprise (simulated)',
     note:'A shared office workstation. Documents\\Archive holds four years of departmental records — dozens of folders. Searching by hand would take all day.'},
   brief:'An employee named <b>'+who+'</b> misfiled the Q3 report deep inside <code>Documents\\Archive</code> and left on vacation. Locate the <b>FINAL</b> version (beware of drafts), then file it properly. Wildcards (<code>*</code>) and <code>-Recurse</code> are your friends.',
   newCmds:[['ls -Recurse','list a folder AND everything below it'],['-Filter / *','wildcards match name patterns'],['New-Item','create a file or folder'],['Move-Item','relocate a file']],
   tasks:[
    {text:'Read <code>sticky_note.txt</code> in Documents for your orders.',hint:'<code>cd Documents</code> then <code>cat sticky_note.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.toLowerCase().includes('vasquez')},
    {text:'Locate every file matching <code>q3_report_*</code> under Archive without opening folders one by one.',
     hint:'From Documents: <code>ls Archive -Recurse -Filter q3_report_*</code>',
     check:ev=>ev.cmds.includes('get-childitem')&&(ev.raw.includes('-r')||ev.raw.includes('*'))&&ev.output.toLowerCase().includes(fname)},
    {text:'Read the report and confirm its status line says <code>FINAL</code>.',
     hint:'You can cat a file from anywhere with its full path:<br><code>cat Archive\\'+year+'\\'+dept+'\\'+fname+'</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes('Status: FINAL')},
    {text:'Create the folder <code>Documents\\Reports</code>.',
     hint:'<code>New-Item -ItemType Directory -Path C:\\Users\\cadet\\Documents\\Reports</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Users','cadet','Documents','Reports']);return n&&n.type==='dir';}},
    {text:'Move the FINAL report into <code>Documents\\Reports</code>.',
     hint:'<code>Move-Item &lt;path to report&gt; C:\\Users\\cadet\\Documents\\Reports</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Users','cadet','Documents','Reports',fname]);
       const old=getNode(ev.ST.fs,['C:','Users','cadet','Documents','Archive',year,dept,fname]);
       return n&&n.type==='file'&&!old;}}
   ],
   done:'Report filed. You just did with two commands what would have taken twenty minutes of clicking — recursive search plus wildcards is the single most-used pattern in real IT and incident response work.'};
 }},

/* ══ 3 · THE GREAT COOKIE CAPER (winter holiday) ════════════════ */
{id:'cookie',title:'3 · The Great Cookie Caper',diff:1,diffLabel:'Beginner',
 build(r){
  const fs=baseFS();const H=homeNode(fs);
  const secret=pick(r,SECRETS);
  const folders=['FromAuntPat','Backup_2019','HolidayIdeas'];
  const files=['gingersnaps_v1.txt','gingersnaps_final.txt','gingersnaps_NEW_improved.txt'];
  const realDir=pick(r,folders);const realFile=pick(r,files);
  const drive=D({});folders.forEach(fn=>drive.children[fn]=D({}));
  const decoyTexts=[
    "GINGERSNAPS (improved!)\nI added raisins. Fight me. — Aunt Pat\n2 cups flour, 1 cup raisins (ESSENTIAL), ginger optional",
    "gingersnaps??\n1. buy cookies\n2. put on nice plate\n3. tell no one",
    "GINGERSNAPS v.experimental\nReplaced butter with margarine to be healthy.\nGrandma must never know."];
  let d=0;
  folders.forEach(fn=>files.forEach(fl=>{
    if(fn===realDir&&fl===realFile){
      drive.children[fn].children[fl]=F("MABEL'S ORIGINAL — DO NOT CHANGE\n\n2 cups flour · 1 tsp ginger · 1 tsp cinnamon\n3/4 cup butter · 1 cup brown sugar · 1 egg · 1/4 cup molasses\n\nSECRET INGREDIENT: "+secret+"\n\nBake 375°F for 9 minutes. Not 10. NINE.\n— Mabel, 1987");
    }else if(r()<0.5){
      drive.children[fn].children[fl]=F(decoyTexts[d++%decoyTexts.length]);
    }
  }));
  // guarantee at least 2 decoys exist
  if(Object.values(drive.children).reduce((a,f)=>a+Object.keys(f.children).length,0)<3){
    const fn=pick(r,folders.filter(x=>x!==realDir));
    drive.children[fn].children['gingersnaps_v1.txt']=F(decoyTexts[0]);
    drive.children[fn].children['gingersnaps_final.txt']=F(decoyTexts[2]);
  }
  H.children.Documents.children['RecipeDrive']=drive;
  H.children.Desktop.children['grandma_note.txt']=F(
"Dear cadet,\n\nThe family bake-off is TONIGHT and the recipe drive is a mess.\nSomeone (Pat.) saved a bunch of 'improved' gingersnap recipes\nall over Documents\\RecipeDrive and now nobody knows which one\nis my original. Mine says MABEL'S ORIGINAL at the top and has\nthe secret ingredient.\n\nPlease: make a folder Documents\\RecipeBox, put a COPY of my real\nrecipe in it named gingersnaps_official.txt — and leave the\noriginal exactly where it is. I don't trust this computer.\n\nLove, Grandma");
  return{fs,processes:BENIGN_PROCS(r),
   sys:{host:'FAMILY-PC',user:'cadet',os:'Windows 11 Home (simulated)',
     note:'The family kitchen computer. Sticky keyboard, 47 browser toolbars, and a RecipeDrive folder that three generations have been saving into without any system whatsoever.'},
   brief:'The annual bake-off is tonight and <b>Grandma Mabel\'s original gingersnap recipe</b> is lost among impostor versions scattered through <code>Documents\\RecipeDrive</code>. Find the authentic one, then <b>copy</b> (never move — Grandma\'s orders) it into a new <code>RecipeBox</code> folder under an official name.',
   newCmds:[['Copy-Item','duplicate a file (original stays put)'],['Rename-Item','change a file\'s name']],
   tasks:[
    {text:'Read <code>grandma_note.txt</code> on the Desktop.',hint:'<code>cat C:\\Users\\cadet\\Desktop\\grandma_note.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes('bake-off')},
    {text:'List every <code>gingersnaps*</code> file hiding under RecipeDrive.',
     hint:'<code>ls C:\\Users\\cadet\\Documents\\RecipeDrive -Recurse -Filter gingersnaps*</code>',
     check:ev=>ev.cmds.includes('get-childitem')&&(ev.raw.includes('-r')||ev.raw.includes('*'))&&ev.output.toLowerCase().includes(realFile)},
    {text:'Read the recipes until you find the one marked <code>MABEL\'S ORIGINAL</code>.',
     hint:'<code>cat</code> each candidate. The real one lists a secret ingredient.',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes("MABEL'S ORIGINAL")},
    {text:'Create the folder <code>Documents\\RecipeBox</code>.',
     hint:'<code>New-Item -ItemType Directory -Path C:\\Users\\cadet\\Documents\\RecipeBox</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Users','cadet','Documents','RecipeBox']);return n&&n.type==='dir';}},
    {text:'<b>Copy</b> the real recipe into RecipeBox — the original must stay in place.',
     hint:'<code>Copy-Item C:\\Users\\cadet\\Documents\\RecipeDrive\\'+realDir+'\\'+realFile+' C:\\Users\\cadet\\Documents\\RecipeBox</code>',
     check:ev=>{const box=getNode(ev.ST.fs,['C:','Users','cadet','Documents','RecipeBox']);
       const orig=getNode(ev.ST.fs,['C:','Users','cadet','Documents','RecipeDrive',realDir,realFile]);
       return box&&orig&&Object.values(box.children).some(n=>n.type==='file'&&n.content.includes(secret));}},
    {text:'Rename the copy to <code>gingersnaps_official.txt</code>.',
     hint:'<code>Rename-Item C:\\Users\\cadet\\Documents\\RecipeBox\\'+realFile+' gingersnaps_official.txt</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Users','cadet','Documents','RecipeBox','gingersnaps_official.txt']);
       return n&&n.type==='file'&&n.content.includes(secret);}}
   ],
   done:'Bake-off saved — the secret ingredient was <b>'+secret+'</b>. You now know the crucial difference between <code>Copy-Item</code> and <code>Move-Item</code>: one preserves the source, the other doesn\'t. In forensics, that difference is everything.'};
 }},

/* ══ 4 · HIDDEN IN PLAIN SIGHT ══════════════════════════════════ */
{id:'hidden',title:'4 · Hidden in Plain Sight',diff:2,diffLabel:'Intermediate',
 build(r){
  const fs=baseFS();const H=homeNode(fs);
  const badName=pick(r,PAYLOADS)+'.dat';
  const badContent='MZ\u0090\u0000::'+pick(r,CODEWORDS)+'::'+ri(r,10000,99999)+'::beacon-config c2='+ri(r,11,240)+'.'+ri(r,1,254)+'.'+ri(r,1,254)+'.'+ri(r,1,254);
  const badHash=fakeHash(badContent);
  H.children.Downloads.children['vacation_pics.zip.txt']=F('Totally normal vacation photo metadata. Nothing evil here.');
  H.children.Downloads.children['printer_driver_setup.log']=F('setup log: install completed OK');
  H.children.Downloads.children[badName]=F(badContent,{hidden:true});
  H.children.Documents.children['threat_intel.txt']=F(
'SOC — THREAT INTEL BULLETIN '+ri(r,100,999)+'\n\nA phishing campaign is dropping a hidden implant config file\ninto user Download folders. Known-bad SHA256:\n\n  '+badHash+'\n\nIf a file on your machine matches this hash, it is malicious.\nDelete it (hidden files need -Force).');
  return{fs,processes:BENIGN_PROCS(r),
   sys:{host:pick(r,HOSTS),user:'cadet',os:'Windows 11 Enterprise (simulated)',
     note:'Your own workstation. The SOC flagged it after you clicked a link in a "package delivery" email yesterday. Downloads looks clean at first glance… which is exactly the problem.'},
   brief:'Malware often sets the <b>hidden</b> attribute so a normal <code>ls</code> never shows it. The SOC has published a known-bad file hash. Reveal what is hiding in <code>Downloads</code>, fingerprint it with <code>Get-FileHash</code>, compare against intel, and destroy it.',
   newCmds:[['ls -Force','reveal hidden files and folders'],['Get-FileHash','SHA256 fingerprint — how analysts identify malware'],['Remove-Item -Force','delete (hidden items need -Force)']],
   tasks:[
    {text:'Read the SOC bulletin: <code>Documents\\threat_intel.txt</code>.',hint:'<code>cat C:\\Users\\cadet\\Documents\\threat_intel.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes('THREAT INTEL')},
    {text:'List <code>Downloads</code> normally, then again with <code>-Force</code> to reveal the hidden file.',
     hint:'<code>ls C:\\Users\\cadet\\Downloads -Force</code> — compare the two listings.',
     check:ev=>ev.cmds.includes('get-childitem')&&ev.raw.includes('-f')&&ev.output.toLowerCase().includes(badName)},
    {text:'Compute the hidden file\'s SHA256 with <code>Get-FileHash</code>.',
     hint:'<code>Get-FileHash C:\\Users\\cadet\\Downloads\\'+badName+'</code>',
     check:ev=>ev.cmds.includes('get-filehash')&&ev.output.includes(badHash)},
    {text:'Confirm the hash matches the bulletin, then delete the file (hidden ⇒ needs <code>-Force</code>).',
     hint:'<code>Remove-Item C:\\Users\\cadet\\Downloads\\'+badName+' -Force</code>',
     check:ev=>!getNode(ev.ST.fs,['C:','Users','cadet','Downloads',badName])}
   ],
   done:'Implant removed. Hash comparison is exactly how real analysts confirm malware: a filename can lie, a SHA256 fingerprint cannot. You verified before deleting — that\'s proper procedure.'};
 }},

/* ══ 5 · OPERATION: LASER SHARK (spy caper) ═════════════════════ */
{id:'shark',title:'5 · Operation: Laser Shark',diff:2,diffLabel:'Intermediate',
 build(r){
  const user='drmalvolio';
  const fs=baseFS(user);const H=homeNode(fs,user);
  const fav=pick(r,SHARKS);
  const qty=ri(r,3,9);
  const snack=pick(r,SNACKS);
  const password=fav.replace(/[^A-Za-z0-9]/g,'')+qty;
  H.children.Desktop.children['evil_todo.txt']=F(
"DR. MALVOLIO'S EVIL TO-DO LIST\n\n[x] feed the sharks\n[x] practice menacing laugh (20 min)\n[ ] fire Kevin?? (see HR folder)\n[x] CHANGE THE SUNBLOTTER OVERRIDE PASSWORD\n    (done — hint stored in the usual hidden place in Documents,\n     because I keep forgetting it. genius-proof system.)\n[ ] world domination (thursday?)");
  H.children.Documents.children['Receipts']=D({
    ['laser_shark_invoice_'+ri(r,100,999)+'.txt']:F(
"APEX PREDATOR OUTFITTERS — INVOICE\n\nItem: Laser-Mounted Shark (premium, extra menacing)\nQty: "+qty+"\nUnit price: $1,200,000\nNote from supplier: please stop calling them 'swim lasers'.\nShipping: 1x reinforced aquarium truck (driver requests hazard pay)"),
    'volcano_hottub_invoice.txt':F("LAVA LUXURY SPAS\nItem: Hot tub, volcano-rim edition. Qty: 1\nWarning: warranty void if lair self-destructs."),
    'monorail_maintenance.txt':F("Monthly monorail service: $48,000\nNote: the doom monorail STILL squeaks on curve 3.")});
  H.children.Documents.children['Monologues']=D({
    'draft1_final_FINAL.txt':F('"Ah, agent. So glad you could... DROP IN." (too obvious?)'),
    'draft2.txt':F('"You see, my sharks and I share a common dream..." (workshopping)'),
    'rejected.txt':F('"Welcome to my lair, please wipe your feet." (not menacing. cut.)')});
  H.children.Documents.children['HenchmanHR']=D({
    'performance_review_kevin.txt':F("Kevin left the death ray on standby AGAIN.\nElectric bill: catastrophic. Rating: 1/5 skulls."),
    'performance_review_brenda.txt':F("Brenda reorganized the doom filing system. Excellent.\nRating: 5/5 skulls. Do not let Kevin near her system."),
    'snack_budget.txt':F("Lair snack budget spent entirely on "+snack+".\nHenchmen morale: surprisingly high.")});
  H.children.Documents.children['Vault']=D({
    'password_hint.txt':F("VAULT PASSWORD REMINDER (for me, the genius)\n\nThe Sunblotter override password is:\n  [name of my FAVORITE shark, no spaces]\n  followed immediately by\n  [how many laser sharks I bought]\n\ne.g. if my favorite were 'Bitey' and I owned 4: Bitey4\nI am unstoppable.")},true);
  fs.children['Sharks']=D({
    'feeding_schedule.txt':F("SHARK FEEDING SCHEDULE — do not skip, they remember\n\n"+
      SHARKS.filter(s=>s!==fav).slice(0,3).map(s=>'  '+s+' — 6am, premium salmon').join('\n')+
      '\n  ★ '+fav+" — 6am AND 6pm — MY FAVORITE. Extra glitter in tank.\n\nReminder: lasers OFF during feeding. We lost an intern."),
    'laser_calibration.txt':F('All shark lasers calibrated to "dramatic but survivable".')});
  fs.children['Sunblotter']=D({
    'README.txt':F("SUNBLOTTER 9000 — SUN-BLOTTING SUPERWEAPON\nStatus: ARMED\n\nTo disarm, write the override password into a file named\noverride_code.txt in this folder. (Set-Content is your friend.)")});
  return{fs,user,processes:BENIGN_PROCS(r),
   sys:{host:'LAIR-MAINFRAME',user:'drmalvolio (you are NOT supposed to be here)',os:'Windows 11 Villain Edition (simulated)',
     note:'Dr. Malvolio\'s personal computer inside the volcano lair. He is currently upstairs monologuing to an empty chair. His Sunblotter 9000 fires at dawn. You have one terminal and zero time.'},
   brief:'You are the agent. This is the villain\'s machine. Somewhere in this ridiculous filesystem — between <b>laser shark invoices</b> and rejected monologue drafts — are the pieces of the <b>Sunblotter override password</b>. Assemble it and write it into the disarm file before dawn. Searching with <code>Select-String</code> beats reading everything.',
   newCmds:[['Select-String','search inside files for a pattern — PowerShell\'s grep'],['Select-String + *','search MANY files at once with wildcards']],
   tasks:[
    {text:'Read <code>evil_todo.txt</code> on the Desktop — villains always leave notes.',hint:'<code>cat C:\\Users\\drmalvolio\\Desktop\\evil_todo.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes('EVIL TO-DO')},
    {text:'Find the hidden folder in <code>Documents</code> and read the password hint inside.',
     hint:'<code>ls C:\\Users\\drmalvolio\\Documents -Force</code> reveals it, then <code>cat Documents\\Vault\\password_hint.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes('FAVORITE shark')},
    {text:'Discover which shark is his <b>favorite</b>. (Try searching instead of reading everything: <code>Select-String</code>.)',
     hint:'<code>Select-String -Pattern "FAVORITE" -Path C:\\Sharks\\*</code>',
     check:ev=>ev.output.includes('MY FAVORITE')&&ev.output.includes(fav)},
    {text:'Find how many laser sharks he bought (check the receipts).',
     hint:'<code>Select-String -Pattern "Qty" -Path C:\\Users\\drmalvolio\\Documents\\Receipts\\*</code>',
     check:ev=>ev.output.includes('Qty: '+qty)},
    {text:'Assemble the password and disarm: write it into <code>C:\\Sunblotter\\override_code.txt</code>.',
     hint:'Password = favorite shark\'s name (no spaces) + the quantity.<br><code>Set-Content -Path C:\\Sunblotter\\override_code.txt -Value "&lt;password&gt;"</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Sunblotter','override_code.txt']);
       return n&&n.type==='file'&&n.content.trim().toLowerCase()===password.toLowerCase();}}
   ],
   done:'SUNBLOTTER DISARMED. The override was <b>'+password+'</b>. Note what actually beat the villain: he reused a guessable password built from personal facts, and left the hint on the same machine. Every real breach report contains this exact mistake — minus the sharks.'};
 }},
/* ══ 6 · LOG SLEUTH ═════════════════════════════════════════════ */
{id:'logs',title:'6 · Log Sleuth',diff:2,diffLabel:'Intermediate',
 build(r){
  const fs=baseFS();
  const atkIP='203.0.113.'+ri(r,10,240);
  const victim=pick(r,NAMES);
  const others=NAMES.filter(n=>n!==victim);
  const nFail=ri(r,11,23);
  const lines=[];let h=6,m=ri(r,0,40);
  const stamp=()=>{m+=ri(r,1,4);if(m>59){m-=60;h++;}return '2026-07-'+ri(r,20,27)+' '+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(ri(r,10,59));};
  const benignIP=()=>'10.42.'+ri(r,1,20)+'.'+ri(r,2,250);
  for(let i=0;i<14;i++)lines.push(stamp()+'  SUCCESS LOGIN  user='+pick(r,others)+'  from '+benignIP());
  for(let i=0;i<nFail;i++)lines.push(stamp()+'  FAILED LOGIN   user='+pick(r,[victim,victim,pick(r,others)])+'  from '+atkIP);
  for(let i=0;i<6;i++)lines.push(stamp()+'  SUCCESS LOGIN  user='+pick(r,others)+'  from '+benignIP());
  lines.push(stamp()+'  SUCCESS LOGIN  user='+victim+'  from '+atkIP);
  for(let i=0;i<4;i++)lines.push(stamp()+'  SUCCESS LOGIN  user='+pick(r,others)+'  from '+benignIP());
  const logName='auth_20260727.log';
  fs.children['Logs']=D({[logName]:F(lines.join('\n')),
    'system_boot.log':F('boot ok\nservices started\nno errors')});
  return{fs,processes:BENIGN_PROCS(r),
   sys:{host:'AUTHSRV-01',user:'cadet (remote session)',os:'Windows Server 2022 (simulated)',
     note:'You are shelled into the authentication server. Login records live in C:\\Logs. The file is far too long to eyeball — you will need Select-String and pipelines.'},
   brief:'The SOC flagged a burst of failed logins from IP <b>'+atkIP+'</b> last night — a classic <b>password-spray</b> pattern. Dig through <code>C:\\Logs\\'+logName+'</code> and answer the question that matters: <i>did the attacker eventually get in, and as whom?</i>',
   newCmds:[['| (pipe)','send one command\'s output into another'],['Measure-Object','count whatever is piped in'],['Set-Content','write text into a file — your incident notes']],
   tasks:[
    {text:'Count the total lines in the log using a pipeline: <code>Get-Content … | Measure-Object</code>.',
     hint:'<code>cd C:\\Logs</code> then <code>Get-Content '+logName+' | Measure-Object</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.cmds.includes('measure-object')},
    {text:'Show only the FAILED logins with <code>Select-String</code>.',
     hint:'<code>Select-String -Pattern "FAILED" -Path '+logName+'</code>',
     check:ev=>ev.cmds.includes('select-string')&&ev.raw.includes('failed')&&ev.output.toUpperCase().includes('FAILED LOGIN')},
    {text:'Count how many events came from the attacker IP '+atkIP+'.',
     hint:'<code>Select-String "'+atkIP+'" '+logName+' | Measure-Object</code>',
     check:ev=>ev.raw.includes(atkIP)&&ev.cmds.includes('measure-object')},
    {text:'Find the SUCCESSFUL login from that IP — the compromised account.',
     hint:'Chain patterns: <code>Get-Content '+logName+' | Select-String "'+atkIP+'" | Select-String "SUCCESS"</code>',
     check:ev=>ev.output.includes('SUCCESS LOGIN')&&ev.output.includes(atkIP)&&ev.output.includes(victim)},
    {text:'Write your finding to an incident note: create <code>C:\\Logs\\incident.txt</code> containing the compromised username.',
     hint:'<code>Set-Content -Path C:\\Logs\\incident.txt -Value "compromised account: '+victim+'"</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Logs','incident.txt']);return n&&n.type==='file'&&n.content.toLowerCase().includes(victim);}}
   ],
   done:'Correct — after '+nFail+' failures, the attacker logged in as <b>'+victim+'</b>. You just performed real log triage: filter, count, correlate, document. That workflow is the daily bread of a SOC analyst.'};
 }},

/* ══ 7 · APRIL FOOLS: PRANK CLEANUP ═════════════════════════════ */
{id:'prank',title:'7 · April Fools: Prank Cleanup',diff:2,diffLabel:'Intermediate+',
 build(r){
  const fs=baseFS();const H=homeNode(fs);
  const nDocs=ri(r,5,9),nDesk=ri(r,4,8);
  const total=nDocs+nDesk;
  const silly=pick(r,SILLYNAMES);
  for(let i=0;i<nDocs;i++)H.children.Documents.children['prank_'+String(ri(r,100,999))+'_'+i+'_honk.txt']=F('HONK '.repeat(ri(r,3,12)));
  for(let i=0;i<nDesk;i++)H.children.Desktop.children['prank_'+String(ri(r,100,999))+'_'+i+'_honk.txt']=F('HONK '.repeat(ri(r,3,12)));
  H.children.Documents.children['BigMeeting']=D({
    [silly]:F('Q2 ALL-HANDS PRESENTATION (the real one)\nSlide 1: Revenue up.\nSlide 2: More slides to follow.'),
    'agenda.txt':F('Meeting at 2pm. Presentation REQUIRED. Do not be the person who lost it.')});
  H.children.Desktop.children['jester_note.txt']=F(
"HONK HONK.\n\nI, THE JESTER, have struck. Your precious presentation now has\na far funnier name (somewhere in Documents\\BigMeeting), and I\nhave scattered my honk files across Documents and the Desktop.\n\nTo undo my genius:\n  1. COUNT my honk files — all of them\n  2. Delete them ALL (one by one? in THIS economy? use wildcards)\n  3. Restore the presentation's real name: quarterly_presentation.pptx\n  4. Write the honk count into Desktop\\cleanup_report.txt\n\nFail, and I strike again on May 1st.\n           — The Jester 🃏");
  return{fs,processes:BENIGN_PROCS(r),
   sys:{host:pick(r,HOSTS),user:'cadet',os:'Windows 11 Enterprise (simulated)',
     note:'Your coworker\'s machine, post-prank. The Jester strikes every April 1st and IT is tired of cleaning it up by hand. This year, you have wildcards.'},
   brief:'The office prankster ran a script overnight: <b>'+total+'-ish junk files</b> named <code>prank_*_honk.txt</code> litter Documents and the Desktop, and the all-hands presentation has been renamed something absurd. Clean it up the professional way — <b>bulk operations</b>, not one file at a time.',
   newCmds:[['ls -Name','plain list of names — perfect for piping'],['Remove-Item prank_*','wildcards delete many files in one command'],['counting pipelines','ls -Recurse -Filter … -Name | Measure-Object']],
   tasks:[
    {text:'Read <code>jester_note.txt</code> on the Desktop.',hint:'<code>cat C:\\Users\\cadet\\Desktop\\jester_note.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes('THE JESTER')},
    {text:'Count ALL the prank files with one pipeline (they\'re in more than one folder).',
     hint:'<code>ls C:\\Users\\cadet -Recurse -Filter prank_* -Name | Measure-Object</code>',
     check:ev=>ev.raw.includes('prank')&&ev.cmds.includes('measure-object')&&ev.output.includes('Count')},
    {text:'Delete every prank file in <code>Documents</code> with ONE wildcard command.',
     hint:'<code>Remove-Item C:\\Users\\cadet\\Documents\\prank_*</code>',
     check:ev=>{const d=getNode(ev.ST.fs,['C:','Users','cadet','Documents']);
       return d&&!Object.keys(d.children).some(n=>n.startsWith('prank_'));}},
    {text:'Delete every prank file on the <code>Desktop</code> the same way (careful — keep jester_note.txt as evidence).',
     hint:'<code>Remove-Item C:\\Users\\cadet\\Desktop\\prank_*</code> — the wildcard won\'t touch jester_note.txt.',
     check:ev=>{const d=getNode(ev.ST.fs,['C:','Users','cadet','Desktop']);
       return d&&!Object.keys(d.children).some(n=>n.startsWith('prank_'))&&d.children['jester_note.txt'];}},
    {text:'Restore the presentation\'s real name: <code>quarterly_presentation.pptx</code>.',
     hint:'<code>Rename-Item "C:\\Users\\cadet\\Documents\\BigMeeting\\'+silly+'" quarterly_presentation.pptx</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Users','cadet','Documents','BigMeeting','quarterly_presentation.pptx']);
       return n&&n.type==='file'&&n.content.includes('ALL-HANDS');}},
    {text:'Write the honk count ('+'exact number!'+') into <code>Desktop\\cleanup_report.txt</code>.',
     hint:'Your Measure-Object count was the answer.<br><code>Set-Content -Path C:\\Users\\cadet\\Desktop\\cleanup_report.txt -Value "'+total+' prank files removed"</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Users','cadet','Desktop','cleanup_report.txt']);
       return n&&n.type==='file'&&n.content.includes(String(total));}}
   ],
   done:'All '+total+' honks silenced, presentation restored, incident documented. Wildcards turned an hour of clicking into three commands — and notice how the precise pattern <code>prank_*</code> protected the evidence file. Scoped destruction is a professional skill.'};
 }},

/* ══ 8 · THE GHOST IN THE MACHINE (Halloween) ═══════════════════ */
{id:'ghost',title:'8 · The Ghost in the Machine',diff:3,diffLabel:'Advanced',
 build(r){
  const user='nightowl';
  const fs=baseFS(user);const H=homeNode(fs,user);
  const tWhisper=pick(r,GHOST_WHISPER),tScribe=pick(r,GHOST_SCRIBE),tShuffle=pick(r,GHOST_SHUFFLE);
  const hour=pick(r,['00:00','03:33','02:13']);
  fs.children['ProgramData']=D({'Haunt':D({
    'whisper.ps1':F('# HAUNT-MODULE-1\n# Plays ghost_moan.wav through the speakers at '+hour+'\nStart-Process wmplayer "C:\\ProgramData\\Haunt\\ghost_moan.wav" -WindowStyle Hidden'),
    'scribe.ps1':F('# HAUNT-MODULE-2\n# Recreates GET_OUT.txt on the Desktop every hour\nSet-Content "C:\\Users\\'+user+'\\Desktop\\GET_OUT.txt" "GET OUT`nGET OUT`nGET OUT"'),
    'shuffle.ps1':F('# HAUNT-MODULE-3\n# Moves a random file from Documents into Documents\\Beyond at '+hour+'\n$f = Get-ChildItem C:\\Users\\'+user+'\\Documents -File | Get-Random\nMove-Item $f.FullName C:\\Users\\'+user+'\\Documents\\Beyond'),
    'ghost_moan.wav':F('(imagine an extremely unconvincing recorded moan)')})});
  H.children.Desktop.children['GET_OUT.txt']=F('GET OUT\nGET OUT\nGET OUT');
  H.children.Desktop.children['it_ticket_1031.txt']=F(
"IT TICKET #1031 — subject: MY COMPUTER IS HAUNTED\nSubmitted by: nightowl (3rd shift)\n\nEvery night at "+hour+" the speakers MOAN. A file called GET_OUT.txt\nkeeps reappearing on my Desktop no matter how often I delete it.\nAnd my documents keep moving into a folder called 'Beyond' that I\nnever created. I have started leaving snacks out for it.\n\nIT response: There is no ghost. Computers do not get haunted.\nComputers get SCHEDULED TASKS. Check Get-ScheduledTask, find\nwhat's running, trace the scripts, and shut it all down.\nAlso please stop leaving snacks in the server room.");
  H.children.Documents.children['Beyond']=D({'q1_notes.txt':F('why am I in here'),'todo_list.txt':F('I did not move myself')});
  H.children.Documents.children['shift_log.txt']=F('Night shift log: everything fine except the OBVIOUS HAUNTING');
  const schedTasks=LEGIT_TASKS(r).concat([
    {name:tWhisper,trigger:'Daily '+hour,action:'powershell.exe -File C:\\ProgramData\\Haunt\\whisper.ps1',author:'???'},
    {name:tScribe,trigger:'Hourly',action:'powershell.exe -File C:\\ProgramData\\Haunt\\scribe.ps1',author:'???'},
    {name:tShuffle,trigger:'Daily '+hour,action:'powershell.exe -File C:\\ProgramData\\Haunt\\shuffle.ps1',author:'???'}
  ]);
  const seen=new Set();
  return{fs,user,processes:BENIGN_PROCS(r),schedTasks,
   sys:{host:'NIGHTSHIFT-PC',user:'nightowl',os:'Windows 11 Pro (simulated)',
     note:'A 3rd-shift workstation with a reputation. Speakers moan at '+hour+', files move themselves, and a message keeps appearing on the Desktop. The user is convinced it\'s a ghost. IT is convinced it\'s Tuesday.'},
   brief:'This computer is "haunted": nightly moaning, a self-resurrecting <code>GET_OUT.txt</code>, documents migrating into a folder called <b>Beyond</b>. Spoiler for the skeptical: ghosts are just <b>scheduled tasks</b> — automation that runs on a timer whether anyone is logged in or not. Find them, trace what they run, and exorcise the machine properly.',
   newCmds:[['Get-ScheduledTask','list the jobs Windows runs automatically'],['Get-ScheduledTask -TaskName','inspect one task — see WHAT it actually runs'],['Disable-ScheduledTask','turn an automated task off'],['Remove-Item -Recurse','delete a folder and everything in it']],
   tasks:[
    {text:'Read <code>it_ticket_1031.txt</code> on the Desktop.',hint:'<code>cat C:\\Users\\nightowl\\Desktop\\it_ticket_1031.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes('TICKET #1031')},
    {text:'List all scheduled tasks and spot the three that don\'t belong.',
     hint:'<code>Get-ScheduledTask</code> — compare authors and names against normal software.',
     check:ev=>ev.cmds.includes('get-scheduledtask')&&ev.output.includes(tWhisper)},
    {text:'Inspect a suspicious task in detail to find the script it runs.',
     hint:'<code>Get-ScheduledTask -TaskName '+tWhisper+'</code> — look at the Action line.',
     check:ev=>ev.cmds.includes('get-scheduledtask')&&ev.output.includes('Action')&&ev.output.includes('.ps1')},
    {text:'Read all three <code>.ps1</code> scripts in <code>C:\\ProgramData\\Haunt</code> — know your ghost before you banish it.',
     hint:'<code>cat C:\\ProgramData\\Haunt\\whisper.ps1</code> (then scribe.ps1, shuffle.ps1 — or <code>cat C:\\ProgramData\\Haunt\\*.ps1</code>)',
     check:ev=>{if(ev.cmds.includes('get-content')){
        if(ev.output.includes('HAUNT-MODULE-1'))seen.add(1);
        if(ev.output.includes('HAUNT-MODULE-2'))seen.add(2);
        if(ev.output.includes('HAUNT-MODULE-3'))seen.add(3);}
       return seen.size===3;}},
    {text:'Disable all three ghost tasks.',
     hint:'<code>Disable-ScheduledTask -TaskName '+tWhisper+'</code> — repeat for the other two.',
     check:ev=>{const t=ev.ST.schedTasks;return [tWhisper,tScribe,tShuffle].every(n=>t.find(x=>x.name===n).disabled);}},
    {text:'Delete the <code>C:\\ProgramData\\Haunt</code> folder entirely.',
     hint:'It has contents, so: <code>Remove-Item C:\\ProgramData\\Haunt -Recurse</code>',
     check:ev=>!getNode(ev.ST.fs,['C:','ProgramData','Haunt'])}
   ],
   done:'Exorcism complete — the "ghost" was three scheduled tasks and a sound file. Remember the order: <i>understand it, disable it, then delete it</i>. Real malware uses scheduled tasks for persistence constantly (attackers call it T1053) — and it fools adults the same way it fooled the night shift.'};
 }},

/* ══ 9 · PERSISTENCE HUNT ═══════════════════════════════════════ */
{id:'persist',title:'9 · Persistence Hunt',diff:3,diffLabel:'Advanced',
 build(r){
  const fs=baseFS();const H=homeNode(fs);
  const proc=pick(r,MALPROC);
  const payload=pick(r,PAYLOADS)+'.exe';
  const script='updater_'+ri(r,100,999)+'.ps1';
  const roam=H.children.AppData.children.Roaming;
  roam.children['Microsoft']=D({'Windows':D({'Start Menu':D({'Programs':D({'Startup':D({
    [script]:F('# runs at every logon\nStart-Process "C:\\Users\\cadet\\AppData\\Local\\Temp\\'+payload+'" -WindowStyle Hidden')
  })})})})});
  H.children.AppData.children.Local.children.Temp.children[payload]=F('MZ\u0090 fake-implant '+fakeHash(proc).slice(0,12));
  H.children.Desktop.children['SOC_ticket_4471.txt']=F(
'TICKET #4471 — priority HIGH\n\nEDR heartbeat shows an unsigned process running on this host.\nSuspected persistence via the user Startup folder:\n\n  C:\\Users\\cadet\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\n\nNote: AppData is a hidden folder, and "Start Menu" contains a space —\nwrap paths with spaces in quotes.\n\nYour job: identify the process, find what launches it, kill it,\nand delete BOTH the payload and the startup script.');
  const procs=BENIGN_PROCS(r);
  procs.push({name:proc,id:ri(r,4000,4999),cpu:(6+r()*20).toFixed(2)});
  return{fs,processes:procs,
   sys:{host:pick(r,HOSTS),user:'cadet',os:'Windows 11 Enterprise (simulated)',
     note:'An analyst workstation showing EDR alerts. Something restarts itself at every logon. Malware loves the Startup folder because most users never look there — and it sits under hidden AppData.'},
   brief:'Something on this machine survives every reboot. Read <b>SOC ticket #4471</b> on the Desktop, hunt the malicious process with <code>Get-Process</code>, trace its launcher in the hidden <b>Startup</b> folder, then kill and clean. Quotes matter: <code>"Start Menu"</code> has a space.',
   newCmds:[['Get-Process','see everything currently running'],['Stop-Process','kill a process by name or Id'],['"quoted paths"','paths with spaces must be wrapped in quotes']],
   tasks:[
    {text:'Read <code>SOC_ticket_4471.txt</code> on your Desktop.',hint:'<code>cat C:\\Users\\cadet\\Desktop\\SOC_ticket_4471.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes('TICKET #4471')},
    {text:'List running processes and spot the impostor (high CPU, odd name).',hint:'<code>Get-Process</code> — compare against normal Windows names.',
     check:ev=>ev.cmds.includes('get-process')&&ev.output.includes(proc)},
    {text:'Find and read the <code>.ps1</code> script in the Startup folder (AppData is hidden!).',
     hint:'<code>ls "C:\\Users\\cadet\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup" -Force</code><br>then <code>cat</code> the script. Tab-completion helps with long paths.',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes(payload)},
    {text:'Stop the malicious process with <code>Stop-Process</code>.',hint:'<code>Stop-Process -Name '+proc+'</code>',
     check:ev=>{const p=ev.ST.processes.find(p=>p.name===proc);return p&&p.stopped;}},
    {text:'Delete the payload <code>'+payload+'</code> from AppData\\Local\\Temp.',
     hint:'<code>Remove-Item C:\\Users\\cadet\\AppData\\Local\\Temp\\'+payload+'</code>',
     check:ev=>!getNode(ev.ST.fs,['C:','Users','cadet','AppData','Local','Temp',payload])},
    {text:'Delete the startup script so it cannot relaunch at logon.',
     hint:'<code>Remove-Item "C:\\Users\\cadet\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\'+script+'"</code>',
     check:ev=>!getNode(ev.ST.fs,['C:','Users','cadet','AppData','Roaming','Microsoft','Windows','Start Menu','Programs','Startup',script])}
   ],
   done:'Persistence eliminated. You followed the real IR order of operations: <i>identify → trace the launch mechanism → stop the process → remove the payload → remove persistence</i>. Deleting the file alone would have failed — it would be back at next logon.'};
 }},

/* ══ 10 · QUARANTINE PROTOCOL (capstone) ════════════════════════ */
{id:'quarantine',title:'10 · Quarantine Protocol',diff:3,diffLabel:'Capstone',
 build(r){
  const fs=baseFS();const H=homeNode(fs);
  const picks=[];
  const pool=BADFILES.slice();
  const spots=[['Downloads'],['Documents'],['Pictures']];
  spots.forEach(spot=>{
    const nm=pool.splice(Math.floor(r()*pool.length),1)[0]+pick(r,['.exe','.js','.scr']);
    picks.push({name:nm,dir:spot[0]});
    homeNode(fs).children[spot[0]].children[nm]=F('SUSPICIOUS BINARY :: '+fakeHash(nm).slice(0,16));
  });
  H.children.Downloads.children['team_photo.png.txt']=F('harmless');
  H.children.Documents.children['meeting_notes.txt']=F('harmless notes');
  H.children.Desktop.children['ALERT.txt']=F(
'AUTOMATED EDR ALERT — 3 suspicious files detected\n\n  C:\\Users\\cadet\\'+picks[0].dir+'\\'+picks[0].name+'\n  C:\\Users\\cadet\\'+picks[1].dir+'\\'+picks[1].name+'\n  C:\\Users\\cadet\\'+picks[2].dir+'\\'+picks[2].name+'\n\nPOLICY: do NOT delete evidence. Quarantine it.\n  1. Create C:\\Quarantine\n  2. Move all three files there\n  3. Leave a manifest.txt inside describing what you moved\n\nForensics will image the files tomorrow.');
  return{fs,processes:BENIGN_PROCS(r),
   sys:{host:pick(r,HOSTS),user:'cadet',os:'Windows 11 Enterprise (simulated)',
     note:'A workstation under investigation. Rule one of incident response: preserve evidence. You isolate suspicious files, you don\'t destroy them — forensics needs the originals.'},
   brief:'The capstone. The EDR flagged three files scattered across this machine. Real responders don\'t delete evidence — they <b>quarantine</b> it. Read <code>ALERT.txt</code> on the Desktop, build a quarantine folder, relocate every flagged file, and log what you did in a manifest. Everything you\'ve learned, no training wheels.',
   newCmds:[['— none —','capstone mission: every command is one you already know']],
   tasks:[
    {text:'Read <code>ALERT.txt</code> on the Desktop and note all three file paths.',hint:'<code>cat C:\\Users\\cadet\\Desktop\\ALERT.txt</code>',
     check:ev=>ev.cmds.includes('get-content')&&ev.output.includes('AUTOMATED EDR ALERT')},
    {text:'Create the directory <code>C:\\Quarantine</code>.',hint:'<code>New-Item -ItemType Directory -Path C:\\Quarantine</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Quarantine']);return n&&n.type==='dir';}},
    {text:'Move flagged file 1 of 3 into quarantine ('+picks[0].name+').',hint:'<code>Move-Item C:\\Users\\cadet\\'+picks[0].dir+'\\'+picks[0].name+' C:\\Quarantine</code>',
     check:ev=>getNode(ev.ST.fs,['C:','Quarantine',picks[0].name])&&!getNode(ev.ST.fs,['C:','Users','cadet',picks[0].dir,picks[0].name])},
    {text:'Move flagged file 2 of 3 into quarantine ('+picks[1].name+').',hint:'Same pattern — check ALERT.txt for the folder.',
     check:ev=>getNode(ev.ST.fs,['C:','Quarantine',picks[1].name])&&!getNode(ev.ST.fs,['C:','Users','cadet',picks[1].dir,picks[1].name])},
    {text:'Move flagged file 3 of 3 into quarantine ('+picks[2].name+').',hint:'Same pattern — check ALERT.txt for the folder.',
     check:ev=>getNode(ev.ST.fs,['C:','Quarantine',picks[2].name])&&!getNode(ev.ST.fs,['C:','Users','cadet',picks[2].dir,picks[2].name])},
    {text:'Write <code>C:\\Quarantine\\manifest.txt</code> describing the action (mention "quarantine").',
     hint:'<code>Set-Content -Path C:\\Quarantine\\manifest.txt -Value "3 files quarantined by cadet, pending forensics"</code>',
     check:ev=>{const n=getNode(ev.ST.fs,['C:','Quarantine','manifest.txt']);return n&&n.type==='file'&&n.content.toLowerCase().includes('quarantin');}}
   ],
   done:'Evidence preserved, host contained, actions documented — capstone complete. That manifest habit is what separates professionals from panicked users: in a real incident, your notes become part of the legal record.'};
 }}
];

/* ════════════════════════════════════════════════════════════════════
   AUTHORING TEMPLATE — copy this block, un-comment it, and add it as a
   new element in the SCENARIOS array above. Full guide in
   SCENARIO-AUTHORING.md.

{id:'myscenario', title:'11 · My New Scenario', diff:1, diffLabel:'Beginner',
 build(r){
   // r is a seeded random: pick(r,array) chooses one, ri(r,min,max) an int.
   const fs=baseFS();                 // or baseFS('customuser')
   const H=homeNode(fs);              // C:\Users\cadet node
   const word=pick(r,CODEWORDS);      // randomize so answers can't be memorized
   H.children.Desktop.children['note.txt']=F('The word is '+word);
   // Hidden item: F('secret',{hidden:true})  · folder: D({},true)
   return{fs, processes:BENIGN_PROCS(r),
    sys:{host:'MY-PC',user:'cadet',os:'Windows 11 (simulated)',
      note:'One paragraph describing this machine and why it matters.'},
    brief:'One short paragraph shown in the sidebar. <b>bold</b> and <code>code</code> allowed.',
    newCmds:[['SomeCmd','what it does']],
    tasks:[
      {text:'Do the thing.', hint:'Exact command to try.',
       // ev = {raw (lowercased command), cmds (canonical names), output, ST}
       // Check state:   getNode(ev.ST.fs,['C:','Users','cadet','Desktop','x.txt'])
       // Check command: ev.cmds.includes('get-content')
       // Check output:  ev.output.includes(word)
       check:ev=>ev.output.includes(word)}
    ],
    done:'Completion message. Reveal the answer + the real-world lesson.'};
 }},
   ════════════════════════════════════════════════════════════════════ */
