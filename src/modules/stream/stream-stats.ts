import { PrefKey } from "../preferences"
import { BxEvent } from "../bx-event"
import { getPref } from "../preferences"
import { StreamBadges } from "./stream-badges"
import { CE } from "../../utils/html"
import { t } from "../translation"
import { STATES } from "../../utils/global"

export enum StreamStat {
    PING = 'ping',
    FPS = 'fps',
    BITRATE = 'btr',
    DECODE_TIME = 'dt',
    PACKETS_LOST = 'pl',
    FRAMES_LOST = 'fl',
};

export class StreamStats {
    static #interval?: number | null;
    static #updateInterval = 1000;

    static #$container: HTMLElement;
    static #$fps: HTMLElement;
    static #$ping: HTMLElement;
    static #$dt: HTMLElement;
    static #$pl: HTMLElement;
    static #$fl: HTMLElement;
    static #$br: HTMLElement;

    static #lastStat?: RTCBasicStat | null;

    static #quickGlanceObserver?: MutationObserver | null;

    static start(glancing=false) {
        if (!StreamStats.isHidden() || (glancing && StreamStats.isGlancing())) {
            return;
        }

        StreamStats.#$container.classList.remove('bx-gone');
        StreamStats.#$container.setAttribute('data-display', glancing ? 'glancing' : 'fixed');

        StreamStats.#interval = setInterval(StreamStats.update, StreamStats.#updateInterval);
    }

