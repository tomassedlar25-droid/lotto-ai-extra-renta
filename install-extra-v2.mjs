/* Patch *existing* Extra Renta repo. Idempotent, fail-safe, preserves storage and icons. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
let app=read('app.js'),html=read('index.html'),sw=read('sw.js');
const ensure=(cond,message)=>{if(!cond)throw Error('Instalace zastavena: '+message+' (původní soubory nebyly změněny)');};
for(const name of ['agent-core.mjs','agent-team.mjs','agent-team.css','data/extra-renta-history.csv'])ensure(fs.existsSync(path.join(root,name)),'chybí '+name);
const installed=app.includes("import {initExtraRentaAgents} from './agent-team.mjs';");
if(installed){ensure(html.includes('id="agents"')&&sw.includes('agent-team.mjs'),'některé změny byly provedeny jen částečně');console.log('EXTRA RENTA AI 2.0 již nainstalováno. Bez dalších změn.');process.exit(0);}
ensure(app.includes("const $=id=>document.getElementById(id)"),'neznámá verze app.js');
ensure(app.includes('function scored(history,method){'),'neznámá funkce scored');
ensure(app.includes("function makeTickets(history,{method='control',columns=12,candidates=20,maxOverlap=4,filtered=true,extra=[]}){"),'neznámá funkce makeTickets');
ensure(app.includes("let pool=scored(history,method).filter"),'nenalezeno skórování');
ensure(app.includes('k:Math.random()**'),'nenalezen výběr portfolia');
ensure(app.includes("if('serviceWorker'in navigator)"),'nenalezeno spuštění aplikace');
ensure(html.includes('data-tab="forward"')&&html.includes('<section class="panel screen hidden" id="forward">')&&!html.includes('id="agents"'),'neznámá struktura záložek');
ensure(html.includes('</head>'),'chybí uzavření head');
ensure(/const CACHE='[^']+';const ASSETS=\[[^\]]+\];/.test(sw),'neznámý service worker');
// Preserve default random behavior of the existing generator, inject RNG only for reproducible audits.
app="import {initExtraRentaAgents} from './agent-team.mjs';\n"+app;
app=app.replace('function scored(history,method){','function scored(history,method,rng=Math.random){');
const start=app.indexOf('function scored(history,method,rng=Math.random){'),end=app.indexOf('function makeTickets(',start);
ensure(start>=0&&end>start,'nenalezeno rozdělení skórování/generování');
app=app.slice(0,start)+app.slice(start,end).replaceAll('Math.random()','rng()')+app.slice(end);
app=app.replace("function makeTickets(history,{method='control',columns=12,candidates=20,maxOverlap=4,filtered=true,extra=[]}){", "function makeTickets(history,{method='control',columns=12,candidates=20,maxOverlap=4,filtered=true,extra=[],rng=Math.random}){");
app=app.replace('let pool=scored(history,method).filter','let pool=scored(history,method,rng).filter');
app=app.replace('k:Math.random()**','k:rng()**');
const bootstrap=`\n// Six rule-based agents: use the existing app state and forward-test storage unchanged.\ninitExtraRentaAgents({\n getDraws:()=>state.draws,generate:makeTickets,importArchive:importCsv,\n saveAgentSet:entry=>{\n  const same=state.sets.some(s=>s.asOf===entry.asOf&&s.label===entry.label&&JSON.stringify(s.tickets)===JSON.stringify(entry.tickets));\n  if(same)return false;\n  const record={...entry,id:String(Date.now())+'-'+Math.random().toString(36).slice(2),created:new Date().toISOString()};\n  state.sets.push(record);try{save();}catch(e){state.sets.pop();throw e;}render();return true;\n }\n});\n`;
app=app.replace("if('serviceWorker'in navigator)",bootstrap+"if('serviceWorker'in navigator)");
const ui=`\n<section class="panel screen hidden" id="agents"><div class="eyebrow">EXTRA RENTA AI 2.0</div><h2>6 analytických agentů</h2><p class="muted">Researcher → Data Analyst → Strategist → Coder → Risk Manager → Boss. Jde o místní výpočetní moduly, nikoli vzdálené jazykové AI modely. Výsledkem je výhradně simulovaný tiket.</p><div class="alert" id="agentArchiveStatus">Načítám stav archivu…</div><div class="agent-actions"><button class="secondary" id="agentLoadArchive" type="button">Načíst přiložený archiv 2021–2026</button><button class="secondary" id="agentForward" type="button">Otevřít Forward test</button></div><p class="agent-explainer">Import doplňuje historii do tohoto zařízení, nevymaže uložené sestavy. Archiv z balíčku může být starší než současný výsledek; před potvrzením jej zkontroluj.</p><div class="grid"><div class="field"><label for="agentMethod">Strategie</label><select id="agentMethod"><option value="control">CONTROL A</option><option value="hybrid">HYBRID X</option><option value="ensemble">Ensemble AI</option><option value="frequency">Četnost</option><option value="trend">Trend 5/75</option><option value="anti">Antitrend</option><option value="random">Náhoda</option></select></div><div class="field"><label for="agentColumns">Počet sloupců</label><select id="agentColumns"><option>4</option><option>6</option><option>8</option><option selected>12</option></select></div><div class="field"><label for="agentCandidates">Hlavní kandidáti</label><select id="agentCandidates"><option>12</option><option>16</option><option selected>20</option><option>24</option><option>33</option></select></div><div class="field"><label for="agentOverlap">Max. překryv</label><select id="agentOverlap"><option>3</option><option selected>4</option><option>5</option><option>6</option></select></div><div class="field"><label for="agentTestN">Backtest</label><select id="agentTestN"><option>30</option><option selected>50</option><option>100</option><option>200</option></select></div></div><label class="checkbox"><input id="agentControl" type="checkbox" checked> Použít CONTROL A (vyřadit posledních 7 čísel a pozice 4, 5, 6 ze dvou předchozích tahů)</label><div class="field"><label for="agentExclude">Další vyloučená čísla (nepovinné)</label><input id="agentExclude" placeholder="např. 6 14 25" inputmode="text"></div><label class="checkbox"><input id="agentConfirmed" type="checkbox"> Potvrzuji, že jsem historii porovnal s oficiálními výsledky</label><p class="agent-explainer">Toto potvrzení provádí uživatel. Aplikace pravost archivu sama neověřuje. Bonus se při tvorbě CONTROL A ignoruje a pro starší losování může chybět.</p><div class="agent-actions"><button class="primary" type="button" id="runAgents">Spustit 6 agentů</button><button class="secondary" type="button" id="agentExport" disabled>Export protokolu</button><button class="secondary" type="button" id="agentSave" disabled>Uložit do čekajících tiketů</button></div><div class="agent-status" id="agentStatus" role="status" aria-live="polite">Připraveno k analýze.</div><div id="agentResults"></div></section>\n`;
html=html.replace('data-tab="forward">', 'data-tab="agents">6 agentů</button><button class="tab" data-tab="forward">');
html=html.replace('<section class="panel screen hidden" id="forward">',ui+'<section class="panel screen hidden" id="forward">');
html=html.replace('</head>','<link rel="stylesheet" href="agent-team.css?v=20"></head>');
const shell="const CACHE='lotto-extra-renta-v2-0-six-agents';const ASSETS=['./','./index.html','./app.js','./agent-core.mjs','./agent-team.mjs','./agent-team.css?v=20','./data/extra-renta-history.csv','./manifest.webmanifest','./icon-192.png','./icon-512.png'];";
sw=sw.replace(/const CACHE='[^']+';const ASSETS=\[[^\]]+\];/,shell);
// Preflight generated result before mutating files.
ensure(html.includes('id="agents"')&&html.includes('id="agentSave"')&&app.includes('initExtraRentaAgents({')&&sw.includes('agent-team.mjs'),'sestavení změn selhalo');
fs.writeFileSync(path.join(root,'app.js'),app);fs.writeFileSync(path.join(root,'index.html'),html);fs.writeFileSync(path.join(root,'sw.js'),sw);
console.log('EXTRA RENTA AI 2.0: nová záložka 6 agentů přidána. Původní stav localStorage a strategie zachovány.');
console.log('Spusť node agent-tests.mjs a zkontroluj git status --short.');
