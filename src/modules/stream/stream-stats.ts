import { CE } from "@utils/html"
import { t } from "@utils/translation"
import { STATES } from "@utils/global"
import { StreamPref } from "@/enums/pref-keys"
import { StreamStatsCollector } from "@/utils/stream-stats-collector"
import { BxLogger } from "@/utils/bx-logger"
import { StreamStat } from "@/enums/pref-values"
import { BxEventBus } from "@/utils/bx-event-bus"
import { getStreamPref } from "@/utils/pref-utils";


export class StreamStats {
    private static instance: StreamStats;
    public static getInstance = () => StreamStats.instance ?? (StreamStats.instance = new StreamStats());
    private readonly LOG_TAG = 'StreamStats';

    private isRunning = false;
    private intervalId?: number | null;
    private isUpdating = false;
    private readonly REFRESH_INTERVAL = 1 * 1000;

    private getInterval() {
        return document.hidden ? StreamStatsCollector.INTERVAL_BACKGROUND : this.REFRESH_INTERVAL;
    }

    private onVisibilityChanged = () => {
        if (!this.isRunning) return;
        this.intervalId && clearTimeout(this.intervalId);
        this.intervalId = null;
        this.update();
    };

    private stats = {
        [StreamStat.CLOCK]: {
            name: t('clock'),
            $element: CE('span'),
        },
        [StreamStat.PLAYTIME]: {
            name: t('playtime'),
            $element: CE('span'),
        },
        [StreamStat.BATTERY]: {
            name: t('battery'),
            $element: CE('span'),
        },
        [StreamStat.PING]: {
            name: t('stat-ping'),
            $element: CE('span'),
        },
        [StreamStat.JITTER]: {
            name: t('jitter'),
            $element: CE('span'),
        },
        [StreamStat.RESOLUTION]: {
            name: t('resolution'),
            $element: CE('span'),
        },
        [StreamStat.FPS]: {
            name: t('stat-fps'),
            $element: CE('span'),
        },
        [StreamStat.BITRATE]: {
            name: t('stat-bitrate'),
            $element: CE('span'),
        },
        [StreamStat.DECODE_TIME]: {
            name: t('stat-decode-time'),
            $element: CE('span'),
        },
        [StreamStat.PACKETS_LOST]: {
            name: t('stat-packets-lost'),
            $element: CE('span'),
        },
        [StreamStat.FRAMES_LOST]: {
            name: t('stat-frames-lost'),
            $element: CE('span'),
        },
        [StreamStat.DOWNLOAD]: {
            name: t('downloaded'),
            $element: CE('span'),
        },
        [StreamStat.UPLOAD]: {
            name: t('uploaded'),
            $element: CE('span'),
        },
    };

    private $container!: HTMLElement;
    private boundOnStreamHudStateChanged: typeof this.onStreamHudStateChanged;

    private constructor() {
        BxLogger.info(this.LOG_TAG, 'constructor()');

        this.boundOnStreamHudStateChanged = this.onStreamHudStateChanged.bind(this);
        BxEventBus.Stream.on('ui.streamHud.rendered', this.boundOnStreamHudStateChanged);

        document.addEventListener('visibilitychange', this.onVisibilityChanged);

        this.render();
    }

    async start(glancing=false) {
        if (this.isRunning || !this.isHidden() || (glancing && this.isGlancing())) {
            return;
        }

        this.isRunning = true;
        this.intervalId && clearTimeout(this.intervalId);
        await this.update(true);

        this.$container.classList.remove('bx-gone');
        this.$container.dataset.display = glancing ? 'glancing' : 'fixed';
    }

    async stop(glancing=false) {
        if (glancing && !this.isGlancing()) {
            return;
        }

        this.isRunning = false;
        this.intervalId && clearTimeout(this.intervalId);
        this.intervalId = null;

        this.$container.removeAttribute('data-display');
        this.$container.classList.add('bx-gone');
    }

    async toggle() {
        if (this.isGlancing()) {
            this.$container && (this.$container.dataset.display = 'fixed');
        } else {
            this.isHidden() ? await this.start() : await this.stop();
        }
    }

    destroy() {
        this.stop();
        this.hideSettingsUi();
    }

