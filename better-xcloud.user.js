// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      1.15
// @description  Improve Xbox Cloud Gaming (xCloud) experience
// @author       redphx
// @license      MIT
// @match        https://www.xbox.com/*/play*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/redphx/better-xcloud/main/better-xcloud.meta.js
// @downloadURL  https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js
// ==/UserScript==
'use strict';

const SCRIPT_VERSION = '1.15';
const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

console.log(`[Better xCloud] readyState: ${document.readyState}`);


// Quickly create a tree of elements without having to use innerHTML
function createElement(elmName, props = {}) {
    let $elm;
    const hasNs = 'xmlns' in props;

    if (hasNs) {
        $elm = document.createElementNS(props.xmlns, elmName);
    } else {
        $elm = document.createElement(elmName);
    }

    for (let key in props) {
        if (key === 'xmlns') {
            continue;
        }

        if (!props.hasOwnProperty(key) || $elm.hasOwnProperty(key)) {
            continue;
        }

        if (hasNs) {
            $elm.setAttributeNS(null, key, props[key]);
        } else {
            $elm.setAttribute(key, props[key]);
        }
    }

    for (let i = 2, size = arguments.length; i < size; i++) {
        const arg = arguments[i];
        const argType = typeof arg;

        if (argType === 'string' || argType === 'number') {
            $elm.textContent = arg;
        } else if (arg) {
            $elm.appendChild(arg);
        }
    }

    return $elm;
}


const ENABLE_SAFARI_WORKAROUND = true;
if (ENABLE_SAFARI_WORKAROUND && document.readyState !== 'loading') {
    // Stop loading
    window.stop();

    // Show the reloading overlay
    const $elm = createElement('div', {'class': 'better-xcloud-reload-overlay'}, 'Failed to run Better xCloud. Retrying, please wait...');
    const css = `
.better-xcloud-reload-overlay {
    position: fixed;
    top: 0;
    background: #000000cc;
    z-index: 9999;
    width: 100%;
    line-height: 100vh;
    color: #fff;
    text-align: center;
    font-weight: 400;
    font-family: "Segoe UI", SegoeUI, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 1.3rem;
}
`;
    document.documentElement.appendChild(createElement('style', {}, css));
    document.documentElement.appendChild($elm);

    // Reload the page
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
            window.location.reload(true);
        }
    }, 2000);
});


const SERVER_REGIONS = {};
var STREAM_WEBRTC;
var $STREAM_VIDEO;
var $SCREENSHOT_CANVAS;
var GAME_TITLE_ID;
var APP_CONTEXT;

const HAS_TOUCH_SUPPORT = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Credit: https://phosphoricons.com
const ICON_VIDEO_SETTINGS = '<path d="M16 9.144A6.89 6.89 0 0 0 9.144 16 6.89 6.89 0 0 0 16 22.856 6.89 6.89 0 0 0 22.856 16 6.9 6.9 0 0 0 16 9.144zm0 11.427c-2.507 0-4.571-2.064-4.571-4.571s2.064-4.571 4.571-4.571 4.571 2.064 4.571 4.571-2.064 4.571-4.571 4.571zm15.704-7.541c-.065-.326-.267-.607-.556-.771l-4.26-2.428-.017-4.802c-.001-.335-.15-.652-.405-.868-1.546-1.307-3.325-2.309-5.245-2.953-.306-.103-.641-.073-.923.085L16 3.694l-4.302-2.407c-.282-.158-.618-.189-.924-.086a16.02 16.02 0 0 0-5.239 2.964 1.14 1.14 0 0 0-.403.867L5.109 9.84.848 12.268a1.14 1.14 0 0 0-.555.771 15.22 15.22 0 0 0 0 5.936c.064.326.267.607.555.771l4.261 2.428.017 4.802c.001.335.149.652.403.868 1.546 1.307 3.326 2.309 5.245 2.953.306.103.641.073.923-.085L16 28.306l4.302 2.407a1.13 1.13 0 0 0 .558.143 1.18 1.18 0 0 0 .367-.059c1.917-.648 3.695-1.652 5.239-2.962.255-.216.402-.532.405-.866l.021-4.807 4.261-2.428a1.14 1.14 0 0 0 .555-.771 15.21 15.21 0 0 0-.003-5.931zm-2.143 4.987l-4.082 2.321a1.15 1.15 0 0 0-.429.429l-.258.438a1.13 1.13 0 0 0-.174.601l-.022 4.606a13.71 13.71 0 0 1-3.623 2.043l-4.117-2.295a1.15 1.15 0 0 0-.559-.143h-.546c-.205-.005-.407.045-.586.143l-4.119 2.3a13.74 13.74 0 0 1-3.634-2.033l-.016-4.599a1.14 1.14 0 0 0-.174-.603l-.257-.437c-.102-.182-.249-.333-.429-.437l-4.085-2.328a12.92 12.92 0 0 1 0-4.036l4.074-2.325a1.15 1.15 0 0 0 .429-.429l.258-.438a1.14 1.14 0 0 0 .175-.601l.021-4.606a13.7 13.7 0 0 1 3.625-2.043l4.11 2.295a1.14 1.14 0 0 0 .585.143h.52c.205.005.407-.045.586-.143l4.119-2.3a13.74 13.74 0 0 1 3.634 2.033l.016 4.599a1.14 1.14 0 0 0 .174.603l.257.437c.102.182.249.333.429.438l4.085 2.327a12.88 12.88 0 0 1 .007 4.041h.007z" fill-rule="nonzero"/>';
const ICON_STREAM_STATS = '<path d="M27.295 9.31C24.303 6.313 20.234 4.631 16 4.643h-.057C7.153 4.673 0 11.929 0 20.804v3.267a2.3 2.3 0 0 0 2.286 2.286h27.429A2.3 2.3 0 0 0 32 24.072v-3.429A15.9 15.9 0 0 0 27.294 9.31zm2.419 14.761H14.816l7.823-10.757a1.15 1.15 0 0 0-.925-1.817c-.366 0-.71.176-.925.471l-8.801 12.103H2.286v-3.267c0-.44.022-.874.062-1.304h3.367a1.15 1.15 0 0 0 1.143-1.143 1.15 1.15 0 0 0-1.143-1.143H2.753c1.474-5.551 6.286-9.749 12.104-10.237v3.379A1.15 1.15 0 0 0 16 11.5a1.15 1.15 0 0 0 1.143-1.143V6.975c5.797.488 10.682 4.608 12.143 10.239h-3a1.15 1.15 0 0 0-1.143 1.143 1.15 1.15 0 0 0 1.143 1.143h3.382a14.58 14.58 0 0 1 .047 1.143v3.429z" fill-rule="nonzero"/>';
const ICON_SCREENSHOT_B64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDMyIiBmaWxsPSIjZmZmIj48cGF0aCBkPSJNMjguMzA4IDUuMDM4aC00LjI2NWwtMi4wOTctMy4xNDVhMS4yMyAxLjIzIDAgMCAwLTEuMDIzLS41NDhoLTkuODQ2YTEuMjMgMS4yMyAwIDAgMC0xLjAyMy41NDhMNy45NTYgNS4wMzhIMy42OTJBMy43MSAzLjcxIDAgMCAwIDAgOC43MzF2MTcuMjMxYTMuNzEgMy43MSAwIDAgMCAzLjY5MiAzLjY5MmgyNC42MTVBMy43MSAzLjcxIDAgMCAwIDMyIDI1Ljk2MlY4LjczMWEzLjcxIDMuNzEgMCAwIDAtMy42OTItMy42OTJ6bS02Ljc2OSAxMS42OTJjMCAzLjAzOS0yLjUgNS41MzgtNS41MzggNS41MzhzLTUuNTM4LTIuNS01LjUzOC01LjUzOCAyLjUtNS41MzggNS41MzgtNS41MzggNS41MzggMi41IDUuNTM4IDUuNTM4eiIvPjwvc3ZnPgo=';


class TitlesInfo {
    static #INFO = {};

    static get(titleId) {
        return TitlesInfo.#INFO[titleId];
    }

    static update(titleId, info) {
        TitlesInfo.#INFO[titleId] = TitlesInfo.#INFO[titleId] || {};
        Object.assign(TitlesInfo.#INFO[titleId], info);
    }

    static saveFromTitleInfo(titleInfo) {
        const details = titleInfo.details;
        TitlesInfo.#INFO[details.productId] = {
            titleId: titleInfo.titleId,
            // Has more than one input type -> must have touch support
            hasTouchSupport: (details.supportedInputTypes.length > 1),
        };
    }

    static saveFromCatalogInfo(catalogInfo) {
        const titleId = catalogInfo.StoreId;

        TitlesInfo.update(titleId, {
            imageHero: catalogInfo.Image_Hero ? catalogInfo.Image_Hero.URL : '',
        });
    }

    static hasTouchSupport(titleId) {
        const gameInfo = TitlesInfo.#INFO[titleId] || {};
        return !!gameInfo.hasTouchSupport;
    }

    static requestCatalogInfo(titleId, callback) {
        const url = `https://catalog.gamepass.com/v3/products?market=${APP_CONTEXT.marketInfo.market}&language=${APP_CONTEXT.marketInfo.locale}&hydration=RemoteHighSapphire0`;
        const appVersion = document.querySelector('meta[name=gamepass-app-version]').content;

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ms-Cv': APP_CONTEXT.telemetryInfo.initialCv,
                'Calling-App-Name': 'Xbox Cloud Gaming Web',
                'Calling-App-Version': appVersion,
            },
            body: JSON.stringify({
                Products: [titleId],
            }),
        }).then(resp => {
            callback && callback(TitlesInfo.get(titleId));
        });
    }
}


class LoadingScreen {
    static #$bgStyle;
    static #$waitTimeBox;

    static #waitTimeInterval;
    static #orgWebTitle;

    static #secondsToString(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);

