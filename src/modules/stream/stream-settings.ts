import { BxEvent } from "@utils/bx-event";
import { BxIcon } from "@utils/bx-icon";
import { STATES, AppInterface } from "@utils/global";
import { ButtonStyle, CE, createButton, createSvgIcon } from "@utils/html";
import { PrefKey, Preferences, getPref, toPrefElement } from "@utils/preferences";
import { t } from "@utils/translation";
import { ControllerShortcut } from "../controller-shortcut";
import { MkbRemapper } from "../mkb/mkb-remapper";
import { NativeMkbHandler } from "../mkb/native-mkb-handler";
import { SoundShortcut } from "../shortcuts/shortcut-sound";
import { TouchController } from "../touch-controller";
import { VibrationManager } from "../vibration-manager";
import { StreamStats } from "./stream-stats";
import { BxSelectElement } from "@/web-components/bx-select";
import { onChangeVideoPlayerType, updateVideoPlayer } from "./stream-settings-utils";
import { GamepadKey } from "@/enums/mkb";

enum FocusDirection {
    UP,
    RIGHT,
    DOWN,
    LEFT,
}

enum FocusContainer {
    OUTSIDE,
    TABS,
    SETTINGS,
}

export class StreamSettings {
    private static instance: StreamSettings;

    public static getInstance(): StreamSettings {
        if (!StreamSettings.instance) {
            StreamSettings.instance = new StreamSettings();
        }

        return StreamSettings.instance;
    }

    private static readonly GAMEPAD_POLLING_INTERVAL = 50;
    private static readonly GAMEPAD_KEYS = [
        GamepadKey.UP,
        GamepadKey.DOWN,
        GamepadKey.LEFT,
        GamepadKey.RIGHT,
        GamepadKey.A,
        GamepadKey.B,
        GamepadKey.LB,
        GamepadKey.RB,
    ];

    private gamepadPollingIntervalId: number | null = null;
    private gamepadLastButtons: Array<GamepadKey | null> = [];

    private $container: HTMLElement | undefined;
    private $tabs: HTMLElement | undefined;
    private $settings: HTMLElement | undefined;
    private $overlay: HTMLElement | undefined;

    readonly SETTINGS_UI = [{
        icon: BxIcon.DISPLAY,
        group: 'stream',
        items: [{
            group: 'audio',
            label: t('audio'),
            help_url: 'https://better-xcloud.github.io/ingame-features/#audio',
            items: [{
                pref: PrefKey.AUDIO_VOLUME,
                onChange: (e: any, value: number) => {
                    SoundShortcut.setGainNodeVolume(value);
                },
                params: {
                    disabled: !getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL),
                },
                onMounted: ($elm: HTMLElement) => {
                    const $range = $elm.querySelector('input[type=range') as HTMLInputElement;
                    window.addEventListener(BxEvent.GAINNODE_VOLUME_CHANGED, e => {
                        $range.value = (e as any).volume;
                        BxEvent.dispatch($range, 'input', {
                            ignoreOnChange: true,
                        });
                    });
                },
            }],
        }, {
            group: 'video',
            label: t('video'),
            help_url: 'https://better-xcloud.github.io/ingame-features/#video',
            items: [{
                pref: PrefKey.VIDEO_PLAYER_TYPE,
                onChange: onChangeVideoPlayerType,
            }, {
                pref: PrefKey.VIDEO_RATIO,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_PROCESSING,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_SHARPNESS,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_SATURATION,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_CONTRAST,
                onChange: updateVideoPlayer,
            }, {
                pref: PrefKey.VIDEO_BRIGHTNESS,
                onChange: updateVideoPlayer,
            }],
        }],
        }, {
            icon: BxIcon.CONTROLLER,
            group: 'controller',
            items: [{
                group: 'controller',
                label: t('controller'),
                help_url: 'https://better-xcloud.github.io/ingame-features/#controller',
                items: [{
                    pref: PrefKey.CONTROLLER_ENABLE_VIBRATION,
                    unsupported: !VibrationManager.supportControllerVibration(),
                    onChange: () => VibrationManager.updateGlobalVars(),
                }, {
                    pref: PrefKey.CONTROLLER_DEVICE_VIBRATION,
                    unsupported: !VibrationManager.supportDeviceVibration(),
                    onChange: () => VibrationManager.updateGlobalVars(),
                }, (VibrationManager.supportControllerVibration() || VibrationManager.supportDeviceVibration()) && {
                    pref: PrefKey.CONTROLLER_VIBRATION_INTENSITY,
                    unsupported: !VibrationManager.supportDeviceVibration(),
                    onChange: () => VibrationManager.updateGlobalVars(),
                }],
            },

            STATES.userAgent.capabilities.touch && {
                group: 'touch-controller',
                label: t('touch-controller'),
                items: [{
                    label: t('layout'),
                    content: CE('select', {disabled: true}, CE('option', {}, t('default'))),
                    onMounted: ($elm: HTMLSelectElement) => {
                        $elm.addEventListener('change', e => {
                            TouchController.loadCustomLayout(STATES.currentStream?.xboxTitleId!, $elm.value, 1000);
                        });

                        window.addEventListener(BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, e => {
                            const data = (e as any).data;

                            if (STATES.currentStream?.xboxTitleId && ($elm as any).xboxTitleId === STATES.currentStream?.xboxTitleId) {
                                $elm.dispatchEvent(new Event('change'));
                                return;
                            }

                            ($elm as any).xboxTitleId = STATES.currentStream?.xboxTitleId;

                            // Clear options
                            while ($elm.firstChild) {
                                $elm.removeChild($elm.firstChild);
                            }

                            $elm.disabled = !data;
                            if (!data) {
                                $elm.appendChild(CE('option', {value: ''}, t('default')));
                                $elm.value = '';
                                $elm.dispatchEvent(new Event('change'));
                                return;
                            }

                            // Add options
                            const $fragment = document.createDocumentFragment();
                            for (const key in data.layouts) {
                                const layout = data.layouts[key];

                                let name;
                                if (layout.author) {
                                    name = `${layout.name} (${layout.author})`;
                                } else {
                                    name = layout.name;
                                }

                                const $option = CE('option', {value: key}, name);
                                $fragment.appendChild($option);
                            }

                            $elm.appendChild($fragment);
                            $elm.value = data.default_layout;
                            $elm.dispatchEvent(new Event('change'));
                        });
                    },
                }],
            }],
        },

