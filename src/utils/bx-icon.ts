import iconBetterXcloud from "@assets/svg/better-xcloud.svg" with { type: "text" };
import iconTrueAchievements from "@assets/svg/true-achievements.svg" with { type: "text" };
import iconClose from "@assets/svg/close.svg" with { type: "text" };
import iconCommand from "@assets/svg/command.svg" with { type: "text" };
import iconController from "@assets/svg/controller.svg" with { type: "text" };
import iconCopy from "@assets/svg/copy.svg" with { type: "text" };
import iconCreateShortcut from "@assets/svg/create-shortcut.svg" with { type: "text" };
import iconCursorText from "@assets/svg/cursor-text.svg" with { type: "text" };
import iconDisplay from "@assets/svg/display.svg" with { type: "text" };
import iconHome from "@assets/svg/home.svg" with { type: "text" };
import iconNativeMkb from "@assets/svg/native-mkb.svg" with { type: "text" };
import iconNew from "@assets/svg/new.svg" with { type: "text" };
import iconPower from "@assets/svg/power.svg" with { type: "text" };
import iconQuestion from "@assets/svg/question.svg" with { type: "text" };
import iconRefresh from "@assets/svg/refresh.svg" with { type: "text" };
import iconRemotePlay from "@assets/svg/remote-play.svg" with { type: "text" };
import iconSpeakerSlash from "@assets/svg/speaker-slash.svg" with { type: "text" };
import iconStreamSettings from "@assets/svg/stream-settings.svg" with { type: "text" };
import iconStreamStats from "@assets/svg/stream-stats.svg" with { type: "text" };
import iconTouchControlDisable from "@assets/svg/touch-control-disable.svg" with { type: "text" };
import iconTouchControlEnable from "@assets/svg/touch-control-enable.svg" with { type: "text" };
import iconTrash from "@assets/svg/trash.svg" with { type: "text" };
import iconVirtualController from "@assets/svg/virtual-controller.svg" with { type: "text" };

// Game Bar
import iconCaretLeft from "@assets/svg/caret-left.svg" with { type: "text" };
import iconCaretRight from "@assets/svg/caret-right.svg" with { type: "text" };
import iconCamera from "@assets/svg/camera.svg" with { type: "text" };
import iconMicrophone from "@assets/svg/microphone.svg" with { type: "text" };
import iconMicrophoneMuted from "@assets/svg/microphone-slash.svg" with { type: "text" };

// Stream Badge
import iconBatteryFull from "@assets/svg/battery-full.svg" with { type: "text" };
import iconClock from "@assets/svg/clock.svg" with { type: "text" };
import iconCloud from "@assets/svg/cloud.svg" with { type: "text" };
import iconDownload from "@assets/svg/download.svg" with { type: "text" };
import iconSpeakerHigh from "@assets/svg/speaker-high.svg" with { type: "text" };
import iconUpload from "@assets/svg/upload.svg" with { type: "text" };


export const BxIcon = {
    BETTER_XCLOUD: iconBetterXcloud,
    TRUE_ACHIEVEMENTS: iconTrueAchievements,
    STREAM_SETTINGS: iconStreamSettings,
    STREAM_STATS: iconStreamStats,
    CLOSE: iconClose,
    COMMAND: iconCommand,
    CONTROLLER: iconController,
    CREATE_SHORTCUT: iconCreateShortcut,
    DISPLAY: iconDisplay,
    HOME: iconHome,
    NATIVE_MKB: iconNativeMkb,
    NEW: iconNew,
    COPY: iconCopy,
    TRASH: iconTrash,
    CURSOR_TEXT: iconCursorText,
    POWER: iconPower,
    QUESTION: iconQuestion,
    REFRESH: iconRefresh,
    VIRTUAL_CONTROLLER: iconVirtualController,

    REMOTE_PLAY: iconRemotePlay,

    // Game Bar
    CARET_LEFT: iconCaretLeft,
    CARET_RIGHT: iconCaretRight,
    SCREENSHOT: iconCamera,
    SPEAKER_MUTED: iconSpeakerSlash,
    TOUCH_CONTROL_ENABLE: iconTouchControlEnable,
    TOUCH_CONTROL_DISABLE: iconTouchControlDisable,

    MICROPHONE: iconMicrophone,
    MICROPHONE_MUTED: iconMicrophoneMuted,

    // Stream Badge
    BATTERY: iconBatteryFull,
    PLAYTIME: iconClock,
    SERVER: iconCloud,
    DOWNLOAD: iconDownload,
    UPLOAD: iconUpload,
    AUDIO: iconSpeakerHigh,
} as const;
