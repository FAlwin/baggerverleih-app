/* ============ DRUCK-DOKUMENTE: Rechnung & Mietvertrag (A4) ============ */
const Print = {};

const docStyle = {
  fontFamily: 'var(--sans)', color: '#141414', background: '#fff',
  width: '210mm', height: '297mm',
  padding: '18mm 18mm 32mm', boxSizing: 'border-box',
  fontSize: 12, lineHeight: 1.5,
  position: 'relative', overflow: 'hidden',
};

function Letterhead({ c, docLabel, docId, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #141414', paddingBottom: 14, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 46, height: 46, background: '#F7C72A', borderRadius: 5, display: 'grid', placeItems: 'center' }}>
          {window.LogoMark ? <window.LogoMark size={34} /> : <Icon name="bagger" size={28} color="#141414" stroke={1.9} />}
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>{c.name}</div>
          <div style={{ fontSize: 11, color: '#6C6C66' }}>{c.owner} · {c.street} · {c.city}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="kicker" style={{ color: '#9A9A93', fontSize: 10 }}>{docLabel}</div>
        <div className="mono" style={{ fontSize: 18, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap' }}>{docId}</div>
      </div>
    </div>
  );
}

function AddrRow({ c, kunde }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 30, margin: '22px 0 8px' }}>
      <div>
        <div style={{ fontSize: 8.5, color: '#9A9A93', borderBottom: '0.5px solid #ccc', paddingBottom: 2, marginBottom: 8, letterSpacing: '.04em' }}>{c.name} · {c.street} · {c.city}</div>
        <div style={{ fontWeight: 700 }}>{kunde.name}</div>
        {kunde.kontakt && kunde.typ === 'Gewerbe' && <div>z. Hd. {kunde.kontakt}</div>}
        <div>{kunde.street}</div>
        <div>{kunde.city}</div>
      </div>
    </div>
  );
}

function PosTable({ positionen, fmtEUR }) {
  const total = positionen.reduce((a, p) => a + p.menge * p.preis, 0);
  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 11.5 }}>
        <thead>
          <tr style={{ background: '#141414', color: '#fff' }}>
            <th style={{ textAlign: 'left', padding: '8px 8px', width: 28 }}>Pos</th>
            <th style={{ textAlign: 'left', padding: '8px 8px' }}>Beschreibung</th>
            <th style={{ textAlign: 'right', padding: '8px 8px', width: 48 }}>Menge</th>
            <th style={{ textAlign: 'left', padding: '8px 8px', width: 90 }}>Einheit</th>
            <th style={{ textAlign: 'right', padding: '8px 8px', width: 80 }}>Einzel</th>
            <th style={{ textAlign: 'right', padding: '8px 8px', width: 90 }}>Gesamt</th>
          </tr>
        </thead>
        <tbody>
          {positionen.map((p, i) => (
            <tr key={i} style={{ borderBottom: '0.5px solid #ddd' }}>
              <td className="mono" style={{ padding: '9px 8px', color: '#9A9A93' }}>{String(i + 1).padStart(2, '0')}</td>
              <td style={{ padding: '9px 8px', fontWeight: 500 }}>{p.text}{p.zeitraum && <div style={{ fontSize: 9.5, color: '#9A9A93', fontWeight: 400, marginTop: 2 }}>{p.zeitraum}</div>}</td>
              <td className="mono" style={{ padding: '9px 8px', textAlign: 'right' }}>{p.menge}</td>
              <td style={{ padding: '9px 8px', color: '#6C6C66' }}>{p.einheit}</td>
              <td className="mono" style={{ padding: '9px 8px', textAlign: 'right' }}>{fmtEUR(p.preis)}</td>
              <td className="mono" style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtEUR(p.menge * p.preis)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <div style={{ width: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: 11.5, color: '#6C6C66' }}><span>Zwischensumme (netto)</span><span className="mono">{fmtEUR(total)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: 11.5, color: '#6C6C66' }}><span>USt. (§ 19 UStG)</span><span className="mono">0,00 €</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 10px', background: '#F7C72A', borderRadius: 3, marginTop: 4, fontWeight: 700, fontSize: 14 }}><span>Gesamtbetrag</span><span className="mono">{fmtEUR(total)}</span></div>
        </div>
      </div>
    </>
  );
}