        const mDisplay = m > 0 ? `${m}m`: '';
        const sDisplay = `${s}s`.padStart(s >=0 ? 3 : 4, '0');
        return mDisplay + sDisplay;
    }

    static setup() {
        // Get titleId from location
        const match = window.location.pathname.match(/\/launch\/[^\/]+\/([\w\d]+)/);
        if (!match) {
            return;
        }

        if (!LoadingScreen.#$bgStyle) {
            const $bgStyle = createElement('style');
            document.documentElement.appendChild($bgStyle);
            LoadingScreen.#$bgStyle = $bgStyle;
        }

        const titleId = match[1];
        const titleInfo = TitlesInfo.get(titleId);
        if (titleInfo && titleInfo.imageHero) {
            LoadingScreen.#setBackground(titleInfo.imageHero);
        } else {
            TitlesInfo.requestCatalogInfo(titleId, info => {
                info && info.imageHero && LoadingScreen.#setBackground(info.imageHero);
            });
        }

        if (PREFS.get(Preferences.UI_LOADING_SCREEN_ROCKET) === 'hide') {
            LoadingScreen.#hideRocket();
        }
    }

    static #hideRocket() {
        let $bgStyle = LoadingScreen.#$bgStyle;

        const css = `
#game-stream div[class*=RocketAnimation-module__container] > svg {
    display: none;
}
`;
        $bgStyle.textContent += css;
    }

    static #setBackground(imageUrl) {
        // Setup style tag
        let $bgStyle = LoadingScreen.#$bgStyle;

        // Limit max width to reduce image size
        imageUrl = imageUrl + '?w=1920';

        const css = `
#game-stream {
    background-image: linear-gradient(#00000033, #000000e6), url(${imageUrl}) !important;
    background-color: transparent !important;
    background-position: center center !important;
    background-repeat: no-repeat !important;
    background-size: cover !important;
}

#game-stream rect[width="800"] {
    transition: opacity 0.3s ease-in-out !important;
}
`;
        $bgStyle.textContent += css;

        const bg = new Image();
        bg.onload = e => {
            $bgStyle.textContent += `
#game-stream rect[width="800"] {
    opacity: 0 !important;
}
`;
        };
        bg.src = imageUrl;
    }

    static setupWaitTime(waitTime) {
        const CE = createElement;

        // Hide rocket when queing
        if (PREFS.get(Preferences.UI_LOADING_SCREEN_ROCKET) === 'hide-queue') {
            LoadingScreen.#hideRocket();
        }

        let secondsLeft = waitTime;
        let $countDown;
        let $estimated;

        LoadingScreen.#orgWebTitle = document.title;

        const endDate = new Date();
        const timeZoneOffsetSeconds = endDate.getTimezoneOffset() * 60;
        endDate.setSeconds(endDate.getSeconds() + waitTime - timeZoneOffsetSeconds);

        let endDateStr = endDate.toISOString().slice(0, 19);
        endDateStr = endDateStr.substring(0, 10) + ' ' + endDateStr.substring(11, 19);
        endDateStr += ` (${LoadingScreen.#secondsToString(waitTime)})`;

        let estimatedWaitTime = LoadingScreen.#secondsToString(waitTime);

        let $waitTimeBox = LoadingScreen.#$waitTimeBox;
        if (!$waitTimeBox) {
            $waitTimeBox = CE('div', {'class': 'better-xcloud-wait-time-box'},
                                    CE('label', {}, 'Estimated finish time'),
                                    $estimated = CE('span', {'class': 'better-xcloud-wait-time-estimated'}),
                                    CE('label', {}, 'Countdown'),
                                    $countDown = CE('span', {'class': 'better-xcloud-wait-time-countdown'}),
                                   );

            document.documentElement.appendChild($waitTimeBox);
            LoadingScreen.#$waitTimeBox = $waitTimeBox;
        } else {
            $waitTimeBox.classList.remove('better-xcloud-gone');
            $estimated = $waitTimeBox.querySelector('.better-xcloud-wait-time-estimated');
            $countDown = $waitTimeBox.querySelector('.better-xcloud-wait-time-countdown');
        }

        $estimated.textContent = endDateStr;
        $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft);
        document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`;

        LoadingScreen.#waitTimeInterval = setInterval(() => {
            secondsLeft--;
            $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft);
            document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`;

            if (secondsLeft <= 0) {
                LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval);
                LoadingScreen.#waitTimeInterval = null;
            }
        }, 1000);
    }

    static hide() {
        LoadingScreen.#orgWebTitle && (document.title = LoadingScreen.#orgWebTitle);
        LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add('better-xcloud-gone');

        const $rocketBg = document.querySelector('#game-stream rect[width="800"]');
        $rocketBg && $rocketBg.addEventListener('transitionend', e => {
            LoadingScreen.#$bgStyle.textContent += `
#game-stream {
    background: #000 !important;
}
`;
        });

        LoadingScreen.#$bgStyle.textContent += `
#game-stream rect[width="800"] {
    opacity: 1 !important;
}
`;
    }

    static reset() {
        LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add('better-xcloud-gone');
        LoadingScreen.#$bgStyle && (LoadingScreen.#$bgStyle.textContent = '');

        LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval);
        LoadingScreen.#waitTimeInterval = null;
    }
}


class TouchController {
    static get #EVENT_SHOW_CONTROLLER() {
        return new MessageEvent('message', {
                    data: '{"content":"{\\"layoutId\\":\\"\\"}","target":"/streaming/touchcontrols/showlayoutv2","type":"Message"}',
                    origin: 'better-xcloud',
                });
    }

    static get #EVENT_HIDE_CONTROLLER() {
        return new MessageEvent('message', {
                    data: '{"content":"","target":"/streaming/touchcontrols/hide","type":"Message"}',
                    origin: 'better-xcloud',
                });
    }

    static #$bar;
    static #enable = false;
    static #showing = false;
    static #dataChannel;

    static enable() {
        TouchController.#enable = true;
    }

    static disable() {
        TouchController.#enable = false;
    }

    static isEnabled() {
        return TouchController.#enable;
    }

    static #show() {
        TouchController.#dispatchMessage(TouchController.#EVENT_SHOW_CONTROLLER);
        TouchController.#showing = true;
    }

    static #hide() {
        TouchController.#dispatchMessage(TouchController.#EVENT_HIDE_CONTROLLER);
        TouchController.#showing = false;
    }

    static #toggleVisibility() {
        if (!TouchController.#dataChannel) {
            return;
        }

        TouchController.#showing ? TouchController.#hide() : TouchController.#show();
    }

    static enableBar() {
        TouchController.#$bar && TouchController.#$bar.setAttribute('data-showing', true);
    }

    static reset() {
        TouchController.#enable = false;
        TouchController.#showing = false;
        TouchController.#dataChannel = null;

        TouchController.#$bar && TouchController.#$bar.removeAttribute('data-showing');
    }

    static #dispatchMessage(msg) {
        TouchController.#dataChannel && setTimeout(() => {
            TouchController.#dataChannel.dispatchEvent(msg);
        }, 10);
    }

    static setup() {
        const $style = document.createElement('style');
        document.documentElement.appendChild($style);

        const $bar = createElement('div', {'id': 'better-xcloud-touch-controller-bar'});
        document.documentElement.appendChild($bar);

        // Setup double-tap event
        let clickTimeout;
        $bar.addEventListener('mousedown', e => {
            clickTimeout && clearTimeout(clickTimeout);
            if (clickTimeout) {
                // Double-clicked
                clickTimeout = null;
                TouchController.#toggleVisibility();
                return;
            }

            clickTimeout = setTimeout(() => {
                clickTimeout = null;
            }, 400);
        });

        TouchController.#$bar = $bar;

        const PREF_STYLE_STANDARD = PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD);
        const PREF_STYLE_CUSTOM = PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM);

        RTCPeerConnection.prototype.orgCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
        RTCPeerConnection.prototype.createDataChannel = function() {
            // Apply touch controller's style
            const $babylonCanvas = document.getElementById('babylon-canvas');
            let filter = '';
            if (TouchController.#enable) {
                if (PREF_STYLE_STANDARD === 'white') {
                    filter = 'grayscale(1) brightness(2)';
                } else if (PREF_STYLE_STANDARD === 'muted') {
                    filter = 'sepia(0.5)';
                }
            } else if (PREF_STYLE_CUSTOM === 'muted') {
                filter = 'sepia(0.5)';
            }

            if (filter) {
                $style.textContent = `
#babylon-canvas {
    filter: ${filter} !important;
}
`;
            }

            const dataChannel = this.orgCreateDataChannel.apply(this, arguments);
            if (!TouchController.#enable) {
                return dataChannel;
            }

            TouchController.#dataChannel = dataChannel;

            // Fix sometimes the touch controller doesn't show at the beginning
            dataChannel.addEventListener('open', e => {
                setTimeout(TouchController.#show, 1000);
            });

            dataChannel.addEventListener('message', msg => {
                if (msg.origin === 'better-xcloud' || typeof msg.data !== 'string') {
                    return;
                }

                // Dispatch a message to display generic touch controller
                if (msg.data.includes('touchcontrols/showtitledefault')) {
                    TouchController.#show();
                }
            });

            return dataChannel;
        };
    }
}

class MouseCursorHider {
    static #timeout;
    static #cursorVisible = true;

    static show() {
        document.body && (document.body.style.cursor = 'unset');
        MouseCursorHider.#cursorVisible = true;
    }

    static hide() {
        document.body && (document.body.style.cursor = 'none');
        MouseCursorHider.#timeout = null;
        MouseCursorHider.#cursorVisible = false;
    }

    static onMouseMove(e) {
        // Toggle cursor
        !MouseCursorHider.#cursorVisible && MouseCursorHider.show();
        // Setup timeout
        MouseCursorHider.#timeout && clearTimeout(MouseCursorHider.#timeout);
        MouseCursorHider.#timeout = setTimeout(MouseCursorHider.hide, 3000);
    }

    static start() {
        MouseCursorHider.show();
        document.addEventListener('mousemove', MouseCursorHider.onMouseMove);
    }

    static stop() {
        MouseCursorHider.#timeout && clearTimeout(MouseCursorHider.#timeout);
        document.removeEventListener('mousemove', MouseCursorHider.onMouseMove);
        MouseCursorHider.show();
    }
}


class StreamBadges {
    static get BADGE_PLAYTIME() { return 'playtime'; };
    static get BADGE_BATTERY() { return 'battery'; };
    static get BADGE_IN() { return 'in'; };
    static get BADGE_OUT() { return 'out'; };

    static get BADGE_SERVER() { return 'server'; };
    static get BADGE_VIDEO() { return 'video'; };
    static get BADGE_AUDIO() { return 'audio'; };

    static get BADGE_BREAK() { return 'break'; };

    static ipv6 = false;
    static resolution = null;
    static video = null;
    static audio = null;
    static fps = 0;
    static region = '';

    static startBatteryLevel = 100;
    static startTimestamp = 0;

    static #cachedDoms = {};

    static #interval;
    static get #REFRESH_INTERVAL() { return 3000; };

    static #renderBadge(name, value, color) {
        const CE = createElement;

        if (name === StreamBadges.BADGE_BREAK) {
            return CE('div', {'style': 'display: block'});
        }

        let $badge;
        if (StreamBadges.#cachedDoms[name]) {
            $badge = StreamBadges.#cachedDoms[name];
            $badge.lastElementChild.textContent = value;
            return $badge;
        }

        $badge = CE('div', {'class': 'better-xcloud-badge'},
                    CE('span', {'class': 'better-xcloud-badge-name'}, name),
                    CE('span', {'class': 'better-xcloud-badge-value', 'style': `background-color: ${color}`}, value));

        if (name === StreamBadges.BADGE_BATTERY) {
            $badge.classList.add('better-xcloud-badge-battery');
        }

        StreamBadges.#cachedDoms[name] = $badge;
        return $badge;
    }

    static async #updateBadges(forceUpdate) {
        if (!forceUpdate && !document.querySelector('.better-xcloud-badges')) {
            StreamBadges.#stop();
            return;
        }

        // Playtime
        let now = +new Date;
        const diffSeconds = Math.ceil((now - StreamBadges.startTimestamp) / 1000);
        const playtime = StreamBadges.#secondsToHm(diffSeconds);

        // Battery
        let batteryLevel = '100%';
        let batteryLevelInt = 100;
        let isCharging = false;
        if (navigator.getBattery) {
            try {
                const bm = await navigator.getBattery();
                isCharging = bm.charging;
                batteryLevelInt = Math.round(bm.level * 100);
                batteryLevel = `${batteryLevelInt}%`;

                if (batteryLevelInt != StreamBadges.startBatteryLevel) {
                    const diffLevel = Math.round(batteryLevelInt - StreamBadges.startBatteryLevel);
                    const sign = diffLevel > 0 ? '+' : '';
                    batteryLevel += ` (${sign}${diffLevel}%)`;
                }
            } catch(e) {}
        }

        const stats = await STREAM_WEBRTC.getStats();
        let totalIn = 0;
        let totalOut = 0;
        stats.forEach(stat => {
            if (stat.type === 'candidate-pair' && stat.state == 'succeeded') {
                totalIn += stat.bytesReceived;
                totalOut += stat.bytesSent;
            }
        });

        const badges = {
            [StreamBadges.BADGE_IN]: totalIn ? StreamBadges.#humanFileSize(totalIn) : null,
            [StreamBadges.BADGE_OUT]: totalOut ? StreamBadges.#humanFileSize(totalOut) : null,
            [StreamBadges.BADGE_PLAYTIME]: playtime,
            [StreamBadges.BADGE_BATTERY]: batteryLevel,
        };

        for (let name in badges) {
            const value = badges[name];
            if (value === null) {
                continue;
            }

            const $elm = StreamBadges.#cachedDoms[name];
            $elm && ($elm.lastElementChild.textContent = value);

            if (name === StreamBadges.BADGE_BATTERY) {
                // Show charging status
                $elm.setAttribute('data-charging', isCharging);

                if (StreamBadges.startBatteryLevel === 100 && batteryLevelInt === 100) {
                    $elm.style.display = 'none';
                } else {
                    $elm.style = '';
                }
            }
        }
    }

    static #stop() {
        StreamBadges.#interval && clearInterval(StreamBadges.#interval);
        StreamBadges.#interval = null;
    }

    static #secondsToHm(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor(seconds % 3600 / 60) + 1;

        const hDisplay = h > 0 ? `${h}h`: '';
        const mDisplay = m > 0 ? `${m}m`: '';
        return hDisplay + mDisplay;
    }

    // https://stackoverflow.com/a/20732091
    static #humanFileSize(size) {
        let i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    }

    static async render() {
        // Video
        let video = '';
        if (StreamBadges.resolution) {
            video = `${StreamBadges.resolution.height}p`;
        }

        if (StreamBadges.video) {
            video && (video += '/');
            video += StreamBadges.video.codec;
            if (StreamBadges.video.profile) {
                let profile = StreamBadges.video.profile;
                profile = profile.startsWith('4d') ? 'High' : (profile.startsWith('42') ? 'Normal' : profile);
                video += ` (${profile})`;
            }
        }

        // Audio
        let audio;
        if (StreamBadges.audio) {
            audio = StreamBadges.audio.codec;
            const bitrate = StreamBadges.audio.bitrate / 1000;
            audio += ` (${bitrate} kHz)`;
        }

        // Battery
        let batteryLevel = '';
        if (navigator.getBattery) {
            batteryLevel = '100%';
        }

        // Server + Region
        let server = StreamBadges.region;
        server += '@' + (StreamBadges.ipv6 ? 'IPv6' : 'IPv4');

        const BADGES = [
            [StreamBadges.BADGE_PLAYTIME, '1m', '#ff004d'],
            [StreamBadges.BADGE_BATTERY, batteryLevel, '#00b543'],
            [StreamBadges.BADGE_IN, StreamBadges.#humanFileSize(0), '#29adff'],
            [StreamBadges.BADGE_OUT, StreamBadges.#humanFileSize(0), '#ff77a8'],
            [StreamBadges.BADGE_BREAK],
            [StreamBadges.BADGE_SERVER, server, '#ff6c24'],
            video ? [StreamBadges.BADGE_VIDEO, video, '#742f29'] : null,
            audio ? [StreamBadges.BADGE_AUDIO, audio, '#5f574f'] : null,
        ];

        const $wrapper = createElement('div', {'class': 'better-xcloud-badges'});
        BADGES.forEach(item => item && $wrapper.appendChild(StreamBadges.#renderBadge(...item)));

        await StreamBadges.#updateBadges(true);
        StreamBadges.#stop();
        StreamBadges.#interval = setInterval(StreamBadges.#updateBadges, StreamBadges.#REFRESH_INTERVAL);

        return $wrapper;
    }
}


class StreamStats {
    static get PING() { return 'ping'; }
    static get FPS() { return 'fps'; }
    static get BITRATE() { return 'btr'; }
    static get DECODE_TIME() { return 'dt'; }
    static get PACKETS_LOST() { return 'pl'; }
    static get FRAMES_LOST() { return 'fl'; }

    static #interval;
    static #updateInterval = 1000;

    static #$container;
    static #$fps;
    static #$ping;
    static #$dt;
    static #$pl;
    static #$fl;
    static #$br;

    static #$settings;

    static #lastStat;

    static #quickGlanceObserver;

    static start(glancing=false) {
        if (!StreamStats.isHidden() || (glancing && StreamStats.isGlancing())) {
            return;
        }

        StreamStats.#$container.classList.remove('better-xcloud-gone');
        StreamStats.#$container.setAttribute('data-display', glancing ? 'glancing' : 'fixed');

        StreamStats.#interval = setInterval(StreamStats.update, StreamStats.#updateInterval);
    }

    static stop(glancing=false) {
        if (glancing && !StreamStats.isGlancing()) {
            return;
        }

        clearInterval(StreamStats.#interval);
        StreamStats.#interval = null;
        StreamStats.#lastStat = null;

        StreamStats.#$container.removeAttribute('data-display');
        StreamStats.#$container.classList.add('better-xcloud-gone');
    }

    static toggle() {
        if (StreamStats.isGlancing()) {
            StreamStats.#$container.setAttribute('data-display', 'fixed');
        } else {
            StreamStats.isHidden() ? StreamStats.start() : StreamStats.stop();
        }
    }

    static onStoppedPlaying() {
        StreamStats.stop();
        StreamStats.quickGlanceStop();
        StreamStats.hideSettingsUi();
    }

    static isHidden = () => StreamStats.#$container.classList.contains('better-xcloud-gone');
    static isGlancing = () => StreamStats.#$container.getAttribute('data-display') === 'glancing';

    static quickGlanceSetup() {
        if (StreamStats.#quickGlanceObserver) {
            return;
        }

        const $uiContainer = document.querySelector('div[data-testid=ui-container]');
        StreamStats.#quickGlanceObserver = new MutationObserver((mutationList, observer) => {
            for (let record of mutationList) {
                if (record.attributeName && record.attributeName === 'aria-expanded') {
                    const expanded = record.target.ariaExpanded;
                    if (expanded === 'true') {
                        StreamStats.isHidden() && StreamStats.start(true);
                    } else {
                        StreamStats.stop(true);
                    }
                }
            }
        });

        StreamStats.#quickGlanceObserver.observe($uiContainer, {
            attributes: true,
            attributeFilter: ['aria-expanded'],
            subtree: true,
        });
    }

    static quickGlanceStop() {
        StreamStats.#quickGlanceObserver && StreamStats.#quickGlanceObserver.disconnect();
        StreamStats.#quickGlanceObserver = null;
    }

    static update() {
        if (StreamStats.isHidden() || !STREAM_WEBRTC) {
            StreamStats.onStoppedPlaying();
            return;
        }

        const PREF_STATS_CONDITIONAL_FORMATTING = PREFS.get(Preferences.STATS_CONDITIONAL_FORMATTING);
        STREAM_WEBRTC.getStats().then(stats => {
            stats.forEach(stat => {
                let grade = '';
                if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
                    // FPS
                    StreamStats.#$fps.textContent = stat.framesPerSecond || 0;

                    // Packets Lost
                    const packetsLost = stat.packetsLost;
                    const packetsReceived = stat.packetsReceived;
                    const packetsLostPercentage = (packetsLost * 100 / ((packetsLost + packetsReceived) || 1)).toFixed(2);
                    StreamStats.#$pl.textContent = `${packetsLost} (${packetsLostPercentage}%)`;

                    // Frames Dropped
                    const framesDropped = stat.framesDropped;
                    const framesReceived = stat.framesReceived;
                    const framesDroppedPercentage = (framesDropped * 100 / ((framesDropped + framesReceived) || 1)).toFixed(2);
                    StreamStats.#$fl.textContent = `${framesDropped} (${framesDroppedPercentage}%)`;

                    if (StreamStats.#lastStat) {
                        const lastStat = StreamStats.#lastStat;
                        // Bitrate
                        const timeDiff = stat.timestamp - lastStat.timestamp;
                        const bitrate = 8 * (stat.bytesReceived - lastStat.bytesReceived) / timeDiff / 1000;
                        StreamStats.#$br.textContent = `${bitrate.toFixed(2)} Mbps`;

                        // Decode time
                        const totalDecodeTimeDiff = stat.totalDecodeTime - lastStat.totalDecodeTime;
                        const framesDecodedDiff = stat.framesDecoded - lastStat.framesDecoded;
                        const currentDecodeTime = totalDecodeTimeDiff / framesDecodedDiff * 1000;
                        StreamStats.#$dt.textContent = `${currentDecodeTime.toFixed(2)}ms`;

                        if (PREF_STATS_CONDITIONAL_FORMATTING) {
                            grade = (currentDecodeTime > 12) ? 'bad' : (currentDecodeTime > 9) ? 'ok' : (currentDecodeTime > 6) ? 'good' : '';
                        }
                        StreamStats.#$dt.setAttribute('data-grade', grade);
                    }

                    StreamStats.#lastStat = stat;
                } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                    // Round Trip Time
                    const roundTripTime = typeof stat.currentRoundTripTime !== 'undefined' ? stat.currentRoundTripTime * 1000 : '???';
                    StreamStats.#$ping.textContent = roundTripTime;

                    if (PREF_STATS_CONDITIONAL_FORMATTING) {
                        grade = (roundTripTime > 100) ? 'bad' : (roundTripTime > 75) ? 'ok' : (roundTripTime > 40) ? 'good' : '';
                    }
                    StreamStats.#$ping.setAttribute('data-grade', grade);
                }
            });
        });
    }

    static #refreshStyles() {
        const PREF_ITEMS = PREFS.get(Preferences.STATS_ITEMS);
        const PREF_POSITION = PREFS.get(Preferences.STATS_POSITION);
        const PREF_TRANSPARENT = PREFS.get(Preferences.STATS_TRANSPARENT);
        const PREF_OPACITY = PREFS.get(Preferences.STATS_OPACITY);
        const PREF_TEXT_SIZE = PREFS.get(Preferences.STATS_TEXT_SIZE);

        StreamStats.#$container.setAttribute('data-stats', '[' + PREF_ITEMS.join('][') + ']');
        StreamStats.#$container.setAttribute('data-position', PREF_POSITION);
        StreamStats.#$container.setAttribute('data-transparent', PREF_TRANSPARENT);
        StreamStats.#$container.style.opacity = PREF_OPACITY + '%';
        StreamStats.#$container.style.fontSize = PREF_TEXT_SIZE;
    }

    static hideSettingsUi() {
        StreamStats.#$settings.style.display = 'none';

        if (StreamStats.isGlancing() && !PREFS.get(Preferences.STATS_QUICK_GLANCE)) {
            StreamStats.stop();
        }
    }

    static #toggleSettingsUi() {
        const display = StreamStats.#$settings.style.display;
        StreamStats.#$settings.style.display = display === 'block' ? 'none' : 'block';
    }

    static render() {
        if (StreamStats.#$container) {
            return;
        }

        const CE = createElement;
        const STATS = {
            [StreamStats.PING]: (StreamStats.#$ping = CE('span', {}, '0')),
            [StreamStats.FPS]: (StreamStats.#$fps = CE('span', {}, '0')),
            [StreamStats.BITRATE]: (StreamStats.#$br = CE('span', {}, '0 Mbps')),
            [StreamStats.DECODE_TIME]: (StreamStats.#$dt = CE('span', {}, '0ms')),
            [StreamStats.PACKETS_LOST]: (StreamStats.#$pl = CE('span', {}, '0 (0.00%)')),
            [StreamStats.FRAMES_LOST]: (StreamStats.#$fl = CE('span', {}, '0 (0.00%)')),
        };

        const $barFragment = document.createDocumentFragment();
        for (let statKey in STATS) {
            const $div = CE('div', {'class': `better-xcloud-stat-${statKey}`}, CE('label', {}, statKey.toUpperCase()), STATS[statKey]);
            $barFragment.appendChild($div);
        }

        StreamStats.#$container = CE('div', {'class': 'better-xcloud-stats-bar better-xcloud-gone'}, $barFragment);

        let clickTimeout;
        StreamStats.#$container.addEventListener('mousedown', e => {
            clearTimeout(clickTimeout);
            if (clickTimeout) {
                // Double-clicked
                clickTimeout = null;
                StreamStats.#toggleSettingsUi();
                return;
            }

            clickTimeout = setTimeout(() => {
                clickTimeout = null;
            }, 400);
        });

        document.documentElement.appendChild(StreamStats.#$container);

        const refreshFunc = e => {
            StreamStats.#refreshStyles()
        };

        let $close;


        const STATS_UI = {
            [Preferences.STATS_SHOW_WHEN_PLAYING]: {
                'label': 'Show stats when starting the game',
            },
            [Preferences.STATS_QUICK_GLANCE]: {
                'label': 'Enable "Quick Glance" mode',
                'onChange': e => {
                    e.target.checked ? StreamStats.quickGlanceSetup() : StreamStats.quickGlanceStop();
                },
            },
            [Preferences.STATS_ITEMS]: {
                'label': 'Stats',
                'onChange': refreshFunc,
            },
            [Preferences.STATS_POSITION]: {
                'label': 'Position',
                'onChange': refreshFunc,
            },
            [Preferences.STATS_TEXT_SIZE]: {
                'label': 'Text size',
                'onChange': refreshFunc,
            },
            [Preferences.STATS_OPACITY]: {
                'label': 'Opacity (50-100%)',
                'onChange': refreshFunc,
            },
            [Preferences.STATS_TRANSPARENT]: {
                'label': 'Transparent background',
                'onChange': refreshFunc,
            },
            [Preferences.STATS_CONDITIONAL_FORMATTING]: {
                'label': 'Conditional formatting text color',
                'onChange': refreshFunc,
            },
        };

        const $fragment = document.createDocumentFragment();
        for (let settingKey in STATS_UI) {
            const setting = STATS_UI[settingKey];

            $fragment.appendChild(CE('div', {},
               CE('label', {'for': `xcloud_setting_${settingKey}`}, setting.label),
               PREFS.toElement(settingKey, setting.onChange)
            ));
        }

        StreamStats.#$settings = CE('div', {'class': 'better-xcloud-stats-settings'},
                                    CE('b', {}, 'Stream Stats Settings'),
                                    $fragment,
                                    $close = CE('button', {}, 'Close'));

        $close.addEventListener('click', e => StreamStats.hideSettingsUi());
        document.documentElement.appendChild(StreamStats.#$settings);

        StreamStats.#refreshStyles();
    }
}

class UserAgent {
    static get PROFILE_EDGE_WINDOWS() { return 'edge-windows'; }
    static get PROFILE_SAFARI_MACOS() { return 'safari-macos'; }
    static get PROFILE_SMARTTV_TIZEN() { return 'smarttv-tizen'; }
    static get PROFILE_DEFAULT() { return 'default'; }
    static get PROFILE_CUSTOM() { return 'custom'; }

    static #USER_AGENTS = {
        [UserAgent.PROFILE_EDGE_WINDOWS]: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188',
        [UserAgent.PROFILE_SAFARI_MACOS]: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.1',
        [UserAgent.PROFILE_SMARTTV_TIZEN]: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) 94.0.4606.31/7.0 TV Safari/537.36',
    }

    static getDefault() {
        return window.navigator.orgUserAgent || window.navigator.userAgent;
    }

    static get(profile) {
        const defaultUserAgent = UserAgent.getDefault();
        if (profile === UserAgent.PROFILE_CUSTOM) {
            return PREFS.get(Preferences.USER_AGENT_CUSTOM, '');
        }

        return UserAgent.#USER_AGENTS[profile] || defaultUserAgent;
    }

    static isSafari(mobile=false) {
        const userAgent = (UserAgent.getDefault() || '').toLowerCase();
        let result = userAgent.includes('safari') && !userAgent.includes('chrom');

        if (result && mobile) {
            result = userAgent.includes('mobile');
        }

        return result;
    }

    static spoof() {
        const profile = PREFS.get(Preferences.USER_AGENT_PROFILE);
        if (profile === UserAgent.PROFILE_DEFAULT) {
            return;
        }

        const defaultUserAgent = window.navigator.userAgent;
        const userAgent = UserAgent.get(profile) || defaultUserAgent;

        // Clear data of navigator.userAgentData, force xCloud to detect browser based on navigator.userAgent
        Object.defineProperty(window.navigator, 'userAgentData', {});

        // Override navigator.userAgent
        window.navigator.orgUserAgent = window.navigator.userAgent;
        Object.defineProperty(window.navigator, 'userAgent', {
            value: userAgent,
        });

        return userAgent;
    }
}


class PreloadedState {
    static override() {
        Object.defineProperty(window, '__PRELOADED_STATE__', {
            configurable: true,
            get: () => {
                // Override User-Agent
                const userAgent = UserAgent.spoof();
                if (userAgent) {
                    this._state.appContext.requestInfo.userAgent = userAgent;
                }

                return this._state;
            },
            set: (state) => {
                this._state = state;
                APP_CONTEXT = structuredClone(state.appContext);

                // Get a list of touch-supported games
                if (PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER) === 'all') {
                    let titles = {};
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


class Preferences {
    static get LAST_UPDATE_CHECK() { return 'version_last_check'; }
    static get LATEST_VERSION() { return 'version_latest'; }
    static get CURRENT_VERSION() { return 'version_current'; }

    static get SERVER_REGION() { return 'server_region'; }
    static get PREFER_IPV6_SERVER() { return 'prefer_ipv6_server'; }
    static get STREAM_TARGET_RESOLUTION() { return 'stream_target_resolution'; }
    static get STREAM_PREFERRED_LOCALE() { return 'stream_preferred_locale'; }
    static get USE_DESKTOP_CODEC() { return 'use_desktop_codec'; }
    static get USER_AGENT_PROFILE() { return 'user_agent_profile'; }
    static get USER_AGENT_CUSTOM() { return 'user_agent_custom'; }
    static get STREAM_HIDE_IDLE_CURSOR() { return 'stream_hide_idle_cursor';}
    static get STREAM_SIMPLIFY_MENU() { return 'stream_simplify_menu'; }

    static get STREAM_TOUCH_CONTROLLER() { return 'stream_touch_controller'; }
    static get STREAM_TOUCH_CONTROLLER_STYLE_STANDARD() { return 'stream_touch_controller_style_standard'; }
    static get STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM() { return 'stream_touch_controller_style_custom'; }

    static get SCREENSHOT_BUTTON_POSITION() { return 'screenshot_button_position'; }
    static get BLOCK_TRACKING() { return 'block_tracking'; }
    static get BLOCK_SOCIAL_FEATURES() { return 'block_social_features'; }
    static get DISABLE_BANDWIDTH_CHECKING() { return 'disable_bandwidth_checking'; }
    static get SKIP_SPLASH_VIDEO() { return 'skip_splash_video'; }
    static get HIDE_DOTS_ICON() { return 'hide_dots_icon'; }
    static get REDUCE_ANIMATIONS() { return 'reduce_animations'; }

    static get UI_LOADING_SCREEN_GAME_ART() { return 'ui_loading_screen_game_art'; }
    static get UI_LOADING_SCREEN_WAIT_TIME() { return 'ui_loading_screen_wait_time'; }
    static get UI_LOADING_SCREEN_ROCKET() { return 'ui_loading_screen_rocket'; }

    static get VIDEO_CLARITY() { return 'video_clarity'; }
    static get VIDEO_RATIO() { return 'video_ratio' }
    static get VIDEO_BRIGHTNESS() { return 'video_brightness'; }
    static get VIDEO_CONTRAST() { return 'video_contrast'; }
    static get VIDEO_SATURATION() { return 'video_saturation'; }

    static get AUDIO_MIC_ON_PLAYING() { return 'audio_mic_on_playing'; }

    static get STATS_ITEMS() { return 'stats_items'; };
    static get STATS_SHOW_WHEN_PLAYING() { return 'stats_show_when_playing'; }
    static get STATS_QUICK_GLANCE() { return 'stats_quick_glance'; }
    static get STATS_POSITION() { return 'stats_position'; }
    static get STATS_TEXT_SIZE() { return 'stats_text_size'; }
    static get STATS_TRANSPARENT() { return 'stats_transparent'; }
    static get STATS_OPACITY() { return 'stats_opacity'; }
    static get STATS_CONDITIONAL_FORMATTING() { return 'stats_conditional_formatting'; }

    static SETTINGS = {
        [Preferences.LAST_UPDATE_CHECK]: {
            'default': 0,
        },
        [Preferences.LATEST_VERSION]: {
            'default': '',
        },
        [Preferences.CURRENT_VERSION]: {
            'default': '',
        },
        [Preferences.SERVER_REGION]: {
            'default': 'default',
        },
        [Preferences.STREAM_PREFERRED_LOCALE]: {
            'default': 'default',
            'options': {
                'default': 'Default',
                'ar-SA': '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
                'cs-CZ': '\u010de\u0161tina',
                'da-DK': 'dansk',
                'de-DE': 'Deutsch',
                'el-GR': '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac',
                'en-GB': 'English (United Kingdom)',
                'en-US': 'English (United States)',
                'es-ES': 'espa\xf1ol (Espa\xf1a)',
                'es-MX': 'espa\xf1ol (Latinoam\xe9rica)',
                'fi-FI': 'suomi',
                'fr-FR': 'fran\xe7ais',
                'he-IL': '\u05e2\u05d1\u05e8\u05d9\u05ea',
                'hu-HU': 'magyar',
                'it-IT': 'italiano',
                'ja-JP': '\u65e5\u672c\u8a9e',
                'ko-KR': '\ud55c\uad6d\uc5b4',
                'nb-NO': 'norsk bokm\xe5l',
                'nl-NL': 'Nederlands',
                'pl-PL': 'polski',
                'pt-BR': 'portugu\xeas (Brasil)',
                'pt-PT': 'portugu\xeas (Portugal)',
                'ru-RU': '\u0440\u0443\u0441\u0441\u043a\u0438\u0439',
                'sk-SK': 'sloven\u010dina',
                'sv-SE': 'svenska',
                'tr-TR': 'T\xfcrk\xe7e',
                'zh-CN': '\u4e2d\u6587(\u7b80\u4f53)',
                'zh-TW': '\u4e2d\u6587 (\u7e41\u9ad4)',
            },
        },
        [Preferences.STREAM_TARGET_RESOLUTION]: {
            'default': 'auto',
            'options': {
                'auto': 'Auto',
                '1080p': '1080p',
                '720p': '720p',
            },
        },
        [Preferences.USE_DESKTOP_CODEC]: {
            'default': false,
        },
        [Preferences.PREFER_IPV6_SERVER]: {
            'default': false,
        },
        [Preferences.DISABLE_BANDWIDTH_CHECKING]: {
            'default': false,
        },
        [Preferences.SCREENSHOT_BUTTON_POSITION]: {
            'default': 'bottom-left',
            'options':
            {
                'bottom-left': 'Bottom Left',
                'bottom-right': 'Bottom Right',
                'none': 'Disable',
            },
        },
        [Preferences.SKIP_SPLASH_VIDEO]: {
            'default': false,
        },
        [Preferences.HIDE_DOTS_ICON]: {
            'default': false,
        },
        [Preferences.STREAM_TOUCH_CONTROLLER]: {
            'default': 'default',
            'options': {
                'default': 'Default',
                'all': 'All games',
                'off': 'Off',
            },
        },
        [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: {
            'default': 'default',
            'options': {
                'default': 'Default colors',
                'white': 'All white',
                'muted': 'Muted colors',
            },
        },
        [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: {
            'default': 'default',
            'options': {
                'default': 'Default colors',
                'muted': 'Muted colors',
            },
        },
        [Preferences.STREAM_SIMPLIFY_MENU]: {
            'default': false,
        },
        [Preferences.STREAM_HIDE_IDLE_CURSOR]: {
            'default': false,
        },
        [Preferences.REDUCE_ANIMATIONS]: {
            'default': false,
        },
        [Preferences.UI_LOADING_SCREEN_GAME_ART]: {
            'default': true,
        },
        [Preferences.UI_LOADING_SCREEN_WAIT_TIME]: {
            'default': false,
        },
        [Preferences.UI_LOADING_SCREEN_ROCKET]: {
            'default': 'show',
            'options': {
                'show': 'Always show',
                'hide-queue': 'Hide when queuing',
                'hide': 'Always hide',
            },
        },
        [Preferences.BLOCK_SOCIAL_FEATURES]: {
            'default': false,
        },
        [Preferences.BLOCK_TRACKING]: {
            'default': false,
        },
        [Preferences.USER_AGENT_PROFILE]: {
            'default': 'default',
            'options': {
                [UserAgent.PROFILE_DEFAULT]: 'Default',
                [UserAgent.PROFILE_EDGE_WINDOWS]: 'Edge on Windows',
                [UserAgent.PROFILE_SAFARI_MACOS]: 'Safari on macOS',
                [UserAgent.PROFILE_SMARTTV_TIZEN]: 'Samsung Smart TV',
                [UserAgent.PROFILE_CUSTOM]: 'Custom',
            },
        },
        [Preferences.USER_AGENT_CUSTOM]: {
            'default': '',
        },
        [Preferences.VIDEO_CLARITY]: {
            'default': 0,
            'min': 0,
            'max': 5,
        },
        [Preferences.VIDEO_RATIO]: {
            'default': '16:9',
            'options': {
                '16:9': '16:9',
                '21:9': '21:9',
                '16:10': '16:10',
                '4:3': '4:3',

                'fill': 'Stretch',
                'cover': 'Cover',
            },
        },
        [Preferences.VIDEO_SATURATION]: {
            'default': 100,
            'min': 50,
            'max': 150,
        },
        [Preferences.VIDEO_CONTRAST]: {
            'default': 100,
            'min': 50,
            'max': 150,
        },
        [Preferences.VIDEO_BRIGHTNESS]: {
            'default': 100,
            'min': 50,
            'max': 150,
        },
        [Preferences.AUDIO_MIC_ON_PLAYING]: {
            'default': false,
        },

        [Preferences.STATS_ITEMS]: {
            'default': [StreamStats.PING, StreamStats.FPS, StreamStats.PACKETS_LOST, StreamStats.FRAMES_LOST],
            'multiple_options': {
                [StreamStats.PING]: 'Ping',
                [StreamStats.FPS]: 'FPS',
                [StreamStats.BITRATE]: 'Bitrate',
                [StreamStats.DECODE_TIME]: 'Decode time',
                [StreamStats.PACKETS_LOST]: 'Packets lost',
                [StreamStats.FRAMES_LOST]: 'Frames lost',
            },
        },
        [Preferences.STATS_SHOW_WHEN_PLAYING]: {
            'default': false,
        },
        [Preferences.STATS_QUICK_GLANCE]: {
            'default': false,
        },
        [Preferences.STATS_POSITION]: {
            'default': 'top-left',
            'options': {
                'top-left': 'Top Left',
                'top-center': 'Top Center',
                'top-right': 'Top Right',
            },
        },
        [Preferences.STATS_TEXT_SIZE]: {
            'default': '0.9rem',
            'options': {
                '0.9rem': 'Small',
                '1.0rem': 'Normal',
                '1.1rem': 'Large',
            },
        },
        [Preferences.STATS_TRANSPARENT]: {
            'default': false,
        },
        [Preferences.STATS_OPACITY]: {
            'default': 80,
            'min': 50,
            'max': 100,
        },
        [Preferences.STATS_CONDITIONAL_FORMATTING]: {
            'default': false,
        },
    }

    constructor() {
        this._storage = localStorage;
        this._key = 'better_xcloud';

        let savedPrefs = this._storage.getItem(this._key);
        if (savedPrefs == null) {
            savedPrefs = '{}';
        }
        savedPrefs = JSON.parse(savedPrefs);

        this._prefs = {};
        for (let settingId in Preferences.SETTINGS) {
            if (!settingId) {
                alert('Undefined setting key');
                console.log('Undefined setting key');
                continue;
            }

            const setting = Preferences.SETTINGS[settingId];
            if (settingId in savedPrefs) {
                this._prefs[settingId] = savedPrefs[settingId];
            } else {
                this._prefs[settingId] = setting.default;
            }
        }
    }

    #validateValue(key, value) {
        const config = Preferences.SETTINGS[key];
        if (!config) {
            return value;
        }

        if (typeof value === 'undefined' || value === null) {
            value = config.default;
        }

        if ('min' in config) {
            value = Math.max(config.min, value);
        }

        if ('max' in config) {
            value = Math.min(config.max, value);
        }

        if ('options' in config && !(value in config.options)) {
            value = config.default;
        } else if ('multiple_options' in config) {
            if (value.length) {
                const validOptions = Object.keys(config.multiple_options);
                value.forEach((item, idx) => {
                    (validOptions.indexOf(item) === -1) && value.splice(idx, 1);
                });
            }

            if (!value.length) {
                value = config.default;
            }
        }

        return value;
    }

    get(key) {
        if (typeof key === 'undefined') {
            debugger;
            return;
        }

        // Return "default" for STREAM_TOUCH_CONTROLLER pref when the browser doesn't support touch
        if (!HAS_TOUCH_SUPPORT && key === Preferences.STREAM_TOUCH_CONTROLLER) {
            return 'default';
        }

        let value = this._prefs[key];
        value = this.#validateValue(key, value);

        return value;
    }

    set(key, value) {
        value = this.#validateValue(key, value);

        this._prefs[key] = value;
        this._update_storage();
    }

    _update_storage() {
        this._storage.setItem(this._key, JSON.stringify(this._prefs));
    }

    toElement(key, onChange) {
        const CE = createElement;
        const setting = Preferences.SETTINGS[key];
        const currentValue = PREFS.get(key);

        let $control;
        if ('options' in setting) {
            $control = CE('select', {'id': 'xcloud_setting_' + key});
            for (let value in setting.options) {
                const label = setting.options[value];

                const $option = CE('option', {value: value}, label);
                $control.appendChild($option);
            }

            $control.value = currentValue;
            $control.addEventListener('change', e => {
                PREFS.set(key, e.target.value);
                onChange && onChange(e);
            });
        } else if ('multiple_options' in setting) {
            $control = CE('select', {'id': 'xcloud_setting_' + key, 'multiple': true});
            for (let value in setting.multiple_options) {
                const label = setting.multiple_options[value];

                const $option = CE('option', {value: value}, label);
                $option.selected = currentValue.indexOf(value) > -1;

                $option.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    e.target.selected = !e.target.selected;

                    const $parent = e.target.parentElement;
                    $parent.focus();
                    $parent.dispatchEvent(new Event('change'));
                });

                $control.appendChild($option);
            }

            $control.addEventListener('mousedown', e => {
                const $this = this;
                const orgScrollTop = $this.scrollTop;
                setTimeout(() => ($this.scrollTop = orgScrollTop), 0);
            });

            $control.addEventListener('mousemove', e => e.preventDefault());

            // $control.value = currentValue;
            $control.addEventListener('change', e => {
                const values = Array.from(e.target.selectedOptions).map(e => e.value);
                PREFS.set(key, values);

                onChange && onChange(e);
            });
        } else if (typeof setting.default === 'number') {
            $control = CE('input', {'type': 'number', 'min': setting.min, 'max': setting.max});

            $control.value = currentValue;
            $control.addEventListener('change', e => {
                let value = Math.max(setting.min, Math.min(setting.max, parseInt(e.target.value)));
                e.target.value = value;

                PREFS.set(key, e.target.value);
                onChange && onChange(e);
            });
        } else {
            $control = CE('input', {'type': 'checkbox'});
            $control.checked = currentValue;

            $control.addEventListener('change', e => {
                PREFS.set(key, e.target.checked);
                onChange && onChange(e);
            });
        }

        $control.id = `xcloud_setting_${key}`;
        return $control;
    }

    toNumberStepper(key, onChange, suffix='', disabled=false) {
        const setting = Preferences.SETTINGS[key]
        let value = PREFS.get(key);

        let $text, $decBtn, $incBtn;

        const MIN = setting.min;
        const MAX= setting.max;
        const STEPS = Math.max(setting.steps || 1, 1);

        const CE = createElement;
        const $wrapper = CE('div', {},
                            $decBtn = CE('button', {'data-type': 'dec'}, '-'),
                            $text = CE('span', {}, value + suffix),
                            $incBtn = CE('button', {'data-type': 'inc'}, '+'),
                           );

        if (disabled) {
            $incBtn.disabled = true;
            $incBtn.classList.add('better-xcloud-hidden');

            $decBtn.disabled = true;
            $decBtn.classList.add('better-xcloud-hidden');
            return $wrapper;
        }

        let interval;
        let isHolding = false;

        const onClick = e => {
            if (isHolding) {
                e.preventDefault();
                isHolding = false;

                return;
            }

            const btnType = e.target.getAttribute('data-type');
            if (btnType === 'dec') {
                value = Math.max(MIN, value - STEPS);
            } else {
                value = Math.min(MAX, value + STEPS);
            }

            $text.textContent = value + suffix;
            PREFS.set(key, value);

            isHolding = false;

            onChange && onChange();
        }

        const onMouseDown = e => {
            isHolding = true;

            const args = arguments;
            interval = setInterval(() => {
                const event = new Event('click');
                event.arguments = args;

                e.target.dispatchEvent(event);
            }, 200);
        };

        const onMouseUp = e => {
            clearInterval(interval);
            isHolding = false;
        };

        $decBtn.addEventListener('click', onClick);
        $decBtn.addEventListener('mousedown', onMouseDown);
        $decBtn.addEventListener('mouseup', onMouseUp);
        $decBtn.addEventListener('touchstart', onMouseDown);
        $decBtn.addEventListener('touchend', onMouseUp);

        $incBtn.addEventListener('click', onClick);
        $incBtn.addEventListener('mousedown', onMouseDown);
        $incBtn.addEventListener('mouseup', onMouseUp);
        $incBtn.addEventListener('touchstart', onMouseDown);
        $incBtn.addEventListener('touchend', onMouseUp);

        return $wrapper;
    }
}


const PREFS = new Preferences();


function checkForUpdate() {
    const CHECK_INTERVAL_SECONDS = 4 * 3600; // check every 4 hours

    const currentVersion = PREFS.get(Preferences.CURRENT_VERSION);
    const lastCheck = PREFS.get(Preferences.LAST_UPDATE_CHECK);
    const now = Math.round((+new Date) / 1000);

    if (currentVersion === SCRIPT_VERSION && now - lastCheck < CHECK_INTERVAL_SECONDS) {
        return;
    }

    // Start checking
    PREFS.set(Preferences.LAST_UPDATE_CHECK, now);
    fetch('https://api.github.com/repos/redphx/better-xcloud/releases/latest')
        .then(response => response.json())
        .then(json => {
            // Store the latest version
            PREFS.set(Preferences.LATEST_VERSION, json.tag_name.substring(1));
            PREFS.set(Preferences.CURRENT_VERSION, SCRIPT_VERSION);
        });
}


function addCss() {
    let css = `
