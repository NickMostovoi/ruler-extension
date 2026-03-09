import {createRoot, Root} from 'react-dom/client';
import Ruler from './components/Ruler/Ruler';
import './styles/globals.scss';

const ROOT_ID = 'ext-ruler-root-mm';

let root: Root | null = null;

function mount(): void {
    if (root) return;

    const container = document.createElement('div');
    container.id = ROOT_ID;
    document.body.appendChild(container);

    root = createRoot(container);
    root.render(<Ruler/>);
}

function unmount(): void {
    if (!root) return;

    root.unmount();

    const el = document.getElementById(ROOT_ID);
    if (el?.parentNode) {
        el.parentNode.removeChild(el);
    }

    root = null;
}

chrome.runtime.onMessage.addListener((message: { command: string }) => {
    if (message.command === 'toggle_extension') {
        if (root) {
            unmount();
        } else {
            mount();
        }
    }

    return true;
});

mount();

// FONTS
const injectFonts = () => {
    if (document.getElementById('ruler-tool-mm-fonts')) return;

    const style = document.createElement('style');
    style.id = 'ruler-tool-mm-fonts';

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
        }
        @font-face {
          font-family: 'Open Sans Custom';
          src: url('${boldUrl}') format('woff2');
          font-weight: 700;
          font-style: normal;
        }
        @font-face {
          font-family: 'Open Sans Custom';
          src: url('${italicUrl}') format('woff2');
          font-weight: 400;
          font-style: italic;
        }
        @font-face {
          font-family: 'Open Sans Custom';
          src: url('${boldItalicUrl}') format('woff2');
          font-weight: 700;
          font-style: italic;
        }
    `;

    document.head.appendChild(style);
};

injectFonts();
