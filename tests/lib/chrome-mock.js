/**
 * Chrome API Mocks for Testing
 *
 * Provides minimal stubs for chrome.storage, chrome.tabs, chrome.runtime,
 * chrome.commands, and chrome.action to enable testing of content scripts
 * and background scripts without loading as a Chrome extension.
 */
(function() {
  'use strict';

  // In-memory storage for test isolation
  var storage = {};

  // Configurable mock commands for chrome.commands.getAll
  var mockCommands = [
    { name: "toggle-drawing-mode", shortcut: "Alt+F", description: "Toggle rectangle drawing mode" }
  ];

  // Action state for assertions
  var actionState = {
    badgeText: "",
    badgeBackgroundColor: "",
    title: "SpotlightDraw - Toggle drawing mode"
  };

  window.chrome = {
    storage: {
      sync: {
        /**
         * Mock chrome.storage.sync.get
         * Merges defaults with stored values and invokes callback
         */
        get: function(defaults, callback) {
          var result = Object.assign({}, defaults, storage);
          // Async to match real API behavior
          setTimeout(function() {
            callback(result);
          }, 0);
        },

        /**
         * Mock chrome.storage.sync.set
         * Persists items to in-memory storage
         */
        set: function(items, callback) {
          Object.assign(storage, items);
          if (callback) {
            setTimeout(callback, 0);
          }
        },

        /**
         * Clear storage (for test isolation)
         */
        clear: function(callback) {
          storage = {};
          if (callback) {
            setTimeout(callback, 0);
          }
        }
      }
    },

    tabs: {
      /**
       * Mock chrome.tabs.sendMessage
       * Returns a Promise-like object for .catch() compatibility
       */
      sendMessage: function(tabId, message, callback) {
        if (callback) {
          setTimeout(function() { callback(); }, 0);
        }
        return { catch: function() {} };
      },

      /**
       * Mock chrome.tabs.create
       */
      create: function(options, callback) {
        if (callback) {
          setTimeout(function() { callback({ id: 999 }); }, 0);
        }
      },

      /**
       * Mock chrome.tabs.query
       */
      query: function(queryInfo, callback) {
        if (callback) {
          setTimeout(function() { callback([{ id: 1 }]); }, 0);
        }
      }
    },

    runtime: {
      /**
       * Mock chrome.runtime.onMessage
       */
      onMessage: {
        addListener: function(fn) {
          // Store listener for potential test triggering
          if (!window._mockMessageListeners) {
            window._mockMessageListeners = [];
          }
          window._mockMessageListeners.push(fn);
        }
      },

      /**
       * Mock chrome.runtime.sendMessage
       * Routes GET_SHORTCUT to mock commands data
       */
      sendMessage: function(message, callback) {
        if (message && message.type === "GET_SHORTCUT") {
          var shortcut = "";
          for (var i = 0; i < mockCommands.length; i++) {
            if (mockCommands[i].name === "toggle-drawing-mode") {
              shortcut = mockCommands[i].shortcut || "";
              break;
            }
          }
          if (callback) {
            setTimeout(function() { callback({ shortcut: shortcut }); }, 0);
          }
        } else if (callback) {
          setTimeout(function() { callback(); }, 0);
        }
      }
    },

    commands: {
      /**
       * Mock chrome.commands.getAll
       */
      getAll: function(callback) {
        setTimeout(function() {
          callback(mockCommands.slice());
        }, 0);
      }
    },

    action: {
      /**
       * Mock chrome.action.setBadgeText
       */
      setBadgeText: function(details) {
        actionState.badgeText = details.text || "";
      },

      /**
       * Mock chrome.action.setBadgeBackgroundColor
       */
      setBadgeBackgroundColor: function(details) {
        actionState.badgeBackgroundColor = details.color || "";
      },

      /**
       * Mock chrome.action.setTitle
       */
      setTitle: function(details) {
        actionState.title = details.title || "";
      },

      /**
       * Mock chrome.action.onClicked
       */
      onClicked: {
        addListener: function(fn) {
          if (!window._mockActionClickListeners) {
            window._mockActionClickListeners = [];
          }
          window._mockActionClickListeners.push(fn);
        }
      }
    }
  };

  /**
   * Test helper: Reset storage between tests
   */
  window.resetChromeStorage = function() {
    storage = {};
  };

  /**
   * Test helper: Get current storage state
   */
  window.getChromeStorage = function() {
    return Object.assign({}, storage);
  };

  /**
   * Test helper: Set storage state
   */
  window.setChromeStorage = function(items) {
    storage = Object.assign({}, items);
  };

  /**
   * Test helper: Set mock commands (for testing shortcut detection)
   */
  window.setMockCommands = function(commands) {
    mockCommands = commands.slice();
  };

  /**
   * Test helper: Get action state (for assertions on badge/title)
   */
  window.getActionState = function() {
    return Object.assign({}, actionState);
  };

  /**
   * Test helper: Reset action state
   */
  window.resetActionState = function() {
    actionState = {
      badgeText: "",
      badgeBackgroundColor: "",
      title: "SpotlightDraw - Toggle drawing mode"
    };
  };
})();
