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
    lineColor: '#ff0000',
    lineThickness: 1,
    cursorType: 'default',
    toolbarVisible: true,
    toolbarPosition: {top: '10px', left: '10px'},
    toggleToolbarKey: 'X',
    toggleExtensionKey: 'Z',
    linesVisible: true,
    shapeOpacity: 0.5,
    shapeColor: '#00ff00',
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
    const [mouseX, setMouseX] = useState(window.innerWidth / 2);
    const [mouseY, setMouseY] = useState(window.innerHeight / 2);
    const prevCursorRef = useRef<string | null>(null);

    type SettingsSetters = {
        [K in keyof Settings]: (value: Settings[K]) => void;
    }

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
        });
    }, [getSafePosition, setters]);

    useEffect(() => {
        let resizeTimer: number;

        const handleResize = () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                const safePos = getSafePosition(toolbarPosition);

                if (safePos.top !== toolbarPosition.top || safePos.left !== toolbarPosition.left) {
                    saveAndSet("toolbarPosition", safePos);
                }
            }, 150);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [toolbarPosition, saveAndSet, getSafePosition]);

    useEffect(() => {
        const onPointerMove = (e: PointerEvent) => {
            setMouseX(e.clientX);
            setMouseY(e.clientY);
        };
        document.addEventListener('pointermove', onPointerMove);
        return () => document.removeEventListener('pointermove', onPointerMove);
    }, []);

    useEffect(() => {
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
    }, [toggleToolbarKey, toggleExtensionKey, toolbarVisible, saveAndSet]);

    useEffect(() => {
        if (prevCursorRef.current === null) {
            prevCursorRef.current = window.getComputedStyle(document.body).cursor || 'auto';
        }

        const originalCursor = prevCursorRef.current;
        document.body.style.cursor = extensionHidden ? originalCursor : cursorType;

        return () => {
            document.body.style.cursor = originalCursor;
        };
    }, [cursorType, extensionHidden]);

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

    return (
        <div
            id="ruler"
            className={styles.ruler}
            style={{display: extensionHidden ? 'none' : 'block', touchAction: 'none'}}
        >
            <div
                className={styles.overlay}
                style={{backgroundColor: `rgba(0,0,0,${opacity})`}}
            />

            <div
                className={styles.horizontal}
                style={{
                    top: `${mouseY}px`,
                    backgroundColor: lineColor,
                    height: `${lineThickness}px`,
                    display: linesVisible ? 'block' : 'none',
                }}
            />

            <div
                className={styles.vertical}
                style={{
                    left: `${mouseX}px`,
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