function Footer({ c }) {
  return (
    <div style={{ position: 'absolute', left: '18mm', right: '18mm', bottom: '12mm', borderTop: '0.5px solid #ccc', paddingTop: 8, display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 8.8, color: '#6C6C66', lineHeight: 1.5 }}>
      <div><b style={{ color: '#141414' }}>{c.name}</b><br />{c.owner}<br />{c.street}, {c.city}</div>
      <div>Tel. {c.phone}<br />{c.email}<br />Gewerbe seit {c.gewerbebeginn}</div>
      <div>{c.finanzamt}<br />Steuernr. {c.steuernr}<br />Kleinunternehmer §19 UStG</div>
      <div>{c.bank}<br />IBAN {c.iban}<br />BIC {c.bic}</div>
    </div>
  );
}

Print.RechnungDoc = function RechnungDoc({ rechnung, kunde, company, fmtEUR, fmtDate }) {
  const c = company;
  return (
    <div style={{ ...docStyle, position: 'relative' }}>
      <Letterhead c={c} docLabel="Rechnung" docId={rechnung.id} />
      <AddrRow c={c} kunde={kunde} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Rechnung {rechnung.id}</h1>
        <div style={{ textAlign: 'right', fontSize: 11.5 }}>
          <div>Rechnungsdatum: <b>{fmtDate(rechnung.datum)}</b></div>
          <div>Fällig bis: <b>{fmtDate(rechnung.faellig)}</b></div>
        </div>
      </div>
      <p style={{ marginTop: 14, fontSize: 11.5 }}>
        Sehr geehrte Damen und Herren,<br />
        vielen Dank für Ihren Auftrag. Vereinbarungsgemäß berechnen wir Ihnen die folgenden Leistungen:
      </p>
      <PosTable positionen={rechnung.positionen} fmtEUR={fmtEUR} />
      <div style={{ marginTop: 20, padding: '12px 14px', background: '#FDF6DC', border: '0.5px solid #FBE9A0', borderRadius: 3, fontSize: 11 }}>
        <b>Hinweis gemäß § 19 UStG:</b> {c.ustHinweis}
      </div>
      <p style={{ marginTop: 16, fontSize: 11.5 }}>
        Bitte überweisen Sie den Gesamtbetrag bis zum <b>{fmtDate(rechnung.faellig)}</b> unter Angabe der
        Rechnungsnummer <b>{rechnung.id}</b> auf das unten genannte Konto.<br /><br />
        Mit freundlichen Grüßen
      </p>
      {c.signaturVermieter && <img src={c.signaturVermieter} alt="Unterschrift" style={{ height: 44, display: 'block', margin: '4px 0' }} />}
      <div style={{ fontSize: 11.5, fontWeight: 700 }}>{c.owner}</div>
      <Footer c={c} />
    </div>
  );
};

