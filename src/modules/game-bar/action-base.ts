import { BxEvent } from "@/utils/bx-event";

export abstract class BaseGameBarAction {
    abstract $content: HTMLElement;

    constructor() {}
    reset() {}

    onClick(e: Event) {
        BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
    };

    render(): HTMLElement {
        return this.$content;
    };
}
