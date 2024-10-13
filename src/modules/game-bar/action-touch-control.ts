import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { TouchController } from "@modules/touch-controller";
import { BaseGameBarAction } from "./action-base";
import { t } from "@utils/translation";

export class TouchControlAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const $btnEnable = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.TOUCH_CONTROL_ENABLE,
            title: t('show-touch-controller'),
            onClick: this.onClick.bind(this),
        });

        const $btnDisable = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.TOUCH_CONTROL_DISABLE,
            title: t('hide-touch-controller'),
            onClick: this.onClick.bind(this),
            classes: ['bx-activated'],
        });

        this.$content = CE('div', {},
            $btnEnable,
            $btnDisable,
        );

        this.reset();
    }

    onClick(e: Event) {
        super.onClick(e);
        const isVisible = TouchController.toggleVisibility();
        this.$content.dataset.activated = (!isVisible).toString();
    }

    render(): HTMLElement {
        return this.$content;
    }

    reset(): void {
        this.$content.dataset.activated = 'false';
    }
}
