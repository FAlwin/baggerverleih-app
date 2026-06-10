/* ============ SCREEN: Anfragen-Inbox ============ */
window.Screens = window.Screens || {};
const { useState: anfS } = React;

const ANF_STATUS = {
  neu:              { label: 'Neu',            cls: 'danger' },
  'in-bearbeitung': { label: 'In Bearbeitung', cls: 'warn' },
  erledigt:         { label: 'Erledigt',       cls: 'ok' },
  abgelehnt:        { label: 'Abgelehnt',      cls: 'danger' },
};

// Wählbare Einheiten je Gerät = dessen Tarif-Einheiten (z. B. Bagger ['Tag'], Anhänger ['4 Stunden','8 Stunden','Tag']).
const geraetEinheiten = (store, gid) => {
  const t = ((store.geraetById(gid) || {}).tarif) || [];
  const u = t.map((x) => x.einheit).filter((e) => /tag|stunden/i.test(e));
  return u.length ? u : ['Tag'];
};

// ---- Verfügbarkeits-/Buchungskalender (3 Monate, klickbar) für Geräte-Auswahl ----
const KAL_MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const KAL_WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const KAL_FARBE = { frei: ['#C8E6C9', '#2E7D32'], belegt: ['#FFCDD2', '#C62828'], reserviert: ['#FFF59D', '#8a6d00'], geschlossen: ['#E0E0E0', '#888'], past: ['#F2F2F0', '#bbb'] };
// Tagesstatus eines Geräts (Modul-Ebene, von Kalender + Bereichsprüfung genutzt)
function dayStatus(store, geraetId, dayIso) {
  if (dayIso < store.today) return 'past';
  const mw = store.db.settings && store.db.settings.mietWochentage;
  const wd = new Date(dayIso + 'T00:00:00').getDay();
  if (Array.isArray(mw) && mw[wd] === false) return 'geschlossen';
  let belegt = false, reserviert = false;
  (store.db.auftraege || []).forEach((a) => {
    if (a.status === 'abgelehnt') return;
    const gs = (Array.isArray(a.geraete) && a.geraete.length) ? a.geraete : [a];
    if (gs.some((g) => g.geraetId === geraetId && dayIso >= g.von && dayIso <= g.bis)) { (['anfrage', 'angebot'].indexOf(a.status) >= 0) ? reserviert = true : belegt = true; }
  });
  (store.db.belegungen || []).forEach((b) => { if (b.geraetId === geraetId && dayIso >= b.von && dayIso <= b.bis) belegt = true; });
  (store.db.angebote || []).forEach((o) => { if (o.geraetId === geraetId && o.von && o.status === 'offen' && dayIso >= o.von && dayIso <= (o.bis || o.von)) reserviert = true; });
  (store.anfragen || []).forEach((an) => { if (an.geraetId === geraetId && an.von && (an.status === 'neu' || an.status === 'in-bearbeitung') && dayIso >= an.von && dayIso <= (an.bis || an.von)) reserviert = true; });
  return belegt ? 'belegt' : reserviert ? 'reserviert' : 'frei';
}
function VerfuegbarkeitsKalender({ store, geraetId, selected, bis, onPick }) {
  const [off, setOff] = anfS(0);
  const today = store.today;
  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const status = (dayIso) => dayStatus(store, geraetId, dayIso);
  if (!geraetId) return <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 12, fontSize: 12.5, color: 'var(--muted)' }}>Bitte zuerst ein Gerät wählen.</div>;
  const [ty, tm] = today.split('-').map(Number);
  const base = new Date(ty, (tm - 1) + off, 1);
  const y = base.getFullYear(), m = base.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <window.UI.IconBtn name="chevron" size={16} disabled={off <= 0} onClick={() => setOff((o) => Math.max(0, o - 1))} style={{ width: 30, height: 30, transform: 'scaleX(-1)' }} title="Vormonat" />
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{KAL_MON[m]} {y}</div>
        <window.UI.IconBtn name="chevron" size={16} onClick={() => setOff((o) => o + 1)} style={{ width: 30, height: 30 }} title="Folgemonat" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {KAL_WT.map((w) => <div key={w} style={{ textAlign: 'center', fontSize: 10, color: '#999', fontWeight: 600 }}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={'e' + i} />;
          const di = iso(y, m, d);
          const st = status(di);
          const c = KAL_FARBE[st];
          const klick = st === 'frei';
          const sel = di === selected;
          const inRange = selected && (di >= selected && di <= (bis || selected));
          return (
            <div key={di} title={`${di} · ${st}`} onClick={() => klick && onPick && onPick(di)}
              style={{ textAlign: 'center', fontSize: 12, lineHeight: '30px', height: 30, borderRadius: 4, background: inRange && !sel ? 'var(--yellow-wash)' : c[0], color: c[1], cursor: klick ? 'pointer' : 'default', fontWeight: (sel || inRange) ? 800 : 500, outline: sel ? '2px solid var(--ink)' : inRange ? '2px solid var(--yellow-deep)' : 'none' }}>{d}</div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--muted)', marginTop: 10 }}>
        {[['frei', 'frei'], ['belegt', 'belegt'], ['reserviert', 'reserviert'], ['geschlossen', 'geschlossen']].map(([k, l]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: KAL_FARBE[k][0] }} /> {l}</span>
        ))}
      </div>
    </div>
  );
}
/* =================== Phase 2: Geräteabhängige Zeitwahl + Zusatzleistungen =================== */
const WS = 7, WE = 18, SPAN = WE - WS;               // Arbeitstag 07–18 Uhr (Stunden-Zeitachse)
const pctH = (h) => (h - WS) / SPAN * 100;
const hToDec = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h + (m || 0) / 60; };
const decToH = (d) => { const h = Math.floor(d); const m = Math.round((d - h) * 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
const geraetModell = (g) => (g && g.modell) || 'tag';
const isHourMode = (g) => { const m = geraetModell(g); return m === 'stunde' || m === 'staffel'; };
// Preissätze aus dem Tarif ableiten
const tagSatz = (g) => { const t = (g && g.tarif) || []; const r = t.find((x) => /tag/i.test(x.einheit)) || t[0] || {}; return r.preis || 0; };
const stundenSatz = (g) => { const t = (g && g.tarif) || []; const r = t.find((x) => /^stunde|pro stunde/i.test(x.einheit)) || t[0] || {}; return r.preis || 0; };
const staffelTiers = (g) => ((g && g.tarif) || []).map((x) => {
  const sm = /^(\d+)\s*stunden$/i.exec(x.einheit);
  const h = sm ? Number(sm[1]) : (/tag/i.test(x.einheit) ? SPAN : null);
  return h ? { label: x.einheit, h, preis: x.preis } : null;
}).filter(Boolean).sort((a, b) => a.h - b.h);
// günstigstes Paket, das stunden abdeckt
const bestTier = (g, stunden) => { const ts = staffelTiers(g); return ts.find((t) => t.h >= stunden - 1e-6) || ts[ts.length - 1] || null; };

// Belegte/Reservierte Stundenintervalle eines Geräts an einem Tag (Dezimalstunden, auf Arbeitstag geklemmt)
function busyForDay(store, gid, day) {
  const out = [];
  const add = (von, bis, vz, bz, kind) => {
    if (!von || !bis || day < von || day > bis) return;
    let a = day === von ? hToDec(vz || '07:00') : WS;
    let b = day === bis ? hToDec(bz || '18:00') : WE;
    a = Math.max(WS, a); b = Math.min(WE, b);
    if (b > a) out.push({ a, b, kind });
  };
  (store.db.auftraege || []).forEach((au) => {
    if (au.status === 'abgelehnt') return;
    const kind = (['anfrage', 'angebot'].indexOf(au.status) >= 0) ? 'resv' : 'busy';
    const gs = (Array.isArray(au.geraete) && au.geraete.length) ? au.geraete : [au];
    gs.forEach((g) => { if (g.geraetId === gid) add(g.von, g.bis, g.vonZeit, g.bisZeit, kind); });
  });
  (store.db.belegungen || []).forEach((b) => { if (b.geraetId === gid) add(b.von, b.bis, b.vonZeit, b.bisZeit, 'busy'); });
  return out.sort((x, y) => x.a - y.a);
}
const overlapsBusy = (busy, a, b) => busy.some((iv) => a < iv.b - 1e-6 && b > iv.a + 1e-6);
// Konfliktsichere Bereichslogik: liefert {start,end} oder null
function computeRange(busy, start, end, gran, minDur) {
  const md = minDur || gran;
  const snap = (h) => Math.round(h / gran) * gran, cw = (h) => Math.max(WS, Math.min(WE, h));
  start = snap(cw(start)); end = snap(cw(end));
  busy.forEach((iv) => { if (start >= iv.a - 1e-6 && start < iv.b - 1e-6) start = iv.b; });
  start = snap(cw(start));
  if (start >= WE - 1e-6) return null;
  let e = Math.max(end, start + md);
  busy.forEach((iv) => { if (iv.a >= start - 1e-6 && iv.a < e) e = iv.a; });
  e = snap(cw(e));
  if (e - start < gran - 1e-6 || overlapsBusy(busy, start, e)) return null;
  return { start, end: e };
}

// ---- Stunden-Zeitachse (zieh- & tappbar, konfliktsicher) ----
function StundenAchse({ busy, sel, gran, onChange, minDur }) {
  const ref = React.useRef(null);
  const drag = React.useRef(null);
  const md = minDur || gran;
  const snap = (h) => Math.round(h / gran) * gran;
  const clampW = (h) => Math.max(WS, Math.min(WE, h));
  const setRange = (start, end) => onChange(computeRange(busy, start, end, gran, md));
  const xToH = (clientX) => { const r = ref.current.getBoundingClientRect(); const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width)); return WS + p * SPAN; };
  const onDown = (e) => { e.preventDefault(); const h = xToH(e.clientX); setRange(h, h + md); };
  const startDrag = (which) => (e) => {
    e.preventDefault(); e.stopPropagation();
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    drag.current = which;
  };
  const onMove = (e) => {
    if (!drag.current || !sel) return;
    const h = snap(clampW(xToH(e.clientX)));
    if (drag.current === 'l') setRange(Math.min(h, sel.end - md), sel.end);
    else setRange(sel.start, Math.max(h, sel.start + md));
  };
  const onUp = (e) => { if (drag.current) { try { e.target.releasePointerCapture(e.pointerId); } catch (_) {} drag.current = null; } };
  const seg = (a, b, kind, key) => (
    <div key={key} style={{ position: 'absolute', top: -1, bottom: -1, left: pctH(a) + '%', width: (pctH(b) - pctH(a)) + '%',
      background: kind === 'resv' ? 'repeating-linear-gradient(-45deg,var(--yellow-soft) 0 6px,#f3dd92 6px 12px)' : 'repeating-linear-gradient(-45deg,var(--danger-wash) 0 6px,#f6d7d1 6px 12px)',
      borderLeft: '1px solid ' + (kind === 'resv' ? '#e2c75e' : '#e0a89f'), borderRight: '1px solid ' + (kind === 'resv' ? '#e2c75e' : '#e0a89f'),
      display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      <Icon name="x" size={11} color={kind === 'resv' ? '#8a6d00' : '#9a3326'} style={{ opacity: .5 }} />
    </div>
  );
  return (
    <div>
      <div ref={ref} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        style={{ position: 'relative', height: 56, background: 'var(--paper)', border: '1.5px solid var(--line-2)', borderRadius: 'var(--r)', overflow: 'hidden', touchAction: 'none', userSelect: 'none', cursor: 'pointer' }}>
        {Array.from({ length: SPAN - 1 }, (_, i) => <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: pctH(WS + 1 + i) + '%', width: 1, background: 'var(--paper-3)' }} />)}
        {busy.map((iv, i) => seg(iv.a, iv.b, iv.kind, i))}
        {sel && (
          <div style={{ position: 'absolute', top: -1.5, bottom: -1.5, left: pctH(sel.start) + '%', width: (pctH(sel.end) - pctH(sel.start)) + '%', background: 'var(--yellow)', border: '1.5px solid var(--ink)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-sm)' }}>
            <div onPointerDown={startDrag('l')} style={{ position: 'absolute', left: 0, top: 9, transform: 'translateX(-8px)', width: 16, height: 38, background: 'var(--ink)', borderRadius: 4, cursor: 'ew-resize', display: 'grid', placeItems: 'center', gap: 2 }}>
              {[0, 1, 2].map((k) => <span key={k} style={{ width: 1, height: 12, background: '#fff', opacity: .8 }} />)}
            </div>
            <div onPointerDown={startDrag('r')} style={{ position: 'absolute', right: 0, top: 9, transform: 'translateX(8px)', width: 16, height: 38, background: 'var(--ink)', borderRadius: 4, cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              {[0, 1, 2].map((k) => <span key={k} style={{ width: 1, height: 12, background: '#fff', opacity: .8 }} />)}
            </div>
          </div>
        )}
      </div>
      <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
        {Array.from({ length: SPAN }, (_, i) => WS + i).map((h) => <span key={h} style={{ position: 'absolute', left: pctH(h) + '%', transform: 'translateX(-50%)', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--muted-2)' }}>{h}</span>)}
      </div>
    </div>
  );
}

// ---- Zusatzleistungen-Auswahl für ein Gerät (Toggles + Parameter + Live-Betrag) ----
// Liefert pro Zusatzleistung über onChange den State { on, ...params } zurück; Betrag via zusatzBetrag().
function zusatzBetrag(z, st, tage) {
  if (!st || !st.on) return 0;
  switch (z.art) {
    case 'stunde':    return (z.preis || 0) * (st.stunden != null ? Number(st.stunden) : 1);
    case 'stueckTag': return Math.max(0, (st.menge != null ? Number(st.menge) : 1) - (z.inklusive || 0)) * (z.preis || 0) * Math.max(1, tage);
    case 'auswahl':   return Math.max(0, (st.ids ? st.ids.length : 0) - (z.inklusive || 0)) * (z.preis || 0) * Math.max(1, tage);
    case 'anfahrt': { const km = Number(st.km) || 0; return km <= 15 ? (z.p15 || 0) : km <= 30 ? (z.p30 || 0) : (z.p30 || 0) + (km - 30) * (z.kmSatz || 0); }
    case 'pauschale': return z.preis || 0;
    default: return 0;
  }
}

// Anzahl Miettage von..bis inklusive (abgewählte Wochentage zählen nicht)
function tageInkl(von, bis) {
  if (!von) return 0;
  if (!bis || bis < von) bis = von;
  let c = von, n = 0, guard = 0;
  while (c <= bis && guard < 400) { if (window.istMiettag(c)) n++; c = window.addDays(c, 1); guard++; }
  return n || 1;
}
// Ist der Tagesbereich a..b durchgehend buchbar? Sperrtage (Wochenende „geschlossen") dürfen
// übersprungen werden – nur echte Belegungen/Vergangenheit blockieren eine lange Miete.
function rangeFrei(store, gid, a, b) {
  if (b < a) { const t = a; a = b; b = t; }
  let c = a, guard = 0;
  while (c <= b && guard < 400) { const st = dayStatus(store, gid, c); if (st === 'belegt' || st === 'reserviert' || st === 'past') return false; c = window.addDays(c, 1); guard++; }
  return true;
}
// Einsatzort gegen Nominatim prüfen (nutzt + füllt den Geocode-Cache). true = gefunden / nicht prüfbar.
async function geocodeOrt(ort) {
  ort = (ort || '').trim();
  if (!ort) return false;
  try {
    const cache = JSON.parse(localStorage.getItem('friesen_geocache') || '{}');
    if (cache[ort]) return true;
    const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(ort + ', Deutschland'));
    const j = await res.json();
    if (j && j[0]) { cache[ort] = { lat: +j[0].lat, lng: +j[0].lon }; try { localStorage.setItem('friesen_geocache', JSON.stringify(cache)); } catch (e) {} return true; }
    return false;
  } catch (e) { return true; } // Netzfehler → nicht blockieren
}
// Geräte-Grundbetrag (ohne Zusatzleistungen) + Kontext
function geraetBetrag(g, row) {
  const hour = isHourMode(g), tage = tageInkl(row.von, row.bis);
  if (!g || (!hour && !row.von) || (hour && !row.sel)) return { betrag: 0, tage, hour, ok: false };
  if (!hour) return { betrag: tage * tagSatz(g), tage, satz: tagSatz(g), hour: false, ok: true };
  const h = row.sel.end - row.sel.start;
  if (geraetModell(g) === 'staffel') { const t = bestTier(g, h); return { betrag: t ? t.preis : 0, h, tier: t, hour: true, staffel: true, ok: !!t }; }
  return { betrag: Math.round(h * stundenSatz(g)), h, satz: stundenSatz(g), hour: true, ok: true };
}
function blockBetrag(store, row) {
  const g = store.geraetById(row.geraetId); if (!g) return 0;
  const tage = tageInkl(row.von, row.bis);
  let z = 0; (g.zusatz || []).forEach((zz) => { z += zusatzBetrag(zz, (row.zusatz || {})[zz.id], tage); });
  return geraetBetrag(g, row).betrag + z;
}

// ---- Ein Geräte-Block: Picker + Kalender + Zeit-/Tageswahl + Zusatzleistungen ----
function GeraetBlock({ store, F, row, idx, total, onChange, onRemove, expanded = true, onExpand }) {
  const g = store.geraetById(row.geraetId) || {};
  const hour = isHourMode(g);
  const tage = tageInkl(row.von, row.bis);
  const gb = geraetBetrag(g, row);
  const vermietbar = store.db.flotte.filter((x) => window.istVermietbar(x));
  const sub = blockBetrag(store, row);

  const selectDev = (gid) => {
    const ng = store.geraetById(gid);
    const eh = geraetEinheiten(store, gid);
    const keep = row.von && ['frei', 'reserviert'].indexOf(dayStatus(store, gid, row.von)) >= 0;
    onChange({ geraetId: gid, einheit: eh[0] || 'Tag', dauer: 1, sel: null, zusatz: {}, von: keep ? row.von : '', bis: keep && !isHourMode(ng) ? row.von : '' });
  };
  const pick = (di) => {
    if (hour) { onChange({ von: di, bis: di, sel: null }); return; }
    if (!row.von || (row.bis && row.bis !== row.von) || di < row.von) { onChange({ von: di, bis: di }); }
    else { rangeFrei(store, row.geraetId, row.von, di) ? onChange({ bis: di }) : onChange({ von: di, bis: di }); }
  };
  const setTage = (n) => {
    let c = row.von, cnt = 1, guard = 0;
    while (cnt < n && guard < 400) { let nx = window.addDays(c, 1), g2 = 0; while (!window.istMiettag(nx) && g2 < 14) { nx = window.addDays(nx, 1); g2++; } if (['belegt', 'reserviert', 'past'].indexOf(dayStatus(store, row.geraetId, nx)) >= 0) break; c = nx; cnt++; guard++; }
    onChange({ bis: c });
  };

  const busy = (hour && row.von) ? busyForDay(store, row.geraetId, row.von) : [];
  const modellChip = (gg) => {
    const m = geraetModell(gg), hr = isHourMode(gg);
    const lbl = m === 'staffel' ? 'STAFFEL' : m === 'stunde' ? 'STUNDENWEISE' : 'TAGEWEISE';
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', padding: '2px 7px', borderRadius: 20, background: hr ? 'var(--yellow-soft)' : 'var(--paper-3)', color: hr ? '#7a5c00' : 'var(--muted)' }}>{hr && <Icon name="clock" size={10} />}{lbl}</span>;
  };
  const preisVorschau = (gg) => {
    const m = geraetModell(gg);
    if (m === 'staffel') { const ts = staffelTiers(gg); const min = ts.length ? ts[0].preis : 0; return ['ab ' + F.fmtEUR(min), (ts[0] ? ts[0].label : '') + '-Paket']; }
    if (m === 'stunde') return [F.fmtEUR(stundenSatz(gg)), 'pro Stunde'];
    return [F.fmtEUR(tagSatz(gg)), 'pro Tag'];
  };

  // ---- Zusatzleistung-Zeile ----
  const ZusatzRow = ({ z }) => {
    const st = (row.zusatz || {})[z.id] || { on: false };
    const setZ = (patch) => onChange({ zusatz: { ...(row.zusatz || {}), [z.id]: { ...st, ...patch } } });
    const betrag = zusatzBetrag(z, st, tage);
    return (
      <div style={{ border: '1px solid var(--line-2)', borderRadius: 'var(--r)', padding: '9px 11px', background: st.on ? 'var(--yellow-wash)' : 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" role="switch" aria-checked={!!st.on} onClick={() => setZ({ on: !st.on })}
            style={{ flex: '0 0 auto', width: 40, height: 24, borderRadius: 999, border: '1px solid ' + (st.on ? 'var(--yellow-deep)' : 'var(--line-2)'), background: st.on ? 'var(--yellow)' : 'var(--paper-3)', position: 'relative', cursor: 'pointer', padding: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: st.on ? 18 : 2, width: 18, height: 18, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)', transition: 'left .15s' }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{z.label || F.ZUSATZ_ARTEN[z.art]?.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{window.zusatzPreisText(z, F)}</div>
          </div>
          <div className="num" style={{ flex: '0 0 auto', fontSize: 13, fontWeight: 700, color: st.on ? 'var(--ink)' : 'var(--muted-2)' }}>{st.on ? F.fmtEUR(betrag) : '—'}</div>
        </div>
        {st.on && z.art === 'stunde' && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Stunden</span>
            <window.UI.Input type="number" min="0" step="0.5" value={st.stunden != null ? st.stunden : 1} onChange={(e) => setZ({ stunden: Number(e.target.value) })} style={{ width: 90, fontSize: 13, textAlign: 'right' }} />
          </div>
        )}
        {st.on && z.art === 'stueckTag' && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Anzahl</span>
            <window.UI.Input type="number" min="0" value={st.menge != null ? st.menge : 1} onChange={(e) => setZ({ menge: Number(e.target.value) })} style={{ width: 90, fontSize: 13, textAlign: 'right' }} />
            {z.inklusive ? <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>{z.inklusive} inkl.</span> : null}
          </div>
        )}
        {st.on && z.art === 'anfahrt' && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Entfernung (km)</span>
            <window.UI.Input type="number" min="0" value={st.km != null ? st.km : 0} onChange={(e) => setZ({ km: Number(e.target.value) })} style={{ width: 90, fontSize: 13, textAlign: 'right' }} />
          </div>
        )}
        {st.on && z.art === 'auswahl' && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(z.geraetIds || []).map((aid) => {
              const ag = store.geraetById(aid); if (!ag) return null;
              const ids = st.ids || []; const on = ids.indexOf(aid) >= 0;
              return <button key={aid} type="button" onClick={() => setZ({ ids: on ? ids.filter((x) => x !== aid) : [...ids, aid] })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: 'inherit', padding: '5px 10px', borderRadius: 999, cursor: 'pointer', background: on ? 'var(--yellow)' : 'var(--paper-2)', border: '1px solid ' + (on ? 'var(--yellow-deep)' : 'var(--line)'), color: 'var(--ink)', fontWeight: on ? 600 : 500 }}>
                <Icon name={on ? 'check' : 'plus'} size={12} /> {ag.name}</button>;
            })}
          </div>
        )}
      </div>
    );
  };

  const chip = (label, onClick, on) => (
    <button type="button" onClick={onClick} style={{ padding: '6px 11px', borderRadius: 999, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line-2)'), background: on ? 'var(--ink)' : 'var(--paper)', color: on ? '#fff' : 'var(--ink)', fontWeight: 600 }}>{label}</button>
  );

  // Zusammenfassung des gewählten Zeitraums (für die eingeklappte Kachel)
  const zeitText = hour
    ? (row.von && row.sel ? F.fmtDate(row.von) + ' · ' + decToH(row.sel.start) + '–' + decToH(row.sel.end) : 'Zeit noch wählen')
    : (row.von ? F.fmtDate(row.von) + (row.bis && row.bis !== row.von ? ' → ' + F.fmtDate(row.bis) : '') + ' · ' + tage + ' Tag' + (tage !== 1 ? 'e' : '') : 'Zeitraum noch wählen');

  // ---- Eingeklappte Kachel ----
  if (!expanded) {
    return (
      <div onClick={onExpand} style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '11px 13px', background: 'var(--paper)', cursor: 'pointer' }}>
        <window.GeraetBadge geraet={g} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name || 'Gerät'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{zeitText}</div>
        </div>
        <span className="num" style={{ flex: '0 0 auto', fontSize: 14, fontWeight: 700 }}>{F.fmtEUR(sub)}</span>
        <window.UI.IconBtn name="edit" size={14} title="Bearbeiten" onClick={(e) => { e.stopPropagation(); onExpand && onExpand(); }} style={{ width: 30, height: 30, flex: '0 0 auto' }} />
        {total > 1 && <window.UI.IconBtn name="trash" size={14} title="Gerät entfernen" onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ width: 30, height: 30, flex: '0 0 auto' }} />}
      </div>
    );
  }

  return (
    <div style={{ border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 14, background: 'var(--paper)' }}>
      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="kicker" style={{ color: 'var(--muted)' }}>Gerät {idx + 1}</div>
          <window.UI.IconBtn name="trash" size={15} title="Gerät entfernen" onClick={onRemove} style={{ width: 30, height: 30 }} />
        </div>
      )}

      {/* Geräte-Picker */}
      <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 8 }}>Gerät wählen</div>
      <div className="stack" style={{ gap: 9 }}>
        {vermietbar.map((gg) => {
          const on = gg.id === row.geraetId; const [pv, pe] = preisVorschau(gg);
          return (
            <div key={gg.id} onClick={() => selectDev(gg.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 'var(--r-lg)', cursor: 'pointer', border: '1.5px solid ' + (on ? 'var(--ink)' : 'var(--line)'), boxShadow: on ? '0 0 0 1.5px var(--ink)' : 'none', background: 'var(--paper)' }}>
              <window.GeraetBadge geraet={gg} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>{gg.name}</div>
                {gg.detail && <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gg.detail}</div>}
                <div style={{ marginTop: 4 }}>{modellChip(gg)}</div>
              </div>
              <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{pv}</div>
                <div style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--muted)' }}>{pe}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verfügbarkeit */}
      <div className="kicker" style={{ color: 'var(--muted)', margin: '16px 0 8px' }}>Verfügbarkeit</div>
      <VerfuegbarkeitsKalender store={store} geraetId={row.geraetId} selected={row.von} bis={row.bis || row.von} onPick={pick} />

      {/* Detail-Drawer je Abrechnungsmodell */}
      {!hour ? (
        <div style={{ marginTop: 12, border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--paper-2)', padding: 14 }}>
          {!row.von ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <Icon name="kalender" size={16} /> Tageweise ({F.fmtEUR(tagSatz(g))}/Tag) – Start- und Endtag im Kalender antippen.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{F.fmtDate(row.von)}{row.bis && row.bis !== row.von ? ' → ' + F.fmtDate(row.bis) : ''}</div>
                <span className="num" style={{ fontSize: 12, fontWeight: 700, background: 'var(--yellow)', borderRadius: 20, padding: '2px 10px' }}>{tage} Tag{tage !== 1 ? 'e' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10, alignItems: 'center' }}>
                {[1, 2, 3, 5, 7].map((n) => chip(n + ' Tag' + (n > 1 ? 'e' : ''), () => setTage(n), tage === n))}
                <span style={{ fontSize: 12, color: 'var(--muted-2)', marginLeft: 2 }}>oder</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <window.UI.Input type="number" min="1" value={tage} onChange={(e) => setTage(Math.max(1, parseInt(e.target.value, 10) || 1))} style={{ width: 64, fontSize: 13, textAlign: 'right', padding: '6px 8px' }} />
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Tage</span>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed var(--line-2)', marginTop: 12, paddingTop: 10 }}>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}><b>{tage} Tag{tage !== 1 ? 'e' : ''}</b> × {F.fmtEUR(tagSatz(g))}/Tag</span>
                <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{F.fmtEUR(gb.betrag)}</span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 12, border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--paper-2)', padding: 14 }}>
          {!row.von ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <Icon name="clock" size={16} /> Zuerst einen freien Tag im Kalender wählen.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>
                  {geraetModell(g) === 'staffel' ? 'Staffelpreis · Paket' : 'Stundenweise · ' + F.fmtEUR(stundenSatz(g)) + '/Std'}
                </div>
                <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line-2)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  {[[0.5, '30 Min'], [1, '1 Std']].map(([gv, gl]) => (
                    <button key={gl} type="button" onClick={() => onChange({ gran: gv })} style={{ padding: '4px 9px', fontSize: 11.5, fontFamily: 'inherit', border: 'none', cursor: 'pointer', background: row.gran === gv ? 'var(--ink)' : 'var(--paper)', color: row.gran === gv ? '#fff' : 'var(--ink)', fontWeight: 600 }}>{gl}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{row.sel ? decToH(row.sel.start) + ' → ' + decToH(row.sel.end) : <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>Zeitfenster auf der Achse wählen ↓</span>}</div>
                {row.sel && <span className="num" style={{ fontSize: 12, fontWeight: 700, background: 'var(--yellow)', borderRadius: 20, padding: '2px 10px' }}>{(row.sel.end - row.sel.start)} Std</span>}
              </div>
              <StundenAchse busy={busy} sel={row.sel} gran={row.gran || 1} minDur={geraetModell(g) === 'staffel' ? ((staffelTiers(g)[0] && staffelTiers(g)[0].h) || (row.gran || 1)) : (row.gran || 1)} onChange={(s) => onChange({ sel: s })} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
                {geraetModell(g) === 'staffel'
                  ? staffelTiers(g).map((t) => chip(t.label + ' · ' + F.fmtEUR(t.preis), () => onChange({ sel: computeRange(busy, WS, WS + t.h, row.gran || 1) }), gb.tier && gb.tier.label === t.label))
                  : [['Vormittag', 7, 12], ['Nachmittag', 13, 18], ['Ganzer Tag', 7, 18], ['½ Tag', 8, 12]].map(([l, a, b]) => chip(l, () => onChange({ sel: computeRange(busy, a, b, row.gran || 1) })))}
              </div>
              {row.sel && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed var(--line-2)', marginTop: 12, paddingTop: 10 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {gb.staffel ? <>Paket <b>{gb.tier ? gb.tier.label : '–'}</b> (für {gb.h} Std)</> : <><b>{gb.h} Std</b> × {F.fmtEUR(stundenSatz(g))}/Std</>}
                  </span>
                  <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{F.fmtEUR(gb.betrag)}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Zusatzleistungen */}
      {(g.zusatz || []).length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 8 }}>Zusatzleistungen</div>
          <div className="stack" style={{ gap: 7 }}>
            {g.zusatz.map((z) => <ZusatzRow key={z.id} z={z} />)}
          </div>
        </div>
      )}

      {/* Block-Summe */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 10 }}>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Zwischensumme {g.name}</span>
        <span className="num" style={{ fontSize: 16, fontWeight: 700 }}>{F.fmtEUR(sub)}</span>
      </div>
    </div>
  );
}

// ---- Neues Anfrage-Modal (Phase 2) ----
const LEER_ROW = () => ({ geraetId: 'bagger', von: '', bis: '', vonZeit: '07:00', bisZeit: '17:00', dauer: 1, einheit: 'Tag', gran: 1, sel: null, zusatz: {} });
function NeueAnfrageModal({ open, onClose, store, F, onSaved }) {
  const [form, setForm] = anfS({ name: '', phone: '', email: '', ort: '', nachricht: '' });
  const [rows, setRows] = anfS([LEER_ROW()]);
  const [activeIdx, setActiveIdx] = anfS(0);
  const toast = window.UI.useToast();
  const setRow = (i, patch) => setRows((rs) => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
  const total = rows.reduce((a, r) => a + blockBetrag(store, r), 0);

  const rowOk = (r) => { const g = store.geraetById(r.geraetId); if (!g) return false; return isHourMode(g) ? !!r.sel && !!r.von : (!!r.von && !!r.bis); };
  const valid = form.name.trim() && form.phone.trim() && form.email.trim() && form.ort.trim() && form.nachricht.trim() && rows.length && rows.every(rowOk);

  const reset = () => { setForm({ name: '', phone: '', email: '', ort: '', nachricht: '' }); setRows([LEER_ROW()]); setActiveIdx(0); };
  const save = async () => {
    if (!valid) { alert('Bitte alle Pflichtfelder und für jedes Gerät eine gültige Zeitauswahl angeben.'); return; }
    // Einsatzort als echte Adresse prüfen
    const ortOk = await geocodeOrt(form.ort.trim());
    if (!ortOk && !window.confirm('Die Adresse „' + form.ort.trim() + '" konnte nicht gefunden werden.\nTrotzdem speichern?')) return;
    const geraete = [];
    for (const r of rows) {
      const g = store.geraetById(r.geraetId), hour = isHourMode(g), tage = tageInkl(r.von, r.bis);
      const entry = hour
        ? { geraetId: r.geraetId, von: r.von, bis: r.von, vonZeit: decToH(r.sel.start), bisZeit: decToH(r.sel.end), einheit: geraetModell(g) === 'staffel' ? ((bestTier(g, r.sel.end - r.sel.start) || {}).label || 'Stunden') : 'Stunden', dauer: r.sel.end - r.sel.start }
        : { geraetId: r.geraetId, von: r.von, bis: r.bis || r.von, vonZeit: '07:00', bisZeit: '17:00', einheit: 'Tag', dauer: tage };
      const konflikt = store.findConflict(entry.geraetId, entry.von, entry.bis, null, entry.vonZeit, entry.bisZeit);
      if (konflikt) { alert(`${g.name} ist im gewählten Zeitraum bereits belegt/reserviert. Bitte anpassen.`); return; }
      entry.zusatz = (g.zusatz || []).filter((z) => (r.zusatz || {})[z.id] && r.zusatz[z.id].on).map((z) => ({ id: z.id, art: z.art, label: z.label, betrag: zusatzBetrag(z, r.zusatz[z.id], tage), ...r.zusatz[z.id] }));
      entry.preis = blockBetrag(store, r);
      geraete.push(entry);
    }
    store.addAnfrage({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), ort: form.ort.trim(), nachricht: form.nachricht.trim(), geraete, preisSchaetzung: total });
    toast('Anfrage gespeichert');
    reset(); onClose(); onSaved && onSaved();
  };
  const close = () => { onClose(); };

  return (
    <window.UI.Modal open={open} onClose={close} title="Neue Anfrage erfassen" width={460}
      footer={<div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted-2)' }}>Voraussichtl.</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{total > 0 ? F.fmtEUR(total) : '—'}</div>
        </div>
        <window.UI.Btn icon="check" disabled={!valid} onClick={save} style={{ flex: 1, justifyContent: 'center', opacity: valid ? 1 : .45 }}>Anfrage speichern</window.UI.Btn>
      </div>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="form-2">
          <window.UI.Field label="Name *"><window.UI.Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vor- und Nachname" /></window.UI.Field>
          <window.UI.Field label="Telefon *"><window.UI.Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0172 …" /></window.UI.Field>
        </div>
        <window.UI.Field label="E-Mail *"><window.UI.Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@beispiel.de" /></window.UI.Field>

        {rows.map((r, i) => <GeraetBlock key={i} store={store} F={F} row={r} idx={i} total={rows.length} expanded={i === activeIdx} onExpand={() => setActiveIdx(i)} onChange={(p) => setRow(i, p)} onRemove={() => { setRows((rs) => rs.filter((_, j) => j !== i)); setActiveIdx((a) => Math.max(0, a > i ? a - 1 : a === i ? Math.min(i, rows.length - 2) : a)); }} />)}
        <window.UI.Btn size="sm" variant="ghost" icon="plus" onClick={() => { setRows((rs) => [...rs, LEER_ROW()]); setActiveIdx(rows.length); }} style={{ alignSelf: 'flex-start' }}>Weiteres Gerät</window.UI.Btn>

        <window.UI.Field label="Einsatzort (Adresse) *"><window.UI.Input value={form.ort} onChange={(e) => setForm({ ...form, ort: e.target.value })} placeholder="z. B. Musterstraße 5, 53797 Lohmar" /></window.UI.Field>
        <window.UI.Field label="Nachricht / Notiz *"><window.UI.Textarea value={form.nachricht} onChange={(e) => setForm({ ...form, nachricht: e.target.value })} placeholder="Was ist geplant?" rows={3} /></window.UI.Field>
      </div>
    </window.UI.Modal>
  );
}

// Pill-Farbschlüssel je Anfrage-Status (window.Pill liest FRIESEN.STATUS)
const anfPillKey = (s) => ({ neu: 'offen', 'in-bearbeitung': 'ueberfaellig', erledigt: 'bezahlt', abgelehnt: 'abgelehnt' }[s] || 'offen');

window.Screens.anfragen = function Anfragen({ nav, params = {}, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [filter, setFilter] = anfS('alle');
  const [detail, setDetail] = anfS(null);
  const [neuOpen, setNeuOpen] = anfS(false);
  const [ablehnAnf, setAblehnAnf] = anfS(null);
  const [ablehnGrund, setAblehnGrund] = anfS('');

  // Direktstart aus „Neu" (Dashboard): Formular gleich öffnen.
  React.useEffect(() => { if (params.neu) setNeuOpen(true); }, [params.neu]);

  // Kunde zu einer Anfrage finden
  const matchKunde = (a) => store.db.kunden.find((k) =>
    (a.phone && k.phone && k.phone.replace(/\s/g, '') === a.phone.replace(/\s/g, '')) ||
    (a.email && k.email && k.email.toLowerCase() === a.email.toLowerCase()) ||
    (a.name && k.name.toLowerCase() === a.name.toLowerCase())
  );

  // Anfrage annehmen → Auftrag anlegen und in den Auftrag springen
  const annehmen = (anf) => {
    const match = matchKunde(anf);
    const akr = (store.db.settings && store.db.settings.nummern && store.db.settings.nummern.auftrag) || { prefix: 'AU', start: 1 };
    const auftragId = store.nextId(akr.prefix, store.db.auftraege, akr.start);
    let neuerKunde = null, kundeId = match ? match.id : '';
    if (!match) {
      const kid = 'k' + (Math.max(0, ...store.db.kunden.map((k) => parseInt(k.id.slice(1), 10) || 0)) + 1);
      neuerKunde = { id: kid, name: anf.name, kontakt: '', street: '', city: anf.ort || '', phone: anf.phone || '', email: anf.email || '', typ: 'Privat' };
      kundeId = kid;
    }
    const geraete = (anf.geraete && anf.geraete.length ? anf.geraete : [{ geraetId: anf.geraetId, von: anf.von, bis: anf.bis, vonZeit: anf.vonZeit, bisZeit: anf.bisZeit, einheit: anf.einheit, dauer: anf.dauer }])
      .filter((g) => g.geraetId)
      .map((g) => ({ geraetId: g.geraetId, von: g.von || store.today, bis: g.bis || g.von || store.today, vonZeit: g.vonZeit || '08:00', bisZeit: g.bisZeit || '17:00', einheit: g.einheit || 'Tag', dauer: Number(g.dauer) || 1 }));
    store.annehmenAnfrage({
      anfrageId: anf.id, auftragId, kundeId: match ? match.id : undefined, neuerKunde,
      auftrag: { kundeId, geraete, ort: anf.ort || '', notiz: anf.nachricht || '' },
    });
    setDetail(null);
    toast('Auftrag ' + auftragId + ' angelegt', { action: () => nav('auftrag', { id: auftragId }), label: 'Auftrag öffnen' });
  };

  const loeschenAnf = (id) => { const snap = store.snapshot(); store.deleteAnfrage(id); toast('Anfrage gelöscht', { undo: () => store.restoreSnapshot(snap) }); };

  const all = store.anfragen || [];
  const rows = all
    .filter((a) => filter === 'alle' || a.status === filter)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  const counts = {
    alle: all.length,
    neu: all.filter((a) => a.status === 'neu').length,
    'in-bearbeitung': all.filter((a) => a.status === 'in-bearbeitung').length,
    erledigt: all.filter((a) => a.status === 'erledigt').length,
    abgelehnt: all.filter((a) => a.status === 'abgelehnt').length,
  };

  // ---- Filter-Tab-Bar (horizontal scrollbar on mobile) ----
  const FilterBar = () => (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', marginBottom: 2 }}>
      <div style={{ display: 'flex', gap: 7, paddingBottom: 2, minWidth: 'max-content' }}>
        {[['alle', 'Alle'], ['neu', 'Neu'], ['in-bearbeitung', 'In Bearbeitung'], ['erledigt', 'Erledigt'], ['abgelehnt', 'Abgelehnt']].map(([id, label]) => {
          const on = filter === id;
          return (
            <button key={id} onClick={() => setFilter(id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 13px', borderRadius: 'var(--r)',
              border: '1.5px solid ' + (on ? 'var(--ink)' : 'var(--line-2)'),
              background: on ? 'var(--ink)' : 'var(--paper)',
              color: on ? '#fff' : 'var(--ink)',
              font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {label}
              <span className="mono" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: on ? 'rgba(255,255,255,.18)' : 'var(--paper-3)', color: on ? '#fff' : 'var(--muted)' }}>{counts[id]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ---- Mobile card row ----
  const MobileCard = ({ a }) => {
    const g = store.geraetById(a.geraetId);
    const st = ANF_STATUS[a.status] || ANF_STATUS.neu;
    return (
      <div onClick={() => setDetail(a)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', padding: '14px 16px', borderBottom: '1px solid var(--paper-3)', background: 'transparent', cursor: 'pointer' }}>
        {g && <window.GeraetBadge geraet={g} size={40} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
            <window.Pill status={anfPillKey(a.status)} label={st.label} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{g?.name}</div>
          {(a.von || a.ort) && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {a.von && <span>📅 {F.fmtDate(a.von)}{a.bis && a.bis !== a.von ? ' – ' + F.fmtDate(a.bis) : ''}</span>}
              {a.ort && <span>📍 {a.ort}</span>}
            </div>
          )}
          {a.status !== 'erledigt' && (
            <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
              <window.UI.Btn size="sm" icon="check" onClick={(e) => { e.stopPropagation(); annehmen(a); }}>Auftrag annehmen</window.UI.Btn>
            </div>
          )}
        </div>
        <Icon name="chevron" size={16} color="var(--muted-2)" style={{ marginTop: 4, flex: '0 0 auto' }} />
      </div>
    );
  };

  return (
    <>
      <PageHeader kicker="Eingehende Anfragen" title="Anfragen" mobile={mobile}>
        <window.NeuButton nav={nav} onNeu={() => setNeuOpen(true)} />
      </PageHeader>

      <div className="content-pad stack" style={{ gap: 14 }}>
        <FilterBar />

        {rows.length === 0 && (
          <window.UI.Empty icon="bell" title={filter === 'alle' ? 'Keine Anfragen' : 'Keine Einträge'}
            sub={filter === 'alle' ? 'Sobald jemand das Kontaktformular ausfüllt, erscheint die Anfrage hier.' : undefined}
            action={filter === 'alle' && (
              <button onClick={() => window.open('contact.html', '_blank', 'noopener,noreferrer')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--yellow)', color: 'var(--ink)', borderRadius: 'var(--r)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Formular-Link öffnen ↗
              </button>
            )}
          />
        )}

        {rows.length > 0 && (
          mobile ? (
            /* ---- Mobile: Karten-Liste ---- */
            <window.UI.Card style={{ padding: 0, overflow: 'hidden' }}>
              {rows.map((a) => <MobileCard key={a.id} a={a} />)}
            </window.UI.Card>
          ) : (
            /* ---- Desktop: Tabelle ---- */
            <window.UI.Card style={{ padding: 0, overflow: 'hidden' }} className="scroll-x">
              <table className="fr-table">
                <thead><tr>
                  <th>Datum</th><th>Name</th><th>Gerät</th><th className="hide-sm">Zeitraum</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.map((a) => {
                    const g = store.geraetById(a.geraetId);
                    const st = ANF_STATUS[a.status] || ANF_STATUS.neu;
                    return (
                      <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(a)}>
                        <td className="num" style={{ color: 'var(--muted)' }}>{F.fmtDate(a.datum || '')}</td>
                        <td><div style={{ fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.phone}</div></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {g && <window.GeraetBadge geraet={g} size={26} />}
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{g?.name || a.geraetId}{a.geraete && a.geraete.length > 1 ? ' +' + (a.geraete.length - 1) : ''}</span>
                          </div>
                        </td>
                        <td className="num hide-sm" style={{ color: 'var(--muted)' }}>{a.von ? F.fmtDate(a.von) : '—'}{a.bis && a.bis !== a.von ? ' – ' + F.fmtDate(a.bis) : ''}</td>
                        <td><window.Pill status={anfPillKey(a.status)} label={st.label} /></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions" style={{ opacity: 1 }}>
                            {a.status !== 'erledigt' && <window.UI.Btn size="sm" icon="check" onClick={() => annehmen(a)}>Annehmen</window.UI.Btn>}
                            <window.UI.IconBtn name="trash" size={15} title="Löschen" style={{ width: 32, height: 32 }} onClick={() => loeschenAnf(a.id)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </window.UI.Card>
          )
        )}
      </div>

      {/* Neue Anfrage intern erfassen (Phase 2: Picker + Zeitachse + Zusatzleistungen) */}
      <NeueAnfrageModal open={neuOpen} onClose={() => setNeuOpen(false)} store={store} F={F} />

      {/* Detail-Modal */}
      <window.UI.Modal open={!!detail} onClose={() => setDetail(null)} title="Anfrage" width={480}
        footer={detail && <>
          {detail.status !== 'erledigt' && detail.status !== 'abgelehnt' && <window.UI.Btn variant="ghost" icon="x" onClick={() => { setAblehnGrund(''); setAblehnAnf(detail); }}>Ablehnen</window.UI.Btn>}
          {detail.status !== 'erledigt' && detail.status !== 'abgelehnt' && <window.UI.Btn icon="check" onClick={() => annehmen(detail)}>Auftrag annehmen</window.UI.Btn>}
          <window.UI.Btn variant="ghost" onClick={() => setDetail(null)}>Schließen</window.UI.Btn>
        </>}>
        {detail && (() => {
          const g = store.geraetById(detail.geraetId);
          return (
            <div className="stack" style={{ gap: 14 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                {g && <window.GeraetBadge geraet={g} size={44} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{detail.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>{detail.phone} · {detail.email}</div>
                </div>
              </div>
              <div style={{ background: 'var(--paper-2)', borderRadius: 'var(--r)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
                {(detail.geraete && detail.geraete.length ? detail.geraete : [{ geraetId: detail.geraetId, von: detail.von, bis: detail.bis, einheit: detail.einheit, vonZeit: detail.vonZeit, bisZeit: detail.bisZeit }]).map((ge, i) => {
                  const gg = store.geraetById(ge.geraetId);
                  const zeit = ge.einheit === 'Stunden' && ge.vonZeit ? ' · ' + ge.vonZeit + '–' + (ge.bisZeit || '') + ' Uhr' : '';
                  return <div key={i}><b>{gg ? gg.name : (ge.geraetId || 'Gerät')}:</b> {ge.von ? F.fmtDate(ge.von) : '—'}{ge.bis && ge.bis !== ge.von ? ' – ' + F.fmtDate(ge.bis) : ''}{zeit}</div>;
                })}
                {detail.ort && <div><b>Einsatzort:</b> {detail.ort}</div>}
                {detail.nachricht && <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 2 }}>{detail.nachricht}</div>}
                {detail.status === 'abgelehnt' && <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 2, color: 'var(--danger)' }}><b>Abgelehnt</b>{detail.abgelehntAm ? ' am ' + F.fmtDate(detail.abgelehntAm) : ''}{detail.ablehnungsgrund ? ' · ' + detail.ablehnungsgrund : ''}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {detail.phone && (
                  <a href={`https://wa.me/49${detail.phone.replace(/[^0-9]/g,'').replace(/^0/,'')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', background: '#25D366', color: '#fff', borderRadius: 'var(--r)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                    WhatsApp
                  </a>
                )}
                {detail.email && (
                  <a href={`mailto:${detail.email}?subject=Ihre Anfrage bei Friesen Bau- und Mietservice`} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', border: '1.5px solid var(--line)', color: 'var(--ink)', borderRadius: 'var(--r)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                    E-Mail
                  </a>
                )}
              </div>
            </div>
          );
        })()}
      </window.UI.Modal>

      {/* Ablehnen: Grund erfassen + automatische Absage-Nachricht (WhatsApp) */}
      {ablehnAnf && (
        <window.UI.Modal open title="Anfrage ablehnen" onClose={() => setAblehnAnf(null)} width={460}
          footer={<>
            <window.UI.Btn variant="ghost" onClick={() => setAblehnAnf(null)}>Abbrechen</window.UI.Btn>
            <window.UI.Btn variant="danger" icon="x" onClick={() => {
              const anf = ablehnAnf; const grund = ablehnGrund.trim();
              store.ablehnenAnfrage(anf.id, grund);
              const c = store.db.company || {};
              const num = (anf.whatsapp || anf.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '49');
              const msg = encodeURIComponent(
                `Hallo ${anf.name},\n\n` +
                `vielen Dank für Ihre Anfrage bei ${c.name || 'Friesen Bau- und Mietservice'}.\n\n` +
                `Leider können wir Ihren gewünschten Auftrag nicht übernehmen${grund ? ' – Grund: ' + grund : ''}.\n\n` +
                `Wir bitten um Ihr Verständnis und wünschen Ihnen viel Erfolg bei Ihrem Vorhaben.\n\n` +
                `Mit freundlichen Grüßen\n${c.owner || ''}${c.name ? ' · ' + c.name : ''}`
              );
              if (num) window.open('https://wa.me/' + num + '?text=' + msg, '_blank', 'noopener,noreferrer');
              toast('Anfrage abgelehnt' + (num ? ' · Absage-Nachricht geöffnet' : ''));
              setAblehnAnf(null); setDetail(null);
            }}>Ablehnen &amp; Nachricht</window.UI.Btn>
          </>}>
          <div className="stack" style={{ gap: 12 }}>
            <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Absage an <b>{ablehnAnf.name}</b>. Der Grund wird in die WhatsApp-Absage übernommen (optional).</div>
            <window.UI.Field label="Ablehnungsgrund (optional)">
              <window.UI.Textarea value={ablehnGrund} onChange={(e) => setAblehnGrund(e.target.value)} rows={3} placeholder="z. B. Gerät im gewünschten Zeitraum bereits vergeben" />
            </window.UI.Field>
          </div>
        </window.UI.Modal>
      )}
    </>
  );
};
