#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
    printf '%s\n' 'This helper requires macOS.' >&2
    exit 1
fi

switcher_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cat <<'SETUP'
Setup:
1. In System Settings > Privacy & Security > Accessibility, enable the
   app running this helper (Terminal or Ghostty). If missing, click +
   and select it from Applications. Approve the macOS prompt manually.
2. Start the native listener with ./switch.command start.

The listener registers Command + Control + Shift + W system-wide.
Shortcuts and per-app permission setup are no longer needed.
Start it once after each login. It runs in the background.
Use ./switch.command stop to stop it, or status to check it.
SETUP

/usr/bin/open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
if [ -t 0 ]; then
    printf '\nAfter enabling Accessibility, return here and press Return to start: '
    IFS= read -r setup_continue || exit 0
    /bin/sh "$switcher_dir/switch.command" start
fi
