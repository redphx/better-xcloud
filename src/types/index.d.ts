type BuildVariant = 'full' | 'lite';

// Get type of an array's element
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

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
    supportedRegion: boolean;
    serverRegions: any;
    selectedRegion: any;
    gsToken: string;
    isSignedIn: boolean;

    isPlaying: boolean;
    appContext: any | null;

    browser: {
        capabilities: {
            touch: boolean;
            batteryApi: boolean;
        };
    };

    userAgent: {
        isTv: boolean;
        capabilities: {
            touch: boolean;
            mkb: boolean;
        };
    };

    currentStream: Partial<{
        titleSlug: string;
        titleInfo: XcloudTitleInfo;
        xboxTitleId: number;

        streamPlayer: StreamPlayer | null;

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
        titleId?: string;
    }>;

    pointerServerPort: number;
}

type XcloudTitleInfo = {
    titleId: string,

    details: {
        productId: string;
        xboxTitleId: number;
        supportedInputTypes: InputType[];
        supportedTabs: any[];
        hasNativeTouchSupport: boolean;
        hasTouchSupport: boolean;
        hasFakeTouchSupport: boolean;
        hasMkbSupport: boolean;
    };

    product: {
        title: string;
        heroImageUrl: string;
        titledHeroImageUrl: string;
        tileImageUrl: string;
    };
};

type XcloudWaitTimeInfo = Partial<{
    estimatedAllocationTimeInSeconds: number,
    estimatedProvisioningTimeInSeconds: number,
    estimatedTotalWaitTimeInSeconds: number,
}>;

declare module '*.js';
declare module '*.svg';
declare module '*.styl';

declare module '*.fs';
declare module '*.vert';

type MkbMouseMove = {
    movementX: number;
    movementY: number;
}

type MkbMouseClick = {
    pointerButton?: number,
    mouseButton?: number,
    pressed: boolean,
}

type MkbMouseWheel = {
    vertical: number;
    horizontal: number;
}

type XboxAchievement = {
    version: number;
    id: string;
    name: string;
    gamerscore: number;
    isSecret: boolean;
    isUnlocked: boolean;
    description: {
        locked: string;
        unlocked: string;
    };

    imageUrl: string,
    requirements: Array<{
        current: number;
        target: number;
        percentComplete: number;
    }>;

    percentComplete: 0,
    rarity: {
        currentCategory: string;
        currentPercentage: number;
    };

    rewards: Array<{
        value: number;
        valueType: string;
        type: string;
    }>;

    title: {
        id: string;
        scid: string;
        productId: string;
        name: string;
    }
};
