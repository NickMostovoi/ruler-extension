chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || tab.url?.startsWith('chrome://')) return;

    try {
        await chrome.tabs.sendMessage(tab.id, { command: 'toggle_extension' });
    } catch {
        await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content.css']
        });

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
    }
});
