// ==UserScript==
// @name         Better xCloud - Custom flags
// @namespace    https://github.com/redphx
// @version      1.0.0
// @description  Customize Better xCloud script
// @author       redphx
// @license      MIT
// @match        https://www.xbox.com/*/play*
// @run-at       document-start
// @grant        none
// ==/UserScript==
'use strict';

/*
Make sure this script is being loaded before the Better xCloud script.

How to:
1. Uninstall Better xCloud script.
2. Install this script.
3. Reinstall Better xCloud script. All your settings are still there.
*/

// Change this to `false` if you want to temporary disable the script
const enabled = true;

enabled && (window.BX_FLAGS = {
    /*
    Add titleId of the game(s) you want to add here.
    Keep in mind: this method only works with some games.

    Example:
        - Flight Simulator has this link: /play/games/microsoft-flight-simulator-standard-40th-anniversa/9PMQDM08SNK9
        - That means its titleId is "9PMQDM08SNK9"
        - So it becomes:
            ForceNativeMkbTitles: [
                "9PMQDM08SNK9",
            ],
    */
    ForceNativeMkbTitles: [
    ],
});
