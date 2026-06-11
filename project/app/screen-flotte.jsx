/* ============ SCREEN: Flotte v2 — Foto, Neues Gerät, Servicepositionen editierbar ============ */
window.Screens = window.Screens || {};
const { useState: flS, useRef: flR } = React;

const FARBEN = ['#F7C72A','#F39222','#B5D334','#3FB6D3','#2B6CB0','#8B5E3C','#6B6B66','#141414'];
const KATS   = ['Maschine', 'Transport', 'Anbau', 'Elektro', 'Sonstiges'];

// Farbakzent je Zusatzart (für Editor + Karten-Chips)
const ART_FARBE = { stunde: '#3FB6D3', stueckTag: '#B5D334', auswahl: '#F7C72A', anfahrt: '#2B6CB0', pauschale: '#8B5E3C' };

// Kompakter Preistext einer Zusatzleistung (auch im Anfrage-Screen, Phase 2, genutzt)
window.zusatzPreisText = function zusatzPreisText(z, F, kurz) {
  const eur = (n) => F ? F.fmtEUR(n) : (n + ' €');
  if (kurz) {
    switch (z.art) {
      case 'stunde':    return eur(z.preis) + '/Std';
      case 'stueckTag': return eur(z.preis) + '/Tag';
      case 'auswahl':   return (z.inklusive ? z.inklusive + ' inkl. · ' : '') + '+' + eur(z.preis);
      case 'anfahrt':   return 'ab ' + eur(z.p15);
      case 'pauschale': return eur(z.preis);
      default:          return '';
    }
  }
  switch (z.art) {
    case 'stunde':    return eur(z.preis) + '/Std';
    case 'stueckTag': return eur(z.preis) + '/Stk·Tag' + (z.inklusive ? ' · ab ' + (z.inklusive + 1) + '.' : '');
    case 'auswahl':   return (z.inklusive ? z.inklusive + ' inkl. · ' : '') + 'weitere ' + eur(z.preis) + '/Stk·Tag';
    case 'anfahrt':   return eur(z.p15) + ' / ' + eur(z.p30) + ' / +' + eur(z.kmSatz) + '/km';
    case 'pauschale': return eur(z.preis) + ' pauschal';
    default:          return '';
  }
};
const zusatzPreisText = window.zusatzPreisText;

const ZUSATZ_FELD_META = {
  preis:     { label: 'Preis €',     ph: '€' },
  inklusive: { label: 'inkl. (Stk)', ph: '0' },
  p15:       { label: '≤15 km €',    ph: '€' },
  p30:       { label: '≤30 km €',    ph: '€' },
  kmSatz:    { label: '€/km >30',    ph: '€' },
};