    isHidden = () => this.$container.classList.contains('bx-gone');
    isGlancing = () => this.$container.dataset.display === 'glancing';

    onStreamHudStateChanged({ expanded }: { expanded: boolean }) {
        if (!getStreamPref(StreamPref.STATS_QUICK_GLANCE_ENABLED)) {
            return;
        }

        if (expanded) {
            this.isHidden() && this.start(true);
        } else {
            this.stop(true);
        }
    }

    private update = async (forceUpdate=false) => {
        if (this.isUpdating) return;

        if ((!forceUpdate && this.isHidden()) || !STATES.currentStream.peerConnection) {
            this.destroy();
            return;
        }

        this.isUpdating = true;
        try {
            const PREF_STATS_CONDITIONAL_FORMATTING = getStreamPref(StreamPref.STATS_CONDITIONAL_FORMATTING);
            let grade: StreamStatGrade = '';

            // Collect stats
            const statsCollector = StreamStatsCollector.getInstance();
            await statsCollector.collect();

            let statKey: keyof typeof this.stats;
            for (statKey in this.stats) {
                grade = '';

                const stat = this.stats[statKey];
                const value = statsCollector.getStat(statKey);
                const $element = stat.$element;
                $element.textContent = value.toString();

                // Get stat's grade
                if (PREF_STATS_CONDITIONAL_FORMATTING && 'grades' in value) {
                    grade = statsCollector.calculateGrade(value.current, value.grades);
                }

                if ($element.dataset.grade !== grade) {
                    $element.dataset.grade = grade;
                }
            }
        } finally {
            this.isUpdating = false;

            if (this.isRunning) {
                this.intervalId && clearTimeout(this.intervalId);
                this.intervalId = window.setTimeout(this.update, this.getInterval());
            }
        }
    }

    refreshStyles() {
        const PREF_ITEMS = getStreamPref(StreamPref.STATS_ITEMS);
        const PREF_OPACITY_BG = getStreamPref(StreamPref.STATS_OPACITY_BACKGROUND);

        const $container = this.$container;
        $container.dataset.stats = '[' + PREF_ITEMS.join('][') + ']';
        $container.dataset.position = getStreamPref(StreamPref.STATS_POSITION);

        if (PREF_OPACITY_BG === 0) {
            $container.style.removeProperty('background-color');
            $container.dataset.shadow = 'true';
        } else {
            delete $container.dataset.shadow;
            $container.style.backgroundColor = `rgba(0, 0, 0, ${PREF_OPACITY_BG}%)`;
        }

        $container.style.opacity = getStreamPref(StreamPref.STATS_OPACITY_ALL) + '%';
        $container.style.fontSize = getStreamPref(StreamPref.STATS_TEXT_SIZE);
    }

    hideSettingsUi() {
        if (this.isGlancing() && !getStreamPref(StreamPref.STATS_QUICK_GLANCE_ENABLED)) {
            this.stop();
        }
    }

    private async render() {
        this.$container = CE('div', { class: 'bx-stats-bar bx-gone' });

        let statKey: keyof typeof this.stats;
        for (statKey in this.stats) {
            const stat = this.stats[statKey];
            const $div = CE('div', {
                class: `bx-stat-${statKey}`,
                title: stat.name,
            },
                CE('label', false, statKey.toUpperCase()),
                stat.$element,
            );

            this.$container.appendChild($div);
        }

        this.refreshStyles();
        document.documentElement.appendChild(this.$container);
    }

    static setupEvents() {
        BxEventBus.Stream.on('state.playing', () => {
            const PREF_STATS_QUICK_GLANCE = getStreamPref(StreamPref.STATS_QUICK_GLANCE_ENABLED);
            const PREF_STATS_SHOW_WHEN_PLAYING = getStreamPref(StreamPref.STATS_SHOW_WHEN_PLAYING);

            const streamStats = StreamStats.getInstance();

            // Setup Stat's Quick Glance mode
            if (PREF_STATS_SHOW_WHEN_PLAYING) {
                streamStats.start();
            } else if (PREF_STATS_QUICK_GLANCE) {
                // Show stats bar
                !PREF_STATS_SHOW_WHEN_PLAYING && streamStats.start(true);
            }
        });
    }

    static refreshStyles() {
        StreamStats.getInstance().refreshStyles();
    }
}
