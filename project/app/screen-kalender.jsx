/* ============ SCREEN: Terminkalender v3 — Monat + Woche (Ressource×Zeit) ============ */
window.Screens = window.Screens || {};
const { useState: cvS, useMemo: cvM, useRef: cvR, useCallback: cvCB } = React;

function mondayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const day = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return window.addDays(iso, -day);
}
function kwOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d), o = new Date(y, 0, 1);
  return Math.ceil((((dt - o) / 86400000) + ((o.getDay() + 6) % 7) + 1) / 7);
}
function isoYM(iso) { return iso.slice(0, 7); }
function localDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const HOUR_START = 7, HOUR_END = 19, CELL_H_PX = 220; // px per day-cell in week view
const PX_PER_HOUR = CELL_H_PX / (HOUR_END - HOUR_START);
const DAY_COL_W = 120; // px per day column

function timeToY(time) {
  const [h, mi] = (time || '07:00').split(':').map(Number);
  return (h - HOUR_START + mi / 60) * PX_PER_HOUR;
}
function timeDiff(t1, t2) {
  const [h1, m1] = t1.split(':').map(Number), [h2, m2] = t2.split(':').map(Number);
  return (h2 * 60 + m2 - h1 * 60 - m1) / 60;
}
function yToTime(y) {
  const totalH = HOUR_START + Math.max(0, y / PX_PER_HOUR);
  const h = Math.floor(totalH), m = Math.floor((totalH - h) * 60 / 30) * 30;
  return String(Math.min(h, HOUR_END - 1)).padStart(2, '0') + ':' + String(Math.min(m, 59)).padStart(2, '0');
}

