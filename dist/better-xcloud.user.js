// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      4.4.0
// @description  Improve Xbox Cloud Gaming (xCloud) experience
// @author       redphx
// @license      MIT
// @match        https://www.xbox.com/*/play*
// @match        https://www.xbox.com/*/auth/msa?*loggedIn*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/redphx/better-xcloud/typescript/dist/better-xcloud.meta.js
// @downloadURL  https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js
// ==/UserScript==
'use strict';
// src/utils/user-agent.ts
var UserAgentProfile;
(function(UserAgentProfile2) {
  UserAgentProfile2["WINDOWS_EDGE"] = "windows-edge";
  UserAgentProfile2["MACOS_SAFARI"] = "macos-safari";
  UserAgentProfile2["SMARTTV_GENERIC"] = "smarttv-generic";
  UserAgentProfile2["SMARTTV_TIZEN"] = "smarttv-tizen";
  UserAgentProfile2["VR_OCULUS"] = "vr-oculus";
  UserAgentProfile2["ANDROID_KIWI_V123"] = "android-kiwi-v123";
  UserAgentProfile2["DEFAULT"] = "default";
  UserAgentProfile2["CUSTOM"] = "custom";
})(UserAgentProfile || (UserAgentProfile = {}));
var CHROMIUM_VERSION = "123.0.0.0";
if (!!window.chrome || window.navigator.userAgent.includes("Chrome")) {
  const match = window.navigator.userAgent.match(/\s(?:Chrome|Edg)\/([\d\.]+)/);
  if (match) {
    CHROMIUM_VERSION = match[1];
  }
}

class UserAgent {
  static STORAGE_KEY = "better_xcloud_user_agent";
  static #config;
  static #USER_AGENTS = {
    [UserAgentProfile.WINDOWS_EDGE]: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION} Safari/537.36 Edg/${CHROMIUM_VERSION}`,
    [UserAgentProfile.MACOS_SAFARI]: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.1",
    [UserAgentProfile.SMARTTV_GENERIC]: window.navigator.userAgent + " SmartTV",
    [UserAgentProfile.SMARTTV_TIZEN]: `Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROMIUM_VERSION}/7.0 TV Safari/537.36`,
    [UserAgentProfile.VR_OCULUS]: window.navigator.userAgent + " OculusBrowser VR",
    [UserAgentProfile.ANDROID_KIWI_V123]: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.118 Mobile Safari/537.36"
  };
  static init() {
    UserAgent.#config = JSON.parse(window.localStorage.getItem(UserAgent.STORAGE_KEY) || "{}");
    if (!UserAgent.#config.profile) {
      UserAgent.#config.profile = UserAgentProfile.DEFAULT;
    }
    if (!UserAgent.#config.custom) {
      UserAgent.#config.custom = "";
    }
    UserAgent.spoof();
  }
  static updateStorage(profile, custom) {
    const clonedConfig = structuredClone(UserAgent.#config);
    clonedConfig.profile = profile;
    if (typeof custom !== "undefined") {
      clonedConfig.custom = custom;
    }
    window.localStorage.setItem(UserAgent.STORAGE_KEY, JSON.stringify(clonedConfig));
  }
  static getDefault() {
    return window.navigator.orgUserAgent || window.navigator.userAgent;
  }
  static get(profile) {
    const defaultUserAgent = window.navigator.userAgent;
    switch (profile) {
      case UserAgentProfile.DEFAULT:
        return defaultUserAgent;
      case UserAgentProfile.CUSTOM:
        return UserAgent.#config.custom || defaultUserAgent;
      default:
        return UserAgent.#USER_AGENTS[profile] || defaultUserAgent;
    }
  }
  static isSafari(mobile = false) {
    const userAgent = UserAgent.getDefault().toLowerCase();
    let result = userAgent.includes("safari") && !userAgent.includes("chrom");
    if (result && mobile) {
      result = userAgent.includes("mobile");
    }
    return result;
  }
  static isMobile() {
    const userAgent = UserAgent.getDefault().toLowerCase();
    return /iphone|ipad|android/.test(userAgent);
  }
  static spoof() {
    const profile = UserAgent.#config.profile;
    if (profile === UserAgentProfile.DEFAULT) {
      return;
    }
    const newUserAgent = UserAgent.get(profile);
    window.navigator.orgUserAgentData = window.navigator.userAgentData;
    Object.defineProperty(window.navigator, "userAgentData", {});
    window.navigator.orgUserAgent = window.navigator.userAgent;
    Object.defineProperty(window.navigator, "userAgent", {
      value: newUserAgent
    });
  }
}

// src/utils/global.ts
var SCRIPT_VERSION = "4.4.0";
var SCRIPT_HOME = "https://github.com/redphx/better-xcloud";
var AppInterface = window.AppInterface;
UserAgent.init();
var userAgent = window.navigator.userAgent.toLowerCase();
var isTv = userAgent.includes("smart-tv") || userAgent.includes("smarttv") || /\baft.*\b/.test(userAgent);
var isVr = window.navigator.userAgent.includes("VR") && window.navigator.userAgent.includes("OculusBrowser");
var browserHasTouchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;
var hasTouchSupport = !isTv && !isVr && browserHasTouchSupport;
var STATES = {
  isPlaying: false,
  appContext: {},
  serverRegions: {},
  hasTouchSupport,
  browserHasTouchSupport,
  currentStream: {},
  remotePlay: {}
};

// src/utils/bx-event.ts
var BxEvent;
(function(BxEvent2) {
  BxEvent2["JUMP_BACK_IN_READY"] = "bx-jump-back-in-ready";
  BxEvent2["POPSTATE"] = "bx-popstate";
  BxEvent2["TITLE_INFO_READY"] = "bx-title-info-ready";
  BxEvent2["STREAM_LOADING"] = "bx-stream-loading";
  BxEvent2["STREAM_STARTING"] = "bx-stream-starting";
  BxEvent2["STREAM_STARTED"] = "bx-stream-started";
  BxEvent2["STREAM_PLAYING"] = "bx-stream-playing";
  BxEvent2["STREAM_STOPPED"] = "bx-stream-stopped";
  BxEvent2["STREAM_ERROR_PAGE"] = "bx-stream-error-page";
  BxEvent2["STREAM_MENU_SHOWN"] = "bx-stream-menu-shown";
  BxEvent2["STREAM_MENU_HIDDEN"] = "bx-stream-menu-hidden";
  BxEvent2["STREAM_WEBRTC_CONNECTED"] = "bx-stream-webrtc-connected";
  BxEvent2["STREAM_WEBRTC_DISCONNECTED"] = "bx-stream-webrtc-disconnected";
  BxEvent2["STREAM_SESSION_READY"] = "bx-stream-session-ready";
  BxEvent2["CUSTOM_TOUCH_LAYOUTS_LOADED"] = "bx-custom-touch-layouts-loaded";
  BxEvent2["TOUCH_LAYOUT_MANAGER_READY"] = "bx-touch-layout-manager-ready";
  BxEvent2["REMOTE_PLAY_READY"] = "bx-remote-play-ready";
  BxEvent2["REMOTE_PLAY_FAILED"] = "bx-remote-play-failed";
  BxEvent2["XCLOUD_SERVERS_READY"] = "bx-servers-ready";
  BxEvent2["DATA_CHANNEL_CREATED"] = "bx-data-channel-created";
  BxEvent2["GAME_BAR_ACTION_ACTIVATED"] = "bx-game-bar-action-activated";
  BxEvent2["MICROPHONE_STATE_CHANGED"] = "bx-microphone-state-changed";
  BxEvent2["CAPTURE_SCREENSHOT"] = "bx-capture-screenshot";
  BxEvent2["GAINNODE_VOLUME_CHANGED"] = "bx-gainnode-volume-changed";
})(BxEvent || (BxEvent = {}));
var XcloudEvent;
(function(XcloudEvent2) {
  XcloudEvent2["MICROPHONE_STATE_CHANGED"] = "microphoneStateChanged";
})(XcloudEvent || (XcloudEvent = {}));
(function(BxEvent) {
  function dispatch(target, eventName, data) {
    if (!eventName) {
      alert("BxEvent.dispatch(): eventName is null");
      return;
    }
    const event = new Event(eventName);
    if (data) {
      for (const key in data) {
        event[key] = data[key];
      }
    }
    AppInterface && AppInterface.onEvent(eventName);
    target.dispatchEvent(event);
  }
  BxEvent.dispatch = dispatch;
})(BxEvent || (BxEvent = {}));
window.BxEvent = BxEvent;

// src/utils/bx-flags.ts

/* ADDITIONAL CODE */

var DEFAULT_FLAGS = {
  CheckForUpdate: true,
  PreloadRemotePlay: true,
  PreloadUi: false,
  EnableXcloudLogging: false,
  SafariWorkaround: true,
  UseDevTouchLayout: false
};
var BX_FLAGS = Object.assign(DEFAULT_FLAGS, window.BX_FLAGS || {});
try {
  delete window.BX_FLAGS;
} catch (e) {
}
var NATIVE_FETCH = window.fetch;

// src/utils/html.ts
var createElement = function(elmName, props = {}, ..._) {
  let $elm;
  const hasNs = "xmlns" in props;
  if (hasNs) {
    $elm = document.createElementNS(props.xmlns, elmName);
    delete props.xmlns;
  } else {
    $elm = document.createElement(elmName);
  }
  for (const key in props) {
    if ($elm.hasOwnProperty(key)) {
      continue;
    }
    if (hasNs) {
      $elm.setAttributeNS(null, key, props[key]);
    } else {
      $elm.setAttribute(key, props[key]);
    }
  }
  for (let i = 2, size = arguments.length;i < size; i++) {
    const arg = arguments[i];
    const argType = typeof arg;
    if (argType === "string" || argType === "number") {
      $elm.appendChild(document.createTextNode(arg));
    } else if (arg) {
      $elm.appendChild(arg);
    }
  }
  return $elm;
};
function escapeHtml(html) {
  const text = document.createTextNode(html);
  const $span = document.createElement("span");
  $span.appendChild(text);
  return $span.innerHTML;
}
var CE = createElement;
var svgParser = (svg) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
var createSvgIcon = (icon) => {
  return svgParser(icon.toString());
};
var ButtonStyle = {};
ButtonStyle[ButtonStyle.PRIMARY = 1] = "bx-primary";
ButtonStyle[ButtonStyle.DANGER = 2] = "bx-danger";
ButtonStyle[ButtonStyle.GHOST = 4] = "bx-ghost";
ButtonStyle[ButtonStyle.FOCUSABLE = 8] = "bx-focusable";
ButtonStyle[ButtonStyle.FULL_WIDTH = 16] = "bx-full-width";
ButtonStyle[ButtonStyle.FULL_HEIGHT = 32] = "bx-full-height";
var ButtonStyleIndices = Object.keys(ButtonStyle).splice(0, Object.keys(ButtonStyle).length / 2).map((i) => parseInt(i));
var createButton = (options) => {
  let $btn;
  if (options.url) {
    $btn = CE("a", { class: "bx-button" });
    $btn.href = options.url;
    $btn.target = "_blank";
  } else {
    $btn = CE("button", { class: "bx-button", type: "button" });
  }
  const style = options.style || 0;
  style && ButtonStyleIndices.forEach((index) => {
    style & index && $btn.classList.add(ButtonStyle[index]);
  });
  options.classes && $btn.classList.add(...options.classes);
  options.icon && $btn.appendChild(createSvgIcon(options.icon));
  options.label && $btn.appendChild(CE("span", {}, options.label));
  options.title && $btn.setAttribute("title", options.title);
  options.disabled && ($btn.disabled = true);
  options.onClick && $btn.addEventListener("click", options.onClick);
  return $btn;
};
var CTN = document.createTextNode.bind(document);
window.BX_CE = createElement;

// src/utils/screenshot.ts
class Screenshot {
  static #$canvas;
  static #canvasContext;
  static setup() {
    if (Screenshot.#$canvas) {
      return;
    }
    Screenshot.#$canvas = CE("canvas", { class: "bx-gone" });
    Screenshot.#canvasContext = Screenshot.#$canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: false
    });
  }
  static updateCanvasSize(width, height) {
    const $canvas = Screenshot.#$canvas;
    if ($canvas) {
      $canvas.width = width;
      $canvas.height = height;
    }
  }
  static updateCanvasFilters(filters) {
    Screenshot.#canvasContext.filter = filters;
  }
  static onAnimationEnd(e) {
    e.target.classList.remove("bx-taking-screenshot");
  }
  static takeScreenshot(callback) {
    const currentStream = STATES.currentStream;
    const $video = currentStream.$video;
    const $canvas = Screenshot.#$canvas;
    if (!$video || !$canvas) {
      return;
    }
    $video.parentElement?.addEventListener("animationend", this.onAnimationEnd);
    $video.parentElement?.classList.add("bx-taking-screenshot");
    const canvasContext = Screenshot.#canvasContext;
    canvasContext.drawImage($video, 0, 0, $canvas.width, $canvas.height);
    if (AppInterface) {
      const data = $canvas.toDataURL("image/png").split(";base64,")[1];
      AppInterface.saveScreenshot(currentStream.titleId, data);
      canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);
      callback && callback();
      return;
    }
    $canvas && $canvas.toBlob((blob) => {
      const now = +new Date;
      const $anchor = CE("a", {
        download: `${currentStream.titleId}-${now}.png`,
        href: URL.createObjectURL(blob)
      });
      $anchor.click();
      URL.revokeObjectURL($anchor.href);
      canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);
      callback && callback();
    }, "image/png");
  }
}

// src/utils/prompt-font.ts
var PrompFont;
(function(PrompFont2) {
  PrompFont2["A"] = "⇓";
  PrompFont2["B"] = "⇒";
  PrompFont2["X"] = "⇐";
  PrompFont2["Y"] = "⇑";
  PrompFont2["LB"] = "↘";
  PrompFont2["RB"] = "↙";
  PrompFont2["LT"] = "↖";
  PrompFont2["RT"] = "↗";
  PrompFont2["SELECT"] = "⇺";
  PrompFont2["START"] = "⇻";
  PrompFont2["HOME"] = "";
  PrompFont2["UP"] = "≻";
  PrompFont2["DOWN"] = "≽";
  PrompFont2["LEFT"] = "≺";
  PrompFont2["RIGHT"] = "≼";
  PrompFont2["L3"] = "↺";
  PrompFont2["LS_UP"] = "↾";
  PrompFont2["LS_DOWN"] = "⇂";
  PrompFont2["LS_LEFT"] = "↼";
  PrompFont2["LS_RIGHT"] = "⇀";
  PrompFont2["R3"] = "↻";
  PrompFont2["RS_UP"] = "↿";
  PrompFont2["RS_DOWN"] = "⇃";
  PrompFont2["RS_LEFT"] = "↽";
  PrompFont2["RS_RIGHT"] = "⇁";
})(PrompFont || (PrompFont = {}));

// src/modules/mkb/definitions.ts
var GamepadKey;
(function(GamepadKey2) {
  GamepadKey2[GamepadKey2["A"] = 0] = "A";
  GamepadKey2[GamepadKey2["B"] = 1] = "B";
  GamepadKey2[GamepadKey2["X"] = 2] = "X";
  GamepadKey2[GamepadKey2["Y"] = 3] = "Y";
  GamepadKey2[GamepadKey2["LB"] = 4] = "LB";
  GamepadKey2[GamepadKey2["RB"] = 5] = "RB";
  GamepadKey2[GamepadKey2["LT"] = 6] = "LT";
  GamepadKey2[GamepadKey2["RT"] = 7] = "RT";
  GamepadKey2[GamepadKey2["SELECT"] = 8] = "SELECT";
  GamepadKey2[GamepadKey2["START"] = 9] = "START";
  GamepadKey2[GamepadKey2["L3"] = 10] = "L3";
  GamepadKey2[GamepadKey2["R3"] = 11] = "R3";
  GamepadKey2[GamepadKey2["UP"] = 12] = "UP";
  GamepadKey2[GamepadKey2["DOWN"] = 13] = "DOWN";
  GamepadKey2[GamepadKey2["LEFT"] = 14] = "LEFT";
  GamepadKey2[GamepadKey2["RIGHT"] = 15] = "RIGHT";
  GamepadKey2[GamepadKey2["HOME"] = 16] = "HOME";
  GamepadKey2[GamepadKey2["SHARE"] = 17] = "SHARE";
  GamepadKey2[GamepadKey2["LS_UP"] = 100] = "LS_UP";
  GamepadKey2[GamepadKey2["LS_DOWN"] = 101] = "LS_DOWN";
  GamepadKey2[GamepadKey2["LS_LEFT"] = 102] = "LS_LEFT";
  GamepadKey2[GamepadKey2["LS_RIGHT"] = 103] = "LS_RIGHT";
  GamepadKey2[GamepadKey2["RS_UP"] = 200] = "RS_UP";
  GamepadKey2[GamepadKey2["RS_DOWN"] = 201] = "RS_DOWN";
  GamepadKey2[GamepadKey2["RS_LEFT"] = 202] = "RS_LEFT";
  GamepadKey2[GamepadKey2["RS_RIGHT"] = 203] = "RS_RIGHT";
})(GamepadKey || (GamepadKey = {}));
var GamepadKeyName = {
  [GamepadKey.A]: ["A", PrompFont.A],
  [GamepadKey.B]: ["B", PrompFont.B],
  [GamepadKey.X]: ["X", PrompFont.X],
  [GamepadKey.Y]: ["Y", PrompFont.Y],
  [GamepadKey.LB]: ["LB", PrompFont.LB],
  [GamepadKey.RB]: ["RB", PrompFont.RB],
  [GamepadKey.LT]: ["LT", PrompFont.LT],
  [GamepadKey.RT]: ["RT", PrompFont.RT],
  [GamepadKey.SELECT]: ["Select", PrompFont.SELECT],
  [GamepadKey.START]: ["Start", PrompFont.START],
  [GamepadKey.HOME]: ["Home", PrompFont.HOME],
  [GamepadKey.UP]: ["D-Pad Up", PrompFont.UP],
  [GamepadKey.DOWN]: ["D-Pad Down", PrompFont.DOWN],
  [GamepadKey.LEFT]: ["D-Pad Left", PrompFont.LEFT],
  [GamepadKey.RIGHT]: ["D-Pad Right", PrompFont.RIGHT],
  [GamepadKey.L3]: ["L3", PrompFont.L3],
  [GamepadKey.LS_UP]: ["Left Stick Up", PrompFont.LS_UP],
  [GamepadKey.LS_DOWN]: ["Left Stick Down", PrompFont.LS_DOWN],
  [GamepadKey.LS_LEFT]: ["Left Stick Left", PrompFont.LS_LEFT],
  [GamepadKey.LS_RIGHT]: ["Left Stick Right", PrompFont.LS_RIGHT],
  [GamepadKey.R3]: ["R3", PrompFont.R3],
  [GamepadKey.RS_UP]: ["Right Stick Up", PrompFont.RS_UP],
  [GamepadKey.RS_DOWN]: ["Right Stick Down", PrompFont.RS_DOWN],
  [GamepadKey.RS_LEFT]: ["Right Stick Left", PrompFont.RS_LEFT],
  [GamepadKey.RS_RIGHT]: ["Right Stick Right", PrompFont.RS_RIGHT]
};
var GamepadStick;
(function(GamepadStick2) {
  GamepadStick2[GamepadStick2["LEFT"] = 0] = "LEFT";
  GamepadStick2[GamepadStick2["RIGHT"] = 1] = "RIGHT";
})(GamepadStick || (GamepadStick = {}));
var MouseButtonCode;
(function(MouseButtonCode2) {
  MouseButtonCode2["LEFT_CLICK"] = "Mouse0";
  MouseButtonCode2["RIGHT_CLICK"] = "Mouse2";
  MouseButtonCode2["MIDDLE_CLICK"] = "Mouse1";
})(MouseButtonCode || (MouseButtonCode = {}));
var MouseMapTo;
(function(MouseMapTo2) {
  MouseMapTo2[MouseMapTo2["OFF"] = 0] = "OFF";
  MouseMapTo2[MouseMapTo2["LS"] = 1] = "LS";
  MouseMapTo2[MouseMapTo2["RS"] = 2] = "RS";
})(MouseMapTo || (MouseMapTo = {}));
var WheelCode;
(function(WheelCode2) {
  WheelCode2["SCROLL_UP"] = "ScrollUp";
  WheelCode2["SCROLL_DOWN"] = "ScrollDown";
  WheelCode2["SCROLL_LEFT"] = "ScrollLeft";
  WheelCode2["SCROLL_RIGHT"] = "ScrollRight";
})(WheelCode || (WheelCode = {}));
var MkbPresetKey;
(function(MkbPresetKey2) {
  MkbPresetKey2["MOUSE_MAP_TO"] = "map_to";
  MkbPresetKey2["MOUSE_SENSITIVITY_X"] = "sensitivity_x";
  MkbPresetKey2["MOUSE_SENSITIVITY_Y"] = "sensitivity_y";
  MkbPresetKey2["MOUSE_DEADZONE_COUNTERWEIGHT"] = "deadzone_counterweight";
  MkbPresetKey2["MOUSE_STICK_DECAY_STRENGTH"] = "stick_decay_strength";
  MkbPresetKey2["MOUSE_STICK_DECAY_MIN"] = "stick_decay_min";
})(MkbPresetKey || (MkbPresetKey = {}));

// src/utils/translation.ts
var SUPPORTED_LANGUAGES = {
  "en-US": "English (United States)",
  "en-ID": "Bahasa Indonesia",
  "de-DE": "Deutsch",
  "es-ES": "español (España)",
  "fr-FR": "français",
  "it-IT": "italiano",
  "ja-JP": "日本語",
  "ko-KR": "한국어",
  "pl-PL": "polski",
  "pt-BR": "português (Brasil)",
  "ru-RU": "русский",
  "th-TH": "ภาษาไทย",
  "tr-TR": "Türkçe",
  "uk-UA": "українська",
  "vi-VN": "Tiếng Việt",
  "zh-CN": "中文(简体)"
};
var Texts = {
  activate: "Activate",
  activated: "Activated",
  active: "Active",
  advanced: "Advanced",
  "android-app-settings": "Android app settings",
  apply: "Apply",
  audio: "Audio",
  auto: "Auto",
  "badge-audio": "Audio",
  "badge-battery": "Battery",
  "badge-in": "In",
  "badge-out": "Out",
  "badge-playtime": "Playtime",
  "badge-server": "Server",
  "badge-video": "Video",
  "bitrate-audio-maximum": "Maximum audio bitrate",
  "bitrate-video-maximum": "Maximum video bitrate",
  "bottom-left": "Bottom-left",
  "bottom-right": "Bottom-right",
  brightness: "Brightness",
  "browser-unsupported-feature": "Your browser doesn't support this feature",
  "can-stream-xbox-360-games": "Can stream Xbox 360 games",
  cancel: "Cancel",
  "cant-stream-xbox-360-games": "Can't stream Xbox 360 games",
  clarity: "Clarity",
  "clarity-boost-warning": "These settings don't work when the Clarity Boost mode is ON",
  clear: "Clear",
  close: "Close",
  "combine-audio-video-streams": "Combine audio & video streams",
  "combine-audio-video-streams-summary": "May fix the laggy audio problem",
  "conditional-formatting": "Conditional formatting text color",
  "confirm-delete-preset": "Do you want to delete this preset?",
  "confirm-reload-stream": "Do you want to refresh the stream?",
  connected: "Connected",
  "console-connect": "Connect",
  contrast: "Contrast",
  controller: "Controller",
  "controller-shortcuts": "Controller shortcuts",
  "controller-shortcuts-connect-note": "Connect a controller to use this feature",
  "controller-shortcuts-xbox-note": "The Xbox button is the one that opens the Guide menu",
  "controller-vibration": "Controller vibration",
  copy: "Copy",
  custom: "Custom",
  "deadzone-counterweight": "Deadzone counterweight",
  decrease: "Decrease",
  default: "Default",
  delete: "Delete",
  device: "Device",
  "device-unsupported-touch": "Your device doesn't have touch support",
  "device-vibration": "Device vibration",
  "device-vibration-not-using-gamepad": "On when not using gamepad",
  disable: "Disable",
  "disable-home-context-menu": "Disable context menu in Home page",
  "disable-native-mkb": "Disable native Mouse & Keyboard feature",
  "disable-post-stream-feedback-dialog": "Disable post-stream feedback dialog",
  "disable-social-features": "Disable social features",
  "disable-xcloud-analytics": "Disable xCloud analytics",
  disabled: "Disabled",
  disconnected: "Disconnected",
  edit: "Edit",
  "enable-controller-shortcuts": "Enable controller shortcuts",
  "enable-local-co-op-support": "Enable local co-op support",
  "enable-local-co-op-support-note": "Only works if the game doesn't require a different profile",
  "enable-mic-on-startup": "Enable microphone on game launch",
  "enable-mkb": "Emulate controller with Mouse & Keyboard",
  "enable-quick-glance-mode": "Enable \"Quick Glance\" mode",
  "enable-remote-play-feature": "Enable the \"Remote Play\" feature",
  "enable-volume-control": "Enable volume control feature",
  enabled: "Enabled",
  experimental: "Experimental",
  export: "Export",
  fast: "Fast",
  "fortnite-allow-stw-mode": "Allows playing STW mode on mobile",
  "fortnite-force-console-version": "Fortnite: force console version",
  "game-bar": "Game Bar",
  "getting-consoles-list": "Getting the list of consoles...",
  help: "Help",
  hide: "Hide",
  "hide-idle-cursor": "Hide mouse cursor on idle",
  "hide-scrollbar": "Hide web page's scrollbar",
  "hide-system-menu-icon": "Hide System menu's icon",
  "hide-touch-controller": "Hide touch controller",
  "horizontal-sensitivity": "Horizontal sensitivity",
  import: "Import",
  increase: "Increase",
  "install-android": "Install Better xCloud app for Android",
  "keyboard-shortcuts": "Keyboard shortcuts",
  language: "Language",
  large: "Large",
  layout: "Layout",
  "left-stick": "Left stick",
  "loading-screen": "Loading screen",
  "local-co-op": "Local co-op",
  "map-mouse-to": "Map mouse to",
  "may-not-work-properly": "May not work properly!",
  menu: "Menu",
  microphone: "Microphone",
  "mkb-adjust-ingame-settings": "You may also need to adjust the in-game sensitivity & deadzone settings",
  "mkb-click-to-activate": "Click to activate",
  "mkb-disclaimer": "Using this feature when playing online could be viewed as cheating",
  "mouse-and-keyboard": "Mouse & Keyboard",
  muted: "Muted",
  name: "Name",
  new: "New",
  "no-consoles-found": "No consoles found",
  normal: "Normal",
  off: "Off",
  on: "On",
  "only-supports-some-games": "Only supports some games",
  opacity: "Opacity",
  other: "Other",
  playing: "Playing",
  position: "Position",
  "powered-off": "Powered off",
  "powered-on": "Powered on",
  "prefer-ipv6-server": "Prefer IPv6 server",
  "preferred-game-language": "Preferred game's language",
  preset: "Preset",
  "press-esc-to-cancel": "Press Esc to cancel",
  "press-key-to-toggle-mkb": [
    (e) => `Press ${e.key} to toggle the Mouse and Keyboard feature`,
    (e) => `${e.key}: Maus- und Tastaturunterstützung an-/ausschalten`,
    (e) => `Tekan ${e.key} untuk mengaktifkan fitur Mouse dan Keyboard`,
    (e) => `Pulsa ${e.key} para activar la función de ratón y teclado`,
    (e) => `Appuyez sur ${e.key} pour activer/désactiver la fonction Souris et Clavier`,
    (e) => `Premi ${e.key} per attivare o disattivare la funzione Mouse e Tastiera`,
    (e) => `${e.key} キーでマウスとキーボードの機能を切り替える`,
    (e) => `${e.key} 키를 눌러 마우스와 키보드 기능을 활성화 하십시오`,
    (e) => `Naciśnij ${e.key}, aby przełączyć funkcję myszy i klawiatury`,
    (e) => `Pressione ${e.key} para ativar/desativar a função de Mouse e Teclado`,
    (e) => `Нажмите ${e.key} для переключения функции мыши и клавиатуры`,
    ,
    (e) => `Klavye ve fare özelliğini açmak için ${e.key} tuşuna basın`,
    (e) => `Натисніть ${e.key}, щоб увімкнути або вимкнути функцію миші та клавіатури`,
    (e) => `Nhấn ${e.key} để bật/tắt tính năng Chuột và Bàn phím`,
    (e) => `按下 ${e.key} 切换键鼠模式`
  ],
  "press-to-bind": "Press a key or do a mouse click to bind...",
  "prompt-preset-name": "Preset's name:",
  ratio: "Ratio",
  "reduce-animations": "Reduce UI animations",
  region: "Region",
  "remote-play": "Remote Play",
  rename: "Rename",
  "right-click-to-unbind": "Right-click on a key to unbind it",
  "right-stick": "Right stick",
  "rocket-always-hide": "Always hide",
  "rocket-always-show": "Always show",
  "rocket-animation": "Rocket animation",
  "rocket-hide-queue": "Hide when queuing",
  "safari-failed-message": "Failed to run Better xCloud. Retrying, please wait...",
  saturation: "Saturation",
  save: "Save",
  screen: "Screen",
  "screenshot-apply-filters": "Applies video filters to screenshots",
  "separate-touch-controller": "Separate Touch controller & Controller #1",
  "separate-touch-controller-note": "Touch controller is Player 1, Controller #1 is Player 2",
  server: "Server",
  "settings-reload": "Reload page to reflect changes",
  "settings-reloading": "Reloading...",
  "shortcut-keys": "Shortcut keys",
  show: "Show",
  "show-game-art": "Show game art",
  "show-hide": "Show/hide",
  "show-stats-on-startup": "Show stats when starting the game",
  "show-touch-controller": "Show touch controller",
  "show-wait-time": "Show the estimated wait time",
  "simplify-stream-menu": "Simplify Stream's menu",
  "skip-splash-video": "Skip Xbox splash video",
  slow: "Slow",
  small: "Small",
  "smart-tv": "Smart TV",
  sound: "Sound",
  standby: "Standby",
  "stat-bitrate": "Bitrate",
  "stat-decode-time": "Decode time",
  "stat-fps": "FPS",
  "stat-frames-lost": "Frames lost",
  "stat-packets-lost": "Packets lost",
  "stat-ping": "Ping",
  stats: "Stats",
  "stick-decay-minimum": "Stick decay minimum",
  "stick-decay-strength": "Stick decay strength",
  stream: "Stream",
  "stream-settings": "Stream settings",
  "stream-stats": "Stream stats",
  stretch: "Stretch",
  "stretch-note": "Don't use with native touch games",
  "support-better-xcloud": "Support Better xCloud",
  "swap-buttons": "Swap buttons",
  "take-screenshot": "Take screenshot",
  "target-resolution": "Target resolution",
  "tc-all-games": "All games",
  "tc-all-white": "All white",
  "tc-auto-off": "Off when controller found",
  "tc-availability": "Availability",
  "tc-custom-layout-style": "Custom layout's button style",
  "tc-default-opacity": "Default opacity",
  "tc-muted-colors": "Muted colors",
  "tc-standard-layout-style": "Standard layout's button style",
  "text-size": "Text size",
  toggle: "Toggle",
  "top-center": "Top-center",
  "top-left": "Top-left",
  "top-right": "Top-right",
  "touch-control-layout": "Touch control layout",
  "touch-control-layout-by": [
    (e) => `Touch control layout by ${e.name}`,
    (e) => `Touch-Steuerungslayout von ${e.name}`,
    (e) => `Tata letak Sentuhan layar oleh ${e.name}`,
    (e) => `Disposición del control táctil por ${e.nombre}`,
    (e) => `Disposition du contrôleur tactile par ${e.name}`,
    (e) => `Configurazione dei comandi su schermo creata da ${e.name}`,
    (e) => `タッチ操作レイアウト作成者: ${e.name}`,
    (e) => `${e.name} 제작, 터치 컨트롤 레이아웃`,
    (e) => `Układ sterowania dotykowego stworzony przez ${e.name}`,
    (e) => `Disposição de controle por toque feito por ${e.name}`,
    (e) => `Сенсорная раскладка по ${e.name}`,
    ,
    (e) => `${e.name} kişisinin dokunmatik kontrolcü tuş şeması`,
    (e) => `Розташування сенсорного керування від ${e.name}`,
    (e) => `Bố cục điều khiển cảm ứng tạo bởi ${e.name}`,
    (e) => `由 ${e.name} 提供的虚拟按键样式`
  ],
  "touch-controller": "Touch controller",
  "transparent-background": "Transparent background",
  ui: "UI",
  "unexpected-behavior": "May cause unexpected behavior",
  unknown: "Unknown",
  unlimited: "Unlimited",
  unmuted: "Unmuted",
  "use-mouse-absolute-position": "Use mouse's absolute position",
  "user-agent-profile": "User-Agent profile",
  "vertical-sensitivity": "Vertical sensitivity",
  "vibration-intensity": "Vibration intensity",
  "vibration-status": "Vibration",
  video: "Video",
  "visual-quality": "Visual quality",
  "visual-quality-high": "High",
  "visual-quality-low": "Low",
  "visual-quality-normal": "Normal",
  volume: "Volume",
  "wait-time-countdown": "Countdown",
  "wait-time-estimated": "Estimated finish time"
};

class Translations {
  static #EN_US = "en-US";
  static #KEY_LOCALE = "better_xcloud_locale";
  static #KEY_TRANSLATIONS = "better_xcloud_translations";
  static #enUsIndex = -1;
  static #selectedLocaleIndex = -1;
  static #selectedLocale = "en-US";
  static #supportedLocales = Object.keys(SUPPORTED_LANGUAGES);
  static #foreignTranslations = {};
  static async init() {
    Translations.#enUsIndex = Translations.#supportedLocales.indexOf(Translations.#EN_US);
    Translations.refreshCurrentLocale();
    await Translations.#loadTranslations();
  }
  static refreshCurrentLocale() {
    const supportedLocales = Translations.#supportedLocales;
    let locale = localStorage.getItem(Translations.#KEY_LOCALE);
    if (!locale) {
      locale = window.navigator.language || Translations.#EN_US;
      if (supportedLocales.indexOf(locale) === -1) {
        locale = Translations.#EN_US;
      }
      localStorage.setItem(Translations.#KEY_LOCALE, locale);
    }
    Translations.#selectedLocale = locale;
    Translations.#selectedLocaleIndex = supportedLocales.indexOf(locale);
  }
  static get(key, values) {
    let text = null;
    if (Translations.#foreignTranslations && Translations.#selectedLocale !== Translations.#EN_US) {
      text = Translations.#foreignTranslations[key];
    }
    if (!text) {
      text = Texts[key] || alert(`Missing translation key: ${key}`);
    }
    let translation;
    if (Array.isArray(text)) {
      translation = text[Translations.#selectedLocaleIndex] || text[Translations.#enUsIndex];
      return translation(values);
    }
    translation = text;
    return translation;
  }
  static async#loadTranslations() {
    if (Translations.#selectedLocale === Translations.#EN_US) {
      return;
    }
    try {
      Translations.#foreignTranslations = JSON.parse(window.localStorage.getItem(Translations.#KEY_TRANSLATIONS));
    } catch (e) {
    }
    if (!Translations.#foreignTranslations) {
      await this.downloadTranslations(Translations.#selectedLocale);
    }
  }
  static async updateTranslations(async = false) {
    if (Translations.#selectedLocale === Translations.#EN_US) {
      return;
    }
    if (async) {
      Translations.downloadTranslationsAsync(Translations.#selectedLocale);
    } else {
      await Translations.downloadTranslations(Translations.#selectedLocale);
    }
  }
  static async downloadTranslations(locale) {
    try {
      const resp = await NATIVE_FETCH(`https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/translations/${locale}.json`);
      const translations = await resp.json();
      window.localStorage.setItem(Translations.#KEY_TRANSLATIONS, JSON.stringify(translations));
      Translations.#foreignTranslations = translations;
      return true;
    } catch (e) {
      debugger;
    }
    return false;
  }
  static downloadTranslationsAsync(locale) {
    NATIVE_FETCH(`https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/translations/${locale}.json`).then((resp) => resp.json()).then((translations) => {
      window.localStorage.setItem(Translations.#KEY_TRANSLATIONS, JSON.stringify(translations));
      Translations.#foreignTranslations = translations;
    });
  }
}
var t = Translations.get;
Translations.init();

// src/utils/settings.ts
var SettingElementType;
(function(SettingElementType2) {
  SettingElementType2["OPTIONS"] = "options";
  SettingElementType2["MULTIPLE_OPTIONS"] = "multiple-options";
  SettingElementType2["NUMBER"] = "number";
  SettingElementType2["NUMBER_STEPPER"] = "number-stepper";
  SettingElementType2["CHECKBOX"] = "checkbox";
})(SettingElementType || (SettingElementType = {}));

class SettingElement {
  static #renderOptions(key, setting, currentValue, onChange) {
    const $control = CE("select", {
      title: setting.label,
      tabindex: 0
    });
    for (let value in setting.options) {
      const label = setting.options[value];
      const $option = CE("option", { value }, label);
      $control.appendChild($option);
    }
    $control.value = currentValue;
    onChange && $control.addEventListener("change", (e) => {
      const target = e.target;
      const value = setting.type && setting.type === "number" ? parseInt(target.value) : target.value;
      onChange(e, value);
    });
    $control.setValue = (value) => {
      $control.value = value;
    };
    return $control;
  }
  static #renderMultipleOptions(key, setting, currentValue, onChange, params = {}) {
    const $control = CE("select", {
      title: setting.label,
      multiple: true,
      tabindex: 0
    });
    if (params && params.size) {
      $control.setAttribute("size", params.size.toString());
    }
    for (let value in setting.multipleOptions) {
      const label = setting.multipleOptions[value];
      const $option = CE("option", { value }, label);
      $option.selected = currentValue.indexOf(value) > -1;
      $option.addEventListener("mousedown", function(e) {
        e.preventDefault();
        const target = e.target;
        target.selected = !target.selected;
        const $parent = target.parentElement;
        $parent.focus();
        $parent.dispatchEvent(new Event("change"));
      });
      $control.appendChild($option);
    }
    $control.addEventListener("mousedown", function(e) {
      const self = this;
      const orgScrollTop = self.scrollTop;
      window.setTimeout(() => self.scrollTop = orgScrollTop, 0);
    });
    $control.addEventListener("mousemove", (e) => e.preventDefault());
    onChange && $control.addEventListener("change", (e) => {
      const target = e.target;
      const values = Array.from(target.selectedOptions).map((i) => i.value);
      onChange(e, values);
    });
    return $control;
  }
  static #renderNumber(key, setting, currentValue, onChange) {
    const $control = CE("input", { tabindex: 0, type: "number", min: setting.min, max: setting.max });
    $control.value = currentValue;
    onChange && $control.addEventListener("change", (e) => {
      const target = e.target;
      const value = Math.max(setting.min, Math.min(setting.max, parseInt(target.value)));
      target.value = value.toString();
      onChange(e, value);
    });
    return $control;
  }
  static #renderCheckbox(key, setting, currentValue, onChange) {
    const $control = CE("input", { type: "checkbox", tabindex: 0 });
    $control.checked = currentValue;
    onChange && $control.addEventListener("change", (e) => {
      onChange(e, e.target.checked);
    });
    return $control;
  }
  static #renderNumberStepper(key, setting, value, onChange, options = {}) {
    options = options || {};
    options.suffix = options.suffix || "";
    options.disabled = !!options.disabled;
    options.hideSlider = !!options.hideSlider;
    let $text;
    let $decBtn;
    let $incBtn;
    let $range;
    const MIN = setting.min;
    const MAX = setting.max;
    const STEPS = Math.max(setting.steps || 1, 1);
    const renderTextValue = (value2) => {
      value2 = parseInt(value2);
      let textContent = null;
      if (options.customTextValue) {
        textContent = options.customTextValue(value2);
      }
      if (textContent === null) {
        textContent = value2.toString() + options.suffix;
      }
      return textContent;
    };
    const $wrapper = CE("div", { class: "bx-number-stepper" }, $decBtn = CE("button", {
      "data-type": "dec",
      type: "button",
      tabindex: -1
    }, "-"), $text = CE("span", {}, renderTextValue(value)), $incBtn = CE("button", {
      "data-type": "inc",
      type: "button",
      tabindex: -1
    }, "+"));
    if (!options.disabled && !options.hideSlider) {
      $range = CE("input", {
        id: `bx_setting_${key}`,
        type: "range",
        min: MIN,
        max: MAX,
        value,
        step: STEPS,
        tabindex: 0
      });
      $range.addEventListener("input", (e) => {
        value = parseInt(e.target.value);
        $text.textContent = renderTextValue(value);
        !e.ignoreOnChange && onChange && onChange(e, value);
      });
      $wrapper.appendChild($range);
      if (options.ticks || options.exactTicks) {
        const markersId = `markers-${key}`;
        const $markers = CE("datalist", { id: markersId });
        $range.setAttribute("list", markersId);
        if (options.exactTicks) {
          let start = Math.max(Math.floor(MIN / options.exactTicks), 1) * options.exactTicks;
          if (start === MIN) {
            start += options.exactTicks;
          }
          for (let i = start;i < MAX; i += options.exactTicks) {
            $markers.appendChild(CE("option", { value: i }));
          }
        } else {
          for (let i = MIN + options.ticks;i < MAX; i += options.ticks) {
            $markers.appendChild(CE("option", { value: i }));
          }
        }
        $wrapper.appendChild($markers);
      }
    }
    if (options.disabled) {
      $incBtn.disabled = true;
      $incBtn.classList.add("bx-hidden");
      $decBtn.disabled = true;
      $decBtn.classList.add("bx-hidden");
      return $wrapper;
    }
    let interval;
    let isHolding = false;
    const onClick = (e) => {
      if (isHolding) {
        e.preventDefault();
        isHolding = false;
        return;
      }
      let value2;
      if ($range) {
        value2 = parseInt($range.value);
      } else {
        value2 = parseInt($text.textContent);
      }
      const btnType = e.target.getAttribute("data-type");
      if (btnType === "dec") {
        value2 = Math.max(MIN, value2 - STEPS);
      } else {
        value2 = Math.min(MAX, value2 + STEPS);
      }
      $text.textContent = renderTextValue(value2);
      $range && ($range.value = value2.toString());
      isHolding = false;
      onChange && onChange(e, value2);
    };
    const onMouseDown = (e) => {
      e.preventDefault();
      isHolding = true;
      const args = arguments;
      interval && clearInterval(interval);
      interval = window.setInterval(() => {
        const event = new Event("click");
        event.arguments = args;
        e.target?.dispatchEvent(event);
      }, 200);
    };
    const onMouseUp = (e) => {
      e.preventDefault();
      interval && clearInterval(interval);
      isHolding = false;
    };
    const onContextMenu = (e) => e.preventDefault();
    $wrapper.setValue = (value2) => {
      $text.textContent = renderTextValue(value2);
      $range && ($range.value = value2);
    };
    $decBtn.addEventListener("click", onClick);
    $decBtn.addEventListener("pointerdown", onMouseDown);
    $decBtn.addEventListener("pointerup", onMouseUp);
    $decBtn.addEventListener("contextmenu", onContextMenu);
    $incBtn.addEventListener("click", onClick);
    $incBtn.addEventListener("pointerdown", onMouseDown);
    $incBtn.addEventListener("pointerup", onMouseUp);
    $incBtn.addEventListener("contextmenu", onContextMenu);
    return $wrapper;
  }
  static #METHOD_MAP = {
    [SettingElementType.OPTIONS]: SettingElement.#renderOptions,
    [SettingElementType.MULTIPLE_OPTIONS]: SettingElement.#renderMultipleOptions,
    [SettingElementType.NUMBER]: SettingElement.#renderNumber,
    [SettingElementType.NUMBER_STEPPER]: SettingElement.#renderNumberStepper,
    [SettingElementType.CHECKBOX]: SettingElement.#renderCheckbox
  };
  static render(type, key, setting, currentValue, onChange, options) {
    const method = SettingElement.#METHOD_MAP[type];
    const $control = method(...Array.from(arguments).slice(1));
    if (type !== SettingElementType.NUMBER_STEPPER) {
      $control.id = `bx_setting_${key}`;
    }
    if (type === SettingElementType.OPTIONS || type === SettingElementType.MULTIPLE_OPTIONS) {
      $control.name = $control.id;
    }
    return $control;
  }
}

// src/modules/mkb/mkb-preset.ts
class MkbPreset {
  static MOUSE_SETTINGS = {
    [MkbPresetKey.MOUSE_MAP_TO]: {
      label: t("map-mouse-to"),
      type: SettingElementType.OPTIONS,
      default: MouseMapTo[MouseMapTo.RS],
      options: {
        [MouseMapTo[MouseMapTo.RS]]: t("right-stick"),
        [MouseMapTo[MouseMapTo.LS]]: t("left-stick"),
        [MouseMapTo[MouseMapTo.OFF]]: t("off")
      }
    },
    [MkbPresetKey.MOUSE_SENSITIVITY_Y]: {
      label: t("horizontal-sensitivity"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 50,
      min: 1,
      max: 200,
      params: {
        suffix: "%",
        exactTicks: 20
      }
    },
    [MkbPresetKey.MOUSE_SENSITIVITY_X]: {
      label: t("vertical-sensitivity"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 50,
      min: 1,
      max: 200,
      params: {
        suffix: "%",
        exactTicks: 20
      }
    },
    [MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT]: {
      label: t("deadzone-counterweight"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 20,
      min: 1,
      max: 100,
      params: {
        suffix: "%",
        exactTicks: 10
      }
    },
    [MkbPresetKey.MOUSE_STICK_DECAY_STRENGTH]: {
      label: t("stick-decay-strength"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 100,
      min: 10,
      max: 100,
      params: {
        suffix: "%",
        exactTicks: 10
      }
    },
    [MkbPresetKey.MOUSE_STICK_DECAY_MIN]: {
      label: t("stick-decay-minimum"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 10,
      min: 1,
      max: 10,
      params: {
        suffix: "%"
      }
    }
  };
  static DEFAULT_PRESET = {
    mapping: {
      [GamepadKey.UP]: ["ArrowUp"],
      [GamepadKey.DOWN]: ["ArrowDown"],
      [GamepadKey.LEFT]: ["ArrowLeft"],
      [GamepadKey.RIGHT]: ["ArrowRight"],
      [GamepadKey.LS_UP]: ["KeyW"],
      [GamepadKey.LS_DOWN]: ["KeyS"],
      [GamepadKey.LS_LEFT]: ["KeyA"],
      [GamepadKey.LS_RIGHT]: ["KeyD"],
      [GamepadKey.RS_UP]: ["KeyI"],
      [GamepadKey.RS_DOWN]: ["KeyK"],
      [GamepadKey.RS_LEFT]: ["KeyJ"],
      [GamepadKey.RS_RIGHT]: ["KeyL"],
      [GamepadKey.A]: ["Space", "KeyE"],
      [GamepadKey.X]: ["KeyR"],
      [GamepadKey.B]: ["ControlLeft", "Backspace"],
      [GamepadKey.Y]: ["KeyV"],
      [GamepadKey.START]: ["Enter"],
      [GamepadKey.SELECT]: ["Tab"],
      [GamepadKey.LB]: ["KeyC", "KeyG"],
      [GamepadKey.RB]: ["KeyQ"],
      [GamepadKey.HOME]: ["Backquote"],
      [GamepadKey.RT]: [MouseButtonCode.LEFT_CLICK],
      [GamepadKey.LT]: [MouseButtonCode.RIGHT_CLICK],
      [GamepadKey.L3]: ["ShiftLeft"],
      [GamepadKey.R3]: ["KeyF"]
    },
    mouse: {
      [MkbPresetKey.MOUSE_MAP_TO]: MouseMapTo[MouseMapTo.RS],
      [MkbPresetKey.MOUSE_SENSITIVITY_X]: 50,
      [MkbPresetKey.MOUSE_SENSITIVITY_Y]: 50,
      [MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT]: 20,
      [MkbPresetKey.MOUSE_STICK_DECAY_STRENGTH]: 100,
      [MkbPresetKey.MOUSE_STICK_DECAY_MIN]: 10
    }
  };
  static convert(preset) {
    const obj = {
      mapping: {},
      mouse: Object.assign({}, preset.mouse)
    };
    for (const buttonIndex in preset.mapping) {
      for (const keyName of preset.mapping[parseInt(buttonIndex)]) {
        obj.mapping[keyName] = parseInt(buttonIndex);
      }
    }
    const mouse = obj.mouse;
    mouse[MkbPresetKey.MOUSE_SENSITIVITY_X] *= MkbHandler.DEFAULT_PANNING_SENSITIVITY;
    mouse[MkbPresetKey.MOUSE_SENSITIVITY_Y] *= MkbHandler.DEFAULT_PANNING_SENSITIVITY;
    mouse[MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT] *= MkbHandler.DEFAULT_DEADZONE_COUNTERWEIGHT;
    mouse[MkbPresetKey.MOUSE_STICK_DECAY_STRENGTH] *= 0.01;
    mouse[MkbPresetKey.MOUSE_STICK_DECAY_MIN] *= 0.01;
    const mouseMapTo = MouseMapTo[mouse[MkbPresetKey.MOUSE_MAP_TO]];
    if (typeof mouseMapTo !== "undefined") {
      mouse[MkbPresetKey.MOUSE_MAP_TO] = mouseMapTo;
    } else {
      mouse[MkbPresetKey.MOUSE_MAP_TO] = MkbPreset.MOUSE_SETTINGS[MkbPresetKey.MOUSE_MAP_TO].default;
    }
    console.log(obj);
    return obj;
  }
}

// src/modules/stream/stream-badges.ts
var StreamBadge;
(function(StreamBadge2) {
  StreamBadge2["PLAYTIME"] = "playtime";
  StreamBadge2["BATTERY"] = "battery";
  StreamBadge2["IN"] = "in";
  StreamBadge2["OUT"] = "out";
  StreamBadge2["SERVER"] = "server";
  StreamBadge2["VIDEO"] = "video";
  StreamBadge2["AUDIO"] = "audio";
  StreamBadge2["BREAK"] = "break";
})(StreamBadge || (StreamBadge = {}));

class StreamBadges {
  static ipv6 = false;
  static resolution = null;
  static video = null;
  static audio = null;
  static fps = 0;
  static region = "";
  static startBatteryLevel = 100;
  static startTimestamp = 0;
  static #cachedDoms = {};
  static #interval;
  static #REFRESH_INTERVAL = 3000;
  static #renderBadge(name, value, color) {
    if (name === StreamBadge.BREAK) {
      return CE("div", { style: "display: block" });
    }
    let $badge;
    if (StreamBadges.#cachedDoms[name]) {
      $badge = StreamBadges.#cachedDoms[name];
      $badge.lastElementChild.textContent = value;
      return $badge;
    }
    $badge = CE("div", { class: "bx-badge" }, CE("span", { class: "bx-badge-name" }, t(`badge-${name}`)), CE("span", { class: "bx-badge-value", style: `background-color: ${color}` }, value));
    if (name === StreamBadge.BATTERY) {
      $badge.classList.add("bx-badge-battery");
    }
    StreamBadges.#cachedDoms[name] = $badge;
    return $badge;
  }
  static async#updateBadges(forceUpdate) {
    if (!forceUpdate && !document.querySelector(".bx-badges")) {
      StreamBadges.#stop();
      return;
    }
    let now = +new Date;
    const diffSeconds = Math.ceil((now - StreamBadges.startTimestamp) / 1000);
    const playtime = StreamBadges.#secondsToHm(diffSeconds);
    let batteryLevel = "100%";
    let batteryLevelInt = 100;
    let isCharging = false;
    if ("getBattery" in navigator) {
      try {
        const bm = await navigator.getBattery();
        isCharging = bm.charging;
        batteryLevelInt = Math.round(bm.level * 100);
        batteryLevel = `${batteryLevelInt}%`;
        if (batteryLevelInt != StreamBadges.startBatteryLevel) {
          const diffLevel = Math.round(batteryLevelInt - StreamBadges.startBatteryLevel);
          const sign = diffLevel > 0 ? "+" : "";
          batteryLevel += ` (${sign}${diffLevel}%)`;
        }
      } catch (e) {
      }
    }
    const stats = await STATES.currentStream.peerConnection?.getStats();
    let totalIn = 0;
    let totalOut = 0;
    stats.forEach((stat) => {
      if (stat.type === "candidate-pair" && stat.packetsReceived > 0 && stat.state === "succeeded") {
        totalIn += stat.bytesReceived;
        totalOut += stat.bytesSent;
      }
    });
    const badges = {
      [StreamBadge.IN]: totalIn ? StreamBadges.#humanFileSize(totalIn) : null,
      [StreamBadge.OUT]: totalOut ? StreamBadges.#humanFileSize(totalOut) : null,
      [StreamBadge.PLAYTIME]: playtime,
      [StreamBadge.BATTERY]: batteryLevel
    };
    let name;
    for (name in badges) {
      const value = badges[name];
      if (value === null) {
        continue;
      }
      const $elm = StreamBadges.#cachedDoms[name];
      $elm && ($elm.lastElementChild.textContent = value);
      if (name === StreamBadge.BATTERY) {
        $elm.setAttribute("data-charging", isCharging.toString());
        if (StreamBadges.startBatteryLevel === 100 && batteryLevelInt === 100) {
          $elm.style.display = "none";
        } else {
          $elm.removeAttribute("style");
        }
      }
    }
  }
  static #stop() {
    StreamBadges.#interval && clearInterval(StreamBadges.#interval);
    StreamBadges.#interval = null;
  }
  static #secondsToHm(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60) + 1;
    const hDisplay = h > 0 ? `${h}h` : "";
    const mDisplay = m > 0 ? `${m}m` : "";
    return hDisplay + mDisplay;
  }
  static #humanFileSize(size) {
    const units = ["B", "kB", "MB", "GB", "TB"];
    let i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) + " " + units[i];
  }
  static async render() {
    let video = "";
    if (StreamBadges.resolution) {
      video = `${StreamBadges.resolution.height}p`;
    }
    if (StreamBadges.video) {
      video && (video += "/");
      video += StreamBadges.video.codec;
      if (StreamBadges.video.profile) {
        const profile = StreamBadges.video.profile;
        let quality = profile;
        if (profile.startsWith("4d")) {
          quality = t("visual-quality-high");
        } else if (profile.startsWith("42e")) {
          quality = t("visual-quality-normal");
        } else if (profile.startsWith("420")) {
          quality = t("visual-quality-low");
        }
        video += ` (${quality})`;
      }
    }
    let audio;
    if (StreamBadges.audio) {
      audio = StreamBadges.audio.codec;
      const bitrate = StreamBadges.audio.bitrate / 1000;
      audio += ` (${bitrate} kHz)`;
    }
    let batteryLevel = "";
    if ("getBattery" in navigator) {
      batteryLevel = "100%";
    }
    let server = StreamBadges.region;
    server += "@" + (StreamBadges.ipv6 ? "IPv6" : "IPv4");
    const BADGES = [
      [StreamBadge.PLAYTIME, "1m", "#ff004d"],
      [StreamBadge.BATTERY, batteryLevel, "#00b543"],
      [StreamBadge.IN, StreamBadges.#humanFileSize(0), "#29adff"],
      [StreamBadge.OUT, StreamBadges.#humanFileSize(0), "#ff77a8"],
      [StreamBadge.BREAK],
      [StreamBadge.SERVER, server, "#ff6c24"],
      video ? [StreamBadge.VIDEO, video, "#742f29"] : null,
      audio ? [StreamBadge.AUDIO, audio, "#5f574f"] : null
    ];
    const $wrapper = CE("div", { class: "bx-badges" });
    BADGES.forEach((item2) => {
      if (!item2) {
        return;
      }
      const $badge = StreamBadges.#renderBadge(...item2);
      $wrapper.appendChild($badge);
    });
    await StreamBadges.#updateBadges(true);
    StreamBadges.#stop();
    StreamBadges.#interval = window.setInterval(StreamBadges.#updateBadges, StreamBadges.#REFRESH_INTERVAL);
    return $wrapper;
  }
  static setupEvents() {
    window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
      const $video = e.$video;
      StreamBadges.resolution = {
        width: $video.videoWidth,
        height: $video.videoHeight
      };
      StreamBadges.startTimestamp = +new Date;
      try {
        "getBattery" in navigator && navigator.getBattery().then((bm) => {
          StreamBadges.startBatteryLevel = Math.round(bm.level * 100);
        });
      } catch (e2) {
      }
    });
  }
}

// src/utils/bx-logger.ts
var TextColor;
(function(TextColor2) {
  TextColor2["INFO"] = "#008746";
  TextColor2["WARNING"] = "#c1a404";
  TextColor2["ERROR"] = "#c10404";
})(TextColor || (TextColor = {}));

class BxLogger {
  static #PREFIX = "[BxC]";
  static info(tag, ...args) {
    BxLogger.#log(TextColor.INFO, tag, ...args);
  }
  static warning(tag, ...args) {
    BxLogger.#log(TextColor.WARNING, tag, ...args);
  }
  static error(tag, ...args) {
    BxLogger.#log(TextColor.ERROR, tag, ...args);
  }
  static #log(color, tag, ...args) {
    console.log(`%c${BxLogger.#PREFIX}`, `color:${color};font-weight:bold;`, tag, "//", ...args);
  }
}
window.BxLogger = BxLogger;

// src/modules/stream/stream-stats.ts
var StreamStat;
(function(StreamStat2) {
  StreamStat2["PING"] = "ping";
  StreamStat2["FPS"] = "fps";
  StreamStat2["BITRATE"] = "btr";
  StreamStat2["DECODE_TIME"] = "dt";
  StreamStat2["PACKETS_LOST"] = "pl";
  StreamStat2["FRAMES_LOST"] = "fl";
})(StreamStat || (StreamStat = {}));

class StreamStats {
  static #interval;
  static #updateInterval = 1000;
  static #$container;
  static #$fps;
  static #$ping;
  static #$dt;
  static #$pl;
  static #$fl;
  static #$br;
  static #lastStat;
  static #quickGlanceObserver;
  static start(glancing = false) {
    if (!StreamStats.isHidden() || glancing && StreamStats.isGlancing()) {
      return;
    }
    StreamStats.#$container.classList.remove("bx-gone");
    StreamStats.#$container.setAttribute("data-display", glancing ? "glancing" : "fixed");
    StreamStats.#interval = window.setInterval(StreamStats.update, StreamStats.#updateInterval);
  }
  static stop(glancing = false) {
    if (glancing && !StreamStats.isGlancing()) {
      return;
    }
    StreamStats.#interval && clearInterval(StreamStats.#interval);
    StreamStats.#interval = null;
    StreamStats.#lastStat = null;
    if (StreamStats.#$container) {
      StreamStats.#$container.removeAttribute("data-display");
      StreamStats.#$container.classList.add("bx-gone");
    }
  }
  static toggle() {
    if (StreamStats.isGlancing()) {
      StreamStats.#$container.setAttribute("data-display", "fixed");
    } else {
      StreamStats.isHidden() ? StreamStats.start() : StreamStats.stop();
    }
  }
  static onStoppedPlaying() {
    StreamStats.stop();
    StreamStats.quickGlanceStop();
    StreamStats.hideSettingsUi();
  }
  static isHidden = () => StreamStats.#$container && StreamStats.#$container.classList.contains("bx-gone");
  static isGlancing = () => StreamStats.#$container && StreamStats.#$container.getAttribute("data-display") === "glancing";
  static quickGlanceSetup() {
    if (StreamStats.#quickGlanceObserver) {
      return;
    }
    const $uiContainer = document.querySelector("div[data-testid=ui-container]");
    StreamStats.#quickGlanceObserver = new MutationObserver((mutationList, observer) => {
      for (let record of mutationList) {
        if (record.attributeName && record.attributeName === "aria-expanded") {
          const expanded = record.target.ariaExpanded;
          if (expanded === "true") {
            StreamStats.isHidden() && StreamStats.start(true);
          } else {
            StreamStats.stop(true);
          }
        }
      }
    });
    StreamStats.#quickGlanceObserver.observe($uiContainer, {
      attributes: true,
      attributeFilter: ["aria-expanded"],
      subtree: true
    });
  }
  static quickGlanceStop() {
    StreamStats.#quickGlanceObserver && StreamStats.#quickGlanceObserver.disconnect();
    StreamStats.#quickGlanceObserver = null;
  }
  static update() {
    if (StreamStats.isHidden() || !STATES.currentStream.peerConnection) {
      StreamStats.onStoppedPlaying();
      return;
    }
    const PREF_STATS_CONDITIONAL_FORMATTING = getPref(PrefKey.STATS_CONDITIONAL_FORMATTING);
    STATES.currentStream.peerConnection.getStats().then((stats) => {
      stats.forEach((stat) => {
        let grade = "";
        if (stat.type === "inbound-rtp" && stat.kind === "video") {
          StreamStats.#$fps.textContent = stat.framesPerSecond || 0;
          const packetsLost = stat.packetsLost;
          const packetsReceived = stat.packetsReceived;
          const packetsLostPercentage = (packetsLost * 100 / (packetsLost + packetsReceived || 1)).toFixed(2);
          StreamStats.#$pl.textContent = packetsLostPercentage === "0.00" ? packetsLost : `${packetsLost} (${packetsLostPercentage}%)`;
          const framesDropped = stat.framesDropped;
          const framesReceived = stat.framesReceived;
          const framesDroppedPercentage = (framesDropped * 100 / (framesDropped + framesReceived || 1)).toFixed(2);
          StreamStats.#$fl.textContent = framesDroppedPercentage === "0.00" ? framesDropped : `${framesDropped} (${framesDroppedPercentage}%)`;
          if (StreamStats.#lastStat) {
            const lastStat = StreamStats.#lastStat;
            const timeDiff = stat.timestamp - lastStat.timestamp;
            const bitrate = 8 * (stat.bytesReceived - lastStat.bytesReceived) / timeDiff / 1000;
            StreamStats.#$br.textContent = `${bitrate.toFixed(2)} Mbps`;
            const totalDecodeTimeDiff = stat.totalDecodeTime - lastStat.totalDecodeTime;
            const framesDecodedDiff = stat.framesDecoded - lastStat.framesDecoded;
            const currentDecodeTime = totalDecodeTimeDiff / framesDecodedDiff * 1000;
            StreamStats.#$dt.textContent = `${currentDecodeTime.toFixed(2)}ms`;
            if (PREF_STATS_CONDITIONAL_FORMATTING) {
              grade = currentDecodeTime > 12 ? "bad" : currentDecodeTime > 9 ? "ok" : currentDecodeTime > 6 ? "good" : "";
            }
            StreamStats.#$dt.setAttribute("data-grade", grade);
          }
          StreamStats.#lastStat = stat;
        } else if (stat.type === "candidate-pair" && stat.packetsReceived > 0 && stat.state === "succeeded") {
          const roundTripTime = typeof stat.currentRoundTripTime !== "undefined" ? stat.currentRoundTripTime * 1000 : -1;
          StreamStats.#$ping.textContent = roundTripTime === -1 ? "???" : roundTripTime.toString();
          if (PREF_STATS_CONDITIONAL_FORMATTING) {
            grade = roundTripTime > 100 ? "bad" : roundTripTime > 75 ? "ok" : roundTripTime > 40 ? "good" : "";
          }
          StreamStats.#$ping.setAttribute("data-grade", grade);
        }
      });
    });
  }
  static refreshStyles() {
    const PREF_ITEMS = getPref(PrefKey.STATS_ITEMS);
    const PREF_POSITION = getPref(PrefKey.STATS_POSITION);
    const PREF_TRANSPARENT = getPref(PrefKey.STATS_TRANSPARENT);
    const PREF_OPACITY = getPref(PrefKey.STATS_OPACITY);
    const PREF_TEXT_SIZE = getPref(PrefKey.STATS_TEXT_SIZE);
    const $container = StreamStats.#$container;
    $container.setAttribute("data-stats", "[" + PREF_ITEMS.join("][") + "]");
    $container.setAttribute("data-position", PREF_POSITION);
    $container.setAttribute("data-transparent", PREF_TRANSPARENT);
    $container.style.opacity = PREF_OPACITY + "%";
    $container.style.fontSize = PREF_TEXT_SIZE;
  }
  static hideSettingsUi() {
    if (StreamStats.isGlancing() && !getPref(PrefKey.STATS_QUICK_GLANCE)) {
      StreamStats.stop();
    }
  }
  static render() {
    if (StreamStats.#$container) {
      return;
    }
    const STATS = {
      [StreamStat.PING]: [t("stat-ping"), StreamStats.#$ping = CE("span", {}, "0")],
      [StreamStat.FPS]: [t("stat-fps"), StreamStats.#$fps = CE("span", {}, "0")],
      [StreamStat.BITRATE]: [t("stat-bitrate"), StreamStats.#$br = CE("span", {}, "0 Mbps")],
      [StreamStat.DECODE_TIME]: [t("stat-decode-time"), StreamStats.#$dt = CE("span", {}, "0ms")],
      [StreamStat.PACKETS_LOST]: [t("stat-packets-lost"), StreamStats.#$pl = CE("span", {}, "0")],
      [StreamStat.FRAMES_LOST]: [t("stat-frames-lost"), StreamStats.#$fl = CE("span", {}, "0")]
    };
    const $barFragment = document.createDocumentFragment();
    let statKey;
    for (statKey in STATS) {
      const $div = CE("div", { class: `bx-stat-${statKey}`, title: STATS[statKey][0] }, CE("label", {}, statKey.toUpperCase()), STATS[statKey][1]);
      $barFragment.appendChild($div);
    }
    StreamStats.#$container = CE("div", { class: "bx-stats-bar bx-gone" }, $barFragment);
    document.documentElement.appendChild(StreamStats.#$container);
    StreamStats.refreshStyles();
  }
  static getServerStats() {
    STATES.currentStream.peerConnection && STATES.currentStream.peerConnection.getStats().then((stats) => {
      const allVideoCodecs = {};
      let videoCodecId;
      const allAudioCodecs = {};
      let audioCodecId;
      const allCandidates = {};
      let candidateId;
      stats.forEach((stat) => {
        if (stat.type === "codec") {
          const mimeType = stat.mimeType.split("/");
          if (mimeType[0] === "video") {
            allVideoCodecs[stat.id] = stat;
          } else if (mimeType[0] === "audio") {
            allAudioCodecs[stat.id] = stat;
          }
        } else if (stat.type === "inbound-rtp" && stat.packetsReceived > 0) {
          if (stat.kind === "video") {
            videoCodecId = stat.codecId;
          } else if (stat.kind === "audio") {
            audioCodecId = stat.codecId;
          }
        } else if (stat.type === "candidate-pair" && stat.packetsReceived > 0 && stat.state === "succeeded") {
          candidateId = stat.remoteCandidateId;
        } else if (stat.type === "remote-candidate") {
          allCandidates[stat.id] = stat.address;
        }
      });
      if (videoCodecId) {
        const videoStat = allVideoCodecs[videoCodecId];
        const video = {
          codec: videoStat.mimeType.substring(6)
        };
        if (video.codec === "H264") {
          const match = /profile-level-id=([0-9a-f]{6})/.exec(videoStat.sdpFmtpLine);
          video.profile = match ? match[1] : null;
        }
        StreamBadges.video = video;
      }
      if (audioCodecId) {
        const audioStat = allAudioCodecs[audioCodecId];
        StreamBadges.audio = {
          codec: audioStat.mimeType.substring(6),
          bitrate: audioStat.clockRate
        };
      }
      if (candidateId) {
        BxLogger.info("candidate", candidateId, allCandidates);
        StreamBadges.ipv6 = allCandidates[candidateId].includes(":");
      }
      if (getPref(PrefKey.STATS_SHOW_WHEN_PLAYING)) {
        StreamStats.start();
      }
    });
  }
  static setupEvents() {
    window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
      const PREF_STATS_QUICK_GLANCE = getPref(PrefKey.STATS_QUICK_GLANCE);
      const PREF_STATS_SHOW_WHEN_PLAYING = getPref(PrefKey.STATS_SHOW_WHEN_PLAYING);
      StreamStats.getServerStats();
      if (PREF_STATS_QUICK_GLANCE) {
        StreamStats.quickGlanceSetup();
        !PREF_STATS_SHOW_WHEN_PLAYING && StreamStats.start(true);
      }
    });
  }
}

// src/utils/preferences.ts
var PrefKey;
(function(PrefKey2) {
  PrefKey2["LAST_UPDATE_CHECK"] = "version_last_check";
  PrefKey2["LATEST_VERSION"] = "version_latest";
  PrefKey2["CURRENT_VERSION"] = "version_current";
  PrefKey2["BETTER_XCLOUD_LOCALE"] = "bx_locale";
  PrefKey2["SERVER_REGION"] = "server_region";
  PrefKey2["PREFER_IPV6_SERVER"] = "prefer_ipv6_server";
  PrefKey2["STREAM_TARGET_RESOLUTION"] = "stream_target_resolution";
  PrefKey2["STREAM_PREFERRED_LOCALE"] = "stream_preferred_locale";
  PrefKey2["STREAM_CODEC_PROFILE"] = "stream_codec_profile";
  PrefKey2["USER_AGENT_PROFILE"] = "user_agent_profile";
  PrefKey2["STREAM_SIMPLIFY_MENU"] = "stream_simplify_menu";
  PrefKey2["STREAM_COMBINE_SOURCES"] = "stream_combine_sources";
  PrefKey2["STREAM_TOUCH_CONTROLLER"] = "stream_touch_controller";
  PrefKey2["STREAM_TOUCH_CONTROLLER_AUTO_OFF"] = "stream_touch_controller_auto_off";
  PrefKey2["STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY"] = "stream_touch_controller_default_opacity";
  PrefKey2["STREAM_TOUCH_CONTROLLER_STYLE_STANDARD"] = "stream_touch_controller_style_standard";
  PrefKey2["STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM"] = "stream_touch_controller_style_custom";
  PrefKey2["STREAM_DISABLE_FEEDBACK_DIALOG"] = "stream_disable_feedback_dialog";
  PrefKey2["BITRATE_VIDEO_MAX"] = "bitrate_video_max";
  PrefKey2["GAME_BAR_POSITION"] = "game_bar_position";
  PrefKey2["LOCAL_CO_OP_ENABLED"] = "local_co_op_enabled";
  PrefKey2["CONTROLLER_ENABLE_SHORTCUTS"] = "controller_enable_shortcuts";
  PrefKey2["CONTROLLER_ENABLE_VIBRATION"] = "controller_enable_vibration";
  PrefKey2["CONTROLLER_DEVICE_VIBRATION"] = "controller_device_vibration";
  PrefKey2["CONTROLLER_VIBRATION_INTENSITY"] = "controller_vibration_intensity";
  PrefKey2["NATIVE_MKB_DISABLED"] = "native_mkb_disabled";
  PrefKey2["MKB_ENABLED"] = "mkb_enabled";
  PrefKey2["MKB_HIDE_IDLE_CURSOR"] = "mkb_hide_idle_cursor";
  PrefKey2["MKB_ABSOLUTE_MOUSE"] = "mkb_absolute_mouse";
  PrefKey2["MKB_DEFAULT_PRESET_ID"] = "mkb_default_preset_id";
  PrefKey2["SCREENSHOT_APPLY_FILTERS"] = "screenshot_apply_filters";
  PrefKey2["BLOCK_TRACKING"] = "block_tracking";
  PrefKey2["BLOCK_SOCIAL_FEATURES"] = "block_social_features";
  PrefKey2["SKIP_SPLASH_VIDEO"] = "skip_splash_video";
  PrefKey2["HIDE_DOTS_ICON"] = "hide_dots_icon";
  PrefKey2["REDUCE_ANIMATIONS"] = "reduce_animations";
  PrefKey2["UI_LOADING_SCREEN_GAME_ART"] = "ui_loading_screen_game_art";
  PrefKey2["UI_LOADING_SCREEN_WAIT_TIME"] = "ui_loading_screen_wait_time";
  PrefKey2["UI_LOADING_SCREEN_ROCKET"] = "ui_loading_screen_rocket";
  PrefKey2["UI_LAYOUT"] = "ui_layout";
  PrefKey2["UI_SCROLLBAR_HIDE"] = "ui_scrollbar_hide";
  PrefKey2["UI_HOME_CONTEXT_MENU_DISABLED"] = "ui_home_context_menu_disabled";
  PrefKey2["VIDEO_CLARITY"] = "video_clarity";
  PrefKey2["VIDEO_RATIO"] = "video_ratio";
  PrefKey2["VIDEO_BRIGHTNESS"] = "video_brightness";
  PrefKey2["VIDEO_CONTRAST"] = "video_contrast";
  PrefKey2["VIDEO_SATURATION"] = "video_saturation";
  PrefKey2["AUDIO_MIC_ON_PLAYING"] = "audio_mic_on_playing";
  PrefKey2["AUDIO_ENABLE_VOLUME_CONTROL"] = "audio_enable_volume_control";
  PrefKey2["AUDIO_VOLUME"] = "audio_volume";
  PrefKey2["STATS_ITEMS"] = "stats_items";
  PrefKey2["STATS_SHOW_WHEN_PLAYING"] = "stats_show_when_playing";
  PrefKey2["STATS_QUICK_GLANCE"] = "stats_quick_glance";
  PrefKey2["STATS_POSITION"] = "stats_position";
  PrefKey2["STATS_TEXT_SIZE"] = "stats_text_size";
  PrefKey2["STATS_TRANSPARENT"] = "stats_transparent";
  PrefKey2["STATS_OPACITY"] = "stats_opacity";
  PrefKey2["STATS_CONDITIONAL_FORMATTING"] = "stats_conditional_formatting";
  PrefKey2["REMOTE_PLAY_ENABLED"] = "xhome_enabled";
  PrefKey2["REMOTE_PLAY_RESOLUTION"] = "xhome_resolution";
  PrefKey2["GAME_FORTNITE_FORCE_CONSOLE"] = "game_fortnite_force_console";
})(PrefKey || (PrefKey = {}));

class Preferences {
  static SETTINGS = {
    [PrefKey.LAST_UPDATE_CHECK]: {
      default: 0
    },
    [PrefKey.LATEST_VERSION]: {
      default: ""
    },
    [PrefKey.CURRENT_VERSION]: {
      default: ""
    },
    [PrefKey.BETTER_XCLOUD_LOCALE]: {
      label: t("language"),
      default: localStorage.getItem("better_xcloud_locale") || "en-US",
      options: SUPPORTED_LANGUAGES
    },
    [PrefKey.SERVER_REGION]: {
      label: t("region"),
      default: "default"
    },
    [PrefKey.STREAM_PREFERRED_LOCALE]: {
      label: t("preferred-game-language"),
      default: "default",
      options: {
        default: t("default"),
        "ar-SA": "العربية",
        "cs-CZ": "čeština",
        "da-DK": "dansk",
        "de-DE": "Deutsch",
        "el-GR": "Ελληνικά",
        "en-GB": "English (United Kingdom)",
        "en-US": "English (United States)",
        "es-ES": "español (España)",
        "es-MX": "español (Latinoamérica)",
        "fi-FI": "suomi",
        "fr-FR": "français",
        "he-IL": "עברית",
        "hu-HU": "magyar",
        "it-IT": "italiano",
        "ja-JP": "日本語",
        "ko-KR": "한국어",
        "nb-NO": "norsk bokmål",
        "nl-NL": "Nederlands",
        "pl-PL": "polski",
        "pt-BR": "português (Brasil)",
        "pt-PT": "português (Portugal)",
        "ru-RU": "русский",
        "sk-SK": "slovenčina",
        "sv-SE": "svenska",
        "tr-TR": "Türkçe",
        "zh-CN": "中文(简体)",
        "zh-TW": "中文 (繁體)"
      }
    },
    [PrefKey.STREAM_TARGET_RESOLUTION]: {
      label: t("target-resolution"),
      default: "auto",
      options: {
        auto: t("default"),
        "1080p": "1080p",
        "720p": "720p"
      }
    },
    [PrefKey.STREAM_CODEC_PROFILE]: {
      label: t("visual-quality"),
      default: "default",
      options: (() => {
        const options = {
          default: t("default")
        };
        if (!("getCapabilities" in RTCRtpReceiver) || typeof RTCRtpTransceiver === "undefined" || !("setCodecPreferences" in RTCRtpTransceiver.prototype)) {
          return options;
        }
        let hasLowCodec = false;
        let hasNormalCodec = false;
        let hasHighCodec = false;
        const codecs = RTCRtpReceiver.getCapabilities("video").codecs;
        for (let codec of codecs) {
          if (codec.mimeType.toLowerCase() !== "video/h264" || !codec.sdpFmtpLine) {
            continue;
          }
          const fmtp = codec.sdpFmtpLine.toLowerCase();
          if (!hasHighCodec && fmtp.includes("profile-level-id=4d")) {
            hasHighCodec = true;
          } else if (!hasNormalCodec && fmtp.includes("profile-level-id=42e")) {
            hasNormalCodec = true;
          } else if (!hasLowCodec && fmtp.includes("profile-level-id=420")) {
            hasLowCodec = true;
          }
        }
        if (hasHighCodec) {
          if (!hasLowCodec && !hasNormalCodec) {
            options.default = `${t("visual-quality-high")} (${t("default")})`;
          } else {
            options.high = t("visual-quality-high");
          }
        }
        if (hasNormalCodec) {
          if (!hasLowCodec && !hasHighCodec) {
            options.default = `${t("visual-quality-normal")} (${t("default")})`;
          } else {
            options.normal = t("visual-quality-normal");
          }
        }
        if (hasLowCodec) {
          if (!hasNormalCodec && !hasHighCodec) {
            options.default = `${t("visual-quality-low")} (${t("default")})`;
          } else {
            options.low = t("visual-quality-low");
          }
        }
        return options;
      })(),
      ready: (setting) => {
        const options = setting.options;
        const keys = Object.keys(options);
        if (keys.length <= 1) {
          setting.unsupported = true;
          setting.note = "⚠️ " + t("browser-unsupported-feature");
        } else {
        }
      }
    },
    [PrefKey.PREFER_IPV6_SERVER]: {
      label: t("prefer-ipv6-server"),
      default: false
    },
    [PrefKey.SCREENSHOT_APPLY_FILTERS]: {
      label: t("screenshot-apply-filters"),
      default: false
    },
    [PrefKey.SKIP_SPLASH_VIDEO]: {
      label: t("skip-splash-video"),
      default: false
    },
    [PrefKey.HIDE_DOTS_ICON]: {
      label: t("hide-system-menu-icon"),
      default: false
    },
    [PrefKey.STREAM_COMBINE_SOURCES]: {
      label: t("combine-audio-video-streams"),
      default: false,
      experimental: true,
      note: t("combine-audio-video-streams-summary")
    },
    [PrefKey.STREAM_TOUCH_CONTROLLER]: {
      label: t("tc-availability"),
      default: "all",
      options: {
        default: t("default"),
        all: t("tc-all-games"),
        off: t("off")
      },
      unsupported: !STATES.hasTouchSupport,
      ready: (setting) => {
        if (setting.unsupported) {
          setting.default = "default";
        }
      }
    },
    [PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF]: {
      label: t("tc-auto-off"),
      default: false,
      unsupported: !STATES.hasTouchSupport
    },
    [PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY]: {
      type: SettingElementType.NUMBER_STEPPER,
      label: t("tc-default-opacity"),
      default: 100,
      min: 10,
      max: 100,
      steps: 10,
      params: {
        suffix: "%",
        ticks: 10,
        hideSlider: true
      },
      unsupported: !STATES.hasTouchSupport
    },
    [PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: {
      label: t("tc-standard-layout-style"),
      default: "default",
      options: {
        default: t("default"),
        white: t("tc-all-white"),
        muted: t("tc-muted-colors")
      },
      unsupported: !STATES.hasTouchSupport
    },
    [PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: {
      label: t("tc-custom-layout-style"),
      default: "default",
      options: {
        default: t("default"),
        muted: t("tc-muted-colors")
      },
      unsupported: !STATES.hasTouchSupport
    },
    [PrefKey.STREAM_SIMPLIFY_MENU]: {
      label: t("simplify-stream-menu"),
      default: false
    },
    [PrefKey.MKB_HIDE_IDLE_CURSOR]: {
      label: t("hide-idle-cursor"),
      default: false
    },
    [PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG]: {
      label: t("disable-post-stream-feedback-dialog"),
      default: false
    },
    [PrefKey.BITRATE_VIDEO_MAX]: {
      type: SettingElementType.NUMBER_STEPPER,
      label: t("bitrate-video-maximum"),
      note: "⚠️ " + t("unexpected-behavior"),
      default: 0,
      min: 0,
      max: 14,
      steps: 1,
      params: {
        suffix: " Mb/s",
        exactTicks: 5,
        customTextValue: (value) => {
          value = parseInt(value);
          if (value === 0) {
            return t("unlimited");
          }
          return null;
        }
      }
    },
    [PrefKey.GAME_BAR_POSITION]: {
      label: t("position"),
      default: "bottom-left",
      options: {
        "bottom-left": t("bottom-left"),
        "bottom-right": t("bottom-right"),
        off: t("off")
      }
    },
    [PrefKey.LOCAL_CO_OP_ENABLED]: {
      label: t("enable-local-co-op-support"),
      default: false,
      note: CE("a", {
        href: "https://github.com/redphx/better-xcloud/discussions/275",
        target: "_blank"
      }, t("enable-local-co-op-support-note"))
    },
    [PrefKey.CONTROLLER_ENABLE_SHORTCUTS]: {
      default: false
    },
    [PrefKey.CONTROLLER_ENABLE_VIBRATION]: {
      default: true
    },
    [PrefKey.CONTROLLER_DEVICE_VIBRATION]: {
      default: "off",
      options: {
        on: t("on"),
        auto: t("device-vibration-not-using-gamepad"),
        off: t("off")
      }
    },
    [PrefKey.CONTROLLER_VIBRATION_INTENSITY]: {
      type: SettingElementType.NUMBER_STEPPER,
      default: 100,
      min: 0,
      max: 100,
      steps: 10,
      params: {
        suffix: "%",
        ticks: 10
      }
    },
    [PrefKey.MKB_ENABLED]: {
      label: t("enable-mkb"),
      default: false,
      unsupported: (() => {
        const userAgent2 = (window.navigator.orgUserAgent || window.navigator.userAgent || "").toLowerCase();
        return userAgent2.match(/(android|iphone|ipad)/) ? t("browser-unsupported-feature") : false;
      })(),
      ready: (setting) => {
        let note;
        let url;
        if (setting.unsupported) {
          note = t("browser-unsupported-feature");
          url = "https://github.com/redphx/better-xcloud/issues/206#issuecomment-1920475657";
        } else {
          note = t("mkb-disclaimer");
          url = "https://better-xcloud.github.io/mouse-and-keyboard/#disclaimer";
        }
        setting.note = CE("a", {
          href: url,
          target: "_blank"
        }, "⚠️ " + note);
      }
    },
    [PrefKey.NATIVE_MKB_DISABLED]: {
      label: t("disable-native-mkb"),
      default: false
    },
    [PrefKey.MKB_DEFAULT_PRESET_ID]: {
      default: 0
    },
    [PrefKey.MKB_ABSOLUTE_MOUSE]: {
      default: false
    },
    [PrefKey.REDUCE_ANIMATIONS]: {
      label: t("reduce-animations"),
      default: false
    },
    [PrefKey.UI_LOADING_SCREEN_GAME_ART]: {
      label: t("show-game-art"),
      default: true
    },
    [PrefKey.UI_LOADING_SCREEN_WAIT_TIME]: {
      label: t("show-wait-time"),
      default: true
    },
    [PrefKey.UI_LOADING_SCREEN_ROCKET]: {
      label: t("rocket-animation"),
      default: "show",
      options: {
        show: t("rocket-always-show"),
        "hide-queue": t("rocket-hide-queue"),
        hide: t("rocket-always-hide")
      }
    },
    [PrefKey.UI_LAYOUT]: {
      label: t("layout"),
      default: "default",
      options: {
        default: t("default"),
        normal: t("normal"),
        tv: t("smart-tv")
      }
    },
    [PrefKey.UI_SCROLLBAR_HIDE]: {
      label: t("hide-scrollbar"),
      default: false
    },
    [PrefKey.UI_HOME_CONTEXT_MENU_DISABLED]: {
      label: t("disable-home-context-menu"),
      default: false
    },
    [PrefKey.BLOCK_SOCIAL_FEATURES]: {
      label: t("disable-social-features"),
      default: false
    },
    [PrefKey.BLOCK_TRACKING]: {
      label: t("disable-xcloud-analytics"),
      default: false
    },
    [PrefKey.USER_AGENT_PROFILE]: {
      label: t("user-agent-profile"),
      note: "⚠️ " + t("unexpected-behavior"),
      default: "default",
      options: {
        [UserAgentProfile.DEFAULT]: t("default"),
        [UserAgentProfile.WINDOWS_EDGE]: "Edge + Windows",
        [UserAgentProfile.MACOS_SAFARI]: "Safari + macOS",
        [UserAgentProfile.SMARTTV_GENERIC]: "Smart TV",
        [UserAgentProfile.SMARTTV_TIZEN]: "Samsung Smart TV",
        [UserAgentProfile.VR_OCULUS]: "Meta Quest VR",
        [UserAgentProfile.ANDROID_KIWI_V123]: "Kiwi Browser v123",
        [UserAgentProfile.CUSTOM]: t("custom")
      }
    },
    [PrefKey.VIDEO_CLARITY]: {
      type: SettingElementType.NUMBER_STEPPER,
      default: 0,
      min: 0,
      max: 5,
      params: {
        hideSlider: true
      }
    },
    [PrefKey.VIDEO_RATIO]: {
      default: "16:9",
      options: {
        "16:9": "16:9",
        "18:9": "18:9",
        "21:9": "21:9",
        "16:10": "16:10",
        "4:3": "4:3",
        fill: t("stretch")
      }
    },
    [PrefKey.VIDEO_SATURATION]: {
      type: SettingElementType.NUMBER_STEPPER,
      default: 100,
      min: 50,
      max: 150,
      params: {
        suffix: "%",
        ticks: 25
      }
    },
    [PrefKey.VIDEO_CONTRAST]: {
      type: SettingElementType.NUMBER_STEPPER,
      default: 100,
      min: 50,
      max: 150,
      params: {
        suffix: "%",
        ticks: 25
      }
    },
    [PrefKey.VIDEO_BRIGHTNESS]: {
      type: SettingElementType.NUMBER_STEPPER,
      default: 100,
      min: 50,
      max: 150,
      params: {
        suffix: "%",
        ticks: 25
      }
    },
    [PrefKey.AUDIO_MIC_ON_PLAYING]: {
      label: t("enable-mic-on-startup"),
      default: false
    },
    [PrefKey.AUDIO_ENABLE_VOLUME_CONTROL]: {
      label: t("enable-volume-control"),
      default: false
    },
    [PrefKey.AUDIO_VOLUME]: {
      type: SettingElementType.NUMBER_STEPPER,
      default: 100,
      min: 0,
      max: 600,
      params: {
        suffix: "%",
        ticks: 100
      }
    },
    [PrefKey.STATS_ITEMS]: {
      default: [StreamStat.PING, StreamStat.FPS, StreamStat.BITRATE, StreamStat.DECODE_TIME, StreamStat.PACKETS_LOST, StreamStat.FRAMES_LOST],
      multipleOptions: {
        [StreamStat.PING]: `${StreamStat.PING.toUpperCase()}: ${t("stat-ping")}`,
        [StreamStat.FPS]: `${StreamStat.FPS.toUpperCase()}: ${t("stat-fps")}`,
        [StreamStat.BITRATE]: `${StreamStat.BITRATE.toUpperCase()}: ${t("stat-bitrate")}`,
        [StreamStat.DECODE_TIME]: `${StreamStat.DECODE_TIME.toUpperCase()}: ${t("stat-decode-time")}`,
        [StreamStat.PACKETS_LOST]: `${StreamStat.PACKETS_LOST.toUpperCase()}: ${t("stat-packets-lost")}`,
        [StreamStat.FRAMES_LOST]: `${StreamStat.FRAMES_LOST.toUpperCase()}: ${t("stat-frames-lost")}`
      },
      params: {
        size: 6
      }
    },
    [PrefKey.STATS_SHOW_WHEN_PLAYING]: {
      default: false
    },
    [PrefKey.STATS_QUICK_GLANCE]: {
      default: true
    },
    [PrefKey.STATS_POSITION]: {
      default: "top-right",
      options: {
        "top-left": t("top-left"),
        "top-center": t("top-center"),
        "top-right": t("top-right")
      }
    },
    [PrefKey.STATS_TEXT_SIZE]: {
      default: "0.9rem",
      options: {
        "0.9rem": t("small"),
        "1.0rem": t("normal"),
        "1.1rem": t("large")
      }
    },
    [PrefKey.STATS_TRANSPARENT]: {
      default: false
    },
    [PrefKey.STATS_OPACITY]: {
      type: SettingElementType.NUMBER_STEPPER,
      default: 80,
      min: 50,
      max: 100,
      params: {
        suffix: "%",
        ticks: 10
      }
    },
    [PrefKey.STATS_CONDITIONAL_FORMATTING]: {
      default: false
    },
    [PrefKey.REMOTE_PLAY_ENABLED]: {
      label: t("enable-remote-play-feature"),
      default: false
    },
    [PrefKey.REMOTE_PLAY_RESOLUTION]: {
      default: "1080p",
      options: {
        "1080p": "1080p",
        "720p": "720p"
      }
    },
    [PrefKey.GAME_FORTNITE_FORCE_CONSOLE]: {
      label: "🎮 " + t("fortnite-force-console-version"),
      default: false,
      note: t("fortnite-allow-stw-mode")
    }
  };
  #storage = localStorage;
  #key = "better_xcloud";
  #prefs = {};
  constructor() {
    let savedPrefsStr = this.#storage.getItem(this.#key);
    if (savedPrefsStr == null) {
      savedPrefsStr = "{}";
    }
    const savedPrefs = JSON.parse(savedPrefsStr);
    for (let settingId in Preferences.SETTINGS) {
      const setting = Preferences.SETTINGS[settingId];
      setting.ready && setting.ready.call(this, setting);
      if (setting.migrate && settingId in savedPrefs) {
        setting.migrate.call(this, savedPrefs, savedPrefs[settingId]);
      }
    }
    for (let settingId in Preferences.SETTINGS) {
      const setting = Preferences.SETTINGS[settingId];
      if (!setting) {
        alert(`Undefined setting key: ${settingId}`);
        console.log("Undefined setting key");
        continue;
      }
      if (setting.migrate) {
        continue;
      }
      if (settingId in savedPrefs) {
        this.#prefs[settingId] = this.#validateValue(settingId, savedPrefs[settingId]);
      } else {
        this.#prefs[settingId] = setting.default;
      }
    }
  }
  #validateValue(key, value) {
    const config = Preferences.SETTINGS[key];
    if (!config) {
      return value;
    }
    if (typeof value === "undefined" || value === null) {
      value = config.default;
    }
    if ("min" in config) {
      value = Math.max(config.min, value);
    }
    if ("max" in config) {
      value = Math.min(config.max, value);
    }
    if ("options" in config && !(value in config.options)) {
      value = config.default;
    } else if ("multipleOptions" in config) {
      if (value.length) {
        const validOptions = Object.keys(config.multipleOptions);
        value.forEach((item2, idx) => {
          validOptions.indexOf(item2) === -1 && value.splice(idx, 1);
        });
      }
      if (!value.length) {
        value = config.default;
      }
    }
    return value;
  }
  get(key) {
    if (typeof key === "undefined") {
      debugger;
      return;
    }
    if (Preferences.SETTINGS[key].unsupported) {
      return Preferences.SETTINGS[key].default;
    }
    if (!(key in this.#prefs)) {
      this.#prefs[key] = this.#validateValue(key, null);
    }
    return this.#prefs[key];
  }
  set(key, value) {
    value = this.#validateValue(key, value);
    this.#prefs[key] = value;
    this.#updateStorage();
    return value;
  }
  #updateStorage() {
    this.#storage.setItem(this.#key, JSON.stringify(this.#prefs));
  }
  toElement(key, onChange, overrideParams = {}) {
    const setting = Preferences.SETTINGS[key];
    let currentValue = this.get(key);
    let type;
    if ("type" in setting) {
      type = setting.type;
    } else if ("options" in setting) {
      type = SettingElementType.OPTIONS;
    } else if ("multipleOptions" in setting) {
      type = SettingElementType.MULTIPLE_OPTIONS;
    } else if (typeof setting.default === "number") {
      type = SettingElementType.NUMBER;
    } else {
      type = SettingElementType.CHECKBOX;
    }
    const params = Object.assign(overrideParams, setting.params || {});
    if (params.disabled) {
      currentValue = Preferences.SETTINGS[key].default;
    }
    const $control = SettingElement.render(type, key, setting, currentValue, (e, value) => {
      this.set(key, value);
      onChange && onChange(e, value);
    }, params);
    return $control;
  }
  toNumberStepper(key, onChange, options = {}) {
    return SettingElement.render(SettingElementType.NUMBER_STEPPER, key, Preferences.SETTINGS[key], this.get(key), (e, value) => {
      this.set(key, value);
      onChange && onChange(e, value);
    }, options);
  }
}
var prefs = new Preferences;
var getPref = prefs.get.bind(prefs);
var setPref = prefs.set.bind(prefs);
var toPrefElement = prefs.toElement.bind(prefs);

// src/utils/toast.ts
class Toast {
  static #$wrapper;
  static #$msg;
  static #$status;
  static #stack = [];
  static #isShowing = false;
  static #timeout;
  static #DURATION = 3000;
  static show(msg, status, options = {}) {
    options = options || {};
    const args = Array.from(arguments);
    if (options.instant) {
      Toast.#stack = [args];
      Toast.#showNext();
    } else {
      Toast.#stack.push(args);
      !Toast.#isShowing && Toast.#showNext();
    }
  }
  static #showNext() {
    if (!Toast.#stack.length) {
      Toast.#isShowing = false;
      return;
    }
    Toast.#isShowing = true;
    Toast.#timeout && clearTimeout(Toast.#timeout);
    Toast.#timeout = window.setTimeout(Toast.#hide, Toast.#DURATION);
    const [msg, status, options] = Toast.#stack.shift();
    if (options && options.html) {
      Toast.#$msg.innerHTML = msg;
    } else {
      Toast.#$msg.textContent = msg;
    }
    if (status) {
      Toast.#$status.classList.remove("bx-gone");
      Toast.#$status.textContent = status;
    } else {
      Toast.#$status.classList.add("bx-gone");
    }
    const classList = Toast.#$wrapper.classList;
    classList.remove("bx-offscreen", "bx-hide");
    classList.add("bx-show");
  }
  static #hide() {
    Toast.#timeout = null;
    const classList = Toast.#$wrapper.classList;
    classList.remove("bx-show");
    classList.add("bx-hide");
  }
  static setup() {
    Toast.#$wrapper = CE("div", { class: "bx-toast bx-offscreen" }, Toast.#$msg = CE("span", { class: "bx-toast-msg" }), Toast.#$status = CE("span", { class: "bx-toast-status" }));
    Toast.#$wrapper.addEventListener("transitionend", (e) => {
      const classList = Toast.#$wrapper.classList;
      if (classList.contains("bx-hide")) {
        classList.remove("bx-offscreen", "bx-hide");
        classList.add("bx-offscreen");
        Toast.#showNext();
      }
    });
    document.documentElement.appendChild(Toast.#$wrapper);
  }
}

// src/utils/local-db.ts
class LocalDb {
  static #instance;
  static get INSTANCE() {
    if (!LocalDb.#instance) {
      LocalDb.#instance = new LocalDb;
    }
    return LocalDb.#instance;
  }
  static DB_NAME = "BetterXcloud";
  static DB_VERSION = 1;
  static TABLE_PRESETS = "mkb_presets";
  #DB;
  #open() {
    return new Promise((resolve, reject) => {
      if (this.#DB) {
        resolve();
        return;
      }
      const request = window.indexedDB.open(LocalDb.DB_NAME, LocalDb.DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        switch (e.oldVersion) {
          case 0: {
            const presets = db.createObjectStore(LocalDb.TABLE_PRESETS, { keyPath: "id", autoIncrement: true });
            presets.createIndex("name_idx", "name");
            break;
          }
        }
      };
      request.onerror = (e) => {
        console.log(e);
        alert(e.target.error.message);
        reject && reject();
      };
      request.onsuccess = (e) => {
        this.#DB = e.target.result;
        resolve();
      };
    });
  }
  #table(name, type) {
    const transaction = this.#DB.transaction(name, type || "readonly");
    const table = transaction.objectStore(name);
    return new Promise((resolve) => resolve(table));
  }
  #call(method) {
    const table = arguments[1];
    return new Promise((resolve) => {
      const request = method.call(table, ...Array.from(arguments).slice(2));
      request.onsuccess = (e) => {
        resolve([table, e.target.result]);
      };
    });
  }
  #count(table) {
    return this.#call(table.count, ...arguments);
  }
  #add(table, data) {
    return this.#call(table.add, ...arguments);
  }
  #put(table, data) {
    return this.#call(table.put, ...arguments);
  }
  #delete(table, data) {
    return this.#call(table.delete, ...arguments);
  }
  #get(table, id2) {
    return this.#call(table.get, ...arguments);
  }
  #getAll(table) {
    return this.#call(table.getAll, ...arguments);
  }
  newPreset(name, data) {
    return this.#open().then(() => this.#table(LocalDb.TABLE_PRESETS, "readwrite")).then((table) => this.#add(table, { name, data })).then(([table, id2]) => new Promise((resolve) => resolve(id2)));
  }
  updatePreset(preset) {
    return this.#open().then(() => this.#table(LocalDb.TABLE_PRESETS, "readwrite")).then((table) => this.#put(table, preset)).then(([table, id2]) => new Promise((resolve) => resolve(id2)));
  }
  deletePreset(id2) {
    return this.#open().then(() => this.#table(LocalDb.TABLE_PRESETS, "readwrite")).then((table) => this.#delete(table, id2)).then(([table, id3]) => new Promise((resolve) => resolve(id3)));
  }
  getPreset(id2) {
    return this.#open().then(() => this.#table(LocalDb.TABLE_PRESETS, "readwrite")).then((table) => this.#get(table, id2)).then(([table, preset]) => new Promise((resolve) => resolve(preset)));
  }
  getPresets() {
    return this.#open().then(() => this.#table(LocalDb.TABLE_PRESETS, "readwrite")).then((table) => this.#count(table)).then(([table, count]) => {
      if (count > 0) {
        return new Promise((resolve) => {
          this.#getAll(table).then(([table2, items]) => {
            const presets = {};
            items.forEach((item2) => presets[item2.id] = item2);
            resolve(presets);
          });
        });
      }
      const preset = {
        name: t("default"),
        data: MkbPreset.DEFAULT_PRESET
      };
      return new Promise((resolve) => {
        this.#add(table, preset).then(([table2, id2]) => {
          preset.id = id2;
          setPref(PrefKey.MKB_DEFAULT_PRESET_ID, id2);
          resolve({ [id2]: preset });
        });
      });
    });
  }
}

// src/modules/mkb/key-helper.ts
class KeyHelper {
  static #NON_PRINTABLE_KEYS = {
    Backquote: "`",
    [MouseButtonCode.LEFT_CLICK]: "Left Click",
    [MouseButtonCode.RIGHT_CLICK]: "Right Click",
    [MouseButtonCode.MIDDLE_CLICK]: "Middle Click",
    [WheelCode.SCROLL_UP]: "Scroll Up",
    [WheelCode.SCROLL_DOWN]: "Scroll Down",
    [WheelCode.SCROLL_LEFT]: "Scroll Left",
    [WheelCode.SCROLL_RIGHT]: "Scroll Right"
  };
  static getKeyFromEvent(e) {
    let code;
    let name;
    if (e instanceof KeyboardEvent) {
      code = e.code;
    } else if (e instanceof WheelEvent) {
      if (e.deltaY < 0) {
        code = WheelCode.SCROLL_UP;
      } else if (e.deltaY > 0) {
        code = WheelCode.SCROLL_DOWN;
      } else if (e.deltaX < 0) {
        code = WheelCode.SCROLL_LEFT;
      } else {
        code = WheelCode.SCROLL_RIGHT;
      }
    } else if (e instanceof MouseEvent) {
      code = "Mouse" + e.button;
    }
    if (code) {
      name = KeyHelper.codeToKeyName(code);
    }
    return code ? { code, name } : null;
  }
  static codeToKeyName(code) {
    return KeyHelper.#NON_PRINTABLE_KEYS[code] || code.startsWith("Key") && code.substring(3) || code.startsWith("Digit") && code.substring(5) || code.startsWith("Numpad") && "Numpad " + code.substring(6) || code.startsWith("Arrow") && "Arrow " + code.substring(5) || code.endsWith("Lock") && code.replace("Lock", " Lock") || code.endsWith("Left") && "Left " + code.replace("Left", "") || code.endsWith("Right") && "Right " + code.replace("Right", "") || code;
  }
}

// src/assets/svg/command.svg
var command_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d=\"M25.425 1.5c2.784 0 5.075 2.291 5.075 5.075s-2.291 5.075-5.075 5.075H20.35V6.575c0-2.784 2.291-5.075 5.075-5.075zM11.65 11.65H6.575C3.791 11.65 1.5 9.359 1.5 6.575S3.791 1.5 6.575 1.5s5.075 2.291 5.075 5.075v5.075zm8.7 8.7h5.075c2.784 0 5.075 2.291 5.075 5.075S28.209 30.5 25.425 30.5s-5.075-2.291-5.075-5.075V20.35zM6.575 30.5c-2.784 0-5.075-2.291-5.075-5.075s2.291-5.075 5.075-5.075h5.075v5.075c0 2.784-2.291 5.075-5.075 5.075z\"/>\n    <path d=\"M11.65 11.65h8.7v8.7h-8.7z\"/>\n</svg>\n";

// src/assets/svg/controller.svg
var controller_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M19.193 12.807h3.193m-13.836 0h4.257'/><path d='M10.678 10.678v4.257'/><path d='M13.061 19.193l-5.602 6.359c-.698.698-1.646 1.09-2.633 1.09-2.044 0-3.725-1.682-3.725-3.725a3.73 3.73 0 0 1 .056-.646l2.177-11.194a6.94 6.94 0 0 1 6.799-5.721h11.722c3.795 0 6.918 3.123 6.918 6.918s-3.123 6.918-6.918 6.918h-8.793z'/><path d='M18.939 19.193l5.602 6.359c.698.698 1.646 1.09 2.633 1.09 2.044 0 3.725-1.682 3.725-3.725a3.73 3.73 0 0 0-.056-.646l-2.177-11.194'/>\n</svg>\n";

// src/assets/svg/copy.svg
var copy_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M1.498 6.772h23.73v23.73H1.498zm5.274-5.274h23.73v23.73'/>\n</svg>\n";

// src/assets/svg/cursor-text.svg
var cursor_text_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M16 7.3a5.83 5.83 0 0 1 5.8-5.8h2.9m0 29h-2.9a5.83 5.83 0 0 1-5.8-5.8'/><path d='M7.3 30.5h2.9a5.83 5.83 0 0 0 5.8-5.8V7.3a5.83 5.83 0 0 0-5.8-5.8H7.3'/><path d='M11.65 16h8.7'/>\n</svg>\n";

// src/assets/svg/display.svg
var display_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M1.238 21.119c0 1.928 1.565 3.493 3.493 3.493H27.27c1.928 0 3.493-1.565 3.493-3.493V5.961c0-1.928-1.565-3.493-3.493-3.493H4.731c-1.928 0-3.493 1.565-3.493 3.493v15.158zm19.683 8.413H11.08'/>\n</svg>\n";

// src/assets/svg/mouse-settings.svg
var mouse_settings_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <g transform='matrix(1.10403 0 0 1.10403 -4.17656 -.560429)' fill='none' stroke='#fff'><g stroke-width='1.755'><path d='M24.49 16.255l.01-8.612A6.15 6.15 0 0 0 18.357 1.5h-5.714A6.15 6.15 0 0 0 6.5 7.643v13.715a6.15 6.15 0 0 0 6.143 6.143h5.714'/><path d='M15.5 12.501v-6'/></g><circle cx='48' cy='48' r='15' stroke-width='7.02' transform='matrix(.142357 0 0 .142357 17.667421 16.541885)'/><path d='M24.61 27.545h-.214l-1.711.955c-.666-.224-1.284-.572-1.821-1.025l-.006-1.922-.107-.182-1.701-.969c-.134-.678-.134-1.375 0-2.053l1.7-.966.107-.182.009-1.922c.537-.454 1.154-.803 1.82-1.029l1.708.955h.214l1.708-.955c.666.224 1.284.572 1.821 1.025l.006 1.922.107.182 1.7.968c.134.678.134 1.375 0 2.053l-1.7.966-.107.182-.009 1.922c-.536.455-1.154.804-1.819 1.029l-1.706-.955z' stroke-width='.999'/></g>\n</svg>\n";

// src/assets/svg/mouse.svg
var mouse_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M26.256 8.185c0-3.863-3.137-7-7-7h-6.512c-3.863 0-7 3.137-7 7v15.629c0 3.863 3.137 7 7 7h6.512c3.863 0 7-3.137 7-7V8.185z'/><path d='M16 13.721V6.883'/>\n</svg>\n";

// src/assets/svg/new.svg
var new_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M26.875 30.5H5.125c-.663 0-1.208-.545-1.208-1.208V2.708c0-.663.545-1.208 1.208-1.208h14.5l8.458 8.458v19.333c0 .663-.545 1.208-1.208 1.208z'/><path d='M19.625 1.5v8.458h8.458m-15.708 9.667h7.25'/><path d='M16 16v7.25'/>\n</svg>\n";

// src/assets/svg/question.svg
var question_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <g transform='matrix(.256867 0 0 .256867 -16.878964 -18.049342)'><circle cx='128' cy='180' r='12' fill='#fff'/><path d='M128 144v-8c17.67 0 32-12.54 32-28s-14.33-28-32-28-32 12.54-32 28v4' fill='none' stroke='#fff' stroke-width='16'/></g>\n</svg>\n";

// src/assets/svg/refresh.svg
var refresh_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d=\"M23.247 12.377h7.247V5.13\"/><path d=\"M23.911 25.663a13.29 13.29 0 0 1-9.119 3.623C7.504 29.286 1.506 23.289 1.506 16S7.504 2.713 14.792 2.713a13.29 13.29 0 0 1 9.395 3.891l6.307 5.772\"/>\n</svg>\n";

// src/assets/svg/remote-play.svg
var remote_play_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <g transform='matrix(.492308 0 0 .581818 -14.7692 -11.6364)'><clipPath id='A'><path d='M30 20h65v55H30z'/></clipPath><g clip-path='url(#A)'><g transform='matrix(.395211 0 0 .334409 11.913 7.01124)'><g transform='matrix(.555556 0 0 .555556 57.8889 -20.2417)' fill='none' stroke='#fff' stroke-width='13.88'><path d='M200 140.564c-42.045-33.285-101.955-33.285-144 0M168 165c-23.783-17.3-56.217-17.3-80 0'/></g><g transform='matrix(-.555556 0 0 -.555556 200.111 262.393)'><g transform='matrix(1 0 0 1 0 11.5642)'><path d='M200 129c-17.342-13.728-37.723-21.795-58.636-24.198C111.574 101.378 80.703 109.444 56 129' fill='none' stroke='#fff' stroke-width='13.88'/></g><path d='M168 165c-23.783-17.3-56.217-17.3-80 0' fill='none' stroke='#fff' stroke-width='13.88'/></g><g transform='matrix(.75 0 0 .75 32 32)'><path d='M24 72h208v93.881H24z' fill='none' stroke='#fff' stroke-linejoin='miter' stroke-width='9.485'/><circle cx='188' cy='128' r='12' stroke-width='10' transform='matrix(.708333 0 0 .708333 71.8333 12.8333)'/><path d='M24.358 103.5h110' fill='none' stroke='#fff' stroke-linecap='butt' stroke-width='10.282'/></g></g></g></g>\n</svg>\n";

// src/assets/svg/stream-settings.svg
var stream_settings_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g transform='matrix(.142357 0 0 .142357 -2.22021 -2.22164)' fill='none' stroke='#fff' stroke-width='16'><circle cx='128' cy='128' r='40'/><path d='M130.05 206.11h-4L94 224c-12.477-4.197-24.049-10.711-34.11-19.2l-.12-36c-.71-1.12-1.38-2.25-2-3.41L25.9 147.24a99.16 99.16 0 0 1 0-38.46l31.84-18.1c.65-1.15 1.32-2.29 2-3.41l.16-36C69.951 42.757 81.521 36.218 94 32l32 17.89h4L162 32c12.477 4.197 24.049 10.711 34.11 19.2l.12 36c.71 1.12 1.38 2.25 2 3.41l31.85 18.14a99.16 99.16 0 0 1 0 38.46l-31.84 18.1c-.65 1.15-1.32 2.29-2 3.41l-.16 36A104.59 104.59 0 0 1 162 224l-31.95-17.89z'/></g>\n</svg>\n";

// src/assets/svg/stream-stats.svg
var stream_stats_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M1.181 24.55v-3.259c0-8.19 6.576-14.952 14.767-14.98H16c8.13 0 14.819 6.69 14.819 14.819v3.42c0 .625-.515 1.14-1.14 1.14H2.321c-.625 0-1.14-.515-1.14-1.14z'/><path d='M16 6.311v4.56M12.58 25.69l9.12-12.54m4.559 5.7h4.386m-29.266 0H5.74'/>\n</svg>\n";

// src/assets/svg/trash.svg
var trash_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M29.5 6.182h-27m9.818 7.363v9.818m7.364-9.818v9.818'/><path d='M27.045 6.182V29.5c0 .673-.554 1.227-1.227 1.227H6.182c-.673 0-1.227-.554-1.227-1.227V6.182m17.181 0V3.727a2.47 2.47 0 0 0-2.455-2.455h-7.364a2.47 2.47 0 0 0-2.455 2.455v2.455'/>\n</svg>\n";

// src/assets/svg/touch-control-enable.svg
var touch_control_enable_default = "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"#fff\" viewBox=\"0 0 32 32\" fill-rule=\"evenodd\" stroke-linejoin=\"round\" stroke-miterlimit=\"2\">\n    <path d=\"M30.021 9.448a.89.89 0 0 0-.889-.889H2.909a.89.89 0 0 0-.889.889v13.146a.89.89 0 0 0 .889.888h26.223a.89.89 0 0 0 .889-.888V9.448z\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.083\"/>\n    <path d=\"M8.147 11.981l-.053-.001-.054.001c-.55.028-.988.483-.988 1.04v6c0 .575.467 1.042 1.042 1.042l.053-.001c.55-.028.988-.484.988-1.04v-6a1.04 1.04 0 0 0-.988-1.04z\"/>\n    <path d=\"M11.147 14.981l-.054-.001h-6a1.04 1.04 0 1 0 0 2.083h6c.575 0 1.042-.467 1.042-1.042a1.04 1.04 0 0 0-.988-1.04z\"/>\n    <circle cx=\"25.345\" cy=\"18.582\" r=\"2.561\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.78\" transform=\"matrix(1.17131 0 0 1.17131 -5.74235 -5.74456)\"/>\n</svg>\n";

// src/assets/svg/touch-control-disable.svg
var touch_control_disable_default = "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"#fff\" viewBox=\"0 0 32 32\" fill-rule=\"evenodd\" stroke-linejoin=\"round\" stroke-miterlimit=\"2\">\n    <g fill=\"none\" stroke=\"#fff\">\n        <path d=\"M6.021 5.021l20 22\" stroke-width=\"2\"/>\n        <path d=\"M8.735 8.559H2.909a.89.89 0 0 0-.889.889v13.146a.89.89 0 0 0 .889.888h19.34m4.289 0h2.594a.89.89 0 0 0 .889-.888V9.448a.89.89 0 0 0-.889-.889H12.971\" stroke-miterlimit=\"1.5\" stroke-width=\"2.083\"/>\n    </g>\n    <path d=\"M8.147 11.981l-.053-.001-.054.001c-.55.028-.988.483-.988 1.04v6c0 .575.467 1.042 1.042 1.042l.053-.001c.55-.028.988-.484.988-1.04v-6a1.04 1.04 0 0 0-.988-1.04z\"/>\n    <path d=\"M11.147 14.981l-.054-.001h-6a1.04 1.04 0 1 0 0 2.083h6c.575 0 1.042-.467 1.042-1.042a1.04 1.04 0 0 0-.988-1.04z\"/>\n    <circle cx=\"25.345\" cy=\"18.582\" r=\"2.561\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.78\" transform=\"matrix(1.17131 0 0 1.17131 -5.74235 -5.74456)\"/>\n</svg>\n";

// src/assets/svg/caret-left.svg
var caret_left_default = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" stroke=\"#fff\" fill=\"#fff\" height=\"100%\" viewBox=\"0 0 32 32\" fill-rule=\"evenodd\" stroke-linejoin=\"round\" stroke-miterlimit=\"2\">\n    <path d=\"M6.755 1.924l-6 13.649c-.119.27-.119.578 0 .849l6 13.649c.234.533.857.775 1.389.541s.775-.857.541-1.389L2.871 15.997 8.685 2.773c.234-.533-.008-1.155-.541-1.389s-1.155.008-1.389.541z\"/>\n</svg>\n";

// src/assets/svg/caret-right.svg
var caret_right_default = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" stroke=\"#fff\" fill=\"#fff\" height=\"100%\" viewBox=\"0 0 32 32\" fill-rule=\"evenodd\" stroke-linejoin=\"round\" stroke-miterlimit=\"2\">\n    <path d=\"M2.685 1.924l6 13.649c.119.27.119.578 0 .849l-6 13.649c-.234.533-.857.775-1.389.541s-.775-.857-.541-1.389l5.813-13.225L.755 2.773c-.234-.533.008-1.155.541-1.389s1.155.008 1.389.541z\"/>\n</svg>\n";

// src/assets/svg/camera.svg
var camera_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g transform=\"matrix(.150985 0 0 .150985 -3.32603 -2.72209)\" fill=\"none\" stroke=\"#fff\" stroke-width=\"16\">\n        <path d=\"M208 208H48c-8.777 0-16-7.223-16-16V80c0-8.777 7.223-16 16-16h32l16-24h64l16 24h32c8.777 0 16 7.223 16 16v112c0 8.777-7.223 16-16 16z\"/>\n        <circle cx=\"128\" cy=\"132\" r=\"36\"/>\n    </g>\n</svg>\n";

// src/assets/svg/microphone.svg
var microphone_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d=\"M21.368 6.875A5.37 5.37 0 0 0 16 1.507a5.37 5.37 0 0 0-5.368 5.368v8.588A5.37 5.37 0 0 0 16 20.831a5.37 5.37 0 0 0 5.368-5.368V6.875zM16 25.125v5.368m9.662-15.03c0 5.3-4.362 9.662-9.662 9.662s-9.662-4.362-9.662-9.662\"/>\n</svg>\n";

// src/assets/svg/microphone-slash.svg
var microphone_slash_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d=\"M16 25.125v5.368M5.265 4.728l21.471 23.618m-4.789-5.267c-1.698 1.326-3.793 2.047-5.947 2.047-5.3 0-9.662-4.362-9.662-9.662\"/>\n    <path d=\"M25.662 15.463a9.62 9.62 0 0 1-.978 4.242m-5.64.187c-.895.616-1.957.943-3.043.939-2.945 0-5.368-2.423-5.368-5.368v-4.831m.442-5.896A5.38 5.38 0 0 1 16 1.507c2.945 0 5.368 2.423 5.368 5.368v8.588c0 .188-.01.375-.03.562\"/>\n</svg>\n";

// src/utils/bx-icon.ts
var BxIcon = {
  STREAM_SETTINGS: stream_settings_default,
  STREAM_STATS: stream_stats_default,
  COMMAND: command_default,
  CONTROLLER: controller_default,
  DISPLAY: display_default,
  MOUSE: mouse_default,
  MOUSE_SETTINGS: mouse_settings_default,
  NEW: new_default,
  COPY: copy_default,
  TRASH: trash_default,
  CURSOR_TEXT: cursor_text_default,
  QUESTION: question_default,
  REFRESH: refresh_default,
  REMOTE_PLAY: remote_play_default,
  CARET_LEFT: caret_left_default,
  CARET_RIGHT: caret_right_default,
  SCREENSHOT: camera_default,
  TOUCH_CONTROL_ENABLE: touch_control_enable_default,
  TOUCH_CONTROL_DISABLE: touch_control_disable_default,
  MICROPHONE: microphone_default,
  MICROPHONE_MUTED: microphone_slash_default
};

// src/modules/stream/stream-ui.ts
var cloneStreamHudButton = function($orgButton, label, svgIcon) {
  const $container = $orgButton.cloneNode(true);
  let timeout;
  const onTransitionStart = (e) => {
    if (e.propertyName !== "opacity") {
      return;
    }
    timeout && clearTimeout(timeout);
    $container.style.pointerEvents = "none";
  };
  const onTransitionEnd = (e) => {
    if (e.propertyName !== "opacity") {
      return;
    }
    const left = document.getElementById("StreamHud")?.style.left;
    if (left === "0px") {
      timeout && clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        $container.style.pointerEvents = "auto";
      }, 100);
    }
  };
  if (STATES.browserHasTouchSupport) {
    $container.addEventListener("transitionstart", onTransitionStart);
    $container.addEventListener("transitionend", onTransitionEnd);
  }
  const $button = $container.querySelector("button");
  $button.setAttribute("title", label);
  const $orgSvg = $button.querySelector("svg");
  const $svg = createSvgIcon(svgIcon);
  $svg.style.fill = "none";
  $svg.setAttribute("class", $orgSvg.getAttribute("class") || "");
  $svg.ariaHidden = "true";
  $orgSvg.replaceWith($svg);
  return $container;
};
function injectStreamMenuButtons() {
  const $screen = document.querySelector("#PageContent section[class*=PureScreens]");
  if (!$screen) {
    return;
  }
  if ($screen.xObserving) {
    return;
  }
  $screen.xObserving = true;
  const $quickBar = document.querySelector(".bx-quick-settings-bar");
  const $parent = $screen.parentElement;
  const hideQuickBarFunc = (e) => {
    if (e) {
      const $target = e.target;
      e.stopPropagation();
      if ($target != $parent && $target.id !== "MultiTouchSurface" && !$target.querySelector("#BabylonCanvasContainer-main")) {
        return;
      }
      if ($target.id === "MultiTouchSurface") {
        $target.removeEventListener("touchstart", hideQuickBarFunc);
      }
    }
    $quickBar.classList.add("bx-gone");
    $parent?.removeEventListener("click", hideQuickBarFunc);
  };
  let $btnStreamSettings;
  let $btnStreamStats;
  const PREF_DISABLE_FEEDBACK_DIALOG = getPref(PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG);
  const observer = new MutationObserver((mutationList) => {
    mutationList.forEach((item2) => {
      if (item2.type !== "childList") {
        return;
      }
      item2.removedNodes.forEach(($node) => {
        if (!$node || $node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        if (!$node.className || !$node.className.startsWith) {
          return;
        }
        if ($node.className.startsWith("StreamMenu")) {
          if (!document.querySelector("div[class^=PureInStreamConfirmationModal]")) {
            BxEvent.dispatch(window, BxEvent.STREAM_MENU_HIDDEN);
          }
        }
      });
      item2.addedNodes.forEach(async ($node) => {
        if (!$node || $node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        let $elm = $node;
        if ($elm instanceof SVGSVGElement) {
          return;
        }
        if ($elm.className?.includes("PureErrorPage")) {
          BxEvent.dispatch(window, BxEvent.STREAM_ERROR_PAGE);
          return;
        }
        if (PREF_DISABLE_FEEDBACK_DIALOG && $elm.className.startsWith("PostStreamFeedbackScreen")) {
          const $btnClose = $elm.querySelector("button");
          $btnClose && $btnClose.click();
          return;
        }
        if ($elm.className?.startsWith("StreamMenu-module__container")) {
          BxEvent.dispatch(window, BxEvent.STREAM_MENU_SHOWN);
          const $btnCloseHud = document.querySelector("button[class*=StreamMenu-module__backButton]");
          if (!$btnCloseHud) {
            return;
          }
          $btnCloseHud && $btnCloseHud.addEventListener("click", (e) => {
            $quickBar.classList.add("bx-gone");
          });
          const $btnRefresh = $btnCloseHud.cloneNode(true);
          const $svgRefresh = createSvgIcon(BxIcon.REFRESH);
          $svgRefresh.setAttribute("class", $btnRefresh.firstElementChild.getAttribute("class") || "");
          $svgRefresh.style.fill = "none";
          $btnRefresh.classList.add("bx-stream-refresh-button");
          $btnRefresh.removeChild($btnRefresh.firstElementChild);
          $btnRefresh.appendChild($svgRefresh);
          $btnRefresh.addEventListener("click", (e) => {
            confirm(t("confirm-reload-stream")) && window.location.reload();
          });
          $btnCloseHud.insertAdjacentElement("afterend", $btnRefresh);
          const $menu = document.querySelector("div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]");
          $menu?.appendChild(await StreamBadges.render());
          hideQuickBarFunc();
          return;
        }
        if ($elm.className?.startsWith("Overlay-module_") || $elm.className?.startsWith("InProgressScreen")) {
          $elm = $elm.querySelector("#StreamHud");
        }
        if (!$elm || ($elm.id || "") !== "StreamHud") {
          return;
        }
        const $gripHandle = $elm.querySelector("button[class^=GripHandle]");
        const hideGripHandle = () => {
          if (!$gripHandle) {
            return;
          }
          $gripHandle.dispatchEvent(new PointerEvent("pointerdown"));
          $gripHandle.click();
          $gripHandle.dispatchEvent(new PointerEvent("pointerdown"));
          $gripHandle.click();
        };
        const $orgButton = $elm.querySelector("div[class^=HUDButton]");
        if (!$orgButton) {
          return;
        }
        if (!$btnStreamSettings) {
          $btnStreamSettings = cloneStreamHudButton($orgButton, t("stream-settings"), BxIcon.STREAM_SETTINGS);
          $btnStreamSettings.addEventListener("click", (e) => {
            hideGripHandle();
            e.preventDefault();
            $quickBar.classList.remove("bx-gone");
            $parent?.addEventListener("click", hideQuickBarFunc);
            const $touchSurface = document.getElementById("MultiTouchSurface");
            $touchSurface && $touchSurface.style.display != "none" && $touchSurface.addEventListener("touchstart", hideQuickBarFunc);
          });
        }
        if (!$btnStreamStats) {
          $btnStreamStats = cloneStreamHudButton($orgButton, t("stream-stats"), BxIcon.STREAM_STATS);
          $btnStreamStats.addEventListener("click", (e) => {
            hideGripHandle();
            e.preventDefault();
            StreamStats.toggle();
            const btnStreamStatsOn2 = !StreamStats.isHidden() && !StreamStats.isGlancing();
            $btnStreamStats.classList.toggle("bx-stream-menu-button-on", btnStreamStatsOn2);
          });
        }
        const btnStreamStatsOn = !StreamStats.isHidden() && !StreamStats.isGlancing();
        $btnStreamStats.classList.toggle("bx-stream-menu-button-on", btnStreamStatsOn);
        if ($orgButton) {
          const $btnParent = $orgButton.parentElement;
          $btnParent.insertBefore($btnStreamStats, $btnParent.lastElementChild);
          $btnParent.insertBefore($btnStreamSettings, $btnStreamStats);
          const $dotsButton = $btnParent.lastElementChild;
          $dotsButton.parentElement.insertBefore($dotsButton, $dotsButton.parentElement.firstElementChild);
        }
      });
    });
  });
  observer.observe($screen, { subtree: true, childList: true });
}
function showStreamSettings(tabId) {
  const $wrapper = document.querySelector(".bx-quick-settings-bar");
  if (!$wrapper) {
    return;
  }
  if (tabId) {
    const $tab = $wrapper.querySelector(`.bx-quick-settings-tabs svg[data-group=${tabId}]`);
    $tab && $tab.dispatchEvent(new Event("click"));
  }
  $wrapper.classList.remove("bx-gone");
  const $screen = document.querySelector("#PageContent section[class*=PureScreens]");
  if ($screen && $screen.parentElement) {
    const $parent = $screen.parentElement;
    if (!$parent || $parent.bxClick) {
      return;
    }
    $parent.bxClick = true;
    const onClick = (e) => {
      $wrapper.classList.add("bx-gone");
      $parent.bxClick = false;
      $parent.removeEventListener("click", onClick);
    };
    $parent.addEventListener("click", onClick);
  }
}

// src/modules/mkb/mkb-handler.ts
var LOG_TAG = "MkbHandler";

class MkbHandler {
  static #instance;
  static get INSTANCE() {
    if (!MkbHandler.#instance) {
      MkbHandler.#instance = new MkbHandler;
    }
    return MkbHandler.#instance;
  }
  #CURRENT_PRESET_DATA = MkbPreset.convert(MkbPreset.DEFAULT_PRESET);
  static DEFAULT_PANNING_SENSITIVITY = 0.001;
  static DEFAULT_STICK_SENSITIVITY = 0.0006;
  static DEFAULT_DEADZONE_COUNTERWEIGHT = 0.01;
  static MAXIMUM_STICK_RANGE = 1.1;
  static VIRTUAL_GAMEPAD_ID = "Xbox 360 Controller";
  #VIRTUAL_GAMEPAD = {
    id: MkbHandler.VIRTUAL_GAMEPAD_ID,
    index: 3,
    connected: false,
    hapticActuators: null,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: new Array(17).fill(null).map(() => ({ pressed: false, value: 0 })),
    timestamp: performance.now(),
    vibrationActuator: null
  };
  #nativeGetGamepads = window.navigator.getGamepads.bind(window.navigator);
  #enabled = false;
  #isPolling = false;
  #prevWheelCode = null;
  #wheelStoppedTimeout;
  #detectMouseStoppedTimeout;
  #allowStickDecaying = false;
  #$message;
  #STICK_MAP;
  #LEFT_STICK_X = [];
  #LEFT_STICK_Y = [];
  #RIGHT_STICK_X = [];
  #RIGHT_STICK_Y = [];
  constructor() {
    this.#STICK_MAP = {
      [GamepadKey.LS_LEFT]: [this.#LEFT_STICK_X, 0, -1],
      [GamepadKey.LS_RIGHT]: [this.#LEFT_STICK_X, 0, 1],
      [GamepadKey.LS_UP]: [this.#LEFT_STICK_Y, 1, -1],
      [GamepadKey.LS_DOWN]: [this.#LEFT_STICK_Y, 1, 1],
      [GamepadKey.RS_LEFT]: [this.#RIGHT_STICK_X, 2, -1],
      [GamepadKey.RS_RIGHT]: [this.#RIGHT_STICK_X, 2, 1],
      [GamepadKey.RS_UP]: [this.#RIGHT_STICK_Y, 3, -1],
      [GamepadKey.RS_DOWN]: [this.#RIGHT_STICK_Y, 3, 1]
    };
  }
  #patchedGetGamepads = () => {
    const gamepads = this.#nativeGetGamepads() || [];
    gamepads[this.#VIRTUAL_GAMEPAD.index] = this.#VIRTUAL_GAMEPAD;
    return gamepads;
  };
  #getVirtualGamepad = () => this.#VIRTUAL_GAMEPAD;
  #updateStick(stick, x, y) {
    const virtualGamepad = this.#getVirtualGamepad();
    virtualGamepad.axes[stick * 2] = x;
    virtualGamepad.axes[stick * 2 + 1] = y;
    virtualGamepad.timestamp = performance.now();
  }
  #getStickAxes(stick) {
    const virtualGamepad = this.#getVirtualGamepad();
    return {
      x: virtualGamepad.axes[stick * 2],
      y: virtualGamepad.axes[stick * 2 + 1]
    };
  }
  #vectorLength = (x, y) => Math.sqrt(x ** 2 + y ** 2);
  #disableContextMenu = (e) => e.preventDefault();
  #resetGamepad = () => {
    const gamepad = this.#getVirtualGamepad();
    gamepad.axes = [0, 0, 0, 0];
    for (const button of gamepad.buttons) {
      button.pressed = false;
      button.value = 0;
    }
    gamepad.timestamp = performance.now();
  };
  #pressButton = (buttonIndex, pressed) => {
    const virtualGamepad = this.#getVirtualGamepad();
    if (buttonIndex >= 100) {
      let [valueArr, axisIndex] = this.#STICK_MAP[buttonIndex];
      valueArr = valueArr;
      axisIndex = axisIndex;
      for (let i = valueArr.length - 1;i >= 0; i--) {
        if (valueArr[i] === buttonIndex) {
          valueArr.splice(i, 1);
        }
      }
      pressed && valueArr.push(buttonIndex);
      let value;
      if (valueArr.length) {
        value = this.#STICK_MAP[valueArr[valueArr.length - 1]][2];
      } else {
        value = 0;
      }
      virtualGamepad.axes[axisIndex] = value;
    } else {
      virtualGamepad.buttons[buttonIndex].pressed = pressed;
      virtualGamepad.buttons[buttonIndex].value = pressed ? 1 : 0;
    }
    virtualGamepad.timestamp = performance.now();
  };
  #onKeyboardEvent = (e) => {
    const isKeyDown = e.type === "keydown";
    if (isKeyDown) {
      if (e.code === "F8") {
        e.preventDefault();
        this.toggle();
        return;
      }
      if (!this.#isPolling) {
        return;
      }
    }
    const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[e.code];
    if (typeof buttonIndex === "undefined") {
      return;
    }
    if (e.repeat) {
      return;
    }
    e.preventDefault();
    this.#pressButton(buttonIndex, isKeyDown);
  };
  #onMouseEvent = (e) => {
    const isMouseDown = e.type === "mousedown";
    const key = KeyHelper.getKeyFromEvent(e);
    if (!key) {
      return;
    }
    const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code];
    if (typeof buttonIndex === "undefined") {
      return;
    }
    e.preventDefault();
    this.#pressButton(buttonIndex, isMouseDown);
  };
  #onWheelEvent = (e) => {
    const key = KeyHelper.getKeyFromEvent(e);
    if (!key) {
      return;
    }
    const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code];
    if (typeof buttonIndex === "undefined") {
      return;
    }
    e.preventDefault();
    if (this.#prevWheelCode === null || this.#prevWheelCode === key.code) {
      this.#wheelStoppedTimeout && clearTimeout(this.#wheelStoppedTimeout);
      this.#pressButton(buttonIndex, true);
    }
    this.#wheelStoppedTimeout = window.setTimeout(() => {
      this.#prevWheelCode = null;
      this.#pressButton(buttonIndex, false);
    }, 20);
  };
  #decayStick = () => {
    if (!this.#allowStickDecaying) {
      return;
    }
    const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_MAP_TO];
    if (mouseMapTo === MouseMapTo.OFF) {
      return;
    }
    const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
    let { x, y } = this.#getStickAxes(analog);
    const length = this.#vectorLength(x, y);
    const clampedLength = Math.min(1, length);
    const decayStrength = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_STICK_DECAY_STRENGTH];
    const decay = 1 - clampedLength * clampedLength * decayStrength;
    const minDecay = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_STICK_DECAY_MIN];
    const clampedDecay = Math.min(1 - minDecay, decay);
    x *= clampedDecay;
    y *= clampedDecay;
    const deadzoneCounterweight = 20 * MkbHandler.DEFAULT_DEADZONE_COUNTERWEIGHT;
    if (Math.abs(x) <= deadzoneCounterweight && Math.abs(y) <= deadzoneCounterweight) {
      x = 0;
      y = 0;
    }
    if (this.#allowStickDecaying) {
      this.#updateStick(analog, x, y);
      (x !== 0 || y !== 0) && requestAnimationFrame(this.#decayStick);
    }
  };
  #onMouseStopped = () => {
    this.#allowStickDecaying = true;
    requestAnimationFrame(this.#decayStick);
  };
  #onMouseMoveEvent = (e) => {
    const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_MAP_TO];
    if (mouseMapTo === MouseMapTo.OFF) {
      return;
    }
    this.#allowStickDecaying = false;
    this.#detectMouseStoppedTimeout && clearTimeout(this.#detectMouseStoppedTimeout);
    this.#detectMouseStoppedTimeout = window.setTimeout(this.#onMouseStopped.bind(this), 10);
    const deltaX = e.movementX;
    const deltaY = e.movementY;
    const deadzoneCounterweight = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT];
    let x = deltaX * this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_SENSITIVITY_X];
    let y = deltaY * this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_SENSITIVITY_Y];
    let length = this.#vectorLength(x, y);
    if (length !== 0 && length < deadzoneCounterweight) {
      x *= deadzoneCounterweight / length;
      y *= deadzoneCounterweight / length;
    } else if (length > MkbHandler.MAXIMUM_STICK_RANGE) {
      x *= MkbHandler.MAXIMUM_STICK_RANGE / length;
      y *= MkbHandler.MAXIMUM_STICK_RANGE / length;
    }
    const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
    this.#updateStick(analog, x, y);
  };
  toggle = () => {
    this.#enabled = !this.#enabled;
    this.#enabled ? document.pointerLockElement && this.start() : this.stop();
    Toast.show(t("mouse-and-keyboard"), t(this.#enabled ? "enabled" : "disabled"), { instant: true });
    if (this.#enabled) {
      !document.pointerLockElement && this.#waitForPointerLock(true);
    } else {
      this.#waitForPointerLock(false);
      document.pointerLockElement && document.exitPointerLock();
    }
  };
  #getCurrentPreset = () => {
    return new Promise((resolve) => {
      const presetId = getPref(PrefKey.MKB_DEFAULT_PRESET_ID);
      LocalDb.INSTANCE.getPreset(presetId).then((preset) => {
        resolve(preset);
      });
    });
  };
  refreshPresetData = () => {
    this.#getCurrentPreset().then((preset) => {
      this.#CURRENT_PRESET_DATA = MkbPreset.convert(preset ? preset.data : MkbPreset.DEFAULT_PRESET);
      this.#resetGamepad();
    });
  };
  #onPointerLockChange = () => {
    if (this.#enabled && !document.pointerLockElement) {
      this.stop();
      this.#waitForPointerLock(true);
    }
  };
  #onPointerLockError = (e) => {
    console.log(e);
    this.stop();
  };
  #onActivatePointerLock = () => {
    if (!document.pointerLockElement) {
      document.body.requestPointerLock();
    }
    this.#waitForPointerLock(false);
    this.start();
  };
  #waitForPointerLock = (wait) => {
    this.#$message && this.#$message.classList.toggle("bx-gone", !wait);
  };
  #onStreamMenuShown = () => {
    this.#enabled && this.#waitForPointerLock(false);
  };
  #onStreamMenuHidden = () => {
    this.#enabled && this.#waitForPointerLock(true);
  };
  init = () => {
    this.refreshPresetData();
    this.#enabled = true;
    window.addEventListener("keydown", this.#onKeyboardEvent);
    document.addEventListener("pointerlockchange", this.#onPointerLockChange);
    document.addEventListener("pointerlockerror", this.#onPointerLockError);
    this.#$message = CE("div", { class: "bx-mkb-pointer-lock-msg bx-gone" }, createButton({
      icon: BxIcon.MOUSE_SETTINGS,
      style: ButtonStyle.PRIMARY,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        showStreamSettings("mkb");
      }
    }), CE("div", {}, CE("p", {}, t("mkb-click-to-activate")), CE("p", {}, t("press-key-to-toggle-mkb", { key: "F8" }))));
    this.#$message.addEventListener("click", this.#onActivatePointerLock);
    document.documentElement.appendChild(this.#$message);
    window.addEventListener(BxEvent.STREAM_MENU_SHOWN, this.#onStreamMenuShown);
    window.addEventListener(BxEvent.STREAM_MENU_HIDDEN, this.#onStreamMenuHidden);
    this.#waitForPointerLock(true);
  };
  destroy = () => {
    this.#isPolling = false;
    this.#enabled = false;
    this.stop();
    this.#waitForPointerLock(false);
    document.pointerLockElement && document.exitPointerLock();
    window.removeEventListener("keydown", this.#onKeyboardEvent);
    document.removeEventListener("pointerlockchange", this.#onPointerLockChange);
    document.removeEventListener("pointerlockerror", this.#onPointerLockError);
    window.removeEventListener(BxEvent.STREAM_MENU_SHOWN, this.#onStreamMenuShown);
    window.removeEventListener(BxEvent.STREAM_MENU_HIDDEN, this.#onStreamMenuHidden);
  };
  start = () => {
    this.#isPolling = true;
    window.navigator.getGamepads = this.#patchedGetGamepads;
    this.#resetGamepad();
    window.addEventListener("keyup", this.#onKeyboardEvent);
    window.addEventListener("mousemove", this.#onMouseMoveEvent);
    window.addEventListener("mousedown", this.#onMouseEvent);
    window.addEventListener("mouseup", this.#onMouseEvent);
    window.addEventListener("wheel", this.#onWheelEvent);
    window.addEventListener("contextmenu", this.#disableContextMenu);
    const virtualGamepad = this.#getVirtualGamepad();
    virtualGamepad.connected = true;
    virtualGamepad.timestamp = performance.now();
    BxEvent.dispatch(window, "gamepadconnected", {
      gamepad: virtualGamepad
    });
  };
  stop = () => {
    this.#isPolling = false;
    const virtualGamepad = this.#getVirtualGamepad();
    virtualGamepad.connected = false;
    virtualGamepad.timestamp = performance.now();
    BxEvent.dispatch(window, "gamepaddisconnected", {
      gamepad: virtualGamepad
    });
    window.navigator.getGamepads = this.#nativeGetGamepads;
    this.#resetGamepad();
    window.removeEventListener("keyup", this.#onKeyboardEvent);
    window.removeEventListener("mousemove", this.#onMouseMoveEvent);
    window.removeEventListener("mousedown", this.#onMouseEvent);
    window.removeEventListener("mouseup", this.#onMouseEvent);
    window.removeEventListener("wheel", this.#onWheelEvent);
    window.removeEventListener("contextmenu", this.#disableContextMenu);
  };
  static setupEvents() {
    getPref(PrefKey.MKB_ENABLED) && !UserAgent.isMobile() && window.addEventListener(BxEvent.STREAM_PLAYING, () => {
      if (!STATES.currentStream.titleInfo?.details.hasMkbSupport) {
        BxLogger.info(LOG_TAG, "Emulate MKB");
        MkbHandler.INSTANCE.init();
      }
    });
  }
}

// src/modules/shortcuts/shortcut-microphone.ts
var MicrophoneState;
(function(MicrophoneState2) {
  MicrophoneState2["REQUESTED"] = "Requested";
  MicrophoneState2["ENABLED"] = "Enabled";
  MicrophoneState2["MUTED"] = "Muted";
  MicrophoneState2["NOT_ALLOWED"] = "NotAllowed";
  MicrophoneState2["NOT_FOUND"] = "NotFound";
})(MicrophoneState || (MicrophoneState = {}));

class MicrophoneShortcut {
  static toggle(showToast = true) {
    if (!window.BX_EXPOSED.streamSession) {
      return false;
    }
    const state = window.BX_EXPOSED.streamSession._microphoneState;
    const enableMic = state === MicrophoneState.ENABLED ? false : true;
    try {
      window.BX_EXPOSED.streamSession.tryEnableChatAsync(enableMic);
      showToast && Toast.show(t("microphone"), t(enableMic ? "unmuted" : "muted"), { instant: true });
      return enableMic;
    } catch (e) {
      console.log(e);
    }
    return false;
  }
}

// src/modules/shortcuts/shortcut-stream-ui.ts
class StreamUiShortcut {
  static showHideStreamMenu() {
    window.BX_EXPOSED.showStreamMenu && window.BX_EXPOSED.showStreamMenu();
  }
}

// src/utils/utils.ts
function checkForUpdate() {
  const CHECK_INTERVAL_SECONDS = 7200;
  const currentVersion = getPref(PrefKey.CURRENT_VERSION);
  const lastCheck = getPref(PrefKey.LAST_UPDATE_CHECK);
  const now = Math.round(+new Date / 1000);
  if (currentVersion === SCRIPT_VERSION && now - lastCheck < CHECK_INTERVAL_SECONDS) {
    return;
  }
  setPref(PrefKey.LAST_UPDATE_CHECK, now);
  fetch("https://api.github.com/repos/redphx/better-xcloud/releases/latest").then((response) => response.json()).then((json) => {
    setPref(PrefKey.LATEST_VERSION, json.tag_name.substring(1));
    setPref(PrefKey.CURRENT_VERSION, SCRIPT_VERSION);
  });
  Translations.updateTranslations(true);
}
function disablePwa() {
  const userAgent2 = (window.navigator.orgUserAgent || window.navigator.userAgent || "").toLowerCase();
  if (!userAgent2) {
    return;
  }
  if (!!AppInterface || UserAgent.isSafari(true)) {
    Object.defineProperty(window.navigator, "standalone", {
      value: true
    });
  }
}
function hashCode(str2) {
  let hash = 0;
  for (let i = 0, len = str2.length;i < len; i++) {
    const chr = str2.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}
function renderString(str2, obj) {
  return str2.replace(/\$\{.+?\}/g, (match) => {
    const key = match.substring(2, match.length - 1);
    if (key in obj) {
      return obj[key];
    }
    return match;
  });
}
function ceilToNearest(value, interval) {
  return Math.ceil(value / interval) * interval;
}
function floorToNearest(value, interval) {
  return Math.floor(value / interval) * interval;
}

// src/modules/shortcuts/shortcut-sound.ts
class SoundShortcut {
  static increaseGainNodeVolume(amount) {
    SoundShortcut.#adjustGainNodeVolume(amount);
  }
  static decreaseGainNodeVolume(amount) {
    SoundShortcut.#adjustGainNodeVolume(-1 * Math.abs(amount));
  }
  static #adjustGainNodeVolume(amount) {
    if (!getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL)) {
      return 0;
    }
    const currentValue = getPref(PrefKey.AUDIO_VOLUME);
    let nearestValue;
    if (amount > 0) {
      nearestValue = ceilToNearest(currentValue, amount);
    } else {
      nearestValue = floorToNearest(currentValue, -1 * amount);
    }
    let newValue;
    if (currentValue !== nearestValue) {
      newValue = nearestValue;
    } else {
      newValue = currentValue + amount;
    }
    newValue = setPref(PrefKey.AUDIO_VOLUME, newValue);
    SoundShortcut.setGainNodeVolume(newValue);
    Toast.show(`${t("stream")} ❯ ${t("volume")}`, newValue + "%", { instant: true });
    BxEvent.dispatch(window, BxEvent.GAINNODE_VOLUME_CHANGED, {
      volume: newValue
    });
    return newValue;
  }
  static setGainNodeVolume(value) {
    STATES.currentStream.audioGainNode && (STATES.currentStream.audioGainNode.gain.value = value / 100);
  }
}

// src/modules/controller-shortcut.ts
var ShortcutAction;
(function(ShortcutAction2) {
  ShortcutAction2["STREAM_SCREENSHOT_CAPTURE"] = "stream-screenshot-capture";
  ShortcutAction2["STREAM_MENU_TOGGLE"] = "stream-menu-toggle";
  ShortcutAction2["STREAM_STATS_TOGGLE"] = "stream-stats-toggle";
  ShortcutAction2["STREAM_SOUND_TOGGLE"] = "stream-sound-toggle";
  ShortcutAction2["STREAM_MICROPHONE_TOGGLE"] = "stream-microphone-toggle";
  ShortcutAction2["STREAM_VOLUME_INC"] = "stream-volume-inc";
  ShortcutAction2["STREAM_VOLUME_DEC"] = "stream-volume-dec";
  ShortcutAction2["DEVICE_VOLUME_INC"] = "device-volume-inc";
  ShortcutAction2["DEVICE_VOLUME_DEC"] = "device-volume-dec";
  ShortcutAction2["SCREEN_BRIGHTNESS_INC"] = "screen-brightness-inc";
  ShortcutAction2["SCREEN_BRIGHTNESS_DEC"] = "screen-brightness-dec";
})(ShortcutAction || (ShortcutAction = {}));

class ControllerShortcut {
  static #STORAGE_KEY = "better_xcloud_controller_shortcuts";
  static #buttonsCache = {};
  static #buttonsStatus = {};
  static #$selectProfile;
  static #$selectActions = {};
  static #$remap;
  static #ACTIONS = {};
  static reset(index) {
    ControllerShortcut.#buttonsCache[index] = [];
    ControllerShortcut.#buttonsStatus[index] = [];
  }
  static handle(gamepad) {
    const gamepadIndex = gamepad.index;
    const actions = ControllerShortcut.#ACTIONS[gamepad.id];
    if (!actions) {
      return false;
    }
    ControllerShortcut.#buttonsCache[gamepadIndex] = ControllerShortcut.#buttonsStatus[gamepadIndex].slice(0);
    ControllerShortcut.#buttonsStatus[gamepadIndex] = [];
    const pressed = [];
    let otherButtonPressed = false;
    gamepad.buttons.forEach((button, index) => {
      if (button.pressed && index !== GamepadKey.HOME) {
        otherButtonPressed = true;
        pressed[index] = true;
        if (actions[index] && !ControllerShortcut.#buttonsCache[gamepadIndex][index]) {
          ControllerShortcut.#runAction(actions[index]);
        }
      }
    });
    ControllerShortcut.#buttonsStatus[gamepadIndex] = pressed;
    return otherButtonPressed;
  }
  static #runAction(action) {
    switch (action) {
      case ShortcutAction.STREAM_SCREENSHOT_CAPTURE:
        Screenshot.takeScreenshot();
        break;
      case ShortcutAction.STREAM_STATS_TOGGLE:
        StreamStats.toggle();
        break;
      case ShortcutAction.STREAM_MICROPHONE_TOGGLE:
        MicrophoneShortcut.toggle();
        break;
      case ShortcutAction.STREAM_MENU_TOGGLE:
        StreamUiShortcut.showHideStreamMenu();
        break;
      case ShortcutAction.STREAM_VOLUME_INC:
        SoundShortcut.increaseGainNodeVolume(10);
        break;
      case ShortcutAction.STREAM_VOLUME_DEC:
        SoundShortcut.decreaseGainNodeVolume(10);
        break;
    }
  }
  static #updateAction(profile, button, action) {
    if (!(profile in ControllerShortcut.#ACTIONS)) {
      ControllerShortcut.#ACTIONS[profile] = [];
    }
    if (!action) {
      action = null;
    }
    ControllerShortcut.#ACTIONS[profile][button] = action;
    for (const key in ControllerShortcut.#ACTIONS) {
      let empty = true;
      for (const value of ControllerShortcut.#ACTIONS[key]) {
        if (!!value) {
          empty = false;
          break;
        }
      }
      if (empty) {
        delete ControllerShortcut.#ACTIONS[key];
      }
    }
    window.localStorage.setItem(ControllerShortcut.#STORAGE_KEY, JSON.stringify(ControllerShortcut.#ACTIONS));
    console.log(ControllerShortcut.#ACTIONS);
  }
  static #updateProfileList(e) {
    const $select = ControllerShortcut.#$selectProfile;
    const $remap = ControllerShortcut.#$remap;
    const $fragment = document.createDocumentFragment();
    while ($select.firstElementChild) {
      $select.firstElementChild.remove();
    }
    const gamepads = navigator.getGamepads();
    let hasGamepad = false;
    for (const gamepad of gamepads) {
      if (!gamepad || !gamepad.connected) {
        continue;
      }
      if (gamepad.id === MkbHandler.VIRTUAL_GAMEPAD_ID) {
        continue;
      }
      hasGamepad = true;
      const $option = CE("option", { value: gamepad.id }, gamepad.id);
      $fragment.appendChild($option);
    }
    if (hasGamepad) {
      $select.appendChild($fragment);
      $remap.classList.remove("bx-gone");
      $select.disabled = false;
      $select.selectedIndex = 0;
      $select.dispatchEvent(new Event("change"));
    } else {
      $remap.classList.add("bx-gone");
      $select.disabled = true;
      const $option = CE("option", {}, "---");
      $fragment.appendChild($option);
      $select.appendChild($fragment);
    }
  }
  static #switchProfile(profile) {
    let actions = ControllerShortcut.#ACTIONS[profile];
    if (!actions) {
      actions = [];
    }
    let button;
    for (button in ControllerShortcut.#$selectActions) {
      const $select = ControllerShortcut.#$selectActions[button];
      $select.value = actions[button] || "";
    }
  }
  static renderSettings() {
    ControllerShortcut.#ACTIONS = JSON.parse(window.localStorage.getItem(ControllerShortcut.#STORAGE_KEY) || "{}");
    const buttons = {
      [GamepadKey.A]: PrompFont.A,
      [GamepadKey.B]: PrompFont.B,
      [GamepadKey.X]: PrompFont.X,
      [GamepadKey.Y]: PrompFont.Y,
      [GamepadKey.LB]: PrompFont.LB,
      [GamepadKey.RB]: PrompFont.RB,
      [GamepadKey.LT]: PrompFont.LT,
      [GamepadKey.RT]: PrompFont.RT,
      [GamepadKey.SELECT]: PrompFont.SELECT,
      [GamepadKey.START]: PrompFont.START,
      [GamepadKey.UP]: PrompFont.UP,
      [GamepadKey.DOWN]: PrompFont.DOWN,
      [GamepadKey.LEFT]: PrompFont.LEFT,
      [GamepadKey.RIGHT]: PrompFont.RIGHT
    };
    const actions = {
      [t("stream")]: {
        [ShortcutAction.STREAM_SCREENSHOT_CAPTURE]: [t("stream"), t("take-screenshot")],
        [ShortcutAction.STREAM_STATS_TOGGLE]: [t("stream"), t("stats"), t("show-hide")],
        [ShortcutAction.STREAM_MICROPHONE_TOGGLE]: [t("stream"), t("microphone"), t("toggle")],
        [ShortcutAction.STREAM_MENU_TOGGLE]: [t("stream"), t("menu"), t("show")],
        [ShortcutAction.STREAM_VOLUME_INC]: getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && [t("stream"), t("volume"), t("increase")],
        [ShortcutAction.STREAM_VOLUME_DEC]: getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && [t("stream"), t("volume"), t("decrease")]
      }
    };
    const $baseSelect = CE("select", { autocomplete: "off" }, CE("option", { value: "" }, "---"));
    for (const groupLabel in actions) {
      const items = actions[groupLabel];
      if (!items) {
        continue;
      }
      const $optGroup = CE("optgroup", { label: groupLabel });
      for (const action in items) {
        let label = items[action];
        if (!label) {
          continue;
        }
        if (Array.isArray(label)) {
          label = label.join(" ❯ ");
        }
        const $option = CE("option", { value: action }, label);
        $optGroup.appendChild($option);
      }
      $baseSelect.appendChild($optGroup);
    }
    const $container = CE("div", {});
    const $profile = CE("select", { class: "bx-shortcut-profile", autocomplete: "off" });
    $profile.addEventListener("change", (e) => {
      ControllerShortcut.#switchProfile($profile.value);
    });
    $container.appendChild($profile);
    const onActionChanged = (e) => {
      const $target = e.target;
      const profile = $profile.value;
      const button2 = $target.dataset.button;
      const action = $target.value;
      ControllerShortcut.#updateAction(profile, button2, action);
    };
    const $remap = CE("div", { class: "bx-gone" });
    let button;
    for (button in buttons) {
      const $row = CE("div", { class: "bx-shortcut-row" });
      const prompt2 = buttons[button];
      const $label = CE("label", { class: "bx-prompt" }, `${PrompFont.HOME} + ${prompt2}`);
      const $select = $baseSelect.cloneNode(true);
      $select.dataset.button = button.toString();
      $select.addEventListener("change", onActionChanged);
      ControllerShortcut.#$selectActions[button] = $select;
      $row.appendChild($label);
      $row.appendChild($select);
      $remap.appendChild($row);
    }
    $container.appendChild($remap);
    ControllerShortcut.#$selectProfile = $profile;
    ControllerShortcut.#$remap = $remap;
    window.addEventListener("gamepadconnected", ControllerShortcut.#updateProfileList);
    window.addEventListener("gamepaddisconnected", ControllerShortcut.#updateProfileList);
    ControllerShortcut.#updateProfileList();
    return $container;
  }
}

// src/modules/game-bar/action-base.ts
class BaseGameBarAction {
  constructor() {
  }
  reset() {
  }
}

// src/modules/game-bar/action-screenshot.ts
class ScreenshotAction extends BaseGameBarAction {
  $content;
  constructor() {
    super();
    const onClick = (e) => {
      BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
      Screenshot.takeScreenshot();
    };
    this.$content = createButton({
      style: ButtonStyle.GHOST,
      icon: BxIcon.SCREENSHOT,
      title: t("take-screenshot"),
      onClick
    });
  }
  render() {
    return this.$content;
  }
}

// src/modules/touch-controller.ts
var LOG_TAG2 = "TouchController";

class TouchController {
  static #EVENT_SHOW_DEFAULT_CONTROLLER = new MessageEvent("message", {
    data: JSON.stringify({
      content: '{"layoutId":""}',
      target: "/streaming/touchcontrols/showlayoutv2",
      type: "Message"
    }),
    origin: "better-xcloud"
  });
  static #$style;
  static #enable = false;
  static #dataChannel;
  static #customLayouts = {};
  static #baseCustomLayouts = {};
  static #currentLayoutId;
  static #customList;
  static enable() {
    TouchController.#enable = true;
  }
  static disable() {
    TouchController.#enable = false;
  }
  static isEnabled() {
    return TouchController.#enable;
  }
  static #showDefault() {
    TouchController.#dispatchMessage(TouchController.#EVENT_SHOW_DEFAULT_CONTROLLER);
  }
  static #show() {
    document.querySelector("#BabylonCanvasContainer-main")?.parentElement?.classList.remove("bx-offscreen");
  }
  static #hide() {
    document.querySelector("#BabylonCanvasContainer-main")?.parentElement?.classList.add("bx-offscreen");
  }
  static toggleVisibility(status) {
    if (!TouchController.#dataChannel) {
      return;
    }
    status ? TouchController.#hide() : TouchController.#show();
  }
  static reset() {
    TouchController.#enable = false;
    TouchController.#dataChannel = null;
    TouchController.#$style && (TouchController.#$style.textContent = "");
  }
  static #dispatchMessage(msg) {
    TouchController.#dataChannel && window.setTimeout(() => {
      TouchController.#dataChannel.dispatchEvent(msg);
    }, 10);
  }
  static #dispatchLayouts(data) {
    BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, {
      data
    });
  }
  static async getCustomLayouts(xboxTitleId, retries = 1) {
    if (xboxTitleId in TouchController.#customLayouts) {
      TouchController.#dispatchLayouts(TouchController.#customLayouts[xboxTitleId]);
      return;
    }
    retries = retries || 1;
    if (retries > 2) {
      TouchController.#customLayouts[xboxTitleId] = null;
      window.setTimeout(() => TouchController.#dispatchLayouts(null), 1000);
      return;
    }
    const baseUrl = `https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/touch-layouts${BX_FLAGS.UseDevTouchLayout ? "/dev" : ""}`;
    const url = `${baseUrl}/${xboxTitleId}.json`;
    try {
      const resp = await NATIVE_FETCH(url);
      const json = await resp.json();
      const layouts = {};
      json.layouts.forEach(async (layoutName) => {
        let baseLayouts = {};
        if (layoutName in TouchController.#baseCustomLayouts) {
          baseLayouts = TouchController.#baseCustomLayouts[layoutName];
        } else {
          try {
            const layoutUrl = `${baseUrl}/layouts/${layoutName}.json`;
            const resp2 = await NATIVE_FETCH(layoutUrl);
            const json2 = await resp2.json();
            baseLayouts = json2.layouts;
            TouchController.#baseCustomLayouts[layoutName] = baseLayouts;
          } catch (e) {
          }
        }
        Object.assign(layouts, baseLayouts);
      });
      json.layouts = layouts;
      TouchController.#customLayouts[xboxTitleId] = json;
      window.setTimeout(() => TouchController.#dispatchLayouts(json), 1000);
    } catch (e) {
      TouchController.getCustomLayouts(xboxTitleId, retries + 1);
    }
  }
  static loadCustomLayout(xboxTitleId, layoutId, delay = 0) {
    if (!window.BX_EXPOSED.touchLayoutManager) {
      const listener = (e) => {
        window.removeEventListener(BxEvent.TOUCH_LAYOUT_MANAGER_READY, listener);
        if (TouchController.#enable) {
          TouchController.loadCustomLayout(xboxTitleId, layoutId, 0);
        }
      };
      window.addEventListener(BxEvent.TOUCH_LAYOUT_MANAGER_READY, listener);
      return;
    }
    const layoutChanged = TouchController.#currentLayoutId !== layoutId;
    TouchController.#currentLayoutId = layoutId;
    const layoutData = TouchController.#customLayouts[xboxTitleId];
    if (!xboxTitleId || !layoutId || !layoutData) {
      TouchController.#enable && TouchController.#showDefault();
      return;
    }
    const layout = layoutData.layouts[layoutId] || layoutData.layouts[layoutData.default_layout];
    if (!layout) {
      return;
    }
    let msg;
    let html12 = false;
    if (layout.author) {
      const author = `<b>${escapeHtml(layout.author)}</b>`;
      msg = t("touch-control-layout-by", { name: author });
      html12 = true;
    } else {
      msg = t("touch-control-layout");
    }
    layoutChanged && Toast.show(msg, layout.name, { html: html12 });
    window.setTimeout(() => {
      window.BX_EXPOSED.shouldShowSensorControls = JSON.stringify(layout).includes("gyroscope");
      window.BX_EXPOSED.touchLayoutManager.changeLayoutForScope({
        type: "showLayout",
        scope: xboxTitleId,
        subscope: "base",
        layout: {
          id: "System.Standard",
          displayName: "System",
          layoutFile: layout
        }
      });
    }, delay);
  }
  static updateCustomList() {
    const key = "better_xcloud_custom_touch_layouts";
    TouchController.#customList = JSON.parse(window.localStorage.getItem(key) || "[]");
    NATIVE_FETCH("https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/touch-layouts/ids.json").then((response) => response.json()).then((json) => {
      TouchController.#customList = json;
      window.localStorage.setItem(key, JSON.stringify(json));
    });
  }
  static getCustomList() {
    return TouchController.#customList;
  }
  static setup() {
    window.testTouchLayout = (layout) => {
      const { touchLayoutManager } = window.BX_EXPOSED;
      touchLayoutManager && touchLayoutManager.changeLayoutForScope({
        type: "showLayout",
        scope: "" + STATES.currentStream?.xboxTitleId,
        subscope: "base",
        layout: {
          id: "System.Standard",
          displayName: "Custom",
          layoutFile: layout
        }
      });
    };
    const $style = document.createElement("style");
    document.documentElement.appendChild($style);
    TouchController.#$style = $style;
    const PREF_STYLE_STANDARD = getPref(PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD);
    const PREF_STYLE_CUSTOM = getPref(PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM);
    window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, (e) => {
      const dataChannel = e.dataChannel;
      if (!dataChannel || dataChannel.label !== "message") {
        return;
      }
      let filter = "";
      if (TouchController.#enable) {
        if (PREF_STYLE_STANDARD === "white") {
          filter = "grayscale(1) brightness(2)";
        } else if (PREF_STYLE_STANDARD === "muted") {
          filter = "sepia(0.5)";
        }
      } else if (PREF_STYLE_CUSTOM === "muted") {
        filter = "sepia(0.5)";
      }
      if (filter) {
        $style.textContent = `#babylon-canvas { filter: ${filter} !important; }`;
      } else {
        $style.textContent = "";
      }
      TouchController.#dataChannel = dataChannel;
      dataChannel.addEventListener("open", () => {
        window.setTimeout(TouchController.#show, 1000);
      });
      let focused = false;
      dataChannel.addEventListener("message", (msg) => {
        if (msg.origin === "better-xcloud" || typeof msg.data !== "string") {
          return;
        }
        if (msg.data.includes("touchcontrols/showtitledefault")) {
          if (TouchController.#enable) {
            if (focused) {
              TouchController.getCustomLayouts(STATES.currentStream?.xboxTitleId);
            } else {
              TouchController.#showDefault();
            }
          }
          return;
        }
        try {
          if (msg.data.includes("/titleinfo")) {
            const json = JSON.parse(JSON.parse(msg.data).content);
            focused = json.focused;
            if (!json.focused) {
              TouchController.#show();
            }
            STATES.currentStream.xboxTitleId = parseInt(json.titleid, 16).toString();
          }
        } catch (e2) {
          BxLogger.error(LOG_TAG2, "Load custom layout", e2);
        }
      });
    });
  }
}

// src/modules/game-bar/action-touch-control.ts
class TouchControlAction extends BaseGameBarAction {
  $content;
  constructor() {
    super();
    const onClick = (e) => {
      BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
      const $parent = e.target.closest("div[data-enabled]");
      let enabled = $parent.getAttribute("data-enabled", "true") === "true";
      $parent.setAttribute("data-enabled", (!enabled).toString());
      TouchController.toggleVisibility(enabled);
    };
    const $btnEnable = createButton({
      style: ButtonStyle.GHOST,
      icon: BxIcon.TOUCH_CONTROL_ENABLE,
      title: t("show-touch-controller"),
      onClick,
      classes: ["bx-activated"]
    });
    const $btnDisable = createButton({
      style: ButtonStyle.GHOST,
      icon: BxIcon.TOUCH_CONTROL_DISABLE,
      title: t("hide-touch-controller"),
      onClick
    });
    this.$content = CE("div", {}, $btnEnable, $btnDisable);
    this.reset();
  }
  render() {
    return this.$content;
  }
  reset() {
    this.$content.setAttribute("data-enabled", "true");
  }
}

// src/modules/game-bar/action-microphone.ts
class MicrophoneAction extends BaseGameBarAction {
  $content;
  visible = false;
  constructor() {
    super();
    const onClick = (e) => {
      BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
      const enabled = MicrophoneShortcut.toggle(false);
      this.$content.setAttribute("data-enabled", enabled.toString());
    };
    const $btnDefault = createButton({
      style: ButtonStyle.GHOST,
      icon: BxIcon.MICROPHONE,
      title: t("show-touch-controller"),
      onClick,
      classes: ["bx-activated"]
    });
    const $btnMuted = createButton({
      style: ButtonStyle.GHOST,
      icon: BxIcon.MICROPHONE_MUTED,
      title: t("hide-touch-controller"),
      onClick
    });
    this.$content = CE("div", {}, $btnDefault, $btnMuted);
    this.reset();
    window.addEventListener(BxEvent.MICROPHONE_STATE_CHANGED, (e) => {
      const microphoneState = e.microphoneState;
      const enabled = microphoneState === MicrophoneState.ENABLED;
      this.$content.setAttribute("data-enabled", enabled.toString());
      this.$content.classList.remove("bx-gone");
    });
  }
  render() {
    return this.$content;
  }
  reset() {
    this.visible = false;
    this.$content.classList.add("bx-gone");
    this.$content.setAttribute("data-enabled", "false");
  }
}

// src/modules/game-bar/game-bar.ts
class GameBar {
  static instance;
  static getInstance() {
    if (!GameBar.instance) {
      GameBar.instance = new GameBar;
    }
    return GameBar.instance;
  }
  static VISIBLE_DURATION = 2000;
  $gameBar;
  $container;
  timeout = null;
  actions = [];
  constructor() {
    let $container;
    const position = getPref(PrefKey.GAME_BAR_POSITION);
    const $gameBar = CE("div", { id: "bx-game-bar", class: "bx-gone", "data-position": position }, $container = CE("div", { class: "bx-game-bar-container bx-offscreen" }), createSvgIcon(position === "bottom-left" ? BxIcon.CARET_RIGHT : BxIcon.CARET_LEFT));
    this.actions = [
      new ScreenshotAction,
      ...STATES.hasTouchSupport && getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== "off" ? [new TouchControlAction] : [],
      new MicrophoneAction
    ];
    if (position === "bottom-right") {
      this.actions.reverse();
    }
    for (const action of this.actions) {
      $container.appendChild(action.render());
    }
    $gameBar.addEventListener("click", (e) => {
      if (e.target !== $gameBar) {
        return;
      }
      $container.classList.contains("bx-show") ? this.hideBar() : this.showBar();
    });
    window.addEventListener(BxEvent.GAME_BAR_ACTION_ACTIVATED, this.hideBar.bind(this));
    $container.addEventListener("pointerover", this.clearHideTimeout.bind(this));
    $container.addEventListener("pointerout", this.beginHideTimeout.bind(this));
    $container.addEventListener("transitionend", (e) => {
      const classList = $container.classList;
      if (classList.contains("bx-hide")) {
        classList.remove("bx-offscreen", "bx-hide");
        classList.add("bx-offscreen");
      }
    });
    document.documentElement.appendChild($gameBar);
    this.$gameBar = $gameBar;
    this.$container = $container;
  }
  beginHideTimeout() {
    this.clearHideTimeout();
    this.timeout = window.setTimeout(() => {
      this.timeout = null;
      this.hideBar();
    }, GameBar.VISIBLE_DURATION);
  }
  clearHideTimeout() {
    this.timeout && clearTimeout(this.timeout);
    this.timeout = null;
  }
  enable() {
    this.$gameBar && this.$gameBar.classList.remove("bx-gone");
  }
  disable() {
    this.hideBar();
    this.$gameBar && this.$gameBar.classList.add("bx-gone");
  }
  showBar() {
    if (!this.$container) {
      return;
    }
    this.$container.classList.remove("bx-offscreen", "bx-hide");
    this.$container.classList.add("bx-show");
    this.beginHideTimeout();
  }
  hideBar() {
    if (!this.$container) {
      return;
    }
    this.$container.classList.remove("bx-show");
    this.$container.classList.add("bx-hide");
  }
  reset() {
    for (const action of this.actions) {
      action.reset();
    }
  }
}

// src/utils/bx-exposed.ts
var InputType;
(function(InputType2) {
  InputType2["CONTROLLER"] = "Controller";
  InputType2["MKB"] = "MKB";
  InputType2["CUSTOM_TOUCH_OVERLAY"] = "CustomTouchOverlay";
  InputType2["GENERIC_TOUCH"] = "GenericTouch";
  InputType2["NATIVE_TOUCH"] = "NativeTouch";
  InputType2["BATIVE_SENSOR"] = "NativeSensor";
})(InputType || (InputType = {}));
var BxExposed = {
  onPollingModeChanged: (mode) => {
    if (getPref(PrefKey.GAME_BAR_POSITION) === "off") {
      return;
    }
    const gameBar = GameBar.getInstance();
    if (!STATES.isPlaying) {
      gameBar.disable();
      return;
    }
    mode !== "None" ? gameBar.disable() : gameBar.enable();
  },
  getTitleInfo: () => STATES.currentStream.titleInfo,
  modifyTitleInfo: (titleInfo) => {
    titleInfo = structuredClone(titleInfo);
    let supportedInputTypes = titleInfo.details.supportedInputTypes;
    if (getPref(PrefKey.NATIVE_MKB_DISABLED) || UserAgent.isMobile()) {
      supportedInputTypes = supportedInputTypes.filter((i) => i !== InputType.MKB);
    }
    titleInfo.details.hasMkbSupport = supportedInputTypes.includes(InputType.MKB);
    if (STATES.hasTouchSupport) {
      let touchControllerAvailability = getPref(PrefKey.STREAM_TOUCH_CONTROLLER);
      if (touchControllerAvailability !== "off" && getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) {
        const gamepads = window.navigator.getGamepads();
        let gamepadFound = false;
        for (let gamepad of gamepads) {
          if (gamepad && gamepad.connected) {
            gamepadFound = true;
            break;
          }
        }
        gamepadFound && (touchControllerAvailability = "off");
      }
      if (touchControllerAvailability === "off") {
        supportedInputTypes = supportedInputTypes.filter((i) => i !== InputType.CUSTOM_TOUCH_OVERLAY && i !== InputType.GENERIC_TOUCH);
      }
      titleInfo.details.hasTouchSupport = supportedInputTypes.includes(InputType.NATIVE_TOUCH) || supportedInputTypes.includes(InputType.CUSTOM_TOUCH_OVERLAY) || supportedInputTypes.includes(InputType.GENERIC_TOUCH);
      if (!titleInfo.details.hasTouchSupport && touchControllerAvailability === "all") {
        titleInfo.details.hasFakeTouchSupport = true;
        supportedInputTypes.push(InputType.GENERIC_TOUCH);
      }
    }
    titleInfo.details.supportedInputTypes = supportedInputTypes;
    STATES.currentStream.titleInfo = titleInfo;
    BxEvent.dispatch(window, BxEvent.TITLE_INFO_READY);
    return titleInfo;
  },
  setupGainNode: ($media, audioStream) => {
    if ($media instanceof HTMLAudioElement) {
      $media.muted = true;
      $media.addEventListener("playing", (e) => {
        $media.muted = true;
        $media.pause();
      });
    } else {
      $media.muted = true;
      $media.addEventListener("playing", (e) => {
        $media.muted = true;
      });
    }
    const audioCtx = STATES.currentStream.audioContext;
    const source = audioCtx.createMediaStreamSource(audioStream);
    const gainNode = audioCtx.createGain();
    source.connect(gainNode).connect(audioCtx.destination);
  },
  handleControllerShortcut: ControllerShortcut.handle,
  resetControllerShortcut: ControllerShortcut.reset
};

// src/utils/region.ts
function getPreferredServerRegion(shortName = false) {
  let preferredRegion = getPref(PrefKey.SERVER_REGION);
  if (preferredRegion in STATES.serverRegions) {
    if (shortName && STATES.serverRegions[preferredRegion].shortName) {
      return STATES.serverRegions[preferredRegion].shortName;
    } else {
      return preferredRegion;
    }
  }
  for (let regionName in STATES.serverRegions) {
    const region = STATES.serverRegions[regionName];
    if (!region.isDefault) {
      continue;
    }
    if (shortName && region.shortName) {
      return region.shortName;
    } else {
      return regionName;
    }
  }
  return "???";
}

// src/modules/loading-screen.ts
class LoadingScreen {
  static #$bgStyle;
  static #$waitTimeBox;
  static #waitTimeInterval = null;
  static #orgWebTitle;
  static #secondsToString(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const mDisplay = m > 0 ? `${m}m` : "";
    const sDisplay = `${s}s`.padStart(s >= 0 ? 3 : 4, "0");
    return mDisplay + sDisplay;
  }
  static setup() {
    const titleInfo = STATES.currentStream.titleInfo;
    if (!titleInfo) {
      return;
    }
    if (!LoadingScreen.#$bgStyle) {
      const $bgStyle = CE("style");
      document.documentElement.appendChild($bgStyle);
      LoadingScreen.#$bgStyle = $bgStyle;
    }
    LoadingScreen.#setBackground(titleInfo.product.heroImageUrl || titleInfo.product.titledHeroImageUrl || titleInfo.product.tileImageUrl);
    if (getPref(PrefKey.UI_LOADING_SCREEN_ROCKET) === "hide") {
      LoadingScreen.#hideRocket();
    }
  }
  static #hideRocket() {
    let $bgStyle = LoadingScreen.#$bgStyle;
    const css = `
#game-stream div[class*=RocketAnimation-module__container] > svg {
    display: none;
}
`;
    $bgStyle.textContent += css;
  }
  static #setBackground(imageUrl) {
    let $bgStyle = LoadingScreen.#$bgStyle;
    imageUrl = imageUrl + "?w=1920";
    const css = `
#game-stream {
    background-image: linear-gradient(#00000033, #000000e6), url(${imageUrl}) !important;
    background-color: transparent !important;
    background-position: center center !important;
    background-repeat: no-repeat !important;
    background-size: cover !important;
}

#game-stream rect[width="800"] {
    transition: opacity 0.3s ease-in-out !important;
}
`;
    $bgStyle.textContent += css;
    const bg = new Image;
    bg.onload = (e) => {
      $bgStyle.textContent += `
#game-stream rect[width="800"] {
    opacity: 0 !important;
}
`;
    };
    bg.src = imageUrl;
  }
  static setupWaitTime(waitTime) {
    if (getPref(PrefKey.UI_LOADING_SCREEN_ROCKET) === "hide-queue") {
      LoadingScreen.#hideRocket();
    }
    let secondsLeft = waitTime;
    let $countDown;
    let $estimated;
    LoadingScreen.#orgWebTitle = document.title;
    const endDate = new Date;
    const timeZoneOffsetSeconds = endDate.getTimezoneOffset() * 60;
    endDate.setSeconds(endDate.getSeconds() + waitTime - timeZoneOffsetSeconds);
    let endDateStr = endDate.toISOString().slice(0, 19);
    endDateStr = endDateStr.substring(0, 10) + " " + endDateStr.substring(11, 19);
    endDateStr += ` (${LoadingScreen.#secondsToString(waitTime)})`;
    let $waitTimeBox = LoadingScreen.#$waitTimeBox;
    if (!$waitTimeBox) {
      $waitTimeBox = CE("div", { class: "bx-wait-time-box" }, CE("label", {}, t("server")), CE("span", {}, getPreferredServerRegion()), CE("label", {}, t("wait-time-estimated")), $estimated = CE("span", {}), CE("label", {}, t("wait-time-countdown")), $countDown = CE("span", {}));
      document.documentElement.appendChild($waitTimeBox);
      LoadingScreen.#$waitTimeBox = $waitTimeBox;
    } else {
      $waitTimeBox.classList.remove("bx-gone");
      $estimated = $waitTimeBox.querySelector(".bx-wait-time-estimated");
      $countDown = $waitTimeBox.querySelector(".bx-wait-time-countdown");
    }
    $estimated.textContent = endDateStr;
    $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft);
    document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`;
    LoadingScreen.#waitTimeInterval = window.setInterval(() => {
      secondsLeft--;
      $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft);
      document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`;
      if (secondsLeft <= 0) {
        LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval);
        LoadingScreen.#waitTimeInterval = null;
      }
    }, 1000);
  }
  static hide() {
    LoadingScreen.#orgWebTitle && (document.title = LoadingScreen.#orgWebTitle);
    LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add("bx-gone");
    if (getPref(PrefKey.UI_LOADING_SCREEN_GAME_ART) && LoadingScreen.#$bgStyle) {
      const $rocketBg = document.querySelector('#game-stream rect[width="800"]');
      $rocketBg && $rocketBg.addEventListener("transitionend", (e) => {
        LoadingScreen.#$bgStyle.textContent += `
#game-stream {
    background: #000 !important;
}
`;
      });
      LoadingScreen.#$bgStyle.textContent += `
#game-stream rect[width="800"] {
    opacity: 1 !important;
}
`;
    }
    LoadingScreen.reset();
  }
  static reset() {
    LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add("bx-gone");
    LoadingScreen.#$bgStyle && (LoadingScreen.#$bgStyle.textContent = "");
    LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval);
    LoadingScreen.#waitTimeInterval = null;
  }
}

// src/modules/dialog.ts
class Dialog {
  $dialog;
  $title;
  $content;
  $overlay;
  onClose;
  constructor(options) {
    const {
      title,
      className,
      content,
      hideCloseButton,
      onClose,
      helpUrl
    } = options;
    const $overlay = document.querySelector(".bx-dialog-overlay");
    if (!$overlay) {
      this.$overlay = CE("div", { class: "bx-dialog-overlay bx-gone" });
      this.$overlay.addEventListener("contextmenu", (e) => e.preventDefault());
      document.documentElement.appendChild(this.$overlay);
    } else {
      this.$overlay = $overlay;
    }
    let $close;
    this.onClose = onClose;
    this.$dialog = CE("div", { class: `bx-dialog ${className || ""} bx-gone` }, this.$title = CE("h2", {}, CE("b", {}, title), helpUrl && createButton({
      icon: BxIcon.QUESTION,
      style: ButtonStyle.GHOST,
      title: t("help"),
      url: helpUrl
    })), this.$content = CE("div", { class: "bx-dialog-content" }, content), !hideCloseButton && ($close = CE("button", { type: "button" }, t("close"))));
    $close && $close.addEventListener("click", (e) => {
      this.hide(e);
    });
    !title && this.$title.classList.add("bx-gone");
    !content && this.$content.classList.add("bx-gone");
    this.$dialog.addEventListener("contextmenu", (e) => e.preventDefault());
    document.documentElement.appendChild(this.$dialog);
  }
  show(newOptions) {
    document.activeElement && document.activeElement.blur();
    if (newOptions && newOptions.title) {
      this.$title.querySelector("b").textContent = newOptions.title;
      this.$title.classList.remove("bx-gone");
    }
    this.$dialog.classList.remove("bx-gone");
    this.$overlay.classList.remove("bx-gone");
    document.body.classList.add("bx-no-scroll");
  }
  hide(e) {
    this.$dialog.classList.add("bx-gone");
    this.$overlay.classList.add("bx-gone");
    document.body.classList.remove("bx-no-scroll");
    this.onClose && this.onClose(e);
  }
  toggle() {
    this.$dialog.classList.toggle("bx-gone");
    this.$overlay.classList.toggle("bx-gone");
  }
}

// src/modules/mkb/mkb-remapper.ts
class MkbRemapper {
  #BUTTON_ORDERS = [
    GamepadKey.UP,
    GamepadKey.DOWN,
    GamepadKey.LEFT,
    GamepadKey.RIGHT,
    GamepadKey.A,
    GamepadKey.B,
    GamepadKey.X,
    GamepadKey.Y,
    GamepadKey.LB,
    GamepadKey.RB,
    GamepadKey.LT,
    GamepadKey.RT,
    GamepadKey.SELECT,
    GamepadKey.START,
    GamepadKey.HOME,
    GamepadKey.L3,
    GamepadKey.LS_UP,
    GamepadKey.LS_DOWN,
    GamepadKey.LS_LEFT,
    GamepadKey.LS_RIGHT,
    GamepadKey.R3,
    GamepadKey.RS_UP,
    GamepadKey.RS_DOWN,
    GamepadKey.RS_LEFT,
    GamepadKey.RS_RIGHT
  ];
  static #instance;
  static get INSTANCE() {
    if (!MkbRemapper.#instance) {
      MkbRemapper.#instance = new MkbRemapper;
    }
    return MkbRemapper.#instance;
  }
  #STATE = {
    currentPresetId: 0,
    presets: {},
    editingPresetData: null,
    isEditing: false
  };
  #$ = {
    wrapper: null,
    presetsSelect: null,
    activateButton: null,
    currentBindingKey: null,
    allKeyElements: [],
    allMouseElements: {}
  };
  bindingDialog;
  constructor() {
    this.#STATE.currentPresetId = getPref(PrefKey.MKB_DEFAULT_PRESET_ID);
    this.bindingDialog = new Dialog({
      className: "bx-binding-dialog",
      content: CE("div", {}, CE("p", {}, t("press-to-bind")), CE("i", {}, t("press-esc-to-cancel"))),
      hideCloseButton: true
    });
  }
  #clearEventListeners = () => {
    window.removeEventListener("keydown", this.#onKeyDown);
    window.removeEventListener("mousedown", this.#onMouseDown);
    window.removeEventListener("wheel", this.#onWheel);
  };
  #bindKey = ($elm, key) => {
    const buttonIndex = parseInt($elm.getAttribute("data-button-index"));
    const keySlot = parseInt($elm.getAttribute("data-key-slot"));
    if ($elm.getAttribute("data-key-code") === key.code) {
      return;
    }
    for (const $otherElm of this.#$.allKeyElements) {
      if ($otherElm.getAttribute("data-key-code") === key.code) {
        this.#unbindKey($otherElm);
      }
    }
    this.#STATE.editingPresetData.mapping[buttonIndex][keySlot] = key.code;
    $elm.textContent = key.name;
    $elm.setAttribute("data-key-code", key.code);
  };
  #unbindKey = ($elm) => {
    const buttonIndex = parseInt($elm.getAttribute("data-button-index"));
    const keySlot = parseInt($elm.getAttribute("data-key-slot"));
    this.#STATE.editingPresetData.mapping[buttonIndex][keySlot] = null;
    $elm.textContent = "";
    $elm.removeAttribute("data-key-code");
  };
  #onWheel = (e) => {
    e.preventDefault();
    this.#clearEventListeners();
    this.#bindKey(this.#$.currentBindingKey, KeyHelper.getKeyFromEvent(e));
    window.setTimeout(() => this.bindingDialog.hide(), 200);
  };
  #onMouseDown = (e) => {
    e.preventDefault();
    this.#clearEventListeners();
    this.#bindKey(this.#$.currentBindingKey, KeyHelper.getKeyFromEvent(e));
    window.setTimeout(() => this.bindingDialog.hide(), 200);
  };
  #onKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.#clearEventListeners();
    if (e.code !== "Escape") {
      this.#bindKey(this.#$.currentBindingKey, KeyHelper.getKeyFromEvent(e));
    }
    window.setTimeout(() => this.bindingDialog.hide(), 200);
  };
  #onBindingKey = (e) => {
    if (!this.#STATE.isEditing || e.button !== 0) {
      return;
    }
    console.log(e);
    this.#$.currentBindingKey = e.target;
    window.addEventListener("keydown", this.#onKeyDown);
    window.addEventListener("mousedown", this.#onMouseDown);
    window.addEventListener("wheel", this.#onWheel);
    this.bindingDialog.show({ title: this.#$.currentBindingKey.getAttribute("data-prompt") });
  };
  #onContextMenu = (e) => {
    e.preventDefault();
    if (!this.#STATE.isEditing) {
      return;
    }
    this.#unbindKey(e.target);
  };
  #getPreset = (presetId) => {
    return this.#STATE.presets[presetId];
  };
  #getCurrentPreset = () => {
    return this.#getPreset(this.#STATE.currentPresetId);
  };
  #switchPreset = (presetId) => {
    this.#STATE.currentPresetId = presetId;
    const presetData = this.#getCurrentPreset().data;
    for (const $elm of this.#$.allKeyElements) {
      const buttonIndex = parseInt($elm.getAttribute("data-button-index"));
      const keySlot = parseInt($elm.getAttribute("data-key-slot"));
      const buttonKeys = presetData.mapping[buttonIndex];
      if (buttonKeys && buttonKeys[keySlot]) {
        $elm.textContent = KeyHelper.codeToKeyName(buttonKeys[keySlot]);
        $elm.setAttribute("data-key-code", buttonKeys[keySlot]);
      } else {
        $elm.textContent = "";
        $elm.removeAttribute("data-key-code");
      }
    }
    let key;
    for (key in this.#$.allMouseElements) {
      const $elm = this.#$.allMouseElements[key];
      let value = presetData.mouse[key];
      if (typeof value === "undefined") {
        value = MkbPreset.MOUSE_SETTINGS[key].default;
      }
      "setValue" in $elm && $elm.setValue(value);
    }
    const activated = getPref(PrefKey.MKB_DEFAULT_PRESET_ID) === this.#STATE.currentPresetId;
    this.#$.activateButton.disabled = activated;
    this.#$.activateButton.querySelector("span").textContent = activated ? t("activated") : t("activate");
  };
  #refresh() {
    while (this.#$.presetsSelect.firstChild) {
      this.#$.presetsSelect.removeChild(this.#$.presetsSelect.firstChild);
    }
    LocalDb.INSTANCE.getPresets().then((presets) => {
      this.#STATE.presets = presets;
      const $fragment = document.createDocumentFragment();
      let defaultPresetId;
      if (this.#STATE.currentPresetId === 0) {
        this.#STATE.currentPresetId = parseInt(Object.keys(presets)[0]);
        defaultPresetId = this.#STATE.currentPresetId;
        setPref(PrefKey.MKB_DEFAULT_PRESET_ID, defaultPresetId);
        MkbHandler.INSTANCE.refreshPresetData();
      } else {
        defaultPresetId = getPref(PrefKey.MKB_DEFAULT_PRESET_ID);
      }
      for (let id2 in presets) {
        const preset = presets[id2];
        let name = preset.name;
        if (id2 === defaultPresetId) {
          name = `🎮 ` + name;
        }
        const $options = CE("option", { value: id2 }, name);
        $options.selected = parseInt(id2) === this.#STATE.currentPresetId;
        $fragment.appendChild($options);
      }
      this.#$.presetsSelect.appendChild($fragment);
      const activated = defaultPresetId === this.#STATE.currentPresetId;
      this.#$.activateButton.disabled = activated;
      this.#$.activateButton.querySelector("span").textContent = activated ? t("activated") : t("activate");
      !this.#STATE.isEditing && this.#switchPreset(this.#STATE.currentPresetId);
    });
  }
  #toggleEditing = (force) => {
    this.#STATE.isEditing = typeof force !== "undefined" ? force : !this.#STATE.isEditing;
    this.#$.wrapper.classList.toggle("bx-editing", this.#STATE.isEditing);
    if (this.#STATE.isEditing) {
      this.#STATE.editingPresetData = structuredClone(this.#getCurrentPreset().data);
    } else {
      this.#STATE.editingPresetData = null;
    }
    const childElements = this.#$.wrapper.querySelectorAll("select, button, input");
    for (const $elm of Array.from(childElements)) {
      if ($elm.parentElement.parentElement.classList.contains("bx-mkb-action-buttons")) {
        continue;
      }
      let disable = !this.#STATE.isEditing;
      if ($elm.parentElement.classList.contains("bx-mkb-preset-tools")) {
        disable = !disable;
      }
      $elm.disabled = disable;
    }
  };
  render() {
    this.#$.wrapper = CE("div", { class: "bx-mkb-settings" });
    this.#$.presetsSelect = CE("select", {});
    this.#$.presetsSelect.addEventListener("change", (e) => {
      this.#switchPreset(parseInt(e.target.value));
    });
    const promptNewName = (value) => {
      let newName = "";
      while (!newName) {
        newName = prompt(t("prompt-preset-name"), value);
        if (newName === null) {
          return false;
        }
        newName = newName.trim();
      }
      return newName ? newName : false;
    };
    const $header = CE("div", { class: "bx-mkb-preset-tools" }, this.#$.presetsSelect, createButton({
      title: t("rename"),
      icon: BxIcon.CURSOR_TEXT,
      onClick: (e) => {
        const preset = this.#getCurrentPreset();
        let newName = promptNewName(preset.name);
        if (!newName || newName === preset.name) {
          return;
        }
        preset.name = newName;
        LocalDb.INSTANCE.updatePreset(preset).then((id2) => this.#refresh());
      }
    }), createButton({
      icon: BxIcon.NEW,
      title: t("new"),
      onClick: (e) => {
        let newName = promptNewName("");
        if (!newName) {
          return;
        }
        LocalDb.INSTANCE.newPreset(newName, MkbPreset.DEFAULT_PRESET).then((id2) => {
          this.#STATE.currentPresetId = id2;
          this.#refresh();
        });
      }
    }), createButton({
      icon: BxIcon.COPY,
      title: t("copy"),
      onClick: (e) => {
        const preset = this.#getCurrentPreset();
        let newName = promptNewName(`${preset.name} (2)`);
        if (!newName) {
          return;
        }
        LocalDb.INSTANCE.newPreset(newName, preset.data).then((id2) => {
          this.#STATE.currentPresetId = id2;
          this.#refresh();
        });
      }
    }), createButton({
      icon: BxIcon.TRASH,
      style: ButtonStyle.DANGER,
      title: t("delete"),
      onClick: (e) => {
        if (!confirm(t("confirm-delete-preset"))) {
          return;
        }
        LocalDb.INSTANCE.deletePreset(this.#STATE.currentPresetId).then((id2) => {
          this.#STATE.currentPresetId = 0;
          this.#refresh();
        });
      }
    }));
    this.#$.wrapper.appendChild($header);
    const $rows = CE("div", { class: "bx-mkb-settings-rows" }, CE("i", { class: "bx-mkb-note" }, t("right-click-to-unbind")));
    const keysPerButton = 2;
    for (const buttonIndex of this.#BUTTON_ORDERS) {
      const [buttonName, buttonPrompt] = GamepadKeyName[buttonIndex];
      let $elm;
      const $fragment = document.createDocumentFragment();
      for (let i = 0;i < keysPerButton; i++) {
        $elm = CE("button", {
          type: "button",
          "data-prompt": buttonPrompt,
          "data-button-index": buttonIndex,
          "data-key-slot": i
        }, " ");
        $elm.addEventListener("mouseup", this.#onBindingKey);
        $elm.addEventListener("contextmenu", this.#onContextMenu);
        $fragment.appendChild($elm);
        this.#$.allKeyElements.push($elm);
      }
      const $keyRow = CE("div", { class: "bx-mkb-key-row" }, CE("label", { title: buttonName }, buttonPrompt), $fragment);
      $rows.appendChild($keyRow);
    }
    $rows.appendChild(CE("i", { class: "bx-mkb-note" }, t("mkb-adjust-ingame-settings")));
    const $mouseSettings = document.createDocumentFragment();
    for (const key in MkbPreset.MOUSE_SETTINGS) {
      const setting = MkbPreset.MOUSE_SETTINGS[key];
      const value = setting.default;
      let $elm;
      const onChange = (e, value2) => {
        this.#STATE.editingPresetData.mouse[key] = value2;
      };
      const $row = CE("div", { class: "bx-quick-settings-row" }, CE("label", { for: `bx_setting_${key}` }, setting.label), $elm = SettingElement.render(setting.type, key, setting, value, onChange, setting.params));
      $mouseSettings.appendChild($row);
      this.#$.allMouseElements[key] = $elm;
    }
    $rows.appendChild($mouseSettings);
    this.#$.wrapper.appendChild($rows);
    const $actionButtons = CE("div", { class: "bx-mkb-action-buttons" }, CE("div", {}, createButton({
      label: t("edit"),
      onClick: (e) => this.#toggleEditing(true)
    }), this.#$.activateButton = createButton({
      label: t("activate"),
      style: ButtonStyle.PRIMARY,
      onClick: (e) => {
        setPref(PrefKey.MKB_DEFAULT_PRESET_ID, this.#STATE.currentPresetId);
        MkbHandler.INSTANCE.refreshPresetData();
        this.#refresh();
      }
    })), CE("div", {}, createButton({
      label: t("cancel"),
      style: ButtonStyle.GHOST,
      onClick: (e) => {
        this.#switchPreset(this.#STATE.currentPresetId);
        this.#toggleEditing(false);
      }
    }), createButton({
      label: t("save"),
      style: ButtonStyle.PRIMARY,
      onClick: (e) => {
        const updatedPreset = structuredClone(this.#getCurrentPreset());
        updatedPreset.data = this.#STATE.editingPresetData;
        LocalDb.INSTANCE.updatePreset(updatedPreset).then((id2) => {
          if (id2 === getPref(PrefKey.MKB_DEFAULT_PRESET_ID)) {
            MkbHandler.INSTANCE.refreshPresetData();
          }
          this.#toggleEditing(false);
          this.#refresh();
        });
      }
    })));
    this.#$.wrapper.appendChild($actionButtons);
    this.#toggleEditing(false);
    this.#refresh();
    return this.#$.wrapper;
  }
}

// src/modules/vibration-manager.ts
var VIBRATION_DATA_MAP = {
  gamepadIndex: 8,
  leftMotorPercent: 8,
  rightMotorPercent: 8,
  leftTriggerMotorPercent: 8,
  rightTriggerMotorPercent: 8,
  durationMs: 16
};

class VibrationManager {
  static #playDeviceVibration(data) {
    if (AppInterface) {
      AppInterface.vibrate(JSON.stringify(data), window.BX_VIBRATION_INTENSITY);
      return;
    }
    const intensity = Math.min(100, data.leftMotorPercent + data.rightMotorPercent / 2) * window.BX_VIBRATION_INTENSITY;
    if (intensity === 0 || intensity === 100) {
      window.navigator.vibrate(intensity ? data.durationMs : 0);
      return;
    }
    const pulseDuration = 200;
    const onDuration = Math.floor(pulseDuration * intensity / 100);
    const offDuration = pulseDuration - onDuration;
    const repeats = Math.ceil(data.durationMs / pulseDuration);
    const pulses = Array(repeats).fill([onDuration, offDuration]).flat();
    window.navigator.vibrate(pulses);
  }
  static supportControllerVibration() {
    return Gamepad.prototype.hasOwnProperty("vibrationActuator");
  }
  static supportDeviceVibration() {
    return !!window.navigator.vibrate;
  }
  static updateGlobalVars() {
    window.BX_ENABLE_CONTROLLER_VIBRATION = VibrationManager.supportControllerVibration() ? getPref(PrefKey.CONTROLLER_ENABLE_VIBRATION) : false;
    window.BX_VIBRATION_INTENSITY = getPref(PrefKey.CONTROLLER_VIBRATION_INTENSITY) / 100;
    if (!VibrationManager.supportDeviceVibration()) {
      window.BX_ENABLE_DEVICE_VIBRATION = false;
      return;
    }
    window.navigator.vibrate(0);
    const value = getPref(PrefKey.CONTROLLER_DEVICE_VIBRATION);
    let enabled;
    if (value === "on") {
      enabled = true;
    } else if (value === "auto") {
      enabled = true;
      const gamepads = window.navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (gamepad) {
          enabled = false;
          break;
        }
      }
    } else {
      enabled = false;
    }
    window.BX_ENABLE_DEVICE_VIBRATION = enabled;
  }
  static #onMessage(e) {
    if (!window.BX_ENABLE_DEVICE_VIBRATION) {
      return;
    }
    if (typeof e !== "object" || !(e.data instanceof ArrayBuffer)) {
      return;
    }
    const dataView = new DataView(e.data);
    let offset = 0;
    let messageType;
    if (dataView.byteLength === 13) {
      messageType = dataView.getUint16(offset, true);
      offset += Uint16Array.BYTES_PER_ELEMENT;
    } else {
      messageType = dataView.getUint8(offset);
      offset += Uint8Array.BYTES_PER_ELEMENT;
    }
    if (!(messageType & 128)) {
      return;
    }
    const vibrationType = dataView.getUint8(offset);
    offset += Uint8Array.BYTES_PER_ELEMENT;
    if (vibrationType !== 0) {
      return;
    }
    const data = {};
    let key;
    for (key in VIBRATION_DATA_MAP) {
      if (VIBRATION_DATA_MAP[key] === 16) {
        data[key] = dataView.getUint16(offset, true);
        offset += Uint16Array.BYTES_PER_ELEMENT;
      } else {
        data[key] = dataView.getUint8(offset);
        offset += Uint8Array.BYTES_PER_ELEMENT;
      }
    }
    VibrationManager.#playDeviceVibration(data);
  }
  static initialSetup() {
    window.addEventListener("gamepadconnected", VibrationManager.updateGlobalVars);
    window.addEventListener("gamepaddisconnected", VibrationManager.updateGlobalVars);
    VibrationManager.updateGlobalVars();
    window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, (e) => {
      const dataChannel = e.dataChannel;
      if (!dataChannel || dataChannel.label !== "input") {
        return;
      }
      dataChannel.addEventListener("message", VibrationManager.#onMessage);
    });
  }
}

// src/modules/ui/ui.ts
function localRedirect(path) {
  const url = window.location.href.substring(0, 31) + path;
  const $pageContent = document.getElementById("PageContent");
  if (!$pageContent) {
    return;
  }
  const $anchor = CE("a", {
    href: url,
    class: "bx-hidden bx-offscreen"
  }, "");
  $anchor.addEventListener("click", (e) => {
    window.setTimeout(() => {
      $pageContent.removeChild($anchor);
    }, 1000);
  });
  $pageContent.appendChild($anchor);
  $anchor.click();
}
var getVideoPlayerFilterStyle = function() {
  const filters = [];
  const clarity = getPref(PrefKey.VIDEO_CLARITY);
  if (clarity != 0) {
    const level = (7 - (clarity - 1) * 0.5).toFixed(1);
    const matrix = `0 -1 0 -1 ${level} -1 0 -1 0`;
    document.getElementById("bx-filter-clarity-matrix").setAttributeNS(null, "kernelMatrix", matrix);
    filters.push(`url(#bx-filter-clarity)`);
  }
  const saturation = getPref(PrefKey.VIDEO_SATURATION);
  if (saturation != 100) {
    filters.push(`saturate(${saturation}%)`);
  }
  const contrast = getPref(PrefKey.VIDEO_CONTRAST);
  if (contrast != 100) {
    filters.push(`contrast(${contrast}%)`);
  }
  const brightness = getPref(PrefKey.VIDEO_BRIGHTNESS);
  if (brightness != 100) {
    filters.push(`brightness(${brightness}%)`);
  }
  return filters.join(" ");
};
var setupQuickSettingsBar = function() {
  const isSafari = UserAgent.isSafari();
  const SETTINGS_UI = [
    getPref(PrefKey.MKB_ENABLED) && {
      icon: BxIcon.MOUSE,
      group: "mkb",
      items: [
        {
          group: "mkb",
          label: t("mouse-and-keyboard"),
          help_url: "https://better-xcloud.github.io/mouse-and-keyboard/",
          content: MkbRemapper.INSTANCE.render()
        }
      ]
    },
    {
      icon: BxIcon.DISPLAY,
      group: "stream",
      items: [
        {
          group: "audio",
          label: t("audio"),
          help_url: "https://better-xcloud.github.io/ingame-features/#audio",
          items: [
            {
              pref: PrefKey.AUDIO_VOLUME,
              label: t("volume"),
              onChange: (e, value) => {
                SoundShortcut.setGainNodeVolume(value);
              },
              params: {
                disabled: !getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL)
              },
              onMounted: ($elm) => {
                const $range = $elm.querySelector("input[type=range");
                window.addEventListener(BxEvent.GAINNODE_VOLUME_CHANGED, (e) => {
                  $range.value = e.volume;
                  BxEvent.dispatch($range, "input", {
                    ignoreOnChange: true
                  });
                });
              }
            }
          ]
        },
        {
          group: "video",
          label: t("video"),
          help_url: "https://better-xcloud.github.io/ingame-features/#video",
          items: [
            {
              pref: PrefKey.VIDEO_RATIO,
              label: t("ratio"),
              onChange: updateVideoPlayerCss
            },
            {
              pref: PrefKey.VIDEO_CLARITY,
              label: t("clarity"),
              onChange: updateVideoPlayerCss,
              unsupported: isSafari
            },
            {
              pref: PrefKey.VIDEO_SATURATION,
              label: t("saturation"),
              onChange: updateVideoPlayerCss
            },
            {
              pref: PrefKey.VIDEO_CONTRAST,
              label: t("contrast"),
              onChange: updateVideoPlayerCss
            },
            {
              pref: PrefKey.VIDEO_BRIGHTNESS,
              label: t("brightness"),
              onChange: updateVideoPlayerCss
            }
          ]
        }
      ]
    },
    {
      icon: BxIcon.CONTROLLER,
      group: "controller",
      items: [
        {
          group: "controller",
          label: t("controller"),
          help_url: "https://better-xcloud.github.io/ingame-features/#controller",
          items: [
            {
              pref: PrefKey.CONTROLLER_ENABLE_VIBRATION,
              label: t("controller-vibration"),
              unsupported: !VibrationManager.supportControllerVibration(),
              onChange: VibrationManager.updateGlobalVars
            },
            {
              pref: PrefKey.CONTROLLER_DEVICE_VIBRATION,
              label: t("device-vibration"),
              unsupported: !VibrationManager.supportDeviceVibration(),
              onChange: VibrationManager.updateGlobalVars
            },
            (VibrationManager.supportControllerVibration() || VibrationManager.supportDeviceVibration()) && {
              pref: PrefKey.CONTROLLER_VIBRATION_INTENSITY,
              label: t("vibration-intensity"),
              unsupported: !VibrationManager.supportDeviceVibration(),
              onChange: VibrationManager.updateGlobalVars
            }
          ]
        },
        STATES.hasTouchSupport && {
          group: "touch-controller",
          label: t("touch-controller"),
          items: [
            {
              label: t("layout"),
              content: CE("select", { disabled: true }, CE("option", {}, t("default"))),
              onMounted: ($elm) => {
                $elm.addEventListener("change", (e) => {
                  TouchController.loadCustomLayout(STATES.currentStream?.xboxTitleId, $elm.value, 1000);
                });
                window.addEventListener(BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, (e) => {
                  const data = e.data;
                  if (STATES.currentStream?.xboxTitleId && $elm.xboxTitleId === STATES.currentStream?.xboxTitleId) {
                    $elm.dispatchEvent(new Event("change"));
                    return;
                  }
                  $elm.xboxTitleId = STATES.currentStream?.xboxTitleId;
                  while ($elm.firstChild) {
                    $elm.removeChild($elm.firstChild);
                  }
                  $elm.disabled = !data;
                  if (!data) {
                    $elm.appendChild(CE("option", { value: "" }, t("default")));
                    $elm.value = "";
                    $elm.dispatchEvent(new Event("change"));
                    return;
                  }
                  const $fragment = document.createDocumentFragment();
                  for (const key in data.layouts) {
                    const layout = data.layouts[key];
                    let name;
                    if (layout.author) {
                      name = `${layout.name} (${layout.author})`;
                    } else {
                      name = layout.name;
                    }
                    const $option = CE("option", { value: key }, name);
                    $fragment.appendChild($option);
                  }
                  $elm.appendChild($fragment);
                  $elm.value = data.default_layout;
                  $elm.dispatchEvent(new Event("change"));
                });
              }
            }
          ]
        }
      ]
    },
    {
      icon: BxIcon.COMMAND,
      group: "shortcuts",
      items: [
        {
          group: "shortcuts_controller",
          label: t("controller-shortcuts"),
          content: ControllerShortcut.renderSettings()
        }
      ]
    },
    {
      icon: BxIcon.STREAM_STATS,
      group: "stats",
      items: [
        {
          group: "stats",
          label: t("stream-stats"),
          help_url: "https://better-xcloud.github.io/stream-stats/",
          items: [
            {
              pref: PrefKey.STATS_SHOW_WHEN_PLAYING,
              label: t("show-stats-on-startup")
            },
            {
              pref: PrefKey.STATS_QUICK_GLANCE,
              label: "👀 " + t("enable-quick-glance-mode"),
              onChange: (e) => {
                e.target.checked ? StreamStats.quickGlanceSetup() : StreamStats.quickGlanceStop();
              }
            },
            {
              pref: PrefKey.STATS_ITEMS,
              label: t("stats"),
              onChange: StreamStats.refreshStyles
            },
            {
              pref: PrefKey.STATS_POSITION,
              label: t("position"),
              onChange: StreamStats.refreshStyles
            },
            {
              pref: PrefKey.STATS_TEXT_SIZE,
              label: t("text-size"),
              onChange: StreamStats.refreshStyles
            },
            {
              pref: PrefKey.STATS_OPACITY,
              label: t("opacity"),
              onChange: StreamStats.refreshStyles
            },
            {
              pref: PrefKey.STATS_TRANSPARENT,
              label: t("transparent-background"),
              onChange: StreamStats.refreshStyles
            },
            {
              pref: PrefKey.STATS_CONDITIONAL_FORMATTING,
              label: t("conditional-formatting"),
              onChange: StreamStats.refreshStyles
            }
          ]
        }
      ]
    }
  ];
  let $tabs;
  let $settings;
  const $wrapper = CE("div", { class: "bx-quick-settings-bar bx-gone" }, $tabs = CE("div", { class: "bx-quick-settings-tabs" }), $settings = CE("div", { class: "bx-quick-settings-tab-contents" }));
  for (const settingTab of SETTINGS_UI) {
    if (!settingTab) {
      continue;
    }
    const $svg = createSvgIcon(settingTab.icon);
    $svg.addEventListener("click", (e) => {
      for (const $child of Array.from($settings.children)) {
        if ($child.getAttribute("data-group") === settingTab.group) {
          $child.classList.remove("bx-gone");
        } else {
          $child.classList.add("bx-gone");
        }
      }
      for (const $child of Array.from($tabs.children)) {
        $child.classList.remove("bx-active");
      }
      $svg.classList.add("bx-active");
    });
    $tabs.appendChild($svg);
    const $group = CE("div", { "data-group": settingTab.group, class: "bx-gone" });
    for (const settingGroup of settingTab.items) {
      if (!settingGroup) {
        continue;
      }
      $group.appendChild(CE("h2", {}, CE("span", {}, settingGroup.label), settingGroup.help_url && createButton({
        icon: BxIcon.QUESTION,
        style: ButtonStyle.GHOST,
        url: settingGroup.help_url,
        title: t("help")
      })));
      if (settingGroup.note) {
        if (typeof settingGroup.note === "string") {
          settingGroup.note = document.createTextNode(settingGroup.note);
        }
        $group.appendChild(settingGroup.note);
      }
      if (settingGroup.content) {
        $group.appendChild(settingGroup.content);
        continue;
      }
      if (!settingGroup.items) {
        settingGroup.items = [];
      }
      for (const setting of settingGroup.items) {
        if (!setting) {
          continue;
        }
        const pref = setting.pref;
        let $control;
        if (setting.content) {
          $control = setting.content;
        } else if (!setting.unsupported) {
          $control = toPrefElement(pref, setting.onChange, setting.params);
        }
        const $content = CE("div", { class: "bx-quick-settings-row", "data-type": settingGroup.group }, CE("label", { for: `bx_setting_${pref}` }, setting.label, setting.unsupported && CE("div", { class: "bx-quick-settings-bar-note" }, t("browser-unsupported-feature"))), !setting.unsupported && $control);
        $group.appendChild($content);
        setting.onMounted && setting.onMounted($control);
      }
    }
    $settings.appendChild($group);
  }
  $tabs.firstElementChild.dispatchEvent(new Event("click"));
  document.documentElement.appendChild($wrapper);
};
function updateVideoPlayerCss() {
  let $elm = document.getElementById("bx-video-css");
  if (!$elm) {
    const $fragment = document.createDocumentFragment();
    $elm = CE("style", { id: "bx-video-css" });
    $fragment.appendChild($elm);
    const $svg = CE("svg", {
      id: "bx-video-filters",
      xmlns: "http://www.w3.org/2000/svg",
      class: "bx-gone"
    }, CE("defs", { xmlns: "http://www.w3.org/2000/svg" }, CE("filter", { id: "bx-filter-clarity", xmlns: "http://www.w3.org/2000/svg" }, CE("feConvolveMatrix", { id: "bx-filter-clarity-matrix", order: "3", xmlns: "http://www.w3.org/2000/svg" }))));
    $fragment.appendChild($svg);
    document.documentElement.appendChild($fragment);
  }
  let filters = getVideoPlayerFilterStyle();
  let videoCss = "";
  if (filters) {
    videoCss += `filter: ${filters} !important;`;
  }
  if (getPref(PrefKey.SCREENSHOT_APPLY_FILTERS)) {
    Screenshot.updateCanvasFilters(filters);
  }
  let css = "";
  if (videoCss) {
    css = `
#game-stream video {
    ${videoCss}
}
`;
  }
  $elm.textContent = css;
  resizeVideoPlayer();
}
var resizeVideoPlayer = function() {
  const $video = STATES.currentStream.$video;
  if (!$video || !$video.parentElement) {
    return;
  }
  const PREF_RATIO = getPref(PrefKey.VIDEO_RATIO);
  if (PREF_RATIO.includes(":")) {
    const tmp = PREF_RATIO.split(":");
    const videoRatio = parseFloat(tmp[0]) / parseFloat(tmp[1]);
    let width = 0;
    let height = 0;
    const parentRect = $video.parentElement.getBoundingClientRect();
    const parentRatio = parentRect.width / parentRect.height;
    if (parentRatio > videoRatio) {
      height = parentRect.height;
      width = height * videoRatio;
    } else {
      width = parentRect.width;
      height = width / videoRatio;
    }
    width = Math.floor(width);
    height = Math.floor(height);
    $video.style.width = `${width}px`;
    $video.style.height = `${height}px`;
    $video.style.objectFit = "fill";
  } else {
    $video.style.width = "100%";
    $video.style.height = "100%";
    $video.style.objectFit = PREF_RATIO;
  }
};
var preloadFonts = function() {
  const $link = CE("link", {
    rel: "preload",
    href: "https://redphx.github.io/better-xcloud/fonts/promptfont.otf",
    as: "font",
    type: "font/otf",
    crossorigin: ""
  });
  document.querySelector("head")?.appendChild($link);
};
function setupStreamUi() {
  if (!document.querySelector(".bx-quick-settings-bar")) {
    preloadFonts();
    window.addEventListener("resize", updateVideoPlayerCss);
    setupQuickSettingsBar();
    StreamStats.render();
    Screenshot.setup();
  }
  updateVideoPlayerCss();
}

// src/modules/remote-play.ts
var LOG_TAG3 = "RemotePlay";
var RemotePlayConsoleState;
(function(RemotePlayConsoleState2) {
  RemotePlayConsoleState2["ON"] = "On";
  RemotePlayConsoleState2["OFF"] = "Off";
  RemotePlayConsoleState2["STANDBY"] = "ConnectedStandby";
  RemotePlayConsoleState2["UNKNOWN"] = "Unknown";
})(RemotePlayConsoleState || (RemotePlayConsoleState = {}));

class RemotePlay {
  static XCLOUD_TOKEN;
  static XHOME_TOKEN;
  static #CONSOLES;
  static #REGIONS;
  static #STATE_LABELS = {
    [RemotePlayConsoleState.ON]: t("powered-on"),
    [RemotePlayConsoleState.OFF]: t("powered-off"),
    [RemotePlayConsoleState.STANDBY]: t("standby"),
    [RemotePlayConsoleState.UNKNOWN]: t("unknown")
  };
  static BASE_DEVICE_INFO = {
    appInfo: {
      env: {
        clientAppId: window.location.host,
        clientAppType: "browser",
        clientAppVersion: "21.1.98",
        clientSdkVersion: "8.5.3",
        httpEnvironment: "prod",
        sdkInstallId: ""
      }
    },
    dev: {
      displayInfo: {
        dimensions: {
          widthInPixels: 1920,
          heightInPixels: 1080
        },
        pixelDensity: {
          dpiX: 1,
          dpiY: 1
        }
      },
      hw: {
        make: "Microsoft",
        model: "unknown",
        sdktype: "web"
      },
      os: {
        name: "windows",
        ver: "22631.2715",
        platform: "desktop"
      },
      browser: {
        browserName: "chrome",
        browserVersion: "119.0"
      }
    }
  };
  static #$content;
  static #initialize() {
    if (RemotePlay.#$content) {
      return;
    }
    RemotePlay.#$content = CE("div", {}, t("getting-consoles-list"));
    RemotePlay.#getXhomeToken(() => {
      RemotePlay.#getConsolesList(() => {
        BxLogger.info(LOG_TAG3, "Consoles", RemotePlay.#CONSOLES);
        RemotePlay.#renderConsoles();
        BxEvent.dispatch(window, BxEvent.REMOTE_PLAY_READY);
      });
    });
  }
  static #renderConsoles() {
    const $fragment = CE("div", { class: "bx-remote-play-container" });
    if (!RemotePlay.#CONSOLES || RemotePlay.#CONSOLES.length === 0) {
      $fragment.appendChild(CE("span", {}, t("no-consoles-found")));
      RemotePlay.#$content = CE("div", {}, $fragment);
      return;
    }
    const $settingNote = CE("p", {});
    const resolutions = [1080, 720];
    const currentResolution = getPref(PrefKey.REMOTE_PLAY_RESOLUTION);
    const $resolutionGroup = CE("div", {});
    for (const resolution of resolutions) {
      const value = `${resolution}p`;
      const id2 = `bx_radio_xhome_resolution_${resolution}`;
      const $radio = CE("input", {
        type: "radio",
        value,
        id: id2,
        name: "bx_radio_xhome_resolution"
      }, value);
      $radio.addEventListener("change", (e) => {
        const value2 = e.target.value;
        $settingNote.textContent = value2 === "1080p" ? "✅ " + t("can-stream-xbox-360-games") : "❌ " + t("cant-stream-xbox-360-games");
        setPref(PrefKey.REMOTE_PLAY_RESOLUTION, value2);
      });
      const $label = CE("label", {
        for: id2,
        class: "bx-remote-play-resolution"
      }, $radio, `${resolution}p`);
      $resolutionGroup.appendChild($label);
      if (currentResolution === value) {
        $radio.checked = true;
        $radio.dispatchEvent(new Event("change"));
      }
    }
    const $qualitySettings = CE("div", { class: "bx-remote-play-settings" }, CE("div", {}, CE("label", {}, t("target-resolution"), $settingNote), $resolutionGroup));
    $fragment.appendChild($qualitySettings);
    for (let con of RemotePlay.#CONSOLES) {
      const $child = CE("div", { class: "bx-remote-play-device-wrapper" }, CE("div", { class: "bx-remote-play-device-info" }, CE("div", {}, CE("span", { class: "bx-remote-play-device-name" }, con.deviceName), CE("span", { class: "bx-remote-play-console-type" }, con.consoleType.replace("Xbox", ""))), CE("div", { class: "bx-remote-play-power-state" }, RemotePlay.#STATE_LABELS[con.powerState])), createButton({
        classes: ["bx-remote-play-connect-button"],
        label: t("console-connect"),
        style: ButtonStyle.PRIMARY | ButtonStyle.FOCUSABLE,
        onClick: (e) => {
          RemotePlay.play(con.serverId);
        }
      }));
      $fragment.appendChild($child);
    }
    $fragment.appendChild(createButton({
      icon: BxIcon.QUESTION,
      style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
      url: "https://better-xcloud.github.io/remote-play",
      label: t("help")
    }));
    RemotePlay.#$content = CE("div", {}, $fragment);
  }
  static #getXhomeToken(callback) {
    if (RemotePlay.XHOME_TOKEN) {
      callback();
      return;
    }
    let GSSV_TOKEN;
    try {
      GSSV_TOKEN = JSON.parse(localStorage.getItem("xboxcom_xbl_user_info")).tokens["http://gssv.xboxlive.com/"].token;
    } catch (e) {
      for (let i = 0;i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith("Auth.User.")) {
          continue;
        }
        const json = JSON.parse(localStorage.getItem(key));
        for (const token of json.tokens) {
          if (!token.relyingParty.includes("gssv.xboxlive.com")) {
            continue;
          }
          GSSV_TOKEN = token.tokenData.token;
          break;
        }
        break;
      }
    }
    const request = new Request("https://xhome.gssv-play-prod.xboxlive.com/v2/login/user", {
      method: "POST",
      body: JSON.stringify({
        offeringId: "xhome",
        token: GSSV_TOKEN
      }),
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    });
    fetch(request).then((resp) => resp.json()).then((json) => {
      RemotePlay.#REGIONS = json.offeringSettings.regions;
      RemotePlay.XHOME_TOKEN = json.gsToken;
      callback();
    });
  }
  static async#getConsolesList(callback) {
    if (RemotePlay.#CONSOLES) {
      callback();
      return;
    }
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${RemotePlay.XHOME_TOKEN}`
      }
    };
    for (const region2 of RemotePlay.#REGIONS) {
      try {
        const request = new Request(`${region2.baseUri}/v6/servers/home?mr=50`, options);
        const resp = await fetch(request);
        const json = await resp.json();
        RemotePlay.#CONSOLES = json.results;
        STATES.remotePlay.server = region2.baseUri;
        callback();
      } catch (e) {
      }
      if (RemotePlay.#CONSOLES) {
        break;
      }
    }
    if (!STATES.remotePlay.server) {
      RemotePlay.#CONSOLES = [];
    }
  }
  static play(serverId, resolution) {
    if (resolution) {
      setPref(PrefKey.REMOTE_PLAY_RESOLUTION, resolution);
    }
    STATES.remotePlay.config = {
      serverId
    };
    window.BX_REMOTE_PLAY_CONFIG = STATES.remotePlay.config;
    localRedirect("/launch/fortnite/BT5P2X999VH2#remote-play");
    RemotePlay.detachPopup();
  }
  static preload() {
    RemotePlay.#initialize();
  }
  static detachPopup() {
    const $popup = document.querySelector(".bx-remote-play-popup");
    $popup && $popup.remove();
  }
  static togglePopup(force = null) {
    if (!getPref(PrefKey.REMOTE_PLAY_ENABLED) || !RemotePlay.isReady()) {
      Toast.show(t("getting-consoles-list"));
      return;
    }
    RemotePlay.#initialize();
    if (AppInterface && AppInterface.showRemotePlayDialog) {
      AppInterface.showRemotePlayDialog(JSON.stringify(RemotePlay.#CONSOLES));
      document.activeElement.blur();
      return;
    }
    if (document.querySelector(".bx-remote-play-popup")) {
      if (force === false) {
        RemotePlay.#$content.classList.add("bx-gone");
      } else {
        RemotePlay.#$content.classList.toggle("bx-gone");
      }
      return;
    }
    const $header = document.querySelector("#gamepass-root header");
    const group = $header.firstElementChild.getAttribute("data-group");
    RemotePlay.#$content.setAttribute("data-group", group);
    RemotePlay.#$content.classList.add("bx-remote-play-popup");
    RemotePlay.#$content.classList.remove("bx-gone");
    $header.insertAdjacentElement("afterend", RemotePlay.#$content);
  }
  static detect() {
    if (!getPref(PrefKey.REMOTE_PLAY_ENABLED)) {
      return;
    }
    STATES.remotePlay.isPlaying = window.location.pathname.includes("/launch/") && window.location.hash.startsWith("#remote-play");
    if (STATES.remotePlay?.isPlaying) {
      window.BX_REMOTE_PLAY_CONFIG = STATES.remotePlay.config;
      window.history.replaceState({ origin: "better-xcloud" }, "", "https://www.xbox.com/" + location.pathname.substring(1, 6) + "/play");
    } else {
      window.BX_REMOTE_PLAY_CONFIG = null;
    }
  }
  static isReady() {
    return RemotePlay.#CONSOLES !== null && RemotePlay.#CONSOLES.length > 0;
  }
}

// src/utils/gamepass-gallery.ts
var GamePassCloudGallery;
(function(GamePassCloudGallery2) {
  GamePassCloudGallery2["TOUCH"] = "9c86f07a-f3e8-45ad-82a0-a1f759597059";
  GamePassCloudGallery2["ALL"] = "29a81209-df6f-41fd-a528-2ae6b91f719c";
})(GamePassCloudGallery || (GamePassCloudGallery = {}));

// src/utils/network.ts
var clearApplicationInsightsBuffers = function() {
  window.sessionStorage.removeItem("AI_buffer");
  window.sessionStorage.removeItem("AI_sentBuffer");
};
var clearDbLogs = function(dbName, table) {
  const request = window.indexedDB.open(dbName);
  request.onsuccess = (e) => {
    const db = e.target.result;
    try {
      const objectStore = db.transaction(table, "readwrite").objectStore(table);
      const objectStoreRequest = objectStore.clear();
      objectStoreRequest.onsuccess = function() {
        console.log(`[Better xCloud] Cleared ${dbName}.${table}`);
      };
    } catch (ex) {
    }
  };
};
var clearAllLogs = function() {
  clearApplicationInsightsBuffers();
  clearDbLogs("StreamClientLogHandler", "logs");
  clearDbLogs("XCloudAppLogs", "logs");
};
var updateIceCandidates = function(candidates, options) {
  const pattern = new RegExp(/a=candidate:(?<foundation>\d+) (?<component>\d+) UDP (?<priority>\d+) (?<ip>[^\s]+) (?<port>\d+) (?<the_rest>.*)/);
  const lst = [];
  for (let item2 of candidates) {
    if (item2.candidate == "a=end-of-candidates") {
      continue;
    }
    const groups = pattern.exec(item2.candidate).groups;
    lst.push(groups);
  }
  if (options.preferIpv6Server) {
    lst.sort((a, b) => {
      const firstIp = a.ip;
      const secondIp = b.ip;
      return !firstIp.includes(":") && secondIp.includes(":") ? 1 : -1;
    });
  }
  const newCandidates = [];
  let foundation = 1;
  const newCandidate = (candidate) => {
    return {
      candidate,
      messageType: "iceCandidate",
      sdpMLineIndex: "0",
      sdpMid: "0"
    };
  };
  lst.forEach((item2) => {
    item2.foundation = foundation;
    item2.priority = foundation == 1 ? 2130706431 : 1;
    newCandidates.push(newCandidate(`a=candidate:${item2.foundation} 1 UDP ${item2.priority} ${item2.ip} ${item2.port} ${item2.the_rest}`));
    ++foundation;
  });
  if (options.consoleAddrs) {
    for (const ip in options.consoleAddrs) {
      const port = options.consoleAddrs[ip];
      newCandidates.push(newCandidate(`a=candidate:${newCandidates.length + 1} 1 UDP 1 ${ip} ${port} typ host`));
    }
  }
  newCandidates.push(newCandidate("a=end-of-candidates"));
  console.log(newCandidates);
  return newCandidates;
};
async function patchIceCandidates(request, consoleAddrs) {
  const response = await NATIVE_FETCH(request);
  const text = await response.clone().text();
  if (!text.length) {
    return response;
  }
  const options = {
    preferIpv6Server: getPref(PrefKey.PREFER_IPV6_SERVER),
    consoleAddrs
  };
  const obj = JSON.parse(text);
  let exchangeResponse = JSON.parse(obj.exchangeResponse);
  exchangeResponse = updateIceCandidates(exchangeResponse, options);
  obj.exchangeResponse = JSON.stringify(exchangeResponse);
  response.json = () => Promise.resolve(obj);
  response.text = () => Promise.resolve(JSON.stringify(obj));
  return response;
}
function interceptHttpRequests() {
  let BLOCKED_URLS = [];
  if (getPref(PrefKey.BLOCK_TRACKING)) {
    clearAllLogs();
    BLOCKED_URLS = BLOCKED_URLS.concat([
      "https://arc.msn.com",
      "https://browser.events.data.microsoft.com",
      "https://dc.services.visualstudio.com",
      "https://2c06dea3f26c40c69b8456d319791fd0@o427368.ingest.sentry.io"
    ]);
  }
  if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES)) {
    BLOCKED_URLS = BLOCKED_URLS.concat([
      "https://peoplehub.xboxlive.com/users/me/people/social",
      "https://peoplehub.xboxlive.com/users/me/people/recommendations",
      "https://xblmessaging.xboxlive.com/network/xbox/users/me/inbox"
    ]);
  }
  const xhrPrototype = XMLHttpRequest.prototype;
  const nativeXhrOpen = xhrPrototype.open;
  const nativeXhrSend = xhrPrototype.send;
  xhrPrototype.open = function(method, url) {
    this._url = url;
    return nativeXhrOpen.apply(this, arguments);
  };
  xhrPrototype.send = function(...arg) {
    for (const blocked of BLOCKED_URLS) {
      if (this._url.startsWith(blocked)) {
        if (blocked === "https://dc.services.visualstudio.com") {
          window.setTimeout(clearAllLogs, 1000);
        }
        return false;
      }
    }
    return nativeXhrSend.apply(this, arguments);
  };
  let gamepassAllGames = [];
  window.BX_FETCH = window.fetch = async (request, init) => {
    let url = typeof request === "string" ? request : request.url;
    for (let blocked of BLOCKED_URLS) {
      if (!url.startsWith(blocked)) {
        continue;
      }
      return new Response('{"acc":1,"webResult":{}}', {
        status: 200,
        statusText: "200 OK"
      });
    }
    if (url.endsWith("/play")) {
      BxEvent.dispatch(window, BxEvent.STREAM_LOADING);
    }
    if (url.endsWith("/configuration")) {
      BxEvent.dispatch(window, BxEvent.STREAM_STARTING);
    }
    if (url.startsWith("https://emerald.xboxservices.com/xboxcomfd/experimentation")) {
      try {
        const response = await NATIVE_FETCH(request, init);
        const json = await response.json();
        const overrideTreatments = {};
        if (getPref(PrefKey.UI_HOME_CONTEXT_MENU_DISABLED)) {
          overrideTreatments["EnableHomeContextMenu"] = false;
        }
        for (const key in overrideTreatments) {
          json.exp.treatments[key] = overrideTreatments[key];
        }
        response.json = () => Promise.resolve(json);
        return response;
      } catch (e) {
        console.log(e);
      }
    }
    if (STATES.hasTouchSupport && url.includes("catalog.gamepass.com/sigls/")) {
      const response = await NATIVE_FETCH(request, init);
      const obj = await response.clone().json();
      if (url.includes(GamePassCloudGallery.ALL)) {
        for (let i = 1;i < obj.length; i++) {
          gamepassAllGames.push(obj[i].id);
        }
      } else if (url.includes(GamePassCloudGallery.TOUCH)) {
        try {
          let customList = TouchController.getCustomList();
          customList = customList.filter((id2) => gamepassAllGames.includes(id2));
          const newCustomList = customList.map((item2) => ({ id: item2 }));
          obj.push(...newCustomList);
        } catch (e) {
          console.log(e);
        }
      }
      response.json = () => Promise.resolve(obj);
      return response;
    }
    let requestType;
    if (url.includes("/sessions/home") || url.includes("xhome.") || STATES.remotePlay.isPlaying && url.endsWith("/inputconfigs")) {
      requestType = RequestType.XHOME;
    } else {
      requestType = RequestType.XCLOUD;
    }
    if (requestType === RequestType.XHOME) {
      return XhomeInterceptor.handle(request);
    }
    return XcloudInterceptor.handle(request, init);
  };
}
var RequestType;
(function(RequestType2) {
  RequestType2["XCLOUD"] = "xcloud";
  RequestType2["XHOME"] = "xhome";
})(RequestType || (RequestType = {}));

class XhomeInterceptor {
  static #consoleAddrs = {};
  static async#handleLogin(request) {
    try {
      const clone = request.clone();
      const obj = await clone.json();
      obj.offeringId = "xhome";
      request = new Request("https://xhome.gssv-play-prod.xboxlive.com/v2/login/user", {
        method: "POST",
        body: JSON.stringify(obj),
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (e) {
      alert(e);
      console.log(e);
    }
    return NATIVE_FETCH(request);
  }
  static async#handleConfiguration(request) {
    const response = await NATIVE_FETCH(request);
    const obj = await response.clone().json();
    console.log(obj);
    const serverDetails = obj.serverDetails;
    if (serverDetails.ipV4Address) {
      XhomeInterceptor.#consoleAddrs[serverDetails.ipV4Address] = serverDetails.ipV4Port;
    }
    if (serverDetails.ipV6Address) {
      XhomeInterceptor.#consoleAddrs[serverDetails.ipV6Address] = serverDetails.ipV6Port;
    }
    response.json = () => Promise.resolve(obj);
    response.text = () => Promise.resolve(JSON.stringify(obj));
    return response;
  }
  static async#handleInputConfigs(request, opts) {
    const response = await NATIVE_FETCH(request);
    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== "all") {
      return response;
    }
    const obj = await response.clone().json();
    const xboxTitleId = JSON.parse(opts.body).titleIds[0];
    STATES.currentStream.xboxTitleId = xboxTitleId;
    const inputConfigs = obj[0];
    let hasTouchSupport2 = inputConfigs.supportedTabs.length > 0;
    if (!hasTouchSupport2) {
      const supportedInputTypes = inputConfigs.supportedInputTypes;
      hasTouchSupport2 = supportedInputTypes.includes(InputType.NATIVE_TOUCH) || supportedInputTypes.includes(InputType.CUSTOM_TOUCH_OVERLAY);
    }
    if (hasTouchSupport2) {
      TouchController.disable();
      BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, {
        data: null
      });
    } else {
      TouchController.enable();
      TouchController.getCustomLayouts(xboxTitleId);
    }
    response.json = () => Promise.resolve(obj);
    response.text = () => Promise.resolve(JSON.stringify(obj));
    return response;
  }
  static async#handleTitles(request) {
    const clone = request.clone();
    const headers = {};
    for (const pair of clone.headers.entries()) {
      headers[pair[0]] = pair[1];
    }
    headers.authorization = `Bearer ${RemotePlay.XCLOUD_TOKEN}`;
    const index = request.url.indexOf(".xboxlive.com");
    request = new Request("https://wus.core.gssv-play-prod" + request.url.substring(index), {
      method: clone.method,
      body: await clone.text(),
      headers
    });
    return NATIVE_FETCH(request);
  }
  static async#handlePlay(request) {
    const clone = request.clone();
    const body = await clone.json();
    const newRequest = new Request(request, {
      body: JSON.stringify(body)
    });
    return NATIVE_FETCH(newRequest);
  }
  static async handle(request) {
    TouchController.disable();
    const clone = request.clone();
    const headers = {};
    for (const pair of clone.headers.entries()) {
      headers[pair[0]] = pair[1];
    }
    headers.authorization = `Bearer ${RemotePlay.XHOME_TOKEN}`;
    const deviceInfo = RemotePlay.BASE_DEVICE_INFO;
    if (getPref(PrefKey.REMOTE_PLAY_RESOLUTION) === "720p") {
      deviceInfo.dev.os.name = "android";
    }
    headers["x-ms-device-info"] = JSON.stringify(deviceInfo);
    const opts = {
      method: clone.method,
      headers
    };
    if (clone.method === "POST") {
      opts.body = await clone.text();
    }
    let newUrl = request.url;
    if (!newUrl.includes("/servers/home")) {
      const index = request.url.indexOf(".xboxlive.com");
      newUrl = STATES.remotePlay.server + request.url.substring(index + 13);
    }
    request = new Request(newUrl, opts);
    let url = typeof request === "string" ? request : request.url;
    if (url.includes("/configuration")) {
      return XhomeInterceptor.#handleConfiguration(request);
    } else if (url.endsWith("/sessions/home/play")) {
      return XhomeInterceptor.#handlePlay(request);
    } else if (url.includes("inputconfigs")) {
      return XhomeInterceptor.#handleInputConfigs(request, opts);
    } else if (url.includes("/login/user")) {
      return XhomeInterceptor.#handleLogin(request);
    } else if (url.endsWith("/titles")) {
      return XhomeInterceptor.#handleTitles(request);
    } else if (url && url.endsWith("/ice") && url.includes("/sessions/") && request.method === "GET") {
      return patchIceCandidates(request, XhomeInterceptor.#consoleAddrs);
    }
    return await NATIVE_FETCH(request);
  }
}

class XcloudInterceptor {
  static async#handleLogin(request, init) {
    const response = await NATIVE_FETCH(request, init);
    const obj = await response.clone().json();
    getPref(PrefKey.REMOTE_PLAY_ENABLED) && BX_FLAGS.PreloadRemotePlay && RemotePlay.preload();
    RemotePlay.XCLOUD_TOKEN = obj.gsToken;
    const serverEmojis = {
      AustraliaEast: "🇦🇺",
      AustraliaSouthEast: "🇦🇺",
      BrazilSouth: "🇧🇷",
      EastUS: "🇺🇸",
      EastUS2: "🇺🇸",
      JapanEast: "🇯🇵",
      KoreaCentral: "🇰🇷",
      MexicoCentral: "🇲🇽",
      NorthCentralUs: "🇺🇸",
      SouthCentralUS: "🇺🇸",
      UKSouth: "🇬🇧",
      WestEurope: "🇪🇺",
      WestUS: "🇺🇸",
      WestUS2: "🇺🇸"
    };
    const serverRegex = /\/\/(\w+)\./;
    for (let region3 of obj.offeringSettings.regions) {
      const regionName = region3.name;
      let shortName = region3.name;
      let match = serverRegex.exec(region3.baseUri);
      if (match) {
        shortName = match[1];
        if (serverEmojis[regionName]) {
          shortName = serverEmojis[regionName] + " " + shortName;
        }
      }
      region3.shortName = shortName.toUpperCase();
      STATES.serverRegions[region3.name] = Object.assign({}, region3);
    }
    BxEvent.dispatch(window, BxEvent.XCLOUD_SERVERS_READY);
    const preferredRegion = getPreferredServerRegion();
    if (preferredRegion in STATES.serverRegions) {
      const tmp = Object.assign({}, STATES.serverRegions[preferredRegion]);
      tmp.isDefault = true;
      obj.offeringSettings.regions = [tmp];
    }
    response.json = () => Promise.resolve(obj);
    return response;
  }
  static async#handlePlay(request, init) {
    const PREF_STREAM_TARGET_RESOLUTION = getPref(PrefKey.STREAM_TARGET_RESOLUTION);
    const PREF_STREAM_PREFERRED_LOCALE = getPref(PrefKey.STREAM_PREFERRED_LOCALE);
    const url = typeof request === "string" ? request : request.url;
    const parsedUrl = new URL(url);
    StreamBadges.region = parsedUrl.host.split(".", 1)[0];
    for (let regionName in STATES.serverRegions) {
      const region3 = STATES.serverRegions[regionName];
      if (parsedUrl.origin == region3.baseUri) {
        StreamBadges.region = regionName;
        break;
      }
    }
    const clone = request.clone();
    const body = await clone.json();
    if (PREF_STREAM_TARGET_RESOLUTION !== "auto") {
      const osName = PREF_STREAM_TARGET_RESOLUTION === "720p" ? "android" : "windows";
      body.settings.osName = osName;
    }
    if (PREF_STREAM_PREFERRED_LOCALE !== "default") {
      body.settings.locale = PREF_STREAM_PREFERRED_LOCALE;
    }
    const newRequest = new Request(request, {
      body: JSON.stringify(body)
    });
    return NATIVE_FETCH(newRequest);
  }
  static async#handleWaitTime(request, init) {
    const response = await NATIVE_FETCH(request, init);
    if (getPref(PrefKey.UI_LOADING_SCREEN_WAIT_TIME)) {
      const json = await response.clone().json();
      if (json.estimatedAllocationTimeInSeconds > 0) {
        LoadingScreen.setupWaitTime(json.estimatedTotalWaitTimeInSeconds);
      }
    }
    return response;
  }
  static async#handleConfiguration(request, init) {
    if (request.method !== "GET") {
      return NATIVE_FETCH(request, init);
    }
    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "all") {
      const titleInfo = STATES.currentStream.titleInfo;
      if (titleInfo?.details.hasTouchSupport) {
        TouchController.disable();
      } else {
        TouchController.enable();
      }
    }
    const response = await NATIVE_FETCH(request, init);
    const text = await response.clone().text();
    if (!text.length) {
      return response;
    }
    const obj = JSON.parse(text);
    let overrides = JSON.parse(obj.clientStreamingConfigOverrides || "{}") || {};
    overrides.inputConfiguration = overrides.inputConfiguration || {};
    overrides.inputConfiguration.enableVibration = true;
    if (getPref(PrefKey.NATIVE_MKB_DISABLED) || UserAgent.isMobile()) {
      overrides.inputConfiguration = Object.assign(overrides.inputConfiguration, {
        enableMouseInput: false,
        enableAbsoluteMouse: false,
        enableKeyboardInput: false
      });
    }
    overrides.videoConfiguration = overrides.videoConfiguration || {};
    overrides.videoConfiguration.setCodecPreferences = true;
    if (TouchController.isEnabled()) {
      overrides.inputConfiguration.enableTouchInput = true;
      overrides.inputConfiguration.maxTouchPoints = 10;
    }
    if (getPref(PrefKey.AUDIO_MIC_ON_PLAYING)) {
      overrides.audioConfiguration = overrides.audioConfiguration || {};
      overrides.audioConfiguration.enableMicrophone = true;
    }
    obj.clientStreamingConfigOverrides = JSON.stringify(overrides);
    response.json = () => Promise.resolve(obj);
    response.text = () => Promise.resolve(JSON.stringify(obj));
    return response;
  }
  static async handle(request, init) {
    let url = typeof request === "string" ? request : request.url;
    if (url.endsWith("/v2/login/user")) {
      return XcloudInterceptor.#handleLogin(request, init);
    } else if (url.endsWith("/sessions/cloud/play")) {
      return XcloudInterceptor.#handlePlay(request, init);
    } else if (url.includes("xboxlive.com") && url.includes("/waittime/")) {
      return XcloudInterceptor.#handleWaitTime(request, init);
    } else if (url.endsWith("/configuration")) {
      return XcloudInterceptor.#handleConfiguration(request, init);
    } else if (url && url.endsWith("/ice") && url.includes("/sessions/") && request.method === "GET") {
      return patchIceCandidates(request);
    }
    return NATIVE_FETCH(request, init);
  }
}

// src/utils/gamepad.ts
function showGamepadToast(gamepad) {
  if (gamepad.id === MkbHandler.VIRTUAL_GAMEPAD_ID) {
    return;
  }
  BxLogger.info("Gamepad", gamepad);
  let text = "🎮";
  if (getPref(PrefKey.LOCAL_CO_OP_ENABLED)) {
    text += ` #${gamepad.index + 1}`;
  }
  const gamepadId = gamepad.id.replace(/ \(.*?Vendor: \w+ Product: \w+\)$/, "");
  text += ` - ${gamepadId}`;
  let status;
  if (gamepad.connected) {
    const supportVibration = !!gamepad.vibrationActuator;
    status = (supportVibration ? "✅" : "❌") + " " + t("vibration-status");
  } else {
    status = t("disconnected");
  }
  Toast.show(text, status, { instant: false });
}

// src/utils/css.ts
function addCss() {
  let css = `:root {
  --bx-title-font: Bahnschrift, Arial, Helvetica, sans-serif;
  --bx-title-font-semibold: Bahnschrift Semibold, Arial, Helvetica, sans-serif;
  --bx-normal-font: "Segoe UI", Arial, Helvetica, sans-serif;
  --bx-monospaced-font: Consolas, "Courier New", Courier, monospace;
  --bx-promptfont-font: promptfont;
  --bx-button-height: 36px;
  --bx-default-button-color: #2d3036;
  --bx-default-button-hover-color: #515863;
  --bx-default-button-disabled-color: #8e8e8e;
  --bx-primary-button-color: #008746;
  --bx-primary-button-hover-color: #04b358;
  --bx-primary-button-disabled-color: #448262;
  --bx-danger-button-color: #c10404;
  --bx-danger-button-hover-color: #e61d1d;
  --bx-danger-button-disabled-color: #a26c6c;
  --bx-toast-z-index: 9999;
  --bx-dialog-z-index: 9101;
  --bx-dialog-overlay-z-index: 9100;
  --bx-remote-play-popup-z-index: 9090;
  --bx-stats-bar-z-index: 9001;
  --bx-stream-settings-z-index: 9000;
  --bx-mkb-pointer-lock-msg-z-index: 8999;
  --bx-game-bar-z-index: 8888;
  --bx-wait-time-box-z-index: 100;
  --bx-screenshot-animation-z-index: 1;
}
@font-face {
  font-family: 'promptfont';
  src: url("https://redphx.github.io/better-xcloud/fonts/promptfont.otf");
}
div[class^=HUDButton-module__hiddenContainer] ~ div:not([class^=HUDButton-module__hiddenContainer]) {
  opacity: 0;
  pointer-events: none !important;
  position: absolute;
  top: -9999px;
  left: -9999px;
}
@media screen and (max-width: 600px) {
  header a[href="/play"] {
    display: none;
  }
}
.bx-full-width {
  width: 100% !important;
}
.bx-full-height {
  height: 100% !important;
}
.bx-no-scroll {
  overflow: hidden !important;
}
.bx-gone {
  display: none !important;
}
.bx-offscreen {
  position: absolute !important;
  top: -9999px !important;
  left: -9999px !important;
  visibility: hidden !important;
}
.bx-hidden {
  visibility: hidden !important;
}
.bx-no-margin {
  margin: 0 !important;
}
.bx-no-padding {
  padding: 0 !important;
}
#headerArea,
#uhfSkipToMain,
.uhf-footer {
  display: none;
}
div[class*=NotFocusedDialog] {
  position: absolute !important;
  top: -9999px !important;
  left: -9999px !important;
  width: 0px !important;
  height: 0px !important;
}
#game-stream video:not([src]) {
  visibility: hidden;
}
.bx-button {
  background-color: var(--bx-default-button-color);
  user-select: none;
  -webkit-user-select: none;
  color: #fff;
  font-family: var(--bx-title-font-semibold);
  font-size: 14px;
  border: none;
  font-weight: 400;
  height: var(--bx-button-height);
  border-radius: 4px;
  padding: 0 8px;
  text-transform: uppercase;
  cursor: pointer;
  overflow: hidden;
}
.bx-button:focus {
  outline: none !important;
}
.bx-button:hover,
.bx-button.bx-focusable:focus {
  background-color: var(--bx-default-button-hover-color);
}
.bx-button:disabled {
  cursor: default;
  background-color: var(--bx-default-button-disabled-color);
}
.bx-button.bx-ghost {
  background-color: transparent;
}
.bx-button.bx-ghost:hover,
.bx-button.bx-ghost.bx-focusable:focus {
  background-color: var(--bx-default-button-hover-color);
}
.bx-button.bx-primary {
  background-color: var(--bx-primary-button-color);
}
.bx-button.bx-primary:hover,
.bx-button.bx-primary.bx-focusable:focus {
  background-color: var(--bx-primary-button-hover-color);
}
.bx-button.bx-primary:disabled {
  background-color: var(--bx-primary-button-disabled-color);
}
.bx-button.bx-danger {
  background-color: var(--bx-danger-button-color);
}
.bx-button.bx-danger:hover,
.bx-button.bx-danger.bx-focusable:focus {
  background-color: var(--bx-danger-button-hover-color);
}
.bx-button.bx-danger:disabled {
  background-color: var(--bx-danger-button-disabled-color);
}
.bx-button svg {
  display: inline-block;
  width: 16px;
  height: var(--bx-button-height);
}
.bx-button svg:not(:only-child) {
  margin-right: 4px;
}
.bx-button span {
  display: inline-block;
  height: var(--bx-button-height);
  line-height: var(--bx-button-height);
  vertical-align: middle;
  vertical-align: -webkit-baseline-middle;
  color: #fff;
  overflow: hidden;
  white-space: nowrap;
}
.bx-button.bx-focusable {
  position: relative;
}
.bx-button.bx-focusable::after {
  border: 2px solid transparent;
  border-radius: 4px;
}
.bx-button.bx-focusable:focus::after {
  content: '';
  border-color: #fff;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
a.bx-button {
  display: inline-block;
}
a.bx-button.bx-full-width {
  text-align: center;
}
.bx-header-remote-play-button {
  height: auto;
  margin-right: 8px !important;
}
.bx-header-remote-play-button svg {
  width: 24px;
  height: 46px;
}
.bx-header-settings-button {
  line-height: 30px;
  font-size: 14px;
  text-transform: uppercase;
  position: relative;
}
.bx-header-settings-button[data-update-available]::before {
  content: '🌟' !important;
  line-height: var(--bx-button-height);
  display: inline-block;
  margin-left: 4px;
}
.bx-settings-reload-button {
  margin-top: 10px;
  height: calc(var(--bx-button-height) * 1.5);
}
.bx-settings-container {
  background-color: #151515;
  user-select: none;
  -webkit-user-select: none;
  color: #fff;
  font-family: var(--bx-normal-font);
}
@media (hover: hover) {
  .bx-settings-wrapper a.bx-settings-title:hover {
    color: #83f73a;
  }
}
.bx-settings-wrapper {
  width: 450px;
  margin: auto;
  padding: 12px 6px;
}
@media screen and (max-width: 450px) {
  .bx-settings-wrapper {
    width: 100%;
  }
}
.bx-settings-wrapper *:focus {
  outline: none !important;
}
.bx-settings-wrapper .bx-settings-title-wrapper {
  display: flex;
  margin-bottom: 10px;
  align-items: center;
}
.bx-settings-wrapper a.bx-settings-title {
  font-family: var(--bx-title-font);
  font-size: 1.4rem;
  text-decoration: none;
  font-weight: bold;
  display: block;
  color: #5dc21e;
  flex: 1;
}
.bx-settings-wrapper a.bx-settings-title:focus {
  color: #83f73a;
}
.bx-settings-wrapper .bx-button.bx-primary {
  margin-top: 8px;
}
.bx-settings-wrapper a.bx-settings-update {
  display: block;
  color: #ff834b;
  text-decoration: none;
  margin-bottom: 8px;
  text-align: center;
  background: #222;
  border-radius: 4px;
  padding: 4px;
}
@media (hover: hover) {
  .bx-settings-wrapper a.bx-settings-update:hover {
    color: #ff9869;
    text-decoration: underline;
  }
}
.bx-settings-wrapper a.bx-settings-update:focus {
  color: #ff9869;
  text-decoration: underline;
}
.bx-settings-group-label {
  font-weight: bold;
  display: block;
  font-size: 1.1rem;
}
.bx-settings-row {
  display: flex;
  padding: 6px 12px;
  position: relative;
}
.bx-settings-row label {
  flex: 1;
  align-self: center;
  margin-bottom: 0;
}
.bx-settings-row:hover,
.bx-settings-row:focus-within {
  background-color: #242424;
}
.bx-settings-row input {
  align-self: center;
  accent-color: var(--bx-primary-button-color);
}
.bx-settings-row input:focus {
  accent-color: var(--bx-danger-button-color);
}
.bx-settings-row select:disabled {
  -webkit-appearance: none;
  background: transparent;
  text-align-last: right;
  border: none;
  color: #fff;
}
.bx-settings-row input[type=checkbox]:focus,
.bx-settings-row select:focus {
  filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff);
}
.bx-settings-row:has(input:focus)::before,
.bx-settings-row:has(select:focus)::before {
  content: ' ';
  border-radius: 4px;
  border: 2px solid #fff;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
}
.bx-settings-group-label b,
.bx-settings-row label b {
  display: block;
  font-size: 12px;
  font-style: italic;
  font-weight: normal;
  color: #828282;
}
.bx-settings-group-label b {
  margin-bottom: 8px;
}
.bx-settings-app-version {
  margin-top: 10px;
  text-align: center;
  color: #747474;
  font-size: 12px;
}
.bx-donation-link {
  display: block;
  text-align: center;
  text-decoration: none;
  height: 20px;
  line-height: 20px;
  font-size: 14px;
  margin-top: 10px;
  color: #5dc21e;
}
.bx-donation-link:hover {
  color: #6dd72b;
}
.bx-donation-link:focus {
  text-decoration: underline;
}
.bx-settings-custom-user-agent {
  display: block;
  width: 100%;
}
.bx-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--bx-dialog-overlay-z-index);
  background: #000;
  opacity: 50%;
}
.bx-dialog {
  display: flex;
  flex-flow: column;
  max-height: 90vh;
  position: fixed;
  top: 50%;
  left: 50%;
  margin-right: -50%;
  transform: translate(-50%, -50%);
  min-width: 420px;
  padding: 20px;
  border-radius: 8px;
  z-index: var(--bx-dialog-z-index);
  background: #1a1b1e;
  color: #fff;
  font-weight: 400;
  font-size: 16px;
  font-family: var(--bx-normal-font);
  box-shadow: 0 0 6px #000;
  user-select: none;
  -webkit-user-select: none;
}
.bx-dialog *:focus {
  outline: none !important;
}
.bx-dialog h2 {
  display: flex;
  margin-bottom: 12px;
}
.bx-dialog h2 b {
  flex: 1;
  color: #fff;
  display: block;
  font-family: var(--bx-title-font);
  font-size: 26px;
  font-weight: 400;
  line-height: var(--bx-button-height);
}
.bx-dialog.bx-binding-dialog h2 b {
  font-family: var(--bx-promptfont-font) !important;
}
.bx-dialog > div {
  overflow: auto;
  padding: 2px 0;
}
.bx-dialog > button {
  padding: 8px 32px;
  margin: 10px auto 0;
  border: none;
  border-radius: 4px;
  display: block;
  background-color: #2d3036;
  text-align: center;
  color: #fff;
  text-transform: uppercase;
  font-family: var(--bx-title-font);
  font-weight: 400;
  line-height: 18px;
  font-size: 14px;
}
@media (hover: hover) {
  .bx-dialog > button:hover {
    background-color: #515863;
  }
}
.bx-dialog > button:focus {
  background-color: #515863;
}
@media screen and (max-width: 450px) {
  .bx-dialog {
    min-width: 100%;
  }
}
.bx-toast {
  user-select: none;
  -webkit-user-select: none;
  position: fixed;
  left: 50%;
  top: 24px;
  transform: translate(-50%, 0);
  background: #000;
  border-radius: 16px;
  color: #fff;
  z-index: var(--bx-toast-z-index);
  font-family: var(--bx-normal-font);
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  opacity: 0;
  overflow: clip;
  transition: opacity 0.2s ease-in;
}
.bx-toast.bx-show {
  opacity: 0.85;
}
.bx-toast.bx-hide {
  opacity: 0;
  pointer-events: none;
}
.bx-toast-msg {
  font-size: 14px;
  display: inline-block;
  padding: 12px 16px;
  white-space: pre;
}
.bx-toast-status {
  font-weight: bold;
  font-size: 14px;
  text-transform: uppercase;
  display: inline-block;
  background: #515863;
  padding: 12px 16px;
  color: #fff;
  white-space: pre;
}
.bx-wait-time-box {
  position: fixed;
  top: 0;
  right: 0;
  background-color: rgba(0,0,0,0.8);
  color: #fff;
  z-index: var(--bx-wait-time-box-z-index);
  padding: 12px;
  border-radius: 0 0 0 8px;
}
.bx-wait-time-box label {
  display: block;
  text-transform: uppercase;
  text-align: right;
  font-size: 12px;
  font-weight: bold;
  margin: 0;
}
.bx-wait-time-box span {
  display: block;
  font-family: var(--bx-monospaced-font);
  text-align: right;
  font-size: 16px;
  margin-bottom: 10px;
}
.bx-wait-time-box span:last-of-type {
  margin-bottom: 0;
}
.bx-remote-play-popup {
  width: 100%;
  max-width: 1920px;
  margin: auto;
  position: relative;
  height: 0.1px;
  overflow: visible;
  z-index: var(--bx-remote-play-popup-z-index);
}
.bx-remote-play-container {
  position: absolute;
  right: 10px;
  top: 0;
  background: #1a1b1e;
  border-radius: 10px;
  width: 420px;
  max-width: calc(100vw - 20px);
  margin: 0 0 0 auto;
  padding: 20px;
  box-shadow: rgba(0,0,0,0.502) 0px 0px 12px 0px;
}
@media (min-width: 480px) and (min-height: calc(480px + 1px)) {
  .bx-remote-play-container {
    right: calc(env(safe-area-inset-right, 0px) + 32px);
  }
}
@media (min-width: 768px) and (min-height: calc(480px + 1px)) {
  .bx-remote-play-container {
    right: calc(env(safe-area-inset-right, 0px) + 48px);
  }
}
@media (min-width: 1920px) and (min-height: calc(480px + 1px)) {
  .bx-remote-play-container {
    right: calc(env(safe-area-inset-right, 0px) + 80px);
  }
}
.bx-remote-play-container > .bx-button {
  display: table;
  margin: 0 0 0 auto;
}
.bx-remote-play-settings {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #2d2d2d;
}
.bx-remote-play-settings > div {
  display: flex;
}
.bx-remote-play-settings label {
  flex: 1;
}
.bx-remote-play-settings label p {
  margin: 4px 0 0;
  padding: 0;
  color: #888;
  font-size: 12px;
}
.bx-remote-play-settings span {
  font-weight: bold;
  font-size: 18px;
  display: block;
  margin-bottom: 8px;
  text-align: center;
}
.bx-remote-play-resolution {
  display: block;
}
.bx-remote-play-resolution input[type="radio"] {
  accent-color: var(--bx-primary-button-color);
  margin-right: 6px;
}
.bx-remote-play-resolution input[type="radio"]:focus {
  accent-color: var(--bx-primary-button-hover-color);
}
.bx-remote-play-device-wrapper {
  display: flex;
  margin-bottom: 12px;
}
.bx-remote-play-device-wrapper:last-child {
  margin-bottom: 2px;
}
.bx-remote-play-device-info {
  flex: 1;
  padding: 4px 0;
}
.bx-remote-play-device-name {
  font-size: 20px;
  font-weight: bold;
  display: inline-block;
  vertical-align: middle;
}
.bx-remote-play-console-type {
  font-size: 12px;
  background: #004c87;
  color: #fff;
  display: inline-block;
  border-radius: 14px;
  padding: 2px 10px;
  margin-left: 8px;
  vertical-align: middle;
}
.bx-remote-play-power-state {
  color: #888;
  font-size: 14px;
}
.bx-remote-play-connect-button {
  min-height: 100%;
  margin: 4px 0;
}
div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module] {
  overflow: visible;
}
.bx-stream-menu-button-on {
  fill: #000 !important;
  background-color: #2d2d2d !important;
  color: #000 !important;
}
.bx-stream-refresh-button {
  top: calc(env(safe-area-inset-top, 0px) + 10px + 50px) !important;
}
body[data-media-type=default] .bx-stream-refresh-button {
  left: calc(env(safe-area-inset-left, 0px) + 11px) !important;
}
body[data-media-type=tv] .bx-stream-refresh-button {
  top: calc(var(--gds-focus-borderSize) + 80px) !important;
}
div[data-testid=media-container] {
  display: flex;
}
div[data-testid=media-container].bx-taking-screenshot:before {
  animation: bx-anim-taking-screenshot 0.5s ease;
  content: ' ';
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: var(--bx-screenshot-animation-z-index);
}
#game-stream video {
  margin: auto;
  align-self: center;
  background: #000;
}
@-moz-keyframes bx-anim-taking-screenshot {
  0% {
    border: 0px solid rgba(255,255,255,0.502);
  }
  50% {
    border: 8px solid rgba(255,255,255,0.502);
  }
  100% {
    border: 0px solid rgba(255,255,255,0.502);
  }
}
@-webkit-keyframes bx-anim-taking-screenshot {
  0% {
    border: 0px solid rgba(255,255,255,0.502);
  }
  50% {
    border: 8px solid rgba(255,255,255,0.502);
  }
  100% {
    border: 0px solid rgba(255,255,255,0.502);
  }
}
@-o-keyframes bx-anim-taking-screenshot {
  0% {
    border: 0px solid rgba(255,255,255,0.502);
  }
  50% {
    border: 8px solid rgba(255,255,255,0.502);
  }
  100% {
    border: 0px solid rgba(255,255,255,0.502);
  }
}
@keyframes bx-anim-taking-screenshot {
  0% {
    border: 0px solid rgba(255,255,255,0.502);
  }
  50% {
    border: 8px solid rgba(255,255,255,0.502);
  }
  100% {
    border: 0px solid rgba(255,255,255,0.502);
  }
}
.bx-number-stepper {
  text-align: center;
}
.bx-number-stepper span {
  display: inline-block;
  min-width: 40px;
  font-family: var(--bx-monospaced-font);
  font-size: 14px;
}
.bx-number-stepper button {
  border: none;
  width: 24px;
  height: 24px;
  margin: 0 4px;
  line-height: 24px;
  background-color: var(--bx-default-button-color);
  color: #fff;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
  font-family: var(--bx-monospaced-font);
  color: #fff;
}
@media (hover: hover) {
  .bx-number-stepper button:hover {
    background-color: var(--bx-default-button-hover-color);
  }
}
.bx-number-stepper button:active {
  background-color: var(--bx-default-button-hover-color);
}
.bx-number-stepper button:disabled + span {
  font-family: var(--bx-title-font);
}
.bx-number-stepper input[type="range"] {
  display: block;
  margin: 12px auto 2px;
  width: 180px;
  color: #959595 !important;
}
.bx-number-stepper input[type=range]:disabled,
.bx-number-stepper button:disabled {
  display: none;
}
#bx-game-bar {
  z-index: var(--bx-game-bar-z-index);
  position: fixed;
  bottom: 0;
  width: 40px;
  height: 90px;
  overflow: visible;
  cursor: pointer;
}
#bx-game-bar > svg {
  display: none;
  pointer-events: none;
  position: absolute;
  height: 28px;
  margin-top: 16px;
}
@media (hover: hover) {
  #bx-game-bar:hover > svg {
    display: block;
  }
}
#bx-game-bar .bx-game-bar-container {
  opacity: 0;
  position: absolute;
  display: flex;
  overflow: hidden;
  background: rgba(26,27,30,0.91);
  box-shadow: 0px 0px 6px #1c1c1c;
  transition: opacity 0.1s ease-in;
/* Touch controller buttons */
/* Show enabled button */
/* Show enable button */
}
#bx-game-bar .bx-game-bar-container.bx-show {
  opacity: 0.9;
}
#bx-game-bar .bx-game-bar-container.bx-show + svg {
  display: none !important;
}
#bx-game-bar .bx-game-bar-container.bx-hide {
  opacity: 0;
  pointer-events: none;
}
#bx-game-bar .bx-game-bar-container button {
  width: 60px;
  height: 60px;
  border-radius: 0;
}
#bx-game-bar .bx-game-bar-container button svg {
  width: 28px;
  height: 28px;
  transition: transform 0.08s ease 0s;
}
#bx-game-bar .bx-game-bar-container button:hover {
  border-radius: 0;
}
#bx-game-bar .bx-game-bar-container button:active svg {
  transform: scale(0.75);
}
#bx-game-bar .bx-game-bar-container button.bx-activated {
  background-color: #fff;
}
#bx-game-bar .bx-game-bar-container button.bx-activated svg {
  filter: invert(1);
}
#bx-game-bar .bx-game-bar-container div[data-enabled] button {
  display: none;
}
#bx-game-bar .bx-game-bar-container div[data-enabled='true'] button:first-of-type {
  display: block;
}
#bx-game-bar .bx-game-bar-container div[data-enabled='false'] button:last-of-type {
  display: block;
}
#bx-game-bar[data-position="bottom-left"] {
  left: 0;
  direction: ltr;
}
#bx-game-bar[data-position="bottom-left"] .bx-game-bar-container {
  border-radius: 0 10px 10px 0;
}
#bx-game-bar[data-position="bottom-right"] {
  right: 0;
  direction: rtl;
}
#bx-game-bar[data-position="bottom-right"] .bx-game-bar-container {
  direction: ltr;
  border-radius: 10px 0 0 10px;
}
.bx-badges {
  position: absolute;
  margin-left: 0px;
  user-select: none;
  -webkit-user-select: none;
}
.bx-badge {
  border: none;
  display: inline-block;
  line-height: 24px;
  color: #fff;
  font-family: var(--bx-title-font-semibold);
  font-size: 14px;
  font-weight: 400;
  margin: 0 8px 8px 0;
  box-shadow: 0px 0px 6px #000;
  border-radius: 4px;
}
.bx-badge-name {
  background-color: #2d3036;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px 0 0 4px;
  text-transform: uppercase;
}
.bx-badge-value {
  background-color: #808080;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 0 4px 4px 0;
}
.bx-badge-battery[data-charging=true] span:first-of-type::after {
  content: ' ⚡️';
}
.bx-stats-bar {
  display: block;
  user-select: none;
  -webkit-user-select: none;
  position: fixed;
  top: 0;
  background-color: #000;
  color: #fff;
  font-family: var(--bx-monospaced-font);
  font-size: 0.9rem;
  padding-left: 8px;
  z-index: var(--bx-stats-bar-z-index);
  text-wrap: nowrap;
}
.bx-stats-bar[data-stats*="[fps]"] > .bx-stat-fps,
.bx-stats-bar[data-stats*="[ping]"] > .bx-stat-ping,
.bx-stats-bar[data-stats*="[btr]"] > .bx-stat-btr,
.bx-stats-bar[data-stats*="[dt]"] > .bx-stat-dt,
.bx-stats-bar[data-stats*="[pl]"] > .bx-stat-pl,
.bx-stats-bar[data-stats*="[fl]"] > .bx-stat-fl {
  display: inline-block;
}
.bx-stats-bar[data-stats$="[fps]"] > .bx-stat-fps,
.bx-stats-bar[data-stats$="[ping]"] > .bx-stat-ping,
.bx-stats-bar[data-stats$="[btr]"] > .bx-stat-btr,
.bx-stats-bar[data-stats$="[dt]"] > .bx-stat-dt,
.bx-stats-bar[data-stats$="[pl]"] > .bx-stat-pl,
.bx-stats-bar[data-stats$="[fl]"] > .bx-stat-fl {
  margin-right: 0;
  border-right: none;
}
.bx-stats-bar::before {
  display: none;
  content: '👀';
  vertical-align: middle;
  margin-right: 8px;
}
.bx-stats-bar[data-display=glancing]::before {
  display: inline-block;
}
.bx-stats-bar[data-position=top-left] {
  left: 0;
  border-radius: 0 0 4px 0;
}
.bx-stats-bar[data-position=top-right] {
  right: 0;
  border-radius: 0 0 0 4px;
}
.bx-stats-bar[data-position=top-center] {
  transform: translate(-50%, 0);
  left: 50%;
  border-radius: 0 0 4px 4px;
}
.bx-stats-bar[data-transparent=true] {
  background: none;
  filter: drop-shadow(1px 0 0 rgba(0,0,0,0.941)) drop-shadow(-1px 0 0 rgba(0,0,0,0.941)) drop-shadow(0 1px 0 rgba(0,0,0,0.941)) drop-shadow(0 -1px 0 rgba(0,0,0,0.941));
}
.bx-stats-bar > div {
  display: none;
  margin-right: 8px;
  border-right: 1px solid #fff;
  padding-right: 8px;
}
.bx-stats-bar label {
  margin: 0 8px 0 0;
  font-family: var(--bx-title-font);
  font-size: inherit;
  font-weight: bold;
  vertical-align: middle;
  cursor: help;
}
.bx-stats-bar span {
  min-width: 60px;
  display: inline-block;
  text-align: right;
  vertical-align: middle;
}
.bx-stats-bar span[data-grade=good] {
  color: #6bffff;
}
.bx-stats-bar span[data-grade=ok] {
  color: #fff16b;
}
.bx-stats-bar span[data-grade=bad] {
  color: #ff5f5f;
}
.bx-stats-bar span:first-of-type {
  min-width: 22px;
}
.bx-quick-settings-bar {
  display: flex;
  position: fixed;
  z-index: var(--bx-stream-settings-z-index);
  opacity: 0.98;
  user-select: none;
  -webkit-user-select: none;
}
.bx-quick-settings-tabs {
  position: fixed;
  top: 0;
  right: 420px;
  display: flex;
  flex-direction: column;
  border-radius: 0 0 0 8px;
  box-shadow: 0px 0px 6px #000;
  overflow: clip;
}
.bx-quick-settings-tabs svg {
  width: 32px;
  height: 32px;
  padding: 10px;
  box-sizing: content-box;
  background: #131313;
  cursor: pointer;
  border-left: 4px solid #1e1e1e;
}
.bx-quick-settings-tabs svg.bx-active {
  background: #222;
  border-color: #008746;
}
.bx-quick-settings-tabs svg:not(.bx-active):hover {
  background: #2f2f2f;
  border-color: #484848;
}
.bx-quick-settings-tab-contents {
  flex-direction: column;
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  padding: 14px 14px 0;
  width: 420px;
  background: #1a1b1e;
  color: #fff;
  font-weight: 400;
  font-size: 16px;
  font-family: var(--bx-title-font);
  text-align: center;
  box-shadow: 0px 0px 6px #000;
  overflow: overlay;
}
.bx-quick-settings-tab-contents > div[data-group=mkb] {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.bx-quick-settings-tab-contents *:focus {
  outline: none !important;
}
.bx-quick-settings-tab-contents h2 {
  margin-bottom: 8px;
  display: flex;
  align-item: center;
}
.bx-quick-settings-tab-contents h2 span {
  display: inline-block;
  font-size: 24px;
  font-weight: bold;
  text-transform: uppercase;
  text-align: left;
  flex: 1;
  height: var(--bx-button-height);
  line-height: calc(var(--bx-button-height) + 4px);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.bx-quick-settings-row {
  display: flex;
  border-bottom: 1px solid rgba(64,64,64,0.502);
  margin-bottom: 16px;
  padding-bottom: 16px;
}
.bx-quick-settings-row label {
  font-size: 16px;
  display: block;
  text-align: left;
  flex: 1;
  align-self: center;
  margin-bottom: 0 !important;
}
.bx-quick-settings-row input {
  accent-color: var(--bx-primary-button-color);
}
.bx-quick-settings-row select:disabled {
  -webkit-appearance: none;
  background: transparent;
  text-align-last: right;
  border: none;
}
.bx-quick-settings-bar-note {
  display: block;
  text-align: center;
  font-size: 12px;
  font-weight: lighter;
  font-style: italic;
  padding-top: 16px;
}
.bx-quick-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-profile {
  width: 100%;
  height: 36px;
  display: block;
  margin-bottom: 10px;
}
.bx-quick-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-row {
  display: flex;
  margin-bottom: 10px;
}
.bx-quick-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-row label.bx-prompt {
  flex: 1;
  font-family: var(--bx-promptfont-font);
  font-size: 26px;
}
.bx-quick-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-row select {
  flex: 2;
}
.bx-mkb-settings {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding-bottom: 10px;
  overflow: hidden;
}
.bx-mkb-settings select:disabled {
  -webkit-appearance: none;
  background: transparent;
  text-align-last: right;
  text-align: right;
  border: none;
  color: #fff;
}
.bx-mkb-pointer-lock-msg {
  display: flex;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  margin: auto;
  background: rgba(0,0,0,0.898);
  z-index: var(--bx-mkb-pointer-lock-msg-z-index);
  color: #fff;
  text-align: center;
  font-weight: 400;
  font-family: "Segoe UI", Arial, Helvetica, sans-serif;
  font-size: 1.3rem;
  padding: 12px;
  border-radius: 8px;
  align-items: center;
  box-shadow: 0 0 6px #000;
}
.bx-mkb-pointer-lock-msg:hover {
  background: #151515;
}
.bx-mkb-pointer-lock-msg button {
  margin-right: 12px;
  height: 60px;
}
.bx-mkb-pointer-lock-msg svg {
  width: 32px;
}
.bx-mkb-pointer-lock-msg div {
  display: flex;
  flex-direction: column;
  text-align: left;
}
.bx-mkb-pointer-lock-msg p {
  margin: 0;
}
.bx-mkb-pointer-lock-msg p:first-child {
  font-size: 22px;
  margin-bottom: 8px;
}
.bx-mkb-pointer-lock-msg p:last-child {
  font-size: 14px;
  font-style: italic;
}
.bx-mkb-preset-tools {
  display: flex;
  margin-bottom: 12px;
}
.bx-mkb-preset-tools select {
  flex: 1;
}
.bx-mkb-preset-tools button {
  margin-left: 6px;
}
.bx-mkb-settings-rows {
  flex: 1;
  overflow: scroll;
}
.bx-mkb-key-row {
  display: flex;
  margin-bottom: 10px;
  align-items: center;
}
.bx-mkb-key-row label {
  margin-bottom: 0;
  font-family: var(--bx-promptfont-font);
  font-size: 26px;
  text-align: center;
  width: 26px;
  height: 32px;
  line-height: 32px;
}
.bx-mkb-key-row button {
  flex: 1;
  height: 32px;
  line-height: 32px;
  margin: 0 0 0 10px;
  background: transparent;
  border: none;
  color: #fff;
  border-radius: 0;
  border-left: 1px solid #373737;
}
.bx-mkb-key-row button:hover {
  background: transparent;
  cursor: default;
}
.bx-mkb-settings.bx-editing .bx-mkb-key-row button {
  background: #393939;
  border-radius: 4px;
  border: none;
}
.bx-mkb-settings.bx-editing .bx-mkb-key-row button:hover {
  background: #333;
  cursor: pointer;
}
.bx-mkb-action-buttons > div {
  text-align: right;
  display: none;
}
.bx-mkb-action-buttons button {
  margin-left: 8px;
}
.bx-mkb-settings:not(.bx-editing) .bx-mkb-action-buttons > div:first-child {
  display: block;
}
.bx-mkb-settings.bx-editing .bx-mkb-action-buttons > div:last-child {
  display: block;
}
.bx-mkb-note {
  display: block;
  margin: 16px 0 10px;
  font-size: 12px;
}
.bx-mkb-note:first-of-type {
  margin-top: 0;
}
`;
  if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES)) {
    css += `
div[class^=HomePage-module__bottomSpacing]:has(button[class*=SocialEmptyCard]),
button[class*=SocialEmptyCard] {
    display: none;
}
`;
  }
  if (getPref(PrefKey.REDUCE_ANIMATIONS)) {
    css += `
div[class*=GameCard-module__gameTitleInnerWrapper],
div[class*=GameCard-module__card],
div[class*=ScrollArrows-module] {
    transition: none !important;
}
`;
  }
  if (getPref(PrefKey.HIDE_DOTS_ICON)) {
    css += `
div[class*=Grip-module__container] {
    visibility: hidden;
}

@media (hover: hover) {
    button[class*=GripHandle-module__container]:hover div[class*=Grip-module__container] {
        visibility: visible;
    }
}

button[class*=GripHandle-module__container][aria-expanded=true] div[class*=Grip-module__container] {
    visibility: visible;
}

button[class*=GripHandle-module__container][aria-expanded=false] {
    background-color: transparent !important;
}

div[class*=StreamHUD-module__buttonsContainer] {
    padding: 0px !important;
}
`;
  }
  css += `
div[class*=StreamMenu-module__menu] {
    min-width: 100vw !important;
}
`;
  if (getPref(PrefKey.STREAM_SIMPLIFY_MENU)) {
    css += `
div[class*=Menu-module__scrollable] {
    --bxStreamMenuItemSize: 80px;
    --streamMenuItemSize: calc(var(--bxStreamMenuItemSize) + 40px) !important;
}

.bx-badges {
    top: calc(var(--streamMenuItemSize) - 20px);
}

body[data-media-type=tv] .bx-badges {
    top: calc(var(--streamMenuItemSize) - 10px) !important;
}

button[class*=MenuItem-module__container] {
    min-width: auto !important;
    min-height: auto !important;
    width: var(--bxStreamMenuItemSize) !important;
    height: var(--bxStreamMenuItemSize) !important;
}

div[class*=MenuItem-module__label] {
    display: none !important;
}

svg[class*=MenuItem-module__icon] {
    width: 36px;
    height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
}
`;
  } else {
    css += `
body[data-media-type=tv] .bx-badges {
    top: calc(var(--streamMenuItemSize) + 30px);
}

body:not([data-media-type=tv]) .bx-badges {
    top: calc(var(--streamMenuItemSize) + 20px);
}

body:not([data-media-type=tv]) button[class*=MenuItem-module__container] {
    min-width: auto !important;
    width: 100px !important;
}

body:not([data-media-type=tv]) button[class*=MenuItem-module__container]:nth-child(n+2) {
    margin-left: 10px !important;
}

body:not([data-media-type=tv]) div[class*=MenuItem-module__label] {
    margin-left: 8px !important;
    margin-right: 8px !important;
}
`;
  }
  if (getPref(PrefKey.UI_SCROLLBAR_HIDE)) {
    css += `
html {
    scrollbar-width: none;
}

body::-webkit-scrollbar {
    display: none;
}
`;
  }
  const $style = CE("style", {}, css);
  document.documentElement.appendChild($style);
}

// src/modules/mkb/mouse-cursor-hider.ts
class MouseCursorHider {
  static #timeout;
  static #cursorVisible = true;
  static show() {
    document.body && (document.body.style.cursor = "unset");
    MouseCursorHider.#cursorVisible = true;
  }
  static hide() {
    document.body && (document.body.style.cursor = "none");
    MouseCursorHider.#timeout = null;
    MouseCursorHider.#cursorVisible = false;
  }
  static onMouseMove(e) {
    !MouseCursorHider.#cursorVisible && MouseCursorHider.show();
    MouseCursorHider.#timeout && clearTimeout(MouseCursorHider.#timeout);
    MouseCursorHider.#timeout = window.setTimeout(MouseCursorHider.hide, 3000);
  }
  static start() {
    MouseCursorHider.show();
    document.addEventListener("mousemove", MouseCursorHider.onMouseMove);
  }
  static stop() {
    MouseCursorHider.#timeout && clearTimeout(MouseCursorHider.#timeout);
    document.removeEventListener("mousemove", MouseCursorHider.onMouseMove);
    MouseCursorHider.show();
  }
}

// src/modules/patches/controller-shortcuts.js
var controller_shortcuts_default = "const currentGamepad = ${gamepadVar};\n\n// Share button on XS controller\nif (currentGamepad.buttons[17] && currentGamepad.buttons[17].value === 1) {\n    window.dispatchEvent(new Event(BxEvent.CAPTURE_SCREENSHOT));\n}\n\nconst btnHome = currentGamepad.buttons[16];\nif (btnHome) {\n    if (!this.bxHomeStates) {\n        this.bxHomeStates = {};\n    }\n\n    if (btnHome.pressed) {\n        this.gamepadIsIdle.set(currentGamepad.index, false);\n\n        if (this.bxHomeStates[currentGamepad.index]) {\n            const lastTimestamp = this.bxHomeStates[currentGamepad.index].timestamp;\n\n            if (currentGamepad.timestamp !== lastTimestamp) {\n                this.bxHomeStates[currentGamepad.index].timestamp = currentGamepad.timestamp;\n\n                const handled = window.BX_EXPOSED.handleControllerShortcut(currentGamepad);\n                if (handled) {\n                    this.bxHomeStates[currentGamepad.index].shortcutPressed += 1;\n                }\n            }\n        } else {\n            // First time pressing > save current timestamp\n            window.BX_EXPOSED.resetControllerShortcut(currentGamepad.index);\n            this.bxHomeStates[currentGamepad.index] = {\n                    shortcutPressed: 0,\n                    timestamp: currentGamepad.timestamp,\n                };\n        }\n\n        // Listen to next button press\n        const intervalMs = 50;\n        this.inputConfiguration.useIntervalWorkerThreadForInput && this.intervalWorker ? this.intervalWorker.scheduleTimer(intervalMs) : this.pollGamepadssetTimeoutTimerID = setTimeout(this.pollGamepads, intervalMs);\n\n        // Hijack this button\n        return;\n    } else if (this.bxHomeStates[currentGamepad.index]) {\n        const info = structuredClone(this.bxHomeStates[currentGamepad.index]);\n\n        // Home button released\n        this.bxHomeStates[currentGamepad.index] = null;\n\n        if (info.shortcutPressed === 0) {\n            const fakeGamepadMappings = [{\n                    GamepadIndex: currentGamepad.index,\n                    A: 0,\n                    B: 0,\n                    X: 0,\n                    Y: 0,\n                    LeftShoulder: 0,\n                    RightShoulder: 0,\n                    LeftTrigger: 0,\n                    RightTrigger: 0,\n                    View: 0,\n                    Menu: 0,\n                    LeftThumb: 0,\n                    RightThumb: 0,\n                    DPadUp: 0,\n                    DPadDown: 0,\n                    DPadLeft: 0,\n                    DPadRight: 0,\n                    Nexus: 1,\n                    LeftThumbXAxis: 0,\n                    LeftThumbYAxis: 0,\n                    RightThumbXAxis: 0,\n                    RightThumbYAxis: 0,\n                    PhysicalPhysicality: 0,\n                    VirtualPhysicality: 0,\n                    Dirty: true,\n                    Virtual: false,\n                }];\n\n            const isLongPress = (currentGamepad.timestamp - info.timestamp) >= 500;\n            const intervalMs = isLongPress ? 500 : 100;\n\n            this.inputSink.onGamepadInput(performance.now() - intervalMs, fakeGamepadMappings);\n            this.inputConfiguration.useIntervalWorkerThreadForInput && this.intervalWorker ? this.intervalWorker.scheduleTimer(intervalMs) : this.pollGamepadssetTimeoutTimerID = setTimeout(this.pollGamepads, intervalMs);\n            return;\n        }\n    }\n}\n";

// src/modules/patches/local-co-op-enable.js
var local_co_op_enable_default = "let match;\nlet onGamepadChangedStr = this.onGamepadChanged.toString();\n\nonGamepadChangedStr = onGamepadChangedStr.replaceAll('0', 'arguments[1]');\neval(`this.onGamepadChanged = function ${onGamepadChangedStr}`);\n\nlet onGamepadInputStr = this.onGamepadInput.toString();\n\nmatch = onGamepadInputStr.match(/(\\w+\\.GamepadIndex)/);\nif (match) {\n    const gamepadIndexVar = match[0];\n    onGamepadInputStr = onGamepadInputStr.replace('this.gamepadStates.get(', `this.gamepadStates.get(${gamepadIndexVar},`);\n    eval(`this.onGamepadInput = function ${onGamepadInputStr}`);\n    BxLogger.info('supportLocalCoOp', '✅ Successfully patched local co-op support');\n} else {\n    BxLogger.error('supportLocalCoOp', '❌ Unable to patch local co-op support');\n}\n";

// src/modules/patches/remote-play-enable.js
var remote_play_enable_default = "connectMode: window.BX_REMOTE_PLAY_CONFIG ? \"xhome-connect\" : \"cloud-connect\",\nremotePlayServerId: (window.BX_REMOTE_PLAY_CONFIG && window.BX_REMOTE_PLAY_CONFIG.serverId) || '',\n";

// src/modules/patches/remote-play-keep-alive.js
var remote_play_keep_alive_default = "const msg = JSON.parse(e);\nif (msg.reason === 'WarningForBeingIdle' && !window.location.pathname.includes('/launch/')) {\n    try {\n        this.sendKeepAlive();\n        return;\n    } catch (ex) { console.log(ex); }\n}\n";

// src/modules/patches/vibration-adjust.js
var vibration_adjust_default = "if (!window.BX_ENABLE_CONTROLLER_VIBRATION) {\n    return void(0);\n}\n\nconst intensity = window.BX_VIBRATION_INTENSITY;\nif (intensity && intensity < 1) {\n    e.leftMotorPercent *= intensity;\n    e.rightMotorPercent *= intensity;\n    e.leftTriggerMotorPercent *= intensity;\n    e.rightTriggerMotorPercent *= intensity;\n}\n";

// src/modules/patcher.ts
var ENDING_CHUNKS_PATCH_NAME = "loadingEndingChunks";
var LOG_TAG4 = "Patcher";
var PATCHES = {
  disableAiTrack(str2) {
    const text = ".track=function(";
    const index = str2.indexOf(text);
    if (index === -1) {
      return false;
    }
    if (str2.substring(0, index + 200).includes('"AppInsightsCore')) {
      return false;
    }
    return str2.substring(0, index) + ".track=function(e){},!!function(" + str2.substring(index + text.length);
  },
  disableTelemetry(str2) {
    const text = ".disableTelemetry=function(){return!1}";
    if (!str2.includes(text)) {
      return false;
    }
    return str2.replace(text, ".disableTelemetry=function(){return!0}");
  },
  disableTelemetryProvider(str2) {
    const text = "this.enableLightweightTelemetry=!";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = [
      "this.trackEvent",
      "this.trackPageView",
      "this.trackHttpCompleted",
      "this.trackHttpFailed",
      "this.trackError",
      "this.trackErrorLike",
      "this.onTrackEvent",
      "()=>{}"
    ].join("=");
    return str2.replace(text, newCode + ";" + text);
  },
  disableIndexDbLogging(str2) {
    const text = ",this.logsDb=new";
    if (!str2.includes(text)) {
      return false;
    }
    let newCode = ",this.log=()=>{}";
    return str2.replace(text, newCode + text);
  },
  websiteLayout(str2) {
    const text = '?"tv":"default"';
    if (!str2.includes(text)) {
      return false;
    }
    const layout = getPref(PrefKey.UI_LAYOUT) === "tv" ? "tv" : "default";
    return str2.replace(text, `?"${layout}":"${layout}"`);
  },
  remotePlayDirectConnectUrl(str2) {
    const index = str2.indexOf("/direct-connect");
    if (index === -1) {
      return false;
    }
    return str2.replace(str2.substring(index - 9, index + 15), "https://www.xbox.com/play");
  },
  remotePlayKeepAlive(str2) {
    const text = "onServerDisconnectMessage(e){";
    if (!str2.includes(text)) {
      return false;
    }
    str2 = str2.replace(text, text + remote_play_keep_alive_default);
    return str2;
  },
  remotePlayConnectMode(str2) {
    const text = 'connectMode:"cloud-connect",';
    if (!str2.includes(text)) {
      return false;
    }
    return str2.replace(text, remote_play_enable_default);
  },
  remotePlayDisableAchievementToast(str2) {
    const text = ".AchievementUnlock:{";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = `
if (!!window.BX_REMOTE_PLAY_CONFIG) {
    return;
}
`;
    return str2.replace(text, text + newCode);
  },
  disableTrackEvent(str2) {
    const text = "this.trackEvent=";
    if (!str2.includes(text)) {
      return false;
    }
    return str2.replace(text, "this.trackEvent=e=>{},this.uwuwu=");
  },
  blockWebRtcStatsCollector(str2) {
    const text = "this.shouldCollectStats=!0";
    if (!str2.includes(text)) {
      return false;
    }
    return str2.replace(text, "this.shouldCollectStats=!1");
  },
  patchPollGamepads(str2) {
    const index = str2.indexOf("},this.pollGamepads=()=>{");
    if (index === -1) {
      return false;
    }
    const nextIndex = str2.indexOf("setTimeout(this.pollGamepads", index);
    if (nextIndex === -1) {
      return false;
    }
    let codeBlock = str2.substring(index, nextIndex);
    if (getPref(PrefKey.BLOCK_TRACKING)) {
      codeBlock = codeBlock.replaceAll("this.inputPollingIntervalStats.addValue", "");
    }
    const match = codeBlock.match(/this\.gamepadTimestamps\.set\((\w+)\.index/);
    if (match) {
      const gamepadVar = match[1];
      const newCode = renderString(controller_shortcuts_default, {
        gamepadVar
      });
      codeBlock = codeBlock.replace("this.gamepadTimestamps.set", newCode + "this.gamepadTimestamps.set");
    }
    return str2.substring(0, index) + codeBlock + str2.substring(nextIndex);
  },
  enableXcloudLogger(str2) {
    const text = "this.telemetryProvider=e}log(e,t,i){";
    if (!str2.includes(text)) {
      return false;
    }
    str2 = str2.replaceAll(text, text + "console.log(Array.from(arguments));");
    return str2;
  },
  enableConsoleLogging(str2) {
    const text = "static isConsoleLoggingAllowed(){";
    if (!str2.includes(text)) {
      return false;
    }
    str2 = str2.replaceAll(text, text + "return true;");
    return str2;
  },
  playVibration(str2) {
    const text = "}playVibration(e){";
    if (!str2.includes(text)) {
      return false;
    }
    VibrationManager.updateGlobalVars();
    str2 = str2.replaceAll(text, text + vibration_adjust_default);
    return str2;
  },
  overrideSettings(str2) {
    const index = str2.indexOf(",EnableStreamGate:");
    if (index === -1) {
      return false;
    }
    const endIndex = str2.indexOf("},", index);
    const newSettings = [
      "PwaPrompt: false"
    ];
    const newCode = newSettings.join(",");
    str2 = str2.substring(0, endIndex) + "," + newCode + str2.substring(endIndex);
    return str2;
  },
  disableGamepadDisconnectedScreen(str2) {
    const index = str2.indexOf('"GamepadDisconnected_Title",');
    if (index === -1) {
      return false;
    }
    const constIndex = str2.indexOf("const", index - 30);
    str2 = str2.substring(0, constIndex) + "e.onClose();return null;" + str2.substring(constIndex);
    return str2;
  },
  patchUpdateInputConfigurationAsync(str2) {
    const text = "async updateInputConfigurationAsync(e){";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = "e.enableTouchInput = true;";
    str2 = str2.replace(text, text + newCode);
    return str2;
  },
  loadingEndingChunks(str2) {
    const text = '"FamilySagaManager"';
    if (!str2.includes(text)) {
      return false;
    }
    BxLogger.info(LOG_TAG4, "Remaining patches:", PATCH_ORDERS);
    PATCH_ORDERS = PATCH_ORDERS.concat(PLAYING_PATCH_ORDERS);
    return str2;
  },
  disableStreamGate(str2) {
    const index = str2.indexOf('case"partially-ready":');
    if (index === -1) {
      return false;
    }
    const bracketIndex = str2.indexOf("=>{", index - 150) + 3;
    str2 = str2.substring(0, bracketIndex) + "return 0;" + str2.substring(bracketIndex);
    return str2;
  },
  exposeTouchLayoutManager(str2) {
    const text = "this._perScopeLayoutsStream=new";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = `
true;
window.BX_EXPOSED["touchLayoutManager"] = this;
window.dispatchEvent(new Event("${BxEvent.TOUCH_LAYOUT_MANAGER_READY}"));
`;
    str2 = str2.replace(text, newCode + text);
    return str2;
  },
  supportLocalCoOp(str2) {
    const text = "this.gamepadMappingsToSend=[],";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = `true; ${local_co_op_enable_default}; true,`;
    str2 = str2.replace(text, text + newCode);
    return str2;
  },
  forceFortniteConsole(str2) {
    const text = "sendTouchInputEnabledMessage(e){";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = `window.location.pathname.includes('/launch/fortnite/') && (e = false);`;
    str2 = str2.replace(text, text + newCode);
    return str2;
  },
  disableTakRenderer(str2) {
    const text = "const{TakRenderer:";
    if (!str2.includes(text)) {
      return false;
    }
    let remotePlayCode = "";
    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== "off" && getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) {
      remotePlayCode = `
const gamepads = window.navigator.getGamepads();
let gamepadFound = false;

for (let gamepad of gamepads) {
    if (gamepad && gamepad.connected) {
        gamepadFound = true;
        break;
    }
}

if (gamepadFound) {
    return;
}
`;
    }
    const newCode = `
if (!!window.BX_REMOTE_PLAY_CONFIG) {
    ${remotePlayCode}
} else {
    const titleInfo = window.BX_EXPOSED.getTitleInfo();
    if (titleInfo && !titleInfo.details.hasTouchSupport && !titleInfo.details.hasFakeTouchSupport) {
        return;
    }
}
`;
    str2 = str2.replace(text, newCode + text);
    return str2;
  },
  streamCombineSources(str2) {
    const text = "this.useCombinedAudioVideoStream=!!this.deviceInformation.isTizen";
    if (!str2.includes(text)) {
      return false;
    }
    str2 = str2.replace(text, "this.useCombinedAudioVideoStream=true");
    return str2;
  },
  patchStreamHud(str2) {
    const text = "let{onCollapse";
    if (!str2.includes(text)) {
      return false;
    }
    let newCode = `
// Expose onShowStreamMenu
window.BX_EXPOSED.showStreamMenu = e.onShowStreamMenu;
// Restore the "..." button
e.guideUI = null;
`;
    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "off") {
      newCode += "e.canShowTakHUD = false;";
    }
    str2 = str2.replace(text, newCode + text);
    return str2;
  },
  broadcastPollingMode(str2) {
    const text = ".setPollingMode=e=>{";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = `
window.BX_EXPOSED.onPollingModeChanged && window.BX_EXPOSED.onPollingModeChanged(e);
`;
    str2 = str2.replace(text, text + newCode);
    return str2;
  },
  patchXcloudTitleInfo(str2) {
    const text = "async cloudConnect";
    let index = str2.indexOf(text);
    if (index === -1) {
      return false;
    }
    let backetIndex = str2.indexOf("{", index);
    const params = str2.substring(index, backetIndex).match(/\(([^)]+)\)/)[1];
    const titleInfoVar = params.split(",")[0];
    const newCode = `
${titleInfoVar} = window.BX_EXPOSED.modifyTitleInfo(${titleInfoVar});
BxLogger.info('patchXcloudTitleInfo', ${titleInfoVar});
`;
    str2 = str2.substring(0, backetIndex + 1) + newCode + str2.substring(backetIndex + 1);
    return str2;
  },
  patchRemotePlayMkb(str2) {
    const text = "async homeConsoleConnect";
    let index = str2.indexOf(text);
    if (index === -1) {
      return false;
    }
    let backetIndex = str2.indexOf("{", index);
    const params = str2.substring(index, backetIndex).match(/\(([^)]+)\)/)[1];
    const configsVar = params.split(",")[1];
    const newCode = `
Object.assign(${configsVar}.inputConfiguration, {
    enableMouseInput: false,
    enableKeyboardInput: false,
    enableAbsoluteMouse: false,
});
BxLogger.info('patchRemotePlayMkb', ${configsVar});
`;
    str2 = str2.substring(0, backetIndex + 1) + newCode + str2.substring(backetIndex + 1);
    return str2;
  },
  patchAudioMediaStream(str2) {
    const text = ".srcObject=this.audioMediaStream,";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = `window.BX_EXPOSED.setupGainNode(arguments[1], this.audioMediaStream),`;
    str2 = str2.replace(text, text + newCode);
    return str2;
  },
  patchCombinedAudioVideoMediaStream(str2) {
    const text = ".srcObject=this.combinedAudioVideoStream";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = `,window.BX_EXPOSED.setupGainNode(arguments[0], this.combinedAudioVideoStream)`;
    str2 = str2.replace(text, text + newCode);
    return str2;
  },
  patchTouchControlDefaultOpacity(str2) {
    const text = "opacityMultiplier:1";
    if (!str2.includes(text)) {
      return false;
    }
    const opacity = (getPref(PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY) / 100).toFixed(1);
    const newCode = `opacityMultiplier: ${opacity}`;
    str2 = str2.replace(text, newCode);
    return str2;
  },
  patchShowSensorControls(str2) {
    const text = "{shouldShowSensorControls:";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = `{shouldShowSensorControls: (window.BX_EXPOSED && window.BX_EXPOSED.shouldShowSensorControls) ||`;
    str2 = str2.replace(text, newCode);
    return str2;
  },
  exposeStreamSession(str2) {
    const text = ",this._connectionType=";
    if (!str2.includes(text)) {
      return false;
    }
    const newCode = `;
window.BX_EXPOSED.streamSession = this;

const orgSetMicrophoneState = this.setMicrophoneState.bind(this);
this.setMicrophoneState = state => {
    orgSetMicrophoneState(state);

    const evt = new Event('${BxEvent.MICROPHONE_STATE_CHANGED}');
    evt.microphoneState = state;

    window.dispatchEvent(evt);
};

window.dispatchEvent(new Event('${BxEvent.STREAM_SESSION_READY}'))

true` + text;
    str2 = str2.replace(text, newCode);
    return str2;
  }
};
var PATCH_ORDERS = [
  "disableStreamGate",
  "overrideSettings",
  "broadcastPollingMode",
  "exposeStreamSession",
  getPref(PrefKey.UI_LAYOUT) !== "default" && "websiteLayout",
  getPref(PrefKey.LOCAL_CO_OP_ENABLED) && "supportLocalCoOp",
  getPref(PrefKey.GAME_FORTNITE_FORCE_CONSOLE) && "forceFortniteConsole",
  ...getPref(PrefKey.BLOCK_TRACKING) ? [
    "disableAiTrack",
    "disableTelemetry",
    "blockWebRtcStatsCollector",
    "disableIndexDbLogging",
    "disableTelemetryProvider",
    "disableTrackEvent"
  ] : [],
  ...getPref(PrefKey.REMOTE_PLAY_ENABLED) ? [
    "remotePlayKeepAlive",
    "remotePlayDirectConnectUrl",
    "remotePlayDisableAchievementToast",
    STATES.hasTouchSupport && "patchUpdateInputConfigurationAsync"
  ] : [],
  ...BX_FLAGS.EnableXcloudLogging ? [
    "enableConsoleLogging",
    "enableXcloudLogger"
  ] : []
].filter((item2) => !!item2);
var PLAYING_PATCH_ORDERS = [
  "patchXcloudTitleInfo",
  "disableGamepadDisconnectedScreen",
  "patchStreamHud",
  "playVibration",
  getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && !getPref(PrefKey.STREAM_COMBINE_SOURCES) && "patchAudioMediaStream",
  getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && getPref(PrefKey.STREAM_COMBINE_SOURCES) && "patchCombinedAudioVideoMediaStream",
  STATES.hasTouchSupport && getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "all" && "patchShowSensorControls",
  STATES.hasTouchSupport && getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "all" && "exposeTouchLayoutManager",
  STATES.hasTouchSupport && (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "off" || getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) && "disableTakRenderer",
  STATES.hasTouchSupport && getPref(PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY) !== 100 && "patchTouchControlDefaultOpacity",
  BX_FLAGS.EnableXcloudLogging && "enableConsoleLogging",
  "patchPollGamepads",
  getPref(PrefKey.STREAM_COMBINE_SOURCES) && "streamCombineSources",
  ...getPref(PrefKey.REMOTE_PLAY_ENABLED) ? [
    "patchRemotePlayMkb",
    "remotePlayConnectMode"
  ] : []
].filter((item2) => !!item2);
var ALL_PATCHES = [...PATCH_ORDERS, ...PLAYING_PATCH_ORDERS];

class Patcher {
  static #patchFunctionBind() {
    const nativeBind = Function.prototype.bind;
    Function.prototype.bind = function() {
      let valid = false;
      if (this.name.length <= 2 && arguments.length === 2 && arguments[0] === null) {
        if (arguments[1] === 0 || typeof arguments[1] === "function") {
          valid = true;
        }
      }
      if (!valid) {
        return nativeBind.apply(this, arguments);
      }
      PatcherCache.init();
      if (typeof arguments[1] === "function") {
        BxLogger.info(LOG_TAG4, "Restored Function.prototype.bind()");
        Function.prototype.bind = nativeBind;
      }
      const orgFunc = this;
      const newFunc = (a, item2) => {
        Patcher.patch(item2);
        orgFunc(a, item2);
      };
      return nativeBind.apply(newFunc, arguments);
    };
  }
  static patch(item) {
    let patchesToCheck;
    let appliedPatches;
    const patchesMap = {};
    for (let id in item[1]) {
      appliedPatches = [];
      const cachedPatches = PatcherCache.getPatches(id);
      if (cachedPatches) {
        patchesToCheck = cachedPatches.slice(0);
        patchesToCheck.push(...PATCH_ORDERS);
      } else {
        patchesToCheck = PATCH_ORDERS.slice(0);
      }
      if (!patchesToCheck.length) {
        continue;
      }
      const func = item[1][id];
      let str = func.toString();
      let modified = false;
      for (let patchIndex = 0;patchIndex < patchesToCheck.length; patchIndex++) {
        const patchName = patchesToCheck[patchIndex];
        if (appliedPatches.indexOf(patchName) > -1) {
          continue;
        }
        if (!PATCHES[patchName]) {
          continue;
        }
        const patchedStr = PATCHES[patchName].call(null, str);
        if (!patchedStr) {
          continue;
        }
        modified = true;
        str = patchedStr;
        BxLogger.info(LOG_TAG4, `✅ ${patchName}`);
        appliedPatches.push(patchName);
        patchesToCheck.splice(patchIndex, 1);
        patchIndex--;
        PATCH_ORDERS = PATCH_ORDERS.filter((item2) => item2 != patchName);
      }
      if (modified) {
        item[1][id] = eval(str);
      }
      if (appliedPatches.length) {
        patchesMap[id] = appliedPatches;
      }
    }
    if (Object.keys(patchesMap).length) {
      PatcherCache.saveToCache(patchesMap);
    }
  }
  static init() {
    Patcher.#patchFunctionBind();
  }
}

class PatcherCache {
  static #KEY_CACHE = "better_xcloud_patches_cache";
  static #KEY_SIGNATURE = "better_xcloud_patches_cache_signature";
  static #CACHE;
  static #isInitialized = false;
  static #getSignature() {
    const scriptVersion = SCRIPT_VERSION;
    const webVersion = document.querySelector("meta[name=gamepass-app-version]")?.content;
    const patches = JSON.stringify(ALL_PATCHES);
    const sig = hashCode(scriptVersion + webVersion + patches);
    return sig;
  }
  static clear() {
    window.localStorage.removeItem(PatcherCache.#KEY_CACHE);
    PatcherCache.#CACHE = {};
  }
  static checkSignature() {
    const storedSig = window.localStorage.getItem(PatcherCache.#KEY_SIGNATURE) || 0;
    const currentSig = PatcherCache.#getSignature();
    if (currentSig !== parseInt(storedSig)) {
      BxLogger.warning(LOG_TAG4, "Signature changed");
      window.localStorage.setItem(PatcherCache.#KEY_SIGNATURE, currentSig.toString());
      PatcherCache.clear();
    } else {
      BxLogger.info(LOG_TAG4, "Signature unchanged");
    }
  }
  static #cleanupPatches(patches) {
    return patches.filter((item2) => {
      for (const id2 in PatcherCache.#CACHE) {
        const cached = PatcherCache.#CACHE[id2];
        if (cached.includes(item2)) {
          return false;
        }
      }
      return true;
    });
  }
  static getPatches(id2) {
    return PatcherCache.#CACHE[id2];
  }
  static saveToCache(subCache) {
    for (const id2 in subCache) {
      const patchNames = subCache[id2];
      let data = PatcherCache.#CACHE[id2];
      if (!data) {
        PatcherCache.#CACHE[id2] = patchNames;
      } else {
        for (const patchName of patchNames) {
          if (!data.includes(patchName)) {
            data.push(patchName);
          }
        }
      }
    }
    window.localStorage.setItem(PatcherCache.#KEY_CACHE, JSON.stringify(PatcherCache.#CACHE));
  }
  static init() {
    if (PatcherCache.#isInitialized) {
      return;
    }
    PatcherCache.#isInitialized = true;
    PatcherCache.checkSignature();
    PatcherCache.#CACHE = JSON.parse(window.localStorage.getItem(PatcherCache.#KEY_CACHE) || "{}");
    BxLogger.info(LOG_TAG4, PatcherCache.#CACHE);
    if (window.location.pathname.includes("/play/")) {
      PATCH_ORDERS.push(...PLAYING_PATCH_ORDERS);
    } else {
      PATCH_ORDERS.push(ENDING_CHUNKS_PATCH_NAME);
    }
    PATCH_ORDERS = PatcherCache.#cleanupPatches(PATCH_ORDERS);
    PLAYING_PATCH_ORDERS = PatcherCache.#cleanupPatches(PLAYING_PATCH_ORDERS);
    BxLogger.info(LOG_TAG4, PATCH_ORDERS.slice(0));
    BxLogger.info(LOG_TAG4, PLAYING_PATCH_ORDERS.slice(0));
  }
}

// src/modules/ui/global-settings.ts
function setupSettingsUi() {
  if (document.querySelector(".bx-settings-container")) {
    return;
  }
  const PREF_PREFERRED_REGION = getPreferredServerRegion();
  const PREF_LATEST_VERSION = getPref(PrefKey.LATEST_VERSION);
  let $btnReload;
  const $container = CE("div", {
    class: "bx-settings-container bx-gone"
  });
  let $updateAvailable;
  const $wrapper = CE("div", { class: "bx-settings-wrapper" }, CE("div", { class: "bx-settings-title-wrapper" }, CE("a", {
    class: "bx-settings-title",
    href: SCRIPT_HOME,
    target: "_blank"
  }, "Better xCloud " + SCRIPT_VERSION), createButton({
    icon: BxIcon.QUESTION,
    style: ButtonStyle.FOCUSABLE,
    label: t("help"),
    url: "https://better-xcloud.github.io/features/"
  })));
  $updateAvailable = CE("a", {
    class: "bx-settings-update bx-gone",
    href: "https://github.com/redphx/better-xcloud/releases",
    target: "_blank"
  });
  $wrapper.appendChild($updateAvailable);
  if (PREF_LATEST_VERSION && PREF_LATEST_VERSION != SCRIPT_VERSION) {
    $updateAvailable.textContent = `🌟 Version ${PREF_LATEST_VERSION} available`;
    $updateAvailable.classList.remove("bx-gone");
  }
  if (AppInterface) {
    const $btn = createButton({
      label: t("android-app-settings"),
      icon: BxIcon.STREAM_SETTINGS,
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
      onClick: (e) => {
        AppInterface.openAppSettings && AppInterface.openAppSettings();
      }
    });
    $wrapper.appendChild($btn);
  } else {
    const userAgent2 = UserAgent.getDefault().toLowerCase();
    if (userAgent2.includes("android")) {
      const $btn = createButton({
        label: "🔥 " + t("install-android"),
        style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
        url: "https://better-xcloud.github.io/android"
      });
      $wrapper.appendChild($btn);
    }
  }
  const onChange = async (e) => {
    PatcherCache.clear();
    $btnReload.classList.add("bx-danger");
    const $btnHeaderSettings = document.querySelector(".bx-header-settings-button");
    $btnHeaderSettings && $btnHeaderSettings.classList.add("bx-danger");
    if (e.target.id === "bx_setting_" + PrefKey.BETTER_XCLOUD_LOCALE) {
      Translations.refreshCurrentLocale();
      await Translations.updateTranslations();
      $btnReload.textContent = t("settings-reloading");
      $btnReload.click();
    }
  };
  for (let groupLabel in SETTINGS_UI) {
    const $group = CE("span", { class: "bx-settings-group-label" }, groupLabel);
    if (SETTINGS_UI[groupLabel].note) {
      const $note = CE("b", {}, SETTINGS_UI[groupLabel].note);
      $group.appendChild($note);
    }
    $wrapper.appendChild($group);
    if (SETTINGS_UI[groupLabel].unsupported) {
      continue;
    }
    const settingItems = SETTINGS_UI[groupLabel].items;
    for (let settingId of settingItems) {
      if (!settingId) {
        continue;
      }
      const setting = Preferences.SETTINGS[settingId];
      if (!setting) {
        continue;
      }
      let settingLabel = setting.label;
      let settingNote = setting.note || "";
      if (setting.experimental) {
        settingLabel = "🧪 " + settingLabel;
        if (!settingNote) {
          settingNote = t("experimental");
        } else {
          settingNote = `${t("experimental")}: ${settingNote}`;
        }
      }
      let $control;
      let $inpCustomUserAgent;
      let labelAttrs = {
        tabindex: "-1"
      };
      if (settingId === PrefKey.USER_AGENT_PROFILE) {
        let defaultUserAgent = window.navigator.orgUserAgent || window.navigator.userAgent;
        $inpCustomUserAgent = CE("input", {
          id: `bx_setting_inp_${settingId}`,
          type: "text",
          placeholder: defaultUserAgent,
          class: "bx-settings-custom-user-agent"
        });
        $inpCustomUserAgent.addEventListener("change", (e) => {
          const profile = $control.value;
          const custom = e.target.value.trim();
          UserAgent.updateStorage(profile, custom);
          onChange(e);
        });
        $control = toPrefElement(PrefKey.USER_AGENT_PROFILE, (e) => {
          const value = e.target.value;
          let isCustom = value === UserAgentProfile.CUSTOM;
          let userAgent2 = UserAgent.get(value);
          UserAgent.updateStorage(value);
          $inpCustomUserAgent.value = userAgent2;
          $inpCustomUserAgent.readOnly = !isCustom;
          $inpCustomUserAgent.disabled = !isCustom;
          !e.target.disabled && onChange(e);
        });
      } else if (settingId === PrefKey.SERVER_REGION) {
        let selectedValue;
        $control = CE("select", {
          id: `bx_setting_${settingId}`,
          title: settingLabel,
          tabindex: 0
        });
        $control.name = $control.id;
        $control.addEventListener("change", (e) => {
          setPref(settingId, e.target.value);
          onChange(e);
        });
        selectedValue = PREF_PREFERRED_REGION;
        setting.options = {};
        for (let regionName in STATES.serverRegions) {
          const region4 = STATES.serverRegions[regionName];
          let value = regionName;
          let label = `${region4.shortName} - ${regionName}`;
          if (region4.isDefault) {
            label += ` (${t("default")})`;
            value = "default";
            if (selectedValue === regionName) {
              selectedValue = "default";
            }
          }
          setting.options[value] = label;
        }
        for (let value in setting.options) {
          const label = setting.options[value];
          const $option = CE("option", { value }, label);
          $control.appendChild($option);
        }
        $control.value = selectedValue;
      } else {
        if (settingId === PrefKey.BETTER_XCLOUD_LOCALE) {
          $control = toPrefElement(settingId, (e) => {
            localStorage.setItem("better_xcloud_locale", e.target.value);
            onChange(e);
          });
        } else {
          $control = toPrefElement(settingId, onChange);
        }
      }
      if (!!$control.id) {
        labelAttrs["for"] = $control.id;
      } else {
        labelAttrs["for"] = `bx_setting_${settingId}`;
      }
      if (setting.unsupported) {
        $control.disabled = true;
      }
      if ($control.disabled && !!$control.getAttribute("tabindex")) {
        $control.setAttribute("tabindex", -1);
      }
      const $label = CE("label", labelAttrs, settingLabel);
      if (settingNote) {
        $label.appendChild(CE("b", {}, settingNote));
      }
      const $elm = CE("div", { class: "bx-settings-row" }, $label, $control);
      $wrapper.appendChild($elm);
      if (settingId === PrefKey.USER_AGENT_PROFILE) {
        $wrapper.appendChild($inpCustomUserAgent);
        $control.disabled = true;
        $control.dispatchEvent(new Event("change"));
        $control.disabled = false;
      }
    }
  }
  $btnReload = createButton({
    label: t("settings-reload"),
    classes: ["bx-settings-reload-button"],
    style: ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
    onClick: (e) => {
      window.location.reload();
      $btnReload.disabled = true;
      $btnReload.textContent = t("settings-reloading");
    }
  });
  $btnReload.setAttribute("tabindex", "0");
  $wrapper.appendChild($btnReload);
  const $donationLink = CE("a", {
    class: "bx-donation-link",
    href: "https://ko-fi.com/redphx",
    target: "_blank",
    tabindex: 0
  }, `❤️ ${t("support-better-xcloud")}`);
  $wrapper.appendChild($donationLink);
  try {
    const appVersion = document.querySelector("meta[name=gamepass-app-version]").content;
    const appDate = new Date(document.querySelector("meta[name=gamepass-app-date]").content).toISOString().substring(0, 10);
    $wrapper.appendChild(CE("div", { class: "bx-settings-app-version" }, `xCloud website version ${appVersion} (${appDate})`));
  } catch (e) {
  }
  $container.appendChild($wrapper);
  const $pageContent = document.getElementById("PageContent");
  $pageContent?.parentNode?.insertBefore($container, $pageContent);
}
var SETTINGS_UI = {
  "Better xCloud": {
    items: [
      PrefKey.BETTER_XCLOUD_LOCALE,
      PrefKey.REMOTE_PLAY_ENABLED
    ]
  },
  [t("server")]: {
    items: [
      PrefKey.SERVER_REGION,
      PrefKey.STREAM_PREFERRED_LOCALE,
      PrefKey.PREFER_IPV6_SERVER
    ]
  },
  [t("stream")]: {
    items: [
      PrefKey.STREAM_TARGET_RESOLUTION,
      PrefKey.STREAM_CODEC_PROFILE,
      PrefKey.BITRATE_VIDEO_MAX,
      PrefKey.AUDIO_ENABLE_VOLUME_CONTROL,
      PrefKey.AUDIO_MIC_ON_PLAYING,
      PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG,
      PrefKey.SCREENSHOT_APPLY_FILTERS,
      PrefKey.GAME_FORTNITE_FORCE_CONSOLE,
      PrefKey.STREAM_COMBINE_SOURCES
    ]
  },
  [t("game-bar")]: {
    items: [
      PrefKey.GAME_BAR_POSITION
    ]
  },
  [t("local-co-op")]: {
    items: [
      PrefKey.LOCAL_CO_OP_ENABLED
    ]
  },
  [t("mouse-and-keyboard")]: {
    items: [
      PrefKey.NATIVE_MKB_DISABLED,
      PrefKey.MKB_ENABLED,
      PrefKey.MKB_HIDE_IDLE_CURSOR
    ]
  },
  [t("touch-controller")]: {
    note: !STATES.hasTouchSupport ? "⚠️ " + t("device-unsupported-touch") : null,
    unsupported: !STATES.hasTouchSupport,
    items: [
      PrefKey.STREAM_TOUCH_CONTROLLER,
      PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF,
      PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY,
      PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD,
      PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM
    ]
  },
  [t("loading-screen")]: {
    items: [
      PrefKey.UI_LOADING_SCREEN_GAME_ART,
      PrefKey.UI_LOADING_SCREEN_WAIT_TIME,
      PrefKey.UI_LOADING_SCREEN_ROCKET
    ]
  },
  [t("ui")]: {
    items: [
      PrefKey.UI_LAYOUT,
      PrefKey.UI_HOME_CONTEXT_MENU_DISABLED,
      PrefKey.STREAM_SIMPLIFY_MENU,
      PrefKey.SKIP_SPLASH_VIDEO,
      !AppInterface && PrefKey.UI_SCROLLBAR_HIDE,
      PrefKey.HIDE_DOTS_ICON,
      PrefKey.REDUCE_ANIMATIONS
    ]
  },
  [t("other")]: {
    items: [
      PrefKey.BLOCK_SOCIAL_FEATURES,
      PrefKey.BLOCK_TRACKING
    ]
  },
  [t("advanced")]: {
    items: [
      PrefKey.USER_AGENT_PROFILE
    ]
  }
};

// src/modules/ui/header.ts
var injectSettingsButton = function($parent) {
  if (!$parent) {
    return;
  }
  const PREF_PREFERRED_REGION = getPreferredServerRegion(true);
  const PREF_LATEST_VERSION = getPref(PrefKey.LATEST_VERSION);
  const $headerFragment = document.createDocumentFragment();
  if (getPref(PrefKey.REMOTE_PLAY_ENABLED)) {
    const $remotePlayBtn = createButton({
      classes: ["bx-header-remote-play-button"],
      icon: BxIcon.REMOTE_PLAY,
      title: t("remote-play"),
      style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
      onClick: (e) => {
        RemotePlay.togglePopup();
      }
    });
    $headerFragment.appendChild($remotePlayBtn);
  }
  const $settingsBtn = createButton({
    classes: ["bx-header-settings-button"],
    label: PREF_PREFERRED_REGION,
    style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_HEIGHT,
    onClick: (e) => {
      setupSettingsUi();
      const $settings = document.querySelector(".bx-settings-container");
      $settings.classList.toggle("bx-gone");
      window.scrollTo(0, 0);
      document.activeElement && document.activeElement.blur();
    }
  });
  if (PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION) {
    $settingsBtn.setAttribute("data-update-available", "true");
  }
  $headerFragment.appendChild($settingsBtn);
  $parent.appendChild($headerFragment);
};
function checkHeader() {
  const $button = document.querySelector(".bx-header-settings-button");
  if (!$button) {
    const $rightHeader = document.querySelector("#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]");
    injectSettingsButton($rightHeader);
  }
}
function watchHeader() {
  const $header = document.querySelector("#PageContent header");
  if (!$header) {
    return;
  }
  let timeout;
  const observer = new MutationObserver((mutationList) => {
    timeout && clearTimeout(timeout);
    timeout = window.setTimeout(checkHeader, 2000);
  });
  observer.observe($header, { subtree: true, childList: true });
  checkHeader();
}

// src/utils/history.ts
function patchHistoryMethod(type) {
  const orig = window.history[type];
  return function(...args) {
    BxEvent.dispatch(window, BxEvent.POPSTATE, {
      arguments: args
    });
    return orig.apply(this, arguments);
  };
}
function onHistoryChanged(e) {
  if (e && e.arguments && e.arguments[0] && e.arguments[0].origin === "better-xcloud") {
    return;
  }
  window.setTimeout(RemotePlay.detect, 10);
  const $settings = document.querySelector(".bx-settings-container");
  if ($settings) {
    $settings.classList.add("bx-gone");
  }
  RemotePlay.detachPopup();
  LoadingScreen.reset();
  window.setTimeout(checkHeader, 2000);
  BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
}

// src/utils/preload-state.ts
function overridePreloadState() {
  let _state;
  Object.defineProperty(window, "__PRELOADED_STATE__", {
    configurable: true,
    get: () => {
      return _state;
    },
    set: (state) => {
      try {
        state.appContext.requestInfo.userAgent = window.navigator.userAgent;
      } catch (e) {
        BxLogger.error(LOG_TAG5, e);
      }
      if (STATES.hasTouchSupport) {
        try {
          const sigls = state.xcloud.sigls;
          if (GamePassCloudGallery.TOUCH in sigls) {
            let customList = TouchController.getCustomList();
            const allGames = sigls[GamePassCloudGallery.ALL].data.products;
            customList = customList.filter((id2) => allGames.includes(id2));
            sigls[GamePassCloudGallery.TOUCH]?.data.products.push(...customList);
          }
        } catch (e) {
          BxLogger.error(LOG_TAG5, e);
        }
      }
      if (getPref(PrefKey.UI_HOME_CONTEXT_MENU_DISABLED)) {
        try {
          state.experiments.experimentationInfo.data.treatments.EnableHomeContextMenu = false;
        } catch (e) {
          BxLogger.error(LOG_TAG5, e);
        }
      }
      _state = state;
      STATES.appContext = structuredClone(state.appContext);
    }
  });
}
var LOG_TAG5 = "PreloadState";

// src/utils/sdp.ts
function patchSdpBitrate(sdp, video, audio) {
  const lines = sdp.split("\n");
  const mediaSet = new Set;
  !!video && mediaSet.add("video");
  !!audio && mediaSet.add("audio");
  const bitrate = {
    video,
    audio
  };
  for (let lineNumber = 0;lineNumber < lines.length; lineNumber++) {
    let media = "";
    let line = lines[lineNumber];
    if (!line.startsWith("m=")) {
      continue;
    }
    for (const m of mediaSet) {
      if (line.startsWith(`m=${m}`)) {
        media = m;
        mediaSet.delete(media);
        break;
      }
    }
    if (!media) {
      continue;
    }
    const bLine = `b=AS:${bitrate[media]}`;
    while (lineNumber++, lineNumber < lines.length) {
      line = lines[lineNumber];
      if (line.startsWith("i=") || line.startsWith("c=")) {
        continue;
      }
      if (line.startsWith("b=AS:")) {
        lines[lineNumber] = bLine;
        break;
      }
      if (line.startsWith("m=")) {
        lines.splice(lineNumber, 0, bLine);
        break;
      }
    }
  }
  return lines.join("\n");
}

// src/utils/monkey-patches.ts
function patchVideoApi() {
  const PREF_SKIP_SPLASH_VIDEO = getPref(PrefKey.SKIP_SPLASH_VIDEO);
  const showFunc = function() {
    this.style.visibility = "visible";
    this.removeEventListener("playing", showFunc);
    if (!this.videoWidth) {
      return;
    }
    BxEvent.dispatch(window, BxEvent.STREAM_PLAYING, {
      $video: this
    });
  };
  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    if (this.className && this.className.startsWith("XboxSplashVideo")) {
      if (PREF_SKIP_SPLASH_VIDEO) {
        this.volume = 0;
        this.style.display = "none";
        this.dispatchEvent(new Event("ended"));
        return new Promise(() => {
        });
      }
      return nativePlay.apply(this);
    }
    if (!!this.src) {
      return nativePlay.apply(this);
    }
    this.addEventListener("playing", showFunc);
    return nativePlay.apply(this);
  };
}
function patchRtcCodecs() {
  const codecProfile = getPref(PrefKey.STREAM_CODEC_PROFILE);
  if (codecProfile === "default") {
    return;
  }
  if (typeof RTCRtpTransceiver === "undefined" || !("setCodecPreferences" in RTCRtpTransceiver.prototype)) {
    return false;
  }
  const profilePrefix = codecProfile === "high" ? "4d" : codecProfile === "low" ? "420" : "42e";
  const profileLevelId = `profile-level-id=${profilePrefix}`;
  const nativeSetCodecPreferences = RTCRtpTransceiver.prototype.setCodecPreferences;
  RTCRtpTransceiver.prototype.setCodecPreferences = function(codecs) {
    const newCodecs = codecs.slice();
    let pos = 0;
    newCodecs.forEach((codec, i) => {
      if (codec.sdpFmtpLine && codec.sdpFmtpLine.includes(profileLevelId)) {
        newCodecs.splice(i, 1);
        newCodecs.splice(pos, 0, codec);
        ++pos;
      }
    });
    try {
      nativeSetCodecPreferences.apply(this, [newCodecs]);
    } catch (e) {
      BxLogger.error("setCodecPreferences", e);
      nativeSetCodecPreferences.apply(this, [codecs]);
    }
  };
}
function patchRtcPeerConnection() {
  const nativeCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
  RTCPeerConnection.prototype.createDataChannel = function() {
    const dataChannel = nativeCreateDataChannel.apply(this, arguments);
    BxEvent.dispatch(window, BxEvent.DATA_CHANNEL_CREATED, {
      dataChannel
    });
    return dataChannel;
  };
  const nativeSetLocalDescription = RTCPeerConnection.prototype.setLocalDescription;
  RTCPeerConnection.prototype.setLocalDescription = function(description) {
    try {
      const maxVideoBitrate = getPref(PrefKey.BITRATE_VIDEO_MAX);
      if (maxVideoBitrate > 0) {
        arguments[0].sdp = patchSdpBitrate(arguments[0].sdp, maxVideoBitrate * 1000);
      }
    } catch (e) {
      BxLogger.error("setLocalDescription", e);
    }
    return nativeSetLocalDescription.apply(this, arguments);
  };
  const OrgRTCPeerConnection = window.RTCPeerConnection;
  window.RTCPeerConnection = function() {
    const conn = new OrgRTCPeerConnection;
    STATES.currentStream.peerConnection = conn;
    conn.addEventListener("connectionstatechange", (e) => {
      BxLogger.info("connectionstatechange", conn.connectionState);
    });
    return conn;
  };
}
function patchAudioContext() {
  const OrgAudioContext = window.AudioContext;
  const nativeCreateGain = OrgAudioContext.prototype.createGain;
  window.AudioContext = function(options) {
    const ctx = new OrgAudioContext(options);
    BxLogger.info("patchAudioContext", ctx, options);
    ctx.createGain = function() {
      const gainNode = nativeCreateGain.apply(this);
      gainNode.gain.value = getPref(PrefKey.AUDIO_VOLUME) / 100;
      STATES.currentStream.audioGainNode = gainNode;
      return gainNode;
    };
    STATES.currentStream.audioContext = ctx;
    return ctx;
  };
}
function patchMeControl() {
  const overrideConfigs = {
    enableAADTelemetry: false,
    enableTelemetry: false,
    telEvs: "",
    oneDSUrl: ""
  };
  const MSA = {
    MeControl: {}
  };
  const MeControl = {};
  const MsaHandler = {
    get(target, prop, receiver) {
      return target[prop];
    },
    set(obj, prop, value) {
      if (prop === "MeControl" && value.Config) {
        value.Config = Object.assign(value.Config, overrideConfigs);
      }
      obj[prop] = value;
      return true;
    }
  };
  const MeControlHandler = {
    get(target, prop, receiver) {
      return target[prop];
    },
    set(obj, prop, value) {
      if (prop === "Config") {
        value = Object.assign(value, overrideConfigs);
      }
      obj[prop] = value;
      return true;
    }
  };
  window.MSA = new Proxy(MSA, MsaHandler);
  window.MeControl = new Proxy(MeControl, MeControlHandler);
}
function patchCanvasContext() {
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
    if (contextType.includes("webgl")) {
      contextAttributes = contextAttributes || {};
      contextAttributes.antialias = false;
      if (contextAttributes.powerPreference === "high-performance") {
        contextAttributes.powerPreference = "low-power";
      }
    }
    return nativeGetContext.apply(this, [contextType, contextAttributes]);
  };
}

// src/index.ts
var main = function() {
  patchRtcPeerConnection();
  patchRtcCodecs();
  interceptHttpRequests();
  patchVideoApi();
  patchCanvasContext();
  getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && patchAudioContext();
  getPref(PrefKey.BLOCK_TRACKING) && patchMeControl();
  STATES.hasTouchSupport && TouchController.updateCustomList();
  overridePreloadState();
  VibrationManager.initialSetup();
  BX_FLAGS.CheckForUpdate && checkForUpdate();
  addCss();
  Toast.setup();
  getPref(PrefKey.GAME_BAR_POSITION) !== "off" && GameBar.getInstance();
  BX_FLAGS.PreloadUi && setupStreamUi();
  StreamBadges.setupEvents();
  StreamStats.setupEvents();
  MkbHandler.setupEvents();
  Patcher.init();
  disablePwa();
  window.addEventListener("gamepadconnected", (e) => showGamepadToast(e.gamepad));
  window.addEventListener("gamepaddisconnected", (e) => showGamepadToast(e.gamepad));
  if (getPref(PrefKey.REMOTE_PLAY_ENABLED)) {
    RemotePlay.detect();
  }
  if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "all") {
    TouchController.setup();
  }
};
if (window.location.pathname.includes("/auth/msa")) {
  window.addEventListener("load", (e) => {
    window.location.search.includes("loggedIn") && window.setTimeout(() => {
      const location2 = window.location;
      location2.pathname.includes("/play") && location2.reload(true);
    }, 2000);
  });
  throw new Error("[Better xCloud] Refreshing the page after logging in");
}
BxLogger.info("readyState", document.readyState);
if (BX_FLAGS.SafariWorkaround && document.readyState !== "loading") {
  window.stop();
  const css2 = `
.bx-reload-overlay {
    position: fixed;
    top: 0;
    background: #000000cc;
    z-index: 9999;
    width: 100%;
    line-height: 100vh;
    color: #fff;
    text-align: center;
    font-weight: 400;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 1.3rem;
}
`;
  const $fragment = document.createDocumentFragment();
  $fragment.appendChild(CE("style", {}, css2));
  $fragment.appendChild(CE("div", { class: "bx-reload-overlay" }, t("safari-failed-message")));
  document.documentElement.appendChild($fragment);
  window.location.reload(true);
  throw new Error("[Better xCloud] Executing workaround for Safari");
}
window.addEventListener("load", (e) => {
  window.setTimeout(() => {
    if (document.body.classList.contains("legacyBackground")) {
      window.stop();
      window.location.reload(true);
    }
  }, 3000);
});
window.BX_EXPOSED = BxExposed;
window.addEventListener(BxEvent.POPSTATE, onHistoryChanged);
window.addEventListener("popstate", onHistoryChanged);
window.history.pushState = patchHistoryMethod("pushState");
window.history.replaceState = patchHistoryMethod("replaceState");
window.addEventListener(BxEvent.XCLOUD_SERVERS_READY, (e) => {
  if (document.querySelector("div[class^=UnsupportedMarketPage]")) {
    window.setTimeout(watchHeader, 2000);
  } else {
    watchHeader();
  }
});
window.addEventListener(BxEvent.STREAM_LOADING, (e) => {
  if (window.location.pathname.includes("/launch/")) {
    const matches = /\/launch\/(?<title_id>[^\/]+)\/(?<product_id>\w+)/.exec(window.location.pathname);
    if (matches?.groups) {
      STATES.currentStream.titleId = matches.groups.title_id;
      STATES.currentStream.productId = matches.groups.product_id;
    }
  } else {
    STATES.currentStream.titleId = "remote-play";
    STATES.currentStream.productId = "";
  }
  setupStreamUi();
});
getPref(PrefKey.UI_LOADING_SCREEN_GAME_ART) && window.addEventListener(BxEvent.TITLE_INFO_READY, LoadingScreen.setup);
window.addEventListener(BxEvent.STREAM_STARTING, (e) => {
  LoadingScreen.hide();
  if (!getPref(PrefKey.MKB_ENABLED) && getPref(PrefKey.MKB_HIDE_IDLE_CURSOR)) {
    MouseCursorHider.start();
    MouseCursorHider.hide();
  }
});
window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
  const $video = e.$video;
  STATES.currentStream.$video = $video;
  STATES.isPlaying = true;
  injectStreamMenuButtons();
  if (getPref(PrefKey.GAME_BAR_POSITION) !== "off") {
    const gameBar = GameBar.getInstance();
    gameBar.reset();
    gameBar.enable();
    gameBar.showBar();
  }
  Screenshot.updateCanvasSize($video.videoWidth, $video.videoHeight);
  updateVideoPlayerCss();
});
window.addEventListener(BxEvent.STREAM_ERROR_PAGE, (e) => {
  BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});
window.addEventListener(BxEvent.STREAM_STOPPED, (e) => {
  if (!STATES.isPlaying) {
    return;
  }
  STATES.isPlaying = false;
  STATES.currentStream = {};
  window.BX_EXPOSED.shouldShowSensorControls = false;
  getPref(PrefKey.MKB_ENABLED) && MkbHandler.INSTANCE.destroy();
  const $quickBar = document.querySelector(".bx-quick-settings-bar");
  if ($quickBar) {
    $quickBar.classList.add("bx-gone");
  }
  STATES.currentStream.audioGainNode = null;
  STATES.currentStream.$video = null;
  StreamStats.onStoppedPlaying();
  MouseCursorHider.stop();
  TouchController.reset();
  GameBar.getInstance().disable();
});
window.addEventListener(BxEvent.CAPTURE_SCREENSHOT, (e) => {
  Screenshot.takeScreenshot();
});
main();
