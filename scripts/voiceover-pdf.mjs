// Maakt VOICEOVER.pdf (draaiboek voor de spreker) uit out/timeline.json.
// Draai eerst `npm run render` of `npm run srt` zodat de timeline actueel is.
// Gebruik: node scripts/voiceover-pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import {openBrowser} from '@remotion/renderer';
import {createServer} from 'node:http';
import {ROOT, browserExecutable} from './common.mjs';

const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'out/timeline.json'), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const t = (sec) => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, '0')}`;
const s1 = (x) => x.toFixed(1).replace('.', ',');
const total = tl.totalFrames / tl.fps;
const outro = tl.outroFrames / tl.fps;

/** Zinnen op een eigen regel: makkelijker ademen en voorlezen. */
const sentences = (vo) => vo.match(/[^.?!:]+[.?!:]*/g).map((x) => x.trim()).filter(Boolean);

const rows = tl.scenes
  .map(
    (s, i) => `<tr><td class="n">${String(i + 1).padStart(2, '0')}</td><td>${esc(s.title)}</td><td class="mono">${s.audioFile.replace('vo/', '')}</td><td class="r">${s1(s.durationSeconds)} s</td><td class="r">${t(s.startFrame / tl.fps)}</td></tr>`,
  )
  .join('');

const scenes = tl.scenes
  .map((s, i) => {
    const words = s.vo.trim().split(/\s+/).length;
    const speak = s.durationSeconds - 2 * tl.padding;
    return `
  <section class="scene">
    <div class="head">
      <div class="badge">${String(i + 1).padStart(2, '0')}</div>
      <div>
        <h2>${esc(s.title)}</h2>
        <div class="meta">
          <span><b>Bestand</b> public/${esc(s.audioFile)}</span>
          <span><b>Doelduur</b> ${s1(s.durationSeconds)} s</span>
          <span><b>Spreektijd</b> ± ${s1(speak)} s · ${words} woorden</span>
          <span><b>Start in video</b> ${t(s.startFrame / tl.fps)}</span>
        </div>
      </div>
    </div>
    <div class="vo">${sentences(s.vo).map((x) => `<p>${esc(x)}</p>`).join('')}</div>
    <div class="visual"><b>In beeld</b> ${esc(s.visual)}</div>
  </section>`;
  })
  .join('');

const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Draaiboek voice-over · Energy Hub</title>
<style>
  @page { size: A4; margin: 16mm 16mm 16mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #14212b; margin: 0; font-size: 10.5pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cover h1 { font-size: 26pt; line-height: 1.1; margin: 0 0 4pt; letter-spacing: -0.4pt; }
  .cover { font-size: 9pt; line-height: 1.3; }
  .cover table { font-size: 8.5pt; }
  .cover td { padding: 3pt 4pt; }
  .cover .mono { font-size: 7.8pt; }
  .cover ol.how li { margin: 1.5pt 0; }
  .cover .sub { color: #51606d; font-size: 11.5pt; margin-bottom: 14pt; }
  .stats { display: flex; gap: 8pt; margin: 0 0 14pt; }
  .stat { flex: 1; background: #eef6f5; border-radius: 8pt; padding: 8pt 10pt; }
  .stat b { display: block; font-size: 17pt; color: #0b6e64; }
  .stat span { color: #51606d; font-size: 9pt; }
  h3 { font-size: 12.5pt; margin: 14pt 0 6pt; }
  ol.how { margin: 0; padding-left: 16pt; }
  ol.how li { margin: 3pt 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { text-align: left; color: #51606d; font-weight: 600; border-bottom: 1.5pt solid #14212b; padding: 4pt 5pt; }
  td { border-bottom: 0.5pt solid #d4dbe0; padding: 4pt 5pt; }
  td.n { font-weight: 700; width: 22pt; }
  td.r, th.r { text-align: right; white-space: nowrap; }
  .mono { font-family: Menlo, monospace; font-size: 8.8pt; }
  tfoot td { font-weight: 700; border-bottom: 0; }
  .note { color: #51606d; font-size: 9pt; margin-top: 8pt; }
  .scene { break-inside: avoid; page-break-inside: avoid; margin: 0 0 16pt; padding-top: 4pt; }
  .scenes { break-before: page; page-break-before: always; }
  .head { display: flex; gap: 10pt; align-items: flex-start; margin-bottom: 7pt; }
  .badge { flex: none; width: 30pt; height: 30pt; border-radius: 50%; background: #14212b; color: #fff; font-weight: 700; font-size: 12pt; display: flex; align-items: center; justify-content: center; }
  h2 { font-size: 15pt; margin: 1pt 0 3pt; letter-spacing: -0.2pt; }
  .meta { display: flex; flex-wrap: wrap; gap: 3pt 12pt; font-size: 8.8pt; color: #51606d; }
  .meta b { color: #14212b; font-weight: 600; margin-right: 2pt; }
  .vo { background: #f3f6f8; border-radius: 8pt; padding: 10pt 14pt; }
  .vo p { margin: 0 0 5pt; font-size: 15.5pt; line-height: 1.42; }
  .vo p:last-child { margin-bottom: 0; }
  .visual { font-size: 9pt; color: #51606d; margin-top: 6pt; }
  .visual b { color: #14212b; margin-right: 3pt; }
  .end { font-size: 9pt; color: #51606d; border-top: 0.5pt solid #d4dbe0; padding-top: 6pt; }
</style></head>
<body>
  <section class="cover">
    <h1>Script &amp; draaiboek<br>Multi-Commodity Energy Hub</h1>
    <div class="sub">Pitchvideo PowerUp Drenthe Hackathon 2026 · Track 3 · Energiek Innovatie Collectief</div>
    <div class="stats">
      <div class="stat"><b>${tl.scenes.length}</b><span>opnames, één per scène</span></div>
      <div class="stat"><b>${t(total)}</b><span>totale videoduur (actuele opnames)</span></div>
      <div class="stat"><b>48 kHz</b><span>WAV, mono of stereo</span></div>
    </div>
    <p class="note">Deze versie bevat een Nederlandse synthetische voice-over (Maarten), opgeslagen in public/vo/compact/. Bestaande opnames blijven behouden. De PDF bevat de exacte gesproken tekst, actuele tijdcodes en beeldinstructies.</p><h3>Zo neem je op</h3>
    <ol class="how">
      <li><b>Per scène een apart bestand.</b> Zo kun je één scène overdoen zonder de rest.</li>
      <li><b>Formaat:</b> WAV, 48 kHz, 24-bit (16-bit mag ook).</li>
      <li><b>Stilte:</b> laat ongeveer <b>0,3 s stilte vóór en na</b> je tekst staan. Knip niet strak af.</li>
      <li><b>Bestandsnaam:</b> precies zoals hieronder, in de map <span class="mono">public/vo/compact/</span>.</li>
      <li><b>Tempo:</b> de doelduur gaat uit van de actuele opnames. De volledige video moet onder 120 seconden blijven; de render controleert deze grens.</li>
      <li><b>Meekijken:</b> speel <span class="mono">out/pitch-vo-gids.mp4</span> af: scènenummer linksboven, tekst onderin met een gele markering waar je zou moeten zijn.</li>
      <li><b>Daarna:</b> <span class="mono">npm run render</span> maakt de video opnieuw, nu met jouw stem.</li>
    </ol>
    <h3>Overzicht</h3>
    <table>
      <thead><tr><th>#</th><th>Scène</th><th>Bestand</th><th class="r">Doelduur</th><th class="r">Start</th></tr></thead>
      <tbody>${rows}<tr><td class="n">–</td><td>Eindkaart (geen voice-over)</td><td class="mono">–</td><td class="r">${s1(outro)} s</td><td class="r">${t(total - outro)}</td></tr></tbody>
      <tfoot><tr><td></td><td>Totaal</td><td></td><td class="r">${t(total)}</td><td></td></tr></tfoot>
    </table>
    <div class="note">Doelduur = spreektijd + 1 s ademruimte (0,5 s aan begin en eind van de scène). Elke zin staat in het draaiboek op een eigen regel: adem tussen de regels.</div>
  </section>
  <div class="scenes">${scenes}
    <div class="end">Na scène ${tl.scenes.length} volgt de eindkaart (${s1(outro)} s, geen voice-over). Opnames in <span class="mono">public/vo/compact/</span>, daarna <span class="mono">npm run render</span>.</div>
  </div>
</body></html>`;

const htmlPath = path.join(ROOT, 'out/voiceover.html');
const pdfPath = path.join(ROOT, 'VOICEOVER.pdf');
fs.writeFileSync(htmlPath, html);
// Afdrukken via de headless Chrome van Remotion (DevTools: Page.printToPDF)
const browser = await openBrowser('chrome', {chromiumOptions: {gl: 'swangle'}, browserExecutable});
const server = createServer((_req, res) => {res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.goto({url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000});
  await page.evaluate(() => document.fonts.ready);
  const res = await page._client().send('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });
  fs.writeFileSync(pdfPath, Buffer.from(res.value.data, 'base64'));
} finally {
  server.close();
  await browser.close({silent: true});
}
console.log(`✓ ${path.relative(ROOT, pdfPath)}`);
