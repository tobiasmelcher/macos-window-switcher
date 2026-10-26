/* Native macOS window switcher, run by switch.command; no dependencies. */
ObjC.import('AppKit');
ObjC.import('Foundation');
ObjC.import('ApplicationServices');
ObjC.import('Carbon');

var picker = null;
var applicationStarted = false;

// W on the macOS ANSI keyboard; Command + Control + Shift.
var HOTKEY = {keyCode: 13, modifiers: 256 | 4096 | 512};

function prepareApplication() {
    var app = $.NSApplication.sharedApplication;
    if (!applicationStarted) {
        app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);
        app.finishLaunching;
        applicationStarted = true;
    }
    return app;
}

function closePicker() {
    picker.window.orderOut($());
    picker.window.delegate = $();
    picker.window.close;
    picker = null;
}


function selectedItem() {
    var row = Number(picker.table.selectedRow);
    return row >= 0 ? picker.visible[row] || null : null;
}

function selectRow(row) {
    if (!picker.visible.length) return;
    row = Math.max(0, Math.min(row, picker.visible.length - 1));
    picker.table.selectRowIndexesByExtendingSelection($.NSIndexSet.indexSetWithIndex(row), false);
    picker.table.scrollRowToVisible(row);
    picker.lastIndex = picker.visible[row].index;
}

function finish(accept) {
    var item = selectedItem();
    if (accept && !item) return;
    picker.result = accept ? item.index + 1 : 0;
    if (!picker.testing) $.NSApplication.sharedApplication.stopModal;
}

function updateFilter() {
    var previous = selectedItem();
    var query = ObjC.unwrap(picker.input.stringValue);
    var words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    picker.visible = picker.items.filter(function (item) {
        return words.every(function (word) { return item.search.indexOf(word) !== -1; });
    });
    var filtering = query.length > 0;
    picker.input.alphaValue = filtering ? 1 : 0;
    picker.filtering = filtering;
    picker.scroll.setFrame($.NSMakeRect(20, 64, picker.width - 40, picker.height - (filtering ? 174 : 130)));
    picker.table.reloadData;
    var previousIndex = previous ? previous.index : picker.lastIndex;
    var row = picker.visible.findIndex(function (item) { return item.index === previousIndex; });
    selectRow(row < 0 ? 0 : row);
    picker.status.stringValue = $(picker.visible.length ? picker.visible.length + ' windows' : 'No matching windows');
}

// Selection follows the chooser window rather than the filter field's focus.
// AppKit still draws the native selection and adjusts its text contrast.
ObjC.registerSubclass({
    name: 'WindowPickerRowView',
    superclass: 'NSTableRowView',
    methods: {
        'isEmphasized': {
            types: ['bool', []],
            implementation: function () { return !!(picker && picker.window.keyWindow); }
        }
    }
});

