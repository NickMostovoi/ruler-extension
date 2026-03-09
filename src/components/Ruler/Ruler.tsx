import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import styles from './Ruler.module.scss';
import Toolbar from '../Toolbar/Toolbar';
import ShapeContainer from '../ShapeContainer/ShapeContainer';

export interface Settings {
    opacity: number;
    lineColor: string;
    lineThickness: number;
    cursorType: string;
    toolbarVisible: boolean;
    toolbarPosition: { top: string; left: string };
    toggleToolbarKey: string;
    toggleExtensionKey: string;
    linesVisible: boolean;
    shapeOpacity: number;
    shapeColor: string;
}

const defaultSettings: Settings = {
    opacity: 0.1,
    lineColor: '#daa520',
    lineThickness: 1,
    cursorType: 'default',
    toolbarVisible: true,
    toolbarPosition: {top: '10px', left: '10px'},
    toggleToolbarKey: 'X',
    toggleExtensionKey: 'Z',
    linesVisible: true,
    shapeOpacity: 0.5,
    shapeColor: '#000000',
};

const storageKeys: Record<keyof Settings, string> = {
    opacity: 'ruler_opacity',
    lineColor: 'ruler_lineColor',
    lineThickness: 'ruler_lineThickness',
    cursorType: 'ruler_cursorType',
    toolbarVisible: 'ruler_toolbarVisible',
    toolbarPosition: 'ruler_toolbarPosition',
    toggleToolbarKey: 'ruler_toggleToolbarKey',
    toggleExtensionKey: 'ruler_toggleExtensionKey',
    linesVisible: 'ruler_linesVisible',
    shapeOpacity: 'shape_opacity',
    shapeColor: 'shape_color',
};

