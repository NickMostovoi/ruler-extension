import {
    RectState,
    ShapeAttachment,
    ShapeResizeDirection,
} from '../../ruler-core/ruler.types';

export const MIN_SHAPE_SIZE = 5;

export const SHAPE_RESIZE_DIRECTIONS: ShapeResizeDirection[] = [
    'nw',
    'n',
    'e',
    'se',
    's',
    'sw',
    'w',
];

export function hexToRgba(hex: string, alpha: number): string {
    let normalizedHex = hex.replace('#', '');

    if (normalizedHex.length === 3) {
        normalizedHex = normalizedHex
            .split('')
            .map((chunk) => chunk + chunk)
            .join('');
    }

    const numericValue = parseInt(normalizedHex, 16);
    const red = (numericValue >> 16) & 0xff;
    const green = (numericValue >> 8) & 0xff;
    const blue = numericValue & 0xff;

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getPointerCoords(
    clientX: number,
    clientY: number,
    attachment: ShapeAttachment
): {x: number; y: number} {
    if (attachment === 'page') {
        return {
            x: clientX + window.scrollX,
            y: clientY + window.scrollY,
        };
    }

    return {x: clientX, y: clientY};
}

export function toViewportRect(
    shape: {
        x: number;
        y: number;
        width: number;
        height: number;
        attachment: ShapeAttachment;
    }
): RectState {
    if (shape.attachment === 'page') {
        return {
            x: shape.x - window.scrollX,
            y: shape.y - window.scrollY,
            width: shape.width,
            height: shape.height,
        };
    }

    return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
    };
}

export function computeFreeResize(
    originalRect: RectState,
    direction: ShapeResizeDirection,
    deltaX: number,
    deltaY: number
): RectState {
    let left = originalRect.x;
    let top = originalRect.y;
    let right = originalRect.x + originalRect.width;
    let bottom = originalRect.y + originalRect.height;

    if (direction.includes('w')) {
        left = Math.min(originalRect.x + deltaX, right - MIN_SHAPE_SIZE);
    }

    if (direction.includes('e')) {
        right = Math.max(
            originalRect.x + originalRect.width + deltaX,
            left + MIN_SHAPE_SIZE
        );
    }

    if (direction.includes('n')) {
        top = Math.min(originalRect.y + deltaY, bottom - MIN_SHAPE_SIZE);
    }

    if (direction.includes('s')) {
        bottom = Math.max(
            originalRect.y + originalRect.height + deltaY,
            top + MIN_SHAPE_SIZE
        );
    }

    return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    };
}

export function computeProportionalResize(
    originalRect: RectState,
    direction: ShapeResizeDirection,
    currentX: number,
    currentY: number
): RectState {
    const signX = direction.includes('w') ? -1 : 1;
    const signY = direction.includes('n') ? -1 : 1;

    const anchorX = direction.includes('w')
        ? originalRect.x + originalRect.width
        : originalRect.x;

    const anchorY = direction.includes('n')
        ? originalRect.y + originalRect.height
        : originalRect.y;

    const ratio = originalRect.width / originalRect.height;
    const minScale = Math.max(
        MIN_SHAPE_SIZE / originalRect.width,
        MIN_SHAPE_SIZE / originalRect.height
    );

    const widthFromPointer = Math.max(
        MIN_SHAPE_SIZE,
        signX * (currentX - anchorX)
    );

    const heightFromPointer = Math.max(
        MIN_SHAPE_SIZE,
        signY * (currentY - anchorY)
    );

    const scaleFromWidth = widthFromPointer / originalRect.width;
    const scaleFromHeight = heightFromPointer / originalRect.height;
    const scale = Math.max(minScale, Math.max(scaleFromWidth, scaleFromHeight));

    const width = Math.max(MIN_SHAPE_SIZE, originalRect.width * scale);
    const height = Math.max(MIN_SHAPE_SIZE, width / ratio);

    return {
        x: direction.includes('w') ? anchorX - width : anchorX,
        y: direction.includes('n') ? anchorY - height : anchorY,
        width,
        height,
    };
}

export function isDoubleTapWithinThreshold(params: {
    previousTime: number;
    currentTime: number;
    previousX: number;
    previousY: number;
    currentX: number;
    currentY: number;
    maxDelayMs: number;
    maxDistancePx: number;
}): boolean {
    const {
        previousTime,
        currentTime,
        previousX,
        previousY,
        currentX,
        currentY,
        maxDelayMs,
        maxDistancePx,
    } = params;

    return (
        currentTime - previousTime < maxDelayMs &&
        Math.hypot(currentX - previousX, currentY - previousY) < maxDistancePx
    );
}
