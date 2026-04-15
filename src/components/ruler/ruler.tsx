import React, {useEffect, useRef} from 'react';
import styles from './ruler.module.scss';

import Toolbar from '../toolbar/toolbar';
import ShapeContainer from '../shapeContainer/shapeContainer';

import {TOGGLE_VISIBILITY_EVENT} from './ruler.helpers';
import {useRulerSettings} from './useRulerSettings';

interface RulerProps {
    initialVisible?: boolean;
}

const Ruler: React.FC<RulerProps> = ({initialVisible = true}) => {
    const {
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
    } = useRulerSettings({initialVisible});

    const rulerRef = useRef<HTMLDivElement>(null);
    const previousCursorRef = useRef<string | null>(null);
    const mouseRafRef = useRef<number | null>(null);
    const mousePositionRef = useRef({x: 0, y: 0});

    useEffect(() => {
        const handleExternalToggle = () => {
            setIsExtensionVisible((previous) => !previous);
        };

        window.addEventListener(TOGGLE_VISIBILITY_EVENT, handleExternalToggle);

        return () => {
            window.removeEventListener(TOGGLE_VISIBILITY_EVENT, handleExternalToggle);
        };
    }, [setIsExtensionVisible]);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        const updateMouseCssVariables = () => {
            mouseRafRef.current = null;

            if (!rulerRef.current) {
                return;
            }

            rulerRef.current.style.setProperty('--mouse-x', `${mousePositionRef.current.x}px`);
            rulerRef.current.style.setProperty('--mouse-y', `${mousePositionRef.current.y}px`);
        };

        const handlePointerMove = (event: PointerEvent) => {
            mousePositionRef.current = {
                x: event.clientX,
                y: event.clientY,
            };

            if (mouseRafRef.current === null) {
                mouseRafRef.current = window.requestAnimationFrame(updateMouseCssVariables);
            }
        };

        document.addEventListener('pointermove', handlePointerMove);

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);

            if (mouseRafRef.current !== null) {
                window.cancelAnimationFrame(mouseRafRef.current);
                mouseRafRef.current = null;
            }
        };
    }, [isReady]);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isExtensionVisible) {
                return;
            }

            if (event.code === settings.toggleHideToSideKey) {
                event.preventDefault();
                void toggleToolbarHiddenToSide();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        isExtensionVisible,
        isReady,
        settings.toggleHideToSideKey,
        toggleToolbarHiddenToSide,
    ]);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (previousCursorRef.current === null) {
            previousCursorRef.current = window.getComputedStyle(document.body).cursor || 'auto';
        }

        const originalCursor = previousCursorRef.current;

        if (!isExtensionVisible) {
            document.body.style.cursor = originalCursor;
            return;
        }

        document.body.style.cursor = settings.cursorType;

        return () => {
            document.body.style.cursor = originalCursor;
        };
    }, [isExtensionVisible, isReady, settings.cursorType]);

    if (!isReady) {
        return null;
    }

    return (
        <div
            id="ext-ruler-mm"
            ref={rulerRef}
            className={styles.ruler}
            style={{
                display: isExtensionVisible ? 'block' : 'none',
                touchAction: 'none',
                '--mouse-x': '50vw',
                '--mouse-y': '50vh',
            } as React.CSSProperties}
        >
            <div
                className={styles.overlay}
                style={{backgroundColor: `rgba(0,0,0,${settings.overlayOpacity})`}}
            />

            <div
                className={styles.horizontal}
                style={{
                    top: 'var(--mouse-y)',
                    backgroundColor: settings.lineColor,
                    height: `${settings.lineThickness}px`,
                    display: settings.linesVisible ? 'block' : 'none',
                }}
            />

            <div
                className={styles.vertical}
                style={{
                    left: 'var(--mouse-x)',
                    backgroundColor: settings.lineColor,
                    width: `${settings.lineThickness}px`,
                    display: settings.linesVisible ? 'block' : 'none',
                }}
            />

            <ShapeContainer
                enabled={isExtensionVisible}
                fillOpacity={settings.shapeFillOpacity}
                fillColor={settings.shapeFillColor}
                attachNewShapesToPage={settings.attachNewShapesToPage}
                clearTrigger={clearShapesCounter}
            />

            <Toolbar
                overlayOpacity={settings.overlayOpacity}
                lineColor={settings.lineColor}
                lineThickness={settings.lineThickness}
                cursorType={settings.cursorType}
                toolbarExpanded={settings.toolbarExpanded}
                toolbarPosition={settings.toolbarPosition}
                toggleHideToSideKey={settings.toggleHideToSideKey}
                linesVisible={settings.linesVisible}
                shapeFillOpacity={settings.shapeFillOpacity}
                shapeFillColor={settings.shapeFillColor}
                attachNewShapesToPage={settings.attachNewShapesToPage}
                isToolbarHiddenToSide={isToolbarHiddenToSide}
                onChange={handleToolbarChange}
                onReset={() => {
                    void handleToolbarReset();
                }}
                onResetPosition={() => {
                    void handleResetPosition();
                }}
                onClearShapes={handleClearShapes}
                onToggleToolbarHiddenToSide={() => {
                    void toggleToolbarHiddenToSide();
                }}
            />
        </div>
    );
};

export default Ruler;