.better-xcloud-settings-button {
    background-color: transparent;
    border: none;
    color: white;
    font-weight: bold;
    line-height: 30px;
    border-radius: 4px;
    padding: 8px;
}

.better-xcloud-settings-button:hover, .better-xcloud-settings-button:focus {
    background-color: #515863;
}

.better-xcloud-settings-button[data-update-available]::after {
    content: ' 🌟';
}

.better_xcloud_settings {
    background-color: #151515;
    user-select: none;
    -webkit-user-select: none;
    color: #fff;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif
}

.better-xcloud-gone {
    display: none !important;
}

.better-xcloud-hidden {
    visibility: hidden !important;
}

.better-xcloud-settings-wrapper {
    width: 450px;
    margin: auto;
    padding: 12px 6px;
}

.better-xcloud-settings-wrapper *:focus {
    outline: none !important;
}

.better-xcloud-settings-wrapper .better-xcloud-settings-title-wrapper {
    display: flex;
}

.better-xcloud-settings-wrapper a.better-xcloud-settings-title {
    font-family: Bahnschrift, Arial, Helvetica, sans-serif;
    font-size: 1.4rem;
    text-decoration: none;
    font-weight: bold;
    display: block;
    margin-bottom: 8px;
    color: #5dc21e;
    flex: 1;
}

