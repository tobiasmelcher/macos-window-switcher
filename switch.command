#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
    printf '%s\n' 'This script requires macOS.' >&2
    exit 1
fi

switcher_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mode=${1:-once}
case "$mode" in
    once)
        if [ "$#" -gt 0 ]; then shift; fi
        exec /usr/bin/osascript -l JavaScript "$switcher_dir/window-picker.js" "$@"
        ;;
    --check|--check-windows|--check-focus|--check-listener)
        exec /usr/bin/osascript -l JavaScript "$switcher_dir/window-picker.js" "$@"
        ;;
    start|stop|status) ;;
    *)
        printf '%s\n' 'Usage: ./switch.command [start|stop|status|once]' >&2
        exit 2
        ;;
esac

umask 077
state_dir=${WINDOW_SWITCHER_STATE_DIR:-${TMPDIR:-/tmp}/macos-window-switcher-$(id -u)}
pid_file="$state_dir/listener.pid"
log_file="$state_dir/listener.log"

is_running() {
    [ -f "$pid_file" ] || return 1
    IFS= read -r listener_pid < "$pid_file" || return 1
    case "$listener_pid" in ''|*[!0-9]*) return 1 ;; esac
    kill -0 "$listener_pid" 2>/dev/null || return 1
    listener_command=$(/bin/ps -p "$listener_pid" -o command= 2>/dev/null) || return 1
    case "$listener_command" in
        *"$switcher_dir/window-picker.js --listen"*) return 0 ;;
        *) return 1 ;;
    esac
}

case "$mode" in
    status)
        if is_running; then
            printf 'Listener running (PID %s). Shortcut: Command + Control + Shift + W.\n' "$listener_pid"
        else
            printf '%s\n' 'Listener is not running.'
            exit 1
        fi
        ;;
    stop)
        if is_running; then
            kill "$listener_pid"
            attempt=0
            while kill -0 "$listener_pid" 2>/dev/null && [ "$attempt" -lt 20 ]; do
                sleep 0.1
                attempt=$((attempt + 1))
            done
            if is_running; then
                printf '%s\n' 'Listener is still stopping. Try again shortly.' >&2
                exit 1
            fi
            rm -f "$pid_file"
            printf '%s\n' 'Listener stopped.'
        else
            printf '%s\n' 'Listener is not running.'
        fi
        ;;
    start)
        mkdir -p "$state_dir"
        start_lock="$state_dir/start.lock"
        if ! mkdir "$start_lock" 2>/dev/null; then
            printf '%s\n' 'Another start is in progress. Try again shortly.' >&2
            exit 1
        fi
        trap 'rmdir "$start_lock" 2>/dev/null || true' EXIT
        if is_running; then
            printf '%s\n' 'Listener is already running.'
            exit 0
        fi
        nohup /usr/bin/osascript -l JavaScript "$switcher_dir/window-picker.js" --listen > "$log_file" 2>&1 < /dev/null &
        printf '%s\n' "$!" > "$pid_file"
        attempt=0
        while [ "$attempt" -lt 30 ]; do
            if ! is_running; then
                cat "$log_file" >&2
                rm -f "$pid_file"
                exit 1
            fi
            if /usr/bin/grep -q '^READY:' "$log_file"; then
                printf '%s\n' 'Listener started. Press Command + Control + Shift + W from any app.'
                exit 0
            fi
            sleep 0.1
            attempt=$((attempt + 1))
        done
        printf 'Listener is starting. Check ./switch.command status or %s\n' "$log_file"
        ;;
esac
