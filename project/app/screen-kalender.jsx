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

window.Screens.kalender = function Kalender({ nav, params = {}, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const machines = store.db.flotte.filter((g) => g.kat === 'Maschine' || g.kat === 'Transport');

  const [view, setView] = cvS(mobile ? 'agenda' : 'month');
  const [focusDate, setFocus] = cvS(store.today);
  const [modal, setModal] = cvS(null);
  const [conflict, setConflict] = cvS(null);
  const [detail, setDetail] = cvS(null);
  const [highlight, setHighlight] = cvS(params.highlight || null);
  const hlRing = (id) => id && id === highlight ? { boxShadow: '0 0 0 3px var(--warn)', position: 'relative', zIndex: 6 } : null;

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

  // Einheitliche Belegungsliste: Aufträge + Belegungen + offene Anfragen (vorgemerkt)
  const items = cvM(() => [
    ...store.db.auftraege.map((a) => ({ ...a, kind: 'auftrag' })),
    ...(store.db.belegungen || []).map((b) => ({ ...b, kind: 'belegung' })),
    ...(store.anfragen || []).filter((a) => a.von && (a.status === 'neu' || a.status === 'in-bearbeitung'))
      .map((a) => ({ ...a, bis: a.bis || a.von, kind: 'anfrage' })),
  ], [store.db.auftraege, store.db.belegungen, store.anfragen]);

  const itemsForDay = (gid, day) => items.filter((t) => t.geraetId === gid && day >= t.von && day <= t.bis);
  const itemsForMonth = (day) => day ? items.filter((t) => day >= t.von && day <= t.bis) : [];

  // Anzeige-Eigenschaften (Name, Farbe, gestrichelt) für ein Kalender-Item
  const disp = (t) => {
    const g = store.geraetById(t.geraetId);
    if (t.kind === 'anfrage') {
      return { g, name: t.name || 'Anfrage', bg: 'var(--paper)', col: 'var(--ink)', dashed: true, anfrage: true, kindLabel: 'Anfrage' };
    }
    if (t.kind === 'belegung') {
      const gr = F.BELEGUNG_GRUND[t.grund] || { label: t.grund, farbe: '#6B6B66' };
      const isW = t.grund === 'wartung';
      return { g, name: gr.label, bg: isW ? 'var(--warn-wash)' : 'var(--paper-3)', col: isW ? 'var(--warn)' : 'var(--muted)', dashed: false, kindLabel: gr.label };
    }
    const k = store.kundeById(t.kundeId);
    const reserv = t.status === 'anfrage' || t.status === 'angebot'; // noch nicht fest gebucht
    return {
      g, name: k?.name || 'Vermietung',
      bg: reserv ? 'var(--yellow-wash)' : (g?.farbe || 'var(--ink)'),
      col: reserv ? 'var(--warn)' : (['#F7C72A', '#B5D334', '#F39222'].includes(g?.farbe) ? '#141414' : '#fff'),
      dashed: reserv, kindLabel: 'Vermietung',
    };
  };

  const [art, setArt] = cvS('vermietung');       // 'vermietung' | 'belegung'
  const [kundeMode, setKundeMode] = cvS('liste'); // 'liste' | 'neu'
  const [neuerKunde, setNeuerKunde] = cvS({ name: '', phone: '', email: '' });

  const openAdd = (geraetId, date, time, art0) => {
    setConflict(null);
    setArt(art0 || 'vermietung');
    setKundeMode('liste');
    setNeuerKunde({ name: '', phone: '', email: '' });
    setModal({ geraetId: geraetId || machines[0]?.id, von: date, bis: date, kundeId: store.db.kunden[0]?.id || '', ort: '', vonZeit: time || '08:00', bisZeit: time ? yToTime(timeToY(time) + PX_PER_HOUR) : '17:00', grund: 'privat', notiz: '' });
  };

  // Bestehende Belegung bearbeiten (gleicher Dialog, Art fix auf 'belegung')
  const openEditBelegung = (b) => {
    setConflict(null);
    setArt('belegung');
    setModal({ editId: b.id, geraetId: b.geraetId, von: b.von, bis: b.bis, vonZeit: b.vonZeit || '08:00', bisZeit: b.bisZeit || '17:00', ort: b.ort || '', grund: b.grund || 'privat', notiz: b.notiz || '', kundeId: '' });
  };

  // Aus „Aufträge → Neuer Auftrag → Direkt buchen" kommend: Buchungs-Dialog automatisch öffnen
  React.useEffect(() => {
    if (params && params.neu === 'auftrag') openAdd(machines[0]?.id, store.today, null, 'vermietung');
    // eslint-disable-next-line
  }, []);

  // „Im Kalender zeigen": auf den richtigen Monat springen und Eintrag kurz hervorheben
  React.useEffect(() => {
    if (params && params.highlight) {
      const au = store.auftragById(params.highlight);
      const m = params.ym || (au && isoYM(au.von)) || isoYM(store.today);
      setym(m);
      if (au) setFocus(au.von);
      setView(mobile ? 'agenda' : 'month');
      const tmo = setTimeout(() => setHighlight(null), 4500);
      return () => clearTimeout(tmo);
    }
    // eslint-disable-next-line
  }, []);

  const save = () => {
    if (modal.bis < modal.von) { setConflict({ msg: 'Enddatum liegt vor dem Startdatum.' }); return; }
    const c = store.findConflict(modal.geraetId, modal.von, modal.bis, modal.editId);
    if (c) {
      const belegt = c.kind === undefined && c.grund ? (F.BELEGUNG_GRUND[c.grund]?.label || 'Belegung') : (store.kundeById(c.kundeId)?.name || 'Belegung');
      setConflict({ msg: `Doppelbuchung: ${store.geraetById(modal.geraetId)?.name} ist ${F.fmtDate(c.von)}–${F.fmtDate(c.bis)} bereits belegt (${belegt}).` });
      return;
    }
    if (art === 'belegung') {
      const data = { grund: modal.grund, geraetId: modal.geraetId, von: modal.von, bis: modal.bis, vonZeit: modal.vonZeit, bisZeit: modal.bisZeit, ort: modal.ort, notiz: modal.notiz };
      if (modal.editId) { store.updateBelegung(modal.editId, data); toast('Belegung aktualisiert'); }
      else { store.addBelegung(data); toast('Belegung gespeichert'); }
      setModal(null); return;
    }
    // Vermietung → Auftrag (direkt gebucht)
    let kundeId = modal.kundeId;
    if (kundeMode === 'neu') {
      if (!neuerKunde.name.trim()) { setConflict({ msg: 'Bitte einen Namen für den neuen Kunden angeben.' }); return; }
      kundeId = store.addKunde({ name: neuerKunde.name.trim(), phone: neuerKunde.phone, email: neuerKunde.email, typ: 'Privat', street: '', city: '' });
    } else if (!kundeId) {
      setConflict({ msg: 'Bitte einen Kunden auswählen.' }); return;
    }
    store.addAuftrag({ geraetId: modal.geraetId, kundeId, von: modal.von, bis: modal.bis, vonZeit: modal.vonZeit, bisZeit: modal.bisZeit, ort: modal.ort, status: 'reserviert' });
    toast(kundeMode === 'neu' ? 'Kunde angelegt & Auftrag gebucht' : 'Auftrag gebucht'); setModal(null);
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
            const ts = itemsForMonth(day);
            const isToday = day === store.today;
            const inMonth = day && day.startsWith(ym);
            return (
              <div key={i} onClick={() => { if (day) { setFocus(day); setView('week'); } }} style={{ minHeight: 74, padding: '6px 8px', borderBottom: '1px solid var(--paper-3)', borderRight: i % 7 < 6 ? '1px solid var(--paper-3)' : 'none', background: isToday ? 'var(--yellow-wash)' : 'transparent', cursor: day ? 'pointer' : 'default', opacity: inMonth ? 1 : 0.35 }}>
                {day && <><div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--yellow-deep)' : 'var(--ink)' }}>{parseInt(day.slice(8))}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                    {ts.slice(0, 3).map((t) => {
                      const d = disp(t);
                      if (!d.g) return null;
                      return (
                        <span key={t.id} onClick={(e) => { e.stopPropagation(); setDetail(t); }} title="Details öffnen" style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 5px', borderRadius: 2, background: d.bg, color: d.col, border: d.anfrage ? '1px dashed #2B6CB0' : d.dashed ? '1px dashed var(--warn)' : t.kind === 'belegung' ? '1px solid var(--line-2)' : 'none', display: 'flex', alignItems: 'center', gap: 3, maxWidth: '100%', overflow: 'hidden', cursor: 'pointer', ...hlRing(t.id) }}>
                          <span style={{ flexShrink: 0 }}>{d.g.kuerzel}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, opacity: 0.85, fontSize: 8.5 }}>{d.name?.split(' ')[0]}</span>
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
    const s = store.db.settings || {};
    const H_START = s.geschaeftszeitVon ?? 7, H_END = s.geschaeftszeitBis ?? 19, PX_H = 52; // px pro Stunde

    const termineAnTag = (day) => items.filter((t) => day >= t.von && day <= t.bis);

    // Buchungsblöcke mit absoluter Position innerhalb einer Tagesspalte
    const BookingBlock = ({ t }) => {
      const d = disp(t);
      const isBel = t.kind === 'belegung';
      const vz = t.vonZeit || '07:00', bz = t.bisZeit || '19:00';
      const [vh, vm] = vz.split(':').map(Number);
      const [bh, bm] = bz.split(':').map(Number);
      const top = (vh - H_START + vm / 60) * PX_H;
      const height = Math.max(22, ((bh - vh) + (bm - vm) / 60) * PX_H - 2);
      const accent = d.anfrage ? '#2B6CB0' : 'var(--warn)';
      const bg = d.anfrage ? 'rgba(43,108,176,.10)' : d.dashed ? 'rgba(217,119,43,.12)' : d.bg;
      return (
        <button onClick={(e) => { e.stopPropagation(); setDetail(t); }}
          style={{ position: 'absolute', left: 2, right: 2, top, height,
            background: bg, border: d.dashed ? `1.5px dashed ${accent}` : '1.5px solid rgba(0,0,0,.12)',
            borderLeft: `3px solid ${isBel ? 'var(--muted-2)' : d.dashed ? accent : 'rgba(0,0,0,.3)'}`,
            borderRadius: 3, padding: '2px 5px', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: d.col, overflow: 'hidden', zIndex: 2, ...hlRing(t.id) }}>
          {d.g && <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <window.GeraetBadge geraet={d.g} size={14} />
            <span style={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1 }}>{d.g.kuerzel}</span>
          </div>}
          <div style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1.2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 10, border: '1.5px dashed var(--warn)', borderRadius: 2, borderLeft: '3px solid var(--warn)' }} /> Reservierung (Angebot)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 10, background: 'var(--paper-3)', borderLeft: '3px solid var(--muted-2)', borderRadius: 2 }} /> Privat / Wartung</span>
          <span>Zeitslot anklicken → buchen (Gerät danach im Dialog wählen)</span>
        </div>
      </div>
    );
  };

  // ---- AGENDA VIEW (mobile default): N Tage als Liste ----
  const AgendaView = () => {
    const days = Array.from({ length: 28 }, (_, i) => window.addDays(focusDate, i - (focusDate === store.today ? 0 : 0)));
    return (
      <div className="stack" style={{ gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <window.UI.IconBtn name="chevron" size={18} style={{ transform: 'scaleX(-1)' }} onClick={() => setFocus(window.addDays(focusDate, -7))} />
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{MON[parseInt(focusDate.slice(5,7))-1]} {focusDate.slice(0,4)}</div>
          <window.UI.IconBtn name="chevron" size={18} onClick={() => setFocus(window.addDays(focusDate, 7))} />
          <window.UI.Btn variant="ghost" size="sm" onClick={() => setFocus(store.today)}>Heute</window.UI.Btn>
        </div>
        <window.UI.Card style={{ padding: 0, overflow: 'hidden' }}>
          {days.map((day) => {
            const ts = itemsForMonth(day);
            const isToday = day === store.today;
            const [, dm, dd] = day.split('-').map(Number);
            const wd = WD[(new Date(day.split('-')[0], dm-1, dd).getDay() + 6) % 7];
            return (
              <div key={day} style={{ display: 'flex', borderBottom: '1px solid var(--paper-3)', background: isToday ? 'var(--yellow-wash)' : 'transparent', minHeight: 44 }}>
                <div style={{ width: 56, flex: '0 0 56px', padding: '10px 8px', textAlign: 'center', borderRight: '1.5px solid var(--line)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? 'var(--yellow-deep)' : 'var(--muted)', textTransform: 'uppercase' }}>{wd}</div>
                  <div className="num" style={{ fontSize: 18, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--yellow-deep)' : 'var(--ink)', lineHeight: 1.1 }}>{dd}</div>
                </div>
                <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                  {ts.length === 0
                    ? <span style={{ fontSize: 12, color: 'var(--muted-2)', fontStyle: 'italic' }}>frei</span>
                    : ts.map((t) => {
                        const d = disp(t);
                        return (
                          <button key={t.id} onClick={() => setDetail(t)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', background: d.anfrage ? 'rgba(43,108,176,.10)' : d.dashed ? 'var(--yellow-wash)' : d.bg, border: d.anfrage ? '1.5px dashed #2B6CB0' : d.dashed ? '1.5px dashed var(--warn)' : 'none', borderRadius: 4, cursor: 'pointer', font: 'inherit', color: d.col, textAlign: 'left', ...hlRing(t.id) }}>
                            {d.g && <window.GeraetBadge geraet={d.g} size={20} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                              {t.vonZeit && <div style={{ fontSize: 10.5, opacity: 0.85 }}>{t.vonZeit}–{t.bisZeit}{t.ort ? ' · ' + t.ort : ''}</div>}
                            </div>
                          </button>
                        );
                      })
                  }
                </div>
              </div>
            );
          })}
        </window.UI.Card>
      </div>
    );
  };

  // ---- GERÄTE-ZEITLEISTE (mobile, übersicht): Maschine × Wochentag ----
  const GeraeteView = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <window.UI.IconBtn name="chevron" size={18} style={{ transform: 'scaleX(-1)' }} onClick={() => setFocus(window.addDays(weekStart, -7))} />
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>KW {kwOf(weekStart)}</div>
        <window.UI.IconBtn name="chevron" size={18} onClick={() => setFocus(window.addDays(weekStart, 7))} />
        <window.UI.Btn variant="ghost" size="sm" onClick={() => setFocus(store.today)}>Heute</window.UI.Btn>
      </div>
      <window.UI.Card style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1.5px solid var(--line)', background: 'var(--paper)', fontWeight: 700, fontSize: 12, position: 'sticky', left: 0, zIndex: 3 }}>Gerät</th>
              {weekDays.map((day) => {
                const isToday = day === store.today;
                const [, dm, dd] = day.split('-').map(Number);
                const wd = WD[(new Date(day.split('-')[0], dm-1, dd).getDay() + 6) % 7];
                return (
                  <th key={day} style={{ padding: '6px 4px', textAlign: 'center', borderBottom: '1.5px solid var(--line)', background: isToday ? 'var(--yellow-wash)' : 'var(--paper)', minWidth: 44, borderLeft: '1px solid var(--paper-3)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? 'var(--yellow-deep)' : 'var(--muted)' }}>{wd}</div>
                    <div className="num" style={{ fontSize: 14, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--yellow-deep)' : 'var(--ink)' }}>{dd}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {machines.map((g) => (
              <tr key={g.id}>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--paper-3)', background: 'var(--paper)', position: 'sticky', left: 0, zIndex: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <window.GeraetBadge geraet={g} size={24} />
                    <span style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{g.name.replace('1,9t ', '').replace('Plateauanhänger', 'Anhänger').replace('Betonrüttler', 'Rüttler')}</span>
                  </div>
                </td>
                {weekDays.map((day) => {
                  const ts = itemsForDay(g.id, day);
                  const isToday = day === store.today;
                  return (
                    <td key={day} style={{ padding: 3, borderBottom: '1px solid var(--paper-3)', borderLeft: '1px solid var(--paper-3)', background: isToday ? 'rgba(247,199,42,.05)' : 'transparent', verticalAlign: 'top' }}>
                      {ts.map((t) => {
                        const d = disp(t);
                        return (
                          <button key={t.id} onClick={() => setDetail(t)} style={{ display: 'block', width: '100%', padding: '3px 5px', background: d.anfrage ? 'rgba(43,108,176,.10)' : d.dashed ? 'var(--yellow-wash)' : d.bg, border: d.anfrage ? '1px dashed #2B6CB0' : d.dashed ? '1px dashed var(--warn)' : 'none', borderRadius: 3, color: d.col, cursor: 'pointer', font: 'inherit', textAlign: 'left', marginBottom: 2, ...hlRing(t.id) }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name?.split(' ').slice(-1)[0]}</div>
                            {t.vonZeit && <div style={{ fontSize: 9.5, opacity: 0.8 }}>{t.vonZeit}–{t.bisZeit}</div>}
                          </button>
                        );
                      })}
                      {ts.length === 0 && <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button onClick={() => openAdd(g.id, day)} style={{ width: 22, height: 22, borderRadius: 11, background: 'var(--paper-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 0 }}>
                          <Icon name="plus" size={12} color="var(--muted-2)" style={{ display: 'block' }} />
                        </button>
                      </div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </window.UI.Card>
    </div>
  );

  return (
    <>
      <PageHeader kicker="Disposition" title="Terminkalender" mobile={mobile} onMenu={onMenu}>
        {!mobile && (
          <div style={{ display: 'flex', gap: 6 }}>
            <window.UI.Btn variant={view === 'month' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('month')}>Monat</window.UI.Btn>
            <window.UI.Btn variant={view === 'week' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('week')}>Woche</window.UI.Btn>
          </div>
        )}
        <window.UI.Btn icon="plus" onClick={() => openAdd(machines[0]?.id, store.today)}>Neu</window.UI.Btn>
      </PageHeader>

      <div className="content-pad">
        {/* Mobile-Ansicht-Umschalter direkt in der Content-Area */}
        {mobile && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <window.UI.Btn variant={view === 'agenda' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('agenda')}>Agenda</window.UI.Btn>
            <window.UI.Btn variant={view === 'geraete' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('geraete')}>Geräteplan</window.UI.Btn>
          </div>
        )}
        {view === 'month' ? <MonthView /> : view === 'week' ? <WeekView /> : view === 'agenda' ? <AgendaView /> : <GeraeteView />}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 10, background: 'var(--yellow)', borderLeft: '3px solid var(--ink)', borderRadius: 2 }} /> Vermietung (gebucht)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 10, border: '2px dashed var(--warn)', borderRadius: 2, borderLeft: '3px solid var(--warn)' }} /> Reservierung (offenes Angebot)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 10, border: '2px dashed #2B6CB0', borderRadius: 2, borderLeft: '3px solid #2B6CB0' }} /> Anfrage (vorgemerkt)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 10, background: 'var(--paper-3)', borderLeft: '3px solid var(--muted-2)', borderRadius: 2 }} /> Privat / Wartung</span>
          <span>Monat/Agenda: Eintrag anklicken → Details · Woche: Zeitslot anklicken → buchen</span>
        </div>
      </div>

      {/* Detail */}
      <window.UI.Modal open={!!detail} onClose={() => setDetail(null)} title={detail && detail.kind === 'belegung' ? 'Belegung' : detail && detail.kind === 'anfrage' ? 'Anfrage (vorgemerkt)' : 'Auftrag'} width={440}
        footer={detail && (detail.kind === 'belegung'
          ? <><window.UI.Btn variant="danger" icon="trash" onClick={() => { const snap = store.snapshot(); store.deleteBelegung(detail.id); toast('Belegung gelöscht', { undo: () => store.restoreSnapshot(snap) }); setDetail(null); }}>Löschen</window.UI.Btn><window.UI.Btn variant="ghost" icon="edit" onClick={() => { const b = detail; setDetail(null); openEditBelegung(b); }}>Bearbeiten</window.UI.Btn><window.UI.Btn variant="ghost" onClick={() => setDetail(null)}>Schließen</window.UI.Btn></>
          : detail.kind === 'anfrage'
          ? <><window.UI.Btn variant="ghost" onClick={() => setDetail(null)}>Schließen</window.UI.Btn><window.UI.Btn icon="arrowRight" onClick={() => { setDetail(null); nav('anfragen'); }}>Zu den Anfragen</window.UI.Btn></>
          : <><window.UI.Btn variant="ghost" onClick={() => setDetail(null)}>Schließen</window.UI.Btn><window.UI.Btn icon="arrowRight" onClick={() => { const id = detail.id; setDetail(null); nav('auftrag', { id }); }}>Auftrag öffnen</window.UI.Btn></>)}>
        {detail && (() => {
          const g = store.geraetById(detail.geraetId);
          if (detail.kind === 'anfrage') {
            return (
              <div className="stack" style={{ gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {g && <window.GeraetBadge geraet={g} size={40} />}
                  <div><div style={{ fontWeight: 700 }}>{detail.name}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g?.name || 'Wunschgerät'}</div></div>
                </div>
                <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 7, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Wunsch-Zeitraum:</b> {F.fmtDate(detail.von)}{detail.bis && detail.bis !== detail.von ? ' – ' + F.fmtDate(detail.bis) : ''}</div>
                  {detail.ort && <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Ort:</b> {detail.ort}</div>}
                  {(detail.phone || detail.email) && <div style={{ color: 'var(--muted)' }}>{detail.phone} {detail.email ? '· ' + detail.email : ''}</div>}
                  <div style={{ padding: '8px 11px', background: 'rgba(43,108,176,.10)', borderRadius: 'var(--r)', fontSize: 12.5, color: '#2B6CB0', fontWeight: 600 }}>Vorgemerkt – noch kein Auftrag. In „Anfragen" annehmen.</div>
                </div>
              </div>
            );
          }
          if (detail.kind === 'belegung') {
            const gr = F.BELEGUNG_GRUND[detail.grund] || { label: detail.grund };
            return (
              <div className="stack" style={{ gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <window.GeraetBadge geraet={g} size={40} />
                  <div><div style={{ fontWeight: 700 }}>{g?.name}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g?.detail}</div></div>
                </div>
                <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 7, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="flotte" size={15} /> {gr.label}</div>
                  <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Datum:</b> {F.fmtDate(detail.von)}{detail.bis !== detail.von ? ' – ' + F.fmtDate(detail.bis) : ''}</div>
                  <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Uhrzeit:</b> {detail.vonZeit || '08:00'} – {detail.bisZeit || '17:00'}</div>
                  {detail.ort && <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Ort:</b> {detail.ort}</div>}
                  {detail.notiz && <div style={{ padding: '8px 11px', background: 'var(--paper-3)', borderRadius: 'var(--r)', fontSize: 12.5 }}>{detail.notiz}</div>}
                </div>
              </div>
            );
          }
          const k = store.kundeById(detail.kundeId) || { name: 'Vermietung' };
          const reserv = detail.status === 'anfrage' || detail.status === 'angebot';
          return (
            <div className="stack" style={{ gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <window.GeraetBadge geraet={g} size={40} />
                  <div><div style={{ fontWeight: 700 }}>{g?.name}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g?.detail}</div></div>
                </div>
                <window.Pill status={detail.status} />
              </div>
              <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 7, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="kunden" size={15} />{k?.name}</div>
                <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Datum:</b> {F.fmtDate(detail.von)}{detail.bis !== detail.von ? ' – ' + F.fmtDate(detail.bis) : ''}</div>
                <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Uhrzeit:</b> {detail.vonZeit || '08:00'} – {detail.bisZeit || '17:00'}</div>
                {detail.ort && <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Ort:</b> {detail.ort}</div>}
                {reserv && <div style={{ padding: '8px 11px', background: 'var(--warn-wash)', borderRadius: 'var(--r)', fontSize: 12.5, color: 'var(--warn)', fontWeight: 600 }}>⚠ Noch nicht fest gebucht – Angebot offen.</div>}
              </div>
            </div>
          );
        })()}
      </window.UI.Modal>

      {/* Add modal */}
      <window.UI.Modal open={!!modal} onClose={() => setModal(null)} title={modal && modal.editId ? 'Belegung bearbeiten' : (art === 'belegung' ? 'Maschine blocken' : 'Vermietung buchen')} width={480}
        footer={<><window.UI.Btn variant="ghost" onClick={() => setModal(null)}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" onClick={save}>{modal && modal.editId ? 'Speichern' : (art === 'belegung' ? 'Blocken' : 'Buchen')}</window.UI.Btn></>}>
        {modal && (
          <div className="stack" style={{ gap: 14 }}>
            {/* Art-Umschalter — beim Bearbeiten ausgeblendet */}
            {!modal.editId && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[['vermietung', 'Vermietung (Kunde)'], ['belegung', 'Privat / Wartung']].map(([m, label]) => (
                <button key={m} onClick={() => { setArt(m); setConflict(null); }}
                  style={{ flex: 1, padding: '9px 6px', fontSize: 13, fontWeight: 600, border: '1.5px solid', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--sans)',
                    borderColor: art === m ? 'var(--ink)' : 'var(--line-2)', background: art === m ? 'var(--ink)' : 'var(--paper)', color: art === m ? '#fff' : 'var(--muted)' }}>
                  {label}
                </button>
              ))}
            </div>
            )}
            {conflict && <div style={{ display: 'flex', gap: 10, padding: '11px 13px', background: 'var(--danger-wash)', borderRadius: 'var(--r)', color: 'var(--danger)', fontSize: 13 }}><Icon name="alert" size={18} style={{ flex: '0 0 auto' }} />{conflict.msg}</div>}
            <window.UI.Field label="Gerät">
              <window.UI.Select value={modal.geraetId} onChange={(e) => { setModal({ ...modal, geraetId: e.target.value }); setConflict(null); }}>
                {machines.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </window.UI.Select>
            </window.UI.Field>
            {art === 'vermietung' ? (
              <window.UI.Field label="Kunde">
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {[['liste', 'Aus Liste'], ['neu', 'Neuer Kunde']].map(([mode, label]) => (
                    <button key={mode} onClick={() => { setKundeMode(mode); setConflict(null); }}
                      style={{ flex: 1, padding: '7px 4px', fontSize: 12.5, fontWeight: 600, border: '1.5px solid', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--sans)',
                        borderColor: kundeMode === mode ? 'var(--yellow-deep)' : 'var(--line)',
                        background: kundeMode === mode ? 'var(--yellow-wash)' : 'transparent',
                        color: kundeMode === mode ? 'var(--yellow-deep)' : 'var(--muted)' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {kundeMode === 'liste' && (
                  <window.UI.Select value={modal.kundeId} onChange={(e) => setModal({ ...modal, kundeId: e.target.value })}>
                    <option value="">— bitte wählen —</option>
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
              </window.UI.Field>
            ) : (
              <window.UI.Field label="Grund" hint="Blockt die Maschine im Kalender – ohne Auftrag, ohne Rechnung.">
                <window.UI.Select value={modal.grund} onChange={(e) => setModal({ ...modal, grund: e.target.value })}>
                  <option value="privat">Privat / Verleih an Familie & Freunde</option>
                  <option value="wartung">Wartung</option>
                </window.UI.Select>
              </window.UI.Field>
            )}
            <div className="form-2">
              <window.UI.Field label="Von (Datum)"><window.UI.Input type="date" value={modal.von} onChange={(e) => { setModal({ ...modal, von: e.target.value }); setConflict(null); }} /></window.UI.Field>
              <window.UI.Field label="Bis (Datum)"><window.UI.Input type="date" value={modal.bis} onChange={(e) => { setModal({ ...modal, bis: e.target.value }); setConflict(null); }} /></window.UI.Field>
            </div>
            <div className="form-2">
              <window.UI.Field label="Von (Uhrzeit)"><window.UI.Input type="time" value={modal.vonZeit} onChange={(e) => setModal({ ...modal, vonZeit: e.target.value })} /></window.UI.Field>
              <window.UI.Field label="Bis (Uhrzeit)"><window.UI.Input type="time" value={modal.bisZeit} onChange={(e) => setModal({ ...modal, bisZeit: e.target.value })} /></window.UI.Field>
            </div>
            <window.UI.Field label={art === 'belegung' ? 'Ort (optional)' : 'Einsatzort'}><window.UI.Input value={modal.ort} onChange={(e) => setModal({ ...modal, ort: e.target.value })} placeholder={art === 'belegung' ? 'z. B. Werkstatt' : 'z. B. Baustelle Siegburg'} /></window.UI.Field>
            {art === 'belegung' && <window.UI.Field label="Notiz (optional)"><window.UI.Input value={modal.notiz} onChange={(e) => setModal({ ...modal, notiz: e.target.value })} placeholder="z. B. Inspektion" /></window.UI.Field>}
          </div>
        )}
      </window.UI.Modal>
    </>
  );
};
