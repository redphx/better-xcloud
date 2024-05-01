import { STATES } from "@utils/global";
import { UserAgent } from "@utils/user-agent";


export class PreloadedState {
    static override() {
        Object.defineProperty(window, '__PRELOADED_STATE__', {
            configurable: true,
            get: () => {
                // Override User-Agent
                const userAgent = UserAgent.spoof();
                if (userAgent) {
                    (this as any)._state.appContext.requestInfo.userAgent = userAgent;
                }

                return (this as any)._state;
            },
            set: state => {
                (this as any)._state = state;
                STATES.appContext = structuredClone(state.appContext);
            }
        });
    }
}
