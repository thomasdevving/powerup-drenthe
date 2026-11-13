# Multi-Commodity Energy Hub — technische oplevering

Deze versie breidt de bestaande Remotion/React Three Fiber-wereld en het bestaande Vite-dashboard uit. Het kleurenpalet, de materialen, belichting en camerainterpolatie zijn behouden. Warmte is oranje, koude blauw; het bestaande cyaan/groen van het smart grid en geel van zonnestroom blijven intact.

## Gedeelde berekening

`src/energy/model.ts` is de enige simulatiekern. `profiles.ts` bevat de bestaande acht illustratieve bedrijven, seizoensprofielen en tarieven. `web/src/demo/sim.ts` bewaart de bestaande importinterface, zodat dashboard en facturatie dezelfde kern gebruiken. Ook de hoverkaarten op de plattegrond gebruiken deze berekening en gedeelde instellingen; oude schijn-live waarden en vaste warmtepercentages zijn verwijderd. `pitch-data.ts` berekent de standaard winterdag voor de video uit dezelfde instellingen.

Een dag bestaat uit 96 kwartieren. Elektrische vermogens staan in kW, elektriciteit en batterijvoorraad in kWh. Warmte en koude gebruiken kWth en kWhth; deze worden niet bij elektriciteit opgeteld. De koeling vraagt thermische koellast / EER aan elektriciteit. De afgevoerde condensatiewarmte is geproduceerde koude + koelstroom. Alleen het instelbare technisch terugwinbare aandeel is beschikbaar voor het warmtenet. Dit is een illustratieve aanname, geen broninventarisatie.

De netwarmtepomp gebruikt bronwarmte na transportverlies en elektriciteit: `Q = bron × (1 − leidingverlies) + W`, met `W = Q / COP`. Circulatie vraagt aanvullend 1,2% van het onttrokken bronvermogen elektrisch. Niet geleverde netwarmte wordt gepland met een lokale warmtepomp met COP 3, ook in de traditionele situatie. Er is geen gasinstallatie of gratis aanvullende warmte aangenomen.

De warmtepomp levert maximaal 450 kWth. De warmtebuffer heeft een instelbare capaciteit, maximaal 250 kWth laad-/ontlaadvermogen en 0,5% stilstandsverlies per uur. Hij laadt met overschotten tussen 09:00 en 17:00 en levert in ochtend en avond. De batterij heeft een vermogen van 0,5 C en 95% rendement per richting. Voorkoelen gebruikt een illustratieve koudebuffer van 400 kWhth, 160 kWth vermogen en 0,5% verlies per uur. Alle opslag start leeg; eindvoorraad blijft op de balans staan. Er wordt geen energie uit een vorige dag cadeau gegeven.

## Scenario's en eerlijke vergelijking

- A: individuele systemen en alleen zon achter de eigen meter; geen warmtenet of gezamenlijke opslag.
- B: gedeelde lokale opwek, elektrische batterij en afstemming van proces-/laadtijden, optioneel een koudebuffer.
- C: B plus terugwinning, warmtenet, warmtepomp en warmtebuffer.

De geïnstalleerde opwekcapaciteit en dagelijkse bedrijfsactiviteiten zijn gelijk. A kan het zonnepark en de windturbine niet gezamenlijk benutten; de niet benutte productie wordt als afregeling verantwoord. Proces- en laadprofielen worden na herschikking per bedrijf genormaliseerd, zodat dagenergie behouden blijft. Warmte- en koelvraag blijven gelijk. Koelstroom kan verschillen door koudebufferverliezen. WKO is alleen een locatieafhankelijke mogelijkheid buiten de actieve simulatie. Waterstof, biogas en WKK zijn niet toegevoegd.

De import wordt werkelijk begrensd op de ingestelde netlimiet. Gevraagde netpiek, daadwerkelijke import en niet geleverde elektriciteit staan apart. Een tekort wordt niet als verplaatste of bespaarde energie geboekt. Bij een elektrisch tekort zijn warmte-/koudeleveringen de **geplande** diensten; uitvoering is niet gegarandeerd. Er wordt geen onzichtbare extra netcapaciteit gemaakt en geen thermische leveringszekerheid beloofd.

