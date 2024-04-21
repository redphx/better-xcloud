import type { GamepadKeyNameType } from "../../types/mkb";

export const GamepadKey: DualEnum = {};
GamepadKey[GamepadKey.A = 0] = 'A';
GamepadKey[GamepadKey.B = 1] = 'B';
GamepadKey[GamepadKey.X = 2] = 'X';
GamepadKey[GamepadKey.Y = 3] = 'Y';
GamepadKey[GamepadKey.LB = 4] = 'LB';
GamepadKey[GamepadKey.RB = 5] = 'RB';
GamepadKey[GamepadKey.LT = 6] = 'LT';
GamepadKey[GamepadKey.RT = 7] = 'RT';
GamepadKey[GamepadKey.SELECT = 8] = 'SELECT';
GamepadKey[GamepadKey.START = 9] = 'START';
GamepadKey[GamepadKey.L3 = 10] = 'L3';
GamepadKey[GamepadKey.R3 = 11] = 'R3';
GamepadKey[GamepadKey.UP = 12] = 'UP';
GamepadKey[GamepadKey.DOWN = 13] = 'DOWN';
GamepadKey[GamepadKey.LEFT = 14] = 'LEFT';
GamepadKey[GamepadKey.RIGHT = 15] = 'RIGHT';
GamepadKey[GamepadKey.HOME = 16] = 'HOME';

GamepadKey[GamepadKey.LS_UP = 100] = 'LS_UP';
GamepadKey[GamepadKey.LS_DOWN = 101] = 'LS_DOWN';
GamepadKey[GamepadKey.LS_LEFT = 102] = 'LS_LEFT';
GamepadKey[GamepadKey.LS_RIGHT = 103] = 'LS_RIGHT';
GamepadKey[GamepadKey.RS_UP = 200] = 'RS_UP';
GamepadKey[GamepadKey.RS_DOWN = 201] = 'RS_DOWN';
GamepadKey[GamepadKey.RS_LEFT = 202] = 'RS_LEFT';
GamepadKey[GamepadKey.RS_RIGHT = 203] = 'RS_RIGHT';


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

export const MouseMapTo: DualEnum = {};
MouseMapTo[MouseMapTo.OFF = 0] = 'OFF';
MouseMapTo[MouseMapTo.LS = 1] = 'LS';
MouseMapTo[MouseMapTo.RS = 2] = 'RS';


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
