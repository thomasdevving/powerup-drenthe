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
export const WORDS_PER_SECOND = 2.6;
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
    audioFile: 'vo/compact/scene-01.wav',
    title: 'De uitdaging van vandaag',
    vo: 'Drentse bedrijven willen groeien en verduurzamen, maar het elektriciteitsnet zit vol. Uitbreidingen en nieuwe ontwikkelingen lopen vast.',
    keywords: [
      {text: 'Drenthe wil vooruit', cue: 'Drentse'},
      {text: 'Net vol', cue: 'elektriciteitsnet'},
      {text: 'Groei loopt vast', cue: 'Uitbreidingen'},
    ],
    visual:
      'Luchtbeeld van Drenthe bij schemering. De hoogspanningslijnen kleuren rood en slibben dicht; inzet: kaart van Drenthe kleurt rood. De camera zakt het terrein in: een pand probeert een verdieping te groeien maar stopt, aanvragen staan in de wachtrij bij de netaansluiting.',
  },
  {
    id: 'groter-probleem',
    audioFile: 'vo/compact/scene-02.wav',
    title: 'Het echte probleem is groter',
    vo: 'Naast netcongestie vragen elektrificatie, hittestress, wateroverlast en ruimte om een integrale aanpak.',
    keywords: [{text: 'Meer dan netcongestie', cue: 'Naast'}],
    visual:
      'Luchtbeeld van het terrein. Eén voor één verschijnen de problemen: overbelaste kabels, vrachtwagens die laadvoorzieningen nodig hebben, een hittewaas boven asfalt en daken, plassen bij hevige regen, en een pand dat niet kan uitbreiden. Ze komen samen in één beeld.',
  },
  {
    id: 'visie',
    audioFile: 'vo/compact/scene-03.wav',
    title: 'Onze visie',
    vo: 'Wij kijken vooruit en ontwerpen het bedrijventerrein van de toekomst: slimmer, groener, efficiënter en gezamenlijk georganiseerd.',
    keywords: [],
    visual:
      'Het omslagmoment. De camera stijgt boven het terrein uit, de rode probleemindicatoren verdwijnen en het wordt dag. Centraal: "Niet alleen het energieprobleem oplossen. Het bedrijventerrein voorbereiden op de toekomst." Daarna: slimmer · groener · efficiënter · samen.',
  },
  {
    id: 'energy-hub',
    audioFile: 'vo/compact/scene-04.wav',
    title: 'De slimme Energy Hub',
    vo: 'De Energy Hub brengt ons van vraaggestuurde naar aanbodgestuurde energielevering. We stemmen flexibel laden en produceren af op beschikbare opwek en netruimte. Lokale opslag helpt stroompieken beperken.',
    keywords: [
      {text: 'Van vraag- naar aanbodgestuurd', cue: 'vraaggestuurde'},
      {text: 'Gebruik volgt beschikbaar aanbod', cue: 'flexibel'},
      {text: 'Pieken beperken', cue: 'stroompieken'},
    ],
    visual:
      'De Energy Hub met batterijen rijst op. In beeld: “Van vraaggestuurd naar aanbodgestuurd”; flexibel laden en produceren schuiven naar beschikbare opwek en netruimte. Eén kabel van de netaansluiting ("levert zoals afgesproken"), een smart grid naar alle panden, zonnepanelen klappen open, windturbine en zonnepark leveren mee. De batterij laadt en vangt een piek op. Daarna vliegt de camera naar het dashboard met elektriciteit, warmte en koude uit het gedeelde kwartiermodel; onderaan de berekende gevraagde netpiek per scenario.',
  },
  {
    id: 'warmtenet',
    audioFile: 'vo/compact/scene-05.wav',
    title: 'Elektriciteit, warmte en koude',
    vo: 'Maar er is meer dan elektriciteit. Koelinstallaties leveren ook restwarmte. Via een lokaal warmtenet en een warmtepomp kan die andere gebouwen verwarmen. De warmtepomp gebruikt stroom; het dashboard rekent die mee. Een warmtebuffer bewaart overschotten voor later. Blauw toont koude, oranje warmte. Warmte-koudeopslag blijft een locatieafhankelijke optie.',
    keywords: [
      {text: 'Restwarmte benutten', cue: 'restwarmte'},
      {text: 'Lokaal warmtenet', cue: 'warmtenet'},
      {text: 'Warmte bewaren voor later', cue: 'warmtebuffer'},
    ],
    visual:
      'Inzoomen op de metaalbewerking en het koelhuis: restwarmte stijgt op en gaat verloren. Dan wordt een ondergronds leidingnet zichtbaar; oranje warmte stroomt via een warmtepomp en warmtebuffer naar kantoren en andere panden. Het dashboard toont berekende warmte, koude, warmtepompstroom en begrensde opslag uit hetzelfde kwartiermodel als de applicatie; geen vaste besparingspercentages. Blauwe leidingen tonen koude en de koppeling met warmteterugwinning. De buffer laadt overdag en ontlaadt later. WKO: optioneel en locatieafhankelijk. Klein in beeld: haalbaarheid hangt af van temperatuur, afstand, aanbod en vraag.',
  },
  {
    id: 'ruimte',
    audioFile: 'vo/compact/scene-06.wav',
    title: 'Ruimtelijke transformatie',
    vo: 'Groene daken, bomen en waterberging maken het terrein klimaatbestendiger. Gedeelde laadpleinen met zonnepanelen combineren mobiliteit en efficiënt ruimtegebruik.',
    keywords: [
      {text: 'Groen en waterberging', cue: 'Groene'},
      {text: 'Gedeeld laadplein', cue: 'Gedeelde'},
    ],
    visual:
      'Groene daken, bomen, groenstroken langs de wegen en wadi\'s; de plassen en de hittewaas verdwijnen. Naast het terrein verschijnt een gedeeld laadplein van circa twee hectare: overdekte parkeerplaatsen met zonnepanelen, laadpunten voor auto\'s en vrachtwagens, groen en wateropvang. De vrachtwagens rijden erheen om te laden.',
  },
  {
    id: 'haulerwijk',
    audioFile: 'vo/compact/scene-07.wav',
    title: 'Praktijkvoorbeeld Haulerwijk',
    vo: 'Samenwerking zoals in Haulerwijk inspireert ons.',
    keywords: [],
    visual:
      'Infographic: vier bedrijfspanden, eerst elk los aan het net. Dan verschijnen verbindingen tussen de bedrijven en een gezamenlijke hub, duidelijk gelabeld als ons voorstel (toekomstbeeld), niet als bestaande installatie. Klein: "Geïnspireerd door het samenwerkingsinitiatief in Haulerwijk — Gemeente Ooststellingwerf, 2026."',
  },
  {
    id: 'cooperatie',
    audioFile: 'vo/compact/scene-08.wav',
    title: 'Samenwerking en eigenaarschap',
    vo: 'Via een coöperatie investeren en beheren ondernemers samen, met afspraken over eigendom, kosten en energiegebruik.',
    keywords: [
      {text: 'Samen investeren', cue: 'investeren'},
      {text: 'Samen beheren', cue: 'beheren'},
      {text: 'Samen afspraken maken', cue: 'afspraken'},
    ],
    visual:
      'Lijnen verbinden alle panden met een centraal coöperatieknooppunt boven de Energy Hub. Een kaart toont het model: één lid één stem, kosten naar gebruik, voordelen terug naar de leden.',
  },
  {
    id: 'voordelen',
    audioFile: 'vo/compact/scene-09.wav',
    title: 'Economische en maatschappelijke voordelen',
    vo: 'Zo creëren we minder verspilling, groenere ruimte en betere voorwaarden voor economische ontwikkeling.',
    keywords: [],
    visual:
      'Vergelijking: links het traditionele bedrijventerrein, rechts het toekomstbestendige terrein, elk met drie korte punten en iconen, over de bestaande geanimeerde 3D-wereld.',
  },
  {
    id: 'risicos',
    audioFile: 'vo/compact/scene-10.wav',
    title: 'Risico\'s en uitvoerbaarheid',
    vo: 'Leveringszekerheid, regelgeving, financiering en samenwerking vragen een gefaseerde aanpak. Warmte-uitwisseling vereist geschikte bronnen, afnemers, temperatuur, afstand en financiële haalbaarheid. Soms blijft netverzwaring noodzakelijk.',
    keywords: [],
    visual:
      '"Een toekomstbestendig bedrijventerrein vraagt ook om realistische keuzes." Drie compacte kaarten: zekerheid en afspraken, technische haalbaarheid, gefaseerd investeren. Contracten, financiële haalbaarheid en netverzwaring blijven expliciet in beeld.',
  },
  {
    id: 'afsluiter',
    audioFile: 'vo/compact/scene-11.wav',
    title: 'Definitieve afsluiter',
    vo: 'Met slimme energie, gedeelde warmte, groene ruimte en samenwerking bereiden we bedrijventerreinen voor op de toekomst. Vandaag in Drenthe, morgen in Nederland.',
    keywords: [],
    visual:
      'De camera stijgt op boven het volledig getransformeerde terrein: Energy Hub, opwek en opslag, warmtenet, groen, waterberging, laadplein en samenwerkende bedrijven. Vier pijlers verschijnen. Uitzoomen naar Drenthe, waar de terreinen oplichten, en naar Nederland. Eindkaart: ENERGY HUB · Het bedrijventerrein van de toekomst · Energiek Innovatie Collectief · PowerUp Drenthe Hackathon 2026.',
  },
  {
    id: 'team',
    audioFile: 'vo/compact/scene-12.wav',
    title: 'Het team',
    vo: 'Wij zijn het Energiek Innovatie Collectief: samen voor de toekomst.',
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
