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
- **Stundengenaue Belegungsbalken** (Arbeitstag-Fenster aus `settings.geschaeftszeitVon/Bis`).
- Desktop: **Monats-Raster** mit Gerätespuren (eine Spur je Gerät) + **Wochen-Plantafel** (Gerät × Tag) mit Drag-to-book.
- Mobil: durchlaufende **Apple-Style-Monatsliste** + Wochenansicht (Tage als Zeilen, Geräte als Spalten).
- Zeigt Aufträge (mehrgeräte-aufgefächert), Belegungen (Privat/Wartung) und offene Anfragen; Reservierungen/Anfragen **gestrichelt**.
- **Konflikt-Erkennung uhrzeitgenau:** Doppelbuchung desselben Geräts wird blockiert; zwei zeitlich getrennte Buchungen am selben Tag sind erlaubt.

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
FLOTTE        // Geräte: id, name, detail, kat, kuerzel, farbe, tarif[] (inkl. „Tag"-Tarif)
PREISLISTE    // Sonderleistungen: Transport, Reinigung (id, geraet, einheit, preis)
KUNDEN        // id, name, kontakt, street, city, phone, email, typ (Privat|Gewerbe)
RECHNUNGEN    // id, kundeId, datum, faellig, status, positionen[], betrag, bezahltAm?, auftragId?
ANGEBOTE      // id, kundeId, datum, gueltigBis, status, positionen[], betrag, auftragId?, von?, bis?, geraetId?, ort?
AUFTRAEGE     // ZENTRALE KLAMMER (ersetzt TERMINE): id, typ, kundeId, ort, status, anfrageId?, angebotId?, rechnungId?, notiz,
              //   geraete[]{geraetId,von,bis,vonZeit,bisZeit}  ← MEHRGERÄTE (eigener Zeitraum je Gerät),
              //   primäre Felder geraetId/von/bis/vonZeit/bisZeit sind auf geraete[0] gespiegelt (Abwärtskompat. ~48 Lesestellen),
              //   mietvertrag?{signaturVermieter,signaturMieter,positionen,datum,gesperrt}
BELEGUNGEN    // Gerät OHNE Auftrag geblockt (Privat/Wartung): id, grund, geraetId, von, bis, vonZeit, bisZeit, ort, notiz (nur Kalender)
BUCHUNGEN     // id, datum, art (e|a), kategorie, text, betrag
ANFRAGEN      // id, datum, name, phone, email, ort, nachricht, status (neu|in-bearbeitung|erledigt),
              //   geraete[]{geraetId,von,vonZeit,dauer,einheit,bis,bisZeit}  ← MEHRGERÄTE; primäre Felder gespiegelt
SETTINGS      // zahlungszielTage, angebotGueltigTage, geschaeftszeitVon/Bis, mietWochentage[7] (0=So), nummern{}
```

**Auftrag-Lebenszyklus (`AUFTRAG_FLOW`):** `anfrage → angebot → reserviert → abgerechnet → bezahlt → abgeschlossen`.
Jeder Beleg (Angebot/Rechnung) gehört zu einem Auftrag; Erstellung läuft **immer über den Auftrag**.

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
    ├── contact.html                   ← Öffentliches Kontakt-/Anfrageformular (Startdatum+Dauer, Mehrgeräte, reservierte Zeiträume gesperrt, ohne WhatsApp)
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
    │   ├── screen-auftraege.jsx       ← Auftrag-Liste + Auftrag-Detail (Schaltzentrale)
    │   ├── screen-belege.jsx          ← „Belege": Tabs Angebote/Rechnungen
    │   ├── screen-rechnungen.jsx
    │   ├── screen-rechnung-neu.jsx    ← Neues Angebot / Neue Rechnung (immer via Auftrag)
    │   ├── screen-angebote.jsx        ← inkl. window.VersendModal (generisch)
    │   ├── screen-kalender.jsx
    │   ├── screen-kunden.jsx
    │   ├── screen-buchhaltung.jsx
    │   ├── screen-flotte.jsx
    │   ├── screen-anfragen.jsx
    │   └── screen-einstellungen.jsx   ← Firmendaten, Zahlungsziel, Gültigkeit, Vermiet-Wochentage, Nummernkreise
    └── screenshots/                   ← Visuelle Referenz
```

---

## Prototyp-Implementierungsstand (Stand: Juni 2026)