Print.MietvertragDoc = function MietvertragDoc({ rechnung, kunde, company, fmtEUR, fmtDate, mietzeit, signaturVermieter, signaturMieter }) {
  const c = company;
  const total = rechnung.positionen.reduce((a, p) => a + p.menge * p.preis, 0);
  return (
    <div style={{ ...docStyle, position: 'relative' }}>
      <Letterhead c={c} docLabel="Mietvertrag" docId={'MV-' + rechnung.id.replace('R-', '')} />
      <h1 style={{ margin: '20px 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Mietvertrag</h1>
      <div style={{ fontSize: 11, color: '#6C6C66' }}>über die Vermietung von Baumaschinen und Zubehör</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
        <div style={{ border: '0.5px solid #ddd', borderRadius: 3, padding: 12 }}>
          <div className="kicker" style={{ color: '#9A9A93', fontSize: 9 }}>Vermieter</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{c.name}</div>
          <div style={{ fontSize: 11 }}>{c.owner}<br />{c.street}, {c.city}<br />Tel. {c.phone}</div>
        </div>
        <div style={{ border: '0.5px solid #ddd', borderRadius: 3, padding: 12 }}>
          <div className="kicker" style={{ color: '#9A9A93', fontSize: 9 }}>Mieter</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{kunde.name}</div>
          <div style={{ fontSize: 11 }}>{kunde.kontakt}<br />{kunde.street}, {kunde.city}<br />Tel. {kunde.phone}</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>§ 1 Mietgegenstand &amp; Mietzeit</div>
        <PosTable positionen={rechnung.positionen} fmtEUR={fmtEUR} />
        <div style={{ marginTop: 10, fontSize: 11.5 }}>Mietzeitraum: <b>{mietzeit || '—'}</b> · Übergabeort: {kunde.city}</div>
      </div>

      <div style={{ marginTop: 12, fontSize: 9.5, lineHeight: 1.5, columnGap: 20, columns: 2 }}>
        <div style={{ fontWeight: 700, fontSize: 10.5, marginBottom: 3 }}>§ 2 Kurzfassung Mietbedingungen</div>
        <p style={{ margin: '0 0 4px' }}>Der Mieter bestätigt den ordnungsgemäßen Erhalt des Mietgegenstandes. Bedienung erfolgt fach- und sachgerecht durch eingewiesenes Personal (mind. 18 J.).</p>
        <p style={{ margin: '0 0 4px' }}>Der Mieter haftet für Schäden, Verlust und Diebstahl. Maschine ist gereinigt und vollgetankt zurückzugeben (Reinigung +100 €, Nachbetankung: Dieselpreis + 15 €).</p>
        <p style={{ margin: 0 }}>Es gilt deutsches Recht, Gerichtsstand Siegburg. Vollständige Mietbedingungen auf Seite 2. Mündliche Nebenabreden bestehen nicht.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 28 }}>
        <div>
          {signaturVermieter && <img src={signaturVermieter} alt="Unterschrift Vermieter" style={{ height: 48, display: 'block', marginBottom: 4 }} />}
          <div style={{ borderTop: '0.5px solid #141414', paddingTop: 4, fontSize: 10, color: '#6C6C66' }}>{c.city.split(' ')[1]}, den {fmtDate(rechnung.datum)} · Unterschrift Vermieter</div>
        </div>
        <div>
          {signaturMieter && <img src={signaturMieter} alt="Unterschrift Mieter" style={{ height: 48, display: 'block', marginBottom: 4 }} />}
          <div style={{ borderTop: '0.5px solid #141414', paddingTop: 4, fontSize: 10, color: '#6C6C66' }}>{c.city.split(' ')[1]}, den {fmtDate(rechnung.datum)} · Unterschrift Mieter</div>
        </div>
      </div>
      <Footer c={c} />
    </div>
  );
};

Print.AngebotDoc = function AngebotDoc({ angebot, kunde, company, fmtEUR, fmtDate }) {
  const c = company;
  const total = (angebot.positionen || []).reduce((a, p) => a + p.menge * p.preis, 0);
  return (
    <div style={{ ...docStyle, position: 'relative' }}>
      <Letterhead c={c} docLabel="Angebot" docId={angebot.id} />
      <AddrRow c={c} kunde={kunde} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Angebot {angebot.id}</h1>
        <div style={{ textAlign: 'right', fontSize: 11.5 }}>
          <div>Datum: <b>{fmtDate(angebot.datum)}</b></div>
          <div>Gültig bis: <b>{fmtDate(angebot.gueltigBis)}</b></div>
        </div>
      </div>
      <p style={{ marginTop: 14, fontSize: 11.5 }}>
        Sehr geehrte Damen und Herren,<br />
        vielen Dank für Ihr Interesse. Hiermit unterbreiten wir Ihnen folgendes Angebot:
      </p>
      <PosTable positionen={angebot.positionen || []} fmtEUR={fmtEUR} />
      {angebot.von && (
        <div style={{ marginTop: 14, fontSize: 11.5 }}>
          Geplanter Zeitraum: <b>{fmtDate(angebot.von)}{angebot.bis && angebot.bis !== angebot.von ? ' – ' + fmtDate(angebot.bis) : ''}</b>
          {angebot.ort ? ` · Einsatzort: ${angebot.ort}` : ''}
        </div>
      )}
      <div style={{ marginTop: 16, padding: '12px 14px', background: '#FDF6DC', border: '0.5px solid #FBE9A0', borderRadius: 3, fontSize: 11 }}>
        <b>Hinweis gemäß § 19 UStG:</b> {c.ustHinweis}
      </div>
      <p style={{ marginTop: 16, fontSize: 11.5 }}>
        Dieses Angebot ist freibleibend und gilt bis zum <b>{fmtDate(angebot.gueltigBis)}</b>.<br />
        Bei Fragen oder zur Auftragsbestätigung melden Sie sich gerne.<br /><br />
        Mit freundlichen Grüßen<br /><b>{c.owner}</b>
      </p>
      <Footer c={c} />
    </div>
  );
};

