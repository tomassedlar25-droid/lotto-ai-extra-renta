import fs from 'node:fs';
import assert from 'node:assert/strict';
import {auditArchive,auditPortfolio,controlABlacklist,strictISO,seededRng,grade,runWalkForward,compileReport,HANDOFF_FIELDS} from './agent-core.mjs';
const raw=fs.readFileSync(new URL('./data/extra-renta-history.csv',import.meta.url),'utf8').replace(/^\uFEFF/,'').trim();
const lines=raw.split(/\r?\n/);
const draws=lines.slice(1).map(row=>{const cols=row.split(';');return {date:cols[0],main:cols.slice(1,8).map(Number),bonus:cols[8]?.trim()?Number(cols[8]):null};});
const audit=auditArchive(draws);
assert.equal(audit.ok,true,JSON.stringify(audit.issues));
assert.equal(audit.count,460);assert.equal(audit.first,'2021-01-04');assert.equal(audit.last,'2026-10-08');
assert.equal(audit.missingBonus,358); // pre-bonus era: null must remain null
assert.equal(strictISO('2026-02-30'),false);assert.equal(strictISO('2026-10-08'),true);
assert.deepEqual(controlABlacklist([{date:'2026-01-01',main:[1,2,3,4,5,6,7]},{date:'2026-01-08',main:[8,9,10,11,12,13,14]},{date:'2026-01-15',main:[15,16,17,18,19,20,21]}]),[4,5,6,11,12,13,15,16,17,18,19,20,21]);
const r1=seededRng('same'),r2=seededRng('same');assert.deepEqual(Array.from({length:20},()=>r1()),Array.from({length:20},()=>r2()));
const valid=Array.from({length:12},(_,i)=>Array.from({length:7},(_,j)=>(i*2+j)%33+1));
const issues=auditPortfolio([valid[0],valid[0]],{columns:2,maxOverlap:5},[]);assert.equal(issues.ok,false);
assert.equal(grade([1,2,3,4,5,6,7],{main:[1,2,3,4,5,6,7],bonus:null}).prize,'1. pořadí');
assert.equal(grade([1,2,3,4,5,6,7],{main:[1,2,3,4,5,6,8],bonus:null}).bonus,null);
// Simulated generator: deterministic based on seed; required to enforce no-lookahead.
const observed=[];
function fakeGenerate(history,opts){observed.push([history.length,history.at(-1)?.date]); const rng=opts.rng; const black=new Set(opts.filtered?controlABlacklist(history,opts.extra):opts.extra); const pool=Array.from({length:33},(_,i)=>i+1).filter(n=>!black.has(n)); const tickets=[];
 let attempts=0;
 while(tickets.length<opts.columns&&attempts++<30000){let ns=[...pool].sort(()=>rng()-.5).slice(0,7).sort((a,b)=>a-b);if(tickets.some(t=>t.join(',')===ns.join(',')))continue;if(tickets.some(t=>t.filter(n=>ns.includes(n)).length>opts.maxOverlap))continue;tickets.push(ns)}
 if(tickets.length!==opts.columns)throw Error('too few tickets');return tickets;
}
const cfg={method:'control',columns:4,candidates:20,maxOverlap:6,filtered:true,extra:[],testDraws:30,minTrain:30};
const result=await runWalkForward(draws,cfg,fakeGenerate);
assert.equal(result.tested,30);assert.equal(result.skipped,0);assert.equal(result.model.tickets,120);assert.equal(result.baseline.tickets,120);
assert.equal(observed.length,60);assert.equal(observed.at(0)[0],draws.length-30);assert.equal(observed.at(0)[1],draws.at(-31).date);
const reports=compileReport({draws,config:cfg,tickets:fakeGenerate(draws,{...cfg,rng:seededRng('report')}),test:result,sourceConfirmed:true});
assert.equal(reports.status,'APPROVE FOR GENERATION ONLY');assert.equal(reports.steps.length,6);assert(HANDOFF_FIELDS.every(k=>k in reports.steps[0]));
const failed=compileReport({draws,config:cfg,tickets:fakeGenerate(draws,{...cfg,rng:seededRng('report')}),test:result,sourceConfirmed:false});assert.equal(failed.status,'INCOMPLETE');
const skipTest={...result,skipped:1};assert.equal(compileReport({draws,config:cfg,tickets:fakeGenerate(draws,{...cfg,rng:seededRng('report')}),test:skipTest,sourceConfirmed:true}).status,'REJECT');
console.log('OK: 460 historical draws, pre-bonus era, chronology, CONTROL A blacklist, seed reproducibility, portfolio audit, 30-draw no-lookahead walk-forward, six handoffs, risk gates.');
