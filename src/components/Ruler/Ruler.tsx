import React, {useState, useEffect, useCallback, useMemo} from 'react';
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

export const defaultSettings: Settings = {
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

    const setters: Record<keyof Settings, (value: any) => void> = useMemo(
        () => ({
            opacity: setOpacity,
            lineColor: setLineColor,
            lineThickness: setLineThickness,
            cursorType: setCursorType,
            toolbarVisible: setToolbarVisible,
            toolbarPosition: setToolbarPosition as any,
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
            chrome.storage.local.set({[storageKeys[key]]: value});
            setters[key](value);
        },
        [setters]
    );

    useEffect(() => {
        chrome.storage.local.get(Object.values(storageKeys), (items) => {
            (Object.keys(storageKeys) as Array<keyof Settings>).forEach((k) => {
                const stored = items[storageKeys[k]];
                if (stored !== undefined) {
                    setters[k](stored as any);
                } else {
                    setters[k](defaultSettings[k]);
                }
            });
        });
    }, [setters]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            setMouseX(e.clientX);
            setMouseY(e.clientY);
        };
        document.addEventListener('mousemove', onMove);
        return () => document.removeEventListener('mousemove', onMove);
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
        document.body.style.cursor = cursorType;
    }, [cursorType]);

    return (
        <div
            id="ruler"
            className={styles.ruler}
            style={{display: extensionHidden ? 'none' : 'block'}}
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
                onChange={(newSettings) => {
                    Object.entries(newSettings).forEach(([k, v]) => {
                        const key = k as keyof Settings;
                        saveAndSet(key, v as any);
                    });
                }}
                onReset={() => {
                    (Object.keys(defaultSettings) as Array<keyof Settings>).forEach((k) => {
                        saveAndSet(k, defaultSettings[k]);
                    });
                    setClearShapesCounter((c) => c + 1);
                }}
            />
        </div>
    );
};

export default Ruler;
