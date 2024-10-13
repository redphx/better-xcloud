import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { BaseGameBarAction } from "./action-base";
import { RendererShortcut } from "../shortcuts/shortcut-renderer";


export class RendererAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const onClick = (e: Event) => {
            BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
            const isVisible = RendererShortcut.toggleVisibility();
            this.$content.dataset.activated = (!isVisible).toString();
        };

        const $btnDefault = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.EYE,
            onClick: onClick,
        });

        const $btnActivated = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.EYE_SLASH,
            onClick: onClick,
            classes: ['bx-activated'],
        });

        this.$content = CE('div', {},
            $btnDefault,
            $btnActivated,
        );

        this.reset();
    }

    render(): HTMLElement {
        return this.$content;
    }

    reset(): void {
        this.$content.dataset.activated = 'false';
    }
}
