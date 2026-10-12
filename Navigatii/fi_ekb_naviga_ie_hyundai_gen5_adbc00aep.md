# FIȘĂ TEHNICĂ INTERVENȚIE (EKB - Electronic Knowledge Base)

* **ID Document:** EKB-HYU-GEN5-001
* **Data înregistrării:** 12 Octombrie 2026
* **Categorie:** Unitate Multimedia / Navigație OEM (Head Unit)
* **Producător:** LG Electronics / Hyundai Mobis
* **Platformă Hardware:** Gen5 / Display Audio
* **Cod Model:** `ADBC00AEP`
* **Aplicații Vehicule:** Hyundai Elantra (AD), i30 (PD), Tucson (TL), Kona (OS), Ioniq / Kia Ceed, Sportage (2016–2021)

---

## 1. Simptome Reclamate (Manifestare Defect)
* Unitate complet nefuncțională („moartă”): ecran negru, fără iluminare de fundal (backlight), fără sunet, fără reacție la butoanele fizice și fără activare cameră marșarier.
* Defectul poate fi precedat de înghețarea imaginii pe sigla Hyundai/Kia (Bootloop) sau restartări aleatorii, în special în zilele călduroase.

---

## 2. Configurație Alimentare pe Banc (Bench Pinout)
Unitatea utilizează un conector principal dublu de culoare albă cu **73/74 pini** împărțit în două secțiuni: **Conector A (38 pini - stânga)** și **Conector B (35 pini - dreapta)** (privind unitatea din spate).

Toate conexiunile de alimentare se realizează în **Conectorul B (35 pini - dreapta)**:

| Semnal | Pin Conector B | Poziționare Fizică (vedere din spate) | Tensiune Nominală |
| :--- | :--- | :--- | :--- |
| **GND (Masă)** | **Pin 12, Pin 13** | Cei 2 pini lați (de forță) din extrema dreaptă (sus și jos) sau direct pe șasiul metalic | $0\,\text{V}$ |
| **B+ (Permanent)** | **Pin 10, Pin 11** | Cei 2 pini lați situați imediat în stânga pinilor de masă (legați în paralel pe PCB) | $+12.0\,\text{V} - 14.4\,\text{V}$ |
| **ACC (Contact)** | **Pin 22** | Rândul din mijloc (pini subțiri), al 3-lea pin numărând dinspre pinii lați spre stânga | $+12.0\,\text{V}$ (prin rezistor de protecție $1\,\text{k}\Omega$) |

* **Notă:** Unitatea pornește direct pe banc la aplicarea simultană a semnalelor `B+` și `ACC`, fără a necesita emulare de semnal CAN-Bus.

---

## 3. Diagnosticare la Nivel de Placă (PCB)

### A. Analiza Consumului de Curent (la $12.0\,\text{V}$)
* **Consum în regim de avarie (Defect confirmat):** $\approx 0.15\,\text{A} - 0.45\,\text{A}$ (valoare fixă/înghețată). Unitatea nu inițiază secvența de Boot și nu încarcă sistemul de operare.
* **Consum normal de funcționare:** Oscilează dinamic între $0.60\,\text{A}$ și $1.20\,\text{A}$ în timpul secvenței de boot (fără difuzoare conectate).

### B. Verificarea Tensiunilor Secundare
* Tensiunile pe sursele în comutație (bobinele de pe placa de bază superioară) sunt prezente și stabile: $+5.0\,\text{V}$, $+3.3\,\text{V}$, $+1.8\,\text{V}$ și $+1.2\,\text{V}$ (Vcore / DDR).
* Prezența tuturor tensiunilor secundare combinată cu un consum fix de $\approx 0.25\,\text{A}$ indică lipsa comunicării între procesorul principal (SoC) și memoria RAM/eMMC sau coruperea datelor de boot.

### C. Identificarea Defectului
* **Cauza Rădăcină:** Fisurarea micro-lipiturilor (bilelor BGA - *Cold Joints*) sub procesorul principal (SoC) de pe placa superioară, cauzată de ciclurile termice repetate și de disiparea termică deficitară spre carcasă.
* **Metodă rapidă de confirmare:** Presiune mecanică moderată pe capsula procesorului la alimentare sau *Diagnostic Reflow* scurt ($210^\circ\text{C}$ timp de $20\,\text{s}$).

---

## 4. Procedura Standard de Reparație (SOP)

1. **Demontare:**
   * Se demontează capacul superior și placa principală (Mainboard).
   * Se îndepărtează scuturile metalice de ecranare (shielding) de peste zona procesorului și a memoriei.
   * *Opțional (dacă există suspiciuni de scurt pe placa de bază inferioară):* Se izolează/dezlipește finalul audio de pe radiatorul spate.
2. **Intervenție BGA (SoC Rework):**
   * Se curăță zona din jurul procesorului cu alcool izopropilic (IPA $99.9\%$).
   * Se aplică flux BGA *No-Clean* de înaltă calitate (ex. Amtech / Stirri / Martin) sub capsula procesorului.
   * Se execută profilul termic pe stația BGA / aer cald controlat cu preîncălzire inferioară (Bottom Preheater la $140^\circ\text{C} - 160^\circ\text{C}$) până la atingerea punctului de fuziune al aliajului Lead-Free ($\approx 225^\circ\text{C} - 235^\circ\text{C}$ la nivelul bilelor), verificând efectul de auto-centrare (*nudging test* fin).
   * Pentru cazurile de oxidare severă a pad-urilor se recomandă **Reballing complet** cu bile de staniu cu plumb ($\text{Sn63/Pb37}$).
3. **Optimizarea Sistemului de Răcire (Măsură Preventivă Obligatorie):**
   * Se îndepărtează pad-ul termic original (degradat/uscat).
   * Se instalează un **Thermal Pad nou** cu conductivitate termică ridicată ($\ge 6.0\,\text{W/mK}$, grosime $1.5\,\text{mm} - 2.0\,\text{mm}$) sau un șim de cupru cu pastă termoconductoare de calitate între procesor și ecranajul metalic superior, asigurând un contact ferm.
4. **Reasamblare și Testare:**
   * Se relipește finalul audio pe placa inferioară aplicând pastă termoconductoare nouă pe radiator.
   * Se testează unitatea pe banc timp de minimum $60\,\text{minute}$ în sarcină (verificare stabilitate termică, recepție semnal, touch screen, audio).

---

## 5. Note Financiare și Garanție (Referință Internă)
* **Timp estimat de lucru:** $1.5 - 2.5\,\text{ore}$
* **Tarif recomandat manoperă:** $600 - 900\,\text{RON}$ (în funcție de procedură: Reflow controlat + Răcire vs. Reballing complet).
* **Garanție recomandată:** $6 - 12\,\text{luni}$ (condiționată de aplicarea modificării termice).