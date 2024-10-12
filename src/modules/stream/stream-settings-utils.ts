import { StreamPlayerType, StreamVideoProcessing } from "@enums/stream-player";
import { STATES } from "@utils/global";
import { UserAgent } from "@utils/user-agent";
import type { StreamPlayerOptions } from "../stream-player";
import { PrefKey } from "@/enums/pref-keys";
import { getPref, setPref } from "@/utils/settings-storages/global-settings-storage";

export function onChangeVideoPlayerType() {
    const playerType = getPref(PrefKey.VIDEO_PLAYER_TYPE);
    const $videoProcessing = document.getElementById(`bx_setting_${PrefKey.VIDEO_PROCESSING}`) as HTMLSelectElement;
    const $videoSharpness = document.getElementById(`bx_setting_${PrefKey.VIDEO_SHARPNESS}`) as HTMLElement;
    const $videoPowerPreference = document.getElementById(`bx_setting_${PrefKey.VIDEO_POWER_PREFERENCE}`) as HTMLElement;
    const $videoMaxFps = document.getElementById(`bx_setting_${PrefKey.VIDEO_MAX_FPS}`) as HTMLElement;

    if (!$videoProcessing) {
        return;
    }

    let isDisabled = false;

    const $optCas = $videoProcessing.querySelector(`option[value=${StreamVideoProcessing.CAS}]`) as HTMLOptionElement;

    if (playerType === StreamPlayerType.WEBGL2) {
        $optCas && ($optCas.disabled = false);
    } else {
        // Only allow USM when player type is Video
        $videoProcessing.value = StreamVideoProcessing.USM;
        setPref(PrefKey.VIDEO_PROCESSING, StreamVideoProcessing.USM);

        $optCas && ($optCas.disabled = true);

        if (UserAgent.isSafari()) {
            isDisabled = true;
        }
    }

    $videoProcessing.disabled = isDisabled;
    $videoSharpness.dataset.disabled = isDisabled.toString();

    // Hide Power Preference setting if renderer isn't WebGL2
    $videoPowerPreference.closest('.bx-settings-row')!.classList.toggle('bx-gone', playerType !== StreamPlayerType.WEBGL2);
    $videoMaxFps.closest('.bx-settings-row')!.classList.toggle('bx-gone', playerType !== StreamPlayerType.WEBGL2);

    updateVideoPlayer();
}


export function limitVideoPlayerFps() {
    const targetFps = getPref(PrefKey.VIDEO_MAX_FPS);
    const streamPlayer = STATES.currentStream.streamPlayer;
    streamPlayer?.getWebGL2Player()?.setTargetFps(targetFps);
}


export function updateVideoPlayer() {
    const streamPlayer = STATES.currentStream.streamPlayer;
    if (!streamPlayer) {
        return;
    }

    limitVideoPlayerFps();

    const options = {
        processing: getPref(PrefKey.VIDEO_PROCESSING),
        sharpness: getPref(PrefKey.VIDEO_SHARPNESS),
        saturation: getPref(PrefKey.VIDEO_SATURATION),
        contrast: getPref(PrefKey.VIDEO_CONTRAST),
        brightness: getPref(PrefKey.VIDEO_BRIGHTNESS),
    } satisfies StreamPlayerOptions;

    streamPlayer.setPlayerType(getPref(PrefKey.VIDEO_PLAYER_TYPE));
    streamPlayer.updateOptions(options);
    streamPlayer.refreshPlayer();

}

window.addEventListener('resize', updateVideoPlayer);