ObjC.registerSubclass({
    name: 'WindowPickerController',
    superclass: 'NSObject',
    methods: {
        'numberOfRowsInTableView:': {
            types: ['long', ['id']],
            implementation: function () { return picker.visible.length; }
        },
        'tableView:viewForTableColumn:row:': {
            types: ['id', ['id', 'id', 'long']],
            implementation: function (table, column, row) {
                var cell = table.makeViewWithIdentifierOwner($('window-cell'), picker.controller);
                if (!ObjC.unwrap(cell)) {
                    cell = $.NSTableCellView.alloc.initWithFrame($.NSMakeRect(0, 0, column.width, 26));
                    cell.identifier = $('window-cell');
                    var text = label('', $.NSMakeRect(5, 3, Number(column.width) - 10, 20));
                    text.cell.lineBreakMode = $.NSLineBreakByTruncatingTail;
                    cell.textField = text;
                    cell.addSubview(text);
                }
                cell.textField.stringValue = $(picker.visible[Number(row)].label);
                return cell;
            }
        },
        'tableView:rowViewForRow:': {
            types: ['id', ['id', 'long']],
            implementation: function () {
                return $.WindowPickerRowView.alloc.initWithFrame($.NSMakeRect(0, 0, Number(picker.table.bounds.size.width), 26));
            }
        },
        'control:textView:doCommandBySelector:': {
            types: ['bool', ['id', 'id', 'SEL']],
            implementation: function (control, editor, selector) {
                var command = String(selector);
                if (command === 'moveUp:' || command === 'moveDown:') {
                    selectRow(Number(picker.table.selectedRow) + (command === 'moveDown:' ? 1 : -1));
                    return true;
                }
                if (command === 'insertNewline:' || command === 'insertNewlineIgnoringFieldEditor:') {
                    finish(true); return true;
                }
                if (command === 'cancelOperation:') { finish(false); return true; }
                return false;
            }
        },
        'controlTextDidChange:': {
            types: ['void', ['id']],
            implementation: function () { updateFilter(); }
        },
        'accept:': {
            types: ['void', ['id']],
            implementation: function () { finish(true); }
        },
        'cancel:': {
            types: ['void', ['id']],
            implementation: function () { finish(false); }
        },
        'runChecks:': {
            types: ['void', ['id']],
            implementation: function () {
                try { picker.check(); } catch (error) { picker.checkError = String(error); }
                $.NSApplication.sharedApplication.stopModal;
            }
        },
        'windowShouldClose:': {
            types: ['bool', ['id']],
            implementation: function () { finish(false); return false; }
        }
    }
});

function label(text, frame) {
    var field = $.NSTextField.alloc.initWithFrame(frame);
    field.stringValue = $(text);
    field.editable = false;
    field.selectable = false;
    field.bezeled = false;
    field.drawsBackground = false;
    return field;
}

function button(title, action, frame) {
    var control = $.NSButton.alloc.initWithFrame(frame);
    control.title = $(title);
    control.bezelStyle = $.NSRoundedBezelStyle;
    control.target = picker.controller;
    control.action = action;
    return control;
}

function buildPicker(labels, activeIndex) {
    var screen = $.NSScreen.mainScreen.visibleFrame;
    var width = Math.min(950, Number(screen.size.width) - 60);
    var height = Math.min(520, Number(screen.size.height) - 80);
    var app = prepareApplication();
    picker = {
        items: labels.map(function (text, index) { return {label: text, search: text.toLocaleLowerCase(), index: index}; }),
        width: width, height: height, result: 0
    };
    picker.visible = picker.items.slice();
    picker.controller = $.WindowPickerController.alloc.init;
    picker.window = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
        $.NSMakeRect(0, 0, width, height), $.NSTitledWindowMask | $.NSClosableWindowMask, $.NSBackingStoreBuffered, false);
    picker.window.title = $('Switch window');
    picker.window.releasedWhenClosed = false;
    picker.window.delegate = picker.controller;
    var content = picker.window.contentView;
    picker.background = $.NSBox.alloc.initWithFrame(content.bounds);
    picker.background.boxType = $.NSBoxCustom;
    picker.background.borderType = $.NSNoBorder;
    picker.background.titlePosition = $.NSNoTitle;
    picker.background.fillColor = $.NSColor.windowBackgroundColor;
    content.addSubview(picker.background);
    content.addSubview(label('Type to filter · Up/Down to select · Return to switch · Escape to cancel', $.NSMakeRect(20, height - 48, width - 40, 24)));
    picker.input = $.NSTextField.alloc.initWithFrame($.NSMakeRect(20, height - 96, width - 40, 30));
    picker.input.placeholderString = $('Filter by app or window title');
    picker.input.delegate = picker.controller;
    // Keep the native editor ready for typing, but reveal it only after input.
    picker.input.alphaValue = 0;
    picker.filtering = false;
    content.addSubview(picker.input);
    picker.scroll = $.NSScrollView.alloc.initWithFrame($.NSMakeRect(20, 64, width - 40, height - 130));
    picker.scroll.hasVerticalScroller = true;
    picker.scroll.borderType = $.NSBezelBorder;
    picker.table = $.NSTableView.alloc.initWithFrame($.NSMakeRect(0, 0, width - 42, height - 130));
    var column = $.NSTableColumn.alloc.initWithIdentifier($('window'));
    column.width = width - 64;
    column.editable = false;
    picker.table.addTableColumn(column);
    picker.table.headerView = $();
    picker.table.rowHeight = 26;
    picker.table.usesAlternatingRowBackgroundColors = true;
    picker.table.allowsMultipleSelection = false;
    // Mouse selection must not steal text input from the filter field.
    picker.table.refusesFirstResponder = true;
    picker.table.dataSource = picker.controller;
    picker.table.delegate = picker.controller;
    picker.table.target = picker.controller;
    picker.table.doubleAction = 'accept:';
    picker.scroll.documentView = picker.table;
    content.addSubview(picker.scroll);
    picker.status = label(labels.length + ' windows', $.NSMakeRect(20, 22, width - 240, 24));
    content.addSubview(picker.status);
    content.addSubview(button('Cancel', 'cancel:', $.NSMakeRect(width - 220, 18, 95, 32)));
    content.addSubview(button('Switch', 'accept:', $.NSMakeRect(width - 120, 18, 100, 32)));
    picker.table.reloadData;
    selectRow(activeIndex);
    picker.window.center;
    return app;
}

