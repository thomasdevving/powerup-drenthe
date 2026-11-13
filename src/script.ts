/**
 * ENIG BRONBESTAND voor de pitchvideo.
 *
 * De voice-over is leidend: elke scène duurt standaard
 *   (aantal woorden in de VO-tekst / WORDS_PER_SECOND) + 2 × PADDING_SECONDS
 * en als public/vo/scene-XX.wav bestaat: (lengte van de opname) + 2 × PADDING_SECONDS.
 *
 * Keywords verschijnen op het moment dat het `cue`-woord in de VO valt
 * (geschat op woordpositie), dus ze blijven synchroon als je de tekst aanpast.
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Spreektempo voor de standaardduur. */
export const WORDS_PER_SECOND = 2.3;
/** Ademruimte aan begin én eind van elke scène (zonder nieuwe informatie). */
export const PADDING_SECONDS = 0.5;
/** Eindkaart die na scène 9 blijft staan (geen VO). Zet op 0 om weg te laten. */
export const OUTRO_SECONDS = 3;

/**
 * Echte foto in de hook (scène 1). Zet een bestand in public/ onder één van deze namen;
 * ontbreekt het, dan start de video direct in 3D. Vul `credit` in volgens de licentie van de foto.
 */
export const HOOK_PHOTO = {
  files: ['hook.jpg', 'hook.jpeg', 'hook.png', 'hook.webp'],
  credit: '',
};

export type Keyword = {
  text: string;
  /** Woord uit de VO-tekst waarop het keyword verschijnt. */
  cue?: string;
  /** Alternatief: vast moment binnen de VO (0 = eerste woord, 1 = laatste woord). */
  at?: number;
};

export type SceneDef = {
  id: string;
  /** Bestandsnaam van de opname in public/vo/ */
  audioFile: string;
  title: string;
  vo: string;
  keywords: Keyword[];
  /** Wat er in beeld gebeurt (voor VOICEOVER.md). */
  visual: string;
};

