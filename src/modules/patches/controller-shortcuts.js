const currentGamepad = ${gamepadVar};

// Share button on XS controller
if (currentGamepad.buttons[17] && currentGamepad.buttons[17].pressed) {
    window.dispatchEvent(new Event(BxEvent.CAPTURE_SCREENSHOT));
}

const btnHome = currentGamepad.buttons[16];
if (btnHome) {
    if (!this.bxHomeStates) {
        this.bxHomeStates = {};
    }

    if (btnHome.pressed) {
        this.gamepadIsIdle.set(currentGamepad.index, false);

        if (this.bxHomeStates[currentGamepad.index]) {
            const lastTimestamp = this.bxHomeStates[currentGamepad.index].timestamp;

            if (currentGamepad.timestamp !== lastTimestamp) {
                this.bxHomeStates[currentGamepad.index].timestamp = currentGamepad.timestamp;

                const handled = window.BX_EXPOSED.handleControllerShortcut(currentGamepad);
                if (handled) {
                    this.bxHomeStates[currentGamepad.index].shortcutPressed += 1;
                }
            }
        } else {
            // First time pressing > save current timestamp
            window.BX_EXPOSED.resetControllerShortcut(currentGamepad.index);
            this.bxHomeStates[currentGamepad.index] = {
                    shortcutPressed: 0,
                    timestamp: currentGamepad.timestamp,
                };
        }

        // Listen to next button press
        const intervalMs = 16;
        this.inputConfiguration.useIntervalWorkerThreadForInput && this.intervalWorker ? this.intervalWorker.scheduleTimer(intervalMs) : this.pollGamepadssetTimeoutTimerID = setTimeout(this.pollGamepads, intervalMs);

        // Hijack this button
        return;
    } else if (this.bxHomeStates[currentGamepad.index]) {
        const info = structuredClone(this.bxHomeStates[currentGamepad.index]);

        // Home button released
        this.bxHomeStates[currentGamepad.index] = null;

        if (info.shortcutPressed === 0) {
            const fakeGamepadMappings = [{
                    GamepadIndex: currentGamepad.index,
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
                    Nexus: 1,
                    LeftThumbXAxis: 0,
                    LeftThumbYAxis: 0,
                    RightThumbXAxis: 0,
                    RightThumbYAxis: 0,
                    PhysicalPhysicality: 0,
                    VirtualPhysicality: 0,
                    Dirty: true,
                    Virtual: false,
                }];

            const isLongPress = (currentGamepad.timestamp - info.timestamp) >= 500;
            const intervalMs = isLongPress ? 500 : 100;

            this.inputSink.onGamepadInput(performance.now() - intervalMs, fakeGamepadMappings);
            this.inputConfiguration.useIntervalWorkerThreadForInput && this.intervalWorker ? this.intervalWorker.scheduleTimer(intervalMs) : this.pollGamepadssetTimeoutTimerID = setTimeout(this.pollGamepads, intervalMs);
            return;
        }
    }
}
