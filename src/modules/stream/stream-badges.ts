import { isLiteVersion } from "@macros/build" with {type: "macro"};

import { t } from "@utils/translation";
import { BxEvent } from "@utils/bx-event";
import { CE, createSvgIcon, humanFileSize } from "@utils/html";
import { STATES } from "@utils/global";
import { BxLogger } from "@/utils/bx-logger";
import { BxIcon } from "@/utils/bx-icon";
import { GuideMenuTab } from "../ui/guide-menu";
import { StreamStat, StreamStatsCollector } from "@/utils/stream-stats-collector";


type StreamBadgeInfo = {
    name: string,
    $element?: HTMLElement,
    icon: typeof BxIcon,
    color: string,
};

type StreamServerInfo = {
    server?: {
        ipv6: boolean,
        region?: string,
    },

    video?: {
        width: number,
        height: number,
        codec: string,
        profile?: string,
    },

    audio?: {
        codec: string,
        bitrate: number,
    },
};

enum StreamBadge {
    PLAYTIME = 'playtime',
    BATTERY = 'battery',
    DOWNLOAD = 'download',
    UPLOAD = 'upload',

    SERVER = 'server',
    VIDEO = 'video',
    AUDIO = 'audio',
}


export class StreamBadges {
    private static instance: StreamBadges;
    public static getInstance(): StreamBadges {
        if (!StreamBadges.instance) {
            StreamBadges.instance = new StreamBadges();
        }

        return StreamBadges.instance;
    }

    private serverInfo: StreamServerInfo = {};

    private badges: Record<StreamBadge, StreamBadgeInfo> = {
        [StreamBadge.PLAYTIME]: {
            name: t('playtime'),
            icon: BxIcon.PLAYTIME,
            color: '#ff004d',
        },
        [StreamBadge.BATTERY]: {
            name: t('battery'),
            icon: BxIcon.BATTERY,
            color: '#00b543',
        },
        [StreamBadge.DOWNLOAD]: {
            name: t('download'),
            icon: BxIcon.DOWNLOAD,
            color: '#29adff',
        },
        [StreamBadge.UPLOAD]: {
            name: t('upload'),
            icon: BxIcon.UPLOAD,
            color: '#ff77a8',
        },
        [StreamBadge.SERVER]: {
            name: t('server'),
            icon: BxIcon.SERVER,
            color: '#ff6c24',
        },
        [StreamBadge.VIDEO]: {
            name: t('video'),
            icon: BxIcon.DISPLAY,
            color: '#742f29',
        },
        [StreamBadge.AUDIO]: {
            name: t('audio'),
            icon: BxIcon.AUDIO,
            color: '#5f574f',
        },
    };

    private $container: HTMLElement | undefined;

    private intervalId?: number | null;
    private readonly REFRESH_INTERVAL = 3 * 1000;

    setRegion(region: string) {
        this.serverInfo.server = {
            region: region,
            ipv6: false,
        };
    }

    renderBadge(name: StreamBadge, value: string) {
        const badgeInfo = this.badges[name];

        let $badge;
        if (badgeInfo.$element) {
            $badge = badgeInfo.$element;
            $badge.lastElementChild!.textContent = value;
            return $badge;
        }

        $badge = CE('div', {class: 'bx-badge', title: badgeInfo.name},
            CE('span', {class: 'bx-badge-name'}, createSvgIcon(badgeInfo.icon)),
            CE('span', {class: 'bx-badge-value', style: `background-color: ${badgeInfo.color}`}, value),
        );

        if (name === StreamBadge.BATTERY) {
            $badge.classList.add('bx-badge-battery');
        }

        this.badges[name].$element = $badge;
        return $badge;
    }

    private async updateBadges(forceUpdate = false) {
        if (!this.$container || (!forceUpdate && !this.$container.isConnected)) {
            this.stop();
            return;
        }

        const statsCollector = StreamStatsCollector.getInstance();
        await statsCollector.collect();

        const play = statsCollector.getStat(StreamStat.PLAYTIME);
        const batt = statsCollector.getStat(StreamStat.BATTERY);
        const dl = statsCollector.getStat(StreamStat.DOWNLOAD);
        const ul = statsCollector.getStat(StreamStat.UPLOAD);

        const badges = {
            [StreamBadge.DOWNLOAD]: dl.toString(),
            [StreamBadge.UPLOAD]: ul.toString(),
            [StreamBadge.PLAYTIME]: play.toString(),
            [StreamBadge.BATTERY]: batt.toString(),
        };

        let name: keyof typeof badges;
        for (name in badges) {
            const value = badges[name];
            if (value === null) {
                continue;
            }

            const $elm = this.badges[name].$element;
            if (!$elm) {
                continue;
            }

            $elm.lastElementChild!.textContent = value;

            if (name === StreamBadge.BATTERY) {
                if (batt.current === 100 && batt.start === 100) {
                    // Hide battery badge when the battery is 100%
                    $elm.classList.add('bx-gone');
                } else {
                    // Show charging status
                    $elm.dataset.charging = batt.isCharging.toString();
                    $elm.classList.remove('bx-gone');
                }
            }
        }
    }

    private async start() {
        await this.updateBadges(true);
        this.stop();
        this.intervalId = window.setInterval(this.updateBadges.bind(this), this.REFRESH_INTERVAL);
    }

