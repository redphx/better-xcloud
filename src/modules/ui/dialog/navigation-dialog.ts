import { GamepadKey } from "@/enums/mkb";
import { PrefKey } from "@/enums/pref-keys";
import { VIRTUAL_GAMEPAD_ID } from "@/modules/mkb/mkb-handler";
import { BxEvent } from "@/utils/bx-event";
import { STATES } from "@/utils/global";
import { CE, isElementVisible } from "@/utils/html";
import { setNearby } from "@/utils/navigation-utils";
import { getPref } from "@/utils/settings-storages/global-settings-storage";

export enum NavigationDirection {
    UP = 1,
    RIGHT,
    DOWN,
    LEFT,
}

export type NavigationNearbyElements = Partial<{
    orientation: 'horizontal' | 'vertical',
    selfOrientation: 'horizontal' | 'vertical',

    focus: NavigationElement | (() => boolean),
    loop: ((direction: NavigationDirection) => boolean),
    [NavigationDirection.UP]: NavigationElement | (() => void) | 'previous' | 'next',
    [NavigationDirection.DOWN]: NavigationElement | (() => void) | 'previous' | 'next',
    [NavigationDirection.LEFT]: NavigationElement | (() => void) | 'previous' | 'next',
    [NavigationDirection.RIGHT]: NavigationElement | (() => void) | 'previous' | 'next',
}>;

export interface NavigationElement extends HTMLElement {
    nearby?: NavigationNearbyElements;
}


export abstract class NavigationDialog {
    abstract getDialog(): NavigationDialog;
    abstract getContent(): HTMLElement;

    abstract focusIfNeeded(): void;

    abstract $container: HTMLElement;
    dialogManager: NavigationDialogManager;

    constructor() {
        this.dialogManager = NavigationDialogManager.getInstance();
    }

    show() {
        NavigationDialogManager.getInstance().show(this);

        const $currentFocus = this.getFocusedElement();
        // If not focusing on any element
        if (!$currentFocus) {
            this.focusIfNeeded();
        }
    }

    hide() {
        NavigationDialogManager.getInstance().hide();
    }

    getFocusedElement() {
        const $activeElement = document.activeElement as HTMLElement;
        if (!$activeElement) {
            return null;
        }

        // Check if focused element is a child of dialog
        if (this.$container.contains($activeElement)) {
            return $activeElement;
        }

        return null;
    }

    onBeforeMount(): void {}
    onMounted(): void {}
    onBeforeUnmount(): void {}
    onUnmounted(): void {}

    handleKeyPress(key: string): boolean {
        return false;
    }

    handleGamepad(button: GamepadKey): boolean {
        return false;
    }
}

export class NavigationDialogManager {
    private static instance: NavigationDialogManager;
    public static getInstance(): NavigationDialogManager {
        if (!NavigationDialogManager.instance) {
            NavigationDialogManager.instance = new NavigationDialogManager();
        }
        return NavigationDialogManager.instance;
    }

    private static readonly GAMEPAD_POLLING_INTERVAL = 50;
    private static readonly GAMEPAD_KEYS = [
        GamepadKey.UP,
        GamepadKey.DOWN,
        GamepadKey.LEFT,
        GamepadKey.RIGHT,
        GamepadKey.A,
        GamepadKey.B,
        GamepadKey.LB,
        GamepadKey.RB,
        GamepadKey.LT,
        GamepadKey.RT,
    ];

    private static readonly GAMEPAD_DIRECTION_MAP = {
        [GamepadKey.UP]: NavigationDirection.UP,
        [GamepadKey.DOWN]: NavigationDirection.DOWN,
        [GamepadKey.LEFT]: NavigationDirection.LEFT,
        [GamepadKey.RIGHT]: NavigationDirection.RIGHT,

        [GamepadKey.LS_UP]: NavigationDirection.UP,
        [GamepadKey.LS_DOWN]: NavigationDirection.DOWN,
        [GamepadKey.LS_LEFT]: NavigationDirection.LEFT,
        [GamepadKey.LS_RIGHT]: NavigationDirection.RIGHT,
    };

