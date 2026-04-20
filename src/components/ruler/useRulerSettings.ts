import {
    useCallback,
    useEffect,
    useRef,
    useState,
    Dispatch,
    SetStateAction
} from 'react';

import {
    RulerSettings,
    ToolbarPosition,
} from '../../ruler-core/ruler.types';

import {
    createDebouncedRulerSettingsWriter,
    createDefaultRulerSettings,
    loadStoredRulerState,
    saveRulerSettings,
    saveSingleRulerSetting,
    saveToolbarHiddenState,
    subscribeToRulerStorageChanges,
} from '../../ruler-core/ruler.storage';

import {
    getDefaultToolbarPosition,
    getSafeHiddenToolbarTop,
    getSafeToolbarPosition,
    normalizeStoredKeyCode,
} from './ruler.helpers';

interface UseRulerSettingsParams {
    initialVisible?: boolean;
}

interface UseRulerSettingsResult {
    settings: RulerSettings;
    isReady: boolean;
    isExtensionVisible: boolean;
    isToolbarHiddenToSide: boolean;
    clearShapesCounter: number;
    setIsExtensionVisible: Dispatch<SetStateAction<boolean>>;
    handleToolbarChange: (partialSettings: Partial<RulerSettings>) => void;
    handleClearShapes: () => void;
    handleResetPosition: () => Promise<void>;
    handleToolbarReset: () => Promise<void>;
    toggleToolbarHiddenToSide: () => Promise<void>;
}

const DEFAULT_TOOLBAR_POSITION = getDefaultToolbarPosition();
const DEFAULT_RULER_SETTINGS = createDefaultRulerSettings(DEFAULT_TOOLBAR_POSITION);

const DEBOUNCED_SETTING_KEYS = new Set<keyof RulerSettings>([
    'overlayOpacity',
    'lineThickness',
    'shapeFillOpacity',
]);

