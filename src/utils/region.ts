import { getPref, PrefKey } from "../modules/preferences";
import { STATES } from "./global";


export function getPreferredServerRegion(shortName = false) {
    let preferredRegion = getPref(PrefKey.SERVER_REGION);
    if (preferredRegion in STATES.serverRegions) {
        if (shortName && STATES.serverRegions[preferredRegion].shortName) {
            return STATES.serverRegions[preferredRegion].shortName;
        } else {
            return preferredRegion;
        }
    }

    for (let regionName in STATES.serverRegions) {
        const region = STATES.serverRegions[regionName];
        if (!region.isDefault) {
            continue;
        }

        if (shortName && region.shortName) {
            return region.shortName;
        } else {
            return regionName;
        }
    }

    return '???';
}
