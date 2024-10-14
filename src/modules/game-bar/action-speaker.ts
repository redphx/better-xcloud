import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { BaseGameBarAction } from "./action-base";
import { SoundShortcut, SpeakerState } from "../shortcuts/shortcut-sound";


export class SpeakerAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const $btnEnable = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.AUDIO,
            onClick: this.onClick.bind(this),
        });

        const $btnMuted = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.SPEAKER_MUTED,
            onClick: this.onClick.bind(this),
            classes: ['bx-activated'],
        });

        this.$content = CE('div', {}, $btnEnable, $btnMuted);

        window.addEventListener(BxEvent.SPEAKER_STATE_CHANGED, e => {
            const speakerState = (e as any).speakerState;
            const enabled = speakerState === SpeakerState.ENABLED;

            this.$content.dataset.activated = (!enabled).toString();
        });
    }

    onClick(e: Event) {
        super.onClick(e);
        SoundShortcut.muteUnmute();
    }

    reset(): void {
        this.$content.dataset.activated = 'false';
    }
}
