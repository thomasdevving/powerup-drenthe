import React, {useMemo, useState} from 'react';
import {simulate, type Settings} from './sim';
import {Billing, Seg} from './Demo';
import './demo.css';

/** Apart tabblad: hoe er wordt gefactureerd, per bedrijf. Deelt het scenario met het dashboard. */
export const BillingPage: React.FC<{tabs: React.ReactNode; s: Settings; setS: React.Dispatch<React.SetStateAction<Settings>>}> = ({tabs, s, setS}) => {
  const set = (p: Partial<Settings>) => setS((prev) => ({...prev, ...p}));
  const r = useMemo(() => simulate(s), [s]);
  const other = useMemo(() => simulate({...s, hub: !s.hub}), [s]);
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="demo">
      <header className="d-top">
        <div className="brand">
          <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#21e6d0" strokeWidth="9" />
            <path d="M54 18 L32 54 L50 54 L44 82 L68 44 L50 44 Z" fill="#ffd23f" />
          </svg>
          <div>
            <div className="name">Energy Hub</div>
            <div className="sub">Facturatie · demo</div>
          </div>
        </div>
        {tabs}
      </header>

      <section className="intro">
        <h1>Eén factuur voor het terrein. Iedereen betaalt naar gebruik.</h1>
        <p>
          De leverancier factureert de coöperatie voor de afgesproken levering. De coöperatie verdeelt de kosten per bedrijf op basis van de meetdata uit het dashboard: wat je uit het net, uit eigen opwek en uit de batterij gebruikt, plus een vaste bijdrage voor je gegarandeerde minimum. Wie verbruik schuift of zelf opwekt, krijgt een vergoeding.
        </p>
      </section>

      <div className="billing-controls panel">
        <Seg
          label="Situatie"
          value={s.hub ? 'hub' : 'nu'}
          onChange={(v) => set({hub: v === 'hub'})}
          options={[{v: 'nu', label: 'Zonder hub', tone: 'red'}, {v: 'hub', label: 'Met Energy Hub', tone: 'cyan'}]}
        />
        <Seg label="Seizoen" value={s.season} onChange={(v) => set({season: v as Settings['season']})} options={[{v: 'winter', label: 'Winter'}, {v: 'zomer', label: 'Zomer'}]} />
        <p className="muted">Zelfde scenario als op het dashboard. Batterij, opwek en gedragsregels stel je daar in.</p>
      </div>

      <Billing r={r} other={other} s={s} open={open} setOpen={setOpen} />
      <footer className="d-foot muted">Energiek Innovatie Collectief · PowerUp Drenthe 2026 · demo met indicatieve tarieven, geen echte facturen</footer>
    </div>
  );
};