// ---- Mietbedingungen-Seite ----
Print.MietbedingungenPage = function MietbedingungenPage({ company }) {
  const c = company;
  const p = (t, bold) => (
    <p style={{ margin: '0 0 5px', fontSize: 10.5, lineHeight: 1.55 }}>
      {bold ? <b>{t}</b> : t}
    </p>
  );
  return (
    <div style={{ ...docStyle, position: 'relative', pageBreakBefore: 'always' }}>
      <Letterhead c={c} docLabel="Seite 2" docId="Mietbedingungen" />
      <h2 style={{ margin: '16px 0 12px', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Mietbedingungen</h2>
      <p style={{ margin: '0 0 10px', fontSize: 10.5, color: '#6C6C66' }}>
        Folgende Mietbedingungen sind Vertragsbestandteil des Mietvertrages und gelten zwischen den Vertragsparteien.
      </p>

      {[
        ['§ 1 Mietdauer', 'Die Mietzeit beginnt mit Vertragsabschluss der beiden Parteien und endet mit der ordnungsgemäßen Rückgabe laut Übergabeprotokoll.'],
        ['§ 2 Mietpreis und Zahlung', 'Für alle Mietprodukte wird ein festgelegter Tagespreis pro Werktag berechnet. Die Bezahlung erfolgt grundsätzlich per Überweisung auf das auf der Rechnung angegebene Konto. Nach Erhalt der Rechnung hat der Mieter zwei Wochen Zeit zur Bezahlung.'],
        ['§ 3 Bedienberechtigung', 'Der Mietgegenstand ist grundsätzlich nur von eingewiesenen Personen über 18 Jahre zu bedienen, diese sind auf dem Vertrag namentlich zu verschriftlichen.'],
        ['§ 4 Pflichten des Vermieters', 'Der Vermieter hat das Gerät in gebrauchsfähigem Zustand zu übergeben. Dem Mieter steht es frei, das Gerät vorher zu besichtigen.'],
      ].map(([titel, text]) => (
        <div key={titel} style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>{titel}</div>
          <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.55 }}>{text}</p>
        </div>
      ))}

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>§ 5 Pflichten des Mieters</div>
        <p style={{ margin: '0 0 4px', fontSize: 10.5, lineHeight: 1.55 }}><b>Wartung und Pflege:</b> Der Mieter ist verpflichtet das gemietete Gerät vor Überbeanspruchung zu schützen, für sachgerechte Wartung und Pflege Sorge zu tragen und den Vermieter unverzüglich zu benachrichtigen, wenn Reparaturbedarf entsteht. Der Mieter verpflichtet sich, das Gerät in gesäubertem, einwandfreiem Zustand und voll betankt zurückzugeben. Bei starker Verschmutzung kann eine Reinigungspauschale von 100,00 € berechnet werden. Bei Nicht-Vollbetankung wird der tagesaktuelle Dieselpreis plus 15,00 € Aufwandsentschädigung berechnet.</p>
        <p style={{ margin: '0 0 4px', fontSize: 10.5, lineHeight: 1.55 }}><b>Reparaturkosten:</b> Reparaturen durch normalen Verschleiß trägt der Vermieter. Eigenmächtige Reparaturen durch den Mieter gehen zu seinen Lasten. Der Mieter haftet für Schäden durch unsachgemäße Nutzung, Fahrlässigkeit oder Vorsatz. Der Mieter ist nicht berechtigt, das Gerät weiterzuvermieten oder ins Ausland zu verbringen.</p>
        <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.55 }}><b>Freimeldungen</b> werden nur in Schriftform anerkannt.</p>
      </div>

      {[
        ['§ 6 Rechte des Vermieters', 'Der Vermieter ist berechtigt, das Gerät jederzeit zu besichtigen und bei nicht ordnungsgemäßer Wartung, Überbeanspruchung, Zahlungsverzug oder Vermögensverschlechterung des Mieters den Vertrag fristlos zu kündigen und das Gerät auf Kosten des Mieters abzuholen.'],
        ['§ 7 Haftung', 'Der Mieter haftet für das gemietete Gerät. Sollte es ihm aus irgendwelchen Gründen unmöglich sein, das Gerät zurückzugeben, hat er Ersatz zu leisten. Bis zum Eingang der Ersatzleistung wird die normale Miete berechnet. Der Vermieter übernimmt keine Haftung für Schäden aus der Benutzung der Maschine, insbesondere keine Haftung für Folgeschäden durch Ausfälle.'],
      ].map(([titel, text]) => (
        <div key={titel} style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>{titel}</div>
          <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.55 }}>{text}</p>
        </div>
      ))}

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>§ 8 Nutzungseinschränkungen</div>
        <p style={{ margin: '0 0 4px', fontSize: 10.5 }}>Folgende Nutzungen sind ausdrücklich untersagt:</p>
        <div style={{ columns: 2, columnGap: 20, fontSize: 10.5, lineHeight: 1.7 }}>
          {['Einsatz für Abbrucharbeiten', 'Arbeiten in felsigem Untergrund', 'Einsatz unter Wasser und in Überschwemmungsgebieten', 'Nutzung bei extremen Schräglagen mit Kippgefahr', 'Teilnahme an Wettbewerben oder Motorsportveranstaltungen', 'Transport von Personen', 'Ziehen oder Schleppen von Lasten ohne geeignete Vorrichtung', 'Veränderungen oder Umbauten an der Maschine', 'Entfernen von Schutzvorrichtungen', 'Nutzung ohne tägliche Sichtprüfungen', 'Betrieb trotz erkennbarer Schäden'].map((item) => (
            <div key={item} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ color: '#9A9A93', flex: '0 0 auto' }}>–</span><span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <Footer c={c} />
    </div>
  );
};