    private stop() {
        this.intervalId && clearInterval(this.intervalId);
        this.intervalId = null;
    }

    async render() {
        if (this.$container) {
            this.start();
            return this.$container;
        }

        await this.getServerStats();

        // Battery
        let batteryLevel = '';
        if (STATES.browser.capabilities.batteryApi) {
            batteryLevel = '100%';
        }

        const BADGES = [
            [StreamBadge.PLAYTIME, '1m'],
            [StreamBadge.BATTERY, batteryLevel],
            [StreamBadge.DOWNLOAD, humanFileSize(0)],
            [StreamBadge.UPLOAD, humanFileSize(0)],
            this.serverInfo.server ? this.badges.server.$element : [StreamBadge.SERVER, '?'],
            this.serverInfo.video ? this.badges.video.$element : [StreamBadge.VIDEO, '?'],
            this.serverInfo.audio ? this.badges.audio.$element : [StreamBadge.AUDIO, '?'],
        ];

        const $container = CE('div', {class: 'bx-badges'});
        BADGES.forEach(item => {
            if (!item) {
                return;
            }

            let $badge: HTMLElement;
            if (!(item instanceof HTMLElement)) {
                $badge = this.renderBadge(...(item as [StreamBadge, string]));
            } else {
                $badge = item;
            }

            $container.appendChild($badge);
        });

        this.$container = $container;
        await this.start();

        return $container;
    }

    private async getServerStats() {
        const stats = await STATES.currentStream.peerConnection!.getStats();

        const allVideoCodecs: Record<string, RTCBasicStat> = {};
        let videoCodecId;
        let videoWidth = 0;
        let videoHeight = 0;

        const allAudioCodecs: Record<string, RTCBasicStat> = {};
        let audioCodecId;

        const allCandidates: Record<string, string> = {};
        let candidateId;

        stats.forEach((stat: RTCBasicStat) => {
            if (stat.type === 'codec') {
                const mimeType = stat.mimeType.split('/')[0];
                if (mimeType === 'video') {
                    // Store all video stats
                    allVideoCodecs[stat.id] = stat;
                } else if (mimeType === 'audio') {
                    // Store all audio stats
                    allAudioCodecs[stat.id] = stat;
                }
            } else if (stat.type === 'inbound-rtp' && stat.packetsReceived > 0) {
                // Get the codecId of the video/audio track currently being used
                if (stat.kind === 'video') {
                    videoCodecId = stat.codecId;
                    videoWidth = stat.frameWidth;
                    videoHeight = stat.frameHeight;
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
            const video: StreamServerInfo['video'] = {
                width: videoWidth,
                height: videoHeight,
                codec: videoStat.mimeType.substring(6),
            };

            if (video.codec === 'H264') {
                const match = /profile-level-id=([0-9a-f]{6})/.exec(videoStat.sdpFmtpLine);
                match && (video.profile = match[1]);
            }

            let text = videoHeight + 'p';
            text && (text += '/');
            text += video.codec;
            if (video.profile) {
                const profile = video.profile;

                let quality = profile;
                if (profile.startsWith('4d')) {
                    quality = t('visual-quality-high');
                } else if (profile.startsWith('42e')) {
                    quality = t('visual-quality-normal');
                } else if (profile.startsWith('420')) {
                    quality = t('visual-quality-low');
                }

                text += ` (${quality})`;
            }

            // Render badge
            this.badges.video.$element = this.renderBadge(StreamBadge.VIDEO, text);

            this.serverInfo.video = video;
        }

        // Get audio codec from codecId
        if (audioCodecId) {
            const audioStat = allAudioCodecs[audioCodecId];
            const audio: StreamServerInfo['audio'] = {
                codec: audioStat.mimeType.substring(6),
                bitrate: audioStat.clockRate,
            };

            const bitrate = audio.bitrate / 1000;
            const text = `${audio.codec} (${bitrate} kHz)`;
            this.badges.audio.$element = this.renderBadge(StreamBadge.AUDIO, text);

            this.serverInfo.audio = audio;
        }

        // Get server type
        if (candidateId) {
            BxLogger.info('candidate', candidateId, allCandidates);

            // Server + Region
            const server = this.serverInfo.server;
            if (server) {
                server.ipv6 = allCandidates[candidateId].includes(':');

                let text = '';
                if (server.region) {
                    text += server.region;
                }

                text += '@' + (server.ipv6 ? 'IPv6' : 'IPv4');
                this.badges.server.$element = this.renderBadge(StreamBadge.SERVER, text);
            }
        }
    }

    static setupEvents() {
        // Since the Lite version doesn't have the "..." button on System menu
        // we need to display Stream badges in the Guide menu instead
        isLiteVersion() && window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, async e => {
            const where = (e as any).where as GuideMenuTab;

            if (where !== GuideMenuTab.HOME || !STATES.isPlaying) {
                return;
            }

            const $btnQuit = document.querySelector('#gamepass-dialog-root a[class*=QuitGameButton]');
            if ($btnQuit) {
                // Add badges
                $btnQuit.insertAdjacentElement('beforebegin', await StreamBadges.getInstance().render());
            }
        });
    }
}
