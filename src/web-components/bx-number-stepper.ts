import type { NumberStepperParams } from "@/types/setting-definition";
import { CE, escapeCssSelector } from "@/utils/html";
import { setNearby } from "@/utils/navigation-utils";
import type { BxHtmlSettingElement } from "@/utils/setting-element";


type ButtonType = 'inc' | 'dec';

export class BxNumberStepper extends HTMLInputElement implements BxHtmlSettingElement  {
    private intervalId: number | null = null;
    private isHolding!: boolean;

    private controlValue!: number;
    private controlMin!: number;
    private controlMax!: number;

    private uiMin!: number;
    private uiMax!: number;
    private steps!: number;
    private options!: NumberStepperParams;
    private onChange: any;

    private $text!: HTMLSpanElement;
    private $btnInc!: HTMLButtonElement;
    private $btnDec!: HTMLButtonElement;
    private $range!: HTMLInputElement | null;

    onRangeInput!: typeof BxNumberStepper['onRangeInput'];
    onClick!: typeof BxNumberStepper['onClick'];
    onPointerUp!: typeof BxNumberStepper['onPointerUp'];
    onPointerDown!: typeof BxNumberStepper['onPointerDown'];

    setValue!: typeof BxNumberStepper['setValue'];
    normalizeValue!: typeof BxNumberStepper['normalizeValue'];

    static create(key: string, value: number, min: number, max: number, options: NumberStepperParams={}, onChange: any) {
        options = options || {};
        options.suffix = options.suffix || '';
        options.disabled = !!options.disabled;
        options.hideSlider = !!options.hideSlider;

        let $text: HTMLSpanElement;
        let $btnInc: HTMLButtonElement;
        let $btnDec: HTMLButtonElement;
        let $range: HTMLInputElement | null;

        const $wrapper = CE<BxNumberStepper>('div', {
            class: 'bx-number-stepper',
            id: `bx_setting_${escapeCssSelector(key)}`,
        },
            CE('div', {},
                $btnDec = CE('button', {
                    _dataset: {
                        type: 'dec' as ButtonType,
                    },
                    type: 'button',
                    class: options.hideSlider ? 'bx-focusable' : '',
                    tabindex: options.hideSlider ? 0 : -1,
                }, '-') as HTMLButtonElement,
                $text = CE('span') as HTMLSpanElement,
                $btnInc = CE('button', {
                    _dataset: {
                        type: 'inc' as ButtonType,
                    },
                    type: 'button',
                    class: options.hideSlider ? 'bx-focusable' : '',
                    tabindex: options.hideSlider ? 0 : -1,
                }, '+') as HTMLButtonElement,
            ),
        );

        const self = $wrapper;
        self.$text = $text;
        self.$btnInc = $btnInc;
        self.$btnDec = $btnDec;
        self.onChange = onChange;

        self.onRangeInput = BxNumberStepper.onRangeInput.bind(self);
        self.onClick = BxNumberStepper.onClick.bind(self);
        self.onPointerUp = BxNumberStepper.onPointerUp.bind(self);
        self.onPointerDown = BxNumberStepper.onPointerDown.bind(self);

        self.controlMin = min;
        self.controlMax = max;
        self.isHolding = false;

        self.options = options;
        self.uiMin = options.reverse ? -max : min;
        self.uiMax = options.reverse ? -min : max;
        self.steps = Math.max(options.steps || 1, 1);

        BxNumberStepper.setValue.call(self, value);

        if (options.disabled) {
            $btnInc.disabled = true;
            $btnInc.classList.add('bx-inactive');

            $btnDec.disabled = true;
            $btnDec.classList.add('bx-inactive');

            (self as any).disabled = true;
            return self;
        }

        $range = CE<HTMLInputElement>('input', {
            id: `bx_inp_setting_${key}`,
            type: 'range',
            min: self.uiMin,
            max: self.uiMax,
            value: options.reverse ? -value : value,
            step: self.steps,
            tabindex: 0,
        });
        self.$range = $range;
        options.hideSlider && $range.classList.add('bx-gone');

        self.addEventListener('input', self.onRangeInput);
        self.appendChild($range);

        if (options.ticks || options.exactTicks) {
            const markersId = `markers-${key}`;
            const $markers = CE('datalist', { id: markersId });
            $range.setAttribute('list', markersId);

            if (options.exactTicks) {
                let start = Math.max(Math.floor(min / options.exactTicks), 1) * options.exactTicks;

                if (start === min) {
                    start += options.exactTicks;
                }

                for (let i = start; i < max; i += options.exactTicks) {
                    $markers.appendChild(CE<HTMLOptionElement>('option', {
                        value: options.reverse ? -i : i,
                    }));
                }
            } else {
                for (let i = self.uiMin + options.ticks!; i < self.uiMax; i += options.ticks!) {
                    $markers.appendChild(CE<HTMLOptionElement>('option', { value: i }));
                }
            }
            self.appendChild($markers);
        }

        BxNumberStepper.updateButtonsVisibility.call(self);

        self.addEventListener('click', self.onClick);
        self.addEventListener('pointerdown', self.onPointerDown);
        self.addEventListener('contextmenu', BxNumberStepper.onContextMenu);
        setNearby(self, {
            focus: options.hideSlider ? $btnInc : $range,
        });

        Object.defineProperty(self, 'value', {
            get() { return self.controlValue; },
            set(value) { BxNumberStepper.setValue.call(self, value); },
        });

        return self;
    }

