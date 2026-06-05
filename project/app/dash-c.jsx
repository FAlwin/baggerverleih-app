/* ============ DASHBOARD VARIANTE C — "Plakativ" (editorial) ============ */
function DashC() {
  const F = window.FRIESEN, m = F.metrics;
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const wd = (iso) => WD[new Date(iso).getDay()];
  const R = 72, C = 2 * Math.PI * R;

  const finance = [
    { k: 'Offen', v: F.fmtEUR(m.offenBetrag), n: m.offenAnzahl + ' Rechnungen', c: 'var(--open)' },
    { k: 'Überfällig', v: F.fmtEUR(m.ueberBetrag), n: m.ueberAnzahl + ' Rechnung', c: 'var(--warn)' },
    { k: 'Mahnung', v: F.fmtEUR(m.mahnBetrag), n: 'Stufe 1', c: 'var(--danger)' },
  ];

  return (
    <div style={{ display: 'flex', height: 880, fontFamily: 'var(--sans)', color: 'var(--text)' }}>
      <window.Sidebar active="dashboard" variant="C" />
      <main style={{ flex: 1, background: 'var(--paper-2)', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '26px 32px 18px' }}>
          <div>
            <div className="kicker" style={{ color: 'var(--muted)' }}>Dienstag · 02. Juni 2026</div>
            <h1 style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>Guten Morgen, Julian</h1>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 20px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontWeight: 600, fontSize: 14.5, cursor: 'pointer' }}>
            <Icon name="plus" size={18} stroke={2.2} color="var(--yellow)" /> Neue Rechnung
          </button>
        </header>

        <div style={{ padding: '0 32px 28px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1, minHeight: 0 }}>
          {/* HERO */}
          <div style={{ background: 'var(--ink)', borderRadius: 8, padding: '30px 34px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 30, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div className="hazard" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 }} />
            <div>
              <div className="kicker" style={{ color: 'var(--yellow)' }}>Umsatz Juni 2026</div>
              <div className="mono" style={{ fontSize: 64, fontWeight: 600, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 10 }}>{F.fmtEUR(m.umsatzMonat)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, color: 'var(--on-dark-muted)', fontSize: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--yellow)', fontWeight: 600 }}><Icon name="arrowDown" size={15} /> Saisonstart</span>
                Vormonat {F.fmtEUR(m.umsatzVormonat)}
              </div>
              <div style={{ display: 'flex', gap: 30, marginTop: 26 }}>
                {[{ k: 'Eingenommen', v: F.fmtEUR(1735) }, { k: 'Aktive Einsätze', v: '4' }, { k: 'Geräte', v: '6' }].map((x) => (
                  <div key={x.k}>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{x.v}</div>
                    <div className="kicker" style={{ color: 'var(--on-dark-muted)', marginTop: 3 }}>{x.k}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Gauge */}
            <div style={{ position: 'relative', width: 180, height: 180, display: 'grid', placeItems: 'center' }}>
              <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="14" />
                <circle cx="90" cy="90" r={R} fill="none" stroke="var(--yellow)" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - m.auslastung / 100)} />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 40, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{m.auslastung}%</div>
                <div className="kicker" style={{ color: 'var(--on-dark-muted)', marginTop: 5 }}>Auslastung<br />Bagger</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, flex: 1, minHeight: 0 }}>
            {/* Termine */}
            <div style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1.5px solid var(--line)' }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Einsätze diese Woche</h2>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>KW 23</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {F.TERMINE.slice(0, 5).map((t, i) => {
                  const g = F.geraetById(t.geraetId), k = F.kundeById(t.kundeId);
                  const range = t.von === t.bis ? `${wd(t.von)}` : `${wd(t.von)}–${wd(t.bis)}`;
                  const today = t.von === '2026-06-02';
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', flex: 1, borderBottom: i < 4 ? '1px solid var(--paper-3)' : 'none', background: today ? 'var(--yellow-wash)' : 'transparent' }}>
                      <div style={{ width: 46, flex: '0 0 auto', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{range}</div>
                        <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{F.fmtDate(t.von).slice(0, 5)}</div>
                      </div>
                      <div style={{ width: 3, alignSelf: 'stretch', margin: '14px 0', background: today ? 'var(--yellow)' : 'var(--line-2)', borderRadius: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{g.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{k.name} · {t.ort}</div>
                      </div>
                      <Icon name={g.icon} size={24} color="var(--ink)" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Finance editorial tiles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
              {finance.map((f) => (
                <div key={f.k} style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderTop: '4px solid ' + f.c, borderRadius: 6, padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="kicker" style={{ color: 'var(--muted)' }}>{f.k}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{f.n}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 30, fontWeight: 600, color: f.c, letterSpacing: '-0.02em', marginTop: 6 }}>{f.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
window.DashC = DashC;
