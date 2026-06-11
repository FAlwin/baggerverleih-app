/* ============ SCREEN: Beleg-Editor — Angebot / Rechnung / Mietvertrag ============
   Erstellen UND Bearbeiten teilen denselben reichen Erfassungs-Flow wie „Neue Anfrage":
   Multi-Gerät-Picker, Verfügbarkeits-Kalender, Stunden-/Staffel-Achse und Zusatzleistungen
   (window.GeraeteErfassung). Positionen werden aus den Geräten abgeleitet (auto) und lassen
   sich zusätzlich manuell ergänzen, verschieben, bearbeiten.

   params:
     mode: 'angebot' | 'rechnung'         (Neuanlage)
     editKind: 'angebot'|'rechnung'|'mietvertrag', editId, editAuftragId   (Bearbeiten)
     auftragId?, kundeId?, anfrageId?, prefill?  (Vorbefüllung)
*/
window.Screens = window.Screens || {};
const { useState: nS, useMemo: nM, useRef: nR, useEffect: nE } = React;

window.Screens['rechnung-neu'] = function RechnungNeu({ nav, params = {}, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();

  // ----- Modus (Neu vs. Bearbeiten) -----
  const editKind = params.editKind || null;
  const isEdit = !!editKind;
  const kind = editKind || (params.mode === 'angebot' ? 'angebot' : 'rechnung');
  const isAngebot = kind === 'angebot';
  const isMV = kind === 'mietvertrag';

  // Anfrage-/Beleg-Prefill
  const pf = params.prefill || null;

  // ----- Kunde -----
  const matchedKunde = pf ? store.db.kunden.find((k) =>
    (pf.phone && k.phone && k.phone.replace(/\s/g, '') === pf.phone.replace(/\s/g, '')) ||
    (pf.email && k.email && k.email.toLowerCase() === pf.email.toLowerCase()) ||
    (pf.name && k.name.toLowerCase() === pf.name.toLowerCase())
  ) : null;
  const [kundeId, setKundeId] = nS(pf?.kundeId || matchedKunde?.id || params.kundeId || '');
  const [neuerKunde, setNeu] = nS(!matchedKunde && !pf?.kundeId && !params.kundeId && !!pf && !!pf.name);
  const [nk, setNk] = nS(pf && pf.name ? {
    name: pf.name || '', kontakt: '', street: '', city: pf.ort || '',
    phone: pf.phone || '', email: pf.email || '', typ: 'Privat',
  } : { name: '', kontakt: '', street: '', city: '', phone: '', email: '', typ: 'Gewerbe' });

  const [datum, setDatum] = nS(pf?.datum || store.today);
  const [faellig, setFaellig] = nS(pf?.faellig || window.addDays(store.today, (store.db.settings && store.db.settings.zahlungszielTage) || 14));
  const [ort, setOrt] = nS(pf?.ort || '');
  // Mietvertrag-Begleitung nur bei Rechnungs-Neuanlage
  const [mietvertrag, setMV] = nS(false);

  // ----- Geräteerfassung (rows) — wie bei „Neue Anfrage" -----
  const initRows = () => {
    if (pf && pf.geraete && pf.geraete.length) return pf.geraete.map((e) => window.entryToRow(store, e));
    if (pf && pf.geraetId) return [{ ...window.LEER_ROW(), geraetId: pf.geraetId, von: pf.von || '', bis: pf.bis || pf.von || '' }];
    return [window.LEER_ROW()];
  };
  const [rows, setRows] = nS(initRows);
  const [activeIdx, setActiveIdx] = nS(0);
  const rowsTouched = nR(false);
  const setRowsTouched = (updater) => { rowsTouched.current = true; setRows(updater); };

  const geraeteEntries = nM(
    () => rows.filter((r) => window.rowOk(store, r)).map((r) => window.rowToEntry(store, r)),
    [rows, store.db.flotte]
  );
  const ent0 = geraeteEntries[0] || null;
  const angebotVon = ent0 ? ent0.von : (pf?.von || '');
  const angebotBis = ent0 ? ent0.bis : (pf?.bis || '');
  const angebotGeraetId = ent0 ? ent0.geraetId : (pf?.geraetId || '');
  const geraeteSumme = rows.reduce((a, r) => a + (window.rowOk(store, r) ? window.blockBetrag(store, r) : 0), 0);

  // ----- Positionen: aus Geräten abgeleitet (auto) + manuell (auto:false) -----
  const initPos = () => (pf && pf.positionen && pf.positionen.length) ? pf.positionen.map((p) => ({ ...p, auto: false })) : [];
  const [pos, setPos] = nS(initPos);
  const geraeteKey = nM(() => JSON.stringify(geraeteEntries), [geraeteEntries]);
  nE(() => {
    if (!rowsTouched.current) return;  // beim Öffnen vorhandene Positionen NICHT überschreiben
    setPos((arr) => {
      const manual = arr.filter((p) => !p.auto);
      const derived = (window.positionenAusGeraete ? window.positionenAusGeraete({ geraete: geraeteEntries }, store) : []).map((p) => ({ ...p, auto: true }));
      return [...derived, ...manual];
    });
  }, [geraeteKey]);

  // Manuelle Positionen
  const anbauGeraete = nM(() => store.db.flotte.filter((g) => g.kat === 'Anbau'), [store.db.flotte]);
  const addAnbau = (gid) => {
    const g = store.db.flotte.find((x) => x.id === gid); if (!g) return;
    const tar = (g.tarif || []).find((t) => t.preis > 0) || (g.tarif || [])[0] || { einheit: 'inklusive', preis: 0 };
    setPos((arr) => [...arr, { text: g.name, einheit: tar.einheit, menge: 1, preis: tar.preis, auto: false }]);
  };
  const addService = (pid) => {
    const p = store.db.preisliste.find((x) => x.id === pid); if (!p) return;
    setPos((arr) => [...arr, { text: p.geraet, einheit: p.einheit, menge: 1, preis: p.preis, auto: false }]);
  };
  const addFree = () => setPos((arr) => [...arr, { text: '', einheit: 'Tag', menge: 1, preis: 0, auto: false }]);
  const updatePos = (i, patch) => setPos((arr) => arr.map((p, j) => j === i ? { ...p, ...patch, auto: false } : p));
  const removePos = (i) => setPos((arr) => arr.filter((_, j) => j !== i));
  const movePos = (i, dir) => setPos((arr) => {
    const j = i + dir; if (j < 0 || j >= arr.length) return arr;
    const c = arr.map((p) => ({ ...p, auto: false }));
    const tmp = c[i]; c[i] = c[j]; c[j] = tmp; return c;
  });

  const total = pos.reduce((a, p) => a + (Number(p.menge) || 0) * (Number(p.preis) || 0), 0);

  // ----- Gültig bis (Angebot): Neuanlage automatisch (mit Vorlauf-Deckel → dringend); Bearbeiten frei editierbar -----
  const _vorlauf = (store.db.settings && store.db.settings.angebotVorlaufTage) || 0;
  const _gTage = (store.db.settings && store.db.settings.angebotGueltigTage) || 14;
  const gueltigNormal = window.addDays(store.today, _gTage);
  const gueltigCap = (isAngebot && angebotVon) ? window.addDays(angebotVon, -_vorlauf) : null;
  const autoGueltig = (gueltigCap && gueltigCap < gueltigNormal) ? gueltigCap : gueltigNormal;
  const [gueltigEdit, setGueltigEdit] = nS(pf?.gueltigBis || '');
  const gueltigBis = isEdit ? (gueltigEdit || autoGueltig) : autoGueltig;
  const gueltigGekuerzt = !isEdit && !!(gueltigCap && gueltigCap < gueltigNormal);
  const dringend = isAngebot && (gueltigGekuerzt || gueltigBis <= store.today);

  // Mietzeit (Begleit-MV bei Rechnung / MV-Bearbeitung)
  const mietVon = angebotVon || pf?.von || store.today;
  const mietBis = angebotBis || pf?.bis || window.addDays(store.today, 1);

  const kundeObj = neuerKunde ? { ...nk, id: '__neu' } : store.kundeById(kundeId);
  const draft = {
    id: pf?.belegId || '(Entwurf)', kundeId: kundeObj?.id || '', datum, faellig,
    positionen: pos.length ? pos.map((p) => ({ text: p.text, einheit: p.einheit, menge: Number(p.menge) || 0, preis: Number(p.preis) || 0 })) : [{ text: 'Noch keine Position', einheit: '—', menge: 0, preis: 0 }],
    status: 'offen',
  };
  const kundeOk = kundeObj && (neuerKunde ? nk.name && nk.city : kundeId);
  const canSave = kundeOk && pos.length > 0 && total > 0;

  const persistKunde = () => neuerKunde ? store.addKunde(nk) : kundeId;

  const save = () => {
    const positionen = draft.positionen;
    // ----- Bearbeiten -----
    if (isEdit) {
      const auId = params.editAuftragId || params.auftragId;
      if (rowsTouched.current && auId && geraeteEntries.length && store.setAuftragGeraete) store.setAuftragGeraete(auId, geraeteEntries);
      if (kind === 'angebot') {
        const wasAb = pf && pf.gueltigBis && pf.gueltigBis < store.today;
        store.updateAngebot(params.editId, { positionen, betrag: total, von: angebotVon, bis: angebotBis, geraetId: angebotGeraetId, ort, gueltigBis, ...(wasAb && gueltigBis >= store.today ? { status: 'offen' } : {}) });
        toast('Angebot aktualisiert');
      } else if (kind === 'rechnung') {
        store.updateRechnung(params.editId, { positionen });
        toast('Rechnung aktualisiert');
      } else {
        store.mietvertragUpdate(auId, { positionen, von: mietVon, bis: mietBis });
        toast('Mietvertrag aktualisiert');
      }
      nav('auftrag', { id: auId });
      return;
    }
    // ----- Neuanlage -----
    const kId = persistKunde();
    const N = (store.db.settings && store.db.settings.nummern) || {};
    const akr = N.auftrag || { prefix: 'AU', start: 1 };
    const auftragId = params.auftragId || store.nextId(akr.prefix, store.db.auftraege, akr.start);
    const neuerAuftrag = params.auftragId ? null : {
      kundeId: kId, geraete: geraeteEntries,
      geraetId: angebotGeraetId, von: angebotVon || datum, bis: angebotBis || angebotVon || datum,
      vonZeit: ent0 ? ent0.vonZeit : '08:00', bisZeit: ent0 ? ent0.bisZeit : '17:00', ort,
    };
    // Bei bestehendem Auftrag die geänderten Geräte übernehmen
    if (params.auftragId && rowsTouched.current && geraeteEntries.length && store.setAuftragGeraete) store.setAuftragGeraete(params.auftragId, geraeteEntries);
    if (isAngebot) {
      store.belegAnlegen({ kind: 'angebot', auftragId, neuerAuftrag, anfrageId: params.anfrageId,
        belegData: { kundeId: kId, datum, gueltigBis, positionen, von: angebotVon, bis: angebotBis, geraetId: angebotGeraetId, ort, dringend } });
      toast('Angebot erstellt'); nav('auftrag', { id: auftragId });
    } else {
      store.belegAnlegen({ kind: 'rechnung', auftragId, neuerAuftrag,
        belegData: { kundeId: kId, datum, faellig, positionen, mietvertrag, mietzeit: mietvertrag ? `${F.fmtDate(mietVon)} – ${F.fmtDate(mietBis)}` : null } });
      toast('Rechnung erstellt'); nav('auftrag', { id: auftragId });
    }
  };

  const [previewRef, scale] = window.useFitScale ? window.useFitScale(793) : [null, 0.55];
  const previewDoc = isMV && kundeObj
    ? <window.Print.MietvertragDoc rechnung={{ ...draft, id: pf?.belegId || 'MV (Entwurf)' }} kunde={kundeObj} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} mietzeit={`${F.fmtDate(mietVon)} – ${F.fmtDate(mietBis)}`} />
    : (!isAngebot && mietvertrag && kundeObj
      ? <window.Print.MietvertragDoc rechnung={{ ...draft, id: 'MV (Entwurf)' }} kunde={kundeObj} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} mietzeit={`${F.fmtDate(mietVon)} – ${F.fmtDate(mietBis)}`} />
      : <window.Print.RechnungDoc rechnung={draft} kunde={kundeObj || { name: 'Kunde wählen …', street: '', city: '', typ: '' }} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} />);

  const titel = isEdit
    ? (isMV ? 'Mietvertrag bearbeiten' : (isAngebot ? 'Angebot ' + (pf?.belegId || '') + ' bearbeiten' : 'Rechnung ' + (pf?.belegId || '') + ' bearbeiten'))
    : (isAngebot ? 'Neues Angebot' : 'Neue Rechnung');
  const kicker = isEdit ? 'Bearbeiten' : (isAngebot ? 'Neues Angebot' : 'Neue Rechnung');
  const saveLabel = isEdit ? 'Speichern' : (isAngebot ? 'Angebot erstellen' : 'Rechnung erstellen');

  return (
    <>
      <PageHeader kicker={kicker} title={titel} mobile={mobile} onMenu={onMenu}>
        {!isEdit && !isAngebot && <window.UI.Btn variant="ghost" onClick={() => nav('rechnung-neu', { ...params, mode: 'angebot' })} disabled={!canSave}>Als Angebot</window.UI.Btn>}
        <window.UI.Btn icon="check" onClick={save} disabled={!canSave}>{saveLabel}</window.UI.Btn>
      </PageHeader>

      <div className="content-pad" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          {/* Prefill-Banner */}
          {pf && !isEdit && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'var(--yellow-wash)', borderRadius: 'var(--r)', border: '1px solid var(--yellow)', fontSize: 13 }}>
              <Icon name="bell" size={17} color="var(--yellow-deep)" style={{ flex: '0 0 auto', marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700 }}>{params.auftragId ? `Aus Auftrag ${params.auftragId} vorausgefüllt` : 'Aus Anfrage vorausgefüllt'}</div>
                <div style={{ color: 'var(--muted)', marginTop: 2 }}>{matchedKunde ? `Bestehender Kunde: ${matchedKunde.name}` : params.kundeId || pf?.kundeId ? `Kunde übernommen` : 'Kein passender Kunde gefunden — Neuanlage vorausgefüllt.'}</div>
              </div>
            </div>
          )}

          {/* Kunde */}
          <window.UI.Card style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Kunde</h2>
              <button onClick={() => { setNeu((v) => !v); setKundeId(''); }} style={{ font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name={neuerKunde ? 'kunden' : 'plus'} size={15} /> {neuerKunde ? 'Aus Liste wählen' : 'Neuer Kunde'}
              </button>
            </div>
            {!neuerKunde ? (
              <window.UI.Field label="Kunde auswählen" required>
                <window.UI.Select value={kundeId} onChange={(e) => setKundeId(e.target.value)}>
                  <option value="">— bitte wählen —</option>
                  {store.db.kunden.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.city}</option>)}
                </window.UI.Select>
              </window.UI.Field>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                <div className="form-2">
                  <window.UI.Field label="Name / Firma" required><window.UI.Input value={nk.name} onChange={(e) => setNk({ ...nk, name: e.target.value })} placeholder="z. B. Mustermann GmbH" /></window.UI.Field>
                  <window.UI.Field label="Ansprechpartner"><window.UI.Input value={nk.kontakt} onChange={(e) => setNk({ ...nk, kontakt: e.target.value })} /></window.UI.Field>
                </div>
                <window.UI.Field label="Straße & Nr."><window.UI.Input value={nk.street} onChange={(e) => setNk({ ...nk, street: e.target.value })} /></window.UI.Field>
                <div className="form-2">
                  <window.UI.Field label="PLZ & Ort" required><window.UI.Input value={nk.city} onChange={(e) => setNk({ ...nk, city: e.target.value })} placeholder="53797 Lohmar" /></window.UI.Field>
                  <window.UI.Field label="Telefon"><window.UI.Input value={nk.phone} onChange={(e) => setNk({ ...nk, phone: e.target.value })} /></window.UI.Field>
                </div>
              </div>
            )}
          </window.UI.Card>

          {/* Geräte & Zeitraum — reiche Erfassung wie bei „Neue Anfrage" */}
          <window.UI.Card style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Geräte & Zeitraum</h2>
              {geraeteSumme > 0 && <span className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>{F.fmtEUR(geraeteSumme)}</span>}
            </div>
            <window.GeraeteErfassung store={store} F={F} rows={rows} setRows={setRowsTouched} activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
            <window.UI.Field label="Einsatzort (Adresse)" style={{ marginTop: 14 }}>
              <window.UI.Input value={ort} onChange={(e) => setOrt(e.target.value)} placeholder="z. B. Musterstraße 5, 53797 Lohmar" />
            </window.UI.Field>
          </window.UI.Card>

          {/* Positionen */}
          <window.UI.Card style={{ padding: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Positionen</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Aus den Geräten oben automatisch erzeugt · zusätzlich manuelle Zeilen möglich (alle editier- und verschiebbar).</div>
            <div className="stack" style={{ gap: 8 }}>
              {pos.map((p, i) => (
                <div key={i} style={mobile
                  ? { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 86px', gap: 6, alignItems: 'center' }
                  : { display: 'grid', gridTemplateColumns: '1fr 60px 100px 90px 86px', gap: 7, alignItems: 'center' }}>
                  <window.UI.Input value={p.text} onChange={(e) => updatePos(i, { text: e.target.value })} placeholder="Beschreibung" style={{ padding: '8px 10px', fontSize: 13, gridColumn: mobile ? '1 / -1' : 'auto' }} />
                  <window.UI.Input type="number" value={p.menge} onChange={(e) => updatePos(i, { menge: e.target.value })} title="Menge" placeholder="Menge" style={{ padding: '8px 8px', fontSize: 13, textAlign: 'center' }} />
                  <window.UI.Input value={p.einheit} onChange={(e) => updatePos(i, { einheit: e.target.value })} title="Einheit" placeholder="Einheit" style={{ padding: '8px 8px', fontSize: 12.5 }} />
                  <window.UI.Input type="number" value={p.preis} onChange={(e) => updatePos(i, { preis: e.target.value })} title="Einzelpreis €" placeholder="Preis" style={{ padding: '8px 8px', fontSize: 13, textAlign: 'right' }} />
                  <div style={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <window.UI.IconBtn name="chevron" size={13} disabled={i === 0} onClick={() => movePos(i, -1)} title="nach oben" style={{ width: 26, height: 32, transform: 'rotate(-90deg)' }} />
                    <window.UI.IconBtn name="chevron" size={13} disabled={i === pos.length - 1} onClick={() => movePos(i, 1)} title="nach unten" style={{ width: 26, height: 32, transform: 'rotate(90deg)' }} />
                    <window.UI.IconBtn name="trash" size={15} onClick={() => removePos(i)} title="Entfernen" style={{ width: 28, height: 32 }} />
                  </div>
                </div>
              ))}
              {pos.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', padding: '6px 0' }}>Noch keine Positionen. Oben ein Gerät erfassen oder unten eine Position hinzufügen ↓</div>}
            </div>

            {/* Manuelle Zusatz-Positionen */}
            <div style={{ marginTop: 16, padding: '14px', background: 'var(--paper-2)', borderRadius: 'var(--r)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {anbauGeraete.length > 0 && (
                <div>
                  <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 10 }}>Anbaugeräte &amp; Zubehör</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {anbauGeraete.map((g) => {
                      const tar = (g.tarif || []).find((t) => t.preis > 0) || (g.tarif || [])[0];
                      return (
                        <button key={g.id} onClick={() => addAnbau(g.id)} style={{ fontSize: 12, padding: '5px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                          + {g.name}{tar && tar.preis > 0 ? ' · ' + F.fmtEUR(tar.preis) : (tar && tar.einheit === 'inklusive' ? ' · inkl.' : '')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={anbauGeraete.length > 0 ? { borderTop: '1px solid var(--line)', paddingTop: 14 } : {}}>
                <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 10 }}>Sonstige Servicepositionen</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {store.db.preisliste.filter((p) => p.preis > 0).map((p) => (
                    <button key={p.id} onClick={() => addService(p.id)} style={{ fontSize: 12, padding: '5px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                      + {p.geraet.replace('Transportpauschale ', 'Transport ').replace('Reinigungspauschale', 'Reinigung')}
                    </button>
                  ))}
                  <button onClick={addFree} style={{ fontSize: 12, padding: '5px 10px', border: '1px dashed var(--line)', borderRadius: 'var(--r)', background: 'transparent', cursor: 'pointer', font: 'inherit', color: 'var(--muted)' }}>+ Freie Position</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, padding: '12px 14px', background: 'var(--ink)', borderRadius: 'var(--r)', color: '#fff' }}>
              <span style={{ fontWeight: 600 }}>Gesamt <span style={{ color: 'var(--on-dark-muted)', fontWeight: 400, fontSize: 12 }}>· §19 UStG</span></span>
              <span className="num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--yellow)' }}>{F.fmtEUR(total)}</span>
            </div>
          </window.UI.Card>

          {/* Konditionen */}
          <window.UI.Card style={{ padding: 18 }}>
            <div className="form-2">
              <window.UI.Field label={isAngebot ? 'Datum (automatisch heute)' : 'Datum'}><window.UI.Input type="date" value={datum} disabled={isAngebot && !isEdit} onChange={(e) => setDatum(e.target.value)} /></window.UI.Field>
              {isAngebot ? (
                <window.UI.Field label={isEdit ? 'Gültig bis' : 'Gültig bis (automatisch)'}>
                  <window.UI.Input type="date" value={gueltigBis} disabled={!isEdit} onChange={(e) => setGueltigEdit(e.target.value)} />
                </window.UI.Field>
              ) : !isMV ? (
                <window.UI.Field label="Fällig bis"><window.UI.Input type="date" value={faellig} onChange={(e) => setFaellig(e.target.value)} /></window.UI.Field>
              ) : <div />}
            </div>
            {isAngebot && gueltigGekuerzt && (
              <div style={{ display: 'flex', gap: 9, padding: '10px 12px', background: 'var(--warn-wash)', borderRadius: 'var(--r)', fontSize: 12.5, marginTop: 12 }}>
                <Icon name="alert" size={16} color="var(--warn)" style={{ flex: '0 0 auto', marginTop: 1 }} />
                <span><b>Verkürzte Gültigkeit:</b> Wegen des nahen Arbeitsbeginns ({F.fmtDate(angebotVon)}) endet die Gültigkeit schon am <b>{F.fmtDate(gueltigBis)}</b> ({_vorlauf} Tage vorher) statt nach {_gTage} Tagen. Das Angebot wird beim Versand als <b>dringend</b> markiert.</span>
              </div>
            )}
            {!isAngebot && !isMV && !isEdit && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer' }}>
                <span onClick={() => setMV((v) => !v)} style={{ width: 42, height: 24, borderRadius: 12, background: mietvertrag ? 'var(--yellow)' : 'var(--line-2)', position: 'relative', transition: '.15s', flex: '0 0 auto' }}>
                  <span style={{ position: 'absolute', top: 3, left: mietvertrag ? 21 : 3, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: '.15s', boxShadow: '0 1px 2px rgba(0,0,0,.3)' }} />
                </span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Mietvertrag gleichzeitig erzeugen</span>
              </label>
            )}
            {(isMV || (!isAngebot && mietvertrag && !isEdit)) && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 12 }}>Mietzeit: <b>{F.fmtDate(mietVon)} – {F.fmtDate(mietBis)}</b> (aus der Gerätewahl oben).</div>
            )}
          </window.UI.Card>
        </div>

        {/* Live-Vorschau */}
        {!mobile && (
          <div ref={previewRef} style={{ position: 'sticky', top: 92, background: 'var(--paper-3)', borderRadius: 'var(--r-lg)', padding: 16, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ width: 793 * scale, height: 1122 * scale, flex: '0 0 auto' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 793, boxShadow: 'var(--shadow-lg)' }}>{previewDoc}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
