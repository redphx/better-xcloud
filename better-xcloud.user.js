// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      1.6
// @description  Improve Xbox Cloud Gaming (xCloud) experience
// @author       redphx
// @license      MIT
// @match        https://www.xbox.com/*/play*
// @run-at       document-start
// @grant        none
// @updateURL    https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js
// @downloadURL  https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js
// ==/UserScript==
'use strict';

const SCRIPT_VERSION = '1.6';
const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

const SERVER_REGIONS = {};
var STREAM_WEBRTC;
var $STREAM_VIDEO;
var $SCREENSHOT_CANVAS;
var GAME_TITLE_ID;

class StreamBadges {
    static ipv6 = false;
    static resolution = null;
    static video = null;
    static audio = null;
    static fps = 0;
    static region = '';

    static #renderBadge(name, value, color) {
        const CE = createElement;
        const $badge = CE('div', {'class': 'better_xcloud_badge'},
                            CE('span', {'class': 'better_xcloud_badge_name'}, name),
                            CE('span', {'class': 'better_xcloud_badge_value', 'style': `background-color: ${color}`}, value));

        return $badge;
    }

    static render() {
        let video;
        if (StreamBadges.video) {
            video = StreamBadges.video.codec;
            if (StreamBadges.video.profile) {
                let profile = StreamBadges.video.profile;
                profile = profile.startsWith('4d') ? 'High' : (profile.startsWith('42') ? 'Normal' : profile);
                video += ` (${profile})`;
            }
        }

        let audio;
        if (StreamBadges.audio) {
            audio = StreamBadges.audio.codec;
            const bitrate = StreamBadges.audio.bitrate / 1000;
            audio += ` (${bitrate} kHz)`;
        }

        const BADGES = [
            ['region', StreamBadges.region, '#d7450b'],
            ['server', StreamBadges.ipv6 ? 'IPv6' : 'IPv4', '#008746'],
            video ? ['video', video, '#007c8f'] : null,
            audio ? ['audio', audio, '#007c8f'] : null,
            StreamBadges.resolution && ['resolution', `${StreamBadges.resolution.width}x${StreamBadges.resolution.height}`, '#ff3977'],
        ];

        const $wrapper = createElement('div', {'class': 'better_xcloud_badges'});
        BADGES.forEach(item => item && $wrapper.appendChild(StreamBadges.#renderBadge(...item)));

        return $wrapper;
    }
}


class StreamStats {
    static #timeout;
    static #updateInterval = 1000;

    static #$container;
    static #$fps;
    static #$rtt;
    static #$pl;
    static #$fl;
    static #$br;

    static #lastInbound;

    static start() {
        StreamStats.#$container.style.display = 'block';
        StreamStats.update();
    }

    static stop() {
        StreamStats.#$container.style.display = 'none';
        clearTimeout(StreamStats.#timeout);
        StreamStats.#timeout = null;
        StreamStats.#lastInbound = null;
    }

    static toggle() {
        StreamStats.#isHidden() ? StreamStats.start() : StreamStats.stop();
    }

    static #isHidden = () => StreamStats.#$container.style.display === 'none';

    static update() {
        if (StreamStats.#isHidden()) {
            return;
        }

        if (!STREAM_WEBRTC) {
            StreamStats.#timeout = setTimeout(StreamStats.update, StreamStats.#updateInterval);
            return;
        }

        STREAM_WEBRTC.getStats().then(stats => {
            stats.forEach(stat => {
                if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
                    // FPS
                    StreamStats.#$fps.textContent = stat.framesPerSecond || 0;

                    // Packets Loss
                    const packetsLost = stat.packetsLost;
                    const packetsReceived = stat.packetsReceived || 1;
                    StreamStats.#$pl.textContent = `${packetsLost} (${(packetsLost * 100 / packetsReceived).toFixed(2)}%)`;

                    // Frames Dropped
                    const framesDropped = stat.framesDropped;
                    const framesReceived = stat.framesReceived || 1;
                    StreamStats.#$fl.textContent = `${framesDropped} (${(framesDropped * 100 / framesReceived).toFixed(2)}%)`;

                    // Bitrate
                    if (StreamStats.#lastInbound) {
                        const timeDiff = stat.timestamp - StreamStats.#lastInbound.timestamp;
                        const bitrate = 8 * (stat.bytesReceived - StreamStats.#lastInbound.bytesReceived) / timeDiff / 1000;
                        StreamStats.#$br.textContent = `${bitrate.toFixed(2)} Mbps`;
                    }

                    StreamStats.#lastInbound = stat;
                } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                    // Round Trip Time
                    const roundTripTime = typeof stat.currentRoundTripTime !== 'undefined' ? stat.currentRoundTripTime * 1000 : '???';
                    StreamStats.#$rtt.textContent = `${roundTripTime}ms`;
                }
            });

            StreamStats.#timeout = setTimeout(StreamStats.update, StreamStats.#updateInterval);
        });
    }

    static render() {
        if (StreamStats.#$container) {
            return;
        }

        const CE = createElement;
        StreamStats.#$container = CE('div', {'class': 'better_xcloud_stats_bar'},
                            CE('label', {}, 'FPS'),
                            StreamStats.#$fps = CE('span', {}, 0),
                            CE('label', {}, 'RTT'),
                            StreamStats.#$rtt = CE('span', {}, '0ms'),
                            CE('label', {}, 'BR'),
                            StreamStats.#$br = CE('span', {}, '0 Mbps'),
                            CE('label', {}, 'PL'),
                            StreamStats.#$pl = CE('span', {}, '0 (0.00%)'),
                            CE('label', {}, 'FL'),
                            StreamStats.#$fl = CE('span', {}, '0 (0.00%)'));

        document.documentElement.appendChild(StreamStats.#$container);
    }
}


class Preferences {
    static get SERVER_REGION() { return 'server_region'; }
    static get PREFER_IPV6_SERVER() { return 'prefer_ipv6_server'; }
    static get FORCE_1080P_STREAM() { return 'force_1080p_stream'; }
    static get USE_DESKTOP_CODEC() { return 'use_desktop_codec'; }

    static get SCREENSHOT_BUTTON_POSITION() { return 'screenshot_button_position'; }
    static get BLOCK_TRACKING() { return 'block_tracking'; }
    static get BLOCK_SOCIAL_FEATURES() { return 'block_social_features'; }
    static get DISABLE_BANDWIDTH_CHECKING() { return 'disable_bandwidth_checking'; }
    static get SKIP_SPLASH_VIDEO() { return 'skip_splash_video'; }
    static get HIDE_DOTS_ICON() { return 'hide_dots_icon'; }
    static get REDUCE_ANIMATIONS() { return 'reduce_animations'; }

    static get VIDEO_FILL_FULL_SCREEN() { return 'video_fill_full_screen'; }
    static get VIDEO_BRIGHTNESS() { return 'video_brightness'; }
    static get VIDEO_CONTRAST() { return 'video_contrast'; }
    static get VIDEO_SATURATION() { return 'video_saturation'; }

    static SETTINGS = [
        {
            'id': Preferences.SERVER_REGION,
            'label': 'Region of streaming server',
            'default': 'default',
        }, {
            'id': Preferences.FORCE_1080P_STREAM,
            'label': 'Force 1080p stream',
            'default': false,
        }, {
            'id': Preferences.USE_DESKTOP_CODEC,
            'label': 'Force high quality codec (if possible)',
            'default': false,
        }, {
            'id': Preferences.PREFER_IPV6_SERVER,
            'label': 'Prefer IPv6 streaming server',
            'default': false,
        }, {
            'id': Preferences.DISABLE_BANDWIDTH_CHECKING,
            'label': 'Disable bandwidth checking',
            'default': false,
        }, {
            'id': Preferences.SCREENSHOT_BUTTON_POSITION,
            'label': 'Screenshot button\'s position',
            'default': 'bottom-left',
            'options': {
                'bottom-left': 'Bottom Left',
                'bottom-right': 'Bottom Right',
                'none': 'Disable',
            },
        }, {
            'id': Preferences.SKIP_SPLASH_VIDEO,
            'label': 'Skip Xbox splash video',
            'default': false,
        }, {
            'id': Preferences.HIDE_DOTS_ICON,
            'label': 'Hide Dots icon while playing',
            'default': false,
        }, {
            'id': Preferences.REDUCE_ANIMATIONS,
            'label': 'Reduce UI animations',
            'default': false,
        }, {
            'id': Preferences.BLOCK_SOCIAL_FEATURES,
            'label': 'Disable social features',
            'default': false,
        }, {
            'id': Preferences.BLOCK_TRACKING,
            'label': 'Disable xCloud analytics',
            'default': false,
        }, {
            'id': Preferences.VIDEO_FILL_FULL_SCREEN,
            'label': 'Stretch video to full screen',
            'default': false,
            'hidden': true,
        }, {
            'id': Preferences.VIDEO_SATURATION,
            'label': 'Video saturation (%)',
            'default': 100,
            'min': 0,
            'max': 150,
            'hidden': true,
        }, {
            'id': Preferences.VIDEO_CONTRAST,
            'label': 'Video contrast (%)',
            'default': 100,
            'min': 0,
            'max': 150,
            'hidden': true,
        }, {
            'id': Preferences.VIDEO_BRIGHTNESS,
            'label': 'Video brightness (%)',
            'default': 100,
            'min': 0,
            'max': 150,
            'hidden': true,
        },
    ]

    constructor() {
        this._storage = localStorage;
        this._key = 'better_xcloud';

        let savedPrefs = this._storage.getItem(this._key);
        if (savedPrefs == null) {
            savedPrefs = '{}';
        }
        savedPrefs = JSON.parse(savedPrefs);

        this._prefs = {};
        for (let setting of Preferences.SETTINGS) {
            if (setting.id in savedPrefs) {
                this._prefs[setting.id] = savedPrefs[setting.id];
            } else {
                this._prefs[setting.id] = setting.default;
            }
        }
    }

    get(key, defaultValue=null) {
        const value = this._prefs[key];

        if (typeof value !== 'undefined' && value !== null && value !== '') {
            return value;
        }

        if (defaultValue !== null) {
            return defaultValue;
        }

        // Get default value
        for (let setting of Preferences.SETTINGS) {
            if (setting.id == key) {
                return setting.default;
            }
        }

        return null;
    }

    set(key, value) {
        this._prefs[key] = value;
        this._update_storage();
    }

    _update_storage() {
        this._storage.setItem(this._key, JSON.stringify(this._prefs));
    }
}


const PREFS = new Preferences();


function addCss() {
    let css = `
.better_xcloud_settings_button {
    background-color: transparent;
    border: none;
    color: white;
    font-weight: bold;
    line-height: 30px;
    border-radius: 4px;
    padding: 8px;
}

.better_xcloud_settings_button:hover, .better_xcloud_settings_button:focus {
    background-color: #515863;
}

.better_xcloud_settings {
    background-color: #151515;
    user-select: none;
    color: #fff;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif
}

.better_xcloud_settings_gone {
    display: none;
}

.better_xcloud_settings_wrapper {
    width: 450px;
    margin: auto;
    padding: 12px 6px;
}

.better_xcloud_settings_wrapper *:focus {
    outline: none !important;
}

.better_xcloud_settings_wrapper a {
    font-family: Bahnschrift, Arial, Helvetica, sans-serif;
    font-size: 20px;
    text-decoration: none;
    font-weight: bold;
    display: block;
    margin-bottom: 8px;
    color: #5dc21e;
}

@media (hover: hover) {
    .better_xcloud_settings_wrapper a:hover {
        color: #83f73a;
    }
}

.better_xcloud_settings_wrapper a:focus {
    color: #83f73a;
}

.better_xcloud_settings_wrapper .setting_row {
    display: flex;
    margin-bottom: 8px;
    padding: 2px 4px;
}

.better_xcloud_settings_wrapper .setting_row label {
    flex: 1;
    align-self: center;
    margin-bottom: 0;
}

@media not (hover: hover) {
    .better_xcloud_settings_wrapper .setting_row:focus-within {
       background-color: #242424;
    }
}

.better_xcloud_settings_wrapper .setting_row input {
    align-self: center;
}

.better_xcloud_settings_wrapper .setting_button {
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
    .better_xcloud_settings_wrapper .setting_button:hover {
        background-color: #00753c;
    }
}

.better_xcloud_settings_wrapper .setting_button:focus {
    background-color: #00753c;
}

.better_xcloud_settings_wrapper .setting_button:active {
    background-color: #00753c;
}

div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module] {
    overflow: visible;
}

.better_xcloud_badges {
    position: absolute;
    top: 155px;
    margin-left: 0px;
    user-select: none;
}

.better_xcloud_badge {
    border: none;
    display: inline-block;
    line-height: 24px;
    color: #fff;
    font-family: Bahnschrift Semibold, Arial, Helvetica, sans-serif;
    font-weight: 400;
    margin: 0 8px 8px 0;
    box-shadow: 0px 0px 6px #000;
    border-radius: 4px;
}

.better_xcloud_badge .better_xcloud_badge_name {
    background-color: #2d3036;
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px 0 0 4px;
    text-transform: uppercase;
}

.better_xcloud_badge .better_xcloud_badge_value {
    background-color: grey;
    display: inline-block;
    padding: 2px 8px;
    border-radius: 0 4px 4px 0;
}

.better_xcloud_screenshot_button {
    display: none;
    opacity: 0;
    position: fixed;
    bottom: 0;
    width: 60px;
    height: 60px;
    padding: 5px;
    background-size: cover;
    background-repeat: no-repeat;
    background-origin: content-box;
    filter: drop-shadow(0 0 2px #000000B0);
    transition: opacity 0.1s ease-in-out 0s, padding 0.1s ease-in 0s;
    z-index: 8888;

    /* Credit: https://www.iconfinder.com/iconsets/user-interface-outline-27 */
    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjQiIHdpZHRoPSIyNCIgeG1sbnM6dj0iaHR0cHM6Ly92ZWN0YS5pby9uYW5vIiBmaWxsPSIjZmZmIj48cGF0aCBkPSJNMTIgN2E1LjAyIDUuMDIgMCAwIDAtNSA1IDUuMDIgNS4wMiAwIDAgMCA1IDUgNS4wMiA1LjAyIDAgMCAwIDUtNSA1LjAyIDUuMDIgMCAwIDAtNS01em0wIDJjMS42NjkgMCAzIDEuMzMxIDMgM3MtMS4zMzEgMy0zIDMtMy0xLjMzMS0zLTMgMS4zMzEtMyAzLTN6TTYgMkMzLjgwMSAyIDIgMy44MDEgMiA2djJhMSAxIDAgMSAwIDIgMFY2YTEuOTcgMS45NyAwIDAgMSAyLTJoMmExIDEgMCAxIDAgMC0yek0zIDE1YTEgMSAwIDAgMC0xIDF2MmMwIDIuMTk5IDEuODAxIDQgNCA0aDJhMSAxIDAgMSAwIDAtMkg2YTEuOTcgMS45NyAwIDAgMS0yLTJ2LTJhMSAxIDAgMCAwLTEtMXptMTggMGExIDEgMCAwIDAtMSAxdjJhMS45NyAxLjk3IDAgMCAxLTIgMmgtMmExIDEgMCAxIDAgMCAyaDJjMi4xOTkgMCA0LTEuODAxIDQtNHYtMmExIDEgMCAwIDAtMS0xeiIvPjxwYXRoIGQ9Ik0xNiAyYTEgMSAwIDEgMCAwIDJoMmExLjk3IDEuOTcgMCAwIDEgMiAydjJhMSAxIDAgMSAwIDIgMFY2YzAtMi4xOTktMS44MDEtNC00LTR6Ii8+PC9zdmc+Cg==);
}

.better_xcloud_screenshot_button[data-showing=true] {
    opacity: 1;
}

.better_xcloud_screenshot_button[data-capturing=true] {
    padding: 0px;
}

.better_xcloud_screenshot_canvas {
    display: none;
}

.better_xcloud_stats_bar {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    opacity: 0.8;
    background-color: #000;
    color: #fff;
    font-family: Consolas, "Courier New", Courier, monospace;
    font-size: 0.9rem;
    padding-left: 8px;
    z-index: 1000;
}

.better_xcloud_stats_bar label {
    font-weight: bold;
    margin: 0 8px 0 0;
    font-size: 0.9rem;
}

.better_xcloud_stats_bar span {
    min-width: 60px;
    display: inline-block;
    text-align: right;
    padding-right: 8px;
    margin-right: 8px;
    border-right: 2px solid #fff;
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

#game-stream video {
    visibility: hidden;
}

/* Adjust Stream menu icon's size */
button[class*=MenuItem-module__container] {
    min-width: auto !important;
    width: 110px !important;
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
    const PREF_FORCE_1080P_STREAM = PREFS.get(Preferences.FORCE_1080P_STREAM);
    const PREF_USE_DESKTOP_CODEC = PREFS.get(Preferences.USE_DESKTOP_CODEC);

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
            const parsedUrl = new URL(url);

            StreamBadges.region = parsedUrl.host.split('.', 1)[0];
            for (let regionName in SERVER_REGIONS) {
                const region = SERVER_REGIONS[regionName];
                if (parsedUrl.origin == region.baseUri) {
                    StreamBadges.region = regionName;
                    break;
                }
            }

            // Force 1080p stream
            if (PREF_FORCE_1080P_STREAM) {
                // Intercept "osName" value
                const clone = request.clone();
                const body = await clone.json();
                body.settings.osName = 'windows';

                const newRequest = new Request(request, {
                    body: JSON.stringify(body),
                });

                arg[0] = newRequest;
            }

            return orgFetch(...arg);
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


// Quickly create a tree of elements without having to use innerHTML
function createElement(elmName, props = {}) {
    const $elm = document.createElement(elmName);
    for (let key in props) {
        if (!props.hasOwnProperty(key) || $elm.hasOwnProperty(key)) {
            continue;
        }

        let value = props[key];
        $elm.setAttribute(key, value);
    }

    for (let i = 2, size = arguments.length; i < size; i++) {
        const arg = arguments[i];
        const argType = typeof arg;

        if (argType == 'string' || argType == 'number') {
            $elm.innerText = arg;
        } else if (arg) {
            $elm.appendChild(arg);
        }
    }

    return $elm;
}


function injectSettingsButton($parent) {
    if (!$parent) {
        return;
    }

    const CE = createElement;
    const preferredRegion = getPreferredServerRegion();

    const $button = CE('button', {'class': 'better_xcloud_settings_button'}, preferredRegion);
    $button.addEventListener('click', e => {
        const $settings = document.querySelector('.better_xcloud_settings');
        $settings.classList.toggle('better_xcloud_settings_gone');
        $settings.scrollIntoView();
    });
    $parent.appendChild($button);

    const $container = CE('div', {
        'class': 'better_xcloud_settings better_xcloud_settings_gone',
    });

    const $wrapper = CE('div', {
        'class': 'better_xcloud_settings_wrapper',
    });
    $container.appendChild($wrapper);

    const $title = CE('a', {
            href: SCRIPT_HOME,
            target: '_blank',
        }, 'Better xCloud ' + SCRIPT_VERSION);
    $wrapper.appendChild($title);

    for (let setting of Preferences.SETTINGS) {
        if (setting.hidden) {
            continue;
        }

        let $control;
        let labelAttrs = {};
        if (setting.id === Preferences.SERVER_REGION || setting.options) {
            let selectedValue;

            $control = CE('select', {id: 'xcloud_setting_' + setting.id});
            $control.addEventListener('change', e => {
                PREFS.set(setting.id, e.target.value);
            });

            if (setting.id === Preferences.SERVER_REGION) {
                selectedValue = preferredRegion;
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
            } else {
                selectedValue = PREFS.get(setting.id);
            }

            for (let value in setting.options) {
                const label = setting.options[value];

                const $option = CE('option', {value: value}, label);
                $option.selected = value === selectedValue || label.includes(selectedValue);
                $control.appendChild($option);
            }

        } else {
            $control = CE('input', {
                id: 'xcloud_setting_' + setting.id,
                type: 'checkbox',
                'data-key': setting.id,
            });

            $control.addEventListener('change', e => {
                PREFS.set(e.target.getAttribute('data-key'), e.target.checked);
            });

            setting.value = PREFS.get(setting.id);
            $control.checked = setting.value;

            labelAttrs = {'for': 'xcloud_setting_' + setting.id, 'tabindex': 0};

            if (setting.id === Preferences.USE_DESKTOP_CODEC && !hasRtcSetCodecPreferencesSupport()) {
                $control.checked = false;
                $control.disabled = true;
                $control.title = 'Your browser doesn\'t support this feature';
                $control.style.cursor = 'help';
            }
        }

        const $elm = CE('div', {'class': 'setting_row'},
            CE('label', labelAttrs, setting.label),
            $control
        );

        $wrapper.appendChild($elm);
    }

    const $reloadBtn = CE('button', {'class': 'setting_button', 'tabindex': 0}, 'Reload page to reflect changes');
    $reloadBtn.addEventListener('click', e => window.location.reload());
    $wrapper.appendChild($reloadBtn);

    const $pageContent = document.getElementById('PageContent');
    $pageContent.parentNode.insertBefore($container, $pageContent);
}

function getVideoPlayerFilterStyle() {
    const filters = [];

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
        $elm = createElement('style', {id: 'better-xcloud-video-css'});
        document.documentElement.appendChild($elm);
    }

    let filters = getVideoPlayerFilterStyle();
    let css = '';
    if (filters) {
        css += `filter: ${filters} !important;`;
    }

    if (PREFS.get(Preferences.VIDEO_FILL_FULL_SCREEN)) {
        css += 'object-fit: fill !important;';
    }

    if (css) {
        css = `#game-stream video {${css}}`;
    }

    $elm.textContent = css;
}


function checkHeader() {
    const $button = document.querySelector('#PageContent header .better_xcloud_settings_button');

    if (!$button) {
        const $rightHeader = document.querySelector('#PageContent header div[class*=EdgewaterHeader-module__rightSectionSpacing]');
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
        if (timeout) {
            clearTimeout(timeout);
        }

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
    $svg.setAttribute('viewBox', '0 0 24 24');

    return $button;
}


function injectVideoSettingsButton() {
    const $screen = document.querySelector('#PageContent section[class*=PureScreens]');
    if (!$screen) {
        return;
    }

    if ($screen.xObserving) {
        return;
    }

    $screen.xObserving = true;

    const $quickBar = document.querySelector('.better_xcloud_quick_settings_bar');
    const $parent = $screen.parentElement;
    const hideQuickBarFunc = e => {
        if (e.target != $parent && e.target.id !== 'MultiTouchSurface') {
            return;
        }

        // Hide Quick settings bar
        $quickBar.style.display = 'none';

        $parent.removeEventListener('click', hideQuickBarFunc);
        $parent.removeEventListener('touchend', hideQuickBarFunc);

        if (e.target.id === 'MultiTouchSurface') {
            e.target.removeEventListener('touchstart', hideQuickBarFunc);
        }
    }

    const observer = new MutationObserver(mutationList => {
        mutationList.forEach(item => {
            if (item.type !== 'childList') {
                return;
            }

            item.addedNodes.forEach(node => {
                if (!node.className || !node.className.startsWith('StreamMenu')) {
                    return;
                }

                const $orgButton = node.querySelector('div > div > button');
                if (!$orgButton) {
                    return;
                }

                // Credit: https://www.iconfinder.com/iconsets/user-interface-outline-27
                const ICON_VIDEO_SETTINGS = '<path d="M8 2c-1.293 0-2.395.843-2.812 2H3a1 1 0 1 0 0 2h2.186C5.602 7.158 6.706 8 8 8s2.395-.843 2.813-2h10.188a1 1 0 1 0 0-2H10.813C10.395 2.843 9.293 2 8 2zm0 2c.564 0 1 .436 1 1s-.436 1-1 1-1-.436-1-1 .436-1 1-1zm7 5c-1.293 0-2.395.843-2.812 2H3a1 1 0 1 0 0 2h9.186c.417 1.158 1.521 2 2.814 2s2.395-.843 2.813-2H21a1 1 0 1 0 0-2h-3.187c-.418-1.157-1.52-2-2.813-2zm0 2c.564 0 1 .436 1 1s-.436 1-1 1-1-.436-1-1 .436-1 1-1zm-7 5c-1.293 0-2.395.843-2.812 2H3a1 1 0 1 0 0 2h2.188c.417 1.157 1.519 2 2.813 2s2.398-.842 2.814-2H21a1 1 0 1 0 0-2H10.812c-.417-1.157-1.519-2-2.812-2zm0 2c.564 0 1 .436 1 1s-.436 1-1 1-1-.436-1-1 .436-1 1-1z"/>';
                // Create Video Settings button
                const $btnVideoSettings = cloneStreamMenuButton($orgButton, 'Video settings', ICON_VIDEO_SETTINGS);
                $btnVideoSettings.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Show Quick settings bar
                    $quickBar.style.display = 'flex';

                    $parent.addEventListener('click', hideQuickBarFunc);
                    $parent.addEventListener('touchend', hideQuickBarFunc);

                    const $touchSurface = document.querySelector('#MultiTouchSurface');
                    $touchSurface && $touchSurface.addEventListener('touchstart', hideQuickBarFunc);
                });

                // Add button at the beginning
                $orgButton.parentElement.insertBefore($btnVideoSettings, $orgButton.parentElement.firstChild);

                // Hide Quick bar when closing HUD
                const $btnCloseHud = document.querySelector('button[class*=StreamMenu-module__backButton]');
                $btnCloseHud.addEventListener('click', e => {
                    $quickBar.style.display = 'none';
                });

                const ICON_STREAM_STATS = '<path d="M12.005 5C9.184 5 6.749 6.416 5.009 7.903c-.87.743-1.571 1.51-2.074 2.18-.251.335-.452.644-.605.934-.434.733-.389 1.314-.004 1.98a6.98 6.98 0 0 0 .609.949 13.62 13.62 0 0 0 2.076 2.182C6.753 17.606 9.188 19 12.005 19s5.252-1.394 6.994-2.873a13.62 13.62 0 0 0 2.076-2.182 6.98 6.98 0 0 0 .609-.949c.425-.737.364-1.343-.004-1.98-.154-.29-.354-.599-.605-.934-.503-.669-1.204-1.436-2.074-2.18C17.261 6.416 14.826 5 12.005 5zm0 2c2.135 0 4.189 1.135 5.697 2.424.754.644 1.368 1.32 1.773 1.859.203.27.354.509.351.733s-.151.462-.353.732c-.404.541-1.016 1.214-1.77 1.854C16.198 15.881 14.145 17 12.005 17s-4.193-1.12-5.699-2.398a11.8 11.8 0 0 1-1.77-1.854c-.202-.27-.351-.508-.353-.732s.149-.463.351-.733c.406-.54 1.019-1.215 1.773-1.859C7.816 8.135 9.87 7 12.005 7zm.025 1.975c-1.645 0-3 1.355-3 3s1.355 3 3 3 3-1.355 3-3-1.355-3-3-3zm0 2c.564 0 1 .436 1 1s-.436 1-1 1-1-.436-1-1 .436-1 1-1z"/>';
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

                // Insert after Video Settings button
                $orgButton.parentElement.insertBefore($btnStreamStats, $btnVideoSettings.nextSibling);

                // Render stream badges
                const $menu = document.querySelector('div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]');
                $menu.appendChild(StreamBadges.render());
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

        $STREAM_VIDEO = this;
        $SCREENSHOT_CANVAS.width = this.videoWidth;
        $SCREENSHOT_CANVAS.height = this.videoHeight;
        StreamBadges.resolution = {width: this.videoWidth, height: this.videoHeight};

        const stats = STREAM_WEBRTC.getStats().then(stats => {
            stats.forEach(stat => {
                if (stat.type !== 'codec') {
                    return;
                }

                const mimeType = stat.mimeType.split('/');
                if (mimeType[0] === 'video') {
                    const video = {
                        codec: mimeType[1],
                    };

                    if (video.codec === 'H264') {
                        const match = /profile-level-id=([0-9a-f]{6})/.exec(stat.sdpFmtpLine);
                        video.profile = match ? match[1] : null;
                    }

                    StreamBadges.video = video;
                } else if (!StreamBadges.audio && mimeType[0] === 'audio') {
                    StreamBadges.audio = {
                        codec: mimeType[1],
                        bitrate: stat.clockRate,
                    };
                }
            });
        });

        if (PREF_SCREENSHOT_BUTTON_POSITION !== 'none') {
            const $btn = document.querySelector('.better_xcloud_screenshot_button');
            $btn.style.display = 'block';

            if (PREF_SCREENSHOT_BUTTON_POSITION === 'bottom-right') {
                $btn.style.right = '0';
            } else {
                $btn.style.left = '0';
            }
        }

        GAME_TITLE_ID = /\/launch\/([^/]+)/.exec(window.location.pathname)[1];
    }

    HTMLMediaElement.prototype.orgPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        if (PREF_SKIP_SPLASH_VIDEO && this.className.startsWith('XboxSplashVideo')) {
            this.volume = 0;
            this.style.display = 'none';
            this.dispatchEvent(new Event('ended'));

            return {
                catch: () => {},
            };
        }

        this.addEventListener('playing', showFunc);
        injectVideoSettingsButton();

        return this.orgPlay.apply(this);
    };
}


function hasRtcSetCodecPreferencesSupport() {
    return (typeof RTCRtpTransceiver !== 'undefined' && 'setCodecPreferences' in RTCRtpTransceiver.prototype)
}

function patchRtcCodecs() {
    if (!PREFS.get(Preferences.USE_DESKTOP_CODEC)) {
        return;
    }

    if (!hasRtcSetCodecPreferencesSupport()) {
        console.log('[Better xCloud] RTCRtpTransceiver.setCodecPreferences() is not supported');
        return;
    }

    RTCRtpTransceiver.prototype.orgSetCodecPreferences = RTCRtpTransceiver.prototype.setCodecPreferences;
    RTCRtpTransceiver.prototype.setCodecPreferences = function(codecs) {
        // Use the same codecs as desktop
        const newCodecs = codecs.slice();
        let pos = 0;
        newCodecs.forEach((codec, i) => {
            // Find high quality codecs
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


function numberPicker(key) {
    let value = PREFS.get(key);
    let $text, $decBtn, $incBtn;

    const MIN = 0;
    const MAX= 150;

    const CE = createElement;
    const $wrapper = CE('div', {},
                        $decBtn = CE('button', {'data-type': 'dec'}, '-'),
                        $text = CE('span', {}, value + '%'),
                        $incBtn = CE('button', {'data-type': 'inc'}, '+'),
                    );

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
            value = (value <= MIN) ? MIN : value - 1;
        } else {
            value = (value >= MAX) ? MAX : value + 1;
        }

        $text.textContent = value + '%';
        PREFS.set(key, value);
        updateVideoPlayerCss();

        isHolding = false;
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

function setupVideoSettingsBar() {
    const CE = createElement;

    let $stretchInp;
    const $wrapper = CE('div', {'class': 'better_xcloud_quick_settings_bar'},
                        CE('div', {},
                            CE('label', {'for': 'better-xcloud-quick-setting-stretch'}, 'Stretch Video'),
                            $stretchInp = CE('input', {'id': 'better-xcloud-quick-setting-stretch', 'type': 'checkbox'})),
                        CE('div', {},
                            CE('label', {}, 'Saturation'),
                            numberPicker(Preferences.VIDEO_SATURATION)),
                        CE('div', {},
                            CE('label', {}, 'Contrast'),
                            numberPicker(Preferences.VIDEO_CONTRAST)),
                        CE('div', {},
                            CE('label', {}, 'Brightness'),
                            numberPicker(Preferences.VIDEO_BRIGHTNESS))
                     );

    $stretchInp.checked = PREFS.get(Preferences.VIDEO_FILL_FULL_SCREEN);
    $stretchInp.addEventListener('change', e => {
        PREFS.set(Preferences.VIDEO_FILL_FULL_SCREEN, e.target.checked);
        updateVideoPlayerCss();
    });

    const $style = CE('style', {}, `
.better_xcloud_quick_settings_bar {
    display: none;
    user-select: none;
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translate(-50%, 0);
    z-index: 9999;
    padding: 20px;
    width: 620px;
    background: #1a1b1e;
    color: #fff;
    border-radius: 8px;
    font-weight: 400;
    font-size: 16px;
    font-family: Bahnschrift, Arial, Helvetica, sans-serif;
    text-align: center;
}

.better_xcloud_quick_settings_bar *:focus {
    outline: none !important;
}

.better_xcloud_quick_settings_bar > div {
    flex: 1;
}

.better_xcloud_quick_settings_bar label {
    font-size: 20px;
    display: block;
    margin-bottom: 8px;
}

.better_xcloud_quick_settings_bar input {
    width: 24px;
    height: 24px;
}

.better_xcloud_quick_settings_bar button {
    border: none;
    width: 24px;
    height: 24px;
    margin: 0 8px;
    line-height: 24px;
    background-color: #515151;
    color: #fff;
    border-radius: 4px;
}

@media (hover: hover) {
    .better_xcloud_quick_settings_bar button:hover {
        background-color: #414141;
        color: white;
    }
}

.better_xcloud_quick_settings_bar button:active {
        background-color: #414141;
        color: white;
    }

.better_xcloud_quick_settings_bar span {
    display: inline-block;
    width: 40px;
    font-weight: bold;
    font-family: Consolas, "Courier New", Courier, monospace;
}
`);

    document.documentElement.appendChild($wrapper);
    document.documentElement.appendChild($style);
}


function setupScreenshotButton() {
    $SCREENSHOT_CANVAS = createElement('canvas', {'class': 'better_xcloud_screenshot_canvas'});
    document.documentElement.appendChild($SCREENSHOT_CANVAS);

    const $canvasContext = $SCREENSHOT_CANVAS.getContext('2d');

    const delay = 2000;
    const $btn = createElement('div', {'class': 'better_xcloud_screenshot_button', 'data-showing': false});

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


function hideUiOnPageChange() {
    const $settings = document.querySelector('.better_xcloud_settings');
    if ($settings) {
        $settings.classList.add('better_xcloud_settings_gone');
    }

    const $quickBar = document.querySelector('.better_xcloud_quick_settings_bar');
    if ($quickBar) {
        $quickBar.style.display = 'none';
    }

    STREAM_WEBRTC = null;
    $STREAM_VIDEO = null;
    StreamStats.stop();
    document.querySelector('.better_xcloud_screenshot_button').style = '';
}


// Hide Settings UI when navigate to another page
window.addEventListener('xcloud_popstate', hideUiOnPageChange);
window.addEventListener('popstate', hideUiOnPageChange);
// Make pushState/replaceState methods dispatch "xcloud_popstate" event
window.history.pushState = patchHistoryMethod('pushState');
window.history.replaceState = patchHistoryMethod('replaceState');

// Clear data of window.navigator.userAgentData, force Xcloud to detect browser based on User-Agent header
Object.defineProperty(window.navigator, 'userAgentData', {});

// Disable bandwidth checking
if (PREFS.get(Preferences.DISABLE_BANDWIDTH_CHECKING)) {
    Object.defineProperty(window.navigator, 'connection', {
        get: () => undefined,
    });
}

patchRtcCodecs();
interceptHttpRequests();
patchVideoApi();

// Setup UI
addCss();
updateVideoPlayerCss();
setupVideoSettingsBar();
setupScreenshotButton();
StreamStats.render();

// Workaround for Hermit browser
var onLoadTriggered = false;
window.onload = () => {
    onLoadTriggered = true;
};

if (document.readyState === 'complete' && !onLoadTriggered) {
    watchHeader();
}

RTCPeerConnection.prototype.orgAddIceCandidate = RTCPeerConnection.prototype.addIceCandidate;
RTCPeerConnection.prototype.addIceCandidate = function(...args) {
    const candidate = args[0].candidate;
    if (candidate && candidate.startsWith('a=candidate:1 ')) {
        StreamBadges.ipv6 = candidate.substring(20).includes(':');
    }

    STREAM_WEBRTC = this;
    return this.orgAddIceCandidate.apply(this, args);
}
