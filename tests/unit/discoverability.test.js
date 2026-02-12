/**
 * Unit Tests: Discoverability Features
 *
 * Tests for:
 * - updateToggleShortcutDisplay() - Update shortcut text in first shortcuts table
 * - checkShortcutStatus() - Badge/tooltip based on shortcut state
 * - chrome.runtime.sendMessage mock for GET_SHORTCUT
 */

// --- updateToggleShortcutDisplay ---

QUnit.module("Discoverability - updateToggleShortcutDisplay", {
  beforeEach: function() {
    this.container = document.createElement("div");

    // Build a shortcuts table matching the structure produced by renderShortcutsInto
    var table = document.createElement("table");
    table.className = "shortcuts-table";

    var row1 = document.createElement("tr");
    var keys1 = document.createElement("td");
    keys1.className = "shortcut-keys";
    keys1.textContent = "Alt + F";
    var desc1 = document.createElement("td");
    desc1.className = "shortcut-description";
    desc1.textContent = "Toggle drawing mode";
    row1.appendChild(keys1);
    row1.appendChild(desc1);
    table.appendChild(row1);

    var row2 = document.createElement("tr");
    var keys2 = document.createElement("td");
    keys2.className = "shortcut-keys";
    keys2.textContent = "Click & Drag";
    var desc2 = document.createElement("td");
    desc2.className = "shortcut-description";
    desc2.textContent = "Draw rectangle";
    row2.appendChild(keys2);
    row2.appendChild(desc2);
    table.appendChild(row2);

    this.container.appendChild(table);
  }
});

QUnit.test("updates first shortcut-keys cell with given text", function(assert) {
  updateToggleShortcutDisplay(this.container, "Ctrl+Shift+D");

  var firstCell = this.container.querySelector(".shortcut-keys");
  assert.equal(firstCell.textContent, "Ctrl+Shift+D", "first cell updated");
});

QUnit.test("does not modify second shortcut-keys cell", function(assert) {
  updateToggleShortcutDisplay(this.container, "Ctrl+Shift+D");

  var cells = this.container.querySelectorAll(".shortcut-keys");
  assert.equal(cells[1].textContent, "Click & Drag", "second cell unchanged");
});

QUnit.test("does nothing when container is null", function(assert) {
  updateToggleShortcutDisplay(null, "Alt+F");
  assert.ok(true, "no error thrown");
});

QUnit.test("does nothing when shortcutText is empty", function(assert) {
  updateToggleShortcutDisplay(this.container, "");

  var firstCell = this.container.querySelector(".shortcut-keys");
  assert.equal(firstCell.textContent, "Alt + F", "cell unchanged for empty string");
});

QUnit.test("does nothing when container has no shortcuts tables", function(assert) {
  var emptyContainer = document.createElement("div");
  updateToggleShortcutDisplay(emptyContainer, "Alt+F");
  assert.ok(true, "no error thrown");
});

QUnit.test("only updates first table when multiple tables exist", function(assert) {
  // Add a second table
  var table2 = document.createElement("table");
  table2.className = "shortcuts-table";
  var row = document.createElement("tr");
  var keys = document.createElement("td");
  keys.className = "shortcut-keys";
  keys.textContent = "Escape";
  row.appendChild(keys);
  table2.appendChild(row);
  this.container.appendChild(table2);

  updateToggleShortcutDisplay(this.container, "Cmd+D");

  var tables = this.container.querySelectorAll(".shortcuts-table");
  assert.equal(tables[0].querySelector(".shortcut-keys").textContent, "Cmd+D", "first table updated");
  assert.equal(tables[1].querySelector(".shortcut-keys").textContent, "Escape", "second table untouched");
});

// --- checkShortcutStatus ---

QUnit.module("Discoverability - checkShortcutStatus", {
  beforeEach: function() {
    window.resetActionState();
  }
});

QUnit.test("sets warning badge when shortcut is blank", function(assert) {
  var done = assert.async();

  window.setMockCommands([
    { name: "toggle-drawing-mode", shortcut: "", description: "Toggle" }
  ]);

  checkShortcutStatus();

  setTimeout(function() {
    var state = window.getActionState();
    assert.equal(state.badgeText, "!", "badge shows warning");
    assert.equal(state.badgeBackgroundColor, "#E67700", "badge is orange");
    assert.ok(state.title.indexOf("No shortcut set") !== -1, "tooltip mentions no shortcut");
    done();
  }, 50);
});

QUnit.test("clears badge when shortcut is assigned", function(assert) {
  var done = assert.async();

  window.setMockCommands([
    { name: "toggle-drawing-mode", shortcut: "Alt+F", description: "Toggle" }
  ]);

  checkShortcutStatus();

  setTimeout(function() {
    var state = window.getActionState();
    assert.equal(state.badgeText, "", "badge is empty");
    assert.ok(state.title.indexOf("Alt+F") !== -1, "tooltip shows shortcut");
    done();
  }, 50);
});

QUnit.test("sets warning badge when toggle command is missing", function(assert) {
  var done = assert.async();

  window.setMockCommands([
    { name: "some-other-command", shortcut: "Ctrl+X", description: "Other" }
  ]);

  checkShortcutStatus();

  setTimeout(function() {
    var state = window.getActionState();
    assert.equal(state.badgeText, "!", "badge shows warning for missing command");
    done();
  }, 50);
});

// --- chrome.runtime.sendMessage mock for GET_SHORTCUT ---

QUnit.module("Discoverability - GET_SHORTCUT message", {
  beforeEach: function() {
    window.setMockCommands([
      { name: "toggle-drawing-mode", shortcut: "Ctrl+Shift+S", description: "Toggle" }
    ]);
  }
});

QUnit.test("returns configured shortcut via sendMessage", function(assert) {
  var done = assert.async();

  chrome.runtime.sendMessage({ type: "GET_SHORTCUT" }, function(response) {
    assert.equal(response.shortcut, "Ctrl+Shift+S", "shortcut returned");
    done();
  });
});

QUnit.test("returns empty string when shortcut is not set", function(assert) {
  var done = assert.async();

  window.setMockCommands([
    { name: "toggle-drawing-mode", shortcut: "", description: "Toggle" }
  ]);

  chrome.runtime.sendMessage({ type: "GET_SHORTCUT" }, function(response) {
    assert.equal(response.shortcut, "", "empty shortcut returned");
    done();
  });
});
