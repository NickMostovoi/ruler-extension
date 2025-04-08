chrome.action.onClicked.addListener(async (tab) => {
    const target = { tabId: tab.id };

    try {
        await chrome.scripting.insertCSS({
            target,
            files: ['styles.css']
        });

        await chrome.scripting.executeScript({
            target,
            files: ['content.js']
        });
    } catch (error) {
        console.error("Failed to inject script: ", error);
    }
});
