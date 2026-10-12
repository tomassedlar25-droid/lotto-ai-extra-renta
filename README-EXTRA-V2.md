# EXTRA RENTA AI 2.0 — upgrade EXISTUJÍCÍ aplikace

## Kam instalovat

Pouze do **https://github.com/tomassedlar25-droid/lotto-ai-extra-renta** (ne Eurojackpot). Žádný nový repozitář není třeba. ZIP obsahuje výhradně nové soubory a instalační skript; **neobsahuje a nepřepisuje původní `app.js`, `index.html` ani `sw.js`**. Ty upraví až instalační skript, který předem kontroluje očekávanou verzi a odmítne neznámý formát.

### První nasazení

1. Pro jistotu v současné aplikaci proveď **Forward test → Záloha dat JSON** (data jsou uložena v místním úložišti telefonu, ne na GitHubu).
2. Nahraj `extra-renta-ai-v2-upgrade.zip` do **kořene existujícího** repozitáře `lotto-ai-extra-renta` na GitHubu. Jde to přes stránku `/upload/main`.
3. Otevři GitHub Codespaces právě pro repozitář **lotto-ai-extra-renta**, nikoli `lotto-ai-eurojackpot`.
4. V terminálu spusť:

```bash
git pull --ff-only && unzip -n extra-renta-ai-v2-upgrade.zip && node install-extra-v2.mjs && node agent-tests.mjs && node --check app.js && git status --short
```

5. Pokud jsou testy `OK`, zkontroluj změněné soubory (`app.js`, `index.html`, `sw.js`) a nové soubory. Pak spusť:

```bash
git add app.js index.html sw.js agent-core.mjs agent-team.mjs agent-team.css agent-tests.mjs install-extra-v2.mjs README-EXTRA-V2.md data/extra-renta-history.csv
git commit -m "EXTRA RENTA AI 2.0 - 6 agentu a forward"
git push origin main
```

6. Po nasazení GitHub Pages otevři Extra Rentu v mobilu. Při staré verzi zavři PWA a znovu otevři. Nový service worker používá cache `lotto-extra-renta-v2-0-six-agents`.

## Co je nové

- Nová záložka **6 agentů** navazující na existující Generátor, Backtest a Forward test.
- Researcher, Data Analyst, Strategist, Coder/Backtest, Risk Manager a Boss jsou transparentní **výpočetní moduly**, nikoli šest externích AI asistentů. Nepoužívají API klíče ani žádné burzy.
- CONTROL A vyřazuje 7 hlavních čísel posledního losování a 4., 5. a 6. číslo vzestupně seřazené sedmice v každém ze dvou předcházejících losování. Dodatkové číslo se pro filtr ignoruje.
- Reprodukovatelný walk-forward počítá tikety pouze z předchozích losování. Náhodný benchmark dodržuje stejné kontrolní omezení. Jedná se pouze o jeden benchmark, který nedokazuje predikční výhodu.
- Kontrola celých sad tiketů (7 z 33, duplicity, blacklist, překryvy). Risk Manager odmítne neúplné nebo chybné backtesty a nepovolí uložení.
- Tlačítko **Uložit do čekajících tiketů** ukládá schválenou sestavu přes původní úložiště `lotto-ai-extra-renta-v1` do dosavadního **Forward testu**. Brání opakovanému uložení stejné sestavy a ověřuje, že mezitím nedošlo ke změně historie.
- Přiložený CSV archiv **460 losování 2021-01-04 až 2026-10-08**. Lze ho vložit tlačítkem `Načíst přiložený archiv 2021–2026`; import se provede až po potvrzení uživatelem a nic nemaže z uložených sestav. Historii je nutné porovnat s oficiálními výsledky.
- Starší tahy bez dodatkového čísla mají `bonus=null`. Nesmí se doplňovat vymyšlenými hodnotami.

## Základní QA

V dodaném balíčku `node agent-tests.mjs` ověřuje validaci historie, CONTROL A blacklist, determinismus, walk-forward bez lookahead, formální kontrolu tiketu a předávací protokoly šesti agentů. Není to test výhernosti. Instalační skript je idempotentní a uchovává stávající datový klíč.

## Omezení

- Není zde napojení na Allwyn. Neprobíhá podání sázek ani automatické online ověření výsledků.
- Předběžná historie z dodaného souboru končí 8. 10. 2026. Novější tahy uživatel přidává ručně nebo přes import.
- Historický backtest není zárukou budoucí výhry a žádná kombinace nemá při férovém losování vyšší základní pravděpodobnost než jiná.
- Na GitHub se neodesílají soukromé tikety ani historie z telefonu. Místní data mohou zmizet při smazání dat webu — zálohuj je jako JSON.

Doporučeno začít CONTROL A, 12 sloupců, TOP 20, překryv 4, backtest 50 tahů. Aplikace může vyžadovat doplnění archivu a lidské potvrzení zdroje, než schválí generování.
