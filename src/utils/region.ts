import { getPref, PrefKey } from "../modules/preferences";
import { States } from "./global";


export function getPreferredServerRegion(shortName = false) {
    let preferredRegion = getPref(PrefKey.SERVER_REGION);
    if (preferredRegion in States.serverRegions) {
        if (shortName && States.serverRegions[preferredRegion].shortName) {
            return States.serverRegions[preferredRegion].shortName;
        } else {
            return preferredRegion;
        }
    }

    for (let regionName in States.serverRegions) {
        const region = States.serverRegions[regionName];
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
