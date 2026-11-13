import React, {useEffect, useState} from 'react';
import {Demo} from './demo/Demo';
import {BillingPage} from './demo/BillingPage';
import {DEFAULT_SETTINGS, type Settings} from './demo/sim';
import {MapView} from './App';

type Route = 'demo' | 'facturatie' | 'plattegrond';
const ROUTES: {id: Route; label: string; title: string}[] = [
  {id: 'demo', label: 'Demo dashboard', title: 'Energy Hub · Demo dashboard'},
  {id: 'facturatie', label: 'Facturatie', title: 'Energy Hub · Facturatie'},
  {id: 'plattegrond', label: 'Plattegrond', title: 'Energy Hub · Plattegrond'},
];
const read = (): Route => {
  const h = window.location.hash.replace('#', '');
  return (ROUTES.find((r) => r.id === h)?.id ?? 'demo') as Route;
};

/** Dashboard-demo is de startpagina; facturatie en plattegrond zijn de volgende tabbladen. */
export const Root: React.FC = () => {
  const [route, setRoute] = useState<Route>(read);
  // Scenario wordt gedeeld tussen dashboard en facturatie.
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    document.title = ROUTES.find((r) => r.id === route)!.title;
    document.body.style.cursor = 'default';
  }, [route]);
  const tabs = (
    <nav className="tabs" aria-label="Onderdelen">
      {ROUTES.map((r) => (
        <a key={r.id} href={`#${r.id}`} className={route === r.id ? 'active' : ''} aria-current={route === r.id ? 'page' : undefined}>
          {r.label}
        </a>
      ))}
    </nav>
  );
  if (route === 'plattegrond') return <MapView tabs={tabs} />;
  if (route === 'facturatie') return <BillingPage tabs={tabs} s={settings} setS={setSettings} />;
  return <Demo tabs={tabs} s={settings} setS={setSettings} />;
};
