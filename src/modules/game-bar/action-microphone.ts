import { BxEvent, XcloudEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { t } from "@utils/translation";
import { BaseGameBarAction } from "./action-base";

enum MicrophoneState {
    REQUESTED = 'Requested',
    ENABLED = 'Enabled',
    MUTED = 'Muted',
    NOT_ALLOWED = 'NotAllowed',
    NOT_FOUND = 'NotFound',
}

export class MicrophoneAction extends BaseGameBarAction {
    $content: HTMLElement;

    visible: boolean = false;

    constructor() {
        super();

        const onClick = (e: Event) => {
                BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
                const state = this.$content.getAttribute('data-enabled');
                const enableMic = state === 'true' ? false : true;

                try {
                    window.BX_EXPOSED.streamSession.tryEnableChatAsync(enableMic);
                    this.$content.setAttribute('data-enabled', enableMic.toString());
                } catch (e) {
                    console.log(e);
                }
            };

        const $btnDefault = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.MICROPHONE,
            title: t('show-touch-controller'),
            onClick: onClick,
            classes: ['bx-activated'],
        });

        const $btnMuted = createButton({
            style: ButtonStyle.GHOST,
            icon: BxIcon.MICROPHONE_MUTED,
            title: t('hide-touch-controller'),
            onClick: onClick,
        });

        this.$content = CE('div', {},
            $btnDefault,
            $btnMuted,
        );

        this.reset();

        window.addEventListener(BxEvent.STREAM_EVENT_TARGET_READY, e => {
            const eventTarget = window.BX_EXPOSED.eventTarget as EventTarget;
            eventTarget.addEventListener(XcloudEvent.MICROPHONE_STATE_CHANGED, e => {
                const state = window.BX_EXPOSED.streamSession.microphoneState as MicrophoneState;
                const enabled = state === MicrophoneState.ENABLED;

                this.$content.setAttribute('data-enabled', enabled.toString());

                // Show the button in Game Bar if the mic is enabled
                this.$content.classList.remove('bx-gone');
            });
        });
    }

    render(): HTMLElement {
        return this.$content;
    }

    reset(): void {
        this.visible = false;
        this.$content.classList.add('bx-gone');
        this.$content.setAttribute('data-enabled', 'false');
    }
}
