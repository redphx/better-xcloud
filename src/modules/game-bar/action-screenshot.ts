import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle } from "@utils/html";
import { BaseGameBarAction } from "./action-base";
import { t } from "@utils/translation";
import { Screenshot } from "@/utils/screenshot";

export class ScreenshotAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const onClick = (e: Event) => {
            BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
            Screenshot.takeScreenshot();
        };

        this.$content = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.SCREENSHOT,
            title: t('take-screenshot'),
            onClick: onClick,
        });
    }

    render(): HTMLElement {
        return this.$content;
    }
}
