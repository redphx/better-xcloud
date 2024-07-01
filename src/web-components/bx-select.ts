import { ButtonStyle, CE, createButton } from "@utils/html";

export class BxSelectElement {
    static wrap($select: HTMLSelectElement) {
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
        let visibleIndex = $select.selectedIndex;
        let $checkBox: HTMLInputElement;
        let $label: HTMLElement;

        const $content = CE('div', {},
            $checkBox = CE('input', {type: 'checkbox', id: $select.id + '_checkbox'}),
            $label = CE('label', {for: $select.id + '_checkbox'}, ''),
        );

        isMultiple && $checkBox.addEventListener('input', e => {
            const $option = getOptionAtIndex(visibleIndex);
            $option && ($option.selected = (e.target as HTMLInputElement).checked);

            $select.dispatchEvent(new Event('input'));
        });

        // Only show checkbox in "multiple" <select>
        $checkBox.classList.toggle('bx-gone', !isMultiple);

        const getOptionAtIndex = (index: number): HTMLOptionElement | undefined => {
            return $select.querySelector(`option:nth-of-type(${visibleIndex + 1})`) as HTMLOptionElement;
        }

        const render = () => {
            // console.log('options', this.options, 'selectedIndices', this.selectedIndices, 'selectedOptions', this.selectedOptions);

            visibleIndex = normalizeIndex(visibleIndex);

            const $option = getOptionAtIndex(visibleIndex);
            let content = '';
            if ($option) {
                content = $option.textContent || '';
            }

            $label.textContent = content;

            // Hide checkbox when the selection is empty
            isMultiple && ($checkBox.checked = $option?.selected || false);
            $checkBox.classList.toggle('bx-gone', !isMultiple || !content);

            const disablePrev = visibleIndex <= 0;
            const disableNext = visibleIndex === $select.querySelectorAll('option').length - 1;

            $btnPrev.classList.toggle('bx-inactive', disablePrev);
            disablePrev && $btnNext.focus();

            $btnNext.classList.toggle('bx-inactive', disableNext);
            disableNext && $btnPrev.focus();
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

            $select.dispatchEvent(new Event('input'));
        };

        $select.addEventListener('input', e => render());
        $btnPrev.addEventListener('click', onPrevNext);
        $btnNext.addEventListener('click', onPrevNext);

        const observer = new MutationObserver((mutationList, observer) => {
            mutationList.forEach(mutation => {
                mutation.type === 'childList' && render();
            });
        });

        observer.observe($select, {
            subtree: true,
            childList: true,
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
