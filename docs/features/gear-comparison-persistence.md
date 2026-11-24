# Stable popups and equipped weapon previews — unreleased

## Popup interaction

Entering or focusing the gear comparison promotes the initial hover preview to
an interactive popup. Moving below its table, scrolling, or using the outclassed
items/assumptions disclosures does not dismiss it. Escape, its close button and
an outside click still dismiss it. Hover previews that were never entered retain
their short dismissal delay.

Pointer/focus transitions within the slot/popup region do not arm dismissal.
When background work redraws the same view and setup, the inspector rebinds to
the matching family/slot/tier anchor without replacing its contents, scroll state
or in-flight comparison. Navigation, changed character/setup and missing matching
slots still close stale comparisons.

Both the table/footer and background-redraw regressions were also run against
the original committed inspector: both failed there and pass with this correction.

## Emberlight/Cerberus discrepancy

The exact reported Maxed Cerberus comparison was reproduced: Scythe of Vitur at
8.809 DPS and a fixed-loadout Emberlight swap at 7.363 DPS. Selecting Emberlight
actually produced 8.427 DPS because the optimiser added an Avernic defender,
changed the gloves to Ferocious gloves and selected different legs. Demonbane
was already included; the discrepancy came from comparing different loadouts.
These are the synthetic default Maxed prayer-armour/no-boost results, not a
universal rate or a claim about the user's combat settings.

Owned/assumed weapon rows now show **Equipped DPS**: a preview of the same bounded
search as Use item. The candidate weapon and its chosen ammunition are pinned;
other explicit gear choices are retained. Unpinned slots, attack/spell choices,
optional off-hands and armour are rebuilt with the current protection priority.
Required creature/location protection, available levels/items, ammunition and
the selected creature's multi-target configuration remain enforced.

The preview does not change the character. It runs in the comparison worker,
reports percentage/current item and caches its completed result. Closing the
popup cancels work and ignores late messages. A cold all-gear Cerberus melee list
of 460 candidates took approximately 20 seconds on this machine; owned-bank
fixtures are much smaller. Selection validation retains its existing fixed-slot
path and does not run the new complete comparison search on the UI thread.
Preview combat cache entries concern only the selected creature; no hunt/master
recalculation is triggered by opening the comparison.

Other slot comparisons and curated tier examples keep their existing
fixed-loadout semantics. Prayer/defensive columns remain item bonuses; the DPS
and delta columns describe the complete setup. Selected rows stay first, and
strict-upgrade hiding, family filters and ranged ammunition choices are retained.

The table also shows Melee STR, Ranged STR and Magic damage when at least one
listed or hidden item has a non-zero bonus. Both tables keep matching columns.
Weapon rows include the listed ammunition's offensive bonuses, making bolt/dart
differences visible. Magic damage is shown as a percentage, converting the pinned
engine's tenths-of-percentage-point storage (for example, 50 becomes +5%). These
are item/weapon-plus-ammo bonuses, not whole-loadout totals or conditional effects.
This display-only addition preserves the calculation fingerprint and cached DPS.

## Focused evidence

Build and TypeScript checks passed. All 59 focused tests passed across popup
events, weapon previews, gear selection/comparisons, whole-box selection and
ranged ammunition. New cases cover table/footer transitions, pending hover
timers, focus, explicit dismissal, cancellation, background anchor replacement,
stale contexts, percentage/current-item display and late messages. Calculation
regressions compare preview values with actual Use item/rebuild results for
Emberlight, explicit armour pins, crossbow bolts, blowpipe darts, two-handed
weapons, required shields and stacked magic. A real worker fixture checks
progress and creature-scoped cache publication without planner jobs.

No new Wiki requests, live character changes, Desktop replacement or release
were performed. Native/browser pointer acceptance and the full release suite
were not run. The calculation worker changes will invalidate stale saved
comparison results through the existing calculation-build fingerprint.
