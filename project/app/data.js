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

  // Abrechnungsmodell eines Geräts (steuert später die Zeitachse im Anfrage-Screen)
  //   tag     = ganze Miettage (Bagger, Rüttler)
  //   stunde  = freie Stundenwahl
  //   staffel = feste Blocklängen aus dem Tarif (Anhänger: 4h / 8h / Tag), auf der Zeitachse verschiebbar
  const ABRECHNUNG_MODELLE = {
    tag:     { label: 'Tagesweise',        kurz: 'Tag' },
    stunde:  { label: 'Stundenweise',      kurz: 'Std' },
    staffel: { label: 'Staffel (Blöcke)',  kurz: 'Block' },
  };

  // Zusatzleistungen, die einem Gerät zugewiesen werden können (erscheinen im Anfrage-Screen als zuschaltbare Positionen).
  //   stunde     → pro Stunde, Zeitfenster NUR innerhalb des Geräte-Zeitraums (z. B. Fahrer 25 €/Std)
  //   stueckTag  → pro Stück und Miettag, optional erste N inklusive (z. B. Zusatz-Löffel ab 2. = inklusive 1)
  //   auswahl    → Mehrfachauswahl konkreter Geräte (z. B. Löffel), Pool-Regel: erste N inklusive (0 €), jeder weitere preis €/Stück·Tag
  //   anfahrt    → Transport-Pauschalen + km-Satz (≤15 km / ≤30 km / je km darüber)
  //   pauschale  → einmalige Pauschale (z. B. Reinigung 100 €)
  const ZUSATZ_ARTEN = {
    stunde:    { label: 'Pro Stunde',              kurz: '€/Std',      felder: ['preis'] },
    stueckTag: { label: 'Pro Stück & Tag',         kurz: '€/Stk·Tag',  felder: ['preis', 'inklusive'] },
    auswahl:   { label: 'Anbau-Auswahl (Löffel …)', kurz: 'Auswahl',   felder: ['inklusive', 'preis'], geraete: true },
    anfahrt:   { label: 'Anfahrt / Transport',     kurz: 'km-Staffel', felder: ['p15', 'p30', 'kmSatz'] },
    pauschale: { label: 'Pauschale',               kurz: '€ einmalig', felder: ['preis'] },
  };

  // Flotte / Gerätepark — inkl. editierbares Tarif (Einheiten + Preise), Abrechnungsmodell und Zusatzleistungen
  const FLOTTE = [
    { id: 'bagger',    name: '1,9t Minibagger', detail: 'Hitachi ZX18-3 CLR · Bj. 2014 · ohne Fahrer, inkl. ein Löffel', kat: 'Maschine',
      kuerzel: 'BA', farbe: '#F7C72A', modell: 'tag',
      tarif: [{ einheit: 'Tag', preis: 60 }],
      zusatz: [
        { id: 'z_fahrer',    art: 'stunde',    label: 'Mit Fahrer',           preis: 25 },
        { id: 'z_loeffel',   art: 'auswahl',   label: 'Löffel / Anbaugerät',  geraetIds: ['tl40', 'tl60', 'grl'], inklusive: 1, preis: 5 },
        { id: 'z_anfahrt',   art: 'anfahrt',   label: 'Transport / Anfahrt',  p15: 50, p30: 100, kmSatz: 1 },
        { id: 'z_reinigung', art: 'pauschale', label: 'Reinigungspauschale',  preis: 100 },
      ] },
    { id: 'anhaenger', name: 'Plateauanhänger', detail: '2.700 kg GVW · 2×4 m · Auffahrrampen', kat: 'Transport',
      kuerzel: 'PL', farbe: '#2B6CB0', modell: 'staffel',
      tarif: [{ einheit: '4 Stunden', preis: 35 }, { einheit: '8 Stunden', preis: 50 }, { einheit: 'Tag', preis: 60 }],
      zusatz: [] },
    { id: 'ruettler',  name: 'Betonrüttler', detail: 'Betrieb 230 V Stromanschluss', kat: 'Maschine',
      kuerzel: 'RÜ', farbe: '#8B5E3C', modell: 'tag',
      tarif: [{ einheit: 'Tag', preis: 20 }],
      zusatz: [] },
    { id: 'tl40',      name: 'Tieflöffel 40 cm', detail: 'Anbaugerät Bagger', kat: 'Anbau',
      kuerzel: 'TL', farbe: '#6B6B66', modell: 'tag',
      tarif: [{ einheit: 'inklusive', preis: 0 }], zusatz: [] },
    { id: 'tl60',      name: 'Tieflöffel 60 cm', detail: 'Anbaugerät Bagger', kat: 'Anbau',
      kuerzel: 'TL', farbe: '#6B6B66', modell: 'tag',
      tarif: [{ einheit: 'inklusive', preis: 0 }], zusatz: [] },
    { id: 'grl',       name: 'Grabenräumlöffel 1,00 m', detail: 'Anbaugerät Bagger', kat: 'Anbau',
      kuerzel: 'GR', farbe: '#6B6B66', modell: 'tag',
      tarif: [{ einheit: 'inklusive', preis: 0 }], zusatz: [] },
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
    { id: 'k8', name: 'GaLaBau Thelen', kontakt: 'Markus Thelen', street: 'Hauptstraße 44', city: '53804 Much', phone: '02245 91200', email: 'info@galabau-thelen.de', typ: 'Gewerbe' },
    { id: 'k9', name: 'Familie Becker', kontakt: 'Andrea Becker', street: 'Am Hang 7', city: '51503 Rösrath', phone: '0173 4455667', email: 'a.becker@web.de', typ: 'Privat' },
    { id: 'k10', name: 'Hoch- und Tiefbau Klein GmbH', kontakt: 'D. Klein', street: 'Industriestraße 3', city: '53773 Hennef', phone: '02242 870900', email: 'bau@klein-hennef.de', typ: 'Gewerbe' },
    { id: 'k11', name: 'Herr Özdemir', kontakt: 'M. Özdemir', street: 'Ringstraße 18', city: '53721 Siegburg', phone: '0151 22334455', email: 'm.oezdemir@gmx.de', typ: 'Privat' },
  ];

  // Positions-Vorlagen — echte Preise laut Preisliste (Stand Juni 2026).
  const P = {
    bagger:    (n) => ({ text: '1,9t Minibagger Hitachi ZX18-3', einheit: 'Tag',       menge: n, preis: 60 }),
    anh4h:     ()  => ({ text: 'Plateauanhänger 2.700 kg',       einheit: '4 Stunden', menge: 1, preis: 35 }),
    anh8h:     ()  => ({ text: 'Plateauanhänger 2.700 kg',       einheit: '8 Stunden', menge: 1, preis: 50 }),
    anhTag:    (n) => ({ text: 'Plateauanhänger 2.700 kg',       einheit: 'Tag',       menge: n, preis: 60 }),
    ruet:      (n) => ({ text: 'Betonrüttler (230 V)',           einheit: 'Tag',       menge: n, preis: 20 }),
    fahrer:    (h) => ({ text: '1,9t Bagger mit Fahrer',         einheit: 'Stunde',    menge: h, preis: 25 }),
    loeffel:   (n) => ({ text: 'Zusatz-Löffel (ab 2.)',          einheit: 'Tag',       menge: n, preis: 5 }),
    t15:       ()  => ({ text: 'Transport bis 15 km (Anlieferung & Abholung)', einheit: 'Pauschale', menge: 1, preis: 50 }),
    t30:       ()  => ({ text: 'Transport bis 30 km (Anlieferung & Abholung)', einheit: 'Pauschale', menge: 1, preis: 100 }),
    reinigung: ()  => ({ text: 'Reinigungspauschale',            einheit: 'Pauschale', menge: 1, preis: 100 }),
  };
  const sum = (pos) => pos.reduce((a, p) => a + p.menge * p.preis, 0);
  // Geräte-Zeile eines Auftrags (mit Einheit + Dauer, damit Positionen/Preise korrekt abgeleitet werden).
  const gd = (geraetId, von, bis, einheit, dauer, vonZeit = '07:00', bisZeit = '17:00') => ({ geraetId, von, bis, vonZeit, bisZeit, einheit, dauer });
  // Auftrag bauen: spiegelt das erste Gerät auf die Primärfelder (Abwärtskompatibilität).
  const mkAuf = (id, kundeId, ort, status, geraete, links = {}) => {
    const g0 = geraete[0];
    return {
      id, typ: 'vermietung', kundeId, ort, status, geraete,
      geraetId: g0.geraetId, von: g0.von, bis: g0.bis, vonZeit: g0.vonZeit, bisZeit: g0.bisZeit,
      anfrageId: links.anfrageId || null, angebotId: links.angebotId || null, rechnungId: links.rechnungId || null, notiz: links.notiz || '',
    };
  };

  // Rechnungen — Status: offen | bezahlt | ueberfaellig | mahnung
  const mkR = (o, positionen) => ({ ...o, positionen, betrag: sum(positionen) });
  const RECHNUNGEN = [
    mkR({ id: 'R-2026-001', kundeId: 'k1',  datum: '2026-04-08', faellig: '2026-04-22', status: 'bezahlt', bezahltAm: '2026-04-17', auftragId: 'AU-2026-001' }, [P.bagger(3), P.t15()]),
    mkR({ id: 'R-2026-002', kundeId: 'k2',  datum: '2026-04-14', faellig: '2026-04-28', status: 'bezahlt', bezahltAm: '2026-04-22', auftragId: 'AU-2026-002' }, [P.bagger(1), P.anhTag(1), P.t15()]),
    mkR({ id: 'R-2026-003', kundeId: 'k8',  datum: '2026-04-24', faellig: '2026-05-08', status: 'bezahlt', bezahltAm: '2026-05-03', auftragId: 'AU-2026-003' }, [P.bagger(3), P.fahrer(6), P.t30()]),
    mkR({ id: 'R-2026-004', kundeId: 'k3',  datum: '2026-04-28', faellig: '2026-05-12', status: 'bezahlt', bezahltAm: '2026-05-05', auftragId: 'AU-2026-004' }, [P.anh8h()]),
    mkR({ id: 'R-2026-006', kundeId: 'k10', datum: '2026-05-07', faellig: '2026-05-21', status: 'bezahlt', bezahltAm: '2026-05-18', auftragId: 'AU-2026-006' }, [P.bagger(4), P.t30()]),
    mkR({ id: 'R-2026-009', kundeId: 'k4',  datum: '2026-05-13', faellig: '2026-05-27', status: 'mahnung', mahnstufe: 1, auftragId: 'AU-2026-009' }, [P.bagger(3), P.reinigung(), P.t15()]),
    mkR({ id: 'R-2026-005', kundeId: 'k5',  datum: '2026-05-21', faellig: '2026-06-04', status: 'bezahlt', bezahltAm: '2026-05-29', auftragId: 'AU-2026-005' }, [P.bagger(3), P.ruet(2), P.t15()]),
    mkR({ id: 'R-2026-007', kundeId: 'k6',  datum: '2026-05-25', faellig: '2026-06-08', status: 'bezahlt', bezahltAm: '2026-06-01', auftragId: 'AU-2026-007' }, [P.ruet(1)]),
    mkR({ id: 'R-2026-008', kundeId: 'k9',  datum: '2026-05-27', faellig: '2026-06-10', status: 'bezahlt', bezahltAm: '2026-06-01', auftragId: 'AU-2026-008' }, [P.bagger(2), P.loeffel(2), P.t15()]),
    mkR({ id: 'R-2026-010', kundeId: 'k7',  datum: '2026-05-11', faellig: '2026-05-25', status: 'offen', auftragId: 'AU-2026-010' }, [P.anh4h(), P.t15()]),
    mkR({ id: 'R-2026-011', kundeId: 'k2',  datum: '2026-06-01', faellig: '2026-06-15', status: 'offen', auftragId: 'AU-2026-011' }, [P.bagger(1), P.t15()]),
    mkR({ id: 'R-2026-012', kundeId: 'k9',  datum: '2026-06-01', faellig: '2026-06-15', status: 'offen', auftragId: 'AU-2026-012' }, [P.ruet(1)]),
  ];

  // Angebote — Status: offen | angenommen | abgelaufen
  const mkA = (o, positionen) => ({ ...o, positionen, betrag: sum(positionen) });
  const ANGEBOTE = [
    mkA({ id: 'A-2026-001', kundeId: 'k10', datum: '2026-05-30', gueltigBis: '2026-06-16', status: 'offen', auftragId: 'AU-2026-017' }, [P.bagger(2), P.fahrer(10), P.t30()]),
    mkA({ id: 'A-2026-002', kundeId: 'k4',  datum: '2026-06-01', gueltigBis: '2026-06-19', status: 'offen', auftragId: 'AU-2026-018' }, [P.bagger(3), P.anhTag(1), P.t15()]),
    mkA({ id: 'A-2026-003', kundeId: 'k5',  datum: '2026-05-08', gueltigBis: '2026-05-22', status: 'abgelaufen' }, [P.bagger(2), P.t15()]),
  ];

  // Aufträge — zentrale Klammer über Belegung (Kalender), Angebot und Rechnung.
  // Aufträge sind IMMER Vermietungen an einen Kunden (typ bleibt für Abwärtskompatibilität).
  // status: anfrage → angebot → reserviert → abgerechnet → bezahlt → abgeschlossen
  // Privat-/Wartungs-Blocks stehen separat in BELEGUNGEN (kein Auftrag).
  const AUFTRAEGE = [
    mkAuf('AU-2026-001', 'k1',  'Baustelle Siegburg, Hauptstraße', 'abgeschlossen', [gd('bagger', '2026-04-06', '2026-04-08', 'Tag', 3)], { rechnungId: 'R-2026-001' }),
    mkAuf('AU-2026-002', 'k2',  'Lohmar', 'abgeschlossen', [gd('bagger', '2026-04-14', '2026-04-14', 'Tag', 1), gd('anhaenger', '2026-04-14', '2026-04-14', 'Tag', 1)], { rechnungId: 'R-2026-002' }),
    mkAuf('AU-2026-003', 'k8',  'Much', 'abgeschlossen', [gd('bagger', '2026-04-22', '2026-04-24', 'Tag', 3)], { rechnungId: 'R-2026-003', notiz: 'Mit Fahrer (6 Std).' }),
    mkAuf('AU-2026-004', 'k3',  'Lohmar', 'abgeschlossen', [gd('anhaenger', '2026-04-28', '2026-04-28', '8 Stunden', 1, '08:00', '16:00')], { rechnungId: 'R-2026-004' }),
    mkAuf('AU-2026-006', 'k10', 'Hennef', 'abgeschlossen', [gd('bagger', '2026-05-04', '2026-05-07', 'Tag', 4)], { rechnungId: 'R-2026-006' }),
    mkAuf('AU-2026-009', 'k4',  'Troisdorf', 'abgerechnet', [gd('bagger', '2026-05-11', '2026-05-13', 'Tag', 3)], { rechnungId: 'R-2026-009', notiz: 'Reinigung erforderlich (Lehmboden).' }),
    mkAuf('AU-2026-005', 'k5',  'Much', 'abgeschlossen', [gd('bagger', '2026-05-19', '2026-05-21', 'Tag', 3), gd('ruettler', '2026-05-19', '2026-05-20', 'Tag', 2)], { rechnungId: 'R-2026-005' }),
    mkAuf('AU-2026-007', 'k6',  'Eitorf', 'abgeschlossen', [gd('ruettler', '2026-05-25', '2026-05-25', 'Tag', 1)], { rechnungId: 'R-2026-007' }),
    mkAuf('AU-2026-008', 'k9',  'Rösrath', 'abgeschlossen', [gd('bagger', '2026-05-26', '2026-05-27', 'Tag', 2)], { rechnungId: 'R-2026-008', notiz: 'Zwei Löffel im Einsatz.' }),
    mkAuf('AU-2026-010', 'k7',  'Köln-Sülz', 'abgerechnet', [gd('anhaenger', '2026-05-11', '2026-05-11', '4 Stunden', 1, '08:00', '12:00')], { rechnungId: 'R-2026-010' }),
    mkAuf('AU-2026-011', 'k2',  'Lohmar', 'abgerechnet', [gd('bagger', '2026-06-01', '2026-06-01', 'Tag', 1)], { rechnungId: 'R-2026-011' }),
    mkAuf('AU-2026-012', 'k9',  'Rösrath', 'abgerechnet', [gd('ruettler', '2026-06-01', '2026-06-01', 'Tag', 1)], { rechnungId: 'R-2026-012' }),
    mkAuf('AU-2026-013', 'k8',  'Much', 'reserviert', [gd('bagger', '2026-06-04', '2026-06-05', 'Tag', 2)]),
    mkAuf('AU-2026-014', 'k3',  'Lohmar', 'reserviert', [gd('anhaenger', '2026-06-03', '2026-06-03', '8 Stunden', 1, '08:00', '16:00')]),
    mkAuf('AU-2026-015', 'k6',  'Eitorf', 'reserviert', [gd('ruettler', '2026-06-05', '2026-06-05', 'Tag', 1, '13:00', '17:00')]),
    mkAuf('AU-2026-016', 'k11', 'Siegburg', 'reserviert', [gd('bagger', '2026-06-09', '2026-06-10', 'Tag', 2)]),
    mkAuf('AU-2026-017', 'k10', 'Hennef', 'angebot', [gd('bagger', '2026-06-12', '2026-06-13', 'Tag', 2)], { angebotId: 'A-2026-001', notiz: 'Mit Fahrer (10 Std) angefragt.' }),
    mkAuf('AU-2026-018', 'k4',  'Neunkirchen-Seelscheid', 'angebot', [gd('bagger', '2026-06-16', '2026-06-18', 'Tag', 3), gd('anhaenger', '2026-06-16', '2026-06-16', 'Tag', 1)], { angebotId: 'A-2026-002', anfrageId: 'anf-archiv' }),
  ];

  // Belegungen — Maschine geblockt OHNE Auftrag: Privat/Familie/Freunde oder Wartung.
  // Erscheinen nur im Kalender, nicht in der Auftragsliste. Kein Status, kein Kunde, keine Rechnung.
  // grund: privat | wartung
  const BELEGUNGEN = [
    { id: 'BL-2026-001', grund: 'privat',  geraetId: 'bagger',    von: '2026-06-06', bis: '2026-06-06', vonZeit: '08:00', bisZeit: '14:00', ort: 'Eigener Garten Lohmar', notiz: 'Eigene Nutzung – nicht vermietbar' },
    { id: 'BL-2026-002', grund: 'wartung', geraetId: 'ruettler',  von: '2026-06-11', bis: '2026-06-11', vonZeit: '08:00', bisZeit: '12:00', ort: 'Werkstatt', notiz: 'Inspektion / Funktionsprüfung' },
    { id: 'BL-2026-003', grund: 'privat',  geraetId: 'anhaenger', von: '2026-06-13', bis: '2026-06-13', vonZeit: '09:00', bisZeit: '17:00', ort: 'Umzug Familie', notiz: 'Privat verliehen' },
  ];

  // Eingehende Kundenanfragen (Kontaktformular) – mit gerätespezifischer Einheit + Dauer.
  const mkAnf = (o, g) => ({ ...o, geraete: [g], geraetId: g.geraetId, von: g.von, bis: g.bis, vonZeit: g.vonZeit, bisZeit: g.bisZeit, einheit: g.einheit, dauer: g.dauer, status: 'neu' });
  const ANFRAGEN = [
    mkAnf({ id: 'anf1', datum: '2026-06-01', name: 'Thomas Müller', phone: '0162 3344556', email: 'mueller@web.de', ort: 'Neunkirchen-Seelscheid', nachricht: 'Aushub für neue Gartenanlage, ca. 4 Tage.' },
      gd('bagger', '2026-06-22', '2026-06-25', 'Tag', 4)),
    mkAnf({ id: 'anf2', datum: '2026-06-01', name: 'Florian Weber', phone: '0177 9988770', email: 'f.weber@gmail.com', ort: 'Overath', nachricht: 'Bauschutt und Gartenabfälle abtransportieren.' },
      gd('anhaenger', '2026-06-18', '2026-06-18', '4 Stunden', 1, '08:00', '12:00')),
    mkAnf({ id: 'anf3', datum: '2026-05-31', name: 'Familie Sommer', phone: '0151 78787878', email: 'sommer@t-online.de', ort: 'Rösrath', nachricht: 'Teich ausheben, ca. 2 Tage.' },
      gd('bagger', '2026-06-29', '2026-06-30', 'Tag', 2)),
  ];
  const BUCHUNGEN = [
    { id: 'b1',  datum: '2026-04-17', art: 'e', kategorie: 'Vermietung',    text: 'R-2026-001 Krämer',  betrag: 230 },
    { id: 'b2',  datum: '2026-04-22', art: 'e', kategorie: 'Vermietung',    text: 'R-2026-002 Becker',  betrag: 170 },
    { id: 'b3',  datum: '2026-04-10', art: 'a', kategorie: 'Versicherung',  text: 'Maschinenversicherung Q2', betrag: 145 },
    { id: 'b4',  datum: '2026-05-03', art: 'e', kategorie: 'Vermietung',    text: 'R-2026-003 Thelen',  betrag: 430 },
    { id: 'b5',  datum: '2026-05-05', art: 'e', kategorie: 'Vermietung',    text: 'R-2026-004 Wagner',  betrag: 50 },
    { id: 'b6',  datum: '2026-05-12', art: 'a', kategorie: 'Diesel/Betrieb', text: 'Diesel + AdBlue',    betrag: 96.4 },
    { id: 'b7',  datum: '2026-05-18', art: 'e', kategorie: 'Vermietung',    text: 'R-2026-006 Klein',   betrag: 340 },
    { id: 'b8',  datum: '2026-05-22', art: 'a', kategorie: 'Wartung',       text: 'Hydraulikölwechsel Bagger', betrag: 210 },
    { id: 'b9',  datum: '2026-05-29', art: 'e', kategorie: 'Vermietung',    text: 'R-2026-005 Hövel',   betrag: 270 },
    { id: 'b10', datum: '2026-06-01', art: 'e', kategorie: 'Vermietung',    text: 'R-2026-007 Schmitz', betrag: 20 },
    { id: 'b11', datum: '2026-06-01', art: 'e', kategorie: 'Vermietung',    text: 'R-2026-008 Becker',  betrag: 180 },
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

  // Lebenszyklus eines Vermietungs-Auftrags (für die Statuszeile/Stepper).
  // 'einsatz' = Gerät beim Kunden: wird bei beidseitiger Mietvertrag-Unterschrift gesetzt (oder manuell).
  const AUFTRAG_FLOW = ['anfrage', 'angebot', 'reserviert', 'einsatz', 'abgeschlossen', 'abgerechnet', 'bezahlt'];
  // Kompakte Darstellung: drei Oberthemen mit Zwischenschritten (für den Stepper).
  const AUFTRAG_PHASEN = [
    { key: 'planung',   label: 'Planung',   steps: ['anfrage', 'angebot'] },
    { key: 'einsatz',   label: 'Einsatz',   steps: ['reserviert', 'einsatz', 'abgeschlossen'] },
    { key: 'abschluss', label: 'Abschluss', steps: ['abgerechnet', 'bezahlt'] },
  ];
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
    // Standard-Versandtexte (E-Mail / WhatsApp / SMS). Platzhalter in {…} werden beim Versand ersetzt:
    // {kunde} {nummer} {datum} {betrag} {faellig} {gueltig} {leistungen} {firma} {inhaber} {telefon}
    versandTexte: {
      angebot: [
        'Hallo {kunde},', '',
        'hiermit erhalten Sie unser Angebot {nummer} vom {datum}.', '',
        'Leistungen:', '{leistungen}', '',
        'Gesamtbetrag: {betrag}', 'Gültig bis: {gueltig}', '',
        'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', '',
        'Bei Fragen oder zur Auftragsbestätigung antworten Sie einfach auf diese Nachricht oder rufen Sie uns an:', '{telefon}', '',
        'Mit freundlichen Grüßen', '{inhaber} · {firma}',
      ].join('\n'),
      rechnung: [
        'Hallo {kunde},', '',
        'hiermit erhalten Sie unsere Rechnung {nummer} vom {datum}.', '',
        'Leistungen:', '{leistungen}', '',
        'Gesamtbetrag: {betrag}', '',
        'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', '',
        'Bitte überweisen Sie den Gesamtbetrag bis zum {faellig} unter Angabe der Rechnungsnummer {nummer}.', '',
        'Mit freundlichen Grüßen', '{inhaber} · {firma}',
      ].join('\n'),
      mietvertrag: [
        'Hallo {kunde},', '',
        'anbei der Mietvertrag zu Ihrer Anmietung ({nummer}).', '',
        'Leistungen:', '{leistungen}', '',
        'Gesamtbetrag: {betrag}', '',
        'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', '',
        'Bitte bringen Sie den unterschriebenen Mietvertrag zur Geräteübergabe mit, oder antworten Sie auf diese Nachricht.', '',
        'Mit freundlichen Grüßen', '{inhaber} · {firma}',
      ].join('\n'),
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

  // Ist ein Gerät eigenständig vermietbar? Explizites Feld `vermietbar` schlägt die Kategorie-Ableitung.
  // Standard: Maschine/Transport = ja, Anbau/Zubehör = nein (bis pro Gerät aktiviert).
  function istVermietbar(g) {
    if (!g) return false;
    if (g.vermietbar != null) return !!g.vermietbar;
    return g.kat === 'Maschine' || g.kat === 'Transport';
  }
  window.istVermietbar = istVermietbar;

  window.FRIESEN = {
    COMPANY, FLOTTE, PREISLISTE, KUNDEN, RECHNUNGEN, ANGEBOTE, AUFTRAEGE, BELEGUNGEN, BUCHUNGEN, ANFRAGEN, STATUS,
    AUFTRAG_FLOW, AUFTRAG_PHASEN, AUFTRAG_TYP, BELEGUNG_GRUND, SETTINGS, ABRECHNUNG_MODELLE, ZUSATZ_ARTEN, istVermietbar,
    fmtEUR, fmtDate, kundeById, geraetById, computeMetrics, APP_TODAY, WEEK,
    // Kennzahlen für die statischen Canvas-Mockups (Dashboard-Varianten)
    metrics: computeMetrics({ rechnungen: RECHNUNGEN, angebote: ANGEBOTE, auftraege: AUFTRAEGE }),
  };
})();