.better-xcloud-settings-group-label {
    font-weight: bold;
    display: block;
    font-size: 1.1rem;
}

@media (hover: hover) {
    .better-xcloud-settings-wrapper a.better-xcloud-settings-title:hover {
        color: #83f73a;
    }
}

.better-xcloud-settings-wrapper a.better-xcloud-settings-title:focus {
    color: #83f73a;
}

.better-xcloud-settings-wrapper a.better-xcloud-settings-update {
    display: none;
    color: #ff834b;
    text-decoration: none;
}

@media (hover: hover) {
    .better-xcloud-settings-wrapper a.better-xcloud-settings-update:hover {
        color: #ff9869;
        text-decoration: underline;
    }
}

.better-xcloud-settings-wrapper a.better-xcloud-settings-update:focus {
    color: #ff9869;
    text-decoration: underline;
}

.better-xcloud-settings-row {
    display: flex;
    margin-bottom: 8px;
    padding: 2px 4px;
}

.better-xcloud-settings-row label {
    flex: 1;
    align-self: center;
    margin-bottom: 0;
    padding-left: 10px;
}

@media not (hover: hover) {
    .better-xcloud-settings-row:focus-within {
       background-color: #242424;
    }
}

.better-xcloud-settings-row input {
    align-self: center;
}

