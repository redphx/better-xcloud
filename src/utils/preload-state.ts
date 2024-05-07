import { STATES } from "@utils/global";
import { UserAgent } from "@utils/user-agent";
import { BxLogger } from "./bx-logger";
import { GALLERY_TOUCH_GAMES, TouchController } from "@modules/touch-controller";

const LOG_TAG = 'PreloadState';

export function overridePreloadState() {
    let _state: any;

    Object.defineProperty(window, '__PRELOADED_STATE__', {
        configurable: true,
        get: () => {
            // @ts-ignore
            return _state;
        },
        set: state => {
            // Override User-Agent
            const userAgent = UserAgent.spoof();
            if (userAgent) {
                try {
                    // @ts-ignore
                    state.appContext.requestInfo.userAgent = userAgent;
                } catch (e) {
                    BxLogger.error(LOG_TAG, e);
                }
            }

            // Add list of games with custom layouts to the official list
            if (STATES.hasTouchSupport) {
                TouchController.updateCustomList();
                const customList = TouchController.getCustomList();

                try {
                    state.xcloud.sigls[GALLERY_TOUCH_GAMES]?.data.products.push(...customList);
                } catch (e) {
                    BxLogger.error(LOG_TAG, e);
                }
            }

            // @ts-ignore
            _state = state;
            STATES.appContext = structuredClone(state.appContext);
        }
    });
}
