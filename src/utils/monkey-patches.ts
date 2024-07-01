import { BxEvent } from "@utils/bx-event";
import { getPref, PrefKey } from "@utils/preferences";
import { STATES } from "@utils/global";
import { BxLogger } from "@utils/bx-logger";
import { patchSdpBitrate, setCodecPreferences } from "./sdp";
import { StreamPlayer, type StreamPlayerOptions } from "@/modules/stream-player";

export function patchVideoApi() {
    const PREF_SKIP_SPLASH_VIDEO = getPref(PrefKey.SKIP_SPLASH_VIDEO);

    // Show video player when it's ready
    const showFunc = function(this: HTMLVideoElement) {
        this.style.visibility = 'visible';
        this.removeEventListener('playing', showFunc);

        if (!this.videoWidth) {
            return;
        }

        const playerOptions = {
            processing: getPref(PrefKey.VIDEO_PROCESSING),
            sharpness: getPref(PrefKey.VIDEO_SHARPNESS),
            saturation: getPref(PrefKey.VIDEO_SATURATION),
            contrast: getPref(PrefKey.VIDEO_CONTRAST),
            brightness: getPref(PrefKey.VIDEO_BRIGHTNESS),
        } satisfies StreamPlayerOptions;
        STATES.currentStream.streamPlayer = new StreamPlayer(this, getPref(PrefKey.VIDEO_PLAYER_TYPE), playerOptions);

        BxEvent.dispatch(window, BxEvent.STREAM_PLAYING, {
                $video: this,
            });
    }

    const nativePlay = HTMLMediaElement.prototype.play;
    (HTMLMediaElement.prototype as any).nativePlay = nativePlay;
    HTMLMediaElement.prototype.play = function() {
        if (this.className && this.className.startsWith('XboxSplashVideo')) {
            if (PREF_SKIP_SPLASH_VIDEO) {
                this.volume = 0;
                this.style.display = 'none';
                this.dispatchEvent(new Event('ended'));

                return new Promise<void>(() => {});
            }

            return nativePlay.apply(this);
        }

        const $parent = this.parentElement!!;
        // Video tag is stream player
        if (!this.src && $parent.dataset.testid === 'media-container') {
            this.addEventListener('playing', showFunc);
        }

        return nativePlay.apply(this);
    };
}


export function patchRtcCodecs() {
    const codecProfile = getPref(PrefKey.STREAM_CODEC_PROFILE);
    if (codecProfile === 'default') {
        return;
    }

    if (typeof RTCRtpTransceiver === 'undefined' || !('setCodecPreferences' in RTCRtpTransceiver.prototype)) {
        return false;
    }
}

export function patchRtcPeerConnection() {
    const nativeCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
    RTCPeerConnection.prototype.createDataChannel = function() {
        // @ts-ignore
        const dataChannel = nativeCreateDataChannel.apply(this, arguments);

        BxEvent.dispatch(window, BxEvent.DATA_CHANNEL_CREATED, {
                dataChannel: dataChannel,
            });

        return dataChannel;
    }

    const maxVideoBitrate = getPref(PrefKey.BITRATE_VIDEO_MAX);
    const codec = getPref(PrefKey.STREAM_CODEC_PROFILE);

    if (codec !== 'default' || maxVideoBitrate > 0) {
        const nativeSetLocalDescription = RTCPeerConnection.prototype.setLocalDescription;
        RTCPeerConnection.prototype.setLocalDescription = function(description?: RTCLocalSessionDescriptionInit): Promise<void> {
            // Set preferred codec profile
            if (codec !== 'default') {
                arguments[0].sdp = setCodecPreferences(arguments[0].sdp, codec);
            }

            // set maximum bitrate
            try {
                if (maxVideoBitrate > 0 && description) {
                    arguments[0].sdp = patchSdpBitrate(arguments[0].sdp, Math.round(maxVideoBitrate / 1000));
                }
            } catch (e) {
                BxLogger.error('setLocalDescription', e);
            }

            BxLogger.info('setLocalDescription', arguments[0].sdp);

            // @ts-ignore
            return nativeSetLocalDescription.apply(this, arguments);
        };
    }

    const OrgRTCPeerConnection = window.RTCPeerConnection;
    // @ts-ignore
    window.RTCPeerConnection = function() {
        const conn = new OrgRTCPeerConnection();
        STATES.currentStream.peerConnection = conn;

        conn.addEventListener('connectionstatechange', e => {
                BxLogger.info('connectionstatechange', conn.connectionState);
            });
        return conn;
    }
}

