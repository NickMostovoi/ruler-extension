import {createRoot, Root} from 'react-dom/client';
import Ruler from './components/ruler/ruler';
import './styles/globals.scss';

const ROOT_ID = 'ext-ruler-root-mm';
const FONTS_STYLE_ID = 'ruler-tool-mm-fonts';
const TOGGLE_VISIBILITY_EVENT = 'ruler-extension:toggle-visibility';

let root: Root | null = null;
let mountObserver: MutationObserver | null = null;
let initialVisibleForMount = true;

function injectFonts(): void {
    if (document.getElementById(FONTS_STYLE_ID)) return;

    const head = document.head || document.documentElement;
    if (!head) return;

    const style = document.createElement('style');
    style.id = FONTS_STYLE_ID;

    const regularUrl = chrome.runtime.getURL('fonts/OpenSans-Regular.woff2');
    const boldUrl = chrome.runtime.getURL('fonts/OpenSans-Bold.woff2');
    const italicUrl = chrome.runtime.getURL('fonts/OpenSans-Italic.woff2');
    const boldItalicUrl = chrome.runtime.getURL('fonts/OpenSans-BoldItalic.woff2');

    style.textContent = `
        @font-face {
            font-family: 'Open Sans Custom';
            src: url('${regularUrl}') format('woff2');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
        }
        @font-face {
            font-family: 'Open Sans Custom';
            src: url('${boldUrl}') format('woff2');
            font-weight: 700;
            font-style: normal;
            font-display: swap;
        }
        @font-face {
            font-family: 'Open Sans Custom';
            src: url('${italicUrl}') format('woff2');
            font-weight: 400;
            font-style: italic;
            font-display: swap;
        }
        @font-face {
            font-family: 'Open Sans Custom';
            src: url('${boldItalicUrl}') format('woff2');
            font-weight: 700;
            font-style: italic;
            font-display: swap;
        }
    `;

    head.appendChild(style);
}

function cleanupMountObserver(): void {
    if (!mountObserver) {
        return;
    }

    mountObserver.disconnect();
    mountObserver = null;
}

function mountNow(): void {
    if (root || !document.body) {
        return;
    }

    injectFonts();

    const container = document.createElement('div');
    container.id = ROOT_ID;
    document.body.appendChild(container);

    root = createRoot(container);
    root.render(<Ruler initialVisible={initialVisibleForMount} />);
    cleanupMountObserver();
}

function ensureMounted(initialVisible = true): void {
    initialVisibleForMount = initialVisible;

    if (root) {
        return;
    }

    if (document.body) {
        mountNow();
        return;
    }

    if (mountObserver) {
        return;
    }

    mountObserver = new MutationObserver(() => {
        if (document.body) {
            mountNow();
        }
    });

    mountObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });

    document.addEventListener('DOMContentLoaded', mountNow, {once: true});
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.command === 'ping') {
        sendResponse({ok: true});
        return;
    }

    if (message?.command === 'toggle_visibility' || message?.command === 'toggle_extension') {
        if (!root) {
            ensureMounted(true);
        } else {
            window.dispatchEvent(new CustomEvent(TOGGLE_VISIBILITY_EVENT));
        }
    }
});
