import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { createButton, ButtonStyle, CE } from "@utils/html";
import { t } from "@utils/translation";
import { BaseGameBarAction } from "./action-base";
import { MicrophoneShortcut, MicrophoneState } from "../shortcuts/shortcut-microphone";


export class MicrophoneAction extends BaseGameBarAction {
    $content: HTMLElement;

    visible: boolean = false;

    constructor() {
        super();

        const onClick = (e: Event) => {
                BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);

                const enabled = MicrophoneShortcut.toggle(false);
                this.$content.setAttribute('data-enabled', enabled.toString());
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

        window.addEventListener(BxEvent.MICROPHONE_STATE_CHANGED, e => {
            const microphoneState = (e as any).microphoneState;
            const enabled = microphoneState === MicrophoneState.ENABLED;

            this.$content.setAttribute('data-enabled', enabled.toString());

            // Show the button in Game Bar if the mic is enabled
            this.$content.classList.remove('bx-gone');
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
