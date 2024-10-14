import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { BaseGameBarAction } from "./action-base";
import { MicrophoneShortcut, MicrophoneState } from "../shortcuts/shortcut-microphone";


export class MicrophoneAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const $btnDefault = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.MICROPHONE,
            onClick: this.onClick.bind(this),
            classes: ['bx-activated'],
        });

        const $btnMuted = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.MICROPHONE_MUTED,
            onClick: this.onClick.bind(this),
        });

        this.$content = CE('div', {}, $btnMuted, $btnDefault);

        window.addEventListener(BxEvent.MICROPHONE_STATE_CHANGED, e => {
            const microphoneState = (e as any).microphoneState;
            const enabled = microphoneState === MicrophoneState.ENABLED;
            this.$content.dataset.activated = enabled.toString();

            // Show the button in Game Bar if the mic is enabled
            this.$content.classList.remove('bx-gone');
        });
    }

    onClick(e: Event) {
        super.onClick(e);
        const enabled = MicrophoneShortcut.toggle(false);
        this.$content.dataset.activated = enabled.toString();
    }

    reset(): void {
        this.$content.classList.add('bx-gone');
        this.$content.dataset.activated = 'false';
    }
}
