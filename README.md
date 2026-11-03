# 🌀 Storm Station: Data Science Escape Room

A Year 8 escape room about **data, scientific models, simulations and making predictions**. Built from the Marine Mammal and Motion escape-room template, but designed for students who have had a broken run through the topic: every station **teaches as it goes** and asks students to *apply*, not recall.

Students walk a scientist around a pixel-art research station while Cyclone Tilly approaches. There are **9 stations**, solvable in any order. Each gives a **coded letter and a number**. At the shelter hatch they pass two vocabulary checks, then decode the 9 letters (a shift-4 cypher) into **SIMULATOR**.

## Play

Open `index.html` in a browser, or host on GitHub Pages. No install, no build step. Students need nothing else (no pencil required).

- **Move:** WASD / arrow keys, or click the floor
- **Open a station:** walk up and press **E** / Space, or click it
- Progress lasts only while the tab is open.

## Timer and help rules

| Rule | Value |
|---|---|
| Mission clock | Counts up from "Start the clock" |
| Hint | **+3 minutes** each (2 per station), confirmed first |
| Reveal answers | Only after **5 minutes spent on that station**; costs **+10 minutes**; the student still has to type the answers in |
| Wrong answers | **Count only** ("2 of 3 correct"), never which ones, never the right answer |
| Multiple choice | A wrong pick is not marked and locks the options for 4 seconds |
| Hatch checks | A wrong attempt wipes the panel and redraws new statements from a bank of 26 |

Constants live at the top of `js/main.js` (`HINT_PENALTY`, `REVEAL_PENALTY`, `REVEAL_AFTER`).

## The stations

| # | Station | Type | Focus |
|---|---|---|---|
| 1 | 👣 Footprint Trail | Sorting + quiz | Digital footprint, kinds of data, data sources |
| 2 | 🐇 Hare & Lynx Park | **Simulation** | Predator-prey cycles; read the peaks, balance the park |
| 3 | 🦠 Outbreak Control | **Simulation** | SIR disease model; vaccination and contact; hospital limit |
| 4 | 🐰 Bunny Evolution | **Stealth game** | Sneak bunnies past fast wolves that hunt you anywhere whenever you're not camouflaged; hide in spots matching your fur. Big scrolling meadow with 4 wolves + minimap |
| 5 | 🏘️ Population Planner | **Simulation** | Births, lifespan, migration; hit a council target |
| 6 | 🌀 Storm Forecast | Graph + map game | Draw a trend line, predict 2035, track a cyclone |
| 7 | 🚀 Launch Pad (id `garden`) | **Launcher game** | Projectile model: aim with arrow keys/mouse, hold Space to charge power, release to fire. 6 launch missions picked from an in-game board (Angle Lab + 5 deliveries; Asteroid Alley has moving asteroids) |
| 8 | 🔮 Fact or Fake Market | Sorting + matching | Scientific vs non-scientific approaches |
| 9 | 🏛️ Model Museum | Sorting + matching | Physical, conceptual, mathematical, computational models |
| 🚪 | Shelter hatch | Vocab gates + cypher | Data / model / prediction / pattern / limitation / variable |

Each simulation station has three missions: **A** read a fixed "records" run (answers worked out by running the same model the student sees), **B** a hands-on challenge, **C** predict / evaluate questions. Free play comes first.

Two reference popups (📖 Model handbook, 🔬 Science or not?) are free and always available.

## Files

```
index.html          page shell
css/style.css       shared styling (from the other escape rooms)
css/extra.css       Storm Station additions
js/core.js          helpers, drag and drop, match task, quiz
js/extras.js        sorting task
js/tools.js         answer lock with tolerance, live chart, sliders
js/models.js        the models (hare/lynx, SIR, bunnies, town, plant, climate)
js/main.js          room, timer, hints, reveal rule, modals
js/door.js          the shelter hatch
js/reference.js     the two handbook popups
js/puzzles/*.js     one file per station
```

The only external resource is Google Fonts; the page falls back to system fonts if blocked.

## Notes for teachers
- Each station has clickable mission tabs; the station's code is awarded when every tab is ticked.
- Wrong answers give count-only feedback and a short cooldown on the check button (and the quizzes lock for 4 s), so students cannot trial-and-error their way through.
- Timer: hint +3 min, revealing a station's answers +10 min and only after 5 minutes on that station. The clock uses the browser's monotonic timer, so changing the computer clock does not help.
- Open the page with `?debug` on the end of the address to get test hooks (`ER._debug`); without it no shortcuts exist.
