import type { BxIcon } from "@utils/bx-icon";
import { setNearby } from "./navigation-utils";
import type { NavigationNearbyElements } from "@/modules/ui/dialog/navigation-dialog";

type BxButton = {
    style?: number | string | ButtonStyle;
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

type ButtonStyle = {[index: string]: number} & {[index: number]: string};

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

export const ButtonStyle: DualEnum = {};
ButtonStyle[ButtonStyle.PRIMARY = 1] = 'bx-primary';
ButtonStyle[ButtonStyle.DANGER = 2] = 'bx-danger';
ButtonStyle[ButtonStyle.GHOST = 4] = 'bx-ghost';
ButtonStyle[ButtonStyle.FROSTED = 8] = 'bx-frosted';
ButtonStyle[ButtonStyle.DROP_SHADOW = 16] = 'bx-drop-shadow';
ButtonStyle[ButtonStyle.FOCUSABLE = 32] = 'bx-focusable';
ButtonStyle[ButtonStyle.FULL_WIDTH = 64] = 'bx-full-width';
ButtonStyle[ButtonStyle.FULL_HEIGHT = 128] = 'bx-full-height';
ButtonStyle[ButtonStyle.TALL = 256] = 'bx-tall';
ButtonStyle[ButtonStyle.CIRCULAR = 512] = 'bx-circular';
ButtonStyle[ButtonStyle.NORMAL_CASE = 1024] = 'bx-normal-case';

const ButtonStyleIndices = Object.keys(ButtonStyle).splice(0, Object.keys(ButtonStyle).length / 2).map(i => parseInt(i));

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
    style && ButtonStyleIndices.forEach(index => {
            (style & index) && $btn.classList.add(ButtonStyle[index] as string);
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
    return !!rect.width && !!rect.height;
}

export const CTN = document.createTextNode.bind(document);
window.BX_CE = createElement;
