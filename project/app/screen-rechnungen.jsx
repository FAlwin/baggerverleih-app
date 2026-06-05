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
  const [filter, setFilter] = rS(params.filter || 'alle');
  const [q, setQ] = rS('');

  const all = store.db.rechnungen;
  const counts = { alle: all.length };
  ['offen', 'ueberfaellig', 'mahnung', 'bezahlt'].forEach((s) => counts[s] = all.filter((r) => r.status === s).length);

  let rows = all.filter((r) => filter === 'alle' || r.status === filter);
  if (q) { const ql = q.toLowerCase(); rows = rows.filter((r) => (r.id + store.kundeById(r.kundeId).name).toLowerCase().includes(ql)); }
  rows = [...rows].sort((a, b) => b.datum.localeCompare(a.datum));

  return (
    <>
      <PageHeader kicker="Verwaltung" title="Rechnungen" mobile={mobile} onMenu={onMenu}>
        <window.UI.Btn icon="plus" onClick={() => nav('rechnung-neu')}>{mobile ? 'Neu' : 'Neue Rechnung'}</window.UI.Btn>
      </PageHeader>
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
                  <button key={r.id} onClick={() => nav('rechnung', { id: r.id })} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '14px 16px', border: 'none', borderBottom: '1px solid var(--paper-3)', background: 'transparent', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
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
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav('rechnung', { id: r.id })}>
                      <td className="num" style={{ fontWeight: 600 }}>{r.id}</td>
                      <td><div style={{ fontWeight: 600 }}>{k.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{k.city}</div></td>
                      <td className="num hide-sm" style={{ color: 'var(--muted)' }}>{F.fmtDate(r.datum)}</td>
                      <td className="num hide-sm" style={{ color: ueber ? 'var(--warn)' : 'var(--muted)', fontWeight: ueber ? 600 : 400 }}>{F.fmtDate(r.faellig)}</td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{F.fmtEUR(r.betrag)}</td>
                      <td><window.Pill status={r.status} /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          {r.status !== 'bezahlt' && <window.UI.IconBtn name="check" size={16} title="Als bezahlt markieren" style={{ width: 32, height: 32 }} onClick={() => store.markPaid(r.id)} />}
                          <window.UI.IconBtn name="arrowRight" size={16} title="Öffnen" style={{ width: 32, height: 32 }} onClick={() => nav('rechnung', { id: r.id })} />
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
  const toast = window.UI.useToast();
  const r = store.db.rechnungen.find((x) => x.id === params.id);
  const [docKind, setDocKind] = rS('rechnung');
  const [previewRef, scale] = useFitScale(793);
  const [sigPad, setSigPad] = rS(null); // 'vermieter' | 'mieter' | null
  const [sigVermieter, setSigVermieter] = rS(null);
  const [sigMieter, setSigMieter] = rS(null);

  if (!r) return <><PageHeader title="Rechnung" mobile={mobile} onMenu={onMenu} /><div className="content-pad">Nicht gefunden.</div></>;
  const k = store.kundeById(r.kundeId);
  const c = store.db.company;

  const mietvertragDoc = <window.Print.MietvertragDoc rechnung={r} kunde={k} company={c} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} mietzeit={`${F.fmtDate(r.datum)} – ${F.fmtDate(r.faellig)}`} signaturVermieter={sigVermieter} signaturMieter={sigMieter} />;
  const doc = docKind === 'mietvertrag' ? mietvertragDoc : <window.Print.RechnungDoc rechnung={r} kunde={k} company={c} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} />;
  const printDoc = docKind === 'mietvertrag'
    ? <>{mietvertragDoc}<window.Print.MietbedingungenPage company={c} /></>
    : doc;

  const print = (kind) => { setDocKind(kind); setTimeout(() => window.print(), 60); };

  return (
    <>
      <PageHeader kicker="Rechnung" title={r.id} mobile={mobile} onMenu={onMenu}>
        <window.UI.Btn variant="ghost" icon="print" onClick={() => print('rechnung')}>{mobile ? '' : 'Drucken / PDF'}</window.UI.Btn>
      </PageHeader>

      <div className="content-pad" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '320px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Aktionen */}
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
          </window.UI.Card>

          <window.UI.Card style={{ padding: 18 }}>
            <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 12 }}>Aktionen</div>
            <div className="stack" style={{ gap: 9 }}>
              {r.status !== 'bezahlt' && <window.UI.Btn variant="okghost" icon="check" onClick={() => { store.markPaid(r.id); toast('Als bezahlt markiert'); }} style={{ width: '100%' }}>Als bezahlt markieren</window.UI.Btn>}
              {(r.status === 'ueberfaellig' || r.status === 'offen') && <window.UI.Btn variant="danger" icon="alert" onClick={() => { store.setStatus(r.id, 'mahnung'); toast('Mahnung erstellt'); }} style={{ width: '100%' }}>Mahnung erstellen</window.UI.Btn>}
              <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <window.UI.Btn variant={docKind === 'rechnung' ? 'dark' : 'soft'} size="sm" onClick={() => setDocKind('rechnung')} style={{ flex: 1 }}>Rechnung</window.UI.Btn>
                <window.UI.Btn variant={docKind === 'mietvertrag' ? 'dark' : 'soft'} size="sm" onClick={() => setDocKind('mietvertrag')} style={{ flex: 1 }}>Mietvertrag</window.UI.Btn>
              </div>
              <window.UI.Btn icon="print" onClick={() => print(docKind)} style={{ width: '100%' }}>{docKind === 'mietvertrag' ? 'Mietvertrag' : 'Rechnung'} drucken / PDF</window.UI.Btn>
              {docKind === 'mietvertrag' && (
                <>
                  <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
                  <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 4 }}>Unterschriften (Übergabe)</div>
                  <window.UI.Btn variant={sigVermieter ? 'okghost' : 'ghost'} icon={sigVermieter ? 'check' : 'edit'} onClick={() => setSigPad('vermieter')} style={{ width: '100%' }}>
                    {sigVermieter ? 'Vermieter ✓ (erneut)' : 'Vermieter unterschreiben'}
                  </window.UI.Btn>
                  <window.UI.Btn variant={sigMieter ? 'okghost' : 'ghost'} icon={sigMieter ? 'check' : 'edit'} onClick={() => setSigPad('mieter')} style={{ width: '100%' }}>
                    {sigMieter ? 'Mieter ✓ (erneut)' : 'Mieter unterschreiben'}
                  </window.UI.Btn>
                  {sigVermieter && sigMieter && (
                    <div style={{ padding: '9px 12px', background: 'var(--yellow-wash)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--ink)' }}>
                      ✓ Beide Unterschriften vorhanden · Mietvertrag jetzt drucken / PDF speichern und dem Kunden zusenden.
                    </div>
                  )}
                </>
              )}
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

      <window.Print.Mount doc={printDoc} />
      {sigPad && (
        <window.UI.SignaturPad
          title={sigPad === 'vermieter' ? 'Unterschrift Vermieter (Julian)' : 'Unterschrift Mieter (' + k.name + ')'}
          onSave={(dataUrl) => { sigPad === 'vermieter' ? setSigVermieter(dataUrl) : setSigMieter(dataUrl); setSigPad(null); toast('Unterschrift gespeichert'); }}
          onClose={() => setSigPad(null)}
        />
      )}
    </>
  );
};
