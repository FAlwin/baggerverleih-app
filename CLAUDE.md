# Friesen Bau- und Mietservice — Verwaltungs-App
## Projektbeschreibung

Verwaltungssoftware für ein Kleingewerbe (Bagger- und Geräteverleih), betrieben von Julian Friesen
in Lohmar. Die App dient der täglichen Betriebsorganisation: Buchungen, Rechnungen, Kundenverwaltung,
Flottenübersicht und Buchhaltung. Kleinunternehmer gemäß § 19 UStG – keine Umsatzsteuer.

---

## Aktueller Stand

Ein vollständiger **React-Prototyp** als Handoff-Bundle liegt vor (aus Claude Design exportiert).
Der Prototyp ist funktional und enthält alle Screens mit Mock-Daten. Er läuft aktuell als
Standalone-HTML mit in-browser Babel-Kompilierung – das ist der Ausgangspunkt, kein Zielzustand.

**Aufgabe:** Den Prototyp in eine echte, produktive Web-App überführen.

---

## Ziel-Architektur

```
React + Vite (Frontend / PWA)
        ↓
Cloudflare Tunnel  ←  sicherer Zugang ohne IP-Exposure
        ↓
Synology NAS (Heimserver, mit USV + Internetfallback)
  ├── Node.js / Express  (REST-API, läuft als Docker-Container)
  └── PostgreSQL oder MariaDB  (Datenbank, läuft nativ auf Synology oder als Container)
```

**Hosting:** Kein externer Cloud-Server. Alles läuft auf der eigenen Synology NAS.
**Zugang:** Cloudflare Tunnel → eigene Domain, SSL automatisch.
**Mobile:** PWA (kein App Store) – Bruder installiert via "Zum Homescreen hinzufügen" auf iPhone.

---

## Tech-Stack (Ziel)

| Bereich | Technologie |
|---|---|
| Frontend | React 18 + Vite |
| Styling | CSS Variables (bereits im Prototyp definiert) + ggf. Tailwind |
| State (lokal) | Zustand oder React Context |
| Backend | Node.js + Express |
| Datenbank | PostgreSQL (bevorzugt) oder MariaDB |
| Auth | Einfaches JWT-Login (nur Julian + ggf. 1-2 weitere) |
| Deployment | Docker auf Synology NAS |
| Tunnel | Cloudflare Tunnel |
| Versionierung | Git + GitHub (Repo: FAlwin/baggerverleih-app, privat) |
| CI/CD | Noch nicht definiert – später ggf. GitHub Actions |

---

## Git-Workflow (wichtig!)

```
main        → stabile, produktive Version (was der Bruder nutzt)
feature/xyz → Entwicklungsbranch (hier arbeiten, hier testen)
```

**Regel:** Niemals direkt auf `main` committen. Immer Feature-Branch → testen → PR → merge.
**Commit-Messages:** Auf Deutsch, beschreibend.
```
✅ "Buchungsformular: Datumsvalidierung hinzugefügt"
✅ "Kalender: Konflikt-Erkennung bei Doppelbuchungen behoben"
❌ "fix" / "update" / "changes"
```

---

## Screens / Funktionsumfang (aus Prototyp)

### 1. Dashboard
- KPI-Streifen: Offene Rechnungen, Umsatz aktueller Monat, ausstehende Beträge, aktive Geräte
- Wochenplan-Matrix: Gerät × Wochentag, zeigt Buchungsstatus auf einen Blick
- Nächste Termine, offene Rechnungen, Geräte-Statusübersicht

### 2. Anfragen (`screen-anfragen.jsx`)
- Eingehende Kundenanfragen verwalten
- Status: neu / in Bearbeitung / abgeschlossen
- Badge in Navigation bei neuen Anfragen

### 3. Kalender (`screen-kalender.jsx`)
- Monats-/Wochenansicht
- Buchungen pro Gerät eintragen
- **Konflikt-Erkennung:** Warnung bei Doppelbuchung desselben Geräts

### 4. Rechnungen (`screen-rechnungen.jsx`)
- Liste aller Rechnungen mit Status: offen / bezahlt / überfällig / Mahnung
- Rechnung als bezahlt markieren
- Mahnstatus setzen

### 5. Neue Rechnung (`screen-rechnung-neu.jsx`)
- Kunde auswählen, Positionen (Gerät + Einheit + Preis) hinzufügen
- Automatische Berechnung Gesamtbetrag
- Angebote direkt in Rechnung umwandeln

### 6. Angebote (`screen-angebote.jsx`)
- Angebote erstellen, Status: offen / angenommen / abgelehnt
- Angebot → Rechnung konvertieren (1-Klick)
- Reservierung im Kalender aus Angebot heraus anlegen

### 7. Kunden (`screen-kunden.jsx`)
- Kundenstammdaten (Privat / Gewerbe)
- Kontaktdaten, Transaktionshistorie pro Kunde

