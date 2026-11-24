# Verification

## Unreleased gear comparison fixes — 24 November 2026

- Build and TypeScript checks passed. All 59 focused popup, comparison, gear
  selection, whole-box and ammunition tests passed; the full suite was not run.
- Popups remain interactive below the table and across same-setup background
  redraws, while navigation, changed inputs and explicit dismissal still close.
- The exact Maxed Cerberus case reproduced Emberlight's fixed-loadout 7.363 DPS
  versus its equipped 8.427 DPS. Owned/assumed weapon rows now preview the same
  rebuild as selection, including off-hands and unpinned armour. Demonbane was
  already included. Previewing does not change the character or start master jobs.
- A cold 460-candidate Maxed melee comparison took approximately 20 seconds in
  its worker and reports percentage/current item; completed comparisons are cached.
- The focused tests include actual comparison-worker messages and deterministic
  popup/focus/timer simulations. Native pointer acceptance was not run. No release,
  Desktop replacement, live character change or Wiki request was performed.

[Behaviour, reproduced figures and limits](docs/features/gear-comparison-persistence.md).

## 4.1.4 release — 24 November 2026

- Production build and TypeScript checks passed. Complete suite: 570 tests passed,
  none failed or skipped. This includes normal-mode restart/rollback arguments,
  restore/show/focus before health, withholding health for an invisible window,
  single-instance reveal, real Windows helper parent-exit survival and the actual
  Electron-ASAR updater boundary.
- The application/calculation fingerprint matches 4.1.3. Character storage,
  calculation inputs and saved-character schema are unchanged.
- A read-only pre-release snapshot confirms that the Desktop EXE is 4.1.3 and
  records EXE/ASAR hashes for a final unchanged-baseline check. No live app input,
  update check, replacement or restart is performed during this release.
- Native foreground acceptance is reserved for the user's 4.1.3 → 4.1.4 test.

