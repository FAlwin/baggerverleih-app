/* ============ SCREEN: Aufträge (zentrale Klammer) ============ */
window.Screens = window.Screens || {};
const { useState: auS } = React;

// Zeitraum hübsch formatieren
function auZeitraum(F, a) {
  const d = a.von === a.bis ? F.fmtDate(a.von) : `${F.fmtDate(a.von)} – ${F.fmtDate(a.bis)}`;
  const z = a.vonZeit && a.bisZeit ? ` · ${a.vonZeit}–${a.bisZeit}` : '';
  return d + z;
}

// Eine Zusatzleistung (aus der Anfrage durchgereicht) in eine Rechnungs-/Angebotsposition wandeln.
function zusatzPosition(z, store) {
  if (z.art === 'stunde') {
    const menge = Number(z.stunden != null ? z.stunden : 1) || 1;
    // Stückpreis: bevorzugt z.preis; im durchgereichten Eintrag ist nur der Gesamt-betrag vorhanden → Stückpreis daraus ableiten.
    const preis = z.preis != null ? z.preis : (z.betrag ? Math.round((z.betrag / menge) * 100) / 100 : 0);
    return { text: z.label || 'Mit Fahrer', einheit: 'Stunde', menge, preis };
  }
  if (z.art === 'auswahl') {
    const namen = (z.ids || []).map((id) => (store.geraetById(id) || {}).name).filter(Boolean).join(', ');
    return { text: (z.label || 'Zubehör') + (namen ? ' (' + namen + ')' : ''), einheit: 'Pauschale', menge: 1, preis: z.betrag || 0 };
  }
  // stueckTag / anfahrt / pauschale: vorberechneten Betrag als Pauschalzeile (Summe bleibt korrekt)
  return { text: z.label || 'Zusatzleistung', einheit: 'Pauschale', menge: 1, preis: z.betrag || 0 };
}

