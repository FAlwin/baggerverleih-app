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
function VerfuegbarkeitsKalender({ store, geraetId, selected, bis, onPick }) {
  const [off, setOff] = anfS(0);
  const today = store.today;
  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const status = (dayIso) => {
    if (dayIso < today) return 'past';
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
  };
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
// Pill-Farbschlüssel je Anfrage-Status (window.Pill liest FRIESEN.STATUS)
const anfPillKey = (s) => ({ neu: 'offen', 'in-bearbeitung': 'ueberfaellig', erledigt: 'bezahlt', abgelehnt: 'abgelehnt' }[s] || 'offen');

window.Screens.anfragen = function Anfragen({ nav, params = {}, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [filter, setFilter] = anfS('alle');
  const [detail, setDetail] = anfS(null);
  const [neuOpen, setNeuOpen] = anfS(false);
  const LEER_ANF = { name: '', phone: '', email: '', ort: '', nachricht: '', geraete: [{ geraetId: 'bagger', von: '', vonZeit: '08:00', dauer: 1, einheit: 'Tag' }] };
  const [neuForm, setNeuForm] = anfS(LEER_ANF);
  const [activeRow, setActiveRow] = anfS(0);
  const [ablehnAnf, setAblehnAnf] = anfS(null);
  const [ablehnGrund, setAblehnGrund] = anfS('');

  // Direktstart aus „Neu" (Dashboard): Formular gleich öffnen.
  React.useEffect(() => { if (params.neu) setNeuOpen(true); }, [params.neu]);

  const saveNeu = () => {
    // Alle Felder verpflichtend (wie im Kundenkontaktformular).
    const fehlt = [];
    if (!neuForm.name.trim()) fehlt.push('Name');
    if (!neuForm.phone.trim()) fehlt.push('Telefon');
    if (!neuForm.email.trim()) fehlt.push('E-Mail');
    if (!neuForm.ort.trim()) fehlt.push('Einsatzort');
    if (!neuForm.nachricht.trim()) fehlt.push('Nachricht');
    const rows = neuForm.geraete || [];
    if (!rows.length || rows.some((g) => !g.geraetId)) fehlt.push('Gerät');
    if (rows.some((g) => !g.von)) fehlt.push('Start (je Gerät)');
    if (fehlt.length) { alert('Bitte alle Pflichtfelder ausfüllen:\n• ' + fehlt.join('\n• ')); return; }
    // Pro Gerät Ende berechnen + belegten/reservierten Zeitraum sperren
    const geraete = [];
    for (const g of rows) {
      const ende = window.berechneEnde(g.von, g.vonZeit, g.dauer, g.einheit);
      const konflikt = store.findConflict(g.geraetId, g.von, ende.bis);
      if (konflikt) {
        alert(`${store.geraetById(g.geraetId)?.name} ist ${F.fmtDate(konflikt.von)}–${F.fmtDate(konflikt.bis)} bereits belegt/reserviert. Bitte anderen Zeitraum wählen.`);
        return;
      }
      geraete.push({ geraetId: g.geraetId, von: g.von, vonZeit: g.vonZeit || '08:00', dauer: Number(g.dauer) || 1, einheit: g.einheit || 'Tage', bis: ende.bis, bisZeit: ende.bisZeit });
    }
    store.addAnfrage({ name: neuForm.name.trim(), phone: neuForm.phone.trim(), email: neuForm.email.trim(), ort: neuForm.ort.trim(), nachricht: neuForm.nachricht.trim(), geraete });
    toast('Anfrage gespeichert');
    setNeuForm(LEER_ANF); setActiveRow(0);
    setNeuOpen(false);
  };

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

      {/* Neue Anfrage intern erfassen */}
      <window.UI.Modal open={neuOpen} onClose={() => setNeuOpen(false)} title="Neue Anfrage erfassen" width={460}
        footer={<><window.UI.Btn variant="ghost" onClick={() => setNeuOpen(false)}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" onClick={saveNeu}>Anfrage speichern</window.UI.Btn></>}>
        <div className="stack" style={{ gap: 12 }}>
          <div className="form-2">
            <window.UI.Field label="Name *"><window.UI.Input value={neuForm.name} onChange={(e) => setNeuForm({ ...neuForm, name: e.target.value })} placeholder="Vor- und Nachname" /></window.UI.Field>
            <window.UI.Field label="Telefon *"><window.UI.Input type="tel" value={neuForm.phone} onChange={(e) => setNeuForm({ ...neuForm, phone: e.target.value })} placeholder="0172 …" /></window.UI.Field>
          </div>
          <window.UI.Field label="E-Mail *"><window.UI.Input type="email" value={neuForm.email} onChange={(e) => setNeuForm({ ...neuForm, email: e.target.value })} placeholder="name@beispiel.de" /></window.UI.Field>
          {/* Geräte – mehrere möglich, je eigener Zeitraum */}
          <div className="stack" style={{ gap: 10 }}>
            <div className="kicker" style={{ color: 'var(--muted)' }}>Geräte</div>
            {neuForm.geraete.map((g, i) => {
              const setRow = (patch) => setNeuForm((f) => ({ ...f, geraete: f.geraete.map((x, j) => j === i ? { ...x, ...patch } : x) }));
              const ende = g.von ? window.berechneEnde(g.von, g.vonZeit, g.dauer, g.einheit) : null;
              const konflikt = ende ? store.findConflict(g.geraetId, g.von, ende.bis) : null;
              return (
                <div key={i} onClick={() => setActiveRow(i)} style={{ border: '1px solid ' + (activeRow === i ? 'var(--yellow)' : 'var(--line)'), borderRadius: 'var(--r)', padding: 12, background: activeRow === i ? 'var(--paper-2)' : 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <window.UI.Field label={'Gerät' + (neuForm.geraete.length > 1 ? ' ' + (i + 1) : '')} style={{ flex: 1 }}>
                      <window.UI.Select value={g.geraetId} onChange={(e) => { const gid = e.target.value; const eh = geraetEinheiten(store, gid); setRow({ geraetId: gid, einheit: eh[0], dauer: 1 }); }}>
                        {store.db.flotte.filter((x) => window.istVermietbar(x)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </window.UI.Select>
                    </window.UI.Field>
                    {neuForm.geraete.length > 1 && <window.UI.Btn size="sm" variant="ghost" icon="trash" title="Gerät entfernen" onClick={() => { setNeuForm((f) => ({ ...f, geraete: f.geraete.filter((_, j) => j !== i) })); setActiveRow(0); }} style={{ marginBottom: 0 }} />}
                  </div>
                  <window.UI.ZeitraumPicker F={F} von={g.von} vonZeit={g.vonZeit} menge={g.dauer} einheit={g.einheit} einheiten={geraetEinheiten(store, g.geraetId)}
                    onChange={(v) => setRow({ von: v.von, vonZeit: v.vonZeit, dauer: v.menge, einheit: v.einheit })} />
                  {ende && (konflikt
                    ? <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>✗ {F.fmtDate(konflikt.von)}–{F.fmtDate(konflikt.bis)} bereits belegt/reserviert</div>
                    : <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Ende: {F.fmtDate(ende.bis)}{g.einheit === 'Stunden' ? ' · ' + ende.bisZeit : ''}</div>)}
                </div>
              );
            })}
            <window.UI.Btn size="sm" variant="ghost" icon="plus" onClick={() => { setNeuForm((f) => ({ ...f, geraete: [...f.geraete, { geraetId: 'bagger', von: '', vonZeit: '08:00', dauer: 1, einheit: 'Tag' }] })); setActiveRow(neuForm.geraete.length); }} style={{ alignSelf: 'flex-start' }}>Weiteres Gerät</window.UI.Btn>
          </div>
          {(() => {
            const ar = neuForm.geraete[activeRow] || neuForm.geraete[0] || {};
            return (
              <window.UI.Field label="Verfügbarkeit" hint={'Freien (grünen) Tag antippen, um den Start zu wählen' + (neuForm.geraete.length > 1 ? ' (für das oben markierte Gerät).' : '.')}>
                <VerfuegbarkeitsKalender store={store} geraetId={ar.geraetId} selected={ar.von} bis={ar.von ? window.berechneEnde(ar.von, ar.vonZeit, ar.dauer, ar.einheit).bis : ''}
                  onPick={(di) => setNeuForm((f) => ({ ...f, geraete: f.geraete.map((x, j) => j === activeRow ? { ...x, von: di } : x) }))} />
              </window.UI.Field>
            );
          })()}
          <window.UI.Field label="Einsatzort (Adresse) *"><window.UI.Input value={neuForm.ort} onChange={(e) => setNeuForm({ ...neuForm, ort: e.target.value })} placeholder="z. B. Musterstraße 5, 53797 Lohmar" /></window.UI.Field>
          <window.UI.Field label="Nachricht / Notiz *">
            <window.UI.Textarea value={neuForm.nachricht} onChange={(e) => setNeuForm({ ...neuForm, nachricht: e.target.value })} placeholder="Was ist geplant?" rows={3} />
          </window.UI.Field>
        </div>
      </window.UI.Modal>

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
