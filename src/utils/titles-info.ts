import { PrefKey } from "./preferences";
import { getPref } from "./preferences";
import { STATES } from "./global";
import { UserAgent } from "./user-agent";

export class TitlesInfo {
    static #INFO: {[index: string]: TitleInfo} = {};

    static get(titleId: string) {
        return TitlesInfo.#INFO[titleId];
    }

    static update(titleId: string, info: TitleInfo) {
        TitlesInfo.#INFO[titleId] = TitlesInfo.#INFO[titleId] || {};
        Object.assign(TitlesInfo.#INFO[titleId], info);
    }

    static saveFromTitleInfo(titleInfo: ApiTitleInfo) {
        const details = titleInfo.details;
        const info: TitleInfo = {
            titleId: titleInfo.titleId,
            xboxTitleId: '' + details.xboxTitleId,
            // Has more than one input type -> must have touch support
            hasTouchSupport: (details.supportedInputTypes.length > 1),
        };
        TitlesInfo.update(details.productId, info);
    }

    static saveFromCatalogInfo(catalogInfo: ApiCatalogInfo) {
        const titleId = catalogInfo.StoreId;
        const imageHero = (catalogInfo.Image_Hero || catalogInfo.Image_Tile || {}).URL;
        TitlesInfo.update(titleId, {
            imageHero: imageHero,
        });
    }

    static hasTouchSupport(titleId: string): boolean {
        return !!TitlesInfo.#INFO[titleId]?.hasTouchSupport;
    }

    static requestCatalogInfo(titleId: string, callback: any) {
        const url = `https://catalog.gamepass.com/v3/products?market=${STATES.appContext.marketInfo.market}&language=${STATES.appContext.marketInfo.locale}&hydration=RemoteHighSapphire0`;
        const appVersion = document.querySelector('meta[name=gamepass-app-version]')!.getAttribute('content');

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ms-Cv': STATES.appContext.telemetryInfo.initialCv,
                'Calling-App-Name': 'Xbox Cloud Gaming Web',
                'Calling-App-Version': appVersion,
            } as any,
            body: JSON.stringify({
                Products: [titleId],
            }),
        }).then(resp => {
            callback && callback(TitlesInfo.get(titleId));
        });
    }
}


export class PreloadedState {
    static override() {
        Object.defineProperty(window, '__PRELOADED_STATE__', {
            configurable: true,
            get: () => {
                // Override User-Agent
                const userAgent = UserAgent.spoof();
                if (userAgent) {
                    (this as any)._state.appContext.requestInfo.userAgent = userAgent;
                }

                return (this as any)._state;
            },
            set: state => {
                (this as any)._state = state;
                STATES.appContext = structuredClone(state.appContext);

                // Get a list of touch-supported games
                if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === 'all') {
                    let titles: {[index: string]: any} = {};
                    try {
                        titles = state.xcloud.titles.data.titles;
                    } catch (e) {}

                    for (let id in titles) {
                        TitlesInfo.saveFromTitleInfo(titles[id].data);
                    }
                }
            }
        });
    }
}
