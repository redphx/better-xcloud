type BxButton = {
    style?: number | string;
    url?: string;
    classes?: string[];
    icon?: string;
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
export enum Icon {
    STREAM_SETTINGS = '<g transform="matrix(.142357 0 0 .142357 -2.22021 -2.22164)" fill="none" stroke="#fff" stroke-width="16"><circle cx="128" cy="128" r="40"/><path d="M130.05 206.11h-4L94 224c-12.477-4.197-24.049-10.711-34.11-19.2l-.12-36c-.71-1.12-1.38-2.25-2-3.41L25.9 147.24a99.16 99.16 0 0 1 0-38.46l31.84-18.1c.65-1.15 1.32-2.29 2-3.41l.16-36C69.951 42.757 81.521 36.218 94 32l32 17.89h4L162 32c12.477 4.197 24.049 10.711 34.11 19.2l.12 36c.71 1.12 1.38 2.25 2 3.41l31.85 18.14a99.16 99.16 0 0 1 0 38.46l-31.84 18.1c-.65 1.15-1.32 2.29-2 3.41l-.16 36A104.59 104.59 0 0 1 162 224l-31.95-17.89z"/></g>',
    STREAM_STATS = '<path d="M1.181 24.55v-3.259c0-8.19 6.576-14.952 14.767-14.98H16c8.13 0 14.819 6.69 14.819 14.819v3.42c0 .625-.515 1.14-1.14 1.14H2.321c-.625 0-1.14-.515-1.14-1.14z"/><path d="M16 6.311v4.56M12.58 25.69l9.12-12.54m4.559 5.7h4.386m-29.266 0H5.74"/>',
    CONTROLLER = '<path d="M19.193 12.807h3.193m-13.836 0h4.257"/><path d="M10.678 10.678v4.257"/><path d="M13.061 19.193l-5.602 6.359c-.698.698-1.646 1.09-2.633 1.09-2.044 0-3.725-1.682-3.725-3.725a3.73 3.73 0 0 1 .056-.646l2.177-11.194a6.94 6.94 0 0 1 6.799-5.721h11.722c3.795 0 6.918 3.123 6.918 6.918s-3.123 6.918-6.918 6.918h-8.793z"/><path d="M18.939 19.193l5.602 6.359c.698.698 1.646 1.09 2.633 1.09 2.044 0 3.725-1.682 3.725-3.725a3.73 3.73 0 0 0-.056-.646l-2.177-11.194"/>',
    DISPLAY = '<path d="M1.238 21.119c0 1.928 1.565 3.493 3.493 3.493H27.27c1.928 0 3.493-1.565 3.493-3.493V5.961c0-1.928-1.565-3.493-3.493-3.493H4.731c-1.928 0-3.493 1.565-3.493 3.493v15.158zm19.683 8.413H11.08"/>',
    MOUSE = '<path d="M26.256 8.185c0-3.863-3.137-7-7-7h-6.512c-3.863 0-7 3.137-7 7v15.629c0 3.863 3.137 7 7 7h6.512c3.863 0 7-3.137 7-7V8.185z"/><path d="M16 13.721V6.883"/>',
    MOUSE_SETTINGS = '<g transform="matrix(1.10403 0 0 1.10403 -4.17656 -.560429)" fill="none" stroke="#fff"><g stroke-width="1.755"><path d="M24.49 16.255l.01-8.612A6.15 6.15 0 0 0 18.357 1.5h-5.714A6.15 6.15 0 0 0 6.5 7.643v13.715a6.15 6.15 0 0 0 6.143 6.143h5.714"/><path d="M15.5 12.501v-6"/></g><circle cx="48" cy="48" r="15" stroke-width="7.02" transform="matrix(.142357 0 0 .142357 17.667421 16.541885)"/><path d="M24.61 27.545h-.214l-1.711.955c-.666-.224-1.284-.572-1.821-1.025l-.006-1.922-.107-.182-1.701-.969c-.134-.678-.134-1.375 0-2.053l1.7-.966.107-.182.009-1.922c.537-.454 1.154-.803 1.82-1.029l1.708.955h.214l1.708-.955c.666.224 1.284.572 1.821 1.025l.006 1.922.107.182 1.7.968c.134.678.134 1.375 0 2.053l-1.7.966-.107.182-.009 1.922c-.536.455-1.154.804-1.819 1.029l-1.706-.955z" stroke-width=".999"/></g>',
    NEW = '<path d="M26.875 30.5H5.125c-.663 0-1.208-.545-1.208-1.208V2.708c0-.663.545-1.208 1.208-1.208h14.5l8.458 8.458v19.333c0 .663-.545 1.208-1.208 1.208z"/><path d="M19.625 1.5v8.458h8.458m-15.708 9.667h7.25"/><path d="M16 16v7.25"/>',
    COPY = '<path d="M1.498 6.772h23.73v23.73H1.498zm5.274-5.274h23.73v23.73"/>',
    TRASH = '<path d="M29.5 6.182h-27m9.818 7.363v9.818m7.364-9.818v9.818"/><path d="M27.045 6.182V29.5c0 .673-.554 1.227-1.227 1.227H6.182c-.673 0-1.227-.554-1.227-1.227V6.182m17.181 0V3.727a2.47 2.47 0 0 0-2.455-2.455h-7.364a2.47 2.47 0 0 0-2.455 2.455v2.455"/>',
    CURSOR_TEXT = '<path d="M16 7.3a5.83 5.83 0 0 1 5.8-5.8h2.9m0 29h-2.9a5.83 5.83 0 0 1-5.8-5.8"/><path d="M7.3 30.5h2.9a5.83 5.83 0 0 0 5.8-5.8V7.3a5.83 5.83 0 0 0-5.8-5.8H7.3"/><path d="M11.65 16h8.7"/>',
    QUESTION = '<g transform="matrix(.256867 0 0 .256867 -16.878964 -18.049342)"><circle cx="128" cy="180" r="12" fill="#fff"/><path d="M128 144v-8c17.67 0 32-12.54 32-28s-14.33-28-32-28-32 12.54-32 28v4" fill="none" stroke="#fff" stroke-width="16"/></g>',

    REMOTE_PLAY = '<g transform="matrix(.492308 0 0 .581818 -14.7692 -11.6364)"><clipPath id="A"><path d="M30 20h65v55H30z"/></clipPath><g clip-path="url(#A)"><g transform="matrix(.395211 0 0 .334409 11.913 7.01124)"><g transform="matrix(.555556 0 0 .555556 57.8889 -20.2417)" fill="none" stroke="#fff" stroke-width="13.88"><path d="M200 140.564c-42.045-33.285-101.955-33.285-144 0M168 165c-23.783-17.3-56.217-17.3-80 0"/></g><g transform="matrix(-.555556 0 0 -.555556 200.111 262.393)"><g transform="matrix(1 0 0 1 0 11.5642)"><path d="M200 129c-17.342-13.728-37.723-21.795-58.636-24.198C111.574 101.378 80.703 109.444 56 129" fill="none" stroke="#fff" stroke-width="13.88"/></g><path d="M168 165c-23.783-17.3-56.217-17.3-80 0" fill="none" stroke="#fff" stroke-width="13.88"/></g><g transform="matrix(.75 0 0 .75 32 32)"><path d="M24 72h208v93.881H24z" fill="none" stroke="#fff" stroke-linejoin="miter" stroke-width="9.485"/><circle cx="188" cy="128" r="12" stroke-width="10" transform="matrix(.708333 0 0 .708333 71.8333 12.8333)"/><path d="M24.358 103.5h110" fill="none" stroke="#fff" stroke-linecap="butt" stroke-width="10.282"/></g></g></g></g>',

    HAND_TAP = '<path d="M6.537 8.906c0-4.216 3.469-7.685 7.685-7.685s7.685 3.469 7.685 7.685M7.719 30.778l-4.333-7.389C3.133 22.944 3 22.44 3 21.928a2.97 2.97 0 0 1 2.956-2.956 2.96 2.96 0 0 1 2.55 1.461l2.761 4.433V8.906a2.97 2.97 0 0 1 2.956-2.956 2.97 2.97 0 0 1 2.956 2.956v8.276a2.97 2.97 0 0 1 2.956-2.956 2.97 2.97 0 0 1 2.956 2.956v2.365a2.97 2.97 0 0 1 2.956-2.956A2.97 2.97 0 0 1 29 19.547v5.32c0 3.547-1.182 5.911-1.182 5.911"/>',

    SCREENSHOT_B64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDMyIiBmaWxsPSIjZmZmIj48cGF0aCBkPSJNMjguMzA4IDUuMDM4aC00LjI2NWwtMi4wOTctMy4xNDVhMS4yMyAxLjIzIDAgMCAwLTEuMDIzLS41NDhoLTkuODQ2YTEuMjMgMS4yMyAwIDAgMC0xLjAyMy41NDhMNy45NTYgNS4wMzhIMy42OTJBMy43MSAzLjcxIDAgMCAwIDAgOC43MzF2MTcuMjMxYTMuNzEgMy43MSAwIDAgMCAzLjY5MiAzLjY5MmgyNC42MTVBMy43MSAzLjcxIDAgMCAwIDMyIDI1Ljk2MlY4LjczMWEzLjcxIDMuNzEgMCAwIDAtMy42OTItMy42OTJ6bS02Ljc2OSAxMS42OTJjMCAzLjAzOS0yLjUgNS41MzgtNS41MzggNS41MzhzLTUuNTM4LTIuNS01LjUzOC01LjUzOCAyLjUtNS41MzggNS41MzgtNS41MzggNS41MzggMi41IDUuNTM4IDUuNTM4eiIvPjwvc3ZnPgo=',
};

export const createSvgIcon = (icon: string, strokeWidth=2) => {
    const $svg = CE('svg', {
        'xmlns': 'http://www.w3.org/2000/svg',
        'fill': 'none',
        'stroke': '#fff',
        'fill-rule': 'evenodd',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': strokeWidth,
    });
    $svg.innerHTML = icon;
    $svg.setAttribute('viewBox', '0 0 32 32');

    return $svg;
};

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
        $btn = CE('button', {'class': 'bx-button'}) as HTMLButtonElement;
    }

    const style = (options.style || 0) as number;
    style && ButtonStyleIndices.forEach(index => {
            (style & index) && $btn.classList.add(ButtonStyle[index] as string);
        });

    options.classes && $btn.classList.add(...options.classes);

    options.icon && $btn.appendChild(createSvgIcon(options.icon, 4));
    options.label && $btn.appendChild(CE('span', {}, options.label));
    options.title && $btn.setAttribute('title', options.title);
    options.disabled && (($btn as HTMLButtonElement).disabled = true);
    options.onClick && $btn.addEventListener('click', options.onClick);

    return $btn as T;
}

export const CTN = document.createTextNode.bind(document);
window.BX_CE = createElement;
