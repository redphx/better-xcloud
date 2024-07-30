import { BX_FLAGS } from "@/utils/bx-flags";
import { BxIcon } from "@/utils/bx-icon";
import { AppInterface } from "@/utils/global";
import { ButtonStyle, createButton } from "@/utils/html";
import { t } from "@/utils/translation";

export class ProductDetailsPage {
    private static $btnShortcut = createButton({
        classes: ['bx-button-shortcut'],
        icon: BxIcon.CREATE_SHORTCUT,
        label: t('create-shortcut'),
        style: ButtonStyle.FOCUSABLE,
        tabIndex: 0,
        onClick: e => {
            AppInterface && AppInterface.createShortcut(window.location.pathname.substring(6));
        },
    });

    private static shortcutTimeoutId: number | null = null;

    static injectShortcutButton() {
        if (!AppInterface || BX_FLAGS.DeviceInfo.deviceType !== 'android') {
            return;
        }

        ProductDetailsPage.shortcutTimeoutId && clearTimeout(ProductDetailsPage.shortcutTimeoutId);
        ProductDetailsPage.shortcutTimeoutId = window.setTimeout(() => {
            // Find action buttons container
            const $container = document.querySelector('div[class*=ActionButtons-module__container]');
            if ($container) {
                $container.parentElement?.appendChild(ProductDetailsPage.$btnShortcut);
            }
        }, 500);
    }
}
