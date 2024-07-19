import { ButtonStyle, CE, createButton } from "@utils/html";

export class BxSelectElement {
    static wrap($select: HTMLSelectElement) {
        // Remove "tabindex" attribute from <select>
        $select.removeAttribute('tabindex');

        const $btnPrev = createButton({
            label: '<',
            style: ButtonStyle.FOCUSABLE,
            attributes: {
                tabindex: 0,
            },
        });

        const $btnNext = createButton({
            label: '>',
            style: ButtonStyle.FOCUSABLE,
            attributes: {
                tabindex: 0,
            },
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

                $select.dispatchEvent(new Event('input'));
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
            // disablePrev && document.activeElement === $btnPrev && $btnNext.focus();

            $btnNext.classList.toggle('bx-inactive', disableNext);
            // disableNext && document.activeElement === $btnNext &&$btnPrev.focus();
        }

        const normalizeIndex = (index: number): number => {
            return Math.min(Math.max(index, 0), $select.querySelectorAll('option').length - 1);
        }

        const onPrevNext = (e: Event) => {
            const goNext = e.target === $btnNext;

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
                $select.dispatchEvent(new Event('input'));
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

        return CE('div', {class: 'bx-select'},
            $select,
            $btnPrev,
            $content,
            $btnNext,
        );
    }
}
