import { CE } from "@/utils/html";

export class FullscreenText {
    private static instance: FullscreenText;
    public static getInstance = () => FullscreenText.instance ?? (FullscreenText.instance = new FullscreenText());

    $text: HTMLElement;

    constructor() {
        this.$text = CE('div', {
            class: 'bx-fullscreen-text bx-gone',
        });

        document.documentElement.appendChild(this.$text);
    }

    show(msg: string) {
        document.body.classList.add('bx-no-scroll');

        this.$text.classList.remove('bx-gone');
        this.$text.textContent = msg;
    }

    hide() {
        document.body.classList.remove('bx-no-scroll');
        this.$text.classList.add('bx-gone');
    }
}
