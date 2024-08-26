import type { NavigationElement } from "@/modules/ui/dialog/navigation-dialog";
import { BxEvent } from "@/utils/bx-event";
import type { BxSelectSettingElement } from "@/utils/setting-element";
import { ButtonStyle, CE, createButton } from "@utils/html";

export class BxSelectElement {
    static wrap($select: HTMLSelectElement) {
        // Remove "tabindex" attribute from <select>
        $select.removeAttribute('tabindex');

        const $btnPrev = createButton({
            label: '<',
            style: ButtonStyle.FOCUSABLE,
        });

        const $btnNext = createButton({
            label: '>',
            style: ButtonStyle.FOCUSABLE,
        });

        const isMultiple = $select.multiple;
        let $checkBox: HTMLInputElement;
        let $label: HTMLElement;
        let visibleIndex = $select.selectedIndex;

        let $content;

        if (isMultiple) {
            $content = CE('button', {
                class: 'bx-select-value bx-focusable',
                tabindex: 0,
            },
                $checkBox = CE('input', {type: 'checkbox'}),
                $label = CE('span', {}, ''),
            );

            $content.addEventListener('click', e => {
                $checkBox.click();
            });

            $checkBox.addEventListener('input', e => {
                const $option = getOptionAtIndex(visibleIndex);
                $option && ($option.selected = (e.target as HTMLInputElement).checked);

                BxEvent.dispatch($select, 'input');
            });
        } else {
            $content = CE('div', {},
                $label = CE('label', {for: $select.id + '_checkbox'}, ''),
            );
        }

        const getOptionAtIndex = (index: number): HTMLOptionElement | undefined => {
            const options = Array.from($select.querySelectorAll('option'));
            return options[index];
        }

        const render = (e?: Event) => {
            // console.log('options', this.options, 'selectedIndices', this.selectedIndices, 'selectedOptions', this.selectedOptions);
            if (e && (e as any).manualTrigger) {
                visibleIndex = $select.selectedIndex;
            }

            visibleIndex = normalizeIndex(visibleIndex);
            const $option = getOptionAtIndex(visibleIndex);
            let content = '';
            if ($option) {
                content = $option.textContent || '';

                if (content && $option.parentElement!.tagName === 'OPTGROUP') {
                    $label.innerHTML = '';
                    const fragment = document.createDocumentFragment();
                    fragment.appendChild(CE('span', {}, ($option.parentElement as HTMLOptGroupElement).label));
                    fragment.appendChild(document.createTextNode(content));

                    $label.appendChild(fragment);
                } else {
                    $label.textContent = content;
                }
            } else {
                $label.textContent = content;
            }

            // Add line-through on disabled option
            $label.classList.toggle('bx-line-through', $option && $option.disabled);

            // Hide checkbox when the selection is empty
            if (isMultiple) {
                $checkBox.checked = $option?.selected || false;
                $checkBox.classList.toggle('bx-gone', !content);
            }

            const disablePrev = visibleIndex <= 0;
            const disableNext = visibleIndex === $select.querySelectorAll('option').length - 1;

            $btnPrev.classList.toggle('bx-inactive', disablePrev);
            $btnNext.classList.toggle('bx-inactive', disableNext);

            // Focus the other button when reaching the beginning/end
            disablePrev && !disableNext && document.activeElement === $btnPrev && $btnNext.focus();
            disableNext && !disablePrev && document.activeElement === $btnNext && $btnPrev.focus();
        }

        const normalizeIndex = (index: number): number => {
            return Math.min(Math.max(index, 0), $select.querySelectorAll('option').length - 1);
        }

        const onPrevNext = (e: Event) => {
            if (!e.target) {
                return;
            }

            const goNext = (e.target as any).closest('button') === $btnNext;

            const currentIndex = visibleIndex;
            let newIndex = goNext ? currentIndex + 1 : currentIndex - 1;
            newIndex = normalizeIndex(newIndex);

            visibleIndex = newIndex;
            if (!isMultiple && newIndex !== currentIndex) {
                $select.selectedIndex = newIndex;
            }

            if (isMultiple) {
                render();
            } else {
                BxEvent.dispatch($select, 'input');
            }
        };

        $select.addEventListener('input', render);
        $btnPrev.addEventListener('click', onPrevNext);
        $btnNext.addEventListener('click', onPrevNext);

        const observer = new MutationObserver((mutationList, observer) => {
            mutationList.forEach(mutation => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    render();
                }
            });
        });

        observer.observe($select, {
            subtree: true,
            childList: true,
            attributes: true,
        });

        render();

        const $div = CE<NavigationElement>('div', {
            class: 'bx-select',
            _nearby: {
                orientation: 'horizontal',
                focus: $btnNext,
            }
        },
            $select,
            $btnPrev,
            $content,
            $btnNext,
        );

        Object.defineProperty($div, 'value', {
            get() {
                return $select.value;
            }
        });

        $div.addEventListener = function() {
            // @ts-ignore
            $select.addEventListener.apply($select, arguments);
        };

        $div.removeEventListener = function() {
            // @ts-ignore
            $select.removeEventListener.apply($select, arguments);
        };

        $div.dispatchEvent = function() {
            // @ts-ignore
            return $select.dispatchEvent.apply($select, arguments);
        };

        ($div as any).setValue = (value: any) => {
            if ('setValue' in $select) {
                ($select as BxSelectSettingElement).setValue(value);
            } else {
                $select.value = value;
            }
        };

        return $div;
    }
}
