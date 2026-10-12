import fs from 'node:fs';
import assert from 'node:assert/strict';
import {strictISO,controlABlacklist,seededRng,runWalkForward,auditPortfolio} from './agent-core.mjs';
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const team=fs.readFileSync('agent-team.mjs','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.equal((html.match(/value="all" selected/g)||[]).length,2,'Celá historie musí být na dvou záložkách');
assert.match(team,/getDraws\(\)\.length-3/);
assert.match(team,/minTrain:el\('agentTestN'\)\.value==='all'\?3:30/);
assert.match(app,/Backtest: 0 \/ /);
assert.match(sw,/v2-2-full-history/);
assert.match(app,/lotto-ai-extra-renta-v1/);
assert.equal(strictISO('2026-10-08'),true);
// Synthetic chronological draws: test >500 historical events to catch previous hard cap.
const draws=Array.from({length:840},(_,i)=>{
 const date=new Date(Date.UTC(2021,0,1+i)).toISOString().slice(0,10);
 const main=Array.from({length:7},(_,j)=>1+((i+j*4)%33)).sort((a,b)=>a-b);
 return {date,main,bonus:null};
});
// Deterministic valid portfolio generator for integration test; verifies the
// backtest range and chronology without claiming prediction performance.
const generate=(h,cfg)=>{
 const blocked=new Set(cfg.filtered?controlABlacklist(h,cfg.extra||[]):cfg.extra||[]);
 const available=Array.from({length:33},(_,i)=>i+1).filter(n=>!blocked.has(n));
 if(available.length<7)throw Error('Nedostatek dostupných čísel');
 return [available.slice(0,7)];
};
const cfg={method:'control',testDraws:837,minTrain:3,columns:1,candidates:20,maxOverlap:6,filtered:true,extra:[]};
const result=await runWalkForward(draws,cfg,generate);
assert.equal(result.requested,837);
assert.equal(result.tested+result.skipped,837);
assert.equal(result.rows[0].date,draws[3].date);
assert.equal(result.rows.at(-1).date,draws.at(-1).date);
assert.ok(result.tested>700,`unexpectedly many skipped: ${result.skipped}`);
console.log('OK 2.2: celé historické období, test 837 tahů, žádný pevný limit 500.');
console.log('OK 2.2: dvě volby Celá historie, ukládání dat nezměněno, cache aktualizována.');
