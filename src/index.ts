// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      3.5.3
// @description  Improve Xbox Cloud Gaming (xCloud) experience
// @author       redphx
// @license      MIT
// @match        https://www.xbox.com/*/play*
// @match        https://www.xbox.com/*/auth/msa?*loggedIn*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/redphx/better-xcloud/main/better-xcloud.meta.js
// @downloadURL  https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js
// ==/UserScript==
'use strict';

import { BxEvent } from "./modules/bx-event";
import { BX_FLAGS } from "./modules/bx-flags";
import { CE, CTN, createButton, createSvgIcon, Icon } from "./utils/html";
import { BxExposed } from "./modules/bx-exposed";
import { t } from "./modules/translation";
import { Dialog } from "./modules/dialog";

const SCRIPT_VERSION = '3.5.3';
const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

const AppInterface = window.AppInterface;
const States: BxStates = {
    isPlaying: false,
    appContext: {},
};


/* ADDITIONAL CODE */

// Handle login page
if (window.location.pathname.includes('/auth/msa')) {
    window.addEventListener('load', e => {
            window.location.search.includes('loggedIn') && setTimeout(() => {
                const location = window.location;
                // @ts-ignore
                location.pathname.includes('/play') && location.reload(true);
            }, 2000);
        });
    // Stop processing the script
    throw new Error('[Better xCloud] Refreshing the page after logging in');
}

console.log(`[Better xCloud] readyState: ${document.readyState}`);

console.log(BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED)
console.log(BX_FLAGS)

if (BX_FLAGS.SafariWorkaround && document.readyState !== 'loading') {
    // Stop loading
    window.stop();

    // Show the reloading overlay
    const css = `
.bx-reload-overlay {
    position: fixed;
    top: 0;
    background: #000000cc;
    z-index: 9999;
    width: 100%;
    line-height: 100vh;
    color: #fff;
    text-align: center;
    font-weight: 400;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 1.3rem;
}
`;
    const $fragment = document.createDocumentFragment();
    $fragment.appendChild(CE('style', {}, css));
    $fragment.appendChild(CE('div', {'class': 'bx-reload-overlay'}, t('safari-failed-message')));

    document.documentElement.appendChild($fragment);

    // Reload the page
    // @ts-ignore
    window.location.reload(true);

    // Stop processing the script
    throw new Error('[Better xCloud] Executing workaround for Safari');
}

// Automatically reload the page when running into the "We are sorry..." error message
window.addEventListener('load', e => {
    setTimeout(() => {
        if (document.body.classList.contains('legacyBackground')) {
            // Has error message -> reload page
            window.stop();
            // @ts-ignore
            window.location.reload(true);
        }
    }, 3000);
});

window.BX_EXPOSED = BxExposed;

new Dialog({})
