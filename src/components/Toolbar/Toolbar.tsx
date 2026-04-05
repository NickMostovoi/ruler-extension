import React, {useEffect, useRef, useState} from 'react';
import styles from './toolbar.module.scss';

import {
    RulerSettings,
    ToolbarPosition,
} from '../../ruler-core/ruler.types';

import {getResponsiveToolbarWidth} from '../ruler/ruler.helpers';

import {
    ToolbarHelpPopoverType,
    TOOLBAR_CLICK_MAX_DISTANCE,
    TOOLBAR_CLICK_MAX_DURATION,
    TOOLBAR_DRAG_THRESHOLD,
} from './toolbar.helpers';

import {
    buildToolbarControls,
    ControlItem,
    splitToolbarControls,
} from './toolbar.controls';

export interface ToolbarProps extends RulerSettings {
    isToolbarHiddenToSide: boolean;
    onChange: (settings: Partial<RulerSettings>) => void;
    onReset: () => void;
    onResetPosition: () => void;
    onClearShapes: () => void;
    onToggleToolbarHiddenToSide: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    overlayOpacity,
    lineColor,
    lineThickness,
    cursorType,
    toolbarExpanded,
    toolbarPosition,
    toggleHideToSideKey,
    linesVisible,
    shapeFillOpacity,
    shapeFillColor,
    attachNewShapesToPage,
    isToolbarHiddenToSide,
    onChange,
    onReset,
    onResetPosition,
    onClearShapes,
    onToggleToolbarHiddenToSide,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const hiddenHandleRef = useRef<HTMLDivElement>(null);
    const generalHelpRef = useRef<HTMLDivElement>(null);
    const shapeHelpRef = useRef<HTMLDivElement>(null);

    const [isDesktop, setIsDesktop] = useState(false);
    const [activePopover, setActivePopover] = useState<ToolbarHelpPopoverType>(null);

    const settings: RulerSettings = {
        overlayOpacity,
        lineColor,
        lineThickness,
        cursorType,
        toolbarExpanded,
        toolbarPosition,
        toggleHideToSideKey,
        linesVisible,
        shapeFillOpacity,
        shapeFillColor,
        attachNewShapesToPage,
    };

