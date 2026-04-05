import {RulerSettings} from '../../ruler-core/ruler.types';

export type ToolbarHelpPopoverType = 'general' | 'shape' | null;
export type ToolbarControlType = 'range' | 'color' | 'key' | 'select' | 'checkbox';
export type ToolbarControlSection = 'general' | 'shape';

export type ToolbarOption = {
    value: string;
    label: string;
};

type BaseToolbarControlConfig<TType extends ToolbarControlType, TValue> = {
    settingKey: keyof RulerSettings;
    section: ToolbarControlSection;
    label: string;
    type: TType;
    value: TValue;
    onChange: (value: TValue) => void;
    min?: number;
    max?: number;
    step?: number;
    options?: ToolbarOption[];
};

export type ToolbarRangeControlConfig = BaseToolbarControlConfig<'range', number> & {
    min: number;
    max: number;
    step: number;
};

export type ToolbarColorControlConfig = BaseToolbarControlConfig<'color', string>;

export type ToolbarKeyControlConfig = BaseToolbarControlConfig<'key', string>;

export type ToolbarSelectControlConfig = BaseToolbarControlConfig<'select', string> & {
    options: ToolbarOption[];
};

export type ToolbarCheckboxControlConfig = BaseToolbarControlConfig<'checkbox', boolean>;

export type ToolbarControlConfig =
    | ToolbarRangeControlConfig
    | ToolbarColorControlConfig
    | ToolbarKeyControlConfig
    | ToolbarSelectControlConfig
    | ToolbarCheckboxControlConfig;

export const TOOLBAR_DRAG_THRESHOLD = 4;
export const TOOLBAR_CLICK_MAX_DURATION = 220;
export const TOOLBAR_CLICK_MAX_DISTANCE = 4;

export const DISALLOWED_KEY_CODES = new Set([
    'ShiftLeft',
    'ShiftRight',
    'ControlLeft',
    'ControlRight',
    'AltLeft',
    'AltRight',
    'MetaLeft',
    'MetaRight',
]);

export function formatKeyCodeLabel(code: string): string {
    if (/^Key[A-Z]$/.test(code)) {
        return code.slice(3);
    }

    if (/^Digit[0-9]$/.test(code)) {
        return code.slice(5);
    }

    return code;
}

export function getCursorTypeOptions(): ToolbarOption[] {
    return [
        {value: 'default', label: 'Default'},
        {value: 'none', label: 'None'},
        {value: 'crosshair', label: 'Crosshair'},
        {value: 'all-scroll', label: 'All-scroll'},
    ];
}
