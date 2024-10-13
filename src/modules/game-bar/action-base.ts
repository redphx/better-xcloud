import { BxEvent } from "@/utils/bx-event";

export abstract class BaseGameBarAction {
    constructor() {}
    reset() {}

    onClick(e: Event) {
        BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
    };

    abstract render(): HTMLElement;
}
