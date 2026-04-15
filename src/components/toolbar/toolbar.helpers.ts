import {RulerSettings} from '../../ruler-core/ruler.types';

export interface ToolbarProps extends RulerSettings {
    isToolbarHiddenToSide: boolean;
    onChange: (settings: Partial<RulerSettings>) => void;
    onReset: () => void;
    onResetPosition: () => void;
    onClearShapes: () => void;
    onToggleToolbarHiddenToSide: () => void;
}

export interface ControlItemProps {
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

type ToolbarRangeControlConfig = BaseToolbarControlConfig<'range', number> & {
    min: number;
    max: number;
    step: number;
};

type ToolbarColorControlConfig = BaseToolbarControlConfig<'color', string>;

type ToolbarKeyControlConfig = BaseToolbarControlConfig<'key', string>;

type ToolbarSelectControlConfig = BaseToolbarControlConfig<'select', string> & {
    options: ToolbarOption[];
};

type ToolbarCheckboxControlConfig = BaseToolbarControlConfig<'checkbox', boolean>;

type ToolbarControlConfig =
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

function getCursorTypeOptions(): ToolbarOption[] {
    return [
        {value: 'default', label: 'Default'},
        {value: 'none', label: 'None'},
        {value: 'crosshair', label: 'Crosshair'},
        {value: 'all-scroll', label: 'All-scroll'},
    ];
}

export function splitToolbarControls(
    controls: ToolbarControlConfig[]
): SplitToolbarControlsResult {
    return {
        generalControls: controls.filter((control) => control.section === 'general'),
        shapeControls: controls.filter((control) => control.section === 'shape'),
    };
}

export function buildToolbarControls({
    settings,
    isDesktop,
    onChange,
}: BuildToolbarControlsParams): ToolbarControlConfig[] {
    return [
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
            max: 15,
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
            settingKey: 'lineColor',
            section: 'general',
            label: 'Line color',
            type: 'color',
            value: settings.lineColor,
            onChange: (value) => onChange({lineColor: value}),
        },
        {
            settingKey: 'toggleHideToSideKey',
            section: 'general',
            label: 'Hide to side key',
            type: 'key',
            value: settings.toggleHideToSideKey,
            onChange: (value) => onChange({toggleHideToSideKey: value}),
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
}
