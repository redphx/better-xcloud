declare const e: {
    gamepad: Gamepad;
    repeat: number;
    leftMotorPercent: number;
    rightMotorPercent: number;
    leftTriggerMotorPercent: number;
    rightTriggerMotorPercent: number;
};

if (e?.gamepad?.connected) {
    const gamepadKey = window.BX_EXPOSED.localCoOpEnabled ? `${e.gamepad.id}::${e.gamepad.index}` : e.gamepad.id;
    const gamepadSettings = window.BX_STREAM_SETTINGS.controllers[gamepadKey];
    if (gamepadSettings?.customization) {
        const intensity = gamepadSettings.customization.vibrationIntensity;

        if (intensity <= 0) {
            e.repeat = 0;
            // @ts-ignore
            return;
        } else if (intensity < 1) {
            e.leftMotorPercent *= intensity;
            e.rightMotorPercent *= intensity;
            e.leftTriggerMotorPercent *= intensity;
            e.rightTriggerMotorPercent *= intensity;
        }
    }
}
