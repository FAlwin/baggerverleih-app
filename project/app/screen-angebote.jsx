/* ============ SCREEN: Angebote — Versenden + Status + Reservierung ============ */
window.Screens = window.Screens || {};
const { useState: agS, useMemo: agM } = React;

// ---- Versenden-Modal (generisch: Angebot / Rechnung / Mietvertrag) ----
function VersendModal({ kind = 'angebot', beleg, angebot, kunde, company, fmtEUR, fmtDate, onSend, onClose }) {
  const F = window.FRIESEN;
  const tel = (s) => s ? s.replace(/[^0-9]/g, '').replace(/^0/, '49') : '';
  const b = beleg || angebot; // Abwärtskompatibel: alter Aufruf mit angebot=
  const LABEL = { angebot: 'Angebot', rechnung: 'Rechnung', mietvertrag: 'Mietvertrag' }[kind] || 'Beleg';

  const kopf = kind === 'rechnung'
    ? `hiermit erhalten Sie unsere Rechnung ${b.id} vom ${fmtDate(b.datum)}.`
    : kind === 'mietvertrag'
      ? `anbei der Mietvertrag zu Ihrer Anmietung (${b.id}).`
      : `hiermit erhalten Sie unser Angebot ${b.id} vom ${fmtDate(b.datum)}.`;
  const fuss = kind === 'rechnung'
    ? `Bitte überweisen Sie den Gesamtbetrag bis zum ${fmtDate(b.faellig)} unter Angabe der Rechnungsnummer ${b.id}.`
    : kind === 'mietvertrag'
      ? `Bitte bringen Sie den unterschriebenen Mietvertrag zur Geräteübergabe mit, oder antworten Sie auf diese Nachricht.`
      : `Bei Fragen oder zur Auftragsbestätigung antworten Sie einfach auf diese Nachricht oder rufen Sie uns an:`;

  const msgText = [
    `Hallo ${kunde.name},`,
    ``,
    kopf,
    ``,
    `Leistungen:`,
    ...(b.positionen || []).map((p) => `  • ${p.text} (${p.menge}× ${p.einheit}) — ${fmtEUR(p.menge * p.preis)}`),
    ``,
    `Gesamtbetrag: ${fmtEUR(b.betrag != null ? b.betrag : (b.positionen || []).reduce((a, p) => a + p.menge * p.preis, 0))}`,
    ...(kind === 'angebot' ? [`Gültig bis: ${fmtDate(b.gueltigBis)}`] : []),
    ...(kind === 'rechnung' ? [`Fällig bis: ${fmtDate(b.faellig)}`] : []),
    ``,
    `Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.`,
    ``,
    fuss,
    `${company.phone}`,
    ``,
    `Das Dokument als PDF hängen Sie bitte aus der App an (Button „PDF herunterladen").`,
    ``,
    `Mit freundlichen Grüßen`,
    `${company.owner} · ${company.name}`,
  ].join('\n');

  const subject = encodeURIComponent(`${LABEL} ${b.id} – ${company.name}`);
  const body = encodeURIComponent(msgText);
  const waMsg = encodeURIComponent(msgText);
  const waNum = tel(company.phone);

  const channels = [
    {
      label: 'E-Mail',
      color: '#2B6CB0', textColor: '#fff',
      icon: 'rechnung',
      href: `mailto:${kunde.email || ''}?subject=${subject}&body=${body}`,
      note: kunde.email ? kunde.email : '(keine E-Mail hinterlegt)',
    },
    {
      label: 'WhatsApp',
      color: '#25D366', textColor: '#fff',
      icon: 'phone',
      href: `https://wa.me/${tel(kunde.phone)}?text=${waMsg}`,
      note: kunde.phone || '(keine Telefonnummer)',
    },
    {
      label: 'SMS / iMessage',
      color: '#48BB78', textColor: '#fff',
      icon: 'phone',
      href: `sms:${kunde.phone || ''}?body=${encodeURIComponent(msgText)}`,
      note: kunde.phone || '(keine Telefonnummer)',
    },
  ];

  return (
    <window.UI.Modal open title={`${LABEL} ${b.id} versenden`} onClose={onClose} width={520}
      footer={<><window.UI.Btn variant="ghost" onClick={onClose}>Schließen</window.UI.Btn></>}>
      <div className="stack" style={{ gap: 16 }}>
        {/* Message preview */}
        <div style={{ background: 'var(--paper-2)', borderRadius: 'var(--r)', padding: '12px 14px', maxHeight: 180, overflow: 'auto' }}>
          <pre style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'pre-wrap', margin: 0 }}>{msgText}</pre>
        </div>

        <div className="kicker" style={{ color: 'var(--muted)' }}>Kanal wählen — Nachricht wird vorausgefüllt</div>

        <div className="stack" style={{ gap: 10 }}>
          {channels.map((ch) => (
            <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer"
              onClick={() => onSend(ch.label)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: ch.color, color: ch.textColor, borderRadius: 'var(--r)', textDecoration: 'none', fontFamily: 'var(--sans)', cursor: 'pointer' }}>
              <Icon name={ch.icon} size={20} color={ch.textColor} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{ch.label}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{ch.note}</div>
              </div>
              <Icon name="arrowRight" size={18} color={ch.textColor} />
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', background: 'var(--yellow-wash)', borderRadius: 'var(--r)', fontSize: 12.5 }}>
          <Icon name="alert" size={16} color="var(--warn)" style={{ flex: '0 0 auto', marginTop: 1 }} />
          <span>{kind === 'angebot'
            ? <>Nach dem Versenden wird das Angebot als <b>Versendet</b> markiert und der Zeitraum im Kalender als Reservierung eingetragen.</>
            : <>Die Nachricht wird vorausgefüllt geöffnet. Das <b>{LABEL}-PDF</b> bitte zuvor herunterladen und manuell anhängen.</>}</span>
        </div>
      </div>
    </window.UI.Modal>
  );
}

