import { MouseButtonCode, WheelCode } from "./definitions";

export class KeyHelper {
    static #NON_PRINTABLE_KEYS = {
        'Backquote': '`',

        // Mouse buttons
        [MouseButtonCode.LEFT_CLICK]: 'Left Click',
        [MouseButtonCode.RIGHT_CLICK]: 'Right Click',
        [MouseButtonCode.MIDDLE_CLICK]: 'Middle Click',

        [WheelCode.SCROLL_UP]: 'Scroll Up',
        [WheelCode.SCROLL_DOWN]: 'Scroll Down',
        [WheelCode.SCROLL_LEFT]: 'Scroll Left',
        [WheelCode.SCROLL_RIGHT]: 'Scroll Right',
    };

    static getKeyFromEvent(e: Event) {
        let code;
        let name;

        if (e instanceof KeyboardEvent) {
            code = e.code || e.key;
        } else if (e instanceof WheelEvent) {
            if (e.deltaY < 0) {
                code = WheelCode.SCROLL_UP;
            } else if (e.deltaY > 0) {
                code = WheelCode.SCROLL_DOWN;
            } else if (e.deltaX < 0) {
                code = WheelCode.SCROLL_LEFT;
            } else if (e.deltaX > 0) {
                code = WheelCode.SCROLL_RIGHT;
            }
        } else if (e instanceof MouseEvent) {
            code = 'Mouse' + e.button;
        }

        if (code) {
            name = KeyHelper.codeToKeyName(code);
        }

        return code ? {code, name} : null;
    }

    static codeToKeyName(code: string) {
        return (
            // @ts-ignore
            KeyHelper.#NON_PRINTABLE_KEYS[code]
            ||
            (code.startsWith('Key') && code.substring(3))
            ||
            (code.startsWith('Digit') && code.substring(5))
            ||
            (code.startsWith('Numpad') && ('Numpad ' + code.substring(6)))
            ||
            (code.startsWith('Arrow') && ('Arrow ' + code.substring(5)))
            ||
            (code.endsWith('Lock') && (code.replace('Lock', ' Lock')))
            ||
            (code.endsWith('Left') && ('Left ' + code.replace('Left', '')))
            ||
            (code.endsWith('Right') && ('Right ' + code.replace('Right', '')))
            ||
            code
        );
    }
}
