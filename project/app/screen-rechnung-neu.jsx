/* ============ SCREEN: Neue Rechnung / Neues Angebot (params.mode) ============ */
window.Screens = window.Screens || {};
const { useState: nS, useMemo: nM, useRef: nR, useEffect: nE } = React;

window.Screens['rechnung-neu'] = function RechnungNeu({ nav, params = {}, mobile, onMenu, PageHeader }) {
  const store = window.useStore();
  const F = window.FRIESEN;
  const toast = window.UI.useToast();
  const mode = params.mode === 'angebot' ? 'angebot' : 'rechnung';
  const isAngebot = mode === 'angebot';

  // Anfrage-Prefill: automatisch Felder belegen
  const pf = params.prefill || null;

  // Kunde: aus Anfrage abgleichen oder vorausfüllen
  const matchedKunde = pf ? store.db.kunden.find((k) =>
    (pf.phone && k.phone && k.phone.replace(/\s/g,'') === pf.phone.replace(/\s/g,'')) ||
    (pf.email && k.email && k.email.toLowerCase() === pf.email.toLowerCase()) ||
    (pf.name && k.name.toLowerCase() === pf.name.toLowerCase())
  ) : null;

  const [kundeId, setKundeId] = nS(matchedKunde?.id || params.kundeId || '');
  const [neuerKunde, setNeu] = nS(!matchedKunde && !params.kundeId && !!pf);
  const [nk, setNk] = nS(pf ? {
    name: pf.name || '', kontakt: '', street: '', city: pf.ort || '',
    phone: pf.phone || '', email: pf.email || '', typ: 'Privat',
  } : { name: '', kontakt: '', street: '', city: '', phone: '', email: '', typ: 'Gewerbe' });

  const [datum, setDatum] = nS(store.today);
  const [faellig, setFaellig] = nS(window.addDays(store.today, (store.db.settings && store.db.settings.zahlungszielTage) || 14));
  const [gueltigBis, setGueltig] = nS(pf?.von ? pf.von : window.addDays(store.today, 14));
  const [mietvertrag, setMV] = nS(false);
  const [mietVon, setMietVon] = nS(pf?.von || store.today);
  const [mietBis, setMietBis] = nS(pf?.bis || window.addDays(store.today, 1));

  // Positionen — aus Anfrage vorausfüllen (im Angebot übernimmt das die Tagespreis-Automatik)
  const initPos = () => {
    if (mode === 'angebot') return [];
    if (!pf?.geraetId) return [];
    const g = store.db.flotte.find((x) => x.id === pf.geraetId);
    if (!g || !g.tarif?.length) return [];
    const t = g.tarif.find((r) => r.preis > 0) || g.tarif[0];
    return [{ text: g.name, einheit: t.einheit, menge: 1, preis: t.preis }];
  };
  const [pos, setPos] = nS(initPos);

  // Angebot-Metadaten aus Anfrage — Zeitraum als Start + Dauer (Ende berechnet)
  const [angebotVon, setAngebotVon] = nS(pf?.von || '');
  const [angebotVonZeit, setAngebotVonZeit] = nS(pf?.vonZeit || '08:00');
  const [dauer, setDauer] = nS(pf?.von && pf?.bis ? window.tageZwischen(pf.von, pf.bis) : 1);
  const [dauerEinheit, setDauerEinheit] = nS('Tage');
  const angebotEnde = window.berechneEnde(angebotVon, angebotVonZeit, dauer, dauerEinheit);
  const angebotBis = angebotEnde.bis;
  const [angebotGeraetId, setAngebotGeraetId] = nS(pf?.geraetId || '');
  const [angebotOrt, setAngebotOrt] = nS(pf?.ort || '');

  // Kalender-Abgleich: ist der gewünschte Zeitraum für das Gerät frei?
  const konflikt = (isAngebot && angebotGeraetId && angebotVon)
    ? store.findConflict(angebotGeraetId, angebotVon, angebotBis, params.auftragId) : null;
  const freierVorschlag = nM(() => {
    if (!konflikt) return null;
    let von = angebotVon, c = konflikt, i = 0;
    while (c && i < 120) {
      von = window.addDays(c.bis, 1);
      const e = window.berechneEnde(von, angebotVonZeit, dauer, dauerEinheit);
      c = store.findConflict(angebotGeraetId, von, e.bis, params.auftragId);
      i++;
    }
    return c ? null : { von };
  }, [konflikt, angebotGeraetId, angebotVon, angebotVonZeit, dauer, dauerEinheit]);

  // Position-Picker state
  const [pickerGeraet, setPickerGeraet] = nS('');
  const [pickerEinheit, setPickerEinheit] = nS('');
  const selectedGeraet = nM(() => store.db.flotte.find((g) => g.id === pickerGeraet), [pickerGeraet, store.db.flotte]);
  const einheitOptions = nM(() => {
    if (!selectedGeraet || !selectedGeraet.tarif) return [];
    return selectedGeraet.tarif.filter((t) => t.preis > 0 || t.einheit === 'inklusive');
  }, [selectedGeraet]);

  const addFromGeraet = () => {
    if (!selectedGeraet || !pickerEinheit) return;
    const tarRow = selectedGeraet.tarif.find((t) => t.einheit === pickerEinheit);
    if (!tarRow) return;
    setPos((p) => [...p, { text: selectedGeraet.name, einheit: tarRow.einheit, menge: 1, preis: tarRow.preis }]);
    setPickerGeraet(''); setPickerEinheit('');
  };

  const addService = (pid) => {
    const p = store.db.preisliste.find((x) => x.id === pid);
    if (!p) return;
    setPos((arr) => [...arr, { text: p.geraet, einheit: p.einheit, menge: 1, preis: p.preis }]);
  };
  const addFree = () => setPos((arr) => [...arr, { text: '', einheit: 'Tag', menge: 1, preis: 0 }]);
  const updatePos = (i, patch) => setPos((arr) => arr.map((p, j) => j === i ? { ...p, ...patch, auto: false } : p));

  // Tagespreis × Dauer: im Angebot automatisch eine Position aus Gerät + Dauer (Tage) vorbefüllen.
  // Manuell bearbeitete Positionen (auto:false) bleiben erhalten.
  nE(() => {
    if (!isAngebot) return;
    const g = store.db.flotte.find((x) => x.id === angebotGeraetId);
    const t = g && g.tarif && (g.tarif.find((r) => r.einheit === 'Tag') || g.tarif.find((r) => r.preis > 0));
    setPos((arr) => {
      const rest = arr.filter((p) => !p.auto);
      if (!g || !t || dauerEinheit !== 'Tage') return rest;
      return [{ text: g.name, einheit: 'Tag', menge: Math.max(1, Number(dauer) || 1), preis: t.preis, auto: true }, ...rest];
    });
  }, [angebotGeraetId, dauer, dauerEinheit, isAngebot]);
  const removePos = (i) => setPos((arr) => arr.filter((_, j) => j !== i));
  const total = pos.reduce((a, p) => a + (Number(p.menge) || 0) * (Number(p.preis) || 0), 0);

  const kundeObj = neuerKunde ? { ...nk, id: '__neu' } : store.kundeById(kundeId);
  const draft = {
    id: '(Entwurf)', kundeId: kundeObj?.id || '', datum, faellig,
    positionen: pos.length ? pos.map((p) => ({ text: p.text, einheit: p.einheit, menge: Number(p.menge) || 0, preis: Number(p.preis) || 0 })) : [{ text: 'Noch keine Position', einheit: '—', menge: 0, preis: 0 }],
    status: 'offen',
  };
  const canSave = kundeObj && (neuerKunde ? nk.name && nk.city : kundeId) && pos.length > 0 && total > 0;

  const persistKunde = () => {
    if (neuerKunde) { return store.addKunde(nk); }
    return kundeId;
  };

  const save = () => {
    const kId = persistKunde();
    // Jeder Beleg gehört zu einem Auftrag. Ohne Kontext legen wir einen schlanken Auftrag an –
    // die Auftrags-ID berechnen wir vorab (zuverlässig), Anlegen + Verknüpfen passiert atomar.
    const N = (store.db.settings && store.db.settings.nummern) || {};
    const akr = N.auftrag || { prefix: 'AU', start: 1 };
    const auftragId = params.auftragId || store.nextId(akr.prefix, store.db.auftraege, akr.start);
    const neuerAuftrag = params.auftragId ? null : {
      kundeId: kId,
      geraetId: (isAngebot ? angebotGeraetId : pf?.geraetId) || '',
      von: (isAngebot ? (angebotVon || datum) : (mietvertrag ? mietVon : datum)),
      bis: (isAngebot ? (angebotBis || angebotVon || datum) : (mietvertrag ? mietBis : datum)),
      ort: (isAngebot ? angebotOrt : (pf?.ort || '')),
    };
    if (isAngebot) {
      store.belegAnlegen({ kind: 'angebot', auftragId, neuerAuftrag, anfrageId: params.anfrageId,
        belegData: { kundeId: kId, datum, gueltigBis, positionen: draft.positionen, von: angebotVon, bis: angebotBis, geraetId: angebotGeraetId, ort: angebotOrt } });
      toast('Angebot erstellt'); nav('auftrag', { id: auftragId });
    } else {
      store.belegAnlegen({ kind: 'rechnung', auftragId, neuerAuftrag,
        belegData: { kundeId: kId, datum, faellig, positionen: draft.positionen, mietvertrag, mietzeit: mietvertrag ? `${F.fmtDate(mietVon)} – ${F.fmtDate(mietBis)}` : null } });
      toast('Rechnung erstellt'); nav('auftrag', { id: auftragId });
    }
  };

  const [previewRef, scale] = window.useFitScale ? window.useFitScale(793) : [null, 0.55];

  const previewDoc = !isAngebot && mietvertrag && kundeObj
    ? <window.Print.MietvertragDoc rechnung={{ ...draft, id: 'MV (Entwurf)' }} kunde={kundeObj} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} mietzeit={`${F.fmtDate(mietVon)} – ${F.fmtDate(mietBis)}`} />
    : <window.Print.RechnungDoc rechnung={draft} kunde={kundeObj || { name: 'Kunde wählen …', street: '', city: '', typ: '' }} company={store.db.company} fmtEUR={F.fmtEUR} fmtDate={F.fmtDate} />;

  const kicker = isAngebot ? 'Neues Angebot' : 'Neue Rechnung';

  return (
    <>
      <PageHeader kicker={kicker} title={isAngebot ? 'Neues Angebot' : 'Neue Rechnung'} mobile={mobile} onMenu={onMenu}>
        {!isAngebot && <window.UI.Btn variant="ghost" onClick={() => nav('rechnung-neu', { ...params, mode: 'angebot' })} disabled={!canSave}>Als Angebot</window.UI.Btn>}
        <window.UI.Btn icon="check" onClick={save} disabled={!canSave}>{isAngebot ? 'Angebot erstellen' : 'Rechnung erstellen'}</window.UI.Btn>
      </PageHeader>

      <div className="content-pad" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          {/* Prefill-Banner */}
          {pf && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'var(--yellow-wash)', borderRadius: 'var(--r)', border: '1px solid var(--yellow)', fontSize: 13 }}>
              <Icon name="bell" size={17} color="var(--yellow-deep)" style={{ flex: '0 0 auto', marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700 }}>{params.auftragId ? `Aus Auftrag ${params.auftragId} vorausgefüllt` : 'Aus Anfrage vorausgefüllt'}</div>
                <div style={{ color: 'var(--muted)', marginTop: 2 }}>{matchedKunde ? `Bestehender Kunde: ${matchedKunde.name}` : params.kundeId ? `Kunde übernommen` : 'Kein passender Kunde gefunden — Neuanlage vorausgefüllt.'}</div>
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

          {/* Positionen */}
          <window.UI.Card style={{ padding: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Positionen</h2>
            <div className="stack" style={{ gap: 8 }}>
              {pos.map((p, i) => (
                <div key={i} style={mobile
                  ? { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', gap: 6, alignItems: 'center' }
                  : { display: 'grid', gridTemplateColumns: '1fr 60px 100px 90px 32px', gap: 7, alignItems: 'center' }}>
                  <window.UI.Input value={p.text} onChange={(e) => updatePos(i, { text: e.target.value })} placeholder="Beschreibung" style={{ padding: '8px 10px', fontSize: 13, gridColumn: mobile ? '1 / -1' : 'auto' }} />
                  <window.UI.Input type="number" value={p.menge} onChange={(e) => updatePos(i, { menge: e.target.value })} title="Menge" placeholder="Menge" style={{ padding: '8px 8px', fontSize: 13, textAlign: 'center' }} />
                  {/* Einheit: dropdown if this pos has a geraet hint, else text */}
                  <window.UI.Input value={p.einheit} onChange={(e) => updatePos(i, { einheit: e.target.value })} title="Einheit" placeholder="Einheit" style={{ padding: '8px 8px', fontSize: 12.5 }} />
                  <window.UI.Input type="number" value={p.preis} onChange={(e) => updatePos(i, { preis: e.target.value })} title="Einzelpreis €" placeholder="Preis" style={{ padding: '8px 8px', fontSize: 13, textAlign: 'right' }} />
                  <window.UI.IconBtn name="trash" size={15} onClick={() => removePos(i)} title="Entfernen" style={{ width: 32, height: 32 }} />
                </div>
              ))}
              {pos.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', padding: '6px 0' }}>Noch keine Positionen. Gerät oder Leistung unten wählen ↓</div>}
            </div>

            {/* Gerät-Picker */}
            <div style={{ marginTop: 16, padding: '14px', background: 'var(--paper-2)', borderRadius: 'var(--r)', border: '1px solid var(--line)' }}>
              <div className="kicker" style={{ color: 'var(--muted)', marginBottom: 10 }}>Gerät hinzufügen</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <window.UI.Field label="Gerät" style={{ flex: '2 1 140px', minWidth: 120 }}>
                  <window.UI.Select value={pickerGeraet} onChange={(e) => { setPickerGeraet(e.target.value); setPickerEinheit(''); }}>
                    <option value="">— wählen —</option>
                    {store.db.flotte.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </window.UI.Select>
                </window.UI.Field>
                <window.UI.Field label="Einheit" style={{ flex: '2 1 120px', minWidth: 110 }}>
                  <window.UI.Select value={pickerEinheit} onChange={(e) => setPickerEinheit(e.target.value)} disabled={!selectedGeraet}>
                    <option value="">— wählen —</option>
                    {einheitOptions.map((t, i) => <option key={i} value={t.einheit}>{t.einheit} {t.preis > 0 ? '– ' + F.fmtEUR(t.preis) : ''}</option>)}
                  </window.UI.Select>
                </window.UI.Field>
                <window.UI.Btn icon="plus" onClick={addFromGeraet} disabled={!pickerEinheit} style={{ flex: '0 0 auto', marginBottom: 0 }}>Hinzufügen</window.UI.Btn>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {store.db.preisliste.filter((p) => p.preis > 0).map((p) => (
                  <button key={p.id} onClick={() => addService(p.id)} style={{ fontSize: 12, padding: '5px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--paper)', cursor: 'pointer', font: 'inherit', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                    + {p.geraet.replace('Transportpauschale ', 'Transport ').replace('Reinigungspauschale', 'Reinigung')}
                  </button>
                ))}
                <button onClick={addFree} style={{ fontSize: 12, padding: '5px 10px', border: '1px dashed var(--line)', borderRadius: 'var(--r)', background: 'transparent', cursor: 'pointer', font: 'inherit', color: 'var(--muted)' }}>+ Freie Position</button>
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
              <window.UI.Field label="Datum"><window.UI.Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></window.UI.Field>
              <window.UI.Field label={isAngebot ? 'Gültig bis' : 'Fällig bis'}>
                <window.UI.Input type="date" value={isAngebot ? gueltigBis : faellig} onChange={(e) => isAngebot ? setGueltig(e.target.value) : setFaellig(e.target.value)} />
              </window.UI.Field>
            </div>
            {isAngebot && (
              <div className="stack" style={{ gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <div className="kicker" style={{ color: 'var(--muted)' }}>Wunsch-Zeitraum (für Kalender-Reservierung)</div>
                <window.UI.ZeitraumPicker F={F} von={angebotVon} vonZeit={angebotVonZeit} menge={dauer} einheit={dauerEinheit} withTime={dauerEinheit === 'Stunden'}
                  onChange={(v) => { setAngebotVon(v.von); setAngebotVonZeit(v.vonZeit); setDauer(v.menge); setDauerEinheit(v.einheit); }} />
                <window.UI.Field label="Gerät (für Kalender)">
                  <window.UI.Select value={angebotGeraetId} onChange={(e) => setAngebotGeraetId(e.target.value)}>
                    <option value="">— kein Gerät zugeordnet —</option>
                    {store.db.flotte.filter((g) => g.kat === 'Maschine' || g.kat === 'Transport').map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </window.UI.Select>
                </window.UI.Field>
                {/* Kalender-Abgleich */}
                {angebotGeraetId && angebotVon && (
                  konflikt ? (
                    <div style={{ padding: '11px 13px', background: 'var(--danger-wash)', borderRadius: 'var(--r)', fontSize: 12.5, color: 'var(--danger)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                        <Icon name="alert" size={15} color="var(--danger)" style={{ flex: '0 0 auto', marginTop: 1 }} />
                        <span>Zeitraum ist belegt ({konflikt.id ? konflikt.id : 'anderer Eintrag'}, {F.fmtDate(konflikt.von)}–{F.fmtDate(konflikt.bis)}).</span>
                      </div>
                      {freierVorschlag && (
                        <window.UI.Btn size="sm" variant="ghost" icon="kalender" onClick={() => setAngebotVon(freierVorschlag.von)}>Nächster freier Start: {F.fmtDate(freierVorschlag.von)}</window.UI.Btn>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '9px 13px', background: 'var(--ok-wash)', borderRadius: 'var(--r)', fontSize: 12.5, color: 'var(--ok)', display: 'flex', gap: 7, alignItems: 'center' }}>
                      <Icon name="check" size={15} color="var(--ok)" /> Zeitraum ist frei.
                    </div>
                  )
                )}
                <window.UI.Field label="Einsatzort"><window.UI.Input value={angebotOrt} onChange={(e) => setAngebotOrt(e.target.value)} placeholder="z. B. Baustelle Siegburg" /></window.UI.Field>
              </div>
            )}
            {!isAngebot && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer' }}>
                <span onClick={() => setMV((v) => !v)} style={{ width: 42, height: 24, borderRadius: 12, background: mietvertrag ? 'var(--yellow)' : 'var(--line-2)', position: 'relative', transition: '.15s', flex: '0 0 auto' }}>
                  <span style={{ position: 'absolute', top: 3, left: mietvertrag ? 21 : 3, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: '.15s', boxShadow: '0 1px 2px rgba(0,0,0,.3)' }} />
                </span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Mietvertrag gleichzeitig erzeugen</span>
              </label>
            )}
            {!isAngebot && mietvertrag && (
              <div className="form-2" style={{ marginTop: 12 }}>
                <window.UI.Field label="Miete von"><window.UI.Input type="date" value={mietVon} onChange={(e) => setMietVon(e.target.value)} /></window.UI.Field>
                <window.UI.Field label="Miete bis"><window.UI.Input type="date" value={mietBis} onChange={(e) => setMietBis(e.target.value)} /></window.UI.Field>
              </div>
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
