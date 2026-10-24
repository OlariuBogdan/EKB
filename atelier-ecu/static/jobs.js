'use strict';
// Taxonomie module și profile de lucrări. Orele sunt orientative (punct de plecare) și se pot modifica în fiecare caz.
// level: '' = fără cerințe speciale | 'doc' = cere verificarea actelor | 'law' = cere declarație de utilizare legală | 'safety' = cere validare de siguranță

const MODULES = [
  // [cheie, etichetă, grup, defecte tipice]
  ['ecu_diesel', 'ECU motor diesel', 'Motor și transmisie', 'Defecte termice (lipituri, regulator, cristal), drivere de injectoare, alimentări, memorie, apă/coroziune.'],
  ['ecu_petrol', 'ECU motor benzină', 'Motor și transmisie', 'Drivere de bobine de aprindere și de injectoare, clapetă electronică (punte H), alimentări, apă/coroziune.'],
  ['ecu_pump', 'Modul pompă de injecție / pompă de combustibil', 'Motor și transmisie', 'Drivere de putere, senzori de poziție, supraîncălzire, conector.'],
  ['scr', 'Modul AdBlue / SCR / DPF', 'Motor și transmisie', 'Încălzitoare, drivere de pompă, senzori, apă/coroziune; deseori defectul e în senzori sau încălzire, nu în modul.'],
  ['glow', 'Modul bujii incandescente', 'Motor și transmisie', 'Relee/drivere de putere, conector, supraîncălzire.'],
  ['tcm', 'TCM – cutie automată / robotizată', 'Motor și transmisie', 'Alimentări și drivere de solenoizi, senzori de turație/temperatură în mecatronică, conector, ulei/apă la unele modele, adaptări în memorie.'],
  ['transfer', 'Modul cutie de transfer / 4x4 / diferențial', 'Motor și transmisie', 'Drivere de motor/actuator, senzori, conector, apă.'],
  ['hv', 'Modul hibrid / electric (BMS, invertor)', 'Motor și transmisie', 'ATENȚIE: înaltă tensiune. Lucrezi doar cu calificare și echipament pentru HV.'],
  ['bcm', 'BCM – modul de confort / caroserie', 'Caroserie și acces', 'Relee/drivere de sarcină arse, alimentări, coroziune din apă, memorie și coduri de cheie.'],
  ['doors', 'Modul uși / geamuri / oglinzi / scaune / portbagaj', 'Caroserie și acces', 'Drivere de motor, conector în balama, apă, lipituri.'],
  ['lights', 'Modul lumini (LED, adaptive, xenon)', 'Caroserie și acces', 'Drivere LED, balast, supraîncălzire, apă, condensatori.'],
  ['keyless', 'Imobilizator / receptor cheie / keyless / alarmă', 'Caroserie și acces', 'Bobină antenă, receptor, memorie de chei, alimentare.'],
  ['park', 'Modul parcare / senzori / camere / remorcare', 'Caroserie și acces', 'Alimentări, conector, apă, senzori.'],
  ['abs', 'ABS / ESP', 'Șasiu și siguranță', 'Lipituri/conector spre blocul hidraulic, drivere de electrovalve, senzori de roată, pompă.'],
  ['eps', 'EPS – direcție asistată electric', 'Șasiu și siguranță', 'Alimentări de putere, senzor de cuplu, drivere de motor, calibrare după înlocuire.'],
  ['srs', 'Airbag (SRS)', 'Șasiu și siguranță', 'Memorie de date crash, condensator de rezervă, conector. Sistem de siguranță: lucrezi strict după procedură și validezi funcțional.'],
  ['susp', 'Suspensie adaptivă / pneumatică', 'Șasiu și siguranță', 'Drivere de supape și compresor, senzori de înălțime, conector.'],
  ['epb', 'Frână de parcare electrică (EPB)', 'Șasiu și siguranță', 'Drivere de motor, senzori, calibrare după înlocuire.'],
  ['tpms', 'TPMS / ADAS (radar, cameră)', 'Șasiu și siguranță', 'Alimentări, conector, calibrare după intervenție (cere echipament).'],
  ['cluster', 'Bord (instrument cluster)', 'Habitaclu și infotainment', 'Motoare de ace, LCD/pixeli, iluminare, lipituri la conector, EEPROM (kilometraj).'],
  ['nav', 'Navigație / infotainment / radio', 'Habitaclu și infotainment', 'Display/touch, sursă de alimentare, memorie (card/flash/hard disk), firmware, antenă, conector.'],
  ['amp', 'Amplificator audio / modul audio', 'Habitaclu și infotainment', 'Etaje de putere, alimentări, condensatori, supraîncălzire.'],
  ['hvac', 'Climatizare automată / panou de comandă', 'Habitaclu și infotainment', 'Motoare pas cu pas pentru clapete, drivere, panou de comandă, lipituri.'],
  ['hud', 'Head-up display / display auxiliar', 'Habitaclu și infotainment', 'Sursă de lumină, drivere, ecran.'],
  ['gateway', 'Gateway / modul de rețea / telematică', 'Rețea', 'Alimentări, transceivere CAN/LIN, modem, memorie.'],
  ['other', 'Alt modul', 'Altele', ''],
];

