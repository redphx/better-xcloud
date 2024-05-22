const currentGamepad = ${gamepadVar};

if (currentGamepad.buttons[17] && currentGamepad.buttons[17].value === 1) {
    window.dispatchEvent(new Event(BxEvent.CAPTURE_SCREENSHOT));
}
