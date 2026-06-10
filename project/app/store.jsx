/* ============================================================
   STORE — localStorage-Persistenz + Mutationen (window.useStore)
   ============================================================ */
const DB_KEY = 'friesen_db_v4';
const { createContext, useContext, useState, useEffect, useCallback, useMemo } = React;

// ---- Verlaufsprotokoll (Aktivitäts-Log): bei Mutationen einen Eintrag voranstellen ----
const VERLAUF_STATUS_LBL = { anfrage: 'Anfrage', angebot: 'Angebot', reserviert: 'Gebucht / reserviert', einsatz: 'Gerät übergeben · Im Einsatz', abgeschlossen: 'Zurückgegeben · abgeschlossen', abgerechnet: 'Abgerechnet', bezahlt: 'Bezahlt', abgelehnt: 'Abgelehnt' };
function verlaufTs() { try { return new Date().toISOString(); } catch (e) { return ''; } }
function withLog(d, typ, text, auftragId) {
  const ev = { id: 'ev' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36), ts: verlaufTs(), typ: typ, text: text, auftragId: auftragId || null };
  return [ev, ...((d && d.verlauf) || [])].slice(0, 500);
}

// Überfällig-Automatik: offene Rechnungen, deren Fälligkeit in der Vergangenheit liegt,
// werden als „überfällig" geführt (nicht-destruktiv, betrifft nur Status 'offen').
function normalizeOverdue(db) {
  const today = (window.FRIESEN && window.FRIESEN.APP_TODAY) || '';
  if (!today || !Array.isArray(db.rechnungen)) return db;
  db.rechnungen = db.rechnungen.map((r) =>
    r.status === 'offen' && r.faellig && r.faellig < today ? { ...r, status: 'ueberfaellig' } : r);
  return db;
}

// Rückverknüpfung: jeder Beleg (Angebot/Rechnung) kennt seinen Auftrag.
// Nötig für „Auftrag öffnen", da die Seed-/Alt-Belege diese ID teils nicht tragen.
function backfillAuftragId(db) {
  if (!Array.isArray(db.auftraege)) return db;
  const setOn = (list, id, auftragId) => {
    if (!id || !Array.isArray(list)) return;
    const item = list.find((x) => x.id === id);
    if (item && !item.auftragId) item.auftragId = auftragId;
  };
  db.auftraege.forEach((a) => {
    setOn(db.angebote, a.angebotId, a.id);
    setOn(db.rechnungen, a.rechnungId, a.id);
  });
  return db;
}

// Mehrgeräte-Auftrag: ein Auftrag kann mehrere Geräte-Buchungen (geraete[]) mit je eigenem Zeitraum haben.
// Die Primärfelder (geraetId/von/bis/vonZeit/bisZeit) werden aus geraete[] gespiegelt – so bleiben alle
// bestehenden Anzeigen (Liste, Dashboard, Flotte) lauffähig, ohne geraete[] kennen zu müssen.
function syncAuftragMirror(a) {
  const gs = Array.isArray(a.geraete) ? a.geraete.filter((g) => g && g.geraetId) : [];
  if (!gs.length) return a;
  const vons = gs.map((g) => g.von).filter(Boolean).sort();
  const bisse = gs.map((g) => g.bis).filter(Boolean).sort();
  return {
    ...a,
    geraetId: gs[0].geraetId,
    von: vons[0] || a.von,
    bis: bisse[bisse.length - 1] || a.bis,
    vonZeit: gs[0].vonZeit || a.vonZeit || '08:00',
    bisZeit: gs[gs.length - 1].bisZeit || a.bisZeit || '17:00',
  };
}
// Einzelnen Auftrag absichern: hat er kein geraete[], aus den Primärfeldern eines bauen; danach spiegeln.
function ensureGeraete(a) {
  if (Array.isArray(a.geraete) && a.geraete.length) return syncAuftragMirror(a);
  const entry = { geraetId: a.geraetId, von: a.von, bis: a.bis, vonZeit: a.vonZeit || '08:00', bisZeit: a.bisZeit || '17:00' };
  if (a.preis != null) entry.preis = a.preis;
  return syncAuftragMirror({ ...a, geraete: a.geraetId ? [entry] : [] });
}
// Migration: Altauftrag (einzelnes geraetId/von/bis) → geraete[]. Bereits migrierte: nur Spiegelung auffrischen.
function normalizeAuftraege(db) {
  if (!Array.isArray(db.auftraege)) return db;
  db.auftraege = db.auftraege.map(ensureGeraete);
  return db;
}

// Mehrgeräte-Anfrage: anfrage.geraete[] mit Start/Dauer/Einheit je Gerät; Primärfelder gespiegelt (Kalender/Verfügbarkeit).
function syncAnfrageMirror(a) {
  const gs = Array.isArray(a.geraete) ? a.geraete.filter((g) => g && g.geraetId) : [];
  if (!gs.length) return a;
  const vons = gs.map((g) => g.von).filter(Boolean).sort();
  const bisse = gs.map((g) => g.bis || g.von).filter(Boolean).sort();
  return { ...a, geraetId: gs[0].geraetId, von: vons[0] || a.von, bis: bisse[bisse.length - 1] || a.bis, vonZeit: gs[0].vonZeit || a.vonZeit, bisZeit: gs[gs.length - 1].bisZeit || a.bisZeit };
}
function ensureAnfrageGeraete(a) {
  if (Array.isArray(a.geraete) && a.geraete.length) return syncAnfrageMirror(a);
  const entry = { geraetId: a.geraetId, von: a.von, vonZeit: a.vonZeit || '08:00', dauer: a.dauer || 1, einheit: a.einheit || 'Tage', bis: a.bis || a.von, bisZeit: a.bisZeit || '17:00' };
  return syncAnfrageMirror({ ...a, geraete: a.geraetId ? [entry] : [] });
}
function normalizeAnfragen(db) {
  if (!Array.isArray(db.anfragen)) return db;
  db.anfragen = db.anfragen.map(ensureAnfrageGeraete);
  return db;
}

