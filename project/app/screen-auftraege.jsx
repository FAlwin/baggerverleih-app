/* ============ SCREEN: Aufträge (zentrale Klammer) ============ */
window.Screens = window.Screens || {};
const { useState: auS } = React;

// Zeitraum hübsch formatieren
function auZeitraum(F, a) {
  const d = a.von === a.bis ? F.fmtDate(a.von) : `${F.fmtDate(a.von)} – ${F.fmtDate(a.bis)}`;
  const z = a.vonZeit && a.bisZeit ? ` · ${a.vonZeit}–${a.bisZeit}` : '';
  return d + z;
}

// kleines Typ-Label (Vermietung/Eigennutzung/Wartung)
function TypBadge({ typ }) {
  const meta = (window.FRIESEN.AUFTRAG_TYP || {})[typ] || { label: typ, farbe: '#6B6B66' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: meta.farbe }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: meta.farbe, flex: '0 0 auto' }} />
      {meta.label}
    </span>
  );
}

function AuftragFilter({ value, onChange, counts }) {
  const tabs = [
    { id: 'aktiv', label: 'Aktiv' },
    { id: 'anfrage', label: 'Anfragen' },
    { id: 'reserviert', label: 'Reserviert' },
    { id: 'abgerechnet', label: 'Abzurechnen' },
    { id: 'alle', label: 'Alle' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {tabs.map((t) => {
        const on = value === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 'var(--r)',
            border: '1.5px solid ' + (on ? 'var(--ink)' : 'var(--line-2)'), background: on ? 'var(--ink)' : 'var(--paper)',
            color: on ? '#fff' : 'var(--ink)', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {t.label}
            {counts[t.id] != null && <span className="mono" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: on ? 'rgba(255,255,255,.18)' : 'var(--paper-3)', color: on ? '#fff' : 'var(--muted)' }}>{counts[t.id]}</span>}
          </button>
        );
      })}
    </div>
  );
}

// gehört der Auftrag in die "Aktiv"-Liste (noch zu erledigen)?
function istAktiv(a) { return a.status !== 'abgeschlossen' && a.status !== 'bezahlt'; }

