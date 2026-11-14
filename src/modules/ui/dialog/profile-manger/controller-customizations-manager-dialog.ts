import type { ControllerCustomizationPresetData, ControllerCustomizationPresetRecord } from "@/types/presets";
import { BaseProfileManagerDialog } from "./base-profile-manager-dialog";
import { ControllerCustomizationsTable } from "@/utils/local-db/controller-customizations-table";
import { t } from "@/utils/translation";
import { GamepadKey, GamepadKeyName } from "@/enums/gamepad";
import { ButtonStyle, CE, createButton, createSettingRow } from "@/utils/html";
import { BxSelectElement } from "@/web-components/bx-select";
import { GlobalPref } from "@/enums/pref-keys";
import { getGlobalPref } from "@/utils/pref-utils";
import { BxEvent } from "@/utils/bx-event";
import { deepClone } from "@/utils/global";
import { StreamSettings } from "@/utils/stream-settings";
import { BxDualNumberStepper } from "@/web-components/bx-dual-number-stepper";
import { NavigationDirection, type NavigationElement } from "../navigation-dialog";
import { setNearby } from "@/utils/navigation-utils";
import type { DualNumberStepperParams } from "@/types/setting-definition";
import { BxNumberStepper } from "@/web-components/bx-number-stepper";
import { getGamepadPrompt } from "@/utils/gamepad";

export class ControllerCustomizationsManagerDialog extends BaseProfileManagerDialog<ControllerCustomizationPresetRecord> {
    private static instance: ControllerCustomizationsManagerDialog;
    public static getInstance = () => ControllerCustomizationsManagerDialog.instance ?? (ControllerCustomizationsManagerDialog.instance = new ControllerCustomizationsManagerDialog(t('controller-customization')));

    declare protected $content: HTMLElement;
    private $vibrationIntensity!: BxNumberStepper;
    private $leftTriggerRange!: BxDualNumberStepper;
    private $rightTriggerRange!: BxDualNumberStepper;
    private $leftStickDeadzone!: BxDualNumberStepper;
    private $rightStickDeadzone!: BxDualNumberStepper;
    private $btnDetect!: HTMLButtonElement;
    private $hintMapping!: HTMLElement;

    private selectsMap: PartialRecord<GamepadKey, HTMLSelectElement> = {};
    private selectsOrder: GamepadKey[] = [];

    private isDetectingButton: boolean = false;
    private detectIntervalId: number | null = null;

    static readonly BUTTONS_ORDER = [
        GamepadKey.A, GamepadKey.B,
        GamepadKey.X, GamepadKey.Y,

        GamepadKey.UP, GamepadKey.RIGHT,
        GamepadKey.DOWN, GamepadKey.LEFT,

        GamepadKey.LB, GamepadKey.RB,
        GamepadKey.LT, GamepadKey.RT,

        GamepadKey.L3, GamepadKey.R3,
        GamepadKey.LS, GamepadKey.RS,

        GamepadKey.SELECT, GamepadKey.START,
        GamepadKey.SHARE,
    ];

    constructor(title: string) {
        super(title, ControllerCustomizationsTable.getInstance());
        this.render();
    }

