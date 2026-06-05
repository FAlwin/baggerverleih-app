/* ============ TWEAKS: drei Regler, die die Haltung verändern ============ */
const { useEffect: twE } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": ["#F7C72A", "#E0AC00", "#FBE9A0", "#FDF6DC"],
  "dichte": "Standard",
  "charakter": "Werkstatt"
}/*EDITMODE-END*/;

// Kuratierte Hochsichtbarkeits-Paletten (alle mit dunklem Text lesbar)
const ACCENTS = [
  ['#F7C72A', '#E0AC00', '#FBE9A0', '#FDF6DC'], // Signalgelb
  ['#F39222', '#D2740C', '#FAD3A6', '#FCEBD9'], // Sicherheitsorange
  ['#B5D334', '#94B017', '#E2EFAD', '#F2F7DD'], // Neongrün
  ['#3FB6D3', '#2090AD', '#BEE6F0', '#E2F4F9'], // Eisblau
];

function FriesenTweaks() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  twE(() => {
    const root = document.documentElement;
    const a = t.accent || ACCENTS[0];
    root.style.setProperty('--yellow', a[0]);
    root.style.setProperty('--yellow-deep', a[1]);
    root.style.setProperty('--yellow-soft', a[2]);
    root.style.setProperty('--yellow-wash', a[3]);
    document.body.dataset.dichte = { Kompakt: 'kompakt', Standard: 'standard', Weit: 'weit' }[t.dichte] || 'standard';
    document.body.dataset.charakter = { Werkstatt: 'werkstatt', Glatt: 'glatt', Kantig: 'kantig' }[t.charakter] || 'werkstatt';
  }, [t.accent, t.dichte, t.charakter]);

  const T = window;
  return (
    <T.TweaksPanel>
      <T.TweakSection label="Signalfarbe" />
      <T.TweakColor label="Akzent der Marke" value={t.accent} options={ACCENTS} onChange={(v) => setTweak('accent', v)} />
      <T.TweakSection label="Layout-Haltung" />
      <T.TweakRadio label="Dichte" value={t.dichte} options={['Kompakt', 'Standard', 'Weit']} onChange={(v) => setTweak('dichte', v)} />
      <T.TweakRadio label="Charakter" value={t.charakter} options={['Werkstatt', 'Glatt', 'Kantig']} onChange={(v) => setTweak('charakter', v)} />
    </T.TweaksPanel>
  );
}

window.FriesenTweaks = FriesenTweaks;
