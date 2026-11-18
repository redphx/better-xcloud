import { BxEvent } from "@/utils/bx-event";
import { getUniqueGamepadNames, simplifyGamepadName } from "@/utils/gamepad";
import { CE, removeChildElements, createButton, ButtonStyle, createSettingRow, renderPresetsList, calculateSelectBoxes } from "@/utils/html";
import { t } from "@/utils/translation";
import { BxSelectElement } from "@/web-components/bx-select";
import { ControllerShortcutsManagerDialog } from "../profile-manger/controller-shortcuts-manager-dialog";
import type { SettingsDialog } from "../settings-dialog";
import { ControllerShortcutsTable } from "@/utils/local-db/controller-shortcuts-table";
import { StreamSettings } from "@/utils/stream-settings";
import { ControllerCustomizationsTable } from "@/utils/local-db/controller-customizations-table";
import { ControllerCustomizationsManagerDialog } from "../profile-manger/controller-customizations-manager-dialog";
import { BxIcon } from "@/utils/bx-icon";
import { getStreamPref, setStreamPref, STORAGE } from "@/utils/pref-utils";
import { StreamPref } from "@/enums/pref-keys";
import { BxEventBus } from "@/utils/bx-event-bus";

export class ControllerExtraSettings extends HTMLElement {
    currentControllerId!: string;
    controllerIds!: string[];

    $selectControllers!: BxSelectElement;
    $selectShortcuts!: BxSelectElement;
    $selectCustomization!: BxSelectElement;
    $selectPlayerSlot!: BxSelectElement;
    $rowPlayerSlot!: HTMLElement;
    $summaryCustomization!: HTMLElement;

    updateLayout!: typeof ControllerExtraSettings['updateLayout'];
    switchController!: typeof ControllerExtraSettings['switchController'];
    getCurrentControllerId!: typeof ControllerExtraSettings['getCurrentControllerId'];
    saveSettings!: typeof ControllerExtraSettings['saveSettings'];
    updateCustomizationSummary!: typeof ControllerExtraSettings['updateCustomizationSummary'];
    updatePlayerSlotVisibility!: typeof ControllerExtraSettings['updatePlayerSlotVisibility'];
    setValue!: typeof ControllerExtraSettings['setValue'];