const JOBS = [
  // k, label, group, level, hoursBest, hoursWorst, best, worst, steps[], risk
  {
    k: 'diag', label: 'Diagnoză (găsirea cauzei defectului)', group: 'Diagnoză și reparații hardware', level: '', hb: 0.5, hw: 3,
    best: 'Cauza e la îndemână (alimentare, conector, componentă vizibilă) și se găsește în prima oră.',
    worst: 'Defect intermitent sau cu mai multe cauze; cere repetări termice și comparație cu un modul bun; se poate încheia fără o cauză certă.',
    steps: ['Fișa cazului: simptomul, în cuvintele clientului', 'Identificare exactă (hardware, nu doar codul comercial)', 'Inspecție vizuală externă și internă, poze',
      'Backup dacă modulul se poate citi', 'Alimentare cu limitare de curent și consum în repaus', 'Măsurare șine și secvență de pornire',
      'Arbore de defecte, teste pe ramuri, jurnal', 'Verdict scris și ofertă de reparație'],
    risk: 'Diagnosticul se plătește separat de reparație, chiar dacă nu găsești cauza.'
  },
  {
    k: 'hw_repair', label: 'Reparație hardware (lipituri, componente)', group: 'Diagnoză și reparații hardware', level: '', hb: 1, hw: 6,
    best: 'Lipitură crăpată sau componentă evidentă; reparație și test în câteva ore.',
    worst: 'Componenta se găsește greu sau cauza reală e externă (injector, senzor în scurt) și defectul revine; piese comandate; test termic prelungit.',
    steps: ['Backup verificat înainte de intervenție', 'Eliminarea cauzei externe (sarcini în scurt)', 'Înlocuire sau relipire (tip identic, grad auto)',
      'Curățare flux și inspecție la lupă', 'Test de alimentare cu limitare, apoi test funcțional pe banc', 'Test termic (câteva cicluri)',
      'Montaj și etanșare', 'Fișa completată și garanția comunicată'],
    risk: 'Dacă nu elimini cauza externă, componenta nouă se arde din nou.'
  },
  {
    k: 'hw_complex', label: 'Reparație complexă (BGA/reball, trasee, recuperare)', group: 'Diagnoză și reparații hardware', level: '', hb: 3, hw: 12,
    best: 'Procesul decurge după profil, fără surprize; testele trec din prima.',
    worst: 'Placa se deteriorează la dezlipire sau rezultatul nu e stabil; modulul devine nereparabil; se propune alternativa.',
    steps: ['Decizia economică (cost față de alternativă) și acordul scris al clientului', 'Backup dacă se poate', 'Preîncălzire și profil termic stabilit',
      'Dezlipire și curățare pad-uri', 'Reball sau înlocuire cu piesă nouă', 'Inspecție (lupă, raze X dacă există)', 'Test pe banc și test termic prelungit',
      'Rescriere date din backup dacă e cazul', 'Livrare doar dacă toate testele trec'],
    risk: 'Risc real de a distruge placa. Fără acord scris, nu începe.'
  },
  {
    k: 'water', label: 'Recondiționare după apă / coroziune', group: 'Diagnoză și reparații hardware', level: '', hb: 2, hw: 8,
    best: 'Coroziune la suprafață; curățare, câteva componente înlocuite, funcționează.',
    worst: 'Coroziune în straturile plăcii sau trasee întrerupte; reparație parțială; defectul poate reapărea.',
    steps: ['Deschidere, poze și evaluare a extinderii coroziunii', 'Demontare componente afectate dacă e nevoie', 'Curățare (alcool izopropilic, baie ultrasonică) și uscare completă',
      'Refacere trasee/vias', 'Înlocuire componente corodate', 'Test de alimentare cu limitare și test funcțional', 'Lac de protecție și etanșare', 'Avertizarea clientului: poate reapărea'],
    risk: 'Garanția pe astfel de lucrări trebuie să fie limitată și explicată.'
  },
  {
    k: 'cluster_repair', label: 'Reparație bord (ace, LCD, iluminare)', group: 'Diagnoză și reparații hardware', level: '', hb: 1, hw: 4,
    best: 'Motor de ac sau LED-uri; înlocuire simplă și test.',
    worst: 'Pixeli care nu se recuperează (LCD de înlocuit) sau lipituri/memorie cu probleme; piese de comandat.',
    steps: ['Backup EEPROM și notarea kilometrajului afișat', 'Demontare cu protecție ESD, poze', 'Test pe banc (alimentare, comunicație simulată dacă e nevoie)',
      'Înlocuire motor de ac / LED / reflow panglică LCD', 'Calibrare ace la zero', 'Test de baleiaj și test de lămpi din diagnoză', 'Remontare și test pe vehicul',
      'Verificarea că kilometrajul a rămas neschimbat'],
    risk: 'Lămpile de avertizare trebuie să funcționeze toate la livrare.'
  },
  {
    k: 'mem_recovery', label: 'Recuperare / rescriere memorie coruptă', group: 'Date și software', level: '', hb: 1, hw: 5,
    best: 'Backup disponibil sau fișier de același hardware; rescriere și verificare.',
    worst: 'Fără backup, fișier incompatibil sau memorie fizic defectă; acces direct pe cip și reconstruire.',
    steps: ['Identificarea memoriei și a metodei de acces (OBD, boot, direct pe cip)', 'Citire repetată și comparare', 'Rescriere din backup sau fișier de același hardware',
      'Verificarea sumelor de control', 'Test de pornire și funcții', 'Arhivarea versiunilor'],
    risk: 'Un fișier de la alt hardware poate bloca modulul.'
  },
  {
    k: 'read_write', label: 'Citire / backup / scriere date', group: 'Date și software', level: '', hb: 0.5, hw: 2,
    best: 'Modulul se citește din prima prin metoda standard.',
    worst: 'Modul protejat sau neacoperit de tool; cere boot sau acces direct pe cip; mai multe încercări.',
    steps: ['Identificare hardware și software', 'Alimentare stabilizată', 'Citire de două ori și comparare hash', 'Arhivare cu numele fișei', 'Scriere (dacă e cerută) cu verificare', 'Test funcțional'],
    risk: 'Nu scrii pe singurul exemplar fără backup verificat.'
  },
  {
    k: 'clone', label: 'Clonare modul (hardware identic)', group: 'Date și software', level: 'doc', hb: 1, hw: 4,
    best: 'Hardware identic, date citite curat, pornește din prima.',
    worst: 'Hardware sau variantă diferită, date de imobilizator care nu se potrivesc; clonarea nu e posibilă.',
    steps: ['Verificarea actelor și a justificării', 'Identificarea hardware-ului identic (cod complet)', 'Backup al modulului donor și al originalului dacă există', 'Transfer de date conform tipului de modul',
      'Verificarea VIN și a coerenței datelor', 'Test pe banc / pe vehicul', 'Predare cu proces-verbal'],
    risk: 'Clonarea fără justificare documentată poate facilita fraude. Cere actele.'
  },
  {
    k: 'coding', label: 'Codare / adaptare / programare (modul nou sau second-hand)', group: 'Date și software', level: '', hb: 0.5, hw: 3,
    best: 'Modul compatibil, codare standard, funcționează după adaptare.',
    worst: 'Modul din altă variantă, adaptări multiple sau blocate; cere acces la server de producător ori alt modul.',
    steps: ['Identificarea vehiculului (VIN) și a modulului', 'Citirea stării și a erorilor', 'Programare/codare conform specificațiilor vehiculului', 'Adaptări (senzori, poziții, chei dacă e cazul)',
      'Ștergerea erorilor și verificare', 'Test de drum / funcții'],
    risk: ''
  },
  {
    k: 'update', label: 'Actualizare software / firmware', group: 'Date și software', level: '', hb: 0.5, hw: 2,
    best: 'Actualizare normală, fără probleme.',
    worst: 'Actualizare eșuată, modul blocat; cere recuperare.',
    steps: ['Backup înainte', 'Alimentare stabilizată pe toată durata', 'Actualizare cu fișier verificat', 'Verificare versiune și funcții', 'Test'],
    risk: 'O actualizare întreruptă poate bloca modulul.'
  },
  {
    k: 'nav', label: 'Navigație / infotainment: reparație sau adaptare', group: 'Date și software', level: '', hb: 1, hw: 4,
    best: 'Defect simplu (alimentare, conector, display) sau reîncărcare firmware.',
    worst: 'Memorie sau placă defectă; piese de comandat; legături cu alte module (cod de securitate, VIN).',
    steps: ['Identificare model, versiune, VIN asociat', 'Backup dacă e posibil', 'Test de alimentare și afișaj', 'Reparație sau înlocuire componentă', 'Actualizare/adaptare în limitele licențelor', 'Test funcții (audio, hartă, Bluetooth, camere)'],
    risk: 'Activarea de funcții sau hărți fără licență nu se face.'
  },
  {
    k: 'immo', label: 'Imobilizator: adaptare chei / ECU / dezactivare în modul', group: 'Securitate', level: 'doc', hb: 1, hw: 6,
    best: 'Modul și chei compatibile, procedură standard, pornește.',
    worst: 'Chei sau modul incompatibile, date de securitate neaccesibile; cere piese noi sau varianta oficială prin reprezentanță.',
    steps: ['Verificarea actelor: talon/certificat de înmatriculare, act de identitate, factură sau contract; VIN corespunde', 'Notarea actelor în fișă (copie sau poză, conform GDPR)', 'Backup al modulului',
      'Lucrarea conform specificației cazului, cu documentarea metodei', 'Test de pornire și funcții', 'Predare cu proces-verbal semnat de proprietar'],
    risk: 'Fără acte care dovedesc proprietatea, nu se execută. Păstrează dovezile.'
  },
  {
    k: 'odo_keep', label: 'Transfer kilometraj la înlocuirea bordului (valoarea originală)', group: 'Securitate', level: 'doc', hb: 0.5, hw: 2,
    best: 'Valoarea se citește din vechiul bord și se transferă corect.',
    worst: 'Memoria vechiului bord e coruptă; valoarea originală nu se poate stabili sigur (se consemnează).',
    steps: ['Verificarea actelor', 'Backup EEPROM al bordului vechi și notarea valorii afișate', 'Transferul valorii originale în noul bord', 'Verificarea egalității valorilor', 'Proces-verbal cu valoarea înainte și după'],
    risk: 'Se transferă doar valoarea originală. Nicio modificare a valorii reale.'
  },
  {
    k: 'tune', label: 'Reprogramare / optimizare (Stage 1, Stage 2…)', group: 'Performanță și emisii', level: 'law', hb: 1, hw: 4,
    best: 'Fișier potrivit, citire și scriere fără probleme, valori în limite sigure.',
    worst: 'Fișier nepotrivit, probleme de fiabilitate sau erori; revenire la fișierul original; necesită omologare/aprobare.',
    steps: ['Verificarea stării mecanice și a erorilor existente', 'Backup al fișierului original și arhivare', 'Stabilirea țintei și a limitelor de siguranță ale motorului', 'Aplicarea modificării (documentează fișierul folosit)',
      'Verificare funcțională și test', 'Predare cu declarația semnată și cu fișierul original pus la dispoziție'],
    risk: 'Modificările de putere sau de emisii pot necesita omologare sau aprobare conform legii. Verifică legislația locală.'
  },
  {
    k: 'dpf_egr_fix', label: 'Remediere DPF / EGR / AdBlue (diagnoză, curățare, senzori, regenerare)', group: 'Performanță și emisii', level: '', hb: 1, hw: 5,
    best: 'Senzor defect sau curățare simplă, regenerare reușită.',
    worst: 'Filtru sau catalizator colmatat, supapă blocată, componente de înlocuit; defect mecanic al motorului care cauzează problema.',
    steps: ['Citirea erorilor și a valorilor măsurate (presiune diferențială, temperaturi)', 'Verificarea cauzei: injecție, ulei, scurgeri, senzori', 'Curățare/regenerare sau înlocuire componentă', 'Adaptări după înlocuire', 'Test de drum', 'Sfaturi de utilizare către client'],
    risk: ''
  },
  {
    k: 'emis_off', label: 'Dezactivare DPF / EGR / AdBlue / catalizator în software', group: 'Performanță și emisii', level: 'law', hb: 1, hw: 3,
    best: 'Fișier potrivit, fără erori; funcționează conform cererii clientului.',
    worst: 'Erori, mod limp sau probleme de fiabilitate; revenire la fișierul original.',
    steps: ['Declarația de utilizare legală completată (vezi fila de conformitate)', 'Backup al fișierului original și arhivare', 'Aplicarea modificării (documentează fișierul folosit)', 'Verificare funcțională', 'Predare cu declarația semnată și fișierul original'],
    risk: 'În UE, inclusiv România, dezactivarea sistemelor de emisii pe un vehicul înmatriculat pentru drumuri publice este în general ilegală, cu răspundere pentru proprietar și pentru atelier. Aplicația nu verifică legalitatea în locul tău.',
    emis: true
  },
  {
    k: 'srs', label: 'Modul airbag (SRS): reparație / ștergere date crash după înlocuirea componentelor', group: 'Siguranță', level: 'safety', hb: 1, hw: 3,
    best: 'Componentele sunt înlocuite conform procedurii; modulul se resetează și sistemul trece validarea.',
    worst: 'Modulul sau senzorii sunt deteriorați; sistemul nu trece validarea; se recomandă înlocuirea modulului.',
    steps: ['Confirmarea că toate componentele deteriorate au fost înlocuite conform procedurii producătorului', 'Backup și notarea datelor din modul', 'Reparația/ștergerea datelor conform procedurii',
      'Verificarea funcțională completă din diagnoză (fără erori, lampa se stinge)', 'Notarea în fișă a validării', 'Predare cu avertisment scris dacă ceva rămâne nevalidat'],
    risk: 'Un airbag nefuncțional pune viețile în pericol. Nu se livrează un sistem care nu a trecut validarea. Lampa nu se ascunde.'
  },
  {
    k: 'other', label: 'Altă lucrare', group: 'Altele', level: '', hb: 0.5, hw: 4,
    best: 'Lucrare simplă, conform estimării.', worst: 'Complicații neprevăzute; reevaluare cu clientul.',
    steps: ['Descrierea lucrării în fișă', 'Estimare și acord', 'Execuție', 'Verificare', 'Predare'], risk: ''
  },
];

const LEVEL_TEXT = {
  doc: 'Lucrări care cer verificarea actelor.',
  law: 'Lucrări cu implicații legale (omologare, emisii).',
  safety: 'Lucrări pe sisteme de siguranță.',
};
const LAWFUL_USE = ['', 'Vehicul neînmatriculat pe drumuri publice (off-road / competiție)', 'Vehicul înmatriculat: modificare permisă sau omologată', 'Export într-o țară unde este permis', 'Altul (descris mai jos)'];

const moduleByKey = k => MODULES.find(m => m[0] === k);
const jobByKey = k => JOBS.find(j => j.k === k);
const jobLevels = keys => new Set((keys || []).map(k => (jobByKey(k) || {}).level).filter(Boolean));
