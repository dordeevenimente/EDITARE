# DOR — Rezervă-ți masa (grafică mese)

Grafică secundară pentru mese, derivată din afișul principal
**Bogdan DLP · live cu formația — Bribón del Puerto, 9 octombrie 2026**.

## Fișiere

| Fișier | Ce este |
|---|---|
| `mese.html` | Sursa graficii de feed — 1080×1440 (3:4, același raport ca afișul). |
| `mese_story.html` | Sursa graficii de story — 1080×1920, cu zone sigure de 210px sus/jos. |
| `assets/bg.png`, `assets/bg_story.png` | Fundal sepia derivat din afiș (crop din bokeh-ul din dreapta, blur + gradient cald + grain). |
| `assets/dor.png`, `assets/havana.png` | Logo-uri extrase pe transparență (luminanță → alpha, fill crem `#F4EADC`). |
| `fonts/` | Inter Display (OFL) — grotesc apropiat de titrajul afișului. |
| `export/` | PNG + JPG gata de postat. |
| `render.mjs` | Randează un HTML în PNG prin Chromium headless. |

## Re-randare

```bash
npm install playwright-core
node render.mjs mese.html export/DOR_MESE_1080x1440@2x.png 1080 1440
node render.mjs mese_story.html export/DOR_MESE_STORY_1080x1920@2x.png 1080 1920
```

Randarea se face la `deviceScaleFactor: 2`, deci ieșirea e 2160×2880 / 2160×3840;
micșoreaz-o la dimensiunea nominală (Lanczos) înainte de publicare.

## Sistem vizual

- Crem `#F4EADC` pe fundal sepia închis, ca pe afiș.
- Titraj Inter Display ExtraBold, tracking `-0.055em` (litere strânse, ca „Bogdan DLP").
- Etichete și date: majuscule, tracking larg (`0.12em`–`0.30em`).
- Chenar subțire interior, cu 44px margine — ramă discretă comună celor două formate.
- Cardurile de masă: hairline crem 20% opacitate; cardul cu canapea e evidențiat
  (bordură portocalie + etichetă „ULTIMELE MESE").
- Banda de ocupare folosește o scară de căldură comună celor două carduri:
  auriu `#E9C65C` → chihlimbar `#E4A33F` → portocaliu `#DC6F30` → roșu `#D13B2B`,
  întinsă pe lățimea totală a pistei. Umplerea decupează gradientul la procentul
  real, deci 80% ajunge în roșu iar 60% se oprește în portocaliu — culoarea
  comunică urgența fără să mai fie nevoie de citit procentul.
- Tot textul este în limba română; rămân în original doar numele proprii
  (Bribón del Puerto, Bogdan DLP, adresa din Aguadulce, DOR, Havana Club).

## De actualizat când se schimbă stocul

În ambele HTML-uri, pentru fiecare card:

```html
<div class="fill" style="width:80%"><i style="width:125%"></i></div>
```

- `.fill` → procentul ocupat (`width:80%`).
- `<i>` → inversul aceluiași procent, ca gradientul să rămână aliniat între
  carduri: `width: 100/procent * 100%` (80% → `125%`, 60% → `166.667%`,
  50% → `200%`, 100% → `100%`).
- Textul din `.pct` și, dacă e cazul, eticheta `.tag`.
