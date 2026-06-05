/* ============ SCREEN: Buchhaltung / EÜR ============ */
window.Screens = window.Screens || {};
const { useState: buS, useMemo: buM } = React;

const KAT_E = ['Vermietung', 'Transport', 'Sonstige Einnahme'];
const KAT_A = ['Diesel/Betrieb', 'Wartung', 'Versicherung', 'Anschaffung', 'Werkzeug', 'Sonstige Ausgabe'];
const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function BuchungForm({ value, onChange }) {
  const set = (p) => onChange({ ...value, ...p });
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <window.UI.Btn variant={value.art === 'e' ? 'okghost' : 'soft'} onClick={() => set({ art: 'e', kategorie: KAT_E[0] })} style={{ flex: 1 }}>Einnahme</window.UI.Btn>
        <window.UI.Btn variant={value.art === 'a' ? 'danger' : 'soft'} onClick={() => set({ art: 'a', kategorie: KAT_A[0] })} style={{ flex: 1 }}>Ausgabe</window.UI.Btn>
      </div>
      <div className="form-2">
        <window.UI.Field label="Datum"><window.UI.Input type="date" value={value.datum} onChange={(e) => set({ datum: e.target.value })} /></window.UI.Field>
        <window.UI.Field label="Betrag (€)" required><window.UI.Input type="number" step="0.01" value={value.betrag} onChange={(e) => set({ betrag: e.target.value })} placeholder="0,00" /></window.UI.Field>
      </div>
      <window.UI.Field label="Kategorie">
        <window.UI.Select value={value.kategorie} onChange={(e) => set({ kategorie: e.target.value })}>
          {(value.art === 'e' ? KAT_E : KAT_A).map((c) => <option key={c}>{c}</option>)}
        </window.UI.Select>
      </window.UI.Field>
      <window.UI.Field label="Beschreibung" required><window.UI.Input value={value.text} onChange={(e) => set({ text: e.target.value })} placeholder="z. B. Diesel, R-2026-008 …" /></window.UI.Field>
    </div>
  );
}

