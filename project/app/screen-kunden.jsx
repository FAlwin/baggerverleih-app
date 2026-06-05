/* ============ SCREEN: Kundenverwaltung ============ */
window.Screens = window.Screens || {};
const { useState: cuS } = React;

function KundeForm({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="form-2">
        <window.UI.Field label="Name / Firma" required><window.UI.Input value={value.name} onChange={(e) => set({ name: e.target.value })} /></window.UI.Field>
        <window.UI.Field label="Typ">
          <window.UI.Select value={value.typ} onChange={(e) => set({ typ: e.target.value })}><option>Gewerbe</option><option>Privat</option></window.UI.Select>
        </window.UI.Field>
      </div>
      <window.UI.Field label="Ansprechpartner"><window.UI.Input value={value.kontakt} onChange={(e) => set({ kontakt: e.target.value })} /></window.UI.Field>
      <window.UI.Field label="Straße & Nr."><window.UI.Input value={value.street} onChange={(e) => set({ street: e.target.value })} /></window.UI.Field>
      <window.UI.Field label="PLZ & Ort" required><window.UI.Input value={value.city} onChange={(e) => set({ city: e.target.value })} placeholder="53797 Lohmar" /></window.UI.Field>
      <div className="form-2">
        <window.UI.Field label="Telefon"><window.UI.Input value={value.phone} onChange={(e) => set({ phone: e.target.value })} /></window.UI.Field>
        <window.UI.Field label="E-Mail"><window.UI.Input value={value.email} onChange={(e) => set({ email: e.target.value })} /></window.UI.Field>
      </div>
    </div>
  );
}

