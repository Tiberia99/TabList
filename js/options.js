/**
 * @fileOverview TabList extension options handling file.
 * @author Arthur (ax330d) Gerkis
 * @version 1.0.9
 */

/**
 * Restores select box and checkbox state using the preferences stored in
 * chrome.storage.
 */
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get({
    showBookmarks: false,
    showAllWindows: false,
    allowDebugLogs: false,
    showPageHeader: true
  }, function(items) {
    document.getElementById('show-bookmarks').checked = items.showBookmarks;
    document.getElementById('show-all-windows').checked = items.showAllWindows;
    //document.getElementById('allow-debug-logs').checked = items.allowDebugLogs;
    document.getElementById('show-page-header').checked = items.showPageHeader;
  });
});

/**
 * Saves options to chrome.storage.
 */
window.onload = function() {
  ['show-bookmarks',
    'show-all-windows',
    //'allow-debug-logs',
    'show-page-header'
  ].forEach(function(key) {
    document.getElementById(key).onclick = function(event) {
      chrome.storage.sync.set({
        showBookmarks: document.getElementById('show-bookmarks').checked,
        showAllWindows: document.getElementById('show-all-windows').checked,
        //allowDebugLogs: document.getElementById('allow-debug-logs').checked,
        showPageHeader: document.getElementById('show-page-header').checked
      }, function() {
        // ...
      });
    };
  });
};
