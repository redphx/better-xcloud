import { BxEvent } from "@utils/bx-event"
import { CE } from "@utils/html"
import { t } from "@utils/translation"
import { STATES } from "@utils/global"
import { PrefKey } from "@/enums/pref-keys"
import { getPref } from "@/utils/settings-storages/global-settings-storage"

export enum StreamStat {
    PING = 'ping',
    FPS = 'fps',
    BITRATE = 'btr',
    DECODE_TIME = 'dt',
    PACKETS_LOST = 'pl',
    FRAMES_LOST = 'fl',
};

export class StreamStats {
    private static instance: StreamStats;
    public static getInstance(): StreamStats {
        if (!StreamStats.instance) {
            StreamStats.instance = new StreamStats();
        }

        return StreamStats.instance;
    }

    #timeoutId?: number | null;
    readonly #updateInterval = 1000;

    #$container: HTMLElement | undefined;
    #$fps: HTMLElement | undefined;
    #$ping: HTMLElement | undefined;
    #$dt: HTMLElement | undefined;
    #$pl: HTMLElement | undefined;
    #$fl: HTMLElement | undefined;
    #$br: HTMLElement | undefined;

    #lastVideoStat?: RTCBasicStat | null;

    #quickGlanceObserver?: MutationObserver | null;

    constructor() {
        this.#render();
    }

    start(glancing=false) {
        if (!this.isHidden() || (glancing && this.isGlancing())) {
            return;
        }

        if (this.#$container) {
            this.#$container.classList.remove('bx-gone');
            this.#$container.dataset.display = glancing ? 'glancing' : 'fixed';
        }

        this.#timeoutId = window.setTimeout(this.#update.bind(this), this.#updateInterval);
    }

    stop(glancing=false) {
        if (glancing && !this.isGlancing()) {
            return;
        }

        this.#timeoutId && clearTimeout(this.#timeoutId);
        this.#timeoutId = null;
        this.#lastVideoStat = null;

        if (this.#$container) {
            this.#$container.removeAttribute('data-display');
            this.#$container.classList.add('bx-gone');
        }
    }

    toggle() {
        if (this.isGlancing()) {
            this.#$container && (this.#$container.dataset.display = 'fixed');
        } else {
            this.isHidden() ? this.start() : this.stop();
        }
    }

    onStoppedPlaying() {
        this.stop();
        this.quickGlanceStop();
        this.hideSettingsUi();
    }

    isHidden = () => this.#$container && this.#$container.classList.contains('bx-gone');
    isGlancing = () => this.#$container && this.#$container.dataset.display === 'glancing';

