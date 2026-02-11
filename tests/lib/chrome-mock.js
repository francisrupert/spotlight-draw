/**
 * Chrome API Mocks for Testing
 *
 * Provides minimal stubs for chrome.storage, chrome.tabs, and chrome.runtime
 * to enable testing of content scripts without loading as a Chrome extension.
 */
(function() {
  'use strict';

  // In-memory storage for test isolation
  var storage = {};

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
       */
      sendMessage: function(tabId, message, callback) {
        if (callback) {
          setTimeout(function() { callback(); }, 0);
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
})();
