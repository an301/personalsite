# personalsite

Anish Nambirajan's personal site. Plain HTML, CSS, and a little JS, with no build step.

- `index.html`: content
- `styles.css`: layout, type, and four palettes (dawn, day, dusk, night). The page wears the visitor's local time of day; `T` cycles it. Two self-hosted typefaces in `fonts/`: Corinthia for headings, Fragment Mono for everything else
- `koala.js`: the court at the top. The game is drawn as pixel art into a small offscreen buffer, then printed as dots (one per art pixel). `?time=dawn|day|dusk|night` forces a time of day
- `site.js`: the dot-matrix icons, and the auto-publish pipeline in the Roblox entry
- `track.js`: anonymous visit log (skipped on localhost; visit `/?notrack` once to opt a device out)

CSS and JS are linked with a `?v=N` query. Bump it in `index.html` when either changes, so browsers don't pair a cached old file with new HTML.

Run it locally with any static server, for example `python3 -m http.server`, then open http://localhost:8000.

To deploy on GitHub Pages, set Pages to serve the `main` branch from the root.
