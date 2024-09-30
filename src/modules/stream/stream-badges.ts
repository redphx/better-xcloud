import { isLiteVersion } from "@macros/build" with {type: "macro"};

import { t } from "@utils/translation";
import { BxEvent } from "@utils/bx-event";
import { CE, createSvgIcon } from "@utils/html";
import { STATES } from "@utils/global";
import { BxLogger } from "@/utils/bx-logger";
import { BxIcon } from "@/utils/bx-icon";
import { GuideMenuTab } from "../ui/guide-menu";

enum StreamBadge {
    PLAYTIME = 'playtime',
    BATTERY = 'battery',
    DOWNLOAD = 'in',
    UPLOAD = 'out',

    SERVER = 'server',
    VIDEO = 'video',
    AUDIO = 'audio',
}

const StreamBadgeIcon: Partial<{[key in StreamBadge]: any}> = {
    [StreamBadge.PLAYTIME]: BxIcon.PLAYTIME,
    [StreamBadge.VIDEO]: BxIcon.DISPLAY,
    [StreamBadge.BATTERY]: BxIcon.BATTERY,
    [StreamBadge.DOWNLOAD]: BxIcon.DOWNLOAD,
    [StreamBadge.UPLOAD]: BxIcon.UPLOAD,
    [StreamBadge.SERVER]: BxIcon.SERVER,
    [StreamBadge.AUDIO]: BxIcon.AUDIO,
}

export class StreamBadges {
    private static instance: StreamBadges;
    public static getInstance(): StreamBadges {
        if (!StreamBadges.instance) {
            StreamBadges.instance = new StreamBadges();
        }

        return StreamBadges.instance;
    }

    #ipv6 = false;
    #resolution?: {width: number, height: number} | null = null;
    #video?: {codec: string, profile?: string | null} | null = null;
    #audio?: {codec: string, bitrate: number} | null = null;
    #region = '';

    startBatteryLevel = 100;
    startTimestamp = 0;

    #$container: HTMLElement | undefined;
    #cachedDoms: Partial<{[key in StreamBadge]: HTMLElement}> = {};

    #interval?: number | null;
    readonly #REFRESH_INTERVAL = 3000;

    setRegion(region: string) {
        this.#region = region;
    }

    #renderBadge(name: StreamBadge, value: string, color: string) {
        let $badge;
        if (this.#cachedDoms[name]) {
            $badge = this.#cachedDoms[name]!;
            $badge.lastElementChild!.textContent = value;
            return $badge;
        }

        $badge = CE('div', {'class': 'bx-badge', 'title': t(`badge-${name}`)},
            CE('span', {'class': 'bx-badge-name'}, createSvgIcon(StreamBadgeIcon[name])),
            CE('span', {'class': 'bx-badge-value', 'style': `background-color: ${color}`}, value),
        );

        if (name === StreamBadge.BATTERY) {
            $badge.classList.add('bx-badge-battery');
        }