// ---- Bearbeiten/Verlängern-Modal ----
function EditAngebotModal({ angebot, onSave, onClose }) {
  const F = window.FRIESEN;
  const [draft, setDraft] = agS({
    gueltigBis: angebot.gueltigBis,
    von: angebot.von || '',
    bis: angebot.bis || '',
    ort: angebot.ort || '',
  });
  const isAbgelaufen = angebot.gueltigBis < window.FRIESEN.APP_TODAY;
  return (
    <window.UI.Modal open title={`Angebot ${angebot.id} bearbeiten`} onClose={onClose} width={460}
      footer={<>
        <window.UI.Btn variant="ghost" onClick={onClose}>Abbrechen</window.UI.Btn>
        <window.UI.Btn icon="check" onClick={() => onSave(draft)}>Speichern</window.UI.Btn>
      </>}>
      <div className="stack" style={{ gap: 14 }}>
        {isAbgelaufen && (
          <div style={{ display:'flex', gap:9, padding:'11px 13px', background:'var(--yellow-wash)', borderRadius:'var(--r)', fontSize:13, fontWeight:500 }}>
            <Icon name="alert" size={17} color="var(--warn)" style={{ flex:'0 0 auto', marginTop:1 }} />
            Angebot abgelaufen — neues Gültig-bis-Datum setzen, um es wieder zu aktivieren.
          </div>
        )}
        <window.UI.Field label="Gültig bis" required>
          <window.UI.Input type="date" value={draft.gueltigBis} onChange={(e) => setDraft({ ...draft, gueltigBis: e.target.value })} />
        </window.UI.Field>
        <div className="kicker" style={{ color:'var(--muted)', marginBottom:-6 }}>Wunsch-Zeitraum (Kalender-Reservierung)</div>
        <div className="form-2">
          <window.UI.Field label="Von"><window.UI.Input type="date" value={draft.von} onChange={(e) => setDraft({ ...draft, von: e.target.value })} /></window.UI.Field>
          <window.UI.Field label="Bis"><window.UI.Input type="date" value={draft.bis} onChange={(e) => setDraft({ ...draft, bis: e.target.value })} /></window.UI.Field>
        </div>
        <window.UI.Field label="Einsatzort">
          <window.UI.Input value={draft.ort} onChange={(e) => setDraft({ ...draft, ort: e.target.value })} placeholder="z. B. Baustelle Siegburg" />
        </window.UI.Field>
      </div>
    </window.UI.Modal>
  );
}

