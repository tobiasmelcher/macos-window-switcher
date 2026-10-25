#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
    printf '%s\n' 'This script requires macOS.' >&2
    exit 1
fi

switcher_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec /usr/bin/osascript -l JavaScript "$switcher_dir/window-picker.js" "$@"
