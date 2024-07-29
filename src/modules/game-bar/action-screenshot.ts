import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle } from "@utils/html";
import { BaseGameBarAction } from "./action-base";
import { t } from "@utils/translation";
import { Screenshot } from "@/utils/screenshot";

export class ScreenshotAction extends BaseGameBarAction {
    $content: HTMLElement;
    $content2: HTMLElement;

    constructor() {
        super();

        const onClick = (e: Event) => {
            BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
            Screenshot.takeScreenshot();
        };

        const onClickRecord = (e: Event) => {
            BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
            this.toggleRecording();
        };

        this.$content = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.SCREENSHOT,
            title: t('take-screenshot'),
            onClick: onClick,
        });

        this.$content2 = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.RECORD, // Assuming you have a different icon for recording
            title: t('take-recording'),
            onClick: onClickRecord,
        });

        // Add the hotkey listener
        window.addEventListener('keydown', this.handleHotkey.bind(this));
    }

    toggleRecording() {
        if (Screenshot.isRecording) {
            Screenshot.stopRecording();
        } else {
            Screenshot.startRecording();
        }
    }

    handleHotkey(event: KeyboardEvent) {
        if (event.key === '/') {
            this.toggleRecording();
        } else if (event.key === '.') {
            this.recordForOneMinute();
        }
    }

    recordForOneMinute() {
        if (!Screenshot.isRecording) {
            Screenshot.startRecording();
            setTimeout(() => {
                Screenshot.stopRecording();
            }, 60000); // Stop recording after 60 seconds (1 minute)
        }
    }

    render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'screenshot-action-container';
        container.appendChild(this.$content);
        container.appendChild(this.$content2);
        return container;
    }
}
