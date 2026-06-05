/* ============================================================
   STORE — localStorage-Persistenz + Mutationen (window.useStore)
   ============================================================ */
const DB_KEY = 'friesen_db_v4';
const { createContext, useContext, useState, useEffect, useCallback, useMemo } = React;

function seedDB() {
  const F = window.FRIESEN;
  // tiefe Kopie der Seed-Daten
  const clone = (x) => JSON.parse(JSON.stringify(x));
  return {
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
  };
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return seedDB();
}

const StoreContext = createContext(null);

function StoreProvider({ children }) {
  const [db, setDb] = useState(loadDB);

  useEffect(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {}
  }, [db]);

  const F = window.FRIESEN;
  const today = F.APP_TODAY;

  // ---- Helfer ----
  const nextId = useCallback((prefix, list) => {
    const nums = list.map((x) => parseInt(String(x.id).split('-').pop(), 10)).filter((n) => !isNaN(n));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${prefix}-2026-${String(n).padStart(3, '0')}`;
  }, []);

  const sumPos = (pos) => (pos || []).reduce((a, p) => a + (p.menge || 0) * (p.preis || 0), 0);

  // Doppelbuchung prüfen: gibt kollidierende Belegung (Auftrag ODER Block) zurück oder null
  const findConflict = useCallback((geraetId, von, bis, exceptId) => {
    const hit = (t) => t.geraetId === geraetId && t.id !== exceptId && von <= t.bis && bis >= t.von;
    return db.auftraege.find(hit) || (db.belegungen || []).find(hit) || null;
  }, [db.auftraege, db.belegungen]);

  // ---- Mutationen ----
  const actions = useMemo(() => ({
    markPaid: (id) => setDb((d) => ({ ...d, rechnungen: d.rechnungen.map((r) => r.id === id ? { ...r, status: 'bezahlt', bezahltAm: today } : r) })),
    setStatus: (id, status) => setDb((d) => ({ ...d, rechnungen: d.rechnungen.map((r) => r.id === id ? { ...r, status, ...(status === 'mahnung' ? { mahnstufe: (r.mahnstufe || 0) + 1 } : {}) } : r) })),

    addRechnung: (data) => {
      let newId;
      setDb((d) => {
        newId = nextId('R', d.rechnungen);
        const r = { ...data, id: newId, betrag: sumPos(data.positionen), status: data.status || 'offen' };
        return { ...d, rechnungen: [r, ...d.rechnungen] };
      });
      return newId;
    },

    addAngebot: (data) => {
      let newId;
      setDb((d) => {
        newId = nextId('A', d.angebote);
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
        newId = nextId('R', d.rechnungen);
        const r = {
          id: newId, kundeId: a.kundeId, datum: today,
          faellig: addDays(today, 14), status: 'offen',
          positionen: JSON.parse(JSON.stringify(a.positionen)),
          betrag: a.betrag, ausAngebot: a.id, auftragId: a.auftragId || null,
        };
        // Falls das Angebot zu einem Auftrag gehört: Rechnung verknüpfen + Status hochsetzen
        return {
          ...d,
          rechnungen: [r, ...d.rechnungen],
          angebote: d.angebote.map((x) => x.id === id ? { ...x, status: 'angenommen' } : x),
          auftraege: d.auftraege.map((au) => au.angebotId === id ? { ...au, rechnungId: newId, status: 'abgerechnet' } : au),
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
        newId = nextId('AU', d.auftraege);
        const a = {
          typ: 'vermietung', anfrageId: null, angebotId: null, rechnungId: null,
          notiz: '', ort: '', vonZeit: '08:00', bisZeit: '17:00', status: 'reserviert',
          ...data, id: newId,
        };
        return { ...d, auftraege: [...d.auftraege, a] };
      });
      return newId;
    },
    updateAuftrag: (id, patch) => setDb((d) => ({ ...d, auftraege: d.auftraege.map((a) => a.id === id ? { ...a, ...patch } : a) })),
    setAuftragStatus: (id, status) => setDb((d) => ({ ...d, auftraege: d.auftraege.map((a) => a.id === id ? { ...a, status } : a) })),
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
        newId = nextId('BL', d.belegungen || []);
        const b = { grund: 'privat', notiz: '', ort: '', vonZeit: '08:00', bisZeit: '17:00', ...data, id: newId };
        return { ...d, belegungen: [...(d.belegungen || []), b] };
      });
      return newId;
    },
    updateBelegung: (id, patch) => setDb((d) => ({ ...d, belegungen: (d.belegungen || []).map((b) => b.id === id ? { ...b, ...patch } : b) })),
    deleteBelegung: (id) => setDb((d) => ({ ...d, belegungen: (d.belegungen || []).filter((b) => b.id !== id) })),

    // Legacy-Wrapper: Angebot-Versand legt für Standalone-Angebote eine reservierende Vermietung an
    addTermin: (data) => setDb((d) => {
      const newId = nextId('AU', d.auftraege);
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
    updateAngebot: (id, patch) => setDb((d) => ({ ...d, angebote: d.angebote.map((a) => a.id === id ? { ...a, ...patch } : a) })),
    addTerminFromAngebot: (angebotId, geraetId, kundeId, von, bis, vonZeit, bisZeit, ort) => {
      setDb((d) => {
        const newId = nextId('AU', d.auftraege);
        const a = { id: newId, typ: 'vermietung', geraetId, kundeId, von, bis, vonZeit: vonZeit || '08:00', bisZeit: bisZeit || '17:00', ort: ort || '', status: 'angebot', quellTyp: 'reservierung', quellId: angebotId, anfrageId: null, angebotId, rechnungId: null, notiz: '' };
        return {
          ...d,
          auftraege: [...d.auftraege, a],
          angebote: d.angebote.map((x) => x.id === angebotId ? { ...x, auftragId: newId } : x),
        };
      });
    },
    updateBuchung: (id, patch) => setDb((d) => ({ ...d, buchungen: d.buchungen.map((b) => b.id === id ? { ...b, ...patch } : b) })),
    addAnfrage: (data) => setDb((d) => ({ ...d, anfragen: [{ ...data, id: 'anf' + Date.now(), datum: today, status: 'neu' }, ...d.anfragen] })),
    setAnfrageStatus: (id, status) => setDb((d) => ({ ...d, anfragen: d.anfragen.map((a) => a.id === id ? { ...a, status } : a) })),
    deleteAnfrage: (id) => setDb((d) => ({ ...d, anfragen: d.anfragen.filter((a) => a.id !== id) })),
    addBuchung: (data) => setDb((d) => ({ ...d, buchungen: [{ ...data, id: 'b' + Date.now() }, ...d.buchungen] })),
    deleteBuchung: (id) => setDb((d) => ({ ...d, buchungen: d.buchungen.filter((b) => b.id !== id) })),

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
    kundeById: (id) => db.kunden.find((k) => k.id === id),
    geraetById: (id) => db.flotte.find((g) => g.id === id),
    auftragById: (id) => db.auftraege.find((a) => a.id === id),
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

window.StoreProvider = StoreProvider;
window.useStore = useStore;
window.addDays = addDays;
