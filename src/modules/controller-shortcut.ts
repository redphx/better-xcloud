import { Screenshot } from "@utils/screenshot";
import { GamepadKey } from "@enums/mkb";
import { PrompFont } from "@enums/prompt-font";
import { CE, removeChildElements } from "@utils/html";
import { t } from "@utils/translation";
import { EmulatedMkbHandler } from "./mkb/mkb-handler";
import { StreamStats } from "./stream/stream-stats";
import { MicrophoneShortcut } from "./shortcuts/shortcut-microphone";
import { StreamUiShortcut } from "./shortcuts/shortcut-stream-ui";
import { SoundShortcut } from "./shortcuts/shortcut-sound";
import { BxEvent } from "@/utils/bx-event";
import { AppInterface } from "@/utils/global";
import { BxSelectElement } from "@/web-components/bx-select";
import { setNearby } from "@/utils/navigation-utils";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { SettingsNavigationDialog } from "./ui/dialog/settings-dialog";

const enum ShortcutAction {
    BETTER_XCLOUD_SETTINGS_SHOW = 'bx-settings-show',

    STREAM_SCREENSHOT_CAPTURE = 'stream-screenshot-capture',

    STREAM_MENU_SHOW = 'stream-menu-show',
    STREAM_STATS_TOGGLE = 'stream-stats-toggle',
    STREAM_SOUND_TOGGLE = 'stream-sound-toggle',
    STREAM_MICROPHONE_TOGGLE = 'stream-microphone-toggle',

    STREAM_VOLUME_INC = 'stream-volume-inc',
    STREAM_VOLUME_DEC = 'stream-volume-dec',

    DEVICE_SOUND_TOGGLE = 'device-sound-toggle',
    DEVICE_VOLUME_INC = 'device-volume-inc',
    DEVICE_VOLUME_DEC = 'device-volume-dec',

    DEVICE_BRIGHTNESS_INC = 'device-brightness-inc',
    DEVICE_BRIGHTNESS_DEC = 'device-brightness-dec',
}

export class ControllerShortcut {
    static readonly #STORAGE_KEY = 'better_xcloud_controller_shortcuts';

    static #buttonsCache: {[key: string]: boolean[]} = {};
    static #buttonsStatus: {[key: string]: boolean[]} = {};

    static #$selectProfile: HTMLSelectElement;
    static #$selectActions: Partial<{[key in GamepadKey]: HTMLSelectElement}> = {};
    static #$container: HTMLElement;

    static #ACTIONS: {[key: string]: (ShortcutAction | null)[]} | null = null;

    static reset(index: number) {
        ControllerShortcut.#buttonsCache[index] = [];
        ControllerShortcut.#buttonsStatus[index] = [];
    }

