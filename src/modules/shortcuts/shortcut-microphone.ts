import { t } from "@utils/translation";
import { Toast } from "@utils/toast";


export enum MicrophoneState {
    REQUESTED = 'Requested',
    ENABLED = 'Enabled',
    MUTED = 'Muted',
    NOT_ALLOWED = 'NotAllowed',
    NOT_FOUND = 'NotFound',
}

export class MicrophoneShortcut {
    static toggle(showToast: boolean = true): boolean {
        if (!window.BX_EXPOSED.streamSession) {
            return false;
        }

        const state = window.BX_EXPOSED.streamSession._microphoneState;
        const enableMic = state === MicrophoneState.ENABLED ? false : true;

        try {
            window.BX_EXPOSED.streamSession.tryEnableChatAsync(enableMic);
            showToast && Toast.show(t('microphone'), t(enableMic ? 'unmuted': 'muted'), {instant: true});

            return enableMic;
        } catch (e) {
            console.log(e);
        }

        return false;
    }
}
