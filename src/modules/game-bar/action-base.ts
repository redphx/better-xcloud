export abstract class BaseGameBarAction {
    constructor() {}
    reset() {}

    abstract render(): HTMLElement;
}
