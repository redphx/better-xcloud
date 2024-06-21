import { MkbPresetKey } from "@enums/mkb";

type GamepadKeyNameType = {[index: string | number]: string[]};

type MkbStoredPreset = {
    id?: number;
    name: string;
    data: MkbPresetData;
};

type MkbStoredPresets = {
    [index: number]: MkbStoredPreset;
}

type MkbPresetData = {
    mapping: {[index: number]: (string | null)[]};
    mouse: Omit<{
        [index in MkbPresetKey]: number | null;
    }, MkbPresetKey.MOUSE_MAP_TO> & {
        [MkbPresetKey.MOUSE_MAP_TO]?: string;
    };
};

type MkbConvertedPresetData = {
    mapping: {[index: string]: number?};
    mouse: MkbNormalPreset.mouse;
};
