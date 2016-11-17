// Key: tabId
// Value: undefined/false for tab that are still loading, true for loaded tabs
var loadedTabs = [];

// Check if the given URL is accessible by this extension
function isAllowedUrl(url) {
	return url.startsWith('http');
}

// Run a callback on the given tab, depending if Reader View is enabled or not
function checkReaderView(tabId, enabledCallback, disabledCallback) {
	chrome.tabs.get(tabId, function(tab) {
		if (!isAllowedUrl(tab.url)) {
			chrome.browserAction.setIcon({path: 'img/icon.png' });
			chrome.browserAction.disable(tab.id);
			return;
		} 
		chrome.browserAction.enable(tab.id);
		chrome.tabs.executeScript(tab.id, { 
			code: "document.body.classList.contains('reader-view-enabled');"
		}, function(result) {
			if (!result) {
				return;
			}
			if (result[0]) {
				enabledCallback();
			} else {
				disabledCallback();
			}
		});
	}); 
}

function isProbablyReaderable(tabId) {
	chrome.tabs.executeScript(tabId, { code: 'isProbablyReaderable(' + tabId + ')' });
}

// Change the button icon whenever the content script asks for it
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// Extension button handling
	if (typeof request.buttonEnabled !== 'undefined') {
		if (request.buttonEnabled) {
			chrome.browserAction.setIcon({path: (request.alreadyFormatted ? 'img/icon-active.png' : 'img/icon.png') });
		} else {
			chrome.browserAction.setIcon({path: 'img/icon.png' });
		}
		if (typeof request.tabId !== 'undefined') {
			if (request.buttonEnabled) {
				chrome.browserAction.enable(request.tabId);
			} else {
				chrome.browserAction.disable(request.tabId);
			}
		}
	}
	// Popup handling
	if (typeof request.popup !== 'undefined') {
		chrome.browserAction.setPopup({
			popup: request.popup
		});
	}
});

// When changing tab, update the Reader View button appearance
chrome.tabs.onActivated.addListener(function(evt) {
	if (loadedTabs[evt.tabId]) {
		isProbablyReaderable();
	} else {
		chrome.browserAction.setIcon({path: 'img/icon.png' });
		chrome.browserAction.disable(evt.tabId);
	}
});

// Change the button icon whenever the tab is reloaded
chrome.tabs.onUpdated.addListener(function(tabId, info) {
	loadedTabs[tabId] = (info.status == "complete");
	chrome.tabs.get(tabId, function(tab) {
		if (!isAllowedUrl(tab.url)) {
			chrome.browserAction.setIcon({path: 'img/icon.png' });
			chrome.browserAction.disable(tab.id);
			return;
		} 
		if (info.status == "complete") {
			isProbablyReaderable(tabId);
		} else {
			chrome.browserAction.setIcon({path: 'img/icon.png' });
			chrome.browserAction.disable(tabId);
		}
	});
});

// When clicking the button, toggle the tab reader mode
chrome.browserAction.onClicked.addListener(function() {
	chrome.tabs.query({
		currentWindow: true,
		active: true
	// This will match all tabs to the pattern we specified
	}, function(tab) {
		// Go through all tabs that match the URL pattern
		for (var i = 0; i < tab.length; i++) {
			if (!tab[i] || !('id' in tab[i])) {
				continue;
			}
			var tabId = tab[i].id;
			chrome.browserAction.setIcon({path: 'img/icon.png' });
			chrome.browserAction.disable(tabId);
			checkReaderView(tabId, function() {
				// Reader View is enabled: let's disable it
				chrome.tabs.executeScript(tabId, { 
					code: 'window.location.reload()'
				}, function() {
					buttonEnabled = true;
				});
			}, function() {
				// Reader View is disabled: let's enable it
				setTimeout(function () {
					chrome.storage.sync.get({ 
						fontFamily: 'serif',
						fontSize: 16,
						color: 'sepia'
					}, function (prefs) {
						chrome.tabs.executeScript(tabId, { 
							code: 'openReaderView("' + prefs.fontFamily + '", ' + prefs.fontSize + ', "' + prefs.color + '")'
						});
					});
				}, 500);
			});
		}
	});
});