// Keep Accessibility objects themselves, never window names or stacking indices.
// These references continue to identify the selected window after the chooser
// activates or when multiple windows have identical titles.
function axAttribute(element, name) {
    var output = Ref();
    var code = Number($.AXUIElementCopyAttributeValue(element, $(name), output));
    if (code !== 0) throw Error('Cannot read ' + name + ' (Accessibility error ' + code + ').');
    return ObjC.castRefToObject(output[0]);
}

function optionalAttribute(element, name, fallback) {
    try { return axAttribute(element, name); } catch (_) { return fallback; }
}

function collectWindows() {
    if (!$.AXIsProcessTrusted()) {
        throw Error('Enable Accessibility permission for the app running this script in System Settings > Privacy & Security > Accessibility, then try again.');
    }
    var frontmost = $.NSWorkspace.sharedWorkspace.frontmostApplication;
    var activePID = Number(frontmost.processIdentifier);
    var applications = $.NSWorkspace.sharedWorkspace.runningApplications;
    var entries = [];
    var activeIndex = 0;
    var activeFound = false;
    for (var a = 0; a < Number(applications.count); a++) {
        var application = applications.objectAtIndex(a);
        if (Number(application.activationPolicy) === Number($.NSApplicationActivationPolicyProhibited)) continue;
        var pid = Number(application.processIdentifier);
        var appElement = $.AXUIElementCreateApplication(pid);
        var windows = optionalAttribute(appElement, 'AXWindows', null);
        if (!windows) continue;
        var focused = pid === activePID ? optionalAttribute(appElement, 'AXFocusedWindow', null) : null;
        if (!focused && pid === activePID) focused = optionalAttribute(appElement, 'AXMainWindow', null);
        for (var w = 0; w < Number(windows.count); w++) {
            var window = windows.objectAtIndex(w);
            var title = ObjC.unwrap(optionalAttribute(window, 'AXTitle', $(''))) || 'Untitled window';
            var name = ObjC.unwrap(application.localizedName) || 'Application';
            if (focused && $.CFEqual(window, focused)) {
                activeIndex = entries.length;
                activeFound = true;
            }
            entries.push({label: (entries.length + 1) + '. ' + name + ' — ' + title, pid: pid, window: window});
        }
    }
    return {entries: entries, activeIndex: activeIndex, activeFound: activeFound};
}