export const SCENES: SceneDef[] = [
  {
    id: 'hook',
    audioFile: 'vo/scene-01.wav',
    title: 'Hook',
    vo: 'Drenthe heeft honderdtwintig bedrijventerreinen. Er ligt stroom. Maar het net zit vol.',
    keywords: [
      {text: '120 bedrijventerreinen', cue: 'honderdtwintig'},
      {text: 'Net vol', cue: 'Maar'},
    ],
    visual:
      'Luchtbeeld van Drenthe bij schemering. Camera glijdt naar een bedrijventerrein; de hoogspanningslijnen lichten rood op en de stroom erin slibt dicht.',
  },
  {
    id: 'probleem',
    audioFile: 'vo/scene-02.wav',
    title: 'Het probleem',
    vo: 'Bedrijven willen uitbreiden en verduurzamen, maar staan in de wachtrij voor een zwaardere aansluiting. Terugleveren? Heel Drenthe staat op rood. Bedrijven groeien niet, en nieuwe bedrijven vestigen zich elders.',
    keywords: [
      {text: 'Wachtrij', cue: 'wachtrij'},
      {text: 'Terugleveren: rood', cue: 'Terugleveren?'},
      {text: 'Groei stopt', cue: 'groeien'},
    ],
    visual:
      'Camera zakt het terrein in. Een pand probeert een verdieping te groeien maar stopt. Aanvraag-blokjes staan in de wachtrij bij de netaansluiting. Zonnestroom van een dak ketst rood terug. Inzet: kaart van Drenthe kleurt volledig rood.',
  },
  {
    id: 'gemiste-kans',
    audioFile: 'vo/scene-03.wav',
    title: 'De gemiste kans',
    vo: 'En soms ligt de oplossing letterlijk naast de deur: een zonnepark naast een bedrijventerrein, maar zonder verbinding.',
    keywords: [{text: 'Naast elkaar, niet verbonden', cue: 'zonder'}],
    visual:
      'Camera draait naar het zonnepark naast het terrein. Twee aparte kabels lopen elk naar een ander station; de zonnestroom bereikt het terrein niet.',
  },
  {
    id: 'omslag',
    audioFile: 'vo/scene-04.wav',
    title: 'De omslag',
    vo: 'Wij kijken niet naar verzwaren. Wij kijken naar wat het terrein zelf kan.',
    keywords: [
      {text: 'Niet verzwaren.', cue: 'verzwaren.'},
      {text: 'Slimmer verdelen.', cue: 'terrein'},
    ],
    visual: 'Beeld dimt, de rode gloed verdwijnt. Eén zin centraal in beeld.',
  },
  {
    id: 'energy-hub',
    audioFile: 'vo/scene-05.wav',
    title: 'De Energy Hub',
    vo: 'Dit is de Energy Hub. De leverancier levert één vaste hoeveelheid energie aan het hele terrein, zoals afgesproken. Het terrein verdeelt die zelf, via een eigen smart grid. Zelf opgewekte stroom wordt opgeslagen in batterijen en vangt de pieken op.',
    keywords: [
      {text: 'Energy Hub', cue: 'Energy'},
      {text: 'Eigen smart grid', cue: 'verdeelt'},
      {text: 'Pieken opvangen', cue: 'batterijen'},
    ],
    visual:
      'De Energy Hub met batterijen rijst op in het midden van het terrein. Eén dikke kabel van trafo naar hub ("levert zoals afgesproken"). Een ringnet ontvouwt zich naar alle panden, zonnepanelen klappen open, een windturbine gaat draaien. Overschot laadt de batterij; bij een piek ontlaadt hij.',
  },
  {
    id: 'dashboard',
    audioFile: 'vo/scene-06.wav',
    title: 'Het dashboard',
    vo: 'Met een realtime dashboard ziet elk bedrijf wat het verbruikt. Iedereen krijgt een gegarandeerd minimum. Daarboven schuiven we slim, of wekken we zelf op.',
    keywords: [
      {text: 'Realtime inzicht', cue: 'realtime'},
      {text: 'Gegarandeerd minimum', cue: 'gegarandeerd'},
    ],
    visual:
      'Camera vliegt naar een zwevend dashboard boven het terrein: verbruik per pand met een minimumlijn, een dagcurve waarvan de piek wordt afgevlakt, en een blok verbruik dat naar een rustiger moment schuift.',
  },
  {
    id: 'koel-groen-samen',
    audioFile: 'vo/scene-07.wav',
    title: 'Koel, groen en samen',
    vo: 'En we maken het terrein koeler en groener: minder hittestress, betere waterafvoer. Ondernemers investeren samen, en beslissen samen.',
    keywords: [
      {text: 'Minder hittestress', cue: 'hittestress,'},
      {text: 'Samen investeren', cue: 'Ondernemers'},
    ],
    visual:
      'Rood hittewaas koelt af. Asfalt maakt plaats voor groene daken, bomen en wadi’s. Lijnen verbinden de panden tot één community.',
  },
  {
    id: 'win-win',
    audioFile: 'vo/scene-08.wav',
    title: 'Win-win',
    vo: 'Voor de leverancier: minder complexiteit. Voor het bedrijventerrein: ruimte om te groeien.',
    keywords: [],
    visual:
      'Splitscreen. Links "Leverancier": één aansluiting, levert zoals afgesproken, minder administratie. Rechts "Bedrijventerrein": ruimte om te groeien, onafhankelijk, aantrekkelijk vestigingsklimaat.',
  },
  {
    id: 'opschalen',
    audioFile: 'vo/scene-09.wav',
    title: 'Opschalen + afsluiter',
    vo: 'Eén gestandaardiseerd concept, toepasbaar op honderdtwintig terreinen in Drenthe, en daarna in heel Nederland. Want de grootste winst zit in wat er al staat.',
    keywords: [
      {text: '120 terreinen', cue: 'honderdtwintig'},
      {text: 'Schaalbaar', cue: 'Nederland.'},
    ],
    visual:
      'Camera trekt ver uit naar de kaart van Drenthe; 120 stippen lichten één voor één groen op. Uitzoomen naar Nederland. Eindtitel: "Energy Hub — Energiek Innovatie Collectief · PowerUp Drenthe 2026".',
  },
];

/** Splitst VO-tekst in woorden (zoals gebruikt voor de duurberekening). */
export const words = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean);

/** Standaardduur in seconden volgens de regel: woorden / tempo + ademruimte. */
export const defaultDurationSeconds = (scene: SceneDef): number =>
  words(scene.vo).length / WORDS_PER_SECOND + 2 * PADDING_SECONDS;

/** Positie (0..1) van een woord binnen de VO. */
export const cueFraction = (scene: SceneDef, cue: string): number => {
  const w = words(scene.vo);
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const idx = w.findIndex((x) => norm(x) === norm(cue));
  if (idx < 0) return 0;
  return w.length <= 1 ? 0 : idx / w.length;
};

export const keywordAt = (scene: SceneDef, k: Keyword): number =>
  k.cue ? cueFraction(scene, k.cue) : k.at ?? 0;
