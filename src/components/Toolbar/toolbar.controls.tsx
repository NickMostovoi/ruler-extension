import React, {ReactNode, useState} from 'react';
import styles from './toolbar.module.scss';

import {RulerSettings} from '../../ruler-core/ruler.types';

import {
    DISALLOWED_KEY_CODES,
    formatKeyCodeLabel,
    getCursorTypeOptions,
    ToolbarControlConfig,
} from './toolbar.helpers';

interface ControlItemProps {
    config: ToolbarControlConfig;
}

interface BuildToolbarControlsParams {
    settings: RulerSettings;
    isDesktop: boolean;
    onChange: (partial: Partial<RulerSettings>) => void;
}

interface SplitToolbarControlsResult {
    generalControls: ToolbarControlConfig[];
    shapeControls: ToolbarControlConfig[];
}

export const ControlItem: React.FC<ControlItemProps> = ({config}) => {
    const {label, type} = config;
    const [isKeyInputFocused, setIsKeyInputFocused] = useState(false);

    let inputElement: ReactNode = null;

    switch (type) {
        case 'range': {
            inputElement = (
                <input
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={config.value}
                    className={styles.inputRange}
                    onChange={(event) => config.onChange(parseFloat(event.target.value))}
                />
            );
            break;
        }

        case 'color': {
            inputElement = (
                <input
                    type="color"
                    value={config.value}
                    className={styles.inputColor}
                    onChange={(event) => config.onChange(event.target.value)}
                />
            );
            break;
        }

        case 'key': {
            inputElement = (
                <>
                    <input
                        type="text"
                        readOnly
                        value={formatKeyCodeLabel(config.value)}
                        className={`${styles.inputKey} ${isKeyInputFocused ? styles.inputKeyActive : ''}`}
                        title="Click here and press a key"
                        onFocus={() => setIsKeyInputFocused(true)}
                        onBlur={() => setIsKeyInputFocused(false)}
                        onKeyDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();

                            if (DISALLOWED_KEY_CODES.has(event.code)) {
                                return;
                            }

                            if (event.code === 'Backspace' || event.code === 'Delete') {
                                return;
                            }

                            config.onChange(event.code);
                        }}
                    />
                    <span
                        className={`${styles.keyHint} ${isKeyInputFocused ? styles.keyHintVisible : ''}`}
                    >
                        {isKeyInputFocused ? 'Press any key now' : 'Click to change'}
                    </span>
                </>
            );
            break;
        }

        case 'select': {
            inputElement = (
                <select
                    value={config.value}
                    className={styles.inputSelect}
                    onChange={(event) => config.onChange(event.target.value)}
                >
                    {config.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            );
            break;
        }

        case 'checkbox': {
            inputElement = (
                <label className={styles.checkboxWrap}>
                    <input
                        type="checkbox"
                        checked={config.value}
                        className={styles.inputCheckbox}
                        onChange={(event) => config.onChange(event.target.checked)}
                    />
                    <span className={styles.checkboxLabel}>
                        {config.value ? 'On' : 'Off'}
                    </span>
                </label>
            );
            break;
        }
    }

    return (
        <div className={styles.controlsGroup}>
            <label className={styles.label}>{label}</label>
            {inputElement}
        </div>
    );
};

export function buildToolbarControls({
    settings,
    isDesktop,
    onChange,
}: BuildToolbarControlsParams): ToolbarControlConfig[] {
    const controls: ToolbarControlConfig[] = [
        {
            settingKey: 'overlayOpacity',
            section: 'general',
            label: 'Overlay opacity',
            type: 'range',
            min: 0,
            max: 0.8,
            step: 0.05,
            value: settings.overlayOpacity,
            onChange: (value) => onChange({overlayOpacity: value}),
        },
        {
            settingKey: 'lineThickness',
            section: 'general',
            label: `Line thickness ${settings.lineThickness}px`,
            type: 'range',
            min: 1,
            max: 10,
            step: 1,
            value: settings.lineThickness,
            onChange: (value) => onChange({lineThickness: value}),
        },
        ...(isDesktop
            ? [{
                settingKey: 'cursorType' as const,
                section: 'general' as const,
                label: 'Cursor type',
                type: 'select' as const,
                options: getCursorTypeOptions(),
                value: settings.cursorType,
                onChange: (value: string) => onChange({cursorType: value}),
            }]
            : []),
        {
            settingKey: 'toggleHideToSideKey',
            section: 'general',
            label: 'Hide to side key',
            type: 'key',
            value: settings.toggleHideToSideKey,
            onChange: (value) => onChange({toggleHideToSideKey: value}),
        },
        {
            settingKey: 'lineColor',
            section: 'general',
            label: 'Line color',
            type: 'color',
            value: settings.lineColor,
            onChange: (value) => onChange({lineColor: value}),
        },
        {
            settingKey: 'linesVisible',
            section: 'general',
            label: 'Show lines',
            type: 'checkbox',
            value: settings.linesVisible,
            onChange: (value) => onChange({linesVisible: value}),
        },
        {
            settingKey: 'shapeFillOpacity',
            section: 'shape',
            label: 'New / active shape opacity',
            type: 'range',
            min: 0.1,
            max: 1,
            step: 0.05,
            value: settings.shapeFillOpacity,
            onChange: (value) => onChange({shapeFillOpacity: value}),
        },
        {
            settingKey: 'shapeFillColor',
            section: 'shape',
            label: 'New / active shape color',
            type: 'color',
            value: settings.shapeFillColor,
            onChange: (value) => onChange({shapeFillColor: value}),
        },
        {
            settingKey: 'attachNewShapesToPage',
            section: 'shape',
            label: 'Attach new shapes to page',
            type: 'checkbox',
            value: settings.attachNewShapesToPage,
            onChange: (value) => onChange({attachNewShapesToPage: value}),
        },
    ];

    return controls;
}

export function splitToolbarControls(
    controls: ToolbarControlConfig[]
): SplitToolbarControlsResult {
    return {
        generalControls: controls.filter((control) => control.section === 'general'),
        shapeControls: controls.filter((control) => control.section === 'shape'),
    };
}
