/**
 * EXTRA RENTA AI 2.1: safe repair for stale PWA module cache.
 * Run only from the EXISTING lotto-ai-extra-renta repo root.
 * Preserves localStorage key, local user data, original generator and saved sets.
 * No network actions and no deletion of user data.
 */
import fs from 'node:fs';

const required=['app.js','index.html','sw.js','agent-team.mjs'];
for(const path of required) if(!fs.existsSync(path)) throw Error(`Chybí ${path}. Otevři Codespaces projektu lotto-ai-extra-renta.`);

let app=fs.readFileSync('app.js','utf8');
let html=fs.readFileSync('index.html','utf8');
let team=fs.readFileSync('agent-team.mjs','utf8');
let sw=fs.readFileSync('sw.js','utf8');

// Validate origin and avoid blind edits to unfamiliar versions.
if(!app.includes("K='lotto-ai-extra-renta-v1'")||!app.includes('initExtraRentaAgents({')) throw Error('Nerozpoznaná verze app.js, nic neměním.');
if(!/EXTRA RENTA AI 2\.[01]/.test(html)||!html.includes('id="agentArchiveStatus"')) throw Error('Nerozpoznaná verze index.html, nic neměním.');
if(!team.includes('export function initExtraRentaAgents(')) throw Error('Nerozpoznaná verze agent-team.mjs, nic neměním.');
if(!sw.includes("lotto-extra-renta-")) throw Error('Nerozpoznaný service worker, nic neměním.');

function replaceRequired(source,before,after,path){
 if(source.includes(after)) return source; // repeatable
 if(!source.includes(before)) throw Error(`V ${path} chybí očekávaný text: ${before.slice(0,70)}`);
 return source.replace(before,after);
}

html=replaceRequired(html,'src="app.js"','src="app.js?v=21"','index.html');
html=replaceRequired(html,'agent-team.css?v=20','agent-team.css?v=21','index.html');
// Visible version indicator after success. Avoid altering input fields.
html=replaceRequired(html,'EXTRA RENTA AI 2.0','EXTRA RENTA AI 2.1','index.html');
app=replaceRequired(app,"from './agent-team.mjs';","from './agent-team.mjs?v=21';",'app.js');
team=replaceRequired(team,"from './agent-core.mjs';","from './agent-core.mjs?v=21';",'agent-team.mjs');

// If a legacy local state is inconsistent, show the error instead of leaving the
// 'Načítám stav archivu…' placeholder indefinitely. Do not write to localStorage.
const start='// Six rule-based agents: use the existing app state and forward-test storage unchanged.\ninitExtraRentaAgents({';
const guarded='// Six rule-based agents: use the existing app state and forward-test storage unchanged.\ntry {\ninitExtraRentaAgents({';
app=replaceRequired(app,start,guarded,'app.js');
const end="\n});\nif('serviceWorker'in navigator)";
const guardedEnd="\n});\n} catch (error) {\n console.error('EXTRA RENTA AI: inicializace agentů selhala', error);\n const indicator=document.getElementById('agentArchiveStatus');\n if(indicator) indicator.textContent='Chyba inicializace: '+String(error?.message||error)+'. Uložená data nebyla smazána. Použij diagnostiku cache-fix.html.';\n}\nif('serviceWorker'in navigator)";
app=replaceRequired(app,end,guardedEnd,'app.js');
// Recheck for SW script updates on application load.
app=replaceRequired(app,"navigator.serviceWorker.register('./sw.js').catch(()=>{})", "navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{})",'app.js');

// Network-first for application shell and scripts (prevents stale HTML / JS),
// with CacheStorage fallback when offline. Old cache names only are removed.
sw=`/* EXTRA RENTA AI 2.1 — network-first shell, offline fallback. */
const CACHE='lotto-extra-renta-v2-1-cachefix';
const ASSETS=['./','./index.html','./app.js?v=21','./agent-team.mjs?v=21','./agent-core.mjs?v=21','./agent-team.css?v=21','./data/extra-renta-history.csv','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lotto-extra-renta-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const fresh=request.mode==='navigate'||/\\.(?:js|mjs|css|html?)$/.test(url.pathname);
 if(fresh){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;}).catch(()=>caches.match(request).then(cached=>cached||(request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
 }else{
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
 }
});
`;

// Verify ALL replacements before writes: writes happen only after assertions.
for(const [path,content] of [['app.js',app],['index.html',html],['agent-team.mjs',team],['sw.js',sw]]){
 fs.writeFileSync(path,content);
 console.log('Upraveno:',path);
}
console.log('OK: EXTRA RENTA AI 2.1 instalována. Nyní spusť testy a git commit.');