De scenariokosten zijn uitsluitend netinkoop à €0,24/kWh, zonder investeringen, onderhoud, belasting of interne verrekening. Bij tekorten toont het dashboard geen financieel besparingsbedrag tegenover A. Investeringen vereisen een locatiespecifieke businesscase. De facturatiepagina blijft een illustratieve interne verdeling, geen boekhoudkundige leverancierafrekening of juridisch aansluitmodel.

## Video en script

De compacte versie bevat 12 bestaande scène-id's, met sterk ingekorte tekst (226 woorden). De Energy Hub-scène benoemt expliciet de overgang van vraaggestuurde naar aanbodgestuurde energielevering: flexibel gebruik volgt beschikbare opwek en netruimte. Kritieke vraag wordt niet stilzwijgend geschrapt. Het praktijkvoorbeeld, de vergelijking en het team zijn kort gehouden; de multi-commodity-scène duurt circa 22 seconden. Nieuwe audio staat in `public/vo/compact/`, los van oudere opnames. De Nederlandse synthetische voice-over gebruikt Maarten (nl-NL-MaartenNeural), gegenereerd op +5% tempo en zonder toonhoogteverandering versneld met factor 1,22 voor een vloeiende pitch. Het gemiddelde spreektempo is circa 136 woorden per minuut; per scène circa 105–159. De totale duur inclusief eindkaart is **115,47 seconden**. De render stopt als nieuwe opnames of overrides de grens van 120 seconden overschrijden.

De 3D-warmtebuffer en het video-dashboard volgen dezelfde winterdag. De vergelijking gebruikt berekende waarden, zonder vaste besparingspercentages. Het blauwe circuit visualiseert koeling; de netwarmtepomp en zijn elektrische input zijn zichtbaar. De leidingen liggen voor leesbaarheid als schematische doorsnede op maaiveldniveau; dit is geen civieltechnisch ontwerp.

`SCRIPT.pdf` (compacte spreektekst), `VOICEOVER.md`, `VOICEOVER.pdf` (uitgebreid draaiboek), `out/voiceover.srt` en `out/timeline.json` komen uit dezelfde scènebron. De gidsvideo hergebruikt de definitieve MP4 en voegt een scènelabel en leeslaag met woordmarkering toe. De markering en ondertitels volgen geschatte woordposities binnen de echte opnameduur; het zijn geen woordniveau-forced-alignmentdata.

## Controles

- `npm test`: 144 scenario-runs over winter/zomer, netlimieten 0/500/800/1300 kW, batterij 0/1600 kWh en COP 2/3/6. Controleert onafhankelijke dagbalansen, kwartierbalansen, identieke diensten, opslaggrenzen, netlimiet, geen gelijktijdig batterij laden/ontladen, nulbron, uitgeschakeld warmtenet en een COP die juist nadelig uitpakt.
- `npm run typecheck`: root- en web-TypeScript.
- `cd web && npm run build`: productiebuild van het dashboard.
- Browsercontrole in Chromium: warmtenet aan/uit, COP, buffer, gedeelde facturatie, mobiele breedte en browserfouten.
- Stillcontrole per scène: tekstpassen, risico's, dashboard, vergelijking en eindkaart. Hoofdvideo en gidsvideo zijn volledig gerenderd en met FFprobe/FFmpeg gecontroleerd: beide 115,477 s, 1920×1080, 30 fps, H.264 met 48 kHz audio, volledig decodeerbaar. Beide PDF’s bevatten alle 12 exacte voice-overteksten; het compacte script past op één A4.

Warmte-uitwisseling vereist geschikte bronnen, afnemers, temperatuur, afstand en financiële haalbaarheid. Collectieve infrastructuur vereist passende contracten en wettelijke toetsing. Soms blijft netverzwaring noodzakelijk.
