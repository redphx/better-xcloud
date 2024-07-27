import { escapeHtml } from "@utils/html";
import { Toast } from "@utils/toast";
import { BxEvent } from "@utils/bx-event";
import { NATIVE_FETCH } from "@utils/bx-flags";
import { t } from "@utils/translation";
import { BxLogger } from "@utils/bx-logger";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";

const LOG_TAG = 'TouchController';

type TouchControlLayout = {
    name: string,
    author: string,
    content: any,
};

type TouchControlDefinition = {
    name: string,
    product_id: string,
    default_layout: string,
    layouts: Record<string, TouchControlLayout>,
};

export class TouchController {
    static readonly #EVENT_SHOW_DEFAULT_CONTROLLER = new MessageEvent('message', {
            data: JSON.stringify({
                content: '{"layoutId":""}',
                target: '/streaming/touchcontrols/showlayoutv2',
                type: 'Message',
            }),
            origin: 'better-xcloud',
        });

    /*
    static readonly #EVENT_HIDE_CONTROLLER = new MessageEvent('message', {
            data: '{"content":"","target":"/streaming/touchcontrols/hide","type":"Message"}',
            origin: 'better-xcloud',
        });
    */

    static #$style: HTMLStyleElement;

    static #enabled = false;
    static #dataChannel: RTCDataChannel | null;

    static #customLayouts: Record<string, TouchControlDefinition | null> = {};
    static #baseCustomLayouts: Record<string, Record<string, TouchControlLayout>> = {};
    static #currentLayoutId: string;

    static #customList: string[];

    static #xboxTitleId: string | null = null;

    static setXboxTitleId(xboxTitleId: string) {
        TouchController.#xboxTitleId = xboxTitleId;
    }

    static getCustomLayouts() {
        const xboxTitleId = TouchController.#xboxTitleId;
        if (!xboxTitleId) {
            return null;
        }

        return TouchController.#customLayouts[xboxTitleId];
    }

    static enable() {
        TouchController.#enabled = true;
    }

    static disable() {
        TouchController.#enabled = false;
    }

    static isEnabled() {
        return TouchController.#enabled;
    }

    static #showDefault() {
        TouchController.#dispatchMessage(TouchController.#EVENT_SHOW_DEFAULT_CONTROLLER);
    }

    static #show() {
        document.querySelector('#BabylonCanvasContainer-main')?.parentElement?.classList.remove('bx-offscreen');
    }

    static #hide() {
        document.querySelector('#BabylonCanvasContainer-main')?.parentElement?.classList.add('bx-offscreen');
    }

    static toggleVisibility(status: boolean) {
        if (!TouchController.#dataChannel) {
            return;
        }

        status ? TouchController.#hide() : TouchController.#show();
    }

    static reset() {
        TouchController.#enabled = false;
        TouchController.#dataChannel = null;
        TouchController.#xboxTitleId = null;

        TouchController.#$style && (TouchController.#$style.textContent = '');
    }

    static #dispatchMessage(msg: any) {
        TouchController.#dataChannel && window.setTimeout(() => {
            TouchController.#dataChannel!.dispatchEvent(msg);
        }, 10);
    }

    static #dispatchLayouts(data: any) {
        // Load default layout
        TouchController.applyCustomLayout(null, 1000);

        BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED);
    };

    static async requestCustomLayouts(retries: number=1) {
        const xboxTitleId = TouchController.#xboxTitleId;
        if (!xboxTitleId) {
            return;
        }

        if (xboxTitleId in TouchController.#customLayouts) {
            TouchController.#dispatchLayouts(TouchController.#customLayouts[xboxTitleId]);
            return;
        }

        retries = retries || 1;
        if (retries > 2) {
            TouchController.#customLayouts[xboxTitleId] = null;
            // Wait for BX_EXPOSED.touchLayoutManager
            window.setTimeout(() => TouchController.#dispatchLayouts(null), 1000);
            return;
        }

        const baseUrl = 'https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/touch-layouts';
        const url = `${baseUrl}/${xboxTitleId}.json`;

        // Get layout info
        try {
            const resp = await NATIVE_FETCH(url);
            const json = await resp.json();

            const layouts = {};

            json.layouts.forEach(async (layoutName: string) => {
                let baseLayouts = {};
                if (layoutName in TouchController.#baseCustomLayouts) {
                    baseLayouts = TouchController.#baseCustomLayouts[layoutName];
                } else {
                    try {
                        const layoutUrl = `${baseUrl}/layouts/${layoutName}.json`;
                        const resp = await NATIVE_FETCH(layoutUrl);
                        const json = await resp.json();

                        baseLayouts = json.layouts;
                        TouchController.#baseCustomLayouts[layoutName] = baseLayouts;
                    } catch (e) {}
                }

                Object.assign(layouts, baseLayouts);
            });

            json.layouts = layouts;
            TouchController.#customLayouts[xboxTitleId] = json;

            // Wait for BX_EXPOSED.touchLayoutManager
            window.setTimeout(() => TouchController.#dispatchLayouts(json), 1000);
        } catch (e) {
            // Retry
            TouchController.requestCustomLayouts(retries + 1);
        }
    }

    static applyCustomLayout(layoutId: string | null, delay: number=0) {
        // TODO: fix this
        if (!window.BX_EXPOSED.touchLayoutManager) {
            const listener = (e: Event) => {
                window.removeEventListener(BxEvent.TOUCH_LAYOUT_MANAGER_READY, listener);
                if (TouchController.#enabled) {
                    TouchController.applyCustomLayout(layoutId, 0);
                }
            };
            window.addEventListener(BxEvent.TOUCH_LAYOUT_MANAGER_READY, listener);

            return;
        }

        const xboxTitleId = TouchController.#xboxTitleId;
        if (!xboxTitleId) {
            BxLogger.error(LOG_TAG, 'Invalid xboxTitleId');
            return;
        }

        if (!layoutId) {
            // Get default layout ID from definition
            layoutId = TouchController.#customLayouts[xboxTitleId]?.default_layout || null;
        }

        if (!layoutId) {
            BxLogger.error(LOG_TAG, 'Invalid layoutId, show default controller');
            TouchController.#enabled && TouchController.#showDefault();
            return;
        }

        const layoutChanged = TouchController.#currentLayoutId !== layoutId;
        TouchController.#currentLayoutId = layoutId;

        // Get layout data
        const layoutData = TouchController.#customLayouts[xboxTitleId];
        if (!xboxTitleId || !layoutId || !layoutData) {
            TouchController.#enabled && TouchController.#showDefault();
            return;
        }

        const layout = (layoutData.layouts[layoutId] || layoutData.layouts[layoutData.default_layout]);
        if (!layout) {
            return;
        }

        // Show a toast with layout's name
        let msg: string;
        let html = false;
        if (layout.author) {
            const author = `<b>${escapeHtml(layout.author)}</b>`;
            msg = t('touch-control-layout-by', {name: author});
            html = true;
        } else {
            msg = t('touch-control-layout');
        }

        layoutChanged && Toast.show(msg, layout.name, {html: html});

        window.setTimeout(() => {
            // Show gyroscope control in the "More options" dialog if this layout has gyroscope
            window.BX_EXPOSED.shouldShowSensorControls = JSON.stringify(layout).includes('gyroscope');

            window.BX_EXPOSED.touchLayoutManager.changeLayoutForScope({
                type: 'showLayout',
                scope: xboxTitleId,
                subscope: 'base',
                layout: {
                    id: 'System.Standard',
                    displayName: 'System',
                    layoutFile: layout,
                }
            });
        }, delay);
    }

    static updateCustomList() {
        const key = 'better_xcloud_custom_touch_layouts';
        TouchController.#customList = JSON.parse(window.localStorage.getItem(key) || '[]');

        NATIVE_FETCH('https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/touch-layouts/ids.json')
            .then(response => response.json())
            .then(json => {
                TouchController.#customList = json;
                window.localStorage.setItem(key, JSON.stringify(json));
            });
    }

    static getCustomList(): string[] {
        return TouchController.#customList;
    }

    static setup() {
        // Function for testing touch control
        (window as any).testTouchLayout = (layout: any) => {
            const { touchLayoutManager } = window.BX_EXPOSED;

            touchLayoutManager && touchLayoutManager.changeLayoutForScope({
                type: 'showLayout',
                scope: '' + TouchController.#xboxTitleId,
                subscope: 'base',
                layout: {
                    id: 'System.Standard',
                    displayName: 'Custom',
                    layoutFile: layout,
                },
            });
        };

        const $style = document.createElement('style');
        document.documentElement.appendChild($style);

        TouchController.#$style = $style;

        const PREF_STYLE_STANDARD = getPref(PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD);
        const PREF_STYLE_CUSTOM = getPref(PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM);

        window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, e => {
            const dataChannel = (e as any).dataChannel;
            if (!dataChannel || dataChannel.label !== 'message') {
                return;
            }

            // Apply touch controller's style
            let filter = '';
            if (TouchController.#enabled) {
                if (PREF_STYLE_STANDARD === 'white') {
                    filter = 'grayscale(1) brightness(2)';
                } else if (PREF_STYLE_STANDARD === 'muted') {
                    filter = 'sepia(0.5)';
                }
            } else if (PREF_STYLE_CUSTOM === 'muted') {
                filter = 'sepia(0.5)';
            }

            if (filter) {
                $style.textContent = `#babylon-canvas { filter: ${filter} !important; }`;
            } else {
                $style.textContent = '';
            }

            TouchController.#dataChannel = dataChannel;

            // Fix sometimes the touch controller doesn't show at the beginning
            dataChannel.addEventListener('open', () => {
                window.setTimeout(TouchController.#show, 1000);
            });

            let focused = false;
            dataChannel.addEventListener('message', (msg: MessageEvent) => {
                if (msg.origin === 'better-xcloud' || typeof msg.data !== 'string') {
                    return;
                }

                // Dispatch a message to display generic touch controller
                if (msg.data.includes('touchcontrols/showtitledefault')) {
                    if (TouchController.#enabled) {
                        if (focused) {
                            TouchController.requestCustomLayouts();
                        } else {
                            TouchController.#showDefault();
                        }
                    }
                    return;
                }

                // Load custom touch layout
                try {
                    if (msg.data.includes('/titleinfo')) {
                        const json = JSON.parse(JSON.parse(msg.data).content);

                        focused = json.focused;
                        if (!json.focused) {
                            TouchController.#show();
                        }

                        TouchController.setXboxTitleId(parseInt(json.titleid, 16).toString());
                    }
                } catch (e) {
                    BxLogger.error(LOG_TAG, 'Load custom layout', e);
                }
            });
        });
    }
}
