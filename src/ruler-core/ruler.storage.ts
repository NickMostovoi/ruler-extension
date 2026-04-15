import {RulerSettings, ToolbarPosition} from './ruler.types';

type StorageKeyMap = Record<keyof RulerSettings, string>;

type StoredSettingsResult = {
    settings: RulerSettings;
    isToolbarHiddenToSide: boolean;
};

type DebouncedSettingsWriter = {
    schedule: (partial: Partial<RulerSettings>) => void;
    flush: () => Promise<void>;
    cancel: () => void;
};

export const UI_HIDDEN_STORAGE_KEY = 'ruler_uiHidden';

export const RULER_STORAGE_KEYS: StorageKeyMap = {
    overlayOpacity: 'ruler_opacity',
    lineColor: 'ruler_lineColor',
    lineThickness: 'ruler_lineThickness',
    cursorType: 'ruler_cursorType',
    toolbarExpanded: 'ruler_toolbarVisible',
    toolbarPosition: 'ruler_toolbarPosition',
    toggleHideToSideKey: 'ruler_toggleUiHiddenKey',
    linesVisible: 'ruler_linesVisible',
    shapeFillOpacity: 'shape_opacity',
    shapeFillColor: 'shape_color',
    attachNewShapesToPage: 'shape_attachToPage',
};

function isValidToolbarPosition(value: unknown): value is ToolbarPosition {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return typeof candidate.top === 'string' && typeof candidate.left === 'string';
}

function buildStoragePayload(partial: Partial<RulerSettings>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    (Object.keys(partial) as Array<keyof RulerSettings>).forEach((key) => {
        const storageKey = RULER_STORAGE_KEYS[key];
        const value = partial[key];

        if (value !== undefined) {
            payload[storageKey] = value;
        }
    });

    return payload;
}

function assignPartialSetting<K extends keyof RulerSettings>(
    target: Partial<RulerSettings>,
    key: K,
    value: RulerSettings[K]
): void {
    target[key] = value;
}

function mapStorageChangesToSettings(
    changes: Record<string, chrome.storage.StorageChange>
): Partial<RulerSettings> {
    const partial: Partial<RulerSettings> = {};

    (Object.entries(RULER_STORAGE_KEYS) as Array<[keyof RulerSettings, string]>).forEach(
        ([settingsKey, storageKey]) => {
            const change = changes[storageKey];

            if (!change) {
                return;
            }

            const nextValue = change.newValue;

            if (settingsKey === 'toolbarPosition') {
                if (isValidToolbarPosition(nextValue)) {
                    assignPartialSetting(partial, 'toolbarPosition', nextValue);
                }
                return;
            }

            assignPartialSetting(
                partial,
                settingsKey,
                nextValue as RulerSettings[typeof settingsKey]
            );
        }
    );

    return partial;
}

export function createDefaultRulerSettings(
    defaultToolbarPosition: ToolbarPosition
): RulerSettings {
    return {
        overlayOpacity: 0.1,
        lineColor: '#daa520',
        lineThickness: 1,
        cursorType: 'default',
        toolbarExpanded: false,
        toolbarPosition: defaultToolbarPosition,
        toggleHideToSideKey: 'KeyC',
        linesVisible: true,
        shapeFillOpacity: 0.5,
        shapeFillColor: '#000000',
        attachNewShapesToPage: false,
    };
}

export async function loadStoredRulerState(
    defaultSettings: RulerSettings
): Promise<StoredSettingsResult> {
    const requestedKeys = [...Object.values(RULER_STORAGE_KEYS), UI_HIDDEN_STORAGE_KEY];
    const items = await chrome.storage.local.get(requestedKeys);

    const getSafe = <T>(key: keyof RulerSettings, type: string): T => {
        const val = items[RULER_STORAGE_KEYS[key]];
        return (typeof val === type ? val : defaultSettings[key]) as T;
    };

    const settings: RulerSettings = {
        overlayOpacity: getSafe('overlayOpacity', 'number'),
        lineColor: getSafe('lineColor', 'string'),
        lineThickness: getSafe('lineThickness', 'number'),
        cursorType: getSafe('cursorType', 'string'),
        toolbarExpanded: getSafe('toolbarExpanded', 'boolean'),
        toggleHideToSideKey: getSafe('toggleHideToSideKey', 'string'),
        linesVisible: getSafe('linesVisible', 'boolean'),
        shapeFillOpacity: getSafe('shapeFillOpacity', 'number'),
        shapeFillColor: getSafe('shapeFillColor', 'string'),
        attachNewShapesToPage: getSafe('attachNewShapesToPage', 'boolean'),

        toolbarPosition: isValidToolbarPosition(items[RULER_STORAGE_KEYS.toolbarPosition])
            ? items[RULER_STORAGE_KEYS.toolbarPosition]
            : defaultSettings.toolbarPosition,
    };

    return {
        settings,
        isToolbarHiddenToSide: typeof items[UI_HIDDEN_STORAGE_KEY] === 'boolean'
            ? items[UI_HIDDEN_STORAGE_KEY]
            : false,
    };
}

export async function saveRulerSettings(
    partial: Partial<RulerSettings>
): Promise<void> {
    const payload = buildStoragePayload(partial);

    if (Object.keys(payload).length === 0) {
        return;
    }

    await chrome.storage.local.set(payload);
}

export async function saveSingleRulerSetting<K extends keyof RulerSettings>(
    key: K,
    value: RulerSettings[K]
): Promise<void> {
    await saveRulerSettings({[key]: value} as Pick<RulerSettings, K>);
}

export async function saveToolbarHiddenState(
    isHidden: boolean
): Promise<void> {
    await chrome.storage.local.set({[UI_HIDDEN_STORAGE_KEY]: isHidden});
}

export function createDebouncedRulerSettingsWriter(
    delayMs = 150
): DebouncedSettingsWriter {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let pending: Partial<RulerSettings> = {};

    const flush = async (): Promise<void> => {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }

        if (Object.keys(pending).length === 0) {
            return;
        }

        const snapshot = pending;
        pending = {};

        await saveRulerSettings(snapshot);
    };

    const schedule = (partial: Partial<RulerSettings>): void => {
        pending = {
            ...pending,
            ...partial,
        };

        if (timerId !== null) {
            clearTimeout(timerId);
        }

        timerId = setTimeout(() => {
            void flush();
        }, delayMs);
    };

    const cancel = (): void => {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }

        pending = {};
    };

    return {
        schedule,
        flush,
        cancel
    };
}

export function subscribeToRulerStorageChanges(
    onSettingsChange: (partial: Partial<RulerSettings>) => void,
    onToolbarHiddenToSideChange?: (isHidden: boolean) => void
): () => void {
    const handleStorageChange = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string
    ): void => {
        if (areaName !== 'local') {
            return;
        }

        const partialSettings = mapStorageChangesToSettings(changes);

        if (Object.keys(partialSettings).length > 0) {
            onSettingsChange(partialSettings);
        }

        const uiHiddenChange = changes[UI_HIDDEN_STORAGE_KEY];

        if (
            uiHiddenChange &&
            typeof uiHiddenChange.newValue === 'boolean' &&
            onToolbarHiddenToSideChange
        ) {
            onToolbarHiddenToSideChange(uiHiddenChange.newValue);
        }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
    };
}
