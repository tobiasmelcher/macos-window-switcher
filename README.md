# macOS window switcher

A small JavaScript for Automation (JXA) script using native macOS UI and Accessibility APIs. No installation is needed.

Created as a lightweight replacement for [AltTab](https://github.com/lwouis/alt-tab-macos) after internal IT disallowed that app. It provides a keyboard-operated window chooser with type-to-filter search.

## Use

Press **Command + Control + Shift + W**. The window list opens with your current window selected. Type to show a filter box and narrow the list by app or window title (for example, **ecl**). Matching ignores case; multiple words must all match. Clear the text to show all windows again. Use **Up/Down**, then **Return** to switch. **Escape** cancels.

## Setup

1. Open **Shortcuts** and create **Switch window**.
2. Add **Run Shell Script** and enter:

       /bin/sh "/absolute/path/to/macos-window-switcher/switch.command"

   Replace the example path with this folder’s location; **./configure.command** prints the correct command. Leave **Run as Administrator** off.
3. In **Details**, enable **Use as Quick Action → Services Menu**.
4. Deselect all input types in the first block. Set **If there is no input → Continue**.
5. Assign **Command + Control + Shift + W** in Details.
6. Run once. If scripting is disabled, enable **Shortcuts → Settings → Advanced → Allow Running Scripts**.
7. For Accessibility errors, open **System Settings → Privacy & Security → Accessibility** and enable the app running the shortcut. This can be Shortcuts or the invoking app, such as Eclipse or Teams. Permissions may be needed separately for each app.

Run **./configure.command** in a terminal for setup instructions and Accessibility settings. Permissions require manual approval. System Events Automation permission is no longer needed.

## Files

- **switch.command** — runs the switcher; your Shortcuts action calls this.
- **window-picker.js** — finds windows, displays the filterable chooser, and focuses your selection.
- **configure.command** — guides setup and permissions; use only when needed.

## If the keys do nothing

Try **App menu → Services → Switch window**. If that works, check the binding under **System Settings → Keyboard → Keyboard Shortcuts → Services**. Reopen the app if it still uses an old binding.

This shortcut depends on the active app’s Services support; conflicts remain possible. Tabs are not separate windows. Full-screen and other-Space windows depend on the app and macOS. This script does not hide itself from device management.
