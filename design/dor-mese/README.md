# DOR — Table Experience (grafică mese)

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
- Cardurile de masă: hairline crem 20% opacitate; cardul SOFA e evidențiat
  (bordură mai puternică + etichetă „ULTIMELE MESE").
- Barele de disponibilitate reflectă 80% / 60% sold out.

## De actualizat când se schimbă stocul

În ambele HTML-uri: `style="width:80%"` / `style="width:60%"` pe `.fill`,
textul din `.pct` și eticheta `.tag`.
