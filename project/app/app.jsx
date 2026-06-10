/* ============ APP-SHELL: Layout, Routing, Header, Suche ============ */
const { useState: uS, useEffect: uE, useRef, useCallback, useMemo } = React;

function useMedia(q) {
  const [m, setM] = uS(() => window.matchMedia(q).matches);
  uE(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}

// ---- Bottom navigation bar (mobile only) ----
const BOTTOM_TABS = [
  { id: 'dashboard',  icon: 'dashboard', label: 'Home' },
  { id: 'anfragen',   icon: 'bell',      label: 'Anfragen', badge: true },
  { id: 'auftraege',  icon: 'file',      label: 'Aufträge' },
  { id: 'kalender',   icon: 'kalender',  label: 'Kalender' },
  { id: '_mehr',      icon: 'grid',      label: 'Mehr' },
];
const MEHR_ITEMS = [
  { id: 'belege',      icon: 'rechnung',    label: 'Belege' },
  { id: 'kunden',      icon: 'kunden',      label: 'Kunden' },
  { id: 'flotte',      icon: 'flotte',      label: 'Flotte' },
  { id: 'buchhaltung', icon: 'buchhaltung', label: 'Buchhaltung' },
  { id: 'verlauf',     icon: 'clock',       label: 'Verlauf' },
  { id: 'einstellungen', icon: 'settings',  label: 'Einstellungen' },
];
const MEHR_IDS = new Set(MEHR_ITEMS.map((x) => x.id));

function BottomNav({ active, onNav }) {
  const store = window.useStore();
  const alerts = (store.db.anfragen || []).filter((a) => a.status === 'neu').length;
  const [showMehr, setShowMehr] = uS(false);
  const inMehr = MEHR_IDS.has(active);

  return (
    <>
      {showMehr && (
        <>
          <div onClick={() => setShowMehr(false)} style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,.45)' }} />
          <div style={{ position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom))', left: 0, right: 0, zIndex: 99, background: 'var(--ink)', borderRadius: '14px 14px 0 0', padding: '18px 16px 12px', boxShadow: '0 -8px 32px rgba(0,0,0,.3)' }}>
            <div className="kicker" style={{ color: 'var(--on-dark-muted)', marginBottom: 12, fontSize: 9 }}>Weitere Bereiche</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {MEHR_ITEMS.map((n) => {
                const on = active === n.id;
                return (
                  <button key={n.id} onClick={() => { onNav(n.id); setShowMehr(false); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: on ? 'var(--yellow)' : 'var(--ink-3)', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer', color: on ? 'var(--ink)' : '#fff', font: 'inherit', fontSize: 14, fontWeight: 600 }}>
                    <Icon name={n.icon} size={20} color={on ? 'var(--ink)' : 'var(--on-dark-muted)'} />
                    {n.label}
                  </button>
                );
              })}
            </div>
            <div className="kicker" style={{ color: 'var(--on-dark-muted)', margin: '16px 0 8px', fontSize: 9 }}>Daten</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { window.__exportDB && window.__exportDB(); setShowMehr(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--ink-3)', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer', color: '#fff', font: 'inherit', fontSize: 13.5, fontWeight: 600 }}>
                <Icon name="download" size={18} color="var(--on-dark-muted)" /> Daten sichern
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--ink-3)', borderRadius: 'var(--r)', cursor: 'pointer', color: '#fff', font: 'inherit', fontSize: 13.5, fontWeight: 600 }}>
                <Icon name="file" size={18} color="var(--on-dark-muted)" /> Backup einspielen
                <input type="file" accept="application/json,.json" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; setShowMehr(false); window.__importDB && window.__importDB(f); }} />
              </label>
            </div>
          </div>
        </>
      )}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'var(--ink)', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(56px + env(safe-area-inset-bottom))' }}>
        {BOTTOM_TABS.map((n) => {
          const isMehr = n.id === '_mehr';
          const on = isMehr ? (showMehr || inMehr) : n.id === active;
          const badge = n.badge ? alerts : null;
          return (
            <button key={n.id} onClick={() => { if (isMehr) setShowMehr((v) => !v); else { onNav(n.id); setShowMehr(false); } }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 4px', background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', color: on ? 'var(--yellow)' : 'var(--on-dark-muted)', transition: 'color .12s' }}>
              <div style={{ position: 'relative' }}>
                <Icon name={n.icon} size={22} color={on ? 'var(--yellow)' : 'var(--on-dark-muted)'} stroke={on ? 2.2 : 1.7} />
                {badge > 0 && <span style={{ position: 'absolute', top: -4, right: -6, background: 'var(--danger)', color: '#fff', fontSize: 9, fontWeight: 700, minWidth: 15, height: 15, borderRadius: 8, display: 'grid', placeItems: 'center', padding: '0 3px', lineHeight: 1 }}>{badge}</span>}
              </div>
              <span style={{ fontSize: 10, fontWeight: on ? 700 : 400, letterSpacing: '.01em' }}>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

// ---- Compact mobile header ----
function PageHeader({ kicker, title, children, mobile }) {
  const store = window.useStore();
  const alerts = store.metrics.ueberAnzahl + store.metrics.mahnAnzahl;
  const [bellOpen, setBell] = uS(false);
  const goBack = window.__goBack || null;

  // On mobile: show only last child (primary action button)
  const childArr = React.Children.toArray(children);
  const mobileChild = childArr.length > 0 ? childArr[childArr.length - 1] : null;

  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: mobile ? '11px 14px' : '18px 28px', background: 'var(--paper)', borderBottom: '1.5px solid var(--line)', position: 'sticky', top: 0, zIndex: 30 }}>
      {goBack && (
        <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', height: 36, padding: mobile ? '0 10px 0 8px' : '0 13px 0 10px', flex: '0 0 auto', border: '1.5px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--paper-2)', cursor: 'pointer', color: 'var(--ink)', font: 'inherit', fontSize: 13.5, fontWeight: 600 }} title="Zurück">
          <Icon name="chevron" size={17} style={{ transform: 'scaleX(-1)' }} /> Zurück
        </button>
      )}
      <div style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden' }}>
        {kicker && !mobile && <div className="kicker" style={{ color: 'var(--muted)', lineHeight: 1.2, marginBottom: 1 }}>{kicker}</div>}
        <h1 style={{ margin: 0, fontSize: mobile ? 17 : 23, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
        {!mobile && (
          <button onClick={() => window.__openSearch && window.__openSearch()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', border: '1.5px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--paper-2)', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            <Icon name="search" size={16} /> Suchen <kbd style={{ marginLeft: 18, fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 3, padding: '1px 5px' }}>⌘K</kbd>
          </button>
        )}
        {mobile && (
          <button onClick={() => window.__openSearch && window.__openSearch()} style={{ width: 40, height: 40, border: '1.5px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--paper-2)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <Icon name="search" size={18} />
          </button>
        )}
        <div style={{ position: 'relative' }}>
          <window.UI.IconBtn name="bell" badge={alerts || null} onClick={() => setBell((o) => !o)} title="Hinweise" active={bellOpen} />
          {bellOpen && <BellPanel onClose={() => setBell(false)} />}
        </div>
        {/* On mobile show only primary action; on desktop show all */}
        {mobile ? mobileChild : children}
      </div>
    </header>
  );
}

function BellPanel({ onClose }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const items = [];
  store.db.rechnungen.filter((r) => r.status === 'mahnung').forEach((r) => items.push({ c: 'var(--danger)', ic: 'alert', t: 'Mahnung offen', s: `${r.id} · ${store.kundeById(r.kundeId).name} · ${F.fmtEUR(r.betrag)}`, go: ['rechnungen'] }));
  store.db.rechnungen.filter((r) => r.status === 'ueberfaellig').forEach((r) => items.push({ c: 'var(--warn)', ic: 'clock', t: 'Rechnung überfällig', s: `${r.id} · ${store.kundeById(r.kundeId).name} · ${F.fmtEUR(r.betrag)}`, go: ['rechnungen'] }));
  store.db.angebote.filter((a) => a.status === 'offen' && a.gueltigBis < store.today).forEach((a) => items.push({ c: 'var(--open)', ic: 'angebot', t: 'Angebot abgelaufen', s: `${a.id} · gültig bis ${F.fmtDate(a.gueltigBis)}`, go: ['angebote'] }));
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      <div style={{ position: 'absolute', top: 48, right: 0, width: 300, background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--line)', fontWeight: 700, fontSize: 14 }}>Hinweise</div>
        {items.length === 0 && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Alles erledigt 👍</div>}
        {items.map((it, i) => (
          <button key={i} onClick={() => { window.__nav(...it.go); onClose(); }} style={{ display: 'flex', gap: 11, alignItems: 'center', width: '100%', padding: '12px 16px', border: 'none', borderTop: i ? '1px solid var(--paper-3)' : 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
            <Icon name={it.ic} size={18} color={it.c} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{it.t}</div><div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{it.s}</div></div>
          </button>
        ))}
      </div>
    </>
  );
}

// Globale Suche (⌘K)
function SearchModal({ open, onClose }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const [q, setQ] = uS('');
  const ref = useRef();
  uE(() => { if (open && ref.current) ref.current.focus(); if (open) setQ(''); }, [open]);
  if (!open) return null;
  const ql = q.toLowerCase();
  const res = [];
  if (ql) {
    store.db.kunden.filter((k) => (k.name + k.city).toLowerCase().includes(ql)).slice(0, 4).forEach((k) => res.push({ ic: 'kunden', t: k.name, s: k.city, go: ['kunde', { id: k.id }] }));
    store.db.rechnungen.filter((r) => (r.id + store.kundeById(r.kundeId).name).toLowerCase().includes(ql)).slice(0, 4).forEach((r) => res.push({ ic: 'rechnung', t: r.id, s: store.kundeById(r.kundeId).name + ' · ' + F.fmtEUR(r.betrag), go: ['rechnung', { id: r.id }] }));
    store.db.angebote.filter((a) => (a.id + store.kundeById(a.kundeId).name).toLowerCase().includes(ql)).slice(0, 3).forEach((a) => res.push({ ic: 'angebot', t: a.id, s: store.kundeById(a.kundeId).name, go: ['angebote'] }));
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(20,20,20,.4)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8vh', padding: '8vh 16px 0' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '100%', background: 'var(--paper)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1.5px solid var(--line)' }}>
          <Icon name="search" size={19} color="var(--muted)" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kunde, Rechnung, Angebot …" style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: 16, flex: 1, background: 'transparent', color: 'var(--ink)' }} />
          <kbd style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {q && res.length === 0 && <div style={{ padding: 24, color: 'var(--muted)', fontSize: 14 }}>Keine Treffer.</div>}
          {!q && <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13.5 }}>Tippe, um zu suchen.</div>}
          {res.map((r, i) => (
            <button key={i} onClick={() => { window.__nav(...r.go); onClose(); }} style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', padding: '12px 18px', border: 'none', borderTop: i ? '1px solid var(--paper-3)' : 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
              <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--paper-3)', display: 'grid', placeItems: 'center' }}><Icon name={r.ic} size={17} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{r.t}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.s}</div></div>
              <Icon name="arrowRight" size={16} color="var(--muted-2)" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Layout() {
  const store = window.useStore();
  const isMobile = useMedia('(max-width: 900px)');
  const [route, setRoute] = uS({ screen: 'dashboard', params: {} });
  const [history, setHistory] = uS([]);
  const [search, setSearch] = uS(false);
  const toast = window.UI.useToast();

  const TOP_SCREENS = new Set(['dashboard','anfragen','auftraege','kalender','belege','rechnungen','angebote','kunden','flotte','buchhaltung','einstellungen']);

  const nav = useCallback((screen, params = {}) => {
    // Rechnungen/Angebote sind unter „Belege" zusammengefasst → automatisch dorthin leiten
    if (screen === 'rechnungen') { screen = 'belege'; params = { ...params, tab: 'rechnungen' }; }
    else if (screen === 'angebote') { screen = 'belege'; params = { ...params, tab: 'angebote' }; }
    else if (screen === 'mietvertraege') { screen = 'belege'; params = { ...params, tab: 'mietvertraege' }; }
    setRoute((prev) => {
      if (TOP_SCREENS.has(screen)) {
        setHistory([]); // Hauptseite → History leeren, kein Zurück-Button
      } else {
        setHistory((h) => [...h.slice(-19), prev]); // Unterseite → merken
      }
      return { screen, params };
    });
    window.scrollTo?.(0, 0);
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setRoute(prev);
      window.scrollTo?.(0, 0);
      return h.slice(0, -1);
    });
  }, []);

  uE(() => {
    window.__nav = nav;
    window.__goBack = history.length > 0 ? goBack : null;
    window.__openSearch = () => setSearch(true);
    window.__resetDemo = () => {
      if (confirm('Alle Demo-Daten zurücksetzen?')) {
        store.resetDemo();
        toast('Demo-Daten zurückgesetzt');
        nav('dashboard');
      }
    };
    window.__exportDB = () => {
      store.exportDB();
      toast('Backup heruntergeladen');
    };
    window.__importDB = (file) => {
      if (!file) return;
      if (!confirm('Backup einspielen? Die aktuellen Daten werden dabei ersetzt.')) return;
      store.importDB(file)
        .then(() => { toast('Backup eingespielt'); nav('dashboard'); })
        .catch((e) => { alert('Import fehlgeschlagen: ' + (e.message || e)); });
    };
    window.__anfragenCount = (store.db.anfragen || []).filter((a) => a.status === 'neu').length;
  }, [nav, goBack, history, store, toast, store.db.anfragen]);

  uE(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch((o) => !o); }
      if (e.key === 'Escape') setSearch(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Zurück-Button synchron beim Render bereitstellen (nicht erst im Effect) –
  // sonst sieht PageHeader beim ersten Render einen veralteten Wert und der Button fehlt mal.
  window.__goBack = history.length > 0 ? goBack : null;

  const Screen = (window.Screens && window.Screens[route.screen]) || (() => <div style={{ padding: 40 }}>Unbekannt</div>);
  const activeNav = ({ rechnung: 'belege', 'rechnung-neu': 'belege', rechnungen: 'belege', angebote: 'belege', kunde: 'kunden', anfragen: 'anfragen', auftrag: 'auftraege' }[route.screen]) || route.screen;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper-2)', fontFamily: 'var(--sans)', color: 'var(--text)' }}>
      {/* Desktop sidebar */}
      {!isMobile && <window.Sidebar active={activeNav} variant="B" onNav={nav} />}

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Screen nav={nav} params={route.params} mobile={isMobile} PageHeader={PageHeader} />
      </main>

      {/* Mobile bottom nav */}
      {isMobile && <BottomNav active={activeNav} onNav={nav} />}

      <SearchModal open={search} onClose={() => setSearch(false)} />
    </div>
  );
}

function App() {
  return (
    <window.StoreProvider>
      <window.UI.ToastProvider>
        <Layout />
      </window.UI.ToastProvider>
    </window.StoreProvider>
  );
}

window.PageHeader = PageHeader;
window.FriesenApp = App;
