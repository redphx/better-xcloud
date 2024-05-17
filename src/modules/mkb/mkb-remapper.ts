import { GamepadKey } from "./definitions";
import { CE, createButton, ButtonStyle } from "@utils/html";
import { t } from "@utils/translation";
import { Dialog } from "@modules/dialog";
import { getPref, setPref, PrefKey } from "@utils/preferences";
import { MkbPresetKey, GamepadKeyName } from "./definitions";
import { KeyHelper } from "./key-helper";
import { MkbPreset } from "./mkb-preset";
import { MkbHandler } from "./mkb-handler";
import { LocalDb } from "@utils/local-db";
import { BxIcon } from "@utils/bx-icon";
import { SettingElement } from "@utils/settings";
import type { MkbPresetData, MkbStoredPresets } from "@/types/mkb";


type MkbRemapperElements = {
    wrapper: HTMLElement | null;
    presetsSelect: HTMLSelectElement | null;
    activateButton: HTMLButtonElement | null;
    currentBindingKey: HTMLElement | null;

    allKeyElements: HTMLElement[];
    allMouseElements: {[key in MkbPresetKey]?: HTMLElement};
};

type MkbRemapperStates = {
    currentPresetId: number;
    presets: MkbStoredPresets;

    editingPresetData?: MkbPresetData | null;
    isEditing: boolean;
};

export class MkbRemapper {
    readonly #BUTTON_ORDERS = [
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

    static #instance: MkbRemapper;
    static get INSTANCE() {
        if (!MkbRemapper.#instance) {
            MkbRemapper.#instance = new MkbRemapper();
        }

        return MkbRemapper.#instance;
    };

    #STATE: MkbRemapperStates = {
        currentPresetId: 0,
        presets: {},

        editingPresetData: null,

