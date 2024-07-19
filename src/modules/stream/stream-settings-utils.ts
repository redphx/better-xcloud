import { StreamPlayerType, StreamVideoProcessing } from "@enums/stream-player";
import { STATES } from "@utils/global";
import { getPref, PrefKey, setPref } from "@utils/preferences";
import { UserAgent } from "@utils/user-agent";
import type { StreamPlayerOptions } from "../stream-player";

export function onChangeVideoPlayerType() {
    const playerType = getPref(PrefKey.VIDEO_PLAYER_TYPE);
    const $videoProcessing = document.getElementById('bx_setting_video_processing') as HTMLSelectElement;
    const $videoSharpness = document.getElementById('bx_setting_video_sharpness') as HTMLElement;
    const $videoPowerPreference = document.getElementById('bx_setting_video_power_preference') as HTMLElement;

    let isDisabled = false;

    if (playerType === StreamPlayerType.WEBGL2) {
        ($videoProcessing.querySelector(`option[value=${StreamVideoProcessing.CAS}]`) as HTMLOptionElement).disabled = false;
    } else {
        // Only allow USM when player type is Video
        $videoProcessing.value = StreamVideoProcessing.USM;
        setPref(PrefKey.VIDEO_PROCESSING, StreamVideoProcessing.USM);

        ($videoProcessing.querySelector(`option[value=${StreamVideoProcessing.CAS}]`) as HTMLOptionElement).disabled = true;

        if (UserAgent.isSafari()) {
            isDisabled = true;
        }
    }

    $videoProcessing.disabled = isDisabled;
    $videoSharpness.dataset.disabled = isDisabled.toString();

    // Hide Power Preference setting if renderer isn't WebGL2
    $videoPowerPreference.closest('.bx-stream-settings-row')!.classList.toggle('bx-gone', playerType !== StreamPlayerType.WEBGL2);

    updateVideoPlayer();
}


export function updateVideoPlayer() {
    const streamPlayer = STATES.currentStream.streamPlayer;
    if (!streamPlayer) {
        return;
    }

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
