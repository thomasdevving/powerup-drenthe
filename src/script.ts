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
/** Eindkaart die na de laatste scène blijft staan (geen VO). Zet op 0 om weg te laten. */
export const OUTRO_SECONDS = 4;

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
    id: 'uitdaging',
    audioFile: 'vo/scene-01.wav',
    title: 'De uitdaging van vandaag',
    vo: 'Drenthe heeft honderdtwintig bedrijventerreinen. Bedrijven willen groeien en verduurzamen, maar het elektriciteitsnet zit vol. Uitbreidingen worden uitgesteld en nieuwe ontwikkelingen lopen vast.',
    keywords: [
      {text: '120 bedrijventerreinen', cue: 'honderdtwintig'},
      {text: 'Net vol', cue: 'elektriciteitsnet'},
      {text: 'Groei loopt vast', cue: 'Uitbreidingen'},
    ],
    visual:
      'Luchtbeeld van Drenthe bij schemering. De hoogspanningslijnen kleuren rood en slibben dicht; inzet: kaart van Drenthe kleurt rood. De camera zakt het terrein in: een pand probeert een verdieping te groeien maar stopt, aanvragen staan in de wachtrij bij de netaansluiting.',
  },
  {
    id: 'groter-probleem',
    audioFile: 'vo/scene-02.wav',
    title: 'Het echte probleem is groter',
    vo: 'Maar netcongestie is slechts één van de uitdagingen. Bedrijventerreinen krijgen ook te maken met elektrificatie, hittestress, wateroverlast en een groeiende behoefte aan ruimte. Daarom moeten we verder kijken dan alleen het elektriciteitsnet.',
    keywords: [{text: 'Meer dan netcongestie', cue: 'Daarom'}],
    visual:
      'Luchtbeeld van het terrein. Eén voor één verschijnen de problemen: overbelaste kabels, vrachtwagens die laadvoorzieningen nodig hebben, een hittewaas boven asfalt en daken, plassen bij hevige regen, en een pand dat niet kan uitbreiden. Ze komen samen in één beeld.',
  },
  {
    id: 'visie',
    audioFile: 'vo/scene-03.wav',
    title: 'Onze visie',
    vo: 'Daarom kijken wij niet alleen naar het oplossen van netcongestie. Wij ontwerpen het bedrijventerrein van de toekomst: slimmer, groener, efficiënter en gezamenlijk georganiseerd.',
    keywords: [],
    visual:
      'Het omslagmoment. De camera stijgt boven het terrein uit, de rode probleemindicatoren verdwijnen en het wordt dag. Centraal: "Niet alleen het energieprobleem oplossen. Het bedrijventerrein voorbereiden op de toekomst." Daarna: slimmer · groener · efficiënter · samen.',
  },
  {
    id: 'energy-hub',
    audioFile: 'vo/scene-04.wav',
    title: 'De slimme Energy Hub',
    vo: 'Met een gezamenlijke Energy Hub benutten bedrijven de beschikbare energie slimmer. Lokale opwekking, opslag en afgestemde laad- en productiemomenten helpen stroompieken te beperken en maken ruimte voor nieuwe activiteiten.',
    keywords: [
      {text: 'Gezamenlijke Energy Hub', cue: 'gezamenlijke'},
      {text: 'Lokaal opwekken en opslaan', cue: 'Lokale'},
      {text: 'Pieken beperken', cue: 'stroompieken'},
    ],
    visual:
      'De Energy Hub met batterijen rijst op. Eén kabel van de netaansluiting ("levert zoals afgesproken"), een smart grid naar alle panden, zonnepanelen klappen open, windturbine en zonnepark leveren mee. De batterij laadt en vangt een piek op. Daarna vliegt de camera naar het realtime dashboard: piek afgevlakt, minimum per bedrijf, verbruik geschoven.',
  },
  {
    id: 'warmtenet',
    audioFile: 'vo/scene-05.wav',
    title: 'Een lokaal warmtenet',
    vo: 'Ook warmte krijgt een nieuwe waarde. Restwarmte uit bedrijfsprocessen en installaties kan via een lokaal warmtenet worden benut om andere gebouwen te verwarmen. Zo gebruiken we beschikbare energie efficiënter en verminderen we waar mogelijk de behoefte aan nieuwe energie.',
    keywords: [
      {text: 'Restwarmte benutten', cue: 'Restwarmte'},
      {text: 'Lokaal warmtenet', cue: 'warmtenet'},
      {text: 'Minder nieuwe energie nodig', cue: 'verminderen'},
    ],
    visual:
      'Inzoomen op de metaalbewerking en het koelhuis: restwarmte stijgt op en gaat verloren. Dan wordt een ondergronds leidingnet zichtbaar; oranje warmte stroomt via een warmtepomp en warmtebuffer naar kantoren en andere panden. Een warmtekaart in het dashboard toont restwarmte benut van 0% naar ruim de helft. Klein in beeld: haalbaarheid hangt af van temperatuur, afstand, aanbod en vraag.',
  },
  {
    id: 'ruimte',
    audioFile: 'vo/scene-06.wav',
    title: 'Ruimtelijke transformatie',
    vo: 'Ook de ruimte richten we anders in. Groene daken, bomen en waterberging maken het terrein klimaatbestendiger. Gedeelde laadpleinen met zonnepanelen combineren mobiliteit, energieopwekking en efficiënt ruimtegebruik.',
    keywords: [
      {text: 'Groen en waterberging', cue: 'Groene'},
      {text: 'Gedeeld laadplein', cue: 'Gedeelde'},
    ],
    visual:
      'Groene daken, bomen, groenstroken langs de wegen en wadi\'s; de plassen en de hittewaas verdwijnen. Naast het terrein verschijnt een gedeeld laadplein van circa twee hectare: overdekte parkeerplaatsen met zonnepanelen, laadpunten voor auto\'s en vrachtwagens, groen en wateropvang. De vrachtwagens rijden erheen om te laden.',
  },
  {
    id: 'haulerwijk',
    audioFile: 'vo/scene-07.wav',
    title: 'Praktijkvoorbeeld Haulerwijk',
    vo: 'Dat bedrijven willen samenwerken, zien we al in Haulerwijk. Daar onderzoeken vier ondernemers met de gemeente hoe ze energie slimmer gebruiken, opwekken en opslaan. Wij werken dat principe uit tot één integraal concept.',
    keywords: [],
    visual:
      'Infographic: vier bedrijfspanden, eerst elk los aan het net. Dan verschijnen verbindingen tussen de bedrijven en een gezamenlijke hub, duidelijk gelabeld als ons voorstel (toekomstbeeld), niet als bestaande installatie. Klein: "Geïnspireerd door het samenwerkingsinitiatief in Haulerwijk — Gemeente Ooststellingwerf, 2026."',
  },
  {
    id: 'cooperatie',
    audioFile: 'vo/scene-08.wav',
    title: 'Samenwerking en eigenaarschap',
    vo: 'De kracht zit in samenwerking. Via een coöperatie kunnen ondernemers gezamenlijk investeren, voorzieningen beheren en afspraken maken over hun energiegebruik. Zo ontstaat een bedrijventerrein dat niet alleen technisch, maar ook organisatorisch toekomstbestendig is.',
    keywords: [
      {text: 'Samen investeren', cue: 'investeren,'},
      {text: 'Samen beheren', cue: 'beheren'},
      {text: 'Samen afspraken maken', cue: 'afspraken'},
    ],
    visual:
      'Lijnen verbinden alle panden met een centraal coöperatieknooppunt boven de Energy Hub. Een kaart toont het model: één lid één stem, kosten naar gebruik, voordelen terug naar de leden.',
  },
  {
    id: 'voordelen',
    audioFile: 'vo/scene-09.wav',
    title: 'Economische en maatschappelijke voordelen',
    vo: 'Het resultaat is meer dan een slimmer energiesysteem. We creëren ruimte voor economische ontwikkeling, beperken verspilling en maken bedrijventerreinen groener, aantrekkelijker en beter voorbereid op de toekomst.',
    keywords: [],
    visual:
      'Vergelijking: links het traditionele bedrijventerrein, rechts het toekomstbestendige terrein, elk met vijf korte punten en iconen.',
  },
  {
    id: 'risicos',
    audioFile: 'vo/scene-10.wav',
    title: 'Risico\'s en uitvoerbaarheid',
    vo: 'Natuurlijk zijn er uitdagingen. Leveringszekerheid, regelgeving, financiering en samenwerking vragen om duidelijke afspraken. En soms blijft netverzwaring noodzakelijk. Daarom stellen we een gefaseerde aanpak voor, waarin technische haalbaarheid, risico\'s en kosten vanaf het begin worden meegenomen.',
    keywords: [],
    visual:
      '"Een toekomstbestendig bedrijventerrein vraagt ook om realistische keuzes." Vijf kaarten verschijnen één voor één, elk met icoon, risico en beheersmaatregel: leveringszekerheid, regelgeving, financiering, samenwerking en grenzen van de netcapaciteit. Daarna drie fases van de gefaseerde aanpak.',
  },
  {
    id: 'afsluiter',
    audioFile: 'vo/scene-11.wav',
    title: 'Definitieve afsluiter',
    vo: 'Onze ambitie is niet alleen om het elektriciteitsnet slimmer te benutten. Wij willen bedrijventerreinen voorbereiden op de toekomst. Met slimme energie, gedeelde warmte, groene ruimte en samenwerking. Vandaag in Drenthe, morgen in heel Nederland.',
    keywords: [],
    visual:
      'De camera stijgt op boven het volledig getransformeerde terrein: Energy Hub, opwek en opslag, warmtenet, groen, waterberging, laadplein en samenwerkende bedrijven. Vier pijlers verschijnen. Uitzoomen naar Drenthe, waar de terreinen oplichten, en naar Nederland. Eindkaart: ENERGY HUB · Het bedrijventerrein van de toekomst · Energiek Innovatie Collectief · PowerUp Drenthe Hackathon 2026.',
  },
  {
    id: 'team',
    audioFile: 'vo/scene-12.wav',
    title: 'Het team',
    vo: 'Wij zijn het Energiek Innovatie Collectief: kennis van AI, energietransitie, ruimtelijke planning en techniek, samen in één team.',
    keywords: [],
    visual:
      'Over de kaart van Nederland verschijnen vier teamkaarten, één per expertise: Thomas Nguyen (AI & data), Catharina Meter (energietransitie & verandermanagement), Gerhard Hulshoff (ruimtelijke planning) en Martin Hoogenboom (techniek & energiecoöperatie). Daarna de eindkaart.',
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

/** Index van een scène op id (zodat choreografie niet op volgorde-nummers leunt). */
export const sceneIndex = (id: string): number => {
  const i = SCENES.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`Onbekende scène: ${id}`);
  return i;
};
