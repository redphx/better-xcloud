import { PrefKey } from "@/enums/pref-keys";
import { BX_FLAGS } from "./bx-flags";
import { getPref } from "./settings-storages/global-settings-storage";

export let FeatureGates: {[key: string]: boolean} = {
    'PwaPrompt': false,
    'EnableWifiWarnings': false,
    'EnableUpdateRequiredPage': false,
    'ShowForcedUpdateScreen': false,
};

// Disable context menu in Home page
if (getPref(PrefKey.UI_HOME_CONTEXT_MENU_DISABLED)) {
    FeatureGates['EnableHomeContextMenu'] = false;
}

// Disable chat feature
if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES)) {
    FeatureGates['EnableGuideChatTab'] = false;
}

if (BX_FLAGS.FeatureGates) {
    FeatureGates = Object.assign(BX_FLAGS.FeatureGates, FeatureGates);
}
