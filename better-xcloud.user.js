// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      1.10
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

const SCRIPT_VERSION = '1.10';
const SCRIPT_HOME = 'https://github.com/redphx/better-xcloud';

const SERVER_REGIONS = {};
var STREAM_WEBRTC;
var $STREAM_VIDEO;
var $SCREENSHOT_CANVAS;
var GAME_TITLE_ID;

const TOUCH_SUPPORTED_GAME_IDS = new Set();
var SHOW_GENERIC_TOUCH_CONTROLLER = false;

// Credit: https://phosphoricons.com
const ICON_VIDEO_SETTINGS = '<path d="M16 9.144A6.89 6.89 0 0 0 9.144 16 6.89 6.89 0 0 0 16 22.856 6.89 6.89 0 0 0 22.856 16 6.9 6.9 0 0 0 16 9.144zm0 11.427c-2.507 0-4.571-2.064-4.571-4.571s2.064-4.571 4.571-4.571 4.571 2.064 4.571 4.571-2.064 4.571-4.571 4.571zm15.704-7.541c-.065-.326-.267-.607-.556-.771l-4.26-2.428-.017-4.802c-.001-.335-.15-.652-.405-.868-1.546-1.307-3.325-2.309-5.245-2.953-.306-.103-.641-.073-.923.085L16 3.694l-4.302-2.407c-.282-.158-.618-.189-.924-.086a16.02 16.02 0 0 0-5.239 2.964 1.14 1.14 0 0 0-.403.867L5.109 9.84.848 12.268a1.14 1.14 0 0 0-.555.771 15.22 15.22 0 0 0 0 5.936c.064.326.267.607.555.771l4.261 2.428.017 4.802c.001.335.149.652.403.868 1.546 1.307 3.326 2.309 5.245 2.953.306.103.641.073.923-.085L16 28.306l4.302 2.407a1.13 1.13 0 0 0 .558.143 1.18 1.18 0 0 0 .367-.059c1.917-.648 3.695-1.652 5.239-2.962.255-.216.402-.532.405-.866l.021-4.807 4.261-2.428a1.14 1.14 0 0 0 .555-.771 15.21 15.21 0 0 0-.003-5.931zm-2.143 4.987l-4.082 2.321a1.15 1.15 0 0 0-.429.429l-.258.438a1.13 1.13 0 0 0-.174.601l-.022 4.606a13.71 13.71 0 0 1-3.623 2.043l-4.117-2.295a1.15 1.15 0 0 0-.559-.143h-.546c-.205-.005-.407.045-.586.143l-4.119 2.3a13.74 13.74 0 0 1-3.634-2.033l-.016-4.599a1.14 1.14 0 0 0-.174-.603l-.257-.437c-.102-.182-.249-.333-.429-.437l-4.085-2.328a12.92 12.92 0 0 1 0-4.036l4.074-2.325a1.15 1.15 0 0 0 .429-.429l.258-.438a1.14 1.14 0 0 0 .175-.601l.021-4.606a13.7 13.7 0 0 1 3.625-2.043l4.11 2.295a1.14 1.14 0 0 0 .585.143h.52c.205.005.407-.045.586-.143l4.119-2.3a13.74 13.74 0 0 1 3.634 2.033l.016 4.599a1.14 1.14 0 0 0 .174.603l.257.437c.102.182.249.333.429.438l4.085 2.327a12.88 12.88 0 0 1 .007 4.041h.007z" fill-rule="nonzero"/>';
const ICON_STREAM_STATS = '<path d="M27.295 9.31C24.303 6.313 20.234 4.631 16 4.643h-.057C7.153 4.673 0 11.929 0 20.804v3.267a2.3 2.3 0 0 0 2.286 2.286h27.429A2.3 2.3 0 0 0 32 24.072v-3.429A15.9 15.9 0 0 0 27.294 9.31zm2.419 14.761H14.816l7.823-10.757a1.15 1.15 0 0 0-.925-1.817c-.366 0-.71.176-.925.471l-8.801 12.103H2.286v-3.267c0-.44.022-.874.062-1.304h3.367a1.15 1.15 0 0 0 1.143-1.143 1.15 1.15 0 0 0-1.143-1.143H2.753c1.474-5.551 6.286-9.749 12.104-10.237v3.379A1.15 1.15 0 0 0 16 11.5a1.15 1.15 0 0 0 1.143-1.143V6.975c5.797.488 10.682 4.608 12.143 10.239h-3a1.15 1.15 0 0 0-1.143 1.143 1.15 1.15 0 0 0 1.143 1.143h3.382a14.58 14.58 0 0 1 .047 1.143v3.429z" fill-rule="nonzero"/>';
const ICON_SCREENSHOT_B64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDMyIiBmaWxsPSIjZmZmIj48cGF0aCBkPSJNMjguMzA4IDUuMDM4aC00LjI2NWwtMi4wOTctMy4xNDVhMS4yMyAxLjIzIDAgMCAwLTEuMDIzLS41NDhoLTkuODQ2YTEuMjMgMS4yMyAwIDAgMC0xLjAyMy41NDhMNy45NTYgNS4wMzhIMy42OTJBMy43MSAzLjcxIDAgMCAwIDAgOC43MzF2MTcuMjMxYTMuNzEgMy43MSAwIDAgMCAzLjY5MiAzLjY5MmgyNC42MTVBMy43MSAzLjcxIDAgMCAwIDMyIDI1Ljk2MlY4LjczMWEzLjcxIDMuNzEgMCAwIDAtMy42OTItMy42OTJ6bS02Ljc2OSAxMS42OTJjMCAzLjAzOS0yLjUgNS41MzgtNS41MzggNS41MzhzLTUuNTM4LTIuNS01LjUzOC01LjUzOCAyLjUtNS41MzggNS41MzgtNS41MzggNS41MzggMi41IDUuNTM4IDUuNTM4eiIvPjwvc3ZnPgo=';


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
    static #interval;
    static #updateInterval = 1000;

    static #$container;
    static #$fps;
    static #$rtt;
    static #$dt;
    static #$pl;
    static #$fl;
    static #$br;

    static #$settings;

    static #lastStat;

    static #quickGlanceObserver;

    static start(glancing=false) {
        if (!StreamStats.isHidden() || (glancing && StreamStats.#isGlancing())) {
            return;
        }

        StreamStats.#$container.classList.remove('better-xcloud-gone');
        StreamStats.#$container.setAttribute('data-display', glancing ? 'glancing' : 'fixed');

        StreamStats.#interval = setInterval(StreamStats.update, StreamStats.#updateInterval);
    }

    static stop(glancing=false) {
        if (glancing && !StreamStats.#isGlancing()) {
            return;
        }

        clearInterval(StreamStats.#interval);
        StreamStats.#interval = null;
        StreamStats.#lastStat = null;

        StreamStats.#$container.removeAttribute('data-display');
        StreamStats.#$container.classList.add('better-xcloud-gone');
    }

    static toggle() {
        if (StreamStats.#isGlancing()) {
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
    static #isGlancing = () => StreamStats.#$container.getAttribute('data-display') === 'glancing';

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
                    StreamStats.#$rtt.textContent = `${roundTripTime}ms`;

                    if (PREF_STATS_CONDITIONAL_FORMATTING) {
                        grade = (roundTripTime > 100) ? 'bad' : (roundTripTime > 75) ? 'ok' : (roundTripTime > 40) ? 'good' : '';
                    }
                    StreamStats.#$rtt.setAttribute('data-grade', grade);
                }
            });
        });
    }

    static #refreshStyles() {
        const PREF_POSITION = PREFS.get(Preferences.STATS_POSITION);
        const PREF_TRANSPARENT = PREFS.get(Preferences.STATS_TRANSPARENT);
        const PREF_OPACITY = PREFS.get(Preferences.STATS_OPACITY);
        const PREF_TEXT_SIZE = PREFS.get(Preferences.STATS_TEXT_SIZE);

        StreamStats.#$container.setAttribute('data-position', PREF_POSITION);
        StreamStats.#$container.setAttribute('data-transparent', PREF_TRANSPARENT);
        StreamStats.#$container.style.opacity = PREF_OPACITY + '%';
        StreamStats.#$container.style.fontSize = PREF_TEXT_SIZE;
    }

    static hideSettingsUi() {
        StreamStats.#$settings.style.display = 'none';

        if (StreamStats.#isGlancing() && !PREFS.get(Preferences.STATS_QUICK_GLANCE)) {
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
        StreamStats.#$container = CE('div', {'class': 'better-xcloud-stats-bar better-xcloud-gone'},
                            CE('label', {}, 'FPS'),
                            StreamStats.#$fps = CE('span', {}, 0),
                            CE('label', {}, 'RTT'),
                            StreamStats.#$rtt = CE('span', {}, '0ms'),
                            CE('label', {}, 'DT'),
                            StreamStats.#$dt = CE('span', {}, '0ms'),
                            CE('label', {}, 'BR'),
                            StreamStats.#$br = CE('span', {}, '0 Mbps'),
                            CE('label', {}, 'PL'),
                            StreamStats.#$pl = CE('span', {}, '0 (0.00%)'),
                            CE('label', {}, 'FL'),
                            StreamStats.#$fl = CE('span', {}, '0 (0.00%)'));

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
        const $position = PREFS.toElement(Preferences.STATS_POSITION, refreshFunc);

        let $close;
        const $showStartup = PREFS.toElement(Preferences.STATS_SHOW_WHEN_PLAYING);
        const $quickGlance = PREFS.toElement(Preferences.STATS_QUICK_GLANCE, e => {
            e.target.checked ? StreamStats.quickGlanceSetup() : StreamStats.quickGlanceStop();
        });
        const $transparent = PREFS.toElement(Preferences.STATS_TRANSPARENT, refreshFunc);
        const $formatting = PREFS.toElement(Preferences.STATS_CONDITIONAL_FORMATTING, refreshFunc);
        const $opacity = PREFS.toElement(Preferences.STATS_OPACITY, refreshFunc);
        const $textSize = PREFS.toElement(Preferences.STATS_TEXT_SIZE, refreshFunc);

        StreamStats.#$settings = CE('div', {'class': 'better-xcloud-stats-settings'},
                                    CE('b', {}, 'Stream Stats Settings'),
                                    CE('div', {},
                                        CE('label', {'for': `xcloud_setting_${Preferences.STATS_SHOW_WHEN_PLAYING}`}, 'Show stats when starting the game'),
                                        $showStartup
                                      ),
                                    CE('div', {},
                                        CE('label', {'for': `xcloud_setting_${Preferences.STATS_QUICK_GLANCE}`}, 'Enable "Quick Glance" mode'),
                                        $quickGlance
                                      ),
                                    CE('div', {},
                                        CE('label', {}, 'Position'),
                                        $position
                                      ),
                                    CE('div', {},
                                        CE('label', {}, 'Text size'),
                                        $textSize
                                      ),
                                    CE('div', {},
                                        CE('label', {'for': `xcloud_setting_${Preferences.STATS_OPACITY}`}, 'Opacity (50-100%)'),
                                        $opacity
                                      ),
                                    CE('div', {},
                                        CE('label', {'for': `xcloud_setting_${Preferences.STATS_TRANSPARENT}`}, 'Transparent background'),
                                        $transparent
                                      ),
                                    CE('div', {},
                                        CE('label', {'for': `xcloud_setting_${Preferences.STATS_CONDITIONAL_FORMATTING}`}, 'Conditional formatting text color'),
                                        $formatting
                                      ),
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

    static get(profile) {
        const defaultUserAgent = window.navigator.orgUserAgent || window.navigator.userAgent;
        if (profile === UserAgent.PROFILE_CUSTOM) {
            return PREFS.get(Preferences.USER_AGENT_CUSTOM, '');
        }

        return UserAgent.#USER_AGENTS[profile] || defaultUserAgent;
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
            get: () => this._state,
            set: (state) => {
                // Override User-Agent
                const userAgent = UserAgent.spoof();
                if (userAgent) {
                    state.appContext.requestInfo.userAgent = userAgent;
                    state.appContext.requestInfo.origin = 'https://www.xbox.com';
                }

                // Get a list of touch-supported games
                if (PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER) === 'all') {
                    let titles = {};
                    try {
                        titles = state.xcloud.titles.data.titles;
                    } catch (e) {}

                    for (let id in titles) {
                        const details = titles[id].data.details;
                        // Has move than one input type -> must have touch support
                        if (details.supportedInputTypes.length > 1) {
                            TOUCH_SUPPORTED_GAME_IDS.add(details.productId);
                        }
                    }
                }
                this._state = state;
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
    static get STREAM_TOUCH_CONTROLLER() { return 'stream_touch_controller'; }
    static get STREAM_SIMPLIFY_MENU() { return 'stream_simplify_menu'; }

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
        [Preferences.STREAM_SIMPLIFY_MENU]: {
            'default': false,
        },
        [Preferences.STREAM_HIDE_IDLE_CURSOR]: {
            'default': false,
        },
        [Preferences.REDUCE_ANIMATIONS]: {
            'default': false,
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
        [Preferences.VIDEO_FILL_FULL_SCREEN]: {
            'default': false,
        },
        [Preferences.VIDEO_SATURATION]: {
            'default': 100,
            'min': 0,
            'max': 150,
        },
        [Preferences.VIDEO_CONTRAST]: {
            'default': 100,
            'min': 0,
            'max': 150,
        },
        [Preferences.VIDEO_BRIGHTNESS]: {
            'default': 100,
            'min': 0,
            'max': 150,
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

    get(key, defaultValue=null) {
        if (typeof key === 'undefined') {
            debugger;
            return;
        }

        const value = this._prefs[key];

        if (typeof value !== 'undefined' && value !== null && value !== '') {
            return value;
        }

        if (defaultValue !== null) {
            return defaultValue;
        }

        // Return default value
        return Preferences.SETTINGS[key].default;
    }

    set(key, value) {
        const config = Preferences.SETTINGS[key];
        if (config) {
            if ('min' in config) {
                value = Math.max(config.min, value);
            }

            if ('max' in config) {
                value = Math.min(config.max, value);
            }

            if ('options' in config && !(value in config.options)) {
                value = config.default;
            }
        }

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
            $control = CE('select', {id: 'xcloud_setting_' + key});
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
}


const PREFS = new Preferences();


function checkForUpdate() {
    const CHECK_INTERVAL_SECONDS = 4 * 3600; // check every 4 hours

    const currentVersion = PREFS.get(Preferences.CURRENT_VERSION, '');
    const lastCheck = PREFS.get(Preferences.LAST_UPDATE_CHECK, 0);
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
    width: 60px;
    height: 60px;
    padding: 12px;
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
    opacity: 1;
}

.better-xcloud-screenshot-button[data-capturing=true] {
    padding: 6px;
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

.better-xcloud-stats-bar[data-display=glancing]::before {
    content: '👀 ';
    vertical-align: middle;
}

.better-xcloud-stats-bar[data-position=top-left] {
    left: 0;
}

.better-xcloud-stats-bar[data-position=top-right] {
    right: 0;
}

.better-xcloud-stats-bar[data-position=top-center] {
    transform: translate(-50%, 0);
    left: 50%;
}

.better-xcloud-stats-bar[data-transparent=true] {
    background: none;
    filter: drop-shadow(1px 0 0 #000) drop-shadow(-1px 0 0 #000) drop-shadow(0 1px 0 #000) drop-shadow(0 -1px 0 #000);
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
    padding-right: 8px;
    margin-right: 8px;
    border-right: 2px solid #fff;
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

.better-xcloud-stats-bar span:last-of-type {
    border: 0;
    margin-right: 0;
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
    font-size: 20px;
    display: block;
    margin-bottom: 8px;
}

.better-xcloud-quick-settings-bar input {
    width: 24px;
    height: 24px;
}

.better-xcloud-quick-settings-bar button {
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
    const PREF_STREAM_TOUCH_CONTROLLER = PREFS.get(Preferences.STREAM_TOUCH_CONTROLLER);
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

        if (PREF_STREAM_TOUCH_CONTROLLER === 'all' && url.endsWith('/configuration') && url.includes('/sessions/cloud/') && request.method === 'GET') {
            SHOW_GENERIC_TOUCH_CONTROLLER = false;
            // Get game ID from window.location
            const match = window.location.pathname.match(/\/launch\/[^\/]+\/([\w\d]+)/);
            // Check touch support
            if (match && !TOUCH_SUPPORTED_GAME_IDS.has(match[1])) {
                SHOW_GENERIC_TOUCH_CONTROLLER = true;
            }

            const promise = orgFetch(...arg);
            if (!SHOW_GENERIC_TOUCH_CONTROLLER) {
                return promise;
            }

            // Intercept result to make xCloud show the touch controller
            return promise.then(response => {
                return response.clone().text().then(text => {
                    if (!text.length) {
                        return response;
                    }

                    const obj = JSON.parse(text);
                    let overrides = JSON.parse(obj.clientStreamingConfigOverrides || '{}') || {};
                    overrides.inputConfiguration = {
                        enableTouchInput: true,
                        maxTouchPoints: 10,
                    };
                    obj.clientStreamingConfigOverrides = JSON.stringify(overrides);

                    response.json = () => Promise.resolve(obj);
                    response.text = () => Promise.resolve(JSON.stringify(obj));

                    return response;
                });
            });
        }

        if (PREF_STREAM_TOUCH_CONTROLLER === 'all' && (url.endsWith('/titles') || url.endsWith('/mru'))) {
            const promise = orgFetch(...arg);
            return promise.then(response => {
                return response.clone().json().then(json => {
                    for (let game of json.results) {
                        if (game.details.supportedInputTypes.length > 1) {
                            TOUCH_SUPPORTED_GAME_IDS.add(game.details.productId);
                        }
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
    const PREF_PREFERRED_REGION = getPreferredServerRegion();
    const PREF_LATEST_VERSION = PREFS.get(Preferences.LATEST_VERSION, null);

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
        'Stream quality': {
            [Preferences.STREAM_TARGET_RESOLUTION]: 'Target resolution',
            [Preferences.USE_DESKTOP_CODEC]: 'Force high-quality codec',
            [Preferences.DISABLE_BANDWIDTH_CHECKING]: 'Disable bandwidth checking',
        },
        'Controller': {
            [Preferences.STREAM_TOUCH_CONTROLLER]: 'Touch controller',
            [Preferences.STREAM_HIDE_IDLE_CURSOR]: 'Hide mouse cursor on idle',
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
            } else if (settingId === Preferences.STREAM_TOUCH_CONTROLLER) {
                // Disable this setting for non-touchable devices
                if (!('ontouchstart'in window) && navigator.maxTouchPoints === 0) {
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

    // Add Settings UI to the web page
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


function injectVideoSettingsButton() {
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

                const $orgButton = node.querySelector('div > div > button');
                if (!$orgButton) {
                    return;
                }

                // Create Video Settings button
                const $btnVideoSettings = cloneStreamMenuButton($orgButton, 'Video settings', ICON_VIDEO_SETTINGS);
                $btnVideoSettings.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();

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
    const $wrapper = CE('div', {'class': 'better-xcloud-quick-settings-bar'},
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
}


function onStreamStarted($video) {
    // Get title ID for screenshot's name
    GAME_TITLE_ID = /\/launch\/([^/]+)/.exec(window.location.pathname)[1];

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
    RTCPeerConnection.prototype.orgCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
    RTCPeerConnection.prototype.createDataChannel = function() {
        const dataChannel = this.orgCreateDataChannel.apply(this, arguments);
        if (!SHOW_GENERIC_TOUCH_CONTROLLER) {
            return dataChannel;
        }

        const dispatchLayout = () => {
            // Dispatch a message to display generic touch controller
            dataChannel.dispatchEvent(new MessageEvent('message', {
                data: '{"content":"{\\"layoutId\\":\\"\\"}","target":"/streaming/touchcontrols/showlayoutv2","type":"Message"}',
                origin: 'better-xcloud',
            }));
        }

        // Fix sometimes the touch controller doesn't show at the beginning
        setTimeout(dispatchLayout, 100);

        dataChannel.addEventListener('message', msg => {
            if (msg.origin === 'better-xcloud' || typeof msg.data !== 'string') {
                return;
            }

            if (msg.data.includes('touchcontrols/showtitledefault')) {
                setTimeout(dispatchLayout, 10);
            }
        });

        return dataChannel;
    };
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

// Disable PWA prompt in Safari on iOS/iPadOS
Object.defineProperty(window.navigator, 'standalone', {
    value: true,
});