    private static setValue(this: BxNumberStepper, value: any) {
        this.controlValue = BxNumberStepper.normalizeValue.call(this, value);

        this.$text.textContent = BxNumberStepper.updateTextValue.call(this);
        if (this.$range) {
            this.$range.value = this.options.reverse ? -value : value;
        }

        BxNumberStepper.updateButtonsVisibility.call(this);
    }

    private static normalizeValue(this: BxNumberStepper, value: number | string): number {
        value = parseInt(value as string);

        value = Math.max(this.controlMin, value);
        value = Math.min(this.controlMax, value);

        return value;
    }

    private static onRangeInput(this: BxNumberStepper, e: Event) {
        let value = parseInt((e.target as HTMLInputElement).value);
        if (this.options.reverse) {
            value *= -1;
        }

        /*
        const valueChanged = this.controlValue !== value;
        if (!valueChanged) {
            return;
        }
        */

        BxNumberStepper.setValue.call(this, value);
        BxNumberStepper.updateButtonsVisibility.call(this);

        if (!(e as any).ignoreOnChange && this.onChange) {
            this.onChange(e, value);
        }
    }

    private static onClick(this: BxNumberStepper, e: Event) {
        e.preventDefault();
        if (this.isHolding) {
            return;
        }

        const $btn = (e.target as HTMLElement).closest('button') as HTMLElement;
        $btn && BxNumberStepper.buttonPressed.call(this, e, $btn);

        BxNumberStepper.clearIntervalId.call(this);
        this.isHolding = false;
    }

    private static onPointerDown(this: BxNumberStepper, e: Event) {
        BxNumberStepper.clearIntervalId.call(this);

        const $btn = (e.target as HTMLElement).closest('button') as HTMLElement;
        if (!$btn) {
            return;
        }

        this.isHolding = true;
        e.preventDefault();

        this.intervalId = window.setInterval((e: Event) => {
            BxNumberStepper.buttonPressed.call(this, e, $btn);
        }, 200);

        window.addEventListener('pointerup', this.onPointerUp, { once: true });
        window.addEventListener('pointercancel', this.onPointerUp, { once: true });
    }

    private static onPointerUp(this: BxNumberStepper, e: Event) {
        BxNumberStepper.clearIntervalId.call(this);
        this.isHolding = false;
    }

    private static onContextMenu(e: Event) {
        e.preventDefault();
    }

    private static updateTextValue(this: BxNumberStepper): string | null {
        const value = this.controlValue;

        let textContent = null;
        if (this.options.customTextValue) {
            textContent = this.options.customTextValue(value, this.controlMin, this.controlMax);
        }

        if (textContent === null) {
            textContent = value.toString() + this.options.suffix;
        }

        return textContent;
    }

    private static buttonPressed(this: BxNumberStepper, e: Event, $btn: HTMLElement) {
        let value = this.controlValue;
        value = this.options.reverse ? -value : value;

        const btnType = $btn.dataset.type as ButtonType;
        if (btnType === 'dec') {
            value = Math.max(this.uiMin, value - this.steps);
        } else {
            value = Math.min(this.uiMax, value + this.steps);
        }

        value = this.options.reverse ? -value : value;
        BxNumberStepper.setValue.call(this, value);
        BxNumberStepper.updateButtonsVisibility.call(this);
        this.onChange && this.onChange(e, value);
    }

    private static clearIntervalId(this: BxNumberStepper) {
        this.intervalId && clearInterval(this.intervalId);
        this.intervalId = null;
    }

    private static updateButtonsVisibility(this: BxNumberStepper) {
        this.$btnDec.classList.toggle('bx-inactive', this.controlValue === this.uiMin);
        this.$btnInc.classList.toggle('bx-inactive', this.controlValue === this.uiMax);

        if (this.controlValue === this.uiMin || this.controlValue === this.uiMax) {
            BxNumberStepper.clearIntervalId.call(this);
        }
    }
}
