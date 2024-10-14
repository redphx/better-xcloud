import { BxEvent } from "@utils/bx-event"
import { CE } from "@utils/html"
import { t } from "@utils/translation"
import { STATES } from "@utils/global"
import { PrefKey } from "@/enums/pref-keys"
import { getPref } from "@/utils/settings-storages/global-settings-storage"
import { StreamStat, StreamStatsCollector, type StreamStatGrade } from "@/utils/stream-stats-collector"


export class StreamStats {
    private static instance: StreamStats;
    public static getInstance = () => StreamStats.instance ?? (StreamStats.instance = new StreamStats());

    private intervalId?: number | null;
    private readonly REFRESH_INTERVAL = 1 * 1000;

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

    quickGlanceObserver?: MutationObserver | null;

    constructor() {
        this.render();
    }

    async start(glancing=false) {
        if (!this.isHidden() || (glancing && this.isGlancing())) {
            return;
        }

        this.intervalId && clearInterval(this.intervalId);
        await this.update(true);

        this.$container.classList.remove('bx-gone');
        this.$container.dataset.display = glancing ? 'glancing' : 'fixed';

        this.intervalId = window.setInterval(this.update.bind(this), this.REFRESH_INTERVAL);
    }

    async stop(glancing=false) {
        if (glancing && !this.isGlancing()) {
            return;
        }

        this.intervalId && clearInterval(this.intervalId);
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

    onStoppedPlaying() {
        this.stop();
        this.quickGlanceStop();
        this.hideSettingsUi();
    }

    isHidden = () => this.$container.classList.contains('bx-gone');
    isGlancing = () => this.$container.dataset.display === 'glancing';

    quickGlanceSetup() {
        if (!STATES.isPlaying || this.quickGlanceObserver) {
            return;
        }

        const $uiContainer = document.querySelector('div[data-testid=ui-container]')!;
        if (!$uiContainer) {
            return;
        }

        this.quickGlanceObserver = new MutationObserver((mutationList, observer) => {
            for (const record of mutationList) {
                const $target = record.target as HTMLElement;
                if (!$target.className || !$target.className.startsWith('GripHandle')) {
                    continue;
                }

                const expanded = (record.target as HTMLElement).ariaExpanded;
                if (expanded === 'true') {
                    this.isHidden() && this.start(true);
                } else {
                    this.stop(true);
                }
            }
        });

        this.quickGlanceObserver.observe($uiContainer, {
            attributes: true,
            attributeFilter: ['aria-expanded'],
            subtree: true,
        });
    }

    quickGlanceStop() {
        this.quickGlanceObserver && this.quickGlanceObserver.disconnect();
        this.quickGlanceObserver = null;
    }

    private async update(forceUpdate=false) {
        if ((!forceUpdate && this.isHidden()) || !STATES.currentStream.peerConnection) {
            this.onStoppedPlaying();
            return;
        }

        const PREF_STATS_CONDITIONAL_FORMATTING = getPref(PrefKey.STATS_CONDITIONAL_FORMATTING);
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
    }

    refreshStyles() {
        const PREF_ITEMS = getPref(PrefKey.STATS_ITEMS);

        const $container = this.$container;
        $container.dataset.stats = '[' + PREF_ITEMS.join('][') + ']';
        $container.dataset.position = getPref(PrefKey.STATS_POSITION);
        $container.dataset.transparent = getPref(PrefKey.STATS_TRANSPARENT);
        $container.style.opacity = getPref(PrefKey.STATS_OPACITY) + '%';
        $container.style.fontSize = getPref(PrefKey.STATS_TEXT_SIZE);
    }

    hideSettingsUi() {
        if (this.isGlancing() && !getPref(PrefKey.STATS_QUICK_GLANCE)) {
            this.stop();
        }
    }

    private async render() {
        this.$container = CE('div', {class: 'bx-stats-bar bx-gone'});

        let statKey: keyof typeof this.stats;
        for (statKey in this.stats) {
            const stat = this.stats[statKey];
            const $div = CE('div', {
                class: `bx-stat-${statKey}`,
                title: stat.name,
            },
                CE('label', {}, statKey.toUpperCase()),
                stat.$element,
            );

            this.$container.appendChild($div);
        }

        this.refreshStyles();
        document.documentElement.appendChild(this.$container);
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
