# Energy Hub — pitchvideo

3D motion graphic (Remotion + React Three Fiber) voor de PowerUp Drenthe Hackathon 2026, track 3 "Het bedrijventerrein van de toekomst". Team Energiek Innovatie Collectief.

Alles is procedureel opgebouwd uit primitives (geen externe 3D-modellen). Output: 1920×1080, 30 fps, H.264.

## Multi-Commodity-versie · maximaal twee minuten

De pitch duurt met de nieuwe Nederlandse synthetische voice-over **115,47 seconden**, inclusief eindkaart. De bestaande 3D-wereld, camera, kleuren en materialen zijn behouden; warmte, koude en begrensde thermische opslag zijn geïntegreerd. Het praktijkvoorbeeld, de vergelijking en het team zijn ingekort. Een render boven 120 seconden wordt geweigerd.

Het bestaande dashboard bevat nu **Multi-Commodity Energy Management** met scenario A/B/C, warmtenet aan/uit, COP, buffer, leidingverliezen en terugwinbaar bronvermogen. Alle grafieken, facturatie en videowaarden gebruiken het gedeelde kwartiermodel in `src/energy/`. Tekorten boven de netlimiet blijven zichtbaar; kostenvoordelen worden niet geclaimd bij ongelijke levering.

- [Video](out/pitch.mp4) · [Script en draaiboek als PDF](VOICEOVER.pdf) · [Gidsvideo](out/pitch-vo-gids.mp4) · [Ondertiteling](out/voiceover.srt)
- [Technische aannames, grenzen en controles](TECHNICAL.md)
- Nieuwe audio: `public/vo/compact/scene-01.wav` t/m `scene-12.wav`; oudere opnames blijven behouden.
- Fonts worden lokaal gebundeld via `@fontsource/inter`.
- Voor binaire bestanden: `git lfs install` en `git lfs pull`.

```bash
npm install
npm test
npm run typecheck
cd web && npm install && npm run build
```

Renderen op een machine zonder GPU:

```bash
GL=swangle CONCURRENCY=2 npm run render
npm run vo-pdf
```

De gids hergebruikt de definitieve 3D-render en voegt met FFmpeg een leeslaag met woordmarkering toe. FFmpeg is daarom nodig voor de gids. `CHROME_PATH` kan een eigen Chromium-pad aanwijzen; anders gebruikt de workflow systeem-Chromium als dat aanwezig is, of de standaard Remotion-browser.

## Verhaallijn (12 scènes)

Netcongestie is de aanleiding, niet het hele verhaal: het concept bereidt bedrijventerreinen voor op de toekomst.

1. De uitdaging van vandaag · 2. Het echte probleem is groter (elektrificatie, hitte, water, ruimte) · 3. Onze visie · 4. De slimme Energy Hub + dashboard · 5. Lokaal warmtenet · 6. Ruimtelijke transformatie + gedeeld laadplein (± 2 ha) · 7. Praktijkvoorbeeld Haulerwijk · 8. Coöperatie · 9. Voordelen (traditioneel vs toekomstbestendig) · 10. Risico's en uitvoerbaarheid · 11. Afsluiter (Drenthe → Nederland) · 12. Het team · eindkaart.

Teksten, keywords en beeldbeschrijvingen staan in `src/script.ts`; het draaiboek voor de spreker in [VOICEOVER.md](VOICEOVER.md).

## Installeren

```bash
npm install
```

## Previewen in Remotion Studio

```bash
npm run studio
```

Kies links `Pitch` (de video) of `PitchVoGids` (met teleprompter en scènenummer). Studio herlaadt automatisch als je `src/script.ts` aanpast of een wav-bestand toevoegt.

## Voice-over toevoegen en opnieuw renderen

1. Neem per scène op volgens [VOICEOVER.md](VOICEOVER.md) (wav, 48 kHz, ~0,3 s stilte voor en na).
2. Zet de compacte opnames in `public/vo/compact/` als `scene-01.wav` … `scene-12.wav`. Ontbrekende scènes houden hun standaardduur. De totale video mag niet boven 120 seconden komen.
3. Optioneel: zet achtergrondmuziek in `public/music.mp3` (volume 0,12, automatisch gedempt naar 0,05 tijdens VO).
4. Render alles met één commando:

```bash
npm run render
```

Dat maakt:

| Bestand | Inhoud |
|---|---|
| `out/pitch.mp4` | De video (met VO en muziek als die er zijn) |
| `out/pitch-vo-gids.mp4` | Dezelfde video met teleprompter onderin en scènenummer linksboven |
| `out/voiceover.srt` | Ondertitels met de actuele timings |
| `out/timeline.json` | Duur en bron (default/audio) per scène |

Het script print aan het begin de duur per scène en de totale duur.

### Handige varianten

