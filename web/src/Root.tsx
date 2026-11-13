import React, {useEffect, useState} from 'react';
import {Demo} from './demo/Demo';
import {MapView} from './App';

type Route = 'demo' | 'plattegrond';
const read = (): Route => (window.location.hash.replace('#', '') === 'plattegrond' ? 'plattegrond' : 'demo');

/** Dashboard-demo is de startpagina; de plattegrond is het tweede tabblad. */
export const Root: React.FC = () => {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    document.title = route === 'demo' ? 'Energy Hub · Demo dashboard' : 'Energy Hub · Plattegrond';
    document.body.style.cursor = 'default';
  }, [route]);
  const tabs = (
    <nav className="tabs" aria-label="Onderdelen">
      <a href="#demo" className={route === 'demo' ? 'active' : ''} aria-current={route === 'demo' ? 'page' : undefined}>
        Demo dashboard
      </a>
      <a href="#plattegrond" className={route === 'plattegrond' ? 'active' : ''} aria-current={route === 'plattegrond' ? 'page' : undefined}>
        Plattegrond
      </a>
    </nav>
  );
  return route === 'demo' ? <Demo tabs={tabs} /> : <MapView tabs={tabs} />;
};
