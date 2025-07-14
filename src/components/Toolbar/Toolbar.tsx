import React, {useRef, useEffect, ReactNode} from 'react';
import styles from './Toolbar.module.scss';
import {Settings} from '../Ruler/Ruler';

export interface ToolbarProps extends Settings {
    onChange: (s: Partial<Settings>) => void;
    onReset: () => void;
}

type ControlType = 'range' | 'color' | 'text' | 'select' | 'checkbox';

interface ControlConfig<T = any> {
    settingKey: keyof Settings;
    label: string;
    type: ControlType;
    value: T;
    onChange: (v: T) => void;
    min?: number;
    max?: number;
    step?: number;
    options?: { value: string; label: string }[];
}

const ControlItem = <T, >(cfg: ControlConfig<T>) => {
    const {label, type, value, onChange, min, max, step, options} = cfg;

    let inputElement: ReactNode = null;

    switch (type) {
        case 'range':
            inputElement = (
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={String(value)}
                    className={styles.inputRange}
                    onChange={e => onChange(parseFloat(e.target.value) as unknown as T)}
                />
            );
            break;

        case 'color':
            inputElement = (
                <input
                    type="color"
                    value={String(value)}
                    className={styles.inputColor}
                    onChange={e => onChange(e.target.value as unknown as T)}
                />
            );
            break;

        case 'text':
            inputElement = (
                <input
                    type="text"
                    maxLength={1}
                    value={String(value)}
                    className={styles.inputKey}
                    onChange={e => onChange(e.target.value.toUpperCase() as unknown as T)}
                />
            );
            break;

        case 'select':
            inputElement = (
                <select
                    value={String(value)}
                    className={styles.inputSelect}
                    onChange={e => onChange(e.target.value as unknown as T)}
                >
                    {options!.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
            break;

        case 'checkbox':
            inputElement = (
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    className={styles.inputCheckbox}
                    onChange={e => onChange(e.target.checked as unknown as T)}
                />
            );
            break;

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

    useEffect(() => {
        const el = containerRef.current;
        const hd = headerRef.current;
        if (!el || !hd) return;

        let dragging = false;
        let offsetX = 0, offsetY = 0;
        let rect: DOMRect;

        const onMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            dragging = true;
            rect = el.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!dragging) return;
            let x = e.clientX - offsetX;
            let y = e.clientY - offsetY;
            x = Math.max(0, Math.min(x, window.innerWidth - rect.width));
            y = Math.max(0, Math.min(y, window.innerHeight - rect.height));
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
        };

        const onMouseUp = () => {
            if (!dragging) return;
            dragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            onChange({toolbarPosition: {top: el.style.top, left: el.style.left}});
        };

        hd.addEventListener('mousedown', onMouseDown);
        return () => hd.removeEventListener('mousedown', onMouseDown);
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
        {
            settingKey: 'cursorType',
            label: 'Cursor type',
            type: 'select',
            options: [
                {value: 'default', label: 'Default'},
                {value: 'none', label: 'None'},
                {value: 'crosshair', label: 'Crosshair'},
                {value: 'all-scroll', label: 'All-scroll'}
            ],
            value: cursorType,
            onChange: v => onChange({cursorType: v})
        },
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

    const generalControls = controls.slice(0, 7);
    const shapesControls = controls.slice(7);

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
