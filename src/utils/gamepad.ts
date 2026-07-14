import { VIRTUAL_GAMEPAD_ID } from "@modules/mkb/mkb-handler";
import { t } from "@utils/translation";
import { Toast } from "@utils/toast";
import { BxLogger } from "@utils/bx-logger";
import { GamepadKey, GamepadKeyName } from "@/enums/gamepad";
import { getStreamPref, STORAGE } from "@/utils/pref-utils";
import { StreamPref } from "@/enums/pref-keys";


// Show a toast when connecting/disconecting controller
export function showGamepadToast(gamepad: Gamepad) {
    // Don't show toast for virtual controller
    if (gamepad.id === VIRTUAL_GAMEPAD_ID) {
        return;
    }

    // Don't show toast when toggling local co-op feature
    if ((gamepad as any)._noToast) {
        return;
    }

    BxLogger.info('Gamepad', gamepad);
    let text = '🎮';

    if (getStreamPref(StreamPref.LOCAL_CO_OP_ENABLED)) {
        // Show assigned player slot if set, otherwise show browser index
        const controllerSetting = STORAGE.Stream.getControllerSetting(gamepad.id);
        const playerIndex = controllerSetting.playerIndex >= 0
            ? controllerSetting.playerIndex
            : gamepad.index;
        text += ` P${playerIndex + 1}`;
    }

    // Remove "(STANDARD GAMEPAD Vendor: xxx Product: xxx)" from ID
    const gamepadId = gamepad.id.replace(/ \(.*?Vendor: \w+ Product: \w+\)$/, '');
    text += ` - ${gamepadId}`;

    let status;
    if (gamepad.connected) {
        const supportVibration = !!gamepad.vibrationActuator;
        status = (supportVibration ? '✅' : '❌') + ' ' + t('vibration-status');
    } else {
        status = t('disconnected');
    }

    Toast.show(text, status, { instant: false });
}

export function simplifyGamepadName(name: string) {
    return name.replace(/\s+\(.*Vendor: ([0-9a-f]{4}) Product: ([0-9a-f]{4})\)$/, ' ($1-$2)');
}

export function getUniqueGamepadNames() {
    const gamepads = window.navigator.getGamepads();
    const names: string[] = [];

    for (const gamepad of gamepads) {
        if (gamepad?.connected && gamepad.id !== VIRTUAL_GAMEPAD_ID) {
            !names.includes(gamepad.id) && names.push(gamepad.id);
        }
    }

    return names;
}

export function hasGamepad() {
    const gamepads = window.navigator.getGamepads();
    for (const gamepad of gamepads) {
        if (gamepad?.connected) {
            return true;
        }
    }

    return false;
}

export function generateVirtualControllerMapping(index: number, override: Partial<XcloudGamepad>={}) {
    const mapping = {
        GamepadIndex: index,
        A: 0,
        B: 0,
        X: 0,
        Y: 0,
        LeftShoulder: 0,
        RightShoulder: 0,
        LeftTrigger: 0,
        RightTrigger: 0,
        View: 0,
        Menu: 0,
        LeftThumb: 0,
        RightThumb: 0,
        DPadUp: 0,
        DPadDown: 0,
        DPadLeft: 0,
        DPadRight: 0,
        Nexus: 0,
        LeftThumbXAxis: 0,
        LeftThumbYAxis: 0,
        RightThumbXAxis: 0,
        RightThumbYAxis: 0,
        PhysicalPhysicality: 0,
        VirtualPhysicality: 0,
        Dirty: false,
        Virtual: false,
    };

    return Object.assign({}, mapping, override);
}

export function getGamepadPrompt(gamepadKey: GamepadKey): string {
    return GamepadKeyName[gamepadKey][1];
}

const XCLOUD_GAMEPAD_KEY_MAPPING: { [key in GamepadKey]?: keyof XcloudGamepad } = {
    [GamepadKey.A]: 'A',
    [GamepadKey.B]: 'B',
    [GamepadKey.X]: 'X',
    [GamepadKey.Y]: 'Y',

    [GamepadKey.UP]: 'DPadUp',
    [GamepadKey.RIGHT]: 'DPadRight',
    [GamepadKey.DOWN]: 'DPadDown',
    [GamepadKey.LEFT]: 'DPadLeft',

    [GamepadKey.LB]: 'LeftShoulder',
    [GamepadKey.RB]: 'RightShoulder',
    [GamepadKey.LT]: 'LeftTrigger',
    [GamepadKey.RT]: 'RightTrigger',

    [GamepadKey.L3]: 'LeftThumb',
    [GamepadKey.R3]: 'RightThumb',
    [GamepadKey.LS]: 'LeftStickAxes',
    [GamepadKey.RS]: 'RightStickAxes',

    [GamepadKey.SELECT]: 'View',
    [GamepadKey.START]: 'Menu',
    [GamepadKey.HOME]: 'Nexus',
    [GamepadKey.SHARE]: 'Share',

    [GamepadKey.LS_LEFT]: 'LeftThumbXAxis',
    [GamepadKey.LS_RIGHT]: 'LeftThumbXAxis',
    [GamepadKey.LS_UP]: 'LeftThumbYAxis',
    [GamepadKey.LS_DOWN]: 'LeftThumbYAxis',

    [GamepadKey.RS_LEFT]: 'RightThumbXAxis',
    [GamepadKey.RS_RIGHT]: 'RightThumbXAxis',
    [GamepadKey.RS_UP]: 'RightThumbYAxis',
    [GamepadKey.RS_DOWN]: 'RightThumbYAxis',
};

export function toXcloudGamepadKey(gamepadKey: GamepadKey) {
    return XCLOUD_GAMEPAD_KEY_MAPPING[gamepadKey];
}
