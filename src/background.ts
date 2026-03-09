async function ensureContentScript(tabId: number): Promise<void> {
    const hasContentScript = await chrome.tabs
        .sendMessage(tabId, { command: 'ping' })
        .then((response) => Boolean(response?.ok))
        .catch(() => false);

    if (hasContentScript) return;

    await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content.css']
    });

    await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
    });
}

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) {
        return;
    }

    await ensureContentScript(tab.id);

    await chrome.tabs.sendMessage(tab.id, { command: 'toggle_extension' });
});