.better-xcloud-settings-reload-button {
    padding: 8px 32px;
    margin: 10px auto 0;
    border: none;
    border-radius: 4px;
    display: block;
    background-color: #044e2a;
    text-align: center;
    color: white;
    text-transform: uppercase;
    font-family: Bahnschrift, Arial, Helvetica, sans-serif;
    font-weight: 400;
    line-height: 24px;
}

@media (hover: hover) {
    .better-xcloud-settings-reload-button:hover {
        background-color: #00753c;
    }
}

.better-xcloud-settings-reload-button:focus {
    background-color: #00753c;
}

.better-xcloud-settings-reload-button:active {
    background-color: #00753c;
}

.better-xcloud-settings-app-version {
    margin-top: 10px;
    text-align: center;
    color: #747474;
    font-size: 12px;
}

.better-xcloud-settings-custom-user-agent {
    display: block;
    width: 100%;
}

div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module] {
    overflow: visible;
}

.better-xcloud-badges {
    position: absolute;
    margin-left: 0px;
    user-select: none;
    -webkit-user-select: none;
}

.better-xcloud-badge {
    border: none;
    display: inline-block;
    line-height: 24px;
    color: #fff;
    font-family: Bahnschrift Semibold, Arial, Helvetica, sans-serif;
    font-size: 14px;
    font-weight: 400;
    margin: 0 8px 8px 0;
    box-shadow: 0px 0px 6px #000;
    border-radius: 4px;
}

.better-xcloud-badge-name {
    background-color: #2d3036;
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px 0 0 4px;
    text-transform: uppercase;
}

.better-xcloud-badge-value {
    background-color: grey;
    display: inline-block;
    padding: 2px 8px;
    border-radius: 0 4px 4px 0;
}

.better-xcloud-badge-battery[data-charging=true] span:first-of-type::after {
    content: ' ⚡️';
}

.better-xcloud-screenshot-button {
    display: none;
    opacity: 0;
    position: fixed;
    bottom: 0;
    box-sizing: border-box;
    width: 16vh;
    height: 16vh;
    max-width: 128px;
    max-height: 128px;
    padding: 2vh;
    padding: 24px 24px 12px 12px;
    background-size: cover;
    background-repeat: no-repeat;
    background-origin: content-box;
    filter: drop-shadow(0 0 2px #000000B0);
    transition: opacity 0.1s ease-in-out 0s, padding 0.1s ease-in 0s;
    z-index: 8888;

    /* Credit: https://phosphoricons.com */
    background-image: url(${ICON_SCREENSHOT_B64});
}

.better-xcloud-screenshot-button[data-showing=true] {
    opacity: 0.9;
}

.better-xcloud-screenshot-button[data-capturing=true] {
    padding: 1vh;
}

.better-xcloud-screenshot-canvas {
    display: none;
}

.better-xcloud-stats-bar {
    display: block;
    user-select: none;
    -webkit-user-select: none;
    position: fixed;
    top: 0;
    background-color: #000;
    color: #fff;
    font-family: Consolas, "Courier New", Courier, monospace;
    font-size: 0.9rem;
    padding-left: 8px;
    z-index: 1000;
    text-wrap: nowrap;
}

.better-xcloud-stats-bar > div {
    display: none;
    margin-right: 8px;
    border-right: 2px solid #fff;
    padding-right: 8px;
}

.better-xcloud-stats-bar[data-stats*="[fps]"] > .better-xcloud-stat-fps,
.better-xcloud-stats-bar[data-stats*="[ping]"] > .better-xcloud-stat-ping,
.better-xcloud-stats-bar[data-stats*="[btr]"] > .better-xcloud-stat-btr,
.better-xcloud-stats-bar[data-stats*="[dt]"] > .better-xcloud-stat-dt,
.better-xcloud-stats-bar[data-stats*="[pl]"] > .better-xcloud-stat-pl,
.better-xcloud-stats-bar[data-stats*="[fl]"] > .better-xcloud-stat-fl {
    display: inline-block;
}

.better-xcloud-stats-bar[data-stats$="[fps]"] > .better-xcloud-stat-fps,
.better-xcloud-stats-bar[data-stats$="[ping]"] > .better-xcloud-stat-ping,
.better-xcloud-stats-bar[data-stats$="[btr]"] > .better-xcloud-stat-btr,
.better-xcloud-stats-bar[data-stats$="[dt]"] > .better-xcloud-stat-dt,
.better-xcloud-stats-bar[data-stats$="[pl]"] > .better-xcloud-stat-pl,
.better-xcloud-stats-bar[data-stats$="[fl]"] > .better-xcloud-stat-fl {
    margin-right: 0;
    border-right: none;
}

.better-xcloud-stats-bar[data-display=glancing]::before {
    content: '👀 ';
    vertical-align: middle;
}

.better-xcloud-stats-bar[data-position=top-left] {
    left: 0;
    border-radius: 0 0 4px 0;
}

.better-xcloud-stats-bar[data-position=top-right] {
    right: 0;
    border-radius: 0 0 0 4px;
}

.better-xcloud-stats-bar[data-position=top-center] {
    transform: translate(-50%, 0);
    left: 50%;
    border-radius: 0 0 4px 4px;
}

.better-xcloud-stats-bar[data-transparent=true] {
    background: none;
    filter: drop-shadow(1px 0 0 #000000f0) drop-shadow(-1px 0 0 #000000f0) drop-shadow(0 1px 0 #000000f0) drop-shadow(0 -1px 0 #000000f0);
}

.better-xcloud-stats-bar label {
    margin: 0 8px 0 0;
    font-family: Bahnschrift, Arial, Helvetica, sans-serif;
    font-size: inherit;
    font-weight: bold;
    vertical-align: middle;
}

.better-xcloud-stats-bar span {
    min-width: 60px;
    display: inline-block;
    text-align: right;
    vertical-align: middle;
}

.better-xcloud-stats-bar span[data-grade=good] {
    color: #6bffff;
}

.better-xcloud-stats-bar span[data-grade=ok] {
    color: #fff16b;
}

.better-xcloud-stats-bar span[data-grade=bad] {
    color: #ff5f5f;
}

.better-xcloud-stats-bar span:first-of-type {
    min-width: 30px;
}

.better-xcloud-stats-settings {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-right: -50%;
    transform: translate(-50%, -50%);
    width: 420px;
    padding: 20px;
    border-radius: 8px;
    z-index: 1000;
    background: #1a1b1e;
    color: #fff;
    font-weight: 400;
    font-size: 16px;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    box-shadow: 0 0 6px #000;
    user-select: none;
    -webkit-user-select: none;
}

.better-xcloud-stats-settings *:focus {
    outline: none !important;
}

.better-xcloud-stats-settings > b {
    color: #fff;
    display: block;
    font-family: Bahnschrift, Arial, Helvetica, sans-serif;
    font-size: 26px;
    font-weight: 400;
    line-height: 32px;
    margin-bottom: 12px;
}

.better-xcloud-stats-settings > div {
    display: flex;
    margin-bottom: 8px;
    padding: 2px 4px;
}

.better-xcloud-stats-settings label {
    flex: 1;
    margin-bottom: 0;
    align-self: center;
}

.better-xcloud-stats-settings button {
    padding: 8px 32px;
    margin: 20px auto 0;
    border: none;
    border-radius: 4px;
    display: block;
    background-color: #2d3036;
    text-align: center;
    color: white;
    text-transform: uppercase;
    font-family: Bahnschrift, Arial, Helvetica, sans-serif;
    font-weight: 400;
    line-height: 18px;
    font-size: 14px;
}

@media (hover: hover) {
    .better-xcloud-stats-settings button:hover {
        background-color: #515863;
    }
}

.better-xcloud-stats-settings button:focus {
    background-color: #515863;
}

.better-xcloud-quick-settings-bar {
    display: none;
    user-select: none;
    -webkit-user-select: none;
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translate(-50%, 0);
    z-index: 9999;
    padding: 16px;
    width: 600px;
    background: #1a1b1e;
    color: #fff;
    border-radius: 8px 8px 0 0;
    font-weight: 400;
    font-size: 14px;
    font-family: Bahnschrift, Arial, Helvetica, sans-serif;
    text-align: center;
    box-shadow: 0px 0px 6px #000;
    opacity: 0.95;
}

.better-xcloud-quick-settings-bar *:focus {
    outline: none !important;
}

.better-xcloud-quick-settings-bar > div {
    flex: 1;
}

.better-xcloud-quick-settings-bar label {
    font-size: 18px;
    font-weight: bold;
    display: block;
    margin-bottom: 8px;
}

.better-xcloud-quick-settings-bar button {
    border: none;
    width: 24px;
    height: 24px;
    margin: 0 4px;
    line-height: 24px;
    background-color: #515151;
    color: #fff;
    border-radius: 4px;
}

@media (hover: hover) {
    .better-xcloud-quick-settings-bar button:hover {
        background-color: #414141;
        color: white;
    }
}

.better-xcloud-quick-settings-bar button:active {
        background-color: #414141;
        color: white;
    }

.better-xcloud-quick-settings-bar span {
    display: inline-block;
    width: 40px;
    font-weight: bold;
    font-family: Consolas, "Courier New", Courier, monospace;
    font-size: 16px;
}

.better-xcloud-stream-menu-button-on {
    fill: #000 !important;
    background-color: #fff !important;
    color: #000 !important;
}

#better-xcloud-touch-controller-bar {
    display: none;
    opacity: 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 6vh;
    z-index: 5555;
}

#better-xcloud-touch-controller-bar[data-showing=true] {
    display: block !important;
}

.better-xcloud-wait-time-box {
    position: fixed;
    top: 0;
    right: 0;
    background-color: #000000cc;
    color: #fff;
    z-index: 9999;
    padding: 12px;
    border-radius: 0 0 0 8px;
}

.better-xcloud-wait-time-box label {
    display: block;
    text-transform: uppercase;
    text-align: right;
    font-size: 12px;
    font-weight: bold;
    margin: 0;
}

.better-xcloud-wait-time-estimated, .better-xcloud-wait-time-countdown {
    display: block;
    font-family: Consolas, "Courier New", Courier, monospace;
    text-align: right;
    font-size: 16px;
}

.better-xcloud-wait-time-estimated {
    margin-bottom: 10px;
}

/* Hide UI elements */
#headerArea, #uhfSkipToMain, .uhf-footer {
    display: none;
}

div[class*=NotFocusedDialog] {
    position: absolute !important;
    top: -9999px !important;
    left: -9999px !important;
    width: 0px !important;
    height: 0px !important;
}

#game-stream video:not([src]) {
    visibility: hidden;
}
`;

    // Reduce animations
    if (PREFS.get(Preferences.REDUCE_ANIMATIONS)) {
        css += 'div[class*=GameImageItem-module], div[class*=ScrollArrows-module] { transition: none !important; }';
    }

    // Hide the top-left dots icon while playing
    if (PREFS.get(Preferences.HIDE_DOTS_ICON)) {
        css += `
