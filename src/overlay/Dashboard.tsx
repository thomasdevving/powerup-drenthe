import React from 'react';
import {C} from '../util';
import {PITCH_DAY, PITCH_DAYS} from '../energy/pitch-data';

/** Exact dezelfde illustratieve winterdag als de interactieve applicatie. */
export const Dashboard: React.FC<{p: number; sec: number}> = ({p}) => {
  const x = PITCH_DAY.steps[Math.min(95, Math.floor(p * 95))];
  const n = (v: number) => Math.round(v).toLocaleString('nl-NL');
  const rows = [
    {title: 'Elektriciteit', color: C.solar, value: `${n(x.grid)} kW`, sub: `net · ${n(x.solar + x.wind)} kW opwek`},
    {title: 'Warmte', color: '#ff9d2e', value: `${n(x.directHeat + x.bufferDischarge)} kWth`, sub: `nuttig · ${n(x.backupHeat)} kWth aanvullend`},
    {title: 'Koude', color: '#65baff', value: `${n(x.coldDemand)} kWth`, sub: `koelvraag · ${n(x.coolingElectric)} kW stroom`},
  ];
  return <svg viewBox="0 0 640 360" width="100%" height="100%" style={{fontFamily: 'Inter, sans-serif'}}>
    <text x="26" y="40" fill="white" fontSize="24" fontWeight="800">Multi-Commodity Energy Hub</text>
    <text x="26" y="64" fill="#aebecb" fontSize="14">Illustratieve winterdag · gedeeld kwartiermodel</text>
    {rows.map((r, i) => <g key={r.title} transform={`translate(${26 + i * 204},90)`}>
      <rect width="186" height="144" rx="12" fill="#162b39"/>
      <rect width="186" height="4" rx="2" fill={r.color}/>
      <text x="12" y="33" fill={r.color} fontSize="18" fontWeight="700">{r.title}</text>
      <text x="12" y="79" fill="white" fontSize="23" fontWeight="800">{r.value}</text>
      <text x="12" y="115" fill="#b4c4d1" fontSize="11">{r.sub}</text>
    </g>)}
    <text x="26" y="273" fill="white" fontSize="17" fontWeight="700">Gevraagde netpiek · gelijke bedrijfsactiviteiten</text>
    {PITCH_DAYS.map((d, i) => <g key={d.scenario} transform={`translate(${26 + i * 204},295)`}>
      <text fill={i === 2 ? C.gridGreen : '#b4c4d1'} fontSize="14">{d.scenario} · {n(d.kpi.peakRequired)} kW</text>
      <rect y="12" width={170 * d.kpi.peakRequired / Math.max(...PITCH_DAYS.map(v => v.kpi.peakRequired))} height="8" rx="4" fill={i === 2 ? C.gridGreen : C.grid}/>
    </g>)}
    <text x="26" y="344" fill="#aebecb" fontSize="11">WKO / koudeopslag optioneel · technische en financiële haalbaarheid vereist</text>
  </svg>;
};
