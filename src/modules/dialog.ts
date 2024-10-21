import { t } from "@utils/translation";
import { CE, createButton, ButtonStyle } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";

type DialogOptions = Partial<{
    title: string;
    className: string;
    content: string | HTMLElement;
    hideCloseButton: boolean;
    onClose: string;
    helpUrl: string;
}>;

export class Dialog {
    $dialog: HTMLElement;
    $title: HTMLElement;
    $content: HTMLElement;
    $overlay: HTMLElement;

    onClose: any;

    constructor(options: DialogOptions) {
        const {
            title,
            className,
            content,
            hideCloseButton,
            onClose,
            helpUrl,
        } = options;

        // Create dialog overlay
        const $overlay = document.querySelector<HTMLElement>('.bx-dialog-overlay');

        if (!$overlay) {
            this.$overlay = CE('div', {'class': 'bx-dialog-overlay bx-gone'});

            // Disable right click
            this.$overlay.addEventListener('contextmenu', e => e.preventDefault());

            document.documentElement.appendChild(this.$overlay);
        } else {
            this.$overlay = $overlay;
        }

        let $close;
        this.onClose = onClose;
        this.$dialog = CE('div', {'class': `bx-dialog ${className || ''} bx-gone`},
                this.$title = CE('h2', {}, CE('b', {}, title),
                        helpUrl && createButton({
                                icon: BxIcon.QUESTION,
                                style: ButtonStyle.GHOST,
                                title: t('help'),
                                url: helpUrl,
                            }),
                    ),
                this.$content = CE('div', {'class': 'bx-dialog-content'}, content),
                !hideCloseButton && ($close = CE('button', {type: 'button'}, t('close'))),
            );

        $close && $close.addEventListener('click', e => {
            this.hide(e);
        });

        !title && this.$title.classList.add('bx-gone');
        !content && this.$content.classList.add('bx-gone');

        // Disable right click
        this.$dialog.addEventListener('contextmenu', e => e.preventDefault());

        document.documentElement.appendChild(this.$dialog);
    }

    show(newOptions: DialogOptions) {
        // Clear focus
        document.activeElement && (document.activeElement as HTMLElement).blur();

        if (newOptions && newOptions.title) {
            this.$title.querySelector('b')!.textContent = newOptions.title;
            this.$title.classList.remove('bx-gone');
        }

        this.$dialog.classList.remove('bx-gone');
        this.$overlay.classList.remove('bx-gone');

        document.body.classList.add('bx-no-scroll');
    }

    hide(e?: any) {
        this.$dialog.classList.add('bx-gone');
        this.$overlay.classList.add('bx-gone');

        document.body.classList.remove('bx-no-scroll');

        this.onClose && this.onClose(e);
    }

    toggle() {
        this.$dialog.classList.toggle('bx-gone');
        this.$overlay.classList.toggle('bx-gone');
    }
}
