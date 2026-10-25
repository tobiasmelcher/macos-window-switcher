#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
    printf '%s\n' 'This helper requires macOS.' >&2
    exit 1
fi

switcher_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cat <<'SETUP'
1. In Shortcuts, create "Switch window" with a "Run Shell Script" action.
2. Paste the command below. Leave "Run as Administrator" off.
3. In Details, enable "Use as Quick Action > Services Menu".
4. Deselect all input types. With no input, choose "Continue".
5. Assign Command + Control + Shift + W.
6. Run once. If scripting is disabled, enable Shortcuts > Settings >
   Advanced > Allow Running Scripts.

In System Settings > Privacy & Security > Accessibility, enable the app
from which you invoke the shortcut, for example Teams, Eclipse, or Ghostty.
Enable Shortcuts if you run it there. If missing, click + and select the app.
macOS requires you to approve this permission manually.
System Events Automation permission is no longer needed.

See README.md for usage and troubleshooting.
SETUP

printf '\nShell action command:\n/bin/sh "%s/switch.command"\n\n' "$switcher_dir"
/usr/bin/open -a Shortcuts
/usr/bin/open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
