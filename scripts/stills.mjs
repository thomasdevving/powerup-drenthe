// Rendert per scène een still (standaard op 50% van de scène) naar out/stills/.
// Gebruik: node scripts/stills.mjs [--at=0.5] [--scenes=1,5] [--guide] [--override=energy-hub:30]
import fs from 'node:fs';
import path from 'node:path';
import {renderStill} from '@remotion/renderer';
import {ROOT, chromiumOptions, browserExecutable, makeBundle, parseOverrides, select} from './common.mjs';

const atArg = process.argv.find((a) => a.startsWith('--at='));
const scenesArg = process.argv.find((a) => a.startsWith('--scenes='));
const ats = (atArg ? atArg.slice(5) : '0.5').split(',').map(Number);
const guide = process.argv.includes('--guide');
const outDir = path.join(ROOT, 'out/stills');
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await makeBundle();
const inputProps = {durationOverrides: parseOverrides()};
const comp = await select(serveUrl, guide ? 'PitchVoGids' : 'Pitch', inputProps);
const tl = comp.props.timeline;
const frameArg = process.argv.find((a) => a.startsWith('--frame='));
if (frameArg) {
  const f = frameArg.slice(8) === 'last' ? comp.durationInFrames - 1 : Number(frameArg.slice(8));
  const file = path.join(outDir, `frame-${f}.png`);
  await renderStill({composition: comp, serveUrl, output: file, frame: f, inputProps: comp.props, chromiumOptions, browserExecutable, overwrite: true});
  console.log(`frame ${f} → ${path.relative(ROOT, file)}`);
  process.exit(0);
}
const wanted = scenesArg ? scenesArg.slice(9).split(',').map((n) => Number(n) - 1) : tl.scenes.map((_, i) => i);
for (const i of wanted) {
  const s = tl.scenes[i];
  for (const at of ats) {
    const frame = Math.min(comp.durationInFrames - 1, s.startFrame + Math.round(at * (s.durationInFrames - 1)));
    const file = path.join(outDir, `scene-${String(i + 1).padStart(2, '0')}-${Math.round(at * 100)}${guide ? '-gids' : ''}.png`);
    const t0 = Date.now();
    await renderStill({composition: comp, serveUrl, output: file, frame, inputProps: comp.props, chromiumOptions, browserExecutable, overwrite: true});
    console.log(`scène ${i + 1} @${at} → frame ${frame} → ${path.relative(ROOT, file)} (${Date.now() - t0} ms)`);
  }
}
