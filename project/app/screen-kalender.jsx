/* ============================================================
   SCREEN: Terminkalender v4 — Monat (Raster) + Woche (Plantafel)
   Stunden-/halbstundengenaue Belegungsbalken. Eine Buchung 07–13 Uhr
   füllt im Arbeitstag-Fenster (aus den Einstellungen) ~½ der Tagesbreite.
   Mehrere Buchungen pro Tag/Gerät liegen nebeneinander.

   Verdrahtet mit dem echten Datenmodell der App:
   - items[] = Aufträge (mehrgeräte-aufgefächert via geraete[]) + Belegungen + offene Anfragen
   - disp(t) liefert Farbe/Name/gestrichelt je Eintrags-Typ (auftrag | belegung | anfrage)
   - bestehende Modale (Buchen mit Vermietung/Belegung + neuer Kunde, Detail mit 3 Typen)
   ============================================================ */
window.Screens = window.Screens || {};

(function () {
  const { useState, useMemo, useCallback, useEffect } = React;

  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  /* ---------- Datums-Helfer (ISO YYYY-MM-DD; addDays kommt aus dem Store) ---------- */
  const A = window.addDays;
  function toDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
  function mondayOf(iso) { const off = (toDate(iso).getDay() + 6) % 7; return A(iso, -off); }
  function weekdayIdx(iso) { return (toDate(iso).getDay() + 6) % 7; }
  function isWeekend(iso) { return weekdayIdx(iso) >= 5; }
  function dayDiff(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000); }
  function fmtDM(iso) { return `${iso.slice(8)}.${iso.slice(5, 7)}.`; }
  function isoYM(iso) { return iso.slice(0, 7); }
  function kwOf(iso) {
    const dt = toDate(iso); dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
    const w1 = new Date(dt.getFullYear(), 0, 4);
    return 1 + Math.round(((dt - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  }
  function monthGrid(ym) {
    const [y, m] = ym.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const off = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const cells = Array.from({ length: off }, () => null);
    for (let d = 1; d <= last; d++) cells.push(`${ym}-${String(d).padStart(2, '0')}`);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }
  function shiftYM(ym, n) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /* ---------- Zeit-Modell (window-unabhängige Teile) ---------- */
  function minsOf(time) { const [h, m] = (time || '00:00').split(':').map(Number); return h * 60 + m; }
  function toAbsMin(iso, time) { return dayDiff('2000-01-01', iso) * 1440 + minsOf(time); }

  // Lane-Stacking auf Datum+Uhrzeit-Basis: zwei Buchungen am selben Tag zu versch. Zeiten teilen eine Lane.
  function laneLayout(items, winStartMin, winEndMin) {
    const laneEnds = [];
    return items.slice()
      .sort((a, b) => toAbsMin(a.von, a.vonZeit || pad(winStartMin)) - toAbsMin(b.von, b.vonZeit || pad(winStartMin)))
      .map((t) => {
        const st = toAbsMin(t.von, t.vonZeit || pad(winStartMin));
        const en = toAbsMin(t.bis, t.bisZeit || pad(winEndMin));
        let li = laneEnds.findIndex((end) => st >= end);
        if (li < 0) { laneEnds.push(en); li = laneEnds.length - 1; } else { laneEnds[li] = en; }
        return { t, lane: li };
      });
  }
  function pad(min) { const h = Math.floor(min / 60), m = min % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }

  /* ============================================================ */
  window.Screens.kalender = function Kalender({ nav, params = {}, mobile, onMenu, PageHeader }) {
    const store = window.useStore();
    const F = window.FRIESEN;
    const toast = window.UI.useToast();
    const UI = window.UI;

    // Nur eigenständig vermietbare Geräte (inkl. ggf. freigeschalteter Anbaugeräte)
    const machines = useMemo(() => store.db.flotte.filter((g) => window.istVermietbar(g)), [store.db.flotte]);

    // Arbeitstag-Fenster aus den Einstellungen (Default 7–19 Uhr)
    const s = store.db.settings || {};
    const WIN_START = (s.geschaeftszeitVon ?? 7) * 60;
    const WIN_END = (s.geschaeftszeitBis ?? 19) * 60;
    const WIN_SPAN = Math.max(60, WIN_END - WIN_START);
    const WIN_START_T = pad(WIN_START), WIN_END_T = pad(WIN_END);

    // Portionierung (Closures über das Arbeitstag-Fenster)
    const timeFracInDay = (time) => Math.min(1, Math.max(0, (minsOf(time) - WIN_START) / WIN_SPAN));
    // Tagesanteil EINER Buchung an EINEM Tag (0..1) — fürs vertikale Portionieren (Mobil-Woche).
    const dayPortion = (t, day) => {
      const start = day === t.von ? timeFracInDay(t.vonZeit || WIN_START_T) : 0;
      const end = day === t.bis ? timeFracInDay(t.bisZeit || WIN_END_T) : 1;
      return { start, end: Math.max(end, start + 0.04) };
    };
    // Horizontaler Balkenbereich über ein N-Tage-Raster (0..1), an Anfang/Ende nach Uhrzeit portioniert.
    const bookingSpanFrac = (t, gridStartIso, ncols) => {
      const lastIso = A(gridStartIso, ncols - 1);
      if (t.bis < gridStartIso || t.von > lastIso) return null;
      const sIso = t.von < gridStartIso ? gridStartIso : t.von;
      const eIso = t.bis > lastIso ? lastIso : t.bis;
      const ci0 = dayDiff(gridStartIso, sIso), ci1 = dayDiff(gridStartIso, eIso);
      const cutL = t.von < gridStartIso, cutR = t.bis > lastIso;
      const startFrac = cutL ? 0 : timeFracInDay(t.vonZeit || WIN_START_T);
      const endFrac = cutR ? 1 : timeFracInDay(t.bisZeit || WIN_END_T);
      const start = (ci0 + startFrac) / ncols;
      const end = (ci1 + endFrac) / ncols;
      return { start, end: Math.max(end, start + 0.012), cutL, cutR };
    };

    const [view, setView] = useState('month');
    const [ym, setYm] = useState(isoYM(store.today));
    const [weekStart, setWeekStart] = useState(mondayOf(store.today));
    const [detail, setDetail] = useState(null);
    const [modal, setModal] = useState(null);
    const [conflict, setConflict] = useState(null);
    const [drag, setDrag] = useState(null);       // { gid, a, b } Tagesindizes (Woche)
    const [daySheet, setDaySheet] = useState(null); // ISO-Tag (Mobil: Tages-Agenda)
    const [highlight, setHighlight] = useState(params.highlight || null);
    const hlRing = (id) => id && id === highlight ? { boxShadow: '0 0 0 3px var(--warn)', zIndex: 9 } : null;

    // Buchen-Modal-State (Vermietung/Belegung + neuer Kunde)
    const [art, setArt] = useState('vermietung');     // 'vermietung' | 'belegung'
    const [kundeMode, setKundeMode] = useState('liste'); // 'liste' | 'neu'
    const [neuerKunde, setNeuerKunde] = useState({ name: '', phone: '', email: '' });

    /* ---- Einheitliche Belegungsliste: Aufträge (mehrgeräte) + Belegungen + offene Anfragen ---- */
    const items = useMemo(() => [
      ...store.db.auftraege.flatMap((a) => {
        const gs = (Array.isArray(a.geraete) && a.geraete.length) ? a.geraete : [a];
        return gs.map((g, gi) => ({ ...a, geraetId: g.geraetId, von: g.von, bis: g.bis, vonZeit: g.vonZeit || a.vonZeit, bisZeit: g.bisZeit || a.bisZeit, geraetIndex: gi, _key: a.id + '#' + gi, kind: 'auftrag' }));
      }),
      ...(store.db.belegungen || []).map((b) => ({ ...b, _key: b.id, kind: 'belegung' })),
      ...(store.anfragen || []).filter((a) => a.von && (a.status === 'neu' || a.status === 'in-bearbeitung'))
        .flatMap((a) => {
          const gs = (Array.isArray(a.geraete) && a.geraete.length) ? a.geraete : [a];
          return gs.map((g, gi) => ({ ...a, geraetId: g.geraetId, von: g.von, bis: g.bis || g.von, vonZeit: g.vonZeit || a.vonZeit, bisZeit: g.bisZeit || a.bisZeit, _key: a.id + '#' + gi, kind: 'anfrage' }));
        }),
    ], [store.db.auftraege, store.db.belegungen, store.anfragen]);

    const itemsForGeraet = (gid) => items.filter((t) => t.geraetId === gid);

    /* ---- Anzeige (Farbe/Name/gestrichelt) je Eintrags-Typ ---- */
    const disp = (t) => {
      const g = store.geraetById(t.geraetId);
      if (t.kind === 'anfrage') return { g, name: t.name || 'Anfrage', bg: 'rgba(43,108,176,.10)', col: '#2B6CB0', dashed: true, anfrage: true };
      if (t.kind === 'belegung') {
        const gr = F.BELEGUNG_GRUND[t.grund] || { label: t.grund, farbe: '#6B6B66' };
        const isW = t.grund === 'wartung';
        return { g, name: gr.label, bg: isW ? 'var(--warn-wash)' : 'var(--paper-3)', col: isW ? 'var(--warn)' : 'var(--muted)', dashed: false, belegung: true };
      }
      const k = store.kundeById(t.kundeId);
      const reserv = t.status === 'anfrage' || t.status === 'angebot'; // noch nicht fest gebucht
      const farbe = g?.farbe || 'var(--ink)';
      const darkText = ['#F7C72A', '#B5D334', '#F39222', '#FBE9A0'].includes(farbe);
      return {
        g, name: k?.name || 'Vermietung',
        bg: reserv ? 'var(--yellow-wash)' : farbe,
        col: reserv ? 'var(--warn)' : (darkText ? '#141414' : '#fff'),
        dashed: reserv,
      };
    };
    // Balken-Stil aus disp ableiten
    const barAppearance = (t) => {
      const d = disp(t);
      const accent = d.anfrage ? '#2B6CB0' : d.dashed ? 'var(--warn)' : (d.belegung ? 'var(--muted-2)' : 'rgba(0,0,0,.3)');
      return {
        background: d.bg, color: d.col, accent, name: d.name, g: d.g, dashed: d.dashed, anfrage: d.anfrage, belegung: d.belegung,
        border: d.anfrage ? '1.5px dashed #2B6CB0' : d.dashed ? '1.5px dashed var(--warn)' : (d.belegung ? '1px solid var(--line-2)' : 'none'),
      };
    };

    /* ---- Buchen / Bearbeiten ---- */
    const openAdd = (geraetId, von, bis, opts = {}) => {
      setConflict(null);
      setArt(opts.art || 'vermietung');
      setKundeMode('liste');
      setNeuerKunde({ name: '', phone: '', email: '' });
      setModal({ geraetId: geraetId || machines[0]?.id, kundeId: store.db.kunden[0]?.id || '', von, bis: bis || von, vonZeit: opts.time || WIN_START_T, bisZeit: opts.bisZeit || WIN_END_T, ort: '', grund: 'privat', notiz: '' });
    };
    const openEditBelegung = (b) => {
      setConflict(null); setArt('belegung');
      setModal({ editId: b.id, geraetId: b.geraetId, von: b.von, bis: b.bis, vonZeit: b.vonZeit || WIN_START_T, bisZeit: b.bisZeit || WIN_END_T, ort: b.ort || '', grund: b.grund || 'privat', notiz: b.notiz || '', kundeId: '' });
    };

    const save = () => {
      if (modal.bis < modal.von) { setConflict({ msg: 'Enddatum liegt vor dem Startdatum.' }); return; }
      if (modal.von === modal.bis && modal.bisZeit <= modal.vonZeit) { setConflict({ msg: 'Endzeit liegt vor der Startzeit.' }); return; }
      const c = store.findConflict(modal.geraetId, modal.von, modal.bis, modal.editId, modal.vonZeit, modal.bisZeit);
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
      let kundeId = modal.kundeId;
      if (kundeMode === 'neu') {
        if (!neuerKunde.name.trim()) { setConflict({ msg: 'Bitte einen Namen für den neuen Kunden angeben.' }); return; }
        kundeId = store.addKunde({ name: neuerKunde.name.trim(), phone: neuerKunde.phone, email: neuerKunde.email, typ: 'Privat', street: '', city: '' });
      } else if (!kundeId) { setConflict({ msg: 'Bitte einen Kunden auswählen.' }); return; }
      store.addAuftrag({ geraetId: modal.geraetId, kundeId, von: modal.von, bis: modal.bis, vonZeit: modal.vonZeit, bisZeit: modal.bisZeit, ort: modal.ort, status: 'reserviert' });
      toast(kundeMode === 'neu' ? 'Kunde angelegt & Auftrag gebucht' : 'Auftrag gebucht'); setModal(null);
    };

    // Drag-to-book (Woche): mouseup global beendet die Auswahl
    const finishDrag = useCallback(() => {
      setDrag((cur) => {
        if (cur) {
          const days = Array.from({ length: 7 }, (_, i) => A(weekStart, i));
          const lo = Math.min(cur.a, cur.b), hi = Math.max(cur.a, cur.b);
          nav('anfragen', { neu: 1, von: days[lo], geraetId: cur.gid });
        }
        return null;
      });
    }, [weekStart]); // eslint-disable-line
    useEffect(() => {
      const up = () => finishDrag();
      window.addEventListener('mouseup', up);
      return () => window.removeEventListener('mouseup', up);
    }, [finishDrag]);

    // Aus „Aufträge → Neuer Auftrag → Direkt buchen": Buchungs-Dialog automatisch öffnen
    useEffect(() => {
      if (params && params.neu === 'auftrag') nav('anfragen', { neu: 1 });   // Vermietung läuft über die Anfrage
      else if (params && params.neu === 'belegung') openAdd(machines[0]?.id, store.today, store.today, { art: 'belegung' });
      // eslint-disable-next-line
    }, []);
    // „Im Kalender zeigen": auf den richtigen Monat/Woche springen und Eintrag kurz hervorheben
    useEffect(() => {
      if (params && params.highlight) {
        const au = store.auftragById(params.highlight);
        const m = params.ym || (au && isoYM(au.von)) || isoYM(store.today);
        setYm(m);
        if (au) setWeekStart(mondayOf(au.von));
        const tmo = setTimeout(() => setHighlight(null), 4500);
        return () => clearTimeout(tmo);
      }
      // eslint-disable-next-line
    }, []);

    /* ---- Legende ---- */
    const legend = (
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
        {machines.map((g) => (
          <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 11, borderRadius: 2, background: g.farbe }} />{g.name.replace('1,9t ', '')}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 11, borderRadius: 2, border: '1.5px dashed var(--warn)' }} />Reservierung</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 11, borderRadius: 2, border: '1.5px dashed #2B6CB0' }} />Anfrage</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 11, borderRadius: 2, background: 'var(--paper-3)', border: '1px solid var(--line-2)' }} />Privat / Wartung</span>
      </div>
    );

    /* ============ MONAT (Raster mit Gerätespuren) ============ */
    const MonthView = () => {
      const cells = monthGrid(ym);
      const [y, m] = ym.split('-').map(Number);
      const weeks = [];
      for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
      const LANE_H = 15, LANE_GAP = 4, PAD_TOP = 24;
      const CELL_H = PAD_TOP + machines.length * (LANE_H + LANE_GAP) + 6;

      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UI.IconBtn name="chevron" size={18} style={{ width: 36, height: 36, transform: 'scaleX(-1)' }} onClick={() => setYm(shiftYM(ym, -1))} />
              <div style={{ fontWeight: 700, fontSize: 17, minWidth: 150, textAlign: 'center' }}>{MON[m - 1]} {y}</div>
              <UI.IconBtn name="chevron" size={18} style={{ width: 36, height: 36 }} onClick={() => setYm(shiftYM(ym, 1))} />
              <UI.Btn variant="ghost" size="sm" onClick={() => setYm(isoYM(store.today))}>Heute</UI.Btn>
            </div>
            {!mobile && legend}
          </div>

          <UI.Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: mobile ? 680 : 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1.5px solid var(--line)', background: 'var(--paper-2)' }}>
                  {WD.map((d) => <div key={d} className="kicker" style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--muted-2)' }}>{d}</div>)}
                </div>
                {weeks.map((week, wi) => {
                  const firstIdx = week.findIndex((d) => d !== null);
                  const mon = A(week[firstIdx], -firstIdx);
                  return (
                    <div key={wi} style={{ position: 'relative', height: CELL_H, borderTop: wi > 0 ? '1px solid var(--line)' : 'none' }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                        {week.map((day, di) => {
                          const isToday = day === store.today;
                          return (
                            <div key={di} onClick={() => { if (day) nav('anfragen', { neu: 1, von: day }); }}
                              style={{ borderLeft: di > 0 ? '1px solid var(--paper-3)' : 'none', background: isToday ? 'var(--yellow-wash)' : day && isWeekend(day) ? 'var(--paper-2)' : 'transparent', cursor: day ? 'copy' : 'default', padding: '5px 8px' }}
                              title={day ? 'Klicken, um zu buchen' : ''}>
                              {day ? <span className="mono" style={{ fontSize: 12.5, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--yellow-deep)' : day < store.today ? 'var(--muted-2)' : 'var(--ink)' }}>{parseInt(day.slice(8), 10)}</span> : null}
                            </div>
                          );
                        })}
                      </div>
                      {machines.map((g, li) => (
                        itemsForGeraet(g.id).filter((t) => t.von <= A(mon, 6) && t.bis >= mon).map((t) => {
                          const sp = bookingSpanFrac(t, mon, 7);
                          if (!sp) return null;
                          const ap = barAppearance(t);
                          const widthPct = (sp.end - sp.start) * 100;
                          const wide = widthPct > 12;
                          return (
                            <button key={t._key + 'w' + wi} type="button" onClick={(ev) => { ev.stopPropagation(); setDetail(t); }}
                              title={`${g.name} · ${ap.name} · ${t.von === t.bis ? '' : F.fmtDate(t.von) + '–' + F.fmtDate(t.bis) + ' · '}${t.vonZeit || WIN_START_T}–${t.bisZeit || WIN_END_T} Uhr`}
                              style={{
                                position: 'absolute', zIndex: 3, top: PAD_TOP + li * (LANE_H + LANE_GAP), height: LANE_H,
                                left: `calc(${sp.start * 100}% + ${sp.cutL ? 0 : 2}px)`,
                                width: `calc(${widthPct}% - ${(sp.cutL ? 0 : 2) + (sp.cutR ? 0 : 2)}px)`,
                                minWidth: 8, background: ap.background, color: ap.color, border: ap.border,
                                borderLeft: ap.dashed || ap.belegung ? ap.border : `3px solid ${ap.accent}`,
                                borderRadius: sp.cutL && sp.cutR ? 0 : sp.cutL ? '0 6px 6px 0' : sp.cutR ? '6px 0 0 6px' : 6,
                                cursor: 'pointer', font: 'inherit', padding: '0 6px', textAlign: 'left', overflow: 'hidden', display: 'flex', alignItems: 'center', ...hlRing(t.id),
                              }}>
                              {wide ? <span style={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{ap.name}</span> : null}
                            </button>
                          );
                        })
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </UI.Card>
          {mobile && <div style={{ marginTop: 10 }}>{legend}</div>}
        </>
      );
    };

    /* ============ WOCHE (Plantafel: Geräte × Tage) ============ */
    const WeekView = () => {
      const days = Array.from({ length: 7 }, (_, i) => A(weekStart, i));
      const weekEnd = days[6];
      const LABEL_W = 168, BAR_H = 38, LANE_GAP = 6, ROW_PAD = 9;
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UI.IconBtn name="chevron" size={18} style={{ width: 36, height: 36, transform: 'scaleX(-1)' }} onClick={() => setWeekStart(A(weekStart, -7))} />
              <div style={{ fontWeight: 700, fontSize: 16, minWidth: 168, textAlign: 'center' }}>KW {kwOf(weekStart)} · {fmtDM(days[0])} – {fmtDM(days[6])}</div>
              <UI.IconBtn name="chevron" size={18} style={{ width: 36, height: 36 }} onClick={() => setWeekStart(A(weekStart, 7))} />
              <UI.Btn variant="ghost" size="sm" onClick={() => setWeekStart(mondayOf(store.today))}>Heute</UI.Btn>
            </div>
            {!mobile && legend}
          </div>

          <UI.Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: LABEL_W + 7 * 96, userSelect: drag ? 'none' : 'auto' }}>
                <div style={{ display: 'flex', borderBottom: '1.5px solid var(--line)', background: 'var(--paper-2)' }}>
                  <div className="kicker" style={{ width: LABEL_W, flex: `0 0 ${LABEL_W}px`, padding: '10px 14px', color: 'var(--muted-2)' }}>Gerät</div>
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                    {days.map((d, i) => {
                      const isToday = d === store.today;
                      return (
                        <div key={d} style={{ textAlign: 'center', padding: '7px 4px', borderLeft: '1px solid var(--line)', background: isToday ? 'var(--yellow-wash)' : isWeekend(d) ? 'var(--paper-3)' : 'transparent' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--yellow-deep)' : 'var(--muted)' }}>{WD[i]}</div>
                          <div className="mono" style={{ fontSize: 13, fontWeight: isToday ? 700 : 500 }}>{fmtDM(d).slice(0, 5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {machines.map((g, gi) => {
                  const its = itemsForGeraet(g.id).filter((t) => t.von <= weekEnd && t.bis >= weekStart);
                  const placed = laneLayout(its, WIN_START, WIN_END);
                  const nLanes = Math.max(1, ...placed.map((p) => p.lane + 1));
                  const rowH = ROW_PAD * 2 + nLanes * BAR_H + (nLanes - 1) * LANE_GAP;
                  const ghost = drag && drag.gid === g.id ? [Math.min(drag.a, drag.b), Math.max(drag.a, drag.b)] : null;
                  return (
                    <div key={g.id} style={{ display: 'flex', borderTop: gi > 0 ? '1px solid var(--line)' : 'none' }}>
                      <div style={{ width: LABEL_W, flex: `0 0 ${LABEL_W}px`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--paper-2)', borderRight: '1.5px solid var(--line)' }}>
                        <window.GeraetBadge geraet={g} size={30} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>{its.filter((t) => t.kind === 'auftrag' && !disp(t).dashed).length} Buchung(en)</div>
                        </div>
                      </div>
                      <div style={{ flex: 1, position: 'relative', height: rowH }}>
                        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                          {days.map((d, i) => (
                            <div key={d}
                              onMouseDown={() => setDrag({ gid: g.id, a: i, b: i })}
                              onMouseEnter={() => setDrag((cur) => (cur && cur.gid === g.id ? { ...cur, b: i } : cur))}
                              style={{ borderLeft: '1px solid var(--line)', background: d === store.today ? 'var(--yellow-wash)' : isWeekend(d) ? 'var(--paper-3)' : 'transparent', cursor: 'copy' }}
                              title="Klicken oder ziehen, um zu buchen"></div>
                          ))}
                        </div>
                        {ghost ? (
                          <div style={{ position: 'absolute', top: ROW_PAD, height: rowH - ROW_PAD * 2, left: `calc(${ghost[0]} / 7 * 100% + 3px)`, width: `calc(${ghost[1] - ghost[0] + 1} / 7 * 100% - 6px)`, border: '2px dashed var(--yellow-deep)', background: 'rgba(247,199,42,0.25)', borderRadius: 'var(--r)', pointerEvents: 'none', zIndex: 5 }}></div>
                        ) : null}
                        {placed.map(({ t, lane }) => {
                          const sp = bookingSpanFrac(t, weekStart, 7);
                          if (!sp) return null;
                          const ap = barAppearance(t);
                          const widthPct = (sp.end - sp.start) * 100;
                          const wide = widthPct > 11;
                          return (
                            <button key={t._key} type="button"
                              title={`${g.name} · ${ap.name} · ${t.von === t.bis ? '' : F.fmtDate(t.von) + '–' + F.fmtDate(t.bis) + ' · '}${t.vonZeit || WIN_START_T}–${t.bisZeit || WIN_END_T} Uhr${t.ort ? ' · ' + t.ort : ''}`}
                              onMouseDown={(e2) => e2.stopPropagation()} onClick={() => setDetail(t)}
                              style={{
                                position: 'absolute', top: ROW_PAD + lane * (BAR_H + LANE_GAP), height: BAR_H, zIndex: 4,
                                left: `calc(${sp.start * 100}% + ${sp.cutL ? 0 : 2}px)`,
                                width: `calc(${widthPct}% - ${(sp.cutL ? 0 : 2) + (sp.cutR ? 0 : 2)}px)`,
                                minWidth: 30, background: ap.background, color: ap.color, border: ap.border,
                                borderLeft: ap.dashed || ap.belegung ? ap.border : `3px solid ${ap.accent}`,
                                borderRadius: sp.cutL && sp.cutR ? 0 : sp.cutL ? '0 var(--r) var(--r) 0' : sp.cutR ? 'var(--r) 0 0 var(--r)' : 'var(--r)',
                                padding: wide ? '4px 8px' : '4px 5px', textAlign: 'left', cursor: 'pointer', overflow: 'hidden', font: 'inherit', boxShadow: ap.dashed ? 'none' : 'var(--shadow-sm)', ...hlRing(t.id),
                              }}>
                              <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', lineHeight: 1.25 }}>{sp.cutL ? '… ' : ''}{ap.name}</div>
                              {wide ? <div style={{ fontSize: 10.5, opacity: 0.72, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{t.von === t.bis ? `${t.vonZeit || WIN_START_T}–${t.bisZeit || WIN_END_T} Uhr` : `bis ${fmtDM(t.bis)}`}</div> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </UI.Card>
          {mobile && <div style={{ marginTop: 10 }}>{legend}</div>}
        </>
      );
    };

    /* ============ MOBIL: durchlaufende Monatsansicht (Apple-Stil) ============ */
    const MobileMonthView = () => {
      const startYm = isoYM(store.today);
      const curYear = store.today.slice(0, 4);
      const months = Array.from({ length: 8 }, (_, i) => shiftYM(startYm, i));
      const MAXL = 2, BAR_H = 6, GAP = 3, HEAD = 30, OVF = 12;
      const rowH = HEAD + MAXL * (BAR_H + GAP) + OVF;
      return (
        <>
          <UI.Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--paper-2)', borderBottom: '1.5px solid var(--line)' }}>
              {WD.map((d) => <div key={d} className="kicker" style={{ textAlign: 'center', padding: '9px 0', color: 'var(--muted-2)', fontSize: 10 }}>{d.charAt(0)}</div>)}
            </div>
            <div style={{ height: 'calc(100dvh - 256px)', minHeight: 440, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {months.map((mym) => {
                const [yy, mm] = mym.split('-').map(Number);
                const cells = monthGrid(mym);
                const weeks = [];
                for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
                const isCur = mym === startYm;
                return (
                  <div key={mym}>
                    <div style={{ padding: '16px 14px 8px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', color: isCur ? 'var(--yellow-deep)' : 'var(--ink)' }}>
                      {MON[mm - 1]}{String(yy) !== curYear ? ' ' + yy : ''}
                    </div>
                    {weeks.map((week, wi) => {
                      const firstIdx = week.findIndex((d) => d !== null);
                      const mon = A(week[firstIdx], -firstIdx);
                      const weekItems = items.filter((t) => t.von <= A(mon, 6) && t.bis >= mon);
                      const placed = laneLayout(weekItems, WIN_START, WIN_END);
                      const laneOf = new Map(placed.map((p) => [p.t._key, p.lane]));
                      return (
                        <div key={wi} style={{ position: 'relative', height: rowH, borderTop: '1px solid var(--paper-3)' }}>
                          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                            {week.map((day, di) => {
                              if (!day) return <div key={di}></div>;
                              const isToday = day === store.today;
                              const covering = weekItems.filter((t) => day >= t.von && day <= t.bis);
                              const overflow = covering.filter((t) => (laneOf.get(t._key) ?? 99) >= MAXL).length;
                              return (
                                <div key={di} onClick={() => setDaySheet(day)} style={{ borderLeft: di > 0 ? '1px solid var(--paper-3)' : 'none', background: isToday ? 'var(--yellow-wash)' : isWeekend(day) ? 'var(--paper-2)' : 'transparent', cursor: 'pointer', position: 'relative' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 5 }}>
                                    <div className="mono" style={{ width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', fontWeight: isToday ? 800 : 600, fontSize: 15, color: isToday ? 'var(--yellow-deep)' : day < store.today ? 'var(--muted-2)' : 'var(--ink)' }}>{parseInt(day.slice(8), 10)}</div>
                                  </div>
                                  {overflow > 0 ? <div style={{ position: 'absolute', bottom: 1, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: 'var(--muted-2)', fontWeight: 600 }}>+{overflow}</div> : null}
                                </div>
                              );
                            })}
                          </div>
                          {placed.filter((p) => p.lane < MAXL).map(({ t, lane }) => {
                            const sp = bookingSpanFrac(t, mon, 7);
                            if (!sp) return null;
                            const ap = barAppearance(t);
                            return (
                              <div key={t._key + 'w' + wi} style={{
                                position: 'absolute', zIndex: 3, top: HEAD + lane * (BAR_H + GAP), height: BAR_H,
                                left: `calc(${sp.start * 100}% + ${sp.cutL ? 1 : 3}px)`,
                                width: `calc(${(sp.end - sp.start) * 100}% - ${(sp.cutL ? 1 : 3) + (sp.cutR ? 1 : 3)}px)`,
                                minWidth: 6, background: ap.dashed ? 'transparent' : ap.background, border: ap.dashed ? ap.border : 'none', borderRadius: BAR_H / 2, pointerEvents: 'none',
                              }}></div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </UI.Card>
          <div style={{ marginTop: 12 }}>{legend}</div>
        </>
      );
    };

    /* ============ MOBIL: Wochenansicht — je Tag eine Stunden-Zeitachse ============ */
    const MobileWeekView = () => {
      const days = Array.from({ length: 7 }, (_, i) => A(weekStart, i));
      const LABEL_W = 46;
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            <UI.IconBtn name="chevron" size={18} style={{ width: 34, height: 34, transform: 'scaleX(-1)' }} onClick={() => setWeekStart(A(weekStart, -7))} />
            <div style={{ fontWeight: 700, fontSize: 14, minWidth: 150, textAlign: 'center' }}>KW {kwOf(weekStart)} · {fmtDM(days[0])}–{fmtDM(days[6])}</div>
            <UI.IconBtn name="chevron" size={18} style={{ width: 34, height: 34 }} onClick={() => setWeekStart(A(weekStart, 7))} />
            <UI.Btn variant="ghost" size="sm" onClick={() => setWeekStart(mondayOf(store.today))}>Heute</UI.Btn>
          </div>
          <UI.Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 286px)', minHeight: 420 }}>
            <div style={{ display: 'flex', borderBottom: '1.5px solid var(--line)', background: 'var(--paper-2)', flex: '0 0 auto' }}>
              <div style={{ width: LABEL_W, flex: `0 0 ${LABEL_W}px` }}></div>
              {machines.map((g) => (
                <div key={g.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 2px', borderLeft: '1px solid var(--line)' }}>
                  <window.GeraetBadge geraet={g} size={24} />
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.15 }}>{g.name.replace('1,9t ', '')}</div>
                </div>
              ))}
            </div>
            {days.map((d, i) => {
              const isToday = d === store.today;
              return (
                <div key={d} style={{ flex: 1, display: 'flex', minHeight: 0, borderTop: i > 0 ? '1px solid var(--paper-3)' : 'none', background: isToday ? 'var(--yellow-wash)' : isWeekend(d) ? 'var(--paper-2)' : 'transparent' }}>
                  <div style={{ width: LABEL_W, flex: `0 0 ${LABEL_W}px`, padding: '6px 0 0 8px', borderRight: '1px solid var(--paper-3)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? 'var(--yellow-deep)' : 'var(--muted)' }}>{WD[i]}</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: isToday ? 700 : 500 }}>{d.slice(8)}.</div>
                  </div>
                  {machines.map((g) => {
                    const ts = itemsForGeraet(g.id).filter((t) => d >= t.von && d <= t.bis);
                    return (
                      <div key={g.id} onClick={() => nav('anfragen', { neu: 1, von: d, geraetId: g.id })} style={{ flex: 1, position: 'relative', borderLeft: '1px solid var(--paper-3)', cursor: 'copy' }}>
                        {ts.map((t) => {
                          const p = dayPortion(t, d);
                          const ap = barAppearance(t);
                          const heightPct = (p.end - p.start) * 100;
                          const tall = heightPct > 40;
                          return (
                            <button key={t._key + d} type="button"
                              title={`${g.name} · ${ap.name} · ${t.vonZeit || WIN_START_T}–${t.bisZeit || WIN_END_T} Uhr`}
                              onClick={(ev) => { ev.stopPropagation(); setDetail(t); }}
                              style={{
                                position: 'absolute', left: 3, right: 3, zIndex: 3,
                                top: `calc(${p.start * 100}% + 2px)`, height: `calc(${heightPct}% - 4px)`,
                                minHeight: 16, background: ap.background, color: ap.color, border: ap.border, borderRadius: 4,
                                cursor: 'pointer', font: 'inherit', padding: '2px 5px', textAlign: 'left', overflow: 'hidden', ...hlRing(t.id),
                              }}>
                              <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{ap.name?.split(' ')[0]}</div>
                              {tall ? <div style={{ fontSize: 8.5, opacity: 0.72, lineHeight: 1.1 }}>{ap.dashed ? 'reserv.' : t.von === t.bis ? (t.vonZeit || WIN_START_T) : '→'}</div> : null}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </UI.Card>
          <div style={{ marginTop: 10 }}>{legend}</div>
        </>
      );
    };

    return (
      <>
        <PageHeader kicker="Disposition" title="Terminkalender" mobile={mobile} onMenu={onMenu}>
          <div style={{ display: 'flex', gap: 6 }}>
            <UI.Btn variant={view === 'month' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('month')}>Monat</UI.Btn>
            <UI.Btn variant={view === 'week' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('week')}>Woche</UI.Btn>
          </div>
          <UI.Btn icon="plus" onClick={() => openAdd(machines[0]?.id, store.today, store.today, { art: 'belegung' })}>{mobile ? 'Blocken' : 'Gerät blocken'}</UI.Btn>
        </PageHeader>

        <div className="content-pad">
          {mobile && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <UI.Btn variant={view === 'month' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('month')}>Monat</UI.Btn>
              <UI.Btn variant={view === 'week' ? 'dark' : 'ghost'} size="sm" onClick={() => setView('week')}>Woche</UI.Btn>
            </div>
          )}
          {mobile
            ? (view === 'month' ? <MobileMonthView /> : <MobileWeekView />)
            : (view === 'month' ? <MonthView /> : <WeekView />)}
          {!mobile ? (
            <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--muted-2)' }}>
              Balkenlänge = gebuchte Stunden im Arbeitstag ({pad(WIN_START)}–{pad(WIN_END)} Uhr) · Tag/Zeitraum anklicken oder ziehen = neuer Termin · Balken anklicken = Details
            </div>
          ) : null}
        </div>

        {/* Detail */}
        <UI.Modal open={!!detail} onClose={() => setDetail(null)} title={detail && detail.kind === 'belegung' ? 'Belegung' : detail && detail.kind === 'anfrage' ? 'Anfrage (vorgemerkt)' : 'Auftrag'} width={440}
          footer={detail && (detail.kind === 'belegung'
            ? <><UI.Btn variant="danger" icon="trash" onClick={() => { const snap = store.snapshot(); store.deleteBelegung(detail.id); toast('Belegung gelöscht', { undo: () => store.restoreSnapshot(snap) }); setDetail(null); }}>Löschen</UI.Btn><UI.Btn variant="ghost" icon="edit" onClick={() => { const b = detail; setDetail(null); openEditBelegung(b); }}>Bearbeiten</UI.Btn><UI.Btn variant="ghost" onClick={() => setDetail(null)}>Schließen</UI.Btn></>
            : detail.kind === 'anfrage'
            ? <><UI.Btn variant="ghost" onClick={() => setDetail(null)}>Schließen</UI.Btn><UI.Btn icon="arrowRight" onClick={() => { setDetail(null); nav('anfragen'); }}>Zu den Anfragen</UI.Btn></>
            : <><UI.Btn variant="ghost" onClick={() => setDetail(null)}>Schließen</UI.Btn><UI.Btn icon="arrowRight" onClick={() => { const id = detail.id; setDetail(null); nav('auftrag', { id }); }}>Auftrag öffnen</UI.Btn></>)}>
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
                    <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Uhrzeit:</b> {detail.vonZeit || WIN_START_T} – {detail.bisZeit || WIN_END_T}</div>
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
                  <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Uhrzeit:</b> {detail.vonZeit || WIN_START_T} – {detail.bisZeit || WIN_END_T}</div>
                  {detail.ort && <div style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--ink)' }}>Ort:</b> {detail.ort}</div>}
                  {reserv && <div style={{ padding: '8px 11px', background: 'var(--warn-wash)', borderRadius: 'var(--r)', fontSize: 12.5, color: 'var(--warn)', fontWeight: 600 }}>⚠ Noch nicht fest gebucht – Angebot offen.</div>}
                </div>
              </div>
            );
          })()}
        </UI.Modal>

        {/* Buchen / Belegung */}
        <UI.Modal open={!!modal} onClose={() => setModal(null)} title={modal && modal.editId ? 'Belegung bearbeiten' : (art === 'belegung' ? 'Maschine blocken' : 'Vermietung buchen')} width={480}
          footer={<><UI.Btn variant="ghost" onClick={() => setModal(null)}>Abbrechen</UI.Btn><UI.Btn icon="check" onClick={save}>{modal && modal.editId ? 'Speichern' : (art === 'belegung' ? 'Blocken' : 'Buchen')}</UI.Btn></>}>
          {modal && (
            <div className="stack" style={{ gap: 14 }}>
              {!modal.editId && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['vermietung', 'Vermietung (Kunde)'], ['belegung', 'Privat / Wartung']].map(([m, label]) => (
                    <button key={m} onClick={() => { setArt(m); setConflict(null); }}
                      style={{ flex: 1, padding: '9px 6px', fontSize: 13, fontWeight: 600, border: '1.5px solid', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--sans)', borderColor: art === m ? 'var(--ink)' : 'var(--line-2)', background: art === m ? 'var(--ink)' : 'var(--paper)', color: art === m ? '#fff' : 'var(--muted)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {conflict && <div style={{ display: 'flex', gap: 10, padding: '11px 13px', background: 'var(--danger-wash)', borderRadius: 'var(--r)', color: 'var(--danger)', fontSize: 13 }}><Icon name="alert" size={18} style={{ flex: '0 0 auto' }} />{conflict.msg}</div>}
              <UI.Field label="Gerät">
                <UI.Select value={modal.geraetId} onChange={(e) => { setModal({ ...modal, geraetId: e.target.value }); setConflict(null); }}>
                  {machines.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </UI.Select>
              </UI.Field>
              {art === 'vermietung' ? (
                <UI.Field label="Kunde">
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {[['liste', 'Aus Liste'], ['neu', 'Neuer Kunde']].map(([mode, label]) => (
                      <button key={mode} onClick={() => { setKundeMode(mode); setConflict(null); }}
                        style={{ flex: 1, padding: '7px 4px', fontSize: 12.5, fontWeight: 600, border: '1.5px solid', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--sans)', borderColor: kundeMode === mode ? 'var(--yellow-deep)' : 'var(--line)', background: kundeMode === mode ? 'var(--yellow-wash)' : 'transparent', color: kundeMode === mode ? 'var(--yellow-deep)' : 'var(--muted)' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {kundeMode === 'liste' && (
                    <UI.Select value={modal.kundeId} onChange={(e) => setModal({ ...modal, kundeId: e.target.value })}>
                      <option value="">— bitte wählen —</option>
                      {store.db.kunden.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </UI.Select>
                  )}
                  {kundeMode === 'neu' && (
                    <div className="stack" style={{ gap: 8 }}>
                      <UI.Input placeholder="Name *" value={neuerKunde.name} onChange={(e) => setNeuerKunde({ ...neuerKunde, name: e.target.value })} />
                      <UI.Input placeholder="Telefon" value={neuerKunde.phone} onChange={(e) => setNeuerKunde({ ...neuerKunde, phone: e.target.value })} />
                      <UI.Input placeholder="E-Mail" value={neuerKunde.email} onChange={(e) => setNeuerKunde({ ...neuerKunde, email: e.target.value })} />
                    </div>
                  )}
                </UI.Field>
              ) : (
                <UI.Field label="Grund" hint="Blockt die Maschine im Kalender – ohne Auftrag, ohne Rechnung.">
                  <UI.Select value={modal.grund} onChange={(e) => setModal({ ...modal, grund: e.target.value })}>
                    <option value="privat">Privat / Verleih an Familie & Freunde</option>
                    <option value="wartung">Wartung</option>
                  </UI.Select>
                </UI.Field>
              )}
              <div className="form-2">
                <UI.Field label="Von (Datum)"><UI.Input type="date" value={modal.von} onChange={(e) => { setModal({ ...modal, von: e.target.value }); setConflict(null); }} /></UI.Field>
                <UI.Field label="Bis (Datum)"><UI.Input type="date" value={modal.bis} onChange={(e) => { setModal({ ...modal, bis: e.target.value }); setConflict(null); }} /></UI.Field>
              </div>
              <div className="form-2">
                <UI.Field label="Von (Uhrzeit)"><UI.Input type="time" step="1800" value={modal.vonZeit} onChange={(e) => { setModal({ ...modal, vonZeit: e.target.value }); setConflict(null); }} /></UI.Field>
                <UI.Field label="Bis (Uhrzeit)"><UI.Input type="time" step="1800" value={modal.bisZeit} onChange={(e) => { setModal({ ...modal, bisZeit: e.target.value }); setConflict(null); }} /></UI.Field>
              </div>
              <UI.Field label={art === 'belegung' ? 'Ort (optional)' : 'Einsatzort (Adresse)'}><UI.Input value={modal.ort} onChange={(e) => setModal({ ...modal, ort: e.target.value })} placeholder={art === 'belegung' ? 'z. B. Werkstatt' : 'z. B. Musterstraße 5, 53797 Lohmar'} /></UI.Field>
              {art === 'belegung' && <UI.Field label="Notiz (optional)"><UI.Input value={modal.notiz} onChange={(e) => setModal({ ...modal, notiz: e.target.value })} placeholder="z. B. Inspektion" /></UI.Field>}
            </div>
          )}
        </UI.Modal>

        {/* Tages-Agenda (Mobil): Tag antippen → Buchungen des Tages */}
        <UI.Modal open={!!daySheet} onClose={() => setDaySheet(null)} title={daySheet ? F.fmtDate(daySheet) : ''} width={420}
          footer={<UI.Btn icon="plus" onClick={() => { const d = daySheet; setDaySheet(null); nav('anfragen', { neu: 1, von: d }); }}>Anfrage für diesen Tag</UI.Btn>}>
          {daySheet && (() => {
            const list = items.filter((t) => daySheet >= t.von && daySheet <= t.bis)
              .sort((a, b) => (a.vonZeit || '').localeCompare(b.vonZeit || ''));
            if (!list.length) return <UI.Empty icon="kalender" title="Keine Buchungen" sub="An diesem Tag ist nichts gebucht." />;
            return (
              <div className="stack" style={{ gap: 8 }}>
                {list.map((t) => {
                  const ap = barAppearance(t);
                  return (
                    <button key={t._key} type="button" onClick={() => { setDaySheet(null); setDetail(t); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: '1.5px solid var(--line)', borderLeft: `4px solid ${ap.g?.farbe || ap.accent}`, borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                      {ap.g && <window.GeraetBadge geraet={ap.g} size={30} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{ap.name}{ap.dashed ? (ap.anfrage ? ' · Anfrage' : ' · Reserv.') : ''}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{ap.g?.name} · {t.vonZeit || WIN_START_T}–{t.bisZeit || WIN_END_T}{t.ort ? ' · ' + t.ort : ''}</div>
                      </div>
                      <Icon name="chevron" size={16} color="var(--muted-2)" />
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </UI.Modal>
      </>
    );
  };
})();
