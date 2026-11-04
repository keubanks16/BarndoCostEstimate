# Barndo Cost Estimate

Editable construction cost estimate for the **Tinsley Barndominium (plan TB-4060)** — a 40' × 60' metal building home with a loft and 15' wraparound porch in Georgia.

**Live app:** https://keubanks16.github.io/BarndoCostEstimate/

## Using it
- Tap any price to change it; totals, contingency, GC fee and $/sq ft update instantly.
- Tap ▸ on a line for low / high numbers, item name, basis, notes and status (Estimate, Quoted, Contracted, Paid).
- **+ Add item** in any category; delete lines you don't need.
- Edits save automatically in your browser (per device). Use **Backup (.json)** / **Restore backup** to move them to another device, **Export CSV** for a spreadsheet, **Export PDF** for a printable summary + line-item report.
- **Reset to starting estimate** returns to the numbers below.

## Starting numbers
Planning estimates (Nov 2026), not bids. Steel building and foundation are scaled from the Tyson Steel quote (10/29/2026); spray foam, septic and per-sq-ft benchmarks from 2026 cost guides. Land is not included. The defaults live in `index.html` (and a readable copy in `default-estimate.json`).

## Files
- `index.html` — page and default data
- `app.js` — app logic (no build step, no dependencies)
- `pdf.js` — built-in PDF writer for Export PDF (no libraries)
- `styles.css` — styling
