import type {Story} from '../timeline';
import {SCENES, cueFraction, sceneIndex} from '../script';
import {clamp01, easeOut, inOut, seg} from '../util';

/** Moment (content-progress 0..1) waarop een woord in scène `id` valt. */
export const cue = (id: string, word: string) => cueFraction(SCENES[sceneIndex(id)], word);
/** Story-time (s) van een punt binnen een scène. */
export const at = (id: string, frac: number) => sceneIndex(id) + frac;

const lin = (t: number) => t;

/**
 * Alle choreografie op één plek. Elke waarde is een functie van scène-progress
 * (c = binnen het VO-venster) of story-time, nooit van vaste frames.
 * Scènes worden op id aangesproken, zodat volgorde en duur kunnen veranderen.
 */
export const worldState = (st: Story) => {
  const c = (id: string) => st.cprog(sceneIndex(id));
  const s = st.s;

  // ---- dag/nacht: schemering tot de visie, daarna helder daglicht
  const dusk = 1 - seg(s, at('visie', 0.15), at('visie', 0.85));

  // ---- 1. De uitdaging van vandaag
  const fadeProblems = 1 - seg(c('visie'), 0.05, 0.4);
  const congestion = Math.min(seg(c('uitdaging'), cue('uitdaging', 'elektriciteitsnet') - 0.12, cue('uitdaging', 'vol.') + 0.05), fadeProblems);
  const jam = Math.min(seg(c('uitdaging'), cue('uitdaging', 'vol.'), 1) * 0.85 + seg(c('groter-probleem'), 0, 1) * 0.15, fadeProblems);
  const growTry = seg(c('uitdaging'), cue('uitdaging', 'groeien') - 0.04, cue('uitdaging', 'groeien') + 0.12, easeOut);
  const growStop = seg(c('uitdaging'), cue('uitdaging', 'Uitbreidingen') - 0.03, cue('uitdaging', 'Uitbreidingen') + 0.07);
  const ghost = Math.min(seg(s, at('uitdaging', 0.1), at('uitdaging', 0.2)), 1 - seg(s, at('visie', 0.1), at('visie', 0.35)));
  const queue = seg(c('uitdaging'), cue('uitdaging', 'ontwikkelingen') - 0.15, cue('uitdaging', 'ontwikkelingen') + 0.08, easeOut) * fadeProblems;
  const bounce = seg(c('uitdaging'), cue('uitdaging', 'verduurzamen,') - 0.04, cue('uitdaging', 'verduurzamen,') + 0.06) * (1 - seg(s, at('uitdaging', 0.92), at('groter-probleem', 0.1)));
  const inset = inOut(c('uitdaging'), cue('uitdaging', 'elektriciteitsnet') - 0.04, cue('uitdaging', 'elektriciteitsnet') + 0.05, 0.93, 1.0);
  const insetRed = seg(c('uitdaging'), cue('uitdaging', 'zit'), cue('uitdaging', 'vol.') + 0.1);

  // ---- 2. Het echte probleem is groter
  const G = 'groter-probleem';
  const pill = (w: string) => seg(c(G), cue(G, w) - 0.05, cue(G, w) + 0.04) * (1 - seg(c('visie'), 0.05, 0.35));
  const pills = {
    net: pill('netcongestie'),
    trucks: pill('elektrificatie,'),
    heat: pill('hittestress,'),
    water: pill('wateroverlast'),
    space: pill('ruimte.'),
  };
  const trucksIn = seg(c(G), cue(G, 'elektrificatie,') - 0.08, cue(G, 'elektrificatie,') + 0.04, easeOut);
  const greenStart = cue('ruimte', 'Groene') - 0.03;
  const greenEnd = cue('ruimte', 'klimaatbestendiger.') + 0.05;
  const heat =
    seg(c(G), cue(G, 'hittestress,') - 0.05, cue(G, 'hittestress,') + 0.05) *
    (1 - 0.8 * seg(c('visie'), 0.1, 0.5)) *
    (1 - seg(c('ruimte'), greenStart, greenEnd));
  const puddles = seg(c(G), cue(G, 'wateroverlast') - 0.05, cue(G, 'wateroverlast') + 0.05) * (1 - seg(c('ruimte'), cue('ruimte', 'waterberging') - 0.05, greenEnd));
  const rain = inOut(c(G), cue(G, 'wateroverlast') - 0.06, cue(G, 'wateroverlast'), cue(G, 'wateroverlast') + 0.12, cue(G, 'wateroverlast') + 0.22);

  // ---- 3. Visie (omslag)
  const dim = inOut(s, at('visie', 0.0), at('visie', 0.12), at('visie', 0.82), at('visie', 0.98));

  // ---- 4. De slimme Energy Hub
  const H = 'energy-hub';
  const hubRise = seg(c(H), cue(H, 'Energy') - 0.08, cue(H, 'Energy') + 0.06, easeOut);
  const supplyCable = seg(c(H), cue(H, 'gezamenlijke') - 0.02, cue(H, 'Hub') + 0.06);
  const ring = seg(c(H), cue(H, 'benutten'), cue(H, 'slimmer.'), lin);
  const solarOpen = seg(c(H), cue(H, 'Lokale') - 0.03, cue(H, 'Lokale') + 0.06);
  const turbine = seg(c(H), cue(H, 'opwekking,') - 0.03, cue(H, 'opwekking,') + 0.06, easeOut);
  const parkLink = seg(c(H), cue(H, 'opwekking,'), cue(H, 'opslag') + 0.02);
  const charge = seg(c(H), cue(H, 'opslag') - 0.03, cue(H, 'afgestemde'));
  const peak = seg(c(H), cue(H, 'afgestemde') - 0.02, cue(H, 'afgestemde') + 0.03) * (1 - seg(s, at(H, 0.72), at(H, 0.8)));
  const discharge = seg(c(H), cue(H, 'productiemomenten') - 0.02, cue(H, 'stroompieken'));
  const battery =
    s < at(H, 0) ? 0.15 : s >= at('warmtenet', 0) ? 0.62 + 0.18 * seg(c('warmtenet'), 0, 1) : clamp01(0.15 + charge * 0.75 - discharge * 0.35);
  const gridOn = Math.max(ring, s >= at('warmtenet', 0) ? 1 : 0);
  const dash = inOut(s, at(H, 0.66), at(H, 0.76), at(H, 0.97), at('warmtenet', 0.06));
  const dashP = seg(s, at(H, 0.74), at(H, 0.99), lin);

  // ---- 5. Lokaal warmtenet
  const W = 'warmtenet';
  const heatWaste = inOut(c(W), 0.0, 0.08, 0.22, 0.32);
  const heatNet = seg(c(W), 0.20, 0.40, lin);
  const heatStation = seg(c(W), 0.28, 0.40, easeOut);
  const heatFlow = seg(c(W), 0.32, 0.48);
  const heatSinks = seg(c(W), 0.40, 0.52);
  const heatCard = seg(c(W), 0.42, 0.49) * (1 - seg(s, at(W, 0.99), at('ruimte', 0.04)));
  const heatRecovered = seg(c(W), 0.45, 0.93, lin);
  const coldNet = seg(c(W), 0.14, 0.30);
  const wasteLabel = inOut(c(W), 0.05, 0.12, 0.22, 0.30);
  const stationLabel = inOut(c(W), 0.28, 0.34, 0.43, 0.49);

  // ---- 6. Ruimtelijke transformatie
  const R = 'ruimte';
  const growOk = seg(c(R), 0.0, 0.15, easeOut);
  const green = seg(c(R), greenStart, greenEnd);
  const cool = green;
  const laadplein = seg(c(R), cue(R, 'Gedeelde') - 0.05, cue(R, 'zonnepanelen') + 0.03);
  const laadSolar = seg(c(R), cue(R, 'zonnepanelen') - 0.03, cue(R, 'zonnepanelen') + 0.08, easeOut);
  const truckMove = seg(c(R), cue(R, 'mobiliteit,') - 0.04, cue(R, 'ruimtegebruik.'));
  const laadLabel = seg(c(R), cue(R, 'Gedeelde'), cue(R, 'Gedeelde') + 0.08) * (1 - seg(s, at(R, 0.97), at('haulerwijk', 0.05)));

  // ---- 7. Haulerwijk
  const HW = 'haulerwijk';
  const haulerwijk = inOut(s, at(HW, 0.0), at(HW, 0.07), at(HW, 0.95), at('cooperatie', 0.04));
  const hwOurs = seg(c(HW), cue(HW, 'Wij') - 0.04, cue(HW, 'Wij') + 0.1);

  // ---- 8. Coöperatie
  const CO = 'cooperatie';
  const coop = seg(c(CO), cue(CO, 'samenwerking.') - 0.12, cue(CO, 'coöperatie') + 0.05, lin);
  const coopCard = seg(c(CO), cue(CO, 'coöperatie') - 0.03, cue(CO, 'coöperatie') + 0.06) * (1 - seg(s, at(CO, 0.97), at('voordelen', 0.04)));

  // ---- 9. Voordelen
  const split = inOut(s, at('voordelen', 0.0), at('voordelen', 0.08), at('voordelen', 0.94), at('risicos', 0.03));

  // ---- 10. Risico's
  const risks = inOut(s, at('risicos', 0.0), at('risicos', 0.06), at('risicos', 0.95), at('afsluiter', 0.05));

  // ---- 11. Afsluiter
  const A = 'afsluiter';
  const map = seg(s, at(A, 0.5), at(A, 0.56));
  const localFade = seg(s, at(A, 0.51), at(A, 0.57));
  const sitesLit = seg(c(A), cue(A, 'Met') - 0.04, cue(A, 'Vandaag') + 0.02, lin);
  const nlLit = seg(c(A), cue(A, 'morgen') - 0.02, 1.0, lin);
  const endTitle = st.outro > 0 ? seg(st.outro, 0, 0.2) : 0;

  return {
    dusk, congestion, jam, growTry, growStop, ghost, queue, bounce, inset, insetRed,
    pills, trucksIn, heat: clamp01(heat), puddles, rain, dim,
    hubRise, supplyCable, ring, solarOpen, turbine, parkLink, charge, peak, discharge, battery, gridOn, dash, dashP,
    heatWaste, heatNet, heatStation, heatFlow, heatSinks, heatCard, heatRecovered, coldNet, wasteLabel, stationLabel,
    growOk, green, cool, laadplein, laadSolar, truckMove, laadLabel,
    haulerwijk, hwOurs, coop, coopCard, split, risks,
    map, localFade, sitesLit, nlLit, endTitle,
    // niet meer gebruikt in deze verhaallijn, wel nog gelezen door gedeelde componenten
    parkCables: 0, notConnected: 0, community: 0,
    c, s,
  };
};

export type WorldState = ReturnType<typeof worldState>;
