import React, {ReactNode, useState} from 'react';
import styles from './toolbar.module.scss';

import {
    ControlItemProps,
    DISALLOWED_KEY_CODES,
    formatKeyCodeLabel,
} from './toolbar.helpers';

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

                            if (event.code === 'Escape') {
                                event.currentTarget.blur();
                                return;
                            }

                            if (DISALLOWED_KEY_CODES.has(event.code)) {
                                return;
                            }

                            if (event.code === 'Backspace' || event.code === 'Delete') {
                                config.onChange('');
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
