import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { TouchController } from "@modules/touch-controller";
import { BaseGameBarAction } from "./action-base";
import { t } from "@utils/translation";

export class TouchControlAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const onClick = (e: Event) => {
            BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);

            const $parent = (e as any).target.closest('div[data-activated]');
            const isVisible =  TouchController.toggleVisibility();
            $parent.dataset.activated = (!isVisible).toString();
        };

        const $btnEnable = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.TOUCH_CONTROL_ENABLE,
            title: t('show-touch-controller'),
            onClick: onClick,
        });

        const $btnDisable = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.TOUCH_CONTROL_DISABLE,
            title: t('hide-touch-controller'),
            onClick: onClick,
            classes: ['bx-activated'],
        });

        this.$content = CE('div', {},
            $btnEnable,
            $btnDisable,
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
