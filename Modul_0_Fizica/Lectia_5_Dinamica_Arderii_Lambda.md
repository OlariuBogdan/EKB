# Lecția 5: Dinamica Arderii - AFR și Senzorul Lambda
**Modul:** 0 (Fizica Motorului și Termodinamică)
**Data:** 04 August 2026

## 1. Concepte Fundamentale
- **Stoichiometrie:** Raportul ideal de masă aer/combustibil pentru o ardere completă (14.7:1 pentru benzină).
- **Factorul Lambda (λ):** Indicatorul calității amestecului (λ = 1.0 înseamnă amestec stoichiometric).
  - **Amestec Bogat (Rich):** λ < 1.0 (exces de benzină). Folosit la sarcină maximă (WOT) pentru răcire internă (EGT scăzut) și putere maximă.
  - **Amestec Sărac (Lean):** λ > 1.0 (exces de oxigen). Folosit la croazieră pentru economie. Crește periculos temperatura și riscul de detonație la sarcini mari.

## 2. Hardware-ul Senzorului Lambda
- **Narrowband (Zirconiu):** Emite 0.1V - 0.9V. Comportament neliniar (tip comutator) în jurul valorii λ = 1.0. Folosit în general după catalizator pentru monitorizarea eficienței acestuia.
- **Wideband (ex: Bosch LSU):** Dispune de o celulă de pompare. Măsoară un curent (mA) care este liniar proporțional cu cantitatea de oxigen. Permite citirea exactă a AFR-ului pe plaje foarte largi. 

## 3. Liniarizare și ADC (Legătura cu HW ECU)
Cipul driver (ex: Bosch CJ125) transformă curentul de pompare în semnal 0-5V. ECU-ul digitalizează semnalul prin ADC și accesează o hartă 2D (Flash) pentru a traduce voltajul în factor λ.

## 4. Logica de Control
- **Open-Loop:** ECU injectează benzină citind doar hărțile fixe din soft, ignorând senzorul Lambda (folosit la WOT și pornirea la rece).
- **Closed-Loop:** ECU citește constant Lambda și ajustează injecția pentru a atinge target-ul de emisii.

## 5. Diagnoză: Fuel Trims (STFT & LTFT)
- **STFT (Short Term):** Ajustări instantanee (în %) ale injecției, calculate de câteva ori pe secundă.
- **LTFT (Long Term):** Când STFT se menține ridicat/scăzut constant, ECU memorează corecția pe termen lung în EEPROM.
- **Gândirea 5 Why:** Un LTFT de +25% nu înseamnă senzor defect, ci faptul că ECU compensează masiv o problemă fizică (ex: aer fals admis după debitmetru sau lipsă de presiune pe pompa de benzină).