Lokal starten (Port frei wählbar, siehe Babel-Cache-Hinweis unten):
```bash
cd "/Volumes/nas.familieneufeld.de/homes/alwinf/Drive/Baggerverleih_App/project"
python3 -m http.server 8195   # → http://localhost:8195/Friesen%20Baggerverleih.html
```
`.claude/launch.json` ist für die Preview-MCP hinterlegt (Server „friesen", Port 8195).

### Architektur & Konventionen (WICHTIG – hier zuerst lesen)

- **`window.*`-Registry-Pattern, kein Build-Schritt.** Jede Datei hängt sich an Globals:
  `window.Screens`, `window.useStore()`, `window.UI.*`, `window.Icon`, `window.Print.*`, `window.PDF`,
  `window.FRIESEN`, `window.PageHeader`, `window.addDays`/`berechneEnde`/`tageZwischen`/`istMiettag`,
  `window.__nav`/`__goBack`/`__miettage`. Reihenfolge der `<script>`-Tags in der HTML ist relevant.
- **DB:** localStorage-Key `friesen_db_v4`. `loadDB()` mergt fehlende settings-Defaults nach (für Alt-Stände).
- **React-Batching-Falle:** Rückgabewerte aus `setDb`-Updatern sind über mehrere Aufrufe unzuverlässig.
  → IDs **vorab** via `store.nextId(...)` aus `store.db` berechnen und Anlegen+Verknüpfen **atomar in EINEM `setDb`**
  machen (`belegAnlegen`, `annehmenAnfrage`).
- **Babel-Cache-Busting:** Geänderte `.jsx` werden vom selben Origin oft gecacht. Beim Testen Server auf
  **neuem Port** starten oder URL mit `?v=<timestamp>` laden + Hard-Reload.
- **Undo:** Snapshot-basiert. Vor destruktiver Aktion `const snap = store.snapshot()`, dann
  `toast('… gelöscht', { undo: () => store.restoreSnapshot(snap) })`. Toast: 10 s mit Countdown-Balken.

### Zentrale Bausteine

**Auftrag = Schaltzentrale (`screen-auftraege.jsx`)**
- `window.Screens.auftrag` (Detail) führt durch den Flow (`nextStep`), zeigt Beleg-Kacheln
  (Angebot/Mietvertrag/Rechnung/Kalender). Kachel-Überschrift = Button → `DocPreviewModal` (A4-Vorschau).
- Mietvertrag kann **eigenständig** erstellt werden (auch ohne Angebot); fehlt ein Angebot, wird die Rechnung
  aus dem Mietvertrag vorbefüllt. Gibt es ein Angebot, fließen dessen Daten in Mietvertrag **und** Rechnung.
  Alle drei Belege bleiben editierbar; bei beidseitiger MV-Unterschrift werden Angebot + Mietvertrag gesperrt,
  die Rechnung bleibt editierbar, solange nicht bezahlt/versendet.
- Status manuell korrigieren: Zurücksetzen → `setAuftragStatusKaskade` (setzt bezahlte Rechnung zurück) +
  Warnung; Überspringen → Warnung. **bezahlt** und **Mahnung** schließen sich aus.

**Belege zusammengefasst (`screen-belege.jsx`)**
- Ein Nav-Punkt „Belege" mit Tabs Angebote/Rechnungen; rendert die bestehenden Listen-Screens mit
  `PageHeader = () => null`. `nav('rechnungen'|'angebote')` wird in `app.jsx` automatisch auf
  `belege` mit `params.tab` umgeleitet. Erstellung läuft nur noch über den Auftrag.

**PDF via nativem Druck-Dialog (`print.jsx`)**
- `window.PDF.download(reactDoc, filename)` rendert das Dokument offscreen in `#__printroot` und ruft
  `window.print()` auf; per `@media print` wird **nur** dieser Container gedruckt (alles andere ausgeblendet,
  `@page{size:A4;margin:0}`). Ergebnis: **echte PDF mit auswählbarem/kopierbarem Text** (kein Raster-Bild),
  Unterschriften sauber gerendert. Button-Label „Drucken / als PDF", Aufräumen via `afterprint`.
- `Print.RechnungDoc/AngebotDoc/MietvertragDoc/MietbedingungenPage` rendern exakt `210mm × 297mm`.

**Mietvertrag-Unterschrift (`ui.jsx` SignaturPad + store)**
- Pad ist Vollbild-Overlay, auf dem Handy mit Querformat-Hinweis (+ optional Fullscreen/Orientation-Lock,
  iOS ignoriert das still). `store.mietvertragSign(auftragId, 'v'|'m', dataUrl)` speichert persistent im
  Auftrag; nach **beidseitiger** Unterschrift `mietvertrag.gesperrt = true` → unveränderlich, kein erneutes
  Unterschreiben. Positionen werden beim ersten Unterschreiben als Snapshot festgehalten.

**Zeitraum & Vermiet-Wochentage**
- `UI.ZeitraumPicker`: Start + Dauer (Tage/Stunden) → Ende via `window.berechneEnde`.
- `settings.mietWochentage[7]` (0=So). Abgewählte Tage: keine Buchung **und** zählen nicht als Miettag –
  `berechneEnde` überspringt sie (liest `window.__miettage`), Enddatum verschiebt sich. `angebotGueltigTage`
  steuert die Angebots-Gültigkeit. Beides in `screen-einstellungen.jsx` editierbar.

**Versenden (`screen-angebote.jsx` → `window.VersendModal`)**
- Generisch für `kind: 'angebot'|'rechnung'|'mietvertrag'` (E-Mail/WhatsApp/SMS, Text vorausgefüllt).
  Verfügbar in Vorschau **und** Kachel. PDF-Anhang muss manuell angehängt werden (kein Backend).

**Weiteres**
- Konfliktprüfung `store.findConflict(geraetId, von, bis, exceptId, vonZeit?, bisZeit?)`: mehrgeräte-fähig
  (prüft jede `geraete[]`-Zeile einzeln) und **uhrzeitgenau** (ohne Uhrzeit-Argumente = datumsbasiert, abwärtskompatibel).
  Angebot zeigt frei/belegt + „nächster freier Start".
- `normalizeOverdue`: offene Rechnungen mit Fälligkeit < heute werden beim Laden als „überfällig" geführt.
- Live-A4-Vorschau via `window.useFitScale(793)`.

### Bekannte Einschränkungen (Prototyp)
- Kein Backend: alle Daten im localStorage; Versand-PDF wird nicht automatisch angehängt.
- Babel-Kompilierung im Browser: kein Build-Schritt, langsamer Start, Cache-Busting nötig (s. o.).
- **Keine Standalone-HTML mehr** – die frühere Einzeldatei wurde entfernt (nicht mehr benötigt).
  Auslieferung / GitHub Pages nutzt `Friesen Baggerverleih.html` mit `app/*.jsx` (Cache-Busting via `?v=N`).

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
