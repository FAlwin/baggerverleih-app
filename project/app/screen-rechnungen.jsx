/* ============ SCREEN: Rechnungen (Liste + Detail/Druck) ============ */
window.Screens = window.Screens || {};
const { useState: rS, useEffect: rE, useRef: rR, useLayoutEffect: rLE } = React;

// A4-Vorschau auf Containerbreite skalieren
function useFitScale(designW) {
  const ref = rR(null);
  const [scale, setScale] = rS(0.6);
  rLE(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 32;
      setScale(Math.min(1, Math.max(0.3, w / designW)));
    });
    ro.observe(el); return () => ro.disconnect();
  }, [designW]);
  return [ref, scale];
}
window.useFitScale = useFitScale;

function StatusFilter({ value, onChange, counts }) {
  const tabs = [
    { id: 'aktiv', label: 'Zu erledigen' },
    { id: 'alle', label: 'Alle' },
    { id: 'offen', label: 'Offen' },
    { id: 'ueberfaellig', label: 'Überfällig' },
    { id: 'mahnung', label: 'Mahnung' },
    { id: 'bezahlt', label: 'Bezahlt' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {tabs.map((t) => {
        const on = value === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 'var(--r)',
            border: '1.5px solid ' + (on ? 'var(--ink)' : 'var(--line-2)'), background: on ? 'var(--ink)' : 'var(--paper)',
            color: on ? '#fff' : 'var(--ink)', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {t.label}
            {counts[t.id] != null && <span className="mono" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: on ? 'rgba(255,255,255,.18)' : 'var(--paper-3)', color: on ? '#fff' : 'var(--muted)' }}>{counts[t.id]}</span>}
          </button>
        );
      })}
    </div>
  );
}

