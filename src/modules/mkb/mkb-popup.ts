import { CE, createButton, ButtonStyle, type BxButtonOptions } from "@/utils/html";
import { t } from "@/utils/translation";
import { ShortcutAction } from "@/enums/shortcut-actions";
import { SettingsDialog } from "../ui/dialog/settings-dialog";
import type { MkbHandler } from "./base-mkb-handler";
import { NativeMkbHandler } from "./native-mkb-handler";
import { StreamSettings } from "@/utils/stream-settings";
import { KeyHelper } from "./key-helper";
import { EventBus } from "@/utils/event-bus";

type MkbPopupType = 'virtual' | 'native';

export class MkbPopup {
    private static instance: MkbPopup;
    public static getInstance = () => MkbPopup.instance ?? (MkbPopup.instance = new MkbPopup());

    private popupType!: MkbPopupType;
    private $popup!: HTMLElement;
    private $title!: HTMLElement;
    private $btnActivate!: HTMLButtonElement;

    private mkbHandler!: MkbHandler;

    constructor() {
        this.render();

        EventBus.Script.on('keyboardShortcutsUpdated', () => {
            const $newButton = this.createActivateButton();
            this.$btnActivate.replaceWith($newButton);
            this.$btnActivate = $newButton;
        });
    }

    attachMkbHandler(handler: MkbHandler) {
        this.mkbHandler = handler;

        // Set popupType
        this.popupType = (handler instanceof NativeMkbHandler) ? 'native' : 'virtual';
        this.$popup.dataset.type = this.popupType;

        // Update popup title
        this.$title.innerText = t(this.popupType === 'native' ? 'native-mkb' : 'virtual-controller');
    }

    toggleVisibility(show: boolean) {
        this.$popup.classList.toggle('bx-gone', !show);
        show && this.moveOffscreen(false);
    }

    moveOffscreen(doMove: boolean) {
        this.$popup.classList.toggle('bx-offscreen', doMove);
    }

    private createActivateButton() {
        const options: BxButtonOptions = {
            style: ButtonStyle.PRIMARY | ButtonStyle.TALL | ButtonStyle.FULL_WIDTH,
            label: t('activate'),
            onClick: this.onActivate,
        };

        // Find shortcut key
        const shortcutKey = StreamSettings.findKeyboardShortcut(ShortcutAction.MKB_TOGGLE);
        if (shortcutKey) {
            options.secondaryText = t('press-key-to-toggle-mkb', { key: KeyHelper.codeToKeyName(shortcutKey) });
        }

        return createButton(options);
    }

    private onActivate = (e: Event) => {
        e.preventDefault();
        this.mkbHandler.toggle(true);
    }

    private render() {
        this.$popup = CE('div', { class: 'bx-mkb-pointer-lock-msg bx-gone' },
            this.$title = CE('p'),
            this.$btnActivate = this.createActivateButton(),

            CE('div', {},
                createButton({
                    label: t('ignore'),
                    style: ButtonStyle.GHOST,
                    onClick: e => {
                        e.preventDefault();
                        this.mkbHandler.toggle(false);
                        this.mkbHandler.waitForMouseData(false);
                    },
                }),

                createButton({
                    label: t('manage'),
                    style: ButtonStyle.FOCUSABLE,
                    onClick: () => {
                        const dialog = SettingsDialog.getInstance();
                        dialog.focusTab('mkb');
                        dialog.show();
                    },
                }),
            ),
        );

        document.documentElement.appendChild(this.$popup);
    }

    reset() {
        this.toggleVisibility(true);
        this.moveOffscreen(false);
    }
}
