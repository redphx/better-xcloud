type BuildVariant = 'full' | 'lite';

// Get type of an array's element
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

interface NavigatorBattery extends Navigator {
    getBattery: () => Promise<{
        charging: boolean;
        level: float;
    }>,
}

type ServerContinent = 'america-north' | 'america-south' | 'asia' | 'australia' | 'europe' | 'other';
type ServerRegion = {
    baseUri: string;
    isDefault: boolean;
    name: string;
    shortName: string;
    displayName: string;

    contintent: ServerContinent;
};

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

declare module '*.js' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.styl' {
  const content: string;
  export default content;
}

declare module '*.fs' {
    const content: string;
    export default content;
}

declare module '*.vert' {
    const content: string;
    export default content;
}

declare module '*.wgsl' {
    const content: string;
    export default content;
}

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

type OsName = 'windows' | 'tizen' | 'webOS' | 'xboxOS' | 'android' | 'kepler';

type XcloudGamepad = {
    GamepadIndex: number;
    A: number;
    B: number;
    X: number;
    Y: number;
    LeftShoulder: number;
    RightShoulder: number;
    LeftTrigger: number;
    RightTrigger: number;
    View: number;
    Menu: number;
    LeftThumb: number;
    RightThumb: number;
    DPadUp: number;
    DPadDown: number;
    DPadLeft: number;
    DPadRight: number;
    Nexus: number;
    LeftThumbXAxis: number;
    LeftThumbYAxis: number;
    RightThumbXAxis: number;
    RightThumbYAxis: number;
    PhysicalPhysicality: number;
    VirtualPhysicality: number;
    Dirty: boolean;
    Virtual: boolean;

    // Only in Better xCloud
    LeftStickAxes?: any;
    RightStickAxes?: any;
    Share?: any;
};

type BxFlags = {
    Debug: boolean;

    CheckForUpdate: boolean;
    EnableXcloudLogging: boolean;
    SafariWorkaround: boolean;

    EnableWebGPURenderer: boolean;
    WebGL2NoColorConversion: boolean;

    ForceNativeMkbTitles: string[];
    FeatureGates: { [key: string]: boolean } | null,

    DeviceInfo: {
        deviceType: 'android' | 'android-tv' | 'android-handheld' | 'webos' | 'unknown',
        userAgent?: string,

        androidInfo?: {
            manufacturer: string,
            brand: string,
            board: string,
            model: string,
        },
    }
}
