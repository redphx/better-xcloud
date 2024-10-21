import { GuideMenu } from "@/modules/ui/guide-menu";
import { BxEvent } from "./bx-event";
import { BX_FLAGS } from "./bx-flags";
import { BxLogger } from "./bx-logger";
import { BxIcon } from "./bx-icon";
import { AppInterface } from "./global";
import { createButton, ButtonStyle } from "./html";
import { t } from "./translation";
import { parseDetailsPath } from "./utils";


export class RootDialogObserver {
    private static $btnShortcut = AppInterface && createButton({
        icon: BxIcon.CREATE_SHORTCUT,
        label: t('create-shortcut'),
        style: ButtonStyle.FOCUSABLE | ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH | ButtonStyle.NORMAL_CASE | ButtonStyle.NORMAL_LINK,
        tabIndex: 0,
        onClick: e => {
            window.BX_EXPOSED.dialogRoutes?.closeAll();

            const $btn = (e.target as HTMLElement).closest('button');
            AppInterface.createShortcut($btn?.dataset.path);
        },
    });

    private static $btnWallpaper = AppInterface && createButton({
        icon: BxIcon.DOWNLOAD,
        label: t('wallpaper'),
        style: ButtonStyle.FOCUSABLE | ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH | ButtonStyle.NORMAL_CASE | ButtonStyle.NORMAL_LINK,
        tabIndex: 0,
        onClick: e => {
            window.BX_EXPOSED.dialogRoutes?.closeAll();

            const $btn = (e.target as HTMLElement).closest('button');
            const details = parseDetailsPath($btn!.dataset.path!);
            details && AppInterface.downloadWallpapers(details.titleSlug, details.productId);
        },
    });

    private static handleGameCardMenu($root: HTMLElement) {
        const $detail = $root.querySelector('a[href^="/play/"]') as HTMLAnchorElement;
        if (!$detail) {
            return;
        }

        const path = $detail.getAttribute('href')!;
        RootDialogObserver.$btnShortcut.dataset.path = path;
        RootDialogObserver.$btnWallpaper.dataset.path = path;

        $root.append(RootDialogObserver.$btnShortcut, RootDialogObserver.$btnWallpaper);
    }

    private static handleAddedElement($root: HTMLElement, $addedElm: HTMLElement): boolean {
        if (AppInterface && $addedElm.className.startsWith('SlideSheet-module__container')) {
            // Game card's context menu
            const $gameCardMenu = $addedElm.querySelector<HTMLElement>('div[class^=MruContextMenu],div[class^=GameCardContextMenu]');
            if ($gameCardMenu) {
                RootDialogObserver.handleGameCardMenu($gameCardMenu);
                return true;
            }
        } else if ($root.querySelector('div[class*=GuideDialog]')) {
            // Guide menu
            GuideMenu.getInstance().observe($addedElm);
            return true;
        }

        return false;
    }

    private static observe($root: HTMLElement) {
        let beingShown = false;

        const observer = new MutationObserver(mutationList => {
            for (const mutation of mutationList) {
                if (mutation.type !== 'childList') {
                    continue;
                }

                BX_FLAGS.Debug && BxLogger.warning('RootDialog', 'added', mutation.addedNodes);
                if (mutation.addedNodes.length === 1) {
                    const $addedElm = mutation.addedNodes[0];
                    if ($addedElm instanceof HTMLElement && $addedElm.className) {
                        RootDialogObserver.handleAddedElement($root, $addedElm);
                    }
                }

                const shown = !!($root.firstElementChild && $root.firstElementChild.childElementCount > 0);
                if (shown !== beingShown) {
                    beingShown = shown;
                    BxEvent.dispatch(window, shown ? BxEvent.XCLOUD_DIALOG_SHOWN : BxEvent.XCLOUD_DIALOG_DISMISSED);
                }
            }
        });
        observer.observe($root, {subtree: true, childList: true});
    }

    public static waitForRootDialog() {
        const observer = new MutationObserver(mutationList => {
            for (const mutation of mutationList) {
                if (mutation.type !== 'childList') {
                    continue;
                }

                const $target = mutation.target as HTMLElement;
                if ($target.id && $target.id === 'gamepass-dialog-root') {
                    observer.disconnect();
                    RootDialogObserver.observe($target);
                    break;
                }
            };
        });
        observer.observe(document.documentElement, {subtree: true, childList: true});
    }
}