export function useRulerSettings({
    initialVisible = true,
}: UseRulerSettingsParams = {}): UseRulerSettingsResult {
    const [settings, setSettings] = useState<RulerSettings>(DEFAULT_RULER_SETTINGS);
    const [clearShapesCounter, setClearShapesCounter] = useState(0);
    const [isToolbarHiddenToSide, setIsToolbarHiddenToSide] = useState(false);
    const [isExtensionVisible, setIsExtensionVisible] = useState(initialVisible);
    const [isReady, setIsReady] = useState(false);

    const toolbarPositionRef = useRef<ToolbarPosition>(DEFAULT_RULER_SETTINGS.toolbarPosition);
    const lastVisibleToolbarPositionRef = useRef<ToolbarPosition>(
        DEFAULT_RULER_SETTINGS.toolbarPosition
    );
    const resizeTimerRef = useRef<number | null>(null);
    const debouncedSettingsWriterRef =
        useRef<ReturnType<typeof createDebouncedRulerSettingsWriter> | null>(null);

    const normalizeToolbarPosition = useCallback((position: ToolbarPosition): ToolbarPosition => {
        if (position.left === '50%') {
            return position;
        }

        return getSafeToolbarPosition(position);
    }, []);

    const normalizeSettingsPartial = useCallback((partial: Partial<RulerSettings>) => {
        const normalizedPartial: Partial<RulerSettings> = {...partial};

        if (partial.toolbarPosition) {
            normalizedPartial.toolbarPosition = normalizeToolbarPosition(partial.toolbarPosition);
        }

        if (partial.toggleHideToSideKey !== undefined) {
            normalizedPartial.toggleHideToSideKey = normalizeStoredKeyCode(
                partial.toggleHideToSideKey,
                DEFAULT_RULER_SETTINGS.toggleHideToSideKey
            );
        }

        return normalizedPartial;
    }, [normalizeToolbarPosition]);

    const applySettingsPartial = useCallback((partial: Partial<RulerSettings>) => {
        const normalizedPartial = normalizeSettingsPartial(partial);

        setSettings((previousSettings) => ({
            ...previousSettings,
            ...normalizedPartial,
        }));
    }, [normalizeSettingsPartial]);

    const persistSetting = useCallback(<K extends keyof RulerSettings>(
        key: K,
        value: RulerSettings[K]
    ) => {
        if (DEBOUNCED_SETTING_KEYS.has(key) && debouncedSettingsWriterRef.current) {
            debouncedSettingsWriterRef.current.schedule({[key]: value} as Pick<RulerSettings, K>);
            return;
        }

        void saveSingleRulerSetting(key, value);
    }, []);

    const setSetting = useCallback(<K extends keyof RulerSettings>(
        key: K,
        value: RulerSettings[K]
    ) => {
        applySettingsPartial({[key]: value} as Pick<RulerSettings, K>);
        persistSetting(key, value);
    }, [applySettingsPartial, persistSetting]);

    useEffect(() => {
        debouncedSettingsWriterRef.current = createDebouncedRulerSettingsWriter();

        return () => {
            const writer = debouncedSettingsWriterRef.current;

            if (!writer) {
                return;
            }

            void writer.flush();
            writer.cancel();
        };
    }, []);

    useEffect(() => {
        toolbarPositionRef.current = settings.toolbarPosition;

        if (!isToolbarHiddenToSide) {
            lastVisibleToolbarPositionRef.current = settings.toolbarPosition;
        }
    }, [isToolbarHiddenToSide, settings.toolbarPosition]);

    useEffect(() => {
        let isMounted = true;

        const loadSettings = async () => {
            const storedState = await loadStoredRulerState(DEFAULT_RULER_SETTINGS);

            if (!isMounted) {
                return;
            }

            const normalizedToolbarPosition = normalizeToolbarPosition(
                storedState.settings.toolbarPosition
            );

            const normalizedSettings = normalizeSettingsPartial({
                ...storedState.settings,
                toolbarPosition: normalizedToolbarPosition,
            });

            setSettings((previousSettings) => ({
                ...previousSettings,
                ...normalizedSettings,
            }));

            toolbarPositionRef.current =
                normalizedSettings.toolbarPosition ?? DEFAULT_RULER_SETTINGS.toolbarPosition;

            lastVisibleToolbarPositionRef.current =
                normalizedSettings.toolbarPosition ?? DEFAULT_RULER_SETTINGS.toolbarPosition;

            setIsToolbarHiddenToSide(storedState.isToolbarHiddenToSide);
            setIsReady(true);
        };

        void loadSettings();

        return () => {
            isMounted = false;
        };
    }, [normalizeSettingsPartial, normalizeToolbarPosition]);

    useEffect(() => {
        const unsubscribe = subscribeToRulerStorageChanges(
            (partialSettings) => {
                applySettingsPartial(partialSettings);
            },
            (isHidden) => {
                setIsToolbarHiddenToSide(isHidden);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [applySettingsPartial]);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        const handleResize = () => {
            if (resizeTimerRef.current !== null) {
                window.clearTimeout(resizeTimerRef.current);
            }

            resizeTimerRef.current = window.setTimeout(() => {
                const currentPosition = toolbarPositionRef.current;

                if (isToolbarHiddenToSide) {
                    const nextHiddenTop = getSafeHiddenToolbarTop(currentPosition.top);

                    if (nextHiddenTop !== currentPosition.top) {
                        setSetting('toolbarPosition', {
                            top: nextHiddenTop,
                            left: currentPosition.left,
                        });
                    }

                    return;
                }

                const nextVisiblePosition =
                    currentPosition.left === '50%'
                        ? getDefaultToolbarPosition()
                        : getSafeToolbarPosition(currentPosition);

                if (
                    nextVisiblePosition.top !== currentPosition.top ||
                    nextVisiblePosition.left !== currentPosition.left
                ) {
                    setSetting('toolbarPosition', nextVisiblePosition);
                }
            }, 150);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);

            if (resizeTimerRef.current !== null) {
                window.clearTimeout(resizeTimerRef.current);
            }
        };
    }, [isReady, isToolbarHiddenToSide, setSetting]);

    const toggleToolbarHiddenToSide = useCallback(async () => {
        const nextHiddenState = !isToolbarHiddenToSide;

        if (nextHiddenState) {
            const currentVisiblePosition =
                toolbarPositionRef.current.left === '50%'
                    ? getDefaultToolbarPosition()
                    : getSafeToolbarPosition(toolbarPositionRef.current);

            lastVisibleToolbarPositionRef.current = currentVisiblePosition;

            const nextHiddenTop = getSafeHiddenToolbarTop(currentVisiblePosition.top);

            setSetting('toolbarPosition', {
                top: nextHiddenTop,
                left: currentVisiblePosition.left,
            });
            setIsToolbarHiddenToSide(true);

            void saveToolbarHiddenState(true);
            return;
        }

        const restoredPosition =
            lastVisibleToolbarPositionRef.current.left === '50%'
                ? getDefaultToolbarPosition()
                : getSafeToolbarPosition(lastVisibleToolbarPositionRef.current);

        setSetting('toolbarPosition', restoredPosition);
        setIsToolbarHiddenToSide(false);

        void saveToolbarHiddenState(false);
    }, [isToolbarHiddenToSide, setSetting]);

    const handleToolbarChange = useCallback((partialSettings: Partial<RulerSettings>) => {
        (Object.keys(partialSettings) as Array<keyof RulerSettings>).forEach((key) => {
            const value = partialSettings[key];

            if (value === undefined) {
                return;
            }

            if (key === 'toolbarPosition') {
                const nextPosition = value as ToolbarPosition;

                if (isToolbarHiddenToSide) {
                    setSetting('toolbarPosition', {
                        top: getSafeHiddenToolbarTop(nextPosition.top),
                        left: toolbarPositionRef.current.left,
                    });
                    return;
                }

                setSetting('toolbarPosition', normalizeToolbarPosition(nextPosition));
                return;
            }

            if (key === 'toggleHideToSideKey') {
                setSetting(
                    'toggleHideToSideKey',
                    normalizeStoredKeyCode(
                        value,
                        DEFAULT_RULER_SETTINGS.toggleHideToSideKey
                    )
                );
                return;
            }

            setSetting(key, value as RulerSettings[typeof key]);
        });
    }, [isToolbarHiddenToSide, normalizeToolbarPosition, setSetting]);

    const handleClearShapes = useCallback(() => {
        setClearShapesCounter((previous) => previous + 1);
    }, []);

    const handleResetPosition = useCallback(async () => {
        const defaultToolbarPosition = getDefaultToolbarPosition();

        debouncedSettingsWriterRef.current?.cancel();

        lastVisibleToolbarPositionRef.current = defaultToolbarPosition;
        setIsToolbarHiddenToSide(false);

        applySettingsPartial({
            toolbarPosition: defaultToolbarPosition,
        });

        await Promise.all([
            saveSingleRulerSetting('toolbarPosition', defaultToolbarPosition),
            saveToolbarHiddenState(false),
        ]);
    }, [applySettingsPartial]);

    const handleToolbarReset = useCallback(async () => {
        const defaultToolbarPosition = getDefaultToolbarPosition();
        const nextDefaultSettings = createDefaultRulerSettings(defaultToolbarPosition);

        debouncedSettingsWriterRef.current?.cancel();

        lastVisibleToolbarPositionRef.current = defaultToolbarPosition;
        setIsToolbarHiddenToSide(false);
        setIsExtensionVisible(true);
        setSettings(nextDefaultSettings);

        await Promise.all([
            saveRulerSettings(nextDefaultSettings),
            saveToolbarHiddenState(false),
        ]);
    }, []);

    return {
        settings,
        isReady,
        isExtensionVisible,
        isToolbarHiddenToSide,
        clearShapesCounter,
        setIsExtensionVisible,
        handleToolbarChange,
        handleClearShapes,
        handleResetPosition,
        handleToolbarReset,
        toggleToolbarHiddenToSide,
    };
}
