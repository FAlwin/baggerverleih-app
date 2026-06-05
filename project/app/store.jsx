/* ============================================================
   STORE — localStorage-Persistenz + Mutationen (window.useStore)
   ============================================================ */
const DB_KEY = 'friesen_db_v2';
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
    termine: clone(F.TERMINE),
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

  // Doppelbuchung prüfen: gibt kollidierenden Termin zurück oder null
  const findConflict = useCallback((geraetId, von, bis, exceptId) => {
    return db.termine.find((t) =>
      t.geraetId === geraetId && t.id !== exceptId && von <= t.bis && bis >= t.von
    ) || null;
  }, [db.termine]);

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
          betrag: a.betrag, ausAngebot: a.id,
        };
        return {
          ...d,
          rechnungen: [r, ...d.rechnungen],
          angebote: d.angebote.map((x) => x.id === id ? { ...x, status: 'angenommen' } : x),
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

    addTermin: (data) => setDb((d) => ({ ...d, termine: [...d.termine, { ...data, id: 't' + Date.now() }] })),
    deleteTermin: (id) => setDb((d) => ({ ...d, termine: d.termine.filter((t) => t.id !== id) })),

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
      setDb((d) => ({
        ...d,
        termine: [...d.termine, { id: 't_angebot_' + Date.now(), geraetId, kundeId, von, bis, vonZeit: vonZeit || '08:00', bisZeit: bisZeit || '17:00', ort: ort || '', quellTyp: 'reservierung', quellId: angebotId }],
      }));
    },
    updateBuchung: (id, patch) => setDb((d) => ({ ...d, buchungen: d.buchungen.map((b) => b.id === id ? { ...b, ...patch } : b) })),
    addAnfrage: (data) => setDb((d) => ({ ...d, anfragen: [{ ...data, id: 'anf' + Date.now(), datum: today, status: 'neu' }, ...d.anfragen] })),
    setAnfrageStatus: (id, status) => setDb((d) => ({ ...d, anfragen: d.anfragen.map((a) => a.id === id ? { ...a, status } : a) })),
    deleteAnfrage: (id) => setDb((d) => ({ ...d, anfragen: d.anfragen.filter((a) => a.id !== id) })),
    addBuchung: (data) => setDb((d) => ({ ...d, buchungen: [{ ...data, id: 'b' + Date.now() }, ...d.buchungen] })),
    deleteBuchung: (id) => setDb((d) => ({ ...d, buchungen: d.buchungen.filter((b) => b.id !== id) })),

    resetDemo: () => { localStorage.removeItem(DB_KEY); setDb(seedDB()); },
  }), [nextId, today]);

  const metrics = useMemo(() => F.computeMetrics(db), [db, F]);

  const value = useMemo(() => ({
    db, ...actions, metrics, today, findConflict, nextId, sumPos,
    kundeById: (id) => db.kunden.find((k) => k.id === id),
    geraetById: (id) => db.flotte.find((g) => g.id === id),
    anfragen: db.anfragen || [],
  }), [db, actions, metrics, today, findConflict, nextId]);

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
