import { STATES } from "@utils/global";
import { BxLogger } from "./bx-logger";
import { TouchController } from "@modules/touch-controller";
import { GamePassCloudGallery } from "./gamepass-gallery";
import { getPref, PrefKey } from "./preferences";

const LOG_TAG = 'PreloadState';

export function overridePreloadState() {
    let _state: any;

    Object.defineProperty(window, '__PRELOADED_STATE__', {
        configurable: true,
        get: () => {
            return _state;
        },
        set: state => {
            // Override User-Agent
            try {
                state.appContext.requestInfo.userAgent = window.navigator.userAgent;
            } catch (e) {
                BxLogger.error(LOG_TAG, e);
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

            if (getPref(PrefKey.UI_HOME_CONTEXT_MENU_DISABLED)) {
                try {
                    state.experiments.experimentationInfo.data.treatments.EnableHomeContextMenu = false;
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