    static renderSettings(this: SettingsDialog): HTMLElement {
        const $container = CE('label', {
            class: 'bx-settings-row bx-controller-extra-settings',
        }) as unknown as ControllerExtraSettings;

        // Setting up for Settings Manager
        ($container as any).prefKey = StreamPref.CONTROLLER_SETTINGS;
        $container.addEventListener('contextmenu', this.boundOnContextMenu);
        this.settingsManager.setElement(StreamPref.CONTROLLER_SETTINGS, $container);

        $container.updateLayout = ControllerExtraSettings.updateLayout.bind($container);
        $container.switchController = ControllerExtraSettings.switchController.bind($container);
        $container.getCurrentControllerId = ControllerExtraSettings.getCurrentControllerId.bind($container);
        $container.saveSettings = ControllerExtraSettings.saveSettings.bind($container);
        $container.updatePlayerSlotVisibility = ControllerExtraSettings.updatePlayerSlotVisibility.bind($container);
        $container.setValue = ControllerExtraSettings.setValue.bind($container);

        const $selectControllers = BxSelectElement.create(CE('select', {
            class: 'bx-full-width',
            autocomplete: 'off',
            _on: {
                input: (e: Event) => {
                    $container.switchController($selectControllers.value);
                },
            },
        }));

        const $selectShortcuts = BxSelectElement.create(CE('select', {
            autocomplete: 'off',
            _on: { input: $container.saveSettings },
        }));

        const $selectCustomization = BxSelectElement.create(CE('select', {
            autocomplete: 'off',
            _on: {
                input: async () => {
                    // Update summary
                    ControllerExtraSettings.updateCustomizationSummary.call($container);
                    // Save settings
                    $container.saveSettings();
                },
            },
        }));

        // Player slot selector (for local co-op)
        const $selectPlayerSlot = BxSelectElement.create(CE('select', {
            autocomplete: 'off',
            _on: { input: $container.saveSettings },
        }));

        // Populate player slot options
        const playerSlotOptions: Array<[string, string]> = [
            ['-1', t('auto')],
            ['0', `${t('player')} 1`],
            ['1', `${t('player')} 2`],
            ['2', `${t('player')} 3`],
            ['3', `${t('player')} 4`],
        ];
        for (const [value, label] of playerSlotOptions) {
            $selectPlayerSlot.appendChild(CE('option', { value }, label));
        }

        const $rowPlayerSlot = createSettingRow(
            t('local-co-op-player-slot'),
            $selectPlayerSlot,
            { multiLines: false },
        );

        const $rowCustomization = createSettingRow(
            t('in-game-controller-customization'),
            CE('div', {
                class: 'bx-preset-row',
                _nearby: { orientation: 'horizontal' },
            },
                $selectCustomization,
                createButton({
                    title: t('manage'),
                    icon: BxIcon.MANAGE,
                    style: ButtonStyle.FOCUSABLE | ButtonStyle.PRIMARY | ButtonStyle.AUTO_HEIGHT,
                    onClick: () => ControllerCustomizationsManagerDialog.getInstance().show({
                        id: $container.$selectCustomization.value ? parseInt($container.$selectCustomization.value) : null,
                    }),
                }),
            ),
            { multiLines: true },
        );
        $rowCustomization.appendChild(
            $container.$summaryCustomization = CE('div'),
        );

        $container.append(
            CE('span', false, t('no-controllers-connected')),
            CE('div', { class: 'bx-controller-extra-wrapper' },
                $selectControllers,

                CE('div', { class: 'bx-sub-content-box' },
                    $rowPlayerSlot,

                    createSettingRow(
                        t('in-game-controller-shortcuts'),
                        CE('div', {
                            class: 'bx-preset-row',
                            _nearby: { orientation: 'horizontal' },
                        },
                            $selectShortcuts,
                            createButton({
                                title: t('manage'),
                                icon: BxIcon.MANAGE,
                                style: ButtonStyle.FOCUSABLE | ButtonStyle.PRIMARY | ButtonStyle.AUTO_HEIGHT,
                                onClick: () => ControllerShortcutsManagerDialog.getInstance().show({
                                    id: parseInt($container.$selectShortcuts.value),
                                }),
                            }),
                        ),
                        { multiLines: true },
                    ),

                    $rowCustomization,
                ),
            ),
        );

        $container.$selectControllers = $selectControllers;
        $container.$selectShortcuts = $selectShortcuts;
        $container.$selectCustomization = $selectCustomization;
        $container.$selectPlayerSlot = $selectPlayerSlot;
        $container.$rowPlayerSlot = $rowPlayerSlot;

        $container.updateLayout();
        $container.updatePlayerSlotVisibility();

        // Detect when gamepad connected/disconnect
        window.addEventListener('gamepadconnected', $container.updateLayout);
        window.addEventListener('gamepaddisconnected', $container.updateLayout);

        // Update player slot row visibility when local co-op setting changes
        BxEventBus.Stream.on('setting.changed', data => {
            if (data?.settingKey === StreamPref.LOCAL_CO_OP_ENABLED) {
                $container.updatePlayerSlotVisibility();
            }
        });

        // Refresh layout when parent dialog is shown
        this.onMountedCallbacks.push(() => {
            $container.updateLayout();
            $container.updatePlayerSlotVisibility();
        });

        return $container;
    }

    private static async updateCustomizationSummary(this: ControllerExtraSettings) {
        const presetId = parseInt(this.$selectCustomization.value);
        const $summaryContent = await ControllerCustomizationsManagerDialog.getInstance().renderSummary(presetId);

        removeChildElements(this.$summaryCustomization);
        if ($summaryContent) {
            this.$summaryCustomization.appendChild($summaryContent);
        }
    }

