/**
 * @fileOverview TabList extension main file.
 * @author Arthur (ax330d) Gerkis & Tiberia99
 * @version 1.0.9.1
 */

window.onload = function() {
  'use strict';

  /**
   * Version of extension.
   */
  const _extensionVersion = '1.0.9.1';

  /**
   * Tabs counter.
   */
  let _tabsCounter = 0;

  /**
   * Required to filter out ids which do not belong to current window.
   */
  let _currentWindowId = null;

  /**
   * Required to filter out ids which do not belong to current window.
   */
  let _listOfTabsIds = [];

  /**
   * Flag identifying if to show all windows.
   */
  let _doShowAllWindows = false;

  /**
   * Log all messages in debug mode.
   */
  let _isDebugMode = false;

  /**
   * Flag identifying if currently is discarding some tab.
   */
  let _isCurrentlyDiscarding = false;

  /**
   * Previous tab identifier (used in tab discarding).
   */
  let _previousTabId = -1;

  /**
   * Save Y position when we start to drag, later used to detect direction.
   */
  let _dragStartPositionY = -1;

  /**
   * Hash containing window id to tab id map.
   */
  let _windowToTabHash = {};

  /**
   * Drag-n-drop-related handlers.
   */
  let _dragHandlers = {

    /**
     * Handle dragstart event.
     * @param {Object} event Event object.
     */
    dragStart: function(event) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', this.getAttribute('data-tab-id'));
      _dragStartPositionY = event.pageY;
    },

    /**
     * Handle dragover event.
     * @param {Object} event Event object.
     */
    dragOver: function(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      return false;
    },

    /**
     * Handle drop event.
     * @param {Object} event Event object.
     */
    drop: function(event) {
      event.stopPropagation();

      let isMovingForward = false;
      /** We need to handle case when tab is being moved forward. */
      if (event.pageY > _dragStartPositionY) {
        isMovingForward = true;
      }

      let windowIdBeingDroppedTo = -1;
      let currentNodeIndex = -1;
      let margin = _int(getComputedStyle(document.querySelector('.data-container')).marginBottom);
      /** Get the next element to the drop position. */
      let element = document.elementFromPoint(event.x, event.y + margin);

      /** This is a normal drop to somewhere between containers, otherwise at the end. */
      if (element.id !== 'footer' && element.tagName !== 'BODY') {
        if (isMovingForward) {
          currentNodeIndex = _int(element.parentNode.previousSibling.getAttribute('data-tab-index'));
        } else {
          currentNodeIndex = _int(element.parentNode.getAttribute('data-tab-index'));
        }
        if (isNaN(currentNodeIndex)) {
          return false;
        }

        let closestElement = element.closest('[data-window-id]');
        if (closestElement) {
          windowIdBeingDroppedTo = _int(closestElement.getAttribute('data-window-id'));
        }

      } else {
        /** This is a drop after last tab. */
        let height = _int(getComputedStyle(document.querySelector('.data-container')).height);
        let closestElement = document.elementFromPoint(event.x, event.y - height).closest('[data-window-id]');
        if (closestElement) {
          windowIdBeingDroppedTo = _int(closestElement.getAttribute('data-window-id'));
        }

        let allDataWindows = document.querySelectorAll(`[data-window-id="${windowIdBeingDroppedTo}"]`);
        currentNodeIndex = _int(allDataWindows.item(allDataWindows.length - 1).getAttribute('data-tab-index'));
      }

      _dragStartPositionY = -1;
      chrome.tabs.move(_int(event.dataTransfer.getData('text/plain')), {
        index: currentNodeIndex,
        windowId: windowIdBeingDroppedTo
      });
      return false;
    }
  };

  /**
   * Prints text to console.
   * @param {string} text Text to print in console.
   */
  function _log(text) {
    if (!_isDebugMode) {
      return;
    }

    console.log(`TabList: ${text}`);
  }

  /**
   * Parses anything to a number with base 10.
   * @param {string} number String to convert to a number.
   */
  function _int(number) {
    return parseInt(number, 10);
  }

  /**
   * Updates tab box information.
   * @param {Object} tab Tab object.
   */
  function _updateTab(tab) {

    /** If we are discarding some tab, then it will get new id, replace id. */
    if (_isCurrentlyDiscarding) {
      _listOfTabsIds.splice(_listOfTabsIds.indexOf(_previousTabId), 1);
      _listOfTabsIds.push(tab.id);
      let dataContainer = document.querySelector(`[data-main-window-id="${tab.windowId}"] > [data-tab-id="${_previousTabId}"]`);
      if (dataContainer) {
        dataContainer.setAttribute('data-tab-id', tab.id);
        dataContainer.setAttribute('data-tab-index', tab.index);
        dataContainer.setAttribute('data-window-id', tab.windowId);
      }
    }

    if (_listOfTabsIds.includes(tab.id) === false) {
      return;
    }

    let dataContainer = document.querySelector(`[data-tab-id="${tab.id}"]`);

    let faviconContainerImage = dataContainer.querySelector('.favicon-container-image');
    faviconContainerImage.src = tab.favIconUrl || 'chrome://favicon';

    dataContainer.querySelector('.text-container-title').innerText = tab.title;
    dataContainer.querySelector('.text-container-url').innerText = tab.url;

    if (tab.url !== 'chrome://newtab/') {
      dataContainer.classList.remove('hidden-tab');
    } else {
      dataContainer.classList.add('hidden-tab');
    }

    {
      let textContainer = dataContainer.querySelector('.text-container');

      /** Update https status. */
      /*let textContainerLock = dataContainer.querySelector('.text-container-lock');
      if (textContainerLock) {
        textContainerLock.remove();
      }
      if (tab.url.indexOf('https://') === 0) {
        let textContainerLock = document.createElement('span');
        textContainer.insertBefore(textContainerLock, textContainer.firstChild);
        textContainerLock.innerText = 'lock';
        textContainerLock.classList.add('text-container-lock');
        textContainerLock.classList.add('material-icons');
        textContainerLock.title = 'This site uses HTTPS protocol for secure communication.';
      }*/

      /** Update audible status. */
      let textContainerAudible = dataContainer.querySelector('.text-container-audible');
      if (textContainerAudible) {
        textContainerAudible.remove();
      }
      if (tab.audible) {
        let textContainerAudible = document.createElement('span');
        textContainer.insertBefore(textContainerAudible, textContainer.firstChild);
        textContainerAudible.innerText = 'volume_up';
        textContainerAudible.classList.add('text-container-audible');
        textContainerAudible.classList.add('material-icons');
        textContainerAudible.title = 'Indicates that tab produced sound over the past couple of seconds.';
      }
    }

    dataContainer.classList.remove('discarded-tab');

    if (tab.discarded) {
      dataContainer.classList.add('discarded-tab');
    }
  }

  /**
   * Reloads tab.
   * @param {number} tabId Tab identifier.
   */
  function _reloadTab(tabId) {
    if (!tabId) {
      return;
    }

    chrome.tabs.reload(tabId);
  }

  /**
   * Discards tab. You can of course use this:
   * https://developers.google.com/web/updates/2015/09/tab-discarding
   * @param {number} tabId Tab identifier.
   */
  function _discardTab(tabId) {
    if (!chrome.tabs.discard) {
      return;
    }

    if (!tabId) {
      return;
    }

    _isCurrentlyDiscarding = true;
    _previousTabId = tabId;

    chrome.tabs.discard(tabId, function(tab) {
      if (tab.discarded) {
        let dataContainer = document.querySelector(`[data-tab-id="${tab.id}"]`);
        dataContainer.classList.add('discarded-tab');
      }
      _isCurrentlyDiscarding = false;
      _previousTabId = -1;
    });
  }

  /**
   * Closes tab and removes tab box.
   * @param {number} tabId Tab identifier.
   * @param {boolean} [force=false] Whether to close tab.
   */
  function _removeTab(tabId, force = false) {
    if (!tabId) {
      return;
    }

    _updateTabCounter(--_tabsCounter);

    const index = _listOfTabsIds.indexOf(tabId);
    _listOfTabsIds.splice(index, 1);

    if (force) {
      chrome.tabs.remove(tabId);
    }

    let node = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (node) {
      node.remove();
    }
  }

  /**
   * Adds a new container for tab information.
   * @param {Object} tab The tab object.
   */
  function _addTab(tab) {

    _updateTabCounter(++_tabsCounter);

    _listOfTabsIds.push(tab.id);

    /** General data container. */
    let dataContainer = document.createElement('div');
    dataContainer.classList.add('data-container');
    dataContainer.setAttribute('data-tab-id', tab.id);
    dataContainer.setAttribute('data-tab-index', tab.index);
    dataContainer.setAttribute('data-window-id', tab.windowId);
    dataContainer.addEventListener('dragstart', _dragHandlers.dragStart, false);

    /** Dont show "newtab" tab. */
    if (tab.url === 'chrome://newtab/') {
      dataContainer.classList.add('hidden-tab');
    }

    if (tab.index === 0) {
      _getWindowContainer(tab.windowId).appendChild(dataContainer);
    } else {
      let openerContainer = document.querySelector(`[data-main-window-id="${tab.windowId}"] > [data-tab-index="${tab.index - 1}"]`);
      openerContainer.parentNode.insertBefore(dataContainer, openerContainer.nextSibling);
    }

    if (tab.discarded) {
      dataContainer.classList.add('discarded-tab');
    }

    /** Work on favicon. */
    {
      let faviconContainer = dataContainer.appendChild(document.createElement('div'));
      faviconContainer.classList.add('favicon-container');

      let faviconContainerImage = faviconContainer.appendChild(document.createElement('img'));
      faviconContainerImage.classList.add('favicon-container-image');
      if (tab.incognito) {
        faviconContainerImage.src = tab.favIconUrl || `chrome://favicon/size/64@1x/${tab.url}`;
      } else {
        faviconContainerImage.src = `chrome://favicon/size/64@1x/${tab.url}`;
      }
      faviconContainerImage.title = 'Switch to this tab';
      faviconContainerImage.onclick = function(event) {
        chrome.tabs.update(tab.id, {
          selected: true
        });
      };
    }

    /** Work on text data. */
    {
      let textContainer = dataContainer.appendChild(document.createElement('div'));
      textContainer.classList.add('text-container');
      textContainer.title = tab.title;
      textContainer.onclick = function(event) {
        chrome.tabs.update(tab.id, {
          selected: true
        });
      };

      /*if (tab.url.indexOf('https://') === 0) {
        let textContainerLock = textContainer.appendChild(document.createElement('span'));
        textContainerLock.innerText = 'lock';
        textContainerLock.classList.add('text-container-lock');
        textContainerLock.classList.add('material-icons');
        textContainerLock.title = 'This site uses HTTPS protocol for secure communication.';
      }*/

      if (tab.audible) {
        let textContainerAudible = textContainer.appendChild(document.createElement('span'));
        textContainerAudible.innerText = 'volume_up';
        textContainerAudible.classList.add('text-container-audible');
        textContainerAudible.classList.add('material-icons');
        textContainerAudible.title = 'Indicates that tab produced sound over the past couple of seconds.';
      }

      let textContainerTitle = textContainer.appendChild(document.createElement('span'));
      textContainerTitle.classList.add('text-container-title');
      textContainerTitle.innerText = tab.title;

      textContainer.appendChild(document.createElement('br'));

      let textContainerUrl = textContainer.appendChild(document.createElement('span'));
      textContainerUrl.classList.add('text-container-url');
      textContainerUrl.innerText = tab.url;
    }

    /** Work on options container. */
    {
      let optionsContainer = dataContainer.appendChild(document.createElement('div'));
      optionsContainer.classList.add('options-container');

      /** Set up drag tab icon. */
      let optionsContainerDrag = optionsContainer.appendChild(document.createElement('span'));
      optionsContainerDrag.innerText = 'drag_handle';
      optionsContainerDrag.classList.add('options-container-drag');
      optionsContainerDrag.classList.add('material-icons');
      optionsContainerDrag.title = 'Drag tab';
      optionsContainerDrag.addEventListener('dragover', _dragHandlers.dragOver, false);
      optionsContainerDrag.onmouseover = function(event) {
        dataContainer.setAttribute('draggable', 'true');
      };
      optionsContainerDrag.onmouseleave = function(event) {
        dataContainer.removeAttribute('draggable');
      };

      /* Set up reload tab icon. */
      let optionsContainerReload = optionsContainer.appendChild(document.createElement('span'));
      optionsContainerReload.innerText = 'refresh';
      optionsContainerReload.classList.add('options-container-reload');
      optionsContainerReload.classList.add('material-icons');
      optionsContainerReload.title = 'Reload tab';
      optionsContainerReload.onclick = function(event) {
        _reloadTab(_getTabId(this));
      };

      /** Set up discard tab memory icon. */
      let optionsContainerDiscard = optionsContainer.appendChild(document.createElement('span'));
      optionsContainerDiscard.innerText = 'memory';
      optionsContainerDiscard.classList.add('options-container-discard');
      optionsContainerDiscard.classList.add('material-icons');
      optionsContainerDiscard.title = 'Discard tab';
      optionsContainerDiscard.onclick = function(event) {
        _discardTab(_getTabId(this));
      };

      /** Set up close tab icon. */
      let optionsContainerCross = optionsContainer.appendChild(document.createElement('span'));
      optionsContainerCross.innerText = 'close';
      optionsContainerCross.classList.add('options-container-cross');
      optionsContainerCross.classList.add('material-icons');
      optionsContainerCross.title = 'Close tab';
      optionsContainerCross.onclick = function(event) {
        _removeTab(_getTabId(this), true);
      };
    }
  }

  /**
   * Gets current tab identifier for container attribute.
   * @param {Object} node Node.
   * @returns {number} Tab ID.
   */
  function _getTabId(node) {
    let containerDiv = node.parentNode.parentNode;
    let tabId = null;
    if (containerDiv) {
      tabId = _int(containerDiv.getAttribute('data-tab-id'));
    }
    return tabId;
  }

  /**
   * Updates tabs counter.
   * @param {number} counter Tab counter.
   */
  function _updateTabCounter(counter) {
    let text = ' open tab';
    if (counter % 10 !== 1 && counter !== 11) {
      text += 's';
    }
    let numberOfTabs = document.getElementById('number-of-tabs');
    if (!numberOfTabs) {
      return false;
    }
    numberOfTabs.innerText = counter + text;
  }

  /**
   * Updates current window ID.
   */
  function _update_currentWindowId() {
    /** Get id of current window because we need only tabs for current one. */
    chrome.windows.getCurrent({}, function(window) {
      _currentWindowId = window.id;
    });
  }

  /**
   * Iterates over bookmarks and creates menus.
   * @param {number} bookmarkId identifier of bookmark.
   * @param {number} parentNode Reference to the parent node.
   */
  function _iterateBookmarksAndAppendToMenu(bookmarkId, parentNode) {
    chrome.bookmarks.getChildren(bookmarkId, function(bookmarks) {
      if (!bookmarks.length) {
        return;
      }

      let ul = parentNode.appendChild(document.createElement('ul'));

      bookmarks.forEach(function(bookmark) {

        let li = ul.appendChild(document.createElement('li'));
        if (_int(bookmarkId) === 1) {
          li.classList.add('bookmark-container');
        }

        let link = li.appendChild(document.createElement('a'));
        if (bookmark.url) {
          link.href = bookmark.url;
          link.title = bookmark.title;
        }
        if (!bookmark.title) {
          link.classList.add('no-title');
        }
        link.innerText = bookmark.title || '(no title)';

        /** If this is folder, continue recursively. */
        if (!bookmark.url) {
          li.classList.add('folder');
          li.onmouseover = function() {
            _calculateOverflowAndFix(this.children[1]);
          };
          _iterateBookmarksAndAppendToMenu(bookmark.id, li);
          return;
        }

        /** This is just link. */
        li.setAttribute('style', `background-image: -webkit-image-set(url("chrome://favicon/size/16@1x/${bookmark.url}") 1x, url("chrome://favicon/size/16@2x/${bookmark.url}") 2x);`);
        li.classList.add('link');

        link.onclick = function(event) {
          event.preventDefault();
          chrome.tabs.create({
            active: false,
            url: bookmark.url
          });
        };

      }); /** bookmarks */
    }); /** getChildren */
  }

  /**
   * Loads bookmarks.
   */
  function _loadBookmarks() {

    let box = document.getElementById('box');
    box.innerHTML = '';

    let bookmarksContainer = box.appendChild(document.createElement('div'));
    bookmarksContainer.id = 'bookmarks-container';

    let menu = bookmarksContainer.appendChild(document.createElement('nav'));
    menu.id = 'bookmarks-menu';

    _iterateBookmarksAndAppendToMenu('1', menu);
  }

  /**
   * Check if element overflows window width and fix it.
   * @param {Object} node Node.
   */
  function _calculateOverflowAndFix(node) {
    if (!node) {
      return;
    }

    let dimensions = node.getBoundingClientRect();
    if (dimensions.left + dimensions.width > window.innerWidth) {
      let parentDimensions = node.parentNode.getBoundingClientRect();
      if (node.parentNode.classList.contains('bookmark-container')) {
        node.setAttribute('style', `left: -${dimensions.width - parentDimensions.width}px`);
      } else {
        node.setAttribute('style', `left: -${dimensions.width}px`);
      }
    }
  }

  /**
   * Returns windows container corresponding to the given id.
   * @param {integer} windowId ID of the window.
   * @returns {Object} Container element.
   */
  function _getWindowContainer(windowId) {
    if (!Object.keys(_windowToTabHash).includes(windowId)) {
      let windowFrame = document.getElementById('box').appendChild(document.createElement('div'));
      if (_doShowAllWindows) {
        let header = windowFrame.appendChild(document.createElement('h2'));
        header.innerText = `Window (ID ${windowId})`;
        header.classList.add('window-header');
        windowFrame.classList.add('window-frame');
      }
      windowFrame.setAttribute('data-main-window-id', windowId);
      return windowFrame;
    }

    return document.querySelector(`[data-main-window-id="${windowId}"]`);
  }

  /**
   * Re-set tab container index attributes.
   */
  function _refreshTabIndexes(windowId = _currentWindowId) {
    chrome.tabs.query({
      windowId: windowId
    }, function(tabs) {
      for (let i = 0; i < tabs.length; i++) {
        let element = document.querySelector(`[data-main-window-id="${windowId}"] > [data-tab-id="${tabs[i].id}"]`);
        element.setAttribute('data-tab-index', tabs[i].index);
      }
    });
  }

  /**
   * Creates list of tabs.
   */
  function _makeListOfTabs() {
    chrome.tabs.query({
      url: '<all_urls>'
    }, function(tabs) {

      tabs.forEach(function(tab) {

        /** Filter out other windows. */
        if (_currentWindowId !== tab.windowId && !_doShowAllWindows) {
          return;
        }

        if (tab.windowId in _windowToTabHash === false) {
          _windowToTabHash[tab.windowId] = [];
        }

        _addTab(tab);
        _windowToTabHash[tab.windowId].push(tab.id);
      });
    });

    _updateTabCounter(_tabsCounter);
  }

  /**
   * Triggers on chrome.tabs.onRemoved event.
   * @param {number} tabId Tab identifier.
   */
  function onRemoved(tabId) {

    _log(`global onRemoved ${tabId}`);

    if (_listOfTabsIds.includes(tabId) === false && !_doShowAllWindows) {
      return;
    }

    _log(`local onRemoved ${tabId}`);

    _removeTab(tabId);
    _refreshTabIndexes();
  }

  /**
   * Triggers on chrome.tabs.onDetached event.
   * @param {number} tabId Tab identifier.
   */
  function onDetached(tabId) {

    _log(`global onDetached ${tabId}`);

    chrome.tabs.getCurrent(function(tab) {
      if (tab.id === tabId) {
        _log('Detached current tab');
        // FIXME: this is ugly.
        location.reload();
      }
    });

    if (_listOfTabsIds.includes(tabId) === false && !_doShowAllWindows) {
      return;
    }

    _log(`local onDetached ${tabId}`);

    _removeTab(tabId);
    _refreshTabIndexes();
  }

  /**
   * Triggers on chrome.tabs.onAttached event.
   * @param {Object} tab The tab object.
   */
  function onAttached(tab) {

    _log(`global onAttached ${tab.id}`);

    _update_currentWindowId();

    /** Filter out other windows. */
    if (_currentWindowId !== tab.windowId) {
      // FIXME: this all is ugly.
      if (typeof tab.id === 'undefined') {
        _log('Tab from other window is attached, need to refresh layout');
        location.reload();
      }
      if (!_doShowAllWindows) {
        return;
      }
    }

    _log(`local onAttached ${tab.id}`);

    _addTab(tab);
  }

  /**
   * Triggers on chrome.tabs.onCreated event.
   * @param {Object} tab The tab object.
   */
  function onCreated(tab) {

    _log(`global onCreated ${tab.id}`);

    /** Filter out other windows. */
    if (_currentWindowId !== tab.windowId && !_doShowAllWindows) {
      return;
    }

    _log(`local onCreated ${tab.id}`);

    _addTab(tab);
  }

  /**
   * Triggers on chrome.tabs.onUpdated event.
   * @param {number} tabId Tab identifier.
   * @param {Object} changeInfo The info about changes.
   * @param {Object} tab The tab object.
   */
  function onUpdated(tabId, changeInfo, tab) {

    _log(`global onUpdated ${tabId}`);

    /** Filter out other windows. */
    if (_currentWindowId !== tab.windowId && !_doShowAllWindows) {
      return;
    }

    _log(`local onUpdated ${tabId}`);

    _updateTab(tab);
  }

  /**
   * Triggers on chrome.tabs.onMoved event.
   * @param {number} tabId Tab identifier.
   * @param {Object} moveInfo The info about changes.
   */
  function onMoved(tabId, moveInfo) {

    _log(`global onMoved ${tabId}`);

    /** Filter out other windows. */
    if (_currentWindowId !== moveInfo.windowId && !_doShowAllWindows) {
      return;
    }

    _log(`local onMoved ${tabId}`);

    /** Move nodes where needed. */
    let toIndexElement = document.querySelector(`[data-main-window-id="${moveInfo.windowId}"] > [data-tab-index="${moveInfo.toIndex}"]`);
    if (moveInfo.toIndex > moveInfo.fromIndex) {
      toIndexElement = toIndexElement.nextSibling;
    }
    let fromIndexElement = document.querySelector(`[data-main-window-id="${moveInfo.windowId}"] > [data-tab-index="${moveInfo.fromIndex}"]`);
    if (fromIndexElement && toIndexElement) {
      toIndexElement.parentNode.insertBefore(fromIndexElement, toIndexElement);
    }
    if (fromIndexElement && !toIndexElement) {
      let parentElement = document.querySelector(`[data-main-window-id="${moveInfo.windowId}"]`);
      parentElement.insertBefore(fromIndexElement, null);
    }

    _refreshTabIndexes(moveInfo.windowId);
  }

  chrome.storage.onChanged.addListener(function() {
    location.reload();
  });
  chrome.tabs.onRemoved.addListener(onRemoved);
  chrome.tabs.onDetached.addListener(onDetached);
  chrome.tabs.onAttached.addListener(onAttached);
  chrome.tabs.onCreated.addListener(onCreated);
  chrome.tabs.onUpdated.addListener(onUpdated);
  chrome.tabs.onMoved.addListener(onMoved);

  (function() {
    _log('just loaded');

    _doShowAllWindows = false;
    _tabsCounter = 0;
    _currentWindowId = null;
    _listOfTabsIds = [];

    document.body.addEventListener('dragover', _dragHandlers.dragOver, false);
    document.body.addEventListener('drop', _dragHandlers.drop, false);

    document.getElementById('footer-version').innerText = `TabList v. ${_extensionVersion}`;

    ['about', 'help'].forEach(function(name) {
      document.querySelector(`#footer-${name}`).onclick = function(event) {
        event.preventDefault();
        document.getElementById(name).classList.remove('hidden');
      };
      document.querySelector(`#${name}-close`).onclick = function(event) {
        document.getElementById(name).classList.add('hidden');
      };
    });

    _update_currentWindowId();

    chrome.storage.sync.get({
      showBookmarks: false,
      showAllWindows: false,
      allowDebugLogs: false,
      showPageHeader: true
    }, function(items) {

      if (items.showBookmarks) {
        _loadBookmarks();
      }

      _doShowAllWindows = items.showAllWindows || false;
      _isDebugMode = items.allowDebugLogs || false;

      if (!items.showPageHeader) {
        document.querySelector('#header').classList.add('hidden');
      }

      _makeListOfTabs();
    });
  })();
};
