import { STATES } from "@utils/global";
import { UserAgent } from "@utils/user-agent";
import { BxLogger } from "./bx-logger";
import { TouchController } from "@modules/touch-controller";
import { GamePassCloudGallery } from "./gamepass-gallery";

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
                try {
                    const sigls = state.xcloud.sigls;
                    if (GamePassCloudGallery.TOUCH in sigls) {
                        let customList = TouchController.getCustomList();

                        const allGames = sigls[GamePassCloudGallery.ALL].data.products;

                        // Remove non-cloud games from the list
                        customList = customList.filter(id => allGames.includes(id));

                        // Add to the official list
                        sigls[GamePassCloudGallery.TOUCH]?.data.products.push(...customList);
                    }
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
