import { CE } from "./html";

type ToastOptions = {
    instant?: boolean;
}

export class Toast {
    static #$wrapper: HTMLElement;
    static #$msg: HTMLElement;
    static #$status: HTMLElement;
    static #stack: Array<[string, string, ToastOptions]> = [];
    static #isShowing = false;

    static #timeout?: number | null;
    static #DURATION = 3000;

    static show(msg: string, status: string, options: ToastOptions={}) {
        options = options || {};

        const args = Array.from(arguments) as [string, string, ToastOptions];
        if (options.instant) {
            // Clear stack
            Toast.#stack = [args];
            Toast.#showNext();
        } else {
            Toast.#stack.push(args);
            !Toast.#isShowing && Toast.#showNext();
        }
    }

    static #showNext() {
        if (!Toast.#stack.length) {
            Toast.#isShowing = false;
            return;
        }

        Toast.#isShowing = true;

        Toast.#timeout && clearTimeout(Toast.#timeout);
        Toast.#timeout = setTimeout(Toast.#hide, Toast.#DURATION);

        // Get values from item
        const [msg, status, _] = Toast.#stack.shift()!;

        Toast.#$msg.textContent = msg;

        if (status) {
            Toast.#$status.classList.remove('bx-gone');
            Toast.#$status.textContent = status;
        } else {
            Toast.#$status.classList.add('bx-gone');
        }

        const classList = Toast.#$wrapper.classList;
        classList.remove('bx-offscreen', 'bx-hide');
        classList.add('bx-show');
    }

    static #hide() {
        Toast.#timeout = null;

        const classList = Toast.#$wrapper.classList;
        classList.remove('bx-show');
        classList.add('bx-hide');
    }

    static setup() {
        Toast.#$wrapper = CE('div', {'class': 'bx-toast bx-offscreen'},
                                        Toast.#$msg = CE('span', {'class': 'bx-toast-msg'}),
                                        Toast.#$status = CE('span', {'class': 'bx-toast-status'}));

        Toast.#$wrapper.addEventListener('transitionend', e => {
            const classList = Toast.#$wrapper.classList;
            if (classList.contains('bx-hide')) {
                classList.remove('bx-offscreen', 'bx-hide');
                classList.add('bx-offscreen');

                Toast.#showNext();
            }
        });

        document.documentElement.appendChild(Toast.#$wrapper);
    }
}
