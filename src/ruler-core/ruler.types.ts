export type ShapeAttachment = 'viewport' | 'page';

export type ShapeResizeDirection =
    | 'nw'
    | 'n'
    | 'ne'
    | 'e'
    | 'se'
    | 's'
    | 'sw'
    | 'w';

export interface ToolbarPosition {
    top: string;
    left: string;
}

export interface RulerSettings {
    overlayOpacity: number;
    lineColor: string;
    lineThickness: number;
    cursorType: string;
    toolbarExpanded: boolean;
    toolbarPosition: ToolbarPosition;
    toggleHideToSideKey: string;
    linesVisible: boolean;
    shapeFillOpacity: number;
    shapeFillColor: string;
    attachNewShapesToPage: boolean;
}

export interface RectState {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ShapeState extends RectState {
    id: string;
    active: boolean;
    color: string;
    opacity: number;
    attachment: ShapeAttachment;
}
