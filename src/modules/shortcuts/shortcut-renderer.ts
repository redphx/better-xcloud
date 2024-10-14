import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { limitVideoPlayerFps } from "../stream/stream-settings-utils";

export class RendererShortcut {
    static toggleVisibility(): boolean {
        const $mediaContainer = document.querySelector('#game-stream div[data-testid="media-container"]');
        if (!$mediaContainer) {
            return true;
        }

        $mediaContainer.classList.toggle('bx-gone');
        const isShowing = !$mediaContainer.classList.contains('bx-gone');
        // Switch FPS
        limitVideoPlayerFps(isShowing ? getPref(PrefKey.VIDEO_MAX_FPS) : 0);
        return isShowing;
    }
}
