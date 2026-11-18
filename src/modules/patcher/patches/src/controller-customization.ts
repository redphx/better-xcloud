import { BxEvent as BxEventNamespace } from "@/utils/bx-event";

// "currentGamepad" variable in poll-gamepad.js
declare const currentGamepad: Gamepad;
declare const $xCloudGamepadVar$: XcloudGamepad;
declare const BxEvent: typeof BxEventNamespace;

// Share button on XS controller
const shareButtonPressed = currentGamepad.buttons[17]?.pressed;
let shareButtonHandled = false;

const xCloudGamepad: XcloudGamepad = $xCloudGamepadVar$;
if (currentGamepad.id in window.BX_STREAM_SETTINGS.controllers) {
    const controller = window.BX_STREAM_SETTINGS.controllers[currentGamepad.id];
    if (controller?.customization) {
        const MIN_RANGE = 0.1;

        // Skip all the mapping work when no input is active: the block below
        // allocates 2 objects and iterates the mapping on every poll (up to
        // 120 Hz) even when the controller is idle.
        let anyInput = shareButtonPressed
            || xCloudGamepad.LeftThumbXAxis
            || xCloudGamepad.LeftThumbYAxis
            || xCloudGamepad.RightThumbXAxis
            || xCloudGamepad.RightThumbYAxis
            || xCloudGamepad.LeftTrigger
            || xCloudGamepad.RightTrigger;
        if (!anyInput) {
            // A button can be pressed while the sticks are centered and the
            // triggers at rest — check the raw button states too.
            const buttons = currentGamepad.buttons;
            for (let i = 0; i < buttons.length; i++) {
                if (buttons[i]?.pressed) {
                    anyInput = true;
                    break;
                }
            }
        }

        if (anyInput) {
            const { mapping, ranges } = controller.customization;
            const pressedButtons: PartialRecord<keyof XcloudGamepad, number> = {};
            const releasedButtons: PartialRecord<keyof XcloudGamepad, number> = {};
            let isModified = false;

            // Limit left trigger range
            if (ranges.LeftTrigger) {
                const [from, to] = ranges.LeftTrigger;
                xCloudGamepad.LeftTrigger = xCloudGamepad.LeftTrigger > to ? 1 : xCloudGamepad.LeftTrigger;
                xCloudGamepad.LeftTrigger = xCloudGamepad.LeftTrigger < from ? 0 : xCloudGamepad.LeftTrigger;
            }

            // Limit right trigger range
            if (ranges.RightTrigger) {
                const [from, to] = ranges.RightTrigger;
                xCloudGamepad.RightTrigger = xCloudGamepad.RightTrigger > to ? 1 : xCloudGamepad.RightTrigger;
                xCloudGamepad.RightTrigger = xCloudGamepad.RightTrigger < from ? 0 : xCloudGamepad.RightTrigger;
            }

            // Limit left stick deadzone
            if (ranges.LeftThumb) {
                const [from, to] = ranges.LeftThumb;

                const xAxis = xCloudGamepad.LeftThumbXAxis;
                const yAxis = xCloudGamepad.LeftThumbYAxis;

                const range = Math.abs(Math.sqrt(xAxis * xAxis + yAxis * yAxis));
                let newRange = range > to ? 1 : range;
                newRange = newRange < from ? 0 : newRange;

                if (newRange !== range) {
                    xCloudGamepad.LeftThumbXAxis = xAxis * (newRange / range);
                    xCloudGamepad.LeftThumbYAxis = yAxis * (newRange / range);
                }
            }

            // Limit right stick deadzone
            if (ranges.RightThumb) {
                const [from, to] = ranges.RightThumb;

                const xAxis = xCloudGamepad.RightThumbXAxis;
                const yAxis = xCloudGamepad.RightThumbYAxis;

                const range = Math.abs(Math.sqrt(xAxis * xAxis + yAxis * yAxis));
                let newRange = range > to ? 1 : range;
                newRange = newRange < from ? 0 : newRange;

                if (newRange !== range) {
                    xCloudGamepad.RightThumbXAxis = xAxis * (newRange / range);
                    xCloudGamepad.RightThumbYAxis = yAxis * (newRange / range);
                }
            }

            // Handle the Share button
            if (shareButtonPressed && 'Share' in mapping) {
                const targetButton = mapping['Share'];
                if (typeof targetButton === 'string') {
                    pressedButtons[targetButton] = 1;
                }

                // Don't send capturing request
                shareButtonHandled = true;
                delete mapping['Share'];
            }

            // Handle other buttons
            let key: keyof typeof mapping;
            for (key in mapping) {
                const mappedKey = mapping[key];

                if (key === 'LeftStickAxes' || key === 'RightStickAxes') {
                    let sourceX: keyof XcloudGamepad;
                    let sourceY: keyof XcloudGamepad;
                    let targetX: keyof XcloudGamepad;
                    let targetY: keyof XcloudGamepad;

                    if (key === 'LeftStickAxes') {
                        sourceX = 'LeftThumbXAxis';
                        sourceY = 'LeftThumbYAxis';
                        targetX = 'RightThumbXAxis';
                        targetY = 'RightThumbYAxis';
                    } else {
                        sourceX = 'RightThumbXAxis';
                        sourceY = 'RightThumbYAxis';
                        targetX = 'LeftThumbXAxis';
                        targetY = 'LeftThumbYAxis';
                    }

                    if (typeof mappedKey === 'string') {
                        // Calculate moved range
                        const rangeX = xCloudGamepad[sourceX];
                        const rangeY = xCloudGamepad[sourceY];
                        const movedRange = Math.abs(Math.sqrt(rangeX * rangeX + rangeY * rangeY));
                        const moved = movedRange >= MIN_RANGE;

                        // Swap sticks
                        if (moved) {
                            pressedButtons[targetX] = rangeX;
                            pressedButtons[targetY] = rangeY;
                        }
                    }

                    // Unbind original stick
                    releasedButtons[sourceX] = 0;
                    releasedButtons[sourceY] = 0;

                    isModified = true;
                } else if (typeof mappedKey === 'string') {
                    let pressed = false;
                    let value = 0;

                    if (key === 'LeftTrigger' || key === 'RightTrigger') {
                        // Only set pressed state when pressing pass max range
                        const currentRange = xCloudGamepad[key];
                        if (mappedKey === 'LeftTrigger' || mappedKey === 'RightTrigger') {
                            pressed = currentRange >= MIN_RANGE;
                            value = currentRange;
                        } else {
                            pressed = true;
                            value = currentRange >= 0.9 ? 1 : 0;
                        }
                    } else if (xCloudGamepad[key]) {
                        pressed = true;
                        value = xCloudGamepad[key] as number;
                    }

                    if (pressed) {
                        // Only copy button value when it's being pressed
                        pressedButtons[mappedKey] = value;
                        // Unbind original button
                        releasedButtons[key] = 0;

                        isModified = true;
                    }
                } else if (mappedKey === false) {
                    // Disable key
                    pressedButtons[key] = 0;

                    isModified = true;
                }
            }

            isModified && Object.assign(xCloudGamepad, releasedButtons, pressedButtons);
        }
    }
}

// Capture screenshot when the Share button is pressed
if (shareButtonPressed && !shareButtonHandled) {
    window.dispatchEvent(new Event(BxEvent.CAPTURE_SCREENSHOT));
}
