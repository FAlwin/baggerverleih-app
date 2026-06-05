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

// Toast
const ToastCtx = createCtx(null);
UI.ToastProvider = function ToastProvider({ children }) {
  const [toasts, setToasts] = uiState([]);
  const push = uiCb((msg, kind = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 400, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: 'var(--ink)', color: '#fff', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-lg)', fontSize: 14, fontWeight: 500, borderLeft: '3px solid ' + (t.kind === 'ok' ? 'var(--yellow)' : 'var(--danger)') }}>
            <Icon name={t.kind === 'ok' ? 'check' : 'alert'} size={18} color={t.kind === 'ok' ? 'var(--yellow)' : 'var(--danger)'} />{t.msg}
          </div>
        ))}
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

window.UI = UI;