// Mount-Punkt fürs Drucken (nur beim Drucken sichtbar)
// Wird per Portal direkt an <body> gehängt, damit beim Druck #root komplett
// ausgeblendet werden kann (kein Rest-Layout → keine Browser-Skalierung → echtes A4).
Print.Mount = function Mount({ doc }) {
  const elRef = React.useRef(null);
  if (!elRef.current) {
    const el = document.createElement('div');
    el.className = 'print-doc';
    elRef.current = el;
  }
  React.useEffect(() => {
    const el = elRef.current;
    document.body.appendChild(el);
    return () => { if (el.parentNode) el.parentNode.removeChild(el); };
  }, []);
  return ReactDOM.createPortal(doc, elRef.current);
};

window.Print = Print;

// ---- PDF über den Browser-Druck ("Als PDF sichern") ----
// Echtes, durchsuchbares/kopierbares Text-PDF; Unterschriften bleiben gestochen scharf (kein Rasterbild).
// Der Funktionsname bleibt download(), damit alle Aufrufer unverändert funktionieren.
const PDF = {
  saubererName: (s) => String(s || 'Dokument').replace(/[^\w.\-]+/g, '_'),
  download(doc, filename) {
    // Doc isoliert ins #__printroot rendern; per @media print wird nur dieser Container gedruckt.
    const old = document.getElementById('__printroot'); if (old) old.remove();
    const oldS = document.getElementById('__printcss'); if (oldS) oldS.remove();
    const root = document.createElement('div');
    root.id = '__printroot';
    document.body.appendChild(root);
    const reactRoot = ReactDOM.createRoot(root);
    try { ReactDOM.flushSync(() => reactRoot.render(doc)); } catch (e) { reactRoot.render(doc); }
    const style = document.createElement('style');
    style.id = '__printcss';
    // Am Bildschirm unsichtbar (offscreen). Im Druck: alles außer #__printroot ausblenden, ohne Ränder.
    style.textContent =
      '#__printroot{position:fixed;left:-100000px;top:0;}' +
      '@media print{' +
      '  html,body{background:#fff!important;margin:0!important;}' +
      '  body>*{display:none!important;}' +
      '  #__printroot{display:block!important;position:static!important;left:auto!important;}' +
      '  #__printroot>div{box-shadow:none!important;}' +
      '  @page{size:A4;margin:0;}' +
      '}';
    document.head.appendChild(style);
    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      try { reactRoot.unmount(); } catch (e) {}
      if (root.parentNode) root.remove();
      if (style.parentNode) style.remove();
    };
    window.addEventListener('afterprint', cleanup);
    // Erst drucken, wenn Schriften geladen und das Layout gepainted wurde.
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => setTimeout(() => {
      window.print();
      // Sicherheits-Cleanup, falls 'afterprint' im Browser nicht feuert
      setTimeout(() => { if (document.getElementById('__printroot')) cleanup(); }, 120000);
    }, 120));
  },
};
window.PDF = PDF;
