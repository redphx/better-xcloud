import { t } from "../../utils/translation";
import { BxEvent } from "../../utils/bx-event";
import { CE } from "../../utils/html";
import { STATES } from "../../utils/global";

enum StreamBadge {
    PLAYTIME = 'playtime',
    BATTERY = 'battery',
    IN = 'in',
    OUT = 'out',

    SERVER = 'server',
    VIDEO = 'video',
    AUDIO = 'audio',

    BREAK = 'break',
}

export class StreamBadges {
    static ipv6 = false;
    static resolution?: {width: number, height: number} | null = null;
    static video?: {codec: string, profile?: string | null} | null = null;
    static audio?: {codec: string, bitrate: number} | null = null;
    static fps = 0;
    static region = '';

    static startBatteryLevel = 100;
    static startTimestamp = 0;

    static #cachedDoms: {[index: string]: HTMLElement} = {};

    static #interval?: number | null;
    static readonly #REFRESH_INTERVAL = 3000;

    static #renderBadge(name: StreamBadge, value: string, color: string) {
        if (name === StreamBadge.BREAK) {
            return CE('div', {'style': 'display: block'});
        }

        let $badge;
        if (StreamBadges.#cachedDoms[name]) {
            $badge = StreamBadges.#cachedDoms[name];
            $badge.lastElementChild!.textContent = value;
            return $badge;
        }

        $badge = CE('div', {'class': 'bx-badge'},
                    CE('span', {'class': 'bx-badge-name'}, t(`badge-${name}`)),
                    CE('span', {'class': 'bx-badge-value', 'style': `background-color: ${color}`}, value));

        if (name === StreamBadge.BATTERY) {
            $badge.classList.add('bx-badge-battery');
        }

        StreamBadges.#cachedDoms[name] = $badge;
        return $badge;
    }

    static async #updateBadges(forceUpdate: boolean) {
        if (!forceUpdate && !document.querySelector('.bx-badges')) {
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
        if ('getBattery' in navigator) {
            try {
                const bm = await (navigator as NavigatorBattery).getBattery();
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
            [StreamBadge.IN]: totalIn ? StreamBadges.#humanFileSize(totalIn) : null,
            [StreamBadge.OUT]: totalOut ? StreamBadges.#humanFileSize(totalOut) : null,
            [StreamBadge.PLAYTIME]: playtime,
            [StreamBadge.BATTERY]: batteryLevel,
        };

        let name: keyof typeof badges;
        for (name in badges) {
            const value = badges[name];
            if (value === null) {
                continue;
            }

            const $elm = StreamBadges.#cachedDoms[name];
            $elm && ($elm.lastElementChild!.textContent = value);

            if (name === StreamBadge.BATTERY) {
                // Show charging status
                $elm.setAttribute('data-charging', isCharging.toString());

                if (StreamBadges.startBatteryLevel === 100 && batteryLevelInt === 100) {
                    $elm.style.display = 'none';
                } else {
                    $elm.removeAttribute('style');
                }
            }
        }
    }

    static #stop() {
        StreamBadges.#interval && clearInterval(StreamBadges.#interval);
        StreamBadges.#interval = null;
    }

    static #secondsToHm(seconds: number) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor(seconds % 3600 / 60) + 1;

        const hDisplay = h > 0 ? `${h}h`: '';
        const mDisplay = m > 0 ? `${m}m`: '';
        return hDisplay + mDisplay;
    }

    // https://stackoverflow.com/a/20732091
    static #humanFileSize(size: number) {
        const units = ['B', 'kB', 'MB', 'GB', 'TB'];

        let i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
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
                const profile = StreamBadges.video.profile;

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
        if (StreamBadges.audio) {
            audio = StreamBadges.audio.codec;
            const bitrate = StreamBadges.audio.bitrate / 1000;
            audio += ` (${bitrate} kHz)`;
        }

        // Battery
        let batteryLevel = '';
        if ('getBattery' in navigator) {
            batteryLevel = '100%';
        }

        // Server + Region
        let server = StreamBadges.region;
        server += '@' + (StreamBadges.ipv6 ? 'IPv6' : 'IPv4');

        const BADGES = [
            [StreamBadge.PLAYTIME, '1m', '#ff004d'],
            [StreamBadge.BATTERY, batteryLevel, '#00b543'],
            [StreamBadge.IN, StreamBadges.#humanFileSize(0), '#29adff'],
            [StreamBadge.OUT, StreamBadges.#humanFileSize(0), '#ff77a8'],
            [StreamBadge.BREAK],
            [StreamBadge.SERVER, server, '#ff6c24'],
            video ? [StreamBadge.VIDEO, video, '#742f29'] : null,
            audio ? [StreamBadge.AUDIO, audio, '#5f574f'] : null,
        ];

        const $wrapper = CE('div', {'class': 'bx-badges'});
        BADGES.forEach(item => {
            if (!item) {
                return;
            }

            const $badge = StreamBadges.#renderBadge(...(item as [StreamBadge, string, string]));
            $wrapper.appendChild($badge);
        });

        await StreamBadges.#updateBadges(true);
        StreamBadges.#stop();
        StreamBadges.#interval = window.setInterval(StreamBadges.#updateBadges, StreamBadges.#REFRESH_INTERVAL);

        return $wrapper;
    }

    static setupEvents() {
        window.addEventListener(BxEvent.STREAM_PLAYING, e => {
            const $video = (e as any).$video;

            StreamBadges.resolution = {
                width: $video.videoWidth,
                height: $video.videoHeight
            };
            StreamBadges.startTimestamp = +new Date;

            // Get battery level
            try {
                'getBattery' in navigator && (navigator as NavigatorBattery).getBattery().then(bm => {
                    StreamBadges.startBatteryLevel = Math.round(bm.level * 100);
                });
            } catch(e) {}
        });
    }
}