        this.#cachedDoms[name] = $badge;
        return $badge;
    }

    async #updateBadges(forceUpdate = false) {
        if (!this.#$container || (!forceUpdate && !this.#$container.isConnected)) {
            this.#stop();
            return;
        }

        // Playtime
        let now = +new Date;
        const diffSeconds = Math.ceil((now - this.startTimestamp) / 1000);
        const playtime = this.#secondsToHm(diffSeconds);

        // Battery
        let batteryLevel = '100%';
        let batteryLevelInt = 100;
        let isCharging = false;
        if (STATES.browser.capabilities.batteryApi) {
            try {
                const bm = await (navigator as NavigatorBattery).getBattery();
                isCharging = bm.charging;
                batteryLevelInt = Math.round(bm.level * 100);
                batteryLevel = `${batteryLevelInt}%`;

                if (batteryLevelInt != this.startBatteryLevel) {
                    const diffLevel = Math.round(batteryLevelInt - this.startBatteryLevel);
                    const sign = diffLevel > 0 ? '+' : '';
                    batteryLevel += ` (${sign}${diffLevel}%)`;
                }
            } catch(e) {}
        }

        const stats = await STATES.currentStream.peerConnection?.getStats()!;
        let totalIn = 0;
        let totalOut = 0;
        stats.forEach(stat => {
            if (stat.type === 'candidate-pair' && stat.packetsReceived > 0 && stat.state === 'succeeded') {
                totalIn += stat.bytesReceived;
                totalOut += stat.bytesSent;
            }
        });

        const badges = {
            [StreamBadge.DOWNLOAD]: totalIn ? this.#humanFileSize(totalIn) : null,
            [StreamBadge.UPLOAD]: totalOut ? this.#humanFileSize(totalOut) : null,
            [StreamBadge.PLAYTIME]: playtime,
            [StreamBadge.BATTERY]: batteryLevel,
        };

        let name: keyof typeof badges;
        for (name in badges) {
            const value = badges[name];
            if (value === null) {
                continue;
            }

            const $elm = this.#cachedDoms[name]!;
            $elm && ($elm.lastElementChild!.textContent = value);

            if (name === StreamBadge.BATTERY) {
                if (this.startBatteryLevel === 100 && batteryLevelInt === 100) {
                    // Hide battery badge when the battery is 100%
                    $elm.classList.add('bx-gone');
                } else {
                    // Show charging status
                    $elm.dataset.charging = isCharging.toString()
                    $elm.classList.remove('bx-gone');
                }
            }
        }
    }

    async #start() {
        await this.#updateBadges(true);
        this.#stop();
        this.#interval = window.setInterval(this.#updateBadges.bind(this), this.#REFRESH_INTERVAL);
    }

    #stop() {
        this.#interval && clearInterval(this.#interval);
        this.#interval = null;
    }

    #secondsToHm(seconds: number) {
        let h = Math.floor(seconds / 3600);
        let m = Math.floor(seconds % 3600 / 60) + 1;

        if (m === 60) {
            h += 1;
            m = 0;
        }

        const output = [];
        h > 0 && output.push(`${h}h`);
        m > 0 && output.push(`${m}m`);

        return output.join(' ');
    }

    // https://stackoverflow.com/a/20732091
    #humanFileSize(size: number) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];

        const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
    }

    async render() {
        if (this.#$container) {
            this.#start();
            return this.#$container;
        }

        await this.#getServerStats();

        // Video
        let video = '';
        if (this.#resolution) {
            video = `${this.#resolution.height}p`;
        }

        if (this.#video) {
            video && (video += '/');
            video += this.#video.codec;
            if (this.#video.profile) {
                const profile = this.#video.profile;

                let quality = profile;
                if (profile.startsWith('4d')) {
                    quality = t('visual-quality-high');
                } else if (profile.startsWith('42e')) {
                    quality = t('visual-quality-normal');
                } else if (profile.startsWith('420')) {
                    quality = t('visual-quality-low');
                }

                video += ` (${quality})`;
            }
        }

        // Audio
        let audio;
        if (this.#audio) {
            audio = this.#audio.codec;
            const bitrate = this.#audio.bitrate / 1000;
            audio += ` (${bitrate} kHz)`;
        }

        // Battery
        let batteryLevel = '';
        if (STATES.browser.capabilities.batteryApi) {
            batteryLevel = '100%';
        }

        // Server + Region
        let server = this.#region;
        server += '@' + (this.#ipv6 ? 'IPv6' : 'IPv4');

        const BADGES = [
            [StreamBadge.PLAYTIME, '1m', '#ff004d'],
            [StreamBadge.BATTERY, batteryLevel, '#00b543'],
            [StreamBadge.DOWNLOAD, this.#humanFileSize(0), '#29adff'],
            [StreamBadge.UPLOAD, this.#humanFileSize(0), '#ff77a8'],
            [StreamBadge.SERVER, server, '#ff6c24'],
            video ? [StreamBadge.VIDEO, video, '#742f29'] : null,
            audio ? [StreamBadge.AUDIO, audio, '#5f574f'] : null,
        ];

        const $container = CE('div', {'class': 'bx-badges'});
        BADGES.forEach(item => {
            if (!item) {
                return;
            }

            const $badge = this.#renderBadge(...(item as [StreamBadge, string, string]));
            $container.appendChild($badge);
        });

        this.#$container = $container;
        await this.#start();

        return $container;
    }

    async #getServerStats() {
        const stats = await STATES.currentStream.peerConnection!.getStats();

        const allVideoCodecs: {[index: string]: RTCBasicStat} = {};
        let videoCodecId;

        const allAudioCodecs: {[index: string]: RTCBasicStat} = {};
        let audioCodecId;

        const allCandidates: {[index: string]: string} = {};
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
            const video: any = {
                codec: videoStat.mimeType.substring(6),
            };

            if (video.codec === 'H264') {
                const match = /profile-level-id=([0-9a-f]{6})/.exec(videoStat.sdpFmtpLine);
                video.profile = match ? match[1] : null;
            }

            this.#video = video;
        }

        // Get audio codec from codecId
        if (audioCodecId) {
            const audioStat = allAudioCodecs[audioCodecId];
            this.#audio = {
                codec: audioStat.mimeType.substring(6),
                bitrate: audioStat.clockRate,
            }
        }

        // Get server type
        if (candidateId) {
            BxLogger.info('candidate', candidateId, allCandidates);
            this.#ipv6 = allCandidates[candidateId].includes(':');
        }
    }

    static setupEvents() {
        window.addEventListener(BxEvent.STREAM_PLAYING, e => {
            const $video = (e as any).$video;
            const streamBadges = StreamBadges.getInstance();

            streamBadges.#resolution = {
                width: $video.videoWidth,
                height: $video.videoHeight,
            };
            streamBadges.startTimestamp = +new Date;

            // Get battery level
            try {
                STATES.browser.capabilities.batteryApi && (navigator as NavigatorBattery).getBattery().then(bm => {
                    streamBadges.startBatteryLevel = Math.round(bm.level * 100);
                });
            } catch(e) {}
        });

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
