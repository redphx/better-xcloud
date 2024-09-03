import { BxEvent } from "@/utils/bx-event";
import { BxIcon } from "@/utils/bx-icon";
import { createButton, ButtonStyle } from "@/utils/html";
import { t } from "@/utils/translation";
import { BaseGameBarAction } from "./action-base";
import { TrueAchievements } from "@/utils/true-achievements";

export class TrueAchievementsAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const onClick = (e: Event) => {
            BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
            TrueAchievements.open(false);
        };

        this.$content = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.TRUE_ACHIEVEMENTS,
            title: t('true-achievements'),
            onClick: onClick,
        });
    }

    render(): HTMLElement {
        return this.$content;
    }
}