    static handle(gamepad: Gamepad): boolean {
        if (!ControllerShortcut.#ACTIONS) {
            ControllerShortcut.#ACTIONS = ControllerShortcut.#getActionsFromStorage();
        }

        const gamepadIndex = gamepad.index;
        const actions = ControllerShortcut.#ACTIONS![gamepad.id];
        if (!actions) {
            return false;
        }

        // Move the buttons status from the previous frame to the cache
        ControllerShortcut.#buttonsCache[gamepadIndex] = ControllerShortcut.#buttonsStatus[gamepadIndex].slice(0);
        // Clear the buttons status
        ControllerShortcut.#buttonsStatus[gamepadIndex] = [];

        const pressed: boolean[] = [];
        let otherButtonPressed = false;

        gamepad.buttons.forEach((button, index) => {
            // Only add the newly pressed button to the array (holding doesn't count)
            if (button.pressed && index !== GamepadKey.HOME) {
                otherButtonPressed = true;
                pressed[index] = true;

                // If this is newly pressed button -> run action
                if (actions[index] && !ControllerShortcut.#buttonsCache[gamepadIndex][index]) {
                    setTimeout(() => ControllerShortcut.#runAction(actions[index]!), 0);
                }
            }
        });

        ControllerShortcut.#buttonsStatus[gamepadIndex] = pressed;
        return otherButtonPressed;
    }

    static #runAction(action: ShortcutAction) {
        switch (action) {
            case ShortcutAction.BETTER_XCLOUD_SETTINGS_SHOW:
                SettingsNavigationDialog.getInstance().show();
                break;

            case ShortcutAction.STREAM_SCREENSHOT_CAPTURE:
                Screenshot.takeScreenshot();
                break;

            case ShortcutAction.STREAM_STATS_TOGGLE:
                StreamStats.getInstance().toggle();
                break;

            case ShortcutAction.STREAM_MICROPHONE_TOGGLE:
                MicrophoneShortcut.toggle();
                break;

            case ShortcutAction.STREAM_MENU_SHOW:
                StreamUiShortcut.showHideStreamMenu();
                break;

            case ShortcutAction.STREAM_SOUND_TOGGLE:
                SoundShortcut.muteUnmute();
                break;

            case ShortcutAction.STREAM_VOLUME_INC:
                SoundShortcut.adjustGainNodeVolume(10);
                break;

            case ShortcutAction.STREAM_VOLUME_DEC:
                SoundShortcut.adjustGainNodeVolume(-10);
                break;

            case ShortcutAction.DEVICE_BRIGHTNESS_INC:
            case ShortcutAction.DEVICE_BRIGHTNESS_DEC:
            case ShortcutAction.DEVICE_SOUND_TOGGLE:
            case ShortcutAction.DEVICE_VOLUME_INC:
            case ShortcutAction.DEVICE_VOLUME_DEC:
                AppInterface && AppInterface.runShortcut && AppInterface.runShortcut(action);
                break;
        }
    }

    static #updateAction(profile: string, button: GamepadKey, action: ShortcutAction | null) {
        const actions = ControllerShortcut.#ACTIONS!;
        if (!(profile in actions)) {
            actions[profile] = [];
        }

        if (!action) {
            action = null;
        }

        actions[profile][button] = action;

        // Remove empty profiles
        for (const key in ControllerShortcut.#ACTIONS) {
            let empty = true;
            for (const value of ControllerShortcut.#ACTIONS[key]) {
                if (!!value) {
                    empty = false;
                    break;
                }
            }

            if (empty) {
                delete ControllerShortcut.#ACTIONS[key];
            }
        }

        // Save to storage
        window.localStorage.setItem(ControllerShortcut.#STORAGE_KEY, JSON.stringify(ControllerShortcut.#ACTIONS));

        console.log(ControllerShortcut.#ACTIONS);
    }

    static #updateProfileList(e?: GamepadEvent) {
        const $select = ControllerShortcut.#$selectProfile;
        const $container = ControllerShortcut.#$container;

        const $fragment = document.createDocumentFragment();

        // Remove old profiles
        removeChildElements($select);

        const gamepads = navigator.getGamepads();
        let hasGamepad = false;

        for (const gamepad of gamepads) {
            if (!gamepad || !gamepad.connected) {
                continue;
            }

            // Ignore emulated gamepad
            if (gamepad.id === EmulatedMkbHandler.VIRTUAL_GAMEPAD_ID) {
                continue;
            }

            hasGamepad = true;

            const $option = CE<HTMLOptionElement>('option', {value: gamepad.id}, gamepad.id);
            $fragment.appendChild($option);
        }

        $container.dataset.hasGamepad = hasGamepad.toString();
        if (hasGamepad) {
            $select.appendChild($fragment);

            $select.selectedIndex = 0;
            $select.dispatchEvent(new Event('input'));
        }

    }

    static #switchProfile(profile: string) {
        let actions = ControllerShortcut.#ACTIONS![profile];
        if (!actions) {
            actions = [];
        }

