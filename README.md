# MindMelt Beta v1.3 — Deploy Safe Static Package

This is a flat static GitHub-ready package. There are no folders, no build system, no dependencies, and no package.json.

## Upload to GitHub Pages

1. Upload every file in this zip directly to the repository root.
2. In GitHub, go to Settings > Pages.
3. Set Source to `Deploy from a branch`.
4. Set Branch to `main` and folder to `/root`.
5. Save and wait for GitHub Pages to publish.

## Static host settings

If using Netlify, Vercel, Azure Static Web Apps, or another host:

- Build command: leave blank / none
- Publish directory: root, `/`, or the folder containing `index.html`
- Do not use npm install or npm build

## Files included

- index.html
- 404.html
- styles.css
- app.js
- mindmelt-decision-engine.js
- logo.svg
- manifest.webmanifest
- .nojekyll
- README.md

## Beta note

MindMelt currently stores data locally in the browser with localStorage.