    const icons = {
        hideLines: chrome.runtime.getURL('images/hideLines.png'),
        showLines: chrome.runtime.getURL('images/showLines.png'),
        clearShapes: chrome.runtime.getURL('images/clearShapes.png'),
        settings: chrome.runtime.getURL('images/settings.png'),
        arrow: chrome.runtime.getURL('images/arrow.png'),
        resetArrow: chrome.runtime.getURL('images/resetArrow.png'),
    };

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return;
        }

        const media = window.matchMedia('(pointer: fine)');
        const updateMatch = () => setIsDesktop(media.matches);

        updateMatch();

        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', updateMatch);

            return () => {
                media.removeEventListener('change', updateMatch);
            };
        }

        media.addListener(updateMatch);

        return () => {
            media.removeListener(updateMatch);
        };
    }, []);

    useEffect(() => {
        if (isToolbarHiddenToSide || !toolbarExpanded) {
            setActivePopover(null);
        }
    }, [isToolbarHiddenToSide, toolbarExpanded]);

    useEffect(() => {
        if (!activePopover) {
            return;
        }

        const activePopoverRef =
            activePopover === 'general' ? generalHelpRef : shapeHelpRef;

        const handlePointerDown = (event: PointerEvent) => {
            if (activePopoverRef.current?.contains(event.target as Node)) {
                return;
            }

            setActivePopover(null);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setActivePopover(null);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [activePopover]);

    useEffect(() => {
        const container = containerRef.current;
        const dragHandle = isToolbarHiddenToSide
            ? hiddenHandleRef.current
            : headerRef.current;

        if (!container || !dragHandle) {
            return;
        }

        let pointerId: number | null = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let startClientX = 0;
        let startClientY = 0;
        let startTime = 0;
        let isDragging = false;
        let originalUserSelect = '';

        const finishDrag = (): {wasDragging: boolean} => {
            if (pointerId === null) {
                return {wasDragging: false};
            }

            const wasDragging = isDragging;

            pointerId = null;
            document.body.style.userSelect = originalUserSelect;

            if (wasDragging) {
                isDragging = false;

                const nextPosition: ToolbarPosition = isToolbarHiddenToSide
                    ? {
                        top: container.style.top || toolbarPosition.top,
                        left: toolbarPosition.left,
                    }
                    : {
                        top: container.style.top || toolbarPosition.top,
                        left: container.style.left || toolbarPosition.left,
                    };

                onChange({toolbarPosition: nextPosition});
            }

            return {wasDragging};
        };

        const handlePointerDown = (event: PointerEvent) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }

            if (
                !isToolbarHiddenToSide &&
                event.target instanceof HTMLElement &&
                event.target.closest('button, input, select, label, [data-no-drag="true"]')
            ) {
                return;
            }

            const rect = container.getBoundingClientRect();

            pointerId = event.pointerId;
            dragOffsetX = event.clientX - rect.left;
            dragOffsetY = event.clientY - rect.top;
            startClientX = event.clientX;
            startClientY = event.clientY;
            startTime = Date.now();
            isDragging = false;
            originalUserSelect = document.body.style.userSelect;
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (pointerId !== event.pointerId) {
                return;
            }

            const movedEnough =
                Math.hypot(
                    event.clientX - startClientX,
                    event.clientY - startClientY
                ) >= TOOLBAR_DRAG_THRESHOLD;

            if (!isDragging && !movedEnough) {
                return;
            }

            if (!isDragging) {
                isDragging = true;
                document.body.style.userSelect = 'none';
            }

            event.preventDefault();

            const rect = container.getBoundingClientRect();
            const maxTop = Math.max(0, window.innerHeight - rect.height);

            let nextTop = event.clientY - dragOffsetY;
            nextTop = Math.max(0, Math.min(nextTop, maxTop));
            container.style.top = `${nextTop}px`;

            if (isToolbarHiddenToSide) {
                container.style.right = '0px';
                container.style.left = 'auto';
                return;
            }

            const maxLeft = Math.max(0, window.innerWidth - rect.width);

            let nextLeft = event.clientX - dragOffsetX;
            nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));
            container.style.left = `${nextLeft}px`;
        };

        const handlePointerUp = (event: PointerEvent) => {
            if (pointerId !== event.pointerId) {
                return;
            }

            const clickDuration = Date.now() - startTime;
            const clickDistance = Math.hypot(
                event.clientX - startClientX,
                event.clientY - startClientY
            );

            const {wasDragging} = finishDrag();

            if (
                isToolbarHiddenToSide &&
                !wasDragging &&
                clickDuration <= TOOLBAR_CLICK_MAX_DURATION &&
                clickDistance <= TOOLBAR_CLICK_MAX_DISTANCE
            ) {
                onToggleToolbarHiddenToSide();
            }
        };

        const handlePointerCancel = (event: PointerEvent) => {
            if (pointerId !== event.pointerId) {
                return;
            }

            finishDrag();
        };

        dragHandle.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerCancel);

        return () => {
            dragHandle.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerCancel);
            document.body.style.userSelect = originalUserSelect;
        };
    }, [
        isToolbarHiddenToSide,
        onChange,
        onToggleToolbarHiddenToSide,
        toolbarPosition.left,
        toolbarPosition.top,
    ]);

    const controls = buildToolbarControls({
        settings,
        isDesktop,
        onChange,
    });

    const {generalControls, shapeControls} = splitToolbarControls(controls);

    const resolvedLeft = toolbarPosition.left === '50%'
        ? `${Math.max(10, Math.round(window.innerWidth / 2 - getResponsiveToolbarWidth() / 2))}px`
        : toolbarPosition.left;

    if (isToolbarHiddenToSide) {
        return (
            <div
                ref={containerRef}
                className={`${styles.toolbar} ${styles.toolbarHiddenUi}`}
                style={{
                    top: toolbarPosition.top,
                    right: '0px',
                    left: 'auto',
                }}
            >
                <div
                    ref={hiddenHandleRef}
                    className={styles.hiddenHandle}
                    role="button"
                    tabIndex={0}
                    aria-label="Show toolbar"
                    title="Show toolbar"
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onToggleToolbarHiddenToSide();
                        }
                    }}
                >
                    <span className={styles.hiddenArrow} aria-hidden="true">
                        ‹
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={styles.toolbar}
            style={{
                top: toolbarPosition.top,
                left: resolvedLeft,
            }}
        >
            {toolbarExpanded && (
                <div
                    className={`${styles.panel} ${styles.panelVisible}`}
                    aria-hidden={!toolbarExpanded}
                >
                    <div className={styles.content}>
                        <div className={styles.section}>
                            <div className={styles.sectionTitleRow}>
                                <div className={styles.sectionTitle}>General</div>

                                <div ref={generalHelpRef} className={styles.popoverWrap}>
                                    <button
                                        type="button"
                                        className={`${styles.infoButton} ${activePopover === 'general' ? styles.infoButtonActive : ''}`}
                                        onClick={() => {
                                            setActivePopover((previous) =>
                                                previous === 'general' ? null : 'general'
                                            );
                                        }}
                                        title="Extension shortcuts"
                                        aria-label="Extension shortcuts"
                                        aria-expanded={activePopover === 'general'}
                                    >
                                        i
                                    </button>

                                    {activePopover === 'general' && (
                                        <div className={styles.floatingPopover}>
                                            <div><strong>Show / hide extension</strong></div>
                                            <div>Ctrl + Shift + Y on Windows / Linux</div>
                                            <div>Cmd + Shift + Y on Mac</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.controlsContainer}>
                                {generalControls.map((control) => (
                                    <ControlItem
                                        key={String(control.settingKey)}
                                        config={control}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionTitleRow}>
                                <div className={styles.sectionTitle}>Shapes</div>

                                <div ref={shapeHelpRef} className={styles.popoverWrap}>
                                    <button
                                        type="button"
                                        className={`${styles.infoButton} ${activePopover === 'shape' ? styles.infoButtonActive : ''}`}
                                        onClick={() => {
                                            setActivePopover((previous) =>
                                                previous === 'shape' ? null : 'shape'
                                            );
                                        }}
                                        title="Shape keyboard help"
                                        aria-label="Shape keyboard help"
                                        aria-expanded={activePopover === 'shape'}
                                    >
                                        i
                                    </button>

                                    {activePopover === 'shape' && (
                                        <div className={styles.floatingPopover}>
                                            <div><strong>Arrow</strong> = resize by 1px</div>
                                            <div><strong>Shift + Arrow</strong> = resize by 10px</div>
                                            <div><strong>Ctrl / Cmd + Arrow</strong> = reverse resize</div>
                                            <div><strong>Shift + drag corner</strong> = lock proportions</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.controlsContainer}>
                                {shapeControls.map((control) => (
                                    <ControlItem
                                        key={String(control.settingKey)}
                                        config={control}
                                    />
                                ))}
                            </div>
                        </div>

                        <button
                            className={`${styles.button} ${styles.reset}`}
                            onClick={onReset}
                            type="button"
                        >
                            Reset settings
                        </button>
                    </div>
                </div>
            )}

            <div
                ref={headerRef}
                className={`${styles.header} ${toolbarExpanded ? styles.headerExpanded : ''}`}
            >
                <span className={styles.title}>Ruler</span>

                <div className={styles.actions}>
                    <button
                        className={styles.toggle}
                        data-no-drag="true"
                        onClick={() => onChange({linesVisible: !linesVisible})}
                        title={linesVisible ? 'Hide lines' : 'Show lines'}
                        type="button"
                        style={{
                            backgroundImage: `url("${linesVisible ? icons.showLines : icons.hideLines}")`,
                        }}
                    />

                    <button
                        className={styles.toggle}
                        data-no-drag="true"
                        onClick={onClearShapes}
                        title="Clear shapes"
                        type="button"
                        style={{backgroundImage: `url("${icons.clearShapes}")`}}
                    />

                    <button
                        className={styles.toggle}
                        data-no-drag="true"
                        onClick={onResetPosition}
                        title="Reset toolbar position"
                        type="button"
                        style={{backgroundImage: `url("${icons.resetArrow}")`}}
                    />

                    <button
                        className={styles.toggle}
                        data-no-drag="true"
                        onClick={() => onChange({toolbarExpanded: !toolbarExpanded})}
                        title={toolbarExpanded ? 'Collapse' : 'Expand'}
                        type="button"
                        style={{backgroundImage: `url("${icons.settings}")`}}
                    />

                    <button
                        className={styles.toggle}
                        data-no-drag="true"
                        onClick={onToggleToolbarHiddenToSide}
                        title="Hide to side"
                        type="button"
                        style={{backgroundImage: `url("${icons.arrow}")`}}
                    />
                </div>
            </div>
        </div>
    );
};

export default React.memo(Toolbar);
