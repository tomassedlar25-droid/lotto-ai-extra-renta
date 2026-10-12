import {initExtraRentaAgents} from './agent-team.mjs';
const $=id=>document.getElementById(id), K='lotto-ai-extra-renta-v1';
let state;try{state=JSON.parse(localStorage.getItem(K))||{draws:[],sets:[]}}catch{state={draws:[],sets:[]}};
if(!Array.isArray(state.draws))state.draws=[];if(!Array.isArray(state.sets))state.sets=[];
let pendingTickets=null;
const save=()=>localStorage.setItem(K,JSON.stringify(state));
const asc=xs=>[...xs].sort((a,b)=>a-b),fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('cs-CZ'):'—';
const nums=s=>String(s).match(/\d+/g)?.map(Number)||[];
const valid=(ns,bonus)=>ns.length===7&&new Set(ns).size===7&&ns.every(x=>Number.isInteger(x)&&x>=1&&x<=33)&&Number.isInteger(bonus)&&bonus>=1&&bonus<=33&&!ns.includes(bonus);
function normalizeDraw(d){return {date:d.date,main:asc(d.main),bonus:d.bonus}}
function addDraw(d){if(!/^\d{4}-\d\d-\d\d$/.test(d.date)||!valid(d.main,d.bonus))throw Error('Zkontroluj datum, 7 různých hlavních čísel (1–33) a odlišné dodatkové číslo.');const item=normalizeDraw(d);state.draws=state.draws.filter(x=>x.date!==d.date);state.draws.push(item);state.draws.sort((a,b)=>a.date.localeCompare(b.date));save();render()}
const ball=(v,bonus=false,hit=false)=>`<span class="ball ${bonus?'bonus':''} ${hit?'hit':''}">${v}</span>`;
const balls=(main,bonus=null,truth=null)=>`<div class="balls">${main.map(n=>ball(n,false,truth?.main.includes(n))).join('')}${bonus!==null?' <span style="color:#899cb6">+</span> '+ball(bonus,true,truth?.bonus===bonus):''}</div>`;
function exclusions(history,extra=[]){const ex=new Set(extra);const newest=[...history].sort((a,b)=>b.date.localeCompare(a.date));if(newest[0])newest[0].main.forEach(n=>ex.add(n));for(const d of newest.slice(1,3))d.main.slice(3,6).forEach(n=>ex.add(n));return ex}
function scored(history,method,rng=Math.random){let values=Array.from({length:33},(_,i)=>i+1), t=history.length;let all=values.map(n=>{let hits=history.reduce((a,d)=>a+(d.main.includes(n)?1:0),0);let recent=history.slice(-20).reduce((a,d)=>a+(d.main.includes(n)?1:0),0);let long=history.slice(-100).reduce((a,d)=>a+(d.main.includes(n)?1:0),0);let short=history.slice(-5).reduce((a,d)=>a+(d.main.includes(n)?1:0),0);let gap=history.slice().reverse().findIndex(d=>d.main.includes(n));if(gap<0)gap=t;let decay=history.reduce((a,d,i)=>a+(d.main.includes(n)?Math.exp(-(t-1-i)/22):0),0);let bayes=(hits+1.4)/(t+6.6);let score;
switch(method){case 'frequency':score=hits/(t||1);break;case 'trend':score=(short/5)-(long/100);break;case 'anti':score=(long/100)-(recent/20);break;case 'ensemble':score=.38*bayes+.4*(decay/24)+.22*(recent/20);break;case 'hybrid':score=.25*bayes+.24*(decay/24)+.22*(recent/20)+.18*((short/5)-(long/100)+.3)+.11*(Math.min(gap,50)/50);break;case 'random':score=rng();break;default:score=.35*(recent/20)+.25*bayes+.2*(decay/24)+.2*(Math.min(gap,40)/40)}return {n,score:score+rng()*0.000001}});return all.sort((a,b)=>b.score-a.score)}
function makeTickets(history,{method='control',columns=12,candidates=20,maxOverlap=4,filtered=true,extra=[],rng=Math.random}){let ex=filtered?exclusions(history,extra):new Set(extra);let pool=scored(history,method,rng).filter(x=>!ex.has(x.n)).slice(0,Math.max(7,candidates));if(pool.length<7)throw Error(`Po filtrech zůstává jen ${pool.length} kandidátů. Uvolni omezení.`);let tickets=[];let tries=0;while(tickets.length<columns&&tries++<35000){let candidatesPool=pool.map(x=>({...x,k:rng()**(1/(Math.max(.001,1+(x.score-pool[pool.length-1].score))*2))})).sort((a,b)=>b.k-a.k);let choice=asc(candidatesPool.slice(0,7).map(x=>x.n));if(tickets.some(t=>t.every((x,i)=>x===choice[i])))continue;if(tickets.some(t=>t.filter(n=>choice.includes(n)).length>maxOverlap))continue;tickets.push(choice)}if(tickets.length<columns)throw Error(`Podařilo se vytvořit ${tickets.length}/${columns} sloupců. Zvyš max. překryv nebo počet kandidátů.`);return tickets}
function match(ticket,draw){const n=ticket.filter(x=>draw.main.includes(x)).length;const bonus=ticket.includes(draw.bonus);const prize=n===7?'1. pořadí':n===6&&bonus?'2. pořadí':n===6?'3. pořadí':n===5?'4. pořadí':n===4?'5. pořadí':n===3?'6. pořadí':null;return {n,bonus,prize}}
function nextDraw(set){return state.draws.find(d=>d.date>set.asOf)||null}
function ticketHTML(ticket,i,draw){const m=draw?match(ticket,draw):null;return `<article class="ticket"><div class="ticket-head"><strong>Sloupec ${i+1}</strong><span class="caption">${m?`${m.n}${m.bonus?'+bonus':''} · ${m.prize||'bez výhry'}`:'Čeká na losování'}</span></div>${balls(ticket,null,draw)}${m?`<div class="caption" style="margin-top:12px">Trefená hlavní: ${ticket.filter(n=>draw.main.includes(n)).join(', ')||'žádná'} · bonus ${m.bonus?'ano':'ne'}</div>`:''}</article>`}
function render(){const latest=state.draws.at(-1);$('count').textContent=state.draws.length;$('last').textContent=latest?fmt(latest.date):'—';$('savedCount').textContent=state.sets.length;$('pending').textContent=state.sets.filter(s=>!nextDraw(s)).length;$('dataNotice').className='alert'+(state.draws.length>=3?' good':'');$('dataNotice').textContent=state.draws.length<3?'Pro CONTROL A nahraj alespoň 3 předchozí losování.':'Historie připravena: poslední losování '+fmt(latest.date)+'.';$('draws').innerHTML=state.draws.slice().reverse().slice(0,35).map(d=>`<div class="rowitem"><div><strong>${fmt(d.date)}</strong><div style="margin-top:7px">${d.main.join(' · ')} + ${d.bonus}</div></div><button class="danger tiny" data-remove="${d.date}">Smazat</button></div>`).join('')||'<p class="muted">Zatím žádná losování.</p>';
const evaluated=state.sets.filter(s=>nextDraw(s));const winners=evaluated.reduce((a,s)=>a+s.tickets.filter(t=>match(t,nextDraw(s)).prize).length,0);$('forwardSummary').innerHTML=`<div class="stat"><strong>${evaluated.length}</strong><small>vyhodnocených</small></div><div class="stat"><strong>${state.sets.length-evaluated.length}</strong><small>čekajících</small></div><div class="stat"><strong>${winners}</strong><small>výherních sloupců</small></div><div class="stat"><strong>${state.sets.reduce((a,s)=>a+s.tickets.length,0)}</strong><small>uložených sloupců</small></div>`;
$('sets').innerHTML=state.sets.slice().reverse().map(s=>{const d=nextDraw(s);const wins=d?s.tickets.filter(t=>match(t,d).prize).length:0;return `<details class="ticket"><summary style="cursor:pointer"><strong>${s.label}</strong><div class="caption" style="margin-top:6px">${s.tickets.length} sloupců · z dat do ${fmt(s.asOf)}</div><div class="teal" style="margin-top:8px">${d?`${fmt(d.date)} · ${wins} výherních sloupců`:'Čeká na první další losování'}</div></summary><div class="line"></div>${d?`<p>Losování ${fmt(d.date)}</p>${balls(d.main,d.bonus)}`:''}${s.tickets.map((t,i)=>ticketHTML(t,i,d)).join('')}<button class="danger" data-delset="${s.id}">Smazat tuto sestavu</button></details>`}).join('')||'<p class="muted">Zatím žádné uložené sestavy.</p>'}
function csvSave(filename,s){const blob=new Blob([s],{type:'text/csv;charset=utf-8'});download(filename,blob)}
function download(name,blob){let a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function parseDate(s){s=s.trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;let m=s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
function importCsv(src){
 const rows=src.replace(/^\ufeff/,'').trim().split(/\r?\n/);
 let added=0,bad=0;
 for(const line of rows){
  const sep=line.includes(';')?';':',';
  const parts=line.split(sep).map(v=>v.trim().replace(/^"|"$/g,''));
  const date=parseDate(parts[0]);
  if(!date)continue;
  const main=parts.slice(1,8).map(Number);
  const bonusText=(parts[8]??'').trim();
  const bonus=bonusText===''?null:Number(bonusText);
  const validMain=main.length===7&&new Set(main).size===7&&main.every(n=>Number.isInteger(n)&&n>=1&&n<=33);
  const validBonus=bonus===null||(Number.isInteger(bonus)&&bonus>=1&&bonus<=33&&!main.includes(bonus));
  if(!validMain||!validBonus){bad++;continue;}
  state.draws=state.draws.filter(d=>d.date!==date);
  state.draws.push(normalizeDraw({date,main,bonus}));added++;
 }
 state.draws.sort((a,b)=>a.date.localeCompare(b.date));save();render();return {added,bad};
}

function params(bt=false){return {method:$(bt?'btStrategy':'strategy').value,columns:bt?12:Number($('columns').value),candidates:bt?20:Number($('candidates').value),maxOverlap:bt?4:Number($('overlap').value),filtered:bt?$('btControl').checked:$('applyControl').checked,extra:bt?[]:nums($('excluded').value).filter(n=>n>=1&&n<=33)}}
function message(msg){alert(msg)}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('hidden',x.id!==b.dataset.tab));render()});
$('strategy').onchange=()=>{$('filterDescription').textContent=$('strategy').value==='control'?'CONTROL A: všech 7 čísel z posledního losování a pozice 4.–6. ze druhého a třetího posledního tahu se vyřadí.':'Model vybírá podle historických skóre. Filtr CONTROL A lze nezávisle zapnout nebo vypnout.'};
$('generate').onclick=()=>{try{if(state.draws.length<3)throw Error('Nejprve vlož alespoň 3 losování.');let p=params();let tickets=makeTickets(state.draws,p);pendingTickets={tickets,asOf:state.draws.at(-1).date,label:$('strategy').selectedOptions[0].textContent,settings:p};$('generated').innerHTML=`<div class="line"></div><h3>Vygenerováno ${tickets.length} sloupců</h3>${tickets.map((t,i)=>ticketHTML(t,i,null)).join('')}`;$('save').disabled=$('export').disabled=false}catch(e){message(e.message)}};
$('save').onclick=()=>{if(!pendingTickets)return;state.sets.push({...pendingTickets,id:Date.now()+'-'+Math.random().toString(36).slice(2),created:new Date().toISOString()});pendingTickets=null;save();render();$('save').disabled=true;message('Sestava uložena pro budoucí losování.');};
$('export').onclick=()=>{if(pendingTickets)csvSave('extra-renta-sloupce.csv','sloupec;c1;c2;c3;c4;c5;c6;c7\n'+pendingTickets.tickets.map((t,i)=>[i+1,...t].join(';')).join('\n'))};
$('addDraw').onclick=()=>{try{addDraw({date:$('date').value,main:nums($('numbers').value),bonus:Number($('bonus').value)});$('numbers').value='';$('bonus').value='';message('Výsledek byl uložen a tikety přepočítány.')}catch(e){message(e.message)}};
$('draws').onclick=e=>{let b=e.target.closest('[data-remove]');if(b&&confirm('Opravdu smazat toto losování?')){state.draws=state.draws.filter(d=>d.date!==b.dataset.remove);save();render()}};
$('sets').onclick=e=>{let b=e.target.closest('[data-delset]');if(b&&confirm('Smazat uloženou sestavu?')){state.sets=state.sets.filter(s=>s.id!==b.dataset.delset);save();render()}};
$('import').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let r=importCsv(await f.text());message(`Import hotov: ${r.added} přidaných/aktualizovaných, ${r.bad} odmítnutých řádků.`)}catch(x){message(x.message)}e.target.value=''};
$('exportHistory').onclick=()=>csvSave('extra-renta-historie.csv','datum;c1;c2;c3;c4;c5;c6;c7;bonus\n'+state.draws.map(d=>[d.date,...d.main,d.bonus].join(';')).join('\n'));
$('seed').onclick=()=>{if(!confirm('Vložit 5 historických výsledků (nepřepíše jiné datum)?'))return;const demo=[['2026-09-21',[3,5,21,22,24,28,30],18],['2026-09-24',[12,19,20,23,29,31,32],17],['2026-09-28',[1,5,10,25,26,27,30],11],['2026-10-01',[4,9,13,23,26,31,32],7],['2026-10-03',[1,2,9,13,17,18,28],30],['2026-10-05',[7,8,14,16,21,27,32],26]];/* Skip uncertain first record */for(const [date,main,bonus] of demo.slice(1))addDraw({date,main,bonus});message('Načteno 5 historických výsledků do 5. 10. 2026. Novější si doplň ručně nebo CSV importem.')};
$('runBt').onclick=()=>{try{const n=Number($('btN').value),p=params(true);if(state.draws.length<8)throw Error('Backtest vyžaduje alespoň 8 historických losování. Importuj delší archiv CSV.');let test=state.draws.slice(Math.max(3,state.draws.length-n));let counts=[0,0,0,0,0,0,0,0],wins=0,total=0,skipped=0,benchmark=0;for(const draw of test){let history=state.draws.filter(x=>x.date<draw.date);if(history.length<3){skipped++;continue}let ts;try{ts=makeTickets(history,p)}catch{skipped++;continue}for(const t of ts){let m=match(t,draw);counts[m.n]++;total++;wins+=!!m.prize}let rand=makeTickets(history,{...p,method:'random'});benchmark+=rand.filter(t=>match(t,draw).prize).length} $('btResult').innerHTML=`<div class="line"></div><h3>Výsledky backtestu</h3><div class="stats"><div class="stat"><strong>${total}</strong><small>sloupců</small></div><div class="stat"><strong>${wins}</strong><small>výherních</small></div><div class="stat"><strong>${benchmark}</strong><small>náhodný vzorek</small></div><div class="stat"><strong>${skipped}</strong><small>vynecháno</small></div></div><p class="muted">Zásahy hlavních čísel: ${counts.map((v,i)=>`${i}: ${v}`).join(' · ')}</p><p class="muted tiny">Náhodné srovnání je jediný simulovaný vzorek. Test při opakování nemusí dát shodná čísla (generátor používá náhodnost). Historické úspěchy nezaručují budoucí výhry.</p>`}catch(e){message(e.message)}};
$('exportBackup').onclick=()=>download('lotto-extra-renta-zaloha.json',new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
$('restore').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let d=JSON.parse(await f.text());if(!Array.isArray(d.draws)||!Array.isArray(d.sets))throw Error('Neplatná záloha.');if(!confirm('Nahradit místní historii a uložené sestavy touto zálohou?'))return;state=d;save();render()}catch(x){message(x.message)}e.target.value=''};

// Six rule-based agents: use the existing app state and forward-test storage unchanged.
initExtraRentaAgents({
 getDraws:()=>state.draws,generate:makeTickets,importArchive:importCsv,
 saveAgentSet:entry=>{
  const same=state.sets.some(s=>s.asOf===entry.asOf&&s.label===entry.label&&JSON.stringify(s.tickets)===JSON.stringify(entry.tickets));
  if(same)return false;
  const record={...entry,id:String(Date.now())+'-'+Math.random().toString(36).slice(2),created:new Date().toISOString()};
  state.sets.push(record);try{save();}catch(e){state.sets.pop();throw e;}render();return true;
 }
});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));render();
