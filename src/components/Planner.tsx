import { useEffect, useMemo, useState } from 'react';
import {
  LITERS_PER_GAL,
  SPECIES,
  SPECIES_BY_SLUG,
  TANK_PRESETS,
  compatible,
  decodePlan,
  encodePlan,
  evaluate,
  tankGallons,
  type Stock,
  type Tank,
} from '../lib/planner';
import './planner.css';

type Units = 'us' | 'metric';

const fToC = (f: number) => Math.round(((f - 32) * 5) / 9);

export default function Planner() {
  const [tank, setTank] = useState<Tank>(TANK_PRESETS[3]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [units, setUnits] = useState<Units>('us');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load a shared plan from the URL once, on the client.
  useEffect(() => {
    if (window.location.search) {
      const plan = decodePlan(window.location.search);
      setTank(plan.tank);
      setStock(plan.stock);
    }
    try {
      if (localStorage.getItem('tt-units') === 'metric') setUnits('metric');
    } catch {}
    setLoaded(true);
  }, []);

  // Keep the URL in sync so the address bar is always a share link.
  useEffect(() => {
    if (!loaded) return;
    const qs = encodePlan(tank, stock);
    window.history.replaceState(null, '', `${window.location.pathname}?${qs}`);
  }, [tank, stock, loaded]);

  const result = useMemo(() => evaluate(tank, stock), [tank, stock]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SPECIES.filter(
      (s) =>
        !stock.some((x) => x.slug === s.slug) &&
        (s.name.toLowerCase().includes(q) || s.scientific.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [query, stock]);

  // Fish that get along with everything already chosen and fit the tank.
  const suggestions = useMemo(() => {
    if (stock.length === 0) return [];
    const chosen = stock.map((s) => SPECIES_BY_SLUG.get(s.slug)!).filter(Boolean);
    return SPECIES.filter(
      (s) =>
        !stock.some((x) => x.slug === s.slug) &&
        s.minTankGal <= result.gallons &&
        chosen.every((c) => compatible(c, s)),
    ).slice(0, 6);
  }, [stock, result.gallons]);

  const add = (slug: string) => {
    const s = SPECIES_BY_SLUG.get(slug);
    if (!s) return;
    setStock((prev) => [...prev, { slug, qty: s.minGroup }]);
    setQuery('');
  };
  const setQty = (slug: string, qty: number) =>
    setStock((prev) => prev.map((x) => (x.slug === slug ? { ...x, qty: Math.max(0, Math.min(200, qty)) } : x)));
  const remove = (slug: string) => setStock((prev) => prev.filter((x) => x.slug !== slug));

  const toggleUnits = () => {
    const next: Units = units === 'us' ? 'metric' : 'us';
    setUnits(next);
    try {
      localStorage.setItem('tt-units', next);
    } catch {}
  };

  const vol = (gal: number) =>
    units === 'us' ? `${Math.round(gal)} gal` : `${Math.round(gal * LITERS_PER_GAL)} L`;
  const len = (inches: number) =>
    units === 'us' ? `${inches} in` : `${Math.round(inches * 2.54)} cm`;
  const temp = (r: [number, number]) =>
    units === 'us' ? `${r[0]}–${r[1]} °F` : `${fToC(r[0])}–${fToC(r[1])} °C`;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', window.location.href);
    }
  };

  const isPreset = TANK_PRESETS.some((t) => t.id === tank.id);
  const barPct = Math.min(result.stockingPct, 130);

  return (
    <div className="planner">
      <section className="card step">
        <div className="step-head">
          <h2>1. Your tank</h2>
          <button type="button" onClick={toggleUnits} aria-label="Switch units">
            {units === 'us' ? 'US units' : 'Metric'}
          </button>
        </div>
        <label className="field">
          <span>Tank size</span>
          <select
            value={isPreset ? tank.id : 'custom'}
            onChange={(e) => {
              const preset = TANK_PRESETS.find((t) => t.id === e.target.value);
              setTank(preset ?? { ...tank, id: 'custom', label: 'Custom' });
            }}
          >
            {TANK_PRESETS.map((t) => (
              <option key={t.id} value={t.id}>
                {units === 'us' ? t.label : `${Math.round(parseInt(t.id, 10) * LITERS_PER_GAL)} L (${t.label})`}
              </option>
            ))}
            <option value="custom">Custom size</option>
          </select>
        </label>
        {!isPreset && (
          <div className="dims">
            {(['lengthIn', 'widthIn', 'heightIn'] as const).map((k) => (
              <label key={k} className="field">
                <span>
                  {k === 'lengthIn' ? 'Length' : k === 'widthIn' ? 'Width' : 'Height'} ({units === 'us' ? 'in' : 'cm'})
                </span>
                <input
                  type="number"
                  min={1}
                  inputMode="decimal"
                  value={units === 'us' ? tank[k] : Math.round(tank[k] * 2.54)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setTank({ ...tank, [k]: units === 'us' ? v : Math.round((v / 2.54) * 10) / 10 });
                  }}
                />
              </label>
            ))}
          </div>
        )}
        <p className="muted small">
          {len(tank.lengthIn)} × {len(tank.widthIn)} × {len(tank.heightIn)}, about {vol(isPreset ? result.gallons : tankGallons(tank))}
        </p>
      </section>

      <section className="card step">
        <h2>2. Your fish</h2>
        <div className="search">
          <input
            type="search"
            placeholder="Search fish, e.g. neon tetra"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches[0]) add(matches[0].slug);
            }}
            aria-label="Search fish"
          />
          {matches.length > 0 && (
            <ul className="results" role="listbox">
              {matches.map((s) => (
                <li key={s.slug}>
                  <button type="button" onClick={() => add(s.slug)}>
                    <strong>{s.name}</strong> <span className="muted">{len(s.sizeIn)} adult</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {stock.length === 0 ? (
          <p className="muted">Add a fish to start. Try neon tetra, guppy or betta.</p>
        ) : (
          <ul className="stock">
            {stock.map(({ slug, qty }) => {
              const s = SPECIES_BY_SLUG.get(slug)!;
              return (
                <li key={slug}>
                  <div>
                    <a href={`/fish/${slug}/`}>{s.name}</a>
                    <div className="muted small">
                      {len(s.sizeIn)} adult · {s.temperament} · {s.level} level
                    </div>
                  </div>
                  <div className="qty">
                    <button type="button" onClick={() => setQty(slug, qty - 1)} aria-label={`Fewer ${s.name}`}>
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(e) => setQty(slug, parseInt(e.target.value, 10) || 0)}
                      aria-label={`Number of ${s.name}`}
                    />
                    <button type="button" onClick={() => setQty(slug, qty + 1)} aria-label={`More ${s.name}`}>
                      +
                    </button>
                    <button type="button" className="remove" onClick={() => remove(slug)} aria-label={`Remove ${s.name}`}>
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {suggestions.length > 0 && (
          <div className="suggest">
            <span className="muted small">Gets along with your fish:</span>
            <div className="chips-row">
              {suggestions.map((s) => (
                <button type="button" key={s.slug} onClick={() => add(s.slug)}>
                  + {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card verdict" aria-live="polite">
        <h2>3. Verdict</h2>
        <div className="meter">
          <div className="meter-label">
            <span>Stocking</span>
            <strong className={`lvl-${result.stockingLabel}`}>
              {result.stockingLabel === 'empty' ? 'No fish yet' : `${result.stockingPct}% · ${result.stockingLabel}`}
            </strong>
          </div>
          <div className="bar">
            <div className={`fill lvl-${result.stockingLabel}`} style={{ width: `${(barPct / 130) * 100}%` }} />
            <div className="tick" style={{ left: `${(100 / 130) * 100}%` }} />
          </div>
        </div>

        {result.totalFish > 0 && (
          <ul className="issues">
            {result.issues.length === 0 && <li className="sev-ok">No problems found. These fish should live well together.</li>}
            {result.issues.map((i) => (
              <li key={i.message} className={`sev-${i.severity}`}>
                {i.message}
              </li>
            ))}
          </ul>
        )}

        {result.totalFish > 0 && (
          <table className="facts">
            <tbody>
              <tr>
                <th>Temperature</th>
                <td>{result.water.tempF ? temp(result.water.tempF) : 'No shared range'}</td>
              </tr>
              <tr>
                <th>pH</th>
                <td>{result.water.ph ? `${result.water.ph[0]}–${result.water.ph[1]}` : 'No shared range'}</td>
              </tr>
              <tr>
                <th>Hardness</th>
                <td>{result.water.gh ? `${result.water.gh[0]}–${result.water.gh[1]} dGH` : 'No shared range'}</td>
              </tr>
              <tr>
                <th>Filter flow</th>
                <td>
                  {units === 'us'
                    ? `${result.filterGph[0]}–${result.filterGph[1]} gallons per hour`
                    : `${Math.round(result.filterGph[0] * LITERS_PER_GAL)}–${Math.round(result.filterGph[1] * LITERS_PER_GAL)} liters per hour`}
                </td>
              </tr>
              <tr>
                <th>Heater</th>
                <td>{result.heaterWatts ? `${result.heaterWatts} W` : 'Not needed for these cool-water fish'}</td>
              </tr>
            </tbody>
          </table>
        )}

        <button type="button" className="primary share" onClick={share} disabled={stock.length === 0}>
          {copied ? 'Link copied' : 'Copy share link'}
        </button>
      </section>
    </div>
  );
}
