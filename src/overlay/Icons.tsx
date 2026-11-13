import React from 'react';

/** Eenvoudige lijn-iconen (64×64), één stijl voor de hele video. */
const PATHS: Record<string, React.ReactNode> = {
  bolt: <path d="M36 6 L16 36 h14 l-4 22 L48 26 H34 Z" />,
  stop: (
    <>
      <circle cx={32} cy={32} r={24} />
      <path d="M15 49 L49 15" />
    </>
  ),
  peak: <path d="M6 50 h8 l8 -30 l8 30 l8 -30 l8 30 h12" />,
  flat: <path d="M6 44 c10 0 10 -12 20 -12 s10 6 20 6 s8 -4 12 -4 M6 54 h52" />,
  flame: <path d="M32 58 c-12 0 -18 -8 -18 -18 c0 -12 12 -16 12 -30 c8 6 16 14 16 24 c2 -2 4 -6 4 -10 c4 4 6 10 6 16 c0 10 -8 18 -20 18 z" />,
  heat: (
    <>
      <path d="M28 10 v28 a10 10 0 1 0 8 0 V10 a4 4 0 0 0 -8 0 z" />
      <path d="M44 16 c4 4 4 8 0 12 M50 12 c6 6 6 14 0 20" />
    </>
  ),
  thermo: <path d="M28 10 v28 a10 10 0 1 0 8 0 V10 a4 4 0 0 0 -8 0 z M32 30 v14" />,
  drop: <path d="M32 6 C22 22 14 30 14 40 a18 18 0 0 0 36 0 C50 30 42 22 32 6 z" />,
  truck: <path d="M4 18 h32 v24 H4 z M36 26 h12 l8 8 v8 H36 z M14 48 a5 5 0 1 0 0.1 0 M46 48 a5 5 0 1 0 0.1 0" />,
  expand: <path d="M10 54 V30 h18 v24 M36 54 V22 h18 v32 M6 54 h52 M45 6 v12 M39 12 l6 -6 l6 6" />,
  alone: (
    <>
      <circle cx={16} cy={22} r={6} />
      <circle cx={48} cy={22} r={6} />
      <path d="M6 46 c0 -8 4 -12 10 -12 s10 4 10 12 M38 46 c0 -8 4 -12 10 -12 s10 4 10 12 M30 14 v36" />
    </>
  ),
  grow: <path d="M8 54 h48 M14 54 v-14 h10 v14 M28 54 v-24 h10 v24 M42 22 l8 -10 l8 10 M50 12 v24" />,
  loop: <path d="M48 22 a18 18 0 0 0 -32 4 M16 42 a18 18 0 0 0 32 -4 M42 14 l6 8 l-9 2 M22 50 l-6 -8 l9 -2" />,
  leaf: <path d="M12 52 C12 26 28 10 54 10 C54 36 38 52 12 52 z M12 52 L36 28" />,
  coop: (
    <>
      <circle cx={32} cy={32} r={7} />
      <circle cx={10} cy={14} r={5} />
      <circle cx={54} cy={14} r={5} />
      <circle cx={10} cy={50} r={5} />
      <circle cx={54} cy={50} r={5} />
      <path d="M14 18 L27 28 M50 18 L37 28 M14 46 L27 36 M50 46 L37 36" />
    </>
  ),
  shield: <path d="M32 6 L54 14 v16 c0 14 -10 22 -22 28 C20 52 10 44 10 30 V14 z M22 32 l7 7 l13 -14" />,
  law: <path d="M32 8 v46 M14 54 h36 M12 18 h40 M18 18 l-8 18 h16 z M46 18 l-8 18 h16 z" />,
  euro: <path d="M46 16 a18 18 0 1 0 0 32 M10 28 h26 M10 36 h26" />,
  hand: <path d="M6 30 l10 -10 l12 4 l8 -4 l22 12 l-10 10 M28 24 l-8 10 c2 4 6 4 8 2 l6 -6 l10 8 M16 20 L6 30 l14 14 l6 -2 l6 6 l6 -2" />,
  cable: <path d="M8 32 h14 M42 32 h14 M22 22 h20 v20 H22 z M28 22 v-8 M36 22 v-8" />,
  ai: (
    <>
      <rect x={14} y={14} width={36} height={36} rx={6} />
      <path d="M24 6 v8 M40 6 v8 M24 50 v8 M40 50 v8 M6 24 h8 M6 40 h8 M50 24 h8 M50 40 h8 M24 38 l5 -12 l5 12 M26 34 h6 M40 26 v12" />
    </>
  ),
  people: (
    <>
      <circle cx={22} cy={22} r={8} />
      <circle cx={44} cy={24} r={6} />
      <path d="M6 54 c0 -12 6 -18 16 -18 s16 6 16 18 M40 36 c8 0 16 4 16 16" />
    </>
  ),
  map: <path d="M6 14 l16 -6 l20 6 l16 -6 v42 l-16 6 l-20 -6 l-16 6 z M22 8 v42 M42 14 v42" />,
  wrench: <path d="M40 8 a12 12 0 0 0 -10 16 L8 46 l10 10 l22 -22 a12 12 0 0 0 16 -10 l-8 4 l-6 -6 z" />,
  check: (
    <>
      <circle cx={32} cy={32} r={24} />
      <path d="M21 33 l8 8 l15 -17" />
    </>
  ),
  battery: <path d="M10 18 h40 v28 H10 z M54 27 v10 M30 24 l-6 9 h10 l-6 9" />,
  sun: (
    <>
      <circle cx={32} cy={32} r={10} />
      <path d="M32 6 v8 M32 50 v8 M6 32 h8 M50 32 h8 M13 13 l6 6 M45 45 l6 6 M51 13 l-6 6 M19 45 l-6 6" />
    </>
  ),
  vote: <path d="M12 30 h40 v24 H12 z M22 30 l8 -20 l14 6 l-6 14 M24 42 h16" />,
  phase: <path d="M6 44 h14 v-10 h14 v-10 h14 v-10 h10" />,
};

export const Icon: React.FC<{name: string; color: string; size?: number; stroke?: number}> = ({name, color, size = 56, stroke = 5}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name] ?? PATHS.check}
    </g>
  </svg>
);
