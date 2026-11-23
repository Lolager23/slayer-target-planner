# Restart/update helper handoff — unreleased

The reported 4.1.0 to 4.1.1 attempts had a verified staged ZIP and `job.json`, but
no installer `result.json` or new-app startup confirmation. The Desktop app was
still running 4.1.0. Diagnostics read those updater records without changing the
installation, pending job or character data.

## Cause and correction

On the affected Windows host, starting Windows PowerShell with Node's
`detached: true` returned exit code zero without executing the bundled command.
The updater resolved its launch promise on the process `spawn` event, so the app
closed before learning whether its installer had actually started. Directly
attaching PowerShell executes it, but the real parent-exit regression also showed
that this helper could die when its parent's console ended.

The launcher now uses a short hidden PowerShell bootstrap and Windows
`Start-Process -WindowStyle Hidden` to give the actual installer an independent
lifetime. A short encoded reader executes only the fixed bundled helper copied
to the private update job. Paths stay in environment variables and the data-only
job; no downloaded script or release text is executed, and execution policy is
not changed. Bootstrap/helper process identity is recorded for diagnostics.

The helper validates its job, installation and staged ZIP, then atomically writes
a startup acknowledgement. The launcher checks its job ID, version, original app
PID and actual helper PID before allowing the app to quit. Stale result, ready
and health records are cleared before retry. A failed bootstrap, validation error
or missing acknowledgement rejects the restart request; the current app stays
open. Startup waiting is bounded at 30 seconds. Existing installation checksum,
folder-swap, rollback and new-app health checks remain enforced. A previous
installer failure now displays its recorded reason in Settings.

The launcher is part of the installed application: 4.1.0 and 4.1.1 cannot acquire
this correction merely by retrying their broken handoff. One manual upgrade to a
release containing the correction is needed. This change is not yet released;
the user's Desktop copy and staged 4.1.1 download remain untouched.

## Focused evidence

All 27 focused updater, IPC and real Electron-ASAR checks passed.

Actual Windows fixtures cover acknowledgement freshness, installer failure before
handoff, complete checksum-verified replacement and an actual launcher process
exiting before its helper completes installation. Synthetic character data and
extra files are retained. The pinned Electron runtime loads the updater/helper
from a real ASAR and verifies that native startup validation failures are reported.
IPC regressions prove that rejected restart requests do not call app quit, and a
bounded-clock test proves that process spawn alone cannot satisfy readiness.

The original detached launch reproduction returned no result with either piped
or ignored standard streams. Non-detached direct execution ran the helper; the
independent hidden process is required to pass the additional parent-exit case.
No running user app was closed or launched during this investigation. The full
suite and a new Windows release package are deferred until a release is requested.
