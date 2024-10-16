import { CE } from "@utils/html";

type ToastOptions = {
    instant?: boolean;
    html?: boolean;
}

export class Toast {
    private static $wrapper: HTMLElement;
    private static $msg: HTMLElement;
    private static $status: HTMLElement;
    private static stack: Array<[string, string, ToastOptions]> = [];
    private static isShowing = false;

    private static timeout?: number | null;
    private static DURATION = 3000;

    static show(msg: string, status?: string, options: Partial<ToastOptions> = {}) {
        options = options || {};

        const args = Array.from(arguments) as [string, string, ToastOptions];
        if (options.instant) {
            // Clear stack
            Toast.stack = [args];
            Toast.showNext();
        } else {
            Toast.stack.push(args);
            !Toast.isShowing && Toast.showNext();
        }
    }

    private static showNext() {
        if (!Toast.stack.length) {
            Toast.isShowing = false;
            return;
        }

        Toast.isShowing = true;

        Toast.timeout && clearTimeout(Toast.timeout);
        Toast.timeout = window.setTimeout(Toast.hide, Toast.DURATION);

        // Get values from item
        const [msg, status, options] = Toast.stack.shift()!;

        if (options && options.html) {
            Toast.$msg.innerHTML = msg;
        } else {
            Toast.$msg.textContent = msg;
        }

        if (status) {
            Toast.$status.classList.remove('bx-gone');
            Toast.$status.textContent = status;
        } else {
            Toast.$status.classList.add('bx-gone');
        }

        const classList = Toast.$wrapper.classList;
        classList.remove('bx-offscreen', 'bx-hide');
        classList.add('bx-show');
    }

    private static hide() {
        Toast.timeout = null;

        const classList = Toast.$wrapper.classList;
        classList.remove('bx-show');
        classList.add('bx-hide');
    }

    static setup() {
        Toast.$wrapper = CE('div', {'class': 'bx-toast bx-offscreen'},
            Toast.$msg = CE('span', {'class': 'bx-toast-msg'}),
            Toast.$status = CE('span', {'class': 'bx-toast-status'}),
        );

        Toast.$wrapper.addEventListener('transitionend', e => {
            const classList = Toast.$wrapper.classList;
            if (classList.contains('bx-hide')) {
                classList.remove('bx-offscreen', 'bx-hide');
                classList.add('bx-offscreen');

                Toast.showNext();
            }
        });

        document.documentElement.appendChild(Toast.$wrapper);
    }
}
