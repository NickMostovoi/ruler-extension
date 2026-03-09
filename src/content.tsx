import {createRoot, Root} from 'react-dom/client';
import Ruler from './components/Ruler/Ruler';
import './styles/globals.scss';

const ROOT_ID = 'ext-ruler-root-mm';
const FONTS_STYLE_ID = 'ruler-tool-mm-fonts';

let root: Root | null = null;

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

function mount(): void {
    if (root || !document.body) return;

    injectFonts();

    const container = document.createElement('div');
    container.id = ROOT_ID;
    document.body.appendChild(container);

    root = createRoot(container);
    root.render(<Ruler />);
}

function unmount(): void {
    if (root) {
        root.unmount();
        root = null;
    }

    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(FONTS_STYLE_ID)?.remove();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.command === 'ping') {
        sendResponse({ ok: true });
        return;
    }

    if (message?.command === 'toggle_extension') {
        if (root) {
            unmount();
        } else {
            mount();
        }
    }
});
