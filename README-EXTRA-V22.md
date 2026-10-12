# EXTRA RENTA AI 2.2 – celý historický backtest

Určeno pro existující GitHub repo `tomassedlar25-droid/lotto-ai-extra-renta` na verzi 2.1. Neinstalovat do Eurojackpotu.

## Instalace

Nahraj soubor `extra-renta-full-history-v22.zip` do kořene repozitáře, otevři jeho Codespaces a spusť:

```bash
git pull --ff-only && unzip -n extra-renta-full-history-v22.zip && node install-extra-v22.mjs && node test-extra-v22.mjs && node agent-tests.mjs && node --check app.js && git status --short
```

Je-li výsledek OK, ulož:

```bash
git add app.js index.html agent-core.mjs agent-team.mjs sw.js install-extra-v22.mjs test-extra-v22.mjs README-EXTRA-V22.md && git commit -m "EXTRA RENTA AI 2.2 - Full history backtest" && git push origin main
```

## Rozsah backtestu

V obou záložkách (Backtest a 6 agentů) bude ve výběru období nová výchozí možnost **Celá dostupná historie (od 4. tahu)**. U 460 dostupných výsledků jde o maximálně 457 testovatelných tahů. První tři losování tvoří minimální trénovací historii (CONTROL A potřebuje 3 historické tahy). Test nikdy nemůže předpovědět výsledky před začátkem archivu. Pokud 12 sloupců nejde kvůli filtrům sestavit, test zaznamená vynechaný tah a risk audit ho neoznačí za kompletní.

Původní pevné možnosti 30/50/100/200 zůstávají a navíc je k dispozici 500/800/1000. Pevný rozsah musí mít dostatek dat včetně 30 trénovacích tahů. Při načtení dalšího archivu se volba Celá historie sama rozšíří. Backtest agentů je deterministický; starší backtest mimo záložku agentů používá náhodný generátor a může se při opakování lišit.

## Data

Oprava **nepřepisuje** klíč `lotto-ai-extra-renta-v1` v browser localStorage a nijak nemaže historická losování nebo uložené sestavy. Doporučujeme přesto před úpravou v aplikaci použít **Forward test → Záloha dat JSON**. Aktualizace mění jen kód aplikace a jméno cache service workeru. Nezvyšuje šanci na výhru.