### 8. Flotte (`screen-flotte.jsx`)
- Geräteverwaltung: Minibagger, Plateauanhänger, Betonrüttler, Anbaugeräte
- Tarife pro Gerät editierbar (Einheit + Preis)
- Gerät hinzufügen / bearbeiten / löschen

### 9. Buchhaltung (`screen-buchhaltung.jsx`)
- Einnahmenübersicht nach Monat
- Auswertungen für Steuererklärung (Kleinunternehmer § 19 UStG)

---

## Datenmodell (aus Prototyp, als Ausgangspunkt für DB-Schema)

```js
COMPANY       // Stammdaten Inhaber (Name, Adresse, IBAN, Steuernummer, ...)
FLOTTE        // Geräte: id, name, detail, kat, kuerzel, farbe, tarif[]
PREISLISTE    // Sonderleistungen: Transport, Reinigung (id, geraet, einheit, preis)
KUNDEN        // id, name, kontakt, street, city, phone, email, typ (Privat|Gewerbe)
RECHNUNGEN    // id, kundeId, datum, faellig, status, positionen[], betrag, bezahltAm?
ANGEBOTE      // id, kundeId, datum, gueltigBis, status, positionen[], betrag
TERMINE       // id, geraetId, kundeId, von, bis, vonZeit, bisZeit, ort, quellTyp, quellId?
BUCHUNGEN     // id, ...
ANFRAGEN      // id, datum, status, ...
```

**Wichtig:** `kleinunternehmer: true` → keine USt auf Rechnungen, Pflichthinweis:
*"Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."*

---

## Design-System (aus Prototyp übernehmen)

```css
/* Hauptfarben */
--yellow:   #F7C72A   /* Primär-Akzent */
--ink:      #141414   /* Sidebar-Hintergrund, dunkle Elemente */
--paper-2:  #F5F5F2   /* Seitenhintergrund */

/* Schrift */
--sans: System-UI / Inter
```

Sidebar: dunkel (`--ink`), Navigation mit gelben Aktiv-Indikatoren.
Mobile: Bottom Navigation Bar mit 5 Tabs (Home, Anfragen, Kalender, Rechnungen, Mehr).

---

## Unternehmens-Stammdaten (für Rechnungen etc.)

```
Name:         Friesen Bau- und Mietservice
Inhaber:      Julian Friesen
Adresse:      Jahnstraße 38H, 53797 Lohmar
Telefon:      0152 27918523
E-Mail:       julian.friesen96@gmail.com
Steuernummer: 220/5118/4930
Finanzamt:    Finanzamt Siegburg
Bank:         Kreissparkasse Köln
IBAN:         DE41 3705 0299 1023 0882 60
BIC:          COKSDE33XXX
Gewerbebeginn: 01.04.2026
```

---

## Gerätepark (aktuelle Flotte)

| Gerät | Detail | Tarif (Auszug) |
|---|---|---|
| 1,9t Minibagger | Hitachi ZX18-3 CLR, Bj. 2014 | 130€/Tag, 560€/Woche |
| Plateauanhänger | 2.700 kg GVW, 2×4 m | 45€/Tag, 180€/Woche |
| Betonrüttler | 230 V | 30€/Tag |
| Tieflöffel 40/60 cm | Anbaugerät | inklusive |
| Grabenräumlöffel 1,00 m | Anbaugerät | inklusive |

---

## Projektdateien (Handoff-Bundle)

```
baggerverleih-app/
└── project/
    ├── Friesen Baggerverleih.html     ← Haupt-Einstiegspunkt
    ├── Friesen Baggerverleih - Standalone.html  ← Alles in einer Datei
    ├── app/
    │   ├── data.js                    ← Mock-Daten (Single Source of Truth)
    │   ├── store.jsx                  ← State Management (localStorage)
    │   ├── shell.jsx                  ← App-Shell / Layout
    │   ├── app.jsx                    ← Routing, Navigation, Header
    │   ├── ui.jsx                     ← Shared UI-Komponenten
    │   ├── icons.jsx                  ← Icon-Set
    │   ├── print.jsx                  ← Druckansicht Rechnungen
    │   ├── theme.css / app.css        ← Design-System
    │   ├── screen-dashboard.jsx
    │   ├── screen-rechnungen.jsx
    │   ├── screen-rechnung-neu.jsx
    │   ├── screen-angebote.jsx
    │   ├── screen-kalender.jsx
    │   ├── screen-kunden.jsx
    │   ├── screen-buchhaltung.jsx
    │   ├── screen-flotte.jsx
    │   └── screen-anfragen.jsx
    └── screenshots/                   ← Visuelle Referenz
```

---

## Prototyp-Implementierungsstand (Stand: Juni 2026)

Der Prototyp läuft unter `http://localhost:8181/Friesen%20Baggerverleih.html` via Python HTTP-Server:
```bash
cd "/Volumes/nas.familieneufeld.de/homes/alwinf/Drive/Baggerverleih_App/project"
python3 -m http.server 8181
```

