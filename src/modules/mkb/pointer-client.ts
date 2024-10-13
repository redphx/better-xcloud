import { BxLogger } from "@/utils/bx-logger";
import { Toast } from "@/utils/toast";
import type { MkbHandler } from "./base-mkb-handler";

const LOG_TAG = 'PointerClient';

enum PointerAction {
    MOVE = 1,
    BUTTON_PRESS = 2,
    BUTTON_RELEASE = 3,
    SCROLL = 4,
    POINTER_CAPTURE_CHANGED = 5,
}


export class PointerClient {
    private static instance: PointerClient;
    public static getInstance(): PointerClient {
        if (!PointerClient.instance) {
            PointerClient.instance = new PointerClient();
        }

        return PointerClient.instance;
    }

    private socket: WebSocket | undefined | null;
    private mkbHandler: MkbHandler | undefined;

    start(port: number, mkbHandler: MkbHandler) {
        if (!port) {
            throw new Error('PointerServer port is 0');
        }

        this.mkbHandler = mkbHandler;

        // Create WebSocket connection.
        this.socket = new WebSocket(`ws://localhost:${port}`);
        this.socket.binaryType = 'arraybuffer';

        // Connection opened
        this.socket.addEventListener('open', (event) => {
            BxLogger.info(LOG_TAG, 'connected')
        });

        // Error
        this.socket.addEventListener('error', (event) => {
            BxLogger.error(LOG_TAG, event);
            Toast.show('Cannot setup mouse: ' + event);
        });

        this.socket.addEventListener('close', (event) => {
            this.socket = null;
        });

        // Listen for messages
        this.socket.addEventListener('message', (event) => {
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

        this.mkbHandler?.handleMouseMove({
            movementX: x,
            movementY: y,
        });
        // BxLogger.info(LOG_TAG, 'move', x, y);
    }

    onPress(messageType: PointerAction, dataView: DataView, offset: number) {
        const button = dataView.getUint8(offset);

        this.mkbHandler?.handleMouseClick({
            pointerButton: button,
            pressed: messageType === PointerAction.BUTTON_PRESS,
        });

        // BxLogger.info(LOG_TAG, 'press', buttonIndex);
    }

    onScroll(dataView: DataView, offset: number) {
        // [V_SCROLL, H_SCROLL]
        const vScroll = dataView.getInt16(offset);
        offset += Int16Array.BYTES_PER_ELEMENT;
        const hScroll = dataView.getInt16(offset);

        this.mkbHandler?.handleMouseWheel({
            vertical: vScroll,
            horizontal: hScroll,
        });

        // BxLogger.info(LOG_TAG, 'scroll', vScroll, hScroll);
    }

    onPointerCaptureChanged(dataView: DataView, offset: number) {
        const hasCapture = dataView.getInt8(offset) === 1;
        !hasCapture && this.mkbHandler?.stop();
    }

    stop() {
        try {
            this.socket?.close();
        } catch (e) {}
        this.socket = null;
    }
}