function focusWindow(target) {
    var app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(target.pid);
    if (!ObjC.unwrap(app) || app.terminated) throw Error('The selected application has closed.');
    if (!app.activateWithOptions($.NSApplicationActivateIgnoringOtherApps)) {
        throw Error('macOS could not activate the selected application.');
    }
    $.NSThread.sleepForTimeInterval(0.1);
    // Not every app supports writable minimized/main/focused attributes.
    $.AXUIElementSetAttributeValue(target.window, $('AXMinimized'), $(false));
    $.AXUIElementSetAttributeValue(target.window, $('AXMain'), $(true));
    var code = Number($.AXUIElementPerformAction(target.window, $('AXRaise')));
    if (code !== 0) throw Error('The window may have closed or may not support focus (Accessibility error ' + code + ').');
    $.AXUIElementSetAttributeValue(target.window, $('AXFocused'), $(true));
}

function showMessage(title, detail) {
    var app = prepareApplication();
    var alert = $.NSAlert.alloc.init;
    alert.messageText = $(title);
    alert.informativeText = $(detail);
    alert.addButtonWithTitle($('OK'));
    app.activateIgnoringOtherApps(true);
    alert.runModal;
}

function run(argv) {
    if (argv[0] === '--check') return checkPicker(argv[1]);
    if (argv[0] === '--check-listener') return checkHotkey();
    if (argv[0] === '--listen') return listen();
    var snapshot = collectWindows();
    if (argv[0] === '--check-focus') {
        if (!snapshot.activeFound) throw Error('The current focused window was not exposed by its app.');
        var target = snapshot.entries[snapshot.activeIndex];
        focusWindow(target);
        var focused = axAttribute($.AXUIElementCreateApplication(target.pid), 'AXFocusedWindow');
        if (!$.CFEqual(target.window, focused)) throw Error('The focused window did not match the retained reference.');
        return 'Focus check passed: original active window retained focus';
    }
    if (argv[0] === '--check-windows') {
        if (!snapshot.entries.length) throw Error('No windows were detected.');
        // Read-only check: confirm that different entries retain distinct native
        // references, regardless of identical titles or process IDs.
        for (var i = 0; i < snapshot.entries.length; i++) {
            for (var j = i + 1; j < snapshot.entries.length; j++) {
                if ($.CFEqual(snapshot.entries[i].window, snapshot.entries[j].window)) {
                    throw Error('Window enumeration produced duplicate references.');
                }
            }
        }
        return 'Window checks passed: ' + snapshot.entries.length + ' distinct windows; active index ' + snapshot.activeIndex;
    }
    showSwitcher(snapshot);
}

function showSwitcher(snapshot) {
    snapshot = snapshot || collectWindows();
    if (!snapshot.entries.length) {
        showMessage('Switch window', 'No accessible windows found.');
        return;
    }
    var app = buildPicker(snapshot.entries.map(function (entry) { return entry.label; }), snapshot.activeIndex);
    app.activateIgnoringOtherApps(true);
    picker.window.makeKeyAndOrderFront($());
    $.NSRunningApplication.currentApplication.activateWithOptions($.NSApplicationActivateIgnoringOtherApps);
    picker.window.makeFirstResponder(picker.input);
    app.runModalForWindow(picker.window);
    var result = picker.result;
    closePicker();
    if (!result) return;
    try {
        focusWindow(snapshot.entries[result - 1]);
    } catch (error) {
        showMessage('Could not focus that window', String(error));
    }
    // No result text: Shortcuts should not display an Accessibility object.
}

// Carbon registers one global hotkey without monitoring general keyboard input.
// Polling its event queue avoids JXA's unreliable native C/block callbacks.
function registerHotkey() {
    var output = Ref();
    var code = Number($.RegisterEventHotKey(HOTKEY.keyCode, HOTKEY.modifiers,
        {signature: 0x57535754, id: 1}, $.GetApplicationEventTarget(), 0, output));
    if (code !== 0) throw Error('Cannot register Command + Control + Shift + W. Another global shortcut may already use it (macOS error ' + code + ').');
    return output[0];
}

