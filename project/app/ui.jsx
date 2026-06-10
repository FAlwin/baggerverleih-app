/* ============ UI-Primitive (window.UI.*) ============ */
const { createContext: createCtx, useContext: useCtx, useState: uiState, useCallback: uiCb } = React;
const UI = {};

UI.Btn = function Btn({ children, variant = 'primary', size = 'md', icon, iconRight, onClick, type, disabled, style, title }) {
  const pads = size === 'sm' ? '8px 12px' : size === 'lg' ? '13px 22px' : '10px 16px';
  const fs = size === 'sm' ? 13 : size === 'lg' ? 15 : 14;
  const variants = {
    primary: { background: 'var(--yellow)', color: 'var(--ink)', border: 'none', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,.12)' },
    dark:    { background: 'var(--ink)', color: '#fff', border: 'none' },
    ghost:   { background: 'var(--paper)', color: 'var(--ink)', border: '1.5px solid var(--line-2)' },
    soft:    { background: 'var(--paper-3)', color: 'var(--ink)', border: 'none' },
    danger:  { background: 'var(--danger-wash)', color: 'var(--danger)', border: '1.5px solid transparent' },
    okghost: { background: 'var(--ok-wash)', color: 'var(--ok)', border: '1.5px solid transparent' },
  };
  return (
    <button type={type || 'button'} onClick={onClick} disabled={disabled} title={title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: pads, borderRadius: 'var(--r)', font: 'inherit', fontSize: fs, fontWeight: 600,
      fontFamily: 'var(--sans)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      transition: 'filter .12s, transform .05s', whiteSpace: 'nowrap', ...variants[variant], ...style,
    }} onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(1px)'} onMouseUp={(e) => e.currentTarget.style.transform = ''} onMouseLeave={(e) => e.currentTarget.style.transform = ''}>
      {icon && <Icon name={icon} size={fs + 3} stroke={2} />}{children}{iconRight && <Icon name={iconRight} size={fs + 3} stroke={2} />}
    </button>
  );
};

UI.IconBtn = function IconBtn({ name, onClick, title, size = 18, badge, active, style }) {
  return (
    <button onClick={onClick} title={title} style={{
      position: 'relative', width: 40, height: 40, flex: '0 0 auto',
      border: '1.5px solid var(--line)', borderRadius: 'var(--r)',
      background: active ? 'var(--ink)' : 'var(--paper)', color: active ? 'var(--yellow)' : 'var(--ink)',
      display: 'grid', placeItems: 'center', cursor: 'pointer', ...style,
    }}>
      <Icon name={name} size={size} />
      {badge != null && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, display: 'grid', placeItems: 'center' }}>{badge}</span>}
    </button>
  );
};

UI.Card = function Card({ children, style, pad }) {
  return <div style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', padding: pad, ...style }}>{children}</div>;
};

UI.Kicker = function Kicker({ children, style }) {
  return <div className="kicker" style={{ color: 'var(--muted)', ...style }}>{children}</div>;
};

UI.Field = function Field({ label, children, hint, required, style }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</span>}
      {children}
      {hint && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{hint}</span>}
    </label>
  );
};

const inputStyle = {
  font: 'inherit', fontSize: 14, fontFamily: 'var(--sans)', padding: '10px 12px',
  border: '1.5px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--paper)',
  color: 'var(--ink)', width: '100%', outline: 'none',
};
UI.inputStyle = inputStyle;

UI.Input = function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} onFocus={(e) => e.target.style.borderColor = 'var(--ink)'} onBlur={(e) => e.target.style.borderColor = 'var(--line-2)'} />;
};
UI.Textarea = function Textarea(props) {
  return <textarea {...props} style={{ ...inputStyle, resize: 'vertical', minHeight: 70, ...props.style }} />;
};
UI.Select = function Select({ children, style, ...props }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <select {...props} style={{ ...inputStyle, appearance: 'none', paddingRight: 34, cursor: 'pointer' }}>{children}</select>
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'grid' }}><Icon name="chevronD" size={16} color="var(--muted)" /></span>
    </div>
  );
};

UI.Modal = function Modal({ open, onClose, title, children, width = 560, footer }) {
  const isMob = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(20,20,20,.45)', display: 'flex', justifyContent: 'center', alignItems: isMob ? 'flex-end' : 'center', padding: isMob ? 0 : 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--paper)', borderRadius: isMob ? '16px 16px 0 0' : 'var(--r-lg)', width: isMob ? '100%' : width, maxWidth: '100%', maxHeight: isMob ? '92vh' : '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {isMob && <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '12px auto 0', flexShrink: 0 }} />}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1.5px solid var(--line)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>{title}</h2>
          <UI.IconBtn name="x" onClick={onClose} title="Schließen" style={{ width: 34, height: 34 }} />
        </div>
        <div style={{ padding: 20, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1.5px solid var(--line)', background: 'var(--paper-2)', flexShrink: 0, flexWrap: 'wrap' }}>{footer}</div>}
      </div>
    </div>
  );
};

UI.Empty = function Empty({ icon = 'file', title, sub, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '56px 24px', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ width: 56, height: 56, borderRadius: 6, background: 'var(--paper-3)', display: 'grid', placeItems: 'center' }}><Icon name={icon} size={26} color="var(--muted-2)" /></div>
      <div><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{title}</div>{sub && <div style={{ fontSize: 13.5, marginTop: 4 }}>{sub}</div>}</div>
      {action}
    </div>
  );
};

