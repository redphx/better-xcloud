enum TextColor {
    INFO = '#008746',
    WARNING = '#c1a404',
    ERROR = '#c10404',
}

export class BxLogger {
    static #PREFIX = '[BxC]';

    static info(tag: string, ...args: any[]) {
        BxLogger.#log(TextColor.INFO, tag, ...args);
    }

    static warning(tag: string, ...args: any[]) {
        BxLogger.#log(TextColor.WARNING, tag, ...args);
    }

    static error(tag: string, ...args: any[]) {
        BxLogger.#log(TextColor.ERROR, tag, ...args);
    }

    static #log(color: TextColor, tag: string, ...args: any) {
        console.log(`%c${BxLogger.#PREFIX}`, `color:${color};font-weight:bold;`, tag, '//', ...args);
    }
}

(window as any).BxLogger = BxLogger;
