import { useState } from 'react';
import {
  CM_PER_IN,
  FILLED_FRACTION,
  L_PER_GAL,
  bowfrontGallons,
  changePercentForNitrate,
  cylinderGallons,
  dose,
  rectGallons,
  substrateLiters,
  substratePounds,
} from '../lib/calcs';
import './planner.css';

export type CalcKind = 'volume' | 'water-change' | 'conditioner' | 'medication' | 'substrate';
type Units = 'us' | 'metric';

const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d).replace(/\.0+$/, '') : '–');

function Num({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {suffix ? ` (${suffix})` : ''}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

function Result({ main, sub }: { main: string; sub?: string }) {
  return (
    <div className="calc-result" aria-live="polite">
      <strong>{main}</strong>
      {sub && <span>{sub}</span>}
    </div>
  );
}

export default function Calculator({ kind }: { kind: CalcKind }) {
  const [units, setUnits] = useState<Units>('us');
  const len = units === 'us' ? 'in' : 'cm';
  const vol = units === 'us' ? 'gal' : 'L';
  // Convert an entered length to inches and an entered volume to gallons.
  const toIn = (v: number) => (units === 'us' ? v : v / CM_PER_IN);
  const showVol = (gal: number) =>
    units === 'us' ? `${fmt(gal)} gallons (${fmt(gal * L_PER_GAL)} L)` : `${fmt(gal * L_PER_GAL)} liters (${fmt(gal)} US gal)`;

  const unitToggle = (
    <div className="calc-units">
      <button type="button" className={units === 'us' ? 'primary' : ''} onClick={() => setUnits('us')}>
        Inches, gallons
      </button>
      <button type="button" className={units === 'metric' ? 'primary' : ''} onClick={() => setUnits('metric')}>
        cm, liters
      </button>
    </div>
  );

  // Volume
  const [shape, setShape] = useState<'rect' | 'bow' | 'cyl'>('rect');
  const [l, setL] = useState(30);
  const [w, setW] = useState(12);
  const [h, setH] = useState(12);
  const [bow, setBow] = useState(3);
  const [d, setD] = useState(12);

  // Water change
  const [tankVol, setTankVol] = useState(20);
  const [pct, setPct] = useState(25);
  const [no3, setNo3] = useState(40);
  const [no3Target, setNo3Target] = useState(20);

  // Dosing
  const [doseVol, setDoseVol] = useState(kind === 'conditioner' ? 5 : 20);
  const [labelAmt, setLabelAmt] = useState(kind === 'conditioner' ? 5 : 1);
  const [labelVol, setLabelVol] = useState(kind === 'conditioner' ? 50 : 10);
  const [labelUnit, setLabelUnit] = useState(kind === 'conditioner' ? 'ml' : 'tablet');

  // Substrate
  const [depth, setDepth] = useState(2);

  if (kind === 'volume') {
    const gal =
      shape === 'rect'
        ? rectGallons(toIn(l), toIn(w), toIn(h))
        : shape === 'bow'
          ? bowfrontGallons(toIn(l), toIn(w), toIn(bow), toIn(h))
          : cylinderGallons(toIn(d), toIn(h));
    return (
      <div className="card calc">
        {unitToggle}
        <label className="field">
          <span>Tank shape</span>
          <select value={shape} onChange={(e) => setShape(e.target.value as typeof shape)}>
            <option value="rect">Rectangle</option>
            <option value="bow">Bowfront</option>
            <option value="cyl">Cylinder</option>
          </select>
        </label>
        <div className="calc-grid">
          {shape === 'cyl' ? (
            <Num label="Diameter" suffix={len} value={d} onChange={setD} />
          ) : (
            <>
              <Num label="Length" suffix={len} value={l} onChange={setL} />
              <Num label={shape === 'bow' ? 'Depth at the ends' : 'Width'} suffix={len} value={w} onChange={setW} />
              {shape === 'bow' && <Num label="Extra depth at the bow" suffix={len} value={bow} onChange={setBow} />}
            </>
          )}
          <Num label="Height" suffix={len} value={h} onChange={setH} />
        </div>
        <Result
          main={showVol(gal)}
          sub={`About ${units === 'us' ? `${fmt(gal * FILLED_FRACTION)} gal` : `${fmt(gal * FILLED_FRACTION * L_PER_GAL)} L`} of actual water once substrate, decor and the gap below the rim are taken out.`}
        />
        <p className="small muted">Use the inside measurements if you can. Outside measurements add the glass thickness and slightly overstate the volume.</p>
      </div>
    );
  }

  if (kind === 'water-change') {
    const removeGal = (tankVol * pct) / 100;
    const needed = changePercentForNitrate(no3, no3Target);
    return (
      <div className="card calc">
        {unitToggle}
        <h3>How much water to change</h3>
        <div className="calc-grid">
          <Num label="Tank volume" suffix={vol} value={tankVol} onChange={setTankVol} />
          <Num label="Change" suffix="%" value={pct} onChange={setPct} />
        </div>
        <Result main={`Remove ${fmt(removeGal)} ${vol}`} sub={`Then refill with ${fmt(removeGal)} ${vol} of treated, temperature-matched water.`} />
        <h3>Bring nitrate down</h3>
        <div className="calc-grid">
          <Num label="Nitrate now" suffix="ppm" value={no3} onChange={setNo3} />
          <Num label="Target" suffix="ppm" value={no3Target} onChange={setNo3Target} />
        </div>
        <Result
          main={needed === 0 ? 'No change needed' : `Change ${needed}% of the water`}
          sub={
            needed > 50
              ? 'That is a big change. Split it into two smaller changes a day apart to avoid shocking your fish.'
              : needed > 0
                ? `That is ${fmt((tankVol * needed) / 100)} ${vol} for this tank.`
                : undefined
          }
        />
      </div>
    );
  }

  if (kind === 'conditioner' || kind === 'medication') {
    const amount = dose(doseVol, labelAmt, labelVol);
    return (
      <div className="card calc">
        {unitToggle}
        <div className="calc-grid">
          <Num
            label={kind === 'conditioner' ? 'New water you are adding' : 'Water in the tank'}
            suffix={vol}
            value={doseVol}
            onChange={setDoseVol}
          />
        </div>
        <p className="small muted">From the bottle label:</p>
        <div className="calc-grid">
          <Num label="Dose" value={labelAmt} onChange={setLabelAmt} />
          <label className="field">
            <span>Unit</span>
            <select value={labelUnit} onChange={(e) => setLabelUnit(e.target.value)}>
              {['ml', 'drops', 'teaspoons', 'tablet', 'packet', 'scoop'].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <Num label="Treats" suffix={vol} value={labelVol} onChange={setLabelVol} />
        </div>
        <Result main={`Add ${fmt(amount, 2)} ${labelUnit}`} sub={`For ${fmt(doseVol)} ${vol}, at ${fmt(labelAmt, 2)} ${labelUnit} per ${fmt(labelVol)} ${vol}.`} />
        {kind === 'medication' && (
          <p className="small muted">
            Dose for the water actually in the tank, not the size on the box, which is usually about 15% more. Remove carbon from the filter during treatment and always follow the label.
          </p>
        )}
      </div>
    );
  }

  // Substrate
  const lb = substratePounds(toIn(l), toIn(w), toIn(depth));
  const liters = substrateLiters(toIn(l), toIn(w), toIn(depth));
  return (
    <div className="card calc">
      {unitToggle}
      <div className="calc-grid">
        <Num label="Tank length" suffix={len} value={l} onChange={setL} />
        <Num label="Tank width" suffix={len} value={w} onChange={setW} />
        <Num label="Depth of substrate" suffix={len} value={depth} onChange={setDepth} />
      </div>
      <Result
        main={`${fmt(lb, 0)} lb of sand or gravel (${fmt(lb * 0.4536, 0)} kg)`}
        sub={`Or ${fmt(liters)} liters of aquasoil, which is sold by volume.`}
      />
      <p className="small muted">1 to 2 inches suits most fish. Planted tanks do better with 2 to 3 inches.</p>
    </div>
  );
}