        getPref(PrefKey.MKB_ENABLED) && {
            icon: BxIcon.VIRTUAL_CONTROLLER,
            group: 'mkb',
            items: [{
                group: 'mkb',
                label: t('virtual-controller'),
                help_url: 'https://better-xcloud.github.io/mouse-and-keyboard/',
                content: MkbRemapper.INSTANCE.render(),
            }],
        },

        AppInterface && getPref(PrefKey.NATIVE_MKB_ENABLED) === 'on' && {
            icon: BxIcon.NATIVE_MKB,
            group: 'native-mkb',
            items: [{
                group: 'native-mkb',
                label: t('native-mkb'),
                items: [{
                    pref: PrefKey.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY,
                    onChange: (e: any, value: number) => {
                        NativeMkbHandler.getInstance().setVerticalScrollMultiplier(value / 100);
                    },
                }, {
                    pref: PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY,
                    onChange: (e: any, value: number) => {
                        NativeMkbHandler.getInstance().setHorizontalScrollMultiplier(value / 100);
                    },
                }],
            }],
        }, {
            icon: BxIcon.COMMAND,
            group: 'shortcuts',
            items: [{
                group: 'shortcuts_controller',
                label: t('controller-shortcuts'),
                content: ControllerShortcut.renderSettings(),
            }],
        }, {
            icon: BxIcon.STREAM_STATS,
            group: 'stats',
            items: [{
                group: 'stats',
                label: t('stream-stats'),
                help_url: 'https://better-xcloud.github.io/stream-stats/',
                items: [{
                        pref: PrefKey.STATS_SHOW_WHEN_PLAYING,
                    }, {
                        pref: PrefKey.STATS_QUICK_GLANCE,
                        onChange: (e: InputEvent) => {
                            const streamStats = StreamStats.getInstance();
                            (e.target! as HTMLInputElement).checked ? streamStats.quickGlanceSetup() : streamStats.quickGlanceStop();
                        },
                    }, {
                        pref: PrefKey.STATS_ITEMS,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_POSITION,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_TEXT_SIZE,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_OPACITY,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_TRANSPARENT,
                        onChange: StreamStats.refreshStyles,
                    }, {
                        pref: PrefKey.STATS_CONDITIONAL_FORMATTING,
                        onChange: StreamStats.refreshStyles,
                    },
                ],
            }],
        },
    ];

    constructor() {
        this.#setupDialog();

        // Hide dialog when the Guide menu is shown
        window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, e => this.hide());
    }

    show(tabId?: string) {
        const $container = this.$container!;
        // Select tab
        if (tabId) {
            const $tab = $container.querySelector(`.bx-stream-settings-tabs svg[data-tab-group=${tabId}]`);
            $tab && $tab.dispatchEvent(new Event('click'));
        }

        // Show overlay
        this.$overlay!.classList.remove('bx-gone');
        this.$overlay!.dataset.isPlaying = STATES.isPlaying.toString();

        // Show dialog
        $container.classList.remove('bx-gone');
        // Lock scroll bar
        document.body.classList.add('bx-no-scroll');

        if (getPref(PrefKey.UI_CONTROLLER_FRIENDLY)) {
            // Focus the first visible setting
            this.#focusDirection(FocusDirection.DOWN);

            // Add event listeners
            $container.addEventListener('keydown', this);

            // Start gamepad polling
            this.#startGamepadPolling();

            // Disable xCloud's navigation polling
            (window as any).BX_EXPOSED.disableGamepadPolling = true;
        }

        BxEvent.dispatch(window, BxEvent.XCLOUD_DIALOG_SHOWN);
    }

    hide() {
        // Hide overlay
        this.$overlay!.classList.add('bx-gone');
        // Hide dialog
        this.$container!.classList.add('bx-gone');
        // Show scroll bar
        document.body.classList.remove('bx-no-scroll');

        // Remove event listeners
        this.$container!.removeEventListener('keydown', this);

        // Stop gamepad polling();
        this.#stopGamepadPolling();

        // Enable xCloud's navigation polling
        (window as any).BX_EXPOSED.disableGamepadPolling = false;

        BxEvent.dispatch(window, BxEvent.XCLOUD_DIALOG_DISMISSED);
    }

    #pollGamepad() {
        const gamepads = window.navigator.getGamepads();

        let direction: FocusDirection | null = null;
        for (const gamepad of gamepads) {
            if (!gamepad || !gamepad.connected) {
                continue;
            }

            const buttons = gamepad.buttons;
            let lastButton = this.gamepadLastButtons[gamepad.index];
            let pressedButton: GamepadKey | undefined = undefined;

            for (const key of StreamSettings.GAMEPAD_KEYS) {
                if (typeof lastButton === 'number') {
                    // Key pressed
                    if (lastButton === key && !buttons[key].pressed) {
                        pressedButton = key;
                        break;
                    }
                } else if (buttons[key].pressed) {
                    this.gamepadLastButtons[gamepad.index] = key;
                    break;
                }
            }

            if (typeof pressedButton !== 'undefined') {
                this.gamepadLastButtons[gamepad.index] = null;

                if (pressedButton === GamepadKey.A) {
                    document.activeElement && document.activeElement.dispatchEvent(new MouseEvent('click'));
                } else if (pressedButton === GamepadKey.B) {
                    this.hide();
                } else if (pressedButton === GamepadKey.LB || pressedButton === GamepadKey.RB) {
                    // Go to next/previous tab
                    const $currentTab = this.$tabs!.querySelector('.bx-active') as HTMLElement;
                    $currentTab && this.#handleTabsNavigation($currentTab, pressedButton === GamepadKey.LB ? FocusDirection.UP : FocusDirection.DOWN);
                }

                if (pressedButton === GamepadKey.UP) {
                    direction = FocusDirection.UP;
                } else if (pressedButton === GamepadKey.DOWN) {
                    direction = FocusDirection.DOWN;
                } else if (pressedButton === GamepadKey.LEFT) {
                    direction = FocusDirection.LEFT;
                } else if (pressedButton === GamepadKey.RIGHT) {
                    direction = FocusDirection.RIGHT;
                }

                if (direction !== null) {
                    let handled = false;
                    if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'range') {
                        const $range = document.activeElement;
                        if (direction === FocusDirection.LEFT || direction === FocusDirection.RIGHT) {
                            $range.value = (parseInt($range.value) + parseInt($range.step) * (direction === FocusDirection.LEFT ? -1 : 1)).toString();
                            $range.dispatchEvent(new InputEvent('input'));
                            handled = true;
                        }
                    }

                    if (!handled) {
                        this.#focusDirection(direction);
                    }
                }

                return;
            }
        }
    }

    #startGamepadPolling() {
        this.#stopGamepadPolling();

        this.gamepadPollingIntervalId = window.setInterval(this.#pollGamepad.bind(this), StreamSettings.GAMEPAD_POLLING_INTERVAL);
    }

    #stopGamepadPolling() {
        this.gamepadLastButtons = [];

        this.gamepadPollingIntervalId && window.clearInterval(this.gamepadPollingIntervalId);
        this.gamepadPollingIntervalId = null;
    }

    #handleTabsNavigation($focusing: HTMLElement, direction: FocusDirection) {
        if (direction === FocusDirection.UP || direction === FocusDirection.DOWN) {
            let $sibling = $focusing;
            const siblingProperty = direction === FocusDirection.UP ? 'previousElementSibling' : 'nextElementSibling';

            while ($sibling[siblingProperty]) {
                $sibling = $sibling[siblingProperty] as HTMLElement;
                $sibling && $sibling.focus();
                return;
            }
        } else if (direction === FocusDirection.RIGHT) {
            this.#focusFirstVisibleSetting();
        }
    }

    #handleSettingsNavigation($focusing: HTMLElement, direction: FocusDirection) {
        // If current element's tabIndex property is not 0
        if ($focusing.tabIndex !== 0) {
            // Find first visible setting
            const $childSetting = $focusing.querySelector('div[data-tab-group]:not(.bx-gone) [tabindex="0"]:not(a)') as HTMLElement;
            if ($childSetting) {
                $childSetting.focus();
                return;
            }
        }

        // Current element is setting -> Find the next one
        // Find parent
        let $parent = $focusing.closest('[data-focus-container]');

        if (!$parent) {
            return;
        }

        // Find sibling setting
        let $sibling = $parent;
        if (direction === FocusDirection.UP || direction === FocusDirection.DOWN) {
            const siblingProperty = direction === FocusDirection.UP ? 'previousElementSibling' : 'nextElementSibling';

            while ($sibling[siblingProperty]) {
                $sibling = $sibling[siblingProperty];
                const $childSetting = $sibling.querySelector('[tabindex="0"]:last-of-type') as HTMLElement;
                if ($childSetting) {
                    $childSetting.focus();
                    return;
                }
            }
        } else if (direction === FocusDirection.LEFT || direction === FocusDirection.RIGHT) {
            // Find all child elements with tabindex
            const children = Array.from($parent.querySelectorAll('[tabindex="0"]'));
            const index = children.indexOf($focusing);
            let nextIndex;
            if (direction === FocusDirection.LEFT) {
                nextIndex = index - 1;
            } else {
                nextIndex = index + 1;
            }

            nextIndex = Math.max(-1, Math.min(nextIndex, children.length - 1));
            if (nextIndex === -1) {
                // Focus setting tabs
                const $tab = this.$tabs!.querySelector('svg.bx-active') as HTMLElement;
                $tab && $tab.focus();
            } else if (nextIndex !== index) {
                (children[nextIndex] as HTMLElement).focus();
            }
        }
    }

    #focusFirstVisibleSetting() {
        // Focus the first visible tab content
        const $tab = this.$settings!.querySelector('div[data-tab-group]:not(.bx-gone)') as HTMLElement;

        if ($tab) {
            // Focus on the first focusable setting
            const $control = $tab.querySelector('[tabindex="0"]:not(a)') as HTMLElement;
            if ($control) {
                $control.focus();
            } else {
                // Focus tab
                $tab.focus();
            }
        }
    }

    #focusDirection(direction: FocusDirection) {
        const $tabs = this.$tabs!;
        const $settings = this.$settings!;

        // Get current focused element
        let $focusing = document.activeElement as HTMLElement;

        let focusContainer = FocusContainer.OUTSIDE;
        if ($focusing) {
            if ($settings.contains($focusing)) {
                focusContainer = FocusContainer.SETTINGS;
            } else if ($tabs.contains($focusing)) {
                focusContainer = FocusContainer.TABS;
            }
        }

        // If not focusing any element or the focused element is not inside the dialog
        if (focusContainer === FocusContainer.OUTSIDE) {
            this.#focusFirstVisibleSetting();
            return;
        } else if (focusContainer === FocusContainer.SETTINGS) {
            this.#handleSettingsNavigation($focusing, direction);
        } else if (focusContainer === FocusContainer.TABS) {
            this.#handleTabsNavigation($focusing, direction);
        }
    }

    handleEvent(event: Event) {
        switch (event.type) {
            case 'keydown':
                const $target = event.target as HTMLElement;
                const keyboardEvent = event as KeyboardEvent;
                const keyCode = keyboardEvent.code || keyboardEvent.key;

                if (keyCode === 'ArrowUp' || keyCode === 'ArrowDown') {
                    event.preventDefault();
                    event.stopPropagation();

                    this.#focusDirection(keyCode === 'ArrowUp' ? FocusDirection.UP : FocusDirection.DOWN);
                } else if (keyCode === 'ArrowLeft' || keyCode === 'ArrowRight') {
                    if (($target as any).type !== 'range') {
                        event.preventDefault();
                        event.stopPropagation();

                        this.#focusDirection(keyCode === 'ArrowLeft' ? FocusDirection.LEFT : FocusDirection.RIGHT);
                    }
                } else if (keyCode === 'Enter' || keyCode === 'Space') {
                    if ($target instanceof SVGElement) {
                        event.preventDefault();
                        event.stopPropagation();

                        $target.dispatchEvent(new Event('click'));
                    }
                } else if (keyCode === 'Escape') {
                    this.hide();
                }
                break;
        }
    }

    #setupDialog() {
        let $tabs: HTMLElement;
        let $settings: HTMLElement;

        const $overlay = CE('div', {class: 'bx-stream-settings-overlay bx-gone'});
        this.$overlay = $overlay;

        const $container = CE('div', {class: 'bx-stream-settings-dialog bx-gone'},
                $tabs = CE('div', {class: 'bx-stream-settings-tabs'}),
                $settings = CE('div', {
                    class: 'bx-stream-settings-tab-contents',
                    tabindex: 10,
                }),
            );

        this.$container = $container;
        this.$tabs = $tabs;
        this.$settings = $settings;

        // Close dialog when clicking on the overlay
        $overlay.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            this.hide();
        });

        for (const settingTab of this.SETTINGS_UI) {
            if (!settingTab) {
                continue;
            }

            const $svg = createSvgIcon(settingTab.icon);
            $svg.tabIndex = 0;

            $svg.addEventListener('click', e => {
                // Switch tab
                for (const $child of Array.from($settings.children)) {
                    if ($child.getAttribute('data-tab-group') === settingTab.group) {
                        $child.classList.remove('bx-gone');
                    } else {
                        $child.classList.add('bx-gone');
                    }
                }

                // Highlight current tab button
                for (const $child of Array.from($tabs.children)) {
                    $child.classList.remove('bx-active');
                }

                $svg.classList.add('bx-active');
            });

            $tabs.appendChild($svg);

            const $group = CE('div', {'data-tab-group': settingTab.group, 'class': 'bx-gone'});

            for (const settingGroup of settingTab.items) {
                if (!settingGroup) {
                    continue;
                }

                $group.appendChild(CE('h2', {'data-focus-container': 'true'},
                        CE('span', {}, settingGroup.label),
                        settingGroup.help_url && createButton({
                                icon: BxIcon.QUESTION,
                                style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
                                url: settingGroup.help_url,
                                title: t('help'),
                                tabIndex: 0,
                            }),
                    ));
                if (settingGroup.note) {
                    if (typeof settingGroup.note === 'string') {
                        settingGroup.note = document.createTextNode(settingGroup.note);
                    }
                    $group.appendChild(settingGroup.note);
                }

                if (settingGroup.content) {
                    $group.appendChild(settingGroup.content);
                    continue;
                }

                if (!settingGroup.items) {
                    settingGroup.items = [];
                }

                for (const setting of settingGroup.items) {
                    if (!setting) {
                        continue;
                    }

                    const pref = setting.pref;

                    let $control;
                    if (setting.content) {
                        $control = setting.content;
                    } else if (!setting.unsupported) {
                        $control = toPrefElement(pref, setting.onChange, setting.params);

                        // Replace <select> with controller-friendly one
                        if ($control instanceof HTMLSelectElement && getPref(PrefKey.UI_CONTROLLER_FRIENDLY)) {
                            $control = BxSelectElement.wrap($control);
                        }
                    }

                    const label = Preferences.SETTINGS[pref as PrefKey]?.label || setting.label;
                    const note = Preferences.SETTINGS[pref as PrefKey]?.note || setting.note;

                    const $content = CE('div', {
                        class: 'bx-stream-settings-row',
                        'data-type': settingGroup.group,
                        'data-focus-container': 'true',
                    },
                        CE('label', {for: `bx_setting_${pref}`},
                            label,
                            note && CE('div', {'class': 'bx-stream-settings-dialog-note'}, note),
                            setting.unsupported && CE('div', {'class': 'bx-stream-settings-dialog-note'}, t('browser-unsupported-feature')),
                        ),
                        !setting.unsupported && $control,
                    );

                    $group.appendChild($content);

                    setting.onMounted && setting.onMounted($control);
                }
            }

            $settings.appendChild($group);
        }

        // Select first tab
        $tabs.firstElementChild!.dispatchEvent(new Event('click'));

        document.documentElement.appendChild($overlay);
        document.documentElement.appendChild($container);

        // Update video's settings
        onChangeVideoPlayerType();
    }
}
