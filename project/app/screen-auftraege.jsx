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
          <button onClick={() => { setNeuOpen(false); nav('rechnung-neu', { mode: 'rechnung' }); }} style={auswahlBtn}>
            <Icon name="rechnung" size={22} color="var(--ink)" style={{ flex: '0 0 auto' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Direktrechnung</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Sofort abrechnen – ohne vorheriges Angebot.</div>
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
function nextStep(a, angebot, rechnung, store, nav, toast, ui) {
  const id = a.id;
  ui = ui || {};
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
      secondary: { label: 'Angebot abgelehnt', danger: true, action: () => { if (confirm(`Angebot abgelehnt – Auftrag ${id} samt Angebot löschen?`)) { const snap = store.snapshot(); store.deleteAuftrag(id); toast('Auftrag gelöscht', { undo: () => store.restoreSnapshot(snap) }); nav('auftraege'); } } },
    };
    // Angebot erstellt, aber noch nicht versendet
    return {
      primary: { label: 'Angebot versenden', icon: 'arrowRight', hint: 'Öffnet den Versand per E-Mail oder WhatsApp.',
        action: () => a.angebotId && ui.openVersend ? ui.openVersend() : nav('rechnung-neu', { mode: 'angebot', auftragId: id, kundeId: a.kundeId, prefill }) },
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
  const [versendOpen, setVersendOpen] = auS(false);
  const [editOpen, setEditOpen] = auS(false);
  const [mvOpen, setMvOpen] = auS(false);
  const [previewKind, setPreviewKind] = auS(null);
  const a = store.auftragById(params.id);

  if (!a) return <><PageHeader title="Auftrag" mobile={mobile} onMenu={onMenu} /><div className="content-pad">Nicht gefunden.</div></>;

  const g = store.geraetById(a.geraetId);
  const k = a.kundeId ? store.kundeById(a.kundeId) : null;
  const angebot = a.angebotId ? store.angebotById(a.angebotId) : null;
  const rechnung = a.rechnungId ? store.rechnungById(a.rechnungId) : null;
  const ns = nextStep(a, angebot, rechnung, store, nav, toast, { openVersend: () => setVersendOpen(true) });
  const laeuft = laeuftGerade(a, store.today);
  const prefill = { geraetId: a.geraetId, von: a.von, bis: a.bis, ort: a.ort };

  // Rechnung erstellen (aus Angebot übernehmen, sonst leeres Formular – beides verknüpft den Auftrag)
  const rechnungSchreiben = () => {
    if (angebot) { const rid = store.convertAngebot(angebot.id); toast('Rechnung ' + rid + ' erstellt'); nav('rechnung', { id: rid }); }
    else nav('rechnung-neu', { auftragId: a.id, kundeId: a.kundeId, prefill });
  };
  const angebotStatus = angebot ? (angebot.status === 'offen' && angebot.gueltigBis < store.today ? 'abgelaufen' : angebot.status) : null;
  const angebotPill = { offen: 'offen', versendet: 'ueberfaellig', angenommen: 'bezahlt', abgelaufen: 'abgelaufen' };
  const angebotLabel = { offen: 'Offen', versendet: 'Versendet', angenommen: 'Angenommen', abgelaufen: 'Abgelaufen' };

  const loeschen = () => {
    const teile = [];
    if (angebot) teile.push('Angebot ' + angebot.id);
    if (rechnung) teile.push('Rechnung ' + rechnung.id);
    const zusatz = teile.length ? `\n\nMit gelöscht werden: ${teile.join(', ')}.` : '';
    if (confirm(`Auftrag ${a.id} wirklich löschen?${zusatz}`)) {
      const snap = store.snapshot();
      store.deleteAuftrag(a.id);
      toast('Auftrag gelöscht', { undo: () => store.restoreSnapshot(snap) });
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

        {/* Belege als Kacheln */}
        <div>
          <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 10 }}>Belege</div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>

            {/* Angebot */}
            <BelegKachel icon="angebot" title="Angebot" onTitle={angebot ? () => setPreviewKind('angebot') : null}
              status={angebot ? <window.Pill status={angebotPill[angebotStatus] || 'draft'} label={angebotLabel[angebotStatus] || angebotStatus} /> : null}>
              {angebot ? (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{angebot.id} · {F.fmtEUR(angebot.betrag)} · gültig bis {F.fmtDate(angebot.gueltigBis)}</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {(angebotStatus === 'offen' || angebotStatus === 'versendet') &&
                      <window.UI.Btn size="sm" icon="arrowRight" onClick={() => setVersendOpen(true)}>{angebotStatus === 'versendet' ? 'Erneut senden' : 'Versenden'}</window.UI.Btn>}
                    <window.UI.Btn size="sm" variant="ghost" icon="edit" onClick={() => setEditOpen(true)}>Verlängern</window.UI.Btn>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Noch kein Angebot</div>
                  {a.status !== 'abgeschlossen' && <window.UI.Btn size="sm" icon="plus" onClick={() => nav('rechnung-neu', { mode: 'angebot', auftragId: a.id, kundeId: a.kundeId, prefill })}>Angebot erstellen</window.UI.Btn>}
                </>
              )}
            </BelegKachel>

            {/* Mietvertrag – erst möglich, wenn Angebot oder Rechnung vorhanden */}
            {(() => {
              const mvReady = !!(angebot || rechnung) && !!k;
              return (
                <BelegKachel icon="file" title="Mietvertrag" locked={!mvReady} onTitle={mvReady ? () => setMvOpen(true) : null}>
                  {mvReady ? (
                    <>
                      <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Für die Übergabe – unterschreiben & drucken.</div>
                      <div><window.UI.Btn size="sm" icon="print" onClick={() => setMvOpen(true)}>Öffnen / Drucken</window.UI.Btn></div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Erst ein Angebot oder eine Rechnung anlegen.</div>
                  )}
                </BelegKachel>
              );
            })()}

            {/* Rechnung */}
            <BelegKachel icon="rechnung" title="Rechnung" onTitle={rechnung ? () => setPreviewKind('rechnung') : null}
              status={rechnung ? <window.Pill status={rechnung.status} /> : null}>
              {rechnung ? (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{rechnung.id} · {F.fmtEUR(rechnung.betrag)} · fällig {F.fmtDate(rechnung.faellig)}</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {rechnung.status !== 'bezahlt' && <window.UI.Btn size="sm" variant="okghost" icon="check" onClick={() => { store.markPaid(rechnung.id); if (a.status === 'abgerechnet') store.setAuftragStatus(a.id, 'bezahlt'); toast('Als bezahlt markiert'); }}>Als bezahlt</window.UI.Btn>}
                    {(rechnung.status === 'offen' || rechnung.status === 'ueberfaellig') && <window.UI.Btn size="sm" variant="ghost" icon="alert" onClick={() => { store.setStatus(rechnung.id, 'mahnung'); toast('Mahnung erstellt'); }}>Mahnung</window.UI.Btn>}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Noch keine Rechnung</div>
                  {a.status !== 'abgeschlossen' && <window.UI.Btn size="sm" icon="plus" onClick={rechnungSchreiben}>Rechnung erstellen</window.UI.Btn>}
                </>
              )}
            </BelegKachel>

            {/* Kalender */}
            <BelegKachel icon="kalender" title="Kalender">
              <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Belegung im Terminkalender.</div>
              <div><window.UI.Btn size="sm" variant="ghost" icon="arrowRight" onClick={() => nav('kalender', { highlight: a.id, ym: (a.von || '').slice(0, 7) })}>Im Kalender zeigen</window.UI.Btn></div>
            </BelegKachel>

          </div>
        </div>

        {/* Auftrag löschen */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <window.UI.Btn variant="danger" icon="trash" onClick={loeschen}>Auftrag löschen</window.UI.Btn>
        </div>
      </div>

      {/* Modale */}
      {versendOpen && angebot && k && (
        <window.VersendModal angebot={angebot} kunde={k} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate}
          onSend={(ch) => { window.angebotVersenden(store, angebot); toast(`Via ${ch} versendet · als Reserviert markiert`); setVersendOpen(false); }}
          onClose={() => setVersendOpen(false)} />
      )}
      {editOpen && angebot && (
        <window.EditAngebotModal angebot={angebot}
          onSave={(patch) => { const wasAb = angebot.gueltigBis < store.today; store.updateAngebot(angebot.id, { ...patch, ...(wasAb && patch.gueltigBis >= store.today ? { status: 'offen' } : {}) }); toast('Angebot aktualisiert'); setEditOpen(false); }}
          onClose={() => setEditOpen(false)} />
      )}
      {mvOpen && <MietvertragModal auftrag={a} store={store} onClose={() => setMvOpen(false)} />}
      {previewKind && <DocPreviewModal kind={previewKind} auftrag={a} store={store}
        onEdit={previewKind === 'angebot' ? () => { setPreviewKind(null); setEditOpen(true); } : null}
        onClose={() => setPreviewKind(null)} />}
    </>
  );
};

// ---- Dokument-Vorschau (A4, in-place) für Angebot/Rechnung ----
function DocPreviewModal({ kind, auftrag, store, onClose, onEdit }) {
  const F = window.FRIESEN;
  const [ref, scale] = window.useFitScale(793);
  const k = store.kundeById(auftrag.kundeId);
  const c = store.db.company;
  let doc, title;
  if (kind === 'angebot') {
    const ang = store.angebotById(auftrag.angebotId);
    if (!ang) return null;
    doc = <window.Print.AngebotDoc angebot={ang} kunde={k} company={c} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} />;
    title = 'Angebot ' + ang.id;
  } else {
    const r = store.rechnungById(auftrag.rechnungId);
    if (!r) return null;
    doc = <window.Print.RechnungDoc rechnung={r} kunde={k} company={c} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} />;
    title = 'Rechnung ' + r.id;
  }
  return (
    <window.UI.Modal open title={title} onClose={onClose} width={700}
      footer={<>
        {onEdit && <window.UI.Btn variant="ghost" icon="edit" onClick={onEdit}>Bearbeiten</window.UI.Btn>}
        <window.UI.Btn variant="ghost" onClick={onClose}>Schließen</window.UI.Btn>
        <window.UI.Btn icon="print" onClick={() => setTimeout(() => window.print(), 60)}>Drucken / PDF</window.UI.Btn>
      </>}>
      <div ref={ref} style={{ background: 'var(--paper-3)', borderRadius: 'var(--r)', padding: 16, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ width: 793 * scale, height: 1122 * scale, flex: '0 0 auto' }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 793, boxShadow: 'var(--shadow-lg)' }}>{doc}</div>
        </div>
      </div>
      <window.Print.Mount doc={doc} />
    </window.UI.Modal>
  );
}