    static stop(glancing=false) {
        if (glancing && !StreamStats.isGlancing()) {
            return;
        }

        StreamStats.#interval && clearInterval(StreamStats.#interval);
        StreamStats.#interval = null;
        StreamStats.#lastStat = null;

        if (StreamStats.#$container) {
            StreamStats.#$container.removeAttribute('data-display');
            StreamStats.#$container.classList.add('bx-gone');
        }
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

    static isHidden = () => StreamStats.#$container && StreamStats.#$container.classList.contains('bx-gone');
    static isGlancing = () => StreamStats.#$container && StreamStats.#$container.getAttribute('data-display') === 'glancing';

    static quickGlanceSetup() {
        if (StreamStats.#quickGlanceObserver) {
            return;
        }

        const $uiContainer = document.querySelector('div[data-testid=ui-container]')!;
        StreamStats.#quickGlanceObserver = new MutationObserver((mutationList, observer) => {
            for (let record of mutationList) {
                if (record.attributeName && record.attributeName === 'aria-expanded') {
                    const expanded = (record.target as HTMLElement).ariaExpanded;
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
        if (StreamStats.isHidden() || !STATES.currentStream.peerConnection) {
            StreamStats.onStoppedPlaying();
            return;
        }

        const PREF_STATS_CONDITIONAL_FORMATTING = getPref(PrefKey.STATS_CONDITIONAL_FORMATTING);
        STATES.currentStream.peerConnection.getStats().then(stats => {
            stats.forEach(stat => {
                let grade = '';
                if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
                    // FPS
                    StreamStats.#$fps.textContent = stat.framesPerSecond || 0;

                    // Packets Lost
                    const packetsLost = stat.packetsLost;
                    const packetsReceived = stat.packetsReceived;
                    const packetsLostPercentage = (packetsLost * 100 / ((packetsLost + packetsReceived) || 1)).toFixed(2);
                    StreamStats.#$pl.textContent = packetsLostPercentage === '0.00' ? packetsLost : `${packetsLost} (${packetsLostPercentage}%)`;

                    // Frames Dropped
                    const framesDropped = stat.framesDropped;
                    const framesReceived = stat.framesReceived;
                    const framesDroppedPercentage = (framesDropped * 100 / ((framesDropped + framesReceived) || 1)).toFixed(2);
                    StreamStats.#$fl.textContent = framesDroppedPercentage === '0.00' ? framesDropped : `${framesDropped} (${framesDroppedPercentage}%)`;

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
                } else if (stat.type === 'candidate-pair' && stat.packetsReceived > 0 && stat.state === 'succeeded') {
                    // Round Trip Time
                    const roundTripTime = typeof stat.currentRoundTripTime !== 'undefined' ? stat.currentRoundTripTime * 1000 : -1;
                    StreamStats.#$ping.textContent = roundTripTime === -1 ? '???' : roundTripTime.toString();

                    if (PREF_STATS_CONDITIONAL_FORMATTING) {
                        grade = (roundTripTime > 100) ? 'bad' : (roundTripTime > 75) ? 'ok' : (roundTripTime > 40) ? 'good' : '';
                    }
                    StreamStats.#$ping.setAttribute('data-grade', grade);
                }
            });
        });
    }

    static refreshStyles() {
        const PREF_ITEMS = getPref(PrefKey.STATS_ITEMS);
        const PREF_POSITION = getPref(PrefKey.STATS_POSITION);
        const PREF_TRANSPARENT = getPref(PrefKey.STATS_TRANSPARENT);
        const PREF_OPACITY = getPref(PrefKey.STATS_OPACITY);
        const PREF_TEXT_SIZE = getPref(PrefKey.STATS_TEXT_SIZE);

        const $container = StreamStats.#$container;
        $container.setAttribute('data-stats', '[' + PREF_ITEMS.join('][') + ']');
        $container.setAttribute('data-position', PREF_POSITION);
        $container.setAttribute('data-transparent', PREF_TRANSPARENT);
        $container.style.opacity = PREF_OPACITY + '%';
        $container.style.fontSize = PREF_TEXT_SIZE;
    }

    static hideSettingsUi() {
        if (StreamStats.isGlancing() && !getPref(PrefKey.STATS_QUICK_GLANCE)) {
            StreamStats.stop();
        }
    }

    static render() {
        if (StreamStats.#$container) {
            return;
        }

        const STATS = {
            [StreamStat.PING]: [t('stat-ping'), StreamStats.#$ping = CE('span', {}, '0')],
            [StreamStat.FPS]: [t('stat-fps'), StreamStats.#$fps = CE('span', {}, '0')],
            [StreamStat.BITRATE]: [t('stat-bitrate'), StreamStats.#$br = CE('span', {}, '0 Mbps')],
            [StreamStat.DECODE_TIME]: [t('stat-decode-time'), StreamStats.#$dt = CE('span', {}, '0ms')],
            [StreamStat.PACKETS_LOST]: [t('stat-packets-lost'), StreamStats.#$pl = CE('span', {}, '0')],
            [StreamStat.FRAMES_LOST]: [t('stat-frames-lost'), StreamStats.#$fl = CE('span', {}, '0')],
        };

        const $barFragment = document.createDocumentFragment();
        let statKey: keyof typeof STATS
        for (statKey in STATS) {
            const $div = CE('div', {'class': `bx-stat-${statKey}`, title: STATS[statKey][0]}, CE('label', {}, statKey.toUpperCase()), STATS[statKey][1]);
            $barFragment.appendChild($div);
        }

        StreamStats.#$container = CE('div', {'class': 'bx-stats-bar bx-gone'}, $barFragment);
        document.documentElement.appendChild(StreamStats.#$container);

        StreamStats.refreshStyles();
    }

    static getServerStats() {
        STATES.currentStream.peerConnection && STATES.currentStream.peerConnection.getStats().then(stats => {
            const allVideoCodecs: {[index: string]: RTCBasicStat} = {};
            let videoCodecId;

            const allAudioCodecs: {[index: string]: RTCBasicStat} = {};
            let audioCodecId;

            const allCandidates: {[index: string]: string} = {};
            let candidateId;

            stats.forEach((stat: RTCBasicStat) => {
                if (stat.type === 'codec') {
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
                } else if (stat.type === 'candidate-pair' && stat.packetsReceived > 0 && stat.state === 'succeeded') {
                    candidateId = stat.remoteCandidateId;
                } else if (stat.type === 'remote-candidate') {
                    allCandidates[stat.id] = stat.address;
                }
            });

            // Get video codec from codecId
            if (videoCodecId) {
                const videoStat = allVideoCodecs[videoCodecId];
                const video: typeof StreamBadges.video = {
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

            // Get server type
            if (candidateId) {
                console.log('candidate', candidateId, allCandidates);
                StreamBadges.ipv6 = allCandidates[candidateId].includes(':');
            }

            if (getPref(PrefKey.STATS_SHOW_WHEN_PLAYING)) {
                StreamStats.start();
            }
        });
    }

    static setupEvents() {
        window.addEventListener(BxEvent.STREAM_PLAYING, e => {
            const PREF_STATS_QUICK_GLANCE = getPref(PrefKey.STATS_QUICK_GLANCE);
            const PREF_STATS_SHOW_WHEN_PLAYING = getPref(PrefKey.STATS_SHOW_WHEN_PLAYING);

            StreamStats.getServerStats();
            // Setup Stat's Quick Glance mode
            if (PREF_STATS_QUICK_GLANCE) {
                StreamStats.quickGlanceSetup();
                // Show stats bar
                !PREF_STATS_SHOW_WHEN_PLAYING && StreamStats.start(true);
            }
        });
    }
}
