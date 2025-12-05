import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
    CSSProperties
} from 'react';
import styles from './ShapeContainer.module.scss';

interface Shape {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    active: boolean;
}

export interface ShapeContainerProps {
    opacity: number;
    color: string;
    linesVisible?: boolean;
    clearTrigger?: number;
}

const DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type Dir = typeof DIRS[number];
const MIN_SIZE = 5;

function hexToRgba(hex: string, alpha: number): string {
    let h = hex.replace('#', '');
    if (h.length === 3) {
        h = h
            .split('')
            .map((c) => c + c)
            .join('');
    }
    const num = parseInt(h, 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ShapeContainer: React.FC<ShapeContainerProps> = ({
        opacity,
        color,
        clearTrigger
    }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const [shapes, setShapes] = useState<Shape[]>([]);
    const [nextId, setNextId] = useState(1);

    const drawingRef = useRef(false);
    const resizeRef = useRef<{
        id: string;
        dir: Dir;
        startX: number;
        startY: number;
        orig: { x: number; y: number; width: number; height: number };
    } | null>(null);
    const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const currentDrawingIdRef = useRef<string | null>(null);
    const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
    const lastShapeTapRef = useRef<{
        time: number;
        id: string;
        x: number;
        y: number;
    } | null>(null);

    useEffect(() => {
        if (clearTrigger !== undefined) {
            setShapes([]);
        }
    }, [clearTrigger]);

    useEffect(() => {
        const onPointerMove = (e: PointerEvent) => {
            if (drawingRef.current && startRef.current && currentDrawingIdRef.current) {
                const {x: sx, y: sy} = startRef.current;
                const currentId = currentDrawingIdRef.current;

                setShapes((prev) =>
                    prev.map((sh) => {
                        if (sh.id !== currentId) return sh;
                        const w = Math.abs(e.clientX - sx);
                        const h = Math.abs(e.clientY - sy);
                        const x = Math.min(e.clientX, sx);
                        const y = Math.min(e.clientY, sy);
                        return {...sh, x, y, width: w, height: h};
                    })
                );
                return;
            }

            const r = resizeRef.current;
            if (r) {
                setShapes((prev) =>
                    prev.map((sh) => {
                        if (sh.id !== r.id) return sh;
                        let {x, y, width, height} = r.orig;
                        const dx = e.clientX - r.startX;
                        const dy = e.clientY - r.startY;

                        if (r.dir.includes('e')) {
                            width = r.orig.width + dx;
                        }
                        if (r.dir.includes('s')) {
                            height = r.orig.height + dy;
                        }
                        if (r.dir.includes('w')) {
                            width = r.orig.width - dx;
                            x = r.orig.x + dx;
                        }
                        if (r.dir.includes('n')) {
                            height = r.orig.height - dy;
                            y = r.orig.y + dy;
                        }

                        width = Math.max(MIN_SIZE, width);
                        height = Math.max(MIN_SIZE, height);

                        return {...sh, x, y, width, height, active: true};
                    })
                );
                return;
            }

            const d = dragRef.current;
            if (d) {
                setShapes((prev) =>
                    prev.map((sh) => {
                        if (sh.id !== d.id) return sh;
                        return {
                            ...sh,
                            x: e.clientX - d.offsetX,
                            y: e.clientY - d.offsetY
                        };
                    })
                );
            }
        };

        const onPointerUp = () => {
            if (drawingRef.current) {
                setShapes((prev) =>
                    prev.filter((sh) => sh.width >= MIN_SIZE && sh.height >= MIN_SIZE)
                );
            }
            drawingRef.current = false;
            currentDrawingIdRef.current = null;
            resizeRef.current = null;
            dragRef.current = null;
            startRef.current = null;
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);

        return () => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };
    }, []);

    const toggleActive = useCallback((id: string) => {
        setShapes((prev) =>
            prev.map((sh) => ({
                ...sh,
                active: sh.id === id ? !sh.active : false
            }))
        );
    }, []);

    const handlePointerDownOnContainer = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (e.target !== containerRef.current) return;

            if (e.pointerType === 'mouse') {
                if (e.button !== 0) return;
                const id = nextId.toString();
                setNextId((num) => num + 1);
                currentDrawingIdRef.current = id;
                const sx = e.clientX;
                const sy = e.clientY;
                startRef.current = { x: sx, y: sy };
                drawingRef.current = true;

                setShapes((prev) => [
                    ...prev,
                    {id, x: sx, y: sy, width: 0, height: 0, active: false}
                ]);
                return;
            }

            const now = Date.now();
            const tapX = e.clientX;
            const tapY = e.clientY;
            const last = lastTapRef.current;
            const DOUBLE_TIMEOUT = 300;
            const DOUBLE_DISTANCE = 30;

            if (
                last &&
                now - last.time < DOUBLE_TIMEOUT &&
                Math.hypot(tapX - last.x, tapY - last.y) < DOUBLE_DISTANCE
            ) {
                lastTapRef.current = null;

                const id = nextId.toString();
                setNextId((num) => num + 1);
                currentDrawingIdRef.current = id;

                const sx = tapX;
                const sy = tapY;
                startRef.current = { x: sx, y: sy };
                drawingRef.current = true;

                setShapes((prev) => [
                    ...prev,
                    {id, x: sx, y: sy, width: 0, height: 0, active: false}
                ]);
            } else {
                lastTapRef.current = { time: now, x: tapX, y: tapY };
            }
        },
        [nextId]
    );

    const removeShape = useCallback((id: string) => {
        setShapes((prev) => prev.filter((sh) => sh.id !== id));
    }, []);

    const handleResizePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>, id: string, dir: Dir) => {
            e.stopPropagation();
            const sh = shapes.find((s) => s.id === id);
            if (!sh) return;
            resizeRef.current = {
                id,
                dir,
                startX: e.clientX,
                startY: e.clientY,
                orig: {x: sh.x, y: sh.y, width: sh.width, height: sh.height}
            };
        },
        [shapes]
    );

    const handleShapePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>, id: string) => {
            e.stopPropagation();
            const sh = shapes.find((s) => s.id === id);

            if (!sh) return;

            const now = Date.now();
            const tapX = e.clientX;
            const tapY = e.clientY;
            const last = lastShapeTapRef.current;
            const DOUBLE_TIMEOUT = 300;
            const DOUBLE_DISTANCE = 10;

            if (
                last &&
                last.id === id &&
                now - last.time < DOUBLE_TIMEOUT &&
                Math.hypot(tapX - last.x, tapY - last.y) < DOUBLE_DISTANCE
            ) {
                lastShapeTapRef.current = null;
                toggleActive(id);
            } else {
                lastShapeTapRef.current = { time: now, id, x: tapX, y: tapY };
                dragRef.current = {
                    id,
                    offsetX: e.clientX - sh.x,
                    offsetY: e.clientY - sh.y
                };
            }
        },
        [shapes, toggleActive]
    );

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const active = shapes.find((sh) => sh.active);
            if (!active) return;

            let {x, y, width, height} = active;
            let updated = false;
            const step = 1;

            switch (e.key) {
                case 'ArrowUp':
                    if (e.ctrlKey || e.metaKey) {
                        if (height > MIN_SIZE) {
                            y += step;
                            height -= step;
                            updated = true;
                        }
                    } else {
                        y -= step;
                        height += step;
                        updated = true;
                    }
                    break;
                case 'ArrowDown':
                    if (e.ctrlKey || e.metaKey) {
                        if (height > MIN_SIZE) {
                            height -= step;
                            updated = true;
                        }
                    } else {
                        height += step;
                        updated = true;
                    }
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey || e.metaKey) {
                        if (width > MIN_SIZE) {
                            x += step;
                            width -= step;
                            updated = true;
                        }
                    } else {
                        x -= step;
                        width += step;
                        updated = true;
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey || e.metaKey) {
                        if (width > MIN_SIZE) {
                            width -= step;
                            updated = true;
                        }
                    } else {
                        width += step;
                        updated = true;
                    }
                    break;
            }

            if (updated) {
                e.preventDefault();
                if (width < MIN_SIZE) width = MIN_SIZE;
                if (height < MIN_SIZE) height = MIN_SIZE;
                setShapes((prev) =>
                    prev.map((sh) =>
                        sh.id === active.id ? {...sh, x, y, width, height} : sh
                    )
                );
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [shapes]);

    return (
        <div
            id="shape-container"
            className={styles.shapeContainer}
            ref={containerRef}
            onPointerDown={handlePointerDownOnContainer}
        >
            {shapes.map((sh) => {
                const rgba = hexToRgba(color, opacity);
                const style: CSSProperties = {
                    left: `${sh.x}px`,
                    top: `${sh.y}px`,
                    width: `${sh.width}px`,
                    height: `${sh.height}px`,
                    backgroundColor: rgba
                };

                return (
                    <div
                        key={sh.id}
                        id={sh.id}
                        className={`${styles.shape} ${sh.active ? styles.active : ''}`}
                        style={style}
                        onPointerDown={(e) => handleShapePointerDown(e, sh.id)}
                    >
                        {sh.active && (
                            <>
                                {DIRS.map((dir) => (
                                    <div
                                        key={dir}
                                        className={`${styles.resizeHandle} ${styles[dir]}`}
                                        onPointerDown={(e) => handleResizePointerDown(e, sh.id, dir)}
                                    />
                                ))}
                                <div
                                    className={styles.deleteButton}
                                    onClick={() => removeShape(sh.id)}
                                >
                                    X
                                </div>
                            </>
                        )}
                        <div className={styles.shapeSizeDisplay}>
                            {Math.round(sh.width)} x {Math.round(sh.height)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ShapeContainer;
