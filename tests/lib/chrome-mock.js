/**
 * Chrome API Mocks for Testing
 *
 * Provides minimal stubs for chrome.storage, chrome.tabs, chrome.runtime,
 * and chrome.action to enable testing of content scripts and background
 * scripts without loading as a Chrome extension.
 */
(function() {
  'use strict';

  // In-memory storage for test isolation
  var storage = {};
  var nextStorageError = null;

  function withStorageError(callback) {
    if (!nextStorageError) {
      callback();
      return;
    }

    window.chrome.runtime.lastError = { message: nextStorageError };
    nextStorageError = null;
    callback();
    delete window.chrome.runtime.lastError;
  }

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
            withStorageError(function() {
              callback(result);
            });
          }, 0);
        },

        /**
         * Mock chrome.storage.sync.set
         * Persists items to in-memory storage
         */
        set: function(items, callback) {
          setTimeout(function() {
            withStorageError(function() {
              if (!window.chrome.runtime.lastError) {
                Object.assign(storage, items);
              }
              if (callback) callback();
            });
          }, 0);
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

      sendMessage: function(message, callback) {
        if (callback) {
          setTimeout(function() { callback(); }, 0);
        }
      }
    },

    action: {
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
    nextStorageError = null;
    delete window.chrome.runtime.lastError;
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

  window.setChromeStorageError = function(message) {
    nextStorageError = message;
  };

})();
