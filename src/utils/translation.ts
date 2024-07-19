import { NATIVE_FETCH } from "./bx-flags";
import { BxLogger } from "./bx-logger";

export const SUPPORTED_LANGUAGES = {
    'en-US': 'English (United States)',

    'ca-CA': 'Català',
    'de-DE': 'Deutsch',
    'en-ID': 'Bahasa Indonesia',
    'es-ES': 'español (España)',
    'fr-FR': 'français',
    'it-IT': 'italiano',
    'ja-JP': '日本語',
    'ko-KR': '한국어',
    'pl-PL': 'polski',
    'pt-BR': 'português (Brasil)',
    'ru-RU': 'русский',
    'th-TH': 'ภาษาไทย',
    'tr-TR': 'Türkçe',
    'uk-UA': 'українська',
    'vi-VN': 'Tiếng Việt',
    'zh-CN': '中文(简体)',
    'zh-TW': '中文(繁體)',
};

const Texts = {
    "activate": "Activate",
    "activated": "Activated",
    "active": "Active",
    "advanced": "Advanced",
    "always-off": "Always off",
    "always-on": "Always on",
    "amd-fidelity-cas": "AMD FidelityFX CAS",
    "android-app-settings": "Android app settings",
    "apply": "Apply",
    "aspect-ratio": "Aspect ratio",
    "aspect-ratio-note": "Don't use with native touch games",
    "audio": "Audio",
    "auto": "Auto",
    "back-to-home": "Back to home",
    "back-to-home-confirm": "Do you want to go back to the home page (without disconnecting)?",
    "badge-audio": "Audio",
    "badge-battery": "Battery",
    "badge-in": "In",
    "badge-out": "Out",
    "badge-playtime": "Playtime",
    "badge-server": "Server",
    "badge-video": "Video",
    "bitrate-audio-maximum": "Maximum audio bitrate",
    "bitrate-video-maximum": "Maximum video bitrate",
    "bottom-left": "Bottom-left",
    "bottom-right": "Bottom-right",
    "brightness": "Brightness",
    "browser-unsupported-feature": "Your browser doesn't support this feature",
    "bypass-region-restriction": "Bypass region restriction",
    "can-stream-xbox-360-games": "Can stream Xbox 360 games",
    "cancel": "Cancel",
    "cant-stream-xbox-360-games": "Can't stream Xbox 360 games",
    "clarity-boost": "Clarity boost",
    "clarity-boost-warning": "These settings don't work when the Clarity Boost mode is ON",
    "clear": "Clear",
    "close": "Close",
    "close-app": "Close app",
    "combine-audio-video-streams": "Combine audio & video streams",
    "combine-audio-video-streams-summary": "May fix the laggy audio problem",
    "conditional-formatting": "Conditional formatting text color",
    "confirm-delete-preset": "Do you want to delete this preset?",
    "confirm-reload-stream": "Do you want to refresh the stream?",
    "connected": "Connected",
    "console-connect": "Connect",
    "contrast": "Contrast",
    "controller": "Controller",
    "controller-friendly-ui": "Controller-friendly UI",
    "controller-shortcuts": "Controller shortcuts",
    "controller-shortcuts-connect-note": "Connect a controller to use this feature",
    "controller-shortcuts-xbox-note": "Button to open the Guide menu",
    "controller-vibration": "Controller vibration",
    "copy": "Copy",
    "create-shortcut": "Create shortcut",
    "custom": "Custom",
    "deadzone-counterweight": "Deadzone counterweight",
    "decrease": "Decrease",
    "default": "Default",
    "delete": "Delete",
    "device": "Device",
    "device-unsupported-touch": "Your device doesn't have touch support",
    "device-vibration": "Device vibration",
    "device-vibration-not-using-gamepad": "On when not using gamepad",
    "disable": "Disable",
    "disable-home-context-menu": "Disable context menu in Home page",
    "disable-post-stream-feedback-dialog": "Disable post-stream feedback dialog",
    "disable-social-features": "Disable social features",
    "disable-xcloud-analytics": "Disable xCloud analytics",
    "disabled": "Disabled",
    "disconnected": "Disconnected",
    "edit": "Edit",
    "enable-controller-shortcuts": "Enable controller shortcuts",
    "enable-local-co-op-support": "Enable local co-op support",
    "enable-local-co-op-support-note": "Only works if the game doesn't require a different profile",
    "enable-mic-on-startup": "Enable microphone on game launch",
    "enable-mkb": "Emulate controller with Mouse & Keyboard",
    "enable-quick-glance-mode": "Enable \"Quick Glance\" mode",
    "enable-remote-play-feature": "Enable the \"Remote Play\" feature",
    "enable-volume-control": "Enable volume control feature",
    "enabled": "Enabled",
    "experimental": "Experimental",
    "export": "Export",
    "fast": "Fast",
    "fortnite-allow-stw-mode": "Allows playing STW mode on mobile",
    "fortnite-force-console-version": "Fortnite: force console version",
    "game-bar": "Game Bar",
    "getting-consoles-list": "Getting the list of consoles...",
    "gpu-configuration": "GPU configuration",
    "help": "Help",
    "hide": "Hide",
    "hide-idle-cursor": "Hide mouse cursor on idle",
    "hide-scrollbar": "Hide web page's scrollbar",
    "hide-sections": "Hide sections",
    "hide-system-menu-icon": "Hide System menu's icon",
    "hide-touch-controller": "Hide touch controller",
    "high-performance": "High performance",
    "horizontal-scroll-sensitivity": "Horizontal scroll sensitivity",
    "horizontal-sensitivity": "Horizontal sensitivity",
    "ignore": "Ignore",
    "import": "Import",
    "increase": "Increase",
    "install-android": "Install Better xCloud app for Android",
    "keyboard-shortcuts": "Keyboard shortcuts",
    "language": "Language",
    "large": "Large",
    "layout": "Layout",
    "left-stick": "Left stick",
    "loading-screen": "Loading screen",
    "local-co-op": "Local co-op",
    "low-power": "Low power",
    "map-mouse-to": "Map mouse to",
    "may-not-work-properly": "May not work properly!",
    "menu": "Menu",
    "microphone": "Microphone",
    "mkb-adjust-ingame-settings": "You may also need to adjust the in-game sensitivity & deadzone settings",
    "mkb-click-to-activate": "Click to activate",
    "mkb-disclaimer": "Using this feature when playing online could be viewed as cheating",
    "mouse-and-keyboard": "Mouse & Keyboard",
    "mouse-wheel": "Mouse wheel",
    "muted": "Muted",
    "name": "Name",
    "native-mkb": "Native Mouse & Keyboard",
    "new": "New",
    "no-consoles-found": "No consoles found",
    "normal": "Normal",
    "off": "Off",
    "on": "On",
    "only-supports-some-games": "Only supports some games",
    "opacity": "Opacity",
    "other": "Other",
    "playing": "Playing",
    "position": "Position",
    "powered-off": "Powered off",
    "powered-on": "Powered on",
    "prefer-ipv6-server": "Prefer IPv6 server",
    "preferred-game-language": "Preferred game's language",
    "preset": "Preset",
    "press-esc-to-cancel": "Press Esc to cancel",
    "press-key-to-toggle-mkb": [
        (e: any) => `Press ${e.key} to toggle this feature`,
        ,
        (e: any) => `${e.key}: Funktion an-/ausschalten`,
        ,
        (e: any) => `Pulsa ${e.key} para alternar esta función`,
        (e: any) => `Appuyez sur ${e.key} pour activer cette fonctionnalité`,
        (e: any) => `Premi ${e.key} per attivare questa funzionalità`,
        (e: any) => `${e.key} でこの機能を切替`,
        (e: any) => `${e.key} 키를 눌러 이 기능을 켜고 끄세요`,
        (e: any) => `Naciśnij ${e.key} aby przełączyć tę funkcję`,
        (e: any) => `Pressione ${e.key} para alternar este recurso`,
        (e: any) => `Нажмите ${e.key} для переключения этой функции`,
        ,
        (e: any) => `Etkinleştirmek için ${e.key} tuşuna basın`,
        (e: any) => `Натисніть ${e.key} щоб перемкнути цю функцію`,
        (e: any) => `Nhấn ${e.key} để bật/tắt tính năng này`,
        (e: any) => `按下 ${e.key} 来切换此功能`,
        (e: any) => `按下 ${e.key} 來啟用此功能`,
    ],
    "press-to-bind": "Press a key or do a mouse click to bind...",
    "prompt-preset-name": "Preset's name:",
    "reduce-animations": "Reduce UI animations",
    "region": "Region",
    "reload-page": "Reload page",
    "remote-play": "Remote Play",
    "rename": "Rename",
    "renderer": "Renderer",
    "right-click-to-unbind": "Right-click on a key to unbind it",
    "right-stick": "Right stick",
    "rocket-always-hide": "Always hide",
    "rocket-always-show": "Always show",
    "rocket-animation": "Rocket animation",
    "rocket-hide-queue": "Hide when queuing",
    "safari-failed-message": "Failed to run Better xCloud. Retrying, please wait...",
    "saturation": "Saturation",
    "save": "Save",
    "screen": "Screen",
    "screenshot-apply-filters": "Applies video filters to screenshots",
    "section-all-games": "All games",
    "section-most-popular": "Most popular",
    "section-news": "News",
    "section-play-with-friends": "Play with friends",
    "separate-touch-controller": "Separate Touch controller & Controller #1",
    "separate-touch-controller-note": "Touch controller is Player 1, Controller #1 is Player 2",
    "server": "Server",
    "settings": "Settings",
    "settings-reload": "Reload page to reflect changes",
    "settings-reloading": "Reloading...",
    "sharpness": "Sharpness",
    "shortcut-keys": "Shortcut keys",
    "show": "Show",
    "show-controller-connection-status": "Show controller connection status",
    "show-game-art": "Show game art",
    "show-hide": "Show/hide",
    "show-stats-on-startup": "Show stats when starting the game",
    "show-touch-controller": "Show touch controller",
    "show-wait-time": "Show the estimated wait time",
    "show-wait-time-in-game-card": "Show wait time in game card",
    "simplify-stream-menu": "Simplify Stream's menu",
    "skip-splash-video": "Skip Xbox splash video",
    "slow": "Slow",
    "small": "Small",
    "smart-tv": "Smart TV",
    "sound": "Sound",
    "standby": "Standby",
    "stat-bitrate": "Bitrate",
    "stat-decode-time": "Decode time",
    "stat-fps": "FPS",
    "stat-frames-lost": "Frames lost",
    "stat-packets-lost": "Packets lost",
    "stat-ping": "Ping",
    "stats": "Stats",
    "stick-decay-minimum": "Stick decay minimum",
    "stick-decay-strength": "Stick decay strength",
    "stream": "Stream",
    "stream-settings": "Stream settings",
    "stream-stats": "Stream stats",
    "stretch": "Stretch",
    "support-better-xcloud": "Support Better xCloud",
    "swap-buttons": "Swap buttons",
    "take-screenshot": "Take screenshot",
    "target-resolution": "Target resolution",
    "tc-all-games": "All games",
    "tc-all-white": "All white",
    "tc-auto-off": "Off when controller found",
    "tc-availability": "Availability",
    "tc-custom-layout-style": "Custom layout's button style",
    "tc-default-opacity": "Default opacity",
    "tc-muted-colors": "Muted colors",
    "tc-standard-layout-style": "Standard layout's button style",
    "text-size": "Text size",
    "toggle": "Toggle",
    "top-center": "Top-center",
    "top-left": "Top-left",
    "top-right": "Top-right",
    "touch-control-layout": "Touch control layout",
    "touch-control-layout-by": [
        (e: any) => `Touch control layout by ${e.name}`,
        (e: any) => `Format del control tàctil per ${e.name}`,
        (e: any) => `Touch-Steuerungslayout von ${e.name}`,
        (e: any) => `Tata letak Sentuhan layar oleh ${e.name}`,
        (e: any) => `Disposición del control táctil por ${e.nombre}`,
        (e: any) => `Disposition du contrôleur tactile par ${e.name}`,
        (e: any) => `Configurazione dei comandi su schermo creata da ${e.name}`,
        (e: any) => `タッチ操作レイアウト作成者: ${e.name}`,
        (e: any) => `${e.name} 제작, 터치 컨트롤 레이아웃`,
        (e: any) => `Układ sterowania dotykowego stworzony przez ${e.name}`,
        (e: any) => `Disposição de controle por toque feito por ${e.name}`,
        (e: any) => `Сенсорная раскладка по ${e.name}`,
        ,
        (e: any) => `${e.name} kişisinin dokunmatik kontrolcü tuş şeması`,
        (e: any) => `Розташування сенсорного керування від ${e.name}`,
        (e: any) => `Bố cục điều khiển cảm ứng tạo bởi ${e.name}`,
        (e: any) => `由 ${e.name} 提供的虚拟按键样式`,
        (e: any) => `觸控遊玩佈局由 ${e.name} 提供`,
    ],
    "touch-controller": "Touch controller",
    "transparent-background": "Transparent background",
    "ui": "UI",
    "unexpected-behavior": "May cause unexpected behavior",
    "unknown": "Unknown",
    "unlimited": "Unlimited",
    "unmuted": "Unmuted",
    "unsharp-masking": "Unsharp masking",
    "use-mouse-absolute-position": "Use mouse's absolute position",
    "use-this-at-your-own-risk": "Use this at your own risk",
    "user-agent-profile": "User-Agent profile",
    "vertical-scroll-sensitivity": "Vertical scroll sensitivity",
    "vertical-sensitivity": "Vertical sensitivity",
    "vibration-intensity": "Vibration intensity",
    "vibration-status": "Vibration",
    "video": "Video",
    "virtual-controller": "Virtual controller",
    "visual-quality": "Visual quality",
    "visual-quality-high": "High",
    "visual-quality-low": "Low",
    "visual-quality-normal": "Normal",
    "volume": "Volume",
    "wait-time-countdown": "Countdown",
    "wait-time-estimated": "Estimated finish time",
    "webgl2": "WebGL2",
};

