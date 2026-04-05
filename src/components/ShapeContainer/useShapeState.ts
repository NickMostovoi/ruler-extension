import {SetStateAction, useCallback, useEffect, useRef, useState} from 'react';

import {ShapeState} from '../../ruler-core/ruler.types';

interface UseShapeStateParams {
    fillOpacity: number;
    fillColor: string;
    clearTrigger?: number;
}

interface UseShapeStateResult {
    shapes: ShapeState[];
    shapesRef: React.MutableRefObject<ShapeState[]>;
    setShapesState: (updater: SetStateAction<ShapeState[]>) => void;
    removeShape: (shapeId: string) => void;
    toggleShapeActiveState: (shapeId: string) => void;
}

export function useShapeState({
    fillOpacity,
    fillColor,
    clearTrigger,
}: UseShapeStateParams): UseShapeStateResult {
    const [shapes, setShapes] = useState<ShapeState[]>([]);
    const shapesRef = useRef<ShapeState[]>([]);

    const setShapesState = useCallback((updater: SetStateAction<ShapeState[]>) => {
        setShapes((previousShapes) => {
            const nextShapes =
                typeof updater === 'function'
                    ? (updater as (prev: ShapeState[]) => ShapeState[])(previousShapes)
                    : updater;

            shapesRef.current = nextShapes;
            return nextShapes;
        });
    }, []);

    const removeShape = useCallback((shapeId: string) => {
        setShapesState((previousShapes) =>
            previousShapes.filter((shape) => shape.id !== shapeId)
        );
    }, [setShapesState]);

    const toggleShapeActiveState = useCallback((shapeId: string) => {
        setShapesState((previousShapes) =>
            previousShapes.map((shape) => ({
                ...shape,
                active: shape.id === shapeId ? !shape.active : false,
            }))
        );
    }, [setShapesState]);

    useEffect(() => {
        if (clearTrigger === undefined) {
            return;
        }

        setShapesState([]);
    }, [clearTrigger, setShapesState]);

    useEffect(() => {
        setShapesState((previousShapes) => {
            let hasChanges = false;

            const nextShapes = previousShapes.map((shape) => {
                if (!shape.active) {
                    return shape;
                }

                if (shape.color === fillColor && shape.opacity === fillOpacity) {
                    return shape;
                }

                hasChanges = true;

                return {
                    ...shape,
                    color: fillColor,
                    opacity: fillOpacity,
                };
            });

            return hasChanges ? nextShapes : previousShapes;
        });
    }, [fillColor, fillOpacity, setShapesState]);

    return {
        shapes,
        shapesRef,
        setShapesState,
        removeShape,
        toggleShapeActiveState,
    };
}
