// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      1.3.1
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

const SCRIPT_VERSION = '1.3.1';
const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

const SERVER_REGIONS = {};


class Preferences {
    static get SERVER_REGION() { return 'server_region'; }
    static get PREFER_IPV6_SERVER() { return 'prefer_ipv6_server'; }
    static get USE_DESKTOP_CODEC() { return 'use_desktop_codec'; }

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
            'id': Preferences.USE_DESKTOP_CODEC,
            'label': 'Force high quality stream (same as desktop)',
            'default': false,
        },

        {
            'id': Preferences.DISABLE_BANDWIDTH_CHECKING,
            'label': 'Disable bandwitdh checking',
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
            'hidden': true,
        },

        {
            'id': Preferences.VIDEO_SATURATION,
            'label': 'Video saturation (%)',
            'default': 100,
            'min': 0,
            'max': 150,
            'hidden': true,
        },

        {
            'id': Preferences.VIDEO_CONTRAST,
            'label': 'Video contrast (%)',
            'default': 100,
            'min': 0,
            'max': 150,
            'hidden': true,
        },

        {
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

@media (hover: hover) {
    .better_xcloud_settings_wrapper .setting_button:hover {
        background-color: #00753c;
    }
}

.better_xcloud_settings_wrapper .setting_button:active {
        background-color: #00753c;
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
    lst.forEach(item => {
        item.order = order;
        item.priority = (order == 1) ? 100 : 1;

        newCandidates.push({
            'candidate': `a=candidate:${item.order} 1 UDP ${item.priority} ${item.ip} ${item.the_rest}`,
            'messageType': 'iceCandidate',
            'sdpMLineIndex': '0',
            'sdpMid': '0',
        });

        ++order;
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
        } else {
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

            if (setting.id === Preferences.USE_DESKTOP_CODEC && !hasRtcSetCodecPreferencesSupport()) {
                $control.disabled = true;
                $control.checked = false;
                $control.title = 'Not supported by this browser';
            }
        }

        const $elm = CE('div', {'class': 'setting_row'},
            CE('label', {'for': 'xcloud_setting_' + setting.id}, setting.label),
            $control
        );

        $wrapper.appendChild($elm);
    }

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
    observer.observe($header, {subtree: true, childList: true});

    checkHeader();
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

                const id = 'better-xcloud-video-settings-btn';
                let $wrapper = document.getElementById('#' + id);
                if ($wrapper) {
                    return;
                }

                const $orgButton = node.querySelector('div > div > button');
                if (!$orgButton) {
                    return;
                }

                // Clone other button
                const $button = $orgButton.cloneNode(true);
                $button.setAttribute('aria-label', 'Video settings');
                $button.querySelector('div[class*=label]').textContent = 'Video settings';

                // Credit: https://www.iconfinder.com/iconsets/user-interface-outline-27
                const SVG_ICON = '<path d="M8 2c-1.293 0-2.395.843-2.812 2H3a1 1 0 1 0 0 2h2.186C5.602 7.158 6.706 8 8 8s2.395-.843 2.813-2h10.188a1 1 0 1 0 0-2H10.813C10.395 2.843 9.293 2 8 2zm0 2c.564 0 1 .436 1 1s-.436 1-1 1-1-.436-1-1 .436-1 1-1zm7 5c-1.293 0-2.395.843-2.812 2H3a1 1 0 1 0 0 2h9.186c.417 1.158 1.521 2 2.814 2s2.395-.843 2.813-2H21a1 1 0 1 0 0-2h-3.187c-.418-1.157-1.52-2-2.813-2zm0 2c.564 0 1 .436 1 1s-.436 1-1 1-1-.436-1-1 .436-1 1-1zm-7 5c-1.293 0-2.395.843-2.812 2H3a1 1 0 1 0 0 2h2.188c.417 1.157 1.519 2 2.813 2s2.398-.842 2.814-2H21a1 1 0 1 0 0-2H10.812c-.417-1.157-1.519-2-2.812-2zm0 2c.564 0 1 .436 1 1s-.436 1-1 1-1-.436-1-1 .436-1 1-1z"/>';
                const $svg = $button.querySelector('svg');
                $svg.innerHTML = SVG_ICON;
                $svg.setAttribute('viewBox', '0 0 24 24');

                $button.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Show Quick settings bar
                    $quickBar.style.display = 'flex';

                    // Close HUD
                    document.querySelector('button[class*=StreamMenu-module__backButton]').click();

                    $parent.addEventListener('click', hideQuickBarFunc);
                    $parent.addEventListener('touchend', hideQuickBarFunc);

                    const $touchSurface = document.querySelector('#MultiTouchSurface');
                    if ($touchSurface) {
                        $touchSurface.addEventListener('touchstart', hideQuickBarFunc);
                    }
                });

                $orgButton.parentElement.insertBefore($button, $orgButton.parentElement.firstChild);
            });

        });
    });
    observer.observe($screen, {subtree: true, childList: true});
}


function patchVideoApi() {
    const PREF_SKIP_SPLASH_VIDEO = PREFS.get(Preferences.SKIP_SPLASH_VIDEO);

    // Show video player when it's ready
    var showFunc;
    showFunc = function() {
        this.style.visibility = 'visible';
        this.removeEventListener('playing', showFunc);
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
        codecs = [
            {
                'clockRate': 90000,
                'mimeType': 'video/H264',
                'sdpFmtpLine': 'level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f',
            },
            {
                'clockRate': 90000,
                'mimeType': 'video/H264',
                'sdpFmtpLine': 'level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f',
            }
        ].concat(codecs);
        this.orgSetCodecPreferences(codecs);
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

// Workaround for Hermit browser
var onLoadTriggered = false;
window.onload = () => {
    onLoadTriggered = true;
};

if (document.readyState === 'complete' && !onLoadTriggered) {
    watchHeader();
}