window.Screens.kunden = function Kunden({ nav, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [add, setAdd] = cuS(null);
  const [q, setQ] = cuS('');

  const empty = { name: '', kontakt: '', street: '', city: '', phone: '', email: '', typ: 'Gewerbe' };
  let list = store.db.kunden;
  if (q) { const ql = q.toLowerCase(); list = list.filter((k) => (k.name + k.city).toLowerCase().includes(ql)); }

  const stat = (id) => {
    const rs = store.db.rechnungen.filter((r) => r.kundeId === id);
    const offen = rs.filter((r) => r.status !== 'bezahlt').reduce((a, r) => a + r.betrag, 0);
    return { count: rs.length, offen };
  };

  return (
    <>
      <PageHeader kicker="Stammdaten" title="Kunden" mobile={mobile} onMenu={onMenu}>
        <window.UI.Btn icon="plus" onClick={() => setAdd(empty)}>{mobile ? 'Neu' : 'Neuer Kunde'}</window.UI.Btn>
      </PageHeader>
      <div className="content-pad stack" style={{ gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1.5px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', maxWidth: 320 }}>
          <Icon name="search" size={16} color="var(--muted)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kunde suchen …" style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: 13.5, flex: 1, background: 'transparent' }} />
        </div>
        <window.UI.Card style={{ padding: 0, overflow: 'hidden' }}>
          <table className="fr-table">
            <thead><tr><th>Name</th><th className="hide-sm">Ort</th><th className="hide-sm">Telefon</th><th>Typ</th><th style={{ textAlign: 'right' }}>Offen</th><th style={{ textAlign: 'right' }} className="hide-sm">Aufträge</th><th></th></tr></thead>
            <tbody>
              {list.map((k) => {
                const s = stat(k.id);
                return (
                  <tr key={k.id} style={{ cursor: 'pointer' }} onClick={() => nav('kunde', { id: k.id })}>
                    <td><div style={{ fontWeight: 600 }}>{k.name}</div>{k.kontakt && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{k.kontakt}</div>}</td>
                    <td className="hide-sm" style={{ color: 'var(--muted)' }}>{k.city}</td>
                    <td className="hide-sm" style={{ color: 'var(--muted)' }}>{k.phone}</td>
                    <td><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 2, background: k.typ === 'Gewerbe' ? 'var(--ink)' : 'var(--paper-3)', color: k.typ === 'Gewerbe' ? '#fff' : 'var(--muted)' }}>{k.typ}</span></td>
                    <td className="num" style={{ textAlign: 'right', color: s.offen ? 'var(--warn)' : 'var(--muted)', fontWeight: s.offen ? 600 : 400 }}>{s.offen ? F.fmtEUR(s.offen) : '—'}</td>
                    <td className="num hide-sm" style={{ textAlign: 'right', color: 'var(--muted)' }}>{s.count}</td>
                    <td><div className="row-actions"><window.UI.IconBtn name="chevron" size={16} title="Öffnen" style={{ width: 32, height: 32 }} onClick={() => nav('kunde', { id: k.id })} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <window.UI.Empty icon="kunden" title="Keine Kunden" sub={q ? 'Kein Treffer für "' + q + '".' : 'Noch keine Kunden angelegt.'} />}
        </window.UI.Card>
      </div>
      <window.UI.Modal open={!!add} onClose={() => setAdd(null)} title="Neuer Kunde" width={520}
        footer={<><window.UI.Btn variant="ghost" onClick={() => setAdd(null)}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" disabled={!(add && add.name && add.city)} onClick={() => { const id = store.addKunde(add); toast('Kunde angelegt'); setAdd(null); nav('kunde', { id }); }}>Speichern</window.UI.Btn></>}>
        {add && <KundeForm value={add} onChange={setAdd} />}
      </window.UI.Modal>
    </>
  );
};

window.Screens.kunde = function KundeDetail({ nav, params, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const k = store.kundeById(params.id);
  const [edit, setEdit] = cuS(null);
  if (!k) return <><PageHeader title="Kunde" mobile={mobile} onMenu={onMenu} /><div className="content-pad">Nicht gefunden.</div></>;

  const rs = store.db.rechnungen.filter((r) => r.kundeId === k.id).sort((a, b) => b.datum.localeCompare(a.datum));
  const ag = store.db.angebote.filter((a) => a.kundeId === k.id);
  const tm = store.db.termine.filter((t) => t.kundeId === k.id);
  const umsatz = rs.reduce((a, r) => a + r.betrag, 0);
  const offen = rs.filter((r) => r.status !== 'bezahlt').reduce((a, r) => a + r.betrag, 0);

  const Info = ({ icon, children }) => <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}><Icon name={icon} size={16} color="var(--muted)" />{children}</div>;

  return (
    <>
      <PageHeader kicker="Kunde" title={k.name} mobile={mobile} onMenu={onMenu}>
        <window.UI.Btn variant="ghost" icon="edit" onClick={() => setEdit({ ...k })}>{mobile ? '' : 'Bearbeiten'}</window.UI.Btn>
        <window.UI.Btn icon="plus" onClick={() => nav('rechnung-neu', { kundeId: k.id })}>{mobile ? 'Rechnung' : 'Neue Rechnung'}</window.UI.Btn>
      </PageHeader>

      <div className="content-pad" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '300px 1fr', gap: 20, alignItems: 'start' }}>
        <div className="stack" style={{ gap: 16 }}>
          <window.UI.Card style={{ padding: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 2, background: k.typ === 'Gewerbe' ? 'var(--ink)' : 'var(--paper-3)', color: k.typ === 'Gewerbe' ? '#fff' : 'var(--muted)' }}>{k.typ}</span>
            <div className="stack" style={{ gap: 10, marginTop: 14 }}>
              {k.kontakt && <Info icon="kunden">{k.kontakt}</Info>}
              <Info icon="pin"><span>{k.street}<br />{k.city}</span></Info>
              {k.phone && <Info icon="phone">{k.phone}</Info>}
              {k.email && <Info icon="rechnung">{k.email}</Info>}
            </div>
          </window.UI.Card>
          <window.UI.Card style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span className="kicker" style={{ color: 'var(--muted)' }}>Umsatz gesamt</span></div>
            <div className="num" style={{ fontSize: 26, fontWeight: 600 }}>{F.fmtEUR(umsatz)}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 14, borderTop: '1px solid var(--paper-3)', paddingTop: 12 }}>
              <div><div className="num" style={{ fontWeight: 700, color: offen ? 'var(--warn)' : 'var(--ink)' }}>{F.fmtEUR(offen)}</div><div className="kicker" style={{ color: 'var(--muted)', fontSize: 9 }}>Offen</div></div>
              <div><div className="num" style={{ fontWeight: 700 }}>{rs.length}</div><div className="kicker" style={{ color: 'var(--muted)', fontSize: 9 }}>Rechnungen</div></div>
              <div><div className="num" style={{ fontWeight: 700 }}>{tm.length}</div><div className="kicker" style={{ color: 'var(--muted)', fontSize: 9 }}>Termine</div></div>
            </div>
          </window.UI.Card>
        </div>

        <window.UI.Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '15px 18px', borderBottom: '1.5px solid var(--line)', fontWeight: 700, fontSize: 15 }}>Auftragshistorie</div>
          {rs.length === 0 && ag.length === 0 && <window.UI.Empty icon="rechnung" title="Noch keine Aufträge" />}
          <div className="scroll-x">
            {(rs.length > 0 || ag.length > 0) && (
              <table className="fr-table">
                <tbody>
                  {ag.map((a) => (
                    <tr key={a.id} onClick={() => nav('angebote')} style={{ cursor: 'pointer' }}>
                      <td className="num" style={{ fontWeight: 600 }}>{a.id}</td>
                      <td style={{ color: 'var(--muted)' }}>Angebot · {F.fmtDate(a.datum)}</td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{F.fmtEUR(a.betrag)}</td>
                      <td><window.Pill status={a.status === 'offen' && a.gueltigBis < store.today ? 'abgelaufen' : a.status} /></td>
                    </tr>
                  ))}
                  {rs.map((r) => (
                    <tr key={r.id} onClick={() => nav('rechnung', { id: r.id })} style={{ cursor: 'pointer' }}>
                      <td className="num" style={{ fontWeight: 600 }}>{r.id}</td>
                      <td style={{ color: 'var(--muted)' }}>Rechnung · {F.fmtDate(r.datum)}</td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{F.fmtEUR(r.betrag)}</td>
                      <td><window.Pill status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </window.UI.Card>
      </div>

      <window.UI.Modal open={!!edit} onClose={() => setEdit(null)} title="Kunde bearbeiten" width={520}
        footer={<><window.UI.Btn variant="ghost" onClick={() => setEdit(null)}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" onClick={() => { store.updateKunde(k.id, edit); toast('Gespeichert'); setEdit(null); }}>Speichern</window.UI.Btn></>}>
        {edit && <KundeForm value={edit} onChange={setEdit} />}
      </window.UI.Modal>
    </>
  );
};