    private render() {
        const isControllerFriendly = getGlobalPref(GlobalPref.UI_CONTROLLER_FRIENDLY);
        const $rows = CE('div', { class: 'bx-buttons-grid' });

        const $baseSelect = CE('select', { class: 'bx-full-width' },
            CE('option', { value: '' }, '---'),
            CE('option', { value: 'false', _dataset: { label: '🚫' } }, isControllerFriendly ? '🚫' : t('off')),
        );
        const $baseButtonSelect = $baseSelect.cloneNode(true);
        const $baseStickSelect = $baseSelect.cloneNode(true);

        const onButtonChanged = (e: Event) => {
            // Update preset
            if (!(e as any).ignoreOnChange) {
                this.updatePreset();
            }
        };

        const boundUpdatePreset = this.updatePreset.bind(this);

        for (const gamepadKey of ControllerCustomizationsManagerDialog.BUTTONS_ORDER) {
            if (gamepadKey === GamepadKey.SHARE) {
                continue;
            }

            const name = GamepadKeyName[gamepadKey][isControllerFriendly ? 1 : 0];
            const $target = (gamepadKey === GamepadKey.LS || gamepadKey === GamepadKey.RS) ? $baseStickSelect : $baseButtonSelect;
            $target.appendChild(CE('option', {
                value: gamepadKey,
                _dataset: { label: GamepadKeyName[gamepadKey][1] },
            }, name));
        }

        for (const gamepadKey of ControllerCustomizationsManagerDialog.BUTTONS_ORDER) {
            const [buttonName, buttonPrompt] = GamepadKeyName[gamepadKey];
            const $sourceSelect = (gamepadKey === GamepadKey.LS || gamepadKey === GamepadKey.RS) ? $baseStickSelect : $baseButtonSelect;

            // Remove current button from selection
            const $clonedSelect = $sourceSelect.cloneNode(true) as HTMLSelectElement;
            $clonedSelect.querySelector(`option[value="${gamepadKey}"]`)?.remove();

            const $select = BxSelectElement.create($clonedSelect);
            $select.dataset.index = gamepadKey.toString();
            $select.addEventListener('input', onButtonChanged);

            this.selectsMap[gamepadKey] = $select;
            this.selectsOrder.push(gamepadKey);

            const $row = CE('div', {
                class: 'bx-controller-key-row',
                _nearby: { orientation: 'horizontal' },
            },
                CE('label', { title: buttonName }, buttonPrompt),
                $select,
            );

            $rows.append($row);
        }

        // Map nearby elenemts for controller-friendly UI
        if (getGlobalPref(GlobalPref.UI_CONTROLLER_FRIENDLY)) {
            for (let i = 0; i < this.selectsOrder.length; i++) {
                const $select = this.selectsMap[this.selectsOrder[i] as unknown as GamepadKey] as NavigationElement;
                const directions = {
                    [NavigationDirection.UP]: i - 2,
                    [NavigationDirection.DOWN]: i + 2,
                    [NavigationDirection.LEFT]: i - 1,
                    [NavigationDirection.RIGHT]: i + 1,
                };

                for (const dir in directions) {
                    const idx = directions[dir as unknown as NavigationDirection];
                    if (typeof this.selectsOrder[idx] === 'undefined') {
                        continue;
                    }

                    const $targetSelect = this.selectsMap[this.selectsOrder[idx] as unknown as GamepadKey];
                    setNearby($select, {
                        [dir]: $targetSelect,
                    });
                }
            }
        }

        const blankSettings = this.presetsDb.BLANK_PRESET_DATA.settings;
        const params: DualNumberStepperParams = {
            min: 0,
            minDiff: 1,
            max: 100,

            steps: 1,
        };
        this.$content = CE('div', { class: 'bx-controller-customizations-container' },
            // Detect button
            this.$btnDetect = createButton({
                label: t('detect-controller-button'),
                classes: ['bx-btn-detect'],
                style: ButtonStyle.NORMAL_CASE | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
                onClick: () => {
                    this.startDetectingButton();
                },
            }),

            // Mapping hint
            this.$hintMapping = CE('div', { class: 'bx-settings-dialog-note' }, 'ⓘ ' + t('controller-customization-hint')),

            // Mapping
            $rows,

            // Vibration intensity
            createSettingRow(t('vibration-intensity'),
                this.$vibrationIntensity = BxNumberStepper.create('controller_vibration_intensity', 50, 0, 100, {
                    steps: 10,
                    suffix: '%',
                    exactTicks: 20,
                    customTextValue: (value: any) => {
                        value = parseInt(value);
                        return value === 0 ? t('off') : value + '%';
                    },
                }, boundUpdatePreset),
            ),

            // Range settings
            createSettingRow(t('left-trigger-range'),
                this.$leftTriggerRange = BxDualNumberStepper.create('left-trigger-range', blankSettings.leftTriggerRange!, params, boundUpdatePreset),
            ),

            createSettingRow(t('right-trigger-range'),
                this.$rightTriggerRange = BxDualNumberStepper.create('right-trigger-range', blankSettings.rightTriggerRange!, params, boundUpdatePreset),
            ),

            createSettingRow(t('left-stick-deadzone'),
                this.$leftStickDeadzone = BxDualNumberStepper.create('left-stick-deadzone', blankSettings.leftStickDeadzone!, params, boundUpdatePreset),
            ),

            createSettingRow(t('right-stick-deadzone'),
                this.$rightStickDeadzone = BxDualNumberStepper.create('right-stick-deadzone', blankSettings.rightStickDeadzone!, params, boundUpdatePreset),
            ),
        );
    }