    private static async updateLayout(this: ControllerExtraSettings) {
        this.controllerIds = getUniqueGamepadNames();

        this.dataset.hasGamepad = (this.controllerIds.length > 0).toString();
        if (this.controllerIds.length === 0) {
            // No gamepads
            return;
        }

        const $fragment = document.createDocumentFragment();

        // Remove old controllers
        removeChildElements(this.$selectControllers);

        // Render controller list
        for (const name of this.controllerIds) {
            const $option = CE('option', { value: name }, simplifyGamepadName(name));
            $fragment.appendChild($option);
        }

        this.$selectControllers.appendChild($fragment);

        // Render shortcut presets
        const allShortcutPresets = await ControllerShortcutsTable.getInstance().getPresets();
        renderPresetsList(this.$selectShortcuts, allShortcutPresets, null, { addOffValue: true });

        // Render customization presets
        const allCustomizationPresets = await ControllerCustomizationsTable.getInstance().getPresets();
        renderPresetsList(this.$selectCustomization, allCustomizationPresets, null, { addOffValue: true });

        for (const name of this.controllerIds) {
            const $option = CE('option', { value: name }, name);
            $fragment.appendChild($option);
        }

        BxEvent.dispatch(this.$selectControllers, 'input');
        calculateSelectBoxes(this);
    }

    private static async switchController(this: ControllerExtraSettings, id: string) {
        this.currentControllerId = id;
        if (!this.getCurrentControllerId()) {
            return;
        }

        const controllerSetting = STORAGE.Stream.getControllerSetting(this.currentControllerId);
        ControllerExtraSettings.updateElements.call(this, controllerSetting);
    }

    private static getCurrentControllerId(this: ControllerExtraSettings) {
        // Validate current ID
        if (this.currentControllerId) {
            if (this.controllerIds.includes(this.currentControllerId)) {
                return this.currentControllerId;
            }

            this.currentControllerId = '';
        }

        // Get first ID
        if (!this.currentControllerId) {
            this.currentControllerId = this.controllerIds[0];
        }

        if (this.currentControllerId) {
            return this.currentControllerId;
        }

        return null;
    }

    private static updatePlayerSlotVisibility(this: ControllerExtraSettings) {
        const coopEnabled = getStreamPref(StreamPref.LOCAL_CO_OP_ENABLED);
        this.$rowPlayerSlot.style.display = coopEnabled ? '' : 'none';
    }

    private static async saveSettings(this: ControllerExtraSettings) {
        if (!this.getCurrentControllerId()) {
            return;
        }

        const controllerSettings = getStreamPref(StreamPref.CONTROLLER_SETTINGS);
        controllerSettings[this.currentControllerId] = {
            shortcutPresetId: parseInt(this.$selectShortcuts.value),
            customizationPresetId: parseInt(this.$selectCustomization.value),
            playerIndex: parseInt(this.$selectPlayerSlot.value),
        };

        setStreamPref(StreamPref.CONTROLLER_SETTINGS, controllerSettings, 'ui');
        StreamSettings.refreshControllerSettings();
    }

    private static setValue(this: ControllerExtraSettings, value: ControllerSettings) {
        ControllerExtraSettings.updateElements.call(this, value[this.currentControllerId]);
    }

    private static updateElements(this: ControllerExtraSettings, controllerSetting: ControllerSetting) {
        if (!controllerSetting) {
            return;
        }

        // Update UI
        this.$selectShortcuts.value = controllerSetting.shortcutPresetId.toString();
        this.$selectCustomization.value = controllerSetting.customizationPresetId.toString();
        this.$selectPlayerSlot.value = (controllerSetting.playerIndex ?? -1).toString();

        // Update summary
        ControllerExtraSettings.updateCustomizationSummary.call(this);
    }
}