### Umgesetzte Features (über Handoff hinaus)

**Druck / PDF (print.jsx + app.css)**
- `Print.RechnungDoc`, `Print.AngebotDoc`, `Print.MietvertragDoc`, `Print.MietbedingungenPage`
- Druckdokument per **React Portal** direkt an `<body>` gehängt → beim Druck wird `#root` ausgeblendet (`display: none`), kein Rest-Layout → echtes A4 ohne Browser-Skalierung
- `@page { size: A4 portrait; margin: 0 }`, Dokument exakt `210mm × 297mm`
- Hintergrundfarben erzwungen: `print-color-adjust: exact` auf `.print-doc` und `*`
- Footer: `position: absolute; bottom: 12mm` (funktioniert wegen `height: 297mm; position: relative`)
- Mietvertrag Seite 1: Kurzfassung §2 (9.5px, columns: 2) + Hinweis auf Seite 2 mit vollständigen Bedingungen
- Mietbedingungen als separate Seite 2 mit allen 8 Paragraphen aus Mietbedingungen.docx

**Navigation (app.jsx)**
- History-Stack: Zurück-Button nur innerhalb von Sub-Screens, nicht auf Haupt-Nav-Ebene
- `TOP_SCREENS` Set verhindert History-Push für Haupt-Navigation
- `window.__goBack` global für PageHeader-Zugriff

**Kalender (screen-kalender.jsx)**
- Wochenansicht: Stunden-Achse 07:00–19:00, 52px pro Stunde, alle Maschinen in derselben Tagesspalte
- Monatsansicht: Buchungs-Badges mit Maschinenfarbe + Kürzel + Vorname
- Neuer Termin: 3-Tab-Modus (Liste / Neuer Kunde / Privat), erstellt Kunde via `store.addKunde()`
- „Privat (Julian)": `quellTyp: 'privat'`, blockiert Gerät ohne Kunden-Referenz

**Dashboard (screen-dashboard.jsx)**
- Wocheneinsatzplan: Timeline statt Matrix – ein Tag pro Zeile, Buchungen als farbige Chips

**Angebote (screen-angebote.jsx)**
- Zeilen klickbar → Detail-Modal (wie Rechnungen)
- Edit öffnet erst nach Schließen des Detail-Modals (kein Übereinander)
- Drucken via `Print.AngebotDoc` + `Print.MietbedingungenPage`

**Rechnungen (screen-rechnungen.jsx)**
- Unterschriften-Pad (Canvas, Touch + Maus) für Vermieter und Mieter
- `Print.MietvertragDoc` nimmt `signaturVermieter` / `signaturMieter` als Base64-PNG

**Buchhaltung (screen-buchhaltung.jsx)**
- Filter: Jahr, Monat, Datumsbereich, Einnahmen/Ausgaben
- Saldo-Label dynamisch: „Saldo (gefiltert)" wenn Filter aktiv

**Design**
- `--muted: #525250`, `--muted-2: #787870` (dunkler als Handoff)
- Flotte: Bearbeiten-Button mit gelbem Hintergrund

### Bekannte Einschränkungen (Prototyp)
- Unterschriften-Pad: Nur Vorbereitung, kein Backend – Daten nur im React-State
- Alle Daten im localStorage (kein persistentes Backend)
- Babel-Kompilierung im Browser: kein Build-Schritt, langsamer Start

---

## Nächste Schritte (Empfohlene Reihenfolge)

1. **Vite + React Projekt aufsetzen** – Projektstruktur anlegen, Prototyp-Dateien übernehmen
2. **Design-System migrieren** – CSS-Variablen aus `theme.css` + `app.css` übernehmen
3. **Komponenten portieren** – Screen für Screen von Babel-JSX zu echtem React-Komponenten
4. **Lokale State-Schicht** – Zunächst weiter mit lokalem State (Zustand), später durch API ersetzen
5. **PWA-Manifest** – `manifest.json` + Service Worker für Offline + Homescreen-Installation
6. **Backend aufsetzen** – Node.js + Express API auf Synology NAS (Docker)
7. **Datenbank** – PostgreSQL Schema aus Datenmodell oben ableiten
8. **Auth** – Einfaches JWT-Login
9. **Cloudflare Tunnel** – Produktivzugang einrichten

---

## Entwicklungsregeln

- Immer auf **Feature-Branch** arbeiten, nie direkt auf `main`
- Vor jedem Merge: im Browser testen (Desktop + Mobile)
- Mock-Daten als JS-Objekte halten bis echtes Backend bereit ist
- Rechnungen: Immer `§ 19 UStG`-Hinweis, keine Umsatzsteuer berechnen
- Konflikt-Prüfung bei Buchungen beibehalten (Geräte dürfen nicht doppelt gebucht sein)