div[class*=Grip-module__container] {
    visibility: hidden;
}

@media (hover: hover) {
    button[class*=GripHandle-module__container]:hover div[class*=Grip-module__container] {
        visibility: visible;
    }
}

button[class*=GripHandle-module__container][aria-expanded=true] div[class*=Grip-module__container] {
    visibility: visible;
}

button[class*=GripHandle-module__container][aria-expanded=false] {
    background-color: transparent !important;
}

div[class*=StreamHUD-module__buttonsContainer] {
    padding: 0px !important;
}
`;
    }

    // Hide touch controller
    if (PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER) === 'off') {
        css += `
#MultiTouchSurface, #BabylonCanvasContainer-main {
    display: none !important;
}
`;
    }

    // Simplify Stream's menu
    css += `
div[class*=StreamMenu-module__menu] {
    min-width: 100vw !important;
}
`;
    if (PREFS.get(Preferences.STREAM_SIMPLIFY_MENU)) {
        css += `
div[class*=Menu-module__scrollable] {
    --bxStreamMenuItemSize: 80px;
    --streamMenuItemSize: calc(var(--bxStreamMenuItemSize) + 40px) !important;
}

.better-xcloud-badges {
    top: calc(var(--streamMenuItemSize) - 20px);
}

body[data-media-type=tv] .better-xcloud-badges {
    top: calc(var(--streamMenuItemSize) - 10px) !important;
}

button[class*=MenuItem-module__container] {
    min-width: auto !important;
    min-height: auto !important;
    width: var(--bxStreamMenuItemSize) !important;
    height: var(--bxStreamMenuItemSize) !important;
}

div[class*=MenuItem-module__label] {
    display: none !important;
}

svg[class*=MenuItem-module__icon] {
    width: 36px;
    height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
}
`;
    } else {
        css += `
body[data-media-type=tv] .better-xcloud-badges {
    top: calc(var(--streamMenuItemSize) + 30px);
}

body:not([data-media-type=tv]) .better-xcloud-badges {
    top: calc(var(--streamMenuItemSize) + 20px);
}

body:not([data-media-type=tv]) button[class*=MenuItem-module__container] {
    min-width: auto !important;
    width: 100px !important;
}

body:not([data-media-type=tv]) button[class*=MenuItem-module__container]:nth-child(n+2) {
    margin-left: 10px !important;
}

body:not([data-media-type=tv]) div[class*=MenuItem-module__label] {
    margin-left: 8px !important;
    margin-right: 8px !important;
}
`;
    }

    const $style = createElement('style', {}, css);
    document.documentElement.appendChild($style);
}


function getPreferredServerRegion() {
    let preferredRegion = PREFS.get(Preferences.SERVER_REGION);
    if (preferredRegion in SERVER_REGIONS) {
        return preferredRegion;
    }

    for (let regionName in SERVER_REGIONS) {
        const region = SERVER_REGIONS[regionName];
        if (region.isDefault) {
            return regionName;
        }
    }

    return '???';
}


function updateIceCandidates(candidates) {
    const pattern = new RegExp(/a=candidate:(?<foundation>\d+) (?<component>\d+) UDP (?<priority>\d+) (?<ip>[^\s]+) (?<the_rest>.*)/);

    const lst = [];
    for (let item of candidates) {
        if (item.candidate == 'a=end-of-candidates') {
            continue;
        }

        const groups = pattern.exec(item.candidate).groups;
        lst.push(groups);
    }

    lst.sort((a, b) => (a.ip.includes(':') || a.ip > b.ip) ? -1 : 1);

    const newCandidates = [];
    let foundation = 1;
    lst.forEach(item => {
        item.foundation = foundation;
        item.priority = (foundation == 1) ? 100 : 1;

        newCandidates.push({
            'candidate': `a=candidate:${item.foundation} 1 UDP ${item.priority} ${item.ip} ${item.the_rest}`,
            'messageType': 'iceCandidate',
            'sdpMLineIndex': '0',
            'sdpMid': '0',
        });

        ++foundation;
    });

    newCandidates.push({
        'candidate': 'a=end-of-candidates',
        'messageType': 'iceCandidate',
        'sdpMLineIndex': '0',
        'sdpMid': '0',
    });

    return newCandidates;
}


function interceptHttpRequests() {
    var BLOCKED_URLS = [];
    if (PREFS.get(Preferences.BLOCK_TRACKING)) {
        BLOCKED_URLS = BLOCKED_URLS.concat([
            'https://arc.msn.com',
            'https://browser.events.data.microsoft.com',
            'https://dc.services.visualstudio.com',
            // 'https://2c06dea3f26c40c69b8456d319791fd0@o427368.ingest.sentry.io',
        ]);
    }

    if (PREFS.get(Preferences.BLOCK_SOCIAL_FEATURES)) {
        // Disable WebSocket
        WebSocket = {
            CLOSING: 2,
        };

        BLOCKED_URLS = BLOCKED_URLS.concat([
            'https://peoplehub.xboxlive.com/users/me',
            'https://accounts.xboxlive.com/family/memberXuid',
            'https://notificationinbox.xboxlive.com',
        ]);
    }

    const xhrPrototype = XMLHttpRequest.prototype;
    xhrPrototype.orgOpen = xhrPrototype.open;
    xhrPrototype.orgSend = xhrPrototype.send;

    xhrPrototype.open = function(method, url) {
        // Save URL to use it later in send()
        this._url = url;
        return this.orgOpen.apply(this, arguments);
    };

    xhrPrototype.send = function(...arg) {
        for (let blocked of BLOCKED_URLS) {
            if (this._url.startsWith(blocked)) {
                return false;
            }
        }

        return this.orgSend.apply(this, arguments);
    };

    const PREF_PREFER_IPV6_SERVER = PREFS.get(Preferences.PREFER_IPV6_SERVER);
    const PREF_STREAM_TARGET_RESOLUTION = PREFS.get(Preferences.STREAM_TARGET_RESOLUTION);
    const PREF_STREAM_PREFERRED_LOCALE = PREFS.get(Preferences.STREAM_PREFERRED_LOCALE);
    const PREF_USE_DESKTOP_CODEC = PREFS.get(Preferences.USE_DESKTOP_CODEC);
    const PREF_UI_LOADING_SCREEN_GAME_ART = PREFS.get(Preferences.UI_LOADING_SCREEN_GAME_ART);
    const PREF_UI_LOADING_SCREEN_WAIT_TIME = PREFS.get(Preferences.UI_LOADING_SCREEN_WAIT_TIME);

    const PREF_STREAM_TOUCH_CONTROLLER = PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER);
    const PREF_AUDIO_MIC_ON_PLAYING = PREFS.get(Preferences.AUDIO_MIC_ON_PLAYING);
    const PREF_OVERRIDE_CONFIGURATION = PREF_AUDIO_MIC_ON_PLAYING || PREF_STREAM_TOUCH_CONTROLLER === 'all';

    const orgFetch = window.fetch;
    window.fetch = async (...arg) => {
        const request = arg[0];
        const url = (typeof request === 'string') ? request : request.url;

        // Server list
        if (url.endsWith('/v2/login/user')) {
            const promise = orgFetch(...arg);

            return promise.then(response => {
                return response.clone().json().then(obj => {
                    // Get server list
                    if (!Object.keys(SERVER_REGIONS).length) {
                        for (let region of obj.offeringSettings.regions) {
                            SERVER_REGIONS[region.name] = Object.assign({}, region);
                        }

                        // Start rendering UI
                        if (!document.getElementById('gamepass-root')) {
                            setTimeout(watchHeader, 2000);
                        } else {
                            watchHeader();
                        }
                    }

                    const preferredRegion = getPreferredServerRegion();
                    if (preferredRegion in SERVER_REGIONS) {
                        const tmp = Object.assign({}, SERVER_REGIONS[preferredRegion]);
                        tmp.isDefault = true;

                        obj.offeringSettings.regions = [tmp];
                    }

                    response.json = () => Promise.resolve(obj);
                    return response;
                });
            });
        }

        // Get region
        if (url.endsWith('/sessions/cloud/play')) {
            // Setup loading screen
            PREF_UI_LOADING_SCREEN_GAME_ART && LoadingScreen.setup();

            // Start hiding cursor
            if (PREFS.get(Preferences.STREAM_HIDE_IDLE_CURSOR)) {
                MouseCursorHider.start();
                MouseCursorHider.hide();
            }

            const parsedUrl = new URL(url);
            StreamBadges.region = parsedUrl.host.split('.', 1)[0];
            for (let regionName in SERVER_REGIONS) {
                const region = SERVER_REGIONS[regionName];
                if (parsedUrl.origin == region.baseUri) {
                    StreamBadges.region = regionName;
                    break;
                }
            }

            const clone = request.clone();
            const body = await clone.json();

            // Force stream's resolution
            if (PREF_STREAM_TARGET_RESOLUTION !== 'auto') {
                const osName = (PREF_STREAM_TARGET_RESOLUTION === '720p') ? 'android' : 'windows';
                body.settings.osName = osName;
            }

            // Override "locale" value
            if (PREF_STREAM_PREFERRED_LOCALE !== 'default') {
                body.settings.locale = PREF_STREAM_PREFERRED_LOCALE;
            }

            const newRequest = new Request(request, {
                body: JSON.stringify(body),
            });

            arg[0] = newRequest;
            return orgFetch(...arg);
        }

        // Get wait time
        if (PREF_UI_LOADING_SCREEN_WAIT_TIME && url.includes('xboxlive.com') && url.includes('/waittime/')) {
            const promise = orgFetch(...arg);
            return promise.then(response => {
                return response.clone().json().then(json => {
                    if (json.estimatedAllocationTimeInSeconds > 0) {
                        // Setup wait time overlay
                        LoadingScreen.setupWaitTime(json.estimatedTotalWaitTimeInSeconds);
                    }

                    return response;
                });
            });
        }

        if (url.endsWith('/configuration') && url.includes('/sessions/cloud/') && request.method === 'GET') {
            PREF_UI_LOADING_SCREEN_GAME_ART && LoadingScreen.hide();

            const promise = orgFetch(...arg);
            if (!PREF_OVERRIDE_CONFIGURATION) {
                return promise;
            }

            // Touch controller for all games
            if (PREF_STREAM_TOUCH_CONTROLLER === 'all') {
                TouchController.disable();

                // Get game ID from window.location
                const match = window.location.pathname.match(/\/launch\/[^\/]+\/([\w\d]+)/);
                // Check touch support
                if (match) {
                    const titleId = match[1];
                    !TitlesInfo.hasTouchSupport(titleId) && TouchController.enable();
                }

                // If both settings are invalid -> return promise
                if (!PREF_AUDIO_MIC_ON_PLAYING && !TouchController.isEnabled()) {
                    return promise;
                }
            }

            // Intercept configurations
            return promise.then(response => {
                return response.clone().text().then(text => {
                    if (!text.length) {
                        return response;
                    }

                    const obj = JSON.parse(text);
                    let overrides = JSON.parse(obj.clientStreamingConfigOverrides || '{}') || {};

                    // Enable touch controller
                    if (TouchController.isEnabled()) {
                        overrides.inputConfiguration = overrides.inputConfiguration || {};
                        overrides.inputConfiguration.enableTouchInput = true;
                        overrides.inputConfiguration.maxTouchPoints = 10;
                    }

                    // Enable mic
                    if (PREF_AUDIO_MIC_ON_PLAYING) {
                        overrides.audioConfiguration = overrides.audioConfiguration || {};
                        overrides.audioConfiguration.enableMicrophone = true;
                    }

                    obj.clientStreamingConfigOverrides = JSON.stringify(overrides);

                    response.json = () => Promise.resolve(obj);
                    response.text = () => Promise.resolve(JSON.stringify(obj));

                    return response;
                });
            });
        }

        // catalog.gamepass
        if (url.startsWith('https://catalog.gamepass.com') && url.includes('/products')) {
            const promise = orgFetch(...arg);
            return promise.then(response => {
                return response.clone().json().then(json => {
                    for (let productId in json.Products) {
                        TitlesInfo.saveFromCatalogInfo(json.Products[productId]);
                    }

                    return response;
                });
            });
        }

        if (PREF_STREAM_TOUCH_CONTROLLER === 'all' && (url.endsWith('/titles') || url.endsWith('/mru'))) {
            const promise = orgFetch(...arg);
            return promise.then(response => {
                return response.clone().json().then(json => {
                    for (let game of json.results) {
                        TitlesInfo.saveFromTitleInfo(game);
                    }

                    return response;
                });
            });
        }

        // ICE server candidates
        if (PREF_PREFER_IPV6_SERVER && url.endsWith('/ice') && url.includes('/sessions/cloud/') && request.method === 'GET') {
            const promise = orgFetch(...arg);

            return promise.then(response => {
                return response.clone().text().then(text => {
                    if (!text.length) {
                        return response;
                    }

                    const obj = JSON.parse(text);
                    let exchangeResponse = JSON.parse(obj.exchangeResponse);
                    exchangeResponse = updateIceCandidates(exchangeResponse)
                    obj.exchangeResponse = JSON.stringify(exchangeResponse);

                    response.json = () => Promise.resolve(obj);
                    response.text = () => Promise.resolve(JSON.stringify(obj));

                    return response;
                });
            });
        }

        for (let blocked of BLOCKED_URLS) {
            if (!url.startsWith(blocked)) {
                continue;
            }

            return new Response('{"acc":1,"webResult":{}}', {
                status: 200,
                statusText: '200 OK',
            });
        }

        return orgFetch(...arg);
    }
}


function injectSettingsButton($parent) {
    if (!$parent) {
        return;
    }

    const CE = createElement;
    const PREF_PREFERRED_REGION = getPreferredServerRegion();
    const PREF_LATEST_VERSION = PREFS.get(Preferences.LATEST_VERSION);

    // Setup Settings button
    const $button = CE('button', {'class': 'better-xcloud-settings-button'}, PREF_PREFERRED_REGION);
    $button.addEventListener('click', e => {
        const $settings = document.querySelector('.better_xcloud_settings');
        $settings.classList.toggle('better-xcloud-gone');
        $settings.scrollIntoView();
    });

    // Show new update status
    if (PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION) {
        $button.setAttribute('data-update-available', true);
    }

    // Add Settings button to the web page
    $parent.appendChild($button);

    // Setup Settings UI
    const $container = CE('div', {
        'class': 'better_xcloud_settings better-xcloud-gone',
    });

    let $updateAvailable;
    const $wrapper = CE('div', {'class': 'better-xcloud-settings-wrapper'},
                        CE('div', {'class': 'better-xcloud-settings-title-wrapper'},
                           CE('a', {
                                'class': 'better-xcloud-settings-title',
                                'href': SCRIPT_HOME,
                                'target': '_blank',
                           }, 'Better xCloud ' + SCRIPT_VERSION),
                           $updateAvailable = CE('a', {
                                'class': 'better-xcloud-settings-update',
                                'href': 'https://github.com/redphx/better-xcloud/releases',
                                'target': '_blank',
                           })
                        )
                       );
    $container.appendChild($wrapper);

    // Show new version indicator
    if (PREF_LATEST_VERSION && PREF_LATEST_VERSION != SCRIPT_VERSION) {
        $updateAvailable.textContent = `🌟 Version ${PREF_LATEST_VERSION} available`;
        $updateAvailable.style.display = 'block';
    }

    // Render settings
    const SETTINGS_UI = {
        'Server': {
            [Preferences.SERVER_REGION]: 'Region',
            [Preferences.STREAM_PREFERRED_LOCALE]: 'Preferred game\'s language',
            [Preferences.PREFER_IPV6_SERVER]: 'Prefer IPv6 server',
        },
        'Stream': {
            [Preferences.STREAM_TARGET_RESOLUTION]: 'Target resolution',
            [Preferences.USE_DESKTOP_CODEC]: 'Force high-quality codec',
            [Preferences.DISABLE_BANDWIDTH_CHECKING]: 'Disable bandwidth checking',
            [Preferences.AUDIO_MIC_ON_PLAYING]: 'Enable microphone on game launch',
            [Preferences.STREAM_HIDE_IDLE_CURSOR]: 'Hide mouse cursor on idle',
        },
        'Touch controller': {
            [Preferences.STREAM_TOUCH_CONTROLLER]: 'Availability',
            [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: 'Standard layout\'s button style',
            [Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: 'Custom layout\'s button style',
        },
        'Loading screen': {
            [Preferences.UI_LOADING_SCREEN_GAME_ART]: 'Show game art',
            [Preferences.UI_LOADING_SCREEN_WAIT_TIME]: 'Show the estimated wait time',
            [Preferences.UI_LOADING_SCREEN_ROCKET]: 'Rocket animation',
        },
        'UI': {
            [Preferences.STREAM_SIMPLIFY_MENU]: 'Simplify Stream\'s menu',
            [Preferences.SKIP_SPLASH_VIDEO]: 'Skip Xbox splash video',
            [Preferences.HIDE_DOTS_ICON]: 'Hide System menu\'s icon',
            [Preferences.REDUCE_ANIMATIONS]: 'Reduce UI animations',
            [Preferences.SCREENSHOT_BUTTON_POSITION]: 'Screenshot button\'s position',
        },
        'Other': {
            [Preferences.BLOCK_SOCIAL_FEATURES]: 'Disable social features',
            [Preferences.BLOCK_TRACKING]: 'Disable xCloud analytics',
        },
        'Advanced': {
            [Preferences.USER_AGENT_PROFILE]: 'User-Agent profile',
        },
    };

    for (let groupLabel in SETTINGS_UI) {
        const $group = CE('span', {'class': 'better-xcloud-settings-group-label'}, groupLabel);
        $wrapper.appendChild($group);

        for (let settingId in SETTINGS_UI[groupLabel]) {
            const setting = Preferences.SETTINGS[settingId];
            const settingLabel = SETTINGS_UI[groupLabel][settingId];

            let $control, $inpCustomUserAgent;
            let labelAttrs = {};

            if (settingId === Preferences.USER_AGENT_PROFILE) {
                let defaultUserAgent = window.navigator.orgUserAgent || window.navigator.userAgent;
                $inpCustomUserAgent = CE('input', {
                    'type': 'text',
                    'placeholder': defaultUserAgent,
                    'class': 'better-xcloud-settings-custom-user-agent',
                });
                $inpCustomUserAgent.addEventListener('change', e => {
                    PREFS.set(Preferences.USER_AGENT_CUSTOM, e.target.value.trim());
                });

                $control = PREFS.toElement(Preferences.USER_AGENT_PROFILE, e => {
                    const value = e.target.value;
                    let isCustom = value === UserAgent.PROFILE_CUSTOM;
                    let userAgent = UserAgent.get(value);

                    $inpCustomUserAgent.value = userAgent;
                    $inpCustomUserAgent.readOnly = !isCustom;
                    $inpCustomUserAgent.disabled = !isCustom;
                });
            } else if (settingId === Preferences.SERVER_REGION) {
                let selectedValue;

                $control = CE('select', {id: 'xcloud_setting_' + settingId});
                $control.addEventListener('change', e => {
                    PREFS.set(settingId, e.target.value);
                });

                selectedValue = PREF_PREFERRED_REGION;
                setting.options = {};
                for (let regionName in SERVER_REGIONS) {
                    const region = SERVER_REGIONS[regionName];
                    let value = regionName;

                    let label = regionName;
                    if (region.isDefault) {
                        label += ' (Default)';
                        value = 'default';
                    }

                    setting.options[value] = label;
                }

                for (let value in setting.options) {
                    const label = setting.options[value];

                    const $option = CE('option', {value: value}, label);
                    $option.selected = value === selectedValue || label.includes(selectedValue);
                    $control.appendChild($option);
                }
            } else {
                $control = PREFS.toElement(settingId);
                labelAttrs = {'for': $control.id, 'tabindex': 0};
            }

            // Disable unsupported settings
            if (settingId === Preferences.USE_DESKTOP_CODEC && !hasHighQualityCodecSupport()) {
                $control.disabled = true;
                $control.checked = false;
                $control.title = 'Your browser doesn\'t support this feature';
            } else if (!HAS_TOUCH_SUPPORT) {
                // Disable this setting for non-touchable devices
                if ([Preferences.STREAM_TOUCH_CONTROLLER, Preferences.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD, Preferences.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM].indexOf(settingId) > -1) {
                    $control.disabled = true;
                    $control.title = 'Your device doesn\'t have touch support';
                }
            }
            $control.disabled && ($control.style.cursor = 'help');

            const $elm = CE('div', {'class': 'better-xcloud-settings-row'},
                            CE('label', labelAttrs, settingLabel),
                            $control
                           );

            $wrapper.appendChild($elm);

            // Add User-Agent input
            if (settingId === Preferences.USER_AGENT_PROFILE) {
                $wrapper.appendChild($inpCustomUserAgent);
                // Trigger 'change' event
                $control.dispatchEvent(new Event('change'));
            }
        }
    }

    // Setup Reload button
    const $reloadBtn = CE('button', {'class': 'better-xcloud-settings-reload-button', 'tabindex': 0}, 'Reload page to reflect changes');
    $reloadBtn.addEventListener('click', e => {
        window.location.reload();
        $reloadBtn.textContent = 'Reloading...';
    });
    $wrapper.appendChild($reloadBtn);

    // Show Game Pass app version
    try {
        const appVersion = document.querySelector('meta[name=gamepass-app-version]').content;
        const appDate = new Date(document.querySelector('meta[name=gamepass-app-date]').content).toISOString().substring(0, 10);
        $wrapper.appendChild(CE('div', {'class': 'better-xcloud-settings-app-version'}, `GamePass app ${appVersion} (${appDate})`));
    } catch (e) {}

    // Add Settings UI to the web page
    const $pageContent = document.getElementById('PageContent');
    $pageContent.parentNode.insertBefore($container, $pageContent);
}

function getVideoPlayerFilterStyle() {
    const filters = [];

    const clarity = PREFS.get(Preferences.VIDEO_CLARITY);
    if (clarity != 0) {
        const level = (7 - (clarity - 1) * 0.5).toFixed(1); // 5, 5.5, 6, 6.5, 7
        const matrix = `0 -1 0 -1 ${level} -1 0 -1 0`;
        document.getElementById('better-xcloud-filter-clarity-matrix').setAttributeNS(null, 'kernelMatrix', matrix);

        filters.push(`url(#better-xcloud-filter-clarity)`);
    }

    const saturation = PREFS.get(Preferences.VIDEO_SATURATION);
    if (saturation != 100) {
        filters.push(`saturate(${saturation}%)`);
    }

    const contrast = PREFS.get(Preferences.VIDEO_CONTRAST);
    if (contrast != 100) {
        filters.push(`contrast(${contrast}%)`);
    }

    const brightness = PREFS.get(Preferences.VIDEO_BRIGHTNESS);
    if (brightness != 100) {
        filters.push(`brightness(${brightness}%)`);
    }

    return filters.join(' ');
}


