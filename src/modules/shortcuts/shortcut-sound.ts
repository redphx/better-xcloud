import { t } from "@utils/translation";
import { STATES } from "@utils/global";
import { PrefKey, getPref, setPref } from "@utils/preferences";
import { Toast } from "@utils/toast";
import { BxEvent } from "@/utils/bx-event";
import { ceilToNearest, floorToNearest } from "@/utils/utils";

export class SoundShortcut {
    static increaseGainNodeVolume(amount: number) {
        SoundShortcut.#adjustGainNodeVolume(amount);
    }

    static decreaseGainNodeVolume(amount: number) {
        SoundShortcut.#adjustGainNodeVolume(-1 * Math.abs(amount));
    }

    static #adjustGainNodeVolume(amount: number): number {
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

        newValue = setPref(PrefKey.AUDIO_VOLUME, newValue);
        SoundShortcut.setGainNodeVolume(newValue);

        // Show toast
        Toast.show(`${t('stream')} ❯ ${t('volume')}`, newValue + '%', {instant: true});
        BxEvent.dispatch(window, BxEvent.GAINNODE_VOLUME_CHANGED, {
                volume: newValue,
            });

        return newValue;
    }

    static setGainNodeVolume(value: number) {
        STATES.currentStream.audioGainNode && (STATES.currentStream.audioGainNode.gain.value = value / 100);
    }
}
