import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tl = JSON.parse(fs.readFileSync(path.join(root, 'out/timeline.json'), 'utf8'));
assert.ok(tl.totalFrames <= 120 * tl.fps, 'Tijdlijn overschrijdt twee minuten');
assert.equal(tl.scenes.length, 12);
assert.ok(tl.scenes.find(s => s.id === 'energy-hub').vo.includes('vraaggestuurde naar aanbodgestuurde energielevering'));
for (const s of tl.scenes) {
  assert.ok(s.audio, `Audio ontbreekt: ${s.id}`);
  const wpm = s.vo.trim().split(/\s+/).length / (s.durationSeconds - 2 * tl.padding) * 60;
  assert.ok(wpm < 170, `Onrealistisch spreektempo: ${s.id} (${wpm})`);
}
for (const name of ['pitch.mp4', 'pitch-vo-gids.mp4']) {
  const file = path.join(root, 'out', name);
  const data = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8'}));
  const video = data.streams.find(s => s.codec_type === 'video');
  const audio = data.streams.find(s => s.codec_type === 'audio');
  assert.equal(video.codec_name, 'h264');
  assert.equal(video.width, 1920);
  assert.equal(video.height, 1080);
  assert.equal(Number(video.nb_frames), tl.totalFrames);
  assert.equal(video.r_frame_rate, `${tl.fps}/1`);
  assert.ok(audio && Number(audio.sample_rate) === 48000, `${name}: Nederlandse voice-over ontbreekt`);
  assert.ok(Number(data.format.duration) <= 120);
  assert.ok(Math.abs(Number(data.format.duration) - tl.totalFrames / tl.fps) < .1);
  execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-'], {stdio: ['ignore', 'ignore', 'pipe']});
  console.log(`✓ ${name}: ${data.format.duration} s, 1920×1080, ${tl.fps} fps, H.264 + audio, volledig decodeerbaar.`);
}
const norm = s => s.replace(/\s+/g, ' ').trim();
for (const name of ['SCRIPT.pdf', 'VOICEOVER.pdf']) {
  const pdf = fs.readFileSync(path.join(root, name));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const pdfText = execFileSync('pdftotext', [path.join(root, name), '-'], {encoding: 'utf8'});
  for (const s of tl.scenes) assert.ok(norm(pdfText).includes(norm(s.vo)), `PDF-tekst wijkt af: ${name} ${s.id}`);
  console.log(`✓ ${name} bevat alle 12 exacte voice-overteksten, inclusief aanbodgestuurde energielevering.`);
}
