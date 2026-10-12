/* EXTRA RENTA AI 2.0 — interactive six-agent lab, local and simulation-only. */
import {auditArchive,controlABlacklist,seededRng,auditPortfolio,runWalkForward,compileReport,handoffText} from './agent-core.mjs';
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={control:'CONTROL A',hybrid:'HYBRID X',ensemble:'Ensemble AI',frequency:'Četnost',trend:'Trend 5/75',anti:'Antitrend 20/100',random:'Náhodný'};
const getNumbers=s=>String(s).match(/\d+/g)?.map(Number)||[];
function download(name,content){const blob=new Blob([content],{type:'text/plain;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function fingerprint(draws){let h=2166136261>>>0;for(const d of draws){for(const ch of `${d.date}:${d.main.join(',')}:${d.bonus??''};`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}}return h.toString(16)+':'+draws.length;}
const printableTicket=t=>[...t].sort((a,b)=>a-b).map(n=>`<span class="er-agent-ball">${n}</span>`).join('');
export function initExtraRentaAgents({getDraws,generate,saveAgentSet,importArchive}){
 const region=el('agentResults'),status=el('agentStatus'),run=el('runAgents'),save=el('agentSave'),exportBtn=el('agentExport');
 if(!region||!run||!save||!status)return;
 let latest=null;
 const renderArchive=()=>{const a=auditArchive(getDraws());el('agentArchiveStatus').textContent=`V zařízení: ${a.count} losování · ${a.first||'—'} – ${a.last||'—'} · bez bonusu ${a.missingBonus} · ${a.ok?'struktura OK':'kontrola nutná'}`;};
 renderArchive();
 const readOptions=()=>{
  const cfg={method:el('agentMethod').value,columns:Number(el('agentColumns').value),candidates:Number(el('agentCandidates').value),maxOverlap:Number(el('agentOverlap').value),filtered:el('agentControl').checked,extra:getNumbers(el('agentExclude').value),testDraws:Number(el('agentTestN').value),minTrain:30};
  if(cfg.extra.some(n=>n<1||n>33)||new Set(cfg.extra).size!==cfg.extra.length)throw Error('Dodatečné výluky musí obsahovat různá čísla 1–33.');
  return cfg;
 };
 const btnImport=el('agentLoadArchive');
 btnImport?.addEventListener('click',async()=>{
  if(!confirm('Doplnit historický archiv Extra Renty 2021–2026 do existující historie? Už uložené sestavy se nesmažou. Import může opravit výsledky pro stejná data.'))return;
  btnImport.disabled=true;
  try{const res=await fetch('./data/extra-renta-history.csv',{cache:'no-cache'});if(!res.ok)throw Error('Přibalený soubor historie nelze načíst.');const csv=await res.text();const result=importArchive(csv);el('agentConfirmed').checked=false;latest=null;save.disabled=true;exportBtn.disabled=true;region.innerHTML='';renderArchive();status.textContent=`Archiv importován (${result.added} přidaných nebo aktualizovaných řádků, ${result.bad} odmítnutých). Zdroj musíš ověřit. Proveď nový test.`;}
  catch(e){status.textContent='Chyba importu: '+e.message;}finally{btnImport.disabled=false;}
 });
 run.addEventListener('click',async()=>{
  if(run.disabled)return;
  run.disabled=true;save.disabled=true;exportBtn.disabled=true;latest=null;region.replaceChildren();
  try{
   const draws=getDraws().slice().sort((a,b)=>a.date.localeCompare(b.date)),config=readOptions(),archive=auditArchive(draws);
   status.textContent='1/6 Researcher – kontrola historie…';if(!archive.ok)throw Error(archive.issues.join('; '));
   if(draws.length<config.testDraws+config.minTrain)throw Error('MISSING: málo historických tahů. Importuj nebo doplň archiv.');
   status.textContent='2/6 Data Analyst – blacklist CONTROL A…';
   const excluded=config.filtered?controlABlacklist(draws,config.extra):config.extra;
   status.textContent='3/6 Strategist – generuji sestavu…';
   const rng=seededRng(`extra-renta-final:${fingerprint(draws)}:${JSON.stringify(config)}`);
   const tickets=generate(draws,{...config,rng});
   const checked=auditPortfolio(tickets,config,excluded);
   if(!checked.ok)throw Error('Generované sloupce neprošly kontrolou: '+checked.issues.join('; '));
   status.textContent='4/6 Coder – walk-forward 0 %…';
   const test=await runWalkForward(draws,config,generate,x=>{status.textContent=`4/6 Coder – walk-forward ${Math.round(x*100)} %…`;});
   status.textContent='5/6 Risk Manager – kontroluji podmínky…';
   const report=compileReport({draws,config,tickets,test,sourceConfirmed:el('agentConfirmed').checked});
   status.textContent='6/6 Boss – vytvářím závěrečný protokol…';
   const approved=report.status==='APPROVE FOR GENERATION ONLY';
   const resultStatus=approved?'SCHVÁLENO KE GENEROVÁNÍ':report.status==='INCOMPLETE'?'NEÚPLNÉ – DOPLNIT':'ZAMÍTNUTO';
   region.innerHTML=`<section class="agent-panel"><div class="agent-eyebrow">BOSS · ZÁVĚREČNÁ KONTROLA</div><h3>${esc(resultStatus)}</h3><p class="muted tiny">${report.completeness}/100 znamená úplnost kontrol, ne šanci na výhru.</p><div class="agent-grid"><div><strong>${report.archive.count}</strong><small>losování</small></div><div><strong>${test.tested}/${test.requested}</strong><small>otestováno</small></div><div><strong>${test.model.threePlus}</strong><small>model 3+ hlavní</small></div><div><strong>${test.baseline.threePlus}</strong><small>náhoda 3+ hlavní</small></div></div><p class="muted tiny">Testované období ${esc(test.first)} až ${esc(test.last)}. Přeskočených tahů ${test.skipped}. Historický rozdíl nedokazuje prediktivní výhodu.</p>${report.issues.length?`<p class="agent-warning">${esc(report.issues.join(' · '))}</p>`:''}${report.missing.length?`<p class="agent-warning">${esc(report.missing.join(' · '))}</p>`:''}</section><section class="agent-panel"><h3>Protokol šesti agentů</h3>${report.steps.map((h,i)=>`<details class="agent-detail"><summary>${i+1}. ${esc(h.AGENT)}</summary><pre>${esc(handoffText(h))}</pre></details>`).join('')}</section>${approved?`<section class="agent-panel"><div class="agent-eyebrow">POUZE K RUČNÍ KONTROLE</div><h3>Finální portfolio · ${tickets.length} sloupců</h3>${tickets.map((t,i)=>`<div class="agent-ticket"><strong>${String(i+1).padStart(2,'0')}</strong><div class="agent-ticket-balls">${printableTicket(t)}</div></div>`).join('')}<p class="muted tiny">Nejsou podány žádné sázky. Po uložení je najdeš ve Forward testu.</p></section>`:'<section class="agent-panel"><p class="muted">Neúplné nebo zamítnuté výsledky nelze tímto postupem uložit mezi čekající tikety.</p></section>'}`;
   const exported=[`EXTRA RENTA AI 2.0 – SIX AGENTS`, `Stav: ${report.status}`,`Historie: ${report.archive.count} losování, ${report.archive.first} – ${report.archive.last}`,`Parametry: ${JSON.stringify(config)}`,`Kontrola zdroje potvrzena uživatelem: ${el('agentConfirmed').checked?'ANO':'NE'}`,`Blacklist: ${report.blacklist.join(' ')}`,report.summary,...report.steps.map(h=>handoffText(h)),`TIKETY:`,...tickets.map((t,i)=>`${i+1}. ${t.join(' ')}`)].join('\n\n');
   latest={drawsFingerprint:fingerprint(draws),asOf:draws.at(-1).date,config,tickets,report,exported};
   save.disabled=!approved;exportBtn.disabled=false;
   status.textContent=approved?'Hotovo. Sestava připravena k ručnímu uložení.':'Hotovo. Protokol vyžaduje doplnění.';
  }catch(e){status.textContent='Chyba: '+e.message;region.innerHTML=`<div class="agent-panel agent-warning">${esc(e.message)}</div>`;}
  finally{run.disabled=false;renderArchive();}
 });
 exportBtn.addEventListener('click',()=>{if(latest)download('extra-renta-6-agentu-protokol.txt',latest.exported);});
 save.addEventListener('click',()=>{
  if(!latest||latest.report.status!=='APPROVE FOR GENERATION ONLY')return;
  if(fingerprint(getDraws())!==latest.drawsFingerprint){status.textContent='Archiv se změnil. Zopakuj analýzu před uložením.';save.disabled=true;return;}
  if(!confirm(`Uložit ${latest.tickets.length} simulovaných sloupců ${labels[latest.config.method]||latest.config.method} do čekajících sestav? Žádná sázka nebude podána.`))return;
  try{
   const wasSaved=saveAgentSet({asOf:latest.asOf,label:`6 agentů · ${labels[latest.config.method]||latest.config.method}`,settings:{...latest.config},tickets:latest.tickets.map(t=>[...t])});
   if(wasSaved===false){status.textContent='Stejná sestava pro toto losování je už uložena.';save.disabled=true;return;}
   status.textContent='Sestava uložena do Forward testu. Vyhodnotí se po přidání následujícího známého losování.';save.disabled=true;
  }catch(e){status.textContent='Sestavu nelze uložit: '+e.message;}
 });
 el('agentForward')?.addEventListener('click',()=>document.querySelector('[data-tab="forward"]')?.click());
}
