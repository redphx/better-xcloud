import { Toast } from "@/utils/toast";
import { PointerClient } from "./pointer-client";
import { AppInterface, STATES } from "@/utils/global";
import { MkbHandler } from "./base-mkb-handler";
import { t } from "@/utils/translation";
import { BxEvent } from "@/utils/bx-event";
import { ButtonStyle, CE, createButton } from "@/utils/html";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";

type NativeMouseData = {
    X: number,
    Y: number,
    Buttons: number,
    WheelX: number,
    WheelY: number,
    Type? : 0,  // 0: Relative, 1: Absolute
}

type XcloudInputSink = {
    onMouseInput: (data: NativeMouseData) => void;
}

export class NativeMkbHandler extends MkbHandler {
    private static instance: NativeMkbHandler;
    public static getInstance = () => NativeMkbHandler.instance ?? (NativeMkbHandler.instance = new NativeMkbHandler());

    #pointerClient: PointerClient | undefined;
    #enabled: boolean = false;

    #mouseButtonsPressed = 0;
    #mouseWheelX = 0;
    #mouseWheelY = 0;

    #mouseVerticalMultiply = 0;
    #mouseHorizontalMultiply = 0;

    #inputSink: XcloudInputSink | undefined;

    #$message?: HTMLElement;

    #onKeyboardEvent(e: KeyboardEvent) {
        if (e.type === 'keyup' && e.code === 'F8') {
            e.preventDefault();
            this.toggle();
            return;
        }
    }

    #onPointerLockRequested(e: Event) {
        AppInterface.requestPointerCapture();
        this.start();
    }

    #onPointerLockExited(e: Event) {
        AppInterface.releasePointerCapture();
        this.stop();
    }

    #onPollingModeChanged = (e: Event) => {
        if (!this.#$message) {
            return;
        }

        const mode = (e as any).mode;
        if (mode === 'none') {
            this.#$message.classList.remove('bx-offscreen');
        } else {
            this.#$message.classList.add('bx-offscreen');
        }
    }

    #onDialogShown = () => {
        document.pointerLockElement && document.exitPointerLock();
    }

    #initMessage() {
        if (!this.#$message) {
            this.#$message = CE('div', {'class': 'bx-mkb-pointer-lock-msg'},
                CE('div', {},
                    CE('p', {}, t('native-mkb')),
                    CE('p', {}, t('press-key-to-toggle-mkb', {key: 'F8'})),
                ),

                CE('div', {'data-type': 'native'},
                    createButton({
                        style: ButtonStyle.PRIMARY | ButtonStyle.FULL_WIDTH | ButtonStyle.TALL,
                        label: t('activate'),
                        onClick: ((e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();

                            this.toggle(true);
                        }).bind(this),
                    }),

                    createButton({
                        style: ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH,
                        label: t('ignore'),
                        onClick: e => {
                            e.preventDefault();
                            e.stopPropagation();

                            this.#$message?.classList.add('bx-gone');
                        },
                    }),
                ),
            );
        }

        if (!this.#$message.isConnected) {
            document.documentElement.appendChild(this.#$message);
        }
    }

    handleEvent(event: Event) {
        switch (event.type) {
            case 'keyup':
                this.#onKeyboardEvent(event as KeyboardEvent);
                break;

            case BxEvent.XCLOUD_DIALOG_SHOWN:
                this.#onDialogShown();
                break;

            case BxEvent.POINTER_LOCK_REQUESTED:
                this.#onPointerLockRequested(event);
                break;
            case BxEvent.POINTER_LOCK_EXITED:
                this.#onPointerLockExited(event);
                break;

            case BxEvent.XCLOUD_POLLING_MODE_CHANGED:
                this.#onPollingModeChanged(event);
                break;
        }
    }

    init() {
        this.#pointerClient = PointerClient.getInstance();
        this.#inputSink = window.BX_EXPOSED.inputSink;

        // Stop keyboard input at startup
        this.#updateInputConfigurationAsync(false);

        try {
            this.#pointerClient.start(STATES.pointerServerPort, this);
        } catch (e) {
            Toast.show('Cannot enable Mouse & Keyboard feature');
        }

        this.#mouseVerticalMultiply = getPref(PrefKey.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY);
        this.#mouseHorizontalMultiply = getPref(PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY);

        window.addEventListener('keyup', this);

        window.addEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this);
        window.addEventListener(BxEvent.POINTER_LOCK_REQUESTED, this);
        window.addEventListener(BxEvent.POINTER_LOCK_EXITED, this);
        window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this);

        this.#initMessage();

        if (AppInterface) {
            Toast.show(t('press-key-to-toggle-mkb', {key: `<b>F8</b>`}), t('native-mkb'), {html: true});
            this.#$message?.classList.add('bx-gone');
        } else {
            this.#$message?.classList.remove('bx-gone');
        }
    }

    toggle(force?: boolean) {
        let setEnable: boolean;
        if (typeof force !== 'undefined') {
            setEnable = force;
        } else {
            setEnable = !this.#enabled;
        }

        if (setEnable) {
            document.documentElement.requestPointerLock();
        } else {
            document.exitPointerLock();
        }
    }

    #updateInputConfigurationAsync(enabled: boolean) {
        window.BX_EXPOSED.streamSession.updateInputConfigurationAsync({
            enableKeyboardInput: enabled,
            enableMouseInput: enabled,
            enableAbsoluteMouse: false,
            enableTouchInput: false,
        });
    }

    start() {
        this.#resetMouseInput();
        this.#enabled = true;

        this.#updateInputConfigurationAsync(true);

        window.BX_EXPOSED.stopTakRendering = true;
        this.#$message?.classList.add('bx-gone');

        Toast.show(t('native-mkb'), t('enabled'), {instant: true});
    }

    stop() {
        this.#resetMouseInput();
        this.#enabled = false;
        this.#updateInputConfigurationAsync(false);

        this.#$message?.classList.remove('bx-gone');
    }

    destroy(): void {
        this.#pointerClient?.stop();
        window.removeEventListener('keyup', this);

        window.removeEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this);
        window.removeEventListener(BxEvent.POINTER_LOCK_REQUESTED, this);
        window.removeEventListener(BxEvent.POINTER_LOCK_EXITED, this);
        window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this);

        this.#$message?.classList.add('bx-gone');
    }

    handleMouseMove(data: MkbMouseMove): void {
        this.#sendMouseInput({
            X: data.movementX,
            Y: data.movementY,
            Buttons: this.#mouseButtonsPressed,
            WheelX: this.#mouseWheelX,
            WheelY: this.#mouseWheelY,
        });
    }

    handleMouseClick(data: MkbMouseClick): void {
        const { pointerButton, pressed } = data;

        if (pressed) {
            this.#mouseButtonsPressed |= pointerButton!;
        } else {
            this.#mouseButtonsPressed ^= pointerButton!;
        }
        this.#mouseButtonsPressed = Math.max(0, this.#mouseButtonsPressed);

        this.#sendMouseInput({
            X: 0,
            Y: 0,
            Buttons: this.#mouseButtonsPressed,
            WheelX: this.#mouseWheelX,
            WheelY: this.#mouseWheelY,
        });
    }

    handleMouseWheel(data: MkbMouseWheel): boolean {
        const { vertical, horizontal } = data;

        this.#mouseWheelX = horizontal;
        if (this.#mouseHorizontalMultiply && this.#mouseHorizontalMultiply !== 1) {
            this.#mouseWheelX *= this.#mouseHorizontalMultiply;
        }

        this.#mouseWheelY = vertical;
        if (this.#mouseVerticalMultiply && this.#mouseVerticalMultiply !== 1) {
            this.#mouseWheelY *= this.#mouseVerticalMultiply;
        }

        this.#sendMouseInput({
            X: 0,
            Y: 0,
            Buttons: this.#mouseButtonsPressed,
            WheelX: this.#mouseWheelX,
            WheelY: this.#mouseWheelY,
        });

        return true;
    }

    setVerticalScrollMultiplier(vertical: number) {
        this.#mouseVerticalMultiply = vertical;
    }

    setHorizontalScrollMultiplier(horizontal: number) {
        this.#mouseHorizontalMultiply = horizontal;
    }

    waitForMouseData(enabled: boolean): void {
    }

    isEnabled(): boolean {
        return this.#enabled;
    }

    #sendMouseInput(data: NativeMouseData) {
        data.Type = 0;  // Relative
        this.#inputSink?.onMouseInput(data);
    }

    #resetMouseInput() {
        this.#mouseButtonsPressed = 0;
        this.#mouseWheelX = 0;
        this.#mouseWheelY = 0;

        this.#sendMouseInput({
            X: 0,
            Y: 0,
            Buttons: 0,
            WheelX: 0,
            WheelY: 0,
        });
    }
}
