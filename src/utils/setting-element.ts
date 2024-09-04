import type { PreferenceSetting } from "@/types/preferences";
import { CE } from "@utils/html";
import { setNearby } from "./navigation-utils";
import type { PrefKey } from "@/enums/pref-keys";
import type { BaseSettingsStore } from "./settings-storages/base-settings-storage";
import { type MultipleOptionsParams, type NumberStepperParams } from "@/types/setting-definition";
import { BxEvent } from "./bx-event";

export enum SettingElementType {
    OPTIONS = 'options',
    MULTIPLE_OPTIONS = 'multiple-options',
    NUMBER = 'number',
    NUMBER_STEPPER = 'number-stepper',
    CHECKBOX = 'checkbox',
}

interface BxBaseSettingElement {
    setValue: (value: any) => void,
}

export interface BxHtmlSettingElement extends HTMLElement, BxBaseSettingElement {};

export interface BxSelectSettingElement extends HTMLSelectElement, BxBaseSettingElement {}

export class SettingElement {
    static #renderOptions(key: string, setting: PreferenceSetting, currentValue: any, onChange: any): BxSelectSettingElement {
        const $control = CE<BxSelectSettingElement>('select', {
                // title: setting.label,
                tabindex: 0,
            });

        let $parent: HTMLElement;
        if (setting.optionsGroup) {
            $parent = CE('optgroup', {
                label: setting.optionsGroup,
            });
            $control.appendChild($parent);
        } else {
            $parent = $control;
        }

        for (let value in setting.options) {
            const label = setting.options[value];

            const $option = CE<HTMLOptionElement>('option', {value: value}, label);
            $parent.appendChild($option);
        }

        $control.value = currentValue;
        onChange && $control.addEventListener('input', e => {
            const target = e.target as HTMLSelectElement;
            const value = (setting.type && setting.type === 'number') ? parseInt(target.value) : target.value;

            !(e as any).ignoreOnChange && onChange(e, value);
        });

        // Custom method
        $control.setValue = (value: any) => {
            $control.value = value;
        };