// Geteilte Bausteine, damit der Auftrag (Schaltzentrale) dieselben Modale nutzt
window.VersendModal = VersendModal;
window.EditAngebotModal = EditAngebotModal;
// Angebot als „versendet" markieren + Kalender-Reservierung anlegen (Workflow-Aktion)
window.angebotVersenden = function angebotVersenden(store, angebot) {
  store.setAngebotStatus(angebot.id, 'versendet');
  if (angebot.von && angebot.geraetId) {
    const c = store.findConflict(angebot.geraetId, angebot.von, angebot.bis || angebot.von);
    if (!c) {
      store.addTermin({
        id: 'res_' + angebot.id, geraetId: angebot.geraetId, kundeId: angebot.kundeId,
        von: angebot.von, bis: angebot.bis || angebot.von,
        vonZeit: angebot.vonZeit || '08:00', bisZeit: angebot.bisZeit || '17:00',
        ort: angebot.ort || '', quellTyp: 'reservierung', quellId: angebot.id,
      });
    }
  }
};

// ---- Main Screen (reine Übersicht: ansehen, bearbeiten, drucken, zum Auftrag) ----
window.Screens.angebote = function Angebote({ nav, params, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [editId, setEditId] = agS(null);
  const [detailId, setDetailId] = agS(params.openId || null);
  const [filter, setFilter] = agS('aktiv');

  const handleEditSave = (id, patch) => {
    const wasAbgelaufen = store.db.angebote.find((a) => a.id === id)?.gueltigBis < store.today;
    store.updateAngebot(id, {
      ...patch,
      // Wenn abgelaufen und neues Datum in der Zukunft → Status auf 'offen' zurücksetzen
      ...(wasAbgelaufen && patch.gueltigBis >= store.today ? { status: 'offen' } : {}),
    });
    toast('Angebot aktualisiert');
    setEditId(null);
    // Detail-Modal wieder öffnen falls es von dort aus gestartet wurde
    if (detailId === id) setDetailId(id);
  };

  const effStatus = (a) => {
    if (a.status === 'angenommen' || a.status === 'versendet') return a.status;
    if (a.gueltigBis < store.today) return 'abgelaufen';
    return a.status;
  };
  const allAngebote = [...store.db.angebote].sort((a, b) => b.datum.localeCompare(a.datum));
  const AKTIV_ST = ['offen', 'versendet', 'angenommen'];
  const ERLEDIGT_ST = ['abgelaufen'];
  const angCounts = {
    aktiv: allAngebote.filter((a) => AKTIV_ST.includes(effStatus(a))).length,
    alle: allAngebote.length,
    erledigt: allAngebote.filter((a) => ERLEDIGT_ST.includes(effStatus(a))).length,
  };
  const rows = allAngebote.filter((a) => {
    const st = effStatus(a);
    if (filter === 'aktiv') return AKTIV_ST.includes(st);
    if (filter === 'erledigt') return ERLEDIGT_ST.includes(st);
    return true;
  });

  // Status-Pill mapping
  const pillFor = (st) => {
    const map = { offen: 'offen', versendet: 'ueberfaellig', angenommen: 'bezahlt', abgelaufen: 'abgelaufen' };
    return map[st] || st;
  };
  const statusLabel = (st) => ({ offen: 'Offen', versendet: 'Versendet', angenommen: 'Angenommen', abgelaufen: 'Abgelaufen' }[st] || st);

  return (
    <>
      <PageHeader kicker="Übersicht" title="Angebote" mobile={mobile} onMenu={onMenu} />

      <div className="content-pad stack" style={{ gap: 16 }}>
        {/* Filter-Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['aktiv','Zu erledigen'],['alle','Alle'],['erledigt','Erledigt']].map(([id, label]) => {
            const on = filter === id;
            return (
              <button key={id} onClick={() => setFilter(id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 'var(--r)', border: '1.5px solid ' + (on ? 'var(--ink)' : 'var(--line-2)'), background: on ? 'var(--ink)' : 'var(--paper)', color: on ? '#fff' : 'var(--ink)', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {label}
                <span className="mono" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: on ? 'rgba(255,255,255,.18)' : 'var(--paper-3)', color: on ? '#fff' : 'var(--muted)' }}>{angCounts[id]}</span>
              </button>
            );
          })}
        </div>

        <window.UI.Card style={{ padding: 0, overflow: 'hidden' }} className="scroll-x">
          {/* Mobile Karten */}
          {mobile ? (
            <div>
              {rows.map((a) => {
                const k = store.kundeById(a.kundeId);
                const st = effStatus(a);
                return (
                  <button key={a.id} onClick={() => setDetailId(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '14px 16px', border: 'none', borderBottom: '1px solid var(--paper-3)', background: 'transparent', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div><div style={{ fontWeight: 700, fontSize: 14 }}>{k?.name}</div><div className="num" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{a.id} · {F.fmtDate(a.datum)}</div></div>
                        <div style={{ textAlign: 'right', flex: '0 0 auto' }}><div className="num" style={{ fontWeight: 700, fontSize: 15 }}>{F.fmtEUR(a.betrag)}</div><div style={{ marginTop: 4 }}><window.Pill status={pillFor(st)} label={statusLabel(st)} /></div></div>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>Gültig bis {F.fmtDate(a.gueltigBis)}</div>
                    </div>
                    <Icon name="chevron" size={16} color="var(--muted-2)" style={{ flex: '0 0 auto' }} />
                  </button>
                );
              })}
              {rows.length === 0 && <window.UI.Empty icon="angebot" title="Keine Angebote" sub="Für diesen Filter gibt es keine Einträge." />}
            </div>
          ) : (
          <><table className="fr-table">
            <thead><tr>
              <th>Nr.</th><th>Kunde</th><th className="hide-sm">Datum</th><th>Gültig bis</th>
              <th style={{ textAlign: 'right' }}>Betrag</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map((a) => {
                const k = store.kundeById(a.kundeId);
                const st = effStatus(a);
                const ablauf = st === 'abgelaufen';
                return (
                  <tr key={a.id} onClick={() => setDetailId(a.id)} style={{ cursor: 'pointer' }}>
                    <td className="num" style={{ fontWeight: 600 }}>{a.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{k?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{k?.city}</div>
                    </td>
                    <td className="num hide-sm" style={{ color: 'var(--muted)' }}>{F.fmtDate(a.datum)}</td>
                    <td className="num" style={{ color: ablauf ? 'var(--danger)' : 'var(--muted)', fontWeight: ablauf ? 600 : 400 }}>{F.fmtDate(a.gueltigBis)}</td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{F.fmtEUR(a.betrag)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <window.Pill status={pillFor(st)} label={statusLabel(st)} />
                        {a.von && st === 'versendet' && (
                          <span style={{ fontSize: 10.5, color: 'var(--warn)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="kalender" size={11} color="var(--warn)" /> {F.fmtDate(a.von)}{a.bis && a.bis !== a.von ? '–' + F.fmtDate(a.bis) : ''} reserviert
                          </span>
                        )}
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <window.UI.Btn size="sm" variant="ghost" icon="arrowRight" onClick={() => a.auftragId ? nav('auftrag', { id: a.auftragId }) : setDetailId(a.id)}>Auftrag öffnen</window.UI.Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <window.UI.Empty icon="angebot" title="Keine Angebote" sub="Für diesen Filter gibt es keine Einträge." />}
          </>)}
        </window.UI.Card>


        <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><window.Pill status="offen" label="Offen" style={{ transform: 'scale(.85)' }} /> Noch nicht versendet</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><window.Pill status="ueberfaellig" label="Versendet" style={{ transform: 'scale(.85)' }} /> An Kunde übermittelt, Zeitraum reserviert</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><window.Pill status="bezahlt" label="Angenommen" style={{ transform: 'scale(.85)' }} /> Auftrag öffnen → Rechnung erstellen</span>
        </div>
      </div>

      {editId && (() => {
        const a = store.db.angebote.find((x) => x.id === editId);
        return a ? <EditAngebotModal angebot={a} onSave={(patch) => handleEditSave(editId, patch)} onClose={() => setEditId(null)} /> : null;
      })()}

      {detailId && (() => {
        const a = store.db.angebote.find((x) => x.id === detailId);
        if (!a) return null;
        const k = store.kundeById(a.kundeId);
        const st = effStatus(a);
        return (
          <window.UI.Modal open title={`Angebot ${a.id}`} onClose={() => setDetailId(null)} width={500}
            footer={<>
              <window.UI.Btn variant="ghost" icon="download" onClick={() => window.PDF.download(<window.Print.AngebotDoc angebot={a} kunde={k} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} />, 'Angebot_' + a.id)}>PDF herunterladen</window.UI.Btn>
              {a.auftragId && <window.UI.Btn variant="ghost" icon="arrowRight" onClick={() => { setDetailId(null); nav('auftrag', { id: a.auftragId }); }}>Auftrag öffnen</window.UI.Btn>}
              <window.UI.Btn variant="ghost" onClick={() => setDetailId(null)}>Schließen</window.UI.Btn>
            </>}>
            <div className="stack" style={{ gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <window.Pill status={pillFor(st)} label={statusLabel(st)} />
                <span className="num" style={{ fontWeight: 700, fontSize: 18 }}>{F.fmtEUR(a.betrag)}</span>
              </div>
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 7, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="kunden" size={15} />{k?.name}</div>
                <div style={{ color: 'var(--muted)' }}>Datum: <b style={{ color: 'var(--ink)' }}>{F.fmtDate(a.datum)}</b></div>
                <div style={{ color: 'var(--muted)' }}>Gültig bis: <b style={{ color: st === 'abgelaufen' ? 'var(--danger)' : 'var(--ink)' }}>{F.fmtDate(a.gueltigBis)}</b></div>
                {a.von && <div style={{ color: 'var(--muted)' }}>Zeitraum: <b style={{ color: 'var(--ink)' }}>{F.fmtDate(a.von)}{a.bis && a.bis !== a.von ? ' – ' + F.fmtDate(a.bis) : ''}</b></div>}
                {a.ort && <div style={{ color: 'var(--muted)' }}>Einsatzort: <b style={{ color: 'var(--ink)' }}>{a.ort}</b></div>}
              </div>
              {a.positionen?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 8 }}>Positionen</div>
                  {a.positionen.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--paper-3)' }}>
                      <span>{p.text} <span style={{ color: 'var(--muted)' }}>{p.menge}× {p.einheit}</span></span>
                      <span className="num" style={{ fontWeight: 600 }}>{F.fmtEUR(p.menge * p.preis)}</span>
                    </div>
                  ))}
                </div>
              )}
              {(st === 'offen' || st === 'versendet' || st === 'abgelaufen') && (
                <window.UI.Btn variant="ghost" icon="edit" onClick={() => { setDetailId(null); setEditId(a.id); }} style={{ width: '100%' }}>Bearbeiten / Verlängern</window.UI.Btn>
              )}
            </div>
          </window.UI.Modal>
        );
      })()}
    </>
  );
};
