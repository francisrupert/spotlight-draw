/**
 * Unit Tests: Custom Shortcut Preferences
 */

QUnit.module("Custom Shortcut Preferences", function(hooks) {
  var originalState;

  function keyboardEvent(key, modifiers) {
    modifiers = modifiers || {};
    return new KeyboardEvent("keydown", {
      key: key,
      code: modifiers.code || "",
      ctrlKey: modifiers.ctrlKey === true,
      altKey: modifiers.altKey === true,
      metaKey: modifiers.metaKey === true,
      shiftKey: modifiers.shiftKey === true,
      bubbles: true,
      cancelable: true
    });
  }

  function mouseEvent(modifiers) {
    modifiers = modifiers || {};
    return new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
      button: 0,
      ctrlKey: modifiers.ctrlKey === true,
      altKey: modifiers.altKey === true,
      metaKey: modifiers.metaKey === true,
      shiftKey: modifiers.shiftKey === true,
      bubbles: true,
      cancelable: true
    });
  }

  function dispatchRuntimeMessage(message) {
    var listeners = window._mockMessageListeners || [];
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](message, {}, function() {});
    }
  }

  hooks.beforeEach(function() {
    originalState = {
      isDrawingMode: window.isDrawingMode,
      userPreferences: {
        borderSize: window.userPreferences.borderSize,
        defaultColor: window.userPreferences.defaultColor,
        snapToEdges: window.userPreferences.snapToEdges,
        toggleShortcut: window.userPreferences.toggleShortcut,
        quickDrawShortcut: window.userPreferences.quickDrawShortcut
      }
    };

    window.resetChromeStorage();
    window.setChromeStorage({
      borderSize: "1",
      defaultColor: "",
      snapToEdges: true,
      toggleShortcut: "Alt+F",
      quickDrawShortcut: "Ctrl+Alt+Meta"
    });
    window.userPreferences.toggleShortcut = "Alt+F";
    window.userPreferences.quickDrawShortcut = "Ctrl+Alt+Meta";
  });

  hooks.afterEach(function() {
    if (window.isDrawingMode) {
      disableDrawingMode();
    }

    window.isDrawingMode = originalState.isDrawingMode;
    window.userPreferences.borderSize = originalState.userPreferences.borderSize;
    window.userPreferences.defaultColor = originalState.userPreferences.defaultColor;
    window.userPreferences.snapToEdges = originalState.userPreferences.snapToEdges;
    window.userPreferences.toggleShortcut = originalState.userPreferences.toggleShortcut;
    window.userPreferences.quickDrawShortcut = originalState.userPreferences.quickDrawShortcut;
    window.resetChromeStorage();
  });

  QUnit.test("captures a keyboard shortcut with modifiers and a key", function(assert) {
    var shortcut = shortcutFromEvent(keyboardEvent("f", { altKey: true }), "keyboard");

    assert.equal(shortcut, "Alt+F", "shortcut is stored in canonical form");
  });

  QUnit.test("captures the main key when option produces a special character", function(assert) {
    var shortcut = shortcutFromEvent(keyboardEvent("ƒ", {
      altKey: true,
      code: "KeyF"
    }), "keyboard");

    assert.equal(shortcut, "Alt+F", "option shortcut stores the main key character");
  });

  QUnit.test("does not capture modifier-only keyboard shortcuts for toggle mode", function(assert) {
    var shortcut = shortcutFromEvent(keyboardEvent("Alt", { altKey: true }), "keyboard");

    assert.equal(shortcut, null, "toggle shortcut requires a non-modifier key");
  });

  QUnit.test("captures a modifier-only shortcut for quick draw", function(assert) {
    var shortcut = shortcutFromEvent(keyboardEvent("Meta", {
      ctrlKey: true,
      altKey: true,
      metaKey: true
    }), "modifiers");

    assert.equal(shortcut, "Ctrl+Alt+Meta", "quick draw shortcut stores only modifiers");
  });

  QUnit.test("matches custom keyboard and mouse shortcuts", function(assert) {
    assert.ok(
      eventMatchesShortcut(keyboardEvent("f", { altKey: true }), "Alt+F"),
      "custom toggle shortcut matches"
    );
    assert.ok(
      eventMatchesShortcut(keyboardEvent("ƒ", { altKey: true, code: "KeyF" }), "Alt+F"),
      "option shortcut matches the main key character"
    );
    assert.notOk(
      eventMatchesShortcut(keyboardEvent("g", { altKey: true }), "Alt+F"),
      "different key does not match"
    );
    assert.ok(
      eventMatchesShortcut(mouseEvent({ ctrlKey: true, altKey: true, metaKey: true }), "Ctrl+Alt+Meta"),
      "custom modifier chord matches mouse event"
    );
  });

  QUnit.test("quick draw uses the stored modifier shortcut", function(assert) {
    window.userPreferences.quickDrawShortcut = "Ctrl+Alt+Shift";

    assert.ok(
      isQuickDrawChord(mouseEvent({ ctrlKey: true, altKey: true, shiftKey: true })),
      "stored quick draw modifier chord matches"
    );
    assert.notOk(
      isQuickDrawChord(mouseEvent({ ctrlKey: true, altKey: true, metaKey: true })),
      "old quick draw modifier chord does not match"
    );
  });

  QUnit.test("renders customized shortcut labels", function(assert) {
    var container = document.createElement("div");
    renderShortcutsInto(container, "h2", "shortcuts-section");

    updateCustomShortcutDisplays(container, {
      toggleShortcut: "Alt+F",
      quickDrawShortcut: "Ctrl+Alt+Shift"
    });

    var toggleCell = container.querySelector('[data-shortcut-id="toggleShortcut"]');
    var quickDrawCell = container.querySelector('[data-shortcut-id="quickDrawShortcut"]');

    assert.equal(toggleCell.textContent, "Option + F", "toggle shortcut display updates");
    assert.equal(quickDrawCell.textContent, "Ctrl + Option + Shift + Drag", "quick draw display updates");
  });

  QUnit.test("resets shortcut input to the stored default", function(assert) {
    var container = document.createElement("div");
    var input = document.createElement("input");
    var resetButton = document.createElement("button");
    var savedShortcut = null;

    input.id = "toggleShortcut";
    resetButton.id = "resetToggleShortcut";
    container.appendChild(input);
    container.appendChild(resetButton);

    updateShortcutInput(container, "toggleShortcut", "Alt+G");
    setupShortcutResetButton(container, "resetToggleShortcut", "toggleShortcut", "toggleShortcut", function(shortcut) {
      savedShortcut = shortcut;
    });

    assert.notOk(resetButton.disabled, "reset is enabled for a customized shortcut");

    resetButton.click();

    assert.equal(input.value, "Option + F", "input displays the default shortcut");
    assert.equal(input.getAttribute("data-shortcut"), "Alt+F", "input stores the default shortcut");
    assert.equal(savedShortcut, "Alt+F", "reset saves the default shortcut");
    assert.ok(resetButton.disabled, "reset is disabled after restoring the default");
  });

  QUnit.test("enables reset button only when shortcut differs from default", function(assert) {
    var container = document.createElement("div");
    var input = document.createElement("input");
    var resetButton = document.createElement("button");

    input.id = "quickDrawShortcut";
    resetButton.id = "resetQuickDrawShortcut";
    container.appendChild(input);
    container.appendChild(resetButton);

    updateShortcutInput(container, "quickDrawShortcut", "Ctrl+Alt+Meta");
    setupShortcutResetButton(container, "resetQuickDrawShortcut", "quickDrawShortcut", "quickDrawShortcut");

    assert.ok(resetButton.disabled, "reset is disabled for the default shortcut");

    updateShortcutInput(container, "quickDrawShortcut", "Ctrl+Alt+Shift");

    assert.notOk(resetButton.disabled, "reset is enabled for a custom shortcut");
  });

  QUnit.test("global toggle shortcut turns drawing mode on", function(assert) {
    var done = assert.async();

    document.dispatchEvent(keyboardEvent("f", { altKey: true }));

    setTimeout(function() {
      assert.strictEqual(window.isDrawingMode, true, "custom shortcut toggles drawing mode");
      done();
    }, 0);
  });

  QUnit.test("toolbar action toggle still works when drawing shortcut is customized", function(assert) {
    var done = assert.async();

    window.userPreferences.toggleShortcut = "Ctrl+Alt+Meta+A";
    window.setChromeStorage({
      borderSize: "1",
      defaultColor: "",
      snapToEdges: true,
      toggleShortcut: "Ctrl+Alt+Meta+A",
      quickDrawShortcut: "Ctrl+Alt+Meta"
    });

    dispatchRuntimeMessage({ type: "TOGGLE_BOX_HIGHLIGHT" });

    setTimeout(function() {
      assert.strictEqual(window.isDrawingMode, true, "toolbar action still toggles drawing mode");
      done();
    }, 0);
  });
});