```bash
npm run srt
```

Alleen de SRT en timings opnieuw berekenen (snel).

```bash
node scripts/render-all.mjs --skip-gids
```

Alleen `pitch.mp4`.

```bash
node scripts/render-all.mjs --override=energy-hub:30
```

Scèneduur forceren in seconden (test of handmatig bijstellen). Scène-id's staan in `src/script.ts`.

```bash
node scripts/stills.mjs --at=0.5
```

Eén still per scène op 50% naar `out/stills/` (snelle visuele check).

```bash
GL=swangle npm run render
```

Als WebGL via `angle` (GPU) faalt: softwarematige rendering (trager).

```bash
node scripts/voiceover-md.mjs
```

`VOICEOVER.md` opnieuw genereren na het aanpassen van teksten.

```bash
npm run vo-pdf
```

`VOICEOVER.pdf` (printbaar draaiboek voor de spreker) opnieuw maken uit `out/timeline.json`.

## Website: demo-dashboard, facturatie en plattegrond (web/)

Live op https://energy-hub-plattegrond.vercel.app.

- **Facturatie** (`#facturatie`): één factuur van de leverancier aan de coöperatie, verdeeld per bedrijf naar gebruik (net, eigen opwek, batterij, bijdrage minimum, vergoedingen), met vergelijking zonder hub. Tarieven zijn indicatief (`TARIFF` in `web/src/demo/sim.ts`). Deelt het scenario met het dashboard.
- **Demo dashboard** (startpagina): simulatie van een dag op het terrein in kwartieren, met/zonder Energy Hub, winter/zomer, afgesproken levering, batterij, zonnepark, windturbine en drie gedragsregels van de community. Per bedrijf: verbruik per categorie, gegarandeerd minimum, wat er geschoven wordt en advies. Het model staat in `web/src/demo/sim.ts` (indicatieve waarden), de pagina in `web/src/demo/Demo.tsx`.
- **Plattegrond** (`#plattegrond`): hover-kaart van het terrein met dezelfde 3D-wereld als de video. Teksten en cijfers per gebouw staan in `web/src/zones.ts`.

```bash
cd web && npm install && npm run dev
```

Opnieuw publiceren (Vercel, ingelogd):

```bash
cd web && npx vite build && rm -rf deploy && mkdir deploy && cp -R dist deploy/energy-hub-plattegrond && npx vercel deploy deploy/energy-hub-plattegrond --prod --yes
```

## Hook-foto

Zet een foto als `public/hook.jpg` (of .png/.webp) en vul de naamsvermelding in bij `HOOK_PHOTO.credit` in `src/script.ts`. Scène 1 opent dan met die foto en vloeit over in het 3D-luchtbeeld. Daarna `npm run render`.

## Hoe het werkt

- **`src/script.ts`** is het enige bronbestand: per scène id, titel, VO-tekst, keywords (met een `cue`-woord waarop ze verschijnen) en een beschrijving van het beeld.
- **Duur per scène** = woorden / 2,6 + 1,0 s ademruimte (0,5 s aan begin en eind). Staat er een wav-bestand, dan geldt: lengte opname + 1,0 s. Zie `src/timeline.ts`. Bij een totale duur boven 120 seconden stopt de render.
- **Alle animatie loopt op scène-progress** (0 → 1), nooit op vaste frames. De choreografie staat op één plek: `src/world/state.ts`. Momenten zijn gekoppeld aan woorden in de VO (`cue(…)`), dus als je tekst of opname verandert, blijft beeld synchroon. Alleen doorlopende ambient-bewegingen (deeltjes, wieken) lopen op seconden, zodat hun snelheid constant blijft.
- **Camera:** keyframes in story-time (`src/world/camera.ts`), vloeiend geïnterpoleerd in echte seconden, zonder harde cuts.
- **Kleurcode:** rood/oranje = congestie, cyaan/groen = smart grid, geel = zonne-energie, groene vulling = batterijniveau (`src/util.ts`).

## Mappen

```
src/script.ts        teksten, keywords, duurregels
src/timeline.ts      scèneduren (incl. wav-detectie), story-time
src/world/           3D: landschap, net, terrein, hub, kaart, camera, choreografie
src/overlay/         2D: keywords, dashboard, splitscreen, eindtitel, teleprompter
scripts/             render-, stills- en draaiboekscripts
public/vo/           hier komen de opnames
```

## Bronnen

- Provinciegrenzen (kaart van Drenthe en Nederland): CBS Gebiedsindelingen, provincies gegeneraliseerd 2024, via PDOK (open data, CC BY 4.0), vereenvoudigd in `src/world/provinces.json`.
- Praktijkvoorbeeld Haulerwijk: Gemeente Ooststellingwerf, 2 februari 2026 (intentieverklaring; onderzoeksfase).
