/* EXTRA RENTA AI 2.0 — deterministic six-agent simulation utilities. No remote AI or betting. */
export const HANDOFF_FIELDS=['AGENT','TASK COMPLETED','SOURCE FACTS USED','ANALYSIS','MISSING INFORMATION','RISKS OR LIMITATIONS','NEXT AGENT','HANDOFF SUMMARY'];
const sorted=a=>[...a].sort((x,y)=>x-y);
export function isValidTicket(ticket){return Array.isArray(ticket)&&ticket.length===7&&new Set(ticket).size===7&&ticket.every(n=>Number.isInteger(n)&&n>=1&&n<=33);}
export function strictISO(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;let d=new Date(s+'T12:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s;}
export function auditArchive(draws){
 const issues=[],seen=new Set();let missingBonus=0,earliest=null,latest=null,prev='';
 if(!Array.isArray(draws)||!draws.length)return {ok:false,count:0,issues:['MISSING: archiv výsledků.'],first:null,last:null,missingBonus:0};
 for(const d of draws){
  if(!strictISO(d?.date))issues.push('Neplatné datum losování: '+String(d?.date));
  if(!isValidTicket(d?.main))issues.push('Neplatných 7 hlavních čísel pro datum '+String(d?.date));
  if(d?.bonus===null||d?.bonus===undefined){missingBonus++;}else if(!Number.isInteger(d.bonus)||d.bonus<1||d.bonus>33||d?.main?.includes(d.bonus))issues.push('Neplatné dodatkové číslo pro '+String(d?.date));
  if(d?.date&&seen.has(d.date))issues.push('Duplicitní datum '+d.date);
  if(prev&&d?.date<=prev)issues.push('Historie není chronologicky vzestupná: '+String(d?.date));
  if(d?.date){seen.add(d.date);earliest??=d.date;latest=d.date;prev=d.date;}
  if(issues.length>=12)break;
 }
 return {ok:issues.length===0,count:draws.length,first:earliest,last:latest,missingBonus,issues};
}
export function controlABlacklist(history,extra=[]){
 const draws=[...history].sort((a,b)=>b.date.localeCompare(a.date));const black=new Set(extra);
 if(draws[0])for(const n of draws[0].main)black.add(n);
 for(const d of draws.slice(1,3))for(const n of sorted(d.main).slice(3,6))black.add(n);
 return sorted(black);
}
export function seededRng(seed){
 let h=2166136261>>>0;
 for(const char of String(seed)){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}
 return ()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return (h>>>0)/4294967296;};
}
export function auditPortfolio(tickets,opts,blacklist=[]){
 const issues=[];
 if(!Array.isArray(tickets)||tickets.length!==Number(opts.columns))issues.push('Nesprávný počet sloupců.');
 const banned=new Set(blacklist),signatures=new Set(),covered=new Set();let overlapMax=0;
 for(const [i,t] of (tickets||[]).entries()){
  if(!isValidTicket(t)){issues.push('Neplatný sloupec '+(i+1));continue;}
  const sig=sorted(t).join(',');if(signatures.has(sig))issues.push('Duplicitní sloupec '+(i+1));signatures.add(sig);
  if(t.some(n=>banned.has(n)))issues.push('Sloupec '+(i+1)+' obsahuje vyřazené číslo.');
  t.forEach(n=>covered.add(n));
  for(let j=0;j<i;j++)if(isValidTicket(tickets[j])){
   const overlap=t.filter(n=>tickets[j].includes(n)).length; overlapMax=Math.max(overlapMax,overlap);
   if(overlap>Number(opts.maxOverlap))issues.push(`Sloupce ${j+1} a ${i+1} překročily limit překryvu.`);
  }
 }
 return {ok:issues.length===0,issues,covered:covered.size,maxOverlap:overlapMax};
}
export function grade(ticket,draw){
 const hits=ticket.filter(x=>draw.main.includes(x)).length;
 const bonus=draw.bonus!=null?ticket.includes(draw.bonus):null;
 // 6+bonus is meaningful only when a bonus was actually drawn.
 const prize=hits===7?'1. pořadí':hits===6&&bonus?'2. pořadí':hits===6?'3. pořadí':hits===5?'4. pořadí':hits===4?'5. pořadí':hits===3?'6. pořadí':null;
 return {hits,bonus,prize};
}
const newCounter=()=>({tickets:0,threePlus:0,prizes:0,hitsByCount:Array(8).fill(0),mainHits:0});
function tally(acc,tickets,draw){for(const t of tickets){const result=grade(t,draw);acc.tickets++;acc.hitsByCount[result.hits]++;acc.mainHits+=result.hits;if(result.hits>=3)acc.threePlus++;if(result.prize)acc.prizes++;}}
const wait=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function runWalkForward(draws,config,generate,progress=()=>{}){
 if(!auditArchive(draws).ok)throw Error('Archiv neprošel vstupní kontrolou.');
 const count=Number(config.testDraws),minTrain=Number(config.minTrain??30);
 if(!Number.isInteger(count)||count<1||count>10000||!Number.isInteger(minTrain)||minTrain<3)throw Error('Neplatný rozsah backtestu.');
 if(draws.length-minTrain<count)throw Error(`MISSING: pro ${count} testovaných tahů potřebujeme alespoň ${count+minTrain} předchozích a testovaných losování.`);
 const begin=draws.length-count,model=newCounter(),baseline=newCounter(),rows=[];let skipped=0;
 for(let i=begin;i<draws.length;i++){
  const earlier=draws.slice(0,i),draw=draws[i];
  const options={...config,extra:[...config.extra||[]]};
  const mainSeed=`extra-renta-v2|${draw.date}|${options.method}|${options.columns}|${options.candidates}|${options.maxOverlap}|${options.filtered}|${options.extra.join('.')}`;
  let tickets,random;
  try{
   tickets=generate(earlier,{...options,rng:seededRng(mainSeed+'|model')});
   // Same exclusion, portfolio size, candidate count and overlap rules for the randomized comparator.
   random=generate(earlier,{...options,method:'random',rng:seededRng(mainSeed+'|baseline')});
   const b=options.filtered?controlABlacklist(earlier,options.extra):options.extra;
   const c1=auditPortfolio(tickets,options,b),c2=auditPortfolio(random,options,b);
   if(!c1.ok||!c2.ok)throw Error('Neplatná sestava: '+[...c1.issues,...c2.issues].join(' '));
  }catch(e){
   skipped++;rows.push({date:draw.date,error:String(e.message||e)});
   if((i-begin)%5===4){progress((i-begin+1)/count);await wait();}
   continue;
  }
  tally(model,tickets,draw);tally(baseline,random,draw);rows.push({date:draw.date,model:tickets.map(t=>grade(t,draw).hits),baseline:random.map(t=>grade(t,draw).hits)});
  if((i-begin)%5===4){progress((i-begin+1)/count);await wait();}
 }
 progress(1);
 return {first:draws[begin].date,last:draws.at(-1).date,requested:count,tested:count-skipped,skipped,columns:config.columns,model,baseline,rows};
}
export function handoff(agent,task,facts,analysis,missing,risks,next,summary){return {'AGENT':agent,'TASK COMPLETED':task,'SOURCE FACTS USED':facts,'ANALYSIS':analysis,'MISSING INFORMATION':missing,'RISKS OR LIMITATIONS':risks,'NEXT AGENT':next,'HANDOFF SUMMARY':summary};}
export function handoffText(data){return HANDOFF_FIELDS.map(k=>k+':\n'+data[k]).join('\n\n');}
export function compileReport({draws,config,tickets,test,sourceConfirmed=false}){
 const archive=auditArchive(draws),blacklist=config.filtered?controlABlacklist(draws,config.extra):config.extra;
 const portfolio=auditPortfolio(tickets,config,blacklist),issues=[...archive.issues,...portfolio.issues];
 if(draws.length<3)issues.push('CONTROL A vyžaduje nejméně 3 předchozí losování.');
 if(test?.skipped>0)issues.push(`Backtest nedokázal sestavit předepsané portfolio v ${test.skipped} testovaných tazích.`);
 if(!test||test.tested<30)issues.push('MISSING: alespoň 30 kompletně otestovaných historických tahů.');
 const missing=[];
 if(!sourceConfirmed)missing.push('MISSING: uživatel nepotvrdil historii proti oficiálnímu zdroji.');
 if(!test)missing.push('MISSING: dokončený backtest.');
 const status=issues.length?'REJECT':missing.length?'INCOMPLETE':'APPROVE FOR GENERATION ONLY';
 const checked=Number(archive.ok)+Number(portfolio.ok)+Number(!!test&&test.tested>=30&&test.skipped===0)+Number(sourceConfirmed);
 const completeness=25*checked;const facts=`${archive.count} tahů (${archive.first||'MISSING'} až ${archive.last||'MISSING'}), z toho ${archive.missingBonus} bez dodatkového čísla.`;
 const summary=test?`${test.tested}/${test.requested} úplných tahů, ${config.columns} sloupců/tah, model 3+: ${test.model.threePlus}, náhodný benchmark 3+: ${test.baseline.threePlus}.`:'MISSING: backtest.';
 const steps=[
  handoff('1 · Researcher','Kontrola historie',facts,'Procházeny dátumy, číselné rozsahy, duplicity a chronologie.',sourceConfirmed?'Žádné povinné položky vstupní kontroly.':missing.join(' '),'Žádný historický výsledek negarantuje budoucí výskyt.','2 · Data Analyst','Archiv je analyzován pouze jako historie.'),
  handoff('2 · Data Analyst','Kontrola a blacklist CONTROL A',facts,`Blacklist: ${blacklist.join(', ')||'žádný'} (${blacklist.length} hlavních čísel). Dodatkové číslo do filtru nevstupuje.`,archive.ok?'Žádné strukturální vady.':archive.issues.join('; '),'Výluky nejsou důkaz predikční výhody.','3 · Strategist','Blacklist platí pro aktuální generování, při backtestu je vždy přepočten.'),
  handoff('3 · Strategist','Sestavení 7/33 portfolia',`Metoda ${config.method}, ${config.columns} sloupců, TOP ${config.candidates}, překryv ${config.maxOverlap}, CONTROL A ${config.filtered?'ano':'ne'}.`,`Formální kontrola ${portfolio.ok?'OK':'REJECT'}, pokryto ${portfolio.covered} různých hlavních čísel.`,portfolio.ok?'MISSING: prediktivní výhoda neprokázána.':portfolio.issues.join('; '),'Kombinace mají stejnou teoretickou šanci při nezávislém losování.','4 · Coder','Záznam generování neznamená podanou sázku.'),
  handoff('4 · Coder','Reprodukovatelný walk-forward backtest',summary,'Při každém tahu se používají pouze předchozí výsledky a pevně inicializovaný generátor náhodných čísel.',test?.skipped?`${test.skipped} přeskočených tahů.`:'MISSING: nezávislá dosud neviděná budoucí losování.','Jeden náhodný benchmark a zpětně zvolené strategie mohou zkreslit závěry.','5 · Risk Manager','Testování je popisné, ne prediktivní.'),
  handoff('5 · Risk Manager','Kontrola portfolia, testu a zdroje',facts,`Rozhodnutí ${status}. ${issues.length?'Chyby: '+issues.join('; '):'Bez formálních chyb.'}`,missing.join(' ')||'Žádné povinné položky tohoto auditu.','Schválení pouze pro simulované generování, nikdy pro automatickou sázku.','6 · Boss','Kontrola dokladu historie je deklarace uživatele.'),
  handoff('6 · Boss','Závěrečný technický protokol',facts+' '+summary,`Výsledek: ${status}.`,[...issues,...missing].join(' ')||'MISSING: prokázaná výhoda proti náhodě.','Nevyvozuj profit ani vyšší šanci z krátkého backtestu.','Uživatel','Finální sestavu musí zkontrolovat člověk.')
 ];
 return {status,archive,portfolio,blacklist,completeness,issues,missing,summary,steps};
}
