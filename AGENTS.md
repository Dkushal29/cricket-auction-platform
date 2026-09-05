# Real-Time Auction Platform — Standing Design Rules

## Design Direction
The subject is a live sports auction broadcast — think stadium scoreboard and trading-floor energy, not a generic SaaS dashboard.

### Color Tokens
- `--ink`: `#10151A` (base canvas)
- `--panel`: `#1B2229` (raised surface for rails/panels)
- `--line`: `#2B343C` (hairline dividers/borders — use instead of shadows)
- `--brass`: `#C7A046` (reserve EXCLUSIVELY for: current highest bid figure, "SOLD" stamp, budget-remaining tick marks. Never use it decoratively elsewhere.)
- `--team-a`: `#3E7CB1` (steel blue — Team A rail only)
- `--team-b`: `#B85C38` (burnt copper — Team B rail only)
- `--text-primary`: `#EDEAE1`
- `--text-muted`: `#8B939A`

### Typography
- Numerals that change live (bid amount, timer, budget figures): **Big Shoulders Display**, bold, condensed, tabular-nums so digits don't shift width as they update. This is the hero typeface — the bid number on the main spotlight panel should run 96–120px on desktop.
- All UI text, labels, buttons, nav: **IBM Plex Sans**. Body 15px, section labels 13–14px, sentence case (not all-caps).
- Two typefaces only, clearly distinct roles. No serif.

### Layout (Desktop, Live Auction Screen)
- Thin header: auction name, a small pulsing live-status dot + label, spectator count, connection status. No heavy nav bar.
- Three-column main area: narrow Team A rail (~20%) | dominant item spotlight (~60%) | narrow Team B rail (~20%). The spotlight shows the item photo, name, category, base price, and the current-bid number as the visual hero — animate it with a brief scale-pulse snap (not a fade) each time it updates.
- Each team rail shows: team name, a horizontal budget-depletion gauge (fills with `--brass`, empties toward `--line` as spend increases — this replaces a plain "remaining budget" number as the primary read), and a compact purchased-players list.
- Full-width strip along the bottom: a live bid ticker that scrolls new entries in (timestamp in tabular figures + team + amount), styled like a broadcast lower-third — not a chat/message list.
- Hairline dividers (1px, `--line`) between regions instead of drop shadows or card borders. Small consistent border-radius (~4px) — not fully square (avoid a newspaper/broadsheet look) and not the rounded-card-kit look either.
- Mobile (spectator view priority): stack vertically — spotlight first, then both team gauges side by side, then the ticker. Keep the bid number large even on mobile; shrink the rails, not the hero number.

### Motion
- One orchestrated moment per state change, not scattered hover effects everywhere: the bid-number snap-pulse on update, a brief brass flash across the spotlight border when a deal is finalized, and a smooth fill animation on the budget gauges when spend changes. Respect `prefers-reduced-motion`.

### Explicitly Avoid
- Cream background with warm serif + terracotta/clay accent
- Pure near-black background with a single neon accent color
- Identical rounded cards with soft grey drop shadows for every panel
- ALL-CAPS tracked-out eyebrow labels above headings
- Meta text joined with middle dots ("Team A · ₹4,50,000 · 10:31")
- Monospace font for the bid/price numbers (use Big Shoulders Display, not a code font)
- Arrows appended to button text ("Place Bid →")
- Generic gradient washes as decoration
