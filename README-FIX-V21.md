# EXTRA RENTA AI 2.1 — oprava mezipaměti bez mazání historie

Toto je aktualizace existujícího projektu `tomassedlar25-droid/lotto-ai-extra-renta`, nikoli Eurojackpotu.

## Instalace (Codespaces)

1. Nahraj ZIP do kořene stávajícího repozitáře přes `/upload/main`.
2. V Codespaces projektu `lotto-ai-extra-renta` spusť:

```bash
git pull --ff-only && unzip -n extra-renta-fix-v21.zip && node install-extra-fix-v21.mjs && node test-extra-fix-v21.mjs && node agent-tests.mjs && node --check app.js && git status --short
```

3. Pokud testy projdou:

```bash
git add index.html app.js agent-team.mjs sw.js cache-fix.html install-extra-fix-v21.mjs test-extra-fix-v21.mjs README-FIX-V21.md && git commit -m "EXTRA RENTA AI 2.1 - Fix PWA cache and agent initialization" && git push origin main
```

4. V **běžné kartě Chrome**, tedy ve stejném profilu jako uložené tikety, otevři:

`https://tomassedlar25-droid.github.io/lotto-ai-extra-renta/cache-fix.html`

5. Na diagnostické stránce stáhni zálohu přes tlačítko a potom zvol `Opravit načítání a otevřít aplikaci`.

## Co se mění

- Verze `app.js?v=21`, `agent-team.mjs?v=21`, `agent-core.mjs?v=21` obcházejí starou cache.
- Service worker přepne HTML a skripty na network-first s offline fallbackem; aktualizuje vlastní cache.
- Pokud data vyvolají chybu inicializace, místo nekonečné hlášky „Načítám stav archivu…“ zobrazí důvod.
- `cache-fix.html` zálohuje data a maže pouze CacheStorage této aplikace + registrace service workeru Extra Renty, nikdy `localStorage`.

## Ochrana dat

Žádný instalační skript nemění obsah `localStorage` ani klíč `lotto-ai-extra-renta-v1`. Zůstanou původní tikety, importovaná historie i generátor. **Nemaž data webu v nastavení Chrome.** Pokud je problém v poškozeném uživatelském souboru, diagnóza musí být vyřešena odděleně.
