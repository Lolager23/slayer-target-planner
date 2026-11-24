# Visible restart after update — 4.1.4

The user reported that 4.1.2 installed 4.1.3 but did not reopen. The local updater
job recorded `restart: true`, a successful install result and a 4.1.3 startup
acknowledgement. Its new main process was still running, with the helper as its
parent, a Planner window handle/title and a responding process. The application
had restarted at the process level; the user did not see the expected window.
No live window input was used to investigate or alter that state.

The code requested `WindowStyle Hidden` for the interactive planner, and the
ready-to-show callback called show without explicitly restoring/focusing it.
These are presentation defects consistent with the report. Initial foreground
ownership was not captured, so the investigation does not claim to distinguish
an initially hidden window from one left behind another application.

## Correction

- The interactive planner is launched with `WindowStyle Normal`, both after a
  successful update and when reopening the original copy after rollback.
- The hidden bootstrap and installer keep their independent hidden process
  lifetime; the prior restart-helper handoff correction is retained.
- Startup restores a minimised window, shows it and requests focus. Opening the
  EXE a second time uses the same reveal behaviour for the existing instance.
- New-app health is acknowledged only after the window reports visible and not
  minimised. A ready-to-show event by itself is not success. Requesting focus does
  not claim to override every Windows foreground-activation restriction.

This correction is included in 4.1.4. The user requested that the live Desktop
copy remain on 4.1.3 so they can test the restart through the updater. The release
process does not launch that app, trigger installation or modify its updater job
or character storage. Opening the Desktop EXE again invokes the existing
single-instance restore/show/focus behaviour.

## Evidence and limits

All 30 focused updater, native IPC and real Electron-ASAR tests passed. New
regressions verify normal window-mode arguments for successful restart and
rollback through the real PowerShell helper's mocked process-launch boundary.
Mocked Electron lifecycle tests verify restore/show/focus before health,
withholding health for an invisible window and revealing the existing instance.
Actual helper acknowledgement, parent-exit survival, extraction, checksum and
rollback fixtures remain passing. Native foreground presentation acceptance
was not run. The full release suite and artifact checks are recorded in the root
verification record; they do not establish native foreground acceptance.
