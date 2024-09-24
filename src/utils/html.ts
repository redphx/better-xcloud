import type { BxIcon } from "@utils/bx-icon";
import { setNearby } from "./navigation-utils";
import type { NavigationNearbyElements } from "@/modules/ui/dialog/navigation-dialog";

export enum ButtonStyle {
    PRIMARY = 1,
    DANGER = 2,
    GHOST = 4,
    FROSTED = 8,
    DROP_SHADOW = 16,
    FOCUSABLE = 32,
    FULL_WIDTH = 64,
    FULL_HEIGHT = 128,
    TALL = 256,
    CIRCULAR = 512,
    NORMAL_CASE = 1024,
    NORMAL_LINK = 2048,
}

const ButtonStyleClass = {
    [ButtonStyle.PRIMARY]: 'bx-primary',
    [ButtonStyle.DANGER]: 'bx-danger',
    [ButtonStyle.GHOST]: 'bx-ghost',
    [ButtonStyle.FROSTED]: 'bx-frosted',
    [ButtonStyle.DROP_SHADOW]: 'bx-drop-shadow',
    [ButtonStyle.FOCUSABLE]: 'bx-focusable',
    [ButtonStyle.FULL_WIDTH]: 'bx-full-width',
    [ButtonStyle.FULL_HEIGHT]: 'bx-full-height',
    [ButtonStyle.TALL]: 'bx-tall',
    [ButtonStyle.CIRCULAR]: 'bx-circular',
    [ButtonStyle.NORMAL_CASE]: 'bx-normal-case',
    [ButtonStyle.NORMAL_LINK]: 'bx-normal-link',
}

export type BxButton = {
    style?: ButtonStyle;
    url?: string;
    classes?: string[];
    icon?: typeof BxIcon;
    label?: string;
    title?: string;
    disabled?: boolean;
    onClick?: EventListener;
    tabIndex?: number;
    attributes?: {[key: string]: any},
}

// Quickly create a tree of elements without having to use innerHTML
type CreateElementOptions = {
    [index: string]: any;
    _nearby?: NavigationNearbyElements;
};


function createElement<T=HTMLElement>(elmName: string, props: CreateElementOptions={}, ..._: any): T {
    let $elm;
    const hasNs = 'xmlns' in props;

    if (hasNs) {
        $elm = document.createElementNS(props.xmlns, elmName);
        delete props.xmlns;
    } else {
        $elm = document.createElement(elmName);
    }

    if (props['_nearby']) {
        setNearby($elm, props['_nearby']);
        delete props['_nearby'];
    }

    for (const key in props) {
        if ($elm.hasOwnProperty(key)) {
            continue;
        }

        if (hasNs) {
            $elm.setAttributeNS(null, key, props[key]);
        } else {
            if (key === 'on') {
                for (const eventName in props[key]) {
                    $elm.addEventListener(eventName, props[key][eventName]);
                }
            } else {
                $elm.setAttribute(key, props[key]);
            }
        }
    }

    for (let i = 2, size = arguments.length; i < size; i++) {
        const arg = arguments[i];

        if (arg instanceof Node) {
            $elm.appendChild(arg);
        } else if (arg !== null && arg !== false && typeof arg !== 'undefined') {
            $elm.appendChild(document.createTextNode(arg));
        }
    }

    return $elm as T;
}

export const CE = createElement;

// Credit: https://phosphoricons.com
const svgParser = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;

export const createSvgIcon = (icon: typeof BxIcon) => {
    return svgParser(icon.toString());
}

const ButtonStyleIndices = Object.keys(ButtonStyleClass).map(i => parseInt(i));

export const createButton = <T=HTMLButtonElement>(options: BxButton): T => {
    let $btn;
    if (options.url) {
        $btn = CE('a', {'class': 'bx-button'}) as HTMLAnchorElement;
        $btn.href = options.url;
        $btn.target = '_blank';
    } else {
        $btn = CE('button', {'class': 'bx-button', type: 'button'}) as HTMLButtonElement;
    }

    const style = (options.style || 0) as number;
    style && ButtonStyleIndices.forEach((index: keyof typeof ButtonStyleClass) => {
            (style & index) && $btn.classList.add(ButtonStyleClass[index] as string);
        });

    options.classes && $btn.classList.add(...options.classes);

    options.icon && $btn.appendChild(createSvgIcon(options.icon));
    options.label && $btn.appendChild(CE('span', {}, options.label));
    options.title && $btn.setAttribute('title', options.title);
    options.disabled && (($btn as HTMLButtonElement).disabled = true);
    options.onClick && $btn.addEventListener('click', options.onClick);
    $btn.tabIndex = typeof options.tabIndex === 'number' ? options.tabIndex : 0;

    for (const key in options.attributes) {
        if (!$btn.hasOwnProperty(key)) {
            $btn.setAttribute(key, options.attributes[key]);
        }
    }

    return $btn as T;
}

export function getReactProps($elm: HTMLElement): any | null {
    for (const key in $elm) {
        if (key.startsWith('__reactProps')) {
            return ($elm as any)[key];
        }
    }

    return null;
}

export function escapeHtml(html: string): string {
    const text = document.createTextNode(html);
    const $span = document.createElement('span');
    $span.appendChild(text);

    return $span.innerHTML;
}

export function isElementVisible($elm: HTMLElement): boolean {
    const rect = $elm.getBoundingClientRect();
    return (rect.x >= 0 || rect.y >= 0) && !!rect.width && !!rect.height;
}

export const CTN = document.createTextNode.bind(document);
window.BX_CE = createElement;

export function removeChildElements($parent: HTMLElement) {
    while ($parent.firstElementChild) {
        $parent.firstElementChild.remove();
    }
}

export function clearFocus() {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
}


export function clearDataSet($elm: HTMLElement) {
    Object.keys($elm.dataset).forEach(key => {
        delete $elm.dataset[key];
    });
}
