import {createRoot, Root} from 'react-dom/client';
import Ruler from './components/Ruler/Ruler';
import './styles/globals.scss';

const ROOT_ID = 'ruler-root';

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
});
