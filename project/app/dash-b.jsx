/* ============ DASHBOARD VARIANTE B — "Werkstatt" (daten-dicht) ============ */
function DashB() {
  const F = window.FRIESEN, m = F.metrics;
  const days = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07'];
  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const machines = ['bagger', 'anhaenger', 'ruettler'];
  const bookingAt = (gid, day) => F.TERMINE.find((t) => t.geraetId === gid && day >= t.von && day <= t.bis);
  const shortK = (id) => F.kundeById(id).name.replace(/ (GmbH|GbR)$/, '').split(' ').slice(-1)[0];

  const stats = [
    { k: 'Umsatz Juni', v: F.fmtEUR(m.umsatzMonat), foot: '↘ Mai ' + F.fmtEUR(m.umsatzVormonat) },
    { k: 'Offen', v: F.fmtEUR(m.offenBetrag), foot: m.offenAnzahl + ' Rechnungen' },
    { k: 'Überfällig', v: F.fmtEUR(m.ueberBetrag), foot: m.ueberAnzahl + ' Rechnung', tone: 'warn' },
    { k: 'Mahnung', v: F.fmtEUR(m.mahnBetrag), foot: 'Stufe 1', tone: 'danger' },
    { k: 'Auslastung', v: m.auslastung + '%', foot: 'Bagger / Woche', tone: 'accent' },
  ];

  // Rechnungsstatus-Anteile
  const sums = { bezahlt: 0, offen: 0, ueberfaellig: 0, mahnung: 0 };
  F.RECHNUNGEN.forEach((r) => { sums[r.status] += r.betrag; });
  const total = Object.values(sums).reduce((a, b) => a + b, 0);
  const segs = [
    { key: 'bezahlt', label: 'Bezahlt', cls: 'ok' },
    { key: 'offen', label: 'Offen', cls: 'open' },
    { key: 'ueberfaellig', label: 'Überfällig', cls: 'warn' },
    { key: 'mahnung', label: 'Mahnung', cls: 'danger' },
  ];

  return (
    <div style={{ display: 'flex', height: 880, fontFamily: 'var(--sans)', color: 'var(--text)' }}>
      <window.Sidebar active="dashboard" variant="B" />
      <main style={{ flex: 1, background: 'var(--paper-2)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 26px', background: 'var(--ink)', color: 'var(--on-dark)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="hazard" style={{ width: 5, height: 38, borderRadius: 2 }} />
            <div style={{ minWidth: 0 }}>
              <div className="kicker" style={{ color: 'var(--yellow)', whiteSpace: 'nowrap' }}>Leitstand · Di 02.06.2026</div>
              <h1 style={{ margin: '2px 0 0', fontSize: 21, fontWeight: 700, letterSpacing: '-0.01em' }}>Dashboard</h1>
            </div>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'var(--yellow)', color: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            <Icon name="plus" size={17} stroke={2.2} /> Neue Rechnung
          </button>
        </header>

        {/* Connected stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: 'var(--paper)', borderBottom: '1.5px solid var(--line)' }}>
          {stats.map((s, i) => (
            <div key={s.k} style={{ padding: '16px 20px', borderLeft: i ? '1px solid var(--line)' : 'none', position: 'relative' }}>
              <div className="kicker" style={{ color: 'var(--muted)' }}>{s.k}</div>
              <div className="mono" style={{ fontSize: 27, fontWeight: 600, marginTop: 8, letterSpacing: '-0.02em', color: s.tone === 'warn' ? 'var(--warn)' : s.tone === 'danger' ? 'var(--danger)' : s.tone === 'accent' ? 'var(--ink)' : 'var(--ink)' }}>{s.v}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>{s.foot}</div>
              {s.tone === 'accent' && <div className="hazard-thin" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 }} />}
            </div>
          ))}
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18, flex: 1, minHeight: 0 }}>
          {/* Wocheneinsatzplan matrix */}
          <div style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1.5px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Icon name="kalender" size={18} /><h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Wocheneinsatzplan</h2>
              </div>
              <span className="kicker" style={{ color: 'var(--muted)' }}>KW 23 · keine Doppelbuchung</span>
            </div>
            <div style={{ padding: 16, flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '116px repeat(7,1fr)', gap: 6 }}>
                <div />
                {WD.map((d, i) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: days[i] === '2026-06-02' ? 'var(--ink)' : 'var(--muted)' }}>
                    <div>{d}</div><div className="mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{F.fmtDate(days[i]).slice(0, 2)}</div>
                  </div>
                ))}
                {machines.map((gid) => {
                  const g = F.geraetById(gid);
                  return (
                    <React.Fragment key={gid}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600 }}>
                        <Icon name={g.icon} size={17} color="var(--ink)" />{g.name.split(' ')[0]}
                      </div>
                      {days.map((day) => {
                        const b = bookingAt(gid, day);
                        const isToday = day === '2026-06-02';
                        return (
                          <div key={day} style={{
                            height: 52, borderRadius: 3, border: '1px solid ' + (b ? 'transparent' : 'var(--line)'),
                            background: b ? 'var(--yellow)' : (isToday ? 'var(--yellow-wash)' : 'var(--paper-2)'),
                            display: 'grid', placeItems: 'center', padding: 4, textAlign: 'center',
                          }}>
                            {b && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>{shortK(b.kundeId)}</div>}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 16, fontSize: 11.5, color: 'var(--muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: 'var(--yellow)', borderRadius: 2 }} /> Vermietet</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 2 }} /> Verfügbar</span>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0 }}>
            <div style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 18 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Rechnungsstatus</h2>
              <div style={{ display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden', border: '1px solid var(--line)' }}>
                {segs.map((s) => sums[s.key] > 0 && (
                  <div key={s.key} style={{ width: (sums[s.key] / total * 100) + '%', background: window.STATUS_COLOR[s.cls].fg }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginTop: 16 }}>
                {segs.map((s) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: window.STATUS_COLOR[s.cls].fg, flex: '0 0 auto' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{F.fmtEUR(sums[s.key])}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Offene Aktionen</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { ic: 'alert', c: 'var(--danger)', t: 'Mahnung versenden', s: 'R-2026-004 · Aydin · ' + F.fmtEUR(820) },
                  { ic: 'clock', c: 'var(--warn)', t: 'Überfällig nachfassen', s: 'R-2026-006 · Krämer · ' + F.fmtEUR(690) },
                  { ic: 'angebot', c: 'var(--open)', t: 'Angebot läuft ab', s: 'A-2026-016 · gültig bis 24.05.' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '11px 12px', background: 'var(--paper-2)', borderRadius: 'var(--r)', borderLeft: '3px solid ' + a.c }}>
                    <Icon name={a.ic} size={18} color={a.c} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.t}</div>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{a.s}</div>
                    </div>
                    <Icon name="chevron" size={16} color="var(--muted-2)" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
window.DashB = DashB;
