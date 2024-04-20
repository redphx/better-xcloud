// Get type of an array's element
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

interface Window {
    AppInterface: any;
    BX_FLAGS?: BxFlags;
    BX_CE: (elmName: string, props: {[index: string]: any}={}) => HTMLElement;
    BX_EXPOSED: any;
}

interface NavigatorBattery extends Navigator {
    getBattery: () => Promise<{
        charging: boolean,
        level: float,
    }>,
}

type RTCBasicStat = {
    address: string,
    bytesReceived: number,
    clockRate: number,
    codecId: string,
    framesDecoded: number,
    id: string,
    kind: string,
    mimeType: string,
    packetsReceived: number,
    profile: string,
    remoteCandidateId: string,
    sdpFmtpLine: string,
    state: string,
    timestamp: number,
    totalDecodeTime: number,
    type: string,
}

type BxStates = {
    isPlaying: boolean;
    appContext: any | null;
}

declare var window: Window & typeof globalThis;
declare var AppInterface: any;
declare var STREAM_WEBRTC: RTCPeerConnection;
declare var States: BxStates;
