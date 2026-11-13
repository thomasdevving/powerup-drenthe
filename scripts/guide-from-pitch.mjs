// Hergebruik de definitieve 3D-render. Alleen de leeslaag wordt toegevoegd: geen tweede WebGL-render nodig.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export async function guideFromPitch() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const tl = JSON.parse(fs.readFileSync(path.join(root, 'out/timeline.json'), 'utf8'));
  const stamp = s => { const c = Math.round(s * 100); return `${Math.floor(c / 360000)}:${String(Math.floor(c / 6000) % 60).padStart(2, '0')}:${String(Math.floor(c / 100) % 60).padStart(2, '0')}.${String(c % 100).padStart(2, '0')}`; };
  const esc = s => s.replaceAll('\\', '').replaceAll('{', '').replaceAll('}', '');
  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Voice,DejaVu Sans,43,&H0040D2FF,&H00FFFFFF,&HE6000000,&HE6000000,-1,0,0,0,100,100,0,0,3,18,0,2,75,75,35,1
Style: Scene,DejaVu Sans,32,&H0040D2FF,&H00FFFFFF,&HE6000000,&HE6000000,-1,0,0,0,100,100,0,0,3,14,0,7,40,40,35,1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
`;
  for (const [i, s] of tl.scenes.entries()) {
    const start = s.startFrame / tl.fps;
    const end = (s.startFrame + s.durationInFrames) / tl.fps;
    ass += `Dialogue: 0,${stamp(start)},${stamp(end)},Scene,,0,0,0,,${String(i + 1).padStart(2, '0')}/${tl.scenes.length} · ${esc(s.title)}\n`;
    const words = s.vo.split(/\s+/);
    const wordSeconds = (s.durationSeconds - 2 * tl.padding) / words.length;
    for (let j = 0; j < words.length; j += 13) {
      const chunk = words.slice(j, j + 13);
      const from = start + tl.padding + j * wordSeconds;
      const to = start + tl.padding + (j + chunk.length) * wordSeconds;
      const text = chunk.map(w => `{\\kf${Math.round(wordSeconds * 100)}}${esc(w)}`).join(' ');
      ass += `Dialogue: 1,${stamp(from)},${stamp(to)},Voice,,0,0,0,,${text}\n`;
    }
  }
  const assPath = path.join(root, 'out/voiceover-guide.ass');
  fs.writeFileSync(assPath, ass);
  await new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-v', 'error', '-y', '-i', path.join(root, 'out/pitch.mp4'), '-vf', `ass=${assPath}`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-c:a', 'copy', '-movflags', '+faststart', path.join(root, 'out/pitch-vo-gids.mp4')], {stdio: 'inherit'});
    proc.on('error', reject);
    proc.on('exit', code => code === 0 ? resolve() : reject(new Error(`Gidsrender mislukt: ${code}`)));
  });
  console.log('✓ out/pitch-vo-gids.mp4 (dezelfde 3D-render, leeslaag met woordmarkering)');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await guideFromPitch();
