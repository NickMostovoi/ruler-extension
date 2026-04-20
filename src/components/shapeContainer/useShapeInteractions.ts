import {
    useCallback,
    useEffect,
    useRef,
    useState,
    PointerEvent as ReactPointerEvent
} from 'react';

import {
    RectState,
    ShapeAttachment,
    ShapeResizeDirection,
} from '../../ruler-core/ruler.types';

import {
    computeFreeResize,
    computeProportionalResize,
    getPointerCoords,
    isDoubleTapWithinThreshold,
    MIN_SHAPE_SIZE,
} from './shapeContainer.helpers';

import {useShapeState} from './useShapeState';

interface UseShapeInteractionsParams {
    enabled: boolean;
    fillOpacity: number;
    fillColor: string;
    attachNewShapesToPage: boolean;
    clearTrigger?: number;
}

interface ResizeState {
    id: string;
    direction: ShapeResizeDirection;
    startX: number;
    startY: number;
    originalRect: RectState;
    attachment: ShapeAttachment;
    allowAspectLock: boolean;
}

interface DragState {
    id: string;
    offsetX: number;
    offsetY: number;
    attachment: ShapeAttachment;
}

interface TapState {
    time: number;
    x: number;
    y: number;
}

interface ShapeTapState extends TapState {
    id: string;
}

interface UseShapeInteractionsResult {
    shapes: ReturnType<typeof useShapeState>['shapes'];
    handleContainerPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    handleShapePointerDown: (
        event: ReactPointerEvent<HTMLDivElement>,
        shapeId: string
    ) => void;
    handleResizePointerDown: (
        event: ReactPointerEvent<HTMLDivElement>,
        shapeId: string,
        direction: ShapeResizeDirection
    ) => void;
    removeShape: (shapeId: string) => void;
}

const SHAPE_CREATE_DOUBLE_TAP_DELAY = 300;
const SHAPE_CREATE_DOUBLE_TAP_DISTANCE = 30;
const SHAPE_ACTIVATE_DOUBLE_TAP_DELAY = 300;
const SHAPE_ACTIVATE_DOUBLE_TAP_DISTANCE = 10;