        return $control;
    }

    static #renderMultipleOptions(key: string, setting: PreferenceSetting, currentValue: any, onChange: any, params: MultipleOptionsParams={}): BxSelectSettingElement {
        const $control = CE<BxSelectSettingElement>('select', {
                // title: setting.label,
                multiple: true,
                tabindex: 0,
            });

        if (params && params.size) {
            $control.setAttribute('size', params.size.toString());
        }

        for (let value in setting.multipleOptions) {
            const label = setting.multipleOptions[value];

            const $option = CE<HTMLOptionElement>('option', {value: value}, label) as HTMLOptionElement;
            $option.selected = currentValue.indexOf(value) > -1;

            $option.addEventListener('mousedown', function(e) {
                e.preventDefault();

                const target = e.target as HTMLOptionElement;
                target.selected = !target.selected;

                const $parent = target.parentElement!;
                $parent.focus();
                BxEvent.dispatch($parent, 'input');
            });

            $control.appendChild($option);
        }

        $control.addEventListener('mousedown', function(e) {
            const self = this;
            const orgScrollTop = self.scrollTop;
            window.setTimeout(() => (self.scrollTop = orgScrollTop), 0);
        });

        $control.addEventListener('mousemove', e => e.preventDefault());

        onChange && $control.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLSelectElement
            const values = Array.from(target.selectedOptions).map(i => i.value);

            !(e as any).ignoreOnChange && onChange(e, values);
        });

        return $control;
    }

    static #renderNumber(key: string, setting: PreferenceSetting, currentValue: any, onChange: any) {
        const $control = CE<HTMLInputElement>('input', {
            tabindex: 0,
            type: 'number',
            min: setting.min,
            max: setting.max,
        });

        $control.value = currentValue;
        onChange && $control.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;

            const value = Math.max(setting.min!, Math.min(setting.max!, parseInt(target.value)));
            target.value = value.toString();

            !(e as any).ignoreOnChange && onChange(e, value);
        });

        return $control;
    }

    static #renderCheckbox(key: string, setting: PreferenceSetting, currentValue: any, onChange: any) {
        const $control = CE('input', {'type': 'checkbox', 'tabindex': 0}) as HTMLInputElement;
        $control.checked = currentValue;

        onChange && $control.addEventListener('input', e => {
            !(e as any).ignoreOnChange && onChange(e, (e.target as HTMLInputElement).checked);
        });

        ($control as any).setValue = (value: boolean) => {
            $control.checked = !!value;
        };

        return $control;
    }

    static #renderNumberStepper(key: string, setting: PreferenceSetting, value: any, onChange: any, options: NumberStepperParams={}) {
        options = options || {};
        options.suffix = options.suffix || '';
        options.disabled = !!options.disabled;
        options.hideSlider = !!options.hideSlider;

        let $text: HTMLSpanElement;
        let $btnDec: HTMLButtonElement;
        let $btnInc: HTMLButtonElement;
        let $range: HTMLInputElement | null = null;

        let controlValue = value;

        const MIN = setting.min!;
        const MAX = setting.max!;
        const STEPS = Math.max(setting.steps || 1, 1);

        const renderTextValue = (value: any) => {
            value = parseInt(value as string);

            let textContent = null;
            if (options.customTextValue) {
                textContent = options.customTextValue(value);
            }

            if (textContent === null) {
                textContent = value.toString() + options.suffix;
            }

            return textContent;
        };

        const updateButtonsVisibility = () => {
            $btnDec.classList.toggle('bx-inactive', controlValue === MIN);
            $btnInc.classList.toggle('bx-inactive', controlValue === MAX);
        }

        const $wrapper = CE<BxHtmlSettingElement>('div', {'class': 'bx-number-stepper', id: `bx_setting_${key}`},
            $btnDec = CE('button', {
                'data-type': 'dec',
                type: 'button',
                class: options.hideSlider ? 'bx-focusable' : '',
                tabindex: options.hideSlider ? 0 : -1,
            }, '-') as HTMLButtonElement,
            $text = CE('span', {}, renderTextValue(value)) as HTMLSpanElement,
            $btnInc = CE('button', {
                'data-type': 'inc',
                type: 'button',
                class: options.hideSlider ? 'bx-focusable' : '',
                tabindex: options.hideSlider ? 0 : -1,
            }, '+') as HTMLButtonElement,
        );

        if (options.disabled) {
            $btnInc.disabled = true;
            $btnInc.classList.add('bx-inactive');

            $btnDec.disabled = true;
            $btnDec.classList.add('bx-inactive');

            ($wrapper as any).disabled = true;
            return $wrapper;
        }

        $range = CE<HTMLInputElement>('input', {
            id: `bx_setting_${key}`,
            type: 'range',
            min: MIN,
            max: MAX,
            value: value,
            step: STEPS,
            tabindex: 0,
        });

        options.hideSlider && $range.classList.add('bx-gone');

        $range.addEventListener('input', e => {
            value = parseInt((e.target as HTMLInputElement).value);
            const valueChanged = controlValue !== value;

            if (!valueChanged) {
                return;
            }

            controlValue = value;
            updateButtonsVisibility();
            $text.textContent = renderTextValue(value);

            !(e as any).ignoreOnChange && onChange && onChange(e, value);
        });

        $wrapper.addEventListener('input', e => {
            BxEvent.dispatch($range, 'input');
        });
        $wrapper.appendChild($range);

        if (options.ticks || options.exactTicks) {
            const markersId = `markers-${key}`;
            const $markers = CE('datalist', {'id': markersId});
            $range.setAttribute('list', markersId);

            if (options.exactTicks) {
                let start = Math.max(Math.floor(MIN / options.exactTicks), 1) * options.exactTicks;

                if (start === MIN) {
                    start += options.exactTicks;
                }

                for (let i = start; i < MAX; i += options.exactTicks) {
                    $markers.appendChild(CE<HTMLOptionElement>('option', {'value': i}));
                }
            } else {
                for (let i = MIN + options.ticks!; i < MAX; i += options.ticks!) {
                    $markers.appendChild(CE<HTMLOptionElement>('option', {'value': i}));
                }
            }
            $wrapper.appendChild($markers);
        }

        updateButtonsVisibility();

        let interval: number;
        let isHolding = false;

        const onClick = (e: Event) => {
            if (isHolding) {
                e.preventDefault();
                isHolding = false;

                return;
            }

            const $btn = e.target as HTMLElement;
            let value = parseInt(controlValue);

            const btnType = $btn.dataset.type;
            if (btnType === 'dec') {
                value = Math.max(MIN, value - STEPS);
            } else {
                value = Math.min(MAX, value + STEPS);
            }

            controlValue = value;
            updateButtonsVisibility();

            $text.textContent = renderTextValue(value);
            $range && ($range.value = value.toString());

            isHolding = false;
            !(e as any).ignoreOnChange && onChange && onChange(e, value);
        }

        const onMouseDown = (e: PointerEvent) => {
            e.preventDefault();
            isHolding = true;

            const args = arguments;
            interval && clearInterval(interval);
            interval = window.setInterval(() => {
                e.target && BxEvent.dispatch(e.target as HTMLElement, 'click', {
                    arguments: args,
                });
            }, 200);
        };

        const onMouseUp = (e: PointerEvent) => {
            e.preventDefault();

            interval && clearInterval(interval);
            isHolding = false;
        };

        const onContextMenu = (e: Event) => e.preventDefault();

        // Custom method
        $wrapper.setValue = (value: any) => {
            $text.textContent = renderTextValue(value);
            $range.value = value;
        };

        $btnDec.addEventListener('click', onClick);
        $btnDec.addEventListener('pointerdown', onMouseDown);
        $btnDec.addEventListener('pointerup', onMouseUp);
        $btnDec.addEventListener('contextmenu', onContextMenu);

        $btnInc.addEventListener('click', onClick);
        $btnInc.addEventListener('pointerdown', onMouseDown);
        $btnInc.addEventListener('pointerup', onMouseUp);
        $btnInc.addEventListener('contextmenu', onContextMenu);

        setNearby($wrapper, {
            focus: $range || $btnInc,
        })

        return $wrapper;
    }

    static #METHOD_MAP = {
        [SettingElementType.OPTIONS]: SettingElement.#renderOptions,
        [SettingElementType.MULTIPLE_OPTIONS]: SettingElement.#renderMultipleOptions,
        [SettingElementType.NUMBER]: SettingElement.#renderNumber,
        [SettingElementType.NUMBER_STEPPER]: SettingElement.#renderNumberStepper,
        [SettingElementType.CHECKBOX]: SettingElement.#renderCheckbox,
    };

    static render(type: SettingElementType, key: string, setting: PreferenceSetting, currentValue: any, onChange: any, options: any) {
        const method = SettingElement.#METHOD_MAP[type];
        // @ts-ignore
        const $control = method(...Array.from(arguments).slice(1)) as HTMLElement;

        if (type !== SettingElementType.NUMBER_STEPPER) {
            $control.id = `bx_setting_${key}`;
        }

        // Add "name" property to "select" elements
        if (type === SettingElementType.OPTIONS || type === SettingElementType.MULTIPLE_OPTIONS) {
            ($control as HTMLSelectElement).name = $control.id;
        }

        return $control;
    }

    static fromPref(key: PrefKey, storage: BaseSettingsStore, onChange: any, overrideParams={}) {
        const definition = storage.getDefinition(key);
        let currentValue = storage.getSetting(key);

        let type;
        if ('type' in definition) {
            type = definition.type;
        } else if ('options' in definition) {
            type = SettingElementType.OPTIONS;
        } else if ('multipleOptions' in definition) {
            type = SettingElementType.MULTIPLE_OPTIONS;
        } else if (typeof definition.default === 'number') {
            type = SettingElementType.NUMBER;
        } else {
            type = SettingElementType.CHECKBOX;
        }

        let params: any = {};
        if ('params' in definition) {
            params = Object.assign(overrideParams, definition.params || {});
        }

        if (params.disabled) {
            currentValue = definition.default;
        }

        const $control = SettingElement.render(type!, key as string, definition, currentValue, (e: any, value: any) => {
            storage.setSetting(key, value);
            onChange && onChange(e, value);
        }, params);

        return $control;
    }
}
