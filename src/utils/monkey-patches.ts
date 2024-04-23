import { BxEvent } from "../modules/bx-event";
import { getPref, PrefKey } from "../modules/preferences";
import { UserAgent } from "./user-agent";

export function patchVideoApi() {
    const PREF_SKIP_SPLASH_VIDEO = getPref(PrefKey.SKIP_SPLASH_VIDEO);

    // Show video player when it's ready
    const showFunc = function(this: HTMLVideoElement) {
        this.style.visibility = 'visible';
        this.removeEventListener('playing', showFunc);

        if (!this.videoWidth) {
            return;
        }

        BxEvent.dispatch(window, BxEvent.STREAM_PLAYING, {
                $video: this,
            });
    }

    const nativePlay = HTMLMediaElement.prototype.play;
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

        if (!!this.src) {
            return nativePlay.apply(this);
        }

        this.addEventListener('playing', showFunc);

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

    const profilePrefix = codecProfile === 'high' ? '4d' : (codecProfile === 'low' ? '420' : '42e');
    const profileLevelId = `profile-level-id=${profilePrefix}`;

    const nativeSetCodecPreferences = RTCRtpTransceiver.prototype.setCodecPreferences;
    RTCRtpTransceiver.prototype.setCodecPreferences = function(codecs) {
        // Use the same codecs as desktop
        const newCodecs = codecs.slice();
        let pos = 0;
        newCodecs.forEach((codec, i) => {
            // Find high-quality codecs
            if (codec.sdpFmtpLine && codec.sdpFmtpLine.includes(profileLevelId)) {
                // Move it to the top of the array
                newCodecs.splice(i, 1);
                newCodecs.splice(pos, 0, codec);
                ++pos;
            }
        });

        try {
            nativeSetCodecPreferences.apply(this, [newCodecs]);
        } catch (e) {
            // Didn't work -> use default codecs
            console.log(e);
            nativeSetCodecPreferences.apply(this, [codecs]);
        }
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

    const OrgRTCPeerConnection = window.RTCPeerConnection;
    // @ts-ignore
    window.RTCPeerConnection = function() {
        const conn = new OrgRTCPeerConnection();
        States.currentStream.peerConnection = conn;

        conn.addEventListener('connectionstatechange', e => {
                if (conn.connectionState === 'connecting') {
                    States.currentStream.audioGainNode = null;
                }
                console.log('connectionState', conn.connectionState);
            });
        return conn;
    }
}

export function patchAudioContext() {
    if (UserAgent.isSafari(true)) {
        const nativeCreateGain = window.AudioContext.prototype.createGain;
        window.AudioContext.prototype.createGain = function() {
            const gainNode = nativeCreateGain.apply(this);
            gainNode.gain.value = getPref(PrefKey.AUDIO_VOLUME) / 100;
            States.currentStream.audioGainNode = gainNode;
            return gainNode;
        }
    }

    const OrgAudioContext = window.AudioContext;
    // @ts-ignore
    window.AudioContext = function() {
        const ctx = new OrgAudioContext();
        States.currentStream.audioContext = ctx;
        States.currentStream.audioGainNode = null;
        return ctx;
    }

    const nativePlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function() {
        this.muted = true;

        const promise = nativePlay.apply(this);
        if (States.currentStream.audioGainNode) {
            return promise;
        }

        this.addEventListener('playing', e => (e.target as HTMLAudioElement).pause());

        const audioCtx = States.currentStream.audioContext!;
        // TOOD: check srcObject
        const audioStream = audioCtx.createMediaStreamSource(this.srcObject as any);
        const gainNode = audioCtx.createGain();

        audioStream.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = getPref(PrefKey.AUDIO_VOLUME) / 100;
        States.currentStream.audioGainNode = gainNode;

        return promise;
    }
}
