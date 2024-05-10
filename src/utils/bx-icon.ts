import iconCadetRight from "@assets/svg/caret-right.svg" with { type: "text" };
import iconCamera from "@assets/svg/camera.svg" with { type: "text" };
import iconController from "@assets/svg/controller.svg" with { type: "text" };
import iconCopy from "@assets/svg/copy.svg" with { type: "text" };
import iconCursorText from "@assets/svg/cursor-text.svg" with { type: "text" };
import iconDisplay from "@assets/svg/display.svg" with { type: "text" };
import iconMouseSettings from "@assets/svg/mouse-settings.svg" with { type: "text" };
import iconMouse from "@assets/svg/mouse.svg" with { type: "text" };
import iconNew from "@assets/svg/new.svg" with { type: "text" };
import iconQuestion from "@assets/svg/question.svg" with { type: "text" };
import iconRefresh from "@assets/svg/refresh.svg" with { type: "text" };
import iconRemotePlay from "@assets/svg/remote-play.svg" with { type: "text" };
import iconStreamSettings from "@assets/svg/stream-settings.svg" with { type: "text" };
import iconStreamStats from "@assets/svg/stream-stats.svg" with { type: "text" };
import iconTrash from "@assets/svg/trash.svg" with { type: "text" };
import iconTouchControlEnable from "@assets/svg/touch-control-enable.svg" with { type: "text" };
import iconTouchControlDisable from "@assets/svg/touch-control-disable.svg" with { type: "text" };

export const BxIcon = {
    STREAM_SETTINGS: iconStreamSettings,
    STREAM_STATS: iconStreamStats,
    CONTROLLER: iconController,
    DISPLAY: iconDisplay,
    MOUSE: iconMouse,
    MOUSE_SETTINGS: iconMouseSettings,
    NEW: iconNew,
    COPY: iconCopy,
    TRASH: iconTrash,
    CURSOR_TEXT: iconCursorText,
    QUESTION: iconQuestion,
    REFRESH: iconRefresh,

    REMOTE_PLAY: iconRemotePlay,

    CARET_RIGHT: iconCadetRight,
    SCREENSHOT: iconCamera,
    TOUCH_CONTROL_ENABLE: iconTouchControlEnable,
    TOUCH_CONTROL_DISABLE: iconTouchControlDisable,

    // HAND_TAP = '<path d="M6.537 8.906c0-4.216 3.469-7.685 7.685-7.685s7.685 3.469 7.685 7.685M7.719 30.778l-4.333-7.389C3.133 22.944 3 22.44 3 21.928a2.97 2.97 0 0 1 2.956-2.956 2.96 2.96 0 0 1 2.55 1.461l2.761 4.433V8.906a2.97 2.97 0 0 1 2.956-2.956 2.97 2.97 0 0 1 2.956 2.956v8.276a2.97 2.97 0 0 1 2.956-2.956 2.97 2.97 0 0 1 2.956 2.956v2.365a2.97 2.97 0 0 1 2.956-2.956A2.97 2.97 0 0 1 29 19.547v5.32c0 3.547-1.182 5.911-1.182 5.911"/>',
} as const;