    private startDetectingButton() {
        this.isDetectingButton = true;

        const { $btnDetect } = this;
        $btnDetect.classList.add('bx-monospaced', 'bx-blink-me');
        $btnDetect.disabled = true;

        let count = 4;
        $btnDetect.textContent = `[${count}] ${t('press-any-button')}`;

        this.detectIntervalId = window.setInterval(() => {
            count -= 1;
            if (count === 0) {
                this.stopDetectingButton();

                // Re-focus the Detect button
                $btnDetect.focus();
                return;
            }

            $btnDetect.textContent = `[${count}] ${t('press-any-button')}`;
        }, 1000);
    }

    private stopDetectingButton() {
        const { $btnDetect } = this;
        $btnDetect.classList.remove('bx-monospaced', 'bx-blink-me');
        $btnDetect.textContent = t('detect-controller-button');
        $btnDetect.disabled = false;

        this.isDetectingButton = false;
        this.detectIntervalId && window.clearInterval(this.detectIntervalId);
        this.detectIntervalId = null;
    }

    async onBeforeMount() {
        this.stopDetectingButton();
        super.onBeforeMount(...arguments);
    }

    onBeforeUnmount(): void {
        this.stopDetectingButton();
        StreamSettings.refreshControllerSettings();
        super.onBeforeUnmount();
    }

    handleGamepad(button: GamepadKey): boolean {
        if (!this.isDetectingButton) {
            return super.handleGamepad(button);
        }

        if (button in ControllerCustomizationsManagerDialog.BUTTONS_ORDER) {
            this.stopDetectingButton();

            const $select = this.selectsMap[button]!;
            const $label = $select.previousElementSibling!;
            $label.addEventListener('animationend', () => {
                $label.classList.remove('bx-horizontal-shaking');
            }, { once: true });
            $label.classList.add('bx-horizontal-shaking');

            // Focus select
            if (getGlobalPref(GlobalPref.UI_CONTROLLER_FRIENDLY)) {
                this.dialogManager.focus($select);
            }
        }

        return true;
    }

