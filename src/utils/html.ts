import type { BxIcon } from "@utils/bx-icon";

type BxButton = {
    style?: number | string;
    url?: string;
    classes?: string[];
    icon?: typeof BxIcon;
    label?: string;
    title?: string;
    disabled?: boolean;
    onClick?: EventListener;
}

type ButtonStyle = {[index: string]: number} & {[index: number]: string};

// Quickly create a tree of elements without having to use innerHTML
function createElement<T=HTMLElement>(elmName: string, props: {[index: string]: any}={}, ..._: any): T {
    let $elm;
    const hasNs = 'xmlns' in props;

    if (hasNs) {
        $elm = document.createElementNS(props.xmlns, elmName);
        delete props.xmlns;
    } else {
        $elm = document.createElement(elmName);
    }

    for (const key in props) {
        if ($elm.hasOwnProperty(key)) {
            continue;
        }

        if (hasNs) {
            $elm.setAttributeNS(null, key, props[key]);
        } else {
            $elm.setAttribute(key, props[key]);
        }
    }

    for (let i = 2, size = arguments.length; i < size; i++) {
        const arg = arguments[i];
        const argType = typeof arg;

        if (argType === 'string' || argType === 'number') {
            $elm.appendChild(document.createTextNode(arg));
        } else if (arg) {
            $elm.appendChild(arg);
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
ButtonStyle[ButtonStyle.FOCUSABLE = 8] = 'bx-focusable';
ButtonStyle[ButtonStyle.FULL_WIDTH = 16] = 'bx-full-width';
ButtonStyle[ButtonStyle.FULL_HEIGHT = 32] = 'bx-full-height';

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

    return $btn as T;
}

export function escapeHtml(html: string): string {
    const text = document.createTextNode(html);
    const $span = document.createElement('span');
    $span.appendChild(text);

    return $span.innerHTML;
}

export const CTN = document.createTextNode.bind(document);
window.BX_CE = createElement;
