let match;
let onGamepadChangedStr = this.onGamepadChanged.toString();

onGamepadChangedStr = onGamepadChangedStr.replaceAll('0', 'arguments[1]');
eval(`this.onGamepadChanged = function ${onGamepadChangedStr}`);

let onGamepadInputStr = this.onGamepadInput.toString();

match = onGamepadInputStr.match(/(\w+\.GamepadIndex)/);
if (match) {
    const gamepadIndexVar = match[0];
    onGamepadInputStr = onGamepadInputStr.replace('this.gamepadStates.get(', `this.gamepadStates.get(${gamepadIndexVar},`);
    eval(`this.onGamepadInput = function ${onGamepadInputStr}`);
    BxLogger.info('supportLocalCoOp', '✅ Successfully patched local co-op support');
} else {
    BxLogger.error('supportLocalCoOp', '❌ Unable to patch local co-op support');
}