window.Screens.kalender = function Kalender({ nav, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const machines = store.db.flotte.filter((g) => g.kat === 'Maschine' || g.kat === 'Transport');

  const [view, setView] = cvS('month');
  const [focusDate, setFocus] = cvS(store.today);
  const [modal, setModal] = cvS(null);
  const [conflict, setConflict] = cvS(null);
  const [detail, setDetail] = cvS(null);

  // Month helpers
  const [ym, setym] = cvS(isoYM(store.today));
  const [year, month0] = ym.split('-').map(Number); // month0 = 1-based
  const firstDay = new Date(year, month0 - 1, 1);
  const lastDay = new Date(year, month0, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const calDays = cvM(() => {
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const iso = `${year}-${String(month0).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(iso);
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [ym]);

  // Week helpers
  const weekStart = cvM(() => mondayOf(focusDate), [focusDate]);
  const weekDays = cvM(() => Array.from({ length: 7 }, (_, i) => window.addDays(weekStart, i)), [weekStart]);
  const timeLabels = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  const termine = store.db.termine;
  const termineForDay = (gid, day) => termine.filter((t) => t.geraetId === gid && day >= t.von && day <= t.bis);
  const termineForMonth = (day) => day ? termine.filter((t) => day >= t.von && day <= t.bis) : [];

  const PRIVAT_ID = '__privat__';
  const [kundeMode, setKundeMode] = cvS('liste'); // 'liste' | 'neu' | 'privat'
  const [neuerKunde, setNeuerKunde] = cvS({ name: '', phone: '', email: '' });

  const openAdd = (geraetId, date, time) => {
    setConflict(null);
    setKundeMode('liste');
    setNeuerKunde({ name: '', phone: '', email: '' });
    setModal({ geraetId, von: date, bis: date, kundeId: store.db.kunden[0]?.id || '', ort: '', vonZeit: time || '08:00', bisZeit: time ? yToTime(timeToY(time) + PX_PER_HOUR) : '17:00', quellTyp: 'buchung' });
  };

  const save = () => {
    if (modal.bis < modal.von) { setConflict({ msg: 'Enddatum liegt vor dem Startdatum.' }); return; }
    let kundeId = modal.kundeId;
    if (kundeMode === 'privat') {
      kundeId = PRIVAT_ID;
    } else if (kundeMode === 'neu') {
      if (!neuerKunde.name.trim()) { setConflict({ msg: 'Bitte einen Namen für den neuen Kunden angeben.' }); return; }
      const c2 = store.findConflict(modal.geraetId, modal.von, modal.bis);
      if (c2) { const k2 = store.kundeById(c2.kundeId); setConflict({ msg: `Doppelbuchung: ${store.geraetById(modal.geraetId).name} ist ${F.fmtDate(c2.von)}–${F.fmtDate(c2.bis)} bereits bei ${k2?.name || 'Privat'}.` }); return; }
      // addKunde returns the new ID synchronously via closure
      const newKundeId = store.addKunde({ name: neuerKunde.name.trim(), phone: neuerKunde.phone, email: neuerKunde.email, typ: 'Privat', street: '', city: '' });
      store.addTermin({ ...modal, kundeId: newKundeId || ('k_' + Date.now()) });
      toast('Neuer Kunde angelegt & Termin gespeichert: ' + neuerKunde.name.trim());
      setModal(null);
      return;
    }
    const c = store.findConflict(modal.geraetId, modal.von, modal.bis);
    if (c) {
      const k = store.kundeById(c.kundeId);
      setConflict({ msg: `Doppelbuchung: ${store.geraetById(modal.geraetId).name} ist ${F.fmtDate(c.von)}–${F.fmtDate(c.bis)} bereits bei ${k?.name || 'Privat'}.` });
      return;
    }
    store.addTermin({ ...modal, kundeId, quellTyp: kundeMode === 'privat' ? 'privat' : modal.quellTyp });
    toast('Termin gespeichert'); setModal(null);
  };

  // ---- MONTH VIEW ----
  const MonthView = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <window.UI.IconBtn name="chevron" size={18} style={{ transform: 'scaleX(-1)' }} onClick={() => { const d = new Date(year, month0 - 2, 1); setym(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }} />
        <div style={{ fontWeight: 700, fontSize: 18, minWidth: 180, textAlign: 'center' }}>{MON[month0 - 1]} {year}</div>
        <window.UI.IconBtn name="chevron" size={18} onClick={() => { const d = new Date(year, month0, 1); setym(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }} />
        <window.UI.Btn variant="ghost" size="sm" onClick={() => setym(isoYM(store.today))}>Heute</window.UI.Btn>
      </div>
      <window.UI.Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1.5px solid var(--line)' }}>
          {WD.map((d) => <div key={d} style={{ padding: '9px 6px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {calDays.map((day, i) => {
            const ts = termineForMonth(day);
            const isToday = day === store.today;
            const inMonth = day && day.startsWith(ym);
            return (
              <div key={i} onClick={() => { if (day) { setFocus(day); setView('week'); } }} style={{ minHeight: 74, padding: '6px 8px', borderBottom: '1px solid var(--paper-3)', borderRight: i % 7 < 6 ? '1px solid var(--paper-3)' : 'none', background: isToday ? 'var(--yellow-wash)' : 'transparent', cursor: day ? 'pointer' : 'default', opacity: inMonth ? 1 : 0.35 }}>
                {day && <><div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--yellow-deep)' : 'var(--ink)' }}>{parseInt(day.slice(8))}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                    {ts.slice(0, 3).map((t) => {
                      const g = store.geraetById(t.geraetId);
                      const k = t.quellTyp === 'privat' ? { name: 'Privat' } : (store.kundeById(t.kundeId) || { name: t.typ === 'wartung' ? 'Wartung' : 'Belegung' });
                      if (!g) return null;
                      const isRes = t.quellTyp === 'reservierung';
                      const isPrivat = t.quellTyp === 'privat';
                      const bg = isPrivat ? 'var(--paper-3)' : isRes ? 'var(--yellow-soft)' : (g.farbe || 'var(--ink)');
                      const col = isPrivat ? 'var(--muted)' : isRes ? 'var(--warn)' : (['#F7C72A','#B5D334','#F39222'].includes(g.farbe) ? '#141414' : '#fff');
                      return (
                        <span key={t.id} style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 5px', borderRadius: 2, background: bg, color: col, border: isRes ? '1px dashed var(--warn)' : isPrivat ? '1px solid var(--line-2)' : 'none', display: 'flex', alignItems: 'center', gap: 3, maxWidth: '100%', overflow: 'hidden' }}>
                          <span style={{ flexShrink: 0 }}>{g.kuerzel}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, opacity: 0.85, fontSize: 8.5 }}>{k?.name?.split(' ')[0]}</span>
                        </span>
                      );
                    })}
                    {ts.length > 3 && <span style={{ fontSize: 9.5, color: 'var(--muted)' }}>+{ts.length - 3}</span>}
                  </div>
                </>}
              </div>
            );
          })}
        </div>
      </window.UI.Card>
    </div>
  );

  // ---- WEEK VIEW: Tage als Spalten, Stunden als Zeilen, alle Maschinen pro Zelle ----
  const WeekView = () => {
    const H_START = 7, H_END = 19, PX_H = 52; // px pro Stunde

    const termineAnTag = (day) => termine.filter((t) => day >= t.von && day <= t.bis);

    // Buchungsblöcke mit absoluter Position innerhalb einer Tagesspalte
    const BookingBlock = ({ t, dayW }) => {
      const g = store.geraetById(t.geraetId);
      const k = t.quellTyp === 'privat' ? { name: 'Privat' } : (store.kundeById(t.kundeId) || { name: t.typ === 'wartung' ? 'Wartung' : 'Belegung' });
      const isRes = t.quellTyp === 'reservierung';
      const isPrivat = t.quellTyp === 'privat';
      const vz = t.vonZeit || '07:00', bz = t.bisZeit || '19:00';
      const [vh, vm] = vz.split(':').map(Number);
      const [bh, bm] = bz.split(':').map(Number);
      const top = (vh - H_START + vm / 60) * PX_H;
      const height = Math.max(22, ((bh - vh) + (bm - vm) / 60) * PX_H - 2);
      const bg = isPrivat ? 'var(--paper-3)' : isRes ? 'rgba(217,119,43,.12)' : (g?.farbe || 'var(--ink)');
      const textCol = isPrivat ? 'var(--muted)' : isRes ? 'var(--warn)' : (['#F7C72A','#B5D334','#F39222'].includes(g?.farbe) ? '#141414' : '#fff');
      return (
        <button onClick={(e) => { e.stopPropagation(); setDetail(t); }}
          style={{ position: 'absolute', left: 2, right: 2, top, height,
            background: bg, border: isRes ? '1.5px dashed var(--warn)' : '1.5px solid rgba(0,0,0,.12)',
            borderLeft: `3px solid ${isPrivat ? 'var(--muted-2)' : isRes ? 'var(--warn)' : 'rgba(0,0,0,.3)'}`,
            borderRadius: 3, padding: '2px 5px', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: textCol, overflow: 'hidden', zIndex: 2 }}>
          {g && <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <window.GeraetBadge geraet={g} size={14} />
            <span style={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1 }}>{g.kuerzel}</span>
          </div>}
          <div style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1.2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k?.name || '?'}</div>
          {height > 40 && <div style={{ fontSize: 9.5, opacity: 0.8 }}>{vz}–{bz}</div>}
        </button>
      );
    };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <window.UI.IconBtn name="chevron" size={18} style={{ transform: 'scaleX(-1)' }} onClick={() => setFocus(window.addDays(weekStart, -7))} />
          <div style={{ minWidth: 200, fontWeight: 700, fontSize: 16 }}>KW {kwOf(weekStart)} · {F.fmtDate(weekDays[0]).slice(0, 5)} – {F.fmtDate(weekDays[6])}</div>
          <window.UI.IconBtn name="chevron" size={18} onClick={() => setFocus(window.addDays(weekStart, 7))} />
          <window.UI.Btn variant="ghost" size="sm" onClick={() => setFocus(store.today)}>Heute</window.UI.Btn>
        </div>
        <window.UI.Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 620 }}>
            {/* Stunden-Achse */}
            <div style={{ width: 44, flex: '0 0 44px', borderRight: '1.5px solid var(--line)', paddingTop: 42 }}>
              {Array.from({ length: H_END - H_START }, (_, i) => (
                <div key={i} style={{ height: PX_H, borderBottom: '1px solid var(--paper-3)', padding: '2px 6px 0', fontSize: 10, color: 'var(--muted)', textAlign: 'right', lineHeight: 1 }}>
                  {String(H_START + i).padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Tagesspalten */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', minWidth: 0 }}>
              {weekDays.map((day, di) => {
                const isToday = day === store.today;
                const isWE = di >= 5;
                const wd = (localDate(day).getDay() + 6) % 7;
                const ts = termineAnTag(day);
                return (
                  <div key={day} style={{ borderLeft: di > 0 ? '1px solid var(--paper-3)' : 'none', display: 'flex', flexDirection: 'column' }}>
                    {/* Tag-Header */}
                    <div style={{ padding: '6px 4px', textAlign: 'center', borderBottom: '1.5px solid var(--line)', background: isToday ? 'var(--yellow-wash)' : isWE ? 'var(--paper-2)' : 'var(--paper)', position: 'sticky', top: 0, zIndex: 5 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: isToday ? 'var(--yellow-deep)' : 'var(--muted)' }}>{WD[wd]}</div>
                      <div className="num" style={{ fontSize: 14, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--yellow-deep)' : 'var(--ink)' }}>{parseInt(day.slice(8))}</div>
                    </div>
                    {/* Zeitraster */}
                    <div style={{ position: 'relative', height: (H_END - H_START) * PX_H, background: isToday ? 'rgba(247,199,42,.03)' : isWE ? 'rgba(0,0,0,.012)' : 'transparent', cursor: 'crosshair' }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relY = e.clientY - rect.top;
                        const h = Math.floor(H_START + relY / PX_H);
                        const m = Math.floor(((relY / PX_H) % 1) / 0.5) * 30;
                        openAdd(machines[0]?.id, day, String(Math.min(h, H_END-1)).padStart(2,'0') + ':' + String(m).padStart(2,'0'));
                      }}>
                      {/* Stundenlinien */}
                      {Array.from({ length: H_END - H_START }, (_, i) => (
                        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * PX_H, height: 1, background: 'var(--paper-3)', pointerEvents: 'none' }} />
                      ))}
                      {/* Buchungsblöcke */}
                      {ts.map((t) => <BookingBlock key={t.id} t={t} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </window.UI.Card>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 10, background: 'var(--yellow)', borderLeft: '3px solid rgba(0,0,0,.3)', borderRadius: 2 }} /> Buchung</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 10, border: '1.5px dashed var(--warn)', borderRadius: 2, borderLeft: '3px solid var(--warn)' }} /> Reservierung</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 10, background: 'var(--paper-3)', borderLeft: '3px solid var(--muted-2)', borderRadius: 2 }} /> Privat</span>
          <span>Zeitslot anklicken → Termin anlegen (Gerät danach im Dialog auswählen)</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader kicker="Disposition" title="Terminkalender" mobile={mobile} onMenu={onMenu}>
        <div style={{ display: 'flex', gap: 6 }}>
          <window.UI.Btn variant={view === 'month' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('month')}>Monat</window.UI.Btn>
          <window.UI.Btn variant={view === 'week' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('week')}>Woche</window.UI.Btn>
        </div>
        <window.UI.Btn icon="plus" onClick={() => openAdd(machines[0]?.id, store.today)}>{mobile ? 'Neu' : 'Neuer Termin'}</window.UI.Btn>
      </PageHeader>

      <div className="content-pad">
        {view === 'month' ? <MonthView /> : <WeekView />}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 10, background: 'var(--yellow)', borderLeft: '3px solid var(--ink)', borderRadius: 2 }} /> Buchung</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 10, border: '2px dashed var(--warn)', borderRadius: 2, borderLeft: '3px solid var(--warn)' }} /> Reservierung (offenes Angebot)</span>
          <span>Monat: Tag anklicken → Wochenansicht · Woche: Zeitslot anklicken → Termin anlegen</span>
        </div>
      </div>

      {/* Detail */}
      <window.UI.Modal open={!!detail} onClose={() => setDetail(null)} title="Termin" width={440}
        footer={detail && <><window.UI.Btn variant="danger" icon="trash" onClick={() => { store.deleteTermin(detail.id); toast('Termin gelöscht'); setDetail(null); }}>Löschen</window.UI.Btn><window.UI.Btn variant="ghost" onClick={() => setDetail(null)}>Schließen</window.UI.Btn></>}>
        {detail && (() => {
          const k = detail.quellTyp === 'privat' ? { name: 'Privat (Julian)', phone: '', email: '' } : (store.kundeById(detail.kundeId) || { name: detail.typ === 'wartung' ? 'Wartung' : 'Belegung', phone: '', email: '' });
          const g = store.geraetById(detail.geraetId);
          return (
            <div className="stack" style={{ gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <window.GeraetBadge geraet={g} size={40} />
                <div><div style={{ fontWeight: 700 }}>{g?.name}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g?.detail}</div></div>
              </div>
              <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 7, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div onClick={() => { setDetail(null); nav('kunde', { id: k?.id }); }} style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="kunden" size={15} />{k?.name}</div>
                <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Datum:</b> {F.fmtDate(detail.von)}{detail.bis !== detail.von ? ' – ' + F.fmtDate(detail.bis) : ''}</div>
                <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Uhrzeit:</b> {detail.vonZeit || '08:00'} – {detail.bisZeit || '17:00'}</div>
                {detail.ort && <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Ort:</b> {detail.ort}</div>}
                {detail.quellTyp === 'reservierung' && <div style={{ padding: '8px 11px', background: 'var(--warn-wash)', borderRadius: 'var(--r)', fontSize: 12.5, color: 'var(--warn)', fontWeight: 600 }}>⚠ Reservierung — Angebot {detail.quellId} noch ausstehend</div>}
              </div>
            </div>
          );
        })()}
      </window.UI.Modal>

      {/* Add modal */}
      <window.UI.Modal open={!!modal} onClose={() => setModal(null)} title="Neuer Termin" width={480}
        footer={<><window.UI.Btn variant="ghost" onClick={() => setModal(null)}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" onClick={save}>Buchen</window.UI.Btn></>}>
        {modal && (
          <div className="stack" style={{ gap: 14 }}>
            {conflict && <div style={{ display: 'flex', gap: 10, padding: '11px 13px', background: 'var(--danger-wash)', borderRadius: 'var(--r)', color: 'var(--danger)', fontSize: 13 }}><Icon name="alert" size={18} style={{ flex: '0 0 auto' }} />{conflict.msg}</div>}
            <window.UI.Field label="Gerät">
              <window.UI.Select value={modal.geraetId} onChange={(e) => { setModal({ ...modal, geraetId: e.target.value }); setConflict(null); }}>
                {machines.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </window.UI.Select>
            </window.UI.Field>
            <window.UI.Field label="Kunde">
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {[['liste', 'Aus Liste'], ['neu', 'Neuer Kunde'], ['privat', 'Privat (Julian)']].map(([mode, label]) => (
                  <button key={mode} onClick={() => { setKundeMode(mode); setConflict(null); }}
                    style={{ flex: 1, padding: '7px 4px', fontSize: 12, fontWeight: 600, border: '1.5px solid', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--sans)',
                      borderColor: kundeMode === mode ? 'var(--yellow-deep)' : 'var(--line)',
                      background: kundeMode === mode ? 'var(--yellow-wash)' : 'transparent',
                      color: kundeMode === mode ? 'var(--yellow-deep)' : 'var(--muted)' }}>
                    {label}
                  </button>
                ))}
              </div>
              {kundeMode === 'liste' && (
                <window.UI.Select value={modal.kundeId} onChange={(e) => setModal({ ...modal, kundeId: e.target.value })}>
                  {store.db.kunden.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                </window.UI.Select>
              )}
              {kundeMode === 'neu' && (
                <div className="stack" style={{ gap: 8 }}>
                  <window.UI.Input placeholder="Name *" value={neuerKunde.name} onChange={(e) => setNeuerKunde({ ...neuerKunde, name: e.target.value })} />
                  <window.UI.Input placeholder="Telefon" value={neuerKunde.phone} onChange={(e) => setNeuerKunde({ ...neuerKunde, phone: e.target.value })} />
                  <window.UI.Input placeholder="E-Mail" value={neuerKunde.email} onChange={(e) => setNeuerKunde({ ...neuerKunde, email: e.target.value })} />
                </div>
              )}
              {kundeMode === 'privat' && (
                <div style={{ padding: '9px 12px', background: 'var(--yellow-wash)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                  Maschine wird für Julian / Privat geblockt.
                </div>
              )}
            </window.UI.Field>
            <div className="form-2">
              <window.UI.Field label="Von (Datum)"><window.UI.Input type="date" value={modal.von} onChange={(e) => { setModal({ ...modal, von: e.target.value }); setConflict(null); }} /></window.UI.Field>
              <window.UI.Field label="Bis (Datum)"><window.UI.Input type="date" value={modal.bis} onChange={(e) => { setModal({ ...modal, bis: e.target.value }); setConflict(null); }} /></window.UI.Field>
            </div>
            <div className="form-2">
              <window.UI.Field label="Von (Uhrzeit)"><window.UI.Input type="time" value={modal.vonZeit} onChange={(e) => setModal({ ...modal, vonZeit: e.target.value })} /></window.UI.Field>
              <window.UI.Field label="Bis (Uhrzeit)"><window.UI.Input type="time" value={modal.bisZeit} onChange={(e) => setModal({ ...modal, bisZeit: e.target.value })} /></window.UI.Field>
            </div>
            <window.UI.Field label="Einsatzort"><window.UI.Input value={modal.ort} onChange={(e) => setModal({ ...modal, ort: e.target.value })} placeholder="z. B. Baustelle Siegburg" /></window.UI.Field>
          </div>
        )}
      </window.UI.Modal>
    </>
  );
};
