// app.jsx — small React app that hosts only the Tweaks panel.
// The page itself is static HTML; tweaks mutate CSS variables and call into
// window.__scene to update the three.js materials.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#0a0a0a", "#e8e6dd", "#ff5b2e", "#2a2622"],
  "motion": 100
}/*EDITMODE-END*/;

// Each palette: [bg, fg/cream, accent, dim-charcoal]
const PALETTES = [
  ["#0a0a0a", "#e8e6dd", "#ff5b2e", "#2a2622"], // signal orange (default)
  ["#0a0a0a", "#e8e6dd", "#2a6fdb", "#1c2230"], // electric blue
  ["#0a0a0a", "#e6ead8", "#86efac", "#1d2620"], // mint
  ["#0d0a14", "#f0e6dd", "#a78bfa", "#221a2e"], // ultraviolet
  ["#f5f3ee", "#1a1a1a", "#ff5b2e", "#d8d3c8"], // daylight
];

function applyPalette(p) {
  const r = document.documentElement.style;
  r.setProperty('--bg', p[0]);
  r.setProperty('--fg', p[1]);
  r.setProperty('--accent', p[2]);
  r.setProperty('--dim', p[3]);
  // muted variant: blend fg toward bg
  document.documentElement.dataset.lightTheme = p[0].toLowerCase() === '#f5f3ee' ? '1' : '0';
  if (window.__scene) window.__scene.refreshMaterials();
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => { applyPalette(t.palette); }, [t.palette]);
  React.useEffect(() => {
    if (window.__scene) window.__scene.setIntensity(t.motion / 100);
  }, [t.motion]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Palette">
        <TweakColor
          label="Theme"
          value={t.palette}
          options={PALETTES}
          onChange={(v) => setTweak('palette', v)}
        />
      </TweakSection>
      <TweakSection label="Motion">
        <TweakSlider
          label="Scene intensity"
          value={t.motion}
          min={0}
          max={200}
          step={5}
          unit="%"
          onChange={(v) => setTweak('motion', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// Mount into a dedicated root so the rest of the page stays static HTML
const root = ReactDOM.createRoot(document.getElementById('tweaks-root'));
root.render(<App />);
