/* Industrial line-icons — exported to window.Icon */
function Icon({ name, size = 22, stroke = 1.7, color = 'currentColor', fill = 'none', style }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill,
    stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    style,
  };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
    rechnung: <><path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></>,
    angebot: <><path d="M6 2h12a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V3a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 12h6"/></>,
    kalender: <><rect x="3" y="4" width="18" height="17" rx="1"/><path d="M3 9h18M8 2v4M16 2v4"/></>,
    kunden: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 4.5a3 3 0 0 1 0 6M21 20c0-2.4-1.2-4.2-3.2-5"/></>,
    flotte: <><path d="M2 16V8h10v8"/><path d="M12 11h4l3 3v2h-7"/><circle cx="6" cy="18" r="2"/><circle cx="16.5" cy="18" r="2"/><path d="M2 16h2M8 16h6.5M18.5 16H22v-2"/></>,
    buchhaltung: <><path d="M4 3h16v18H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    bagger: <><path d="M3 19h12v-4H3z"/><circle cx="6" cy="19" r="1.5"/><circle cx="12" cy="19" r="1.5"/><path d="M9 15V9h3l5-5"/><path d="M15 9l4 2-1 4"/><path d="M9 12H6"/></>,
    anhaenger: <><path d="M2 16h16v-5H2z"/><path d="M18 13h3l1 3h-4"/><circle cx="9" cy="18" r="1.6"/><circle cx="20" cy="18" r="1.6"/><path d="M2 16v2h4M12 18h6"/></>,
    ruettler: <><rect x="6" y="3" width="12" height="6" rx="1"/><path d="M12 9v8M9 17h6M8 21l1-3M16 21l-1-3"/></>,
    tool: <><path d="M14 7a4 4 0 0 1-5 5l-6 6 2 2 6-6a4 4 0 0 0 5-5z"/><path d="M14 7l3-3 3 3-3 3"/></>,
    euro: <><path d="M17 5a7 7 0 1 0 0 14"/><path d="M3 10h9M3 14h9"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    alert: <><path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18h.01"/></>,
    check: <><path d="M20 6 9 17l-5-5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    print: <><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M7 17h10v4H7z"/></>,
    arrowUp: <><path d="M12 19V5M6 11l6-6 6 6"/></>,
    arrowDown: <><path d="M12 5v14M18 13l-6 6-6-6"/></>,
    arrowRight: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></>,
    phone: <><path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/></>,
    pin: <><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></>,
    bell: <><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
    x: <><path d="M6 6l12 12M18 6 6 18"/></>,
    edit: <><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></>,
    file: <><path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M14 2v6h6"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/></>,
    chevron: <><path d="M9 6l6 6-6 6"/></>,
    chevronD: <><path d="M6 9l6 6 6-6"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}
window.Icon = Icon;