export function useShapeInteractions({
    enabled,
    fillOpacity,
    fillColor,
    attachNewShapesToPage,
    clearTrigger,
}: UseShapeInteractionsParams): UseShapeInteractionsResult {
    const {
        shapes,
        shapesRef,
        setShapesState,
        removeShape,
        toggleShapeActiveState,
    } = useShapeState({
        fillOpacity,
        fillColor,
        clearTrigger,
    });

    const [, setViewportTick] = useState(0);

    const isDrawingRef = useRef(false);
    const currentDrawingShapeIdRef = useRef<string | null>(null);
    const currentDrawingAttachmentRef = useRef<ShapeAttachment>('viewport');

    const resizeStateRef = useRef<ResizeState | null>(null);
    const dragStateRef = useRef<DragState | null>(null);
    const drawingStartRef = useRef<{x: number; y: number} | null>(null);

    const lastContainerTapRef = useRef<TapState | null>(null);
    const lastShapeTapRef = useRef<ShapeTapState | null>(null);

    const viewportRafRef = useRef<number | null>(null);

    useEffect(() => {
        if (clearTrigger === undefined) {
            return;
        }

        isDrawingRef.current = false;
        resizeStateRef.current = null;
        dragStateRef.current = null;
        drawingStartRef.current = null;
        currentDrawingShapeIdRef.current = null;
        currentDrawingAttachmentRef.current = 'viewport';
        lastContainerTapRef.current = null;
        lastShapeTapRef.current = null;
    }, [clearTrigger]);

    useEffect(() => {
        const scheduleViewportUpdate = () => {
            if (viewportRafRef.current !== null) {
                return;
            }

            viewportRafRef.current = window.requestAnimationFrame(() => {
                viewportRafRef.current = null;
                setViewportTick((value) => value + 1);
            });
        };

        window.addEventListener('scroll', scheduleViewportUpdate, {passive: true});
        window.addEventListener('resize', scheduleViewportUpdate);

        return () => {
            window.removeEventListener('scroll', scheduleViewportUpdate);
            window.removeEventListener('resize', scheduleViewportUpdate);

            if (viewportRafRef.current !== null) {
                window.cancelAnimationFrame(viewportRafRef.current);
                viewportRafRef.current = null;
            }
        };
    }, []);

    const createShapeAtPointer = useCallback((clientX: number, clientY: number) => {
        const shapeId = crypto.randomUUID();
        const attachment: ShapeAttachment = attachNewShapesToPage ? 'page' : 'viewport';
        const startPoint = getPointerCoords(clientX, clientY, attachment);

        currentDrawingShapeIdRef.current = shapeId;
        currentDrawingAttachmentRef.current = attachment;
        drawingStartRef.current = startPoint;
        isDrawingRef.current = true;

        setShapesState((previousShapes) => [
            ...previousShapes.map((shape) => ({
                ...shape,
                active: false,
            })),
            {
                id: shapeId,
                x: startPoint.x,
                y: startPoint.y,
                width: 0,
                height: 0,
                active: false,
                color: fillColor,
                opacity: fillOpacity,
                attachment,
            },
        ]);
    }, [attachNewShapesToPage, fillColor, fillOpacity, setShapesState]);

    const handleContainerPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!enabled || event.target !== event.currentTarget) {
            return;
        }

        if (event.pointerType === 'mouse') {
            if (event.button !== 0) {
                return;
            }

            createShapeAtPointer(event.clientX, event.clientY);
            return;
        }

        const now = Date.now();
        const lastTap = lastContainerTapRef.current;

        if (
            lastTap &&
            isDoubleTapWithinThreshold({
                previousTime: lastTap.time,
                currentTime: now,
                previousX: lastTap.x,
                previousY: lastTap.y,
                currentX: event.clientX,
                currentY: event.clientY,
                maxDelayMs: SHAPE_CREATE_DOUBLE_TAP_DELAY,
                maxDistancePx: SHAPE_CREATE_DOUBLE_TAP_DISTANCE,
            })
        ) {
            lastContainerTapRef.current = null;
            createShapeAtPointer(event.clientX, event.clientY);
            return;
        }

        lastContainerTapRef.current = {
            time: now,
            x: event.clientX,
            y: event.clientY,
        };
    }, [createShapeAtPointer, enabled]);

    const handleResizePointerDown = useCallback((
        event: ReactPointerEvent<HTMLDivElement>,
        shapeId: string,
        direction: ShapeResizeDirection
    ) => {
        event.stopPropagation();

        const shape = shapesRef.current.find((item) => item.id === shapeId);

        if (!shape) {
            return;
        }

        const pointer = getPointerCoords(event.clientX, event.clientY, shape.attachment);

        resizeStateRef.current = {
            id: shapeId,
            direction,
            startX: pointer.x,
            startY: pointer.y,
            originalRect: {
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height,
            },
            attachment: shape.attachment,
            allowAspectLock: direction.length === 2,
        };
    }, [shapesRef]);

    const handleShapePointerDown = useCallback((
        event: ReactPointerEvent<HTMLDivElement>,
        shapeId: string
    ) => {
        event.stopPropagation();

        const shape = shapesRef.current.find((item) => item.id === shapeId);

        if (!shape) {
            return;
        }

        const pointer = getPointerCoords(event.clientX, event.clientY, shape.attachment);
        const now = Date.now();
        const lastTap = lastShapeTapRef.current;

        if (
            lastTap &&
            lastTap.id === shapeId &&
            isDoubleTapWithinThreshold({
                previousTime: lastTap.time,
                currentTime: now,
                previousX: lastTap.x,
                previousY: lastTap.y,
                currentX: event.clientX,
                currentY: event.clientY,
                maxDelayMs: SHAPE_ACTIVATE_DOUBLE_TAP_DELAY,
                maxDistancePx: SHAPE_ACTIVATE_DOUBLE_TAP_DISTANCE,
            })
        ) {
            lastShapeTapRef.current = null;
            toggleShapeActiveState(shapeId);
            return;
        }

        lastShapeTapRef.current = {
            time: now,
            id: shapeId,
            x: event.clientX,
            y: event.clientY,
        };

        dragStateRef.current = {
            id: shapeId,
            offsetX: pointer.x - shape.x,
            offsetY: pointer.y - shape.y,
            attachment: shape.attachment,
        };

        setShapesState((previousShapes) =>
            previousShapes.map((item) => ({
                ...item,
                active: item.id === shapeId ? item.active : false,
            }))
        );
    }, [setShapesState, shapesRef, toggleShapeActiveState]);

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            if (!enabled) {
                return;
            }

            if (
                isDrawingRef.current &&
                drawingStartRef.current &&
                currentDrawingShapeIdRef.current
            ) {
                const currentShapeId = currentDrawingShapeIdRef.current;
                const attachment = currentDrawingAttachmentRef.current;
                const pointer = getPointerCoords(event.clientX, event.clientY, attachment);
                const {x: startX, y: startY} = drawingStartRef.current;

                setShapesState((previousShapes) =>
                    previousShapes.map((shape) => {
                        if (shape.id !== currentShapeId) {
                            return shape;
                        }

                        return {
                            ...shape,
                            x: Math.min(pointer.x, startX),
                            y: Math.min(pointer.y, startY),
                            width: Math.abs(pointer.x - startX),
                            height: Math.abs(pointer.y - startY),
                        };
                    })
                );

                return;
            }

            const resizeState = resizeStateRef.current;

            if (resizeState) {
                const pointer = getPointerCoords(
                    event.clientX,
                    event.clientY,
                    resizeState.attachment
                );

                const deltaX = pointer.x - resizeState.startX;
                const deltaY = pointer.y - resizeState.startY;
                const keepAspectRatio = resizeState.allowAspectLock && event.shiftKey;

                setShapesState((previousShapes) =>
                    previousShapes.map((shape) => {
                        if (shape.id !== resizeState.id) {
                            return shape;
                        }

                        const nextRect = keepAspectRatio
                            ? computeProportionalResize(
                                resizeState.originalRect,
                                resizeState.direction,
                                pointer.x,
                                pointer.y
                            )
                            : computeFreeResize(
                                resizeState.originalRect,
                                resizeState.direction,
                                deltaX,
                                deltaY
                            );

                        return {
                            ...shape,
                            ...nextRect,
                            active: true,
                        };
                    })
                );

                return;
            }

            const dragState = dragStateRef.current;

            if (!dragState) {
                return;
            }

            const pointer = getPointerCoords(
                event.clientX,
                event.clientY,
                dragState.attachment
            );

            setShapesState((previousShapes) =>
                previousShapes.map((shape) => {
                    if (shape.id !== dragState.id) {
                        return shape;
                    }

                    return {
                        ...shape,
                        x: pointer.x - dragState.offsetX,
                        y: pointer.y - dragState.offsetY,
                    };
                })
            );
        };

        const handlePointerUp = () => {
            if (isDrawingRef.current) {
                setShapesState((previousShapes) =>
                    previousShapes.filter(
                        (shape) =>
                            shape.width >= MIN_SHAPE_SIZE &&
                            shape.height >= MIN_SHAPE_SIZE
                    )
                );
            }

            isDrawingRef.current = false;
            currentDrawingShapeIdRef.current = null;
            resizeStateRef.current = null;
            dragStateRef.current = null;
            drawingStartRef.current = null;
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [enabled, setShapesState]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!enabled) {
                return;
            }

            const activeShape = shapesRef.current.find((shape) => shape.active);

            if (!activeShape) {
                return;
            }

            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                return;
            }

            let {x, y, width, height} = activeShape;
            let updated = false;

            const step = event.shiftKey ? 10 : 1;
            const reverse = event.ctrlKey || event.metaKey;

            switch (event.key) {
                case 'ArrowUp':
                    if (reverse) {
                        const nextHeight = Math.max(MIN_SHAPE_SIZE, height - step);
                        y += height - nextHeight;
                        height = nextHeight;
                    } else {
                        y -= step;
                        height += step;
                    }
                    updated = true;
                    break;

                case 'ArrowDown':
                    if (reverse) {
                        height = Math.max(MIN_SHAPE_SIZE, height - step);
                    } else {
                        height += step;
                    }
                    updated = true;
                    break;

                case 'ArrowLeft':
                    if (reverse) {
                        const nextWidth = Math.max(MIN_SHAPE_SIZE, width - step);
                        x += width - nextWidth;
                        width = nextWidth;
                    } else {
                        x -= step;
                        width += step;
                    }
                    updated = true;
                    break;

                case 'ArrowRight':
                    if (reverse) {
                        width = Math.max(MIN_SHAPE_SIZE, width - step);
                    } else {
                        width += step;
                    }
                    updated = true;
                    break;
            }

            if (!updated) {
                return;
            }

            event.preventDefault();

            setShapesState((previousShapes) =>
                previousShapes.map((shape) =>
                    shape.id === activeShape.id
                        ? {
                            ...shape,
                            x,
                            y,
                            width,
                            height,
                        }
                        : shape
                )
            );
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled, setShapesState, shapesRef]);

    return {
        shapes,
        handleContainerPointerDown,
        handleShapePointerDown,
        handleResizePointerDown,
        removeShape,
    };
}
