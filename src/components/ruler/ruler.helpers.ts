import {ToolbarPosition} from '../../ruler-core/ruler.types';

const TOOLBAR_WIDTH = 360;
const TOOLBAR_HEADER_HEIGHT = 58;
const HIDDEN_UI_HEIGHT = 84;
const PADDING = 10;
const HIDDEN_UI_BOTTOM_GAP = 4;

export const TOGGLE_VISIBILITY_EVENT = 'ruler-extension:toggle-visibility';

export function normalizeStoredKeyCode(value: unknown, fallback: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        return fallback;
    }

    const trimmed = value.trim();

    if (
        /^Key[A-Z]$/.test(trimmed) ||
        /^Digit[0-9]$/.test(trimmed) ||
        /^Arrow(Up|Down|Left|Right)$/.test(trimmed) ||
        /^(Space|Tab|Backspace|Delete|Escape|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backquote|Backslash)$/.test(trimmed)
    ) {
        return trimmed;
    }

    if (/^[A-Za-z]$/.test(trimmed)) {
        return `Key${trimmed.toUpperCase()}`;
    }

    if (/^[0-9]$/.test(trimmed)) {
        return `Digit${trimmed}`;
    }

    switch (trimmed.toUpperCase()) {
        case 'UP':
        case 'ARROWUP':
            return 'ArrowUp';
        case 'DOWN':
        case 'ARROWDOWN':
            return 'ArrowDown';
        case 'LEFT':
        case 'ARROWLEFT':
            return 'ArrowLeft';
        case 'RIGHT':
        case 'ARROWRIGHT':
            return 'ArrowRight';
        case 'SPACE':
            return 'Space';
        default:
            return fallback;
    }
}

export function getDefaultToolbarPosition(): ToolbarPosition {
    return {
        top: `calc(100vh - ${TOOLBAR_HEADER_HEIGHT + PADDING}px)`,
        left: '50%',
    };
}

export function getResponsiveToolbarWidth(): number {
    if (typeof window === 'undefined') {
        return TOOLBAR_WIDTH;
    }

    return Math.min(TOOLBAR_WIDTH, Math.max(0, window.innerWidth - PADDING * 2));
}

function normalizeToolbarTop(top: string): number {
    if (typeof window === 'undefined') {
        return PADDING;
    }

    if (top.includes('calc(')) {
        if (top.includes(`${HIDDEN_UI_HEIGHT}`)) {
            return window.innerHeight - HIDDEN_UI_HEIGHT - HIDDEN_UI_BOTTOM_GAP;
        }

        return window.innerHeight - TOOLBAR_HEADER_HEIGHT - PADDING;
    }

    const parsed = parseInt(top, 10);
    return Number.isNaN(parsed) ? PADDING : parsed;
}

export function getSafeToolbarPosition(position: ToolbarPosition): ToolbarPosition {
    const topNumber = normalizeToolbarTop(position.top);
    const toolbarWidth = getResponsiveToolbarWidth();

    let leftNumber: number;

    if (position.left === '50%') {
        leftNumber = Math.round(window.innerWidth / 2 - toolbarWidth / 2);
    } else {
        const parsedLeft = parseInt(position.left, 10);
        leftNumber = Number.isNaN(parsedLeft) ? PADDING : parsedLeft;
    }

    const safeTop = Math.max(
        PADDING,
        Math.min(topNumber, window.innerHeight - TOOLBAR_HEADER_HEIGHT - PADDING)
    );

    const safeLeft = Math.max(
        PADDING,
        Math.min(leftNumber, window.innerWidth - toolbarWidth - PADDING)
    );

    return {
        top: `${safeTop}px`,
        left: `${safeLeft}px`,
    };
}

export function getSafeHiddenToolbarTop(top: string): string {
    const topNumber = normalizeToolbarTop(top);

    const safeTop = Math.max(
        PADDING,
        Math.min(topNumber, window.innerHeight - HIDDEN_UI_HEIGHT - HIDDEN_UI_BOTTOM_GAP)
    );

    return `${safeTop}px`;
}
