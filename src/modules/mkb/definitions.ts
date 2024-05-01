import type { GamepadKeyNameType } from "@/types/mkb";

export enum GamepadKey {
    A = 0,
    B = 1,
    X = 2,
    Y = 3,
    LB = 4,
    RB = 5,
    LT = 6,
    RT = 7,
    SELECT = 8,
    START = 9,
    L3 = 10,
    R3 = 11,
    UP = 12,
    DOWN = 13,
    LEFT = 14,
    RIGHT = 15,
    HOME = 16,

    LS_UP = 100,
    LS_DOWN = 101,
    LS_LEFT = 102,
    LS_RIGHT = 103,

    RS_UP = 200,
    RS_DOWN = 201,
    RS_LEFT = 202,
    RS_RIGHT = 203,
};


export const GamepadKeyName: GamepadKeyNameType = {
    [GamepadKey.A]: ['A', '⇓'],
    [GamepadKey.B]: ['B', '⇒'],
    [GamepadKey.X]: ['X', '⇐'],
    [GamepadKey.Y]: ['Y', '⇑'],

    [GamepadKey.LB]: ['LB', '↘'],
    [GamepadKey.RB]: ['RB', '↙'],
    [GamepadKey.LT]: ['LT', '↖'],
    [GamepadKey.RT]: ['RT', '↗'],

    [GamepadKey.SELECT]: ['Select', '⇺'],
    [GamepadKey.START]: ['Start', '⇻'],
    [GamepadKey.HOME]: ['Home', ''],

    [GamepadKey.UP]: ['D-Pad Up', '≻'],
    [GamepadKey.DOWN]: ['D-Pad Down', '≽'],
    [GamepadKey.LEFT]: ['D-Pad Left', '≺'],
    [GamepadKey.RIGHT]: ['D-Pad Right', '≼'],

    [GamepadKey.L3]: ['L3', '↺'],
    [GamepadKey.LS_UP]: ['Left Stick Up', '↾'],
    [GamepadKey.LS_DOWN]: ['Left Stick Down', '⇂'],
    [GamepadKey.LS_LEFT]: ['Left Stick Left', '↼'],
    [GamepadKey.LS_RIGHT]: ['Left Stick Right', '⇀'],

    [GamepadKey.R3]: ['R3', '↻'],
    [GamepadKey.RS_UP]: ['Right Stick Up', '↿'],
    [GamepadKey.RS_DOWN]: ['Right Stick Down', '⇃'],
    [GamepadKey.RS_LEFT]: ['Right Stick Left', '↽'],
    [GamepadKey.RS_RIGHT]: ['Right Stick Right', '⇁'],
};


export enum GamepadStick {
    LEFT = 0,
    RIGHT = 1,
};

export enum MouseButtonCode {
    LEFT_CLICK = 'Mouse0',
    RIGHT_CLICK = 'Mouse2',
    MIDDLE_CLICK = 'Mouse1',
};

export enum MouseMapTo {
    OFF = 0,
    LS = 1,
    RS = 2,
}


export enum WheelCode {
    SCROLL_UP = 'ScrollUp',
    SCROLL_DOWN = 'ScrollDown',
    SCROLL_LEFT = 'ScrollLeft',
    SCROLL_RIGHT = 'ScrollRight',
};

export enum MkbPresetKey {
    MOUSE_MAP_TO = 'map_to',

    MOUSE_SENSITIVITY_X = 'sensitivity_x',
    MOUSE_SENSITIVITY_Y = 'sensitivity_y',

    MOUSE_DEADZONE_COUNTERWEIGHT = 'deadzone_counterweight',

    MOUSE_STICK_DECAY_STRENGTH = 'stick_decay_strength',
    MOUSE_STICK_DECAY_MIN = 'stick_decay_min',
}
