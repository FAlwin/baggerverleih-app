/* ============ SCREEN: Dashboard (Variante B, live) ============ */
window.Screens = window.Screens || {};

window.Screens.dashboard = function Dashboard({ nav, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const m = store.metrics;
  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const days = F.WEEK;
  const machines = ['bagger', 'anhaenger', 'ruettler'];
  const bookingAt = (gid, day) => store.db.termine.find((t) => { const gs = (Array.isArray(t.geraete) && t.geraete.length) ? t.geraete : [t]; return gs.some((g) => g.geraetId === gid && day >= g.von && day <= g.bis); });
  const shortK = (id) => store.kundeById(id).name.replace(/ (GmbH|GbR)$/, '').split(' ').slice(-1)[0];
  // Kurzer Gerätename für die Matrix (letztes sinnvolles Wort)
  const matrixName = (g) => {
    const w = g.name.split(' ');
    const base = w.length > 1 ? w.slice(1).join(' ') : g.name;
    // Further shorten single long words
    return base.replace('Plateauanhänger', 'Plateauanh.').replace('Betonrüttler', 'Rüttler').replace('Minibagger', 'Bagger');
  };
  const [neuOpen, setNeuOpen] = React.useState(false);
  const [belegDetail, setBelegDetail] = React.useState(null);

  const stats = [
    { k: 'Umsatz Juni', v: F.fmtEUR(m.umsatzMonat), foot: 'Mai ' + F.fmtEUR(m.umsatzVormonat), go: ['buchhaltung'] },
    { k: 'Offen', v: F.fmtEUR(m.offenBetrag), foot: m.offenAnzahl + ' Rechnungen', go: ['rechnungen', { filter: 'offen' }] },
    { k: 'Überfällig', v: F.fmtEUR(m.ueberBetrag), foot: m.ueberAnzahl + ' Rechnung', tone: 'warn', go: ['rechnungen', { filter: 'ueberfaellig' }] },
    { k: 'Mahnung', v: F.fmtEUR(m.mahnBetrag), foot: 'Stufe 1', tone: 'danger', go: ['rechnungen', { filter: 'mahnung' }] },
    { k: 'Offene Angebote', v: F.fmtEUR(m.angebotBetrag), foot: m.angebotAnzahl + ' Angebote', go: ['angebote'] },
  ];

  const sums = { bezahlt: 0, offen: 0, ueberfaellig: 0, mahnung: 0 };
  store.db.rechnungen.forEach((r) => { sums[r.status] += r.betrag; });
  const total = Object.values(sums).reduce((a, b) => a + b, 0) || 1;
  const segs = [
    { key: 'bezahlt', label: 'Bezahlt', cls: 'ok' },
    { key: 'offen', label: 'Offen', cls: 'open' },
    { key: 'ueberfaellig', label: 'Überfällig', cls: 'warn' },
    { key: 'mahnung', label: 'Mahnung', cls: 'danger' },
  ];

  const actions = [
    ...store.db.rechnungen.filter((r) => r.status === 'mahnung').map((r) => ({ ic: 'alert', c: 'var(--danger)', t: 'Mahnung versenden', s: `${r.id} · ${shortK(r.kundeId)} · ${F.fmtEUR(r.betrag)}`, go: ['rechnung', { id: r.id }] })),
    ...store.db.rechnungen.filter((r) => r.status === 'ueberfaellig').map((r) => ({ ic: 'clock', c: 'var(--warn)', t: 'Überfällig nachfassen', s: `${r.id} · ${shortK(r.kundeId)} · ${F.fmtEUR(r.betrag)}`, go: ['rechnung', { id: r.id }] })),
    ...store.db.angebote.filter((a) => a.status === 'offen' && a.gueltigBis < store.today).map((a) => ({ ic: 'angebot', c: 'var(--open)', t: 'Angebot abgelaufen', s: `${a.id} · gültig bis ${F.fmtDate(a.gueltigBis)}`, go: ['angebote'] })),
  ].slice(0, 4);

  // Rückgabe-Erinnerung: laufende Vermietungen, die heute oder in den nächsten Tagen zurückkommen
  const rueckgaben = store.db.auftraege
    .filter((a) => a.status === 'reserviert' && a.bis >= store.today && a.bis <= window.addDays(store.today, 3))
    .sort((a, b) => a.bis.localeCompare(b.bis));

  // Auslieferungen diese Woche: reservierte Aufträge, deren Start (Übergabe) in der laufenden Woche liegt.
  const wochenEnde = (() => { const d = new Date(store.today + 'T00:00:00'); const toSun = (7 - d.getDay()) % 7; return window.addDays(store.today, toSun); })();
  const auslieferungen = store.db.auftraege
    .filter((a) => a.status === 'reserviert' && a.von >= store.today && a.von <= wochenEnde)
    .sort((a, b) => a.von.localeCompare(b.von));

  // „Neu" startet direkt eine Anfrage (häufigster Fall). Direktbuchung für Privat/Reparatur als zweite Option.
  const NEU_ITEMS = [
    { icon: 'bell',   label: 'Neue Anfrage',                    sub: 'Kundenanfrage erfassen – Start eines Auftrags',   go: ['anfragen', { neu: 1 }] },
    { icon: 'flotte', label: 'Direkt buchen (Privat/Reparatur)', sub: 'Maschine ohne Kunde sperren – Wartung, Eigennutzung', go: ['kalender', { neu: 'belegung' }] },
  ];

  return (
    <>
      <PageHeader kicker="Übersicht · Di 02.06.2026" title="Dashboard" mobile={mobile} onMenu={onMenu}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
          <window.UI.Btn icon="plus" onClick={() => nav('anfragen', { neu: 1 })}>Neu</window.UI.Btn>
          <window.UI.IconBtn name="chevronD" title="Weitere Optionen" onClick={() => setNeuOpen((v) => !v)} />
          {neuOpen && (
            <>
              <div onClick={() => setNeuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{ position: 'absolute', top: 46, right: 0, zIndex: 50, background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', minWidth: 240, overflow: 'hidden' }}>
                {NEU_ITEMS.map((item, i) => (
                  <button key={item.label} onClick={() => { setNeuOpen(false); nav(...item.go); }} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '13px 16px', border: 'none', borderTop: i ? '1px solid var(--paper-3)' : 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 'var(--r)', background: 'var(--yellow)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
                      <Icon name={item.icon} size={17} color="var(--ink)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </PageHeader>

      {/* Stat strip */}
      <div className="dash-strip" style={{ background: 'var(--paper)', borderBottom: '1.5px solid var(--line)' }}>
        {stats.map((s, i) => (
          <button key={s.k} onClick={() => nav(...s.go)} style={{ textAlign: 'left', font: 'inherit', cursor: 'pointer', padding: '15px 20px', borderLeft: i ? '1px solid var(--line)' : 'none', borderTop: 'none', borderRight: 'none', borderBottom: 'none', position: 'relative', background: 'transparent' }}>
            <div className="kicker" style={{ color: 'var(--muted)' }}>{s.k}</div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 600, marginTop: 8, letterSpacing: '-0.02em', color: s.tone === 'warn' ? 'var(--warn)' : s.tone === 'danger' ? 'var(--danger)' : 'var(--ink)' }}>{s.v}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>{s.foot}</div>
            {s.accent && <div className="hazard-thin" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 }} />}
          </button>
        ))}
      </div>

      {/* Kalender-Karte entfernt – es gibt den eigenen Kalender-Bereich (+ späteres iCal-Abo). */}
      <div className="content-pad split-2" style={{ alignContent: 'start', alignItems: 'start' }}>
          {auslieferungen.length > 0 && (
            <window.UI.Card style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                <Icon name="file" size={18} color="var(--yellow-deep)" />
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Auslieferungen · diese Woche</h2>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {auslieferungen.map((a) => {
                  const g = store.geraetById(a.geraetId);
                  const heute = a.von === store.today;
                  const st = window.mvStatus ? window.mvStatus(a) : null;
                  return (
                    <button key={a.id} onClick={() => nav('auftrag', { id: a.id, openMv: 1 })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: heute ? 'var(--yellow-wash)' : 'var(--paper-2)', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                      {g && <window.GeraetBadge geraet={g} size={26} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.kundeById(a.kundeId)?.name || 'Kunde'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g?.name || 'Gerät'}{a.ort ? ' · ' + a.ort : ''}</div>
                      </div>
                      <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: heute ? 'var(--yellow-deep)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{heute ? 'heute' : F.fmtDate(a.von)}</div>
                        {st && <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 2 }}>{st.label}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </window.UI.Card>
          )}
          {rueckgaben.length > 0 && (
            <window.UI.Card style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                <Icon name="clock" size={18} color="var(--warn)" />
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Rückgaben · heute & bald</h2>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {rueckgaben.map((a) => {
                  const g = store.geraetById(a.geraetId);
                  const heute = a.bis === store.today;
                  return (
                    <button key={a.id} onClick={() => nav('auftrag', { id: a.id })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: heute ? 'var(--warn-wash)' : 'var(--paper-2)', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                      {g && <window.GeraetBadge geraet={g} size={26} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g?.name || 'Gerät'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{store.kundeById(a.kundeId)?.name || ''}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: heute ? 'var(--warn)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{heute ? 'heute zurück' : F.fmtDate(a.bis)}</span>
                    </button>
                  );
                })}
              </div>
            </window.UI.Card>
          )}
          <window.UI.Card style={{ padding: 18 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Rechnungsstatus</h2>            <div style={{ display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden', border: '1px solid var(--line)' }}>
              {segs.map((s) => sums[s.key] > 0 && <div key={s.key} style={{ width: (sums[s.key] / total * 100) + '%', background: window.STATUS_COLOR[s.cls].fg }} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginTop: 16 }}>
              {segs.map((s) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: window.STATUS_COLOR[s.cls].fg, flex: '0 0 auto' }} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div><div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{F.fmtEUR(sums[s.key])}</div></div>
                </div>
              ))}
            </div>
          </window.UI.Card>

          <window.UI.Card style={{ padding: 18, flex: 1 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Offene Aktionen</h2>
            <div className="stack" style={{ gap: 9 }}>
              {actions.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Keine offenen Aktionen.</div>}
              {actions.map((a, i) => (
                <button key={i} onClick={() => nav(...a.go)} style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '11px 12px', background: 'var(--paper-2)', borderRadius: 'var(--r)', borderLeft: '3px solid ' + a.c, border: 'none', borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: a.c, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                  <Icon name={a.ic} size={18} color={a.c} />
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{a.t}</div><div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{a.s}</div></div>
                  <Icon name="chevron" size={16} color="var(--muted-2)" />
                </button>
              ))}
            </div>
          </window.UI.Card>
      </div>

      {/* Belegungs-Detail-Modal (Dashboard → Auftrag/Belegung) */}
      <window.UI.Modal open={!!belegDetail} onClose={() => setBelegDetail(null)} title={belegDetail && belegDetail.kind === 'belegung' ? 'Belegung' : 'Auftrag'} width={420}
        footer={belegDetail && (belegDetail.kind === 'belegung'
          ? <window.UI.Btn variant="ghost" onClick={() => { setBelegDetail(null); nav('kalender'); }}>Im Kalender</window.UI.Btn>
          : <>
              <window.UI.Btn variant="ghost" onClick={() => setBelegDetail(null)}>Schließen</window.UI.Btn>
              <window.UI.Btn icon="arrowRight" onClick={() => { const id = belegDetail.id; setBelegDetail(null); nav('auftrag', { id }); }}>Auftrag öffnen</window.UI.Btn>
            </>)}>
        {belegDetail && (() => {
          const g = store.geraetById(belegDetail.geraetId);
          const isBel = belegDetail.kind === 'belegung';
          const name = isBel ? (F.BELEGUNG_GRUND[belegDetail.grund]?.label || 'Belegung') : (store.kundeById(belegDetail.kundeId)?.name || 'Vermietung');
          const isRes = !isBel && (belegDetail.status === 'anfrage' || belegDetail.status === 'angebot');
          return (
            <div className="stack" style={{ gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {g && <window.GeraetBadge geraet={g} size={40} />}
                  <div><div style={{ fontWeight: 700, fontSize: 15 }}>{g?.name}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g?.detail}</div></div>
                </div>
                {!isBel && <window.Pill status={belegDetail.status} />}
              </div>
              <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 7, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name={isBel ? 'flotte' : 'kunden'} size={15} color="var(--muted)" />{name}</div>
                <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Datum:</b> {F.fmtDate(belegDetail.von)}{belegDetail.bis !== belegDetail.von ? ' – ' + F.fmtDate(belegDetail.bis) : ''}</div>
                {belegDetail.vonZeit && <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Uhrzeit:</b> {belegDetail.vonZeit}–{belegDetail.bisZeit}</div>}
                {belegDetail.ort && <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Ort:</b> {belegDetail.ort}</div>}
                {isRes && <div style={{ padding: '8px 11px', background: 'var(--warn-wash)', borderRadius: 'var(--r)', fontSize: 12.5, color: 'var(--warn)', fontWeight: 600 }}>⚠ Noch nicht fest gebucht – Angebot offen.</div>}
              </div>
            </div>
          );
        })()}
      </window.UI.Modal>
    </>
  );
};
