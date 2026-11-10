import { GamepadKey } from "@enums/gamepad";
import { StreamPref } from "@enums/pref-keys";
import { getStreamPref } from "@/utils/pref-utils";
import { getGamepadKey } from "@/utils/gamepad";
import { ShortcutHandler } from "@/utils/shortcut-handler";


export class ControllerShortcut {
    private static buttonsCache: { [key: string]: boolean[] } = {};
    private static buttonsStatus: { [key: string]: boolean[] } = {};

    static reset(index: number) {
        ControllerShortcut.buttonsCache[index] = [];
        ControllerShortcut.buttonsStatus[index] = [];
    }

    static handle(gamepad: Gamepad): boolean {
        const gamepadKey = getGamepadKey(gamepad, getStreamPref(StreamPref.LOCAL_CO_OP_ENABLED));
        const controllerSettings = window.BX_STREAM_SETTINGS.controllers[gamepadKey];
        if (!controllerSettings) {
            return false;
        }

        const actions = controllerSettings.shortcuts;
        if (!actions) {
            return false;
        }

        const gamepadIndex = gamepad.index;

        // Move the buttons status from the previous frame to the cache
        ControllerShortcut.buttonsCache[gamepadIndex] = ControllerShortcut.buttonsStatus[gamepadIndex].slice(0);
        // Clear the buttons status
        ControllerShortcut.buttonsStatus[gamepadIndex] = [];

        const pressed: boolean[] = [];
        let otherButtonPressed = false;

        const entries = gamepad.buttons.entries();
        let index: GamepadKey;
        let button: GamepadButton;
        for ([index, button] of entries) {
            // Only add the newly pressed button to the array (holding doesn't count)
            if (button.pressed && index !== GamepadKey.HOME) {
                otherButtonPressed = true;
                pressed[index] = true;

                // If this is newly pressed button -> run action
                if (actions[index] && !ControllerShortcut.buttonsCache[gamepadIndex][index]) {
                    const idx = index;
                    setTimeout(() => ShortcutHandler.runAction(actions[idx]!), 0);
                }
            }
        };

        ControllerShortcut.buttonsStatus[gamepadIndex] = pressed;
        return otherButtonPressed;
    }
}
