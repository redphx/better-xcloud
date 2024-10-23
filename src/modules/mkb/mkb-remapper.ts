import { CE, createButton, ButtonStyle, removeChildElements } from "@utils/html";
import { t } from "@utils/translation";
import { Dialog } from "@modules/dialog";
import { KeyHelper } from "./key-helper";
import { MkbPreset } from "./mkb-preset";
import { EmulatedMkbHandler } from "./mkb-handler";
import { BxIcon } from "@utils/bx-icon";
import type { MkbPresetData, MkbStoredPresets } from "@/types/mkb";
import { MkbPresetKey, GamepadKey, GamepadKeyName } from "@enums/mkb";
import { deepClone } from "@utils/global";
import { SettingElement } from "@/utils/setting-element";
import { PrefKey } from "@/enums/pref-keys";
import { getPref, setPref } from "@/utils/settings-storages/global-settings-storage";
import { MkbPresetsDb } from "@/utils/local-db/mkb-presets-db";
import { BxLogger } from "@/utils/bx-logger";


type MkbRemapperStates = {
    currentPresetId: number;
    presets: MkbStoredPresets;

    editingPresetData?: MkbPresetData | null;
    isEditing: boolean;
};

export class MkbRemapper {
    private readonly BUTTON_ORDERS = [
        GamepadKey.UP,
        GamepadKey.DOWN,
        GamepadKey.LEFT,
        GamepadKey.RIGHT,

        GamepadKey.A,
        GamepadKey.B,
        GamepadKey.X,
        GamepadKey.Y,

        GamepadKey.LB,
        GamepadKey.RB,
        GamepadKey.LT,
        GamepadKey.RT,

        GamepadKey.SELECT,
        GamepadKey.START,
        GamepadKey.HOME,

        GamepadKey.L3,
        GamepadKey.LS_UP,
        GamepadKey.LS_DOWN,
        GamepadKey.LS_LEFT,
        GamepadKey.LS_RIGHT,

        GamepadKey.R3,
        GamepadKey.RS_UP,
        GamepadKey.RS_DOWN,
        GamepadKey.RS_LEFT,
        GamepadKey.RS_RIGHT,
    ];

    private static instance: MkbRemapper;
    public static getInstance = () => MkbRemapper.instance ?? (MkbRemapper.instance = new MkbRemapper());
    private readonly LOG_TAG = 'MkbRemapper';

    private states: MkbRemapperStates = {
        currentPresetId: 0,
        presets: {},
        editingPresetData: null,
        isEditing: false,
    };

    private $wrapper!: HTMLElement;
    private $presetsSelect!: HTMLSelectElement;
    private $activateButton!: HTMLButtonElement;

    private $currentBindingKey!: HTMLElement;

    private allKeyElements: HTMLElement[] = [];
    private allMouseElements: {[key in MkbPresetKey]?: HTMLElement} = {};

    bindingDialog: Dialog;

    private constructor() {
        BxLogger.info(this.LOG_TAG, 'constructor()');
        this.states.currentPresetId = getPref(PrefKey.MKB_DEFAULT_PRESET_ID);

        this.bindingDialog = new Dialog({
            className: 'bx-binding-dialog',
            content: CE('div', {},
                CE('p', {}, t('press-to-bind')),
                CE('i', {}, t('press-esc-to-cancel')),
            ),
            hideCloseButton: true,
        });
    }

    private clearEventListeners = () => {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('wheel', this.onWheel);
    };

    private bindKey = ($elm: HTMLElement, key: any) => {
        const buttonIndex = parseInt($elm.dataset.buttonIndex!);
        const keySlot = parseInt($elm.dataset.keySlot!);

        // Ignore if bind the save key to the same element
        if ($elm.dataset.keyCode! === key.code) {
            return;
        }

        // Unbind duplicated keys
        for (const $otherElm of this.allKeyElements) {
            if ($otherElm.dataset.keyCode === key.code) {
                this.unbindKey($otherElm);
            }
        }

        this.states.editingPresetData!.mapping[buttonIndex][keySlot] = key.code;
        $elm.textContent = key.name;
        $elm.dataset.keyCode = key.code;
    }