    private static readonly SIBLING_PROPERTY_MAP = {
        'horizontal': {
            [NavigationDirection.LEFT]: 'previousElementSibling',
            [NavigationDirection.RIGHT]: 'nextElementSibling',
        },

        'vertical': {
            [NavigationDirection.UP]: 'previousElementSibling',
            [NavigationDirection.DOWN]: 'nextElementSibling',
        },
    };

    private gamepadPollingIntervalId: number | null = null;
    private gamepadLastStates: Array<[number, GamepadKey, boolean] | null> = [];
    private gamepadHoldingIntervalId: number | null = null;

    private $overlay: HTMLElement;
    private $container: HTMLElement;
    private dialog: NavigationDialog | null = null;

    constructor() {
        this.$overlay = CE('div', {class: 'bx-navigation-dialog-overlay bx-gone'});
        this.$overlay.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            this.hide();
        });

        document.documentElement.appendChild(this.$overlay);

        this.$container = CE('div', {class: 'bx-navigation-dialog bx-gone'});
        document.documentElement.appendChild(this.$container);

        // Hide dialog when the Guide menu is shown
        window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, e => this.hide());

        // Calculate minimum width of controller-friendly <select> elements
        if (getPref(PrefKey.UI_CONTROLLER_FRIENDLY)) {
            const observer = new MutationObserver(mutationList => {
                if (mutationList.length === 0 || mutationList[0].addedNodes.length === 0) {
                    return;
                }

                // Get dialog
                const $dialog = mutationList[0].addedNodes[0];
                if (!$dialog || !($dialog instanceof HTMLElement)) {
                    return;
                }

                // Find un-calculated <select> elements
                this.calculateSelectBoxes($dialog);
            });
            observer.observe(this.$container, {childList: true});
        }
    }

    calculateSelectBoxes($root: HTMLElement) {
        const $selects = $root.querySelectorAll('.bx-select:not([data-calculated]) select');
        $selects.forEach($select => {
            const $parent = $select.parentElement! as HTMLElement;

            // Don't apply to select.bx-full-width elements
            if ($parent.classList.contains('bx-full-width')) {
                $parent.dataset.calculated = 'true';
                return;
            }

            const rect = $select.getBoundingClientRect();

            let $label;
            let width = Math.ceil(rect.width);
            if (!width) {
                return;
            }

            if (($select as HTMLSelectElement).multiple) {
                $label = $parent.querySelector('.bx-select-value') as HTMLElement;
                width += 20;  // Add checkbox's width
            } else {
                $label = $parent.querySelector('div') as HTMLElement;
            }

            // Set min-width
            $label.style.minWidth = width + 'px';
            $parent.dataset.calculated = 'true';
        });
    }

    handleEvent(event: Event) {
        switch (event.type) {
            case 'keydown':
                const $target = event.target as HTMLElement;
                const keyboardEvent = event as KeyboardEvent;
                const keyCode = keyboardEvent.code || keyboardEvent.key;

                let handled = this.dialog?.handleKeyPress(keyCode);
                if (handled) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }

                if (keyCode === 'ArrowUp' || keyCode === 'ArrowDown') {
                    handled = true;
                    this.focusDirection(keyCode === 'ArrowUp' ? NavigationDirection.UP : NavigationDirection.DOWN);
                } else if (keyCode === 'ArrowLeft' || keyCode === 'ArrowRight') {
                    if (!($target instanceof HTMLInputElement && ($target.type === 'text' || $target.type === 'range'))) {
                        handled = true;
                        this.focusDirection(keyCode === 'ArrowLeft' ? NavigationDirection.LEFT : NavigationDirection.RIGHT);
                    }
                } else if (keyCode === 'Enter' || keyCode === 'NumpadEnter' || keyCode === 'Space') {
                    if (!($target instanceof HTMLInputElement && $target.type === 'text')) {
                        handled = true;
                        $target.dispatchEvent(new MouseEvent('click'));
                    }
                } else if (keyCode === 'Escape') {
                    handled = true;
                    this.hide();
                }

                if (handled) {
                    event.preventDefault();
                    event.stopPropagation();
                }

                break;
        }
    }

    isShowing() {
        return this.$container && !this.$container.classList.contains('bx-gone');
    }

    private pollGamepad() {
        const gamepads = window.navigator.getGamepads();

        for (const gamepad of gamepads) {
            if (!gamepad || !gamepad.connected) {
                continue;
            }

            // Ignore virtual controller
            if (gamepad.id === VIRTUAL_GAMEPAD_ID) {
                continue;
            }

            const axes = gamepad.axes;
            const buttons = gamepad.buttons;

            let releasedButton: GamepadKey | null = null;
            let heldButton: GamepadKey | null = null;

            let lastState = this.gamepadLastStates[gamepad.index];
            let lastTimestamp;
            let lastKey;
            let lastKeyPressed;
            if (lastState) {
                [lastTimestamp, lastKey, lastKeyPressed] = lastState;
            }

            if (lastTimestamp && lastTimestamp === gamepad.timestamp) {
                continue;
            }

            for (const key of NavigationDialogManager.GAMEPAD_KEYS) {
                // Key released
                if (lastKey === key && !buttons[key].pressed) {
                    releasedButton = key;
                    break;
                } else if (buttons[key].pressed) {
                    // Key pressed
                    heldButton = key;
                    break;
                }
            }

            // If not pressing any key => check analog sticks
            if (heldButton === null && releasedButton === null && axes && axes.length >= 2) {
                // [LEFT left-right, LEFT up-down]
                if (lastKey) {
                    const releasedHorizontal = Math.abs(axes[0]) < 0.1 && (lastKey === GamepadKey.LS_LEFT || lastKey === GamepadKey.LS_RIGHT);
                    const releasedVertical = Math.abs(axes[1]) < 0.1 && (lastKey === GamepadKey.LS_UP || lastKey === GamepadKey.LS_DOWN);

                    if (releasedHorizontal || releasedVertical) {
                        releasedButton = lastKey;
                    } else {
                        heldButton = lastKey;
                    }
                } else {
                    if (axes[0] < -0.5) {
                        heldButton = GamepadKey.LS_LEFT;
                    } else if (axes[0] > 0.5) {
                        heldButton = GamepadKey.LS_RIGHT;
                    } else if (axes[1] < -0.5) {
                        heldButton = GamepadKey.LS_UP;
                    } else if (axes[1] > 0.5) {
                        heldButton = GamepadKey.LS_DOWN;
                    }
                }
            }

            // Save state if holding a button
            if (heldButton !== null) {
                this.gamepadLastStates[gamepad.index] = [gamepad.timestamp, heldButton, false];

                this.clearGamepadHoldingInterval();

                // Only set turbo for d-pad and stick
                if (NavigationDialogManager.GAMEPAD_DIRECTION_MAP[heldButton as keyof typeof NavigationDialogManager.GAMEPAD_DIRECTION_MAP]) {
                    this.gamepadHoldingIntervalId = window.setInterval(() => {
                        const lastState = this.gamepadLastStates[gamepad.index];
                        // Avoid pressing the incorrect key
                        if (lastState) {
                            [lastTimestamp, lastKey, lastKeyPressed] = lastState;
                            if (lastKey === heldButton) {
                                this.handleGamepad(gamepad, heldButton);
                                return;
                            }
                        }

                        this.clearGamepadHoldingInterval();
                    }, 200);
                }
                continue;
            }

            // Continue if the button hasn't been released
            if (releasedButton === null) {
                this.clearGamepadHoldingInterval();
                continue;
            }

            // Button released
            this.gamepadLastStates[gamepad.index] = null;

            if (lastKeyPressed) {
                return;
            }

            if (releasedButton === GamepadKey.A) {
                document.activeElement && document.activeElement.dispatchEvent(new MouseEvent('click'));
                return;
            } else if (releasedButton === GamepadKey.B) {
                this.hide();
                return;
            }

            if (this.handleGamepad(gamepad, releasedButton)) {
                return;
            }
        }
    }

    private handleGamepad(gamepad: Gamepad, key: GamepadKey): boolean {
        let handled = this.dialog?.handleGamepad(key);
        if (handled) {
            return true;
        }

        // Handle d-pad & sticks
        let direction = NavigationDialogManager.GAMEPAD_DIRECTION_MAP[key as keyof typeof NavigationDialogManager.GAMEPAD_DIRECTION_MAP];
        if (!direction) {
            return false;
        }

        if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'range') {
            const $range = document.activeElement;
            if (direction === NavigationDirection.LEFT || direction === NavigationDirection.RIGHT) {
                $range.value = (parseInt($range.value) + parseInt($range.step) * (direction === NavigationDirection.LEFT ? -1 : 1)).toString();
                $range.dispatchEvent(new InputEvent('input'));
                handled = true;
            }
        }

        if (!handled) {
            this.focusDirection(direction);
        }

        this.gamepadLastStates[gamepad.index] && (this.gamepadLastStates[gamepad.index]![2] = true);
        return true;
    }

    private clearGamepadHoldingInterval() {
        this.gamepadHoldingIntervalId && window.clearInterval(this.gamepadHoldingIntervalId);
        this.gamepadHoldingIntervalId = null;
    }

    show(dialog: NavigationDialog) {
        this.clearGamepadHoldingInterval();

        BxEvent.dispatch(window, BxEvent.XCLOUD_DIALOG_SHOWN);

        // Stop xCloud's navigation polling
        (window as any).BX_EXPOSED.disableGamepadPolling = true;

        // Lock scroll bar
        document.body.classList.add('bx-no-scroll');

        // Show overlay
        this.$overlay.classList.remove('bx-gone');
        if (STATES.isPlaying) {
            this.$overlay.classList.add('bx-invisible');
        }

        // Unmount current dialog
        this.unmountCurrentDialog();

        // Setup new dialog
        this.dialog = dialog;
        dialog.onBeforeMount();
        this.$container.appendChild(dialog.getContent());
        dialog.onMounted();

        // Show content
        this.$container.classList.remove('bx-gone');

        // Add event listeners
        this.$container.addEventListener('keydown', this);

        // Start gamepad polling
        this.startGamepadPolling();
    }

    hide() {
        this.clearGamepadHoldingInterval();

        // Unlock scroll bar
        document.body.classList.remove('bx-no-scroll');

        BxEvent.dispatch(window, BxEvent.XCLOUD_DIALOG_DISMISSED);

        // Hide content
        this.$overlay.classList.add('bx-gone');
        this.$overlay.classList.remove('bx-invisible');
        this.$container.classList.add('bx-gone');

        // Remove event listeners
        this.$container.removeEventListener('keydown', this);

        // Stop gamepad polling
        this.stopGamepadPolling();

        // Unmount dialog
        this.unmountCurrentDialog();

        // Enable xCloud's navigation polling
        (window as any).BX_EXPOSED.disableGamepadPolling = false;
    }

    focus($elm: NavigationElement | null): boolean {
        if (!$elm) {
            return false;
        }

        // console.log('focus', $elm);

        if ($elm.nearby && $elm.nearby.focus) {
            if ($elm.nearby.focus instanceof HTMLElement) {
                return this.focus($elm.nearby.focus);
            } else {
                return $elm.nearby.focus();
            }
        }

        $elm.focus();
        return $elm === document.activeElement;
    }

    private getOrientation($elm: NavigationElement): NavigationNearbyElements['orientation'] {
        const nearby = $elm.nearby || {};
        if (nearby.selfOrientation) {
            return nearby.selfOrientation;
        }

        let orientation;

        let $current = $elm.parentElement! as NavigationElement;
        while ($current !== this.$container) {
            const tmp = $current.nearby?.orientation;
            if ($current.nearby && tmp) {
                orientation = tmp;
                break;
            }

            $current = $current.parentElement!;
        }

        orientation = orientation || 'vertical';
        setNearby($elm, {
            selfOrientation: orientation,
        });

        return orientation;
    }

    findNextTarget($focusing: HTMLElement | null, direction: NavigationDirection, checkParent = false, checked: Array<HTMLElement> = []): HTMLElement | null {
        if (!$focusing || $focusing === this.$container) {
            return null;
        }

        if (checked.includes($focusing)) {
            return null;
        }

        checked.push($focusing);

        let $target: HTMLElement = $focusing;
        const $parent = $target.parentElement;

        const nearby = ($target as NavigationElement).nearby || {};
        const orientation = this.getOrientation($target)!;

        // @ts-ignore
        let siblingProperty = (NavigationDialogManager.SIBLING_PROPERTY_MAP[orientation])[direction];
        if (siblingProperty) {
            let $sibling = $target as any;
            while ($sibling[siblingProperty]) {
                $sibling = $sibling[siblingProperty] as HTMLElement;

                const $focusable = this.findFocusableElement($sibling, direction);
                if ($focusable) {
                    return $focusable;
                }
            }
        }

        if (nearby.loop) {
            // Loop
            if (nearby.loop(direction)) {
                return null;
            }
        }

        if (checkParent) {
            return this.findNextTarget($parent, direction, checkParent, checked);
        }

        return null;
    }

    findFocusableElement($elm: HTMLElement | null, direction?: NavigationDirection): HTMLElement | null {
        if (!$elm) {
            return null;
        }

        // Ignore disabled element
        const isDisabled = !!($elm as any).disabled;
        if (isDisabled) {
            return null;
        }

        // Ignore hidden element
        if (!isElementVisible($elm)) {
            return null;
        }

        // Accept element with tabIndex
        if ($elm.tabIndex > -1) {
            return $elm;
        }

        const focus = ($elm as NavigationElement).nearby?.focus;
        if (focus) {
            if (focus instanceof HTMLElement) {
                return this.findFocusableElement(focus, direction);
            } else if (typeof focus === 'function') {
                if (focus()) {
                    return document.activeElement as HTMLElement;
                }
            }
        }

        // Look for child focusable elemnet
        const children = Array.from($elm.children);

        // Search from right to left if the orientation is horizontal
        const orientation = ($elm as NavigationElement).nearby?.orientation || 'vertical';
        if (orientation === 'horizontal' || (orientation === 'vertical' && direction === NavigationDirection.UP)) {
            children.reverse();
        }

        for (const $child of children) {
            if (!$child || !($child instanceof HTMLElement)) {
                return null;
            }

            const $target = this.findFocusableElement($child, direction);
            if ($target) {
                return $target;
            }
        }

        return null;
    }

    private startGamepadPolling() {
        this.stopGamepadPolling();

        this.gamepadPollingIntervalId = window.setInterval(this.pollGamepad.bind(this), NavigationDialogManager.GAMEPAD_POLLING_INTERVAL);
    }

    private stopGamepadPolling() {
        this.gamepadLastStates = [];

        this.gamepadPollingIntervalId && window.clearInterval(this.gamepadPollingIntervalId);
        this.gamepadPollingIntervalId = null;
    }

    private focusDirection(direction: NavigationDirection) {
        const dialog = this.dialog;
        if (!dialog) {
            return;
        }

        // Get current focused element
        const $focusing = dialog.getFocusedElement();
        if (!$focusing || !this.findFocusableElement($focusing, direction)) {
            dialog.focusIfNeeded();
            return null;
        }

        const $target = this.findNextTarget($focusing, direction, true);
        this.focus($target);
    }

    private unmountCurrentDialog() {
        const dialog = this.dialog;

        dialog && dialog.onBeforeUnmount();
        this.$container.firstChild?.remove();
        dialog && dialog.onUnmounted();

        this.dialog = null;
    }
}
