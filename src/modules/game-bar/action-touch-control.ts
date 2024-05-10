import { BxEvent } from "@/utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";

export class ActionTouchControl {
    static setup() {
        const onClick = (e: Event) => {
            const $parent = (e as any).target.closest('div[data-enabled]');
            let enabled = $parent.getAttribute('data-enabled', 'true') === 'true';
            $parent.setAttribute('data-enabled', (!enabled).toString());

            BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
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

        const $container = CE('div', {'data-enabled': 'true'},
            $btnEnable,
            $btnDisable,
        );

        return $container;
    }
}