function updateVideoPlayerCss() {
    let $elm = document.getElementById('better-xcloud-video-css');
    if (!$elm) {
        const CE = createElement;

        $elm = CE('style', {id: 'better-xcloud-video-css'});
        document.documentElement.appendChild($elm);

        // Setup SVG filters
        const $svg = CE('svg', {
            'id': 'better-xcloud-video-filters',
            'xmlns': 'http://www.w3.org/2000/svg',
            'class': 'better-xcloud-gone',
        }, CE('defs', {'xmlns': 'http://www.w3.org/2000/svg'},
              CE('filter', {'id': 'better-xcloud-filter-clarity', 'xmlns': 'http://www.w3.org/2000/svg'},
                CE('feConvolveMatrix', {'id': 'better-xcloud-filter-clarity-matrix', 'order': '3', 'xmlns': 'http://www.w3.org/2000/svg'}))
             )
        );
        document.documentElement.appendChild($svg);
    }

    let filters = getVideoPlayerFilterStyle();
    let videoCss = '';
    if (filters) {
        videoCss += `filter: ${filters} !important;`;
    }

    const PREF_RATIO = PREFS.get(Preferences.VIDEO_RATIO);
    if (PREF_RATIO && PREF_RATIO !== '16:9') {
        if (PREF_RATIO.includes(':')) {
            videoCss += `aspect-ratio: ${PREF_RATIO.replace(':', '/')}; object-fit: unset !important;`;

            const tmp = PREF_RATIO.split(':');
            const ratio = parseFloat(tmp[0]) / parseFloat(tmp[1]);
            const maxRatio = window.innerWidth / window.innerHeight;
            if (ratio < maxRatio) {
                videoCss += 'width: fit-content !important;'
            } else {
                videoCss += 'height: fit-content !important;'
            }
        } else {
            videoCss += `object-fit: ${PREF_RATIO} !important;`;
        }
    }

    let css = '';
    if (videoCss) {
        css = `
div[data-testid="media-container"] {
    display: flex;
}

#game-stream video {
    margin: 0 auto;
    align-self: center;
    ${videoCss}
}
`;
    }

    $elm.textContent = css;
}


function checkHeader() {
    const $button = document.querySelector('.better-xcloud-settings-button');

    if (!$button) {
        const $rightHeader = document.querySelector('#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]');
        injectSettingsButton($rightHeader);
    }
}


function watchHeader() {
    const $header = document.querySelector('#PageContent header');
    if (!$header) {
        return;
    }

    let timeout;
    const observer = new MutationObserver(mutationList => {
        timeout && clearTimeout(timeout);
        timeout = setTimeout(checkHeader, 2000);
    });
    observer.observe($header, {subtree: true, childList: true});

    checkHeader();
}


function cloneStreamMenuButton($orgButton, label, svg_icon) {
    const $button = $orgButton.cloneNode(true);
    $button.setAttribute('aria-label', label);
    $button.querySelector('div[class*=label]').textContent = label;

    const $svg = $button.querySelector('svg');
    $svg.innerHTML = svg_icon;
    $svg.setAttribute('viewBox', '0 0 32 32');

    return $button;
}


function injectStreamMenuButtons() {
    const $screen = document.querySelector('#PageContent section[class*=PureScreens]');
    if (!$screen) {
        return;
    }

    if ($screen.xObserving) {
        return;
    }

    $screen.xObserving = true;

    const $quickBar = document.querySelector('.better-xcloud-quick-settings-bar');
    const $parent = $screen.parentElement;
    const hideQuickBarFunc = e => {
        e.stopPropagation();
        if (e.target != $parent && e.target.id !== 'MultiTouchSurface' && !e.target.querySelector('#BabylonCanvasContainer-main')) {
            return;
        }

        // Hide Quick settings bar
        $quickBar.style.display = 'none';

        $parent.removeEventListener('click', hideQuickBarFunc);
        $parent.removeEventListener('touchstart', hideQuickBarFunc);

        if (e.target.id === 'MultiTouchSurface') {
            e.target.removeEventListener('touchstart', hideQuickBarFunc);
        }
    }

    const observer = new MutationObserver(mutationList => {
        mutationList.forEach(item => {
            if (item.type !== 'childList') {
                return;
            }

            item.addedNodes.forEach(async node => {
                if (!node.className || !node.className.startsWith('StreamMenu')) {
                    return;
                }

                // Get the second last button
                const $orgButton = node.querySelector('div > div > button:nth-last-child(2)');
                if (!$orgButton) {
                    return;
                }

                // Create Video Settings button
                const $btnVideoSettings = cloneStreamMenuButton($orgButton, 'Video settings', ICON_VIDEO_SETTINGS);
                $btnVideoSettings.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();

                    const msVideoProcessing = $STREAM_VIDEO.msVideoProcessing;
                    if (msVideoProcessing && msVideoProcessing !== 'default') {
                        alert('This feature doesn\'t work when the Clarity Boost mode is ON');
                        return;
                    }

                    // Close HUD
                    $btnCloseHud.click();

                    // Show Quick settings bar
                    $quickBar.style.display = 'flex';

                    $parent.addEventListener('click', hideQuickBarFunc);
                    $parent.addEventListener('touchstart', hideQuickBarFunc);

                    const $touchSurface = document.getElementById('MultiTouchSurface');
                    $touchSurface && $touchSurface.style.display != 'none' && $touchSurface.addEventListener('touchstart', hideQuickBarFunc);
                });

                // Add button at the beginning
                $orgButton.parentElement.insertBefore($btnVideoSettings, $orgButton.parentElement.firstChild);

                // Hide Quick bar when closing HUD
                const $btnCloseHud = document.querySelector('button[class*=StreamMenu-module__backButton]');
                $btnCloseHud.addEventListener('click', e => {
                    $quickBar.style.display = 'none';
                });

                // Create Stream Stats button
                const $btnStreamStats = cloneStreamMenuButton($orgButton, 'Stream stats', ICON_STREAM_STATS);
                $btnStreamStats.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Close HUD
                    $btnCloseHud.click();
                    // Toggle Stream Stats
                    StreamStats.toggle();
                });

                const btnStreamStatsOn = (!StreamStats.isHidden() && !StreamStats.isGlancing());
                $btnStreamStats.classList.toggle('better-xcloud-stream-menu-button-on', btnStreamStatsOn);

                // Insert after Video Settings button
                $orgButton.parentElement.insertBefore($btnStreamStats, $btnVideoSettings);

                // Get "Quit game" button
                const $btnQuit = $orgButton.parentElement.querySelector('button:last-of-type');

                let isHolding = false;
                let holdTimeout;
                const onMouseDown = e => {
                    isHolding = false;
                    holdTimeout = setTimeout(() => {
                        isHolding = true;
                        confirm('Do you want to refresh the stream?') && window.location.reload();
                    }, 1000);
                };
                const onMouseUp = e => {
                    holdTimeout && clearTimeout(holdTimeout);

                    if (isHolding) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    isHolding = false;
                };

                $btnQuit.addEventListener('mousedown', onMouseDown);
                $btnQuit.addEventListener('click', onMouseUp);

                $btnQuit.addEventListener('touchstart', onMouseDown);
                $btnQuit.addEventListener('touchend', onMouseUp);

                // Render stream badges
                const $menu = document.querySelector('div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]');
                $menu.appendChild(await StreamBadges.render());
            });
        });
    });
    observer.observe($screen, {subtree: true, childList: true});
}


