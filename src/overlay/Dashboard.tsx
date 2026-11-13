import React from 'react';
import {SCENES, cueFraction} from '../script';
import type {Story} from '../timeline';
import {C, clamp01, easeOut, seg} from '../util';

/** Dashboardinhoud (SVG 640×360) — alle animatie op scène-progress van scène 6. */

const FONT = 'Inter, system-ui, sans-serif';
const S = SCENES[5];
const cue = (w: string) => cueFraction(S, w);

const USAGE = [0.62, 0.48, 0.81, 0.55, 0.37, 0.9, 0.5, 0.42];
const MIN = 0.4;

// dagprofiel (24 uur), genormaliseerd
const base = (h: number) =>
  0.28 + 0.1 * Math.sin(((h - 6) / 24) * Math.PI * 2) + (h > 6 && h < 19 ? 0.18 : 0);
const peakBump = (h: number) => 0.38 * Math.exp(-Math.pow((h - 10) / 1.3, 2));
const solar = (h: number) => (h > 7 && h < 19 ? 0.22 * Math.sin(((h - 7) / 12) * Math.PI) : 0);

export const Dashboard: React.FC<{story: Story}> = ({story}) => {
  const c = story.cprog(5);
  const sec = story.sec;
  const appear = seg(c, 0.0, 0.18, easeOut);
  const minLine = seg(c, cue('gegarandeerd') - 0.04, cue('gegarandeerd') + 0.06);
  const shift = seg(c, cue('schuiven') - 0.03, cue('slim,') + 0.08);
  const sun = seg(c, cue('wekken') - 0.03, cue('op.') + 0.02);

  // ---- verbruik per pand (links)
  const bx = 28;
  const by = 78;
  const bw = 268;
  const bh = 230;
  const barW = 22;
  const gap = (bw - USAGE.length * barW) / (USAGE.length - 1);

  // ---- dagcurve (rechts)
  const cx = 340;
  const cy = 78;
  const cw = 272;
  const ch = 230;
  const cap = 0.68; // afgesproken hoeveelheid
  const yOf = (v: number) => cy + ch - v * ch;
  const xOf = (h: number) => cx + (h / 24) * cw;
  const demand = (h: number) => {
    // piekblok (9–11u) schuift naar een rustig moment (20–22u)
    const blockAt = 10 + shift * 11;
    const block = 0.2 * Math.exp(-Math.pow((h - blockAt) / 1.1, 2));
    return base(h) + peakBump(h) * (1 - shift) + block * shift - solar(h) * sun * 0.9;
  };
  const curve: string[] = [];
  for (let k = 0; k <= 96; k++) {
    const h = (k / 96) * 24;
    curve.push(`${k === 0 ? 'M' : 'L'} ${xOf(h).toFixed(1)} ${yOf(demand(h) * appear).toFixed(1)}`);
  }
  const area = `${curve.join(' ')} L ${xOf(24)} ${yOf(0)} L ${xOf(0)} ${yOf(0)} Z`;
  const solarPath: string[] = [];
  for (let k = 0; k <= 48; k++) {
    const h = 7 + (k / 48) * 12;
    solarPath.push(`${k === 0 ? 'M' : 'L'} ${xOf(h).toFixed(1)} ${yOf(solar(h) * sun).toFixed(1)}`);
  }
  const over = (1 - shift) * appear; // piek boven de afspraak
  const pulse = 0.5 + 0.5 * Math.sin(sec * 5);

  return (
    <svg viewBox="0 0 640 360" width="100%" height="100%" style={{fontFamily: FONT}}>
      <defs>
        <clipPath id="overcap">
          <rect x={cx} y={cy - 20} width={cw} height={yOf(cap) - cy + 20} />
        </clipPath>
        <linearGradient id="gridfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={C.grid} stopOpacity={0.45} />
          <stop offset="1" stopColor={C.grid} stopOpacity={0.04} />
        </linearGradient>
      </defs>
      {/* kop */}
      <text x={28} y={44} fill="white" fontSize={22} fontWeight={800}>Energy Hub</text>
      <text x={160} y={44} fill="rgba(255,255,255,0.6)" fontSize={16} fontWeight={500}>terrein-dashboard</text>
      <circle cx={566} cy={38} r={6} fill={C.gridGreen} opacity={0.5 + 0.5 * pulse} />
      <text x={580} y={44} fill={C.gridGreen} fontSize={16} fontWeight={800}>LIVE</text>

      {/* verbruik per pand */}
      <text x={bx} y={by - 8} fill="rgba(255,255,255,0.75)" fontSize={14} fontWeight={600}>Verbruik per pand</text>
      <line x1={bx} y1={by + bh} x2={bx + bw} y2={by + bh} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      {USAGE.map((u, i) => {
        const live = u + 0.04 * Math.sin(sec * 2.3 + i * 1.7);
        const v = live * seg(appear, i * 0.06, 0.6 + i * 0.05, easeOut);
        const x = bx + i * (barW + gap);
        const hMin = Math.min(v, MIN) * bh;
        const hTop = Math.max(0, v - MIN) * bh;
        return (
          <g key={i}>
            <rect x={x} y={by + bh - hMin} width={barW} height={hMin} rx={3} fill={C.gridGreen} opacity={0.4 + 0.6 * minLine} />
            <rect x={x} y={by + bh - hMin - hTop} width={barW} height={hTop} rx={3} fill={C.grid} />
            <text x={x + barW / 2} y={by + bh + 18} fill="rgba(255,255,255,0.55)" fontSize={11} textAnchor="middle">{i + 1}</text>
          </g>
        );
      })}
      {minLine > 0.001 ? (
        <g opacity={minLine}>
          <line x1={bx - 4} x2={bx - 4 + (bw + 8) * minLine} y1={by + bh - MIN * bh} y2={by + bh - MIN * bh} stroke="white" strokeWidth={2.5} strokeDasharray="7 5" />
          <rect x={bx + 4} y={by + bh - MIN * bh - 30} width={92} height={22} rx={11} fill="white" />
          <text x={bx + 50} y={by + bh - MIN * bh - 14} fill="#0d1b26" fontSize={13} fontWeight={800} textAnchor="middle">minimum</text>
        </g>
      ) : null}

      {/* dagprofiel */}
      <text x={cx} y={cy - 8} fill="rgba(255,255,255,0.75)" fontSize={14} fontWeight={600}>Dagprofiel terrein</text>
      <line x1={cx} y1={yOf(0)} x2={cx + cw} y2={yOf(0)} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      {[0, 6, 12, 18, 24].map((h) => (
        <text key={h} x={xOf(h)} y={yOf(0) + 18} fill="rgba(255,255,255,0.5)" fontSize={11} textAnchor="middle">{h}u</text>
      ))}
      <path d={area} fill="url(#gridfill)" />
      <path d={area} fill={C.congestion} opacity={0.75 * over} clipPath="url(#overcap)" />
      <path d={curve.join(' ')} fill="none" stroke={C.grid} strokeWidth={3} strokeLinejoin="round" />
      {sun > 0.001 ? <path d={solarPath.join(' ')} fill="none" stroke={C.solar} strokeWidth={3} opacity={sun} /> : null}
      <line x1={cx} x2={cx + cw} y1={yOf(cap)} y2={yOf(cap)} stroke="white" strokeWidth={2} strokeDasharray="7 5" opacity={appear} />
      <text x={cx + cw} y={yOf(cap) - 7} fill="white" fontSize={12} fontWeight={700} textAnchor="end" opacity={appear}>afgesproken</text>
      {/* verbruiksblok dat verschuift */}
      {appear > 0.5 ? (() => {
        const h = 10 + shift * 11;
        const x = xOf(h - 2);
        const w = xOf(4) - xOf(0);
        const y = yOf(0) - 30 - 14 * Math.sin(shift * Math.PI);
        const col = shift > 0.5 ? C.grid : C.congestionSoft;
        return (
          <g opacity={clamp01((appear - 0.5) * 2)}>
            <rect x={x} y={y} width={w} height={22} rx={6} fill={col} />
            <text x={x + w / 2} y={y + 15} fontSize={10} fontWeight={800} fill="#0d1b26" textAnchor="middle">verbruik</text>
          </g>
        );
      })() : null}
    </svg>
  );
};