// ---- Mietvertrag-Modal (erstklassiger Beleg des Auftrags – schnell bei der Übergabe) ----
function MietvertragModal({ auftrag, store, onClose }) {
  const F = window.FRIESEN;
  const g = store.geraetById(auftrag.geraetId);
  const k = store.kundeById(auftrag.kundeId) || { name: '—', kontakt: '', street: '', city: '', phone: '' };
  const rechnung = auftrag.rechnungId ? store.rechnungById(auftrag.rechnungId) : null;
  const angebot = auftrag.angebotId ? store.angebotById(auftrag.angebotId) : null;
  const positionen = (rechnung && rechnung.positionen) || (angebot && angebot.positionen) || [{ text: g?.name || 'Mietgerät', menge: 1, einheit: 'Pauschal', preis: 0 }];
  const mvDoc = { id: auftrag.id, datum: store.today, positionen, betrag: positionen.reduce((s, p) => s + p.menge * p.preis, 0) };
  const mietzeit = auftrag.von === auftrag.bis ? F.fmtDate(auftrag.von) : `${F.fmtDate(auftrag.von)} – ${F.fmtDate(auftrag.bis)}`;
  const [sigPad, setSigPad] = auS(null);
  const [sigV, setSigV] = auS(null);
  const [sigM, setSigM] = auS(null);
  const doc = <window.Print.MietvertragDoc rechnung={mvDoc} kunde={k} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} mietzeit={mietzeit} signaturVermieter={sigV} signaturMieter={sigM} />;
  return (
    <window.UI.Modal open title="Mietvertrag" onClose={onClose} width={480}
      footer={<>
        <window.UI.Btn variant="ghost" onClick={onClose}>Schließen</window.UI.Btn>
        <window.UI.Btn icon="print" onClick={() => setTimeout(() => window.print(), 60)}>Drucken / PDF</window.UI.Btn>
      </>}>
      <div className="stack" style={{ gap: 14 }}>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div><b style={{ color: 'var(--ink)' }}>{g?.name}</b> · {k.name}</div>
          <div>Mietzeit: <b style={{ color: 'var(--ink)' }}>{mietzeit}</b></div>
        </div>
        <div style={{ padding: '9px 12px', background: 'var(--yellow-wash)', borderRadius: 'var(--r)', fontSize: 12.5 }}>
          Bei der Übergabe vor Ort: beide unterschreiben, dann drucken / als PDF speichern.
        </div>
        <window.UI.Btn variant={sigV ? 'okghost' : 'ghost'} icon={sigV ? 'check' : 'edit'} onClick={() => setSigPad('v')} style={{ width: '100%' }}>{sigV ? 'Vermieter ✓ (erneut)' : 'Vermieter unterschreiben'}</window.UI.Btn>
        <window.UI.Btn variant={sigM ? 'okghost' : 'ghost'} icon={sigM ? 'check' : 'edit'} onClick={() => setSigPad('m')} style={{ width: '100%' }}>{sigM ? 'Mieter ✓ (erneut)' : 'Mieter unterschreiben'}</window.UI.Btn>
      </div>
      <window.Print.Mount doc={<>{doc}<window.Print.MietbedingungenPage company={store.db.company} /></>} />
      {sigPad && <window.UI.SignaturPad title={sigPad === 'v' ? 'Unterschrift Vermieter (Julian)' : 'Unterschrift Mieter (' + k.name + ')'} onSave={(d) => { sigPad === 'v' ? setSigV(d) : setSigM(d); setSigPad(null); }} onClose={() => setSigPad(null)} />}
    </window.UI.Modal>
  );
}

// Beleg-Kachel – Überschrift ist Button, wenn onTitle gesetzt (öffnet Vorschau)
function BelegKachel({ icon, title, status, onTitle, locked, children }) {
  const head = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: locked ? 'var(--muted-2)' : 'var(--ink)' }}>
      <Icon name={icon} size={17} color="var(--muted)" /> {title}
      {onTitle && <Icon name="arrowRight" size={14} color="var(--muted-2)" />}
    </span>
  );
  return (
    <div style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, opacity: locked ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {onTitle
          ? <button onClick={onTitle} title="Vorschau öffnen" style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>{head}</button>
          : head}
        {status}
      </div>
      {children}
    </div>
  );
}

const belegBtn = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '11px 13px', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' };
const belegLeer = { display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 'var(--r)', background: 'var(--paper-3)', fontSize: 13.5, color: 'var(--muted-2)' };
const auswahlBtn = { display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '15px 16px', border: '1.5px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', textAlign: 'left', color: 'var(--ink)' };
