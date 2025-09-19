# Boxing Scorecard

A simple static web app to score boxing fights. The app lets you choose a fight length (3–12 rounds), walk through rounds in order, and optionally lock previous rounds to prevent editing.

Usage

Open `index.html` in a browser (no server required). Optionally run a quick local server for file:// limitations:

```bash
# from project folder
python3 -m http.server 8000
# then open http://localhost:8000
```

Features

- Select fights from 3 to 12 rounds.
- Sequential round flow: you must progress through rounds; later rounds are disabled until earlier ones are saved.
- Toggle `Lock previous rounds` to prevent editing prior rounds.
- Scores persist in `localStorage`.
- Export JSON of the current fight.

New features:

- Enter boxer names for the Red and Blue corners before starting the fight.
- Per-judge scorecards: three judge cards are shown (Red/White/Blue judge placeholders). Each judge records their own round score for Red and Blue.
- Totals are aggregated across judges to show overall numeric totals.
 
Updated behaviour (single-device scoring):

- The app now assumes each judge uses their own device. The UI shows a single three-column table: `Red Corner | Round | Blue Corner`.
- Each round is a row. Under each corner there's a numeric input for the round score; the middle column shows the round number.
- The sequential enabling behavior remains: only the current round is editable (previous rounds locked if `Lock previous rounds` is checked).
- Scores persist to `localStorage` and can be exported as JSON.

Files

- `index.html` — UI
- `styles.css` — minimal styles
- `app.js` — app logic and persistence

