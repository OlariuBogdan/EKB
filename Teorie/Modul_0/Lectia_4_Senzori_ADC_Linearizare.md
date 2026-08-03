# Lec?ia 4: Senzori, ADC ?i Liniarizare
**Data:** 03 August 2026

## Concepte Arhitecturale
- **ADC (Analog-to-Digital Converter):** Podul între fizic (0-5V) ?i digital (0-1023 pa?i).
- **Referin?a de 5V (VREF):** Generata de LDO intern pe ECU. Single Point of Failure.
- **Logica Pull-up:** For?eaza semnalul la 5V (ADC 1023) în caz de circuit deschis, trimi?ând ECU în Limp Mode (Signal Out of Range High).
- **Liniarizarea:** Harta 2D din memoria Flash (WinOLS) care traduce valoarea bruta ADC în unita?i reale (ex: mbar, grade Celsius).

## Embedded C++ (Memory-Mapped I/O)
Accesarea directa a memoriei folosind bitfields volatile ?i reinterpret_cast pentru performan?a maxima pe procesor, evitând bit-shifting manual.
