/* App shell pieces shared across dashboard variants → window.Sidebar, window.Logo */
const NAV = [
  { id: 'dashboard',   icon: 'dashboard',   label: 'Dashboard' },
  { id: 'anfragen',    icon: 'bell',        label: 'Anfragen', badge: true },
  { id: 'rechnungen',  icon: 'rechnung',    label: 'Rechnungen' },
  { id: 'angebote',    icon: 'angebot',     label: 'Angebote' },
  { id: 'kalender',    icon: 'kalender',    label: 'Kalender' },
  { id: 'kunden',      icon: 'kunden',      label: 'Kunden' },
  { id: 'flotte',      icon: 'flotte',      label: 'Flotte' },
  { id: 'buchhaltung', icon: 'buchhaltung', label: 'Buchhaltung' },
];

// Farbiges Buchstaben-Badge pro Gerät (ersetzt abstrakte Icons)
function GeraetBadge({ geraet, size = 36 }) {
  if (!geraet) return null;
  const bg = geraet.farbe || '#6B6B66';
  const dark = ['#F7C72A','#B5D334','#F39222'].includes(bg);
  return (
    <div style={{ width: size, height: size, flex: '0 0 auto', borderRadius: Math.round(size * 0.22),
      background: bg, display: 'grid', placeItems: 'center',
      boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,.12)' }}>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: Math.round(size * 0.33),
        color: dark ? '#141414' : '#fff', letterSpacing: '-0.02em' }}>{geraet.kuerzel || '?'}</span>
    </div>
  );
}
window.GeraetBadge = GeraetBadge;

// Logo-Marke: kompakter Seitenriss eines Minibaggers (gefüllte Silhouette)
function LogoMark({ size = 26, ink = '#141414', accent = '#F7C72A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Bagger">
      {/* Kette / Fahrwerk */}
      <rect x="4" y="35" width="34" height="9" rx="4.5" fill={ink} />
      <circle cx="10.5" cy="39.5" r="1.5" fill={accent} />
      <circle cx="21" cy="39.5" r="1.5" fill={accent} />
      <circle cx="31.5" cy="39.5" r="1.5" fill={accent} />
      {/* Oberwagen / Kabine */}
      <path d="M9 20 q0-3.2 3.2-3.2 H23 q3 0 3 3 V34 H9 Z" fill={ink} />
      {/* Fensterscheibe */}
      <rect x="12" y="21.5" width="7.5" height="6.5" rx="1.4" fill={accent} />
      {/* Ausleger (Boom) */}
      <path d="M24.5 23 L38 13.5" stroke={ink} strokeWidth="4.4" strokeLinecap="round" />
      {/* Stiel */}
      <path d="M37.5 14 L42 24" stroke={ink} strokeWidth="3.8" strokeLinecap="round" />
      {/* Tieflöffel / Schaufel */}
      <path d="M38.5 22.5 q5.5 0.5 4.8 6.2 l-7.6 -0.6 q-1-3.6 2.8-5.6 Z" fill={ink} />
    </svg>
  );
}

function Logo({ size = 'md', tone = 'dark' }) {
  const big = size === 'lg';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{
        width: big ? 44 : 38, height: big ? 44 : 38, flex: '0 0 auto',
        background: 'var(--yellow)', borderRadius: 5,
        display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,.18)',
      }}>
        <LogoMark size={big ? 32 : 28} />
      </div>
      <div style={{ lineHeight: 1.05 }}>
        <div style={{ fontWeight: 700, fontSize: big ? 16 : 14.5, color: tone === 'dark' ? 'var(--on-dark)' : 'var(--ink)', letterSpacing: '-0.01em' }}>FRIESEN</div>
        <div className="kicker" style={{ color: 'var(--yellow)', fontSize: big ? 10 : 9, marginTop: 2 }}>Bau &amp; Mietservice</div>
      </div>
    </div>
  );
}
window.LogoMark = LogoMark;

function Sidebar({ active = 'dashboard', variant = 'A', onNav }) {
  const C = window.FRIESEN.COMPANY;
  return (
    <aside style={{
      width: 232, flex: '0 0 232px', background: 'var(--ink)', color: 'var(--on-dark)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)',
      borderRight: '1px solid var(--ink-line)',
    }}>
      {variant === 'B' && <div className="hazard-thin" style={{ height: 6 }} />}
      <div style={{ padding: '20px 18px 18px' }}>
        <Logo />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 12px', flex: 1 }}>
        <div className="kicker" style={{ color: 'var(--on-dark-muted)', padding: '8px 8px 6px', opacity: 0.7 }}>Navigation</div>
        {NAV.map((n) => {
          const on = n.id === active;
          const neuCount = n.badge && window.FRIESEN ? (window.__anfragenCount || 0) : 0;
          return (
            <button key={n.id} onClick={() => onNav && onNav(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '10px 11px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: on ? 'var(--ink-3)' : 'transparent',
              color: on ? '#fff' : 'var(--on-dark-muted)',
              borderLeft: on ? '3px solid var(--yellow)' : '3px solid transparent',
              borderRadius: '0 4px 4px 0', font: 'inherit', fontSize: 14,
              fontWeight: on ? 600 : 500, transition: 'background .12s, color .12s',
            }}>
              <Icon name={n.icon} size={19} color={on ? 'var(--yellow)' : 'currentColor'} stroke={1.7} />
              {n.label}
              {neuCount > 0 && <span style={{ marginLeft: 'auto', background: 'var(--yellow)', color: 'var(--ink)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8 }}>{neuCount}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--ink-line)', fontSize: 11.5, color: 'var(--on-dark-muted)' }}>
        <div style={{ fontWeight: 600, color: 'var(--on-dark)', fontSize: 12.5 }}>{C.owner}</div>
        <div style={{ marginTop: 2 }}>{C.city}</div>
        <div className="kicker" style={{ marginTop: 8, color: 'var(--yellow)', fontSize: 9 }}>§19 UStG · Kleinunternehmer</div>
        <button onClick={() => window.__resetDemo && window.__resetDemo()} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--on-dark-muted)', font: 'inherit', fontSize: 11, cursor: 'pointer', padding: 0, opacity: 0.8 }} title="Demo-Daten zurücksetzen">
          <Icon name="trash" size={13} /> Demo zurücksetzen
        </button>
      </div>
    </aside>
  );
}

// Status pill — uses status palette from theme
const STATUS_COLOR = {
  ok:     { fg: 'var(--ok)',     bg: 'var(--ok-wash)' },
  open:   { fg: 'var(--open)',   bg: 'var(--open-wash)' },
  warn:   { fg: 'var(--warn)',   bg: 'var(--warn-wash)' },
  danger: { fg: 'var(--danger)', bg: 'var(--danger-wash)' },
  draft:  { fg: 'var(--draft)',  bg: 'var(--paper-3)' },
};
function Pill({ status, label, style }) {
  const meta = window.FRIESEN.STATUS[status] || { label: status || '—', cls: 'draft' };
  const c = STATUS_COLOR[meta.cls] || STATUS_COLOR.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px',
      borderRadius: 2, background: c.bg, color: c.fg, fontSize: 11.5, fontWeight: 600,
      fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 1, background: c.fg, flex: '0 0 auto' }} />
      {label || meta.label}
    </span>
  );
}

window.NAV = NAV;
window.Logo = Logo;
window.Sidebar = Sidebar;
window.Pill = Pill;
window.STATUS_COLOR = STATUS_COLOR;
