/* ============ SCREEN: Belege (Angebote + Rechnungen als Tabs) ============ */
window.Screens = window.Screens || {};
const { useState: blS } = React;

// Belege fasst die beiden Übersichten zusammen. Der jeweils aktive Tab rendert
// den bestehenden Listen-Screen – ohne dessen eigenen Kopf (PageHeader = leer).
window.Screens.belege = function Belege({ nav, params = {}, mobile, onMenu, PageHeader }) {
  const [tab, setTab] = blS(params.tab === 'rechnungen' ? 'rechnungen' : 'angebote');
  const NoHeader = () => null;
  const Sub = window.Screens[tab];

  const TABS = [['angebote', 'Angebote', 'angebot'], ['rechnungen', 'Rechnungen', 'rechnung']];

  return (
    <>
      <PageHeader kicker="Übersicht" title="Belege" mobile={mobile} onMenu={onMenu} />
      <div style={{ padding: mobile ? '12px 12px 0' : '16px 28px 0' }}>
        <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--paper-3)', borderRadius: 'var(--r)' }}>
          {TABS.map(([id, label, icon]) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 6,
                border: 'none', background: on ? 'var(--paper)' : 'transparent', color: 'var(--ink)',
                font: 'inherit', fontSize: 13.5, fontWeight: on ? 700 : 500, cursor: 'pointer',
                boxShadow: on ? 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,.1))' : 'none',
              }}>
                <Icon name={icon} size={16} color={on ? 'var(--ink)' : 'var(--muted)'} /> {label}
              </button>
            );
          })}
        </div>
      </div>
      {Sub
        ? <Sub key={tab} nav={nav} params={params} mobile={mobile} onMenu={onMenu} PageHeader={NoHeader} />
        : <div className="content-pad">Bereich nicht gefunden.</div>}
    </>
  );
};
