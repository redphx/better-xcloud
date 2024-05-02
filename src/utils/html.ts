import iconController from "@assets/svg/controller.svg" with { type: "text" };
import iconCopy from "@assets/svg/copy.svg" with { type: "text" };
import iconCursorText from "@assets/svg/cursor-text.svg" with { type: "text" };
import iconDisplay from "@assets/svg/display.svg" with { type: "text" };
import iconMouseSettings from "@assets/svg/mouse-settings.svg" with { type: "text" };
import iconMouse from "@assets/svg/mouse.svg" with { type: "text" };
import iconNew from "@assets/svg/new.svg" with { type: "text" };
import iconQuestion from "@assets/svg/question.svg" with { type: "text" };
import iconRemotePlay from "@assets/svg/remote-play.svg" with { type: "text" };
import iconStreamSettings from "@assets/svg/stream-settings.svg" with { type: "text" };
import iconStreamStats from "@assets/svg/stream-stats.svg" with { type: "text" };
import iconTrash from "@assets/svg/trash.svg" with { type: "text" };


type BxButton = {
    style?: number | string;
    url?: string;
    classes?: string[];
    icon?: Icon;
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

export enum Icon {
    STREAM_SETTINGS = iconStreamSettings,
    STREAM_STATS = iconStreamStats,
    CONTROLLER = iconController,
    DISPLAY = iconDisplay,
    MOUSE = iconMouse,
    MOUSE_SETTINGS = iconMouseSettings,
    NEW = iconNew,
    COPY = iconCopy,
    TRASH = iconTrash,
    CURSOR_TEXT = iconCursorText,
    QUESTION = iconQuestion,

    REMOTE_PLAY = iconRemotePlay,

    // HAND_TAP = '<path d="M6.537 8.906c0-4.216 3.469-7.685 7.685-7.685s7.685 3.469 7.685 7.685M7.719 30.778l-4.333-7.389C3.133 22.944 3 22.44 3 21.928a2.97 2.97 0 0 1 2.956-2.956 2.96 2.96 0 0 1 2.55 1.461l2.761 4.433V8.906a2.97 2.97 0 0 1 2.956-2.956 2.97 2.97 0 0 1 2.956 2.956v8.276a2.97 2.97 0 0 1 2.956-2.956 2.97 2.97 0 0 1 2.956 2.956v2.365a2.97 2.97 0 0 1 2.956-2.956A2.97 2.97 0 0 1 29 19.547v5.32c0 3.547-1.182 5.911-1.182 5.911"/>',
};

export const createSvgIcon = (icon: Icon) => {
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
        $btn = CE('button', {'class': 'bx-button'}) as HTMLButtonElement;
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

export const CTN = document.createTextNode.bind(document);
window.BX_CE = createElement;