window.Screens.auftraege = function Auftraege({ nav, params, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const [filter, setFilter] = auS(params.filter || 'aktiv');
  const [q, setQ] = auS('');
  const [neuOpen, setNeuOpen] = auS(false);

  const all = store.db.auftraege;
  const counts = {
    alle: all.length,
    aktiv: all.filter(istAktiv).length,
    anfrage: all.filter((a) => a.status === 'anfrage').length,
    reserviert: all.filter((a) => a.status === 'reserviert').length,
    abgerechnet: all.filter((a) => a.status === 'abgerechnet').length,
  };

  let rows = all.filter((a) => {
    if (filter === 'alle') return true;
    if (filter === 'aktiv') return istAktiv(a);
    return a.status === filter;
  });
  if (q) {
    const ql = q.toLowerCase();
    rows = rows.filter((a) => {
      const k = store.kundeById(a.kundeId);
      return (a.id + ' ' + (k?.name || '') + ' ' + (a.ort || '')).toLowerCase().includes(ql);
    });
  }
  rows = [...rows].sort((a, b) => b.von.localeCompare(a.von));

  const kundeName = (a) => store.kundeById(a.kundeId)?.name || '—';

  return (
    <>
      <PageHeader kicker="Verwaltung" title="Aufträge" mobile={mobile} onMenu={onMenu}>
        <window.UI.Btn icon="plus" onClick={() => setNeuOpen(true)}>{mobile ? 'Neu' : 'Neuer Auftrag'}</window.UI.Btn>
      </PageHeader>

      {/* Neuer-Auftrag-Auswahl */}
      <window.UI.Modal open={neuOpen} onClose={() => setNeuOpen(false)} title="Neuer Auftrag" width={460}
        footer={<window.UI.Btn variant="ghost" onClick={() => setNeuOpen(false)}>Abbrechen</window.UI.Btn>}>
        <div className="stack" style={{ gap: 12 }}>
          <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Wie möchtest du starten?</div>
          <button onClick={() => { setNeuOpen(false); nav('kalender', { neu: 'auftrag' }); }} style={auswahlBtn}>
            <Icon name="kalender" size={22} color="var(--ink)" style={{ flex: '0 0 auto' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Direkt buchen</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Maschine fest für einen Kunden eintragen – ohne Angebot.</div>
            </div>
            <Icon name="chevron" size={16} color="var(--muted-2)" />
          </button>
          <button onClick={() => { setNeuOpen(false); nav('rechnung-neu', { mode: 'angebot' }); }} style={auswahlBtn}>
            <Icon name="angebot" size={22} color="var(--ink)" style={{ flex: '0 0 auto' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Mit Angebot starten</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Erst ein Angebot schreiben, das der Kunde annehmen kann.</div>
            </div>
            <Icon name="chevron" size={16} color="var(--muted-2)" />
          </button>
        </div>
      </window.UI.Modal>
      <div className="content-pad stack" style={{ gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
          <AuftragFilter value={filter} onChange={setFilter} counts={counts} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1.5px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', minWidth: 220 }}>
            <Icon name="search" size={16} color="var(--muted)" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nr., Kunde oder Ort …" style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: 13.5, flex: 1, background: 'transparent' }} />
          </div>
        </div>

        <window.UI.Card style={{ padding: 0, overflow: 'hidden' }} className="scroll-x">
          {mobile ? (
            <div>
              {rows.map((a) => {
                const g = store.geraetById(a.geraetId);
                return (
                  <button key={a.id} onClick={() => nav('auftrag', { id: a.id })} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '14px 16px', border: 'none', borderBottom: '1px solid var(--paper-3)', background: 'transparent', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                    {g && <window.GeraetBadge geraet={g} size={36} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kundeName(a)}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{auZeitraum(F, a)}</div>
                        </div>
                        <div style={{ flex: '0 0 auto', textAlign: 'right' }}><window.Pill status={a.status} /></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <TypBadge typ={a.typ} />
                        {a.ort && <span style={{ fontSize: 11.5, color: 'var(--muted-2)', display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="pin" size={12} /> {a.ort}</span>}
                      </div>
                    </div>
                    <Icon name="chevron" size={16} color="var(--muted-2)" style={{ flex: '0 0 auto' }} />
                  </button>
                );
              })}
              {rows.length === 0 && <window.UI.Empty icon="kalender" title="Keine Aufträge" sub="Für diesen Filter gibt es keine Einträge." />}
            </div>
          ) : (
            <table className="fr-table">
              <thead><tr>
                <th>Nr.</th><th>Kunde / Typ</th><th>Gerät</th><th className="hide-sm">Zeitraum</th><th className="hide-sm">Ort</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {rows.map((a) => {
                  const g = store.geraetById(a.geraetId);
                  return (
                    <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => nav('auftrag', { id: a.id })}>
                      <td className="num" style={{ fontWeight: 600 }}>{a.id}</td>
                      <td><div style={{ fontWeight: 600 }}>{kundeName(a)}</div><TypBadge typ={a.typ} /></td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{g && <window.GeraetBadge geraet={g} size={26} />}<span style={{ fontSize: 13 }}>{g?.name}</span></div></td>
                      <td className="num hide-sm" style={{ color: 'var(--muted)' }}>{auZeitraum(F, a)}</td>
                      <td className="hide-sm" style={{ color: 'var(--muted)' }}>{a.ort || '—'}</td>
                      <td><window.Pill status={a.status} /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <window.UI.IconBtn name="arrowRight" size={16} title="Öffnen" style={{ width: 32, height: 32 }} onClick={() => nav('auftrag', { id: a.id })} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!mobile && rows.length === 0 && <window.UI.Empty icon="kalender" title="Keine Aufträge" sub="Für diesen Filter gibt es keine Einträge." />}
        </window.UI.Card>
      </div>
    </>
  );
};

// Nächster-Schritt-Konfiguration je Auftrag-Status.
// Gibt { primary:{label,icon,hint,action}, secondary?:{label,action,danger} } zurück.
function nextStep(a, angebot, rechnung, store, nav, toast) {
  const id = a.id;
  const prefill = { geraetId: a.geraetId, von: a.von, bis: a.bis, ort: a.ort };
  // Rechnung schreiben: aus Angebot übernehmen, sonst leeres Formular – beides verknüpft den Auftrag
  const rechnungSchreiben = () => {
    if (angebot) { const rid = store.convertAngebot(angebot.id); toast('Rechnung ' + rid + ' erstellt'); nav('rechnung', { id: rid }); }
    else nav('rechnung-neu', { auftragId: id, kundeId: a.kundeId, prefill });
  };

  if (a.status === 'anfrage') return {
    primary: { label: 'Angebot schreiben', icon: 'angebot', hint: 'Erstellt ein Angebot zu diesem Auftrag.',
      action: () => nav('rechnung-neu', { mode: 'angebot', auftragId: id, kundeId: a.kundeId, prefill }) },
    secondary: { label: 'Stattdessen direkt buchen', action: () => { store.setAuftragStatus(id, 'reserviert'); toast('Auftrag gebucht'); } },
  };

  if (a.status === 'angebot') {
    const st = angebot ? angebot.status : 'offen';
    if (st === 'angenommen') return { primary: { label: 'Rechnung schreiben', icon: 'rechnung', hint: 'Erstellt die Rechnung und setzt den Auftrag auf „abgerechnet".', action: rechnungSchreiben } };
    if (st === 'versendet') return {
      primary: { label: 'Kunde hat angenommen', icon: 'check', hint: 'Bucht den Auftrag fest (reserviert). Rechnung folgt später.',
        action: () => { store.angebotAnnehmen(id); toast('Auftrag gebucht'); } },
      secondary: { label: 'Angebot abgelehnt', danger: true, action: () => { if (confirm(`Angebot abgelehnt – Auftrag ${id} samt Angebot löschen?`)) { store.deleteAuftrag(id); toast('Auftrag gelöscht'); nav('auftraege'); } } },
    };
    // Angebot erstellt, aber noch nicht versendet
    return {
      primary: { label: 'Angebot versenden', icon: 'arrowRight', hint: 'Öffnet den Versand per E-Mail oder WhatsApp.',
        action: () => a.angebotId ? nav('angebote', { versendId: a.angebotId }) : nav('rechnung-neu', { mode: 'angebot', auftragId: id, kundeId: a.kundeId, prefill }) },
      secondary: { label: 'Kunde hat schon angenommen', action: () => { store.angebotAnnehmen(id); toast('Auftrag gebucht'); } },
    };
  }

  if (a.status === 'reserviert') return {
    primary: { label: 'Rechnung schreiben', icon: 'rechnung', hint: 'Erstellt die Rechnung und setzt den Auftrag auf „abgerechnet".', action: rechnungSchreiben },
  };
  if (a.status === 'abgerechnet') return {
    primary: { label: 'Als bezahlt markieren', icon: 'check', hint: 'Bucht die Zahlung ein – der Auftrag gilt dann als bezahlt.',
      action: () => { if (rechnung) store.markPaid(rechnung.id); store.setAuftragStatus(id, 'bezahlt'); toast('Als bezahlt markiert'); } },
  };
  if (a.status === 'bezahlt') return {
    primary: { label: 'Auftrag abschließen', icon: 'check', hint: 'Schließt den Vorgang ab und legt ihn ins Archiv.',
      action: () => { store.setAuftragStatus(id, 'abgeschlossen'); toast('Auftrag abgeschlossen'); } },
  };
  return null;
}

// läuft die Vermietung gerade? (heute im Zeitraum, schon gebucht, noch nicht abgeschlossen)
function laeuftGerade(a, today) {
  return today >= a.von && today <= a.bis && ['reserviert', 'abgerechnet'].includes(a.status);
}

window.Screens.auftrag = function AuftragDetail({ nav, params, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [statusKorr, setStatusKorr] = auS(false);
  const a = store.auftragById(params.id);

  if (!a) return <><PageHeader title="Auftrag" mobile={mobile} onMenu={onMenu} /><div className="content-pad">Nicht gefunden.</div></>;

  const g = store.geraetById(a.geraetId);
  const k = a.kundeId ? store.kundeById(a.kundeId) : null;
  const angebot = a.angebotId ? store.angebotById(a.angebotId) : null;
  const rechnung = a.rechnungId ? store.rechnungById(a.rechnungId) : null;
  const ns = nextStep(a, angebot, rechnung, store, nav, toast);
  const laeuft = laeuftGerade(a, store.today);

  const loeschen = () => {
    const teile = [];
    if (angebot) teile.push('Angebot ' + angebot.id);
    if (rechnung) teile.push('Rechnung ' + rechnung.id);
    const zusatz = teile.length ? `\n\nMit gelöscht werden: ${teile.join(', ')}.` : '';
    if (confirm(`Auftrag ${a.id} wirklich löschen?${zusatz}`)) {
      store.deleteAuftrag(a.id);
      toast('Auftrag gelöscht');
      nav('auftraege');
    }
  };

  return (
    <>
      <PageHeader kicker="Auftrag" title={a.id} mobile={mobile} onMenu={onMenu} />
      <div className="content-pad stack" style={{ gap: 20 }}>

        {/* Statuszeile + Nächster Schritt */}
        <window.UI.Card style={{ padding: '18px 18px 16px' }}>
          <window.UI.Stepper flow={F.AUFTRAG_FLOW} current={a.status} />
          {laeuft && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5, color: 'var(--warn)', fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--warn)' }} /> Läuft gerade
            </div>
          )}
          {ns && (
            <div style={{ marginTop: 16 }}>
              <window.UI.Btn icon={ns.primary.icon} onClick={ns.primary.action} style={{ width: '100%', padding: '12px 16px', fontSize: 15 }}>
                {ns.primary.label} →
              </window.UI.Btn>
              {ns.primary.hint && <div style={{ marginTop: 7, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>{ns.primary.hint}</div>}
              {ns.secondary && (
                <div style={{ marginTop: 10, textAlign: 'center' }}>
                  <button onClick={ns.secondary.action} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: ns.secondary.danger ? 'var(--danger)' : 'var(--ink)', fontFamily: 'var(--sans)', textDecoration: 'underline', padding: '4px 8px' }}>
                    {ns.secondary.label}
                  </button>
                </div>
              )}
            </div>
          )}
          {a.status === 'abgeschlossen' && (
            <div style={{ marginTop: 14, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--ok)', fontWeight: 600 }}>
              <Icon name="check" size={16} color="var(--ok)" /> Auftrag abgeschlossen
            </div>
          )}
          {a.status !== 'abgeschlossen' && (
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <button onClick={() => setStatusKorr((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--sans)', textDecoration: 'underline', padding: '4px 8px' }}>
                Status manuell korrigieren
              </button>
              {statusKorr && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <window.UI.Select value={a.status} onChange={(e) => { store.setAuftragStatus(a.id, e.target.value); toast('Status aktualisiert'); setStatusKorr(false); }} style={{ maxWidth: 220 }}>
                    {F.AUFTRAG_FLOW.map((s) => <option key={s} value={s}>{(F.STATUS[s] || { label: s }).label}</option>)}
                  </window.UI.Select>
                </div>
              )}
            </div>
          )}
        </window.UI.Card>

        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
          {/* Eckdaten */}
          <window.UI.Card style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <TypBadge typ={a.typ} />
              <window.Pill status={a.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              {g && <window.GeraetBadge geraet={g} size={40} />}
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{g?.name}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g?.detail}</div></div>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {k && <div onClick={() => nav('kunde', { id: k.id })} style={{ cursor: 'pointer', color: 'var(--ink)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="kunden" size={15} /> {k.name}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="clock" size={15} /> {auZeitraum(F, a)}</div>
              {a.ort && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={15} /> {a.ort}</div>}
              {a.notiz && <div style={{ marginTop: 4, padding: '8px 11px', background: 'var(--paper-3)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 12.5 }}>{a.notiz}</div>}
            </div>
          </window.UI.Card>

          {/* Verknüpfte Belege */}
          <window.UI.Card style={{ padding: 18 }}>
            <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 12 }}>Verknüpfte Belege</div>
            <div className="stack" style={{ gap: 9 }}>
              {angebot
                ? <button onClick={() => nav('angebote', { openId: a.angebotId })} style={belegBtn}><span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="angebot" size={16} color="var(--muted)" /> Angebot {angebot.id}</span><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><window.Pill status={angebot.status} /><Icon name="chevron" size={15} color="var(--muted-2)" /></span></button>
                : <div style={belegLeer}><Icon name="angebot" size={16} /> Kein Angebot</div>}
              {rechnung
                ? <button onClick={() => nav('rechnung', { id: rechnung.id })} style={belegBtn}><span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="rechnung" size={16} color="var(--muted)" /> Rechnung {rechnung.id}</span><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><window.Pill status={rechnung.status} /><Icon name="chevron" size={15} color="var(--muted-2)" /></span></button>
                : <div style={belegLeer}><Icon name="rechnung" size={16} /> Keine Rechnung</div>}
              <button onClick={() => nav('kalender')} style={belegBtn}><span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="kalender" size={16} color="var(--muted)" /> Belegung im Kalender</span><Icon name="chevron" size={15} color="var(--muted-2)" /></button>
            </div>
          </window.UI.Card>
        </div>

        {/* Auftrag löschen */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <window.UI.Btn variant="danger" icon="trash" onClick={loeschen}>Auftrag löschen</window.UI.Btn>
        </div>
      </div>
    </>
  );
};

const belegBtn = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '11px 13px', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' };
const belegLeer = { display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 'var(--r)', background: 'var(--paper-3)', fontSize: 13.5, color: 'var(--muted-2)' };
const auswahlBtn = { display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '15px 16px', border: '1.5px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', textAlign: 'left', color: 'var(--ink)' };
