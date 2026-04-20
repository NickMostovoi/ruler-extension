import React, {CSSProperties} from 'react';
import styles from './shapeContainer.module.scss';

import {
    ShapeResizeDirection,
    ShapeState,
} from '../../ruler-core/ruler.types';

import {
    hexToRgba,
    SHAPE_RESIZE_DIRECTIONS,
    toViewportRect,
} from './shapeContainer.helpers';

import {useShapeInteractions} from './useShapeInteractions';

interface ShapeContainerProps {
    enabled: boolean;
    fillOpacity: number;
    fillColor: string;
    attachNewShapesToPage: boolean;
    clearTrigger?: number;
}

interface ShapeItemProps {
    shape: ShapeState;
    onShapePointerDown: (
        event: React.PointerEvent<HTMLDivElement>,
        shapeId: string
    ) => void;
    onResizePointerDown: (
        event: React.PointerEvent<HTMLDivElement>,
        shapeId: string,
        direction: ShapeResizeDirection
    ) => void;
    onRemove: (shapeId: string) => void;
}

const ShapeItem: React.FC<ShapeItemProps> = ({
    shape,
    onShapePointerDown,
    onResizePointerDown,
    onRemove,
}) => {
    const viewportRect = toViewportRect(shape);

    const shapeStyle: CSSProperties = {
        left: `${viewportRect.x}px`,
        top: `${viewportRect.y}px`,
        width: `${shape.width}px`,
        height: `${shape.height}px`,
        backgroundColor: hexToRgba(shape.color, shape.opacity),
    };

    return (
        <div
            className={`${styles.shape} ${shape.active ? styles.active : ''}`}
            style={shapeStyle}
            onPointerDown={(event) => onShapePointerDown(event, shape.id)}
        >
            {shape.active && (
                <>
                    {SHAPE_RESIZE_DIRECTIONS.map((direction) => (
                        <div
                            key={direction}
                            className={`${styles.resizeHandle} ${styles[direction]}`}
                            onPointerDown={(event) =>
                                onResizePointerDown(event, shape.id, direction)
                            }
                        />
                    ))}

                    <div
                        className={styles.deleteButton}
                        onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onRemove(shape.id);
                        }}
                    >
                        ×
                    </div>
                </>
            )}

            <div className={styles.shapeSizeDisplay}>
                {Math.round(shape.width)} × {Math.round(shape.height)}
            </div>
        </div>
    );
};

const ShapeContainer: React.FC<ShapeContainerProps> = ({
    enabled,
    fillOpacity,
    fillColor,
    attachNewShapesToPage,
    clearTrigger,
}) => {
    const {
        shapes,
        handleContainerPointerDown,
        handleShapePointerDown,
        handleResizePointerDown,
        removeShape,
    } = useShapeInteractions({
        enabled,
        fillOpacity,
        fillColor,
        attachNewShapesToPage,
        clearTrigger,
    });

    return (
        <div
            id="shape-container"
            className={styles.shapeContainer}
            onPointerDown={handleContainerPointerDown}
        >
            {shapes.map((shape) => (
                <ShapeItem
                    key={shape.id}
                    shape={shape}
                    onShapePointerDown={handleShapePointerDown}
                    onResizePointerDown={handleResizePointerDown}
                    onRemove={removeShape}
                />
            ))}
        </div>
    );
};

export default React.memo(ShapeContainer);
