import { t } from "@utils/translation";
import { STATES } from "@utils/global";
import { Toast } from "@utils/toast";
import { ceilToNearest, floorToNearest } from "@/utils/utils";
import { PrefKey } from "@/enums/pref-keys";
import { getPref, setPref } from "@/utils/settings-storages/global-settings-storage";
import { BxEvent } from "@/utils/bx-event";

export enum SpeakerState {
    ENABLED,
    MUTED,
}

export class SoundShortcut {
    static adjustGainNodeVolume(amount: number): number {
        if (!getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL)) {
            return 0;
        }

        const currentValue = getPref(PrefKey.AUDIO_VOLUME);
        let nearestValue: number;

        if (amount > 0) {  // Increase
            nearestValue = ceilToNearest(currentValue, amount);
        } else {  // Decrease
            nearestValue = floorToNearest(currentValue, -1 * amount);
        }

        let newValue: number;
        if (currentValue !== nearestValue) {
            newValue = nearestValue;
        } else {
            newValue = currentValue + amount;
        }

        newValue = setPref(PrefKey.AUDIO_VOLUME, newValue, true);
        SoundShortcut.setGainNodeVolume(newValue);

        // Show toast
        Toast.show(`${t('stream')} ❯ ${t('volume')}`, newValue + '%', {instant: true});

        return newValue;
    }

    static setGainNodeVolume(value: number) {
        STATES.currentStream.audioGainNode && (STATES.currentStream.audioGainNode.gain.value = value / 100);
    }

    static muteUnmute() {
        if (getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && STATES.currentStream.audioGainNode) {
            const gainValue = STATES.currentStream.audioGainNode.gain.value;
            const settingValue = getPref(PrefKey.AUDIO_VOLUME);

            let targetValue: number;
            if (settingValue === 0) {  // settingValue is 0 => set to 100
                targetValue = 100;
                setPref(PrefKey.AUDIO_VOLUME, targetValue, true);
            } else if (gainValue === 0) {  // is being muted => set to settingValue
                targetValue = settingValue;
            } else {  // not being muted => mute
                targetValue = 0;
            }

            let status: string;
            if (targetValue === 0) {
                status = t('muted');
            } else {
                status = targetValue + '%';
            }

            SoundShortcut.setGainNodeVolume(targetValue);
            Toast.show(`${t('stream')} ❯ ${t('volume')}`, status, {instant: true});

            BxEvent.dispatch(window, BxEvent.SPEAKER_STATE_CHANGED, {
                speakerState: targetValue === 0 ? SpeakerState.MUTED : SpeakerState.ENABLED,
            })
            return;
        }

        let $media: HTMLMediaElement;

        $media = document.querySelector('div[data-testid=media-container] audio') as HTMLAudioElement;
        if (!$media) {
            $media = document.querySelector('div[data-testid=media-container] video') as HTMLAudioElement;
        }

        if ($media) {
            $media.muted = !$media.muted;

            const status = $media.muted ? t('muted') : t('unmuted');
            Toast.show(`${t('stream')} ❯ ${t('volume')}`, status, {instant: true});

            BxEvent.dispatch(window, BxEvent.SPEAKER_STATE_CHANGED, {
                speakerState: $media.muted ? SpeakerState.MUTED : SpeakerState.ENABLED,
            })
        }
    }
}
