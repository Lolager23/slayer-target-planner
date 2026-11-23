# Verification

## Unreleased restart/update handoff fix — 23 November 2026

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
