import { BxLogger as OrgBxLogger } from "@/utils/bx-logger";

declare const BxLogger: typeof OrgBxLogger;
declare const $this$: any;

// Save the original onGamepadChanged() and onGamepadInput()
$this$.orgOnGamepadChanged = $this$.onGamepadChanged;
$this$.orgOnGamepadInput = $this$.onGamepadInput;

let match;
let onGamepadChangedStr = $this$.onGamepadChanged.toString();

// Fix problem with Safari
if (onGamepadChangedStr.startsWith('function ')) {
    onGamepadChangedStr = onGamepadChangedStr.substring(9);
}

onGamepadChangedStr = onGamepadChangedStr.replaceAll('0', 'window.BX_EXPOSED.getGamepadPlayerSlot(arguments[1])');
eval(`$this$.patchedOnGamepadChanged = function ${onGamepadChangedStr}`);

let onGamepadInputStr = $this$.onGamepadInput.toString();
// Fix problem with Safari
if (onGamepadInputStr.startsWith('function ')) {
    onGamepadInputStr = onGamepadInputStr.substring(9);
}

match = onGamepadInputStr.match(/(\w+\.GamepadIndex)/);
if (match) {
    const gamepadIndexVar = match[0];
    onGamepadInputStr = onGamepadInputStr.replace('$this$.gamepadStates.get(', `$this$.gamepadStates.get(window.BX_EXPOSED.getGamepadPlayerSlot(${gamepadIndexVar}),`);
    eval(`$this$.patchedOnGamepadInput = function ${onGamepadInputStr}`);
    BxLogger.info('supportLocalCoOp', '✅ Successfully patched local co-op support');
} else {
    BxLogger.error('supportLocalCoOp', '❌ Unable to patch local co-op support');
}

// Add method to switch between patched and original methods
$this$.toggleLocalCoOp = (enable: boolean) => {
    BxLogger.info('toggleLocalCoOp', enable ? 'Enabled' : 'Disabled');

    $this$.onGamepadChanged = enable ? $this$.patchedOnGamepadChanged : $this$.orgOnGamepadChanged;
    $this$.onGamepadInput = enable ? $this$.patchedOnGamepadInput : $this$.orgOnGamepadInput;

    // Reconnect all gamepads
    const gamepads = window.navigator.getGamepads();
    for (const gamepad of gamepads) {
        if (!gamepad?.connected) {
            continue;
        }

        // Ignore virtual controller
        if (gamepad.id.includes('Better xCloud')) {
            continue;
        }

        // Don't show toast
        (gamepad as any)._noToast = true;

        window.dispatchEvent(new GamepadEvent('gamepaddisconnected', { gamepad }));
        window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad }));
    }
};

// Expose this method
window.BX_EXPOSED.toggleLocalCoOp = $this$.toggleLocalCoOp.bind(this);
