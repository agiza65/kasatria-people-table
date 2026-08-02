# Kasatria Assignment — Setup & Deployment Guide

Everything below turns the project files into the live URL the assignment
asks you to submit. Do the parts in order — each one feeds the next.

---

## Part 1 — Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**.
2. `File → Import → Upload` and upload `Data_Template.csv` (your original file).
   Import location: **Replace current sheet**, separator: **Comma**.
3. Confirm the header row is: `Name, Photo, Age, Country, Interest, Net Worth`
   (200 data rows below it).
4. Click **Share** (top right) → add `lisa@kasatria.com` as **Viewer** →
   Send. (This satisfies step 1 of the instructions.)
5. Still in the Share dialog, under **General access**, change it to
   **"Anyone with the link" → Viewer**. This is required so the API key
   in Part 2 can read the sheet without per-user OAuth.
6. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit`
   → save it, you'll paste it into `config.js`.

---

## Part 2 — Google Cloud Project (Sign-In + Sheets API)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) →
   create a **New Project** (name it e.g. `kasatria-people-table`).
2. **Enable the Sheets API**: left menu → *APIs & Services* → *Library* →
   search "Google Sheets API" → **Enable**.
3. **Configure the OAuth consent screen**: *APIs & Services* →
   *OAuth consent screen* → User type **External** → fill app name, your
   email → Save through the remaining steps (test mode is fine).
4. **Create the OAuth Client ID** (for "Sign in with Google"):
   *APIs & Services* → *Credentials* → *Create Credentials* →
   **OAuth client ID** → Application type **Web application**.
   - Under **Authorized JavaScript origins**, add the URL you'll deploy to
     (see Part 3) — e.g. `https://yourname.github.io`.
   - Create → copy the **Client ID** (ends in `.apps.googleusercontent.com`).
5. **Create an API key** (for reading the Sheet):
   *Credentials* → *Create Credentials* → **API key** → copy it.
   - Click **Restrict key** → under *API restrictions* choose
     **Google Sheets API** only. (Good practice, not strictly required.)

---

## Part 3 — Configure the project

Open `config.js` (already generated for you) and fill in the three values
you just collected:

```js
GOOGLE_CLIENT_ID: "123456789-abc.apps.googleusercontent.com",
GOOGLE_API_KEY:   "AIzaSy...",
SPREADSHEET_ID:   "1AbCdEf...",
USE_GOOGLE_SHEETS: true   // flip this to true once the above is filled in
```

Leave `SHEET_RANGE` as `"Sheet1!A2:F201"` unless you renamed the tab or the
data isn't exactly 200 rows starting at row 2.

**Test locally first (optional but recommended):**
```bash
cd kasatria-periodictable
python3 -m http.server 8000
```
Open `http://localhost:8000`. With `USE_GOOGLE_SHEETS: false` you'll see the
3D table load instantly from the bundled `data.json` — use this to confirm
the visualization itself works before touching Google Cloud. Google Sign-In
won't work on `localhost` unless you also add `http://localhost:8000` to
Authorized JavaScript origins in Part 2 step 4.

---

## Part 4 — Deploy (GitHub Pages — free, ~5 minutes)

1. Create a new **public** GitHub repo, e.g. `kasatria-people-table`.
2. Upload all 5 files from the project folder (`index.html`, `style.css`,
   `app.js`, `config.js`, `data.json`) to the repo root.
3. Repo → **Settings** → **Pages** → Source: **Deploy from a branch** →
   Branch: `main` / root → **Save**.
4. GitHub gives you a URL like:
   `https://yourname.github.io/kasatria-people-table/`
5. Go back to Google Cloud Console (Part 2, step 4) and make sure this
   exact URL is in **Authorized JavaScript origins** (just the origin,
   no trailing path: `https://yourname.github.io`).
6. Wait ~1–2 minutes for Pages to publish, then open the URL.

*(Netlify drag-and-drop or Vercel work identically if you prefer those —
just drag the folder in and add the resulting domain to the OAuth origins.)*

---

## Part 5 — Verify against the assignment checklist

- [ ] Google Sheet created, imported, shared with `lisa@kasatria.com`
- [ ] Page shows a **Sign in with Google** screen before anything else
- [ ] After sign-in, tiles show **photo, name, age, country, interest, net worth**
- [ ] Tile background: **red** `<$100K`, **orange** `$100K–$200K`, **green** `>$200K`
- [ ] **TABLE** button → 20 × 10 grid
- [ ] **SPHERE** button → sphere layout
- [ ] **HELIX** button → **double** helix (two intertwined strands)
- [ ] **GRID** button → 5 × 4 × 10 layout
- [ ] Data is actually pulled live from the Sheet (`USE_GOOGLE_SHEETS: true`)
- [ ] Submit the deployed URL

---

## Notes / things worth knowing if asked about your approach

- The visualization is a straight adaptation of three.js's official
  `css3d_periodictable` example: CSS3DRenderer + CSS3DObject tiles,
  4 sets of pre-computed target positions, animated between with a
  manual cubic-easing tween (no external tween library needed).
- Data flow: `Google Sheet → Sheets API v4 (values.get) → JSON → tile DOM elements`.
  `data.json` is only a local fallback for offline development.
- Photo URLs in the source CSV point to `static.kasatria.com`; if any are
  broken/404 the tile just shows a dark placeholder square instead of
  breaking layout (handled via `img.onerror`).