const Ruler: React.FC = () => {
    const [opacity, setOpacity] = useState(defaultSettings.opacity);
    const [lineColor, setLineColor] = useState(defaultSettings.lineColor);
    const [lineThickness, setLineThickness] = useState(defaultSettings.lineThickness);
    const [cursorType, setCursorType] = useState(defaultSettings.cursorType);
    const [toolbarVisible, setToolbarVisible] = useState(defaultSettings.toolbarVisible);
    const [toolbarPosition, setToolbarPosition] = useState(defaultSettings.toolbarPosition);
    const [toggleToolbarKey, setToggleToolbarKey] = useState(defaultSettings.toggleToolbarKey);
    const [toggleExtensionKey, setToggleExtensionKey] = useState(defaultSettings.toggleExtensionKey);
    const [linesVisible, setLinesVisible] = useState(defaultSettings.linesVisible);
    const [shapeOpacity, setShapeOpacity] = useState(defaultSettings.shapeOpacity);
    const [shapeColor, setShapeColor] = useState(defaultSettings.shapeColor);

    const [clearShapesCounter, setClearShapesCounter] = useState(0);
    const [extensionHidden, setExtensionHidden] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const rulerRef = useRef<HTMLDivElement>(null);
    const prevCursorRef = useRef<string | null>(null);
    const toolbarPositionRef = useRef(defaultSettings.toolbarPosition);
    const resizeTimerRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const mousePositionRef = useRef({x: 0, y: 0});

    type SettingsSetters = {
        [K in keyof Settings]: (value: Settings[K]) => void;
    };

    const setters: SettingsSetters = useMemo(
        () => ({
            opacity: setOpacity,
            lineColor: setLineColor,
            lineThickness: setLineThickness,
            cursorType: setCursorType,
            toolbarVisible: setToolbarVisible,
            toolbarPosition: setToolbarPosition,
            toggleToolbarKey: setToggleToolbarKey,
            toggleExtensionKey: setToggleExtensionKey,
            linesVisible: setLinesVisible,
            shapeOpacity: setShapeOpacity,
            shapeColor: setShapeColor,
        }),
        []
    );

    const saveAndSet = useCallback(
        <K extends keyof Settings>(key: K, value: Settings[K]) => {
            void chrome.storage.local.set({[storageKeys[key]]: value});
            setters[key](value);
        },
        [setters]
    );

    const getSafePosition = useCallback((pos: { top: string; left: string }) => {
        const topNum = parseInt(pos.top, 10);
        const leftNum = parseInt(pos.left, 10);

        const TOOLBAR_WIDTH = 360;
        const TOOLBAR_HEIGHT = 57;
        const PADDING = 10;

        const safeTop = Math.max(PADDING, Math.min(topNum, window.innerHeight - TOOLBAR_HEIGHT - PADDING));
        const safeLeft = Math.max(PADDING, Math.min(leftNum, window.innerWidth - TOOLBAR_WIDTH - PADDING));

        return {
            top: `${safeTop}px`,
            left: `${safeLeft}px`,
        };
    }, []);

    useEffect(() => {
        toolbarPositionRef.current = toolbarPosition;
    }, [toolbarPosition]);

    useEffect(() => {
        chrome.storage.local.get(Object.values(storageKeys), (items: Record<string, unknown>) => {
            (Object.keys(storageKeys) as Array<keyof Settings>).forEach((k) => {
                const stored = items[storageKeys[k]] as Settings[typeof k] | undefined;
                const fallback = defaultSettings[k] as Settings[typeof k];
                const value = stored ?? fallback;

                if (k === 'toolbarPosition') {
                    setters.toolbarPosition(getSafePosition(value as Settings["toolbarPosition"]));
                } else if (setters[k]) {
                    (setters[k] as (value: Settings[keyof Settings]) => void)(
                        value as Settings[keyof Settings]
                    );
                }
            });

            setIsReady(true);
        });
    }, [getSafePosition, setters]);

    useEffect(() => {
        if (!isReady) return;

        const handleResize = () => {
            if (resizeTimerRef.current !== null) {
                window.clearTimeout(resizeTimerRef.current);
            }

            resizeTimerRef.current = window.setTimeout(() => {
                const currentPosition = toolbarPositionRef.current;
                const safePos = getSafePosition(currentPosition);

                if (safePos.top !== currentPosition.top || safePos.left !== currentPosition.left) {
                    saveAndSet("toolbarPosition", safePos);
                }
            }, 150);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);

            if (resizeTimerRef.current !== null) {
                window.clearTimeout(resizeTimerRef.current);
            }
        };
    }, [isReady, saveAndSet, getSafePosition]);

    useEffect(() => {
        if (!isReady) return;

        const updateMousePosition = () => {
            rafRef.current = null;

            if (rulerRef.current) {
                rulerRef.current.style.setProperty('--mouse-x', `${mousePositionRef.current.x}px`);
                rulerRef.current.style.setProperty('--mouse-y', `${mousePositionRef.current.y}px`);
            }
        };

        const onPointerMove = (e: PointerEvent) => {
            mousePositionRef.current = {x: e.clientX, y: e.clientY};

            if (rafRef.current === null) {
                rafRef.current = window.requestAnimationFrame(updateMousePosition);
            }
        };

        document.addEventListener('pointermove', onPointerMove);

        return () => {
            document.removeEventListener('pointermove', onPointerMove);

            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [isReady]);

    useEffect(() => {
        if (!isReady) return;

        const onKey = (e: KeyboardEvent) => {
            const key = e.key.toUpperCase();

            if (key === toggleToolbarKey) {
                saveAndSet('toolbarVisible', !toolbarVisible);
            } else if (key === toggleExtensionKey) {
                setExtensionHidden((prev) => !prev);
            }
        };

        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isReady, toggleToolbarKey, toggleExtensionKey, toolbarVisible, saveAndSet]);

    useEffect(() => {
        if (!isReady) return;

        if (prevCursorRef.current === null) {
            prevCursorRef.current = window.getComputedStyle(document.body).cursor || 'auto';
        }

        const originalCursor = prevCursorRef.current;
        document.body.style.cursor = extensionHidden ? originalCursor : cursorType;

        return () => {
            document.body.style.cursor = originalCursor;
        };
    }, [isReady, cursorType, extensionHidden]);

    const handleToolbarChange = useCallback((newSettings: Partial<Settings>) => {
        (Object.keys(newSettings) as (keyof Settings)[]).forEach((key) => {
            const value = newSettings[key];
            if (value !== undefined) {
                saveAndSet(key, value);
            }
        });
    }, [saveAndSet]);

    const handleToolbarReset = useCallback(() => {
        (Object.keys(defaultSettings) as Array<keyof Settings>).forEach((k) => {
            saveAndSet(k, defaultSettings[k]);
        });

        setClearShapesCounter((c) => c + 1);
    }, [saveAndSet]);

    if (!isReady) {
        return null;
    }

    return (
        <div
            id="ext-ruler-mm"
            ref={rulerRef}
            className={styles.ruler}
            style={{
                display: extensionHidden ? 'none' : 'block',
                touchAction: 'none',
                '--mouse-x': '50vw',
                '--mouse-y': '50vh'
            } as React.CSSProperties}
        >
            <div
                className={styles.overlay}
                style={{backgroundColor: `rgba(0,0,0,${opacity})`}}
            />

            <div
                className={styles.horizontal}
                style={{
                    top: 'var(--mouse-y)',
                    backgroundColor: lineColor,
                    height: `${lineThickness}px`,
                    display: linesVisible ? 'block' : 'none',
                }}
            />

            <div
                className={styles.vertical}
                style={{
                    left: 'var(--mouse-x)',
                    backgroundColor: lineColor,
                    width: `${lineThickness}px`,
                    display: linesVisible ? 'block' : 'none',
                }}
            />

            <ShapeContainer
                opacity={shapeOpacity}
                color={shapeColor}
                clearTrigger={clearShapesCounter}
            />

            <Toolbar
                opacity={opacity}
                lineColor={lineColor}
                lineThickness={lineThickness}
                cursorType={cursorType}
                toolbarVisible={toolbarVisible}
                toolbarPosition={toolbarPosition}
                toggleToolbarKey={toggleToolbarKey}
                toggleExtensionKey={toggleExtensionKey}
                linesVisible={linesVisible}
                shapeOpacity={shapeOpacity}
                shapeColor={shapeColor}
                onChange={handleToolbarChange}
                onReset={handleToolbarReset}
            />
        </div>
    );
};

export default Ruler;
