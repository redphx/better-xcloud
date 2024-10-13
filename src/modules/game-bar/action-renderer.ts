import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { BaseGameBarAction } from "./action-base";
import { RendererShortcut } from "../shortcuts/shortcut-renderer";


export class RendererAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const $btnDefault = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.EYE,
            onClick: this.onClick.bind(this),
        });

        const $btnActivated = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.EYE_SLASH,
            onClick: this.onClick.bind(this),
            classes: ['bx-activated'],
        });

        this.$content = CE('div', {},
            $btnDefault,
            $btnActivated,
        );

        this.reset();
    }

    onClick(e: Event) {
        super.onClick(e);
        const isVisible = RendererShortcut.toggleVisibility();
        this.$content.dataset.activated = (!isVisible).toString();
    }

    render(): HTMLElement {
        return this.$content;
    }

    reset(): void {
        this.$content.dataset.activated = 'false';
    }
}
