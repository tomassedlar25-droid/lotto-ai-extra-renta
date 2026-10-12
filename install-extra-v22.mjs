/** EXTRA RENTA AI 2.2: test all available historical draws.
 * Safe, idempotent patch for existing EXTRA RENTA repo v2.1 only.
 * Does not read/write/delete browser localStorage or user tickets.
 */
import fs from 'node:fs';
const sourceFiles=['app.js','index.html','agent-core.mjs','agent-team.mjs','sw.js'];
for(const f of sourceFiles) if(!fs.existsSync(f))throw Error(`Chybí ${f}. Otevři Codespaces repozitáře lotto-ai-extra-renta.`);
const orig=Object.fromEntries(sourceFiles.map(f=>[f,fs.readFileSync(f,'utf8')]));
let {['app.js']:app,['index.html']:html,['agent-core.mjs']:core,['agent-team.mjs']:team,['sw.js']:sw}=orig;
if(html.includes('EXTRA RENTA AI 2.2')&&sw.includes('v2-2-full-history')&&team.includes('minTrain:el(\'agentTestN\').value===\'all\'?3:30')){
 console.log('EXTRA RENTA AI 2.2 už je nainstalovaná. Bez změn.');process.exit(0);
}
function change(text,before,after,file){
 if(!text.includes(before)) throw Error(`Neznámá verze souboru ${file}: nenalezen očekávaný fragment ${before.slice(0,90)}. Nic nezměněno.`);
 return text.replace(before,after);
}
if(!app.includes("K='lotto-ai-extra-renta-v1'")||!app.includes('initExtraRentaAgents({'))throw Error('Nevhodná verze app.js. Nic nezměněno.');
if(!html.includes('EXTRA RENTA AI 2.1')||!html.includes('id="agentTestN"'))throw Error('Nutná předchozí verze 2.1. Nic nezměněno.');
if(!sw.includes('lotto-extra-renta-v2-1-cachefix'))throw Error('Neznámá verze sw.js. Nic nezměněno.');

// UI offers all available historical draws, plus optional fixed lengths.
html=change(html,
 '<select id="agentTestN"><option>30</option><option selected>50</option><option>100</option><option>200</option></select>',
 '<select id="agentTestN"><option value="all" selected>Celá dostupná historie (od 4. tahu)</option><option>30</option><option>50</option><option>100</option><option>200</option><option>500</option><option>800</option><option>1000</option></select>',
 'index.html');
html=change(html,
 '<select id="btN"><option>20</option><option>50</option><option selected>100</option><option>250</option><option>500</option></select>',
 '<select id="btN"><option value="all" selected>Celá dostupná historie (od 4. tahu)</option><option>20</option><option>50</option><option>100</option><option>250</option><option>500</option><option>800</option><option>1000</option></select>',
 'index.html');
html=change(html,'EXTRA RENTA AI 2.1','EXTRA RENTA AI 2.2','index.html');
html=change(html,'src="app.js?v=21"','src="app.js?v=22"','index.html');
html=change(html,'agent-team.css?v=21','agent-team.css?v=22','index.html');
html=change(html,'<h2>Walk-forward backtest</h2>','<h2>Walk-forward backtest</h2><p class="muted tiny">Celá historie = každý testovatelný tah od čtvrtého; první tři tahy slouží jako vstupní trénovací historie. Skutečné výsledky se nikdy nevymýšlejí.</p>','index.html');
html=change(html,'<h2>6 analytických agentů</h2>','<h2>6 analytických agentů</h2><p class="muted tiny">Režim Celá dostupná historie automaticky otestuje každý tah počínaje čtvrtým. První tři slouží pouze pro inicializaci filtru CONTROL A. Výsledky modelů jsou historické simulace, ne předpověď.</p>','index.html');

// Dynamic backtest length; all mode runs from the earliest possible position
// after three historic draws. Fixed modes retain previous minTrain=30.
team=change(team,
 "testDraws:Number(el('agentTestN').value),minTrain:30",
 "testDraws:el('agentTestN').value==='all'?Math.max(0,getDraws().length-3):Number(el('agentTestN').value),minTrain:el('agentTestN').value==='all'?3:30",
 'agent-team.mjs');
team=change(team,"from './agent-core.mjs?v=21'","from './agent-core.mjs?v=22'",'agent-team.mjs');

// Old hard limit 500 prevents analysis of archives expanded in the future.
core=change(core,'count>500','count>10000','agent-core.mjs');