function GeraetModalForm({ init, onSave, onClose }) {
  const F = window.FRIESEN;
  const store = window.useStore();
  const MODELLE = F.ABRECHNUNG_MODELLE;
  const ARTEN = F.ZUSATZ_ARTEN;
  // wählbare Geräte für die Auswahl-Zusatzart (z. B. Löffel) – das Gerät selbst ausgenommen
  const anbauGeraete = (store.db.flotte || []).filter((x) => x.id !== (init && init.id));
  const KATS = (store.db.settings && store.db.settings.kategorien) || ['Maschine', 'Transport', 'Anbau'];
  const [g, setG] = flS({ kuerzel:'', farbe:'#F7C72A', kat: KATS[0] || 'Maschine', modell:'tag', tarif:[], zusatz:[], foto:null, ...init });
  const fileRef = flR();
  const setT = (i, patch) => setG((x) => ({ ...x, tarif: x.tarif.map((r, j) => j === i ? { ...r, ...patch } : r) }));
  const addRow = () => setG((x) => ({ ...x, tarif: [...x.tarif, { einheit: '', preis: 0 }] }));
  const removeRow = (i) => setG((x) => ({ ...x, tarif: x.tarif.filter((_, j) => j !== i) }));
  // Zusatzleistungen
  const zArr = g.zusatz || [];
  const setZ = (i, patch) => setG((x) => ({ ...x, zusatz: (x.zusatz || []).map((r, j) => j === i ? { ...r, ...patch } : r) }));
  const addZ = () => setG((x) => ({ ...x, zusatz: [...(x.zusatz || []), { id: 'z' + Date.now(), art: 'pauschale', label: '', preis: 0 }] }));
  const removeZ = (i) => setG((x) => ({ ...x, zusatz: (x.zusatz || []).filter((_, j) => j !== i) }));
  // beim Wechsel der Art die art-fremden Felder bereinigen, damit keine Altwerte hängen bleiben
  const setZArt = (i, art) => setG((x) => ({ ...x, zusatz: (x.zusatz || []).map((r, j) => {
    if (j !== i) return r;
    const keep = { id: r.id, art, label: r.label };
    (ARTEN[art].felder || []).forEach((f) => { keep[f] = r[f] != null ? r[f] : 0; });
    if (ARTEN[art].geraete) keep.geraetIds = Array.isArray(r.geraetIds) ? r.geraetIds : [];
    return keep;
  }) }));
  const toggleZGeraet = (i, gid) => setG((x) => ({ ...x, zusatz: (x.zusatz || []).map((r, j) => {
    if (j !== i) return r;
    const ids = Array.isArray(r.geraetIds) ? r.geraetIds : [];
    return { ...r, geraetIds: ids.includes(gid) ? ids.filter((id) => id !== gid) : [...ids, gid] };
  }) }));
  const pickFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setG((x) => ({ ...x, foto: ev.target.result }));
    reader.readAsDataURL(file);
  };
  return (
    <window.UI.Modal open title={init?.id ? g.name + ' bearbeiten' : 'Neues Gerät'} onClose={onClose} width={540}
      footer={<><window.UI.Btn variant="ghost" onClick={onClose}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" disabled={!g.name} onClick={() => onSave(g)}>Speichern</window.UI.Btn></>}>
      <div className="stack" style={{ gap: 16 }}>
        {/* Foto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div onClick={() => fileRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 8, background: 'var(--paper-3)', border: '2px dashed var(--line-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', flex: '0 0 auto' }}>
            {g.foto ? <img src={g.foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="bagger" size={28} color="var(--muted-2)" />}
          </div>
          <div>
            <window.UI.Btn variant="ghost" size="sm" icon="download" onClick={() => fileRef.current?.click()}>Foto wählen</window.UI.Btn>
            {g.foto && <window.UI.Btn variant="ghost" size="sm" icon="x" onClick={() => setG({ ...g, foto: null })} style={{ marginTop: 6 }}>Entfernen</window.UI.Btn>}
            <div className="hint">JPG/PNG · ca. 1–2 MB</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickFile} />
        </div>
        <div className="form-2">
          <window.UI.Field label="Name" required><window.UI.Input value={g.name || ''} onChange={(e) => setG({ ...g, name: e.target.value })} placeholder="z. B. 2t Kettenbagger" /></window.UI.Field>
          <window.UI.Field label="Kürzel (Badge, max 4 Zeichen)"><window.UI.Input value={g.kuerzel || ''} onChange={(e) => setG({ ...g, kuerzel: e.target.value.toUpperCase().slice(0, 4) })} /></window.UI.Field>
        </div>
        <window.UI.Field label="Details / Beschreibung"><window.UI.Input value={g.detail || ''} onChange={(e) => setG({ ...g, detail: e.target.value })} placeholder="Hersteller, Baujahr, Besonderheiten" /></window.UI.Field>
        <div className="form-2">
          <window.UI.Field label="Kategorie">
            <window.UI.Select value={g.kat || 'Maschine'} onChange={(e) => setG({ ...g, kat: e.target.value })}>
              {KATS.map((k) => <option key={k}>{k}</option>)}
            </window.UI.Select>
          </window.UI.Field>
          <window.UI.Field label="Badge-Farbe">
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', paddingTop: 4 }}>
              {FARBEN.map((f) => (
                <button key={f} onClick={() => setG({ ...g, farbe: f })} style={{ width: 28, height: 28, borderRadius: 5, background: f, border: g.farbe === f ? '2.5px solid var(--ink)' : '1.5px solid var(--line)', cursor: 'pointer', boxShadow: g.farbe === f ? '0 0 0 2px var(--yellow)' : 'none' }} />
              ))}
            </div>
          </window.UI.Field>
        </div>
        {(() => {
          const verm = window.istVermietbar(g);
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper-2)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Einzeln vermietbar</div>
                <div className="hint">Erscheint als eigenständiges Gerät in Anfrage &amp; Kalender. Bei Anbaugeräten/Zubehör optional.</div>
              </div>
              <button type="button" role="switch" aria-checked={verm} onClick={() => setG({ ...g, vermietbar: !verm })}
                style={{ flex: '0 0 auto', width: 46, height: 27, borderRadius: 999, border: '1px solid ' + (verm ? 'var(--yellow-deep)' : 'var(--line-2)'), background: verm ? 'var(--yellow)' : 'var(--paper-3)', position: 'relative', cursor: 'pointer', transition: 'background .15s', padding: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: verm ? 21 : 2, width: 21, height: 21, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .15s' }} />
              </button>
            </div>
          );
        })()}
        {window.istVermietbar(g) && (
          <window.UI.Field label="Abrechnung (steuert die Zeitwahl in der Anfrage)">
            <window.UI.Select value={g.modell || 'tag'} onChange={(e) => setG({ ...g, modell: e.target.value })}>
              {Object.entries(MODELLE).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </window.UI.Select>
          </window.UI.Field>
        )}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="kicker" style={{ color: 'var(--muted)' }}>Tarif</div>
            <window.UI.Btn size="sm" variant="soft" icon="plus" onClick={addRow}>Einheit</window.UI.Btn>
          </div>
          {g.tarif.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Noch keine Einheiten angelegt.</div>}
          <div className="stack" style={{ gap: 8 }}>
            {g.tarif.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 32px', gap: 8, alignItems: 'center' }}>
                <window.UI.Input value={r.einheit} onChange={(e) => setT(i, { einheit: e.target.value })} placeholder="z. B. Stunde, Tag, Woche …" style={{ fontSize: 13 }} />
                <window.UI.Input type="number" value={r.preis} onChange={(e) => setT(i, { preis: Number(e.target.value) })} placeholder="€" style={{ fontSize: 13, textAlign: 'right' }} />
                <window.UI.IconBtn name="trash" size={15} onClick={() => removeRow(i)} style={{ width: 32, height: 32 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Zusatzleistungen — je Gerät zuweisbar, erscheinen im Anfrage-Screen als zuschaltbare Positionen */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div className="kicker" style={{ color: 'var(--muted)' }}>Zusatzleistungen</div>
            <window.UI.Btn size="sm" variant="soft" icon="plus" onClick={addZ}>Leistung</window.UI.Btn>
          </div>
          <div className="hint" style={{ marginBottom: 10 }}>z. B. Fahrer (pro Std), Zusatz-Löffel (pro Stück/Tag), Anfahrt oder Reinigung.</div>
          {zArr.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Keine Zusatzleistungen für dieses Gerät.</div>}
          <div className="stack" style={{ gap: 10 }}>
            {zArr.map((z, i) => {
              const farbe = ART_FARBE[z.art] || 'var(--line-2)';
              return (
              <div key={z.id || i} style={{ position: 'relative', border: '1px solid var(--line-2)', borderLeft: '3px solid ' + farbe, borderRadius: 'var(--r)', padding: '10px 12px', background: 'var(--paper)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <window.UI.Input value={z.label || ''} onChange={(e) => setZ(i, { label: e.target.value })} placeholder="Bezeichnung (z. B. Mit Fahrer)" style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }} />
                  <window.UI.IconBtn name="trash" size={15} onClick={() => removeZ(i)} style={{ width: 32, height: 32, flex: '0 0 auto' }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginTop: 9 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)', minWidth: 150 }}>
                    Art
                    <window.UI.Select value={z.art} onChange={(e) => setZArt(i, e.target.value)} style={{ fontSize: 13 }}>
                      {Object.entries(ARTEN).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
                    </window.UI.Select>
                  </label>
                  {(ARTEN[z.art]?.felder || []).map((f) => (
                    <label key={f} style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      {ZUSATZ_FELD_META[f]?.label || f}
                      <window.UI.Input type="number" value={z[f] != null ? z[f] : 0} onChange={(e) => setZ(i, { [f]: Number(e.target.value) })} placeholder={ZUSATZ_FELD_META[f]?.ph || ''} style={{ fontSize: 13, textAlign: 'right', width: 88 }} />
                    </label>
                  ))}
                </div>
                {ARTEN[z.art]?.geraete && (
                  <div style={{ marginTop: 10, borderTop: '1px dashed var(--line-2)', paddingTop: 9 }}>
                    <div style={{ fontSize: 10.5, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Wählbare Geräte</div>
                    {anbauGeraete.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>Keine Anbaugeräte in der Flotte angelegt.</div>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {anbauGeraete.map((ag) => {
                        const on = Array.isArray(z.geraetIds) && z.geraetIds.includes(ag.id);
                        return (
                          <button key={ag.id} type="button" onClick={() => toggleZGeraet(i, ag.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'inherit', padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
                              background: on ? 'var(--yellow)' : 'var(--paper-2)', border: '1px solid ' + (on ? 'var(--yellow-deep)' : 'var(--line)'), color: 'var(--ink)', fontWeight: on ? 600 : 500 }}>
                            <Icon name={on ? 'check' : 'plus'} size={12} /> {ag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </window.UI.Modal>
  );
}

// ---- Geräte-Logbuch: Betriebsstunden, Historie, Mängel/Reparaturen/Notizen ----
function GeraetDokuModal({ geraet, store, onClose }) {
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const g = geraet;
  const [stunden, setStunden] = flS(g.betriebsstunden || '');
  const [typ, setTyp] = flS('mangel');
  const [text, setText] = flS('');
  const TYP = { rueckgabe: { label: 'Rückgabe', c: 'var(--ok)' }, mangel: { label: 'Mangel', c: 'var(--danger)' }, reparatur: { label: 'Reparatur', c: 'var(--warn)' }, notiz: { label: 'Notiz', c: 'var(--muted-2)' } };
  const log = g.protokoll || [];
  const addEntry = () => { if (!text.trim()) return; store.geraetProtokollAdd(g.id, { typ, text: text.trim() }); setText(''); toast('Eintrag gespeichert'); };
  const saveStunden = () => { store.updateGeraet(g.id, { betriebsstunden: stunden }); toast('Betriebsstunden aktualisiert'); };
  return (
    <window.UI.Modal open title={`Logbuch · ${g.name}`} onClose={onClose} width={560}
      footer={<window.UI.Btn variant="ghost" onClick={onClose}>Schließen</window.UI.Btn>}>
      <div className="stack" style={{ gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <window.UI.Field label="Aktuelle Betriebsstunden" style={{ flex: 1 }}>
            <window.UI.Input value={stunden} onChange={(e) => setStunden(e.target.value)} placeholder="z. B. 1240 h" />
          </window.UI.Field>
          <window.UI.Btn icon="check" onClick={saveStunden}>Speichern</window.UI.Btn>
        </div>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 8 }}>Eintrag hinzufügen</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <window.UI.Field label="Art" style={{ flex: '0 0 130px' }}>
              <window.UI.Select value={typ} onChange={(e) => setTyp(e.target.value)}>
                <option value="mangel">Mangel</option>
                <option value="reparatur">Reparatur</option>
                <option value="notiz">Notiz</option>
              </window.UI.Select>
            </window.UI.Field>
            <window.UI.Field label="Beschreibung" style={{ flex: '1 1 200px', minWidth: 160 }}>
              <window.UI.Input value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Ölwechsel fällig" onKeyDown={(e) => { if (e.key === 'Enter') addEntry(); }} />
            </window.UI.Field>
            <window.UI.Btn icon="plus" onClick={addEntry} style={{ flex: '0 0 auto', marginBottom: 0 }}>Hinzufügen</window.UI.Btn>
          </div>
          <button disabled title="Foto-Upload kommt mit dem Server" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-2)', background: 'var(--paper-3)', border: '1px dashed var(--line-2)', borderRadius: 'var(--r)', padding: '6px 10px', cursor: 'not-allowed', fontFamily: 'var(--sans)' }}><Icon name="download" size={14} /> Foto hinzufügen (mit Server)</button>
        </div>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 8 }}>Historie &amp; Dokumentation</div>
          {log.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Noch keine Einträge. Rückgaben aus Aufträgen erscheinen hier automatisch.</div>}
          <div className="stack" style={{ gap: 8 }}>
            {log.map((e) => { const t = TYP[e.typ] || TYP.notiz; return (
              <div key={e.id} style={{ display: 'flex', gap: 10, padding: '9px 11px', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 auto', fontSize: 10.5, fontWeight: 700, color: '#fff', background: t.c, borderRadius: 3, padding: '2px 6px', marginTop: 1 }}>{t.label}</span>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <div>{e.text}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{F.fmtDate(e.datum)}{e.stunden ? ' · ' + e.stunden : ''}{e.auftragId ? ' · ' + e.auftragId : ''}</div>
                </div>
                {e.typ !== 'rueckgabe' && <window.UI.IconBtn name="trash" size={14} title="Löschen" onClick={() => store.geraetProtokollDelete(g.id, e.id)} style={{ width: 28, height: 28 }} />}
              </div>
            ); })}
          </div>
        </div>
      </div>
    </window.UI.Modal>
  );
}

window.Screens.flotte = function Flotte({ nav, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [editing, setEditing] = flS(null);
  const [addNew, setAddNew] = flS(false);
  const [doku, setDoku] = flS(null);
  const [editPL, setEditPL] = flS(null);       // preisliste item being edited
  const [newPL, setNewPL] = flS(false);
  const [plDraft, setPlDraft] = flS({ geraet: '', einheit: '', preis: 0 });
  const [katMgr, setKatMgr] = flS(false);
  const today = store.today;
  const bookedToday = (gid) => store.db.termine.find((t) => { const gs = (Array.isArray(t.geraete) && t.geraete.length) ? t.geraete : [t]; return gs.some((g) => g.geraetId === gid && today >= g.von && today <= g.bis); });

  const save = (g) => { g.id ? store.updateGeraet(g.id, g) : store.addGeraet(g); toast('Gespeichert'); setEditing(null); setAddNew(false); };

  // Gruppen aus den konfigurierbaren Kategorien (Reihenfolge = Anzeige); Geräte ohne bekannte Kategorie hinten.
  const kategorien = (store.db.settings && store.db.settings.kategorien) || ['Maschine', 'Transport', 'Anbau'];
  const groups = kategorien.map((k) => ({ label: k, kats: [k] }));
  const known = new Set(kategorien);
  const ungrouped = (store.db.flotte || []).filter((g) => g.kat && !known.has(g.kat));
  if (ungrouped.length) groups.push({ label: 'Ohne Kategorie', kats: Array.from(new Set(ungrouped.map((g) => g.kat))) });

  const DevCard = ({ g }) => {
    const b = bookedToday(g.id);
    const bookable = window.istVermietbar(g);
    return (
      <window.UI.Card style={{ padding: 0, overflow: 'hidden' }}>
        {g.foto && <div style={{ height: 140, overflow: 'hidden' }}><img src={g.foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {!g.foto && <window.GeraetBadge geraet={g} size={44} />}
            {g.foto && <window.GeraetBadge geraet={g} size={32} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{g.detail}</div>
            </div>
            <button onClick={() => setEditing(g)} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'var(--yellow)', border: '1px solid var(--yellow-deep)', borderRadius: 'var(--r)', padding: '5px 10px', cursor: 'pointer' }}><Icon name="edit" size={14} /> Bearbeiten</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            {bookable && (b
              ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--warn)' }} /> heute vermietet</span>
              : <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--ok)' }} /> verfügbar</span>)}
            {!bookable && <span style={{ fontSize: 12, color: 'var(--muted)' }}>inklusive beim Bagger</span>}
            {g.betriebsstunden && <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {g.betriebsstunden}</span>}
            <button onClick={() => setDoku(g)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '5px 10px', cursor: 'pointer' }}>
              <Icon name="file" size={14} /> Logbuch{g.protokoll && g.protokoll.length ? ` (${g.protokoll.length})` : ''}
            </button>
          </div>
          {g.tarif && g.tarif.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--paper-3)', paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div className="kicker" style={{ color: 'var(--muted)' }}>Tarif</div>
                {bookable && g.modell && (F.ABRECHNUNG_MODELLE[g.modell]) && (
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-2)', background: 'var(--paper-3)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 7px' }}>{F.ABRECHNUNG_MODELLE[g.modell].label}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {g.tarif.map((r, i) => (
                  <div key={i} style={{ padding: '5px 10px', background: 'var(--paper-2)', borderRadius: 'var(--r)', border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.einheit}</div>
                    <div className="num" style={{ fontWeight: 700, fontSize: 14, marginTop: 1 }}>{r.preis === 0 ? 'inkl.' : F.fmtEUR(r.preis)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {g.zusatz && g.zusatz.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--paper-3)', paddingTop: 12 }}>
              <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 8 }}>Zusatzleistungen</div>
              <div className="stack" style={{ gap: 6 }}>
                {g.zusatz.map((z) => {
                  const namen = z.art === 'auswahl' && Array.isArray(z.geraetIds)
                    ? z.geraetIds.map((id) => (store.geraetById(id) || {}).name).filter(Boolean).join(', ') : '';
                  return (
                    <div key={z.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '7px 10px', background: 'var(--paper-2)', borderRadius: 'var(--r)', border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: '0 0 auto', width: 8, height: 8, borderRadius: 999, background: ART_FARBE[z.art] || 'var(--muted-2)' }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{z.label || F.ZUSATZ_ARTEN[z.art]?.label}</span>
                        <span className="num" style={{ flex: '0 0 auto', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{zusatzPreisText(z, F, true)}</span>
                      </div>
                      {namen && <div style={{ fontSize: 11, color: 'var(--muted-2)', paddingLeft: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{namen}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </window.UI.Card>
    );
  };

  return (
    <>
      <PageHeader kicker="Stammdaten" title="Flotte" mobile={mobile} onMenu={onMenu}>
        <window.UI.Btn variant="ghost" icon="kalender" onClick={() => nav('kalender')}>{mobile ? '' : 'Kalender'}</window.UI.Btn>
        <window.UI.Btn icon="plus" onClick={() => setAddNew(true)}>{mobile ? 'Gerät' : 'Neues Gerät'}</window.UI.Btn>
      </PageHeader>
      <div className="content-pad stack" style={{ gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -12 }}>
          <window.UI.Btn size="sm" variant="ghost" icon="settings" onClick={() => setKatMgr(true)}>Kategorien verwalten</window.UI.Btn>
        </div>
        {groups.map((grp) => {
          const items = store.db.flotte.filter((g) => grp.kats.includes(g.kat));
          if (!items.length) return null;
          return (
            <div key={grp.label}>
              <window.UI.Kicker style={{ marginBottom: 12 }}>{grp.label}</window.UI.Kicker>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                {items.map((g) => <DevCard key={g.id} g={g} />)}
              </div>
            </div>
          );
        })}

        {/* Servicepositionen — editierbar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <window.UI.Kicker>Sonstige Servicepositionen</window.UI.Kicker>
            <window.UI.Btn size="sm" variant="soft" icon="plus" onClick={() => { setPlDraft({ geraet: '', einheit: 'Pauschale', preis: 0 }); setNewPL(true); }}>Hinzufügen</window.UI.Btn>
          </div>
          <window.UI.Card style={{ padding: 0, overflow: 'hidden' }}>
            <table className="fr-table">
              <thead><tr><th>Leistung</th><th>Einheit</th><th style={{ textAlign: 'right' }}>Preis</th><th></th></tr></thead>
              <tbody>
                {store.db.preisliste.map((p) => editPL === p.id ? (
                  <tr key={p.id}>
                    <td><window.UI.Input value={plDraft.geraet} onChange={(e) => setPlDraft({ ...plDraft, geraet: e.target.value })} style={{ padding: '6px 8px', fontSize: 13 }} /></td>
                    <td><window.UI.Input value={plDraft.einheit} onChange={(e) => setPlDraft({ ...plDraft, einheit: e.target.value })} style={{ padding: '6px 8px', fontSize: 13 }} /></td>
                    <td><window.UI.Input type="number" value={plDraft.preis} onChange={(e) => setPlDraft({ ...plDraft, preis: Number(e.target.value) })} style={{ padding: '6px 8px', fontSize: 13, textAlign: 'right' }} /></td>
                    <td><div style={{ display: 'flex', gap: 5 }}>
                      <window.UI.Btn size="sm" icon="check" onClick={() => { store.updatePreisliste(p.id, plDraft); setEditPL(null); toast('Gespeichert'); }}>OK</window.UI.Btn>
                      <window.UI.IconBtn name="x" size={14} onClick={() => setEditPL(null)} style={{ width: 28, height: 28 }} />
                    </div></td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.geraet}</td>
                    <td style={{ color: 'var(--muted)' }}>{p.einheit}</td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{F.fmtEUR(p.preis)}</td>
                    <td><div className="row-actions">
                      <window.UI.IconBtn name="edit" size={15} title="Bearbeiten" style={{ width: 30, height: 30 }} onClick={() => { setPlDraft({ geraet: p.geraet, einheit: p.einheit, preis: p.preis }); setEditPL(p.id); }} />
                      <window.UI.IconBtn name="trash" size={15} title="Löschen" style={{ width: 30, height: 30 }} onClick={() => { store.deletePreisliste(p.id); toast('Gelöscht'); }} />
                    </div></td>
                  </tr>
                ))}
                {newPL && (
                  <tr>
                    <td><window.UI.Input value={plDraft.geraet} onChange={(e) => setPlDraft({ ...plDraft, geraet: e.target.value })} placeholder="Leistung" style={{ padding: '6px 8px', fontSize: 13 }} /></td>
                    <td><window.UI.Input value={plDraft.einheit} onChange={(e) => setPlDraft({ ...plDraft, einheit: e.target.value })} style={{ padding: '6px 8px', fontSize: 13 }} /></td>
                    <td><window.UI.Input type="number" value={plDraft.preis} onChange={(e) => setPlDraft({ ...plDraft, preis: Number(e.target.value) })} style={{ padding: '6px 8px', fontSize: 13, textAlign: 'right' }} /></td>
                    <td><div style={{ display: 'flex', gap: 5 }}>
                      <window.UI.Btn size="sm" icon="check" disabled={!plDraft.geraet} onClick={() => { store.addPreisliste(plDraft); setNewPL(false); setPlDraft({ geraet:'',einheit:'Pauschale',preis:0 }); toast('Hinzugefügt'); }}>OK</window.UI.Btn>
                      <window.UI.IconBtn name="x" size={14} onClick={() => setNewPL(false)} style={{ width: 28, height: 28 }} />
                    </div></td>
                  </tr>
                )}
              </tbody>
            </table>
          </window.UI.Card>
        </div>
      </div>

      {(editing || addNew) && (
        <GeraetModalForm init={editing || null} onSave={save} onClose={() => { setEditing(null); setAddNew(false); }} />
      )}
      {doku && <GeraetDokuModal geraet={store.geraetById(doku.id) || doku} store={store} onClose={() => setDoku(null)} />}
      {katMgr && <KategorienModal store={store} onClose={() => setKatMgr(false)} />}
    </>
  );
};

// ---- Kategorien verwalten (umbenennen / sortieren / hinzufügen / löschen) ----
function KategorienModal({ store, onClose }) {
  const toast = window.UI.useToast();
  const list = (store.db.settings && store.db.settings.kategorien) || [];
  const [neu, setNeu] = flS('');
  const count = (k) => (store.db.flotte || []).filter((g) => g.kat === k).length;
  const move = (i, dir) => { const j = i + dir; if (j < 0 || j >= list.length) return; const c = list.slice(); const t = c[i]; c[i] = c[j]; c[j] = t; store.setKategorien(c); };
  const rename = (alt) => { const neuN = window.prompt('Kategorie umbenennen:', alt); if (neuN && neuN.trim() && neuN.trim() !== alt) { store.renameKategorie(alt, neuN.trim()); toast('Kategorie umbenannt'); } };
  const del = (k) => { const n = count(k); if (window.confirm(n ? `„${k}" wird gelöscht. ${n} Gerät(e) wandern in die erste Kategorie.` : `Kategorie „${k}" löschen?`)) { store.deleteKategorie(k); toast('Kategorie gelöscht'); } };
  const add = () => { const n = (neu || '').trim(); if (!n) return; if (list.indexOf(n) >= 0) { toast('Gibt es schon'); return; } store.setKategorien([...list, n]); setNeu(''); };
  return (
    <window.UI.Modal open title="Kategorien verwalten" onClose={onClose} width={460}
      footer={<window.UI.Btn variant="ghost" onClick={onClose}>Fertig</window.UI.Btn>}>
      <div className="stack" style={{ gap: 10 }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Reihenfolge bestimmt die Gruppierung in der Flotte und im Geräte-Dropdown. Umbenennen wirkt auf alle Geräte der Kategorie.</div>
        {list.map((k, i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '8px 10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <window.UI.IconBtn name="chevronD" size={13} title="nach oben" disabled={i === 0} onClick={() => move(i, -1)} style={{ width: 26, height: 20, border: 'none', background: 'transparent', transform: 'rotate(180deg)' }} />
              <window.UI.IconBtn name="chevronD" size={13} title="nach unten" disabled={i === list.length - 1} onClick={() => move(i, 1)} style={{ width: 26, height: 20, border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{k}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{count(k)} Gerät{count(k) !== 1 ? 'e' : ''}</div>
            </div>
            <window.UI.IconBtn name="edit" size={14} title="Umbenennen" onClick={() => rename(k)} style={{ width: 32, height: 32 }} />
            <window.UI.IconBtn name="trash" size={14} title="Löschen" disabled={list.length <= 1} onClick={() => del(k)} style={{ width: 32, height: 32 }} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <window.UI.Input value={neu} onChange={(e) => setNeu(e.target.value)} placeholder="Neue Kategorie" onKeyDown={(e) => { if (e.key === 'Enter') add(); }} style={{ flex: 1 }} />
          <window.UI.Btn icon="plus" onClick={add}>Hinzufügen</window.UI.Btn>
        </div>
      </div>
    </window.UI.Modal>
  );
}
