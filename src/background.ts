function isInjectableUrl(url?: string): boolean {
    if (!url) {
        return false;
    }

    try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'file:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

async function ensureContentScript(tabId: number): Promise<boolean> {
    const hasContentScript = await chrome.tabs
        .sendMessage(tabId, {command: 'ping'})
        .then((response) => Boolean(response?.ok))
        .catch(() => false);

    if (hasContentScript) {
        return true;
    }

    try {
        await chrome.scripting.executeScript({
            target: {tabId},
            files: ['content.js']
        });
        return true;
    } catch {
        return false;
    }
}

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !isInjectableUrl(tab.url)) {
        return;
    }

    const ready = await ensureContentScript(tab.id);
    if (!ready) {
        return;
    }

    await chrome.tabs.sendMessage(tab.id, {command: 'toggle_visibility'}).catch(() => undefined);
});