    quickGlanceSetup() {
        if (!STATES.isPlaying || this.#quickGlanceObserver) {
            return;
        }

        const $uiContainer = document.querySelector('div[data-testid=ui-container]')!;
        if (!$uiContainer) {
            return;
        }

        this.#quickGlanceObserver = new MutationObserver((mutationList, observer) => {
            for (let record of mutationList) {
                if (record.attributeName && record.attributeName === 'aria-expanded') {
                    const expanded = (record.target as HTMLElement).ariaExpanded;
                    if (expanded === 'true') {
                        this.isHidden() && this.start(true);
                    } else {
                        this.stop(true);
                    }
                }
            }
        });

        this.#quickGlanceObserver.observe($uiContainer, {
            attributes: true,
            attributeFilter: ['aria-expanded'],
            subtree: true,
        });
    }

    quickGlanceStop() {
        this.#quickGlanceObserver && this.#quickGlanceObserver.disconnect();
        this.#quickGlanceObserver = null;
    }

    async #update() {
        if (this.isHidden() || !STATES.currentStream.peerConnection) {
            this.onStoppedPlaying();
            return;
        }

        this.#timeoutId = null;
        const startTime = performance.now();

        const PREF_STATS_CONDITIONAL_FORMATTING = getPref(PrefKey.STATS_CONDITIONAL_FORMATTING);

        const stats = await STATES.currentStream.peerConnection.getStats();
        let grade = '';

        stats.forEach(stat => {
            if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
                // FPS
                this.#$fps!.textContent = stat.framesPerSecond || 0;

                // Packets Lost
                const packetsLost = Math.max(0, stat.packetsLost);  // packetsLost can be negative, but we don't care about that
                const packetsReceived = stat.packetsReceived;
                const packetsLostPercentage = (packetsLost * 100 / ((packetsLost + packetsReceived) || 1)).toFixed(2);
                this.#$pl!.textContent = packetsLostPercentage === '0.00' ? packetsLost.toString() : `${packetsLost} (${packetsLostPercentage}%)`;

                // Frames dropped
                const framesDropped = stat.framesDropped;
                const framesReceived = stat.framesReceived;
                const framesDroppedPercentage = (framesDropped * 100 / ((framesDropped + framesReceived) || 1)).toFixed(2);
                this.#$fl!.textContent = framesDroppedPercentage === '0.00' ? framesDropped : `${framesDropped} (${framesDroppedPercentage}%)`;

                if (!this.#lastVideoStat) {
                    this.#lastVideoStat = stat;
                    return;
                }

                const lastStat = this.#lastVideoStat;
                // Bitrate
                const timeDiff = stat.timestamp - lastStat.timestamp;
                const bitrate = 8 * (stat.bytesReceived - lastStat.bytesReceived) / timeDiff / 1000;
                this.#$br!.textContent = `${bitrate.toFixed(2)} Mbps`;

                // Decode time
                const totalDecodeTimeDiff = stat.totalDecodeTime - lastStat.totalDecodeTime;
                const framesDecodedDiff = stat.framesDecoded - lastStat.framesDecoded;
                const currentDecodeTime = totalDecodeTimeDiff / framesDecodedDiff * 1000;

                if (isNaN(currentDecodeTime)) {
                    this.#$dt!.textContent = '??ms';
                } else {
                    this.#$dt!.textContent = `${currentDecodeTime.toFixed(2)}ms`;
                }

                if (PREF_STATS_CONDITIONAL_FORMATTING) {
                    grade = (currentDecodeTime > 12) ? 'bad' : (currentDecodeTime > 9) ? 'ok' : (currentDecodeTime > 6) ? 'good' : '';
                    this.#$dt!.dataset.grade = grade;
                }

                this.#lastVideoStat = stat;
            } else if (stat.type === 'candidate-pair' && stat.packetsReceived > 0 && stat.state === 'succeeded') {
                // Round Trip Time
                const roundTripTime = !!stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : -1;
                this.#$ping!.textContent = roundTripTime === -1 ? '???' : roundTripTime.toString();

                if (PREF_STATS_CONDITIONAL_FORMATTING) {
                    grade = (roundTripTime > 100) ? 'bad' : (roundTripTime > 75) ? 'ok' : (roundTripTime > 40) ? 'good' : '';
                    this.#$ping!.dataset.grade = grade;
                }
            }
        });

        const lapsedTime = performance.now() - startTime;
        this.#timeoutId = window.setTimeout(this.#update.bind(this), this.#updateInterval - lapsedTime);
    }

    refreshStyles() {
        const PREF_ITEMS = getPref(PrefKey.STATS_ITEMS);
        const PREF_POSITION = getPref(PrefKey.STATS_POSITION);
        const PREF_TRANSPARENT = getPref(PrefKey.STATS_TRANSPARENT);
        const PREF_OPACITY = getPref(PrefKey.STATS_OPACITY);
        const PREF_TEXT_SIZE = getPref(PrefKey.STATS_TEXT_SIZE);

        const $container = this.#$container!;
        $container.dataset.stats = '[' + PREF_ITEMS.join('][') + ']';
        $container.dataset.position = PREF_POSITION;
        $container.dataset.transparent = PREF_TRANSPARENT;
        $container.style.opacity = PREF_OPACITY + '%';
        $container.style.fontSize = PREF_TEXT_SIZE;
    }

    hideSettingsUi() {
        if (this.isGlancing() && !getPref(PrefKey.STATS_QUICK_GLANCE)) {
            this.stop();
        }
    }

    #render() {
        const stats = {
            [StreamStat.PING]: [t('stat-ping'), this.#$ping = CE('span', {}, '0')],
            [StreamStat.FPS]: [t('stat-fps'), this.#$fps = CE('span', {}, '0')],
            [StreamStat.BITRATE]: [t('stat-bitrate'), this.#$br = CE('span', {}, '0 Mbps')],
            [StreamStat.DECODE_TIME]: [t('stat-decode-time'), this.#$dt = CE('span', {}, '0ms')],
            [StreamStat.PACKETS_LOST]: [t('stat-packets-lost'), this.#$pl = CE('span', {}, '0')],
            [StreamStat.FRAMES_LOST]: [t('stat-frames-lost'), this.#$fl = CE('span', {}, '0')],
        };

        const $barFragment = document.createDocumentFragment();
        let statKey: keyof typeof stats;
        for (statKey in stats) {
            const $div = CE('div', {
                    'class': `bx-stat-${statKey}`,
                    title: stats[statKey][0]
                },
                CE('label', {}, statKey.toUpperCase()),
                stats[statKey][1],
            );

            $barFragment.appendChild($div);
        }

        this.#$container = CE('div', {'class': 'bx-stats-bar bx-gone'}, $barFragment);
        this.refreshStyles();

        document.documentElement.appendChild(this.#$container!);
    }

    static setupEvents() {
        window.addEventListener(BxEvent.STREAM_PLAYING, e => {
            const PREF_STATS_QUICK_GLANCE = getPref(PrefKey.STATS_QUICK_GLANCE);
            const PREF_STATS_SHOW_WHEN_PLAYING = getPref(PrefKey.STATS_SHOW_WHEN_PLAYING);

            const streamStats = StreamStats.getInstance();
            // Setup Stat's Quick Glance mode

            if (PREF_STATS_SHOW_WHEN_PLAYING) {
                streamStats.start();
            } else if (PREF_STATS_QUICK_GLANCE) {
                streamStats.quickGlanceSetup();
                // Show stats bar
                !PREF_STATS_SHOW_WHEN_PLAYING && streamStats.start(true);
            }
        });
    }

    static refreshStyles() {
        StreamStats.getInstance().refreshStyles();
    }
}
