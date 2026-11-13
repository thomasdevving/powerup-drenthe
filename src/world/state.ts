import type {Story} from '../timeline';
import {SCENES, cueFraction} from '../script';
import {clamp01, easeOut, inOut, seg} from '../util';

/** Moment (content-progress 0..1) waarop een woord in scène i valt. */
export const cue = (i: number, word: string) => cueFraction(SCENES[i], word);

/**
 * Alle choreografie op één plek. Elke waarde is een functie van scène-progress
 * (cprog = binnen het VO-venster), nooit van vaste frames.
 */
export const worldState = (st: Story) => {
  const c = st.cprog;
  const p = st.prog;
  const s = st.s;

  // Dag/nacht: schemering t/m de omslag, daarna helder daglicht.
  const dusk = 1 - seg(s, 3.45, 4.2);

  // Congestie: lijnen kleuren rood en slibben dicht in de hook, verdwijnen in de omslag.
  const congestion = Math.min(seg(c(0), cue(0, 'net') - 0.15, 1.0), 1 - seg(c(3), 0.0, 0.45));
  const jam = Math.min(seg(c(0), cue(0, 'Maar'), 1.0) * 0.85 + seg(c(1), 0, 1) * 0.15, 1 - seg(c(3), 0, 0.45));

  // Scène 2
  const growTry = seg(c(1), 0.02, 0.2, easeOut); // verdieping schuift omhoog...
  const growStop = seg(c(1), 0.2, 0.28); // ...en stopt (zakt terug, rood)
  const queueIn = seg(c(1), cue(1, 'wachtrij') - 0.12, cue(1, 'wachtrij') + 0.12, easeOut);
  const bounce = seg(c(1), cue(1, 'Terugleveren?') - 0.08, cue(1, 'Terugleveren?') + 0.04);
  const inset = inOut(c(1), cue(1, 'Terugleveren?') - 0.02, cue(1, 'Terugleveren?') + 0.06, 0.93, 1.0);
  const insetRed = seg(c(1), cue(1, 'Heel'), cue(1, 'rood.') + 0.08);
  const groeiStop = seg(c(1), cue(1, 'groeien') - 0.04, cue(1, 'groeien') + 0.06);
  // wachtrij verdwijnt in de omslag
  const queue = queueIn * (1 - seg(c(3), 0.1, 0.5));
  const bounceVis = bounce * (1 - seg(s, 2.05, 2.25));

  // Scène 3
  const parkCables = Math.min(seg(c(2), 0.15, 0.45), 1 - seg(s, 3.6, 4.0));
  const notConnected = inOut(c(2), cue(2, 'zonder') - 0.06, cue(2, 'zonder') + 0.04, 0.96, 1.0) *
    (1 - seg(s, 3.0, 3.2));

  // Scène 4 (omslag)
  const dim = inOut(s, 3.0, 3.18, 3.78, 4.05);

  // Scène 5 (Energy Hub)
  const hubRise = seg(c(4), 0.0, 0.14, easeOut);
  const supplyCable = seg(c(4), cue(4, 'leverancier') - 0.02, cue(4, 'leverancier') + 0.1);
  const ring = seg(c(4), cue(4, 'verdeelt') - 0.04, cue(4, 'grid.'), (t) => t);
  const solarOpen = seg(c(4), cue(4, 'Zelf') - 0.04, cue(4, 'Zelf') + 0.08);
  const turbine = seg(c(4), cue(4, 'opgewekte') - 0.02, cue(4, 'opgewekte') + 0.08, easeOut);
  const parkLink = seg(c(4), cue(4, 'opgewekte'), cue(4, 'stroom') + 0.08);
  // batterij: laadt op met overschot, piek → ontlaadt, en herstelt weer
  const charge = seg(c(4), cue(4, 'opgewekte') - 0.02, cue(4, 'batterijen'));
  const peak = seg(c(4), cue(4, 'batterijen') - 0.03, cue(4, 'batterijen') + 0.03) * (1 - seg(s, 5.02, 5.12));
  const discharge = seg(c(4), cue(4, 'vangt') - 0.04, 1.0);
  const battery = s < 4 ? 0.15 : s >= 5 ? 0.62 + 0.18 * seg(c(5), 0, 1) : clamp01(0.15 + charge * 0.75 - discharge * 0.35);
  const gridOn = Math.max(ring, s >= 5 ? 1 : 0);

  // Scène 6: dashboardpaneel
  const dash = inOut(s, 4.94, 5.12, 5.9, 6.05);

  // Scène 7
  const cool = seg(c(6), 0.0, cue(6, 'hittestress,') + 0.1);
  // Hittewaas komt op tijdens de overgang naar scène 7 en koelt dan af.
  const heat = Math.min(seg(s, 5.95, 6.08), 1 - cool);
  const green = seg(c(6), 0.05, cue(6, 'waterafvoer.') + 0.05);
  const community = seg(c(6), cue(6, 'Ondernemers') - 0.03, cue(6, 'samen.'));

  // Scène 8
  const split = inOut(s, 7.02, 7.12, 7.93, 8.02);
  // Pand 1 krijgt nu wél zijn extra verdieping
  const growOk = seg(c(7), cue(7, 'ruimte') - 0.05, cue(7, 'groeien.') + 0.05, easeOut);

  // Scène 9: kaart
  const map = seg(s, 8.13, 8.22);
  const localFade = seg(s, 8.15, 8.24);
  const sitesLit = seg(c(8), cue(8, 'toepasbaar') - 0.05, cue(8, 'Drenthe,') + 0.04, (t) => t);
  const nlLit = seg(c(8), cue(8, 'daarna'), cue(8, 'Nederland.') + 0.06, (t) => t);
  const endTitle = Math.max(seg(c(8), cue(8, 'Want'), cue(8, 'Want') + 0.12), st.outro > 0 ? 1 : 0);

  return {
    dusk, congestion, jam, growTry, growStop, queue, bounce: bounceVis, inset, insetRed, groeiStop,
    parkCables, notConnected, dim, hubRise, supplyCable, ring, solarOpen, turbine, parkLink,
    battery, peak, gridOn, dash, cool, heat: clamp01(heat), green, community, split,
    growOk, map, localFade, sitesLit, nlLit, endTitle, charge, discharge,
    p, c, s,
  };
};

export type WorldState = ReturnType<typeof worldState>;
