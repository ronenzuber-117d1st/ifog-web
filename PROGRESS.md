# It's A Funny Old Game — Web Rebuild Progress

## Project Overview
A browser-based remake of the 1990s DOS football management game "It's A Funny Old Game" (IFOG), built with React + TypeScript + Vite, using Zustand for state management.

**Repo:** `ronenzuber-117d1st/ifog-web`  
**Stack:** React 18, TypeScript, Vite, Zustand (with persist), GitHub Pages

---

## Screens Implemented

### Main Menu
- Start screen with `startscreen.png` background
- New Game / Continue Game flow
- Team selection screen with all 20 league teams

### Desk (Manager's Office)
**Tabs:** Desk | Personnel | Cash Season | Cash Week | Bets | Memo

- **Header:** `office.png` banner with manager name + balance overlay
- **Desk tab:** Squad status (injuries/suspensions), ticket pricing (Low/Medium/High), stadium revenue toggles (Food Stand, Club Shop)
- **Personnel tab:** Marble `tapestrm.png` header, 5 sub-tabs:
  - *Fish & Chips* — 3 tiers, `pommes0/1/2.png` images, £250/750/1500 per match
  - *Fan Shop* — 3 tiers, `fanbude0/1.png` images, £250/750/1500 per match
  - *Ticket Sales* — 3 tiers, `verkauf.png`, £250/750/1500 per match
  - *Cheerleader* — 3 tiers, `cheer1/2/3.png`, £5000/10000/20000 per match
  - *Assistant Coach* — 4 coaches with portraits (`cotrai3–6.png`), heritage/star sign/ideology display
  - Staff image fills half the panel (large), tier buttons are compact (fit-content width)
- **Bets tab:** Live odds from team `baseSkill` (X:Y out of 34 format), bet amount input, Betting Total + Possible Win display, bet resolves after next match
- **Memo tab:** Reverse-chronological event log (`--N. Match Day--` format)
- **Cash Season / Cash Week tabs:** Finance history, earnings vs costs split view

### Stadium
- Layered pixel-art stadium view using original game graphics
- Image layers: top row 39.9% (stli + anzeig + stre), tribune 21.1%, pitch 39%
- **Upgrade chips** overlaid on each zone — click to upgrade in-place:
  - Lights (stli1–3.png / stre1–3.png) — £150K / £350K
  - Facilities / Scoreboard (anzeig1–3.png) — £100K / £250K
  - Seats / Capacity (trib1–3.png) — £400K / £800K
  - Pitch Quality (felda1–3.png) — £200K / £500K
- Bottom bar: star ratings (★☆☆) for each upgrade category + balance
- Trib pillar alignment: `left: seatsLevel >= 2 ? '-2%' : 0` annotated as comment (pillars removed from source images)

### Match Day (Live Match Screen)
- Animated pixel-art stadium with live ball movement
- Ball constrained to green grass zone (y: 38–87%), never enters white commercial board area (y < 38%)
- Commentary panel with up to 49 entries
- Match events: goals, fouls, free kicks, saves, bookings, corners
- End-of-game:
  - Result overlay with `objectFit: contain` on black background (sieg/gleich/loser.png)
  - Post-game screen: result image + final score + Continue button (left), full scrollable commentary (right)
- Staff cost deducted each matchday (sum of all hired personnel)
- Bet resolved automatically after match (win/loss added to balance)

### Finances
- Revenue breakdown by match day
- Ticket income, food stand, club shop, border payments
- Transfer market (hire/sell players)

### Team Management
- Squad view with positions (T/V/M/S = GK/DEF/MID/STR)
- Training sliders, skill/age display
- Injury and suspension tracking

---

## Data from Original Game DAT Files

### SPIELT Schedule (`src/data/schedule.ts`)
- Extracted all 38 matchday fixture files from `cd/DAT/SPIELT*.DAT`
- 380 total fixtures across 20 teams — all teams play exactly 38 matches
- Static schedule replaces old round-robin generator in `src/engine/scheduler.ts`

### SPIELER Player Names (`src/data/teams.ts`)
- Name pools replaced with names extracted from `SPIELER.DAT`:
  - GK: Kopke, Iliushin, Kalvin, Napper, Sherman, Vickers…
  - DEF: Amaretto, Cruff, Eddie, Henman, Johnson, Moore…
  - MID: De Toto, Romarino, Allen, Campbell, Jones…
  - STR: Klinsman, Yuruba, Donaldson, Ellis, Lee…
- Hardcoded rosters for teams 1–5 with original player names, ages, and skill values

### Team Manager Names
- All 20 teams have original manager names: Bruce Rock, Little Brian, Ray Halfords, Rude Gullit, Fergus Alexson, Kevin Kneegan, etc.

---

## Key Architecture Decisions

### State (Zustand + persist)
```
balance, currentMatchday, fixtures, rosters, managedTeamId,
stadium: { pitch, seats, facilities, lights },
staff: { fishChips, fanShop, ticketSales, cheerleader, coach },
pendingBet: { amount, winMultiplier } | null,
eventLog: { matchday, text }[],
financeHistory: { matchday, description, amount, running }[]
```

### Image Conventions
- All images in `public/images/`, referenced via `img(filename)` util (handles base URL for GitHub Pages)
- `objectFit: 'fill'` for stadium pixel art (preserves exact pixel layout, no aspect ratio)
- `imageRendering: 'pixelated'` on all sprite images

### Betting Odds Formula
```ts
myShare = round((mySkill / (mySkill + oppSkill)) * 34)  // home gets +3 skill bonus
winMultiplier = 34 / myShare
```

### Staff Costs (deducted per matchday via `playMatchday()`)
| Staff       | Tier 1   | Tier 2    | Tier 3    |
|-------------|----------|-----------|-----------|
| Fish & Chips| £250     | £750      | £1,500    |
| Fan Shop    | £250     | £750      | £1,500    |
| Ticket Sales| £250     | £750      | £1,500    |
| Cheerleader | £5,000   | £10,000   | £20,000   |
| Asst. Coach | £5,000   | —         | —         |

---

## Visual Style
- Dark theme: `#0d1117` background, `#161b27` cards, `#28314a` borders
- Pixel-art sprites scaled up with `imageRendering: pixelated`
- Green accent: `#4ade80` (positive values, active states)
- Blue accent: `#3b82f6` / `#1e40af` (buttons, selected states)
- Monospace font for scores and numbers

---

## Pending / Next Steps
- Stadium screen sub-tabs (Magazine, Tickets, Fan Shop display, VIP Lounge, Radio & TV)
- League table screen
- Transfer market polish
- Season end / promotion / relegation
- Sound effects