function seedDB() {
  const F = window.FRIESEN;
  // tiefe Kopie der Seed-Daten
  const clone = (x) => JSON.parse(JSON.stringify(x));
  return backfillAuftragId(normalizeAnfragen(normalizeAuftraege(normalizeOverdue({
    company: clone(F.COMPANY),
    flotte: clone(F.FLOTTE),
    preisliste: clone(F.PREISLISTE),
    kunden: clone(F.KUNDEN),
    rechnungen: clone(F.RECHNUNGEN),
    angebote: clone(F.ANGEBOTE),
    auftraege: clone(F.AUFTRAEGE),
    belegungen: clone(F.BELEGUNGEN),
    buchungen: clone(F.BUCHUNGEN),
    anfragen: clone(F.ANFRAGEN),
    settings: clone(F.SETTINGS),
    verlauf: [],
  }))));
}

function loadDB() {
  const F = window.FRIESEN;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      // Defensiv: fehlende Felder aus den Defaults ergänzen (z. B. settings bei Alt-Ständen)
      if (!db.belegungen) db.belegungen = [];
      if (!Array.isArray(db.verlauf)) db.verlauf = [];
      // Geräte aus Alt-Ständen um neue Felder (Abrechnungsmodell, Zusatzleistungen) ergänzen
      if (Array.isArray(db.flotte)) {
        db.flotte = db.flotte.map((g) => {
          const seed = (F.FLOTTE || []).find((s) => s.id === g.id);
          const out = { ...g };
          if (out.modell == null) out.modell = (seed && seed.modell) || 'tag';
          if (!Array.isArray(out.zusatz)) out.zusatz = seed ? JSON.parse(JSON.stringify(seed.zusatz || [])) : [];
          return out;
        });
      }
      db.settings = { ...JSON.parse(JSON.stringify(F.SETTINGS)), ...(db.settings || {}) };
      db.settings.nummern = { ...JSON.parse(JSON.stringify(F.SETTINGS.nummern)), ...(db.settings.nummern || {}) };
      if (!Array.isArray(db.settings.mietWochentage)) db.settings.mietWochentage = JSON.parse(JSON.stringify(F.SETTINGS.mietWochentage));
      return backfillAuftragId(normalizeAnfragen(normalizeAuftraege(normalizeOverdue(db))));
    }
  } catch (e) { /* ignore */ }
  return seedDB();
}

const StoreContext = createContext(null);

