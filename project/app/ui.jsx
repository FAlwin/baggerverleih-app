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
    const id = Date.now() + Math.random();
    const kind = o.kind || (undo ? 'undo' : 'ok');
    setToasts((t) => [...t, { id, msg, kind, undo, label: o.label || 'Rückgängig' }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), undo ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 400, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: 'max-content', maxWidth: 'calc(100vw - 24px)' }}>
        {toasts.map((t) => {
          const accent = t.kind === 'err' ? 'var(--danger)' : 'var(--yellow)';
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: t.undo ? '10px 10px 10px 18px' : '12px 18px', background: 'var(--ink)', color: '#fff', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-lg)', fontSize: 14, fontWeight: 500, borderLeft: '3px solid ' + accent }}>
              <Icon name={t.kind === 'err' ? 'alert' : t.undo ? 'trash' : 'check'} size={18} color={accent} />
              <span>{t.msg}</span>
              {t.undo && (
                <button onClick={() => { t.undo(); remove(t.id); }} style={{ marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--yellow)', color: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <Icon name="undo" size={15} /> {t.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
};
UI.useToast = function useToast() { return useCtx(ToastCtx); };

// ---- Unterschriften-Pad ----
UI.SignaturPad = function SignaturPad({ title, onSave, onClose }) {
  const canvasRef = React.useRef(null);
  const drawing = React.useRef(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#141414';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <UI.Modal open title={title || 'Unterschrift'} onClose={onClose} width={480}
      footer={<>
        <UI.Btn variant="ghost" onClick={clear}>Löschen</UI.Btn>
        <UI.Btn variant="ghost" onClick={onClose}>Abbrechen</UI.Btn>
        <UI.Btn icon="check" onClick={save}>Übernehmen</UI.Btn>
      </>}>
      <div className="stack" style={{ gap: 10 }}>
        <div style={{ padding: '8px 12px', background: 'var(--yellow-wash)', borderRadius: 'var(--r)', fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="alert" size={15} color="var(--warn)" style={{ flex: '0 0 auto', marginTop: 1 }} />
          <span><b>Vorbereitung Backend:</b> Die Unterschrift wird lokal gespeichert und erscheint im Mietvertrag. Automatischer E-Mail-Versand erfordert ein Backend.</span>
        </div>
        <canvas ref={canvasRef} width={440} height={160}
          style={{ border: '1.5px solid var(--line)', borderRadius: 'var(--r)', background: '#fff', touchAction: 'none', cursor: 'crosshair', width: '100%' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
        />
        <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>Hier unterschreiben (Maus oder Finger)</div>
      </div>
    </UI.Modal>
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
UI.ZeitraumPicker = function ZeitraumPicker({ von, vonZeit, menge, einheit, withTime, onChange, F }) {
  const fmtDate = (F && F.fmtDate) || ((x) => x);
  const ende = window.berechneEnde(von, vonZeit, menge, einheit);
  const set = (patch) => onChange({ von, vonZeit, menge, einheit, ...patch });
  const endText = !von ? '—' : (einheit === 'Stunden'
    ? `${fmtDate(ende.bis)} um ${ende.bisZeit} Uhr`
    : fmtDate(ende.bis));
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: withTime ? '1fr 96px' : '1fr', gap: 8 }}>
        <UI.Field label="Start (Datum)"><UI.Input type="date" value={von || ''} onChange={(e) => set({ von: e.target.value })} /></UI.Field>
        {withTime && <UI.Field label="ab Uhr"><UI.Input type="time" value={vonZeit || '08:00'} onChange={(e) => set({ vonZeit: e.target.value })} /></UI.Field>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'end' }}>
        <UI.Field label="Dauer"><UI.Input type="number" min="1" value={menge} onChange={(e) => set({ menge: e.target.value })} /></UI.Field>
        <UI.Field label="Einheit">
          <UI.Select value={einheit} onChange={(e) => set({ einheit: e.target.value })}>
            <option value="Tage">Tage</option>
            <option value="Stunden">Stunden</option>
          </UI.Select>
        </UI.Field>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="clock" size={14} color="var(--muted)" /> Ende: <b style={{ color: 'var(--ink)' }}>{endText}</b>
      </div>
    </div>
  );
};

window.UI = UI;