function receiveHotkey(timeout, onHotkey) {
    var output = Ref();
    var code = Number($.ReceiveNextEvent(0, null, timeout, true, output));
    if (code === Number($.eventLoopTimedOutErr)) return false;
    // AppKit can leave a quit notification after its modal/startup loop.
    // Re-entering the native loop clears it; the background listener continues.
    if (code === Number($.eventLoopQuitErr)) {
        $.RunCurrentEventLoop(0);
        return false;
    }
    if (code !== 0) throw Error('Cannot receive hotkey events (macOS error ' + code + ').');
    var event = output[0];
    try {
        if (Number($.GetEventClass(event)) === Number($.kEventClassKeyboard) &&
            Number($.GetEventKind(event)) === Number($.kEventHotKeyPressed)) {
            onHotkey();
            return true;
        }
        $.SendEventToEventTarget(event, $.GetEventDispatcherTarget());
        return false;
    } finally {
        $.ReleaseEvent(event);
    }
}

function listen() {
    // A new session keeps the background listener alive when its launcher exits.
    // No helper executable or launch-agent installation is required.
    ObjC.bindFunction('setsid', ['int', []]);
    $.setsid();
    // Fail immediately rather than leaving an unusable background listener.
    if (!$.AXIsProcessTrusted()) throw Error('Enable Accessibility for the app starting the listener (Terminal or Ghostty), then run ./switch.command start again.');
    prepareApplication();
    var registration = registerHotkey();
    try {
        console.log('READY: Command + Control + Shift + W');
        while (true) {
            receiveHotkey(0.25, function () {
                console.log('HOTKEY: opening window chooser');
                try { showSwitcher(); } catch (error) { showMessage('Switch window', String(error)); }
            });
        }
    } finally {
        $.UnregisterEventHotKey(registration);
    }
}

function checkHotkey() {
    prepareApplication();
    var registration = registerHotkey();
    var received = 0;
    try {
        $.QuitEventLoop($.GetCurrentEventLoop());
        receiveHotkey(0, function () { throw Error('Unexpected test event.'); });
        for (var attempt = 0; attempt < 2; attempt++) {
            // Post to this process only; never inject keys into other apps.
            var event = Ref();
            var code = Number($.CreateEvent(null, $.kEventClassKeyboard, $.kEventHotKeyPressed,
                $.GetCurrentEventTime(), 0, event));
            if (code !== 0) throw Error('Cannot create a test hotkey event: ' + code);
            try { $.PostEventToQueue($.GetMainEventQueue(), event[0], $.kEventPriorityStandard); }
            finally { $.ReleaseEvent(event[0]); }
            var deadline = Date.now() + 5000;
            while (received <= attempt && Date.now() < deadline) {
                receiveHotkey(0.1, function () { checkPicker(); received++; });
            }
            if (received <= attempt) throw Error('Hotkey event was not delivered.');
        }
        return 'Listener checks passed: global registration, native event delivery, two chooser cycles, keyboard/filtering';
    } finally {
        $.UnregisterEventHotKey(registration);
    }
}

