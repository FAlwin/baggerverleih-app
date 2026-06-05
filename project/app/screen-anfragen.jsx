/* ============ SCREEN: Anfragen-Inbox ============ */
window.Screens = window.Screens || {};
const { useState: anfS } = React;

const ANF_STATUS = {
  neu:              { label: 'Neu',            cls: 'danger' },
  'in-bearbeitung': { label: 'In Bearbeitung', cls: 'warn' },
  erledigt:         { label: 'Erledigt',       cls: 'ok' },
};

window.Screens.anfragen = function Anfragen({ nav, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [filter, setFilter] = anfS('alle');
  const [detail, setDetail] = anfS(null);
  const [neuOpen, setNeuOpen] = anfS(false);
  const LEER_ANF = { name: '', phone: '', email: '', geraetId: 'bagger', von: '', bis: '', ort: '', nachricht: '' };
  const [neuForm, setNeuForm] = anfS(LEER_ANF);

  const saveNeu = () => {
    if (!neuForm.name.trim()) { alert('Bitte einen Namen angeben.'); return; }
    store.addAnfrage({ ...neuForm, name: neuForm.name.trim() });
    toast('Anfrage gespeichert');
    setNeuForm(LEER_ANF);
    setNeuOpen(false);
  };

  const all = store.anfragen || [];
  const rows = all
    .filter((a) => filter === 'alle' || a.status === filter)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  const counts = {
    alle: all.length,
    neu: all.filter((a) => a.status === 'neu').length,
    'in-bearbeitung': all.filter((a) => a.status === 'in-bearbeitung').length,
    erledigt: all.filter((a) => a.status === 'erledigt').length,
  };

  const createAngebot = (a) => {
    const match = store.db.kunden.find((k) =>
      (a.phone && k.phone && k.phone.replace(/\s/g, '') === a.phone.replace(/\s/g, '')) ||
      (a.email && k.email && k.email.toLowerCase() === a.email.toLowerCase()) ||
      (a.name && k.name.toLowerCase() === a.name.toLowerCase())
    );
    store.setAnfrageStatus(a.id, 'in-bearbeitung');
    nav('rechnung-neu', {
      mode: 'angebot', kundeId: match?.id || '', anfrageId: a.id,
      prefill: { name: a.name, phone: a.phone, email: a.email, geraetId: a.geraetId, von: a.von, bis: a.bis, ort: a.ort, nachricht: a.nachricht },
    });
    setDetail(null);
  };

  // ---- Filter-Tab-Bar (horizontal scrollbar on mobile) ----
  const FilterBar = () => (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', marginBottom: 2 }}>
      <div style={{ display: 'flex', gap: 7, paddingBottom: 2, minWidth: 'max-content' }}>
        {[['alle', 'Alle'], ['neu', 'Neu'], ['in-bearbeitung', 'In Bearbeitung'], ['erledigt', 'Erledigt']].map(([id, label]) => {
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
            <window.Pill status={a.status === 'in-bearbeitung' ? 'ueberfaellig' : a.status === 'neu' ? 'offen' : 'bezahlt'} label={st.label} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{g?.name}</div>
          {(a.von || a.ort) && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {a.von && <span>📅 {F.fmtDate(a.von)}{a.bis && a.bis !== a.von ? ' – ' + F.fmtDate(a.bis) : ''}</span>}
              {a.ort && <span>📍 {a.ort}</span>}
            </div>
          )}
          {a.status === 'neu' && (
            <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
              <window.UI.Btn size="sm" icon="angebot" onClick={(e) => { e.stopPropagation(); createAngebot(a); }}>Angebot</window.UI.Btn>
              <window.UI.Btn size="sm" variant="okghost" icon="check" onClick={(e) => { e.stopPropagation(); store.setAnfrageStatus(a.id, 'erledigt'); toast('Erledigt'); }}>Erledigt</window.UI.Btn>
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
        <window.UI.Btn icon="plus" onClick={() => setNeuOpen(true)}>{mobile ? 'Neu' : 'Neue Anfrage'}</window.UI.Btn>
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
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{g?.name || a.geraetId}</span>
                          </div>
                        </td>
                        <td className="num hide-sm" style={{ color: 'var(--muted)' }}>{a.von ? F.fmtDate(a.von) : '—'}{a.bis && a.bis !== a.von ? ' – ' + F.fmtDate(a.bis) : ''}</td>
                        <td><window.Pill status={a.status === 'in-bearbeitung' ? 'ueberfaellig' : a.status === 'neu' ? 'offen' : 'bezahlt'} label={st.label} /></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions" style={{ opacity: 1 }}>
                            {a.status !== 'erledigt' && <window.UI.Btn size="sm" icon="angebot" onClick={() => createAngebot(a)}>Angebot</window.UI.Btn>}
                            {a.status !== 'erledigt' && <window.UI.IconBtn name="check" size={15} title="Erledigt" style={{ width: 32, height: 32 }} onClick={() => { store.setAnfrageStatus(a.id, 'erledigt'); toast('Als erledigt markiert'); }} />}
                            <window.UI.IconBtn name="trash" size={15} title="Löschen" style={{ width: 32, height: 32 }} onClick={() => { store.deleteAnfrage(a.id); toast('Anfrage gelöscht'); }} />
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
            <window.UI.Field label="Telefon"><window.UI.Input type="tel" value={neuForm.phone} onChange={(e) => setNeuForm({ ...neuForm, phone: e.target.value })} placeholder="0172 …" /></window.UI.Field>
          </div>
          <window.UI.Field label="E-Mail"><window.UI.Input type="email" value={neuForm.email} onChange={(e) => setNeuForm({ ...neuForm, email: e.target.value })} placeholder="name@beispiel.de" /></window.UI.Field>
          <window.UI.Field label="Gewünschtes Gerät">
            <window.UI.Select value={neuForm.geraetId} onChange={(e) => setNeuForm({ ...neuForm, geraetId: e.target.value })}>
              {store.db.flotte.filter((g) => g.kat === 'Maschine' || g.kat === 'Transport').map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </window.UI.Select>
          </window.UI.Field>
          <div className="form-2">
            <window.UI.Field label="Von (Datum)"><window.UI.Input type="date" value={neuForm.von} onChange={(e) => setNeuForm({ ...neuForm, von: e.target.value })} /></window.UI.Field>
            <window.UI.Field label="Bis (Datum)"><window.UI.Input type="date" value={neuForm.bis} onChange={(e) => setNeuForm({ ...neuForm, bis: e.target.value })} /></window.UI.Field>
          </div>
          <window.UI.Field label="Einsatzort"><window.UI.Input value={neuForm.ort} onChange={(e) => setNeuForm({ ...neuForm, ort: e.target.value })} placeholder="z. B. Baustelle Siegburg" /></window.UI.Field>
          <window.UI.Field label="Nachricht / Notiz">
            <window.UI.Textarea value={neuForm.nachricht} onChange={(e) => setNeuForm({ ...neuForm, nachricht: e.target.value })} placeholder="Was ist geplant?" rows={3} />
          </window.UI.Field>
        </div>
      </window.UI.Modal>

      {/* Detail-Modal */}
      <window.UI.Modal open={!!detail} onClose={() => setDetail(null)} title="Anfrage" width={480}
        footer={detail && <>
          {detail.status !== 'erledigt' && <window.UI.Btn icon="angebot" onClick={() => createAngebot(detail)}>Angebot erstellen</window.UI.Btn>}
          {detail.status !== 'erledigt' && <window.UI.Btn variant="okghost" icon="check" onClick={() => { store.setAnfrageStatus(detail.id, 'erledigt'); toast('Erledigt'); setDetail(null); }}>Erledigt</window.UI.Btn>}
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
                {g && <div><b>Gerät:</b> {g.name}</div>}
                <div><b>Zeitraum:</b> {detail.von ? F.fmtDate(detail.von) : '—'}{detail.bis && detail.bis !== detail.von ? ' – ' + F.fmtDate(detail.bis) : ''}</div>
                {detail.ort && <div><b>Einsatzort:</b> {detail.ort}</div>}
                {detail.nachricht && <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 2 }}>{detail.nachricht}</div>}
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
    </>
  );
};