function patchVideoApi() {
    const PREF_SKIP_SPLASH_VIDEO = PREFS.get(Preferences.SKIP_SPLASH_VIDEO);
    const PREF_SCREENSHOT_BUTTON_POSITION = PREFS.get(Preferences.SCREENSHOT_BUTTON_POSITION);

    // Show video player when it's ready
    var showFunc;
    showFunc = function() {
        this.style.visibility = 'visible';
        this.removeEventListener('playing', showFunc);

        if (!this.videoWidth) {
            return;
        }

        onStreamStarted(this);
    }

    HTMLMediaElement.prototype.orgPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        LoadingScreen.reset();

        if (this.className && this.className.startsWith('XboxSplashVideo')) {
            if (PREF_SKIP_SPLASH_VIDEO) {
                this.volume = 0;
                this.style.display = 'none';
                this.dispatchEvent(new Event('ended'));

                return {
                    catch: () => {},
                };
            }

            return this.orgPlay.apply(this);
        }

        this.addEventListener('playing', showFunc);
        injectStreamMenuButtons();

        return this.orgPlay.apply(this);
    };
}


function hasHighQualityCodecSupport() {
    if (typeof HAS_HIGH_QUALITY_CODEC_SUPPORT !== 'undefined') {
        return HAS_HIGH_QUALITY_CODEC_SUPPORT;
    }

    if (typeof RTCRtpTransceiver === 'undefined' || !('setCodecPreferences' in RTCRtpTransceiver.prototype)) {
        return false;
    }

    if (!('getCapabilities' in RTCRtpReceiver)) {
        return false;
    }

    const codecs = RTCRtpReceiver.getCapabilities('video').codecs;
    for (let codec of codecs) {
        if (codec.mimeType.toLowerCase() !== 'video/h264' || !codec.sdpFmtpLine) {
            continue;
        }

        const fmtp = codec.sdpFmtpLine.toLowerCase();
        if (fmtp.includes('profile-level-id=4d')) {
            return true;
        }
    }

    return false;
}
var HAS_HIGH_QUALITY_CODEC_SUPPORT = hasHighQualityCodecSupport();


function patchRtcCodecs() {
    if (!PREFS.get(Preferences.USE_DESKTOP_CODEC) || !hasHighQualityCodecSupport()) {
        return;
    }

    RTCRtpTransceiver.prototype.orgSetCodecPreferences = RTCRtpTransceiver.prototype.setCodecPreferences;
    RTCRtpTransceiver.prototype.setCodecPreferences = function(codecs) {
        // Use the same codecs as desktop
        const newCodecs = codecs.slice();
        let pos = 0;
        newCodecs.forEach((codec, i) => {
            // Find high-quality codecs
            if (codec.sdpFmtpLine && codec.sdpFmtpLine.includes('profile-level-id=4d')) {
                // Move it to the top of the array
                newCodecs.splice(i, 1);
                newCodecs.splice(pos, 0, codec);
                ++pos;
            }
        });

        try {
            this.orgSetCodecPreferences.apply(this, [newCodecs]);
        } catch (e) {
            console.log(e);
            this.orgSetCodecPreferences.apply(this, [codecs]);
        }
    }
}


function setupVideoSettingsBar() {
    const CE = createElement;
    const isSafari = UserAgent.isSafari();
    const onChange = e => {
        updateVideoPlayerCss();
    }

    let $stretchInp;
    const $wrapper = CE('div', {'class': 'better-xcloud-quick-settings-bar'},
                        CE('div', {},
                            CE('label', {'for': 'better-xcloud-quick-setting-stretch'}, 'Video Ratio'),
                            PREFS.toElement(Preferences.VIDEO_RATIO, onChange, ':9')),
                        CE('div', {},
                            CE('label', {}, 'Clarity'),
                            PREFS.toNumberStepper(Preferences.VIDEO_CLARITY, onChange, '', isSafari)), // disable this feature in Safari
                        CE('div', {},
                            CE('label', {}, 'Saturation'),
                            PREFS.toNumberStepper(Preferences.VIDEO_SATURATION, onChange, '%')),
                        CE('div', {},
                            CE('label', {}, 'Contrast'),
                            PREFS.toNumberStepper(Preferences.VIDEO_CONTRAST, onChange, '%')),
                        CE('div', {},
                            CE('label', {}, 'Brightness'),
                            PREFS.toNumberStepper(Preferences.VIDEO_BRIGHTNESS, onChange, '%'))
                     );

    document.documentElement.appendChild($wrapper);
}


function setupScreenshotButton() {
    $SCREENSHOT_CANVAS = createElement('canvas', {'class': 'better-xcloud-screenshot-canvas'});
    document.documentElement.appendChild($SCREENSHOT_CANVAS);

    const $canvasContext = $SCREENSHOT_CANVAS.getContext('2d');

    const delay = 2000;
    const $btn = createElement('div', {'class': 'better-xcloud-screenshot-button', 'data-showing': false});

    let timeout;
    const detectDbClick = e => {
        if (!$STREAM_VIDEO) {
            timeout = null;
            $btn.style.display = 'none';
            return;
        }

        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
            $btn.setAttribute('data-capturing', 'true');

            $canvasContext.drawImage($STREAM_VIDEO, 0, 0, $SCREENSHOT_CANVAS.width, $SCREENSHOT_CANVAS.height);
            $SCREENSHOT_CANVAS.toBlob(blob => {
                // Download screenshot
                const now = +new Date;
                const $anchor = createElement('a', {
                    'download': `${GAME_TITLE_ID}-${now}.png`,
                    'href': URL.createObjectURL(blob),
                });
                $anchor.click();

                // Free screenshot from memory
                URL.revokeObjectURL($anchor.href);
                $canvasContext.clearRect(0, 0, $SCREENSHOT_CANVAS.width, $SCREENSHOT_CANVAS.height);

                // Hide button
                $btn.setAttribute('data-showing', 'false');
                setTimeout(() => {
                    if (!timeout) {
                        $btn.setAttribute('data-capturing', 'false');
                    }
                }, 100);
            }, 'image/png');

            return;
        }

        const isShowing = $btn.getAttribute('data-showing') === 'true';
        if (!isShowing) {
            // Show button
            $btn.setAttribute('data-showing', 'true');
            $btn.setAttribute('data-capturing', 'false');

            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;
                $btn.setAttribute('data-showing', 'false');
                $btn.setAttribute('data-capturing', 'false');
            }, delay);
        }
    }

    $btn.addEventListener('mousedown', detectDbClick);
    document.documentElement.appendChild($btn);

}


function patchHistoryMethod(type) {
    var orig = window.history[type];
    return function(...args) {
        const event = new Event('xcloud_popstate');
        event.arguments = args;
        window.dispatchEvent(event);

        return orig.apply(this, arguments);
    };
};


function onHistoryChanged() {
    const $settings = document.querySelector('.better_xcloud_settings');
    if ($settings) {
        $settings.classList.add('better-xcloud-gone');
    }

    const $quickBar = document.querySelector('.better-xcloud-quick-settings-bar');
    if ($quickBar) {
        $quickBar.style.display = 'none';
    }

    STREAM_WEBRTC = null;
    $STREAM_VIDEO = null;
    StreamStats.onStoppedPlaying();
    document.querySelector('.better-xcloud-screenshot-button').style = '';

    MouseCursorHider.stop();
    TouchController.reset();

    LoadingScreen.reset();

    setTimeout(checkHeader, 2000);
}


function onStreamStarted($video) {
    // Get title ID for screenshot's name
    GAME_TITLE_ID = /\/launch\/([^/]+)/.exec(window.location.pathname)[1];

    if (TouchController.isEnabled()) {
        TouchController.enableBar();
    }

    const PREF_SCREENSHOT_BUTTON_POSITION = PREFS.get(Preferences.SCREENSHOT_BUTTON_POSITION);
    const PREF_STATS_QUICK_GLANCE = PREFS.get(Preferences.STATS_QUICK_GLANCE);

    // Setup Stat's Quick Glance mode
    if (PREF_STATS_QUICK_GLANCE) {
        StreamStats.quickGlanceSetup();
        // Show stats bar
        StreamStats.start(true);
    }

    $STREAM_VIDEO = $video;
    $SCREENSHOT_CANVAS.width = $video.videoWidth;
    $SCREENSHOT_CANVAS.height = $video.videoHeight;

    StreamBadges.resolution = {width: $video.videoWidth, height: $video.videoHeight};
    StreamBadges.startTimestamp = +new Date;

    // Get battery level
    try {
        navigator.getBattery && navigator.getBattery().then(bm => {
            StreamBadges.startBatteryLevel = Math.round(bm.level * 100);
        });
    } catch(e) {}

    STREAM_WEBRTC.getStats().then(stats => {
        const allVideoCodecs = {};
        let videoCodecId;

        const allAudioCodecs = {};
        let audioCodecId;

        stats.forEach(stat => {
            if (stat.type == 'codec') {
                const mimeType = stat.mimeType.split('/');
                if (mimeType[0] === 'video') {
                    // Store all video stats
                    allVideoCodecs[stat.id] = stat;
                } else if (mimeType[0] === 'audio') {
                    // Store all audio stats
                    allAudioCodecs[stat.id] = stat;
                }
            } else if (stat.type === 'inbound-rtp' && stat.packetsReceived > 0) {
                // Get the codecId of the video/audio track currently being used
                if (stat.kind === 'video') {
                    videoCodecId = stat.codecId;
                } else if (stat.kind === 'audio') {
                    audioCodecId = stat.codecId;
                }
            }
        });

        // Get video codec from codecId
        if (videoCodecId) {
            const videoStat = allVideoCodecs[videoCodecId];
            const video = {
                codec: videoStat.mimeType.substring(6),
            };

            if (video.codec === 'H264') {
                const match = /profile-level-id=([0-9a-f]{6})/.exec(videoStat.sdpFmtpLine);
                video.profile = match ? match[1] : null;
            }

            StreamBadges.video = video;
        }

        // Get audio codec from codecId
        if (audioCodecId) {
            const audioStat = allAudioCodecs[audioCodecId];
            StreamBadges.audio = {
                codec: audioStat.mimeType.substring(6),
                bitrate: audioStat.clockRate,
            }
        }

        if (PREFS.get(Preferences.STATS_SHOW_WHEN_PLAYING)) {
            StreamStats.start();
        }
    });

    // Setup screenshot button
    if (PREF_SCREENSHOT_BUTTON_POSITION !== 'none') {
        const $btn = document.querySelector('.better-xcloud-screenshot-button');
        $btn.style.display = 'block';

        if (PREF_SCREENSHOT_BUTTON_POSITION === 'bottom-right') {
            $btn.style.right = '0';
        } else {
            $btn.style.left = '0';
        }
    }
}


function disablePwa() {
    const userAgent = (window.navigator.orgUserAgent || window.navigator.userAgent || '').toLowerCase();
    if (!userAgent) {
        return;
    }

    // Check if it's Safari on mobile
    if (UserAgent.isSafari(true)) {
        // Disable the PWA prompt
        Object.defineProperty(window.navigator, 'standalone', {
            value: true,
        });
    }
}


// Hide Settings UI when navigate to another page
window.addEventListener('xcloud_popstate', onHistoryChanged);
window.addEventListener('popstate', onHistoryChanged);
// Make pushState/replaceState methods dispatch "xcloud_popstate" event
window.history.pushState = patchHistoryMethod('pushState');
window.history.replaceState = patchHistoryMethod('replaceState');

PreloadedState.override();

// Disable bandwidth checking
if (PREFS.get(Preferences.DISABLE_BANDWIDTH_CHECKING)) {
    Object.defineProperty(window.navigator, 'connection', {
        get: () => undefined,
    });
}

// Check for Update
checkForUpdate();

// Monkey patches
RTCPeerConnection.prototype.orgAddIceCandidate = RTCPeerConnection.prototype.addIceCandidate;
RTCPeerConnection.prototype.addIceCandidate = function(...args) {
    const candidate = args[0].candidate;
    if (candidate && candidate.startsWith('a=candidate:1 ')) {
        STREAM_WEBRTC = this;
        StreamBadges.ipv6 = candidate.substring(20).includes(':');
    }

    return this.orgAddIceCandidate.apply(this, args);
}

if (PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER) === 'all') {
    TouchController.setup();
}


patchRtcCodecs();
interceptHttpRequests();
patchVideoApi();

// Setup UI
addCss();
updateVideoPlayerCss();
window.addEventListener('resize', updateVideoPlayerCss);

setupVideoSettingsBar();
setupScreenshotButton();
StreamStats.render();

disablePwa();
