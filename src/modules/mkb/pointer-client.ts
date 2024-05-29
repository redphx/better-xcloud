import { BxLogger } from "@/utils/bx-logger";
import type { MkbHandler } from "./mkb-handler";
import { KeyHelper } from "./key-helper";
import { WheelCode } from "./definitions";
import { Toast } from "@/utils/toast";

const LOG_TAG = 'PointerClient';

enum PointerAction {
    MOVE = 1,
    BUTTON_PRESS = 2,
    BUTTON_RELEASE = 3,
    SCROLL = 4,
    POINTER_CAPTURE_CHANGED = 5,
}

const FixedMouseIndex = {
    1: 0,
    2: 2,
    4: 1,
}

export class PointerClient {
    static #PORT = 9269;

    private static instance: PointerClient;
    public static getInstance(): PointerClient {
        if (!PointerClient.instance) {
            PointerClient.instance = new PointerClient();
        }

        return PointerClient.instance;
    }

    #socket: WebSocket | undefined | null;
    #mkbHandler: MkbHandler | undefined;

    start(mkbHandler: MkbHandler) {
        this.#mkbHandler = mkbHandler;

        // Create WebSocket connection.
        this.#socket = new WebSocket(`ws://localhost:${PointerClient.#PORT}`);
        this.#socket.binaryType = 'arraybuffer';

        // Connection opened
        this.#socket.addEventListener('open', (event) => {
            BxLogger.info(LOG_TAG, 'connected')
        });

        // Error
        this.#socket.addEventListener('error', (event) => {
            BxLogger.error(LOG_TAG, event);
            Toast.show('Cannot setup mouse');
        });

        this.#socket.addEventListener('close', (event) => {
            this.#socket = null;
        });

        // Listen for messages
        this.#socket.addEventListener('message', (event) => {
            const dataView = new DataView(event.data);

            let messageType = dataView.getInt8(0);
            let offset = Int8Array.BYTES_PER_ELEMENT;
            switch (messageType) {
                case PointerAction.MOVE:
                    this.onMove(dataView, offset);
                    break;

                case PointerAction.BUTTON_PRESS:
                case PointerAction.BUTTON_RELEASE:
                    this.onPress(messageType, dataView, offset);
                    break;

                case PointerAction.SCROLL:
                    this.onScroll(dataView, offset);
                    break;

                case PointerAction.POINTER_CAPTURE_CHANGED:
                    this.onPointerCaptureChanged(dataView, offset);
            }
        });
    }

    onMove(dataView: DataView, offset: number) {
        // [X, Y]
        const x = dataView.getInt16(offset);
        offset += Int16Array.BYTES_PER_ELEMENT;
        const y = dataView.getInt16(offset);

        this.#mkbHandler?.handleMouseMove({
            movementX: x,
            movementY: y,
        });
        // BxLogger.info(LOG_TAG, 'move', x, y);
    }

    onPress(messageType: PointerAction, dataView: DataView, offset: number) {
        const buttonIndex = dataView.getInt8(offset);
        const fixedIndex = FixedMouseIndex[buttonIndex as keyof typeof FixedMouseIndex];
        const keyCode = 'Mouse' + fixedIndex;

        this.#mkbHandler?.handleMouseClick({
            key: {
                code: keyCode,
                name: KeyHelper.codeToKeyName(keyCode),
            },
            pressed: messageType === PointerAction.BUTTON_PRESS,
        });

        // BxLogger.info(LOG_TAG, 'press', buttonIndex);
    }

    onScroll(dataView: DataView, offset: number) {
        // [V_SCROLL, H_SCROLL]
        const vScroll = dataView.getInt8(offset);
        offset += Int8Array.BYTES_PER_ELEMENT;
        const hScroll = dataView.getInt8(offset);

        let code = '';
        if (vScroll < 0) {
            code = WheelCode.SCROLL_UP;
        } else if (vScroll > 0) {
            code = WheelCode.SCROLL_DOWN;
        } else if (hScroll < 0) {
            code = WheelCode.SCROLL_LEFT;
        } else if (hScroll > 0) {
            code = WheelCode.SCROLL_RIGHT;
        }

        code && this.#mkbHandler?.handleMouseWheel({
            key: {
                code: code,
                name: KeyHelper.codeToKeyName(code),
            },
        });

        // BxLogger.info(LOG_TAG, 'scroll', vScroll, hScroll);
    }

    onPointerCaptureChanged(dataView: DataView, offset: number) {
        const hasCapture = dataView.getInt8(offset) === 1;
        !hasCapture && this.#mkbHandler?.stop();
    }

    stop() {
        try {
            this.#socket?.close();
        } catch (e) {}
    }
}