export class Translations {
    static readonly #EN_US = 'en-US';
    static readonly #KEY_LOCALE = 'better_xcloud_locale';
    static readonly #KEY_TRANSLATIONS = 'better_xcloud_translations';

    static #enUsIndex = -1;
    static #selectedLocaleIndex = -1;
    static #selectedLocale: keyof typeof SUPPORTED_LANGUAGES = 'en-US';

    static #supportedLocales = Object.keys(SUPPORTED_LANGUAGES);
    static #foreignTranslations: any = {};

    static async init() {
        Translations.#enUsIndex = Translations.#supportedLocales.indexOf(Translations.#EN_US);

        Translations.refreshCurrentLocale();
        await Translations.#loadTranslations();
    }

    static refreshCurrentLocale() {
        const supportedLocales = Translations.#supportedLocales;

        let locale = localStorage.getItem(Translations.#KEY_LOCALE);
        if (!locale) {
            // Get browser's locale
            locale = window.navigator.language || Translations.#EN_US;
            if (supportedLocales.indexOf(locale) === -1) {
                locale = Translations.#EN_US;
            }
            localStorage.setItem(Translations.#KEY_LOCALE, locale);
        }

        Translations.#selectedLocale = locale as keyof typeof SUPPORTED_LANGUAGES;
        Translations.#selectedLocaleIndex = supportedLocales.indexOf(locale);
    }

    static get<T=string>(key: keyof typeof Texts, values?: any): T {
        let text = null;

        if (Translations.#foreignTranslations && Translations.#selectedLocale !== Translations.#EN_US) {
            text = Translations.#foreignTranslations[key];
        }

        if (!text) {
            text = Texts[key] || alert(`Missing translation key: ${key}`);
        }

        let translation: unknown;
        if (Array.isArray(text)) {
            translation = text[Translations.#selectedLocaleIndex] || text[Translations.#enUsIndex];
            return (translation as any)(values);
        }

        translation = text;
        return translation as T;
    }

    static async #loadTranslations() {
        if (Translations.#selectedLocale === Translations.#EN_US) {
            return;
        }

        try {
            Translations.#foreignTranslations = JSON.parse(window.localStorage.getItem(Translations.#KEY_TRANSLATIONS)!);
        } catch(e) {}

        if (!Translations.#foreignTranslations) {
            await this.downloadTranslations(Translations.#selectedLocale);
        }
    }

    static async updateTranslations(async=false) {
        // Don't have to download en-US
        if (Translations.#selectedLocale === Translations.#EN_US) {
            localStorage.removeItem(Translations.#KEY_TRANSLATIONS);
            return;
        }

        if (async) {
            Translations.downloadTranslationsAsync(Translations.#selectedLocale);
        } else {
            await Translations.downloadTranslations(Translations.#selectedLocale);
        }
    }

    static async downloadTranslations(locale: string) {
        try {
            const resp = await NATIVE_FETCH(`https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/translations/${locale}.json`);
            const translations = await resp.json();

            // Prevent saving incorrect translations
            let currentLocale = localStorage.getItem(Translations.#KEY_LOCALE);
            if (currentLocale === locale) {
                window.localStorage.setItem(Translations.#KEY_TRANSLATIONS, JSON.stringify(translations));
                Translations.#foreignTranslations = translations;
            }
            return true;
        } catch (e) {
            debugger;
        }

        return false;
    }

    static downloadTranslationsAsync(locale: string) {
        NATIVE_FETCH(`https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/translations/${locale}.json`)
            .then(resp => resp.json())
            .then(translations => {
                window.localStorage.setItem(Translations.#KEY_TRANSLATIONS, JSON.stringify(translations));
                Translations.#foreignTranslations = translations;
            });
    }
}

export const t = Translations.get;
export const ut = (text: string): string => {
    BxLogger.warning('Untranslated text', text);
    return text;
}

Translations.init();