// Toast — optionale Undo-Aktion: toast('… gelöscht', { undo: () => … })
const ToastCtx = createCtx(null);
UI.ToastProvider = function ToastProvider({ children }) {
  const [toasts, setToasts] = uiState([]);
  const remove = uiCb((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = uiCb((msg, opts) => {
    const o = typeof opts === 'string' ? { kind: opts } : (opts || {});
    const undo = typeof o.undo === 'function' ? o.undo : null;
    const action = typeof o.action === 'function' ? o.action : null;
    const id = Date.now() + Math.random();
    const kind = o.kind || (undo ? 'undo' : 'ok');
    const dur = undo ? 10000 : (action ? 8000 : 3200);
    setToasts((t) => [...t, { id, msg, kind, undo, action, label: o.label || (undo ? 'Rückgängig' : 'Öffnen'), dur }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), dur);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 400, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: 'max-content', maxWidth: 'calc(100vw - 24px)' }}>
        {toasts.map((t) => {
          const accent = t.kind === 'err' ? 'var(--danger)' : 'var(--yellow)';
          const hasBtn = t.undo || t.action;
          return (
            <div key={t.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: hasBtn ? '10px 10px 12px 18px' : '12px 18px', background: 'var(--ink)', color: '#fff', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-lg)', fontSize: 14, fontWeight: 500, borderLeft: '3px solid ' + accent, overflow: 'hidden' }}>
              <Icon name={t.kind === 'err' ? 'alert' : t.undo ? 'trash' : 'check'} size={18} color={accent} />
              <span>{t.msg}</span>
              {t.undo && (
                <button onClick={() => { t.undo(); remove(t.id); }} style={{ marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--yellow)', color: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <Icon name="undo" size={15} /> {t.label}
                </button>
              )}
              {!t.undo && t.action && (
                <button onClick={() => { t.action(); remove(t.id); }} style={{ marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--yellow)', color: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {t.label} <Icon name="arrowRight" size={15} />
                </button>
              )}
              {hasBtn && (
                <span style={{ position: 'absolute', left: 0, bottom: 0, height: 3, background: accent, width: '100%', transformOrigin: 'left', animation: `toastbar ${t.dur}ms linear forwards` }} />
              )}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
};
UI.useToast = function useToast() { return useCtx(ToastCtx); };

// ---- Unterschriften-Pad (Vollbild, auf dem Handy im Querformat) ----
UI.SignaturPad = function SignaturPad({ title, onSave, onClose }) {
  const canvasRef = React.useRef(null);
  const wrapRef = React.useRef(null);
  const drawing = React.useRef(false);
  const dirty = React.useRef(false);
  const isMob = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;

  // Canvas an die tatsächliche Pixelgröße anpassen (scharfe Linien)
  React.useEffect(() => {
    const fit = () => {
      const canvas = canvasRef.current, wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const r = wrap.getBoundingClientRect();
      canvas.width = Math.max(100, Math.round(r.width));
      canvas.height = Math.max(100, Math.round(r.height));
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    // Vollbild + Querformat anfordern (Android Chrome; auf iOS still ignoriert)
    if (isMob) {
      const el = wrapRef.current && wrapRef.current.parentNode;
      const rq = el && (el.requestFullscreen || el.webkitRequestFullscreen);
      if (rq) { try { rq.call(el).then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); } catch (e) {} }).catch(() => {}); } catch (e) {} }
    }
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
      try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) {}
    };
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * (canvas.width / rect.width), y: (src.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; const c = canvasRef.current, ctx = c.getContext('2d'); const { x, y } = getPos(e, c); ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e) => { e.preventDefault(); if (!drawing.current) return; const c = canvasRef.current, ctx = c.getContext('2d'); ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.strokeStyle = '#141414'; const { x, y } = getPos(e, c); ctx.lineTo(x, y); ctx.stroke(); dirty.current = true; };
  const stop = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); dirty.current = false; };
  const save = () => { if (!dirty.current) { alert('Bitte zuerst unterschreiben.'); return; } onSave(canvasRef.current.toDataURL('image/png')); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--ink)', display: 'flex', flexDirection: 'column', padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', color: '#fff', flex: '0 0 auto' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title || 'Unterschrift'}</div>
        {isMob && <div style={{ fontSize: 11.5, color: 'var(--on-dark-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert" size={14} color="var(--yellow)" /> Gerät bitte quer halten</div>}
      </div>
      <div ref={wrapRef} style={{ flex: 1, margin: '0 16px', borderRadius: 'var(--r)', background: '#fff', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        <canvas ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={move} onTouchEnd={stop} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 14, textAlign: 'center', fontSize: 11.5, color: 'var(--muted-2)', pointerEvents: 'none' }}>Hier unterschreiben (Finger oder Maus)</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 16px', flex: '0 0 auto' }}>
        <UI.Btn variant="soft" onClick={clear}>Löschen</UI.Btn>
        <UI.Btn variant="ghost" onClick={onClose}>Abbrechen</UI.Btn>
        <UI.Btn icon="check" onClick={save}>Übernehmen</UI.Btn>
      </div>
    </div>
  );
};

// ---- Stepper / Statuszeile (Auftrags-Lebenszyklus) ----
UI.Stepper = function Stepper({ flow, current }) {
  const F = window.FRIESEN;
  const idx = flow.indexOf(current);
  const activeLabel = (F.STATUS[current] || { label: current }).label;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 2px', gap: 0 }}>
        {flow.map((key, i) => {
          const done = i < idx, active = i === idx;
          const reached = i <= idx;
          const dotBg = active ? 'var(--yellow)' : reached ? 'var(--ink)' : 'var(--paper-3)';
          const dotCol = active ? 'var(--ink)' : reached ? '#fff' : 'var(--muted-2)';
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', flex: i < flow.length - 1 ? 1 : '0 0 auto' }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: dotBg, color: dotCol, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, boxShadow: active ? '0 0 0 3px var(--yellow-wash)' : 'none', flex: '0 0 22px' }}>
                {done ? <Icon name="check" size={12} color="#fff" /> : i + 1}
              </div>
              {i < flow.length - 1 && <div style={{ flex: 1, height: 2, background: i < idx ? 'var(--ink)' : 'var(--paper-3)', minWidth: 8 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginTop: 6 }}>{activeLabel}</div>
    </div>
  );
};

// ---- Zeitraum-Picker: Start + Dauer (Std./Tage) → Ende wird berechnet ----
UI.ZeitraumPicker = function ZeitraumPicker({ von, vonZeit, menge, einheit, einheiten, withTime, onChange, F }) {
  const fmtDate = (F && F.fmtDate) || ((x) => x);
  // Auswählbare Einheiten: gerätespezifisch übergeben (z. B. ['4 Stunden','8 Stunden','Tag']),
  // sonst generischer Fallback. Stunden-Blöcke = feste Dauer (Menge 1), keine kleinere Auswahl.
  const opts = (einheiten && einheiten.length) ? einheiten : ['Tage', 'Stunden'];
  const istStd = /stunden/i.test(einheit || '');          // irgendeine Stunden-Einheit → Uhrzeit zeigen
  const istBlock = /^\d+\s*Stunden$/i.test(einheit || ''); // fester Block (z. B. „4 Stunden") → Menge fix 1
  const zeigeZeit = withTime != null ? withTime : istStd;
  const effMenge = istBlock ? 1 : menge;
  const ende = window.berechneEnde(von, vonZeit, effMenge, einheit);
  const set = (patch) => onChange({ von, vonZeit, menge, einheit, ...patch });
  const endText = !von ? '—' : (istStd
    ? `${fmtDate(ende.bis)} um ${ende.bisZeit} Uhr`
    : fmtDate(ende.bis));
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: zeigeZeit ? '1fr 96px' : '1fr', gap: 8 }}>
        <UI.Field label="Start (Datum)"><UI.Input type="date" value={von || ''} onChange={(e) => set({ von: e.target.value })} /></UI.Field>
        {zeigeZeit && <UI.Field label="ab Uhr"><UI.Input type="time" value={vonZeit || '08:00'} onChange={(e) => set({ vonZeit: e.target.value })} /></UI.Field>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: istBlock ? '1fr' : '1fr 1fr', gap: 8, alignItems: 'end' }}>
        {!istBlock && <UI.Field label="Dauer"><UI.Input type="number" min="1" value={menge} onChange={(e) => set({ menge: e.target.value })} /></UI.Field>}
        <UI.Field label="Einheit">
          <UI.Select value={einheit} onChange={(e) => { const ne = e.target.value; set({ einheit: ne, menge: /^\d+\s*Stunden$/i.test(ne) ? 1 : (Number(menge) || 1) }); }}>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </UI.Select>
        </UI.Field>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="clock" size={14} color="var(--muted)" /> Ende: <b style={{ color: 'var(--ink)' }}>{endText}</b>
      </div>
      {von && window.istMiettag && !window.istMiettag(von) && (
        <div style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="alert" size={14} color="var(--danger)" /> Startdatum fällt auf einen Tag, an dem nicht vermietet wird.
        </div>
      )}
    </div>
  );
};

window.UI = UI;