window.Screens.buchhaltung = function Buchhaltung({ mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [add, setAdd] = buS(null);
  const [editB, setEditB] = buS(null);

  // ---- Filter-State ----
  const allJahre = buM(() => {
    const s = new Set(store.db.buchungen.map((b) => b.datum.slice(0, 4)));
    return [...s].sort().reverse();
  }, [store.db.buchungen]);
  const [filterJahr, setFilterJahr] = buS('');
  const [filterMonat, setFilterMonat] = buS('');
  const [filterVon, setFilterVon] = buS('');
  const [filterBis, setFilterBis] = buS('');
  const [filterArt, setFilterArt] = buS('');

  const alleRows = [...store.db.buchungen].sort((a, b) => b.datum.localeCompare(a.datum));
  const rows = buM(() => alleRows.filter((b) => {
    if (filterJahr && !b.datum.startsWith(filterJahr)) return false;
    if (filterMonat && b.datum.slice(5, 7) !== filterMonat) return false;
    if (filterVon && b.datum < filterVon) return false;
    if (filterBis && b.datum > filterBis) return false;
    if (filterArt && b.art !== filterArt) return false;
    return true;
  }), [alleRows, filterJahr, filterMonat, filterVon, filterBis, filterArt]);

  const einnahmen = rows.filter((b) => b.art === 'e').reduce((a, b) => a + b.betrag, 0);
  const ausgaben = rows.filter((b) => b.art === 'a').reduce((a, b) => a + b.betrag, 0);
  const saldo = einnahmen - ausgaben;
  const hatFilter = filterJahr || filterMonat || filterVon || filterBis || filterArt;

  // Monatssaldo
  const byMonth = buM(() => {
    const map = {};
    rows.forEach((b) => { const m = b.datum.slice(0, 7); (map[m] = map[m] || { e: 0, a: 0 }); map[m][b.art] += b.betrag; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);
  const maxMonth = Math.max(1, ...byMonth.map(([, v]) => Math.max(v.e, v.a)));

  const exportCSV = () => {
    const head = ['Datum', 'Art', 'Kategorie', 'Beschreibung', 'Einnahme', 'Ausgabe'];
    const lines = [head.join(';')];
    [...rows].reverse().forEach((b) => {
      const eur = (n) => n ? n.toFixed(2).replace('.', ',') : '';
      lines.push([F.fmtDate(b.datum), b.art === 'e' ? 'Einnahme' : 'Ausgabe', b.kategorie, '"' + b.text + '"', eur(b.art === 'e' ? b.betrag : 0), eur(b.art === 'a' ? b.betrag : 0)].join(';'));
    });
    lines.push(['', '', '', 'Summe', einnahmen.toFixed(2).replace('.', ','), ausgaben.toFixed(2).replace('.', ',')].join(';'));
    lines.push(['', '', '', 'Saldo', saldo.toFixed(2).replace('.', ','), ''].join(';'));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'EUER_Friesen_2026.csv'; a.click();
    toast('Excel/CSV exportiert');
  };

  const empty = (art) => ({ art, datum: store.today, kategorie: art === 'e' ? KAT_E[0] : KAT_A[0], text: '', betrag: '' });

  return (
    <>
      <PageHeader kicker="Einnahmen-Überschuss-Rechnung" title="Buchhaltung" mobile={mobile} onMenu={onMenu}>
        <window.UI.Btn variant="ghost" icon="download" onClick={exportCSV}>{mobile ? 'Excel' : 'Excel-Export'}</window.UI.Btn>
        <window.UI.Btn icon="plus" onClick={() => setAdd(empty('e'))}>{mobile ? 'Neu' : 'Buchung'}</window.UI.Btn>
      </PageHeader>

      <div className="content-pad stack" style={{ gap: 18 }}>
        <div className="dash-strip" style={{ gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: 16, display: 'grid' }}>
          {[
            { k: 'Einnahmen', v: einnahmen, c: 'var(--ok)' },
            { k: 'Ausgaben', v: ausgaben, c: 'var(--danger)' },
            { k: hatFilter ? 'Saldo (gefiltert)' : 'Saldo ' + (filterJahr || '2026'), v: saldo, c: saldo >= 0 ? 'var(--ink)' : 'var(--danger)', accent: true },
          ].map((s) => (
            <window.UI.Card key={s.k} style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
              <div className="kicker" style={{ color: 'var(--muted)' }}>{s.k}</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 600, marginTop: 8, color: s.c }}>{F.fmtEUR(s.v)}</div>
              {s.accent && <div className="hazard-thin" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 }} />}
            </window.UI.Card>
          ))}
        </div>

        {/* Filter-Leiste */}
        <window.UI.Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 4 }}>Jahr</div>
              <window.UI.Select value={filterJahr} onChange={(e) => setFilterJahr(e.target.value)} style={{ minWidth: 90 }}>
                <option value="">Alle</option>
                {allJahre.map((j) => <option key={j} value={j}>{j}</option>)}
              </window.UI.Select>
            </div>
            <div>
              <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 4 }}>Monat</div>
              <window.UI.Select value={filterMonat} onChange={(e) => setFilterMonat(e.target.value)} style={{ minWidth: 100 }}>
                <option value="">Alle</option>
                {MONATE.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
              </window.UI.Select>
            </div>
            <div>
              <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 4 }}>Von</div>
              <window.UI.Input type="date" value={filterVon} onChange={(e) => setFilterVon(e.target.value)} style={{ minWidth: 130 }} />
            </div>
            <div>
              <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 4 }}>Bis</div>
              <window.UI.Input type="date" value={filterBis} onChange={(e) => setFilterBis(e.target.value)} style={{ minWidth: 130 }} />
            </div>
            <div>
              <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 4 }}>Art</div>
              <window.UI.Select value={filterArt} onChange={(e) => setFilterArt(e.target.value)} style={{ minWidth: 110 }}>
                <option value="">Alle</option>
                <option value="e">Einnahmen</option>
                <option value="a">Ausgaben</option>
              </window.UI.Select>
            </div>
            {hatFilter && (
              <window.UI.Btn variant="ghost" size="sm" onClick={() => { setFilterJahr(''); setFilterMonat(''); setFilterVon(''); setFilterBis(''); setFilterArt(''); }}>
                Filter zurücksetzen
              </window.UI.Btn>
            )}
            <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)', alignSelf: 'center' }}>
              {rows.length} Buchung{rows.length !== 1 ? 'en' : ''}{hatFilter ? ' (gefiltert)' : ''}
            </div>
          </div>
        </window.UI.Card>

        <div className="split-2" style={{ gridTemplateColumns: mobile ? '1fr' : '1.6fr 1fr' }}>
          {/* Buchungen */}
          <window.UI.Card style={{ padding: 0, overflow: 'hidden' }} className="scroll-x">
            <div style={{ display: 'flex', gap: 8, padding: 14, borderBottom: '1.5px solid var(--line)' }}>
              <window.UI.Btn variant="okghost" size="sm" icon="arrowDown" onClick={() => setAdd(empty('e'))}>Einnahme</window.UI.Btn>
              <window.UI.Btn variant="danger" size="sm" icon="arrowUp" onClick={() => setAdd(empty('a'))}>Ausgabe</window.UI.Btn>
            </div>
            <table className="fr-table">
              <thead><tr><th>Datum</th><th>Kategorie</th><th className="hide-sm">Beschreibung</th><th style={{ textAlign: 'right' }}>Betrag</th><th></th></tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td className="num" style={{ color: 'var(--muted)' }}>{F.fmtDate(b.datum)}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: b.art === 'e' ? 'var(--ok)' : 'var(--danger)' }} /><span style={{ fontWeight: 600 }}>{b.kategorie}</span></div><div className="show-sm" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{b.text}</div></td>
                    <td className="hide-sm" style={{ color: 'var(--muted)' }}>{b.text}</td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600, color: b.art === 'e' ? 'var(--ok)' : 'var(--danger)' }}>{b.art === 'e' ? '+' : '−'}{F.fmtEUR(b.betrag)}</td>
                    <td onClick={(e)=>e.stopPropagation()}><div className="row-actions"><window.UI.IconBtn name="edit" size={15} title="Bearbeiten" style={{ width: 30, height: 30 }} onClick={() => setEditB({...b})} /><window.UI.IconBtn name="trash" size={15} title="Löschen" style={{ width: 30, height: 30 }} onClick={() => { const snap = store.snapshot(); store.deleteBuchung(b.id); toast('Buchung gelöscht', { undo: () => store.restoreSnapshot(snap) }); }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </window.UI.Card>

          {/* Monatssaldo */}
          <window.UI.Card style={{ padding: 18 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Monatssaldo</h2>
            <div className="stack" style={{ gap: 16 }}>
              {byMonth.map(([m, v]) => {
                const mi = parseInt(m.slice(5), 10) - 1;
                return (
                  <div key={m}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6, gap: 8 }}>
                      <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{MONATE[mi]} 2026</span>
                      <span className="num" style={{ fontWeight: 600, whiteSpace: 'nowrap', color: v.e - v.a >= 0 ? 'var(--ok)' : 'var(--danger)' }}>{F.fmtEUR(v.e - v.a)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, height: 8 }}>
                      <div style={{ flex: v.e, background: 'var(--ok)', borderRadius: 2, minWidth: v.e ? 4 : 0 }} title={'Einnahmen ' + F.fmtEUR(v.e)} />
                      <div style={{ flex: v.a, background: 'var(--danger)', borderRadius: 2, minWidth: v.a ? 4 : 0 }} title={'Ausgaben ' + F.fmtEUR(v.a)} />
                      <div style={{ flex: Math.max(0, maxMonth - Math.max(v.e, v.a)) }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, background: 'var(--ok)', borderRadius: 2 }} /> Einnahmen</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, background: 'var(--danger)', borderRadius: 2 }} /> Ausgaben</span>
            </div>
          </window.UI.Card>
        </div>
      </div>

      <window.UI.Modal open={!!add} onClose={() => setAdd(null)} title={add && add.art === 'e' ? 'Einnahme buchen' : 'Ausgabe buchen'} width={460}
        footer={<><window.UI.Btn variant="ghost" onClick={() => setAdd(null)}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" disabled={!(add && add.text && Number(add.betrag) > 0)} onClick={() => { store.addBuchung({ ...add, betrag: Number(add.betrag) }); toast('Buchung gespeichert'); setAdd(null); }}>Speichern</window.UI.Btn></>}>
        {add && <BuchungForm value={add} onChange={setAdd} />}
      </window.UI.Modal>

      <window.UI.Modal open={!!editB} onClose={() => setEditB(null)} title="Buchung bearbeiten" width={460}
        footer={<><window.UI.Btn variant="ghost" onClick={() => setEditB(null)}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" disabled={!(editB && editB.text && Number(editB.betrag) > 0)} onClick={() => { store.updateBuchung(editB.id, { ...editB, betrag: Number(editB.betrag) }); toast('Gespeichert'); setEditB(null); }}>Speichern</window.UI.Btn></>}>
        {editB && <BuchungForm value={editB} onChange={setEditB} />}
      </window.UI.Modal>
    </>
  );
};