Publication passed: [GitHub v4.1.4](https://github.com/Lolager23/slayer-target-planner/releases/tag/v4.1.4)
targets `545c99627111dc18efad8ac45927637314dd9820`. The 174.5 MiB Windows ZIP
passed CRC and all 1,818 application checksums. Clean-root layout, native/browser
parity, metadata, licences and all 1,286 corresponding source files passed.
Local and uploaded ZIP SHA-256 match:
`5f4196c6c257f61855b0b4aaab3ec4c6f716d58a4c62786e5261ebab16f9bc72`.
The latest stable feed selects 4.1.4 and that digest for a 4.1.3 caller through
the application's update-feed parser. Final read-only checks confirm Desktop
EXE product version 4.1.3 and identical before/after EXE and app.asar hashes.
No live updater action, app launch/restart, Desktop file change, character-storage
replacement or private Site deployment was performed. The user's native restart
test remains outstanding.

[Behaviour and evidence limits](docs/features/updater-visible-restart.md).

## Visible-restart investigation before 4.1.4 — 24 November 2026

- Read-only diagnostics for the user's 4.1.2 → 4.1.3 attempt found `restart: true`,
  `installed`, a 4.1.3 health acknowledgement and the helper's still-running new
  app process. Its window handle/title and responding status were present. This
  establishes process restart, not successful foreground presentation; the user
  reported that the expected window did not reopen.
- The helper requested Hidden for the interactive app, and startup did not
  explicitly restore/focus it. The source correction uses Normal for updated and
  rollback app launches, restores/shows/focuses the window and acknowledges health
  only when visible and not minimised. Helper/bootstrap processes remain hidden.
- All 30 focused updater, IPC and real Electron-ASAR tests passed. Added lifecycle
  regressions use mocked Electron windows; real helper tests validate restart and
  rollback window-mode arguments at a mocked Start-Process boundary. Existing
  actual parent-exit, extraction and checksum fixtures passed.
- No live app input, Desktop replacement, new release or full-suite run was
  performed. Native foreground acceptance remains unverified.

[Behaviour, evidence and limits](docs/features/updater-visible-restart.md).

## 4.1.3 release — 23 November 2026

- Production build and TypeScript checks passed. Complete suite: 567 tests passed,
  none failed or skipped, including the real Windows helper acknowledgement,
  parent-exit, extraction/rollback, native IPC and real Electron-ASAR boundaries.
- Desert parchment adds a light cream/copper palette with green status accents.
  A disposable browser verified selection, rendering and persistence after reload.
  Checked body, muted, accent, selected-status, warning and error text contrast
  ratios range from 4.87:1 to 13.48:1. Existing theme choices remain available.
- The theme and application-version change preserve the calculation fingerprint
  from the local 4.1.2 baseline. Character storage/schema and saved character data
  are unchanged. The user will perform the actual 4.1.2 → 4.1.3 restart/update test.

Publication passed: [GitHub v4.1.3](https://github.com/Lolager23/slayer-target-planner/releases/tag/v4.1.3)
targets `4b7cce4440ef030a05a101abbd7e88072f5c818f`. The 174.5 MiB Windows ZIP
passed CRC and all 1,817 application file hashes. Native/browser parity, clean
root, licences, metadata and all 1,285 corresponding source files passed.
Local and uploaded ZIP SHA-256 match:
`c81003ffb365f579f2fd0fcb0e45818496a5107f649236b80365275ab34df414`.
The live latest stable feed selects 4.1.3 and that digest for a 4.1.2 caller through
the application's update-feed parser. No private Site deployment was performed.
The actual native restart/update test remains for the user.

## Local 4.1.2 updater test baseline — 23 November 2026

The user requested a manual local upgrade with the corrected updater, followed by
a newer published build with an extra theme for their own update test. Version
4.1.2 is the local baseline; 4.1.3 is the intended GitHub target. The 27 focused
checks below cover the corrected helper. Its assembled package passed clean-root,
native/browser parity, metadata, licences and 1,285 corresponding source checks
at `9cbdd2b2b664dd6a2fec7dd84ec4a7d1c85f28ec`. All 1,817 files and ZIP CRC passed;
the local baseline ZIP SHA-256 is
`41db892f1470ede7dcfac3c749707455b413737eb450029afe3d2ca95ef1d858`.
The old running 4.1.0 app was closed normally. The verified 4.1.2 baseline was
moved to `Desktop/Slayer Target Planner 4.1.2 - Windows`, with its one ZIP and
checksum under `share/`. All 1,817 installed file hashes, fixed helper presence,
EXE product version and sharing digest passed. Desert parchment is intentionally
absent from this baseline, providing a visible change after updating to 4.1.3.
Character storage was neither copied nor replaced. The superseded 4.1.0 app
distribution was recycled after verification; one Slayer app folder remains on
the Desktop. Computer Use was stopped with Escape during the attempt to launch
the new baseline, and no further app input was issued. Read-only process checks
confirmed that the new copy remains closed for the user to open. No successful
live 4.1.2 → 4.1.3 update is claimed.

## Restart/update investigation before release — 23 November 2026

- Local read-only diagnostics found a staged verified 4.1.1 ZIP and install job,
  no helper result/health record, and a still-running Desktop 4.1.0 process.
- Real Windows reproduction: detached Windows PowerShell returned zero without
  executing the command, for both piped and ignored standard streams. A direct
  attached helper executed but failed the additional real parent-exit regression.
- The corrected independent hidden Windows helper acknowledges its job/version
  and process identity before the app quits. Startup failure or timeout leaves
  explicit restart requests open and actionable. Stale handoff files are reset.
- 27 focused updater, native IPC and real Electron-ASAR checks passed. These
  include actual acknowledgement, validation refusal, fixture installation after
  the real launcher parent exits, retained synthetic character data and a bounded
  missing-acknowledgement regression. Existing extraction/rollback checks passed.
- The full suite was not run, no new release was made, and the user's running
  Desktop copy, staged update and live character storage were not changed.

[Cause, implementation and verification limits](docs/features/updater-restart-handoff.md).

## 4.1.1 release — 23 November 2026

- Production build and TypeScript checks: passed.
- Complete suite: 562 tests passed, none failed or skipped. This includes the
  Elemental amulet's Magic 59 boundary, hunt-badge selection, complete/empty quest
  imports, conservative defaults, preserved manual facts, Tonali and Konar skill
  gates, non-blocking warnings, progressive worker results and durable-cache
  protection for provisional 5 DPS tables.
- Prior focused local-browser verification covered the large selector, changing
  the current hunt to Hellhounds, continuing background progress and usable
  master tables before DPS completion. Native Windows interaction was not run.
- Character storage/schema remain unchanged. Imported characters use negative
  assumptions for omitted quests and unresolved facts; known hard requirements
  remain enforced. The policy is included in combat cache identity.
- The existing Desktop application and live character storage are intentionally
  untouched. This release is prepared separately in ignored project build space.

Publication passed: [GitHub v4.1.1](https://github.com/Lolager23/slayer-target-planner/releases/tag/v4.1.1)
targets `fd307b058070bf0466e2a3ec82c0e33c177ccb4d`. The 174.5 MiB Windows ZIP
passed CRC and all 1,816 application checksums. Clean-root layout, native/browser
asset parity, all 1,284 corresponding source files, licences and EXE product/file
version 4.1.1 passed. Local and uploaded ZIP SHA-256 match:
`b55a3f53a443694c88eb53a22ffec6fd1481b4fe4d85af4b68933a1fa57a5274`.
The live latest stable GitHub feed selected 4.1.1 and that digest through the
application's update-feed parser for a 4.1.0 caller. This was a read-only feed
check; no updater download/install, Desktop launch/replacement, private Site
deployment or live character-storage operation was performed.

[Behaviour and focused verification](docs/features/import-progressive-planning.md).

## 4.1.0 release — 22 November 2026

- Production build and TypeScript checks: passed.
- Complete suite: 552 tests passed, none failed or skipped. This includes
  2,062 rendered creature-form/location combinations, all 375 canonical location
  reviews, reproducible retained-source generation, alias handling, hard quest
  and stat gates, guild exteriors, alternate entrances, manual restrictions,
  existing Maxed characters, rendered source notes and correction links.
- Regression coverage verifies that source-excerpt data contributes zero bytes
  to the production worker, while compact entrance rules remain included.
- Stalker Den, Tonali Cavern, Shaman Caves, Wilderness GWD, Scorpia and Ferox
  route/access corrections are described in the feature record. The existing
  creature audit now has 103 derived entries and 64 special method confirmations.
- Character storage and backup schema are unchanged. Known facts and deliberate
  overrides are retained; Maxed assumes new ordinary routes when no choice exists.
  Changed rule fingerprints invalidate earlier saved calculation results once.
- Cached primary sources were reused; missing references were fetched through
  spaced, sequential MediaWiki API batches. Builds and selections make no requests.
- Source inspection and automated rendering do not establish interactive UI or
  in-game route acceptance. Temporary boosts, supplies, untracked destination
  steps and special encounters retain the qualifications in the source notes.

Publication and Desktop replacement passed. GitHub v4.1.0 targets
`265f32fcf33696fc40da7953f6e41f0c3bf4a51e`. The 174.4 MiB ZIP passed CRC,
all 1,811 application file hashes and parity with 1,279 corresponding source
files. The verified local/published ZIP SHA-256 is
`f577be28ab6848ad2383cc356a2ca08d68e9a057d5411ce7b8435b8b4a54fd29`.
The owner-only private Site deployed the same release revision successfully
(deployment `appgdep_6b0368ca76788191b35e4db9953818e6`).

After the user closed 4.0.1, the verified package was moved to the Desktop as
`Slayer Target Planner 4.1.0 - Windows`, with the exact published ZIP/checksum
under `share/`. Installed hashes, source parity and EXE product version passed.
The packaged updater was loaded from that actual Desktop ASAR in the pinned
Electron runtime with disposable data. It selected live v4.1.0 and its digest for
4.0.2, and reported up to date for 4.1.0 without the extraction error. This did
not download or install a future version and did not run the main user window.
The superseded 4.0.1 Desktop folder and duplicate 4.0.2 packaging artifacts were
removed; live character storage was neither copied nor replaced. One Slayer
application folder remains on the Desktop.
[Scope and maintenance](docs/features/location-route-reviews.md).

## 4.0.2 release — 22 November 2026

- Production build and TypeScript checks: passed.
- Full suite: 541 tests passed, none failed or skipped. Coverage includes the
  real Electron ASAR regression, Windows extraction/rollback, all 167 reviewed
  creature gates, custom characters, strict Konar planning and named warnings.
- Two older tests expected Cow calves to retain a generic confirmation. Their
  replacements verify derived ordinary access, deliberate restricted-account
  exclusions and genuinely unconfirmed Bryophyta methods.
- 100 ordinary creature gates derive access. The 67 special method checks retain
  named explanations; actual quest/skill/location restrictions remain enforced.
- Calculation fingerprints change with the access rules; character storage and
  schema remain unchanged. No character data was rewritten for release preparation.
- The updater validates app.asar through Electron original-fs. The real Electron
  test loads the updater/helper from a packaged ASAR against disposable data.
  4.0.0/4.0.1 copies need a manual upgrade to receive this correction.
- The broader review of every guide location/travel route remains pending outside
  this bugfix; generic/unreviewed routes are not relabelled as reviewed.

Publication passed: GitHub v4.0.2 targets cb675b610d0bedc3f29fdb42b6ecc3cc14b0611b;
its latest stable ZIP digest matches
`bdecf9c81bca4a29a6b47bacae4a1f1b9dcc7a56583ed11dea6a4c786acf5222`.
The 172.9 MiB ZIP passed CRC and all 1,482 application checksums; the clean
distribution includes 950 corresponding source files matching that revision.
The packaged updater was loaded from the actual release ASAR in the real pinned
Electron runtime against disposable data, selected the live 4.0.2 feed/digest
for 4.0.1, and reported up to date for 4.0.2 without the false extraction error.
This check did not download/install a future version or interact with live characters.
The owner-only private Site deployment succeeded for the same release revision
(deployment appgdep_6b03602a28b08191b059534bd310671d). Desktop replacement is waiting
for the running 4.0.1 app to close. No interactive UI acceptance is inferred from
automated tests.

## 4.0.1 release — 22 November 2026

- Production build and TypeScript checks: passed.
- Full suite: 530 tests passed, none failed or skipped. This includes the new
  cache-stall, late-response, cancellation, stalled-write, progress coalescing,
  prepared task-recording and worker block-review regressions.
- The prior focused browser check recovered from a deliberately stalled database
  while the all-gear calculation ran, and navigation/block explanations remained
  interactive. See [the feature record](docs/features/ui-responsiveness.md).
- Worker calculation fingerprints invalidate the old plan shape once; the version
  bump alone does not change the worker fingerprint. Character storage and schema
  stay unchanged.
- The Windows distribution uses the clean runtime/documentation/source/share
  layout introduced in 4.0.0. Release packaging verifies corresponding source,
  native/browser asset parity, all file hashes, ZIP CRC and the published digest.

Native production acceptance passed after publication: the bundled 4.0.0 Windows
helper installed the exact 4.0.1 ZIP, launched the new EXE and received its actual
4.0.1 window-ready acknowledgement. All 1,474 installed file checksums, corresponding
source, EXE metadata and the sharing ZIP matched. The Desktop has one 4.0.1 folder,
with its ZIP/checksum under share/. The verified old application/rollback copy and
duplicate packaging artifacts were recycled as requested; live character storage
was reused and was not replaced.

Windows UI control was stopped before the in-app download action, so the installer
received the local ZIP whose hash matched GitHub's published asset digest. This
verifies real installation/relaunch/startup, not an end-to-end UI-mediated download.
The anonymous live release feed selected the correct version, asset and digest.


## 4.0.0 release — 22 November 2026

- Production build and TypeScript checks: passed.
- Complete regression suite: 524 tests passed, none failed or skipped. This includes
  the updater, persistent calculations, Eclipse burn, travel/access derivation,
  gear/hunt/strategy regressions and retirement of the migrated workbook starter.
- The release check found and fixed over-invalidation of combat results by dormant
  ordinary-area overrides. Special access confirmations still invalidate them.
- Windows helper tests performed real extraction, checksum verification, folder
  replacement and rollback in disposable fixtures using the new organised layout.
  Restart/process-health boundaries in these tests are mocked.
- The packaged native 4.0.0 window opened with Maxed selected and the existing
  custom characters present. Final Settings interaction was interrupted, so its
  links are checked in the packaged UI/source rather than claimed as clicked.
- Distribution verification checks the clean root allowlist, native and browser
  asset parity, corresponding source revision/files, licences and update metadata.
  ZIP creation verifies every archived file hash and its CRC.
- Obsolete local build/diagnostic copies and the Slayer backup folder were moved
  to the Recycle Bin. Live character storage was preserved. Artwork caches remain
  to avoid unnecessary repeat Wiki requests; previous source revisions remain in Git.

The actual future-release production auto-upgrade remains untested until a newer
GitHub release exists. 3.x copies require this one manual 4.0.0 replacement.
Native observation does not establish operation on another Windows computer.

Historical evidence lives in [docs/verification](docs/verification/), beginning
with the [initial release](docs/verification/initial-release.md). Feature-specific
evidence and limitations remain in [docs/features](docs/features/).
