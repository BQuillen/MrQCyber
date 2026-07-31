/* ════════════════════════════════════════════════════════════════════
   COMMAND DICTIONARY — rendered on the Command Dictionary page.
   ════════════════════════════════════════════════════════════════════ */
const DICT=[
{cat:'Getting Around',entries:[
 {n:'Get-Location',a:'pwd · gl',w:'Prints the folder you are currently standing in.',s:'Get-Location',ex:['pwd'],c:'Always know where you are before you run destructive commands.'},
 {n:'Set-Location',a:'cd · sl · chdir',w:'Moves you to a different folder. ".." goes up one level, "~" jumps home.',s:'Set-Location <path>',ex:['cd Documents','cd ..','cd C:\\Logs','cd ~'],c:'Attackers who land a shell do this first — so do defenders.'},
 {n:'Get-ChildItem',a:'ls · dir · gci',w:'Lists what a folder contains. The workhorse of the entire shell.',s:'Get-ChildItem [path] [-Recurse] [-Force] [-Filter <pattern>] [-Name]',ex:['ls','ls Documents -Recurse -Filter *.txt','ls Downloads -Force','ls -Recurse -Filter prank_* -Name'],c:'-Force reveals hidden files; malware hides from a plain ls on purpose.'},
 {n:'tree',a:'—',w:'Draws the whole folder structure below you as a tree diagram.',s:'tree [-Force]',ex:['tree'],c:'Fastest way to get the lay of the land on an unfamiliar machine.'}]},
{cat:'Reading & Searching',entries:[
 {n:'Get-Content',a:'cat · type · gc',w:'Prints the text inside a file.',s:'Get-Content <file>',ex:['cat welcome.txt','cat C:\\Logs\\auth.log'],c:'Config files, scripts, and logs are all just text — reading them is investigation.'},
 {n:'Select-String',a:'sls',w:'Searches text for a pattern — PowerShell\'s version of grep. Works on files directly or on piped input.',s:'Select-String [-Pattern] <text> [-Path <file(s)>]',ex:['Select-String "FAILED" auth.log','Select-String "Qty" C:\\Receipts\\*','cat log.txt | Select-String "203.0.113.7"'],c:'The core SOC skill: a 10,000-line log becomes 12 relevant lines in one command.'}]},
{cat:'Making & Changing',entries:[
 {n:'New-Item',a:'ni',w:'Creates a new file or folder.',s:'New-Item -ItemType Directory|File -Path <path>',ex:['New-Item -ItemType Directory -Path C:\\Quarantine','New-Item -ItemType File -Path notes.txt'],c:'Responders build quarantine and evidence folders before touching anything.'},
 {n:'Copy-Item',a:'cp · copy',w:'Duplicates a file. The original stays where it was.',s:'Copy-Item <source> <destination>',ex:['Copy-Item recipe.txt C:\\Backup'],c:'Forensics copies evidence and works on the copy — never the original.'},
 {n:'Move-Item',a:'mv · move',w:'Relocates a file. It disappears from the source.',s:'Move-Item <source> <destination>',ex:['Move-Item report.txt Documents\\Reports','Move-Item bad.exe C:\\Quarantine'],c:'Quarantining = moving, not deleting. Evidence must survive.'},
 {n:'Rename-Item',a:'ren · rni',w:'Changes an item\'s name in place.',s:'Rename-Item <path> <newName>',ex:['Rename-Item draft.txt final.txt'],c:'Malware renames itself to look legitimate; know how names change.'},
 {n:'Remove-Item',a:'rm · del · erase',w:'Deletes files or folders. There is no recycle bin at the command line.',s:'Remove-Item <path> [-Recurse] [-Force]',ex:['Remove-Item junk.txt','Remove-Item prank_*','Remove-Item C:\\Haunt -Recurse'],c:'-Recurse for folders with contents; -Force for hidden items. Aim carefully.'},
 {n:'Set-Content',a:'sc',w:'Writes text into a file, creating it if needed (replaces what was there).',s:'Set-Content -Path <file> -Value "<text>"',ex:['Set-Content -Path incident.txt -Value "compromised: quinn"'],c:'Documenting findings in writing is half of incident response.'},
 {n:'Add-Content',a:'ac',w:'Appends text to the end of a file instead of replacing it.',s:'Add-Content -Path <file> -Value "<text>"',ex:['Add-Content -Path log.txt -Value "step 2 done"'],c:'Running notes during an investigation — append, don\'t overwrite.'}]},
{cat:'Pipelines & Counting',entries:[
 {n:'| (the pipe)',a:'—',w:'Sends one command\'s output into the next command as input. Chains simple tools into powerful ones.',s:'<command> | <command> | <command>',ex:['cat auth.log | Select-String "FAILED" | Measure-Object'],c:'The pipeline mindset — filter, then filter again, then count — IS log analysis.'},
 {n:'Measure-Object',a:'measure',w:'Counts whatever is piped into it.',s:'... | Measure-Object',ex:['ls -Recurse -Filter *.log -Name | Measure-Object'],c:'"How many failed logins?" is a number your report needs, not a guess.'},
 {n:'Sort-Object',a:'sort',w:'Sorts piped lines alphabetically.',s:'... | Sort-Object [-Descending] [-Unique]',ex:['cat names.txt | Sort-Object -Unique'],c:'-Unique deduplicates — handy for "which IPs appear in this log?"'},
 {n:'Select-Object',a:'select',w:'Takes just the first or last N piped lines.',s:'... | Select-Object -First <n> | -Last <n>',ex:['cat big.log | Select-Object -First 10'],c:'Preview a huge file safely before committing to reading it all.'},
 {n:'Write-Output',a:'echo · write',w:'Prints text to the console.',s:'Write-Output "<text>"',ex:['echo hello'],c:'Useful for testing what a pipeline receives.'}]},
{cat:'Processes & Scheduled Tasks',entries:[
 {n:'Get-Process',a:'ps · gps',w:'Lists every program currently running, with its Id and CPU usage.',s:'Get-Process [-Name <pattern>]',ex:['Get-Process','Get-Process -Name sv*'],c:'Malware has to RUN to do harm — spotting the odd process is threat hunting.'},
 {n:'Stop-Process',a:'kill · spps',w:'Ends a running process by name or Id.',s:'Stop-Process -Name <name> | -Id <id>',ex:['Stop-Process -Name badproc','Stop-Process -Id 4021'],c:'Kill the process BEFORE deleting its files, or it may rewrite them.'},
 {n:'Get-ScheduledTask',a:'—',w:'Lists jobs Windows runs automatically on a timer — with -TaskName, shows exactly what a task executes.',s:'Get-ScheduledTask [-TaskName <name>]',ex:['Get-ScheduledTask','Get-ScheduledTask -TaskName MidnightWhisper'],c:'Scheduled tasks are a top persistence trick (ATT&CK T1053). "Haunted" computers are usually this.'},
 {n:'Disable-ScheduledTask',a:'—',w:'Turns a scheduled task off so it stops firing.',s:'Disable-ScheduledTask -TaskName <name>',ex:['Disable-ScheduledTask -TaskName PhantomScribe'],c:'Disable first, investigate, THEN delete — order of operations matters.'},
 {n:'Enable-ScheduledTask',a:'—',w:'Turns a disabled scheduled task back on.',s:'Enable-ScheduledTask -TaskName <name>',ex:['Enable-ScheduledTask -TaskName "Defender Scheduled Scan"'],c:'If you disabled a legitimate task by mistake, this is the undo.'}]},
{cat:'Investigation & Help',entries:[
 {n:'Get-FileHash',a:'—',w:'Computes a file\'s SHA256 fingerprint. Identical content ⇒ identical hash, always.',s:'Get-FileHash <file>',ex:['Get-FileHash C:\\Downloads\\setup.exe'],c:'Filenames lie; hashes don\'t. Comparing hashes against threat intel confirms malware.'},
 {n:'Get-Help',a:'help · man',w:'The built-in manual. Alone it lists every command; with a name it explains one.',s:'Get-Help [<command>]',ex:['Get-Help','Get-Help Select-String'],c:'Professionals read the manual constantly. It\'s a skill, not a weakness.'},
 {n:'Get-Alias',a:'—',w:'Shows the shortcut names (ls → Get-ChildItem, etc.).',s:'Get-Alias',ex:['Get-Alias'],c:'Reading someone else\'s script means recognizing aliases on sight.'},
 {n:'Clear-Host',a:'cls · clear',w:'Wipes the screen (your files and history are untouched).',s:'Clear-Host',ex:['cls'],c:'A clean screen before a screenshot keeps reports readable.'}]}
];