    protected switchPreset(id: number): void {
        const preset = this.allPresets.data[id];
        if (!preset) {
            this.currentPresetId = 0;
            return;
        }

        const {
            $btnDetect,
            $vibrationIntensity,
            $leftStickDeadzone,
            $rightStickDeadzone,
            $leftTriggerRange,
            $rightTriggerRange,
            selectsMap,
        } = this;

        const presetData = preset.data;
        this.currentPresetId = id;
        const isDefaultPreset = id <= 0;
        this.updateButtonStates();

        // Show/hide Detect button and hint
        $btnDetect.classList.toggle('bx-gone', isDefaultPreset);
        this.$hintMapping.classList.toggle('bx-gone', isDefaultPreset);

        // Set mappings
        let buttonIndex: unknown;
        for (buttonIndex in selectsMap) {
            buttonIndex = buttonIndex as GamepadKey;

            const $select = selectsMap[buttonIndex as GamepadKey];
            if (!$select) {
                continue;
            }

            const mappedButton = presetData.mapping[buttonIndex as GamepadKey];

            $select.value = typeof mappedButton === 'undefined' ? '' : mappedButton.toString();
            $select.disabled = isDefaultPreset;

            BxEvent.dispatch($select, 'input', {
                ignoreOnChange: true,
                manualTrigger: true,
            });
        }

        // Add missing settings
        presetData.settings = Object.assign({}, this.presetsDb.BLANK_PRESET_DATA.settings, presetData.settings);

        // Vibration intensity
        $vibrationIntensity.value = presetData.settings.vibrationIntensity.toString();
        $vibrationIntensity.dataset.disabled = isDefaultPreset.toString();

        // Set extra settings
        $leftStickDeadzone.dataset.disabled = $rightStickDeadzone.dataset.disabled = $leftTriggerRange.dataset.disabled = $rightTriggerRange.dataset.disabled = isDefaultPreset.toString();
        $leftStickDeadzone.setValue(presetData.settings.leftStickDeadzone);
        $rightStickDeadzone.setValue(presetData.settings.rightStickDeadzone);
        $leftTriggerRange.setValue(presetData.settings.leftTriggerRange);
        $rightTriggerRange.setValue(presetData.settings.rightTriggerRange);
    }

    private updatePreset() {
        const newData: ControllerCustomizationPresetData = deepClone(this.presetsDb.BLANK_PRESET_DATA);

        // Set mappings
        let gamepadKey: unknown;
        for (gamepadKey in this.selectsMap) {
            const $select = this.selectsMap[gamepadKey as GamepadKey]!;
            const value = $select.value;
            if (!value) {
                continue;
            }

            const mapTo = (value === 'false') ? false : parseInt(value);
            newData.mapping[gamepadKey as GamepadKey] = mapTo;
        }

        // Set extra settings
        Object.assign(newData.settings, {
            vibrationIntensity: parseInt(this.$vibrationIntensity.value),

            leftStickDeadzone: this.$leftStickDeadzone.getValue(),
            rightStickDeadzone: this.$rightStickDeadzone.getValue(),
            leftTriggerRange: this.$leftTriggerRange.getValue(),
            rightTriggerRange: this.$rightTriggerRange.getValue(),
        } satisfies typeof newData.settings);

        // Update preset
        const preset = this.allPresets.data[this.currentPresetId!];
        preset.data = newData;
        this.presetsDb.updatePreset(preset);
    }

    async renderSummary(presetId: number) {
        const preset = await this.presetsDb.getPreset(presetId);
        if (!preset) {
            return null;
        }

        const presetData = preset.data;
        let $content: HTMLElement | undefined;
        let showNote = false;

        if (Object.keys(presetData.mapping).length > 0) {
            $content = CE('div', { class: 'bx-controller-customization-summary'});

            for (const gamepadKey of ControllerCustomizationsManagerDialog.BUTTONS_ORDER) {
                if (!(gamepadKey in presetData.mapping)) {
                    continue;
                }

                const mappedKey = presetData.mapping[gamepadKey]!;
                $content.append(CE('span', { class: 'bx-prompt' }, getGamepadPrompt(gamepadKey) + ' > ' + (mappedKey === false ? '🚫' : getGamepadPrompt(mappedKey))));
            }

            showNote = true;
        }

        // Show note if it has settings other than 'vibrationIntensity'
        let key: keyof typeof presetData.settings;
        for (key in presetData.settings) {
            if (key === 'vibrationIntensity') {
                continue;
            }

            const value = presetData.settings[key];
            // Non-default value
            if (Array.isArray(value) && (value[0] !== 0 || value[1] !== 100)) {
                showNote = true;
                break;
            }
        }

        const fragment = document.createDocumentFragment();
        if (showNote) {
            const $note = CE('div', { class: 'bx-settings-dialog-note' }, 'ⓘ ' + t('controller-customization-input-latency-note'));
            fragment.appendChild($note);
        }

        if ($content) {
            fragment.appendChild($content);
        }

        return fragment.childElementCount ? fragment : null;
    }
}