window.Screens.rechnungen = function Rechnungen({ nav, params, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const [filter, setFilter] = rS(params.filter || 'aktiv');
  const [q, setQ] = rS('');
  // Auftrag zur Rechnung auflösen (auch ohne auftragId am Beleg) und öffnen; sonst Rechnungs-Detail
  const auftragIdOfR = (r) => r.auftragId || store.auftragIdByBeleg('rechnung', r.id);
  const openAuftragR = (r) => { const aid = auftragIdOfR(r); aid ? nav('auftrag', { id: aid }) : nav('rechnung', { id: r.id }); };

  const all = store.db.rechnungen;
  const AKTIV = ['offen', 'ueberfaellig', 'mahnung'];
  const counts = { alle: all.length, aktiv: all.filter((r) => AKTIV.includes(r.status)).length };
  ['offen', 'ueberfaellig', 'mahnung', 'bezahlt'].forEach((s) => counts[s] = all.filter((r) => r.status === s).length);

  let rows = all.filter((r) => filter === 'alle' ? true : filter === 'aktiv' ? AKTIV.includes(r.status) : r.status === filter);
  if (q) { const ql = q.toLowerCase(); rows = rows.filter((r) => (r.id + store.kundeById(r.kundeId).name).toLowerCase().includes(ql)); }
  rows = [...rows].sort((a, b) => b.datum.localeCompare(a.datum));

  return (
    <>
      <PageHeader kicker="Übersicht" title="Rechnungen" mobile={mobile} onMenu={onMenu} />
      <div className="content-pad stack" style={{ gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusFilter value={filter} onChange={setFilter} counts={counts} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1.5px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', minWidth: 220 }}>
            <Icon name="search" size={16} color="var(--muted)" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nr. oder Kunde …" style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: 13.5, flex: 1, background: 'transparent' }} />
          </div>
        </div>

        <window.UI.Card style={{ padding: 0, overflow: 'hidden' }} className="scroll-x">
          {mobile ? (
            /* Mobile: Karten-Liste */
            <div>
              {rows.map((r) => {
                const k = store.kundeById(r.kundeId);
                const ueber = r.status === 'ueberfaellig' || r.status === 'mahnung';
                return (
                  <button key={r.id} onClick={() => openAuftragR(r)} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '14px 16px', border: 'none', borderBottom: '1px solid var(--paper-3)', background: 'transparent', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{k?.name}</div>
                          <div className="num" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{r.id} · {F.fmtDate(r.datum)}</div>
                        </div>
                        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                          <div className="num" style={{ fontWeight: 700, fontSize: 15 }}>{F.fmtEUR(r.betrag)}</div>
                          <div style={{ marginTop: 4 }}><window.Pill status={r.status} /></div>
                        </div>
                      </div>
                      {ueber && <div style={{ fontSize: 11.5, color: 'var(--warn)', marginTop: 6, fontWeight: 600 }}>Fällig: {F.fmtDate(r.faellig)}</div>}
                    </div>
                    <Icon name="chevron" size={16} color="var(--muted-2)" style={{ flex: '0 0 auto' }} />
                  </button>
                );
              })}
              {rows.length === 0 && <window.UI.Empty icon="rechnung" title="Keine Rechnungen" sub="Für diesen Filter gibt es keine Einträge." />}
            </div>
          ) : (
            /* Desktop: Tabelle */
            <table className="fr-table">
              <thead><tr>
                <th>Nr.</th><th>Kunde</th><th className="hide-sm">Datum</th><th className="hide-sm">Fällig</th>
                <th style={{ textAlign: 'right' }}>Betrag</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const k = store.kundeById(r.kundeId);
                  const ueber = r.status === 'ueberfaellig' || r.status === 'mahnung';
                  return (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openAuftragR(r)}>
                      <td className="num" style={{ fontWeight: 600 }}>{r.id}</td>
                      <td><div style={{ fontWeight: 600 }}>{k.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{k.city}</div></td>
                      <td className="num hide-sm" style={{ color: 'var(--muted)' }}>{F.fmtDate(r.datum)}</td>
                      <td className="num hide-sm" style={{ color: ueber ? 'var(--warn)' : 'var(--muted)', fontWeight: ueber ? 600 : 400 }}>{F.fmtDate(r.faellig)}</td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{F.fmtEUR(r.betrag)}</td>
                      <td><window.Pill status={r.status} /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <window.UI.Btn size="sm" variant="ghost" icon="arrowRight" onClick={() => openAuftragR(r)}>Auftrag öffnen</window.UI.Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!mobile && rows.length === 0 && <window.UI.Empty icon="rechnung" title="Keine Rechnungen" sub="Für diesen Filter gibt es keine Einträge." />}
        </window.UI.Card>
      </div>
    </>
  );
};

window.Screens.rechnung = function RechnungDetail({ nav, params, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const r = store.db.rechnungen.find((x) => x.id === params.id);
  const [previewRef, scale] = useFitScale(793);

  if (!r) return <><PageHeader title="Rechnung" mobile={mobile} onMenu={onMenu} /><div className="content-pad">Nicht gefunden.</div></>;
  const k = store.kundeById(r.kundeId);
  const c = store.db.company;
  const doc = <window.Print.RechnungDoc rechnung={r} kunde={k} company={c} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} />;

  return (
    <>
      <PageHeader kicker="Rechnung" title={r.id} mobile={mobile} onMenu={onMenu}>
        <window.UI.Btn variant="ghost" icon="download" onClick={() => window.PDF.download(doc, 'Rechnung_' + r.id)}>{mobile ? '' : 'Drucken / als PDF'}</window.UI.Btn>
      </PageHeader>

      <div className="content-pad" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '320px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Info */}
        <div className="stack" style={{ gap: 16 }}>
          <window.UI.Card style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <window.Pill status={r.status} />
              <span className="num" style={{ fontWeight: 700, fontSize: 18 }}>{F.fmtEUR(r.betrag)}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div onClick={() => nav('kunde', { id: k.id })} style={{ cursor: 'pointer', color: 'var(--ink)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="kunden" size={15} /> {k.name}</div>
              <div>Datum: <b style={{ color: 'var(--ink)' }}>{F.fmtDate(r.datum)}</b></div>
              <div>Fällig: <b style={{ color: r.status === 'ueberfaellig' ? 'var(--warn)' : 'var(--ink)' }}>{F.fmtDate(r.faellig)}</b></div>
              {r.bezahltAm && <div>Bezahlt am: <b style={{ color: 'var(--ok)' }}>{F.fmtDate(r.bezahltAm)}</b></div>}
              {r.ausAngebot && <div>aus Angebot: <b style={{ color: 'var(--ink)' }}>{r.ausAngebot}</b></div>}
            </div>
            <div className="stack" style={{ gap: 9, marginTop: 14 }}>
              <window.UI.Btn icon="download" onClick={() => window.PDF.download(doc, 'Rechnung_' + r.id)} style={{ width: '100%' }}>Drucken / als PDF</window.UI.Btn>
              {auftragIdOfR(r) && <window.UI.Btn variant="ghost" icon="arrowRight" onClick={() => nav('auftrag', { id: auftragIdOfR(r) })} style={{ width: '100%' }}>Auftrag öffnen</window.UI.Btn>}
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--muted-2)', lineHeight: 1.5 }}>
              Bezahlt-Status, Mahnung und Mietvertrag verwaltest du im zugehörigen Auftrag.
            </div>
          </window.UI.Card>
        </div>

        {/* Vorschau */}
        <div ref={previewRef} style={{ background: 'var(--paper-3)', borderRadius: 'var(--r-lg)', padding: 16, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ width: 793 * scale, height: 1122 * scale, flex: '0 0 auto' }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 793, boxShadow: 'var(--shadow-lg)' }}>{doc}</div>
          </div>
        </div>
      </div>

      <window.Print.Mount doc={doc} />
    </>
  );
};