    private unbindKey = ($elm: HTMLElement) => {
        const buttonIndex = parseInt($elm.dataset.buttonIndex!);
        const keySlot = parseInt($elm.dataset.keySlot!);

        // Remove key from preset
        this.states.editingPresetData!.mapping[buttonIndex][keySlot] = null;
        $elm.textContent = '';
        delete $elm.dataset.keyCode;
    }

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();
        this.clearEventListeners();

        this.bindKey(this.$currentBindingKey!, KeyHelper.getKeyFromEvent(e));
        window.setTimeout(() => this.bindingDialog.hide(), 200);
    };

    private onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        this.clearEventListeners();

        this.bindKey(this.$currentBindingKey!, KeyHelper.getKeyFromEvent(e));
        window.setTimeout(() => this.bindingDialog.hide(), 200);
    };

    private onKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.clearEventListeners();

        if (e.code !== 'Escape') {
            this.bindKey(this.$currentBindingKey!, KeyHelper.getKeyFromEvent(e));
        }

        window.setTimeout(() => this.bindingDialog.hide(), 200);
    };

    private onBindingKey = (e: MouseEvent) => {
        if (!this.states.isEditing || e.button !== 0) {
            return;
        }

        console.log(e);

        this.$currentBindingKey = e.target as HTMLElement;

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('wheel', this.onWheel);

        this.bindingDialog.show({title: this.$currentBindingKey.dataset.prompt!});
    };

    private onContextMenu = (e: Event) => {
        e.preventDefault();
        if (!this.states.isEditing) {
            return;
        }

        this.unbindKey(e.target as HTMLElement);
    };

    private getPreset = (presetId: number) => {
        return this.states.presets[presetId];
    }

    private getCurrentPreset = () => {
        let preset = this.getPreset(this.states.currentPresetId);
        if (!preset) {
            // Get the first preset in the list
            const firstPresetId = parseInt(Object.keys(this.states.presets)[0]);
            preset = this.states.presets[firstPresetId];
            this.states.currentPresetId = firstPresetId;
            setPref(PrefKey.MKB_DEFAULT_PRESET_ID, firstPresetId);
        }

        return preset;
    }

    private switchPreset = (presetId: number) => {
        this.states.currentPresetId = presetId;
        const presetData = this.getCurrentPreset().data;

        for (const $elm of this.allKeyElements) {
            const buttonIndex = parseInt($elm.dataset.buttonIndex!);
            const keySlot = parseInt($elm.dataset.keySlot!);

            const buttonKeys = presetData.mapping[buttonIndex];
            if (buttonKeys && buttonKeys[keySlot]) {
                $elm.textContent = KeyHelper.codeToKeyName(buttonKeys[keySlot]!);
                $elm.dataset.keyCode = buttonKeys[keySlot]!;
            } else {
                $elm.textContent = '';
                delete $elm.dataset.keyCode;
            }
        }

        let key: MkbPresetKey;
        for (key in this.allMouseElements) {
            const $elm = this.allMouseElements[key]!;
            let value = presetData.mouse[key];
            if (typeof value === 'undefined') {
                value = MkbPreset.MOUSE_SETTINGS[key].default;
            }

            'setValue' in $elm && ($elm as any).setValue(value);
        }

        // Update state of Activate button
        const activated = getPref(PrefKey.MKB_DEFAULT_PRESET_ID) === this.states.currentPresetId;
        this.$activateButton.disabled = activated;
        this.$activateButton.querySelector('span')!.textContent = activated ? t('activated') : t('activate');
    }

    private async refresh() {
        // Clear presets select
        removeChildElements(this.$presetsSelect);

        const presets = await MkbPresetsDb.getInstance().getPresets();

        this.states.presets = presets;
        const fragment = document.createDocumentFragment();

        let defaultPresetId;
        if (this.states.currentPresetId === 0) {
            this.states.currentPresetId = parseInt(Object.keys(presets)[0]);

            defaultPresetId = this.states.currentPresetId;
            setPref(PrefKey.MKB_DEFAULT_PRESET_ID, defaultPresetId);
            EmulatedMkbHandler.getInstance().refreshPresetData();
        } else {
            defaultPresetId = getPref(PrefKey.MKB_DEFAULT_PRESET_ID);
        }

        for (let id in presets) {
            const preset = presets[id];
            let name = preset.name;
            if (id === defaultPresetId) {
                name = `🎮 ` + name;
            }

            const $options = CE<HTMLOptionElement>('option', {value: id}, name);
            $options.selected = parseInt(id) === this.states.currentPresetId;

            fragment.appendChild($options);
        };

        this.$presetsSelect.appendChild(fragment);

        // Update state of Activate button
        const activated = defaultPresetId === this.states.currentPresetId;
        this.$activateButton.disabled = activated;
        this.$activateButton.querySelector('span')!.textContent = activated ? t('activated') : t('activate');

        !this.states.isEditing && this.switchPreset(this.states.currentPresetId);
    }

    private toggleEditing = (force?: boolean) => {
        this.states.isEditing = typeof force !== 'undefined' ? force : !this.states.isEditing;
        this.$wrapper.classList.toggle('bx-editing', this.states.isEditing);

        if (this.states.isEditing) {
            this.states.editingPresetData = deepClone(this.getCurrentPreset().data);
        } else {
            this.states.editingPresetData = null;
        }


        const childElements = this.$wrapper.querySelectorAll('select, button, input');
        for (const $elm of Array.from(childElements)) {
            if ($elm.parentElement!.parentElement!.classList.contains('bx-mkb-action-buttons')) {
                continue;
            }

            let disable = !this.states.isEditing;

            if ($elm.parentElement!.classList.contains('bx-mkb-preset-tools')) {
                disable = !disable;
            }

            ($elm as HTMLButtonElement).disabled = disable;
        }
    }

    render() {
        this.$wrapper = CE('div', {class: 'bx-mkb-settings'});

        this.$presetsSelect = CE<HTMLSelectElement>('select', {tabindex: -1});
        this.$presetsSelect.addEventListener('change', e => {
            this.switchPreset(parseInt((e.target as HTMLSelectElement).value));
        });

        const promptNewName = (value: string) => {
            let newName: string | null = '';
            while (!newName) {
                newName = prompt(t('prompt-preset-name'), value);
                if (newName === null) {
                    return false;
                }
                newName = newName.trim();
            }

            return newName ? newName : false;
        };

        const $header = CE('div', {class: 'bx-mkb-preset-tools'},
            this.$presetsSelect,
            // Rename button
            createButton({
                title: t('rename'),
                icon: BxIcon.CURSOR_TEXT,
                tabIndex: -1,
                onClick: async () => {
                    const preset = this.getCurrentPreset();

                    let newName = promptNewName(preset.name);
                    if (!newName || newName === preset.name) {
                        return;
                    }

                    // Update preset with new name
                    preset.name = newName;

                    await MkbPresetsDb.getInstance().updatePreset(preset);
                    await this.refresh();
                },
            }),

            // New button
            createButton({
                icon: BxIcon.NEW,
                title: t('new'),
                tabIndex: -1,
                onClick: e => {
                    let newName = promptNewName('');
                    if (!newName) {
                        return;
                    }

                    // Create new preset selected name
                    MkbPresetsDb.getInstance().newPreset(newName, MkbPreset.DEFAULT_PRESET).then(id => {
                        this.states.currentPresetId = id;
                        this.refresh();
                    });
                },
            }),

            // Copy button
            createButton({
                icon: BxIcon.COPY,
                title: t('copy'),
                tabIndex: -1,
                onClick: e => {
                    const preset = this.getCurrentPreset();

                    let newName = promptNewName(`${preset.name} (2)`);
                    if (!newName) {
                        return;
                    }

                    // Create new preset selected name
                    MkbPresetsDb.getInstance().newPreset(newName, preset.data).then(id => {
                        this.states.currentPresetId = id;
                        this.refresh();
                    });
                },
            }),

            // Delete button
            createButton({
                icon: BxIcon.TRASH,
                style: ButtonStyle.DANGER,
                title: t('delete'),
                tabIndex: -1,
                onClick: e => {
                    if (!confirm(t('confirm-delete-preset'))) {
                        return;
                    }

                    MkbPresetsDb.getInstance().deletePreset(this.states.currentPresetId).then(id => {
                        this.states.currentPresetId = 0;
                        this.refresh();
                    });
                },
            }),
        );

        this.$wrapper.appendChild($header);

        const $rows = CE('div', {class: 'bx-mkb-settings-rows'},
                CE('i', {class: 'bx-mkb-note'}, t('right-click-to-unbind')),
            );

        // Render keys
        const keysPerButton = 2;
        for (const buttonIndex of this.BUTTON_ORDERS) {
            const [buttonName, buttonPrompt] = GamepadKeyName[buttonIndex];

            let $elm;
            const $fragment = document.createDocumentFragment();
            for (let i = 0; i < keysPerButton; i++) {
                $elm = CE('button', {
                    type: 'button',
                    'data-prompt': buttonPrompt,
                    'data-button-index': buttonIndex,
                    'data-key-slot': i,
                }, ' ');

                $elm.addEventListener('mouseup', this.onBindingKey);
                $elm.addEventListener('contextmenu', this.onContextMenu);

                $fragment.appendChild($elm);
                this.allKeyElements.push($elm);
            }

            const $keyRow = CE('div', {class: 'bx-mkb-key-row'},
                CE('label', {title: buttonName}, buttonPrompt),
                $fragment,
            );

            $rows.appendChild($keyRow);
        }

        $rows.appendChild(CE('i', {class: 'bx-mkb-note'}, t('mkb-adjust-ingame-settings')),);

        // Render mouse settings
        const $mouseSettings = document.createDocumentFragment();

        for (const key in MkbPreset.MOUSE_SETTINGS) {
            const setting = MkbPreset.MOUSE_SETTINGS[key];
            const value = setting.default;

            let $elm;
            const onChange = (e: Event, value: any) => {
                (this.states.editingPresetData!.mouse as any)[key] = value;
            };
            const $row = CE('label', {
                class: 'bx-settings-row',
                for: `bx_setting_${key}`
            },
                CE('span', {class: 'bx-settings-label'}, setting.label),
                $elm = SettingElement.render(setting.type, key, setting, value, onChange, setting.params),
            );

            $mouseSettings.appendChild($row);
            this.allMouseElements[key as MkbPresetKey] = $elm;
        }

        $rows.appendChild($mouseSettings);
        this.$wrapper.appendChild($rows);

        // Render action buttons
        const $actionButtons = CE('div', {class: 'bx-mkb-action-buttons'},
            CE('div', {},
                // Edit button
                createButton({
                    label: t('edit'),
                    tabIndex: -1,
                    onClick: e => this.toggleEditing(true),
                }),

                // Activate button
                this.$activateButton = createButton({
                    label: t('activate'),
                    style: ButtonStyle.PRIMARY,
                    tabIndex: -1,
                    onClick: e => {
                        setPref(PrefKey.MKB_DEFAULT_PRESET_ID, this.states.currentPresetId);
                        EmulatedMkbHandler.getInstance().refreshPresetData();

                        this.refresh();
                    },
                }),
            ),

            CE('div', {},
                // Cancel button
                createButton({
                    label: t('cancel'),
                    style: ButtonStyle.GHOST,
                    tabIndex: -1,
                    onClick: e => {
                        // Restore preset
                        this.switchPreset(this.states.currentPresetId);
                        this.toggleEditing(false);
                    },
                }),

                // Save button
                createButton({
                    label: t('save'),
                    style: ButtonStyle.PRIMARY,
                    tabIndex: -1,
                    onClick: e => {
                        const updatedPreset = deepClone(this.getCurrentPreset());
                        updatedPreset.data = this.states.editingPresetData as MkbPresetData;

                        MkbPresetsDb.getInstance().updatePreset(updatedPreset).then(id => {
                            // If this is the default preset => refresh preset data
                            if (id === getPref(PrefKey.MKB_DEFAULT_PRESET_ID)) {
                                EmulatedMkbHandler.getInstance().refreshPresetData();
                            }

                            this.toggleEditing(false);
                            this.refresh();
                        });
                    },
                }),
            ),
        );

        this.$wrapper.appendChild($actionButtons);

        this.toggleEditing(false);
        this.refresh();
        return this.$wrapper;
    }
}
