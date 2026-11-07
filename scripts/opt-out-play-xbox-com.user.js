// ==UserScript==
// @name         Opt-out play.xbox.com
// @namespace    https://github.com/redphx
// @version      2026-11-07
// @description  Redirect play.xbox.com to xbox.com/play
// @author       redphx
// @match        https://play.xbox.com/*
// @grant        none
// ==/UserScript==

if (window.location.hostname === 'play.xbox.com') {
    window.stop();
    window.location = 'https://play.xbox.com/migration/clear?=returnUrl=https://www.xbox.com/play';
}
