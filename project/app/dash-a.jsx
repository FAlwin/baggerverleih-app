/* ============ DASHBOARD VARIANTE A — "Leitstand" (klassisch) ============ */
function DashA() {
  const F = window.FRIESEN,m = F.metrics;
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const wd = (iso) => WD[new Date(iso).getDay()];
  const delta = Math.round((m.umsatzMonat - m.umsatzVormonat) / m.umsatzVormonat * 100);

  const Card = ({ children, style }) =>
  <div style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', ...style }}>{children}</div>;


  const kpis = [
  { k: 'Umsatz Juni 2026', v: F.fmtEUR(m.umsatzMonat), sub: `${delta}% ggü. Mai`, down: delta < 0, accent: false },
  { k: 'Offene Rechnungen', v: F.fmtEUR(m.offenBetrag), sub: `${m.offenAnzahl} Rechnungen`, accent: false },
  { k: 'Überfällig', v: F.fmtEUR(m.ueberBetrag + m.mahnBetrag), sub: `${m.ueberAnzahl + m.mahnAnzahl} offen · 1 Mahnung`, tone: 'warn' },
  { k: 'Offene Angebote', v: F.fmtEUR(1725), sub: '2 Angebote', accent: false }];


  return (
    <div style={{ display: 'flex', height: 880, fontFamily: 'var(--sans)', color: 'var(--text)' }}>
      <window.Sidebar active="dashboard" variant="A" />
      <main style={{ flex: 1, background: 'var(--paper-2)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', background: 'var(--paper)', borderBottom: '1.5px solid var(--line)' }}>
          <div>
            <div className="kicker" style={{ color: 'var(--muted)' }}>Übersicht</div>
            <h1 style={{ margin: '3px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', border: '1.5px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--paper-2)', color: 'var(--muted)', fontSize: 13 }}>
              <Icon name="search" size={16} /> Suchen …
            </div>
            <div style={{ position: 'relative', width: 40, height: 40, border: '1.5px solid var(--line)', borderRadius: 'var(--r)', display: 'grid', placeItems: 'center', background: 'var(--paper)' }} data-comment-anchor="061e7f92c3-div-33-13">
              <Icon name="bell" size={18} />
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, width: 17, height: 17, borderRadius: 9, display: 'grid', placeItems: 'center' }}>2</span>
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'var(--yellow)', color: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,.12)' }}>
              <Icon name="plus" size={17} stroke={2.2} /> Neue Rechnung
            </button>
          </div>
        </header>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minHeight: 0 }}>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {kpis.map((c) =>
            <Card key={c.k} style={{ padding: '18px 18px 16px', position: 'relative', overflow: 'hidden' }}>
                {c.tone === 'warn' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--warn)' }} />}
                <div className="kicker" style={{ color: 'var(--muted)' }}>{c.k}</div>
                <div className="mono" style={{ fontSize: 30, fontWeight: 600, marginTop: 10, letterSpacing: '-0.02em', color: c.tone === 'warn' ? 'var(--warn)' : 'var(--ink)' }}>{c.v}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7, fontSize: 12.5, color: 'var(--muted)' }}>
                  {c.k.startsWith('Umsatz') && <Icon name={c.down ? 'arrowDown' : 'arrowUp'} size={14} color={c.down ? 'var(--warn)' : 'var(--ok)'} />}
                  {c.sub}
                </div>
              </Card>
            )}
          </div>

          {/* Two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20, flex: 1, minHeight: 0 }}>
            {/* Termine */}
            <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1.5px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Icon name="kalender" size={18} color="var(--ink)" />
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>Termine diese Woche</h2>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--muted)' }}>KW 23 · Juni 2026 <Icon name="arrowRight" size={14} /></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {F.TERMINE.map((t, i) => {
                  const g = F.geraetById(t.geraetId),k = F.kundeById(t.kundeId);
                  const range = t.von === t.bis ? `${wd(t.von)} ${F.fmtDate(t.von).slice(0, 5)}` : `${wd(t.von)}–${wd(t.bis)} ${F.fmtDate(t.von).slice(0, 5)}`;
                  const today = t.von === '2026-06-02';
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: i < F.TERMINE.length - 1 ? '1px solid var(--paper-3)' : 'none', background: today ? 'var(--yellow-wash)' : 'transparent' }}>
                      <div style={{ width: 64, flex: '0 0 auto' }}>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{range}</div>
                        {today && <div className="kicker" style={{ color: 'var(--yellow-deep)', fontSize: 9, marginTop: 2 }}>Heute</div>}
                      </div>
                      <div style={{ width: 34, height: 34, flex: '0 0 auto', borderRadius: 3, background: 'var(--ink)', display: 'grid', placeItems: 'center' }}>
                        <Icon name={g.icon} size={19} color="var(--yellow)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>{k.name}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--muted)' }}>
                        <Icon name="pin" size={14} /> {t.ort}
                      </div>
                    </div>);

                })}
              </div>
            </Card>

            {/* Auslastung */}
            <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '16px 18px', borderBottom: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', gap: 9 }}>
                <Icon name="flotte" size={18} color="var(--ink)" />
                <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>Auslastung Flotte</h2>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
                <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
                  <div className="mono" style={{ fontSize: 52, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>{m.auslastung}<span style={{ fontSize: 26, color: 'var(--muted-2)' }}>%</span></div>
                  <div className="kicker" style={{ color: 'var(--muted)', marginTop: 6 }}>Minibagger · diese Woche</div>
                </div>
                {[{ n: '1,9t Minibagger', p: 78 }, { n: 'Plateauanhänger', p: 32 }, { n: 'Betonrüttler', p: 18 }].map((r) =>
                <div key={r.n}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{r.n}</span><span className="mono" style={{ color: 'var(--muted)' }}>{r.p}%</span>
                    </div>
                    <div style={{ height: 9, background: 'var(--paper-3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: r.p + '%', height: '100%', background: r.p > 60 ? 'var(--yellow)' : 'var(--ink)', borderRadius: 2 }} />
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 'auto', padding: '12px 14px', background: 'var(--yellow-wash)', borderRadius: 'var(--r)', border: '1px solid var(--yellow-soft)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Icon name="alert" size={17} color="var(--warn)" style={{ marginTop: 1, flex: '0 0 auto' }} />
                  <div style={{ fontSize: 12.5, lineHeight: 1.4 }}><b>1 Rechnung überfällig</b><br /><span style={{ color: 'var(--muted)' }}>R-2026-006 · Krämer GmbH · {F.fmtEUR(690)}</span></div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>);

}
window.DashA = DashA;