// Get type of an array's element
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>

interface Window {
    AppInterface: any;
    BX_FLAGS?: BxFlags;
    BX_CE: (elmName: string, props: {[index: string]: any}={}) => HTMLElement;
    BX_EXPOSED: any;

    BX_VIBRATION_INTENSITY: number;
    BX_ENABLE_CONTROLLER_VIBRATION: boolean;
    BX_ENABLE_DEVICE_VIBRATION: boolean;

    BX_REMOTE_PLAY_CONFIG: BxStates.remotePlay.config;
}

interface NavigatorBattery extends Navigator {
    getBattery: () => Promise<{
        charging: boolean,
        level: float,
    }>,
}

type BxStates = {
    isPlaying: boolean;
    appContext: any | null;
    serverRegions: any;

    hasTouchSupport: boolean;
    browserHasTouchSupport: boolean;

    currentStream: Partial<{
        titleId: string;
        xboxTitleId: string;
        productId: string;
        titleInfo: XcloudTitleInfo;

        $video: HTMLVideoElement | null;

        peerConnection: RTCPeerConnection;
        audioContext: AudioContext | null;
        audioGainNode: GainNode | null;
    }>;

    remotePlay: Partial<{
        isPlaying: boolean;
        server: string;
        config: {
            serverId: string;
        };
    }>;
}

type DualEnum = {[index: string]: number} & {[index: number]: string};

type XcloudTitleInfo = {
    details: {
        productId: string;
        supportedInputTypes: InputType[];
        hasTouchSupport: boolean;
        hasFakeTouchSupport: boolean;
        hasMkbSupport: boolean;
    };

    product: {
        heroImageUrl: string;
        titledHeroImageUrl: string;
        tileImageUrl: string;
    };
};

declare module '*.js';
declare module '*.svg';
declare module '*.styl';

type MkbMouseMove = {
    movementX: number;
    movementY: number;
}

type MkbMouseClick = {
    key: {
        code: string;
        name: string;
    } | null;
    pressed: boolean;
}

type MkbMouseWheel = {
    key: {
        code: string;
        name: string;
    } | null;
}
