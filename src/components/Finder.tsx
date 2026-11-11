import { useMemo, useState } from 'react';
import { SPECIES, SPECIES_BY_SLUG, TANK_PRESETS, nominalGallons, type Species } from '../lib/planner';
import { SETUPS, setupLink, setupTank } from '../lib/setups';
import './planner.css';

type Water = 'any' | 'soft' | 'neutral' | 'hard';
type Care = 'easy' | 'moderate' | 'hard';

/** Typical pH and hardness for each tap water type, used to filter species. */
const WATER: Record<Exclude<Water, 'any'>, { ph: number; gh: number; label: string }> = {
  soft: { ph: 6.5, gh: 4, label: 'Soft (pH around 6.5)' },
  neutral: { ph: 7.2, gh: 10, label: 'Medium (pH around 7.2)' },
  hard: { ph: 7.8, gh: 18, label: 'Hard (pH around 7.8)' },
};
const CARE_RANK: Record<Care, number> = { easy: 0, moderate: 1, hard: 2 };

function fitsWater(s: Species, water: Water) {
  if (water === 'any') return true;
  const w = WATER[water];
  return s.ph[0] <= w.ph && w.ph <= s.ph[1] && s.gh[0] <= w.gh && w.gh <= s.gh[1];
}

export default function Finder() {
  const [tankId, setTankId] = useState('20L');
  const [water, setWater] = useState<Water>('any');
  const [heater, setHeater] = useState(true);
  const [care, setCare] = useState<Care>('moderate');

  const tank = TANK_PRESETS.find((t) => t.id === tankId)!;
  const gallons = nominalGallons(tank);

  const fishOk = (s: Species) =>
    s.minTankGal <= gallons &&
    fitsWater(s, water) &&
    CARE_RANK[s.care] <= CARE_RANK[care] &&
    (heater || s.tempF[0] <= 68);

  const fish = useMemo(
    () =>
      SPECIES.filter(fishOk).sort(
        (a, b) => CARE_RANK[a.care] - CARE_RANK[b.care] || a.name.localeCompare(b.name),
      ),
    [tankId, water, heater, care],
  );

  const setups = useMemo(
    () =>
      SETUPS.filter(
        (s) =>
          nominalGallons(setupTank(s)) <= gallons &&
          s.fish.every(([slug]) => {
            const sp = SPECIES_BY_SLUG.get(slug);
            return sp ? fishOk(sp) : false;
          }),
      ),
    [tankId, water, heater, care],
  );

  return (
    <div className="finder">
      <div className="card filters">
        <label className="field">
          <span>Tank size</span>
          <select value={tankId} onChange={(e) => setTankId(e.target.value)}>
            {TANK_PRESETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Your tap water</span>
          <select value={water} onChange={(e) => setWater(e.target.value as Water)}>
            <option value="any">I don't know</option>
            {(Object.keys(WATER) as (keyof typeof WATER)[]).map((k) => (
              <option key={k} value={k}>
                {WATER[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Experience</span>
          <select value={care} onChange={(e) => setCare(e.target.value as Care)}>
            <option value="easy">Beginner: easy fish only</option>
            <option value="moderate">Some experience</option>
            <option value="hard">Experienced: show everything</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={heater} onChange={(e) => setHeater(e.target.checked)} />
          <span>I have, or will buy, a heater</span>
        </label>
      </div>

      <h2>Ready-made setups</h2>
      {setups.length === 0 ? (
        <p className="muted">No ready-made setup fits these choices yet. Pick from the fish below instead.</p>
      ) : (
        <ul className="grid-fish">
          {setups.map((s) => (
            <li key={s.slug}>
              <a href={setupLink(s)}>
                <div className="card">
                  <strong>{s.name}</strong>
                  <br />
                  <small>
                    {setupTank(s).label} · {s.fish.map(([slug, n]) => `${n} ${SPECIES_BY_SLUG.get(slug)?.name}`).join(', ')}
                  </small>
                  <p className="small">{s.blurb}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

      <h2>
        {fish.length} fish that suit this tank
      </h2>
      <ul className="grid-fish">
        {fish.map((s) => (
          <li key={s.slug}>
            <a href={`/fish/${s.slug}/`}>
              <div className="card">
                <strong>{s.name}</strong>
                <br />
                <small>
                  {s.sizeIn} in · {s.minGroup > 1 ? `groups of ${s.minGroup}+` : 'solo or pair'} · {s.care}
                </small>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