function StoreProvider({ children }) {
  const [db, setDb] = useState(loadDB);

  useEffect(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {}
  }, [db]);

  // Vermiet-Wochentage global bereitstellen, damit berechneEnde/ZeitraumPicker sie nutzen können
  useEffect(() => {
    window.__miettage = (db.settings && db.settings.mietWochentage) || null;
  }, [db.settings]);

  const F = window.FRIESEN;
  const today = F.APP_TODAY;

  // ---- Helfer ----
  const nextId = useCallback((prefix, list, start = 1) => {
    const nums = list.map((x) => parseInt(String(x.id).split('-').pop(), 10)).filter((n) => !isNaN(n));
    const maxN = nums.length ? Math.max(...nums) : 0;
    const n = Math.max(maxN + 1, start || 1);
    return `${prefix}-2026-${String(n).padStart(3, '0')}`;
  }, []);
  // Nummernkreis-Einstellung lesen (mit Fallback)
  const kreis = (d, kind) => (d.settings && d.settings.nummern && d.settings.nummern[kind]) || { prefix: { rechnung: 'R', angebot: 'A', auftrag: 'AU', belegung: 'BL' }[kind], start: 1 };

  const sumPos = (pos) => (pos || []).reduce((a, p) => a + (p.menge || 0) * (p.preis || 0), 0);

  // Doppelbuchung prüfen: gibt kollidierende Belegung (Auftrag ODER Block) zurück oder null.
  // Mehrgeräte-fähig: jede Geräte-Buchung eines Auftrags wird einzeln gegen geraetId/Zeitraum geprüft.
  // Uhrzeitgenau (abwärtskompatibel): werden vonZeit/bisZeit weggelassen, gilt der ganze Tag
  //   (00:00–23:59) → exakt das alte, rein datumsbasierte Verhalten. Mit Uhrzeiten dürfen sich
  //   zwei Buchungen am selben Tag (z. B. 07–11 und 13–17 Uhr) ohne Konflikt nebeneinander legen.
  const toAbsMin = (iso, time) => {
    if (!iso) return NaN;
    const [y, m, d] = iso.split('-').map(Number);
    const dayNo = Math.round(new Date(y, m - 1, d).getTime() / 86400000);
    const [h, mi] = (time || '00:00').split(':').map(Number);
    return dayNo * 1440 + h * 60 + mi;
  };
  const findConflict = useCallback((geraetId, von, bis, exceptId, vonZeit, bisZeit) => {
    const aS = toAbsMin(von, vonZeit || '00:00');
    const aE = toAbsMin(bis, bisZeit || '23:59');
    const hits = (eVon, eBis, eVonZeit, eBisZeit) => {
      if (eVon == null || eBis == null) return false;
      const s = toAbsMin(eVon, eVonZeit || '00:00'), e = toAbsMin(eBis, eBisZeit || '23:59');
      return s < aE && aS < e;
    };
    for (const a of db.auftraege) {
      if (a.id === exceptId) continue;
      const entries = (Array.isArray(a.geraete) && a.geraete.length) ? a.geraete : [a];
      if (entries.some((e) => e.geraetId === geraetId && hits(e.von, e.bis, e.vonZeit, e.bisZeit))) return a;
    }
    return (db.belegungen || []).find((t) => t.geraetId === geraetId && t.id !== exceptId && hits(t.von, t.bis, t.vonZeit, t.bisZeit)) || null;
  }, [db.auftraege, db.belegungen]);

  // ---- Mutationen ----
  const actions = useMemo(() => ({
    markPaid: (id) => setDb((d) => ({ ...d, rechnungen: d.rechnungen.map((r) => r.id === id ? { ...r, status: 'bezahlt', bezahltAm: today } : r), verlauf: withLog(d, 'rechnung', 'Rechnung ' + id + ' als bezahlt markiert', (d.rechnungen.find((x) => x.id === id) || {}).auftragId) })),
    setStatus: (id, status) => setDb((d) => ({ ...d, rechnungen: d.rechnungen.map((r) => r.id === id ? { ...r, status, ...(status === 'mahnung' ? { mahnstufe: (r.mahnstufe || 0) + 1 } : {}) } : r) })),

    addRechnung: (data) => {
      let newId;
      setDb((d) => {
        const kr = kreis(d, 'rechnung'); newId = nextId(kr.prefix, d.rechnungen, kr.start);
        const r = { ...data, id: newId, betrag: sumPos(data.positionen), status: data.status || 'offen' };
        return { ...d, rechnungen: [r, ...d.rechnungen] };
      });
      return newId;
    },

    // Beleg (Angebot/Rechnung) anlegen UND mit dem Auftrag verknüpfen – alles in EINEM Update
    // (zuverlässig auch in React-Event-Handlern; keine Abhängigkeit von Rückgabe-IDs über mehrere setDb-Aufrufe).
    // auftragId wird vom Aufrufer vorab via store.nextId berechnet (für neuen Auftrag) oder ist bekannt.
    belegAnlegen: ({ kind, auftragId, neuerAuftrag, belegData, anfrageId }) => {
      setDb((d) => {
        let auftraege = d.auftraege;
        if (neuerAuftrag) {
          auftraege = [...auftraege, ensureGeraete({
            typ: 'vermietung', anfrageId: null, angebotId: null, rechnungId: null,
            notiz: '', ort: '', vonZeit: '08:00', bisZeit: '17:00',
            ...neuerAuftrag, id: auftragId,
          })];
        }
        let rechnungen = d.rechnungen, angebote = d.angebote, belegId;
        if (kind === 'angebot') {
          const kr = kreis(d, 'angebot'); belegId = nextId(kr.prefix, d.angebote, kr.start);
          angebote = [{ ...belegData, id: belegId, auftragId, betrag: sumPos(belegData.positionen), status: 'offen' }, ...d.angebote];
        } else {
          const kr = kreis(d, 'rechnung'); belegId = nextId(kr.prefix, d.rechnungen, kr.start);
          rechnungen = [{ ...belegData, id: belegId, auftragId, betrag: sumPos(belegData.positionen), status: 'offen' }, ...d.rechnungen];
        }
        auftraege = auftraege.map((a) => a.id === auftragId
          ? { ...a, [kind === 'angebot' ? 'angebotId' : 'rechnungId']: belegId, status: kind === 'angebot' ? 'angebot' : 'abgerechnet' }
          : a);
        let anfragen = d.anfragen;
        if (anfrageId) anfragen = anfragen.map((x) => x.id === anfrageId ? { ...x, status: 'erledigt' } : x);
        return { ...d, auftraege, rechnungen, angebote, anfragen, verlauf: withLog(d, kind, (kind === 'angebot' ? 'Angebot ' : 'Rechnung ') + belegId + ' erstellt', auftragId) };
      });
    },

    addAngebot: (data) => {
      let newId;
      setDb((d) => {
        const kr = kreis(d, 'angebot'); newId = nextId(kr.prefix, d.angebote, kr.start);
        const a = { ...data, id: newId, betrag: sumPos(data.positionen), status: data.status || 'offen' };
        return { ...d, angebote: [a, ...d.angebote] };
      });
      return newId;
    },

    convertAngebot: (id) => {
      let newId;
      setDb((d) => {
        const a = d.angebote.find((x) => x.id === id);
        if (!a) return d;
        const kr = kreis(d, 'rechnung'); newId = nextId(kr.prefix, d.rechnungen, kr.start);
        const r = {
          id: newId, kundeId: a.kundeId, datum: today,
          faellig: addDays(today, (d.settings && d.settings.zahlungszielTage) || 14), status: 'offen',
          positionen: JSON.parse(JSON.stringify(a.positionen)),
          betrag: a.betrag, ausAngebot: a.id, auftragId: a.auftragId || null,
        };
        // Falls das Angebot zu einem Auftrag gehört: Rechnung verknüpfen + Status hochsetzen
        return {
          ...d,
          rechnungen: [r, ...d.rechnungen],
          angebote: d.angebote.map((x) => x.id === id ? { ...x, status: 'angenommen' } : x),
          auftraege: d.auftraege.map((au) => au.angebotId === id ? { ...au, rechnungId: newId, status: 'abgerechnet' } : au),
          verlauf: withLog(d, 'rechnung', 'Rechnung ' + newId + ' aus Angebot ' + id + ' erstellt', a.auftragId),
        };
      });
      return newId;
    },

    addKunde: (data) => {
      let newId;
      setDb((d) => {
        newId = 'k' + (Math.max(0, ...d.kunden.map((k) => parseInt(k.id.slice(1), 10) || 0)) + 1);
        return { ...d, kunden: [...d.kunden, { ...data, id: newId }] };
      });
      return newId;
    },
    updateKunde: (id, data) => setDb((d) => ({ ...d, kunden: d.kunden.map((k) => k.id === id ? { ...k, ...data } : k) })),

    // ---- Aufträge (Vermietung mit Lebenszyklus) ----
    // Direktbuchung: ohne Status → 'reserviert' (fest gebucht). Mit Angebot-Weg → 'anfrage'/'angebot'.
    addAuftrag: (data) => {
      let newId;
      setDb((d) => {
        const kr = kreis(d, 'auftrag'); newId = nextId(kr.prefix, d.auftraege, kr.start);
        const a = ensureGeraete({
          typ: 'vermietung', anfrageId: null, angebotId: null, rechnungId: null,
          notiz: '', ort: '', vonZeit: '08:00', bisZeit: '17:00', status: 'reserviert',
          ...data, id: newId,
        });
        return { ...d, auftraege: [...d.auftraege, a] };
      });
      return newId;
    },
    updateAuftrag: (id, patch) => setDb((d) => ({ ...d, auftraege: d.auftraege.map((a) => a.id === id ? ensureGeraete({ ...a, ...patch }) : a) })),

    // ---- Auftrag verlängern (atomar: Zeitraum + primäres Gerät + Mietvertrag + Rechnung je Status) ----
    // Erwartet vorab berechnete Werte aus dem UI: neuBis, neuDauer (Miettage des 1. Geräts),
    // zusatzPos/zusatzBetrag (nur die zusätzlichen Tage). Gibt Info zurück (z. B. neue Zusatzrechnung).
    verlaengern: (auftragId, { neuBis, neuDauer, zusatzPos, zusatzBetrag }) => {
      const sumPos = (pos) => (pos || []).reduce((s, p) => s + (Number(p.menge) || 0) * (Number(p.preis) || 0), 0);
      const info = {};
      setDb((d) => {
        const a0 = d.auftraege.find((x) => x.id === auftragId);
        if (!a0) return d;
        const liste = (a0.geraete && a0.geraete.length) ? a0.geraete : [{ geraetId: a0.geraetId, von: a0.von, bis: a0.bis, vonZeit: a0.vonZeit, bisZeit: a0.bisZeit, einheit: a0.einheit, dauer: a0.dauer }];
        const geraete = liste.map((g, i) => i === 0 ? { ...g, bis: neuBis, dauer: neuDauer } : g);
        const g0 = geraete[0] || {};
        const dev = (d.flotte || []).find((x) => x.id === g0.geraetId);
        const devName = dev ? dev.name : (g0.geraetId || '');
        const tagPreis = ((dev && dev.tarif) || []).find((t) => /tag/i.test(t.einheit));
        const tp = tagPreis ? Number(tagPreis.preis) : null;
        // Tag-Position des 1. Geräts auf die neue Menge setzen (Extras bleiben unangetastet).
        // Treffer = Name passt ODER (Einheit „Tag" und Tagespreis passt); nur die erste solche Position.
        const bump = (pos) => { let done = false; return (pos || []).map((p) => { const treffer = !done && /tag/i.test(p.einheit || '') && (p.text === devName || (tp != null && Number(p.preis) === tp)); if (treffer) { done = true; return { ...p, menge: neuDauer }; } return p; }); };

        let auftraege = d.auftraege.map((x) => {
          if (x.id !== auftragId) return x;
          let next = { ...x, bis: neuBis, geraete, geraetId: g0.geraetId, von: g0.von, vonZeit: g0.vonZeit, bisZeit: g0.bisZeit };
          if (x.mietvertrag) {
            const mv = x.mietvertrag;
            if (mv.gesperrt) {
              const nachtraege = [...(mv.nachtraege || []), { datum: today, bis: neuBis, positionen: zusatzPos, betrag: zusatzBetrag }];
              next = { ...next, mietvertrag: { ...mv, nachtraege } };
            } else {
              const positionen = bump(mv.positionen);
              next = { ...next, mietvertrag: { ...mv, bis: neuBis, positionen, betrag: sumPos(positionen) } };
            }
          }
          return next;
        });

        let rechnungen = d.rechnungen;
        if (a0.rechnungId) {
          const r = d.rechnungen.find((rr) => rr.id === a0.rechnungId);
          if (r && r.status === 'bezahlt') {
            const kr = kreis(d, 'rechnung'); const rid = nextId(kr.prefix, d.rechnungen, kr.start);
            rechnungen = [{ id: rid, kundeId: r.kundeId, datum: today, faellig: addDays(today, (d.settings && d.settings.zahlungszielTage) || 14), status: 'offen', positionen: zusatzPos, betrag: zusatzBetrag, auftragId, ausVerlaengerung: r.id }, ...d.rechnungen];
            info.zusatzRechnung = rid;
          } else if (r) {
            const positionen = bump(r.positionen);
            rechnungen = d.rechnungen.map((rr) => rr.id === r.id ? { ...rr, positionen, betrag: sumPos(positionen) } : rr);
            info.rechnungAngepasst = r.id;
          }
        }
        return { ...d, auftraege, rechnungen };
      });
      return info;
    },
    // ---- Mehrgeräte je Auftrag ----
    // Geräte-Buchung hinzufügen (Konfliktprüfung erfolgt im UI vor dem Aufruf). Mirror wird neu gespiegelt.
    auftragGeraetAdd: (auftragId, entry) => setDb((d) => ({ ...d, auftraege: d.auftraege.map((a) =>
      a.id === auftragId ? syncAuftragMirror({ ...a, geraete: [...(a.geraete || []), entry] }) : a) })),
    auftragGeraetUpdate: (auftragId, index, patch) => setDb((d) => ({ ...d, auftraege: d.auftraege.map((a) =>
      a.id === auftragId ? syncAuftragMirror({ ...a, geraete: (a.geraete || []).map((g, i) => i === index ? { ...g, ...patch } : g) }) : a) })),
    auftragGeraetRemove: (auftragId, index) => setDb((d) => ({ ...d, auftraege: d.auftraege.map((a) => {
      if (a.id !== auftragId) return a;
      const geraete = (a.geraete || []).filter((_, i) => i !== index);
      return geraete.length ? syncAuftragMirror({ ...a, geraete }) : { ...a, geraete };
    }) })),
    setAuftragStatus: (id, status) => setDb((d) => ({ ...d, auftraege: d.auftraege.map((a) => a.id === id ? { ...a, status } : a), verlauf: withLog(d, 'status', 'Status: ' + (VERLAUF_STATUS_LBL[status] || status), id) })),
    // Auftrag abschließen: Rückgabeprotokoll festhalten, Status „abgeschlossen" +
    // automatisch ins Geräte-Logbuch übertragen (Eintrag + Betriebsstunden aktualisieren).
    auftragAbschliessen: (id, rueckgabe) => setDb((d) => {
      const auf = d.auftraege.find((a) => a.id === id);
      const stamp = { ...(rueckgabe || {}), datum: (rueckgabe && rueckgabe.datum) || today };
      const auftraege = d.auftraege.map((a) => a.id === id ? { ...a, status: 'abgeschlossen', rueckgabe: stamp } : a);
      let flotte = d.flotte;
      if (auf && auf.geraetId) {
        const kunde = d.kunden.find((k) => k.id === auf.kundeId);
        const maengel = stamp.zustand === 'maengel';
        const eintrag = {
          id: 'log_' + Date.now(), typ: 'rueckgabe', datum: stamp.datum, auftragId: id,
          text: `Rückgabe${kunde ? ' – ' + kunde.name : ''}: ${maengel ? 'Mängel' : 'i. O.'}${maengel && stamp.mangel ? ' (' + stamp.mangel + ')' : ''}, ${stamp.betankung === 'nachtanken' ? 'Nachtanken nötig' : 'vollgetankt'}${stamp.notiz ? ' · ' + stamp.notiz : ''}`,
          stunden: stamp.stunden || '', mangel: maengel ? (stamp.mangel || '') : '', fotos: [],
        };
        flotte = d.flotte.map((g) => g.id === auf.geraetId
          ? { ...g, betriebsstunden: stamp.stunden || g.betriebsstunden, protokoll: [eintrag, ...(g.protokoll || [])] }
          : g);
      }
      return { ...d, auftraege, flotte, verlauf: withLog(d, 'rueckgabe', 'Rückgabe erfasst · Auftrag abgeschlossen' + (stamp.zustand === 'maengel' ? ' (Mängel)' : ''), id) };
    }),
    // Geräte-Logbuch: manuelle Einträge (Mangel/Reparatur/Notiz)
    geraetProtokollAdd: (geraetId, entry) => setDb((d) => ({ ...d, flotte: d.flotte.map((g) => g.id === geraetId ? { ...g, protokoll: [{ id: 'log_' + Date.now(), datum: today, fotos: [], ...entry }, ...(g.protokoll || [])] } : g) })),
    geraetProtokollDelete: (geraetId, logId) => setDb((d) => ({ ...d, flotte: d.flotte.map((g) => g.id === geraetId ? { ...g, protokoll: (g.protokoll || []).filter((e) => e.id !== logId) } : g) })),
    // Status setzen + nachfolgende Schritte konsistent zurücksetzen.
    // Wird der Auftrag vor 'bezahlt' zurückgesetzt, wird eine bereits bezahlte Rechnung wieder offen.
    setAuftragStatusKaskade: (id, status) => setDb((d) => {
      const flow = (window.FRIESEN && window.FRIESEN.AUFTRAG_FLOW) || [];
      const idx = flow.indexOf(status);
      const a = d.auftraege.find((x) => x.id === id);
      let rechnungen = d.rechnungen;
      if (a && a.rechnungId && idx < flow.indexOf('bezahlt')) {
        rechnungen = d.rechnungen.map((r) => r.id === a.rechnungId && r.status === 'bezahlt'
          ? { ...r, status: r.faellig && r.faellig < today ? 'ueberfaellig' : 'offen', bezahltAm: undefined } : r);
      }
      return { ...d, rechnungen, auftraege: d.auftraege.map((x) => x.id === id ? { ...x, status } : x), verlauf: withLog(d, 'status', 'Status korrigiert auf: ' + (VERLAUF_STATUS_LBL[status] || status), id) };
    }),
    // Mietvertrag: eine Partei unterschreibt. Sind beide Unterschriften da → Mietvertrag UND das verknüpfte
    // Angebot sperren (read-only). Die Rechnung bleibt bewusst editierbar (z. B. für Nachberechnungen).
    mietvertragSign: (auftragId, who, dataUrl) => setDb((d) => {
      let lockAngebotId = null;
      const auftraege = d.auftraege.map((a) => {
        if (a.id !== auftragId) return a;
        const prev = a.mietvertrag || {};
        if (prev.gesperrt) return a; // bereits gesperrt – keine Änderung
        const mv = { ...prev, datum: prev.datum || today };
        if (who === 'v') mv.signaturVermieter = dataUrl;
        if (who === 'm') mv.signaturMieter = dataUrl;
        // Vermieter-Unterschrift automatisch aus den Einstellungen übernehmen, falls dort hinterlegt
        if (!mv.signaturVermieter && d.company && d.company.signaturVermieter) mv.signaturVermieter = d.company.signaturVermieter;
        // Inhalt beim ersten Unterschreiben festhalten (falls nicht zuvor bearbeitet) – Vertrag wird unveränderlich.
        if (!mv.positionen) {
          const r = a.rechnungId ? d.rechnungen.find((x) => x.id === a.rechnungId) : null;
          const ang = a.angebotId ? d.angebote.find((x) => x.id === a.angebotId) : null;
          mv.positionen = (r && r.positionen) || (ang && ang.positionen) || null;
        }
        if (mv.von == null) mv.von = a.von || null;
        if (mv.bis == null) mv.bis = a.bis || null;
        const beide = mv.signaturVermieter && mv.signaturMieter;
        if (beide) { mv.gesperrt = true; lockAngebotId = a.angebotId || null; }
        // Beidseitig unterschrieben = Übergabe → Gerät „Im Einsatz" (nur aus reserviert heraus).
        const status = (beide && a.status === 'reserviert') ? 'einsatz' : a.status;
        return { ...a, mietvertrag: mv, status };
      });
      // Verknüpftes Angebot mitsperren, sobald der Vertrag beidseitig unterschrieben ist
      const angebote = lockAngebotId ? d.angebote.map((x) => x.id === lockAngebotId ? { ...x, gesperrt: true } : x) : d.angebote;
      const txt = lockAngebotId ? 'Mietvertrag beidseitig unterschrieben → Gerät übergeben' : ('Mietvertrag unterschrieben (' + (who === 'm' ? 'Mieter' : 'Vermieter') + ')');
      return { ...d, auftraege, angebote, verlauf: withLog(d, 'mietvertrag', txt, auftragId) };
    }),
    // Mietvertrag-Inhalt eigenständig bearbeiten (Positionen, Zeitraum). Nur solange nicht gesperrt.
    mietvertragUpdate: (auftragId, patch) => setDb((d) => ({
      ...d,
      auftraege: d.auftraege.map((a) => {
        if (a.id !== auftragId) return a;
        const prev = a.mietvertrag || {};
        if (prev.gesperrt) return a; // unterschrieben & gesperrt – unveränderlich
        return { ...a, mietvertrag: { ...prev, datum: prev.datum || today, ...patch } };
      }),
    })),
    // Kunde hat ein versendetes Angebot angenommen → Auftrag fest buchen, Angebot abhaken
    angebotAnnehmen: (auftragId) => setDb((d) => {
      const au = d.auftraege.find((x) => x.id === auftragId);
      if (!au) return d;
      return {
        ...d,
        auftraege: d.auftraege.map((x) => x.id === auftragId ? { ...x, status: 'reserviert' } : x),
        angebote: au.angebotId ? d.angebote.map((x) => x.id === au.angebotId ? { ...x, status: 'angenommen' } : x) : d.angebote,
      };
    }),
    // Auftrag löschen → verknüpftes Angebot und verknüpfte Rechnung mit entfernen (Kaskade)
    deleteAuftrag: (id) => setDb((d) => {
      const a = d.auftraege.find((x) => x.id === id);
      if (!a) return d;
      return {
        ...d,
        auftraege: d.auftraege.filter((x) => x.id !== id),
        angebote: a.angebotId ? d.angebote.filter((x) => x.id !== a.angebotId) : d.angebote,
        rechnungen: a.rechnungId ? d.rechnungen.filter((x) => x.id !== a.rechnungId) : d.rechnungen,
      };
    }),

    // ---- Belegungen (Maschine ohne Auftrag blocken: Privat/Familie/Wartung) ----
    addBelegung: (data) => {
      let newId;
      setDb((d) => {
        const kr = kreis(d, 'belegung'); newId = nextId(kr.prefix, d.belegungen || [], kr.start);
        const b = { grund: 'privat', notiz: '', ort: '', vonZeit: '08:00', bisZeit: '17:00', ...data, id: newId };
        return { ...d, belegungen: [...(d.belegungen || []), b] };
      });
      return newId;
    },
    updateBelegung: (id, patch) => setDb((d) => ({ ...d, belegungen: (d.belegungen || []).map((b) => b.id === id ? { ...b, ...patch } : b) })),
    deleteBelegung: (id) => setDb((d) => ({ ...d, belegungen: (d.belegungen || []).filter((b) => b.id !== id) })),

    // Legacy-Wrapper: Angebot-Versand legt für Standalone-Angebote eine reservierende Vermietung an
    addTermin: (data) => setDb((d) => {
      const kr = kreis(d, 'auftrag'); const newId = nextId(kr.prefix, d.auftraege, kr.start);
      const angebotId = data.angebotId || (data.quellTyp === 'reservierung' ? data.quellId : null) || null;
      const status = data.status || (angebotId ? 'angebot' : 'reserviert');
      const a = { typ: 'vermietung', anfrageId: null, rechnungId: null, notiz: '', ...data, id: newId, angebotId, status };
      const angebote = angebotId ? d.angebote.map((x) => x.id === angebotId ? { ...x, auftragId: newId } : x) : d.angebote;
      return { ...d, auftraege: [...d.auftraege, a], angebote };
    }),
    deleteTermin: (id) => setDb((d) => ({ ...d, auftraege: d.auftraege.filter((t) => t.id !== id) })),

    updateGeraet: (id, patch) => setDb((d) => ({ ...d, flotte: d.flotte.map((g) => g.id === id ? { ...g, ...patch } : g) })),
    addGeraet: (data) => {
      let newId;
      setDb((d) => {
        newId = 'geraet_' + Date.now();
        return { ...d, flotte: [...d.flotte, { ...data, id: newId }] };
      });
      return newId;
    },
    deleteGeraet: (id) => setDb((d) => ({ ...d, flotte: d.flotte.filter((g) => g.id !== id) })),
    updatePreisliste: (id, patch) => setDb((d) => ({ ...d, preisliste: d.preisliste.map((p) => p.id === id ? { ...p, ...patch } : p) })),
    addPreisliste: (data) => setDb((d) => ({ ...d, preisliste: [...d.preisliste, { ...data, id: 'pl_' + Date.now() }] })),
    deletePreisliste: (id) => setDb((d) => ({ ...d, preisliste: d.preisliste.filter((p) => p.id !== id) })),
    setAngebotStatus: (id, status) => setDb((d) => ({ ...d, angebote: d.angebote.map((a) => a.id === id ? { ...a, status } : a) })),
    // Rechnung bearbeiten (Positionen/Zeitraum/Datum). Betrag wird bei Positions-Änderung neu berechnet.
    updateRechnung: (id, patch) => setDb((d) => ({ ...d, rechnungen: d.rechnungen.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (patch.positionen) next.betrag = sumPos(patch.positionen);
      return next;
    }) })),
    // Versand festhalten (Datum + Kanal) – für Angebot, Rechnung und Mietvertrag (am Auftrag).
    belegVersendet: (kind, id, kanal) => setDb((d) => {
      const stamp = { versendetAm: today, versendetUeber: kanal || null };
      const kindLbl = kind === 'rechnung' ? 'Rechnung' : kind === 'mietvertrag' ? 'Mietvertrag' : 'Angebot';
      const txt = kindLbl + ' versendet' + (kanal ? ' (' + kanal + ')' : '');
      if (kind === 'rechnung') { const r0 = d.rechnungen.find((r) => r.id === id) || {}; return { ...d, rechnungen: d.rechnungen.map((r) => r.id === id ? { ...r, ...stamp } : r), verlauf: withLog(d, 'rechnung', txt, r0.auftragId) }; }
      if (kind === 'mietvertrag') return { ...d, auftraege: d.auftraege.map((a) => a.id === id ? { ...a, mietvertrag: { ...(a.mietvertrag || {}), ...stamp } } : a), verlauf: withLog(d, 'mietvertrag', txt, id) };
      const a0 = d.angebote.find((a) => a.id === id) || {};
      return { ...d, angebote: d.angebote.map((a) => a.id === id ? { ...a, ...stamp } : a), verlauf: withLog(d, 'angebot', txt, a0.auftragId) };
    }),
    updateAngebot: (id, patch) => setDb((d) => ({ ...d, angebote: d.angebote.map((a) => a.id === id ? { ...a, ...patch } : a) })),
    addTerminFromAngebot: (angebotId, geraetId, kundeId, von, bis, vonZeit, bisZeit, ort) => {
      setDb((d) => {
        const kr = kreis(d, 'auftrag'); const newId = nextId(kr.prefix, d.auftraege, kr.start);
        const a = { id: newId, typ: 'vermietung', geraetId, kundeId, von, bis, vonZeit: vonZeit || '08:00', bisZeit: bisZeit || '17:00', ort: ort || '', status: 'angebot', quellTyp: 'reservierung', quellId: angebotId, anfrageId: null, angebotId, rechnungId: null, notiz: '' };
        return {
          ...d,
          auftraege: [...d.auftraege, a],
          angebote: d.angebote.map((x) => x.id === angebotId ? { ...x, auftragId: newId } : x),
        };
      });
    },
    updateBuchung: (id, patch) => setDb((d) => ({ ...d, buchungen: d.buchungen.map((b) => b.id === id ? { ...b, ...patch } : b) })),
    addAnfrage: (data) => setDb((d) => ({ ...d, anfragen: [ensureAnfrageGeraete({ ...data, id: 'anf' + Date.now(), datum: today, status: 'neu' }), ...d.anfragen], verlauf: withLog(d, 'anfrage', 'Anfrage erfasst' + (data && data.name ? ' · ' + data.name : ''), null) })),
    // Anfrage annehmen → schlanken Auftrag (Status 'anfrage') anlegen, Kunde ggf. neu, Anfrage erledigt.
    // IDs werden vom Aufrufer vorab via store.nextId berechnet; alles atomar in EINEM Update.
    annehmenAnfrage: ({ anfrageId, auftragId, kundeId, neuerKunde, auftrag }) => {
      setDb((d) => {
        let kunden = d.kunden, kId = kundeId;
        if (neuerKunde) { kId = neuerKunde.id; kunden = [...d.kunden, neuerKunde]; }
        const a = ensureGeraete({ typ: 'vermietung', anfrageId, angebotId: null, rechnungId: null, notiz: '', ort: '', vonZeit: '08:00', bisZeit: '17:00', status: 'anfrage', ...auftrag, id: auftragId, kundeId: kId });
        return { ...d, kunden, auftraege: [...d.auftraege, a], anfragen: d.anfragen.map((x) => x.id === anfrageId ? { ...x, status: 'erledigt' } : x), verlauf: withLog(d, 'auftrag', 'Auftrag ' + auftragId + ' aus Anfrage angelegt', auftragId) };
      });
    },
    setAnfrageStatus: (id, status) => setDb((d) => ({ ...d, anfragen: d.anfragen.map((a) => a.id === id ? { ...a, status } : a) })),
    // Anfrage ablehnen: Grund + Datum festhalten (Datensatz bleibt erhalten, keine Löschung).
    ablehnenAnfrage: (id, grund) => setDb((d) => ({ ...d, anfragen: d.anfragen.map((a) => a.id === id ? { ...a, status: 'abgelehnt', ablehnungsgrund: grund || '', abgelehntAm: today } : a) })),
    deleteAnfrage: (id) => setDb((d) => ({ ...d, anfragen: d.anfragen.filter((a) => a.id !== id) })),
    addBuchung: (data) => setDb((d) => ({ ...d, buchungen: [{ ...data, id: 'b' + Date.now() }, ...d.buchungen] })),
    deleteBuchung: (id) => setDb((d) => ({ ...d, buchungen: d.buchungen.filter((b) => b.id !== id) })),

    // ---- Einstellungen ----
    updateCompany: (patch) => setDb((d) => ({ ...d, company: { ...d.company, ...patch } })),
    updateSettings: (patch) => setDb((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

    // ---- Undo: kompletten Zustand wiederherstellen (Snapshot vor destruktiver Aktion) ----
    restoreSnapshot: (snap) => { if (snap) { const { termine, ...rest } = snap; setDb(rest); } },

    resetDemo: () => { localStorage.removeItem(DB_KEY); setDb(seedDB()); },

    // ---- Datensicherung ----
    exportDB: () => {
      setDb((d) => {
        const payload = { _typ: 'friesen-backup', _version: DB_KEY, _exportiert: new Date().toISOString(), daten: d };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `friesen-backup-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return d;
      });
    },
    importDB: (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const daten = parsed && parsed.daten ? parsed.daten : parsed;
          if (!daten || !Array.isArray(daten.rechnungen) || !Array.isArray(daten.kunden)) {
            throw new Error('Datei sieht nicht wie ein gültiges Friesen-Backup aus.');
          }
          setDb(daten);
          resolve();
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
      reader.readAsText(file);
    }),
  }), [nextId, today]);

  const metrics = useMemo(() => F.computeMetrics(db), [db, F]);

  // db-Sicht mit Legacy-Alias: db.termine === db.auftraege (bis Kalender in Phase 2 umgestellt ist)
  const dbView = useMemo(() => ({ ...db, termine: db.auftraege }), [db]);

  const value = useMemo(() => ({
    db: dbView, ...actions, metrics, today, findConflict, nextId, sumPos,
    snapshot: () => JSON.parse(JSON.stringify(db)),
    kundeById: (id) => db.kunden.find((k) => k.id === id),
    geraetById: (id) => db.flotte.find((g) => g.id === id),
    auftragById: (id) => db.auftraege.find((a) => a.id === id),
    // Auftrag zu einem Beleg finden – auch wenn der Beleg keine auftragId trägt (über angebotId/rechnungId)
    auftragIdByBeleg: (kind, belegId) => {
      const key = kind === 'angebot' ? 'angebotId' : 'rechnungId';
      const a = db.auftraege.find((x) => x[key] === belegId);
      return a ? a.id : null;
    },
    belegungById: (id) => (db.belegungen || []).find((b) => b.id === id),
    rechnungById: (id) => db.rechnungen.find((r) => r.id === id),
    angebotById: (id) => db.angebote.find((a) => a.id === id),
    anfragen: db.anfragen || [],
  }), [db, dbView, actions, metrics, today, findConflict, nextId]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function useStore() { return useContext(StoreContext); }

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

// Ist das Datum ein Vermiet-Wochentag? (liest window.__miettage, Standard: alle Tage)
function istMiettag(iso) {
  if (!iso) return true;
  const mt = window.__miettage;
  if (!mt) return true;
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay(); // 0=So … 6=Sa
  return mt[wd] !== false;
}

// Enddatum/-zeit aus Start + Dauer berechnen.
// einheit 'Tage'  → menge Miettage ab Start; abgewählte Wochentage werden übersprungen
//                   (z. B. 01.06. + 3 = 04.06.; mit Sonntag-Sperre verschiebt sich das Ende entsprechend)
// einheit 'Stunden' → gleiche bzw. überrollende Tage; bisZeit = vonZeit + menge Stunden (z. B. 08:00 + 2 = 10:00)
function berechneEnde(von, vonZeit, menge, einheit) {
  const n = Math.max(0, Number(menge) || 0);
  if (!von) return { bis: von, bisZeit: vonZeit || '17:00' };
  // Stunden: fester Block ("4 Stunden"/"8 Stunden") ODER generisch 'Stunden' (= menge Stunden).
  const stdMatch = /^(\d+)\s*Stunden$/i.exec(String(einheit || ''));
  if (einheit === 'Stunden' || stdMatch) {
    const blockH = stdMatch ? Number(stdMatch[1]) : n;
    const [h, m] = (vonZeit || '08:00').split(':').map(Number);
    const total = h * 60 + m + blockH * 60;
    const extraDays = Math.floor(total / (24 * 60));
    const rest = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const p = (x) => String(x).padStart(2, '0');
    return { bis: addDays(von, extraDays), bisZeit: `${p(Math.floor(rest / 60))}:${p(rest % 60)}` };
  }
  // Tage: n Schritte vorwärts, abgewählte Wochentage zählen nicht mit
  let cur = von;
  for (let i = 0; i < n; i++) {
    cur = addDays(cur, 1);
    let guard = 0;
    while (!istMiettag(cur) && guard < 31) { cur = addDays(cur, 1); guard++; }
  }
  return { bis: cur, bisZeit: '17:00' };
}

// Anzahl Tage zwischen zwei Daten (für Vorbelegung aus Anfrage)
function tageZwischen(von, bis) {
  if (!von || !bis) return 1;
  const [y1, m1, d1] = von.split('-').map(Number);
  const [y2, m2, d2] = bis.split('-').map(Number);
  const diff = Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
  return Math.max(1, diff);
}

window.StoreProvider = StoreProvider;
window.useStore = useStore;
window.addDays = addDays;
window.berechneEnde = berechneEnde;
window.tageZwischen = tageZwischen;
window.istMiettag = istMiettag;
