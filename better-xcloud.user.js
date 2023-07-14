// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      1.1.1
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

const SCRIPT_VERSION = '1.1.1';
const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

const SERVER_REGIONS = {};


class Preferences {
    static get SERVER_REGION() { return 'server_region'; }
    static get PREFER_IPV6_SERVER() { return 'prefer_ipv6_server'; }

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
        },

        {
            'id': Preferences.PREFER_IPV6_SERVER,
            'label': 'Prefer IPv6 streaming server',
            'default': false,
        },

        {
            'id': Preferences.DISABLE_BANDWIDTH_CHECKING,
            'label': 'Force HD stream',
            'default': false,
        },

        {
            'id': Preferences.SKIP_SPLASH_VIDEO,
            'label': 'Skip Xbox splash video',
            'default': false,
        },

        {
            'id': Preferences.HIDE_DOTS_ICON,
            'label': 'Hide Dots icon while playing',
            'default': false,
        },

        {
            'id': Preferences.REDUCE_ANIMATIONS,
            'label': 'Reduce UI animations',
            'default': false,
        },

        {
            'id': Preferences.BLOCK_SOCIAL_FEATURES,
            'label': 'Disable social features (Friends, Chat...)',
            'default': false,
        },

        {
            'id': Preferences.BLOCK_TRACKING,
            'label': 'Disable xCloud analytics',
            'default': false,
        },

        {
            'id': Preferences.VIDEO_FILL_FULL_SCREEN,
            'label': 'Stretch video to full screen',
            'default': false,
        },

        {
            'id': Preferences.VIDEO_SATURATION,
            'label': 'Video saturation (%)',
            'default': 100,
            'min': 0,
            'max': 200,
        },

        {
            'id': Preferences.VIDEO_CONTRAST,
            'label': 'Video contrast (%)',
            'default': 100,
            'min': 0,
            'max': 200,
        },

        {
            'id': Preferences.VIDEO_BRIGHTNESS,
            'label': 'Video brightness (%)',
            'default': 100,
            'min': 0,
            'max': 200,
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

.better_xcloud_settings_button:hover, .better_xlcoud_settings_button:focus {
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
    width: 400px;
    margin: auto;
    padding: 12px;
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
}

.better_xcloud_settings_wrapper .setting_row {
    display: flex;
    margin-bottom: 8px;
}

.better_xcloud_settings_wrapper .setting_row label {
    flex: 1;
    align-self: center;
    margin-bottom: 0;
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

.better_xcloud_settings_wrapper .setting_button:hover {
    background-color: #06743f;
}

.better_xcloud_settings_preview_screen {
    display: none;
    aspect-ratio: 20/9;
    background: #1e1e1e;
    border-radius: 8px;
    overflow: hidden;
    max-height: 180px;
    margin: 10px auto;
}

.better_xcloud_settings_preview_video {
    display: flex;
    aspect-ratio: 16/9;
    height: 100%;
    margin: auto;
}

.better_xcloud_settings_preview_video div {
    flex: 1;
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
    const pattern = new RegExp(/a=candidate:(?<order>\d+) (?<num>\d+) UDP (?<priority>\d+) (?<ip>[^\s]+) (?<the_rest>.*)/);

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
    let order = 1;
    let priority = 100;
    lst.forEach(item => {
        item.order = order;
        item.priority = priority;

        newCandidates.push({
            'candidate': `a=candidate:${item.order} 1 UDP ${item.priority} ${item.ip} ${item.the_rest}`,
            'messageType': 'iceCandidate',
            'sdpMLineIndex': '0',
            'sdpMid': '0',
        });

        ++order;
        --priority;
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

        // ICE server candidates
        if (PREF_PREFER_IPV6_SERVER && url.endsWith('/ice') && url.includes('/sessions/cloud/')) {
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
        } else {
            $elm.appendChild(arg);
        }
    }

    return $elm;
}


function generateVideoPreviewBox() {
    const $screen = createElement('div', {'class': 'better_xcloud_settings_preview_screen'});
    const $video = createElement('div', {'class': 'better_xcloud_settings_preview_video'});

    const COLOR_BARS = [
        'white',
        'yellow',
        'cyan',
        'green',
        'magenta',
        'red',
        'blue',
        'black',
    ];

    COLOR_BARS.forEach(color => {
        $video.appendChild(createElement('div', {
                style: `background-color: ${color}`,
            }));
    });

    $screen.appendChild($video);
    return $screen;
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
        let $control;

        if (setting.id === Preferences.SERVER_REGION) {
            $control = CE('select', {id: 'xcloud_setting_' + setting.id});
            $control.addEventListener('change', e => {
                PREFS.set(Preferences.SERVER_REGION, e.target.value);
            });

            for (let regionName in SERVER_REGIONS) {
                const region = SERVER_REGIONS[regionName];
                let value = regionName;

                let label = regionName;
                if (region.isDefault) {
                    label += ' (Default)';
                    value = 'default';
                }

                const $option = CE('option', {value: value}, label);
                $option.selected = regionName === preferredRegion;

                $control.appendChild($option);
            }
        } else if (typeof setting.default === 'number') {
            $control = CE('input', {
                id: 'xcloud_setting_' + setting.id,
                type: 'number',
                size: 5,
                'data-key': setting.id,
            });

            if ('min' in setting) {
                $control.setAttribute('min', setting.min);
            }

            if ('max' in setting) {
                $control.setAttribute('max', setting.max);
            }

            $control.value = PREFS.get(setting.id);
            if (setting.id.startsWith('video_')) {
                $control.addEventListener('change', e => {
                    if (!e.target.value) {
                        return;
                    }

                    PREFS.set(e.target.getAttribute('data-key'), parseInt(e.target.value));
                    updateVideoPlayerPreview();
                });
            }
        } else {
            $control = CE('input', {
                id: 'xcloud_setting_' + setting.id,
                type: 'checkbox',
                'data-key': setting.id,
            });

            $control.addEventListener('change', e => {
                PREFS.set(e.target.getAttribute('data-key'), e.target.checked);

                if (setting.id == Preferences.VIDEO_FILL_FULL_SCREEN) {
                    updateVideoPlayerPreview();
                }
            });

            setting.value = PREFS.get(setting.id);
            $control.checked = setting.value;
        }

        const $elm = CE('div', {'class': 'setting_row'},
            CE('label', {'for': 'xcloud_setting_' + setting.id}, setting.label),
            $control
        );

        $wrapper.appendChild($elm);
    }

    const $videoPreview = generateVideoPreviewBox();
    $wrapper.appendChild($videoPreview);

    const $reloadBtn = CE('button', {'class': 'setting_button'}, 'Reload page to reflect changes');
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


function updateVideoPlayerPreview() {
    const $screen = document.querySelector('.better_xcloud_settings_preview_screen');
    $screen.style.display = 'block';

    const filters = getVideoPlayerFilterStyle();
    const $video = document.querySelector('.better_xcloud_settings_preview_video');
    $video.style.filter = filters;

    if (PREFS.get(Preferences.VIDEO_FILL_FULL_SCREEN)) {
        $video.style.height = 'auto';
    } else {
        $video.style.height = '100%';
    }

    updateVideoPlayerCss();
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
    observer.observe($header, { subtree: true, childList: true});

    checkHeader();
}


function patchVideoApi() {
    const PREF_SKIP_SPLASH_VIDEO = PREFS.get(Preferences.SKIP_SPLASH_VIDEO);
    // Do nothing if the "Skip splash video" setting is off
    if (!PREF_SKIP_SPLASH_VIDEO) {
        return;
    }

    HTMLMediaElement.prototype.orgPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        if (!this.className.startsWith('XboxSplashVideo')) {
            return this.orgPlay.apply(this);
        }

        this.volume = 0;
        this.style.display = 'none';
        this.dispatchEvent(new Event('ended'));

        return {
            catch: () => {},
        };
    };
}


function patchHistoryMethod(type) {
    var orig = window.history[type];
    return function(...args) {
        const rv = orig.apply(this, arguments);

        const event = new Event('xcloud_popstate');
        event.arguments = args;
        window.dispatchEvent(event);

        return rv;
    };
};


function hideSettingsOnPageChange() {
    const $settings = document.querySelector('.better_xcloud_settings');
    if ($settings) {
        $settings.classList.add('better_xcloud_settings_gone');
    }
}


// Hide Settings UI when navigate to another page
window.addEventListener('xcloud_popstate', hideSettingsOnPageChange);
window.addEventListener('popstate', hideSettingsOnPageChange);
// Make pushState/replaceState methods dispatch "xcloud_popstate" event
window.history.pushState = patchHistoryMethod('pushState');
window.history.replaceState = patchHistoryMethod('replaceState');

// Add additional CSS
addCss();

// Clear data of window.navigator.userAgentData, force Xcloud to detect browser based on User-Agent header
Object.defineProperty(window.navigator, 'userAgentData', {});

// Disable bandwidth checking
if (PREFS.get(Preferences.DISABLE_BANDWIDTH_CHECKING)) {
    Object.defineProperty(window.navigator, 'connection', {
        get: () => undefined,
    });
}

interceptHttpRequests();

patchVideoApi();

updateVideoPlayerCss();

// Workaround for Hermit browser
var onLoadTriggered = false;
window.onload = () => {
    onLoadTriggered = true;
};

if (document.readyState === 'complete' && !onLoadTriggered) {
    watchHeader();
}
