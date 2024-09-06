import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { BaseGameBarAction } from "./action-base";
import { SoundShortcut, SpeakerState } from "../shortcuts/shortcut-sound";


export class SpeakerAction extends BaseGameBarAction {
    $content: HTMLElement;

    constructor() {
        super();

        const onClick = (e: Event) => {
            BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
            SoundShortcut.muteUnmute();
        };

        const $btnEnable = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.AUDIO,
            onClick: onClick,
        });

        const $btnMuted = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.SPEAKER_MUTED,
            onClick: onClick,
            classes: ['bx-activated'],
        });

        this.$content = CE('div', {},
            $btnEnable,
            $btnMuted,
        );

        this.reset();

        window.addEventListener(BxEvent.SPEAKER_STATE_CHANGED, e => {
            const speakerState = (e as any).speakerState;
            const enabled = speakerState === SpeakerState.ENABLED;

            this.$content.dataset.enabled = enabled.toString();
        });
    }

    render(): HTMLElement {
        return this.$content;
    }

    reset(): void {
        this.$content.dataset.enabled = 'true';
    }
}
