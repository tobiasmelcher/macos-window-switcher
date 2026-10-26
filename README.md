# macOS window switcher

A small JavaScript for Automation (JXA) script using native macOS APIs. No installation or Shortcuts registration is needed.

Created as a lightweight replacement for [AltTab](https://github.com/lwouis/alt-tab-macos) after internal IT disallowed that app.

## Setup

1. Run **./configure.command** from Terminal or Ghostty.
2. Enable that app in **System Settings → Privacy & Security → Accessibility**. If missing, click **+** and select it from Applications.
3. Return to the terminal and press Return to start the listener.

The listener runs in the background and registers **Command + Control + Shift + W** system-wide. Only the app starting it needs Accessibility permission. No per-app Services or Automation setup is required. The old **Switch window** entry in Shortcuts is optional and can be removed.

Start the listener again after login:

    ./switch.command start

Check or stop it:

    ./switch.command status
    ./switch.command stop

## Use

Press **Command + Control + Shift + W** from any app. Your current window is selected. Type to filter by app or window title, such as **ecl**. Matching ignores case; multiple words must all match. Clear the text to show all windows.

Use **Up/Down → Return** to switch. **Escape** cancels.

## Files

- **switch.command** — starts, stops, or checks the listener. With no arguments (or **once**), it opens the chooser once for compatibility.
- **window-picker.js** — registers the native hotkey, finds windows, displays the chooser, and focuses your selection.
- **configure.command** — guides permission setup and starts the listener.

## Troubleshooting

If the keys do nothing, run **./switch.command status**. If stopped, run **start** again. If another global utility owns the shortcut, startup reports a conflict. Changing this folder's path requires stopping the listener before moving it, then starting it from the new location.

Tabs are not separate windows. Full-screen and other-Space windows depend on the app and macOS. The listener registers only its hotkey; it does not record general keyboard input or hide itself from device management.
