if (!window.BX_ENABLE_CONTROLLER_VIBRATION) {
    return void(0);
}

const intensity = window.BX_VIBRATION_INTENSITY;
if (intensity && intensity < 1) {
    e.leftMotorPercent *= intensity;
    e.rightMotorPercent *= intensity;
    e.leftTriggerMotorPercent *= intensity;
    e.rightTriggerMotorPercent *= intensity;
}
