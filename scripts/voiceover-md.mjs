// Genereert VOICEOVER.md uit src/script.ts (via de gebundelde timeline) — draai: node scripts/voiceover-md.mjs
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, makeBundle, select} from './common.mjs';

const serveUrl = await makeBundle();
const comp = await select(serveUrl, 'Pitch', {durationOverrides: {}});
const tl = comp.props.timeline;
const t = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
let md = `# Script & draaiboek — Multi-Commodity Energy Hub

Pitchvideo PowerUp Drenthe Hackathon 2026 · Track 3 · Energiek Innovatie Collectief

## Zo neem je op

1. **Per scène een apart bestand.** Niet alles in één take; zo kun je één scène overdoen zonder de rest.
2. **Formaat:** WAV, 48 kHz, mono of stereo, 24-bit (16-bit mag ook).
3. **Stilte:** laat ongeveer **0,3 s stilte vóór en na** je tekst staan. Knip niet strak af.
4. **Bestandsnaam:** precies zoals hieronder, in de map \`public/vo/compact/\` (bijv. \`public/vo/compact/scene-05.wav\`).
5. **Tempo:** de doelduur gaat uit van ~2,6 woorden per seconde. Spreek je langzamer, dan **past de timing zich aan; boven 120 seconden stopt de render met een duidelijke melding**; de animaties rekken mee. Je hoeft dus niet te haasten.
6. **Meekijken:** speel \`out/pitch-vo-gids.mp4\` af. Linksboven staat het scènenummer en de titel, onderin de tekst met een gele markering op het woord waar je zou moeten zijn.
7. Daarna opnieuw renderen: \`npm run render\` (zie README).

| Scène | Bestand | Doelduur (incl. 1 s ademruimte) | Start in video |
|---|---|---|---|
`;
tl.scenes.forEach((s, i) => {
  md += `| ${i + 1}. ${s.title} | \`public/${s.audioFile}\` | ${s.durationSeconds.toFixed(1)} s | ${t(s.startFrame / tl.fps)} |\n`;
});
md += `| Eindkaart (geen VO) | — | ${(tl.outroFrames / tl.fps).toFixed(1)} s | ${t((tl.totalFrames - tl.outroFrames) / tl.fps)} |\n\n**Totaal met actuele opnames: ${(tl.totalFrames / tl.fps).toFixed(1)} s.**\n\n---\n`;
tl.scenes.forEach((s, i) => {
  const words = s.vo.trim().split(/\s+/).length;
  md += `
## Scène ${i + 1} — ${s.title}

**Bestand:** \`public/${s.audioFile}\` · **Doelduur:** ${s.durationSeconds.toFixed(1)} s (${words} woorden, ±${(s.durationSeconds - 2 * tl.padding).toFixed(1)} s spreektijd)

> ${s.vo}

**In beeld:** ${s.visual}
`;
});
fs.writeFileSync(path.join(ROOT, 'VOICEOVER.md'), md);
console.log('✓ VOICEOVER.md');
