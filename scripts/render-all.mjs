// Eén commando: rendert out/pitch.mp4, out/pitch-vo-gids.mp4 en out/voiceover.srt.
// Opnames in public/vo/scene-XX.wav en public/music.mp3 worden automatisch opgepikt.
// Opties: --srt-only  --skip-gids  --override=energy-hub:30  (GL=swangle, CONCURRENCY=4)
import fs from 'node:fs';
import path from 'node:path';
import {renderMedia} from '@remotion/renderer';
import {ROOT, chromiumOptions, makeBundle, parseOverrides, select} from './common.mjs';

const has = (f) => process.argv.includes(f);
const outDir = path.join(ROOT, 'out');
fs.mkdirSync(outDir, {recursive: true});

const fmt = (sec) => {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
};

/** Splits VO in ondertitelregels: per zin, lange zinnen op een komma. */
const chunks = (text) => {
  const sentences = text.match(/[^.?!:]+[.?!:]*/g).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const s of sentences) {
    const w = s.split(/\s+/);
    if (w.length <= 13) {
      out.push(s);
      continue;
    }
    // splits op de komma die het dichtst bij het midden ligt
    let best = -1;
    w.forEach((x, i) => {
      if (/,$/.test(x) && (best < 0 || Math.abs(i - w.length / 2) < Math.abs(best - w.length / 2))) best = i;
    });
    if (best < 0) best = Math.floor(w.length / 2) - 1;
    out.push(w.slice(0, best + 1).join(' '), w.slice(best + 1).join(' '));
  }
  return out;
};

const wrap = (line) => {
  if (line.length <= 42) return line;
  const w = line.split(' ');
  let best = 1;
  for (let i = 1; i < w.length; i++) {
    const a = w.slice(0, i).join(' ').length;
    if (Math.abs(a - line.length / 2) < Math.abs(w.slice(0, best).join(' ').length - line.length / 2)) best = i;
  }
  return `${w.slice(0, best).join(' ')}\n${w.slice(best).join(' ')}`;
};

const makeSrt = (tl) => {
  let n = 1;
  const lines = [];
  tl.scenes.forEach((sc, i) => {
    const start = sc.startFrame / tl.fps + tl.padding;
    const end = (sc.startFrame + sc.durationInFrames) / tl.fps - tl.padding;
    const parts = chunks(sc.vo);
    const total = parts.reduce((a, p) => a + p.split(/\s+/).length, 0);
    let t = start;
    for (const p of parts) {
      const d = ((end - start) * p.split(/\s+/).length) / total;
      lines.push(`${n++}\n${fmt(t)} --> ${fmt(t + d - 0.04)}\n${wrap(p)}\n`);
      t += d;
    }
  });
  return lines.join('\n');
};

const report = (tl) => {
  console.log('\nScène                      bron      duur');
  tl.scenes.forEach((s, i) => {
    console.log(`${String(i + 1).padStart(2, '0')} ${s.title.padEnd(24)} ${s.source.padEnd(8)} ${s.durationSeconds.toFixed(2).padStart(6)} s`);
  });
  console.log(`   ${'Eindkaart'.padEnd(24)} ${''.padEnd(8)} ${(tl.outroFrames / tl.fps).toFixed(2).padStart(6)} s`);
  const tot = tl.totalFrames / tl.fps;
  console.log(`Totaal: ${tot.toFixed(2)} s (${Math.floor(tot / 60)}:${String(Math.round(tot % 60)).padStart(2, '0')}) · muziek: ${tl.hasMusic ? 'ja' : 'nee'}\n`);
};

const overrides = parseOverrides();
console.log('Bundelen…');
const serveUrl = await makeBundle();
const comp = await select(serveUrl, 'Pitch', {durationOverrides: overrides});
const tl = comp.props.timeline;
report(tl);
fs.writeFileSync(path.join(outDir, 'voiceover.srt'), makeSrt(tl));
fs.writeFileSync(path.join(outDir, 'timeline.json'), JSON.stringify(tl, null, 2));
console.log('✓ out/voiceover.srt');
if (has('--srt-only')) process.exit(0);

const render = async (id, file) => {
  const c = id === 'Pitch' ? comp : await select(serveUrl, id, {durationOverrides: overrides, guide: true});
  let last = -1;
  const t0 = Date.now();
  await renderMedia({
    composition: c,
    serveUrl,
    codec: 'h264',
    crf: 18,
    imageFormat: 'jpeg',
    jpegQuality: 92,
    outputLocation: path.join(outDir, file),
    inputProps: c.props,
    chromiumOptions,
    concurrency: Number(process.env.CONCURRENCY ?? 6),
    overwrite: true,
    onProgress: ({progress}) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) {
        last = pct;
        console.log(`  ${file}: ${pct}%`);
      }
    },
  });
  console.log(`✓ out/${file} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
};

await render('Pitch', 'pitch.mp4');
if (!has('--skip-gids')) await render('PitchVoGids', 'pitch-vo-gids.mp4');
