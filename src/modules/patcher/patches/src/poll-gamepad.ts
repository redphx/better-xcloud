type GamepadManager = {
    pollGamepadssetTimeoutTimerID: number;
    intervalWorker: any;
    pollGamepads(pollGamepads: any, arg1: number): any;
    gamepadIsIdle: any;
    inputSink: any;
    inputConfiguration: any;

    bxHomeStates: any;
};

declare const $gamepadVar$: Gamepad;
declare const $this$: GamepadManager;

const self = $this$;
if (window.BX_EXPOSED.disableGamepadPolling) {
    self.inputConfiguration.useIntervalWorkerThreadForInput && self.intervalWorker ? self.intervalWorker.scheduleTimer(50) : self.pollGamepadssetTimeoutTimerID = window.setTimeout(self.pollGamepads, 50);
    // @ts-ignore
    return;
}

const currentGamepad = $gamepadVar$;

// Guard against gamepads that report no buttons array (see #991):
// `buttons[16]` on `undefined` throws and silently kills the whole polling
// loop — controller input then stops working until a reload.
const btnHome = currentGamepad.buttons?.[16];
// Controller shortcuts
if (btnHome) {
    if (!self.bxHomeStates) {
        self.bxHomeStates = {};
    }

    let intervalMs = 0;
    let hijack = false;

    if (btnHome.pressed) {
        hijack = true;
        intervalMs = 16;
        self.gamepadIsIdle.set(currentGamepad.index, false);

        if (self.bxHomeStates[currentGamepad.index]) {
            const lastTimestamp = self.bxHomeStates[currentGamepad.index].timestamp;

            if (currentGamepad.timestamp !== lastTimestamp) {
                self.bxHomeStates[currentGamepad.index].timestamp = currentGamepad.timestamp;

                const handled = window.BX_EXPOSED.handleControllerShortcut(currentGamepad);
                if (handled) {
                    self.bxHomeStates[currentGamepad.index].shortcutPressed += 1;
                }
            }
        } else {
            // First time pressing > save current timestamp
            window.BX_EXPOSED.resetControllerShortcut(currentGamepad.index);
            self.bxHomeStates[currentGamepad.index] = {
                shortcutPressed: 0,
                timestamp: currentGamepad.timestamp,
            };
        }
    } else if (self.bxHomeStates[currentGamepad.index]) {
        hijack = true;
        const info = structuredClone(self.bxHomeStates[currentGamepad.index]);

        // Home button released
        self.bxHomeStates[currentGamepad.index] = null;

        if (info.shortcutPressed === 0) {
            const fakeGamepadMappings: XcloudGamepad[] = [{
                GamepadIndex: currentGamepad.index,
                A: 0, B: 0, X: 0, Y: 0,
                LeftShoulder: 0, RightShoulder: 0,
                LeftTrigger: 0, RightTrigger: 0,
                View: 0, Menu: 0,
                LeftThumb: 0, RightThumb: 0,
                DPadUp: 0, DPadDown: 0, DPadLeft: 0, DPadRight: 0,
                Nexus: 1,
                LeftThumbXAxis: 0, LeftThumbYAxis: 0,
                RightThumbXAxis: 0, RightThumbYAxis: 0,
                PhysicalPhysicality: 0, VirtualPhysicality: 0,
                Dirty: true, Virtual: false,
            }];

            const isLongPress = (currentGamepad.timestamp - info.timestamp) >= 500;
            intervalMs = isLongPress ? 500 : 100;

            self.inputSink.onGamepadInput(performance.now() - intervalMs, fakeGamepadMappings);
        } else {
            intervalMs = window.BX_STREAM_SETTINGS.controllerPollingRate;
        }
    }

    if (hijack && intervalMs) {
        // Listen to next button press
        self.inputConfiguration.useIntervalWorkerThreadForInput && self.intervalWorker ? self.intervalWorker.scheduleTimer(intervalMs) : self.pollGamepadssetTimeoutTimerID = setTimeout(self.pollGamepads, intervalMs);

        // Hijack this button
        // @ts-ignore
        return;
    }
}
