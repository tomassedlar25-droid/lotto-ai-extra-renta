# LOTTO AI – Extra Renta 1.0

Samostatná PWA. Hlavní pravidlo 7 z 33 + dodatkové číslo.

## Instalace
Vytvoř samostatný veřejný repozitář `lotto-ai-extra-renta`, nahraj všech 5 souborů z ZIP do kořene repozitáře, GitHub Settings → Pages → Deploy from a branch → main /root. Web bude na `https://UZIVATEL.github.io/lotto-ai-extra-renta/`. Poté v Android Chrome zvol Přidat na plochu / Nainstalovat aplikaci.

**Nikdy neuploaduj data ani zálohy obsahující soukromé tikety do veřejného repozitáře.** Tikety a importovaná historie jsou uloženy pouze na aktuálním zařízení (localStorage). Při smazání dat webu zmizí; pravidelně používej Záloha dat JSON.

## Historie
Ručně vložit datum + 7 různých hlavních čísel + jedno jiné dodatkové, nebo importovat CSV s hlavičkou `datum;c1;c2;c3;c4;c5;c6;c7;bonus`. CSV lze také z aplikace exportovat. Ukázkové výsledky do 5.10.2026 jsou pouze startovací vzorek a **nejsou aktualizovaný archiv**. Automatická synchronizace není v této první verzi zapojena.

## Strategie
CONTROL A vyloučí sedm hlavních čísel posledního tahu a pozice 4,5,6 druhého a třetího posledního (seřazeno vzestupně). Bonus nikdy nevstupuje do filtru. Ostatní heuristiky (Hybrid, Ensemble, trend, četnost) jsou nově adaptované na 7/33, NEJSOU totožné s matematickými vahami aplikace Eurojackpot. Test má náhodnou složku pro diverzifikaci.

## Forward test a backtest
Uložené sestavy jsou vyhodnocovány proti prvnímu pozdějšímu losování. Bonus rozhoduje při 6 trefených hlavních číslech. Výherní kategorie podle pravidel Allwyn. Backtest přepočítává pouze dřívější tahy, potřebuje delší importované údaje. Nejde o oficiální kontrolu sázky.

## Ochrana dat
Nepřipojuje se žádná databáze, registrace ani platební brána. Nepředkládá nárok na výherní pravděpodobnost. 18+.