        isEditing: false,
    };

    #$: MkbRemapperElements = {
        wrapper: null,
        presetsSelect: null,
        activateButton: null,

        currentBindingKey: null,

        allKeyElements: [],
        allMouseElements: {},
    };

    bindingDialog: Dialog;

    constructor() {
        this.#STATE.currentPresetId = getPref(PrefKey.MKB_DEFAULT_PRESET_ID);

        this.bindingDialog = new Dialog({
            className: 'bx-binding-dialog',
            content: CE('div', {},
                        CE('p', {}, t('press-to-bind')),
                        CE('i', {}, t('press-esc-to-cancel')),
                       ),
            hideCloseButton: true,
        });
    }

    #clearEventListeners = () => {
        window.removeEventListener('keydown', this.#onKeyDown);
        window.removeEventListener('mousedown', this.#onMouseDown);
        window.removeEventListener('wheel', this.#onWheel);
    };

    #bindKey = ($elm: HTMLElement, key: any) => {
        const buttonIndex = parseInt($elm.getAttribute('data-button-index')!);
        const keySlot = parseInt($elm.getAttribute('data-key-slot')!);

        // Ignore if bind the save key to the same element
        if ($elm.getAttribute('data-key-code') === key.code) {
            return;
        }

        // Unbind duplicated keys
        for (const $otherElm of this.#$.allKeyElements) {
            if ($otherElm.getAttribute('data-key-code') === key.code) {
                this.#unbindKey($otherElm);
            }
        }

        this.#STATE.editingPresetData!.mapping[buttonIndex][keySlot] = key.code;
        $elm.textContent = key.name;
        $elm.setAttribute('data-key-code', key.code);
    }

    #unbindKey = ($elm: HTMLElement) => {
        const buttonIndex = parseInt($elm.getAttribute('data-button-index')!);
        const keySlot = parseInt($elm.getAttribute('data-key-slot')!);

        // Remove key from preset
        this.#STATE.editingPresetData!.mapping[buttonIndex][keySlot] = null;
        $elm.textContent = '';
        $elm.removeAttribute('data-key-code');
    }

    #onWheel = (e: WheelEvent) => {
        e.preventDefault();
        this.#clearEventListeners();

        this.#bindKey(this.#$.currentBindingKey!, KeyHelper.getKeyFromEvent(e));
        window.setTimeout(() => this.bindingDialog.hide(), 200);
    };

    #onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        this.#clearEventListeners();

        this.#bindKey(this.#$.currentBindingKey!, KeyHelper.getKeyFromEvent(e));
        window.setTimeout(() => this.bindingDialog.hide(), 200);
    };

    #onKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.#clearEventListeners();

        if (e.code !== 'Escape') {
            this.#bindKey(this.#$.currentBindingKey!, KeyHelper.getKeyFromEvent(e));
        }

        window.setTimeout(() => this.bindingDialog.hide(), 200);
    };

    #onBindingKey = (e: MouseEvent) => {
        if (!this.#STATE.isEditing || e.button !== 0) {
            return;
        }

        console.log(e);

        this.#$.currentBindingKey = e.target as HTMLElement;

        window.addEventListener('keydown', this.#onKeyDown);
        window.addEventListener('mousedown', this.#onMouseDown);
        window.addEventListener('wheel', this.#onWheel);

        this.bindingDialog.show({title: this.#$.currentBindingKey.getAttribute('data-prompt')!});
    };

    #onContextMenu = (e: Event) => {
        e.preventDefault();
        if (!this.#STATE.isEditing) {
            return;
        }

        this.#unbindKey(e.target as HTMLElement);
    };

    #getPreset = (presetId: number) => {
        return this.#STATE.presets[presetId];
    }

    #getCurrentPreset = () => {
        return this.#getPreset(this.#STATE.currentPresetId);
    }

    #switchPreset = (presetId: number) => {
        this.#STATE.currentPresetId = presetId;
        const presetData = this.#getCurrentPreset().data;

        for (const $elm of this.#$.allKeyElements) {
            const buttonIndex = parseInt($elm.getAttribute('data-button-index')!);
            const keySlot = parseInt($elm.getAttribute('data-key-slot')!);

            const buttonKeys = presetData.mapping[buttonIndex];
            if (buttonKeys && buttonKeys[keySlot]) {
                $elm.textContent = KeyHelper.codeToKeyName(buttonKeys[keySlot]!);
                $elm.setAttribute('data-key-code', buttonKeys[keySlot]!);
            } else {
                $elm.textContent = '';
                $elm.removeAttribute('data-key-code');
            }
        }

        let key: MkbPresetKey;
        for (key in this.#$.allMouseElements) {
            const $elm = this.#$.allMouseElements[key]!;
            let value = presetData.mouse[key];
            if (typeof value === 'undefined') {
                value = MkbPreset.MOUSE_SETTINGS[key].default;
            }

            'setValue' in $elm && ($elm as any).setValue(value);
        }

        // Update state of Activate button
        const activated = getPref(PrefKey.MKB_DEFAULT_PRESET_ID) === this.#STATE.currentPresetId;
        this.#$.activateButton!.disabled = activated;
        this.#$.activateButton!.querySelector('span')!.textContent = activated ? t('activated') : t('activate');
    }

    #refresh() {
        // Clear presets select
        while (this.#$.presetsSelect!.firstChild) {
            this.#$.presetsSelect!.removeChild(this.#$.presetsSelect!.firstChild);
        }

        LocalDb.INSTANCE.getPresets().then(presets => {
            this.#STATE.presets = presets;
            const $fragment = document.createDocumentFragment();

            let defaultPresetId;
            if (this.#STATE.currentPresetId === 0) {
                this.#STATE.currentPresetId = parseInt(Object.keys(presets)[0]);

                defaultPresetId = this.#STATE.currentPresetId;
                setPref(PrefKey.MKB_DEFAULT_PRESET_ID, defaultPresetId);
                MkbHandler.INSTANCE.refreshPresetData();
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
                $options.selected = parseInt(id) === this.#STATE.currentPresetId;

                $fragment.appendChild($options);
            };

            this.#$.presetsSelect!.appendChild($fragment);

            // Update state of Activate button
            const activated = defaultPresetId === this.#STATE.currentPresetId;
            this.#$.activateButton!.disabled = activated;
            this.#$.activateButton!.querySelector('span')!.textContent = activated ? t('activated') : t('activate');

            !this.#STATE.isEditing && this.#switchPreset(this.#STATE.currentPresetId);
        });
    }

    #toggleEditing = (force?: boolean) => {
        this.#STATE.isEditing = typeof force !== 'undefined' ? force : !this.#STATE.isEditing;
        this.#$.wrapper!.classList.toggle('bx-editing', this.#STATE.isEditing);

        if (this.#STATE.isEditing) {
            this.#STATE.editingPresetData = structuredClone(this.#getCurrentPreset().data);
        } else {
            this.#STATE.editingPresetData = null;
        }


        const childElements = this.#$.wrapper!.querySelectorAll('select, button, input');
        for (const $elm of Array.from(childElements)) {
            if ($elm.parentElement!.parentElement!.classList.contains('bx-mkb-action-buttons')) {
                continue;
            }

            let disable = !this.#STATE.isEditing;

            if ($elm.parentElement!.classList.contains('bx-mkb-preset-tools')) {
                disable = !disable;
            }

            ($elm as HTMLButtonElement).disabled = disable;
        }
    }

    render() {
        this.#$.wrapper = CE('div', {'class': 'bx-mkb-settings'});

        this.#$.presetsSelect = CE<HTMLSelectElement>('select', {});
        this.#$.presetsSelect!.addEventListener('change', e => {
            this.#switchPreset(parseInt((e.target as HTMLSelectElement).value));
        });

        const promptNewName = (value?: string) => {
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

        const $header = CE('div', {'class': 'bx-mkb-preset-tools'},
                this.#$.presetsSelect,
                // Rename button
                createButton({
                    title: t('rename'),
                    icon: BxIcon.CURSOR_TEXT,
                    onClick: e => {
                        const preset = this.#getCurrentPreset();

                        let newName = promptNewName(preset.name);
                        if (!newName || newName === preset.name) {
                            return;
                        }

                        // Update preset with new name
                        preset.name = newName;
                        LocalDb.INSTANCE.updatePreset(preset).then(id => this.#refresh());
                    },
                }),

                // New button
                createButton({
                      icon: BxIcon.NEW,
                      title: t('new'),
                      onClick: e => {
                          let newName = promptNewName('');
                          if (!newName) {
                              return;
                          }

                          // Create new preset selected name
                          LocalDb.INSTANCE.newPreset(newName, MkbPreset.DEFAULT_PRESET).then(id => {
                              this.#STATE.currentPresetId = id;
                              this.#refresh();
                          });
                      },
                    }),

                // Copy button
                createButton({
                        icon: BxIcon.COPY,
                        title: t('copy'),
                        onClick: e => {
                            const preset = this.#getCurrentPreset();

                            let newName = promptNewName(`${preset.name} (2)`);
                            if (!newName) {
                                return;
                            }

                            // Create new preset selected name
                            LocalDb.INSTANCE.newPreset(newName, preset.data).then(id => {
                                this.#STATE.currentPresetId = id;
                                this.#refresh();
                            });
                        },
                    }),

                // Delete button
                createButton({
                        icon: BxIcon.TRASH,
                        style: ButtonStyle.DANGER,
                        title: t('delete'),
                        onClick: e => {
                            if (!confirm(t('confirm-delete-preset'))) {
                                return;
                            }

                            LocalDb.INSTANCE.deletePreset(this.#STATE.currentPresetId).then(id => {
                                this.#STATE.currentPresetId = 0;
                                this.#refresh();
                            });
                        },
                    }),
            );

        this.#$.wrapper!.appendChild($header);

        const $rows = CE('div', {'class': 'bx-mkb-settings-rows'},
                CE('i', {'class': 'bx-mkb-note'}, t('right-click-to-unbind')),
            );

        // Render keys
        const keysPerButton = 2;
        for (const buttonIndex of this.#BUTTON_ORDERS) {
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

                $elm.addEventListener('mouseup', this.#onBindingKey);
                $elm.addEventListener('contextmenu', this.#onContextMenu);

                $fragment.appendChild($elm);
                this.#$.allKeyElements.push($elm);
            }

            const $keyRow = CE('div', {'class': 'bx-mkb-key-row'},
                    CE('label', {'title': buttonName}, buttonPrompt),
                    $fragment,
                );

            $rows.appendChild($keyRow);
        }

        $rows.appendChild(CE('i', {'class': 'bx-mkb-note'}, t('mkb-adjust-ingame-settings')),);

        // Render mouse settings
        const $mouseSettings = document.createDocumentFragment();

        for (const key in MkbPreset.MOUSE_SETTINGS) {
            const setting = MkbPreset.MOUSE_SETTINGS[key];
            const value = setting.default;

            let $elm;
            const onChange = (e: Event, value: any) => {
                (this.#STATE.editingPresetData!.mouse as any)[key] = value;
            };
            const $row = CE('div', {'class': 'bx-quick-settings-row'},
                    CE('label', {'for': `bx_setting_${key}`}, setting.label),
                    $elm = SettingElement.render(setting.type, key, setting, value, onChange, setting.params),
                );

            $mouseSettings.appendChild($row);
            this.#$.allMouseElements[key as MkbPresetKey] = $elm;
        }

        $rows.appendChild($mouseSettings);
        this.#$.wrapper!.appendChild($rows);

        // Render action buttons
        const $actionButtons = CE('div', {'class': 'bx-mkb-action-buttons'},
                CE('div', {},
                   // Edit button
                   createButton({
                           label: t('edit'),
                           onClick: e => this.#toggleEditing(true),
                   }),

                   // Activate button
                   this.#$.activateButton = createButton({
                           label: t('activate'),
                           style: ButtonStyle.PRIMARY,
                           onClick: e => {
                               setPref(PrefKey.MKB_DEFAULT_PRESET_ID, this.#STATE.currentPresetId);
                               MkbHandler.INSTANCE.refreshPresetData();

                               this.#refresh();
                           },
                       }),
                ),

                CE('div', {},
                   // Cancel button
                   createButton({
                           label: t('cancel'),
                           style: ButtonStyle.GHOST,
                           onClick: e => {
                               // Restore preset
                               this.#switchPreset(this.#STATE.currentPresetId);
                               this.#toggleEditing(false);
                           },
                       }),

                   // Save button
                   createButton({
                           label: t('save'),
                           style: ButtonStyle.PRIMARY,
                           onClick: e => {
                               const updatedPreset = structuredClone(this.#getCurrentPreset());
                               updatedPreset.data = this.#STATE.editingPresetData as MkbPresetData;

                               LocalDb.INSTANCE.updatePreset(updatedPreset).then(id => {
                                   // If this is the default preset => refresh preset data
                                   if (id === getPref(PrefKey.MKB_DEFAULT_PRESET_ID)) {
                                       MkbHandler.INSTANCE.refreshPresetData();
                                   }

                                   this.#toggleEditing(false);
                                   this.#refresh();
                               });
                           },
                       }),
                ),
            );

        this.#$.wrapper!.appendChild($actionButtons);

        this.#toggleEditing(false);
        this.#refresh();
        return this.#$.wrapper;
    }
}
