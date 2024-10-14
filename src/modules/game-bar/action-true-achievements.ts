import { BxIcon } from "@/utils/bx-icon";
import { createButton, ButtonStyle } from "@/utils/html";
import { BaseGameBarAction } from "./action-base";
import { TrueAchievements } from "@/utils/true-achievements";

export class TrueAchievementsAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        this.$content = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.TRUE_ACHIEVEMENTS,
            onClick: this.onClick.bind(this),
        });
    }

    onClick(e: Event) {
        super.onClick(e);
        TrueAchievements.open(false);
    }
}
