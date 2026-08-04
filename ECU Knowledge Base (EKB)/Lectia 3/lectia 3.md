\# AREL - Automotive Reverse Engineering Lab

\## Lecția 3 - Arhitectura Funcțională a ECU și Metodologia de Diagnostic

\*\*Data:\*\* 04.08.2026



\---



\# Obiectivul lecției



În această lecție am trecut de la identificarea componentelor individuale la înțelegerea ECU-ului ca sistem format din blocuri funcționale.



Scopul nu mai este să știm "ce este o componentă", ci să putem diagnostica logic un ECU necunoscut.



\---



\# Concepte învățate



\## 1. Diagnosticul se face pe blocuri funcționale



Un ECU nu se repară componentă cu componentă.



Se diagnostichează bloc cu bloc.



Structura generală este:



```

Alimentare

&#x20;     │

&#x20;     ▼

Surse interne (5V / 3.3V / 1.8V)

&#x20;     │

&#x20;     ▼

Procesor + Memorii

&#x20;     │

&#x20;     ▼

Comunicații

&#x20;     │

&#x20;     ▼

Intrări senzori

&#x20;     │

&#x20;     ▼

Ieșiri actuatori

```



\---



\# Cele șase blocuri fundamentale ale unui ECU



1\. Alimentare

2\. Surse interne

3\. Procesor + Memorii

4\. Comunicații (CAN/LIN/K-Line)

5\. Intrări senzori

6\. Ieșiri actuatori



Aceste blocuri reprezintă baza oricărui diagnostic.



\---



\# Fluxul standard de diagnostic (SOP)



Orice ECU trebuie verificat în aceeași ordine.



```

12V

&#x20;↓

5V

&#x20;↓

3.3V

&#x20;↓

Clock

&#x20;↓

RESET

&#x20;↓

Procesor execută cod

&#x20;↓

Transceiver CAN

&#x20;↓

Magistrala CAN

```



Important:



Nu se sare niciodată peste un bloc.



\---



\# Rolul oscilatorului



Procesorul nu poate executa nicio instrucțiune fără semnalul de clock.



Dacă oscilatorul nu funcționează, ECU-ul poate avea:



\- alimentări perfecte

\- procesor sănătos



și totuși să nu pornească.



Semnalul se verifică cu osciloscopul direct pe pinii cuarțului.



\---



\# Rolul transceiverului CAN



Transceiverul este interfața dintre procesor și magistrala CAN.



Procesorul comunică digital cu transceiverul.



Transceiverul convertește semnalul logic în semnal diferențial CAN\_H / CAN\_L.



Dacă acesta este defect:



\- ECU nu comunică

\- procesorul poate fi perfect funcțional



\---



\# De ce sunt grupate driverele de putere?



Am discutat de ce Bosch grupează MOSFET-urile și driverele injectorilor într-o singură zonă.



Motive:



\- trasee de curent mare mai scurte

\- disipare termică mai bună

\- radiator comun

\- reducerea zgomotului electromagnetic (EMI)

\- rutare PCB mai simplă

\- fiabilitate crescută



\---



\# Diferența dintre simptom și cauză



Exemplu:



Simptom:



ECU nu comunică pe CAN.



Nu înseamnă automat:



\- procesor defect



Poate fi:



\- lipsă 5V

\- lipsă 3.3V

\- lipsă clock

\- RESET activ permanent

\- transceiver CAN defect

\- magistrală CAN în scurt



Acesta este unul dintre cele mai importante concepte ale întregii academii.



\---



\# Regulile AREL introduse astăzi



\## Regula 14



Un ECU nu se repară componentă cu componentă.



Se diagnostichează bloc cu bloc.



\---



\## Regula 15



Nu diagnostica simptomul.



Diagnostichează cauza.



\---



\## Regula 16



Nu sări niciodată peste un bloc funcțional.



\---



\## Regula 17



Nu înlocui niciodată procesorul doar pentru că nu oscilează.



Demonstrează mai întâi de ce nu există oscilație.



\---



\# Exercițiile rezolvate



\## Exercițiul 3.9



Întrebare:



ECU nu comunică pe CAN.



Primul bloc verificat?



Răspuns:



✔ Alimentarea



\---



\## Exercițiul 3.10



Situație:



12V prezente



Consum 20 mA



Nu comunică.



Prima verificare?



Răspuns:



✔ Existența tensiunilor de 5V și 3.3V.



\---



\## Exercițiul 3.11



Situație:



12V ✔



5V ✔



3.3V ✔



Consum 22 mA



Fără CAN



Următorul pas?



Răspuns:



✔ Verificarea oscilatorului.



\---



\## Exercițiul 3.12



Situație:



12V ✔



5V ✔



3.3V ✔



Clock ✔



Fără CAN



Următorul bloc?



Răspuns:



✔ Transceiver CAN.



\---



\# Schema logică completă



```

Baterie

&#x20;  │

&#x20;  ▼

Protecție polaritate

&#x20;  │

&#x20;  ▼

Filtru EMI

&#x20;  │

&#x20;  ▼

Buck Converter

&#x20;  │

&#x20;  ▼

5V

&#x20;  │

&#x20;  ▼

LDO

&#x20;  │

&#x20;  ▼

3.3V

&#x20;  │

&#x20;  ▼

Procesor

&#x20;  │

&#x20;  ▼

Flash

EEPROM

RAM

&#x20;  │

&#x20;  ▼

Transceiver CAN

&#x20;  │

&#x20;  ▼

CAN BUS

```



\---



\# Ce trebuie reținut



Un ECU este un calculator.



Orice calculator are nevoie de:



\- alimentare

\- clock

\- reset

\- procesor

\- memorie

\- comunicație



Dacă unul dintre aceste elemente lipsește, sistemul nu poate funcționa.



\---



\# Evaluarea lecției



Exerciții rezolvate:



✔ 3.9



✔ 3.10



✔ 3.11



✔ 3.12



Scor:



11.5 / 12



Foarte bine.



Se observă formarea unei gândiri inginerești bazate pe procedură și nu pe presupuneri.



\---



\# Obiectivul lecției următoare



Modulul 3



\## Alimentarea ECU



Vom studia:



\- protecția la inversarea polarității

\- diode TVS

\- filtre EMI

\- convertoare Buck

\- regulatoare LDO

\- generarea tensiunilor de 5V, 3.3V și 1.8V

\- metode rapide de diagnostic ale surselor interne



Scop:



În mai puțin de cinci minute să poți determina dacă un defect provine din alimentarea ECU-ului.