app=change(app,"from './agent-team.mjs?v=21'","from './agent-team.mjs?v=22'",'app.js');

// Legacy backtest UI was synchronous. Replace only its exact event handler line;
// yield every few draws so Android can repaint the progress indicator.
const btLine=app.split('\n').find(l=>l.startsWith("$('runBt').onclick="));
if(!btLine||!btLine.endsWith('};'))throw Error('Neočekávaná struktura historického backtestu v app.js. Nic nezměněno.');
const newBt=`$('runBt').onclick=async()=>{
 const btn=$('runBt');if(btn.disabled)return;
 btn.disabled=true;
 try{
  const choice=$('btN').value,all=choice==='all';
  const n=all?Math.max(0,state.draws.length-3):Number(choice),p=params(true);
  if(state.draws.length<8)throw Error('Backtest vyžaduje alespoň 8 historických losování. Importuj delší archiv CSV.');
  if(!Number.isInteger(n)||n<1||n>10000)throw Error('Neplatný počet testovaných tahů.');
  if(!all&&n>state.draws.length-3)throw Error('K dispozici je jen '+Math.max(0,state.draws.length-3)+' testovatelných tahů; zvol Celá dostupná historie.');
  const test=state.draws.slice(state.draws.length-n);
  let counts=Array(8).fill(0),wins=0,total=0,skipped=0,benchmark=0;
  $('btResult').textContent='Backtest: 0 / '+test.length+' tahů…';
  await new Promise(resolve=>setTimeout(resolve,0));
  for(const [i,draw] of test.entries()){
   const history=state.draws.slice(0,state.draws.length-n+i);
   if(history.length<3){skipped++;continue;}
   let ts,rand;
   try{ts=makeTickets(history,p);rand=makeTickets(history,{...p,method:'random'});}
   catch{skipped++;continue;}
   for(const t of ts){const m=match(t,draw);counts[m.n]++;total++;wins+=Number(!!m.prize);}
   benchmark+=rand.filter(t=>match(t,draw).prize).length;
   if(i%5===4||i===test.length-1){$('btResult').textContent='Backtest: '+(i+1)+' / '+test.length+' tahů…';await new Promise(resolve=>setTimeout(resolve,0));}
  }
  $('btResult').innerHTML='<div class="line"></div><h3>Výsledky backtestu</h3><div class="stats"><div class="stat"><strong>'+total+'</strong><small>sloupců</small></div><div class="stat"><strong>'+wins+'</strong><small>výherních</small></div><div class="stat"><strong>'+benchmark+'</strong><small>náhodný vzorek</small></div><div class="stat"><strong>'+skipped+'</strong><small>vynecháno</small></div></div><p class="muted">Testováno '+(test.length-skipped)+' z '+test.length+' tahů; první tři tahy jsou trénovací vstup. Zásahy hlavních čísel: '+counts.map((v,i)=>i+': '+v).join(' · ')+'</p><p class="muted tiny">Tento původní backtest používá náhodné generování, takže se při opakování může lišit. Reprodukovatelný backtest je v záložce 6 agentů. Historické výsledky nezaručují výhru.</p>';
 }catch(e){message(e.message);}
 finally{btn.disabled=false;}
};`;
app=change(app,btLine,newBt,'app.js');

// Bump service worker version: network-first keeps user browser state intact.
sw=change(sw,"lotto-extra-renta-v2-1-cachefix","lotto-extra-renta-v2-2-full-history",'sw.js');
sw=sw.replaceAll('?v=21','?v=22');

// Preflight all replacements then atomically overwrite code files only.
if(!html.includes('value="all" selected')||!team.includes('getDraws().length-3')||!core.includes('count>10000')||!app.includes('Backtest: 0 / ')||!sw.includes('full-history'))throw Error('Nepodařilo se dokončit ověření změn; nic nezměněno.');
for(const [name,content] of Object.entries({'app.js':app,'index.html':html,'agent-core.mjs':core,'agent-team.mjs':team,'sw.js':sw})){
 const tmp=name+'.extra22.tmp';fs.writeFileSync(tmp,content);fs.renameSync(tmp,name);
}
console.log('EXTRA RENTA AI 2.2: nabídka Celá dostupná historie nainstalována.');
console.log('Archiv / localStorage / uložené tikety nebyly změněny.');
console.log('Pokračuj: node test-extra-v22.mjs && node agent-tests.mjs && node --check app.js');