export function patchAudioContext() {
    const OrgAudioContext = window.AudioContext;
    const nativeCreateGain = OrgAudioContext.prototype.createGain;

    // @ts-ignore
    window.AudioContext = function(options?: AudioContextOptions | undefined): AudioContext {
        if (options && options.latencyHint) {
            options.latencyHint = 0;
        }

        const ctx = new OrgAudioContext(options);
        BxLogger.info('patchAudioContext', ctx, options);

        ctx.createGain = function() {
            const gainNode = nativeCreateGain.apply(this);
            gainNode.gain.value = getPref(PrefKey.AUDIO_VOLUME) / 100;

            STATES.currentStream.audioGainNode = gainNode;
            return gainNode;
        }

        STATES.currentStream.audioContext = ctx;
        return ctx;
    }
}

/**
 * Disable telemetry flags in meversion.js
 */
export function patchMeControl() {
    const overrideConfigs = {
        enableAADTelemetry: false,
        enableTelemetry: false,
        telEvs: '',
        oneDSUrl: '',
    };

    const MSA = {
        MeControl: {
            API: {
                setDisplayMode: () => {},
                setMobileState: () => {},
            },
        },
    };
    const MeControl = {};

    const MsaHandler: ProxyHandler<any> = {
        get(target, prop, receiver) {
            return target[prop];
        },

        set(obj, prop, value) {
            if (prop === 'MeControl' && value.Config) {
                value.Config = Object.assign(value.Config, overrideConfigs);
            }

            obj[prop] = value;
            return true;
        },
    };

    const MeControlHandler: ProxyHandler<any> = {
        get(target, prop, receiver) {
            return target[prop];
        },

        set(obj, prop, value) {
            if (prop === 'Config') {
                value = Object.assign(value, overrideConfigs);
            }

            obj[prop] = value;
            return true;
        },
    };

    (window as any).MSA = new Proxy(MSA, MsaHandler);
    (window as any).MeControl = new Proxy(MeControl, MeControlHandler);
}

/**
 * Use power-saving flags for touch control
 */
export function patchCanvasContext() {
    const nativeGetContext = HTMLCanvasElement.prototype.getContext;
    // @ts-ignore
    HTMLCanvasElement.prototype.getContext = function(contextType: string, contextAttributes?: any) {
        if (contextType.includes('webgl')) {
            contextAttributes = contextAttributes || {};
            if (!contextAttributes.isBx) {
                contextAttributes.antialias = false;

                // Use low-power profile for touch controller
                if (contextAttributes.powerPreference === 'high-performance') {
                    contextAttributes.powerPreference = 'low-power';
                }
            }
        }

        return nativeGetContext.apply(this, [contextType, contextAttributes]);
    }
}


export function patchPointerLockApi() {
    Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get() {
            return document.documentElement;
        },
    });

    HTMLElement.prototype.requestFullscreen = function(options?: FullscreenOptions): Promise<void> {
        return Promise.resolve();
    }

    let pointerLockElement: unknown = null;
    Object.defineProperty(document, 'pointerLockElement', {
        configurable: true,
        get() {
            return pointerLockElement;
        },
    });

    // const nativeRequestPointerLock = HTMLElement.prototype.requestPointerLock;
    HTMLElement.prototype.requestPointerLock = function() {
        pointerLockElement = document.documentElement;
        window.dispatchEvent(new Event(BxEvent.POINTER_LOCK_REQUESTED));
        // document.dispatchEvent(new Event('pointerlockchange'));

        // @ts-ignore
        // nativeRequestPointerLock.apply(this, arguments);
    }

    // const nativeExitPointerLock = Document.prototype.exitPointerLock;
    Document.prototype.exitPointerLock = function() {
        pointerLockElement = null;
        window.dispatchEvent(new Event(BxEvent.POINTER_LOCK_EXITED));
        // document.dispatchEvent(new Event('pointerlockchange'));

        // nativeExitPointerLock.apply(this);
    }
}
