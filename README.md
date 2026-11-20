# Controls Demonstration: a month of first-line control testing

This app simulates the records of *Harbourline Investment Management*, a fictional firm with public- and private-markets businesses, and hides control failures in them. It then does the work of a first-line business risk team:

1. Tests every record against each control (full population, not a sample).
2. Rates each control's design and operating effectiveness, and the risk before and after controls.
3. Raises issues, each with a severity, an owner, a due date and an action plan.
4. Proposes a fix for each failure, usually by moving the control from "people remember" to "the system enforces".

Built by **Tiago Costa** as an example of how he would work as a Manager, GWAM Business Risk Management at Manulife (req. JR26110608). All data is synthetic. Harbourline, its staff, clients, funds and providers are fictional, and the controls are common industry practice, not any firm's actual controls. Not affiliated with or endorsed by Manulife.

## What it covers

| Area | Control | Records tested (default month) |
|---|---|---:|
| Public markets | P1 Pre-trade compliance on client restrictions | 2,318 orders |
| | P2 Four-eyes check on large orders | 8 large orders |
| | P3 Fair allocation of block trades | 276 blocks |
| | P4 Daily custodian reconciliation and break escalation | 372 sign-offs and breaks |
| | P5 Price validation: stale and manual prices | 2,100 prices |
| Private markets | M1 Payments: call-backs, dual approval, amount match | 127 payments |
| | M2 Private-asset valuation governance | 60 assets |
| | M3 Administrator NAV reconciliation | 12 funds |
| | M4 Third-party oversight by criticality (OSFI B-10 themes) | 24 providers |
| Change | C1 Risk sign-off before go-live | 16 changes |

Default month (simulation #2026): **5,313 records, 40 exceptions, 10 issues.** A traditional sample of 25 orders had only a **3%** chance of catching any of the three compliance breaks. Testing all 2,318 caught every one.

## How I know the tests work

Failures are planted at random, and their locations are stored apart from the data. The tests never read them. The suite in `tests/engine.test.mjs` checks the following:

- Every planted failure is caught, in every control, across **50 simulated months**.
- **Zero false positives** across the same 50 months.
- The tests give identical results with the hidden labels deleted.
- The sampling maths and the rating rules match hand calculations.

```
node --test tests/engine.test.mjs     # 8 tests, about half a second
```

## Run it

It's a static site with no build step and no dependencies. Serve the folder with any static server:

```
python -m http.server 8793
```

Then open http://localhost:8793. Add `?seed=N` to the address to load a different simulated month.

## Structure

```
index.html            page shell
assets/engine.js      simulation, control tests, RCSA ratings (runs in the browser and in Node)
assets/app.js         pages: overview, processes, controls, register, issues, method, about
assets/style.css      styled after Manulife Investment Management's public site: light large headings, navy and green,
                      square buttons, white panels, navy footer; Open Sans stands in for Manulife JH Sans; no logos
tests/engine.test.mjs test suite (node --test)
```

The code was built with an AI coding assistant. Every result is checked by the test suite above.
