/* ============ SCREEN: Einstellungen ============ */
window.Screens = window.Screens || {};
const { useState: esS } = React;

// kleiner Abschnittstitel
function Abschnitt({ titel, sub }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{titel}</h2>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

window.Screens.einstellungen = function Einstellungen({ nav, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();

  // ---- lokale Entwürfe (erst beim Speichern übernehmen) ----
  const [firma, setFirma] = esS({ ...store.db.company });
  const s0 = store.db.settings || {};
  const [allg, setAllg] = esS({
    zahlungszielTage: s0.zahlungszielTage ?? 14,
    geschaeftszeitVon: s0.geschaeftszeitVon ?? 7,
    geschaeftszeitBis: s0.geschaeftszeitBis ?? 19,
  });
  const [nummern, setNummern] = esS(JSON.parse(JSON.stringify(s0.nummern || {})));

  const setF = (k, v) => setFirma((p) => ({ ...p, [k]: v }));

  const speicherFirma = () => { store.updateCompany(firma); toast('Firmendaten gespeichert'); };
  const speicherAllg = () => {
    store.updateSettings({
      zahlungszielTage: Math.max(0, parseInt(allg.zahlungszielTage, 10) || 0),
      geschaeftszeitVon: Math.min(23, Math.max(0, parseInt(allg.geschaeftszeitVon, 10) || 0)),
      geschaeftszeitBis: Math.min(24, Math.max(1, parseInt(allg.geschaeftszeitBis, 10) || 24)),
    });
    toast('Einstellungen gespeichert');
  };
  const speicherNummern = () => { store.updateSettings({ nummern }); toast('Nummernkreise gespeichert'); };

  // Vorschau der nächsten Nummer je Kreis
  const listFor = { rechnung: store.db.rechnungen, angebot: store.db.angebote, auftrag: store.db.auftraege, belegung: store.db.belegungen || [] };
  const naechste = (kind) => {
    const cfg = nummern[kind] || { prefix: '?', start: 1 };
    const nums = (listFor[kind] || []).map((x) => parseInt(String(x.id).split('-').pop(), 10)).filter((n) => !isNaN(n));
    const maxN = nums.length ? Math.max(...nums) : 0;
    const n = Math.max(maxN + 1, parseInt(cfg.start, 10) || 1);
    return `${cfg.prefix}-2026-${String(n).padStart(3, '0')}`;
  };
  const setKreis = (kind, key, val) => setNummern((p) => ({ ...p, [kind]: { ...p[kind], [key]: val } }));

  const KREISE = [['rechnung', 'Rechnungen'], ['angebot', 'Angebote'], ['auftrag', 'Aufträge'], ['belegung', 'Belegungen']];

  return (
    <>
      <PageHeader kicker="Verwaltung" title="Einstellungen" mobile={mobile} onMenu={onMenu} />
      <div className="content-pad stack" style={{ gap: 18, maxWidth: 820 }}>

        {/* Firmendaten */}
        <window.UI.Card style={{ padding: 18 }}>
          <Abschnitt titel="Firmendaten" sub="Erscheinen auf Angeboten, Rechnungen und Mietverträgen." />
          <div className="stack" style={{ gap: 12, marginTop: 14 }}>
            <div className="form-2">
              <window.UI.Field label="Firmenname"><window.UI.Input value={firma.name || ''} onChange={(e) => setF('name', e.target.value)} /></window.UI.Field>
              <window.UI.Field label="Inhaber"><window.UI.Input value={firma.owner || ''} onChange={(e) => setF('owner', e.target.value)} /></window.UI.Field>
            </div>
            <div className="form-2">
              <window.UI.Field label="Straße & Nr."><window.UI.Input value={firma.street || ''} onChange={(e) => setF('street', e.target.value)} /></window.UI.Field>
              <window.UI.Field label="PLZ & Ort"><window.UI.Input value={firma.city || ''} onChange={(e) => setF('city', e.target.value)} /></window.UI.Field>
            </div>
            <div className="form-2">
              <window.UI.Field label="Telefon"><window.UI.Input value={firma.phone || ''} onChange={(e) => setF('phone', e.target.value)} /></window.UI.Field>
              <window.UI.Field label="E-Mail"><window.UI.Input value={firma.email || ''} onChange={(e) => setF('email', e.target.value)} /></window.UI.Field>
            </div>
            <div className="form-2">
              <window.UI.Field label="Steuernummer"><window.UI.Input value={firma.steuernr || ''} onChange={(e) => setF('steuernr', e.target.value)} /></window.UI.Field>
              <window.UI.Field label="Finanzamt"><window.UI.Input value={firma.finanzamt || ''} onChange={(e) => setF('finanzamt', e.target.value)} /></window.UI.Field>
            </div>
            <div className="form-2">
              <window.UI.Field label="Bank"><window.UI.Input value={firma.bank || ''} onChange={(e) => setF('bank', e.target.value)} /></window.UI.Field>
              <window.UI.Field label="Gewerbebeginn"><window.UI.Input value={firma.gewerbebeginn || ''} onChange={(e) => setF('gewerbebeginn', e.target.value)} placeholder="TT.MM.JJJJ" /></window.UI.Field>
            </div>
            <div className="form-2">
              <window.UI.Field label="IBAN"><window.UI.Input value={firma.iban || ''} onChange={(e) => setF('iban', e.target.value)} /></window.UI.Field>
              <window.UI.Field label="BIC"><window.UI.Input value={firma.bic || ''} onChange={(e) => setF('bic', e.target.value)} /></window.UI.Field>
            </div>
            <window.UI.Field label="Hinweis Kleinunternehmer (§ 19 UStG)" hint="Steht als Hinweis auf Angebot und Rechnung.">
              <window.UI.Textarea value={firma.ustHinweis || ''} onChange={(e) => setF('ustHinweis', e.target.value)} />
            </window.UI.Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <window.UI.Btn icon="check" onClick={speicherFirma}>Firmendaten speichern</window.UI.Btn>
            </div>
          </div>
        </window.UI.Card>

        {/* Zahlungsziel & Geschäftszeiten */}
        <window.UI.Card style={{ padding: 18 }}>
          <Abschnitt titel="Zahlungsziel & Geschäftszeiten" sub="Steuern die Fälligkeit neuer Rechnungen und die Stundenanzeige im Kalender." />
          <div className="stack" style={{ gap: 12, marginTop: 14 }}>
            <window.UI.Field label="Zahlungsziel (Tage)" hint="Eine neue Rechnung ist so viele Tage nach Rechnungsdatum fällig.">
              <window.UI.Input type="number" min="0" value={allg.zahlungszielTage} onChange={(e) => setAllg({ ...allg, zahlungszielTage: e.target.value })} style={{ maxWidth: 160 }} />
            </window.UI.Field>
            <div className="form-2">
              <window.UI.Field label="Geschäftszeit von (Uhr)"><window.UI.Input type="number" min="0" max="23" value={allg.geschaeftszeitVon} onChange={(e) => setAllg({ ...allg, geschaeftszeitVon: e.target.value })} /></window.UI.Field>
              <window.UI.Field label="Geschäftszeit bis (Uhr)"><window.UI.Input type="number" min="1" max="24" value={allg.geschaeftszeitBis} onChange={(e) => setAllg({ ...allg, geschaeftszeitBis: e.target.value })} /></window.UI.Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <window.UI.Btn icon="check" onClick={speicherAllg}>Speichern</window.UI.Btn>
            </div>
          </div>
        </window.UI.Card>

        {/* Nummernkreise */}
        <window.UI.Card style={{ padding: 18 }}>
          <Abschnitt titel="Nummernkreise" sub="Kürzel und Startnummer für neue Belege. Bestehende Nummern bleiben unverändert." />
          <div className="stack" style={{ gap: 10, marginTop: 14 }}>
            {KREISE.map(([kind, label]) => {
              const cfg = nummern[kind] || { prefix: '', start: 1 };
              return (
                <div key={kind} style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '120px 110px 110px 1fr', gap: 10, alignItems: 'end', paddingBottom: 10, borderBottom: '1px solid var(--paper-3)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, paddingBottom: mobile ? 0 : 10 }}>{label}</div>
                  <window.UI.Field label="Kürzel"><window.UI.Input value={cfg.prefix || ''} onChange={(e) => setKreis(kind, 'prefix', e.target.value.toUpperCase())} /></window.UI.Field>
                  <window.UI.Field label="Startnummer"><window.UI.Input type="number" min="1" value={cfg.start ?? 1} onChange={(e) => setKreis(kind, 'start', parseInt(e.target.value, 10) || 1)} /></window.UI.Field>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', paddingBottom: mobile ? 0 : 10 }}>Nächste: <b className="num" style={{ color: 'var(--ink)' }}>{naechste(kind)}</b></div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <window.UI.Btn icon="check" onClick={speicherNummern}>Nummernkreise speichern</window.UI.Btn>
            </div>
          </div>
        </window.UI.Card>

        {/* Daten & Sicherung */}
        <window.UI.Card style={{ padding: 18 }}>
          <Abschnitt titel="Daten & Sicherung" sub="Alle Daten liegen nur in diesem Browser. Regelmäßig sichern!" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <window.UI.Btn icon="download" onClick={() => window.__exportDB && window.__exportDB()}>Daten sichern</window.UI.Btn>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 'var(--r)', border: '1.5px solid var(--line-2)', background: 'var(--paper)', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--sans)' }}>
              <Icon name="file" size={17} /> Backup einspielen
              <input type="file" accept="application/json,.json" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; window.__importDB && window.__importDB(f); }} />
            </label>
            <div style={{ flex: 1 }} />
            <window.UI.Btn variant="danger" icon="trash" onClick={() => window.__resetDemo && window.__resetDemo()}>Demo zurücksetzen</window.UI.Btn>
          </div>
        </window.UI.Card>

      </div>
    </>
  );
};
