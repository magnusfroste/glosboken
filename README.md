# Glosboken

Ett gratis glosprogram för skolan, från åk 4 till gymnasiet. Klistra in veckans glosor eller
begrepp och träna med kort som kommer tillbaka oftare ju sämre du kan dem. Ingen inloggning,
inga kakor, inga nätverksanrop.

**Spela:** https://glosboken.skolappar.com · En del av [Skolappar](https://www.skolappar.com) – pedagogiska appar av föräldrar · öppen källkod (MIT)

## Vad du kan göra

- **Klistra in en ordlista**, en glosa per rad. Tabb, semikolon, `|`, komma eller
  `–`/`=`/`:` mellan glosa och svar fungerar. Rader som börjar med `#` hoppas över. Du kan
  också läsa in en `.csv`-, `.tsv`- eller `.txt`-fil.
- **Skapa och redigera listor** för hand: lägg till, ändra och ta bort kort, byt namn och ämne.
- **Träna med kort**: tryck för att se svaret och välj *Kunde* eller *Kunde inte*. Tangentbord:
  mellanslag visar svaret, 1/← och 2/→ svarar, Esc avslutar.
- **Repetition i boxar** (Leitner, sex boxar): rätt svar flyttar kortet en box upp och nästa
  repetition kommer efter 1, 3, 7, 16 eller 35 dagar. Fel svar skickar tillbaka kortet till
  första boxen och det kommer igen om tio minuter.
- **Skrivtest** med upp till 20 slumpade kort: skriv svaret och få rätt/fel med facit på slutet.
  Stora/små bokstäver och skiljetecken spelar ingen roll, och ett kort kan ha flera godkända
  svar åtskilda med `/` eller `;`.
- **Statistik per lista**: antal kort, säkra kort (box 4 och uppåt) och andel rätt.
- **Dela en lista** med en länk som kopieras till urklipp. Hela listan ligger i länkens
  `#`-del, så den som öppnar länken kan förhandsgranska och spara den.
- **Ladda ner listan som CSV.**

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm run build    # produktionsbygge till dist/
npm run preview  # förhandsgranska bygget
```

Dockerfilen bygger med Node 22.

## Docker

```bash
docker build -t glosboken .
docker run --rm -p 8080:8080 glosboken
```

Bygget serveras av nginx på port 8080 med `deploy/nginx.conf`.

## Integritet

- Ingen spårning, inga kakor, ingen analys, inget konto.
- Inga anrop till externa servrar. Typsnittet Fredoka ligger i appen (`public/fonts/`);
  `@fontsource/inter` följer också med i bygget. Inga typsnitt hämtas utifrån.
- Listorna och dina resultat sparas bara i `localStorage` under nyckeln `glosboken-v1`.
  Rensa webbläsardata så är det borta.
- En delningslänk innehåller hela listan i adressens `#`-del. Den delen skickas inte till
  servern, men alla som får länken kan läsa listan.

## Struktur

```
src/App.tsx         vyer: start, lista, träning, skrivtest, redigering, import, delad lista
src/lib/srs.ts      kort, Leitner-boxar, rättning och localStorage (glosboken-v1)
src/lib/share.ts    tolkning av inklistrad text, CSV-export och delningslänkar
src/styles.css      stil och typsnitt
```

## Licens

MIT – se [LICENSE](LICENSE).
