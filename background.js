const activeTabs = new Set();

async function cleanupTab(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, {command: 'cleanup_extension'});
    } catch (error) {
        console.warn(`Failed to send cleanup message to tab ${tabId}: ${error}`);
    }

    activeTabs.delete(tabId);
}

async function injectScripts(tabId, target) {
    try {
        await chrome.scripting.insertCSS({target, files: ['styles.css']});
        await chrome.scripting.executeScript({target, files: ['shapes.js', 'content.js']});
        activeTabs.add(tabId);
    } catch (error) {
        console.error(`Failed to inject scripts into tab ${tabId}: ${error.message}`);
        activeTabs.delete(tabId);
    }
}

chrome.action.onClicked.addListener((tab) => {
    const tabId = tab.id;
    const target = {tabId: tabId};

    activeTabs.has(tabId) ? cleanupTab(tabId, target) : injectScripts(tabId, target);
});