// Positionen aus der Geräte-Liste eines Auftrags ableiten: je Gerät eine Geräteposition + dessen Zusatzleistungen.
function positionenAusGeraete(a, store) {
  const liste = (a.geraete && a.geraete.length) ? a.geraete : [{ geraetId: a.geraetId, einheit: a.einheit, dauer: a.dauer, von: a.von, bis: a.bis }];
  return liste.filter((ge) => ge.geraetId).flatMap((ge) => {
    const gg = store.geraetById(ge.geraetId);
    const tarife = (gg && gg.tarif) || [];
    const wunsch = ge.einheit || '';
    const istStd = /stunden/i.test(wunsch);
    const tar = tarife.find((t) => t.einheit === wunsch)
      || (istStd ? tarife.find((t) => /stunden/i.test(t.einheit)) : tarife.find((t) => /tag/i.test(t.einheit)))
      || tarife.find((t) => t.preis > 0) || tarife[0] || { einheit: wunsch || 'Tag', preis: 0 };
    const menge = /stunden/i.test(tar.einheit)
      ? 1
      : (Number(ge.dauer) || (ge.von && ge.bis ? window.tageZwischen(ge.von, ge.bis) : 1) || 1);
    // Zeitraum als unauffällige Zusatzinfo der Geräteposition (im Beleg zweite Zeile unter der Beschreibung)
    const F = window.FRIESEN;
    let zeitraum = '';
    if (F && ge.von) {
      const std = /stunden|stunde/i.test(ge.einheit || '') && (!ge.bis || ge.bis === ge.von);
      zeitraum = std
        ? F.fmtDate(ge.von) + (ge.vonZeit && ge.bisZeit ? ' · ' + ge.vonZeit + '–' + ge.bisZeit : '')
        : F.fmtDate(ge.von) + (ge.bis && ge.bis !== ge.von ? ' – ' + F.fmtDate(ge.bis) : '');
    }
    const geraetPos = { text: gg ? gg.name : ge.geraetId, einheit: tar.einheit, menge, preis: tar.preis, zeitraum };
    const zusatzPos = (Array.isArray(ge.zusatz) ? ge.zusatz : []).filter((z) => (z.preis || z.betrag)).map((z) => zusatzPosition(z, store));
    return [geraetPos, ...zusatzPos];
  });
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
function istAktiv(a) { return a.status !== 'bezahlt' && a.status !== 'abgelehnt'; }

window.Screens.auftraege = function Auftraege({ nav, params, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const [filter, setFilter] = auS(params.filter || 'aktiv');
  const [q, setQ] = auS('');
  const [neuOpen, setNeuOpen] = auS(false);

  // Vom Dashboard „Auftrag erstellen" kommend: Auswahl-Dialog automatisch öffnen.
  React.useEffect(() => { if (params && params.neu) setNeuOpen(true); }, [params.neu]);

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
        <window.NeuButton nav={nav} />
      </PageHeader>

      {/* Neuer-Auftrag-Auswahl */}
      <window.UI.Modal open={neuOpen} onClose={() => setNeuOpen(false)} title="Neuer Auftrag" width={460}
        footer={<window.UI.Btn variant="ghost" onClick={() => setNeuOpen(false)}>Abbrechen</window.UI.Btn>}>
        <div className="stack" style={{ gap: 12 }}>
          <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Wie möchtest du starten?</div>
          <button onClick={() => { setNeuOpen(false); nav('anfragen', { neu: 1 }); }} style={auswahlBtn}>
            <Icon name="kalender" size={22} color="var(--ink)" style={{ flex: '0 0 auto' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Direkt buchen</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Anfrage mit Gerät & Zeitraum erfassen – wird zum Auftrag.</div>
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
  const prefill = { geraetId: a.geraetId, von: a.von, bis: a.bis, ort: a.ort, positionen: positionenAusGeraete(a, store) };
  // Rechnung schreiben: aus Angebot übernehmen, sonst leeres Formular – beides verknüpft den Auftrag
  const rechnungSchreiben = () => {
    if (angebot) { const snap = store.snapshot(); const rid = store.convertAngebot(angebot.id); toast('Rechnung ' + rid + ' erstellt', { undo: () => store.restoreSnapshot(snap) }); nav('rechnung', { id: rid }); }
    else { const mv = a.mietvertrag; nav('rechnung-neu', { auftragId: id, kundeId: a.kundeId, prefill: (mv && mv.positionen) ? { ...prefill, positionen: mv.positionen, von: mv.von || a.von, bis: mv.bis || a.bis } : prefill }); }
  };

  if (a.status === 'anfrage') return {
    primary: { label: 'Angebot schreiben', icon: 'angebot', hint: 'Erstellt ein Angebot zu diesem Auftrag.',
      action: () => nav('rechnung-neu', { mode: 'angebot', auftragId: id, kundeId: a.kundeId, prefill }) },
    secondary: { label: 'Stattdessen direkt buchen', action: () => { const snap = store.snapshot(); store.setAuftragStatus(id, 'reserviert'); toast('Auftrag gebucht', { undo: () => store.restoreSnapshot(snap) }); } },
  };

  if (a.status === 'angebot') {
    const st = angebot ? angebot.status : 'offen';
    if (st === 'angenommen') return { primary: { label: 'Rechnung schreiben', icon: 'rechnung', hint: 'Erstellt die Rechnung und setzt den Auftrag auf „abgerechnet".', action: rechnungSchreiben } };
    if (st === 'versendet') return {
      primary: { label: 'Kunde hat angenommen', icon: 'check', hint: 'Bucht den Auftrag fest (reserviert). Rechnung folgt später.',
        action: () => { const snap = store.snapshot(); store.angebotAnnehmen(id); toast('Auftrag gebucht', { undo: () => store.restoreSnapshot(snap) }); } },
      secondary: { label: 'Angebot abgelehnt', danger: true, action: () => { if (confirm(`Angebot abgelehnt – Auftrag ${id} samt Angebot löschen?`)) { const snap = store.snapshot(); store.deleteAuftrag(id); toast('Auftrag gelöscht', { undo: () => store.restoreSnapshot(snap) }); nav('auftraege'); } } },
    };
    // Angebot erstellt, aber noch nicht versendet
    return {
      primary: { label: 'Angebot versenden', icon: 'arrowRight', hint: 'Öffnet den Versand per E-Mail oder WhatsApp.',
        action: () => a.angebotId && ui.openVersend ? ui.openVersend() : nav('rechnung-neu', { mode: 'angebot', auftragId: id, kundeId: a.kundeId, prefill }) },
      secondary: { label: 'Kunde hat schon angenommen', action: () => { const snap = store.snapshot(); store.angebotAnnehmen(id); toast('Auftrag gebucht', { undo: () => store.restoreSnapshot(snap) }); } },
    };
  }

  // Reserviert → Gerät übergeben (Im Einsatz). Wird automatisch bei MV-Unterschrift gesetzt; hier auch manuell.
  if (a.status === 'reserviert') {
    const mvSigned = !!(a.mietvertrag && a.mietvertrag.signaturMieter && a.mietvertrag.signaturVermieter);
    return {
      primary: { label: 'Gerät übergeben (Im Einsatz)', icon: 'arrowRight',
        hint: mvSigned ? 'Mietvertrag ist beidseitig unterschrieben – Übergabe kann erfolgen.' : 'Bei der Übergabe sollte der Mietvertrag unterschrieben werden (Abschnitt „Mietvertrag").',
        action: () => {
          if (!mvSigned && !window.confirm('Der Mietvertrag ist noch nicht beidseitig unterschrieben.\n\nGerät trotzdem als übergeben („Im Einsatz") markieren?\n\nTipp: Den Mietvertrag im Auftrag erstellen und unterschreiben lassen.')) return;
          const snap = store.snapshot(); store.setAuftragStatus(id, 'einsatz'); toast('Gerät als „Im Einsatz" markiert', { undo: () => store.restoreSnapshot(snap) });
        } },
      secondary: { label: 'Direkt zur Rückgabe', action: () => ui.openRueckgabe && ui.openRueckgabe() },
    };
  }
  // Im Einsatz → Rückgabe (Einsatz beenden), dann Rechnung, dann Zahlung.
  if (a.status === 'einsatz') return {
    primary: { label: 'Rückgabe & Abschluss', icon: 'check', hint: 'Einsatz beenden: Rückgabe erfassen (Zustand, Betankung, Betriebsstunden). Danach folgt die Rechnung.',
      action: () => ui.openRueckgabe ? ui.openRueckgabe() : (store.setAuftragStatus(id, 'abgeschlossen'), toast('Einsatz abgeschlossen')) },
    secondary: { label: 'Doch nicht übergeben', action: () => { store.setAuftragStatus(id, 'reserviert'); toast('Zurück auf „Reserviert"'); } },
  };
  if (a.status === 'abgeschlossen') {
    if (!rechnung) return { primary: { label: 'Rechnung schreiben', icon: 'rechnung', hint: 'Rechnung auf Basis des Einsatzes erstellen.', action: rechnungSchreiben } };
    return { primary: { label: 'Als bezahlt markieren', icon: 'check', hint: 'Bucht die Zahlung ein – der Auftrag gilt dann als bezahlt.',
      action: () => { const snap = store.snapshot(); store.markPaid(rechnung.id); store.setAuftragStatus(id, 'bezahlt'); toast('Als bezahlt markiert', { undo: () => store.restoreSnapshot(snap) }); } } };
  }
  if (a.status === 'abgerechnet') return {
    primary: { label: 'Als bezahlt markieren', icon: 'check', hint: 'Bucht die Zahlung ein – der Auftrag gilt dann als bezahlt.',
      action: () => { const snap = store.snapshot(); if (rechnung) store.markPaid(rechnung.id); store.setAuftragStatus(id, 'bezahlt'); toast('Als bezahlt markiert', { undo: () => store.restoreSnapshot(snap) }); } },
  };
  return null; // bezahlt = Endzustand
}

// läuft die Vermietung gerade? Status „Im Einsatz" immer; sonst aus dem Datum abgeleitet.
function laeuftGerade(a, today) {
  if (a.status === 'einsatz') return true;
  return today >= a.von && today <= a.bis && ['reserviert', 'abgerechnet'].includes(a.status);
}

window.Screens.auftrag = function AuftragDetail({ nav, params, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [statusKorr, setStatusKorr] = auS(false);
  const [versendKind, setVersendKind] = auS(null);
  const [editOpen, setEditOpen] = auS(false);
  const [editRechnungOpen, setEditRechnungOpen] = auS(false);
  const [mvOpen, setMvOpen] = auS(false);
  const [previewKind, setPreviewKind] = auS(null);
  const [rueckOpen, setRueckOpen] = auS(false);
  const [verlOpen, setVerlOpen] = auS(false);
  const [geraetModal, setGeraetModal] = auS(null);  // null = zu; sonst { index: number|null } (null = neues Gerät)
  // Direktstart aus Auslieferungs-Übersicht / Mietverträge-Liste: Mietvertrag gleich öffnen.
  React.useEffect(() => { if (params && params.openMv) setMvOpen(true); }, [params.openMv]);
  const a = store.auftragById(params.id);

  if (!a) return <><PageHeader title="Auftrag" mobile={mobile} onMenu={onMenu} /><div className="content-pad">Nicht gefunden.</div></>;

  const g = store.geraetById(a.geraetId);
  const k = a.kundeId ? store.kundeById(a.kundeId) : null;
  const angebot = a.angebotId ? store.angebotById(a.angebotId) : null;
  const rechnung = a.rechnungId ? store.rechnungById(a.rechnungId) : null;
  const ns = nextStep(a, angebot, rechnung, store, nav, toast, { openVersend: () => setVersendKind('angebot'), openRueckgabe: () => setRueckOpen(true) });
  const laeuft = laeuftGerade(a, store.today);
  const prefill = { geraetId: a.geraetId, von: a.von, bis: a.bis, ort: a.ort, positionen: positionenAusGeraete(a, store) };

  // Beleg im vereinheitlichten Editor (rechnung-neu) bearbeiten – gleiches Fenster wie „Neues Angebot",
  // vorbefüllt mit Geräten (für Verfügbarkeit/Zusatzleistungen) + bestehenden Positionen.
  const editBeleg = (which) => {
    if (which === 'angebot' && angebot) nav('rechnung-neu', { editKind: 'angebot', editId: angebot.id, editAuftragId: a.id, kundeId: a.kundeId, prefill: { kundeId: a.kundeId, belegId: angebot.id, positionen: angebot.positionen, geraete: a.geraete, von: angebot.von || a.von, bis: angebot.bis || a.bis, ort: angebot.ort || a.ort, gueltigBis: angebot.gueltigBis } });
    else if (which === 'rechnung' && rechnung) nav('rechnung-neu', { editKind: 'rechnung', editId: rechnung.id, editAuftragId: a.id, kundeId: a.kundeId, prefill: { kundeId: a.kundeId, belegId: rechnung.id, positionen: rechnung.positionen, geraete: a.geraete, von: a.von, bis: a.bis, ort: a.ort, faellig: rechnung.faellig, datum: rechnung.datum } });
  };

  // Rechnung erstellen (aus Angebot übernehmen, sonst leeres Formular – beides verknüpft den Auftrag)
  const rechnungSchreiben = () => {
    if (angebot) { const snap = store.snapshot(); const rid = store.convertAngebot(angebot.id); toast('Rechnung ' + rid + ' erstellt', { undo: () => store.restoreSnapshot(snap) }); nav('rechnung', { id: rid }); }
    else { const mv = a.mietvertrag; nav('rechnung-neu', { auftragId: a.id, kundeId: a.kundeId, prefill: (mv && mv.positionen) ? { ...prefill, positionen: mv.positionen, von: mv.von || a.von, bis: mv.bis || a.bis } : prefill }); }
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
          {['reserviert', 'einsatz', 'abgerechnet', 'bezahlt'].includes(a.status) && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <window.UI.Btn variant="ghost" icon="clock" onClick={() => setVerlOpen(true)} style={{ width: '100%' }}>Auftrag verlängern</window.UI.Btn>
            </div>
          )}
          {a.status === 'bezahlt' && (
            <div style={{ marginTop: 14, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--ok)', fontWeight: 600 }}>
              <Icon name="check" size={16} color="var(--ok)" /> Auftrag abgeschlossen &amp; bezahlt
            </div>
          )}
          {a.status !== 'bezahlt' && (
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <button onClick={() => setStatusKorr((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--sans)', textDecoration: 'underline', padding: '4px 8px' }}>
                Status manuell korrigieren
              </button>
              {statusKorr && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <window.UI.Select value={a.status} onChange={(e) => {
                    const neu = e.target.value;
                    const flow = F.AUFTRAG_FLOW;
                    const lbl = (s) => (F.STATUS[s] || { label: s }).label;
                    const ci = flow.indexOf(a.status), ni = flow.indexOf(neu);
                    if (ni === ci) { setStatusKorr(false); return; }
                    if (ni < ci) {
                      const folge = flow.slice(ni + 1, ci + 1).map(lbl).join(', ');
                      const rechnungHinweis = rechnung && rechnung.status === 'bezahlt' && ni < flow.indexOf('bezahlt') ? '\nEine bereits bezahlte Rechnung wird wieder als offen geführt.' : '';
                      if (!confirm(`Status auf „${lbl(neu)}" zurücksetzen?\n\nDie nachfolgenden Schritte werden ebenfalls zurückgesetzt: ${folge}.${rechnungHinweis}`)) { setStatusKorr(false); return; }
                      store.setAuftragStatusKaskade(a.id, neu); toast('Status zurückgesetzt'); setStatusKorr(false); return;
                    }
                    if (ni > ci + 1) {
                      const skip = flow.slice(ci + 1, ni).map(lbl).join(', ');
                      if (!confirm(`Du überspringst Schritte: ${skip}.\n\nTrotzdem direkt auf „${lbl(neu)}" setzen?`)) { setStatusKorr(false); return; }
                    }
                    store.setAuftragStatus(a.id, neu); toast('Status aktualisiert'); setStatusKorr(false);
                  }} style={{ maxWidth: 220 }}>
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
          {/* Geräte-Liste (Mehrgeräte je Auftrag) – jede Zeile mit eigenem Zeitraum, klickbar zum Bearbeiten */}
          {(() => {
            const kannGeraete = !['abgeschlossen', 'bezahlt'].includes(a.status);
            const liste = (a.geraete && a.geraete.length) ? a.geraete : [{ geraetId: a.geraetId, von: a.von, bis: a.bis, vonZeit: a.vonZeit, bisZeit: a.bisZeit }];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {liste.map((ge, gi) => {
                  const gg = store.geraetById(ge.geraetId);
                  return (
                    <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: 'var(--paper-3)', borderRadius: 'var(--r)' }}>
                      {gg && <window.GeraetBadge geraet={gg} size={36} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{gg?.name || ge.geraetId}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={12} /> {auZeitraum(F, ge)}</div>
                      </div>
                      {kannGeraete && <window.UI.Btn size="sm" variant="ghost" icon="edit" title="Zeitraum/Gerät ändern" onClick={() => setGeraetModal({ index: gi })} />}
                      {kannGeraete && liste.length > 1 && <window.UI.Btn size="sm" variant="ghost" icon="trash" title="Gerät entfernen" onClick={() => { if (confirm('Dieses Gerät aus dem Auftrag entfernen?')) { store.auftragGeraetRemove(a.id, gi); toast('Gerät entfernt'); } }} />}
                    </div>
                  );
                })}
                {kannGeraete && <window.UI.Btn size="sm" variant="ghost" icon="plus" onClick={() => setGeraetModal({ index: null })} style={{ alignSelf: 'flex-start' }}>Weiteres Gerät</window.UI.Btn>}
              </div>
            );
          })()}
          <div style={{ fontSize: 13.5, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {k && <div onClick={() => nav('kunde', { id: k.id })} style={{ cursor: 'pointer', color: 'var(--ink)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="kunden" size={15} /> {k.name}</div>}
            {a.ort && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={15} /> {a.ort}</span>
              <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(((store.db.company || {}).street || '') + ', ' + ((store.db.company || {}).city || ''))}&destination=${encodeURIComponent(a.ort)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ink)', fontWeight: 600, fontSize: 12, textDecoration: 'underline' }}>
                <Icon name="arrowRight" size={13} /> Route öffnen
              </a>
            </div>}
            {a.notiz && <div style={{ marginTop: 4, padding: '8px 11px', background: 'var(--paper-3)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 12.5 }}>{a.notiz}</div>}
            {a.rueckgabe && (
              <div style={{ marginTop: 4, padding: '10px 12px', background: a.rueckgabe.zustand === 'maengel' ? 'var(--danger-wash)' : 'var(--ok-wash)', borderRadius: 'var(--r)', fontSize: 12.5, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Rückgabe {a.rueckgabe.datum ? '· ' + F.fmtDate(a.rueckgabe.datum) : ''}</div>
                <div>Zustand: {a.rueckgabe.zustand === 'maengel' ? 'Mängel/Schäden' : 'in Ordnung'}{a.rueckgabe.mangel ? ' – ' + a.rueckgabe.mangel : ''}</div>
                <div>Betankung: {a.rueckgabe.betankung === 'nachtanken' ? 'Nachtanken nötig' : 'vollgetankt'}{a.rueckgabe.stunden ? ' · ' + a.rueckgabe.stunden : ''}</div>
                {a.rueckgabe.notiz && <div>Notiz: {a.rueckgabe.notiz}</div>}
              </div>
            )}
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
                  {angebot.versendetAm && <div style={{ fontSize: 11.5, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={12} color="var(--ok)" /> Versendet {F.fmtDate(angebot.versendetAm)}{angebot.versendetUeber ? ' · ' + angebot.versendetUeber : ''}</div>}
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(angebotStatus === 'offen' || angebotStatus === 'versendet') &&
                      <window.UI.Btn size="sm" icon="arrowRight" onClick={() => setVersendKind('angebot')}>{angebot.versendetAm ? 'Erneut senden' : 'Versenden'}</window.UI.Btn>}
                    {!angebot.gesperrt
                      ? <window.UI.Btn size="sm" variant="ghost" icon="edit" onClick={() => editBeleg('angebot')}>Bearbeiten</window.UI.Btn>
                      : <span style={{ fontSize: 11.5, color: 'var(--muted-2)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={12} /> Gesperrt – Vertrag unterschrieben</span>}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Optional – ohne Angebot kann direkt eine Rechnung (und der Mietvertrag) erstellt werden.</div>
                  {a.status !== 'abgeschlossen' && <window.UI.Btn size="sm" variant="ghost" icon="plus" onClick={() => nav('rechnung-neu', { mode: 'angebot', auftragId: a.id, kundeId: a.kundeId, prefill })}>Angebot erstellen</window.UI.Btn>}
                </>
              )}
            </BelegKachel>

            {/* Mietvertrag – direkt möglich (auch ohne Angebot/Rechnung); nur ein Kunde wird benötigt */}
            {(() => {
              const mvReady = !!k;
              const mvGesperrt = !!(a.mietvertrag && a.mietvertrag.gesperrt);
              return (
                <BelegKachel icon="file" title="Mietvertrag" locked={!mvReady} onTitle={mvReady ? () => setMvOpen(true) : null}
                  status={mvGesperrt ? <window.Pill status="bezahlt" label="Unterschrieben" /> : null}>
                  {mvReady ? (
                    <>
                      <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>{mvGesperrt ? 'Beidseitig unterschrieben & gesperrt.' : 'Für die Übergabe – unterschreiben & als PDF speichern.'}</div>
                      {a.mietvertrag && a.mietvertrag.versendetAm && <div style={{ fontSize: 11.5, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={12} color="var(--ok)" /> Versendet {F.fmtDate(a.mietvertrag.versendetAm)}{a.mietvertrag.versendetUeber ? ' · ' + a.mietvertrag.versendetUeber : ''}</div>}
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        <window.UI.Btn size="sm" icon="file" onClick={() => setMvOpen(true)}>Öffnen</window.UI.Btn>
                        <window.UI.Btn size="sm" variant="ghost" icon="arrowRight" onClick={() => setVersendKind('mietvertrag')}>{a.mietvertrag && a.mietvertrag.versendetAm ? 'Erneut senden' : 'Versenden'}</window.UI.Btn>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Erst einen Kunden zuordnen.</div>
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
                  {rechnung.versendetAm && <div style={{ fontSize: 11.5, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={12} color="var(--ok)" /> Versendet {F.fmtDate(rechnung.versendetAm)}{rechnung.versendetUeber ? ' · ' + rechnung.versendetUeber : ''}</div>}
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {/* Bearbeiten nur solange die Rechnung nicht bezahlt UND nicht versendet ist */}
                    {rechnung.status !== 'bezahlt' && !rechnung.versendetAm && <window.UI.Btn size="sm" variant="ghost" icon="edit" onClick={() => editBeleg('rechnung')}>Bearbeiten</window.UI.Btn>}
                    <window.UI.Btn size="sm" variant="ghost" icon="arrowRight" onClick={() => setVersendKind('rechnung')}>{rechnung.versendetAm ? 'Erneut senden' : 'Versenden'}</window.UI.Btn>
                    {rechnung.status !== 'bezahlt' && <window.UI.Btn size="sm" variant="okghost" icon="check" onClick={() => { const snap = store.snapshot(); store.markPaid(rechnung.id); if (a.status === 'abgerechnet') store.setAuftragStatus(a.id, 'bezahlt'); toast('Als bezahlt markiert', { undo: () => store.restoreSnapshot(snap) }); }}>Als bezahlt</window.UI.Btn>}
                    {/* Mahnung nur solange nicht bezahlt – schließt sich gegenseitig aus */}
                    {(rechnung.status === 'offen' || rechnung.status === 'ueberfaellig') && <window.UI.Btn size="sm" variant="ghost" icon="alert" onClick={() => { const snap = store.snapshot(); store.setStatus(rechnung.id, 'mahnung'); toast('Mahnung erstellt', { undo: () => store.restoreSnapshot(snap) }); }}>Mahnung</window.UI.Btn>}
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

        {/* Verlauf dieses Auftrags */}
        {(() => { const evs = (store.db.verlauf || []).filter((e) => e.auftragId === a.id); return (
          <window.UI.Card style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Icon name="clock" size={16} /><h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Verlauf</h2></div>
            <window.VerlaufTimeline events={evs} store={store} nav={nav} />
          </window.UI.Card>
        ); })()}

        {/* Auftrag löschen */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <window.UI.Btn variant="danger" icon="trash" onClick={loeschen}>Auftrag löschen</window.UI.Btn>
        </div>
      </div>

      {/* Modale */}
      {versendKind && k && (() => {
        let beleg = null;
        if (versendKind === 'angebot') beleg = angebot;
        else if (versendKind === 'rechnung') beleg = rechnung;
        else if (versendKind === 'mietvertrag') {
          const pos = (a.mietvertrag && a.mietvertrag.positionen) || (rechnung && rechnung.positionen) || (angebot && angebot.positionen) || [];
          beleg = { id: a.id, datum: (a.mietvertrag && a.mietvertrag.datum) || store.today, positionen: pos, betrag: pos.reduce((s, p) => s + (Number(p.menge) || 0) * (Number(p.preis) || 0), 0) };
        }
        if (!beleg) { return null; }
        return (
          <window.VersendModal kind={versendKind} beleg={beleg} kunde={k} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate}
            onSend={(ch) => {
              if (versendKind === 'angebot') window.angebotVersenden(store, angebot);
              store.belegVersendet(versendKind, versendKind === 'mietvertrag' ? a.id : beleg.id, ch);
              toast(`Via ${ch} versendet${versendKind === 'angebot' ? ' · als Reserviert markiert' : ''}`);
              setVersendKind(null);
            }}
            onClose={() => setVersendKind(null)} />
        );
      })()}
      {/* Angebot/Rechnung werden im vereinheitlichten Editor (rechnung-neu) bearbeitet – siehe editBeleg(). */}
      {mvOpen && <MietvertragModal auftrag={a} store={store} nav={nav} onClose={() => setMvOpen(false)} />}
      {geraetModal && <GeraetZeileModal auftrag={a} store={store} index={geraetModal.index} onClose={() => setGeraetModal(null)} />}
      {rueckOpen && <RueckgabeModal auftrag={a} rechnung={rechnung} store={store} nav={nav} onClose={() => setRueckOpen(false)} />}
      {verlOpen && <VerlaengernModal auftrag={a} store={store} onClose={() => setVerlOpen(false)} />}
      {previewKind && <DocPreviewModal kind={previewKind} auftrag={a} store={store}
        onEdit={previewKind === 'angebot'
          ? (angebot && !angebot.gesperrt ? () => { setPreviewKind(null); editBeleg('angebot'); } : null)
          : (rechnung && rechnung.status !== 'bezahlt' && !rechnung.versendetAm ? () => { setPreviewKind(null); editBeleg('rechnung'); } : null)}
        onClose={() => setPreviewKind(null)} />}
    </>
  );
};

// ---- Auftrag verlängern + Folgetermine verschieben + Kunden-Mitteilung ----
function VerlaengernModal({ auftrag, store, onClose }) {
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const c = store.db.company || {};
  const g = store.geraetById(auftrag.geraetId);
  const tel = (s) => s ? s.replace(/[^0-9]/g, '').replace(/^0/, '49') : '';
  // Primäres Gerät; nur tageweise gebuchte Aufträge sind hier verlängerbar.
  const g0 = (auftrag.geraete && auftrag.geraete[0]) || { geraetId: auftrag.geraetId, von: auftrag.von, bis: auftrag.bis, einheit: auftrag.einheit, dauer: auftrag.dauer };
  const istStdBlock = /stunden/i.test(g0.einheit || '');

  // Nächste feste Belegung desselben Geräts nach dem aktuellen Ende → harte Obergrenze.
  const nextStart = (() => {
    const kand = [];
    (store.db.auftraege || []).forEach((x) => {
      if (x.id === auftrag.id || ['abgeschlossen', 'abgelehnt'].includes(x.status)) return;
      const gs = (x.geraete && x.geraete.length) ? x.geraete : [x];
      gs.forEach((ge) => { if (ge.geraetId === g0.geraetId && ge.von > auftrag.bis) kand.push({ von: ge.von, label: store.kundeById(x.kundeId)?.name || x.id }); });
    });
    (store.db.belegungen || []).forEach((b) => { if (b.geraetId === g0.geraetId && b.von > auftrag.bis) kand.push({ von: b.von, label: (F.BELEGUNG_GRUND[b.grund] && F.BELEGUNG_GRUND[b.grund].label) || 'Belegung' }); });
    kand.sort((a, b) => a.von.localeCompare(b.von));
    return kand[0] || null;
  })();
  const maxBis = nextStart ? window.addDays(nextStart.von, -1) : '';

  const [bis, setBis] = auS(auftrag.bis);
  const [done, setDone] = auS(null);

  // Miettage (inkl.) zwischen zwei Daten – geschlossene Wochentage zählen nicht.
  const miettage = (von, b) => { if (!von || !b || b < von) return 0; let cur = von, n = 0, guard = 0; while (cur <= b && guard < 400) { if (!window.istMiettag || window.istMiettag(cur)) n++; cur = window.addDays(cur, 1); guard++; } return n; };
  const neuDauer = miettage(g0.von, bis);
  const alteDauer = Number(g0.dauer) || miettage(g0.von, auftrag.bis) || 1;
  const deltaTage = Math.max(0, neuDauer - alteDauer);
  const tarif = ((g && g.tarif) || []).find((t) => /tag/i.test(t.einheit)) || { preis: 0 };
  const zusatzBetrag = deltaTage * (tarif.preis || 0);
  const zusatzPos = deltaTage > 0 ? [{ text: g ? g.name : g0.geraetId, einheit: 'Tag', menge: deltaTage, preis: tarif.preis || 0 }] : [];

  const ueberMax = !!(maxBis && bis > maxBis);
  const rechnung = auftrag.rechnungId ? store.db.rechnungen.find((r) => r.id === auftrag.rechnungId) : null;
  const mvGesperrt = !!(auftrag.mietvertrag && auftrag.mietvertrag.gesperrt);
  const hauptKunde = auftrag.kundeId ? store.kundeById(auftrag.kundeId) : null;
  const waLink = (kunde, msg) => `https://wa.me/${tel(kunde && (kunde.whatsapp || kunde.phone))}?text=${encodeURIComponent(msg)}`;
  const hauptMsg = `Hallo ${hauptKunde ? hauptKunde.name : ''},\n\nIhr Einsatz mit „${g ? g.name : 'dem Gerät'}" verlängert sich bis ${F.fmtDate(bis)}.\nBei Fragen melden Sie sich gern.\n\nViele Grüße\n${c.owner || ''}`;
  const kannVerlaengern = !!bis && bis > auftrag.bis && !ueberMax && !istStdBlock && deltaTage > 0;

  const anwenden = () => {
    const info = store.verlaengern(auftrag.id, { neuBis: bis, neuDauer, zusatzPos, zusatzBetrag });
    setDone(info || {});
    const teile = [];
    if (info && info.zusatzRechnung) teile.push(`Zusatzrechnung ${info.zusatzRechnung}`);
    else if (info && info.rechnungAngepasst) teile.push('Rechnung angepasst');
    if (mvGesperrt) teile.push('Mietvertrag-Nachtrag');
    toast(`Auftrag verlängert${teile.length ? ' · ' + teile.join(' · ') : ''}`);
  };

  const box = (bg, col, txt) => <div style={{ padding: '10px 12px', background: bg, borderRadius: 'var(--r)', fontSize: 12.5, color: col, display: 'flex', alignItems: 'flex-start', gap: 8 }}><Icon name="alert" size={15} color={col} style={{ flex: '0 0 auto', marginTop: 1 }} />{txt}</div>;

  return (
    <window.UI.Modal open title="Auftrag verlängern" onClose={onClose} width={480}
      footer={done
        ? <window.UI.Btn icon="check" onClick={onClose}>Fertig</window.UI.Btn>
        : <><window.UI.Btn variant="ghost" onClick={onClose}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" onClick={anwenden} disabled={!kannVerlaengern}>Verlängern</window.UI.Btn></>}>
      {!done ? (
        <div className="stack" style={{ gap: 14 }}>
          {istStdBlock ? (
            box('var(--warn-wash)', 'var(--warn)', 'Dieser Auftrag ist stundenweise gebucht – eine tageweise Verlängerung ist hier nicht vorgesehen.')
          ) : (
            <>
              <div style={{ fontSize: 13 }}>Aktuelles Ende: <b>{F.fmtDate(auftrag.bis)}</b></div>
              <window.UI.Field label="Neues Enddatum">
                <window.UI.Input type="date" value={bis} min={auftrag.bis} max={maxBis || undefined} onChange={(e) => setBis(e.target.value)} />
              </window.UI.Field>
              {nextStart
                ? box('var(--warn-wash)', 'var(--warn)', <span>Gerät ab <b>{F.fmtDate(nextStart.von)}</b> fest verplant ({nextStart.label}). Verlängerung max. bis <b>{F.fmtDate(maxBis)}</b> – danach muss das Gerät zurück.</span>)
                : <div style={{ fontSize: 12.5, color: 'var(--ok)' }}>Kein Folgetermin – frei verlängerbar.</div>}
              {ueberMax && box('var(--danger-wash)', 'var(--danger)', <span>Gewähltes Datum liegt nach dem festen Folgetermin. Spätestens <b>{F.fmtDate(maxBis)}</b> muss das Gerät zurück.</span>)}
              {deltaTage > 0 && !ueberMax && (
                <div style={{ fontSize: 13, background: 'var(--paper-2)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
                  Verlängerung um <b>{deltaTage}</b> Miettag(e) · zusätzlich <b>{F.fmtEUR(zusatzBetrag)}</b>.
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {rechnung && rechnung.status === 'bezahlt' ? 'Rechnung ist bezahlt → es wird eine Zusatzrechnung erstellt.' : rechnung ? 'Bestehende Rechnung wird angepasst.' : 'Wird in Mietvertrag/Rechnung übernommen.'}
                    {mvGesperrt ? ' Mietvertrag gesperrt → Nachtrag wird angelegt.' : (auftrag.mietvertrag ? ' Mietvertrag wird angepasst.' : '')}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          <div style={{ fontSize: 13.5 }}>Verlängert bis <b>{F.fmtDate(bis)}</b>{done.zusatzRechnung ? ` · Zusatzrechnung ${done.zusatzRechnung}` : ''}. Kunden informieren:</div>
          {hauptKunde && (hauptKunde.whatsapp || hauptKunde.phone) && (
            <a href={waLink(hauptKunde, hauptMsg)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#25D366', color: '#fff', borderRadius: 'var(--r)', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              <Icon name="phone" size={18} color="#fff" /> {hauptKunde.name} per WhatsApp
            </a>
          )}
        </div>
      )}
    </window.UI.Modal>
  );
}

// ---- Rückgabeprotokoll (schlank) + Abschluss ----
function RueckgabeModal({ auftrag, rechnung, store, nav, onClose }) {
  const toast = window.UI.useToast();
  const [zustand, setZustand] = auS('ok');
  const [mangel, setMangel] = auS('');
  const [betankung, setBetankung] = auS('voll');
  const [stunden, setStunden] = auS('');
  const [notiz, setNotiz] = auS('');
  const abschliessen = () => {
    const snap = store.snapshot();
    store.auftragAbschliessen(auftrag.id, {
      zustand, mangel: zustand === 'maengel' ? mangel.trim() : '',
      betankung, stunden: stunden.trim(), notiz: notiz.trim(),
    });
    onClose();
    const undo = () => store.restoreSnapshot(snap);
    if (rechnung && !rechnung.versendetAm) toast('Auftrag abgeschlossen · Rechnung noch nicht versendet', { undo });
    else if (!rechnung) toast('Auftrag abgeschlossen · noch keine Rechnung erstellt', { undo });
    else toast('Auftrag abgeschlossen', { undo });
  };
  return (
    <window.UI.Modal open title="Rückgabe & Abschluss" onClose={onClose} width={460}
      footer={<><window.UI.Btn variant="ghost" onClick={onClose}>Abbrechen</window.UI.Btn><window.UI.Btn icon="check" onClick={abschliessen}>Abschließen</window.UI.Btn></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Kurzes Rückgabeprotokoll – danach gilt der Auftrag als abgeschlossen.</div>
        <window.UI.Field label="Zustand bei Rückgabe">
          <window.UI.Select value={zustand} onChange={(e) => setZustand(e.target.value)}>
            <option value="ok">In Ordnung</option>
            <option value="maengel">Mängel / Schäden</option>
          </window.UI.Select>
        </window.UI.Field>
        {zustand === 'maengel' && (
          <window.UI.Field label="Mängel / Schäden">
            <window.UI.Textarea value={mangel} onChange={(e) => setMangel(e.target.value)} rows={3} placeholder="z. B. Kratzer an der Schaufel, Hydraulikschlauch undicht …" />
          </window.UI.Field>
        )}
        <div className="form-2">
          <window.UI.Field label="Betankung">
            <window.UI.Select value={betankung} onChange={(e) => setBetankung(e.target.value)}>
              <option value="voll">Vollgetankt zurück</option>
              <option value="nachtanken">Nachtanken nötig</option>
            </window.UI.Select>
          </window.UI.Field>
          <window.UI.Field label="Betriebsstunden (optional)">
            <window.UI.Input value={stunden} onChange={(e) => setStunden(e.target.value)} placeholder="z. B. 12,5 h" />
          </window.UI.Field>
        </div>
        <window.UI.Field label="Notiz (optional)">
          <window.UI.Input value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="z. B. gereinigt übergeben" />
        </window.UI.Field>
      </div>
    </window.UI.Modal>
  );
}

// ---- Dokument-Vorschau (A4, in-place) für Angebot/Rechnung ----
function DocPreviewModal({ kind, auftrag, store, onClose, onEdit }) {
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const [ref, scale] = window.useFitScale(793);
  const [versendOpen, setVersendOpen] = auS(false);
  const k = store.kundeById(auftrag.kundeId);
  const c = store.db.company;
  let doc, title, beleg, fileName;
  if (kind === 'angebot') {
    const ang = store.angebotById(auftrag.angebotId);
    if (!ang) return null;
    beleg = ang;
    doc = <window.Print.AngebotDoc angebot={ang} kunde={k} company={c} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} />;
    title = 'Angebot ' + ang.id; fileName = 'Angebot_' + ang.id;
  } else {
    const r = store.rechnungById(auftrag.rechnungId);
    if (!r) return null;
    beleg = r;
    doc = <window.Print.RechnungDoc rechnung={r} kunde={k} company={c} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} />;
    title = 'Rechnung ' + r.id; fileName = 'Rechnung_' + r.id;
  }
  return (
    <window.UI.Modal open title={title} onClose={onClose} width={700}
      footer={<>
        {onEdit && <window.UI.Btn variant="ghost" icon="edit" onClick={onEdit}>Bearbeiten</window.UI.Btn>}
        {k && <window.UI.Btn variant="ghost" icon="arrowRight" onClick={() => setVersendOpen(true)}>{beleg && beleg.versendetAm ? 'Erneut senden' : 'Versenden'}</window.UI.Btn>}
        <window.UI.Btn variant="ghost" onClick={onClose}>Schließen</window.UI.Btn>
        <window.UI.Btn icon="download" onClick={() => window.PDF.download(doc, fileName)}>Drucken / als PDF</window.UI.Btn>
      </>}>
      <div ref={ref} style={{ background: 'var(--paper-3)', borderRadius: 'var(--r)', padding: 16, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ width: 793 * scale, height: 1122 * scale, flex: '0 0 auto' }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 793, boxShadow: 'var(--shadow-lg)' }}>{doc}</div>
        </div>
      </div>
      {versendOpen && k && (
        <window.VersendModal kind={kind} beleg={beleg} kunde={k} company={c} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate}
          onSend={(ch) => { if (kind === 'angebot') window.angebotVersenden(store, beleg); store.belegVersendet(kind, beleg.id, ch); toast(`Via ${ch} versendet`); setVersendOpen(false); }}
          onClose={() => setVersendOpen(false)} />
      )}
    </window.UI.Modal>
  );
}

// ---- Mietvertrag-Modal (erstklassiger Beleg des Auftrags – schnell bei der Übergabe) ----
function MietvertragModal({ auftrag, store, nav, onClose }) {
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const g = store.geraetById(auftrag.geraetId);
  const k = store.kundeById(auftrag.kundeId) || { name: '—', kontakt: '', street: '', city: '', phone: '' };
  const rechnung = auftrag.rechnungId ? store.rechnungById(auftrag.rechnungId) : null;
  const angebot = auftrag.angebotId ? store.angebotById(auftrag.angebotId) : null;
  const mv = auftrag.mietvertrag || {};
  const gesperrt = !!mv.gesperrt;
  const firmaSig = (store.db.company || {}).signaturVermieter || null;
  const sigV = mv.signaturVermieter || firmaSig || null;       // Vermieter-Unterschrift kommt automatisch aus den Einstellungen
  const vAusEinstellungen = !mv.signaturVermieter && !!firmaSig;
  const sigM = mv.signaturMieter || null;
  // Der Mietvertrag führt Positionen & Zeitraum eigenständig. Beim ersten Öffnen aus Rechnung→Angebot→Gerät
  // vorbefüllt; sobald bearbeitet oder unterschrieben, gehören die Werte dem Vertrag (unveränderlich bei gesperrt).
  const geraetePos = positionenAusGeraete(auftrag, store);
  const effPositionen = mv.positionen || (rechnung && rechnung.positionen) || (angebot && angebot.positionen) || (geraetePos.length ? geraetePos : [{ text: g?.name || 'Mietgerät', menge: 1, einheit: 'Pauschal', preis: 0 }]);
  const effVon = mv.von || auftrag.von || null;
  const effBis = mv.bis || auftrag.bis || null;
  const mvDatum = mv.datum || store.today;
  const [sigPad, setSigPad] = auS(null);
  const [versendOpen, setVersendOpen] = auS(false);
  const [edit, setEdit] = auS(null);  // null = geschlossen; sonst { positionen, von, bis } (lokaler Entwurf für Live-Vorschau)
  const [mvRef, mvScale] = window.useFitScale ? window.useFitScale(793) : [null, 0.5];
  // Live-Werte: bei offenem Editor der Entwurf, sonst die gespeicherten Effektivwerte
  const livePos = edit ? edit.positionen : effPositionen;
  const liveVon = edit ? edit.von : effVon;
  const liveBis = edit ? edit.bis : effBis;
  const positionen = livePos;
  const mvDoc = { id: auftrag.id, datum: mvDatum, positionen: livePos, betrag: livePos.reduce((s, p) => s + (Number(p.menge) || 0) * (Number(p.preis) || 0), 0) };
  const mietzeit = !liveVon ? '—' : (liveVon === liveBis ? F.fmtDate(liveVon) : `${F.fmtDate(liveVon)} – ${F.fmtDate(liveBis)}`);
  const openEdit = () => setEdit({ positionen: effPositionen.map((p) => ({ ...p })), von: effVon || store.today, bis: effBis || effVon || store.today });
  const updRow = (i, patch) => setEdit((e) => ({ ...e, positionen: e.positionen.map((p, j) => j === i ? { ...p, ...patch } : p) }));
  const addRow = () => setEdit((e) => ({ ...e, positionen: [...e.positionen, { text: '', einheit: 'Tag', menge: 1, preis: 0 }] }));
  const delRow = (i) => setEdit((e) => ({ ...e, positionen: e.positionen.filter((_, j) => j !== i) }));
  const saveEdit = () => {
    store.mietvertragUpdate(auftrag.id, {
      positionen: edit.positionen.map((p) => ({ text: p.text, einheit: p.einheit, menge: Number(p.menge) || 0, preis: Number(p.preis) || 0 })),
      von: edit.von, bis: edit.bis,
    });
    setEdit(null); toast('Mietvertrag aktualisiert');
  };
  const doc = <window.Print.MietvertragDoc rechnung={mvDoc} kunde={k} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} mietzeit={mietzeit} signaturVermieter={sigV} signaturMieter={sigM} />;
  const pdfDoc = <>{doc}<window.Print.MietbedingungenPage company={store.db.company} /></>;
  return (
    <window.UI.Modal open title="Mietvertrag" onClose={onClose} width={600}
      footer={<>
        <window.UI.Btn variant="ghost" onClick={onClose}>Schließen</window.UI.Btn>
        {k && k.id && <window.UI.Btn variant="ghost" icon="arrowRight" onClick={() => setVersendOpen(true)}>{mv.versendetAm ? 'Erneut senden' : 'Versenden'}</window.UI.Btn>}
        <window.UI.Btn icon="download" onClick={() => window.PDF.download(pdfDoc, 'Mietvertrag_' + auftrag.id)}>Drucken / als PDF</window.UI.Btn>
      </>}>
      <div className="stack" style={{ gap: 14 }}>
        {/* A4-Vorschau (wie Rechnung/Angebot) – auch vor der Unterschrift sichtbar */}
        <div ref={mvRef} style={{ background: 'var(--paper-3)', borderRadius: 'var(--r)', padding: 12, display: 'flex', justifyContent: 'center', overflow: 'hidden', maxHeight: 340, overflowY: 'auto' }}>
          <div style={{ width: 793 * mvScale, height: 1122 * mvScale, flex: '0 0 auto' }}>
            <div style={{ transform: `scale(${mvScale})`, transformOrigin: 'top left', width: 793, boxShadow: 'var(--shadow-lg)' }}>{doc}</div>
          </div>
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><b style={{ color: 'var(--ink)' }}>{g?.name}</b> · {k.name}</div>
            <div>Mietzeit: <b style={{ color: 'var(--ink)' }}>{mietzeit}</b></div>
          </div>
          {!gesperrt && nav && <window.UI.Btn size="sm" variant="ghost" icon="edit" onClick={() => { onClose(); nav('rechnung-neu', { editKind: 'mietvertrag', editAuftragId: auftrag.id, kundeId: auftrag.kundeId, prefill: { kundeId: auftrag.kundeId, belegId: auftrag.id, positionen: effPositionen, geraete: auftrag.geraete, von: effVon, bis: effBis, ort: auftrag.ort } }); }}>Bearbeiten</window.UI.Btn>}
        </div>
        {edit && (
          <div className="stack" style={{ gap: 12, padding: 12, background: 'var(--paper-3)', borderRadius: 'var(--r)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <window.UI.Field label="Von"><window.UI.Input type="date" value={edit.von || ''} onChange={(e) => setEdit((s) => ({ ...s, von: e.target.value }))} /></window.UI.Field>
              <window.UI.Field label="Bis"><window.UI.Input type="date" value={edit.bis || ''} onChange={(e) => setEdit((s) => ({ ...s, bis: e.target.value }))} /></window.UI.Field>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Positionen</div>
              {edit.positionen.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 70px 80px 32px', gap: 6, alignItems: 'center' }}>
                  <window.UI.Input value={p.text} onChange={(e) => updRow(i, { text: e.target.value })} placeholder="Bezeichnung" style={{ padding: '8px', fontSize: 13 }} />
                  <window.UI.Input type="number" value={p.menge} onChange={(e) => updRow(i, { menge: e.target.value })} title="Menge" placeholder="Menge" style={{ padding: '8px', fontSize: 13, textAlign: 'center' }} />
                  <window.UI.Input value={p.einheit} onChange={(e) => updRow(i, { einheit: e.target.value })} title="Einheit" placeholder="Einheit" style={{ padding: '8px', fontSize: 12.5 }} />
                  <window.UI.Input type="number" value={p.preis} onChange={(e) => updRow(i, { preis: e.target.value })} title="Einzelpreis €" placeholder="Preis" style={{ padding: '8px', fontSize: 13, textAlign: 'right' }} />
                  <window.UI.Btn size="sm" variant="ghost" icon="trash" title="Entfernen" onClick={() => delRow(i)} />
                </div>
              ))}
              <window.UI.Btn size="sm" variant="ghost" icon="plus" onClick={addRow}>Position hinzufügen</window.UI.Btn>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <window.UI.Btn size="sm" variant="ghost" onClick={() => setEdit(null)}>Abbrechen</window.UI.Btn>
              <window.UI.Btn size="sm" icon="check" onClick={saveEdit}>Speichern</window.UI.Btn>
            </div>
          </div>
        )}
        {gesperrt ? (
          <div style={{ padding: '11px 13px', background: 'var(--ok-wash)', borderRadius: 'var(--r)', fontSize: 12.5, color: 'var(--ok)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="check" size={16} color="var(--ok)" style={{ flex: '0 0 auto', marginTop: 1 }} />
            <span><b>Unterschrieben &amp; gesperrt</b> am {F.fmtDate(mvDatum)}. Das Dokument ist beidseitig unterschrieben und kann nicht mehr geändert werden.</span>
          </div>
        ) : (
          <div style={{ padding: '9px 12px', background: 'var(--yellow-wash)', borderRadius: 'var(--r)', fontSize: 12.5 }}>
            Bei der Übergabe vor Ort unterschreiben. Sobald <b>beide</b> unterschrieben haben, wird der Vertrag gesperrt und ist unveränderlich.
          </div>
        )}
        <window.UI.Btn variant={sigV ? 'okghost' : 'ghost'} icon={sigV ? 'check' : 'edit'} disabled={!!sigV} onClick={() => setSigPad('v')} style={{ width: '100%' }}>{sigV ? (vAusEinstellungen ? 'Vermieter ✓ (aus Einstellungen)' : 'Vermieter ✓ unterschrieben') : 'Vermieter unterschreiben'}</window.UI.Btn>
        <window.UI.Btn variant={sigM ? 'okghost' : 'ghost'} icon={sigM ? 'check' : 'edit'} disabled={!!sigM} onClick={() => setSigPad('m')} style={{ width: '100%' }}>{sigM ? 'Mieter ✓ unterschrieben' : 'Unterschrift Kunde'}</window.UI.Btn>
      </div>
      {sigPad && <window.UI.SignaturPad title={sigPad === 'v' ? 'Unterschrift Vermieter (Julian)' : 'Unterschrift Mieter (' + k.name + ')'}
        onSave={(d) => { store.mietvertragSign(auftrag.id, sigPad, d); setSigPad(null); toast(sigPad === 'v' ? 'Unterschrift Vermieter gespeichert' : 'Unterschrift Mieter gespeichert'); }}
        onClose={() => setSigPad(null)} />}
      {versendOpen && k && k.id && (
        <window.VersendModal kind="mietvertrag" beleg={{ id: auftrag.id, datum: mvDatum, positionen, betrag: mvDoc.betrag }} kunde={k} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate}
          onSend={(ch) => { store.belegVersendet('mietvertrag', auftrag.id, ch); toast(`Via ${ch} versendet`); setVersendOpen(false); }} onClose={() => setVersendOpen(false)} />
      )}
    </window.UI.Modal>
  );
}

// ---- Geräte-Buchung im Auftrag anlegen/bearbeiten (mit harter Doppelbuchungs-Sperre) ----
function GeraetZeileModal({ auftrag, store, index, onClose }) {
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const istNeu = index == null;
  const cur = !istNeu ? (auftrag.geraete || [])[index] : null;
  const echteGeraete = (store.db.flotte || []).filter((g) => window.istVermietbar(g));
  const [geraetId, setGeraetId] = auS(cur ? cur.geraetId : '');
  const [von, setVon] = auS(cur ? cur.von : (auftrag.von || store.today));
  const [bis, setBis] = auS(cur ? cur.bis : (auftrag.bis || auftrag.von || store.today));
  const [vonZeit, setVonZeit] = auS(cur ? (cur.vonZeit || '08:00') : '08:00');
  const [bisZeit, setBisZeit] = auS(cur ? (cur.bisZeit || '17:00') : '17:00');
  const datumFehler = bis < von ? 'Enddatum liegt vor dem Startdatum.' : null;
  // exceptId = der Auftrag selbst, damit die übrigen Geräte desselben Auftrags nicht als Konflikt zählen
  const konflikt = (!datumFehler && geraetId) ? store.findConflict(geraetId, von, bis, auftrag.id) : null;
  const konfliktMsg = konflikt ? `${store.geraetById(geraetId)?.name} ist ${F.fmtDate(konflikt.von)}–${F.fmtDate(konflikt.bis)} bereits belegt.` : null;
  const blockiert = !geraetId || !!datumFehler || !!konflikt;
  const speichern = () => {
    if (blockiert) return;
    const entry = { geraetId, von, bis, vonZeit, bisZeit };
    if (istNeu) store.auftragGeraetAdd(auftrag.id, entry); else store.auftragGeraetUpdate(auftrag.id, index, entry);
    toast(istNeu ? 'Gerät hinzugefügt' : 'Gerät aktualisiert'); onClose();
  };
  return (
    <window.UI.Modal open title={istNeu ? 'Weiteres Gerät' : 'Gerät bearbeiten'} onClose={onClose} width={460}
      footer={<>
        <window.UI.Btn variant="ghost" onClick={onClose}>Abbrechen</window.UI.Btn>
        <window.UI.Btn icon="check" onClick={speichern} disabled={blockiert}>Speichern</window.UI.Btn>
      </>}>
      <div className="stack" style={{ gap: 14 }}>
        <window.UI.Field label="Gerät" required>
          <window.UI.Select value={geraetId} onChange={(e) => setGeraetId(e.target.value)}>
            <option value="">— wählen —</option>
            {echteGeraete.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </window.UI.Select>
        </window.UI.Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <window.UI.Field label="Von"><window.UI.Input type="date" value={von} onChange={(e) => setVon(e.target.value)} /></window.UI.Field>
          <window.UI.Field label="Bis"><window.UI.Input type="date" value={bis} onChange={(e) => setBis(e.target.value)} /></window.UI.Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <window.UI.Field label="von Uhr"><window.UI.Input type="time" value={vonZeit} onChange={(e) => setVonZeit(e.target.value)} /></window.UI.Field>
          <window.UI.Field label="bis Uhr"><window.UI.Input type="time" value={bisZeit} onChange={(e) => setBisZeit(e.target.value)} /></window.UI.Field>
        </div>
        {(datumFehler || konfliktMsg) && (
          <div style={{ display: 'flex', gap: 10, padding: '11px 13px', background: 'var(--danger-wash)', borderRadius: 'var(--r)', color: 'var(--danger)', fontSize: 13 }}>
            <Icon name="alert" size={18} style={{ flex: '0 0 auto' }} />{datumFehler || konfliktMsg}
          </div>
        )}
      </div>
    </window.UI.Modal>
  );
}

// ---- Rechnung bearbeiten (nur solange nicht bezahlt/versendet) ----
function EditRechnungModal({ rechnung, store, onSave, onClose }) {
  const F = window.FRIESEN;
  const [datum, setDatum] = auS(rechnung.datum || store.today);
  const [faellig, setFaellig] = auS(rechnung.faellig || store.today);
  const [pos, setPos] = auS((rechnung.positionen || []).map((p) => ({ ...p })));
  const updRow = (i, patch) => setPos((arr) => arr.map((p, j) => j === i ? { ...p, ...patch } : p));
  const addRow = () => setPos((arr) => [...arr, { text: '', einheit: 'Tag', menge: 1, preis: 0 }]);
  const delRow = (i) => setPos((arr) => arr.filter((_, j) => j !== i));
  const total = pos.reduce((s, p) => s + (Number(p.menge) || 0) * (Number(p.preis) || 0), 0);
  const speichern = () => onSave({
    datum, faellig,
    positionen: pos.map((p) => ({ text: p.text, einheit: p.einheit, menge: Number(p.menge) || 0, preis: Number(p.preis) || 0 })),
  });
  return (
    <window.UI.Modal open title={`Rechnung ${rechnung.id} bearbeiten`} onClose={onClose} width={560}
      footer={<>
        <window.UI.Btn variant="ghost" onClick={onClose}>Abbrechen</window.UI.Btn>
        <window.UI.Btn icon="check" onClick={speichern}>Speichern</window.UI.Btn>
      </>}>
      <div className="stack" style={{ gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <window.UI.Field label="Rechnungsdatum"><window.UI.Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></window.UI.Field>
          <window.UI.Field label="Fällig am"><window.UI.Input type="date" value={faellig} onChange={(e) => setFaellig(e.target.value)} /></window.UI.Field>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Positionen</div>
          {pos.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 70px 80px 32px', gap: 6, alignItems: 'center' }}>
              <window.UI.Input value={p.text} onChange={(e) => updRow(i, { text: e.target.value })} placeholder="Bezeichnung" style={{ padding: '8px', fontSize: 13 }} />
              <window.UI.Input type="number" value={p.menge} onChange={(e) => updRow(i, { menge: e.target.value })} title="Menge" placeholder="Menge" style={{ padding: '8px', fontSize: 13, textAlign: 'center' }} />
              <window.UI.Input value={p.einheit} onChange={(e) => updRow(i, { einheit: e.target.value })} title="Einheit" placeholder="Einheit" style={{ padding: '8px', fontSize: 12.5 }} />
              <window.UI.Input type="number" value={p.preis} onChange={(e) => updRow(i, { preis: e.target.value })} title="Einzelpreis €" placeholder="Preis" style={{ padding: '8px', fontSize: 13, textAlign: 'right' }} />
              <window.UI.Btn size="sm" variant="ghost" icon="trash" title="Entfernen" onClick={() => delRow(i)} />
            </div>
          ))}
          <window.UI.Btn size="sm" variant="ghost" icon="plus" onClick={addRow}>Position hinzufügen</window.UI.Btn>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 700 }}>Gesamt: {F.fmtEUR(total)}</div>
      </div>
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
    <div style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, opacity: locked ? 0.7 : 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {onTitle
          ? <button onClick={onTitle} title="Vorschau öffnen" style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left', minWidth: 0 }}>{head}</button>
          : head}
        {status && <span style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>{status}</span>}
      </div>
      {children}
    </div>
  );
}

const belegBtn = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '11px 13px', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' };
const belegLeer = { display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 'var(--r)', background: 'var(--paper-3)', fontSize: 13.5, color: 'var(--muted-2)' };
const auswahlBtn = { display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '15px 16px', border: '1.5px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', textAlign: 'left', color: 'var(--ink)' };

// ---- Mietvertrag-Status am Auftrag ableiten (für Liste & Dashboard) ----
window.mvStatus = function mvStatus(a) {
  if (!a || !a.mietvertrag) return { label: 'Kein Vertrag', cls: 'draft' };
  if (a.mietvertrag.gesperrt) return { label: 'Unterschrieben', cls: 'ok' };
  if (a.mietvertrag.versendetAm) return { label: 'Versendet', cls: 'open' };
  return { label: 'Entwurf', cls: 'warn' };
};

// ---- Mietverträge-Liste (Belege-Tab) ----
window.Screens.mietvertraege = function Mietvertraege({ nav, params = {}, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const [q, setQ] = auS('');
  const REL = ['reserviert', 'abgerechnet', 'bezahlt', 'abgeschlossen'];
  let rows = (store.db.auftraege || []).filter((a) => a.mietvertrag || REL.includes(a.status));
  if (q) { const ql = q.toLowerCase(); rows = rows.filter((a) => (a.id + ' ' + (store.kundeById(a.kundeId)?.name || '') + ' ' + (a.ort || '')).toLowerCase().includes(ql)); }
  rows = [...rows].sort((a, b) => (b.von || '').localeCompare(a.von || ''));
  const SC = window.STATUS_COLOR;
  return (
    <>
      <PageHeader kicker="Belege" title="Mietverträge" mobile={mobile} onMenu={onMenu} />
      <div className="content-pad stack" style={{ gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1.5px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)', maxWidth: 320 }}>
          <Icon name="search" size={16} color="var(--muted)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nr., Kunde oder Ort …" style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: 13.5, flex: 1, background: 'transparent' }} />
        </div>
        <window.UI.Card style={{ padding: 0, overflow: 'hidden' }}>
          <div>
            {rows.map((a) => {
              const k = store.kundeById(a.kundeId);
              const g = store.geraetById(a.geraetId);
              const st = window.mvStatus(a);
              const c = (SC && SC[st.cls]) || SC.draft;
              return (
                <button key={a.id} onClick={() => nav('auftrag', { id: a.id, openMv: 1 })} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '14px 16px', border: 'none', borderBottom: '1px solid var(--paper-3)', background: 'transparent', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                  {g && <window.GeraetBadge geraet={g} size={36} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k?.name || '—'}</div>
                        <div className="num" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{a.id} · {F.fmtDate(a.von)}{a.bis !== a.von ? '–' + F.fmtDate(a.bis) : ''}</div>
                      </div>
                      <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 2, background: c.bg, color: c.fg, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <span style={{ width: 6, height: 6, borderRadius: 1, background: c.fg }} />{st.label}
                      </span>
                    </div>
                    {a.ort && <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="pin" size={12} /> {a.ort}</div>}
                  </div>
                  <Icon name="chevron" size={16} color="var(--muted-2)" style={{ flex: '0 0 auto' }} />
                </button>
              );
            })}
            {rows.length === 0 && <window.UI.Empty icon="file" title="Keine Mietverträge" sub="Sobald Aufträge reserviert sind, erscheinen sie hier zum Unterschreiben." />}
          </div>
        </window.UI.Card>
      </div>
    </>
  );
};

/* ============ Verlaufsbericht (Aktivitäts-Log) ============ */
window.VerlaufTimeline = function VerlaufTimeline({ events, store, nav }) {
  const VFARBE = { anfrage: '#6B6B66', auftrag: '#141414', angebot: '#2B6CB0', mietvertrag: '#E0AC00', status: '#141414', rueckgabe: '#F39222', rechnung: '#2F7D3A' };
  const fmtTs = (ts) => { try { const d = new Date(ts); const p = (n) => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ' Uhr'; } catch (e) { return ''; } };
  if (!events || !events.length) return <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Noch keine Einträge.</div>;
  return (
    <div className="stack" style={{ gap: 0 }}>
      {events.map((e, i) => (
        <div key={e.id || i} style={{ display: 'flex', gap: 11, padding: '10px 0', borderTop: i ? '1px solid var(--paper-3)' : 'none' }}>
          <span style={{ flex: '0 0 auto', width: 10, height: 10, borderRadius: 5, background: VFARBE[e.typ] || 'var(--muted-2)', marginTop: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{e.text}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
              {fmtTs(e.ts)}
              {e.auftragId && nav ? <> · <button onClick={() => nav('auftrag', { id: e.auftragId })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink)', font: 'inherit', fontSize: 11.5, textDecoration: 'underline' }}>{e.auftragId}</button></> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Globale Verlauf-Seite entfernt (Runde 7): der globale Aktivitäts-Log wurde mit der Zeit
// unübersichtlich. Die Verlaufs-Timeline bleibt pro Auftrag im Auftrag-Detail erhalten
// (window.VerlaufTimeline, oben) und wird weiter aus db.verlauf gespeist.
