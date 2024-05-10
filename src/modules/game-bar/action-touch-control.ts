import { BxEvent } from "@/utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { TouchController } from "@modules/touch-controller";
import { BaseGameBarAction } from "./action-base";

export class TouchControlAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const onClick = (e: Event) => {
            BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);

            const $parent = (e as any).target.closest('div[data-enabled]');
            let enabled = $parent.getAttribute('data-enabled', 'true') === 'true';
            $parent.setAttribute('data-enabled', (!enabled).toString());

            TouchController.toggleVisibility(enabled);
        };

        const $btnEnable = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.TOUCH_CONTROL_ENABLE,
            title: 'Show touch control',
            onClick: onClick,
        });

        const $btnDisable = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.TOUCH_CONTROL_DISABLE,
            title: 'Hide touch control',
            onClick: onClick,
        });

        this.$content = CE('div', {'data-enabled': 'true'},
            $btnEnable,
            $btnDisable,
        );
    }

    render(): HTMLElement {
        return this.$content;
    }

    reset(): void {
        this.$content.setAttribute('data-enabled', 'true');
    }
}