        // Reset selects' values
        let button: any;
        for (button in ControllerShortcut.#$selectActions) {
            const $select = ControllerShortcut.#$selectActions[button as GamepadKey]!;
            $select.value = actions[button] || '';

            BxEvent.dispatch($select, 'input', {
                ignoreOnChange: true,
                manualTrigger: true,
            });
        }
    }

    static #getActionsFromStorage() {
        return JSON.parse(window.localStorage.getItem(ControllerShortcut.#STORAGE_KEY) || '{}');
    }

    static renderSettings() {
        const PREF_CONTROLLER_FRIENDLY_UI = getPref(PrefKey.UI_CONTROLLER_FRIENDLY);

        // Read actions from localStorage
        ControllerShortcut.#ACTIONS = ControllerShortcut.#getActionsFromStorage();

        const buttons: Map<GamepadKey, PrompFont> = new Map();
        buttons.set(GamepadKey.Y, PrompFont.Y);
        buttons.set(GamepadKey.A, PrompFont.A);
        buttons.set(GamepadKey.B, PrompFont.B);
        buttons.set(GamepadKey.X, PrompFont.X);

        buttons.set(GamepadKey.UP, PrompFont.UP);
        buttons.set(GamepadKey.DOWN, PrompFont.DOWN);
        buttons.set(GamepadKey.LEFT, PrompFont.LEFT);
        buttons.set(GamepadKey.RIGHT, PrompFont.RIGHT);

        buttons.set(GamepadKey.SELECT, PrompFont.SELECT);
        buttons.set(GamepadKey.START, PrompFont.START);

        buttons.set(GamepadKey.LB, PrompFont.LB);
        buttons.set(GamepadKey.RB, PrompFont.RB);

        buttons.set(GamepadKey.LT, PrompFont.LT);
        buttons.set(GamepadKey.RT, PrompFont.RT);

        buttons.set(GamepadKey.L3, PrompFont.L3);
        buttons.set(GamepadKey.R3, PrompFont.R3);

        const actions: {[key: string]: Partial<{[key in ShortcutAction]: string | string[]}>} = {
            [t('better-xcloud')]: {
                [ShortcutAction.BETTER_XCLOUD_SETTINGS_SHOW]: [t('settings'), t('show')],
            },

            [t('device')]: AppInterface && {
                [ShortcutAction.DEVICE_SOUND_TOGGLE]: [t('sound'), t('toggle')],
                [ShortcutAction.DEVICE_VOLUME_INC]: [t('volume'), t('increase')],
                [ShortcutAction.DEVICE_VOLUME_DEC]: [t('volume'), t('decrease')],

                [ShortcutAction.DEVICE_BRIGHTNESS_INC]: [t('brightness'), t('increase')],
                [ShortcutAction.DEVICE_BRIGHTNESS_DEC]: [t('brightness'), t('decrease')],
            },

            [t('stream')]: {
                [ShortcutAction.STREAM_SCREENSHOT_CAPTURE]: t('take-screenshot'),

                [ShortcutAction.STREAM_SOUND_TOGGLE]: [t('sound'), t('toggle')],
                [ShortcutAction.STREAM_VOLUME_INC]: getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && [t('volume'), t('increase')],
                [ShortcutAction.STREAM_VOLUME_DEC]: getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && [t('volume'), t('decrease')],

                [ShortcutAction.STREAM_MENU_SHOW]: [t('menu'), t('show')],
                [ShortcutAction.STREAM_STATS_TOGGLE]: [t('stats'), t('show-hide')],
                [ShortcutAction.STREAM_MICROPHONE_TOGGLE]: [t('microphone'), t('toggle')],
            },
        };

        const $baseSelect = CE<HTMLSelectElement>('select', {autocomplete: 'off'}, CE('option', {value: ''}, '---'));
        for (const groupLabel in actions) {
            const items = actions[groupLabel];
            if (!items) {
                continue;
            }

            const $optGroup = CE<HTMLOptGroupElement>('optgroup', {'label': groupLabel});

            for (const action in items) {
                let label = items[action as keyof typeof items];
                if (!label) {
                    continue;
                }

                if (Array.isArray(label)) {
                    label = label.join(' ❯ ');
                }

                const $option = CE<HTMLOptionElement>('option', {value: action}, label);
                $optGroup.appendChild($option);
            }

            $baseSelect.appendChild($optGroup);
        }

        let $remap: HTMLElement;
        const $selectProfile = CE<HTMLSelectElement>('select', {class: 'bx-shortcut-profile', autocomplete: 'off'});

        const $profile = PREF_CONTROLLER_FRIENDLY_UI ? BxSelectElement.wrap($selectProfile) : $selectProfile;
        $profile.classList.add('bx-full-width');

        const $container = CE('div', {
            'data-has-gamepad': 'false',
            _nearby: {
                focus: $profile,
            },
        },
            CE('div', {},
                CE('p', {class: 'bx-shortcut-note'}, t('controller-shortcuts-connect-note')),
            ),

            $remap = CE('div', {},
                CE('div', {
                    _nearby: {
                        focus: $profile,
                    },
                }, $profile),
                CE('p', {class: 'bx-shortcut-note'},
                    CE('span', {class: 'bx-prompt'}, PrompFont.HOME),
                    ': ' + t('controller-shortcuts-xbox-note'),
                ),
            ),
        );

        $selectProfile.addEventListener('input', e => {
            ControllerShortcut.#switchProfile($selectProfile.value);
        });

        const onActionChanged = (e: Event) => {
            const $target = e.target as HTMLSelectElement;

            const profile = $selectProfile.value;
            const button: unknown = $target.dataset.button;
            const action = $target.value as ShortcutAction;

            if (!PREF_CONTROLLER_FRIENDLY_UI) {
                const $fakeSelect = $target.previousElementSibling! as HTMLSelectElement;
                let fakeText = '---';
                if (action) {
                    const $selectedOption =  $target.options[$target.selectedIndex];
                    const $optGroup = $selectedOption.parentElement as HTMLOptGroupElement;
                    fakeText = $optGroup.label + ' ❯ ' + $selectedOption.text;
                }
                ($fakeSelect.firstElementChild as HTMLOptionElement).text = fakeText;
            }

            !(e as any).ignoreOnChange && ControllerShortcut.#updateAction(profile, button as GamepadKey, action);
        };


        // @ts-ignore
        for (const [button, prompt] of buttons) {
            const $row = CE('div', {
                class: 'bx-shortcut-row',
            });

            const $label = CE('label', {class: 'bx-prompt'}, `${PrompFont.HOME} + ${prompt}`);

            const $div = CE('div', {class: 'bx-shortcut-actions'});

            if (!PREF_CONTROLLER_FRIENDLY_UI) {
                const $fakeSelect = CE<HTMLSelectElement>('select', {autocomplete: 'off'},
                    CE('option', {}, '---'),
                );

                $div.appendChild($fakeSelect);
            }

            const $select = $baseSelect.cloneNode(true) as HTMLSelectElement;
            $select.dataset.button = button.toString();
            $select.addEventListener('input', onActionChanged);

            ControllerShortcut.#$selectActions[button] = $select;

            if (PREF_CONTROLLER_FRIENDLY_UI) {
                const $bxSelect = BxSelectElement.wrap($select);
                $bxSelect.classList.add('bx-full-width');

                $div.appendChild($bxSelect);
                setNearby($row, {
                    focus: $bxSelect,
                });
            } else {
                $div.appendChild($select);
                setNearby($row, {
                    focus: $select,
                });
            }

            $row.appendChild($label);
            $row.appendChild($div);

            $remap.appendChild($row);
        }

        $container.appendChild($remap);

        ControllerShortcut.#$selectProfile = $selectProfile;
        ControllerShortcut.#$container = $container;

        // Detect when gamepad connected/disconnect
        window.addEventListener('gamepadconnected', ControllerShortcut.#updateProfileList);
        window.addEventListener('gamepaddisconnected', ControllerShortcut.#updateProfileList);

        ControllerShortcut.#updateProfileList();

        return $container;
    }
}
