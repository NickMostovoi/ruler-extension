import React, {useRef, useEffect, ReactNode} from 'react';
import styles from './Toolbar.module.scss';
import {Settings} from '../Ruler/Ruler';

export interface ToolbarProps extends Settings {
    onChange: (s: Partial<Settings>) => void;
    onReset: () => void;
}

type ControlType = 'range' | 'color' | 'text' | 'select' | 'checkbox';
type BaseControlConfig<TType extends ControlType, TValue> = {
    settingKey: keyof Settings;
    label: string;
    type: TType;
    value: TValue;
    onChange: (v: TValue) => void;
    min?: number;
    max?: number;
    step?: number;
    options?: { value: string; label: string }[];
};
type RangeControlConfig = BaseControlConfig<'range', number> & {
    min: number;
    max: number;
    step: number;
};
type ColorControlConfig = BaseControlConfig<'color', string>;
type TextControlConfig = BaseControlConfig<'text', string>;
type SelectControlConfig = BaseControlConfig<'select', string> & {
    options: { value: string; label: string }[];
};
type CheckboxControlConfig = BaseControlConfig<'checkbox', boolean>;

type ControlConfig =
    | RangeControlConfig
    | ColorControlConfig
    | TextControlConfig
    | SelectControlConfig
    | CheckboxControlConfig;

const ControlItem: React.FC<ControlConfig> = (cfg) => {
    const {label, type} = cfg;

    let inputElement: ReactNode;

    switch (type) {
        case 'range': {
            const {value, min, max, step, onChange} = cfg;
            inputElement = (
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    className={styles.inputRange}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                />
            );
            break;
        }

        case 'color': {
            const {value, onChange} = cfg;
            inputElement = (
                <input
                    type="color"
                    value={value}
                    className={styles.inputColor}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
            break;
        }

        case 'text': {
            const {value, onChange} = cfg;
            inputElement = (
                <input
                    type="text"
                    maxLength={1}
                    value={value}
                    className={styles.inputKey}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                />
            );
            break;
        }

        case 'select': {
            const {value, onChange, options} = cfg;
            inputElement = (
                <select
                    value={value}
                    className={styles.inputSelect}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
            break;
        }

        case 'checkbox': {
            const {value, onChange} = cfg;
            inputElement = (
                <input
                    type="checkbox"
                    checked={value}
                    className={styles.inputCheckbox}
                    onChange={(e) => onChange(e.target.checked)}
                />
            );
            break;
        }

        default:
            inputElement = null;
    }

    return (
        <div className={styles.controlsGroup}>
            <label className={styles.label}>{label}</label>
            {inputElement}
        </div>
    );
};

const Toolbar: React.FC<ToolbarProps> = ({
        opacity,
        lineColor,
        lineThickness,
        cursorType,
        toolbarVisible,
        toolbarPosition,
        toggleToolbarKey,
        toggleExtensionKey,
        linesVisible,
        shapeOpacity,
        shapeColor,
        onChange,
        onReset
    }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    const isDesktop =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(pointer: fine)').matches;

    useEffect(() => {
        const el = containerRef.current;
        const hd = headerRef.current;
        if (!el || !hd) return;

        let dragging = false;
        let offsetX = 0, offsetY = 0;
        let rect: DOMRect;

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.preventDefault();
            dragging = true;
            rect = el.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return;
            let x = e.clientX - offsetX;
            let y = e.clientY - offsetY;
            x = Math.max(0, Math.min(x, window.innerWidth - rect.width));
            y = Math.max(0, Math.min(y, window.innerHeight - rect.height));
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
        };

        const onPointerUp = () => {
            if (!dragging) return;
            dragging = false;

            onChange({
                toolbarPosition: {
                    top: el.style.top,
                    left: el.style.left,
                },
            });
        };

        hd.addEventListener('pointerdown', onPointerDown);

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);

        return () => {
            hd.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };
    }, [onChange]);

    const controls: ControlConfig[] = [
        {
            settingKey: 'opacity',
            label: 'Overlay opacity',
            type: 'range',
            min: 0,
            max: 0.8,
            step: 0.05,
            value: opacity,
            onChange: v => onChange({opacity: v})
        },
        {
            settingKey: 'lineThickness',
            label: 'Line thickness',
            type: 'range',
            min: 1,
            max: 5,
            step: 1,
            value: lineThickness,
            onChange: v => onChange({lineThickness: v})
        },
        ...(isDesktop
            ? [{
                settingKey: 'cursorType' as const,
                label: 'Cursor type',
                type: 'select' as const,
                options: [
                    { value: 'default', label: 'Default' },
                    { value: 'none', label: 'None' },
                    { value: 'crosshair', label: 'Crosshair' },
                    { value: 'all-scroll', label: 'All-scroll' },
                ],
                value: cursorType,
                onChange: (v: string) => onChange({ cursorType: v }),
            }]
            : []),
        {
            settingKey: 'toggleToolbarKey',
            label: 'Toggle toolbar key',
            type: 'text',
            value: toggleToolbarKey,
            onChange: v => onChange({toggleToolbarKey: v})
        },
        {
            settingKey: 'lineColor',
            label: 'Line color',
            type: 'color',
            value: lineColor,
            onChange: v => onChange({lineColor: v})
        },
        {
            settingKey: 'toggleExtensionKey',
            label: 'Toggle extension key',
            type: 'text',
            value: toggleExtensionKey,
            onChange: v => onChange({toggleExtensionKey: v})
        },
        {
            settingKey: 'linesVisible',
            label: 'Hide lines',
            type: 'checkbox',
            value: !linesVisible,
            onChange: v => onChange({linesVisible: !v})
        },
        {
            settingKey: 'shapeOpacity',
            label: 'Shape opacity',
            type: 'range',
            min: 0.1,
            max: 1,
            step: 0.05,
            value: shapeOpacity,
            onChange: v => onChange({shapeOpacity: v})
        },
        {
            settingKey: 'shapeColor',
            label: 'Shape color',
            type: 'color',
            value: shapeColor,
            onChange: v => onChange({shapeColor: v})
        }
    ];

    const generalControls = isDesktop ? controls.slice(0, 7) : controls.slice(0, 6);
    const shapesControls = isDesktop ? controls.slice(7) : controls.slice(6);

    return (
        <div
            ref={containerRef}
            className={`${styles.toolbar} ${!toolbarVisible ? styles.toolbarCollapsed : ''}`}
            style={toolbarPosition}
        >
            <div className={styles.header} ref={headerRef}>
                <span className={styles.title}>Ruler Settings</span>
                <button
                    className={styles.toggle}
                    onClick={() => onChange({toolbarVisible: !toolbarVisible})}
                >
                    {toolbarVisible ? '▲' : '▼'}
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>General</div>
                    <div className={styles.controlsContainer}>
                        {generalControls.map((cfg) => (
                            <ControlItem
                                key={String(cfg.settingKey)}
                                {...cfg}
                            />
                        ))}
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Shapes</div>
                    <div className={styles.controlsContainer}>
                        {shapesControls.map((cfg) => (
                            <ControlItem
                                key={String(cfg.settingKey)}
                                {...cfg}
                            />
                        ))}
                    </div>
                    <div className={styles.notice}>
                        Resize the active shape: ← ↑ → ↓
                        <br/>
                        Reverse with Ctrl / Cmd
                    </div>
                </div>
            </div>

            <button className={`${styles.button} ${styles.reset}`} onClick={onReset}>
                Reset Settings
            </button>
        </div>
    );
};

export default Toolbar;