// Exercise real AppKit keyboard events against sample windows only.
function checkPicker(outputPath) {
    var previousApp = $.NSWorkspace.sharedWorkspace.frontmostApplication;
    var app = buildPicker(['1. Ghostty — terminal', '2. Eclipse — editor', '3. Eclipse — review', '4. Teams — chat'], 2);
    picker.testing = true;
    function assert(ok, message) { if (!ok) throw Error(message); }
    function key(code, text) {
        var event = $.NSEvent.keyEventWithTypeLocationModifierFlagsTimestampWindowNumberContextCharactersCharactersIgnoringModifiersIsARepeatKeyCode(
            $.NSKeyDown, $.NSMakePoint(0, 0), 0, 0, picker.window.windowNumber, $(), $(text), $(text), false, code);
        app.postEventAtStart(event, true);
        var next = app.nextEventMatchingMaskUntilDateInModeDequeue($.NSKeyDownMask, $.NSDate.dateWithTimeIntervalSinceNow(0.1), $.NSModalPanelRunLoopMode, true);
        if (ObjC.unwrap(next)) app.sendEvent(next);
    }
    picker.check = function () {
        assert(picker.window.keyWindow, 'Chooser did not receive keyboard focus');
        assert(selectedItem().index === 2, 'Active window is not initially selected');
        key(126, '\uf700'); key(125, '\uf701');
        assert(selectedItem().index === 2, 'Initial arrow navigation failed');
        key(14, 'e'); key(37, 'l'); key(8, 'c');
        key(51, '\u007f'); key(51, '\u007f');
        key(8, 'c'); key(37, 'l');
        assert(ObjC.unwrap(picker.input.stringValue) === 'ecl', 'Typing/backspace did not update the filter box: ' + ObjC.unwrap(picker.input.stringValue));
        assert(picker.visible.length === 2 && selectedItem().index === 2, 'Filtering lost the active selection');
        key(126, '\uf700');
        assert(selectedItem().index === 1, 'Up selected the wrong original window');
        key(125, '\uf701');
        assert(selectedItem().index === 2, 'Down selected the wrong original window');
        picker.input.stringValue = $('ECL REVIEW');
        updateFilter();
        assert(picker.visible.length === 1 && selectedItem().index === 2, 'Case-insensitive multiword filter failed');
        picker.input.stringValue = $('no match');
        updateFilter();
        assert(picker.visible.length === 0 && selectedItem() === null, 'Empty results retain a stale selection');
        key(36, '\r');
        assert(picker.result === 0, 'Return accepted an empty result');
        picker.input.stringValue = $('');
        updateFilter();
        assert(picker.visible.length === 4 && !picker.filtering, 'Clearing the filter failed');
        picker.input.stringValue = $('ecl');
        updateFilter();
        selectRow(1);
        key(36, '\r');
        assert(picker.result === 3, 'Return did not return the original window index');
        key(53, '\u001b');
        assert(picker.result === 0, 'Escape did not cancel');
        if (outputPath) {
            var view = picker.window.contentView;
            view.displayIfNeeded;
            var bitmap = view.bitmapImageRepForCachingDisplayInRect(view.bounds);
            view.cacheDisplayInRectToBitmapImageRep(view.bounds, bitmap);
            var preview = $.NSImage.alloc.initWithSize(view.bounds.size);
            preview.lockFocus;
            $.NSColor.windowBackgroundColor.setFill;
            $.NSRectFill(view.bounds);
            bitmap.drawInRect(view.bounds);
            preview.unlockFocus;
            var flattened = $.NSBitmapImageRep.imageRepWithData(preview.TIFFRepresentation);
            flattened.representationUsingTypeProperties($.NSPNGFileType, $({})).writeToFileAtomically($(outputPath), true);
        }
    };
    try {
        app.activateIgnoringOtherApps(true);
        picker.window.makeKeyAndOrderFront($());
        $.NSRunningApplication.currentApplication.activateWithOptions($.NSApplicationActivateIgnoringOtherApps);
        picker.window.makeFirstResponder(picker.input);
        picker.controller.performSelectorWithObjectAfterDelayInModes('runChecks:', $(), 0.2, $.NSArray.arrayWithObject($.NSModalPanelRunLoopMode));
        app.runModalForWindow(picker.window);
        if (picker.checkError) throw Error(picker.checkError);
        return 'Chooser checks passed: focus, typing, deletion, filtering, arrows, Return, Escape';
    } finally {
        closePicker();
        previousApp.activateWithOptions($.NSApplicationActivateIgnoringOtherApps);
    }
}
