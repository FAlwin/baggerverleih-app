/* ============================================================
   FRIESEN BAGGERVERLEIH — Demo-Daten (Single Source of Truth)
   Stand: Juni 2026. Wird von Canvas + App genutzt (window.FRIESEN).
   ============================================================ */
(function () {
  const COMPANY = {
    name: 'Friesen Bau- und Mietservice',
    owner: 'Julian Friesen',
    street: 'Jahnstraße 38H',
    city: '53797 Lohmar',
    phone: '0152 27918523',
    email: 'julian.friesen96@gmail.com',
    steuernr: '220/5118/4930',
    finanzamt: 'Finanzamt Siegburg',
    bank: 'Kreissparkasse Köln',
    iban: 'DE41 3705 0299 1023 0882 60',
    bic: 'COKSDE33XXX',
    kleinunternehmer: true,
    ustHinweis: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    gewerbebeginn: '01.04.2026',
  };

  // Flotte / Gerätepark — inkl. editierbares Tarif (Einheiten + Preise)
  const FLOTTE = [
    { id: 'bagger',    name: '1,9t Minibagger', detail: 'Hitachi ZX18-3 CLR · Bj. 2014 · ohne Fahrer, inkl. ein Löffel', kat: 'Maschine',
      kuerzel: 'BA', farbe: '#F7C72A',
      tarif: [{ einheit: 'Tag', preis: 60 }] },
    { id: 'anhaenger', name: 'Plateauanhänger', detail: '2.700 kg GVW · 2×4 m · Auffahrrampen', kat: 'Transport',
      kuerzel: 'PL', farbe: '#2B6CB0',
      tarif: [{ einheit: '4 Stunden', preis: 35 }, { einheit: '8 Stunden', preis: 50 }, { einheit: 'Tag', preis: 60 }] },
    { id: 'ruettler',  name: 'Betonrüttler', detail: 'Betrieb 230 V Stromanschluss', kat: 'Maschine',
      kuerzel: 'RÜ', farbe: '#8B5E3C',
      tarif: [{ einheit: 'Tag', preis: 20 }] },
    { id: 'tl40',      name: 'Tieflöffel 40 cm', detail: 'Anbaugerät Bagger', kat: 'Anbau',
      kuerzel: 'TL', farbe: '#6B6B66',
      tarif: [{ einheit: 'inklusive', preis: 0 }] },
    { id: 'tl60',      name: 'Tieflöffel 60 cm', detail: 'Anbaugerät Bagger', kat: 'Anbau',
      kuerzel: 'TL', farbe: '#6B6B66',
      tarif: [{ einheit: 'inklusive', preis: 0 }] },
    { id: 'grl',       name: 'Grabenräumlöffel 1,00 m', detail: 'Anbaugerät Bagger', kat: 'Anbau',
      kuerzel: 'GR', farbe: '#6B6B66',
      tarif: [{ einheit: 'inklusive', preis: 0 }] },
  ];

  // Sonstige Servicepositionen (laut Preisliste). Transport: Pauschalen + km-Satz über 30 km.
  const PREISLISTE = [
    { id: 'p_transport_15', geraet: 'Transport bis 15 km',      einheit: 'Pauschale',         preis: 50 },
    { id: 'p_transport_30', geraet: 'Transport bis 30 km',      einheit: 'Pauschale',         preis: 100 },
    { id: 'p_transport_km', geraet: 'Transport über 30 km',     einheit: 'pro km (ab 30 km)', preis: 1 },
    { id: 'p_fahrer',       geraet: '1,9t Bagger mit Fahrer',   einheit: 'pro Stunde',        preis: 25 },
    { id: 'p_loeffel',      geraet: 'Zusatz-Löffel (ab 2.)',    einheit: 'pro Tag',           preis: 5 },
    { id: 'p_reinigung',    geraet: 'Reinigungspauschale',      einheit: 'Pauschale',         preis: 100 },
  ];

  const KUNDEN = [
    { id: 'k1', name: 'Bauunternehmen Krämer GmbH', kontakt: 'M. Krämer', street: 'Hauptstraße 12', city: '53721 Siegburg', phone: '02241 998120', email: 'info@kraemer-bau.de', typ: 'Gewerbe' },
    { id: 'k2', name: 'GaLaBau Becker', kontakt: 'Thomas Becker', street: 'Wahlscheider Straße 8', city: '53797 Lohmar', phone: '02246 304455', email: 'kontakt@galabau-becker.de', typ: 'Gewerbe' },
    { id: 'k3', name: 'Familie Wagner', kontakt: 'Sabine Wagner', street: 'Birkenweg 4', city: '53797 Lohmar', phone: '0171 2233445', email: 's.wagner@web.de', typ: 'Privat' },
    { id: 'k4', name: 'Pflasterbau Aydin', kontakt: 'E. Aydin', street: 'Frankfurter Straße 55', city: '53840 Troisdorf', phone: '02241 405060', email: 'aydin@pflasterbau.de', typ: 'Gewerbe' },
    { id: 'k5', name: 'Landwirtschaft Hövel', kontakt: 'Josef Hövel', street: 'Dorfstraße 2', city: '53804 Much', phone: '02245 60112', email: 'hof.hoevel@t-online.de', typ: 'Gewerbe' },
    { id: 'k6', name: 'Herr Schmitz', kontakt: 'Peter Schmitz', street: 'Hauptstraße 9', city: '53783 Eitorf', phone: '0160 5544332', email: 'p.schmitz@gmx.de', typ: 'Privat' },
    { id: 'k7', name: 'Hausverwaltung Sülz', kontakt: 'C. Berger', street: 'Luxemburger Straße 210', city: '50937 Köln', phone: '0221 9988770', email: 'verwaltung@hv-suelz.de', typ: 'Gewerbe' },
  ];

  // Positions-Vorlagen
  const P = {
    baggerW:   () => ({ text: '1,9t Minibagger Hitachi ZX18-3', einheit: 'Woche',      menge: 1, preis: 560 }),
    baggerWE:  () => ({ text: '1,9t Minibagger Hitachi ZX18-3', einheit: 'Wochenende', menge: 1, preis: 230 }),
    baggerTag: (n) => ({ text: '1,9t Minibagger Hitachi ZX18-3', einheit: 'Tag',       menge: n, preis: 130 }),
    anhTag:    (n) => ({ text: 'Plateauanhänger 2.700 kg',       einheit: 'Tag',       menge: n, preis: 45 }),
    anhW:      () => ({ text: 'Plateauanhänger 2.700 kg',        einheit: 'Woche',      menge: 1, preis: 180 }),
    ruetTag:   (n) => ({ text: 'Betonrüttler (230 V)',           einheit: 'Tag',       menge: n, preis: 30 }),
    transport: () => ({ text: 'Transportpauschale (Umkreis 15 km)', einheit: 'Pauschale', menge: 1, preis: 45 }),
    reinigung: () => ({ text: 'Reinigungspauschale',            einheit: 'Pauschale',  menge: 1, preis: 25 }),
  };
  const sum = (pos) => pos.reduce((a, p) => a + p.menge * p.preis, 0);

  // Rechnungen — Status: offen | bezahlt | ueberfaellig | mahnung
  const mkR = (o, positionen) => ({ ...o, positionen, betrag: sum(positionen) });
  const RECHNUNGEN = [
    mkR({ id: 'R-2026-001', kundeId: 'k1', datum: '2026-04-08', faellig: '2026-04-22', status: 'bezahlt', bezahltAm: '2026-04-19' }, [P.baggerW()]),
    mkR({ id: 'R-2026-002', kundeId: 'k2', datum: '2026-04-15', faellig: '2026-04-29', status: 'bezahlt', bezahltAm: '2026-04-27' }, [P.baggerTag(3)]),
    mkR({ id: 'R-2026-003', kundeId: 'k3', datum: '2026-04-22', faellig: '2026-05-06', status: 'bezahlt', bezahltAm: '2026-05-02' }, [P.baggerTag(1), P.transport()]),
    mkR({ id: 'R-2026-004', kundeId: 'k4', datum: '2026-05-02', faellig: '2026-05-16', status: 'mahnung', mahnstufe: 1 }, [P.baggerW(), P.baggerTag(2)]),
    mkR({ id: 'R-2026-005', kundeId: 'k5', datum: '2026-05-09', faellig: '2026-05-23', status: 'bezahlt', bezahltAm: '2026-05-20' }, [P.baggerTag(2), P.transport()]),
    mkR({ id: 'R-2026-006', kundeId: 'k1', datum: '2026-05-14', faellig: '2026-05-28', status: 'ueberfaellig' }, [P.baggerW(), P.ruetTag(2), P.reinigung(), P.transport()]),
    mkR({ id: 'R-2026-007', kundeId: 'k6', datum: '2026-05-20', faellig: '2026-06-03', status: 'bezahlt', bezahltAm: '2026-05-29' }, [P.baggerTag(1)]),
    mkR({ id: 'R-2026-008', kundeId: 'k2', datum: '2026-06-01', faellig: '2026-06-15', status: 'offen' }, [P.baggerW()]),
    mkR({ id: 'R-2026-009', kundeId: 'k3', datum: '2026-06-02', faellig: '2026-06-16', status: 'offen' }, [P.baggerTag(1), P.transport()]),
    mkR({ id: 'R-2026-010', kundeId: 'k7', datum: '2026-06-02', faellig: '2026-06-16', status: 'offen' }, [P.baggerTag(1), P.anhTag(1), P.transport()]),
  ];

  // Angebote — Status: offen | angenommen | abgelaufen
  const mkA = (o, positionen) => ({ ...o, positionen, betrag: sum(positionen) });
  const ANGEBOTE = [
    mkA({ id: 'A-2026-018', kundeId: 'k4', datum: '2026-05-28', gueltigBis: '2026-06-11', status: 'offen', auftragId: 'AU-2026-010' }, [P.baggerW(), P.anhW(), P.transport()]),
    mkA({ id: 'A-2026-017', kundeId: 'k7', datum: '2026-05-25', gueltigBis: '2026-06-08', status: 'angenommen' }, [P.baggerTag(1), P.anhTag(1), P.transport()]),
    mkA({ id: 'A-2026-016', kundeId: 'k5', datum: '2026-05-10', gueltigBis: '2026-05-24', status: 'abgelaufen' }, [P.baggerTag(2), P.transport()]),
    mkA({ id: 'A-2026-019', kundeId: 'k2', datum: '2026-06-01', gueltigBis: '2026-06-15', status: 'offen' }, [P.baggerW(), P.ruetTag(2), P.transport()]),
  ];

  // Aufträge — zentrale Klammer über Belegung (Kalender), Angebot und Rechnung.
  // Aufträge sind IMMER Vermietungen an einen Kunden (typ bleibt für Abwärtskompatibilität).
  // status: anfrage → angebot → reserviert → abgerechnet → bezahlt → abgeschlossen
  // Privat-/Wartungs-Blocks stehen separat in BELEGUNGEN (kein Auftrag).
  const AUFTRAEGE = [
    { id: 'AU-2026-001', typ: 'vermietung', geraetId: 'bagger',    kundeId: 'k1', von: '2026-06-01', bis: '2026-06-01', vonZeit: '07:00', bisZeit: '17:00', ort: 'Baustelle Siegburg', status: 'abgeschlossen', anfrageId: null, angebotId: null, rechnungId: 'R-2026-006', notiz: '' },
    { id: 'AU-2026-002', typ: 'vermietung', geraetId: 'bagger',    kundeId: 'k3', von: '2026-06-02', bis: '2026-06-02', vonZeit: '07:00', bisZeit: '13:00', ort: 'Lohmar', status: 'abgerechnet', anfrageId: null, angebotId: null, rechnungId: 'R-2026-009', notiz: '' },
    { id: 'AU-2026-003', typ: 'vermietung', geraetId: 'anhaenger', kundeId: 'k3', von: '2026-06-02', bis: '2026-06-02', vonZeit: '14:00', bisZeit: '17:00', ort: 'Lohmar', status: 'reserviert', anfrageId: null, angebotId: null, rechnungId: null, notiz: '' },
    { id: 'AU-2026-004', typ: 'vermietung', geraetId: 'anhaenger', kundeId: 'k2', von: '2026-06-03', bis: '2026-06-03', vonZeit: '08:00', bisZeit: '12:00', ort: 'Lohmar', status: 'abgerechnet', anfrageId: null, angebotId: null, rechnungId: 'R-2026-008', notiz: '' },
    { id: 'AU-2026-005', typ: 'vermietung', geraetId: 'bagger',    kundeId: 'k4', von: '2026-06-04', bis: '2026-06-05', vonZeit: '07:00', bisZeit: '17:00', ort: 'Troisdorf', status: 'reserviert', anfrageId: null, angebotId: null, rechnungId: null, notiz: '' },
    { id: 'AU-2026-008', typ: 'vermietung', geraetId: 'ruettler',  kundeId: 'k6', von: '2026-06-05', bis: '2026-06-05', vonZeit: '13:00', bisZeit: '17:00', ort: 'Eitorf', status: 'reserviert', anfrageId: null, angebotId: null, rechnungId: null, notiz: '' },
    { id: 'AU-2026-009', typ: 'vermietung', geraetId: 'bagger',    kundeId: 'k7', von: '2026-06-06', bis: '2026-06-06', vonZeit: '07:00', bisZeit: '14:00', ort: 'Köln-Sülz', status: 'reserviert', anfrageId: null, angebotId: null, rechnungId: null, notiz: '' },
    { id: 'AU-2026-010', typ: 'vermietung', geraetId: 'bagger',    kundeId: 'k4', von: '2026-06-10', bis: '2026-06-11', vonZeit: '07:00', bisZeit: '17:00', ort: 'Neunkirchen-Seelscheid', status: 'angebot', anfrageId: 'anf1', angebotId: 'A-2026-018', rechnungId: null, notiz: '' },
  ];

  // Belegungen — Maschine geblockt OHNE Auftrag: Privat/Familie/Freunde oder Wartung.
  // Erscheinen nur im Kalender, nicht in der Auftragsliste. Kein Status, kein Kunde, keine Rechnung.
  // grund: privat | wartung
  const BELEGUNGEN = [
    { id: 'BL-2026-001', grund: 'privat',  geraetId: 'bagger',   von: '2026-06-03', bis: '2026-06-03', vonZeit: '14:00', bisZeit: '18:00', ort: 'Eigener Garten Lohmar', notiz: 'Eigene Nutzung – nicht vermietbar' },
    { id: 'BL-2026-002', grund: 'wartung', geraetId: 'ruettler', von: '2026-06-04', bis: '2026-06-04', vonZeit: '08:00', bisZeit: '12:00', ort: 'Werkstatt', notiz: 'Inspektion / Funktionsprüfung' },
  ];

  // Eingehende Kundenanfragen (Kontaktformular)
  const ANFRAGEN = [
    { id: 'anf1', datum: '2026-06-01', name: 'Thomas Müller', phone: '0162 3344556', email: 'mueller@web.de', geraetId: 'bagger', von: '2026-06-10', bis: '2026-06-11', ort: 'Neunkirchen-Seelscheid', nachricht: 'Baggerarbeiten für neue Gartenanlage, ca. 1,5 Tage Aushub.', status: 'neu' },
    { id: 'anf2', datum: '2026-06-01', name: 'Florian Weber', phone: '0177 9988770', email: 'f.weber@gmail.com', geraetId: 'anhaenger', von: '2026-06-08', bis: '2026-06-08', ort: 'Overath', nachricht: 'Bauschutt und Gartenabfälle abtransportieren.', status: 'neu' },
  ];
  const BUCHUNGEN = [
    { id: 'b1', datum: '2026-04-19', art: 'e', kategorie: 'Vermietung', text: 'R-2026-001 Krämer', betrag: 560 },
    { id: 'b2', datum: '2026-04-27', art: 'e', kategorie: 'Vermietung', text: 'R-2026-002 Becker', betrag: 390 },
    { id: 'b3', datum: '2026-04-10', art: 'a', kategorie: 'Versicherung', text: 'Maschinenversicherung Q2', betrag: 145 },
    { id: 'b4', datum: '2026-05-02', art: 'e', kategorie: 'Vermietung', text: 'R-2026-003 Wagner', betrag: 175 },
    { id: 'b5', datum: '2026-05-12', art: 'a', kategorie: 'Diesel/Betrieb', text: 'Diesel + AdBlue', betrag: 96.4 },
    { id: 'b6', datum: '2026-05-20', art: 'e', kategorie: 'Vermietung', text: 'R-2026-005 Hövel', betrag: 290 },
    { id: 'b7', datum: '2026-05-22', art: 'a', kategorie: 'Wartung', text: 'Hydraulikölwechsel Bagger', betrag: 210 },
    { id: 'b8', datum: '2026-05-29', art: 'e', kategorie: 'Vermietung', text: 'R-2026-007 Schmitz', betrag: 130 },
  ];

  // ---- Helfer ----
  const fmtEUR = (n) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  };
  const kundeById = (id) => KUNDEN.find((k) => k.id === id);
  const geraetById = (id) => FLOTTE.find((g) => g.id === id);

  const STATUS = {
    offen:          { label: 'Offen',          cls: 'open' },
    bezahlt:        { label: 'Bezahlt',         cls: 'ok' },
    ueberfaellig:   { label: 'Überfällig',      cls: 'warn' },
    mahnung:        { label: 'Mahnung',         cls: 'danger' },
    versendet:      { label: 'Versendet',       cls: 'open' },
    angenommen:     { label: 'Angenommen',      cls: 'ok' },
    abgelaufen:     { label: 'Abgelaufen',      cls: 'draft' },
    reservierung:   { label: 'Reserviert',      cls: 'warn' },
    buchung:        { label: 'Gebucht',         cls: 'ok' },
    // Auftrags-Lebenszyklus
    anfrage:        { label: 'Anfrage',         cls: 'draft' },
    angebot:        { label: 'Angebot',         cls: 'open' },
    reserviert:     { label: 'Reserviert',      cls: 'warn' },
    einsatz:        { label: 'Im Einsatz',      cls: 'open' },
    abgerechnet:    { label: 'Abgerechnet',     cls: 'open' },
    abgeschlossen:  { label: 'Abgeschlossen',   cls: 'ok' },
    abgelehnt:      { label: 'Abgelehnt',       cls: 'danger' },
    // Auftragstypen (für Belegungen ohne Lebenszyklus)
    vermietung:     { label: 'Vermietung',      cls: 'ok' },
    eigennutzung:   { label: 'Eigennutzung',    cls: 'draft' },
    wartung:        { label: 'Wartung',         cls: 'danger' },
  };

  // Lebenszyklus eines Vermietungs-Auftrags (für die Statuszeile/Stepper)
  // 'einsatz' ist kein manueller Schritt mehr – „läuft gerade" wird aus dem Datum abgeleitet.
  const AUFTRAG_FLOW = ['anfrage', 'angebot', 'reserviert', 'abgeschlossen', 'abgerechnet', 'bezahlt'];
  const AUFTRAG_TYP = {
    vermietung:   { label: 'Vermietung',   farbe: '#2B6CB0' },
    eigennutzung: { label: 'Eigennutzung', farbe: '#6B6B66' },
    wartung:      { label: 'Wartung',      farbe: '#C05621' },
  };
  // Belegungs-Gründe (Maschine ohne Auftrag geblockt)
  const BELEGUNG_GRUND = {
    privat:  { label: 'Privat / Verleih', farbe: '#6B6B66' },
    wartung: { label: 'Wartung',          farbe: '#C05621' },
  };

  // Einstellungen — ersetzen fest verdrahtete Werte (editierbar auf der Einstellungsseite)
  const SETTINGS = {
    zahlungszielTage: 14,       // Fälligkeit einer Rechnung ab Rechnungsdatum
    angebotGueltigTage: 14,     // Standard-Gültigkeit eines neuen Angebots
    angebotVorlaufTage: 3,      // Mindest-Vorlauf: so viele Tage vor Arbeitsbeginn sollte ein Angebot spätestens raus
    geschaeftszeitVon: 7,       // Kalender-Wochenansicht: erste Stunde
    geschaeftszeitBis: 19,      // Kalender-Wochenansicht: letzte Stunde
    // Vermiet-Wochentage (Index 0=Sonntag … 6=Samstag). Abgewählte Tage:
    // an dem Tag keine Buchung möglich UND sie zählen nicht als Miettag (Enddatum verschiebt sich).
    mietWochentage: [false, true, true, true, true, true, true],
    nummern: {                  // Nummernkreise: Präfix + Startnummer (Untergrenze)
      rechnung: { prefix: 'R',  start: 1 },
      angebot:  { prefix: 'A',  start: 1 },
      auftrag:  { prefix: 'AU', start: 1 },
      belegung: { prefix: 'BL', start: 1 },
    },
  };

  const APP_TODAY = '2026-06-02';          // „Heute" in der Demo
  const WEEK = ['2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-06','2026-06-07'];

  // Kennzahlen dynamisch aus dem aktuellen Datenstand berechnen
  function computeMetrics(db) {
    const R = db.rechnungen, T = db.auftraege || db.termine || [];
    const sumStatus = (s) => R.filter((r) => r.status === s).reduce((a, r) => a + r.betrag, 0);
    const cntStatus = (s) => R.filter((r) => r.status === s).length;
    const monat = (ym) => R.filter((r) => r.datum.startsWith(ym)).reduce((a, r) => a + r.betrag, 0);
    const eingenommen = (ym) => R.filter((r) => r.status === 'bezahlt' && (r.bezahltAm || '').startsWith(ym)).reduce((a, r) => a + r.betrag, 0);
    // Bagger-Auslastung diese Woche
    const baggerDays = WEEK.filter((d) => T.some((t) => t.geraetId === 'bagger' && d >= t.von && d <= t.bis)).length;
    return {
      umsatzMonat: monat('2026-06'), umsatzVormonat: monat('2026-05'),
      eingenommenMonat: eingenommen('2026-06'),
      offenBetrag: sumStatus('offen'), offenAnzahl: cntStatus('offen'),
      ueberBetrag: sumStatus('ueberfaellig'), ueberAnzahl: cntStatus('ueberfaellig'),
      mahnBetrag: sumStatus('mahnung'), mahnAnzahl: cntStatus('mahnung'),
      angebotBetrag: db.angebote.filter((a) => a.status === 'offen').reduce((a, x) => a + x.betrag, 0),
      angebotAnzahl: db.angebote.filter((a) => a.status === 'offen').length,
      auslastung: Math.round(baggerDays / 7 * 100),
      aktiveEinsaetze: T.length,
    };
  }

  window.FRIESEN = {
    COMPANY, FLOTTE, PREISLISTE, KUNDEN, RECHNUNGEN, ANGEBOTE, AUFTRAEGE, BELEGUNGEN, BUCHUNGEN, ANFRAGEN, STATUS,
    AUFTRAG_FLOW, AUFTRAG_TYP, BELEGUNG_GRUND, SETTINGS,
    fmtEUR, fmtDate, kundeById, geraetById, computeMetrics, APP_TODAY, WEEK,
    // Kennzahlen für die statischen Canvas-Mockups (Dashboard-Varianten)
    metrics: computeMetrics({ rechnungen: RECHNUNGEN, angebote: ANGEBOTE, auftraege: AUFTRAEGE }),
  };
})();
