// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      5.1.0-beta
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
// src/enums/user-agent.ts
var UserAgentProfile;
(function(UserAgentProfile2) {
  UserAgentProfile2["WINDOWS_EDGE"] = "windows-edge";
  UserAgentProfile2["MACOS_SAFARI"] = "macos-safari";
  UserAgentProfile2["SMARTTV_GENERIC"] = "smarttv-generic";
  UserAgentProfile2["SMARTTV_TIZEN"] = "smarttv-tizen";
  UserAgentProfile2["VR_OCULUS"] = "vr-oculus";
  UserAgentProfile2["DEFAULT"] = "default";
  UserAgentProfile2["CUSTOM"] = "custom";
})(UserAgentProfile || (UserAgentProfile = {}));

// src/utils/user-agent.ts
var CHROMIUM_VERSION = "123.0.0.0";
if (!!window.chrome || window.navigator.userAgent.includes("Chrome")) {
  const match = window.navigator.userAgent.match(/\s(?:Chrome|Edg)\/([\d\.]+)/);
  if (match)
    CHROMIUM_VERSION = match[1];
}

class UserAgent {
  static STORAGE_KEY = "better_xcloud_user_agent";
  static #config;
  static #isMobile = null;
  static #isSafari = null;
  static #isSafariMobile = null;
  static #USER_AGENTS = {
    [UserAgentProfile.WINDOWS_EDGE]: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION} Safari/537.36 Edg/${CHROMIUM_VERSION}`,
    [UserAgentProfile.MACOS_SAFARI]: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.1",
    [UserAgentProfile.SMARTTV_GENERIC]: window.navigator.userAgent + " SmartTV",
    [UserAgentProfile.SMARTTV_TIZEN]: `Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROMIUM_VERSION}/7.0 TV Safari/537.36`,
    [UserAgentProfile.VR_OCULUS]: window.navigator.userAgent + " OculusBrowser VR"
  };
  static init() {
    if (UserAgent.#config = JSON.parse(window.localStorage.getItem(UserAgent.STORAGE_KEY) || "{}"), !UserAgent.#config.profile)
      UserAgent.#config.profile = UserAgentProfile.DEFAULT;
    if (!UserAgent.#config.custom)
      UserAgent.#config.custom = "";
    UserAgent.spoof();
  }
  static updateStorage(profile, custom) {
    const clonedConfig = deepClone(UserAgent.#config);
    if (clonedConfig.profile = profile, typeof custom !== "undefined")
      clonedConfig.custom = custom;
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
  static isSafari() {
    if (this.#isSafari !== null)
      return this.#isSafari;
    const userAgent = UserAgent.getDefault().toLowerCase();
    let result = userAgent.includes("safari") && !userAgent.includes("chrom");
    return this.#isSafari = result, result;
  }
  static isSafariMobile() {
    if (this.#isSafariMobile !== null)
      return this.#isSafariMobile;
    const userAgent = UserAgent.getDefault().toLowerCase(), result = this.isSafari() && userAgent.includes("mobile");
    return this.#isSafariMobile = result, result;
  }
  static isMobile() {
    if (this.#isMobile !== null)
      return this.#isMobile;
    const userAgent = UserAgent.getDefault().toLowerCase(), result = /iphone|ipad|android/.test(userAgent);
    return this.#isMobile = result, result;
  }
  static spoof() {
    const profile = UserAgent.#config.profile;
    if (profile === UserAgentProfile.DEFAULT)
      return;
    const newUserAgent = UserAgent.get(profile);
    window.navigator.orgUserAgentData = window.navigator.userAgentData, Object.defineProperty(window.navigator, "userAgentData", {}), window.navigator.orgUserAgent = window.navigator.userAgent, Object.defineProperty(window.navigator, "userAgent", {
      value: newUserAgent
    });
  }
}

// src/utils/global.ts
function deepClone(obj) {
  if ("structuredClone" in window)
    return structuredClone(obj);
  if (!obj)
    return obj;
  return JSON.parse(JSON.stringify(obj));
}
var SCRIPT_VERSION = "5.1.0-beta", AppInterface = window.AppInterface;
UserAgent.init();
var userAgent = window.navigator.userAgent.toLowerCase(), isTv = userAgent.includes("smart-tv") || userAgent.includes("smarttv") || /\baft.*\b/.test(userAgent), isVr = window.navigator.userAgent.includes("VR") && window.navigator.userAgent.includes("OculusBrowser"), browserHasTouchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0, userAgentHasTouchSupport = !isTv && !isVr && browserHasTouchSupport, STATES = {
  isPlaying: !1,
  appContext: {},
  serverRegions: {},
  userAgentHasTouchSupport,
  browserHasTouchSupport,
  currentStream: {},
  remotePlay: {},
  pointerServerPort: 9269
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
  BxEvent2["POINTER_LOCK_REQUESTED"] = "bx-pointer-lock-requested";
  BxEvent2["POINTER_LOCK_EXITED"] = "bx-pointer-lock-exited";
  BxEvent2["XCLOUD_DIALOG_SHOWN"] = "bx-xcloud-dialog-shown";
  BxEvent2["XCLOUD_DIALOG_DISMISSED"] = "bx-xcloud-dialog-dismissed";
  BxEvent2["XCLOUD_GUIDE_MENU_SHOWN"] = "bx-xcloud-guide-menu-shown";
  BxEvent2["XCLOUD_POLLING_MODE_CHANGED"] = "bx-xcloud-polling-mode-changed";
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
    if (data)
      for (let key in data)
        event[key] = data[key];
    target.dispatchEvent(event), AppInterface && AppInterface.onEvent(eventName);
  }
  BxEvent.dispatch = dispatch;
})(BxEvent || (BxEvent = {}));
window.BxEvent = BxEvent;

// src/utils/bx-flags.ts

/* ADDITIONAL CODE */

var DEFAULT_FLAGS = {
  CheckForUpdate: !0,
  PreloadRemotePlay: !0,
  PreloadUi: !1,
  EnableXcloudLogging: !1,
  SafariWorkaround: !0,
  UseDevTouchLayout: !1,
  ForceNativeMkbTitles: [],
  FeatureGates: null,
  ScriptUi: "default"
}, BX_FLAGS = Object.assign(DEFAULT_FLAGS, window.BX_FLAGS || {});
try {
  delete window.BX_FLAGS;
} catch (e) {
}
var NATIVE_FETCH = window.fetch;

// src/enums/stream-player.ts
var StreamPlayerType;
(function(StreamPlayerType2) {
  StreamPlayerType2["VIDEO"] = "default";
  StreamPlayerType2["WEBGL2"] = "webgl2";
})(StreamPlayerType || (StreamPlayerType = {}));
var StreamVideoProcessing;
(function(StreamVideoProcessing2) {
  StreamVideoProcessing2["USM"] = "usm";
  StreamVideoProcessing2["CAS"] = "cas";
})(StreamVideoProcessing || (StreamVideoProcessing = {}));

// src/utils/html.ts
var createElement = function(elmName, props = {}, ..._) {
  let $elm;
  const hasNs = "xmlns" in props;
  if (hasNs)
    $elm = document.createElementNS(props.xmlns, elmName), delete props.xmlns;
  else
    $elm = document.createElement(elmName);
  for (let key in props) {
    if ($elm.hasOwnProperty(key))
      continue;
    if (hasNs)
      $elm.setAttributeNS(null, key, props[key]);
    else
      $elm.setAttribute(key, props[key]);
  }
  for (let i = 2, size = arguments.length;i < size; i++) {
    const arg = arguments[i], argType = typeof arg;
    if (argType === "string" || argType === "number")
      $elm.appendChild(document.createTextNode(arg));
    else if (arg)
      $elm.appendChild(arg);
  }
  return $elm;
};
function escapeHtml(html) {
  const text = document.createTextNode(html), $span = document.createElement("span");
  return $span.appendChild(text), $span.innerHTML;
}
var CE = createElement, svgParser = (svg) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement, createSvgIcon = (icon) => {
  return svgParser(icon.toString());
}, ButtonStyle = {};
ButtonStyle[ButtonStyle.PRIMARY = 1] = "bx-primary";
ButtonStyle[ButtonStyle.DANGER = 2] = "bx-danger";
ButtonStyle[ButtonStyle.GHOST = 4] = "bx-ghost";
ButtonStyle[ButtonStyle.FOCUSABLE = 8] = "bx-focusable";
ButtonStyle[ButtonStyle.FULL_WIDTH = 16] = "bx-full-width";
ButtonStyle[ButtonStyle.FULL_HEIGHT = 32] = "bx-full-height";
ButtonStyle[ButtonStyle.TALL = 64] = "bx-tall";
var ButtonStyleIndices = Object.keys(ButtonStyle).splice(0, Object.keys(ButtonStyle).length / 2).map((i) => parseInt(i)), createButton = (options) => {
  let $btn;
  if (options.url)
    $btn = CE("a", { class: "bx-button" }), $btn.href = options.url, $btn.target = "_blank";
  else
    $btn = CE("button", { class: "bx-button", type: "button" });
  const style = options.style || 0;
  style && ButtonStyleIndices.forEach((index) => {
    style & index && $btn.classList.add(ButtonStyle[index]);
  }), options.classes && $btn.classList.add(...options.classes), options.icon && $btn.appendChild(createSvgIcon(options.icon)), options.label && $btn.appendChild(CE("span", {}, options.label)), options.title && $btn.setAttribute("title", options.title), options.disabled && ($btn.disabled = !0), options.onClick && $btn.addEventListener("click", options.onClick);
  for (let key in options.attributes)
    if (!$btn.hasOwnProperty(key))
      $btn.setAttribute(key, options.attributes[key]);
  return $btn;
}, CTN = document.createTextNode.bind(document);
window.BX_CE = createElement;

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

// src/utils/translation.ts
var SUPPORTED_LANGUAGES = {
  "en-US": "English (United States)",
  "ca-CA": "Català",
  "de-DE": "Deutsch",
  "en-ID": "Bahasa Indonesia",
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
}, Texts = {
  activate: "Activate",
  activated: "Activated",
  active: "Active",
  advanced: "Advanced",
  "always-off": "Always off",
  "always-on": "Always on",
  "amd-fidelity-cas": "AMD FidelityFX CAS",
  "android-app-settings": "Android app settings",
  apply: "Apply",
  "aspect-ratio": "Aspect ratio",
  "aspect-ratio-note": "Don't use with native touch games",
  audio: "Audio",
  auto: "Auto",
  "back-to-home": "Back to home",
  "back-to-home-confirm": "Do you want to go back to the home page (without disconnecting)?",
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
  "clarity-boost": "Clarity boost",
  "clarity-boost-warning": "These settings don't work when the Clarity Boost mode is ON",
  clear: "Clear",
  close: "Close",
  "close-app": "Close app",
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
  "controller-shortcuts-xbox-note": "Button to open the Guide menu",
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
  "horizontal-scroll-sensitivity": "Horizontal scroll sensitivity",
  "horizontal-sensitivity": "Horizontal sensitivity",
  ignore: "Ignore",
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
  "mouse-wheel": "Mouse wheel",
  muted: "Muted",
  name: "Name",
  "native-mkb": "Native Mouse & Keyboard",
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
    (e) => `Press ${e.key} to toggle this feature`,
    ,
    (e) => `${e.key}: Funktion an-/ausschalten`,
    ,
    (e) => `Pulsa ${e.key} para alternar esta función`,
    (e) => `Appuyez sur ${e.key} pour activer cette fonctionnalité`,
    (e) => `Premi ${e.key} per attivare questa funzionalità`,
    (e) => `${e.key} でこの機能を切替`,
    (e) => `${e.key} 키를 눌러 이 기능을 켜고 끄세요`,
    (e) => `Naciśnij ${e.key} aby przełączyć tę funkcję`,
    ,
    (e) => `Нажмите ${e.key} для переключения этой функции`,
    ,
    (e) => `Etkinleştirmek için ${e.key} tuşuna basın`,
    (e) => `Натисніть ${e.key} щоб перемкнути цю функцію`,
    (e) => `Nhấn ${e.key} để bật/tắt tính năng này`,
    ,
  ],
  "press-to-bind": "Press a key or do a mouse click to bind...",
  "prompt-preset-name": "Preset's name:",
  "reduce-animations": "Reduce UI animations",
  region: "Region",
  "reload-stream": "Reload stream",
  "remote-play": "Remote Play",
  rename: "Rename",
  renderer: "Renderer",
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
  settings: "Settings",
  "settings-reload": "Reload page to reflect changes",
  "settings-reloading": "Reloading...",
  sharpness: "Sharpness",
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
    (e) => `Format del control tàctil per ${e.name}`,
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
  "unsharp-masking": "Unsharp masking",
  "use-mouse-absolute-position": "Use mouse's absolute position",
  "user-agent-profile": "User-Agent profile",
  "vertical-scroll-sensitivity": "Vertical scroll sensitivity",
  "vertical-sensitivity": "Vertical sensitivity",
  "vibration-intensity": "Vibration intensity",
  "vibration-status": "Vibration",
  video: "Video",
  "virtual-controller": "Virtual controller",
  "visual-quality": "Visual quality",
  "visual-quality-high": "High",
  "visual-quality-low": "Low",
  "visual-quality-normal": "Normal",
  volume: "Volume",
  "wait-time-countdown": "Countdown",
  "wait-time-estimated": "Estimated finish time",
  webgl2: "WebGL2"
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
    Translations.#enUsIndex = Translations.#supportedLocales.indexOf(Translations.#EN_US), Translations.refreshCurrentLocale(), await Translations.#loadTranslations();
  }
  static refreshCurrentLocale() {
    const supportedLocales = Translations.#supportedLocales;
    let locale = localStorage.getItem(Translations.#KEY_LOCALE);
    if (!locale) {
      if (locale = window.navigator.language || Translations.#EN_US, supportedLocales.indexOf(locale) === -1)
        locale = Translations.#EN_US;
      localStorage.setItem(Translations.#KEY_LOCALE, locale);
    }
    Translations.#selectedLocale = locale, Translations.#selectedLocaleIndex = supportedLocales.indexOf(locale);
  }
  static get(key, values) {
    let text = null;
    if (Translations.#foreignTranslations && Translations.#selectedLocale !== Translations.#EN_US)
      text = Translations.#foreignTranslations[key];
    if (!text)
      text = Texts[key] || alert(`Missing translation key: ${key}`);
    let translation;
    if (Array.isArray(text))
      return translation = text[Translations.#selectedLocaleIndex] || text[Translations.#enUsIndex], translation(values);
    return translation = text, translation;
  }
  static async#loadTranslations() {
    if (Translations.#selectedLocale === Translations.#EN_US)
      return;
    try {
      Translations.#foreignTranslations = JSON.parse(window.localStorage.getItem(Translations.#KEY_TRANSLATIONS));
    } catch (e) {
    }
    if (!Translations.#foreignTranslations)
      await this.downloadTranslations(Translations.#selectedLocale);
  }
  static async updateTranslations(async = !1) {
    if (Translations.#selectedLocale === Translations.#EN_US)
      return;
    if (async)
      Translations.downloadTranslationsAsync(Translations.#selectedLocale);
    else
      await Translations.downloadTranslations(Translations.#selectedLocale);
  }
  static async downloadTranslations(locale) {
    try {
      const translations = await (await NATIVE_FETCH(`https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/translations/${locale}.json`)).json();
      if (localStorage.getItem(Translations.#KEY_LOCALE) === locale)
        window.localStorage.setItem(Translations.#KEY_TRANSLATIONS, JSON.stringify(translations)), Translations.#foreignTranslations = translations;
      return !0;
    } catch (e) {
      debugger;
    }
    return !1;
  }
  static downloadTranslationsAsync(locale) {
    NATIVE_FETCH(`https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/translations/${locale}.json`).then((resp) => resp.json()).then((translations) => {
      window.localStorage.setItem(Translations.#KEY_TRANSLATIONS, JSON.stringify(translations)), Translations.#foreignTranslations = translations;
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
      const label = setting.options[value], $option = CE("option", { value }, label);
      $control.appendChild($option);
    }
    return $control.value = currentValue, onChange && $control.addEventListener("input", (e) => {
      const target = e.target, value = setting.type && setting.type === "number" ? parseInt(target.value) : target.value;
      onChange(e, value);
    }), $control.setValue = (value) => {
      $control.value = value;
    }, $control;
  }
  static #renderMultipleOptions(key, setting, currentValue, onChange, params = {}) {
    const $control = CE("select", {
      title: setting.label,
      multiple: !0,
      tabindex: 0
    });
    if (params && params.size)
      $control.setAttribute("size", params.size.toString());
    for (let value in setting.multipleOptions) {
      const label = setting.multipleOptions[value], $option = CE("option", { value }, label);
      $option.selected = currentValue.indexOf(value) > -1, $option.addEventListener("mousedown", function(e) {
        e.preventDefault();
        const target = e.target;
        target.selected = !target.selected;
        const $parent = target.parentElement;
        $parent.focus(), $parent.dispatchEvent(new Event("input"));
      }), $control.appendChild($option);
    }
    return $control.addEventListener("mousedown", function(e) {
      const self = this, orgScrollTop = self.scrollTop;
      window.setTimeout(() => self.scrollTop = orgScrollTop, 0);
    }), $control.addEventListener("mousemove", (e) => e.preventDefault()), onChange && $control.addEventListener("input", (e) => {
      const target = e.target, values = Array.from(target.selectedOptions).map((i) => i.value);
      onChange(e, values);
    }), $control;
  }
  static #renderNumber(key, setting, currentValue, onChange) {
    const $control = CE("input", { tabindex: 0, type: "number", min: setting.min, max: setting.max });
    return $control.value = currentValue, onChange && $control.addEventListener("change", (e) => {
      const target = e.target, value = Math.max(setting.min, Math.min(setting.max, parseInt(target.value)));
      target.value = value.toString(), onChange(e, value);
    }), $control;
  }
  static #renderCheckbox(key, setting, currentValue, onChange) {
    const $control = CE("input", { type: "checkbox", tabindex: 0 });
    return $control.checked = currentValue, onChange && $control.addEventListener("change", (e) => {
      onChange(e, e.target.checked);
    }), $control;
  }
  static #renderNumberStepper(key, setting, value, onChange, options = {}) {
    options = options || {}, options.suffix = options.suffix || "", options.disabled = !!options.disabled, options.hideSlider = !!options.hideSlider;
    let $text, $btnDec, $btnInc, $range, controlValue = value;
    const { min: MIN, max: MAX } = setting, STEPS = Math.max(setting.steps || 1, 1), renderTextValue = (value2) => {
      value2 = parseInt(value2);
      let textContent = null;
      if (options.customTextValue)
        textContent = options.customTextValue(value2);
      if (textContent === null)
        textContent = value2.toString() + options.suffix;
      return textContent;
    }, updateButtonsVisibility = () => {
      $btnDec.classList.toggle("bx-hidden", controlValue === MIN), $btnInc.classList.toggle("bx-hidden", controlValue === MAX);
    }, $wrapper = CE("div", { class: "bx-number-stepper", id: `bx_setting_${key}` }, $btnDec = CE("button", {
      "data-type": "dec",
      type: "button",
      tabindex: -1
    }, "-"), $text = CE("span", {}, renderTextValue(value)), $btnInc = CE("button", {
      "data-type": "inc",
      type: "button",
      tabindex: -1
    }, "+"));
    if (!options.disabled && !options.hideSlider) {
      if ($range = CE("input", {
        id: `bx_setting_${key}`,
        type: "range",
        min: MIN,
        max: MAX,
        value,
        step: STEPS,
        tabindex: 0
      }), $range.addEventListener("input", (e) => {
        value = parseInt(e.target.value), controlValue = value, updateButtonsVisibility(), $text.textContent = renderTextValue(value), !e.ignoreOnChange && onChange && onChange(e, value);
      }), $wrapper.appendChild($range), options.ticks || options.exactTicks) {
        const markersId = `markers-${key}`, $markers = CE("datalist", { id: markersId });
        if ($range.setAttribute("list", markersId), options.exactTicks) {
          let start = Math.max(Math.floor(MIN / options.exactTicks), 1) * options.exactTicks;
          if (start === MIN)
            start += options.exactTicks;
          for (let i = start;i < MAX; i += options.exactTicks)
            $markers.appendChild(CE("option", { value: i }));
        } else
          for (let i = MIN + options.ticks;i < MAX; i += options.ticks)
            $markers.appendChild(CE("option", { value: i }));
        $wrapper.appendChild($markers);
      }
    }
    if (options.disabled)
      return $btnInc.disabled = !0, $btnInc.classList.add("bx-hidden"), $btnDec.disabled = !0, $btnDec.classList.add("bx-hidden"), $wrapper;
    updateButtonsVisibility();
    let interval, isHolding = !1;
    const onClick = (e) => {
      if (isHolding) {
        e.preventDefault(), isHolding = !1;
        return;
      }
      const $btn = e.target;
      let value2 = parseInt(controlValue);
      if ($btn.dataset.type === "dec")
        value2 = Math.max(MIN, value2 - STEPS);
      else
        value2 = Math.min(MAX, value2 + STEPS);
      controlValue = value2, updateButtonsVisibility(), $text.textContent = renderTextValue(value2), $range && ($range.value = value2.toString()), isHolding = !1, onChange && onChange(e, value2);
    }, onMouseDown = (e) => {
      e.preventDefault(), isHolding = !0;
      const args = arguments;
      interval && clearInterval(interval), interval = window.setInterval(() => {
        const event = new Event("click");
        event.arguments = args, e.target?.dispatchEvent(event);
      }, 200);
    }, onMouseUp = (e) => {
      e.preventDefault(), interval && clearInterval(interval), isHolding = !1;
    }, onContextMenu = (e) => e.preventDefault();
    return $wrapper.setValue = (value2) => {
      controlValue = parseInt(value2), $text.textContent = renderTextValue(value2), $range && ($range.value = value2);
    }, $btnDec.addEventListener("click", onClick), $btnDec.addEventListener("pointerdown", onMouseDown), $btnDec.addEventListener("pointerup", onMouseUp), $btnDec.addEventListener("contextmenu", onContextMenu), $btnInc.addEventListener("click", onClick), $btnInc.addEventListener("pointerdown", onMouseDown), $btnInc.addEventListener("pointerup", onMouseUp), $btnInc.addEventListener("contextmenu", onContextMenu), $wrapper;
  }
  static #METHOD_MAP = {
    [SettingElementType.OPTIONS]: SettingElement.#renderOptions,
    [SettingElementType.MULTIPLE_OPTIONS]: SettingElement.#renderMultipleOptions,
    [SettingElementType.NUMBER]: SettingElement.#renderNumber,
    [SettingElementType.NUMBER_STEPPER]: SettingElement.#renderNumberStepper,
    [SettingElementType.CHECKBOX]: SettingElement.#renderCheckbox
  };
  static render(type, key, setting, currentValue, onChange, options) {
    const method = SettingElement.#METHOD_MAP[type], $control = method(...Array.from(arguments).slice(1));
    if (type !== SettingElementType.NUMBER_STEPPER)
      $control.id = `bx_setting_${key}`;
    if (type === SettingElementType.OPTIONS || type === SettingElementType.MULTIPLE_OPTIONS)
      $control.name = $control.id;
    return $control;
  }
}

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
  static instance;
  static getInstance() {
    if (!StreamStats.instance)
      StreamStats.instance = new StreamStats;
    return StreamStats.instance;
  }
  #timeoutId;
  #updateInterval = 1000;
  #$container;
  #$fps;
  #$ping;
  #$dt;
  #$pl;
  #$fl;
  #$br;
  #lastVideoStat;
  #quickGlanceObserver;
  constructor() {
    this.#render();
  }
  start(glancing = !1) {
    if (!this.isHidden() || glancing && this.isGlancing())
      return;
    if (this.#$container)
      this.#$container.classList.remove("bx-gone"), this.#$container.dataset.display = glancing ? "glancing" : "fixed";
    this.#timeoutId = window.setTimeout(this.#update.bind(this), this.#updateInterval);
  }
  stop(glancing = !1) {
    if (glancing && !this.isGlancing())
      return;
    if (this.#timeoutId && clearTimeout(this.#timeoutId), this.#timeoutId = null, this.#lastVideoStat = null, this.#$container)
      this.#$container.removeAttribute("data-display"), this.#$container.classList.add("bx-gone");
  }
  toggle() {
    if (this.isGlancing())
      this.#$container && (this.#$container.dataset.display = "fixed");
    else
      this.isHidden() ? this.start() : this.stop();
  }
  onStoppedPlaying() {
    this.stop(), this.quickGlanceStop(), this.hideSettingsUi();
  }
  isHidden = () => this.#$container && this.#$container.classList.contains("bx-gone");
  isGlancing = () => this.#$container && this.#$container.dataset.display === "glancing";
  quickGlanceSetup() {
    if (!STATES.isPlaying || this.#quickGlanceObserver)
      return;
    const $uiContainer = document.querySelector("div[data-testid=ui-container]");
    if (!$uiContainer)
      return;
    this.#quickGlanceObserver = new MutationObserver((mutationList, observer) => {
      for (let record of mutationList)
        if (record.attributeName && record.attributeName === "aria-expanded")
          if (record.target.ariaExpanded === "true")
            this.isHidden() && this.start(!0);
          else
            this.stop(!0);
    }), this.#quickGlanceObserver.observe($uiContainer, {
      attributes: !0,
      attributeFilter: ["aria-expanded"],
      subtree: !0
    });
  }
  quickGlanceStop() {
    this.#quickGlanceObserver && this.#quickGlanceObserver.disconnect(), this.#quickGlanceObserver = null;
  }
  async#update() {
    if (this.isHidden() || !STATES.currentStream.peerConnection) {
      this.onStoppedPlaying();
      return;
    }
    this.#timeoutId = null;
    const startTime = performance.now(), PREF_STATS_CONDITIONAL_FORMATTING = getPref(PrefKey.STATS_CONDITIONAL_FORMATTING), stats = await STATES.currentStream.peerConnection.getStats();
    let grade = "";
    stats.forEach((stat) => {
      if (stat.type === "inbound-rtp" && stat.kind === "video") {
        this.#$fps.textContent = stat.framesPerSecond || 0;
        const { packetsLost, packetsReceived } = stat, packetsLostPercentage = (packetsLost * 100 / (packetsLost + packetsReceived || 1)).toFixed(2);
        this.#$pl.textContent = packetsLostPercentage === "0.00" ? packetsLost : `${packetsLost} (${packetsLostPercentage}%)`;
        const { framesDropped, framesReceived } = stat, framesDroppedPercentage = (framesDropped * 100 / (framesDropped + framesReceived || 1)).toFixed(2);
        if (this.#$fl.textContent = framesDroppedPercentage === "0.00" ? framesDropped : `${framesDropped} (${framesDroppedPercentage}%)`, !this.#lastVideoStat) {
          this.#lastVideoStat = stat;
          return;
        }
        const lastStat = this.#lastVideoStat, timeDiff = stat.timestamp - lastStat.timestamp, bitrate = 8 * (stat.bytesReceived - lastStat.bytesReceived) / timeDiff / 1000;
        this.#$br.textContent = `${bitrate.toFixed(2)} Mbps`;
        const totalDecodeTimeDiff = stat.totalDecodeTime - lastStat.totalDecodeTime, framesDecodedDiff = stat.framesDecoded - lastStat.framesDecoded, currentDecodeTime = totalDecodeTimeDiff / framesDecodedDiff * 1000;
        if (isNaN(currentDecodeTime))
          this.#$dt.textContent = "??ms";
        else
          this.#$dt.textContent = `${currentDecodeTime.toFixed(2)}ms`;
        if (PREF_STATS_CONDITIONAL_FORMATTING)
          grade = currentDecodeTime > 12 ? "bad" : currentDecodeTime > 9 ? "ok" : currentDecodeTime > 6 ? "good" : "", this.#$dt.dataset.grade = grade;
        this.#lastVideoStat = stat;
      } else if (stat.type === "candidate-pair" && stat.packetsReceived > 0 && stat.state === "succeeded") {
        const roundTripTime = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : -1;
        if (this.#$ping.textContent = roundTripTime === -1 ? "???" : roundTripTime.toString(), PREF_STATS_CONDITIONAL_FORMATTING)
          grade = roundTripTime > 100 ? "bad" : roundTripTime > 75 ? "ok" : roundTripTime > 40 ? "good" : "", this.#$ping.dataset.grade = grade;
      }
    });
    const lapsedTime = performance.now() - startTime;
    this.#timeoutId = window.setTimeout(this.#update.bind(this), this.#updateInterval - lapsedTime);
  }
  refreshStyles() {
    const PREF_ITEMS = getPref(PrefKey.STATS_ITEMS), PREF_POSITION = getPref(PrefKey.STATS_POSITION), PREF_TRANSPARENT = getPref(PrefKey.STATS_TRANSPARENT), PREF_OPACITY = getPref(PrefKey.STATS_OPACITY), PREF_TEXT_SIZE = getPref(PrefKey.STATS_TEXT_SIZE), $container = this.#$container;
    $container.dataset.stats = "[" + PREF_ITEMS.join("][") + "]", $container.dataset.position = PREF_POSITION, $container.dataset.transparent = PREF_TRANSPARENT, $container.style.opacity = PREF_OPACITY + "%", $container.style.fontSize = PREF_TEXT_SIZE;
  }
  hideSettingsUi() {
    if (this.isGlancing() && !getPref(PrefKey.STATS_QUICK_GLANCE))
      this.stop();
  }
  #render() {
    const stats = {
      [StreamStat.PING]: [t("stat-ping"), this.#$ping = CE("span", {}, "0")],
      [StreamStat.FPS]: [t("stat-fps"), this.#$fps = CE("span", {}, "0")],
      [StreamStat.BITRATE]: [t("stat-bitrate"), this.#$br = CE("span", {}, "0 Mbps")],
      [StreamStat.DECODE_TIME]: [t("stat-decode-time"), this.#$dt = CE("span", {}, "0ms")],
      [StreamStat.PACKETS_LOST]: [t("stat-packets-lost"), this.#$pl = CE("span", {}, "0")],
      [StreamStat.FRAMES_LOST]: [t("stat-frames-lost"), this.#$fl = CE("span", {}, "0")]
    }, $barFragment = document.createDocumentFragment();
    let statKey;
    for (statKey in stats) {
      const $div = CE("div", {
        class: `bx-stat-${statKey}`,
        title: stats[statKey][0]
      }, CE("label", {}, statKey.toUpperCase()), stats[statKey][1]);
      $barFragment.appendChild($div);
    }
    this.#$container = CE("div", { class: "bx-stats-bar bx-gone" }, $barFragment), this.refreshStyles(), document.documentElement.appendChild(this.#$container);
  }
  static setupEvents() {
    window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
      const PREF_STATS_QUICK_GLANCE = getPref(PrefKey.STATS_QUICK_GLANCE), PREF_STATS_SHOW_WHEN_PLAYING = getPref(PrefKey.STATS_SHOW_WHEN_PLAYING), streamStats = StreamStats.getInstance();
      if (PREF_STATS_SHOW_WHEN_PLAYING)
        streamStats.start();
      else if (PREF_STATS_QUICK_GLANCE)
        streamStats.quickGlanceSetup(), !PREF_STATS_SHOW_WHEN_PLAYING && streamStats.start(!0);
    });
  }
  static refreshStyles() {
    StreamStats.getInstance().refreshStyles();
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
  PrefKey2["NATIVE_MKB_ENABLED"] = "native_mkb_enabled";
  PrefKey2["NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY"] = "native_mkb_scroll_x_sensitivity";
  PrefKey2["NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY"] = "native_mkb_scroll_y_sensitivity";
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
  PrefKey2["VIDEO_PLAYER_TYPE"] = "video_player_type";
  PrefKey2["VIDEO_PROCESSING"] = "video_processing";
  PrefKey2["VIDEO_SHARPNESS"] = "video_sharpness";
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
        if (!("getCapabilities" in RTCRtpReceiver))
          return options;
        let hasLowCodec = !1, hasNormalCodec = !1, hasHighCodec = !1;
        const codecs = RTCRtpReceiver.getCapabilities("video").codecs;
        for (let codec of codecs) {
          if (codec.mimeType.toLowerCase() !== "video/h264" || !codec.sdpFmtpLine)
            continue;
          const fmtp = codec.sdpFmtpLine.toLowerCase();
          if (!hasHighCodec && fmtp.includes("profile-level-id=4d"))
            hasHighCodec = !0;
          else if (!hasNormalCodec && fmtp.includes("profile-level-id=42e"))
            hasNormalCodec = !0;
          else if (!hasLowCodec && fmtp.includes("profile-level-id=420"))
            hasLowCodec = !0;
        }
        if (hasHighCodec)
          if (!hasLowCodec && !hasNormalCodec)
            options.default = `${t("visual-quality-high")} (${t("default")})`;
          else
            options.high = t("visual-quality-high");
        if (hasNormalCodec)
          if (!hasLowCodec && !hasHighCodec)
            options.default = `${t("visual-quality-normal")} (${t("default")})`;
          else
            options.normal = t("visual-quality-normal");
        if (hasLowCodec)
          if (!hasNormalCodec && !hasHighCodec)
            options.default = `${t("visual-quality-low")} (${t("default")})`;
          else
            options.low = t("visual-quality-low");
        return options;
      })(),
      ready: (setting) => {
        const options = setting.options;
        if (Object.keys(options).length <= 1)
          setting.unsupported = !0, setting.note = "⚠️ " + t("browser-unsupported-feature");
      }
    },
    [PrefKey.PREFER_IPV6_SERVER]: {
      label: t("prefer-ipv6-server"),
      default: !1
    },
    [PrefKey.SCREENSHOT_APPLY_FILTERS]: {
      label: t("screenshot-apply-filters"),
      default: !1
    },
    [PrefKey.SKIP_SPLASH_VIDEO]: {
      label: t("skip-splash-video"),
      default: !1
    },
    [PrefKey.HIDE_DOTS_ICON]: {
      label: t("hide-system-menu-icon"),
      default: !1
    },
    [PrefKey.STREAM_COMBINE_SOURCES]: {
      label: t("combine-audio-video-streams"),
      default: !1,
      experimental: !0,
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
      unsupported: !STATES.userAgentHasTouchSupport,
      ready: (setting) => {
        if (setting.unsupported)
          setting.default = "default";
      }
    },
    [PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF]: {
      label: t("tc-auto-off"),
      default: !1,
      unsupported: !STATES.userAgentHasTouchSupport
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
        hideSlider: !0
      },
      unsupported: !STATES.userAgentHasTouchSupport
    },
    [PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD]: {
      label: t("tc-standard-layout-style"),
      default: "default",
      options: {
        default: t("default"),
        white: t("tc-all-white"),
        muted: t("tc-muted-colors")
      },
      unsupported: !STATES.userAgentHasTouchSupport
    },
    [PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM]: {
      label: t("tc-custom-layout-style"),
      default: "default",
      options: {
        default: t("default"),
        muted: t("tc-muted-colors")
      },
      unsupported: !STATES.userAgentHasTouchSupport
    },
    [PrefKey.STREAM_SIMPLIFY_MENU]: {
      label: t("simplify-stream-menu"),
      default: !1
    },
    [PrefKey.MKB_HIDE_IDLE_CURSOR]: {
      label: t("hide-idle-cursor"),
      default: !1
    },
    [PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG]: {
      label: t("disable-post-stream-feedback-dialog"),
      default: !1
    },
    [PrefKey.BITRATE_VIDEO_MAX]: {
      type: SettingElementType.NUMBER_STEPPER,
      label: t("bitrate-video-maximum"),
      note: "⚠️ " + t("unexpected-behavior"),
      default: 0,
      min: 0,
      max: 14336000,
      steps: 102400,
      params: {
        exactTicks: 5120000,
        customTextValue: (value) => {
          if (value = parseInt(value), value === 0)
            return t("unlimited");
          else
            return (value / 1024000).toFixed(1) + " Mb/s";
        }
      },
      migrate: function(savedPrefs, value) {
        try {
          if (value = parseInt(value), value !== 0 && value < 100)
            value *= 1024000;
          this.set(PrefKey.BITRATE_VIDEO_MAX, value, !0), savedPrefs[PrefKey.BITRATE_VIDEO_MAX] = value;
        } catch (e) {
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
      default: !1,
      note: CE("a", {
        href: "https://github.com/redphx/better-xcloud/discussions/275",
        target: "_blank"
      }, t("enable-local-co-op-support-note"))
    },
    [PrefKey.CONTROLLER_ENABLE_SHORTCUTS]: {
      default: !1
    },
    [PrefKey.CONTROLLER_ENABLE_VIBRATION]: {
      label: t("controller-vibration"),
      default: !0
    },
    [PrefKey.CONTROLLER_DEVICE_VIBRATION]: {
      label: t("device-vibration"),
      default: "off",
      options: {
        on: t("on"),
        auto: t("device-vibration-not-using-gamepad"),
        off: t("off")
      }
    },
    [PrefKey.CONTROLLER_VIBRATION_INTENSITY]: {
      label: t("vibration-intensity"),
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
      default: !1,
      unsupported: (() => {
        const userAgent2 = (window.navigator.orgUserAgent || window.navigator.userAgent || "").toLowerCase();
        return !AppInterface && userAgent2.match(/(android|iphone|ipad)/) ? t("browser-unsupported-feature") : !1;
      })(),
      ready: (setting) => {
        let note, url;
        if (setting.unsupported)
          note = t("browser-unsupported-feature"), url = "https://github.com/redphx/better-xcloud/issues/206#issuecomment-1920475657";
        else
          note = t("mkb-disclaimer"), url = "https://better-xcloud.github.io/mouse-and-keyboard/#disclaimer";
        setting.note = CE("a", {
          href: url,
          target: "_blank"
        }, "⚠️ " + note);
      }
    },
    [PrefKey.NATIVE_MKB_ENABLED]: {
      label: t("native-mkb"),
      default: "default",
      options: {
        default: t("default"),
        on: t("on"),
        off: t("off")
      },
      ready: (setting) => {
        if (AppInterface)
          ;
        else if (UserAgent.isMobile())
          setting.unsupported = !0, setting.default = "off", delete setting.options.default, delete setting.options.on;
        else
          delete setting.options.on;
      }
    },
    [PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY]: {
      label: t("horizontal-scroll-sensitivity"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 0,
      min: 0,
      max: 1e4,
      steps: 10,
      params: {
        exactTicks: 2000,
        customTextValue: (value) => {
          if (!value)
            return t("default");
          return (value / 100).toFixed(1) + "x";
        }
      }
    },
    [PrefKey.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY]: {
      label: t("vertical-scroll-sensitivity"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 0,
      min: 0,
      max: 1e4,
      steps: 10,
      params: {
        exactTicks: 2000,
        customTextValue: (value) => {
          if (!value)
            return t("default");
          return (value / 100).toFixed(1) + "x";
        }
      }
    },
    [PrefKey.MKB_DEFAULT_PRESET_ID]: {
      default: 0
    },
    [PrefKey.MKB_ABSOLUTE_MOUSE]: {
      default: !1
    },
    [PrefKey.REDUCE_ANIMATIONS]: {
      label: t("reduce-animations"),
      default: !1
    },
    [PrefKey.UI_LOADING_SCREEN_GAME_ART]: {
      label: t("show-game-art"),
      default: !0
    },
    [PrefKey.UI_LOADING_SCREEN_WAIT_TIME]: {
      label: t("show-wait-time"),
      default: !0
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
      default: !1
    },
    [PrefKey.UI_HOME_CONTEXT_MENU_DISABLED]: {
      label: t("disable-home-context-menu"),
      default: STATES.browserHasTouchSupport
    },
    [PrefKey.BLOCK_SOCIAL_FEATURES]: {
      label: t("disable-social-features"),
      default: !1
    },
    [PrefKey.BLOCK_TRACKING]: {
      label: t("disable-xcloud-analytics"),
      default: !1
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
        [UserAgentProfile.CUSTOM]: t("custom")
      }
    },
    [PrefKey.VIDEO_PLAYER_TYPE]: {
      label: t("renderer"),
      default: "default",
      options: {
        [StreamPlayerType.VIDEO]: t("default"),
        [StreamPlayerType.WEBGL2]: t("webgl2")
      }
    },
    [PrefKey.VIDEO_PROCESSING]: {
      label: t("clarity-boost"),
      default: StreamVideoProcessing.USM,
      options: {
        [StreamVideoProcessing.USM]: t("unsharp-masking"),
        [StreamVideoProcessing.CAS]: t("amd-fidelity-cas")
      }
    },
    [PrefKey.VIDEO_SHARPNESS]: {
      label: t("sharpness"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 0,
      min: 0,
      max: 10,
      params: {
        hideSlider: !0,
        customTextValue: (value) => {
          return value = parseInt(value), value === 0 ? t("off") : value.toString();
        }
      }
    },
    [PrefKey.VIDEO_RATIO]: {
      label: t("aspect-ratio"),
      note: t("aspect-ratio-note"),
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
      label: t("saturation"),
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
      label: t("contrast"),
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
      label: t("brightness"),
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
      default: !1
    },
    [PrefKey.AUDIO_ENABLE_VOLUME_CONTROL]: {
      label: t("enable-volume-control"),
      default: !1
    },
    [PrefKey.AUDIO_VOLUME]: {
      label: t("volume"),
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
      label: t("stats"),
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
      label: t("show-stats-on-startup"),
      default: !1
    },
    [PrefKey.STATS_QUICK_GLANCE]: {
      label: "👀 " + t("enable-quick-glance-mode"),
      default: !0
    },
    [PrefKey.STATS_POSITION]: {
      label: t("position"),
      default: "top-right",
      options: {
        "top-left": t("top-left"),
        "top-center": t("top-center"),
        "top-right": t("top-right")
      }
    },
    [PrefKey.STATS_TEXT_SIZE]: {
      label: t("text-size"),
      default: "0.9rem",
      options: {
        "0.9rem": t("small"),
        "1.0rem": t("normal"),
        "1.1rem": t("large")
      }
    },
    [PrefKey.STATS_TRANSPARENT]: {
      label: t("transparent-background"),
      default: !1
    },
    [PrefKey.STATS_OPACITY]: {
      label: t("opacity"),
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
      label: t("conditional-formatting"),
      default: !1
    },
    [PrefKey.REMOTE_PLAY_ENABLED]: {
      label: t("enable-remote-play-feature"),
      default: !1
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
      default: !1,
      note: t("fortnite-allow-stw-mode")
    }
  };
  #storage = localStorage;
  #key = "better_xcloud";
  #prefs = {};
  constructor() {
    let savedPrefsStr = this.#storage.getItem(this.#key);
    if (savedPrefsStr == null)
      savedPrefsStr = "{}";
    const savedPrefs = JSON.parse(savedPrefsStr);
    for (let settingId in Preferences.SETTINGS) {
      const setting = Preferences.SETTINGS[settingId];
      if (setting.migrate && settingId in savedPrefs)
        setting.migrate.call(this, savedPrefs, savedPrefs[settingId]);
      setting.ready && setting.ready.call(this, setting);
    }
    for (let settingId in Preferences.SETTINGS) {
      const setting = Preferences.SETTINGS[settingId];
      if (!setting) {
        alert(`Undefined setting key: ${settingId}`), console.log("Undefined setting key");
        continue;
      }
      if (setting.migrate)
        continue;
      if (settingId in savedPrefs)
        this.#prefs[settingId] = this.#validateValue(settingId, savedPrefs[settingId]);
      else
        this.#prefs[settingId] = setting.default;
    }
  }
  #validateValue(key, value) {
    const config = Preferences.SETTINGS[key];
    if (!config)
      return value;
    if (typeof value === "undefined" || value === null)
      value = config.default;
    if ("min" in config)
      value = Math.max(config.min, value);
    if ("max" in config)
      value = Math.min(config.max, value);
    if ("options" in config && !(value in config.options))
      value = config.default;
    else if ("multipleOptions" in config) {
      if (value.length) {
        const validOptions = Object.keys(config.multipleOptions);
        value.forEach((item2, idx) => {
          validOptions.indexOf(item2) === -1 && value.splice(idx, 1);
        });
      }
      if (!value.length)
        value = config.default;
    }
    return value;
  }
  get(key) {
    if (typeof key === "undefined") {
      debugger;
      return;
    }
    if (Preferences.SETTINGS[key].unsupported)
      return Preferences.SETTINGS[key].default;
    if (!(key in this.#prefs))
      this.#prefs[key] = this.#validateValue(key, null);
    return this.#prefs[key];
  }
  set(key, value, skipSave) {
    return value = this.#validateValue(key, value), this.#prefs[key] = value, !skipSave && this.#updateStorage(), value;
  }
  #updateStorage() {
    this.#storage.setItem(this.#key, JSON.stringify(this.#prefs));
  }
  toElement(key, onChange, overrideParams = {}) {
    const setting = Preferences.SETTINGS[key];
    let currentValue = this.get(key), type;
    if ("type" in setting)
      type = setting.type;
    else if ("options" in setting)
      type = SettingElementType.OPTIONS;
    else if ("multipleOptions" in setting)
      type = SettingElementType.MULTIPLE_OPTIONS;
    else if (typeof setting.default === "number")
      type = SettingElementType.NUMBER;
    else
      type = SettingElementType.CHECKBOX;
    const params = Object.assign(overrideParams, setting.params || {});
    if (params.disabled)
      currentValue = Preferences.SETTINGS[key].default;
    return SettingElement.render(type, key, setting, currentValue, (e, value) => {
      this.set(key, value), onChange && onChange(e, value);
    }, params);
  }
  toNumberStepper(key, onChange, options = {}) {
    return SettingElement.render(SettingElementType.NUMBER_STEPPER, key, Preferences.SETTINGS[key], this.get(key), (e, value) => {
      this.set(key, value), onChange && onChange(e, value);
    }, options);
  }
}
var prefs = new Preferences, getPref = prefs.get.bind(prefs), setPref = prefs.set.bind(prefs), toPrefElement = prefs.toElement.bind(prefs);

// src/utils/screenshot.ts
class Screenshot {
  static #$canvas;
  static #canvasContext;
  static setup() {
    if (Screenshot.#$canvas)
      return;
    Screenshot.#$canvas = CE("canvas", { class: "bx-gone" }), Screenshot.#canvasContext = Screenshot.#$canvas.getContext("2d", {
      alpha: !1,
      willReadFrequently: !1
    });
  }
  static updateCanvasSize(width, height) {
    const $canvas = Screenshot.#$canvas;
    if ($canvas)
      $canvas.width = width, $canvas.height = height;
  }
  static updateCanvasFilters(filters) {
    Screenshot.#canvasContext.filter = filters;
  }
  static #onAnimationEnd(e) {
    e.target.classList.remove("bx-taking-screenshot");
  }
  static takeScreenshot(callback) {
    const currentStream = STATES.currentStream, streamPlayer = currentStream.streamPlayer, $canvas = Screenshot.#$canvas;
    if (!streamPlayer || !$canvas)
      return;
    let $player;
    if (getPref(PrefKey.SCREENSHOT_APPLY_FILTERS))
      $player = streamPlayer.getPlayerElement();
    else
      $player = streamPlayer.getPlayerElement(StreamPlayerType.VIDEO);
    if (!$player || !$player.isConnected)
      return;
    $player.parentElement.addEventListener("animationend", this.#onAnimationEnd), $player.parentElement.classList.add("bx-taking-screenshot");
    const canvasContext = Screenshot.#canvasContext;
    if ($player instanceof HTMLCanvasElement)
      streamPlayer.getWebGL2Player().drawFrame();
    if (canvasContext.drawImage($player, 0, 0, $canvas.width, $canvas.height), AppInterface) {
      const data = $canvas.toDataURL("image/png").split(";base64,")[1];
      AppInterface.saveScreenshot(currentStream.titleId, data), canvasContext.clearRect(0, 0, $canvas.width, $canvas.height), callback && callback();
      return;
    }
    $canvas && $canvas.toBlob((blob) => {
      const now = +new Date, $anchor = CE("a", {
        download: `${currentStream.titleId}-${now}.png`,
        href: URL.createObjectURL(blob)
      });
      $anchor.click(), URL.revokeObjectURL($anchor.href), canvasContext.clearRect(0, 0, $canvas.width, $canvas.height), callback && callback();
    }, "image/png");
  }
}

// src/enums/prompt-font.ts
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

// src/enums/mkb.ts
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
}, GamepadStick;
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
})(MkbPresetKey || (MkbPresetKey = {}));

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
      max: 300,
      params: {
        suffix: "%",
        exactTicks: 50
      }
    },
    [MkbPresetKey.MOUSE_SENSITIVITY_X]: {
      label: t("vertical-sensitivity"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 50,
      min: 1,
      max: 300,
      params: {
        suffix: "%",
        exactTicks: 50
      }
    },
    [MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT]: {
      label: t("deadzone-counterweight"),
      type: SettingElementType.NUMBER_STEPPER,
      default: 20,
      min: 1,
      max: 50,
      params: {
        suffix: "%",
        exactTicks: 10
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
      [MkbPresetKey.MOUSE_SENSITIVITY_X]: 100,
      [MkbPresetKey.MOUSE_SENSITIVITY_Y]: 100,
      [MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT]: 20
    }
  };
  static convert(preset) {
    const obj = {
      mapping: {},
      mouse: Object.assign({}, preset.mouse)
    };
    for (let buttonIndex in preset.mapping)
      for (let keyName of preset.mapping[parseInt(buttonIndex)])
        obj.mapping[keyName] = parseInt(buttonIndex);
    const mouse = obj.mouse;
    mouse[MkbPresetKey.MOUSE_SENSITIVITY_X] *= EmulatedMkbHandler.DEFAULT_PANNING_SENSITIVITY, mouse[MkbPresetKey.MOUSE_SENSITIVITY_Y] *= EmulatedMkbHandler.DEFAULT_PANNING_SENSITIVITY, mouse[MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT] *= EmulatedMkbHandler.DEFAULT_DEADZONE_COUNTERWEIGHT;
    const mouseMapTo = MouseMapTo[mouse[MkbPresetKey.MOUSE_MAP_TO]];
    if (typeof mouseMapTo !== "undefined")
      mouse[MkbPresetKey.MOUSE_MAP_TO] = mouseMapTo;
    else
      mouse[MkbPresetKey.MOUSE_MAP_TO] = MkbPreset.MOUSE_SETTINGS[MkbPresetKey.MOUSE_MAP_TO].default;
    return console.log(obj), obj;
  }
}

// src/utils/toast.ts
class Toast {
  static #$wrapper;
  static #$msg;
  static #$status;
  static #stack = [];
  static #isShowing = !1;
  static #timeout;
  static #DURATION = 3000;
  static show(msg, status, options = {}) {
    options = options || {};
    const args = Array.from(arguments);
    if (options.instant)
      Toast.#stack = [args], Toast.#showNext();
    else
      Toast.#stack.push(args), !Toast.#isShowing && Toast.#showNext();
  }
  static #showNext() {
    if (!Toast.#stack.length) {
      Toast.#isShowing = !1;
      return;
    }
    Toast.#isShowing = !0, Toast.#timeout && clearTimeout(Toast.#timeout), Toast.#timeout = window.setTimeout(Toast.#hide, Toast.#DURATION);
    const [msg, status, options] = Toast.#stack.shift();
    if (options && options.html)
      Toast.#$msg.innerHTML = msg;
    else
      Toast.#$msg.textContent = msg;
    if (status)
      Toast.#$status.classList.remove("bx-gone"), Toast.#$status.textContent = status;
    else
      Toast.#$status.classList.add("bx-gone");
    const classList = Toast.#$wrapper.classList;
    classList.remove("bx-offscreen", "bx-hide"), classList.add("bx-show");
  }
  static #hide() {
    Toast.#timeout = null;
    const classList = Toast.#$wrapper.classList;
    classList.remove("bx-show"), classList.add("bx-hide");
  }
  static setup() {
    Toast.#$wrapper = CE("div", { class: "bx-toast bx-offscreen" }, Toast.#$msg = CE("span", { class: "bx-toast-msg" }), Toast.#$status = CE("span", { class: "bx-toast-status" })), Toast.#$wrapper.addEventListener("transitionend", (e) => {
      const classList = Toast.#$wrapper.classList;
      if (classList.contains("bx-hide"))
        classList.remove("bx-offscreen", "bx-hide"), classList.add("bx-offscreen"), Toast.#showNext();
    }), document.documentElement.appendChild(Toast.#$wrapper);
  }
}

// src/utils/local-db.ts
class LocalDb {
  static #instance;
  static get INSTANCE() {
    if (!LocalDb.#instance)
      LocalDb.#instance = new LocalDb;
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
            db.createObjectStore(LocalDb.TABLE_PRESETS, { keyPath: "id", autoIncrement: !0 }).createIndex("name_idx", "name");
            break;
          }
        }
      }, request.onerror = (e) => {
        console.log(e), alert(e.target.error.message), reject && reject();
      }, request.onsuccess = (e) => {
        this.#DB = e.target.result, resolve();
      };
    });
  }
  #table(name, type) {
    const table = this.#DB.transaction(name, type || "readonly").objectStore(name);
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
      if (count > 0)
        return new Promise((resolve) => {
          this.#getAll(table).then(([table2, items]) => {
            const presets = {};
            items.forEach((item2) => presets[item2.id] = item2), resolve(presets);
          });
        });
      const preset = {
        name: t("default"),
        data: MkbPreset.DEFAULT_PRESET
      };
      return new Promise((resolve) => {
        this.#add(table, preset).then(([table2, id2]) => {
          preset.id = id2, setPref(PrefKey.MKB_DEFAULT_PRESET_ID, id2), resolve({ [id2]: preset });
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
    let code, name;
    if (e instanceof KeyboardEvent)
      code = e.code || e.key;
    else if (e instanceof WheelEvent) {
      if (e.deltaY < 0)
        code = WheelCode.SCROLL_UP;
      else if (e.deltaY > 0)
        code = WheelCode.SCROLL_DOWN;
      else if (e.deltaX < 0)
        code = WheelCode.SCROLL_LEFT;
      else if (e.deltaX > 0)
        code = WheelCode.SCROLL_RIGHT;
    } else if (e instanceof MouseEvent)
      code = "Mouse" + e.button;
    if (code)
      name = KeyHelper.codeToKeyName(code);
    return code ? { code, name } : null;
  }
  static codeToKeyName(code) {
    return KeyHelper.#NON_PRINTABLE_KEYS[code] || code.startsWith("Key") && code.substring(3) || code.startsWith("Digit") && code.substring(5) || code.startsWith("Numpad") && "Numpad " + code.substring(6) || code.startsWith("Arrow") && "Arrow " + code.substring(5) || code.endsWith("Lock") && code.replace("Lock", " Lock") || code.endsWith("Left") && "Left " + code.replace("Left", "") || code.endsWith("Right") && "Right " + code.replace("Right", "") || code;
  }
}

// src/modules/mkb/pointer-client.ts
var LOG_TAG = "PointerClient", PointerAction;
(function(PointerAction2) {
  PointerAction2[PointerAction2["MOVE"] = 1] = "MOVE";
  PointerAction2[PointerAction2["BUTTON_PRESS"] = 2] = "BUTTON_PRESS";
  PointerAction2[PointerAction2["BUTTON_RELEASE"] = 3] = "BUTTON_RELEASE";
  PointerAction2[PointerAction2["SCROLL"] = 4] = "SCROLL";
  PointerAction2[PointerAction2["POINTER_CAPTURE_CHANGED"] = 5] = "POINTER_CAPTURE_CHANGED";
})(PointerAction || (PointerAction = {}));

class PointerClient {
  static instance;
  static getInstance() {
    if (!PointerClient.instance)
      PointerClient.instance = new PointerClient;
    return PointerClient.instance;
  }
  #socket;
  #mkbHandler;
  start(port, mkbHandler) {
    if (!port)
      throw new Error("PointerServer port is 0");
    this.#mkbHandler = mkbHandler, this.#socket = new WebSocket(`ws://localhost:${port}`), this.#socket.binaryType = "arraybuffer", this.#socket.addEventListener("open", (event) => {
      BxLogger.info(LOG_TAG, "connected");
    }), this.#socket.addEventListener("error", (event) => {
      BxLogger.error(LOG_TAG, event), Toast.show("Cannot setup mouse: " + event);
    }), this.#socket.addEventListener("close", (event) => {
      this.#socket = null;
    }), this.#socket.addEventListener("message", (event) => {
      const dataView = new DataView(event.data);
      let messageType = dataView.getInt8(0), offset = Int8Array.BYTES_PER_ELEMENT;
      switch (messageType) {
        case PointerAction.MOVE:
          this.onMove(dataView, offset);
          break;
        case PointerAction.BUTTON_PRESS:
        case PointerAction.BUTTON_RELEASE:
          this.onPress(messageType, dataView, offset);
          break;
        case PointerAction.SCROLL:
          this.onScroll(dataView, offset);
          break;
        case PointerAction.POINTER_CAPTURE_CHANGED:
          this.onPointerCaptureChanged(dataView, offset);
      }
    });
  }
  onMove(dataView, offset) {
    const x = dataView.getInt16(offset);
    offset += Int16Array.BYTES_PER_ELEMENT;
    const y = dataView.getInt16(offset);
    this.#mkbHandler?.handleMouseMove({
      movementX: x,
      movementY: y
    });
  }
  onPress(messageType, dataView, offset) {
    const button = dataView.getUint8(offset);
    this.#mkbHandler?.handleMouseClick({
      pointerButton: button,
      pressed: messageType === PointerAction.BUTTON_PRESS
    });
  }
  onScroll(dataView, offset) {
    const vScroll = dataView.getInt16(offset);
    offset += Int16Array.BYTES_PER_ELEMENT;
    const hScroll = dataView.getInt16(offset);
    this.#mkbHandler?.handleMouseWheel({
      vertical: vScroll,
      horizontal: hScroll
    });
  }
  onPointerCaptureChanged(dataView, offset) {
    dataView.getInt8(offset) !== 1 && this.#mkbHandler?.stop();
  }
  stop() {
    try {
      this.#socket?.close();
    } catch (e) {
    }
    this.#socket = null;
  }
}

// src/modules/mkb/base-mkb-handler.ts
class MouseDataProvider {
  mkbHandler;
  constructor(handler) {
    this.mkbHandler = handler;
  }
}

class MkbHandler {
}

// src/modules/mkb/native-mkb-handler.ts
class NativeMkbHandler extends MkbHandler {
  static instance;
  #pointerClient;
  #enabled = !1;
  #mouseButtonsPressed = 0;
  #mouseWheelX = 0;
  #mouseWheelY = 0;
  #mouseVerticalMultiply = 0;
  #mouseHorizontalMultiply = 0;
  #inputSink;
  #$message;
  static getInstance() {
    if (!NativeMkbHandler.instance)
      NativeMkbHandler.instance = new NativeMkbHandler;
    return NativeMkbHandler.instance;
  }
  #onKeyboardEvent(e) {
    if (e.type === "keyup" && e.code === "F8") {
      e.preventDefault(), this.toggle();
      return;
    }
  }
  #onPointerLockRequested(e) {
    AppInterface.requestPointerCapture(), this.start();
  }
  #onPointerLockExited(e) {
    AppInterface.releasePointerCapture(), this.stop();
  }
  #onPollingModeChanged = (e) => {
    if (!this.#$message)
      return;
    if (e.mode === "None")
      this.#$message.classList.remove("bx-offscreen");
    else
      this.#$message.classList.add("bx-offscreen");
  };
  #onDialogShown = () => {
    document.pointerLockElement && document.exitPointerLock();
  };
  #initMessage() {
    if (!this.#$message)
      this.#$message = CE("div", { class: "bx-mkb-pointer-lock-msg" }, CE("div", {}, CE("p", {}, t("native-mkb")), CE("p", {}, t("press-key-to-toggle-mkb", { key: "F8" }))), CE("div", { "data-type": "native" }, createButton({
        style: ButtonStyle.PRIMARY | ButtonStyle.FULL_WIDTH | ButtonStyle.TALL,
        label: t("activate"),
        onClick: ((e) => {
          e.preventDefault(), e.stopPropagation(), this.toggle(!0);
        }).bind(this)
      }), createButton({
        style: ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH,
        label: t("ignore"),
        onClick: (e) => {
          e.preventDefault(), e.stopPropagation(), this.#$message?.classList.add("bx-gone");
        }
      })));
    if (!this.#$message.isConnected)
      document.documentElement.appendChild(this.#$message);
  }
  handleEvent(event) {
    switch (event.type) {
      case "keyup":
        this.#onKeyboardEvent(event);
        break;
      case BxEvent.XCLOUD_DIALOG_SHOWN:
        this.#onDialogShown();
        break;
      case BxEvent.POINTER_LOCK_REQUESTED:
        this.#onPointerLockRequested(event);
        break;
      case BxEvent.POINTER_LOCK_EXITED:
        this.#onPointerLockExited(event);
        break;
      case BxEvent.XCLOUD_POLLING_MODE_CHANGED:
        this.#onPollingModeChanged(event);
        break;
    }
  }
  init() {
    this.#pointerClient = PointerClient.getInstance(), this.#inputSink = window.BX_EXPOSED.inputSink, this.#updateInputConfigurationAsync(!1);
    try {
      this.#pointerClient.start(STATES.pointerServerPort, this);
    } catch (e) {
      Toast.show("Cannot enable Mouse & Keyboard feature");
    }
    if (this.#mouseVerticalMultiply = getPref(PrefKey.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY), this.#mouseHorizontalMultiply = getPref(PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY), window.addEventListener("keyup", this), window.addEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this), window.addEventListener(BxEvent.POINTER_LOCK_REQUESTED, this), window.addEventListener(BxEvent.POINTER_LOCK_EXITED, this), window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this), this.#initMessage(), AppInterface)
      Toast.show(t("press-key-to-toggle-mkb", { key: "<b>F8</b>" }), t("native-mkb"), { html: !0 }), this.#$message?.classList.add("bx-gone");
    else
      this.#$message?.classList.remove("bx-gone");
  }
  toggle(force) {
    let setEnable;
    if (typeof force !== "undefined")
      setEnable = force;
    else
      setEnable = !this.#enabled;
    if (setEnable)
      document.documentElement.requestPointerLock();
    else
      document.exitPointerLock();
  }
  #updateInputConfigurationAsync(enabled) {
    window.BX_EXPOSED.streamSession.updateInputConfigurationAsync({
      enableKeyboardInput: enabled,
      enableMouseInput: enabled,
      enableAbsoluteMouse: !1,
      enableTouchInput: !1
    });
  }
  start() {
    this.#resetMouseInput(), this.#enabled = !0, this.#updateInputConfigurationAsync(!0), window.BX_EXPOSED.stopTakRendering = !0, this.#$message?.classList.add("bx-gone"), Toast.show(t("native-mkb"), t("enabled"), { instant: !0 });
  }
  stop() {
    this.#resetMouseInput(), this.#enabled = !1, this.#updateInputConfigurationAsync(!1), this.#$message?.classList.remove("bx-gone");
  }
  destroy() {
    this.#pointerClient?.stop(), window.removeEventListener("keyup", this), window.removeEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this), window.removeEventListener(BxEvent.POINTER_LOCK_REQUESTED, this), window.removeEventListener(BxEvent.POINTER_LOCK_EXITED, this), window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this), this.#$message?.classList.add("bx-gone");
  }
  handleMouseMove(data) {
    this.#sendMouseInput({
      X: data.movementX,
      Y: data.movementY,
      Buttons: this.#mouseButtonsPressed,
      WheelX: this.#mouseWheelX,
      WheelY: this.#mouseWheelY
    });
  }
  handleMouseClick(data) {
    const { pointerButton, pressed } = data;
    if (pressed)
      this.#mouseButtonsPressed |= pointerButton;
    else
      this.#mouseButtonsPressed ^= pointerButton;
    this.#mouseButtonsPressed = Math.max(0, this.#mouseButtonsPressed), this.#sendMouseInput({
      X: 0,
      Y: 0,
      Buttons: this.#mouseButtonsPressed,
      WheelX: this.#mouseWheelX,
      WheelY: this.#mouseWheelY
    });
  }
  handleMouseWheel(data) {
    const { vertical, horizontal } = data;
    if (this.#mouseWheelX = horizontal, this.#mouseHorizontalMultiply && this.#mouseHorizontalMultiply !== 1)
      this.#mouseWheelX *= this.#mouseHorizontalMultiply;
    if (this.#mouseWheelY = vertical, this.#mouseVerticalMultiply && this.#mouseVerticalMultiply !== 1)
      this.#mouseWheelY *= this.#mouseVerticalMultiply;
    return this.#sendMouseInput({
      X: 0,
      Y: 0,
      Buttons: this.#mouseButtonsPressed,
      WheelX: this.#mouseWheelX,
      WheelY: this.#mouseWheelY
    }), !0;
  }
  setVerticalScrollMultiplier(vertical) {
    this.#mouseVerticalMultiply = vertical;
  }
  setHorizontalScrollMultiplier(horizontal) {
    this.#mouseHorizontalMultiply = horizontal;
  }
  waitForMouseData(enabled) {
  }
  isEnabled() {
    return this.#enabled;
  }
  #sendMouseInput(data) {
    data.Type = 0, this.#inputSink?.onMouseInput(data);
  }
  #resetMouseInput() {
    this.#mouseButtonsPressed = 0, this.#mouseWheelX = 0, this.#mouseWheelY = 0, this.#sendMouseInput({
      X: 0,
      Y: 0,
      Buttons: 0,
      WheelX: 0,
      WheelY: 0
    });
  }
}

// src/assets/svg/command.svg
var command_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M25.425 1.5c2.784 0 5.075 2.291 5.075 5.075s-2.291 5.075-5.075 5.075H20.35V6.575c0-2.784 2.291-5.075 5.075-5.075zM11.65 11.65H6.575C3.791 11.65 1.5 9.359 1.5 6.575S3.791 1.5 6.575 1.5s5.075 2.291 5.075 5.075v5.075zm8.7 8.7h5.075c2.784 0 5.075 2.291 5.075 5.075S28.209 30.5 25.425 30.5s-5.075-2.291-5.075-5.075V20.35zM6.575 30.5c-2.784 0-5.075-2.291-5.075-5.075s2.291-5.075 5.075-5.075h5.075v5.075c0 2.784-2.291 5.075-5.075 5.075z'/>\n    <path d='M11.65 11.65h8.7v8.7h-8.7z'/>\n</svg>\n";

// src/assets/svg/controller.svg
var controller_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M19.193 12.807h3.193m-13.836 0h4.257'/><path d='M10.678 10.678v4.257'/><path d='M13.061 19.193l-5.602 6.359c-.698.698-1.646 1.09-2.633 1.09-2.044 0-3.725-1.682-3.725-3.725a3.73 3.73 0 0 1 .056-.646l2.177-11.194a6.94 6.94 0 0 1 6.799-5.721h11.722c3.795 0 6.918 3.123 6.918 6.918s-3.123 6.918-6.918 6.918h-8.793z'/><path d='M18.939 19.193l5.602 6.359c.698.698 1.646 1.09 2.633 1.09 2.044 0 3.725-1.682 3.725-3.725a3.73 3.73 0 0 0-.056-.646l-2.177-11.194'/>\n</svg>\n";

// src/assets/svg/copy.svg
var copy_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M1.498 6.772h23.73v23.73H1.498zm5.274-5.274h23.73v23.73'/>\n</svg>\n";

// src/assets/svg/cursor-text.svg
var cursor_text_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M16 7.3a5.83 5.83 0 0 1 5.8-5.8h2.9m0 29h-2.9a5.83 5.83 0 0 1-5.8-5.8'/><path d='M7.3 30.5h2.9a5.83 5.83 0 0 0 5.8-5.8V7.3a5.83 5.83 0 0 0-5.8-5.8H7.3'/><path d='M11.65 16h8.7'/>\n</svg>\n";

// src/assets/svg/display.svg
var display_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M1.238 21.119c0 1.928 1.565 3.493 3.493 3.493H27.27c1.928 0 3.493-1.565 3.493-3.493V5.961c0-1.928-1.565-3.493-3.493-3.493H4.731c-1.928 0-3.493 1.565-3.493 3.493v15.158zm19.683 8.413H11.08'/>\n</svg>\n";

// src/assets/svg/home.svg
var home_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M12.217 30.503V20.414h7.567v10.089h10.089V15.37a1.26 1.26 0 0 0-.369-.892L16.892 1.867a1.26 1.26 0 0 0-1.784 0L2.497 14.478a1.26 1.26 0 0 0-.369.892v15.133h10.089z'/>\n</svg>\n";

// src/assets/svg/native-mkb.svg
var native_mkb_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g stroke-width=\"2.1\">\n        <path d=\"m15.817 6h-10.604c-2.215 0-4.013 1.798-4.013 4.013v12.213c0 2.215 1.798 4.013 4.013 4.013h11.21\"/>\n        <path d=\"m5.698 20.617h1.124m-1.124-4.517h7.9m-7.881-4.5h7.9m-2.3 9h2.2\"/>\n    </g>\n    <g stroke-width=\"2.13\">\n        <path d=\"m30.805 13.1c0-3.919-3.181-7.1-7.1-7.1s-7.1 3.181-7.1 7.1v6.4c0 3.919 3.182 7.1 7.1 7.1s7.1-3.181 7.1-7.1z\"/>\n        <path d=\"m23.705 14.715v-4.753\"/>\n    </g>\n</svg>\n";

// src/assets/svg/new.svg
var new_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M26.875 30.5H5.125c-.663 0-1.208-.545-1.208-1.208V2.708c0-.663.545-1.208 1.208-1.208h14.5l8.458 8.458v19.333c0 .663-.545 1.208-1.208 1.208z'/><path d='M19.625 1.5v8.458h8.458m-15.708 9.667h7.25'/><path d='M16 16v7.25'/>\n</svg>\n";

// src/assets/svg/question.svg
var question_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <g transform='matrix(.256867 0 0 .256867 -16.878964 -18.049342)'><circle cx='128' cy='180' r='12' fill='#fff'/><path d='M128 144v-8c17.67 0 32-12.54 32-28s-14.33-28-32-28-32 12.54-32 28v4' fill='none' stroke='#fff' stroke-width='16'/></g>\n</svg>\n";

// src/assets/svg/refresh.svg
var refresh_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M23.247 12.377h7.247V5.13'/><path d='M23.911 25.663a13.29 13.29 0 0 1-9.119 3.623C7.504 29.286 1.506 23.289 1.506 16S7.504 2.713 14.792 2.713a13.29 13.29 0 0 1 9.395 3.891l6.307 5.772'/>\n</svg>\n";

// src/assets/svg/remote-play.svg
var remote_play_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <g transform='matrix(.492308 0 0 .581818 -14.7692 -11.6364)'><clipPath id='A'><path d='M30 20h65v55H30z'/></clipPath><g clip-path='url(#A)'><g transform='matrix(.395211 0 0 .334409 11.913 7.01124)'><g transform='matrix(.555556 0 0 .555556 57.8889 -20.2417)' fill='none' stroke='#fff' stroke-width='13.88'><path d='M200 140.564c-42.045-33.285-101.955-33.285-144 0M168 165c-23.783-17.3-56.217-17.3-80 0'/></g><g transform='matrix(-.555556 0 0 -.555556 200.111 262.393)'><g transform='matrix(1 0 0 1 0 11.5642)'><path d='M200 129c-17.342-13.728-37.723-21.795-58.636-24.198C111.574 101.378 80.703 109.444 56 129' fill='none' stroke='#fff' stroke-width='13.88'/></g><path d='M168 165c-23.783-17.3-56.217-17.3-80 0' fill='none' stroke='#fff' stroke-width='13.88'/></g><g transform='matrix(.75 0 0 .75 32 32)'><path d='M24 72h208v93.881H24z' fill='none' stroke='#fff' stroke-linejoin='miter' stroke-width='9.485'/><circle cx='188' cy='128' r='12' stroke-width='10' transform='matrix(.708333 0 0 .708333 71.8333 12.8333)'/><path d='M24.358 103.5h110' fill='none' stroke='#fff' stroke-linecap='butt' stroke-width='10.282'/></g></g></g></g>\n</svg>\n";

// src/assets/svg/stream-settings.svg
var stream_settings_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g transform='matrix(.142357 0 0 .142357 -2.22021 -2.22164)' fill='none' stroke='#fff' stroke-width='16'><circle cx='128' cy='128' r='40'/><path d='M130.05 206.11h-4L94 224c-12.477-4.197-24.049-10.711-34.11-19.2l-.12-36c-.71-1.12-1.38-2.25-2-3.41L25.9 147.24a99.16 99.16 0 0 1 0-38.46l31.84-18.1c.65-1.15 1.32-2.29 2-3.41l.16-36C69.951 42.757 81.521 36.218 94 32l32 17.89h4L162 32c12.477 4.197 24.049 10.711 34.11 19.2l.12 36c.71 1.12 1.38 2.25 2 3.41l31.85 18.14a99.16 99.16 0 0 1 0 38.46l-31.84 18.1c-.65 1.15-1.32 2.29-2 3.41l-.16 36A104.59 104.59 0 0 1 162 224l-31.95-17.89z'/></g>\n</svg>\n";

// src/assets/svg/stream-stats.svg
var stream_stats_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M1.181 24.55v-3.259c0-8.19 6.576-14.952 14.767-14.98H16c8.13 0 14.819 6.69 14.819 14.819v3.42c0 .625-.515 1.14-1.14 1.14H2.321c-.625 0-1.14-.515-1.14-1.14z'/><path d='M16 6.311v4.56M12.58 25.69l9.12-12.54m4.559 5.7h4.386m-29.266 0H5.74'/>\n</svg>\n";

// src/assets/svg/trash.svg
var trash_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M29.5 6.182h-27m9.818 7.363v9.818m7.364-9.818v9.818'/><path d='M27.045 6.182V29.5c0 .673-.554 1.227-1.227 1.227H6.182c-.673 0-1.227-.554-1.227-1.227V6.182m17.181 0V3.727a2.47 2.47 0 0 0-2.455-2.455h-7.364a2.47 2.47 0 0 0-2.455 2.455v2.455'/>\n</svg>\n";

// src/assets/svg/touch-control-enable.svg
var touch_control_enable_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'>\n    <path d='M30.021 9.448a.89.89 0 0 0-.889-.889H2.909a.89.89 0 0 0-.889.889v13.146a.89.89 0 0 0 .889.888h26.223a.89.89 0 0 0 .889-.888V9.448z' fill='none' stroke='#fff' stroke-width='2.083'/>\n    <path d='M8.147 11.981l-.053-.001-.054.001c-.55.028-.988.483-.988 1.04v6c0 .575.467 1.042 1.042 1.042l.053-.001c.55-.028.988-.484.988-1.04v-6a1.04 1.04 0 0 0-.988-1.04z'/>\n    <path d='M11.147 14.981l-.054-.001h-6a1.04 1.04 0 1 0 0 2.083h6c.575 0 1.042-.467 1.042-1.042a1.04 1.04 0 0 0-.988-1.04z'/>\n    <circle cx='25.345' cy='18.582' r='2.561' fill='none' stroke='#fff' stroke-width='1.78' transform='matrix(1.17131 0 0 1.17131 -5.74235 -5.74456)'/>\n</svg>\n";

// src/assets/svg/touch-control-disable.svg
var touch_control_disable_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'>\n    <g fill='none' stroke='#fff'>\n        <path d='M6.021 5.021l20 22' stroke-width='2'/>\n        <path d='M8.735 8.559H2.909a.89.89 0 0 0-.889.889v13.146a.89.89 0 0 0 .889.888h19.34m4.289 0h2.594a.89.89 0 0 0 .889-.888V9.448a.89.89 0 0 0-.889-.889H12.971' stroke-miterlimit='1.5' stroke-width='2.083'/>\n    </g>\n    <path d='M8.147 11.981l-.053-.001-.054.001c-.55.028-.988.483-.988 1.04v6c0 .575.467 1.042 1.042 1.042l.053-.001c.55-.028.988-.484.988-1.04v-6a1.04 1.04 0 0 0-.988-1.04z'/>\n    <path d='M11.147 14.981l-.054-.001h-6a1.04 1.04 0 1 0 0 2.083h6c.575 0 1.042-.467 1.042-1.042a1.04 1.04 0 0 0-.988-1.04z'/>\n    <circle cx='25.345' cy='18.582' r='2.561' fill='none' stroke='#fff' stroke-width='1.78' transform='matrix(1.17131 0 0 1.17131 -5.74235 -5.74456)'/>\n</svg>\n";

// src/assets/svg/virtual-controller.svg
var virtual_controller_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g stroke-width=\"2.06\">\n        <path d=\"M8.417 13.218h4.124\"/>\n        <path d=\"M10.479 11.155v4.125\"/>\n        <path d=\"M12.787 19.404L7.36 25.565a3.61 3.61 0 0 1-2.551 1.056A3.63 3.63 0 0 1 1.2 23.013c0-.21.018-.42.055-.626l2.108-10.845C3.923 8.356 6.714 6.007 9.949 6h5.192\"/>\n    </g>\n    <g stroke-width=\"2.11\">\n        <path d=\"M30.8 13.1c0-3.919-3.181-7.1-7.1-7.1s-7.1 3.181-7.1 7.1v6.421c0 3.919 3.181 7.1 7.1 7.1s7.1-3.181 7.1-7.1V13.1z\"/>\n        <path d=\"M23.7 14.724V9.966\"/>\n    </g>\n</svg>\n";

// src/assets/svg/caret-left.svg
var caret_left_default = "<svg xmlns='http://www.w3.org/2000/svg' width='100%' stroke='#fff' fill='#fff' height='100%' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'>\n    <path d='M6.755 1.924l-6 13.649c-.119.27-.119.578 0 .849l6 13.649c.234.533.857.775 1.389.541s.775-.857.541-1.389L2.871 15.997 8.685 2.773c.234-.533-.008-1.155-.541-1.389s-1.155.008-1.389.541z'/>\n</svg>\n";

// src/assets/svg/caret-right.svg
var caret_right_default = "<svg xmlns='http://www.w3.org/2000/svg' width='100%' stroke='#fff' fill='#fff' height='100%' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'>\n    <path d='M2.685 1.924l6 13.649c.119.27.119.578 0 .849l-6 13.649c-.234.533-.857.775-1.389.541s-.775-.857-.541-1.389l5.813-13.225L.755 2.773c-.234-.533.008-1.155.541-1.389s1.155.008 1.389.541z'/>\n</svg>\n";

// src/assets/svg/camera.svg
var camera_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g transform='matrix(.150985 0 0 .150985 -3.32603 -2.72209)' fill='none' stroke='#fff' stroke-width='16'>\n        <path d='M208 208H48c-8.777 0-16-7.223-16-16V80c0-8.777 7.223-16 16-16h32l16-24h64l16 24h32c8.777 0 16 7.223 16 16v112c0 8.777-7.223 16-16 16z'/>\n        <circle cx='128' cy='132' r='36'/>\n    </g>\n</svg>\n";

// src/assets/svg/microphone.svg
var microphone_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M21.368 6.875A5.37 5.37 0 0 0 16 1.507a5.37 5.37 0 0 0-5.368 5.368v8.588A5.37 5.37 0 0 0 16 20.831a5.37 5.37 0 0 0 5.368-5.368V6.875zM16 25.125v5.368m9.662-15.03c0 5.3-4.362 9.662-9.662 9.662s-9.662-4.362-9.662-9.662'/>\n</svg>\n";

// src/assets/svg/microphone-slash.svg
var microphone_slash_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M16 25.125v5.368M5.265 4.728l21.471 23.618m-4.789-5.267c-1.698 1.326-3.793 2.047-5.947 2.047-5.3 0-9.662-4.362-9.662-9.662'/>\n    <path d='M25.662 15.463a9.62 9.62 0 0 1-.978 4.242m-5.64.187c-.895.616-1.957.943-3.043.939-2.945 0-5.368-2.423-5.368-5.368v-4.831m.442-5.896A5.38 5.38 0 0 1 16 1.507c2.945 0 5.368 2.423 5.368 5.368v8.588c0 .188-.01.375-.03.562'/>\n</svg>\n";

// src/assets/svg/battery-full.svg
var battery_full_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' stroke-miterlimit='2' viewBox='0 0 32 32'>\n    <path d='M24.774 6.71H3.097C1.398 6.71 0 8.108 0 9.806v12.387c0 1.699 1.398 3.097 3.097 3.097h21.677c1.699 0 3.097-1.398 3.097-3.097V9.806c0-1.699-1.398-3.097-3.097-3.097zm1.032 15.484a1.04 1.04 0 0 1-1.032 1.032H3.097a1.04 1.04 0 0 1-1.032-1.032V9.806a1.04 1.04 0 0 1 1.032-1.032h21.677a1.04 1.04 0 0 1 1.032 1.032v12.387zm-2.065-10.323v8.258a1.04 1.04 0 0 1-1.032 1.032H5.161a1.04 1.04 0 0 1-1.032-1.032v-8.258a1.04 1.04 0 0 1 1.032-1.032H22.71a1.04 1.04 0 0 1 1.032 1.032zm8.258 0v8.258a1.04 1.04 0 0 1-1.032 1.032 1.04 1.04 0 0 1-1.032-1.032v-8.258a1.04 1.04 0 0 1 1.032-1.032A1.04 1.04 0 0 1 32 11.871z' fill-rule='nonzero'/>\n</svg>\n";

// src/assets/svg/clock.svg
var clock_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g transform='matrix(.150026 0 0 .150026 -3.20332 -3.20332)' fill='none' stroke='#fff' stroke-width='16'>\n        <circle cx='128' cy='128' r='96'/>\n        <path d='M128 72v56h56'/>\n    </g>\n</svg>\n";

// src/assets/svg/cloud.svg
var cloud_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M9.773 16c0-5.694 4.685-10.379 10.379-10.379S30.53 10.306 30.53 16s-4.685 10.379-10.379 10.379H8.735c-3.982-.005-7.256-3.283-7.256-7.265s3.28-7.265 7.265-7.265c.606 0 1.21.076 1.797.226' fill='none' stroke='#fff' stroke-width='2.076'/>\n</svg>\n";

// src/assets/svg/download.svg
var download_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M16 19.955V1.5m14.5 18.455v9.227c0 .723-.595 1.318-1.318 1.318H2.818c-.723 0-1.318-.595-1.318-1.318v-9.227'/>\n    <path d='M22.591 13.364L16 19.955l-6.591-6.591'/>\n</svg>\n";

// src/assets/svg/speaker-high.svg
var speaker_high_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M8.964 21.417h-6.5a1.09 1.09 0 0 1-1.083-1.083v-8.667a1.09 1.09 0 0 1 1.083-1.083h6.5L18.714 3v26l-9.75-7.583z'/>\n    <path d='M8.964 10.583v10.833m15.167-8.28a4.35 4.35 0 0 1 0 5.728M28.149 9.5a9.79 9.79 0 0 1 0 13'/>\n</svg>\n";

// src/assets/svg/upload.svg
var upload_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M16 19.905V1.682m14.318 18.223v9.112a1.31 1.31 0 0 1-1.302 1.302H2.983a1.31 1.31 0 0 1-1.302-1.302v-9.112'/>\n    <path d='M9.492 8.19L16 1.682l6.508 6.508'/>\n</svg>\n";

// src/utils/bx-icon.ts
var BxIcon = {
  STREAM_SETTINGS: stream_settings_default,
  STREAM_STATS: stream_stats_default,
  COMMAND: command_default,
  CONTROLLER: controller_default,
  DISPLAY: display_default,
  HOME: home_default,
  NATIVE_MKB: native_mkb_default,
  NEW: new_default,
  COPY: copy_default,
  TRASH: trash_default,
  CURSOR_TEXT: cursor_text_default,
  QUESTION: question_default,
  REFRESH: refresh_default,
  VIRTUAL_CONTROLLER: virtual_controller_default,
  REMOTE_PLAY: remote_play_default,
  CARET_LEFT: caret_left_default,
  CARET_RIGHT: caret_right_default,
  SCREENSHOT: camera_default,
  TOUCH_CONTROL_ENABLE: touch_control_enable_default,
  TOUCH_CONTROL_DISABLE: touch_control_disable_default,
  MICROPHONE: microphone_default,
  MICROPHONE_MUTED: microphone_slash_default,
  BATTERY: battery_full_default,
  PLAYTIME: clock_default,
  SERVER: cloud_default,
  DOWNLOAD: download_default,
  UPLOAD: upload_default,
  AUDIO: speaker_high_default
};

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
    } = options, $overlay = document.querySelector(".bx-dialog-overlay");
    if (!$overlay)
      this.$overlay = CE("div", { class: "bx-dialog-overlay bx-gone" }), this.$overlay.addEventListener("contextmenu", (e) => e.preventDefault()), document.documentElement.appendChild(this.$overlay);
    else
      this.$overlay = $overlay;
    let $close;
    this.onClose = onClose, this.$dialog = CE("div", { class: `bx-dialog ${className || ""} bx-gone` }, this.$title = CE("h2", {}, CE("b", {}, title), helpUrl && createButton({
      icon: BxIcon.QUESTION,
      style: ButtonStyle.GHOST,
      title: t("help"),
      url: helpUrl
    })), this.$content = CE("div", { class: "bx-dialog-content" }, content), !hideCloseButton && ($close = CE("button", { type: "button" }, t("close")))), $close && $close.addEventListener("click", (e) => {
      this.hide(e);
    }), !title && this.$title.classList.add("bx-gone"), !content && this.$content.classList.add("bx-gone"), this.$dialog.addEventListener("contextmenu", (e) => e.preventDefault()), document.documentElement.appendChild(this.$dialog);
  }
  show(newOptions) {
    if (document.activeElement && document.activeElement.blur(), newOptions && newOptions.title)
      this.$title.querySelector("b").textContent = newOptions.title, this.$title.classList.remove("bx-gone");
    this.$dialog.classList.remove("bx-gone"), this.$overlay.classList.remove("bx-gone"), document.body.classList.add("bx-no-scroll");
  }
  hide(e) {
    this.$dialog.classList.add("bx-gone"), this.$overlay.classList.add("bx-gone"), document.body.classList.remove("bx-no-scroll"), this.onClose && this.onClose(e);
  }
  toggle() {
    this.$dialog.classList.toggle("bx-gone"), this.$overlay.classList.toggle("bx-gone");
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
    if (!MkbRemapper.#instance)
      MkbRemapper.#instance = new MkbRemapper;
    return MkbRemapper.#instance;
  }
  #STATE = {
    currentPresetId: 0,
    presets: {},
    editingPresetData: null,
    isEditing: !1
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
    this.#STATE.currentPresetId = getPref(PrefKey.MKB_DEFAULT_PRESET_ID), this.bindingDialog = new Dialog({
      className: "bx-binding-dialog",
      content: CE("div", {}, CE("p", {}, t("press-to-bind")), CE("i", {}, t("press-esc-to-cancel"))),
      hideCloseButton: !0
    });
  }
  #clearEventListeners = () => {
    window.removeEventListener("keydown", this.#onKeyDown), window.removeEventListener("mousedown", this.#onMouseDown), window.removeEventListener("wheel", this.#onWheel);
  };
  #bindKey = ($elm, key) => {
    const buttonIndex = parseInt($elm.getAttribute("data-button-index")), keySlot = parseInt($elm.getAttribute("data-key-slot"));
    if ($elm.getAttribute("data-key-code") === key.code)
      return;
    for (let $otherElm of this.#$.allKeyElements)
      if ($otherElm.getAttribute("data-key-code") === key.code)
        this.#unbindKey($otherElm);
    this.#STATE.editingPresetData.mapping[buttonIndex][keySlot] = key.code, $elm.textContent = key.name, $elm.setAttribute("data-key-code", key.code);
  };
  #unbindKey = ($elm) => {
    const buttonIndex = parseInt($elm.getAttribute("data-button-index")), keySlot = parseInt($elm.getAttribute("data-key-slot"));
    this.#STATE.editingPresetData.mapping[buttonIndex][keySlot] = null, $elm.textContent = "", $elm.removeAttribute("data-key-code");
  };
  #onWheel = (e) => {
    e.preventDefault(), this.#clearEventListeners(), this.#bindKey(this.#$.currentBindingKey, KeyHelper.getKeyFromEvent(e)), window.setTimeout(() => this.bindingDialog.hide(), 200);
  };
  #onMouseDown = (e) => {
    e.preventDefault(), this.#clearEventListeners(), this.#bindKey(this.#$.currentBindingKey, KeyHelper.getKeyFromEvent(e)), window.setTimeout(() => this.bindingDialog.hide(), 200);
  };
  #onKeyDown = (e) => {
    if (e.preventDefault(), e.stopPropagation(), this.#clearEventListeners(), e.code !== "Escape")
      this.#bindKey(this.#$.currentBindingKey, KeyHelper.getKeyFromEvent(e));
    window.setTimeout(() => this.bindingDialog.hide(), 200);
  };
  #onBindingKey = (e) => {
    if (!this.#STATE.isEditing || e.button !== 0)
      return;
    console.log(e), this.#$.currentBindingKey = e.target, window.addEventListener("keydown", this.#onKeyDown), window.addEventListener("mousedown", this.#onMouseDown), window.addEventListener("wheel", this.#onWheel), this.bindingDialog.show({ title: this.#$.currentBindingKey.getAttribute("data-prompt") });
  };
  #onContextMenu = (e) => {
    if (e.preventDefault(), !this.#STATE.isEditing)
      return;
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
    for (let $elm of this.#$.allKeyElements) {
      const buttonIndex = parseInt($elm.getAttribute("data-button-index")), keySlot = parseInt($elm.getAttribute("data-key-slot")), buttonKeys = presetData.mapping[buttonIndex];
      if (buttonKeys && buttonKeys[keySlot])
        $elm.textContent = KeyHelper.codeToKeyName(buttonKeys[keySlot]), $elm.setAttribute("data-key-code", buttonKeys[keySlot]);
      else
        $elm.textContent = "", $elm.removeAttribute("data-key-code");
    }
    let key;
    for (key in this.#$.allMouseElements) {
      const $elm = this.#$.allMouseElements[key];
      let value = presetData.mouse[key];
      if (typeof value === "undefined")
        value = MkbPreset.MOUSE_SETTINGS[key].default;
      "setValue" in $elm && $elm.setValue(value);
    }
    const activated = getPref(PrefKey.MKB_DEFAULT_PRESET_ID) === this.#STATE.currentPresetId;
    this.#$.activateButton.disabled = activated, this.#$.activateButton.querySelector("span").textContent = activated ? t("activated") : t("activate");
  };
  #refresh() {
    while (this.#$.presetsSelect.firstChild)
      this.#$.presetsSelect.removeChild(this.#$.presetsSelect.firstChild);
    LocalDb.INSTANCE.getPresets().then((presets) => {
      this.#STATE.presets = presets;
      const $fragment = document.createDocumentFragment();
      let defaultPresetId;
      if (this.#STATE.currentPresetId === 0)
        this.#STATE.currentPresetId = parseInt(Object.keys(presets)[0]), defaultPresetId = this.#STATE.currentPresetId, setPref(PrefKey.MKB_DEFAULT_PRESET_ID, defaultPresetId), EmulatedMkbHandler.getInstance().refreshPresetData();
      else
        defaultPresetId = getPref(PrefKey.MKB_DEFAULT_PRESET_ID);
      for (let id2 in presets) {
        let name = presets[id2].name;
        if (id2 === defaultPresetId)
          name = "🎮 " + name;
        const $options = CE("option", { value: id2 }, name);
        $options.selected = parseInt(id2) === this.#STATE.currentPresetId, $fragment.appendChild($options);
      }
      this.#$.presetsSelect.appendChild($fragment);
      const activated = defaultPresetId === this.#STATE.currentPresetId;
      this.#$.activateButton.disabled = activated, this.#$.activateButton.querySelector("span").textContent = activated ? t("activated") : t("activate"), !this.#STATE.isEditing && this.#switchPreset(this.#STATE.currentPresetId);
    });
  }
  #toggleEditing = (force) => {
    if (this.#STATE.isEditing = typeof force !== "undefined" ? force : !this.#STATE.isEditing, this.#$.wrapper.classList.toggle("bx-editing", this.#STATE.isEditing), this.#STATE.isEditing)
      this.#STATE.editingPresetData = deepClone(this.#getCurrentPreset().data);
    else
      this.#STATE.editingPresetData = null;
    const childElements = this.#$.wrapper.querySelectorAll("select, button, input");
    for (let $elm of Array.from(childElements)) {
      if ($elm.parentElement.parentElement.classList.contains("bx-mkb-action-buttons"))
        continue;
      let disable = !this.#STATE.isEditing;
      if ($elm.parentElement.classList.contains("bx-mkb-preset-tools"))
        disable = !disable;
      $elm.disabled = disable;
    }
  };
  render() {
    this.#$.wrapper = CE("div", { class: "bx-mkb-settings" }), this.#$.presetsSelect = CE("select", {}), this.#$.presetsSelect.addEventListener("change", (e) => {
      this.#switchPreset(parseInt(e.target.value));
    });
    const promptNewName = (value) => {
      let newName = "";
      while (!newName) {
        if (newName = prompt(t("prompt-preset-name"), value), newName === null)
          return !1;
        newName = newName.trim();
      }
      return newName ? newName : !1;
    }, $header = CE("div", { class: "bx-mkb-preset-tools" }, this.#$.presetsSelect, createButton({
      title: t("rename"),
      icon: BxIcon.CURSOR_TEXT,
      onClick: (e) => {
        const preset = this.#getCurrentPreset();
        let newName = promptNewName(preset.name);
        if (!newName || newName === preset.name)
          return;
        preset.name = newName, LocalDb.INSTANCE.updatePreset(preset).then((id2) => this.#refresh());
      }
    }), createButton({
      icon: BxIcon.NEW,
      title: t("new"),
      onClick: (e) => {
        let newName = promptNewName("");
        if (!newName)
          return;
        LocalDb.INSTANCE.newPreset(newName, MkbPreset.DEFAULT_PRESET).then((id2) => {
          this.#STATE.currentPresetId = id2, this.#refresh();
        });
      }
    }), createButton({
      icon: BxIcon.COPY,
      title: t("copy"),
      onClick: (e) => {
        const preset = this.#getCurrentPreset();
        let newName = promptNewName(`${preset.name} (2)`);
        if (!newName)
          return;
        LocalDb.INSTANCE.newPreset(newName, preset.data).then((id2) => {
          this.#STATE.currentPresetId = id2, this.#refresh();
        });
      }
    }), createButton({
      icon: BxIcon.TRASH,
      style: ButtonStyle.DANGER,
      title: t("delete"),
      onClick: (e) => {
        if (!confirm(t("confirm-delete-preset")))
          return;
        LocalDb.INSTANCE.deletePreset(this.#STATE.currentPresetId).then((id2) => {
          this.#STATE.currentPresetId = 0, this.#refresh();
        });
      }
    }));
    this.#$.wrapper.appendChild($header);
    const $rows = CE("div", { class: "bx-mkb-settings-rows" }, CE("i", { class: "bx-mkb-note" }, t("right-click-to-unbind"))), keysPerButton = 2;
    for (let buttonIndex of this.#BUTTON_ORDERS) {
      const [buttonName, buttonPrompt] = GamepadKeyName[buttonIndex];
      let $elm;
      const $fragment = document.createDocumentFragment();
      for (let i = 0;i < keysPerButton; i++)
        $elm = CE("button", {
          type: "button",
          "data-prompt": buttonPrompt,
          "data-button-index": buttonIndex,
          "data-key-slot": i
        }, " "), $elm.addEventListener("mouseup", this.#onBindingKey), $elm.addEventListener("contextmenu", this.#onContextMenu), $fragment.appendChild($elm), this.#$.allKeyElements.push($elm);
      const $keyRow = CE("div", { class: "bx-mkb-key-row" }, CE("label", { title: buttonName }, buttonPrompt), $fragment);
      $rows.appendChild($keyRow);
    }
    $rows.appendChild(CE("i", { class: "bx-mkb-note" }, t("mkb-adjust-ingame-settings")));
    const $mouseSettings = document.createDocumentFragment();
    for (let key in MkbPreset.MOUSE_SETTINGS) {
      const setting = MkbPreset.MOUSE_SETTINGS[key], value = setting.default;
      let $elm;
      const onChange = (e, value2) => {
        this.#STATE.editingPresetData.mouse[key] = value2;
      }, $row = CE("div", { class: "bx-stream-settings-row" }, CE("label", { for: `bx_setting_${key}` }, setting.label), $elm = SettingElement.render(setting.type, key, setting, value, onChange, setting.params));
      $mouseSettings.appendChild($row), this.#$.allMouseElements[key] = $elm;
    }
    $rows.appendChild($mouseSettings), this.#$.wrapper.appendChild($rows);
    const $actionButtons = CE("div", { class: "bx-mkb-action-buttons" }, CE("div", {}, createButton({
      label: t("edit"),
      onClick: (e) => this.#toggleEditing(!0)
    }), this.#$.activateButton = createButton({
      label: t("activate"),
      style: ButtonStyle.PRIMARY,
      onClick: (e) => {
        setPref(PrefKey.MKB_DEFAULT_PRESET_ID, this.#STATE.currentPresetId), EmulatedMkbHandler.getInstance().refreshPresetData(), this.#refresh();
      }
    })), CE("div", {}, createButton({
      label: t("cancel"),
      style: ButtonStyle.GHOST,
      onClick: (e) => {
        this.#switchPreset(this.#STATE.currentPresetId), this.#toggleEditing(!1);
      }
    }), createButton({
      label: t("save"),
      style: ButtonStyle.PRIMARY,
      onClick: (e) => {
        const updatedPreset = deepClone(this.#getCurrentPreset());
        updatedPreset.data = this.#STATE.editingPresetData, LocalDb.INSTANCE.updatePreset(updatedPreset).then((id2) => {
          if (id2 === getPref(PrefKey.MKB_DEFAULT_PRESET_ID))
            EmulatedMkbHandler.getInstance().refreshPresetData();
          this.#toggleEditing(!1), this.#refresh();
        });
      }
    })));
    return this.#$.wrapper.appendChild($actionButtons), this.#toggleEditing(!1), this.#refresh(), this.#$.wrapper;
  }
}

// src/utils/utils.ts
function checkForUpdate() {
  if (SCRIPT_VERSION.includes("beta"))
    return;
  const CHECK_INTERVAL_SECONDS = 7200, currentVersion = getPref(PrefKey.CURRENT_VERSION), lastCheck = getPref(PrefKey.LAST_UPDATE_CHECK), now = Math.round(+new Date / 1000);
  if (currentVersion === SCRIPT_VERSION && now - lastCheck < CHECK_INTERVAL_SECONDS)
    return;
  setPref(PrefKey.LAST_UPDATE_CHECK, now), fetch("https://api.github.com/repos/redphx/better-xcloud/releases/latest").then((response) => response.json()).then((json) => {
    setPref(PrefKey.LATEST_VERSION, json.tag_name.substring(1)), setPref(PrefKey.CURRENT_VERSION, SCRIPT_VERSION);
  }), Translations.updateTranslations(currentVersion === SCRIPT_VERSION);
}
function disablePwa() {
  if (!(window.navigator.orgUserAgent || window.navigator.userAgent || "").toLowerCase())
    return;
  if (!!AppInterface || UserAgent.isSafariMobile())
    Object.defineProperty(window.navigator, "standalone", {
      value: !0
    });
}
function hashCode(str2) {
  let hash = 0;
  for (let i = 0, len = str2.length;i < len; i++) {
    const chr = str2.charCodeAt(i);
    hash = (hash << 5) - hash + chr, hash |= 0;
  }
  return hash;
}
function renderString(str2, obj) {
  return str2.replace(/\$\{.+?\}/g, (match) => {
    const key = match.substring(2, match.length - 1);
    if (key in obj)
      return obj[key];
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
  static adjustGainNodeVolume(amount) {
    if (!getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL))
      return 0;
    const currentValue = getPref(PrefKey.AUDIO_VOLUME);
    let nearestValue;
    if (amount > 0)
      nearestValue = ceilToNearest(currentValue, amount);
    else
      nearestValue = floorToNearest(currentValue, -1 * amount);
    let newValue;
    if (currentValue !== nearestValue)
      newValue = nearestValue;
    else
      newValue = currentValue + amount;
    return newValue = setPref(PrefKey.AUDIO_VOLUME, newValue), SoundShortcut.setGainNodeVolume(newValue), Toast.show(`${t("stream")} ❯ ${t("volume")}`, newValue + "%", { instant: !0 }), BxEvent.dispatch(window, BxEvent.GAINNODE_VOLUME_CHANGED, {
      volume: newValue
    }), newValue;
  }
  static setGainNodeVolume(value) {
    STATES.currentStream.audioGainNode && (STATES.currentStream.audioGainNode.gain.value = value / 100);
  }
  static muteUnmute() {
    if (getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && STATES.currentStream.audioGainNode) {
      const gainValue = STATES.currentStream.audioGainNode.gain.value, settingValue = getPref(PrefKey.AUDIO_VOLUME);
      let targetValue;
      if (settingValue === 0)
        targetValue = 100, setPref(PrefKey.AUDIO_VOLUME, targetValue), BxEvent.dispatch(window, BxEvent.GAINNODE_VOLUME_CHANGED, {
          volume: targetValue
        });
      else if (gainValue === 0)
        targetValue = settingValue;
      else
        targetValue = 0;
      let status;
      if (targetValue === 0)
        status = t("muted");
      else
        status = targetValue + "%";
      SoundShortcut.setGainNodeVolume(targetValue), Toast.show(`${t("stream")} ❯ ${t("volume")}`, status, { instant: !0 });
      return;
    }
    let $media;
    if ($media = document.querySelector("div[data-testid=media-container] audio"), !$media)
      $media = document.querySelector("div[data-testid=media-container] video");
    if ($media) {
      $media.muted = !$media.muted;
      const status = $media.muted ? t("muted") : t("unmuted");
      Toast.show(`${t("stream")} ❯ ${t("volume")}`, status, { instant: !0 });
    }
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
  static #enable = !1;
  static #dataChannel;
  static #customLayouts = {};
  static #baseCustomLayouts = {};
  static #currentLayoutId;
  static #customList;
  static enable() {
    TouchController.#enable = !0;
  }
  static disable() {
    TouchController.#enable = !1;
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
    if (!TouchController.#dataChannel)
      return;
    status ? TouchController.#hide() : TouchController.#show();
  }
  static reset() {
    TouchController.#enable = !1, TouchController.#dataChannel = null, TouchController.#$style && (TouchController.#$style.textContent = "");
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
    if (retries = retries || 1, retries > 2) {
      TouchController.#customLayouts[xboxTitleId] = null, window.setTimeout(() => TouchController.#dispatchLayouts(null), 1000);
      return;
    }
    const baseUrl = `https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/touch-layouts${BX_FLAGS.UseDevTouchLayout ? "/dev" : ""}`, url = `${baseUrl}/${xboxTitleId}.json`;
    try {
      const json = await (await NATIVE_FETCH(url)).json(), layouts = {};
      json.layouts.forEach(async (layoutName) => {
        let baseLayouts = {};
        if (layoutName in TouchController.#baseCustomLayouts)
          baseLayouts = TouchController.#baseCustomLayouts[layoutName];
        else
          try {
            const layoutUrl = `${baseUrl}/layouts/${layoutName}.json`;
            baseLayouts = (await (await NATIVE_FETCH(layoutUrl)).json()).layouts, TouchController.#baseCustomLayouts[layoutName] = baseLayouts;
          } catch (e) {
          }
        Object.assign(layouts, baseLayouts);
      }), json.layouts = layouts, TouchController.#customLayouts[xboxTitleId] = json, window.setTimeout(() => TouchController.#dispatchLayouts(json), 1000);
    } catch (e) {
      TouchController.getCustomLayouts(xboxTitleId, retries + 1);
    }
  }
  static loadCustomLayout(xboxTitleId, layoutId, delay = 0) {
    if (!window.BX_EXPOSED.touchLayoutManager) {
      const listener = (e) => {
        if (window.removeEventListener(BxEvent.TOUCH_LAYOUT_MANAGER_READY, listener), TouchController.#enable)
          TouchController.loadCustomLayout(xboxTitleId, layoutId, 0);
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
    if (!layout)
      return;
    let msg, html10 = !1;
    if (layout.author) {
      const author = `<b>${escapeHtml(layout.author)}</b>`;
      msg = t("touch-control-layout-by", { name: author }), html10 = !0;
    } else
      msg = t("touch-control-layout");
    layoutChanged && Toast.show(msg, layout.name, { html: html10 }), window.setTimeout(() => {
      window.BX_EXPOSED.shouldShowSensorControls = JSON.stringify(layout).includes("gyroscope"), window.BX_EXPOSED.touchLayoutManager.changeLayoutForScope({
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
    TouchController.#customList = JSON.parse(window.localStorage.getItem("better_xcloud_custom_touch_layouts") || "[]"), NATIVE_FETCH("https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/touch-layouts/ids.json").then((response) => response.json()).then((json) => {
      TouchController.#customList = json, window.localStorage.setItem("better_xcloud_custom_touch_layouts", JSON.stringify(json));
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
    document.documentElement.appendChild($style), TouchController.#$style = $style;
    const PREF_STYLE_STANDARD = getPref(PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD), PREF_STYLE_CUSTOM = getPref(PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM);
    window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, (e) => {
      const dataChannel = e.dataChannel;
      if (!dataChannel || dataChannel.label !== "message")
        return;
      let filter = "";
      if (TouchController.#enable) {
        if (PREF_STYLE_STANDARD === "white")
          filter = "grayscale(1) brightness(2)";
        else if (PREF_STYLE_STANDARD === "muted")
          filter = "sepia(0.5)";
      } else if (PREF_STYLE_CUSTOM === "muted")
        filter = "sepia(0.5)";
      if (filter)
        $style.textContent = `#babylon-canvas { filter: ${filter} !important; }`;
      else
        $style.textContent = "";
      TouchController.#dataChannel = dataChannel, dataChannel.addEventListener("open", () => {
        window.setTimeout(TouchController.#show, 1000);
      });
      let focused = !1;
      dataChannel.addEventListener("message", (msg) => {
        if (msg.origin === "better-xcloud" || typeof msg.data !== "string")
          return;
        if (msg.data.includes("touchcontrols/showtitledefault")) {
          if (TouchController.#enable)
            if (focused)
              TouchController.getCustomLayouts(STATES.currentStream?.xboxTitleId);
            else
              TouchController.#showDefault();
          return;
        }
        try {
          if (msg.data.includes("/titleinfo")) {
            const json = JSON.parse(JSON.parse(msg.data).content);
            if (focused = json.focused, !json.focused)
              TouchController.#show();
            STATES.currentStream.xboxTitleId = parseInt(json.titleid, 16).toString();
          }
        } catch (e2) {
          BxLogger.error(LOG_TAG2, "Load custom layout", e2);
        }
      });
    });
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
    const pulseDuration = 200, onDuration = Math.floor(pulseDuration * intensity / 100), offDuration = pulseDuration - onDuration, repeats = Math.ceil(data.durationMs / pulseDuration), pulses = Array(repeats).fill([onDuration, offDuration]).flat();
    window.navigator.vibrate(pulses);
  }
  static supportControllerVibration() {
    return Gamepad.prototype.hasOwnProperty("vibrationActuator");
  }
  static supportDeviceVibration() {
    return !!window.navigator.vibrate;
  }
  static updateGlobalVars(stopVibration = !0) {
    if (window.BX_ENABLE_CONTROLLER_VIBRATION = VibrationManager.supportControllerVibration() ? getPref(PrefKey.CONTROLLER_ENABLE_VIBRATION) : !1, window.BX_VIBRATION_INTENSITY = getPref(PrefKey.CONTROLLER_VIBRATION_INTENSITY) / 100, !VibrationManager.supportDeviceVibration()) {
      window.BX_ENABLE_DEVICE_VIBRATION = !1;
      return;
    }
    stopVibration && window.navigator.vibrate(0);
    const value = getPref(PrefKey.CONTROLLER_DEVICE_VIBRATION);
    let enabled;
    if (value === "on")
      enabled = !0;
    else if (value === "auto") {
      enabled = !0;
      const gamepads = window.navigator.getGamepads();
      for (let gamepad of gamepads)
        if (gamepad) {
          enabled = !1;
          break;
        }
    } else
      enabled = !1;
    window.BX_ENABLE_DEVICE_VIBRATION = enabled;
  }
  static #onMessage(e) {
    if (!window.BX_ENABLE_DEVICE_VIBRATION)
      return;
    if (typeof e !== "object" || !(e.data instanceof ArrayBuffer))
      return;
    const dataView = new DataView(e.data);
    let offset = 0, messageType;
    if (dataView.byteLength === 13)
      messageType = dataView.getUint16(offset, !0), offset += Uint16Array.BYTES_PER_ELEMENT;
    else
      messageType = dataView.getUint8(offset), offset += Uint8Array.BYTES_PER_ELEMENT;
    if (!(messageType & 128))
      return;
    const vibrationType = dataView.getUint8(offset);
    if (offset += Uint8Array.BYTES_PER_ELEMENT, vibrationType !== 0)
      return;
    const data = {};
    let key;
    for (key in VIBRATION_DATA_MAP)
      if (VIBRATION_DATA_MAP[key] === 16)
        data[key] = dataView.getUint16(offset, !0), offset += Uint16Array.BYTES_PER_ELEMENT;
      else
        data[key] = dataView.getUint8(offset), offset += Uint8Array.BYTES_PER_ELEMENT;
    VibrationManager.#playDeviceVibration(data);
  }
  static initialSetup() {
    window.addEventListener("gamepadconnected", (e) => VibrationManager.updateGlobalVars()), window.addEventListener("gamepaddisconnected", (e) => VibrationManager.updateGlobalVars()), VibrationManager.updateGlobalVars(!1), window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, (e) => {
      const dataChannel = e.dataChannel;
      if (!dataChannel || dataChannel.label !== "input")
        return;
      dataChannel.addEventListener("message", VibrationManager.#onMessage);
    });
  }
}

// src/web-components/bx-select.ts
class BxSelectElement {
  static wrap($select) {
    const $btnPrev = createButton({
      label: "<",
      style: ButtonStyle.FOCUSABLE,
      attributes: {
        tabindex: 0
      }
    }), $btnNext = createButton({
      label: ">",
      style: ButtonStyle.FOCUSABLE,
      attributes: {
        tabindex: 0
      }
    }), isMultiple = $select.multiple;
    let visibleIndex = $select.selectedIndex, $checkBox, $label;
    const $content = CE("div", {}, $checkBox = CE("input", { type: "checkbox", id: $select.id + "_checkbox" }), $label = CE("label", { for: $select.id + "_checkbox" }, ""));
    isMultiple && $checkBox.addEventListener("input", (e) => {
      const $option = getOptionAtIndex(visibleIndex);
      $option && ($option.selected = e.target.checked), $select.dispatchEvent(new Event("input"));
    }), $checkBox.classList.toggle("bx-gone", !isMultiple);
    const getOptionAtIndex = (index) => {
      return $select.querySelector(`option:nth-of-type(${visibleIndex + 1})`);
    }, render = () => {
      visibleIndex = normalizeIndex(visibleIndex);
      const $option = getOptionAtIndex(visibleIndex);
      let content = "";
      if ($option)
        content = $option.textContent || "";
      $label.textContent = content, isMultiple && ($checkBox.checked = $option?.selected || !1), $checkBox.classList.toggle("bx-gone", !isMultiple || !content);
      const disablePrev = visibleIndex <= 0, disableNext = visibleIndex === $select.querySelectorAll("option").length - 1;
      $btnPrev.classList.toggle("bx-inactive", disablePrev), disablePrev && $btnNext.focus(), $btnNext.classList.toggle("bx-inactive", disableNext), disableNext && $btnPrev.focus();
    }, normalizeIndex = (index) => {
      return Math.min(Math.max(index, 0), $select.querySelectorAll("option").length - 1);
    }, onPrevNext = (e) => {
      const goNext = e.target === $btnNext, currentIndex = visibleIndex;
      let newIndex = goNext ? currentIndex + 1 : currentIndex - 1;
      if (newIndex = normalizeIndex(newIndex), visibleIndex = newIndex, !isMultiple && newIndex !== currentIndex)
        $select.selectedIndex = newIndex;
      $select.dispatchEvent(new Event("input"));
    };
    return $select.addEventListener("input", (e) => render()), $btnPrev.addEventListener("click", onPrevNext), $btnNext.addEventListener("click", onPrevNext), new MutationObserver((mutationList, observer2) => {
      mutationList.forEach((mutation) => {
        mutation.type === "childList" && render();
      });
    }).observe($select, {
      subtree: !0,
      childList: !0
    }), render(), CE("div", { class: "bx-select" }, $select, $btnPrev, $content, $btnNext);
  }
}

// src/modules/stream/stream-settings-utils.ts
function onChangeVideoPlayerType() {
  const playerType = getPref(PrefKey.VIDEO_PLAYER_TYPE), $videoProcessing = document.getElementById("bx_setting_video_processing"), $videoSharpness = document.getElementById("bx_setting_video_sharpness");
  let isDisabled = !1;
  if (playerType === StreamPlayerType.WEBGL2)
    $videoProcessing.querySelector(`option[value=${StreamVideoProcessing.CAS}]`).disabled = !1;
  else if ($videoProcessing.value = StreamVideoProcessing.USM, setPref(PrefKey.VIDEO_PROCESSING, StreamVideoProcessing.USM), $videoProcessing.querySelector(`option[value=${StreamVideoProcessing.CAS}]`).disabled = !0, UserAgent.isSafari())
    isDisabled = !0;
  $videoProcessing.disabled = isDisabled, $videoSharpness.dataset.disabled = isDisabled.toString(), updateVideoPlayer();
}
function updateVideoPlayer() {
  const streamPlayer = STATES.currentStream.streamPlayer;
  if (!streamPlayer)
    return;
  const options = {
    processing: getPref(PrefKey.VIDEO_PROCESSING),
    sharpness: getPref(PrefKey.VIDEO_SHARPNESS),
    saturation: getPref(PrefKey.VIDEO_SATURATION),
    contrast: getPref(PrefKey.VIDEO_CONTRAST),
    brightness: getPref(PrefKey.VIDEO_BRIGHTNESS)
  };
  streamPlayer.setPlayerType(getPref(PrefKey.VIDEO_PLAYER_TYPE)), streamPlayer.updateOptions(options), streamPlayer.refreshPlayer();
}
window.addEventListener("resize", updateVideoPlayer);

// src/modules/stream/stream-settings.ts
class StreamSettings {
  static instance;
  static getInstance() {
    if (!StreamSettings.instance)
      StreamSettings.instance = new StreamSettings;
    return StreamSettings.instance;
  }
  $container;
  $overlay;
  SETTINGS_UI = [
    {
      icon: BxIcon.DISPLAY,
      group: "stream",
      items: [{
        group: "audio",
        label: t("audio"),
        help_url: "https://better-xcloud.github.io/ingame-features/#audio",
        items: [{
          pref: PrefKey.AUDIO_VOLUME,
          onChange: (e, value) => {
            SoundShortcut.setGainNodeVolume(value);
          },
          params: {
            disabled: !getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL)
          },
          onMounted: ($elm) => {
            const $range = $elm.querySelector("input[type=range");
            window.addEventListener(BxEvent.GAINNODE_VOLUME_CHANGED, (e) => {
              $range.value = e.volume, BxEvent.dispatch($range, "input", {
                ignoreOnChange: !0
              });
            });
          }
        }]
      }, {
        group: "video",
        label: t("video"),
        help_url: "https://better-xcloud.github.io/ingame-features/#video",
        items: [{
          pref: PrefKey.VIDEO_PLAYER_TYPE,
          onChange: onChangeVideoPlayerType
        }, {
          pref: PrefKey.VIDEO_RATIO,
          onChange: updateVideoPlayer
        }, {
          pref: PrefKey.VIDEO_PROCESSING,
          onChange: updateVideoPlayer
        }, {
          pref: PrefKey.VIDEO_SHARPNESS,
          onChange: updateVideoPlayer
        }, {
          pref: PrefKey.VIDEO_SATURATION,
          onChange: updateVideoPlayer
        }, {
          pref: PrefKey.VIDEO_CONTRAST,
          onChange: updateVideoPlayer
        }, {
          pref: PrefKey.VIDEO_BRIGHTNESS,
          onChange: updateVideoPlayer
        }]
      }]
    },
    {
      icon: BxIcon.CONTROLLER,
      group: "controller",
      items: [
        {
          group: "controller",
          label: t("controller"),
          help_url: "https://better-xcloud.github.io/ingame-features/#controller",
          items: [{
            pref: PrefKey.CONTROLLER_ENABLE_VIBRATION,
            unsupported: !VibrationManager.supportControllerVibration(),
            onChange: () => VibrationManager.updateGlobalVars()
          }, {
            pref: PrefKey.CONTROLLER_DEVICE_VIBRATION,
            unsupported: !VibrationManager.supportDeviceVibration(),
            onChange: () => VibrationManager.updateGlobalVars()
          }, (VibrationManager.supportControllerVibration() || VibrationManager.supportDeviceVibration()) && {
            pref: PrefKey.CONTROLLER_VIBRATION_INTENSITY,
            unsupported: !VibrationManager.supportDeviceVibration(),
            onChange: () => VibrationManager.updateGlobalVars()
          }]
        },
        STATES.userAgentHasTouchSupport && {
          group: "touch-controller",
          label: t("touch-controller"),
          items: [{
            label: t("layout"),
            content: CE("select", { disabled: !0 }, CE("option", {}, t("default"))),
            onMounted: ($elm) => {
              $elm.addEventListener("change", (e) => {
                TouchController.loadCustomLayout(STATES.currentStream?.xboxTitleId, $elm.value, 1000);
              }), window.addEventListener(BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, (e) => {
                const data = e.data;
                if (STATES.currentStream?.xboxTitleId && $elm.xboxTitleId === STATES.currentStream?.xboxTitleId) {
                  $elm.dispatchEvent(new Event("change"));
                  return;
                }
                $elm.xboxTitleId = STATES.currentStream?.xboxTitleId;
                while ($elm.firstChild)
                  $elm.removeChild($elm.firstChild);
                if ($elm.disabled = !data, !data) {
                  $elm.appendChild(CE("option", { value: "" }, t("default"))), $elm.value = "", $elm.dispatchEvent(new Event("change"));
                  return;
                }
                const $fragment = document.createDocumentFragment();
                for (let key in data.layouts) {
                  const layout = data.layouts[key];
                  let name;
                  if (layout.author)
                    name = `${layout.name} (${layout.author})`;
                  else
                    name = layout.name;
                  const $option = CE("option", { value: key }, name);
                  $fragment.appendChild($option);
                }
                $elm.appendChild($fragment), $elm.value = data.default_layout, $elm.dispatchEvent(new Event("change"));
              });
            }
          }]
        }
      ]
    },
    getPref(PrefKey.MKB_ENABLED) && {
      icon: BxIcon.VIRTUAL_CONTROLLER,
      group: "mkb",
      items: [{
        group: "mkb",
        label: t("virtual-controller"),
        help_url: "https://better-xcloud.github.io/mouse-and-keyboard/",
        content: MkbRemapper.INSTANCE.render()
      }]
    },
    AppInterface && getPref(PrefKey.NATIVE_MKB_ENABLED) === "on" && {
      icon: BxIcon.NATIVE_MKB,
      group: "native-mkb",
      items: [{
        group: "native-mkb",
        label: t("native-mkb"),
        items: [{
          pref: PrefKey.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY,
          onChange: (e, value) => {
            NativeMkbHandler.getInstance().setVerticalScrollMultiplier(value / 100);
          }
        }, {
          pref: PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY,
          onChange: (e, value) => {
            NativeMkbHandler.getInstance().setHorizontalScrollMultiplier(value / 100);
          }
        }]
      }]
    },
    {
      icon: BxIcon.COMMAND,
      group: "shortcuts",
      items: [{
        group: "shortcuts_controller",
        label: t("controller-shortcuts"),
        content: ControllerShortcut.renderSettings()
      }]
    },
    {
      icon: BxIcon.STREAM_STATS,
      group: "stats",
      items: [{
        group: "stats",
        label: t("stream-stats"),
        help_url: "https://better-xcloud.github.io/stream-stats/",
        items: [
          {
            pref: PrefKey.STATS_SHOW_WHEN_PLAYING
          },
          {
            pref: PrefKey.STATS_QUICK_GLANCE,
            onChange: (e) => {
              const streamStats = StreamStats.getInstance();
              e.target.checked ? streamStats.quickGlanceSetup() : streamStats.quickGlanceStop();
            }
          },
          {
            pref: PrefKey.STATS_ITEMS,
            onChange: StreamStats.refreshStyles
          },
          {
            pref: PrefKey.STATS_POSITION,
            onChange: StreamStats.refreshStyles
          },
          {
            pref: PrefKey.STATS_TEXT_SIZE,
            onChange: StreamStats.refreshStyles
          },
          {
            pref: PrefKey.STATS_OPACITY,
            onChange: StreamStats.refreshStyles
          },
          {
            pref: PrefKey.STATS_TRANSPARENT,
            onChange: StreamStats.refreshStyles
          },
          {
            pref: PrefKey.STATS_CONDITIONAL_FORMATTING,
            onChange: StreamStats.refreshStyles
          }
        ]
      }]
    }
  ];
  constructor() {
    this.#setupDialog();
  }
  show(tabId) {
    const $container = this.$container;
    if (tabId) {
      const $tab = $container.querySelector(`.bx-stream-settings-tabs svg[data-group=${tabId}]`);
      $tab && $tab.dispatchEvent(new Event("click"));
    }
    this.$overlay.classList.remove("bx-gone"), this.$overlay.dataset.isPlaying = STATES.isPlaying.toString(), $container.classList.remove("bx-gone"), document.body.classList.add("bx-no-scroll");
  }
  hide() {
    this.$overlay.classList.add("bx-gone"), this.$container.classList.add("bx-gone"), document.body.classList.remove("bx-no-scroll");
  }
  #setupDialog() {
    let $tabs, $settings;
    const $overlay = CE("div", { class: "bx-stream-settings-overlay bx-gone" });
    this.$overlay = $overlay;
    const $container = CE("div", { class: "bx-stream-settings-dialog bx-gone" }, $tabs = CE("div", { class: "bx-stream-settings-tabs" }), $settings = CE("div", { class: "bx-stream-settings-tab-contents" }));
    this.$container = $container, $overlay.addEventListener("click", (e) => {
      e.preventDefault(), e.stopPropagation(), this.hide();
    });
    for (let settingTab of this.SETTINGS_UI) {
      if (!settingTab)
        continue;
      const $svg = createSvgIcon(settingTab.icon);
      $svg.addEventListener("click", (e) => {
        for (let $child of Array.from($settings.children))
          if ($child.getAttribute("data-group") === settingTab.group)
            $child.classList.remove("bx-gone");
          else
            $child.classList.add("bx-gone");
        for (let $child of Array.from($tabs.children))
          $child.classList.remove("bx-active");
        $svg.classList.add("bx-active");
      }), $tabs.appendChild($svg);
      const $group = CE("div", { "data-group": settingTab.group, class: "bx-gone" });
      for (let settingGroup of settingTab.items) {
        if (!settingGroup)
          continue;
        if ($group.appendChild(CE("h2", {}, CE("span", {}, settingGroup.label), settingGroup.help_url && createButton({
          icon: BxIcon.QUESTION,
          style: ButtonStyle.GHOST,
          url: settingGroup.help_url,
          title: t("help")
        }))), settingGroup.note) {
          if (typeof settingGroup.note === "string")
            settingGroup.note = document.createTextNode(settingGroup.note);
          $group.appendChild(settingGroup.note);
        }
        if (settingGroup.content) {
          $group.appendChild(settingGroup.content);
          continue;
        }
        if (!settingGroup.items)
          settingGroup.items = [];
        for (let setting of settingGroup.items) {
          if (!setting)
            continue;
          const pref = setting.pref;
          let $control;
          if (setting.content)
            $control = setting.content;
          else if (!setting.unsupported) {
            if ($control = toPrefElement(pref, setting.onChange, setting.params), $control instanceof HTMLSelectElement && BX_FLAGS.ScriptUi === "tv")
              $control = BxSelectElement.wrap($control);
          }
          const label = Preferences.SETTINGS[pref]?.label || setting.label, note = Preferences.SETTINGS[pref]?.note || setting.note, $content = CE("div", { class: "bx-stream-settings-row", "data-type": settingGroup.group }, CE("label", { for: `bx_setting_${pref}` }, label, note && CE("div", { class: "bx-stream-settings-dialog-note" }, note), setting.unsupported && CE("div", { class: "bx-stream-settings-dialog-note" }, t("browser-unsupported-feature"))), !setting.unsupported && $control);
          $group.appendChild($content), setting.onMounted && setting.onMounted($control);
        }
      }
      $settings.appendChild($group);
    }
    $tabs.firstElementChild.dispatchEvent(new Event("click")), document.documentElement.appendChild($overlay), document.documentElement.appendChild($container);
  }
}

// src/modules/mkb/mkb-handler.ts
var LOG_TAG3 = "MkbHandler", PointerToMouseButton = {
  1: 0,
  2: 2,
  4: 1
};

class WebSocketMouseDataProvider extends MouseDataProvider {
  #pointerClient;
  #connected = !1;
  init() {
    this.#pointerClient = PointerClient.getInstance(), this.#connected = !1;
    try {
      this.#pointerClient.start(STATES.pointerServerPort, this.mkbHandler), this.#connected = !0;
    } catch (e) {
      Toast.show("Cannot enable Mouse & Keyboard feature");
    }
  }
  start() {
    this.#connected && AppInterface.requestPointerCapture();
  }
  stop() {
    this.#connected && AppInterface.releasePointerCapture();
  }
  destroy() {
    this.#connected && this.#pointerClient?.stop();
  }
}

class PointerLockMouseDataProvider extends MouseDataProvider {
  init() {
  }
  start() {
    window.addEventListener("mousemove", this.#onMouseMoveEvent), window.addEventListener("mousedown", this.#onMouseEvent), window.addEventListener("mouseup", this.#onMouseEvent), window.addEventListener("wheel", this.#onWheelEvent, { passive: !1 }), window.addEventListener("contextmenu", this.#disableContextMenu);
  }
  stop() {
    document.pointerLockElement && document.exitPointerLock(), window.removeEventListener("mousemove", this.#onMouseMoveEvent), window.removeEventListener("mousedown", this.#onMouseEvent), window.removeEventListener("mouseup", this.#onMouseEvent), window.removeEventListener("wheel", this.#onWheelEvent), window.removeEventListener("contextmenu", this.#disableContextMenu);
  }
  destroy() {
  }
  #onMouseMoveEvent = (e) => {
    this.mkbHandler.handleMouseMove({
      movementX: e.movementX,
      movementY: e.movementY
    });
  };
  #onMouseEvent = (e) => {
    e.preventDefault();
    const isMouseDown = e.type === "mousedown", data = {
      mouseButton: e.button,
      pressed: isMouseDown
    };
    this.mkbHandler.handleMouseClick(data);
  };
  #onWheelEvent = (e) => {
    if (!KeyHelper.getKeyFromEvent(e))
      return;
    const data = {
      vertical: e.deltaY,
      horizontal: e.deltaX
    };
    if (this.mkbHandler.handleMouseWheel(data))
      e.preventDefault();
  };
  #disableContextMenu = (e) => e.preventDefault();
}

class EmulatedMkbHandler extends MkbHandler {
  static #instance;
  static getInstance() {
    if (!EmulatedMkbHandler.#instance)
      EmulatedMkbHandler.#instance = new EmulatedMkbHandler;
    return EmulatedMkbHandler.#instance;
  }
  #CURRENT_PRESET_DATA = MkbPreset.convert(MkbPreset.DEFAULT_PRESET);
  static DEFAULT_PANNING_SENSITIVITY = 0.001;
  static DEFAULT_DEADZONE_COUNTERWEIGHT = 0.01;
  static MAXIMUM_STICK_RANGE = 1.1;
  static VIRTUAL_GAMEPAD_ID = "Xbox 360 Controller";
  #VIRTUAL_GAMEPAD = {
    id: EmulatedMkbHandler.VIRTUAL_GAMEPAD_ID,
    index: 3,
    connected: !1,
    hapticActuators: null,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: new Array(17).fill(null).map(() => ({ pressed: !1, value: 0 })),
    timestamp: performance.now(),
    vibrationActuator: null
  };
  #nativeGetGamepads = window.navigator.getGamepads.bind(window.navigator);
  #enabled = !1;
  #mouseDataProvider;
  #isPolling = !1;
  #prevWheelCode = null;
  #wheelStoppedTimeout;
  #detectMouseStoppedTimeout;
  #$message;
  #escKeyDownTime = -1;
  #STICK_MAP;
  #LEFT_STICK_X = [];
  #LEFT_STICK_Y = [];
  #RIGHT_STICK_X = [];
  #RIGHT_STICK_Y = [];
  constructor() {
    super();
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
  isEnabled = () => this.#enabled;
  #patchedGetGamepads = () => {
    const gamepads = this.#nativeGetGamepads() || [];
    return gamepads[this.#VIRTUAL_GAMEPAD.index] = this.#VIRTUAL_GAMEPAD, gamepads;
  };
  #getVirtualGamepad = () => this.#VIRTUAL_GAMEPAD;
  #updateStick(stick, x, y) {
    const virtualGamepad = this.#getVirtualGamepad();
    virtualGamepad.axes[stick * 2] = x, virtualGamepad.axes[stick * 2 + 1] = y, virtualGamepad.timestamp = performance.now();
  }
  #vectorLength = (x, y) => Math.sqrt(x ** 2 + y ** 2);
  #resetGamepad = () => {
    const gamepad = this.#getVirtualGamepad();
    gamepad.axes = [0, 0, 0, 0];
    for (let button of gamepad.buttons)
      button.pressed = !1, button.value = 0;
    gamepad.timestamp = performance.now();
  };
  #pressButton = (buttonIndex, pressed) => {
    const virtualGamepad = this.#getVirtualGamepad();
    if (buttonIndex >= 100) {
      let [valueArr, axisIndex] = this.#STICK_MAP[buttonIndex];
      valueArr = valueArr, axisIndex = axisIndex;
      for (let i = valueArr.length - 1;i >= 0; i--)
        if (valueArr[i] === buttonIndex)
          valueArr.splice(i, 1);
      pressed && valueArr.push(buttonIndex);
      let value;
      if (valueArr.length)
        value = this.#STICK_MAP[valueArr[valueArr.length - 1]][2];
      else
        value = 0;
      virtualGamepad.axes[axisIndex] = value;
    } else
      virtualGamepad.buttons[buttonIndex].pressed = pressed, virtualGamepad.buttons[buttonIndex].value = pressed ? 1 : 0;
    virtualGamepad.timestamp = performance.now();
  };
  #onKeyboardEvent = (e) => {
    const isKeyDown = e.type === "keydown";
    if (e.code === "F8") {
      if (!isKeyDown)
        e.preventDefault(), this.toggle();
      return;
    }
    if (e.code === "Escape") {
      if (e.preventDefault(), this.#enabled && isKeyDown) {
        if (this.#escKeyDownTime === -1)
          this.#escKeyDownTime = performance.now();
        else if (performance.now() - this.#escKeyDownTime >= 1000)
          this.stop();
      } else
        this.#escKeyDownTime = -1;
      return;
    }
    if (!this.#isPolling)
      return;
    const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[e.code || e.key];
    if (typeof buttonIndex === "undefined")
      return;
    if (e.repeat)
      return;
    e.preventDefault(), this.#pressButton(buttonIndex, isKeyDown);
  };
  #onMouseStopped = () => {
    this.#detectMouseStoppedTimeout = null;
    const analog = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_MAP_TO] === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
    this.#updateStick(analog, 0, 0);
  };
  handleMouseClick = (data) => {
    let mouseButton;
    if (typeof data.mouseButton !== "undefined")
      mouseButton = data.mouseButton;
    else if (typeof data.pointerButton !== "undefined")
      mouseButton = PointerToMouseButton[data.pointerButton];
    const keyCode = "Mouse" + mouseButton, key = {
      code: keyCode,
      name: KeyHelper.codeToKeyName(keyCode)
    };
    if (!key.name)
      return;
    const buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code];
    if (typeof buttonIndex === "undefined")
      return;
    this.#pressButton(buttonIndex, data.pressed);
  };
  handleMouseMove = (data) => {
    const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_MAP_TO];
    if (mouseMapTo === MouseMapTo.OFF)
      return;
    this.#detectMouseStoppedTimeout && clearTimeout(this.#detectMouseStoppedTimeout), this.#detectMouseStoppedTimeout = window.setTimeout(this.#onMouseStopped.bind(this), 50);
    const deadzoneCounterweight = this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_DEADZONE_COUNTERWEIGHT];
    let x = data.movementX * this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_SENSITIVITY_X], y = data.movementY * this.#CURRENT_PRESET_DATA.mouse[MkbPresetKey.MOUSE_SENSITIVITY_Y], length = this.#vectorLength(x, y);
    if (length !== 0 && length < deadzoneCounterweight)
      x *= deadzoneCounterweight / length, y *= deadzoneCounterweight / length;
    else if (length > EmulatedMkbHandler.MAXIMUM_STICK_RANGE)
      x *= EmulatedMkbHandler.MAXIMUM_STICK_RANGE / length, y *= EmulatedMkbHandler.MAXIMUM_STICK_RANGE / length;
    const analog = mouseMapTo === MouseMapTo.LS ? GamepadStick.LEFT : GamepadStick.RIGHT;
    this.#updateStick(analog, x, y);
  };
  handleMouseWheel = (data) => {
    let code = "";
    if (data.vertical < 0)
      code = WheelCode.SCROLL_UP;
    else if (data.vertical > 0)
      code = WheelCode.SCROLL_DOWN;
    else if (data.horizontal < 0)
      code = WheelCode.SCROLL_LEFT;
    else if (data.horizontal > 0)
      code = WheelCode.SCROLL_RIGHT;
    if (!code)
      return !1;
    const key = {
      code,
      name: KeyHelper.codeToKeyName(code)
    }, buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code];
    if (typeof buttonIndex === "undefined")
      return !1;
    if (this.#prevWheelCode === null || this.#prevWheelCode === key.code)
      this.#wheelStoppedTimeout && clearTimeout(this.#wheelStoppedTimeout), this.#pressButton(buttonIndex, !0);
    return this.#wheelStoppedTimeout = window.setTimeout(() => {
      this.#prevWheelCode = null, this.#pressButton(buttonIndex, !1);
    }, 20), !0;
  };
  toggle = (force) => {
    if (typeof force !== "undefined")
      this.#enabled = force;
    else
      this.#enabled = !this.#enabled;
    if (this.#enabled)
      document.body.requestPointerLock();
    else
      document.pointerLockElement && document.exitPointerLock();
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
      this.#CURRENT_PRESET_DATA = MkbPreset.convert(preset ? preset.data : MkbPreset.DEFAULT_PRESET), this.#resetGamepad();
    });
  };
  waitForMouseData = (wait) => {
    this.#$message && this.#$message.classList.toggle("bx-gone", !wait);
  };
  #onPollingModeChanged = (e) => {
    if (!this.#$message)
      return;
    if (e.mode === "None")
      this.#$message.classList.remove("bx-offscreen");
    else
      this.#$message.classList.add("bx-offscreen");
  };
  #onDialogShown = () => {
    document.pointerLockElement && document.exitPointerLock();
  };
  #initMessage = () => {
    if (!this.#$message)
      this.#$message = CE("div", { class: "bx-mkb-pointer-lock-msg bx-gone" }, CE("div", {}, CE("p", {}, t("virtual-controller")), CE("p", {}, t("press-key-to-toggle-mkb", { key: "F8" }))), CE("div", { "data-type": "virtual" }, createButton({
        style: ButtonStyle.PRIMARY | ButtonStyle.TALL | ButtonStyle.FULL_WIDTH,
        label: t("activate"),
        onClick: ((e) => {
          e.preventDefault(), e.stopPropagation(), this.toggle(!0);
        }).bind(this)
      }), CE("div", {}, createButton({
        label: t("ignore"),
        style: ButtonStyle.GHOST,
        onClick: (e) => {
          e.preventDefault(), e.stopPropagation(), this.toggle(!1), this.waitForMouseData(!1);
        }
      }), createButton({
        label: t("edit"),
        onClick: (e) => {
          e.preventDefault(), e.stopPropagation(), StreamSettings.getInstance().show("mkb");
        }
      }))));
    if (!this.#$message.isConnected)
      document.documentElement.appendChild(this.#$message);
  };
  #onPointerLockChange = () => {
    if (document.pointerLockElement)
      this.start();
    else
      this.stop();
  };
  #onPointerLockError = (e) => {
    console.log(e), this.stop();
  };
  #onPointerLockRequested = () => {
    this.start();
  };
  #onPointerLockExited = () => {
    this.#mouseDataProvider?.stop();
  };
  handleEvent(event) {
    switch (event.type) {
      case BxEvent.POINTER_LOCK_REQUESTED:
        this.#onPointerLockRequested();
        break;
      case BxEvent.POINTER_LOCK_EXITED:
        this.#onPointerLockExited();
        break;
    }
  }
  init = () => {
    if (this.refreshPresetData(), this.#enabled = !1, AppInterface)
      this.#mouseDataProvider = new WebSocketMouseDataProvider(this);
    else
      this.#mouseDataProvider = new PointerLockMouseDataProvider(this);
    if (this.#mouseDataProvider.init(), window.addEventListener("keydown", this.#onKeyboardEvent), window.addEventListener("keyup", this.#onKeyboardEvent), window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged), window.addEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this.#onDialogShown), AppInterface)
      window.addEventListener(BxEvent.POINTER_LOCK_REQUESTED, this), window.addEventListener(BxEvent.POINTER_LOCK_EXITED, this);
    else
      document.addEventListener("pointerlockchange", this.#onPointerLockChange), document.addEventListener("pointerlockerror", this.#onPointerLockError);
    if (this.#initMessage(), this.#$message?.classList.add("bx-gone"), AppInterface)
      Toast.show(t("press-key-to-toggle-mkb", { key: "<b>F8</b>" }), t("virtual-controller"), { html: !0 }), this.waitForMouseData(!1);
    else
      this.waitForMouseData(!0);
  };
  destroy = () => {
    if (this.#isPolling = !1, this.#enabled = !1, this.stop(), this.waitForMouseData(!1), document.pointerLockElement && document.exitPointerLock(), window.removeEventListener("keydown", this.#onKeyboardEvent), window.removeEventListener("keyup", this.#onKeyboardEvent), AppInterface)
      window.removeEventListener(BxEvent.POINTER_LOCK_REQUESTED, this), window.removeEventListener(BxEvent.POINTER_LOCK_EXITED, this);
    else
      document.removeEventListener("pointerlockchange", this.#onPointerLockChange), document.removeEventListener("pointerlockerror", this.#onPointerLockError);
    window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged), window.removeEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this.#onDialogShown), this.#mouseDataProvider?.destroy(), window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged);
  };
  start = () => {
    if (!this.#enabled)
      this.#enabled = !0, Toast.show(t("virtual-controller"), t("enabled"), { instant: !0 });
    this.#isPolling = !0, this.#escKeyDownTime = -1, this.#resetGamepad(), window.navigator.getGamepads = this.#patchedGetGamepads, this.waitForMouseData(!1), this.#mouseDataProvider?.start();
    const virtualGamepad = this.#getVirtualGamepad();
    virtualGamepad.connected = !0, virtualGamepad.timestamp = performance.now(), BxEvent.dispatch(window, "gamepadconnected", {
      gamepad: virtualGamepad
    }), window.BX_EXPOSED.stopTakRendering = !0, Toast.show(t("virtual-controller"), t("enabled"), { instant: !0 });
  };
  stop = () => {
    this.#enabled = !1, this.#isPolling = !1, this.#escKeyDownTime = -1;
    const virtualGamepad = this.#getVirtualGamepad();
    if (virtualGamepad.connected)
      this.#resetGamepad(), virtualGamepad.connected = !1, virtualGamepad.timestamp = performance.now(), BxEvent.dispatch(window, "gamepaddisconnected", {
        gamepad: virtualGamepad
      }), window.navigator.getGamepads = this.#nativeGetGamepads;
    this.waitForMouseData(!0), this.#mouseDataProvider?.stop();
  };
  static setupEvents() {
    window.addEventListener(BxEvent.STREAM_PLAYING, () => {
      if (STATES.currentStream.titleInfo?.details.hasMkbSupport) {
        if (AppInterface && getPref(PrefKey.NATIVE_MKB_ENABLED) === "on")
          AppInterface && NativeMkbHandler.getInstance().init();
      } else if (getPref(PrefKey.MKB_ENABLED) && (AppInterface || !UserAgent.isMobile()))
        BxLogger.info(LOG_TAG3, "Emulate MKB"), EmulatedMkbHandler.getInstance().init();
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
  static toggle(showToast = !0) {
    if (!window.BX_EXPOSED.streamSession)
      return !1;
    const enableMic = window.BX_EXPOSED.streamSession._microphoneState === MicrophoneState.ENABLED ? !1 : !0;
    try {
      return window.BX_EXPOSED.streamSession.tryEnableChatAsync(enableMic), showToast && Toast.show(t("microphone"), t(enableMic ? "unmuted" : "muted"), { instant: !0 }), enableMic;
    } catch (e) {
      console.log(e);
    }
    return !1;
  }
}

// src/modules/shortcuts/shortcut-stream-ui.ts
class StreamUiShortcut {
  static showHideStreamMenu() {
    window.BX_EXPOSED.showStreamMenu && window.BX_EXPOSED.showStreamMenu();
  }
}

// src/modules/controller-shortcut.ts
var ShortcutAction;
(function(ShortcutAction2) {
  ShortcutAction2["STREAM_SCREENSHOT_CAPTURE"] = "stream-screenshot-capture";
  ShortcutAction2["STREAM_MENU_SHOW"] = "stream-menu-show";
  ShortcutAction2["STREAM_STATS_TOGGLE"] = "stream-stats-toggle";
  ShortcutAction2["STREAM_SOUND_TOGGLE"] = "stream-sound-toggle";
  ShortcutAction2["STREAM_MICROPHONE_TOGGLE"] = "stream-microphone-toggle";
  ShortcutAction2["STREAM_VOLUME_INC"] = "stream-volume-inc";
  ShortcutAction2["STREAM_VOLUME_DEC"] = "stream-volume-dec";
  ShortcutAction2["DEVICE_SOUND_TOGGLE"] = "device-sound-toggle";
  ShortcutAction2["DEVICE_VOLUME_INC"] = "device-volume-inc";
  ShortcutAction2["DEVICE_VOLUME_DEC"] = "device-volume-dec";
  ShortcutAction2["DEVICE_BRIGHTNESS_INC"] = "device-brightness-inc";
  ShortcutAction2["DEVICE_BRIGHTNESS_DEC"] = "device-brightness-dec";
})(ShortcutAction || (ShortcutAction = {}));

class ControllerShortcut {
  static #STORAGE_KEY = "better_xcloud_controller_shortcuts";
  static #buttonsCache = {};
  static #buttonsStatus = {};
  static #$selectProfile;
  static #$selectActions = {};
  static #$container;
  static #ACTIONS = {};
  static reset(index) {
    ControllerShortcut.#buttonsCache[index] = [], ControllerShortcut.#buttonsStatus[index] = [];
  }
  static handle(gamepad) {
    const gamepadIndex = gamepad.index, actions = ControllerShortcut.#ACTIONS[gamepad.id];
    if (!actions)
      return !1;
    ControllerShortcut.#buttonsCache[gamepadIndex] = ControllerShortcut.#buttonsStatus[gamepadIndex].slice(0), ControllerShortcut.#buttonsStatus[gamepadIndex] = [];
    const pressed = [];
    let otherButtonPressed = !1;
    return gamepad.buttons.forEach((button, index) => {
      if (button.pressed && index !== GamepadKey.HOME) {
        if (otherButtonPressed = !0, pressed[index] = !0, actions[index] && !ControllerShortcut.#buttonsCache[gamepadIndex][index])
          setTimeout(() => ControllerShortcut.#runAction(actions[index]), 0);
      }
    }), ControllerShortcut.#buttonsStatus[gamepadIndex] = pressed, otherButtonPressed;
  }
  static #runAction(action) {
    switch (action) {
      case ShortcutAction.STREAM_SCREENSHOT_CAPTURE:
        Screenshot.takeScreenshot();
        break;
      case ShortcutAction.STREAM_STATS_TOGGLE:
        StreamStats.getInstance().toggle();
        break;
      case ShortcutAction.STREAM_MICROPHONE_TOGGLE:
        MicrophoneShortcut.toggle();
        break;
      case ShortcutAction.STREAM_MENU_SHOW:
        StreamUiShortcut.showHideStreamMenu();
        break;
      case ShortcutAction.STREAM_SOUND_TOGGLE:
        SoundShortcut.muteUnmute();
        break;
      case ShortcutAction.STREAM_VOLUME_INC:
        SoundShortcut.adjustGainNodeVolume(10);
        break;
      case ShortcutAction.STREAM_VOLUME_DEC:
        SoundShortcut.adjustGainNodeVolume(-10);
        break;
      case ShortcutAction.DEVICE_BRIGHTNESS_INC:
      case ShortcutAction.DEVICE_BRIGHTNESS_DEC:
      case ShortcutAction.DEVICE_SOUND_TOGGLE:
      case ShortcutAction.DEVICE_VOLUME_INC:
      case ShortcutAction.DEVICE_VOLUME_DEC:
        AppInterface && AppInterface.runShortcut && AppInterface.runShortcut(action);
        break;
    }
  }
  static #updateAction(profile, button, action) {
    if (!(profile in ControllerShortcut.#ACTIONS))
      ControllerShortcut.#ACTIONS[profile] = [];
    if (!action)
      action = null;
    ControllerShortcut.#ACTIONS[profile][button] = action;
    for (let key in ControllerShortcut.#ACTIONS) {
      let empty = !0;
      for (let value of ControllerShortcut.#ACTIONS[key])
        if (value) {
          empty = !1;
          break;
        }
      if (empty)
        delete ControllerShortcut.#ACTIONS[key];
    }
    window.localStorage.setItem(ControllerShortcut.#STORAGE_KEY, JSON.stringify(ControllerShortcut.#ACTIONS)), console.log(ControllerShortcut.#ACTIONS);
  }
  static #updateProfileList(e) {
    const $select = ControllerShortcut.#$selectProfile, $container = ControllerShortcut.#$container, $fragment = document.createDocumentFragment();
    while ($select.firstElementChild)
      $select.firstElementChild.remove();
    const gamepads = navigator.getGamepads();
    let hasGamepad = !1;
    for (let gamepad of gamepads) {
      if (!gamepad || !gamepad.connected)
        continue;
      if (gamepad.id === EmulatedMkbHandler.VIRTUAL_GAMEPAD_ID)
        continue;
      hasGamepad = !0;
      const $option = CE("option", { value: gamepad.id }, gamepad.id);
      $fragment.appendChild($option);
    }
    if (hasGamepad)
      $select.appendChild($fragment), $select.selectedIndex = 0, $select.dispatchEvent(new Event("change"));
    $container.dataset.hasGamepad = hasGamepad.toString();
  }
  static #switchProfile(profile) {
    let actions = ControllerShortcut.#ACTIONS[profile];
    if (!actions)
      actions = [];
    let button;
    for (button in ControllerShortcut.#$selectActions) {
      const $select = ControllerShortcut.#$selectActions[button];
      $select.value = actions[button] || "", BxEvent.dispatch($select, "change", {
        ignoreOnChange: !0
      });
    }
  }
  static renderSettings() {
    ControllerShortcut.#ACTIONS = JSON.parse(window.localStorage.getItem(ControllerShortcut.#STORAGE_KEY) || "{}");
    const buttons = new Map;
    buttons.set(GamepadKey.Y, PrompFont.Y), buttons.set(GamepadKey.A, PrompFont.A), buttons.set(GamepadKey.B, PrompFont.B), buttons.set(GamepadKey.X, PrompFont.X), buttons.set(GamepadKey.UP, PrompFont.UP), buttons.set(GamepadKey.DOWN, PrompFont.DOWN), buttons.set(GamepadKey.LEFT, PrompFont.LEFT), buttons.set(GamepadKey.RIGHT, PrompFont.RIGHT), buttons.set(GamepadKey.SELECT, PrompFont.SELECT), buttons.set(GamepadKey.START, PrompFont.START), buttons.set(GamepadKey.LB, PrompFont.LB), buttons.set(GamepadKey.RB, PrompFont.RB), buttons.set(GamepadKey.LT, PrompFont.LT), buttons.set(GamepadKey.RT, PrompFont.RT), buttons.set(GamepadKey.L3, PrompFont.L3), buttons.set(GamepadKey.R3, PrompFont.R3);
    const actions = {
      [t("device")]: AppInterface && {
        [ShortcutAction.DEVICE_SOUND_TOGGLE]: [t("sound"), t("toggle")],
        [ShortcutAction.DEVICE_VOLUME_INC]: [t("volume"), t("increase")],
        [ShortcutAction.DEVICE_VOLUME_DEC]: [t("volume"), t("decrease")],
        [ShortcutAction.DEVICE_BRIGHTNESS_INC]: [t("brightness"), t("increase")],
        [ShortcutAction.DEVICE_BRIGHTNESS_DEC]: [t("brightness"), t("decrease")]
      },
      [t("stream")]: {
        [ShortcutAction.STREAM_SCREENSHOT_CAPTURE]: t("take-screenshot"),
        [ShortcutAction.STREAM_SOUND_TOGGLE]: [t("sound"), t("toggle")],
        [ShortcutAction.STREAM_VOLUME_INC]: getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && [t("volume"), t("increase")],
        [ShortcutAction.STREAM_VOLUME_DEC]: getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && [t("volume"), t("decrease")],
        [ShortcutAction.STREAM_MENU_SHOW]: [t("menu"), t("show")],
        [ShortcutAction.STREAM_STATS_TOGGLE]: [t("stats"), t("show-hide")],
        [ShortcutAction.STREAM_MICROPHONE_TOGGLE]: [t("microphone"), t("toggle")]
      }
    }, $baseSelect = CE("select", { autocomplete: "off" }, CE("option", { value: "" }, "---"));
    for (let groupLabel in actions) {
      const items = actions[groupLabel];
      if (!items)
        continue;
      const $optGroup = CE("optgroup", { label: groupLabel });
      for (let action in items) {
        let label = items[action];
        if (!label)
          continue;
        if (Array.isArray(label))
          label = label.join(" ❯ ");
        const $option = CE("option", { value: action }, label);
        $optGroup.appendChild($option);
      }
      $baseSelect.appendChild($optGroup);
    }
    let $remap, $selectProfile;
    const $container = CE("div", { "data-has-gamepad": "false" }, CE("div", {}, CE("p", { class: "bx-shortcut-note" }, t("controller-shortcuts-connect-note"))), $remap = CE("div", {}, $selectProfile = CE("select", { class: "bx-shortcut-profile", autocomplete: "off" }), CE("p", { class: "bx-shortcut-note" }, CE("span", { class: "bx-prompt" }, PrompFont.HOME), ": " + t("controller-shortcuts-xbox-note"))));
    $selectProfile.addEventListener("change", (e) => {
      ControllerShortcut.#switchProfile($selectProfile.value);
    });
    const onActionChanged = (e) => {
      const $target = e.target, profile = $selectProfile.value, button = $target.dataset.button, action = $target.value, $fakeSelect = $target.previousElementSibling;
      let fakeText = "---";
      if (action) {
        const $selectedOption = $target.options[$target.selectedIndex];
        fakeText = $selectedOption.parentElement.label + " ❯ " + $selectedOption.text;
      }
      $fakeSelect.firstElementChild.text = fakeText, !e.ignoreOnChange && ControllerShortcut.#updateAction(profile, button, action);
    };
    for (let [button, prompt2] of buttons) {
      const $row = CE("div", { class: "bx-shortcut-row" }), $label = CE("label", { class: "bx-prompt" }, `${PrompFont.HOME} + ${prompt2}`), $div = CE("div", { class: "bx-shortcut-actions" }), $fakeSelect = CE("select", { autocomplete: "off" }, CE("option", {}, "---"));
      $div.appendChild($fakeSelect);
      const $select = $baseSelect.cloneNode(!0);
      $select.dataset.button = button.toString(), $select.addEventListener("change", onActionChanged), ControllerShortcut.#$selectActions[button] = $select, $div.appendChild($select), $row.appendChild($label), $row.appendChild($div), $remap.appendChild($row);
    }
    return $container.appendChild($remap), ControllerShortcut.#$selectProfile = $selectProfile, ControllerShortcut.#$container = $container, window.addEventListener("gamepadconnected", ControllerShortcut.#updateProfileList), window.addEventListener("gamepaddisconnected", ControllerShortcut.#updateProfileList), ControllerShortcut.#updateProfileList(), $container;
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
  getTitleInfo: () => STATES.currentStream.titleInfo,
  modifyTitleInfo: (titleInfo) => {
    titleInfo = deepClone(titleInfo);
    let supportedInputTypes = titleInfo.details.supportedInputTypes;
    if (BX_FLAGS.ForceNativeMkbTitles?.includes(titleInfo.details.productId))
      supportedInputTypes.push(InputType.MKB);
    if (getPref(PrefKey.NATIVE_MKB_ENABLED) === "off")
      supportedInputTypes = supportedInputTypes.filter((i) => i !== InputType.MKB);
    if (titleInfo.details.hasMkbSupport = supportedInputTypes.includes(InputType.MKB), STATES.userAgentHasTouchSupport) {
      let touchControllerAvailability = getPref(PrefKey.STREAM_TOUCH_CONTROLLER);
      if (touchControllerAvailability !== "off" && getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) {
        const gamepads = window.navigator.getGamepads();
        let gamepadFound = !1;
        for (let gamepad of gamepads)
          if (gamepad && gamepad.connected) {
            gamepadFound = !0;
            break;
          }
        gamepadFound && (touchControllerAvailability = "off");
      }
      if (touchControllerAvailability === "off")
        supportedInputTypes = supportedInputTypes.filter((i) => i !== InputType.CUSTOM_TOUCH_OVERLAY && i !== InputType.GENERIC_TOUCH), titleInfo.details.supportedTabs = [];
      if (titleInfo.details.hasNativeTouchSupport = supportedInputTypes.includes(InputType.NATIVE_TOUCH), titleInfo.details.hasTouchSupport = titleInfo.details.hasNativeTouchSupport || supportedInputTypes.includes(InputType.CUSTOM_TOUCH_OVERLAY) || supportedInputTypes.includes(InputType.GENERIC_TOUCH), !titleInfo.details.hasTouchSupport && touchControllerAvailability === "all")
        titleInfo.details.hasFakeTouchSupport = !0, supportedInputTypes.push(InputType.GENERIC_TOUCH);
    }
    return titleInfo.details.supportedInputTypes = supportedInputTypes, STATES.currentStream.titleInfo = titleInfo, BxEvent.dispatch(window, BxEvent.TITLE_INFO_READY), titleInfo;
  },
  setupGainNode: ($media, audioStream) => {
    if ($media instanceof HTMLAudioElement)
      $media.muted = !0, $media.addEventListener("playing", (e) => {
        $media.muted = !0, $media.pause();
      });
    else
      $media.muted = !0, $media.addEventListener("playing", (e) => {
        $media.muted = !0;
      });
    try {
      const audioCtx = STATES.currentStream.audioContext, source = audioCtx.createMediaStreamSource(audioStream), gainNode = audioCtx.createGain();
      source.connect(gainNode).connect(audioCtx.destination);
    } catch (e) {
      BxLogger.error("setupGainNode", e), STATES.currentStream.audioGainNode = null;
    }
  },
  handleControllerShortcut: ControllerShortcut.handle,
  resetControllerShortcut: ControllerShortcut.reset
};

// src/utils/region.ts
function getPreferredServerRegion(shortName = !1) {
  let preferredRegion = getPref(PrefKey.SERVER_REGION);
  if (preferredRegion in STATES.serverRegions)
    if (shortName && STATES.serverRegions[preferredRegion].shortName)
      return STATES.serverRegions[preferredRegion].shortName;
    else
      return preferredRegion;
  for (let regionName in STATES.serverRegions) {
    const region = STATES.serverRegions[regionName];
    if (!region.isDefault)
      continue;
    if (shortName && region.shortName)
      return region.shortName;
    else
      return regionName;
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
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60), mDisplay = m > 0 ? `${m}m` : "", sDisplay = `${s}s`.padStart(s >= 0 ? 3 : 4, "0");
    return mDisplay + sDisplay;
  }
  static setup() {
    const titleInfo = STATES.currentStream.titleInfo;
    if (!titleInfo)
      return;
    if (!LoadingScreen.#$bgStyle) {
      const $bgStyle = CE("style");
      document.documentElement.appendChild($bgStyle), LoadingScreen.#$bgStyle = $bgStyle;
    }
    if (LoadingScreen.#setBackground(titleInfo.product.heroImageUrl || titleInfo.product.titledHeroImageUrl || titleInfo.product.tileImageUrl), getPref(PrefKey.UI_LOADING_SCREEN_ROCKET) === "hide")
      LoadingScreen.#hideRocket();
  }
  static #hideRocket() {
    let $bgStyle = LoadingScreen.#$bgStyle;
    const css = `
#game-stream div[class*=RocketAnimation-module__container] > svg {
    display: none;
}

#game-stream video[class*=RocketAnimationVideo-module__video] {
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
    }, bg.src = imageUrl;
  }
  static setupWaitTime(waitTime) {
    if (getPref(PrefKey.UI_LOADING_SCREEN_ROCKET) === "hide-queue")
      LoadingScreen.#hideRocket();
    let secondsLeft = waitTime, $countDown, $estimated;
    LoadingScreen.#orgWebTitle = document.title;
    const endDate = new Date, timeZoneOffsetSeconds = endDate.getTimezoneOffset() * 60;
    endDate.setSeconds(endDate.getSeconds() + waitTime - timeZoneOffsetSeconds);
    let endDateStr = endDate.toISOString().slice(0, 19);
    endDateStr = endDateStr.substring(0, 10) + " " + endDateStr.substring(11, 19), endDateStr += ` (${LoadingScreen.#secondsToString(waitTime)})`;
    let $waitTimeBox = LoadingScreen.#$waitTimeBox;
    if (!$waitTimeBox)
      $waitTimeBox = CE("div", { class: "bx-wait-time-box" }, CE("label", {}, t("server")), CE("span", {}, getPreferredServerRegion()), CE("label", {}, t("wait-time-estimated")), $estimated = CE("span", {}), CE("label", {}, t("wait-time-countdown")), $countDown = CE("span", {})), document.documentElement.appendChild($waitTimeBox), LoadingScreen.#$waitTimeBox = $waitTimeBox;
    else
      $waitTimeBox.classList.remove("bx-gone"), $estimated = $waitTimeBox.querySelector(".bx-wait-time-estimated"), $countDown = $waitTimeBox.querySelector(".bx-wait-time-countdown");
    $estimated.textContent = endDateStr, $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft), document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`, LoadingScreen.#waitTimeInterval = window.setInterval(() => {
      if (secondsLeft--, $countDown.textContent = LoadingScreen.#secondsToString(secondsLeft), document.title = `[${$countDown.textContent}] ${LoadingScreen.#orgWebTitle}`, secondsLeft <= 0)
        LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval), LoadingScreen.#waitTimeInterval = null;
    }, 1000);
  }
  static hide() {
    if (LoadingScreen.#orgWebTitle && (document.title = LoadingScreen.#orgWebTitle), LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add("bx-gone"), getPref(PrefKey.UI_LOADING_SCREEN_GAME_ART) && LoadingScreen.#$bgStyle) {
      const $rocketBg = document.querySelector('#game-stream rect[width="800"]');
      $rocketBg && $rocketBg.addEventListener("transitionend", (e) => {
        LoadingScreen.#$bgStyle.textContent += `
#game-stream {
    background: #000 !important;
}
`;
      }), LoadingScreen.#$bgStyle.textContent += `
#game-stream rect[width="800"] {
    opacity: 1 !important;
}
`;
    }
    setTimeout(LoadingScreen.reset, 2000);
  }
  static reset() {
    LoadingScreen.#$bgStyle && (LoadingScreen.#$bgStyle.textContent = ""), LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add("bx-gone"), LoadingScreen.#waitTimeInterval && clearInterval(LoadingScreen.#waitTimeInterval), LoadingScreen.#waitTimeInterval = null;
  }
}

// src/modules/ui/ui.ts
function localRedirect(path) {
  const url = window.location.href.substring(0, 31) + path, $pageContent = document.getElementById("PageContent");
  if (!$pageContent)
    return;
  const $anchor = CE("a", {
    href: url,
    class: "bx-hidden bx-offscreen"
  }, "");
  $anchor.addEventListener("click", (e) => {
    window.setTimeout(() => {
      $pageContent.removeChild($anchor);
    }, 1000);
  }), $pageContent.appendChild($anchor), $anchor.click();
}
function setupStreamUi() {
  StreamSettings.getInstance(), onChangeVideoPlayerType();
}

// src/modules/remote-play.ts
var LOG_TAG4 = "RemotePlay", RemotePlayConsoleState;
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
    if (RemotePlay.#$content)
      return;
    RemotePlay.#$content = CE("div", {}, t("getting-consoles-list")), RemotePlay.#getXhomeToken(() => {
      RemotePlay.#getConsolesList(() => {
        BxLogger.info(LOG_TAG4, "Consoles", RemotePlay.#CONSOLES), RemotePlay.#renderConsoles(), BxEvent.dispatch(window, BxEvent.REMOTE_PLAY_READY);
      });
    });
  }
  static #renderConsoles() {
    const $fragment = CE("div", { class: "bx-remote-play-container" });
    if (!RemotePlay.#CONSOLES || RemotePlay.#CONSOLES.length === 0) {
      $fragment.appendChild(CE("span", {}, t("no-consoles-found"))), RemotePlay.#$content = CE("div", {}, $fragment);
      return;
    }
    const $settingNote = CE("p", {}), resolutions = [1080, 720], currentResolution = getPref(PrefKey.REMOTE_PLAY_RESOLUTION), $resolutionGroup = CE("div", {});
    for (let resolution of resolutions) {
      const value = `${resolution}p`, id2 = `bx_radio_xhome_resolution_${resolution}`, $radio = CE("input", {
        type: "radio",
        value,
        id: id2,
        name: "bx_radio_xhome_resolution"
      }, value);
      $radio.addEventListener("change", (e) => {
        const value2 = e.target.value;
        $settingNote.textContent = value2 === "1080p" ? "✅ " + t("can-stream-xbox-360-games") : "❌ " + t("cant-stream-xbox-360-games"), setPref(PrefKey.REMOTE_PLAY_RESOLUTION, value2);
      });
      const $label = CE("label", {
        for: id2,
        class: "bx-remote-play-resolution"
      }, $radio, `${resolution}p`);
      if ($resolutionGroup.appendChild($label), currentResolution === value)
        $radio.checked = !0, $radio.dispatchEvent(new Event("change"));
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
    })), RemotePlay.#$content = CE("div", {}, $fragment);
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
        if (!key.startsWith("Auth.User."))
          continue;
        const json = JSON.parse(localStorage.getItem(key));
        for (let token of json.tokens) {
          if (!token.relyingParty.includes("gssv.xboxlive.com"))
            continue;
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
      RemotePlay.#REGIONS = json.offeringSettings.regions, RemotePlay.XHOME_TOKEN = json.gsToken, callback();
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
    for (let region2 of RemotePlay.#REGIONS) {
      try {
        const request = new Request(`${region2.baseUri}/v6/servers/home?mr=50`, options), json = await (await fetch(request)).json();
        RemotePlay.#CONSOLES = json.results, STATES.remotePlay.server = region2.baseUri, callback();
      } catch (e) {
      }
      if (RemotePlay.#CONSOLES)
        break;
    }
    if (!STATES.remotePlay.server)
      RemotePlay.#CONSOLES = [];
  }
  static play(serverId, resolution) {
    if (resolution)
      setPref(PrefKey.REMOTE_PLAY_RESOLUTION, resolution);
    STATES.remotePlay.config = {
      serverId
    }, window.BX_REMOTE_PLAY_CONFIG = STATES.remotePlay.config, localRedirect("/launch/fortnite/BT5P2X999VH2#remote-play"), RemotePlay.detachPopup();
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
    if (RemotePlay.#initialize(), AppInterface && AppInterface.showRemotePlayDialog) {
      AppInterface.showRemotePlayDialog(JSON.stringify(RemotePlay.#CONSOLES)), document.activeElement.blur();
      return;
    }
    if (document.querySelector(".bx-remote-play-popup")) {
      if (force === !1)
        RemotePlay.#$content.classList.add("bx-gone");
      else
        RemotePlay.#$content.classList.toggle("bx-gone");
      return;
    }
    const $header = document.querySelector("#gamepass-root header"), group = $header.firstElementChild.getAttribute("data-group");
    RemotePlay.#$content.setAttribute("data-group", group), RemotePlay.#$content.classList.add("bx-remote-play-popup"), RemotePlay.#$content.classList.remove("bx-gone"), $header.insertAdjacentElement("afterend", RemotePlay.#$content);
  }
  static detect() {
    if (!getPref(PrefKey.REMOTE_PLAY_ENABLED))
      return;
    if (STATES.remotePlay.isPlaying = window.location.pathname.includes("/launch/") && window.location.hash.startsWith("#remote-play"), STATES.remotePlay?.isPlaying)
      window.BX_REMOTE_PLAY_CONFIG = STATES.remotePlay.config, window.history.replaceState({ origin: "better-xcloud" }, "", "https://www.xbox.com/" + location.pathname.substring(1, 6) + "/play");
    else
      window.BX_REMOTE_PLAY_CONFIG = null;
  }
  static isReady() {
    return RemotePlay.#CONSOLES !== null && RemotePlay.#CONSOLES.length > 0;
  }
}

// src/modules/stream/stream-badges.ts
var StreamBadge;
(function(StreamBadge2) {
  StreamBadge2["PLAYTIME"] = "playtime";
  StreamBadge2["BATTERY"] = "battery";
  StreamBadge2["DOWNLOAD"] = "in";
  StreamBadge2["UPLOAD"] = "out";
  StreamBadge2["SERVER"] = "server";
  StreamBadge2["VIDEO"] = "video";
  StreamBadge2["AUDIO"] = "audio";
})(StreamBadge || (StreamBadge = {}));
var StreamBadgeIcon = {
  [StreamBadge.PLAYTIME]: BxIcon.PLAYTIME,
  [StreamBadge.VIDEO]: BxIcon.DISPLAY,
  [StreamBadge.BATTERY]: BxIcon.BATTERY,
  [StreamBadge.DOWNLOAD]: BxIcon.DOWNLOAD,
  [StreamBadge.UPLOAD]: BxIcon.UPLOAD,
  [StreamBadge.SERVER]: BxIcon.SERVER,
  [StreamBadge.AUDIO]: BxIcon.AUDIO
};

class StreamBadges {
  static instance;
  static getInstance() {
    if (!StreamBadges.instance)
      StreamBadges.instance = new StreamBadges;
    return StreamBadges.instance;
  }
  #ipv6 = !1;
  #resolution = null;
  #video = null;
  #audio = null;
  #region = "";
  startBatteryLevel = 100;
  startTimestamp = 0;
  #$container;
  #cachedDoms = {};
  #interval;
  #REFRESH_INTERVAL = 3000;
  setRegion(region2) {
    this.#region = region2;
  }
  #renderBadge(name, value, color) {
    let $badge;
    if (this.#cachedDoms[name])
      return $badge = this.#cachedDoms[name], $badge.lastElementChild.textContent = value, $badge;
    if ($badge = CE("div", { class: "bx-badge", title: t(`badge-${name}`) }, CE("span", { class: "bx-badge-name" }, createSvgIcon(StreamBadgeIcon[name])), CE("span", { class: "bx-badge-value", style: `background-color: ${color}` }, value)), name === StreamBadge.BATTERY)
      $badge.classList.add("bx-badge-battery");
    return this.#cachedDoms[name] = $badge, $badge;
  }
  async#updateBadges(forceUpdate = !1) {
    if (!this.#$container || !forceUpdate && !this.#$container.isConnected) {
      this.#stop();
      return;
    }
    let now = +new Date;
    const diffSeconds = Math.ceil((now - this.startTimestamp) / 1000), playtime = this.#secondsToHm(diffSeconds);
    let batteryLevel = "100%", batteryLevelInt = 100, isCharging = !1;
    if ("getBattery" in navigator)
      try {
        const bm = await navigator.getBattery();
        if (isCharging = bm.charging, batteryLevelInt = Math.round(bm.level * 100), batteryLevel = `${batteryLevelInt}%`, batteryLevelInt != this.startBatteryLevel) {
          const diffLevel = Math.round(batteryLevelInt - this.startBatteryLevel), sign = diffLevel > 0 ? "+" : "";
          batteryLevel += ` (${sign}${diffLevel}%)`;
        }
      } catch (e) {
      }
    const stats = await STATES.currentStream.peerConnection?.getStats();
    let totalIn = 0, totalOut = 0;
    stats.forEach((stat) => {
      if (stat.type === "candidate-pair" && stat.packetsReceived > 0 && stat.state === "succeeded")
        totalIn += stat.bytesReceived, totalOut += stat.bytesSent;
    });
    const badges = {
      [StreamBadge.DOWNLOAD]: totalIn ? this.#humanFileSize(totalIn) : null,
      [StreamBadge.UPLOAD]: totalOut ? this.#humanFileSize(totalOut) : null,
      [StreamBadge.PLAYTIME]: playtime,
      [StreamBadge.BATTERY]: batteryLevel
    };
    let name;
    for (name in badges) {
      const value = badges[name];
      if (value === null)
        continue;
      const $elm = this.#cachedDoms[name];
      if ($elm && ($elm.lastElementChild.textContent = value), name === StreamBadge.BATTERY)
        if (this.startBatteryLevel === 100 && batteryLevelInt === 100)
          $elm.classList.add("bx-gone");
        else
          $elm.dataset.charging = isCharging.toString(), $elm.classList.remove("bx-gone");
    }
  }
  async#start() {
    await this.#updateBadges(!0), this.#stop(), this.#interval = window.setInterval(this.#updateBadges.bind(this), this.#REFRESH_INTERVAL);
  }
  #stop() {
    this.#interval && clearInterval(this.#interval), this.#interval = null;
  }
  #secondsToHm(seconds) {
    let h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60) + 1;
    if (m === 60)
      h += 1, m = 0;
    const output = [];
    return h > 0 && output.push(`${h}h`), m > 0 && output.push(`${m}m`), output.join(" ");
  }
  #humanFileSize(size) {
    const units = ["B", "KB", "MB", "GB", "TB"], i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) + " " + units[i];
  }
  async render() {
    if (this.#$container)
      return this.#start(), this.#$container;
    await this.#getServerStats();
    let video = "";
    if (this.#resolution)
      video = `${this.#resolution.height}p`;
    if (this.#video) {
      if (video && (video += "/"), video += this.#video.codec, this.#video.profile) {
        const profile = this.#video.profile;
        let quality = profile;
        if (profile.startsWith("4d"))
          quality = t("visual-quality-high");
        else if (profile.startsWith("42e"))
          quality = t("visual-quality-normal");
        else if (profile.startsWith("420"))
          quality = t("visual-quality-low");
        video += ` (${quality})`;
      }
    }
    let audio;
    if (this.#audio) {
      audio = this.#audio.codec;
      const bitrate = this.#audio.bitrate / 1000;
      audio += ` (${bitrate} kHz)`;
    }
    let batteryLevel = "";
    if ("getBattery" in navigator)
      batteryLevel = "100%";
    let server = this.#region;
    server += "@" + (this.#ipv6 ? "IPv6" : "IPv4");
    const BADGES = [
      [StreamBadge.PLAYTIME, "1m", "#ff004d"],
      [StreamBadge.BATTERY, batteryLevel, "#00b543"],
      [StreamBadge.DOWNLOAD, this.#humanFileSize(0), "#29adff"],
      [StreamBadge.UPLOAD, this.#humanFileSize(0), "#ff77a8"],
      [StreamBadge.SERVER, server, "#ff6c24"],
      video ? [StreamBadge.VIDEO, video, "#742f29"] : null,
      audio ? [StreamBadge.AUDIO, audio, "#5f574f"] : null
    ], $container = CE("div", { class: "bx-badges" });
    return BADGES.forEach((item2) => {
      if (!item2)
        return;
      const $badge = this.#renderBadge(...item2);
      $container.appendChild($badge);
    }), this.#$container = $container, await this.#start(), $container;
  }
  async#getServerStats() {
    const stats = await STATES.currentStream.peerConnection.getStats(), allVideoCodecs = {};
    let videoCodecId;
    const allAudioCodecs = {};
    let audioCodecId;
    const allCandidates = {};
    let candidateId;
    if (stats.forEach((stat) => {
      if (stat.type === "codec") {
        const mimeType = stat.mimeType.split("/")[0];
        if (mimeType === "video")
          allVideoCodecs[stat.id] = stat;
        else if (mimeType === "audio")
          allAudioCodecs[stat.id] = stat;
      } else if (stat.type === "inbound-rtp" && stat.packetsReceived > 0) {
        if (stat.kind === "video")
          videoCodecId = stat.codecId;
        else if (stat.kind === "audio")
          audioCodecId = stat.codecId;
      } else if (stat.type === "candidate-pair" && stat.packetsReceived > 0 && stat.state === "succeeded")
        candidateId = stat.remoteCandidateId;
      else if (stat.type === "remote-candidate")
        allCandidates[stat.id] = stat.address;
    }), videoCodecId) {
      const videoStat = allVideoCodecs[videoCodecId], video = {
        codec: videoStat.mimeType.substring(6)
      };
      if (video.codec === "H264") {
        const match = /profile-level-id=([0-9a-f]{6})/.exec(videoStat.sdpFmtpLine);
        video.profile = match ? match[1] : null;
      }
      this.#video = video;
    }
    if (audioCodecId) {
      const audioStat = allAudioCodecs[audioCodecId];
      this.#audio = {
        codec: audioStat.mimeType.substring(6),
        bitrate: audioStat.clockRate
      };
    }
    if (candidateId)
      BxLogger.info("candidate", candidateId, allCandidates), this.#ipv6 = allCandidates[candidateId].includes(":");
  }
  static setupEvents() {
    window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
      const $video = e.$video, streamBadges = StreamBadges.getInstance();
      streamBadges.#resolution = {
        width: $video.videoWidth,
        height: $video.videoHeight
      }, streamBadges.startTimestamp = +new Date;
      try {
        "getBattery" in navigator && navigator.getBattery().then((bm) => {
          streamBadges.startBatteryLevel = Math.round(bm.level * 100);
        });
      } catch (e2) {
      }
    });
  }
}

// src/enums/game-pass-gallery.ts
var GamePassCloudGallery;
(function(GamePassCloudGallery2) {
  GamePassCloudGallery2["ALL"] = "29a81209-df6f-41fd-a528-2ae6b91f719c";
  GamePassCloudGallery2["NATIVE_MKB"] = "8fa264dd-124f-4af3-97e8-596fcdf4b486";
  GamePassCloudGallery2["TOUCH"] = "9c86f07a-f3e8-45ad-82a0-a1f759597059";
})(GamePassCloudGallery || (GamePassCloudGallery = {}));

// src/utils/feature-gates.ts
var FeatureGates = {
  PwaPrompt: !1
};
if (getPref(PrefKey.UI_HOME_CONTEXT_MENU_DISABLED))
  FeatureGates.EnableHomeContextMenu = !1;
if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES))
  FeatureGates.EnableGuideChatTab = !1;
if (BX_FLAGS.FeatureGates)
  FeatureGates = Object.assign(BX_FLAGS.FeatureGates, FeatureGates);

// src/utils/network.ts
var clearApplicationInsightsBuffers = function() {
  window.sessionStorage.removeItem("AI_buffer"), window.sessionStorage.removeItem("AI_sentBuffer");
}, clearDbLogs = function(dbName, table) {
  const request = window.indexedDB.open(dbName);
  request.onsuccess = (e) => {
    const db = e.target.result;
    try {
      const objectStoreRequest = db.transaction(table, "readwrite").objectStore(table).clear();
      objectStoreRequest.onsuccess = function() {
        console.log(`[Better xCloud] Cleared ${dbName}.${table}`);
      };
    } catch (ex) {
    }
  };
}, clearAllLogs = function() {
  clearApplicationInsightsBuffers(), clearDbLogs("StreamClientLogHandler", "logs"), clearDbLogs("XCloudAppLogs", "logs");
}, updateIceCandidates = function(candidates, options) {
  const pattern = new RegExp(/a=candidate:(?<foundation>\d+) (?<component>\d+) UDP (?<priority>\d+) (?<ip>[^\s]+) (?<port>\d+) (?<the_rest>.*)/), lst = [];
  for (let item2 of candidates) {
    if (item2.candidate == "a=end-of-candidates")
      continue;
    const groups = pattern.exec(item2.candidate).groups;
    lst.push(groups);
  }
  if (options.preferIpv6Server)
    lst.sort((a, b) => {
      const firstIp = a.ip, secondIp = b.ip;
      return !firstIp.includes(":") && secondIp.includes(":") ? 1 : -1;
    });
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
  if (lst.forEach((item2) => {
    item2.foundation = foundation, item2.priority = foundation == 1 ? 2130706431 : 1, newCandidates.push(newCandidate(`a=candidate:${item2.foundation} 1 UDP ${item2.priority} ${item2.ip} ${item2.port} ${item2.the_rest}`)), ++foundation;
  }), options.consoleAddrs)
    for (let ip in options.consoleAddrs) {
      const port = options.consoleAddrs[ip];
      newCandidates.push(newCandidate(`a=candidate:${newCandidates.length + 1} 1 UDP 1 ${ip} ${port} typ host`));
    }
  return newCandidates.push(newCandidate("a=end-of-candidates")), console.log(newCandidates), newCandidates;
};
async function patchIceCandidates(request, consoleAddrs) {
  const response = await NATIVE_FETCH(request), text = await response.clone().text();
  if (!text.length)
    return response;
  const options = {
    preferIpv6Server: getPref(PrefKey.PREFER_IPV6_SERVER),
    consoleAddrs
  }, obj = JSON.parse(text);
  let exchangeResponse = JSON.parse(obj.exchangeResponse);
  return exchangeResponse = updateIceCandidates(exchangeResponse, options), obj.exchangeResponse = JSON.stringify(exchangeResponse), response.json = () => Promise.resolve(obj), response.text = () => Promise.resolve(JSON.stringify(obj)), response;
}
function interceptHttpRequests() {
  let BLOCKED_URLS = [];
  if (getPref(PrefKey.BLOCK_TRACKING))
    clearAllLogs(), BLOCKED_URLS = BLOCKED_URLS.concat([
      "https://arc.msn.com",
      "https://browser.events.data.microsoft.com",
      "https://dc.services.visualstudio.com",
      "https://2c06dea3f26c40c69b8456d319791fd0@o427368.ingest.sentry.io"
    ]);
  if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES))
    BLOCKED_URLS = BLOCKED_URLS.concat([
      "https://peoplehub.xboxlive.com/users/me/people/social",
      "https://peoplehub.xboxlive.com/users/me/people/recommendations",
      "https://xblmessaging.xboxlive.com/network/xbox/users/me/inbox"
    ]);
  const xhrPrototype = XMLHttpRequest.prototype, nativeXhrOpen = xhrPrototype.open, nativeXhrSend = xhrPrototype.send;
  xhrPrototype.open = function(method, url) {
    return this._url = url, nativeXhrOpen.apply(this, arguments);
  }, xhrPrototype.send = function(...arg) {
    for (let blocked of BLOCKED_URLS)
      if (this._url.startsWith(blocked)) {
        if (blocked === "https://dc.services.visualstudio.com")
          window.setTimeout(clearAllLogs, 1000);
        return !1;
      }
    return nativeXhrSend.apply(this, arguments);
  };
  let gamepassAllGames = [];
  window.BX_FETCH = window.fetch = async (request, init) => {
    let url = typeof request === "string" ? request : request.url;
    for (let blocked of BLOCKED_URLS) {
      if (!url.startsWith(blocked))
        continue;
      return new Response('{"acc":1,"webResult":{}}', {
        status: 200,
        statusText: "200 OK"
      });
    }
    if (url.endsWith("/play"))
      BxEvent.dispatch(window, BxEvent.STREAM_LOADING);
    if (url.endsWith("/configuration"))
      BxEvent.dispatch(window, BxEvent.STREAM_STARTING);
    if (url.startsWith("https://emerald.xboxservices.com/xboxcomfd/experimentation"))
      try {
        const response = await NATIVE_FETCH(request, init), json = await response.json();
        if (json && json.exp && json.treatments)
          for (let key in FeatureGates)
            json.exp.treatments[key] = FeatureGates[key];
        return response.json = () => Promise.resolve(json), response;
      } catch (e) {
        console.log(e);
      }
    if (STATES.userAgentHasTouchSupport && url.includes("catalog.gamepass.com/sigls/")) {
      const response = await NATIVE_FETCH(request, init), obj = await response.clone().json();
      if (url.includes(GamePassCloudGallery.ALL))
        for (let i = 1;i < obj.length; i++)
          gamepassAllGames.push(obj[i].id);
      else if (url.includes(GamePassCloudGallery.TOUCH))
        try {
          let customList = TouchController.getCustomList();
          customList = customList.filter((id2) => gamepassAllGames.includes(id2));
          const newCustomList = customList.map((item2) => ({ id: item2 }));
          obj.push(...newCustomList);
        } catch (e) {
          console.log(e);
        }
      return response.json = () => Promise.resolve(obj), response;
    }
    if (BX_FLAGS.ForceNativeMkbTitles && url.includes("catalog.gamepass.com/sigls/") && url.includes(GamePassCloudGallery.NATIVE_MKB)) {
      const response = await NATIVE_FETCH(request, init), obj = await response.clone().json();
      try {
        const newCustomList = BX_FLAGS.ForceNativeMkbTitles.map((item2) => ({ id: item2 }));
        obj.push(...newCustomList);
      } catch (e) {
        console.log(e);
      }
      return response.json = () => Promise.resolve(obj), response;
    }
    let requestType;
    if (url.includes("/sessions/home") || url.includes("xhome.") || STATES.remotePlay.isPlaying && url.endsWith("/inputconfigs"))
      requestType = RequestType.XHOME;
    else
      requestType = RequestType.XCLOUD;
    if (requestType === RequestType.XHOME)
      return XhomeInterceptor.handle(request);
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
      const obj = await request.clone().json();
      obj.offeringId = "xhome", request = new Request("https://xhome.gssv-play-prod.xboxlive.com/v2/login/user", {
        method: "POST",
        body: JSON.stringify(obj),
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (e) {
      alert(e), console.log(e);
    }
    return NATIVE_FETCH(request);
  }
  static async#handleConfiguration(request) {
    const response = await NATIVE_FETCH(request), obj = await response.clone().json();
    console.log(obj);
    const serverDetails = obj.serverDetails;
    if (serverDetails.ipV4Address)
      XhomeInterceptor.#consoleAddrs[serverDetails.ipV4Address] = serverDetails.ipV4Port;
    if (serverDetails.ipV6Address)
      XhomeInterceptor.#consoleAddrs[serverDetails.ipV6Address] = serverDetails.ipV6Port;
    return response.json = () => Promise.resolve(obj), response.text = () => Promise.resolve(JSON.stringify(obj)), response;
  }
  static async#handleInputConfigs(request, opts) {
    const response = await NATIVE_FETCH(request);
    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== "all")
      return response;
    const obj = await response.clone().json(), xboxTitleId = JSON.parse(opts.body).titleIds[0];
    STATES.currentStream.xboxTitleId = xboxTitleId;
    const inputConfigs = obj[0];
    let hasTouchSupport = inputConfigs.supportedTabs.length > 0;
    if (!hasTouchSupport) {
      const supportedInputTypes = inputConfigs.supportedInputTypes;
      hasTouchSupport = supportedInputTypes.includes(InputType.NATIVE_TOUCH) || supportedInputTypes.includes(InputType.CUSTOM_TOUCH_OVERLAY);
    }
    if (hasTouchSupport)
      TouchController.disable(), BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, {
        data: null
      });
    else
      TouchController.enable(), TouchController.getCustomLayouts(xboxTitleId);
    return response.json = () => Promise.resolve(obj), response.text = () => Promise.resolve(JSON.stringify(obj)), response;
  }
  static async#handleTitles(request) {
    const clone = request.clone(), headers = {};
    for (let pair of clone.headers.entries())
      headers[pair[0]] = pair[1];
    headers.authorization = `Bearer ${RemotePlay.XCLOUD_TOKEN}`;
    const index = request.url.indexOf(".xboxlive.com");
    return request = new Request("https://wus.core.gssv-play-prod" + request.url.substring(index), {
      method: clone.method,
      body: await clone.text(),
      headers
    }), NATIVE_FETCH(request);
  }
  static async#handlePlay(request) {
    const body = await request.clone().json(), newRequest = new Request(request, {
      body: JSON.stringify(body)
    });
    return NATIVE_FETCH(newRequest);
  }
  static async handle(request) {
    TouchController.disable();
    const clone = request.clone(), headers = {};
    for (let pair of clone.headers.entries())
      headers[pair[0]] = pair[1];
    headers.authorization = `Bearer ${RemotePlay.XHOME_TOKEN}`;
    const deviceInfo = RemotePlay.BASE_DEVICE_INFO;
    if (getPref(PrefKey.REMOTE_PLAY_RESOLUTION) === "720p")
      deviceInfo.dev.os.name = "android";
    headers["x-ms-device-info"] = JSON.stringify(deviceInfo);
    const opts = {
      method: clone.method,
      headers
    };
    if (clone.method === "POST")
      opts.body = await clone.text();
    let newUrl = request.url;
    if (!newUrl.includes("/servers/home")) {
      const index = request.url.indexOf(".xboxlive.com");
      newUrl = STATES.remotePlay.server + request.url.substring(index + 13);
    }
    request = new Request(newUrl, opts);
    let url = typeof request === "string" ? request : request.url;
    if (url.includes("/configuration"))
      return XhomeInterceptor.#handleConfiguration(request);
    else if (url.endsWith("/sessions/home/play"))
      return XhomeInterceptor.#handlePlay(request);
    else if (url.includes("inputconfigs"))
      return XhomeInterceptor.#handleInputConfigs(request, opts);
    else if (url.includes("/login/user"))
      return XhomeInterceptor.#handleLogin(request);
    else if (url.endsWith("/titles"))
      return XhomeInterceptor.#handleTitles(request);
    else if (url && url.endsWith("/ice") && url.includes("/sessions/") && request.method === "GET")
      return patchIceCandidates(request, XhomeInterceptor.#consoleAddrs);
    return await NATIVE_FETCH(request);
  }
}

class XcloudInterceptor {
  static async#handleLogin(request, init) {
    const response = await NATIVE_FETCH(request, init), obj = await response.clone().json();
    getPref(PrefKey.REMOTE_PLAY_ENABLED) && BX_FLAGS.PreloadRemotePlay && RemotePlay.preload(), RemotePlay.XCLOUD_TOKEN = obj.gsToken;
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
    }, serverRegex = /\/\/(\w+)\./;
    for (let region3 of obj.offeringSettings.regions) {
      const regionName = region3.name;
      let shortName = region3.name, match = serverRegex.exec(region3.baseUri);
      if (match) {
        if (shortName = match[1], serverEmojis[regionName])
          shortName = serverEmojis[regionName] + " " + shortName;
      }
      region3.shortName = shortName.toUpperCase(), STATES.serverRegions[region3.name] = Object.assign({}, region3);
    }
    BxEvent.dispatch(window, BxEvent.XCLOUD_SERVERS_READY);
    const preferredRegion = getPreferredServerRegion();
    if (preferredRegion in STATES.serverRegions) {
      const tmp = Object.assign({}, STATES.serverRegions[preferredRegion]);
      tmp.isDefault = !0, obj.offeringSettings.regions = [tmp];
    }
    return response.json = () => Promise.resolve(obj), response;
  }
  static async#handlePlay(request, init) {
    const PREF_STREAM_TARGET_RESOLUTION = getPref(PrefKey.STREAM_TARGET_RESOLUTION), PREF_STREAM_PREFERRED_LOCALE = getPref(PrefKey.STREAM_PREFERRED_LOCALE), url = typeof request === "string" ? request : request.url, parsedUrl = new URL(url);
    let badgeRegion = parsedUrl.host.split(".", 1)[0];
    for (let regionName in STATES.serverRegions) {
      const region3 = STATES.serverRegions[regionName];
      if (parsedUrl.origin == region3.baseUri) {
        badgeRegion = regionName;
        break;
      }
    }
    StreamBadges.getInstance().setRegion(badgeRegion);
    const body = await request.clone().json();
    if (PREF_STREAM_TARGET_RESOLUTION !== "auto") {
      const osName = PREF_STREAM_TARGET_RESOLUTION === "720p" ? "android" : "windows";
      body.settings.osName = osName;
    }
    if (PREF_STREAM_PREFERRED_LOCALE !== "default")
      body.settings.locale = PREF_STREAM_PREFERRED_LOCALE;
    const newRequest = new Request(request, {
      body: JSON.stringify(body)
    });
    return NATIVE_FETCH(newRequest);
  }
  static async#handleWaitTime(request, init) {
    const response = await NATIVE_FETCH(request, init);
    if (getPref(PrefKey.UI_LOADING_SCREEN_WAIT_TIME)) {
      const json = await response.clone().json();
      if (json.estimatedAllocationTimeInSeconds > 0)
        LoadingScreen.setupWaitTime(json.estimatedTotalWaitTimeInSeconds);
    }
    return response;
  }
  static async#handleConfiguration(request, init) {
    if (request.method !== "GET")
      return NATIVE_FETCH(request, init);
    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "all")
      if (STATES.currentStream.titleInfo?.details.hasTouchSupport)
        TouchController.disable();
      else
        TouchController.enable();
    const response = await NATIVE_FETCH(request, init), text = await response.clone().text();
    if (!text.length)
      return response;
    const obj = JSON.parse(text);
    let overrides = JSON.parse(obj.clientStreamingConfigOverrides || "{}") || {};
    overrides.inputConfiguration = overrides.inputConfiguration || {}, overrides.inputConfiguration.enableVibration = !0;
    let overrideMkb = null;
    if (getPref(PrefKey.NATIVE_MKB_ENABLED) === "on" || BX_FLAGS.ForceNativeMkbTitles?.includes(STATES.currentStream.titleInfo.details.productId))
      overrideMkb = !0;
    if (getPref(PrefKey.NATIVE_MKB_ENABLED) === "off")
      overrideMkb = !1;
    if (overrideMkb !== null)
      overrides.inputConfiguration = Object.assign(overrides.inputConfiguration, {
        enableMouseInput: overrideMkb,
        enableKeyboardInput: overrideMkb
      });
    if (TouchController.isEnabled())
      overrides.inputConfiguration.enableTouchInput = !0, overrides.inputConfiguration.maxTouchPoints = 10;
    if (getPref(PrefKey.AUDIO_MIC_ON_PLAYING))
      overrides.audioConfiguration = overrides.audioConfiguration || {}, overrides.audioConfiguration.enableMicrophone = !0;
    return obj.clientStreamingConfigOverrides = JSON.stringify(overrides), response.json = () => Promise.resolve(obj), response.text = () => Promise.resolve(JSON.stringify(obj)), response;
  }
  static async handle(request, init) {
    let url = typeof request === "string" ? request : request.url;
    if (url.endsWith("/v2/login/user"))
      return XcloudInterceptor.#handleLogin(request, init);
    else if (url.endsWith("/sessions/cloud/play"))
      return XcloudInterceptor.#handlePlay(request, init);
    else if (url.includes("xboxlive.com") && url.includes("/waittime/"))
      return XcloudInterceptor.#handleWaitTime(request, init);
    else if (url.endsWith("/configuration"))
      return XcloudInterceptor.#handleConfiguration(request, init);
    else if (url && url.endsWith("/ice") && url.includes("/sessions/") && request.method === "GET")
      return patchIceCandidates(request);
    return NATIVE_FETCH(request, init);
  }
}

// src/utils/gamepad.ts
function showGamepadToast(gamepad) {
  if (gamepad.id === EmulatedMkbHandler.VIRTUAL_GAMEPAD_ID)
    return;
  BxLogger.info("Gamepad", gamepad);
  let text = "🎮";
  if (getPref(PrefKey.LOCAL_CO_OP_ENABLED))
    text += ` #${gamepad.index + 1}`;
  const gamepadId = gamepad.id.replace(/ \(.*?Vendor: \w+ Product: \w+\)$/, "");
  text += ` - ${gamepadId}`;
  let status;
  if (gamepad.connected)
    status = (gamepad.vibrationActuator ? "✅" : "❌") + " " + t("vibration-status");
  else
    status = t("disconnected");
  Toast.show(text, status, { instant: !1 });
}

// src/utils/css.ts
function addCss() {
  let css = `:root{--bx-title-font:Bahnschrift,Arial,Helvetica,sans-serif;--bx-title-font-semibold:Bahnschrift Semibold,Arial,Helvetica,sans-serif;--bx-normal-font:"Segoe UI",Arial,Helvetica,sans-serif;--bx-monospaced-font:Consolas,"Courier New",Courier,monospace;--bx-promptfont-font:promptfont;--bx-button-height:36px;--bx-default-button-color:#2d3036;--bx-default-button-hover-color:#515863;--bx-default-button-disabled-color:#8e8e8e;--bx-primary-button-color:#008746;--bx-primary-button-hover-color:#04b358;--bx-primary-button-disabled-color:#448262;--bx-danger-button-color:#c10404;--bx-danger-button-hover-color:#e61d1d;--bx-danger-button-disabled-color:#a26c6c;--bx-toast-z-index:9999;--bx-dialog-z-index:9101;--bx-dialog-overlay-z-index:9100;--bx-remote-play-popup-z-index:9090;--bx-stats-bar-z-index:9010;--bx-stream-settings-z-index:9001;--bx-mkb-pointer-lock-msg-z-index:9000;--bx-stream-settings-overlay-z-index:8999;--bx-game-bar-z-index:8888;--bx-wait-time-box-z-index:100;--bx-screenshot-animation-z-index:1}@font-face{font-family:'promptfont';src:url("https://redphx.github.io/better-xcloud/fonts/promptfont.otf")}div[class^=HUDButton-module__hiddenContainer] ~ div:not([class^=HUDButton-module__hiddenContainer]){opacity:0;pointer-events:none !important;position:absolute;top:-9999px;left:-9999px}@media screen and (max-width:600px){header a[href="/play"]{display:none}}.bx-full-width{width:100% !important}.bx-full-height{height:100% !important}.bx-no-scroll{overflow:hidden !important}.bx-gone{display:none !important}.bx-offscreen{position:absolute !important;top:-9999px !important;left:-9999px !important;visibility:hidden !important}.bx-hidden{visibility:hidden !important}.bx-invisible{opacity:0}.bx-unclickable{pointer-events:none}.bx-pixel{width:1px !important;height:1px !important}.bx-no-margin{margin:0 !important}.bx-no-padding{padding:0 !important}.bx-prompt{font-family:var(--bx-promptfont-font)}#headerArea,#uhfSkipToMain,.uhf-footer{display:none}div[class*=NotFocusedDialog]{position:absolute !important;top:-9999px !important;left:-9999px !important;width:0 !important;height:0 !important}#game-stream video:not([src]){visibility:hidden}div[class*=SupportedInputsBadge]:not(:has(:nth-child(2))),div[class*=SupportedInputsBadge] svg:first-of-type{display:none}.bx-button{background-color:var(--bx-default-button-color);user-select:none;-webkit-user-select:none;color:#fff;font-family:var(--bx-title-font-semibold);font-size:14px;border:none;font-weight:400;height:var(--bx-button-height);border-radius:4px;padding:0 8px;text-transform:uppercase;cursor:pointer;overflow:hidden}.bx-button:focus{outline:none !important}.bx-button:hover,.bx-button.bx-focusable:focus{background-color:var(--bx-default-button-hover-color)}.bx-button:disabled{cursor:default;background-color:var(--bx-default-button-disabled-color)}.bx-button.bx-ghost{background-color:transparent}.bx-button.bx-ghost:hover,.bx-button.bx-ghost.bx-focusable:focus{background-color:var(--bx-default-button-hover-color)}.bx-button.bx-primary{background-color:var(--bx-primary-button-color)}.bx-button.bx-primary:hover,.bx-button.bx-primary.bx-focusable:focus{background-color:var(--bx-primary-button-hover-color)}.bx-button.bx-primary:disabled{background-color:var(--bx-primary-button-disabled-color)}.bx-button.bx-danger{background-color:var(--bx-danger-button-color)}.bx-button.bx-danger:hover,.bx-button.bx-danger.bx-focusable:focus{background-color:var(--bx-danger-button-hover-color)}.bx-button.bx-danger:disabled{background-color:var(--bx-danger-button-disabled-color)}.bx-button.bx-tall{height:calc(var(--bx-button-height) * 1.5) !important}.bx-button svg{display:inline-block;width:16px;height:var(--bx-button-height)}.bx-button svg:not(:only-child){margin-right:4px}.bx-button span{display:inline-block;line-height:var(--bx-button-height);vertical-align:middle;color:#fff;overflow:hidden;white-space:nowrap}.bx-button.bx-focusable{position:relative}.bx-button.bx-focusable::after{border:2px solid transparent;border-radius:4px}.bx-button.bx-focusable:focus::after{content:'';border-color:#fff;position:absolute;top:0;left:0;right:0;bottom:0}a.bx-button{display:inline-block}a.bx-button.bx-full-width{text-align:center}.bx-header-remote-play-button{height:auto;margin-right:8px !important}.bx-header-remote-play-button svg{width:24px;height:46px}.bx-header-settings-button{line-height:30px;font-size:14px;text-transform:uppercase;position:relative}.bx-header-settings-button[data-update-available]::before{content:'🌟' !important;line-height:var(--bx-button-height);display:inline-block;margin-left:4px}.bx-settings-reload-button{margin-top:10px}.bx-settings-container{background-color:#151515;user-select:none;-webkit-user-select:none;color:#fff;font-family:var(--bx-normal-font)}@media (hover:hover){.bx-settings-wrapper a.bx-settings-title:hover{color:#83f73a}}.bx-settings-wrapper{width:450px;margin:auto;padding:12px 6px}@media screen and (max-width:450px){.bx-settings-wrapper{width:100%}}.bx-settings-wrapper *:focus{outline:none !important}.bx-settings-wrapper .bx-top-buttons .bx-button{display:block;margin-bottom:8px}.bx-settings-wrapper .bx-settings-title-wrapper{display:flex;margin-bottom:10px;align-items:center}.bx-settings-wrapper a.bx-settings-title{font-family:var(--bx-title-font);font-size:1.4rem;text-decoration:none;font-weight:bold;display:block;color:#5dc21e;flex:1}.bx-settings-wrapper a.bx-settings-title:focus{color:#83f73a}.bx-settings-wrapper a.bx-settings-update{display:block;color:#ff834b;text-decoration:none;margin-bottom:8px;text-align:center;background:#222;border-radius:4px;padding:4px}@media (hover:hover){.bx-settings-wrapper a.bx-settings-update:hover{color:#ff9869;text-decoration:underline}}.bx-settings-wrapper a.bx-settings-update:focus{color:#ff9869;text-decoration:underline}.bx-settings-group-label{font-weight:bold;display:block;font-size:1.1rem}.bx-settings-row{display:flex;padding:6px 12px;position:relative}.bx-settings-row label{flex:1;align-self:center;margin-bottom:0}.bx-settings-row:hover,.bx-settings-row:focus-within{background-color:#242424}.bx-settings-row input{align-self:center;accent-color:var(--bx-primary-button-color)}.bx-settings-row input:focus{accent-color:var(--bx-danger-button-color)}.bx-settings-row select:disabled{-webkit-appearance:none;background:transparent;text-align-last:right;border:none;color:#fff}.bx-settings-row input[type=checkbox]:focus,.bx-settings-row select:focus{filter:drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff)}.bx-settings-row:has(input:focus)::before,.bx-settings-row:has(select:focus)::before{content:' ';border-radius:4px;border:2px solid #fff;position:absolute;top:0;left:0;bottom:0}.bx-settings-group-label b,.bx-settings-row label b{display:block;font-size:12px;font-style:italic;font-weight:normal;color:#828282}.bx-settings-group-label b{margin-bottom:8px}.bx-settings-app-version{margin-top:10px;text-align:center;color:#747474;font-size:12px}.bx-donation-link{display:block;text-align:center;text-decoration:none;height:20px;line-height:20px;font-size:14px;margin-top:10px;color:#5dc21e}.bx-donation-link:hover{color:#6dd72b}.bx-donation-link:focus{text-decoration:underline}.bx-settings-custom-user-agent{display:block;width:100%}.bx-dialog-overlay{position:fixed;inset:0;z-index:var(--bx-dialog-overlay-z-index);background:#000;opacity:50%}.bx-dialog{display:flex;flex-flow:column;max-height:90vh;position:fixed;top:50%;left:50%;margin-right:-50%;transform:translate(-50%,-50%);min-width:420px;padding:20px;border-radius:8px;z-index:var(--bx-dialog-z-index);background:#1a1b1e;color:#fff;font-weight:400;font-size:16px;font-family:var(--bx-normal-font);box-shadow:0 0 6px #000;user-select:none;-webkit-user-select:none}.bx-dialog *:focus{outline:none !important}.bx-dialog h2{display:flex;margin-bottom:12px}.bx-dialog h2 b{flex:1;color:#fff;display:block;font-family:var(--bx-title-font);font-size:26px;font-weight:400;line-height:var(--bx-button-height)}.bx-dialog.bx-binding-dialog h2 b{font-family:var(--bx-promptfont-font) !important}.bx-dialog > div{overflow:auto;padding:2px 0}.bx-dialog > button{padding:8px 32px;margin:10px auto 0;border:none;border-radius:4px;display:block;background-color:#2d3036;text-align:center;color:#fff;text-transform:uppercase;font-family:var(--bx-title-font);font-weight:400;line-height:18px;font-size:14px}@media (hover:hover){.bx-dialog > button:hover{background-color:#515863}}.bx-dialog > button:focus{background-color:#515863}@media screen and (max-width:450px){.bx-dialog{min-width:100%}}.bx-toast{user-select:none;-webkit-user-select:none;position:fixed;left:50%;top:24px;transform:translate(-50%,0);background:#000;border-radius:16px;color:#fff;z-index:var(--bx-toast-z-index);font-family:var(--bx-normal-font);border:2px solid #fff;display:flex;align-items:center;opacity:0;overflow:clip;transition:opacity .2s ease-in}.bx-toast.bx-show{opacity:.85}.bx-toast.bx-hide{opacity:0;pointer-events:none}.bx-toast-msg{font-size:14px;display:inline-block;padding:12px 16px;white-space:pre}.bx-toast-status{font-weight:bold;font-size:14px;text-transform:uppercase;display:inline-block;background:#515863;padding:12px 16px;color:#fff;white-space:pre}.bx-wait-time-box{position:fixed;top:0;right:0;background-color:rgba(0,0,0,0.8);color:#fff;z-index:var(--bx-wait-time-box-z-index);padding:12px;border-radius:0 0 0 8px}.bx-wait-time-box label{display:block;text-transform:uppercase;text-align:right;font-size:12px;font-weight:bold;margin:0}.bx-wait-time-box span{display:block;font-family:var(--bx-monospaced-font);text-align:right;font-size:16px;margin-bottom:10px}.bx-wait-time-box span:last-of-type{margin-bottom:0}.bx-remote-play-popup{width:100%;max-width:1920px;margin:auto;position:relative;height:.1px;overflow:visible;z-index:var(--bx-remote-play-popup-z-index)}.bx-remote-play-container{position:absolute;right:10px;top:0;background:#1a1b1e;border-radius:10px;width:420px;max-width:calc(100vw - 20px);margin:0 0 0 auto;padding:20px;box-shadow:rgba(0,0,0,0.502) 0 0 12px 0}@media (min-width:480px) and (min-height:calc(480px + 1px)){.bx-remote-play-container{right:calc(env(safe-area-inset-right, 0px) + 32px)}}@media (min-width:768px) and (min-height:calc(480px + 1px)){.bx-remote-play-container{right:calc(env(safe-area-inset-right, 0px) + 48px)}}@media (min-width:1920px) and (min-height:calc(480px + 1px)){.bx-remote-play-container{right:calc(env(safe-area-inset-right, 0px) + 80px)}}.bx-remote-play-container > .bx-button{display:table;margin:0 0 0 auto}.bx-remote-play-settings{margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #2d2d2d}.bx-remote-play-settings > div{display:flex}.bx-remote-play-settings label{flex:1}.bx-remote-play-settings label p{margin:4px 0 0;padding:0;color:#888;font-size:12px}.bx-remote-play-settings span{font-weight:bold;font-size:18px;display:block;margin-bottom:8px;text-align:center}.bx-remote-play-resolution{display:block}.bx-remote-play-resolution input[type="radio"]{accent-color:var(--bx-primary-button-color);margin-right:6px}.bx-remote-play-resolution input[type="radio"]:focus{accent-color:var(--bx-primary-button-hover-color)}.bx-remote-play-device-wrapper{display:flex;margin-bottom:12px}.bx-remote-play-device-wrapper:last-child{margin-bottom:2px}.bx-remote-play-device-info{flex:1;padding:4px 0}.bx-remote-play-device-name{font-size:20px;font-weight:bold;display:inline-block;vertical-align:middle}.bx-remote-play-console-type{font-size:12px;background:#004c87;color:#fff;display:inline-block;border-radius:14px;padding:2px 10px;margin-left:8px;vertical-align:middle}.bx-remote-play-power-state{color:#888;font-size:14px}.bx-remote-play-connect-button{min-height:100%;margin:4px 0}.bx-select select{display:none}.bx-select > div{display:inline-block;min-width:110px;text-align:center;margin:0 10px;line-height:24px;vertical-align:middle;background:#fff;color:#000;border-radius:4px;padding:2px 4px}.bx-select > div input{display:inline-block;margin-right:8px}.bx-select > div label{margin-bottom:0}.bx-select button{border:none;width:24px;height:24px;line-height:24px;color:#fff;border-radius:4px;font-weight:bold;font-size:14px;font-family:var(--bx-monospaced-font)}.bx-select button.bx-inactive{pointer-events:none;opacity:.2}.bx-select button span{line-height:unset}div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]{overflow:visible}.bx-stream-menu-button-on{fill:#000 !important;background-color:#2d2d2d !important;color:#000 !important}.bx-stream-refresh-button{top:calc(env(safe-area-inset-top, 0px) + 10px + 50px) !important}body[data-media-type=default] .bx-stream-refresh-button{left:calc(env(safe-area-inset-left, 0px) + 11px) !important}body[data-media-type=tv] .bx-stream-refresh-button{top:calc(var(--gds-focus-borderSize) + 80px) !important}.bx-stream-home-button{top:calc(env(safe-area-inset-top, 0px) + 10px + 50px * 2) !important}body[data-media-type=default] .bx-stream-home-button{left:calc(env(safe-area-inset-left, 0px) + 12px) !important}body[data-media-type=tv] .bx-stream-home-button{top:calc(var(--gds-focus-borderSize) + 80px * 2) !important}div[data-testid=media-container]{display:flex}div[data-testid=media-container].bx-taking-screenshot:before{animation:bx-anim-taking-screenshot .5s ease;content:' ';position:absolute;width:100%;height:100%;z-index:var(--bx-screenshot-animation-z-index)}#game-stream video{margin:auto;align-self:center;background:#000}#game-stream canvas{position:absolute;align-self:center;margin:auto;left:0;right:0}#gamepass-dialog-root div[class^=Guide-module__guide] .bx-button{overflow:visible;margin-bottom:12px}@-moz-keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}@-webkit-keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}@-o-keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}@keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}.bx-number-stepper{text-align:center}.bx-number-stepper span{display:inline-block;min-width:40px;font-family:var(--bx-monospaced-font);font-size:14px}.bx-number-stepper button{border:none;width:24px;height:24px;margin:0 4px;line-height:24px;background-color:var(--bx-default-button-color);color:#fff;border-radius:4px;font-weight:bold;font-size:14px;font-family:var(--bx-monospaced-font)}@media (hover:hover){.bx-number-stepper button:hover{background-color:var(--bx-default-button-hover-color)}}.bx-number-stepper button:active{background-color:var(--bx-default-button-hover-color)}.bx-number-stepper button:disabled + span{font-family:var(--bx-title-font)}.bx-number-stepper input[type="range"]{display:block;margin:12px auto 2px;width:180px;color:#959595 !important}.bx-number-stepper input[type=range]:disabled,.bx-number-stepper button:disabled{display:none}.bx-number-stepper[data-disabled=true] input[type=range],.bx-number-stepper[data-disabled=true] button{display:none}#bx-game-bar{z-index:var(--bx-game-bar-z-index);position:fixed;bottom:0;width:40px;height:90px;overflow:visible;cursor:pointer}#bx-game-bar > svg{display:none;pointer-events:none;position:absolute;height:28px;margin-top:16px}@media (hover:hover){#bx-game-bar:hover > svg{display:block}}#bx-game-bar .bx-game-bar-container{opacity:0;position:absolute;display:flex;overflow:hidden;background:rgba(26,27,30,0.91);box-shadow:0 0 6px #1c1c1c;transition:opacity .1s ease-in}#bx-game-bar .bx-game-bar-container.bx-show{opacity:.9}#bx-game-bar .bx-game-bar-container.bx-show + svg{display:none !important}#bx-game-bar .bx-game-bar-container.bx-hide{opacity:0;pointer-events:none}#bx-game-bar .bx-game-bar-container button{width:60px;height:60px;border-radius:0}#bx-game-bar .bx-game-bar-container button svg{width:28px;height:28px;transition:transform .08s ease 0s}#bx-game-bar .bx-game-bar-container button:hover{border-radius:0}#bx-game-bar .bx-game-bar-container button:active svg{transform:scale(.75)}#bx-game-bar .bx-game-bar-container button.bx-activated{background-color:#fff}#bx-game-bar .bx-game-bar-container button.bx-activated svg{filter:invert(1)}#bx-game-bar .bx-game-bar-container div[data-enabled] button{display:none}#bx-game-bar .bx-game-bar-container div[data-enabled='true'] button:first-of-type{display:block}#bx-game-bar .bx-game-bar-container div[data-enabled='false'] button:last-of-type{display:block}#bx-game-bar[data-position="bottom-left"]{left:0;direction:ltr}#bx-game-bar[data-position="bottom-left"] .bx-game-bar-container{border-radius:0 10px 10px 0}#bx-game-bar[data-position="bottom-right"]{right:0;direction:rtl}#bx-game-bar[data-position="bottom-right"] .bx-game-bar-container{direction:ltr;border-radius:10px 0 0 10px}.bx-badges{margin-left:0;user-select:none;-webkit-user-select:none}.bx-badge{border:none;display:inline-block;line-height:24px;color:#fff;font-family:var(--bx-title-font-semibold);font-size:14px;font-weight:400;margin:0 8px 8px 0;box-shadow:0 0 6px #000;border-radius:4px}.bx-badge-name{background-color:#2d3036;border-radius:4px 0 0 4px}.bx-badge-name svg{width:16px;height:16px}.bx-badge-value{background-color:#808080;border-radius:0 4px 4px 0}.bx-badge-name,.bx-badge-value{display:inline-block;padding:0 8px;line-height:30px;vertical-align:bottom}.bx-badge-battery[data-charging=true] span:first-of-type::after{content:' ⚡️'}div[class^=StreamMenu-module__container] .bx-badges{position:absolute;max-width:500px}#gamepass-dialog-root .bx-badges{position:fixed;top:60px;left:460px;max-width:500px}@media (min-width:568px) and (max-height:480px){#gamepass-dialog-root .bx-badges{position:unset;top:unset;left:unset;margin:8px 0}}.bx-stats-bar{display:block;user-select:none;-webkit-user-select:none;position:fixed;top:0;background-color:#000;color:#fff;font-family:var(--bx-monospaced-font);font-size:.9rem;padding-left:8px;z-index:var(--bx-stats-bar-z-index);text-wrap:nowrap}.bx-stats-bar[data-stats*="[fps]"] > .bx-stat-fps,.bx-stats-bar[data-stats*="[ping]"] > .bx-stat-ping,.bx-stats-bar[data-stats*="[btr]"] > .bx-stat-btr,.bx-stats-bar[data-stats*="[dt]"] > .bx-stat-dt,.bx-stats-bar[data-stats*="[pl]"] > .bx-stat-pl,.bx-stats-bar[data-stats*="[fl]"] > .bx-stat-fl{display:inline-block}.bx-stats-bar[data-stats$="[fps]"] > .bx-stat-fps,.bx-stats-bar[data-stats$="[ping]"] > .bx-stat-ping,.bx-stats-bar[data-stats$="[btr]"] > .bx-stat-btr,.bx-stats-bar[data-stats$="[dt]"] > .bx-stat-dt,.bx-stats-bar[data-stats$="[pl]"] > .bx-stat-pl,.bx-stats-bar[data-stats$="[fl]"] > .bx-stat-fl{margin-right:0;border-right:none}.bx-stats-bar::before{display:none;content:'👀';vertical-align:middle;margin-right:8px}.bx-stats-bar[data-display=glancing]::before{display:inline-block}.bx-stats-bar[data-position=top-left]{left:0;border-radius:0 0 4px 0}.bx-stats-bar[data-position=top-right]{right:0;border-radius:0 0 0 4px}.bx-stats-bar[data-position=top-center]{transform:translate(-50%,0);left:50%;border-radius:0 0 4px 4px}.bx-stats-bar[data-transparent=true]{background:none;filter:drop-shadow(1px 0 0 rgba(0,0,0,0.941)) drop-shadow(-1px 0 0 rgba(0,0,0,0.941)) drop-shadow(0 1px 0 rgba(0,0,0,0.941)) drop-shadow(0 -1px 0 rgba(0,0,0,0.941))}.bx-stats-bar > div{display:none;margin-right:8px;border-right:1px solid #fff;padding-right:8px}.bx-stats-bar label{margin:0 8px 0 0;font-family:var(--bx-title-font);font-size:inherit;font-weight:bold;vertical-align:middle;cursor:help}.bx-stats-bar span{min-width:60px;display:inline-block;text-align:right;vertical-align:middle}.bx-stats-bar span[data-grade=good]{color:#6bffff}.bx-stats-bar span[data-grade=ok]{color:#fff16b}.bx-stats-bar span[data-grade=bad]{color:#ff5f5f}.bx-stats-bar span:first-of-type{min-width:22px}.bx-stream-settings-dialog{display:flex;position:fixed;z-index:var(--bx-stream-settings-z-index);opacity:.98;user-select:none;-webkit-user-select:none}.bx-stream-settings-overlay{position:fixed;background:rgba(11,11,11,0.89);top:0;left:0;right:0;bottom:0;z-index:var(--bx-stream-settings-overlay-z-index)}.bx-stream-settings-overlay[data-is-playing="true"]{background:transparent}.bx-stream-settings-tabs{position:fixed;top:0;right:420px;display:flex;flex-direction:column;border-radius:0 0 0 8px;box-shadow:0 0 6px #000;overflow:clip}.bx-stream-settings-tabs svg{width:32px;height:32px;padding:10px;box-sizing:content-box;background:#131313;cursor:pointer;border-left:4px solid #1e1e1e}.bx-stream-settings-tabs svg.bx-active{background:#222;border-color:#008746}.bx-stream-settings-tabs svg:not(.bx-active):hover{background:#2f2f2f;border-color:#484848}.bx-stream-settings-tab-contents{flex-direction:column;position:fixed;right:0;top:0;bottom:0;padding:14px 14px 0;width:420px;background:#1a1b1e;color:#fff;font-weight:400;font-size:16px;font-family:var(--bx-title-font);text-align:center;box-shadow:0 0 6px #000;overflow:overlay}.bx-stream-settings-tab-contents > div[data-group=mkb]{display:flex;flex-direction:column;height:100%;overflow:hidden}.bx-stream-settings-tab-contents *:focus{outline:none !important}.bx-stream-settings-tab-contents h2{margin-bottom:8px;display:flex;align-item:center}.bx-stream-settings-tab-contents h2 span{display:inline-block;font-size:24px;font-weight:bold;text-transform:uppercase;text-align:left;flex:1;height:var(--bx-button-height);line-height:calc(var(--bx-button-height) + 4px);text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.bx-stream-settings-row{display:flex;border-bottom:1px solid rgba(64,64,64,0.502);margin-bottom:16px;padding-bottom:16px}.bx-stream-settings-row > label{font-size:16px;display:block;text-align:left;flex:1;align-self:center;margin-bottom:0 !important}.bx-stream-settings-row input{accent-color:var(--bx-primary-button-color)}.bx-stream-settings-row select:disabled{-webkit-appearance:none;background:transparent;text-align-last:right;border:none;color:#fff}.bx-stream-settings-row select option:disabled{display:none}.bx-stream-settings-dialog-note{display:block;font-size:12px;font-weight:lighter;font-style:italic}.bx-stream-settings-tab-contents div[data-group="shortcuts"] > div[data-has-gamepad=true] > div:first-of-type{display:none}.bx-stream-settings-tab-contents div[data-group="shortcuts"] > div[data-has-gamepad=true] > div:last-of-type{display:block}.bx-stream-settings-tab-contents div[data-group="shortcuts"] > div[data-has-gamepad=false] > div:first-of-type{display:block}.bx-stream-settings-tab-contents div[data-group="shortcuts"] > div[data-has-gamepad=false] > div:last-of-type{display:none}.bx-stream-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-profile{width:100%;height:36px;display:block;margin-bottom:10px}.bx-stream-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-note{font-size:14px}.bx-stream-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-row{display:flex;margin-bottom:10px}.bx-stream-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-row label.bx-prompt{flex:1;font-size:26px;margin-bottom:0}.bx-stream-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-row .bx-shortcut-actions{flex:2;position:relative}.bx-stream-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-row .bx-shortcut-actions select{position:absolute;width:100%;height:100%;display:block}.bx-stream-settings-tab-contents div[data-group="shortcuts"] .bx-shortcut-row .bx-shortcut-actions select:last-of-type{opacity:0;z-index:calc(var(--bx-stream-settings-z-index) + 1)}.bx-mkb-settings{display:flex;flex-direction:column;flex:1;padding-bottom:10px;overflow:hidden}.bx-mkb-settings select:disabled{-webkit-appearance:none;background:transparent;text-align-last:right;text-align:right;border:none;color:#fff}.bx-mkb-pointer-lock-msg{user-select:none;-webkit-user-select:none;position:fixed;left:50%;top:50%;transform:translateX(-50%) translateY(-50%);margin:auto;background:#151515;z-index:var(--bx-mkb-pointer-lock-msg-z-index);color:#fff;text-align:center;font-weight:400;font-family:"Segoe UI",Arial,Helvetica,sans-serif;font-size:1.3rem;padding:12px;border-radius:8px;align-items:center;box-shadow:0 0 6px #000;min-width:220px;opacity:.9}.bx-mkb-pointer-lock-msg:hover{opacity:1}.bx-mkb-pointer-lock-msg > div:first-of-type{display:flex;flex-direction:column;text-align:left}.bx-mkb-pointer-lock-msg p{margin:0}.bx-mkb-pointer-lock-msg p:first-child{font-size:22px;margin-bottom:4px;font-weight:bold}.bx-mkb-pointer-lock-msg p:last-child{font-size:12px;font-style:italic}.bx-mkb-pointer-lock-msg > div:last-of-type{margin-top:10px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='native'] button:first-of-type{margin-bottom:8px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div{display:flex;flex-flow:row;margin-top:8px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div button{flex:1}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div button:first-of-type{margin-right:5px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div button:last-of-type{margin-left:5px}.bx-mkb-preset-tools{display:flex;margin-bottom:12px}.bx-mkb-preset-tools select{flex:1}.bx-mkb-preset-tools button{margin-left:6px}.bx-mkb-settings-rows{flex:1;overflow:scroll}.bx-mkb-key-row{display:flex;margin-bottom:10px;align-items:center}.bx-mkb-key-row label{margin-bottom:0;font-family:var(--bx-promptfont-font);font-size:26px;text-align:center;width:26px;height:32px;line-height:32px}.bx-mkb-key-row button{flex:1;height:32px;line-height:32px;margin:0 0 0 10px;background:transparent;border:none;color:#fff;border-radius:0;border-left:1px solid #373737}.bx-mkb-key-row button:hover{background:transparent;cursor:default}.bx-mkb-settings.bx-editing .bx-mkb-key-row button{background:#393939;border-radius:4px;border:none}.bx-mkb-settings.bx-editing .bx-mkb-key-row button:hover{background:#333;cursor:pointer}.bx-mkb-action-buttons > div{text-align:right;display:none}.bx-mkb-action-buttons button{margin-left:8px}.bx-mkb-settings:not(.bx-editing) .bx-mkb-action-buttons > div:first-child{display:block}.bx-mkb-settings.bx-editing .bx-mkb-action-buttons > div:last-child{display:block}.bx-mkb-note{display:block;margin:16px 0 10px;font-size:12px}.bx-mkb-note:first-of-type{margin-top:0}`;
  if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES))
    css += `
/* Hide "Play with friends" section */
div[class^=HomePage-module__bottomSpacing]:has(button[class*=SocialEmptyCard]),
button[class*=SocialEmptyCard],
/* Hide "Start a party" button in the Guide menu */
#gamepass-dialog-root div[class^=AchievementsPreview-module__container] + button[class*=HomeLandingPage-module__button]
{
    display: none;
}
`;
  if (getPref(PrefKey.REDUCE_ANIMATIONS))
    css += `
div[class*=GameCard-module__gameTitleInnerWrapper],
div[class*=GameCard-module__card],
div[class*=ScrollArrows-module] {
    transition: none !important;
}
`;
  if (getPref(PrefKey.HIDE_DOTS_ICON))
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
  if (css += `
div[class*=StreamMenu-module__menu] {
    min-width: 100vw !important;
}
`, getPref(PrefKey.STREAM_SIMPLIFY_MENU))
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
  else
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
  if (getPref(PrefKey.UI_SCROLLBAR_HIDE))
    css += `
html {
    scrollbar-width: none;
}

body::-webkit-scrollbar {
    display: none;
}
`;
  const $style = CE("style", {}, css);
  document.documentElement.appendChild($style);
}
function preloadFonts() {
  const $link = CE("link", {
    rel: "preload",
    href: "https://redphx.github.io/better-xcloud/fonts/promptfont.otf",
    as: "font",
    type: "font/otf",
    crossorigin: ""
  });
  document.querySelector("head")?.appendChild($link);
}

// src/modules/mkb/mouse-cursor-hider.ts
class MouseCursorHider {
  static #timeout;
  static #cursorVisible = !0;
  static show() {
    document.body && (document.body.style.cursor = "unset"), MouseCursorHider.#cursorVisible = !0;
  }
  static hide() {
    document.body && (document.body.style.cursor = "none"), MouseCursorHider.#timeout = null, MouseCursorHider.#cursorVisible = !1;
  }
  static onMouseMove(e) {
    !MouseCursorHider.#cursorVisible && MouseCursorHider.show(), MouseCursorHider.#timeout && clearTimeout(MouseCursorHider.#timeout), MouseCursorHider.#timeout = window.setTimeout(MouseCursorHider.hide, 3000);
  }
  static start() {
    MouseCursorHider.show(), document.addEventListener("mousemove", MouseCursorHider.onMouseMove);
  }
  static stop() {
    MouseCursorHider.#timeout && clearTimeout(MouseCursorHider.#timeout), document.removeEventListener("mousemove", MouseCursorHider.onMouseMove), MouseCursorHider.show();
  }
}

// src/modules/patches/controller-shortcuts.js
var controller_shortcuts_default = "const currentGamepad = ${gamepadVar};\n\n// Share button on XS controller\nif (currentGamepad.buttons[17] && currentGamepad.buttons[17].pressed) {\n    window.dispatchEvent(new Event(BxEvent.CAPTURE_SCREENSHOT));\n}\n\nconst btnHome = currentGamepad.buttons[16];\nif (btnHome) {\n    if (!this.bxHomeStates) {\n        this.bxHomeStates = {};\n    }\n\n    let intervalMs = 0;\n    let hijack = false;\n\n    if (btnHome.pressed) {\n        hijack = true;\n        intervalMs = 16;\n        this.gamepadIsIdle.set(currentGamepad.index, false);\n\n        if (this.bxHomeStates[currentGamepad.index]) {\n            const lastTimestamp = this.bxHomeStates[currentGamepad.index].timestamp;\n\n            if (currentGamepad.timestamp !== lastTimestamp) {\n                this.bxHomeStates[currentGamepad.index].timestamp = currentGamepad.timestamp;\n\n                const handled = window.BX_EXPOSED.handleControllerShortcut(currentGamepad);\n                if (handled) {\n                    this.bxHomeStates[currentGamepad.index].shortcutPressed += 1;\n                }\n            }\n        } else {\n            // First time pressing > save current timestamp\n            window.BX_EXPOSED.resetControllerShortcut(currentGamepad.index);\n            this.bxHomeStates[currentGamepad.index] = {\n                shortcutPressed: 0,\n                timestamp: currentGamepad.timestamp,\n            };\n        }\n    } else if (this.bxHomeStates[currentGamepad.index]) {\n        hijack = true;\n        const info = structuredClone(this.bxHomeStates[currentGamepad.index]);\n\n        // Home button released\n        this.bxHomeStates[currentGamepad.index] = null;\n\n        if (info.shortcutPressed === 0) {\n            const fakeGamepadMappings = [{\n                GamepadIndex: currentGamepad.index,\n                A: 0,\n                B: 0,\n                X: 0,\n                Y: 0,\n                LeftShoulder: 0,\n                RightShoulder: 0,\n                LeftTrigger: 0,\n                RightTrigger: 0,\n                View: 0,\n                Menu: 0,\n                LeftThumb: 0,\n                RightThumb: 0,\n                DPadUp: 0,\n                DPadDown: 0,\n                DPadLeft: 0,\n                DPadRight: 0,\n                Nexus: 1,\n                LeftThumbXAxis: 0,\n                LeftThumbYAxis: 0,\n                RightThumbXAxis: 0,\n                RightThumbYAxis: 0,\n                PhysicalPhysicality: 0,\n                VirtualPhysicality: 0,\n                Dirty: true,\n                Virtual: false,\n            }];\n\n            const isLongPress = (currentGamepad.timestamp - info.timestamp) >= 500;\n            intervalMs = isLongPress ? 500 : 100;\n\n            this.inputSink.onGamepadInput(performance.now() - intervalMs, fakeGamepadMappings);\n        } else {\n            intervalMs = 4;\n        }\n    }\n\n    if (hijack && intervalMs) {\n        // Listen to next button press\n        this.inputConfiguration.useIntervalWorkerThreadForInput && this.intervalWorker ? this.intervalWorker.scheduleTimer(intervalMs) : this.pollGamepadssetTimeoutTimerID = setTimeout(this.pollGamepads, intervalMs);\n\n        // Hijack this button\n        return;\n    }\n}\n";

// src/modules/patches/expose-stream-session.js
var expose_stream_session_default = "window.BX_EXPOSED.streamSession = this;\n\nconst orgSetMicrophoneState = this.setMicrophoneState.bind(this);\nthis.setMicrophoneState = state => {\n    orgSetMicrophoneState(state);\n\n    const evt = new Event(BxEvent.MICROPHONE_STATE_CHANGED);\n    evt.microphoneState = state;\n\n    window.dispatchEvent(evt);\n};\n\nwindow.dispatchEvent(new Event(BxEvent.STREAM_SESSION_READY));\n\n// Patch updateDimensions() to make native touch work correctly with WebGL2\nlet updateDimensionsStr = this.updateDimensions.toString();\n\n// if(r){\nconst renderTargetVar = updateDimensionsStr.match(/if\\((\\w+)\\){/)[1];\n\nupdateDimensionsStr = updateDimensionsStr.replaceAll(renderTargetVar + '.scroll', 'scroll');\n\nupdateDimensionsStr = updateDimensionsStr.replace(`if(${renderTargetVar}){`, `\nif (${renderTargetVar}) {\n    const scrollWidth = ${renderTargetVar}.dataset.width ? parseInt(${renderTargetVar}.dataset.width) : ${renderTargetVar}.scrollWidth;\n    const scrollHeight = ${renderTargetVar}.dataset.height ? parseInt(${renderTargetVar}.dataset.height) : ${renderTargetVar}.scrollHeight;\n`);\n\neval(`this.updateDimensions = function ${updateDimensionsStr}`);\n";

// src/modules/patches/local-co-op-enable.js
var local_co_op_enable_default = "let match;\nlet onGamepadChangedStr = this.onGamepadChanged.toString();\n\nonGamepadChangedStr = onGamepadChangedStr.replaceAll('0', 'arguments[1]');\neval(`this.onGamepadChanged = function ${onGamepadChangedStr}`);\n\nlet onGamepadInputStr = this.onGamepadInput.toString();\n\nmatch = onGamepadInputStr.match(/(\\w+\\.GamepadIndex)/);\nif (match) {\n    const gamepadIndexVar = match[0];\n    onGamepadInputStr = onGamepadInputStr.replace('this.gamepadStates.get(', `this.gamepadStates.get(${gamepadIndexVar},`);\n    eval(`this.onGamepadInput = function ${onGamepadInputStr}`);\n    BxLogger.info('supportLocalCoOp', '✅ Successfully patched local co-op support');\n} else {\n    BxLogger.error('supportLocalCoOp', '❌ Unable to patch local co-op support');\n}\n";

// src/modules/patches/remote-play-enable.js
var remote_play_enable_default = "connectMode: window.BX_REMOTE_PLAY_CONFIG ? \"xhome-connect\" : \"cloud-connect\",\nremotePlayServerId: (window.BX_REMOTE_PLAY_CONFIG && window.BX_REMOTE_PLAY_CONFIG.serverId) || '',\n";

// src/modules/patches/remote-play-keep-alive.js
var remote_play_keep_alive_default = "const msg = JSON.parse(e);\nif (msg.reason === 'WarningForBeingIdle' && !window.location.pathname.includes('/launch/')) {\n    try {\n        this.sendKeepAlive();\n        return;\n    } catch (ex) { console.log(ex); }\n}\n";

// src/modules/patches/vibration-adjust.js
var vibration_adjust_default = "if (!window.BX_ENABLE_CONTROLLER_VIBRATION) {\n    return void(0);\n}\n\nconst intensity = window.BX_VIBRATION_INTENSITY;\nif (intensity === 0) {\n    return void(0);\n}\n\nif (intensity < 1) {\n    e.leftMotorPercent *= intensity;\n    e.rightMotorPercent *= intensity;\n    e.leftTriggerMotorPercent *= intensity;\n    e.rightTriggerMotorPercent *= intensity;\n}\n";

// src/modules/patcher.ts
var ENDING_CHUNKS_PATCH_NAME = "loadingEndingChunks", LOG_TAG5 = "Patcher", PATCHES = {
  disableAiTrack(str2) {
    const index = str2.indexOf(".track=function(");
    if (index === -1)
      return !1;
    if (str2.substring(0, index + 200).includes('"AppInsightsCore'))
      return !1;
    return str2.substring(0, index) + ".track=function(e){},!!function(" + str2.substring(index + ".track=function(".length);
  },
  disableTelemetry(str2) {
    if (!str2.includes(".disableTelemetry=function(){return!1}"))
      return !1;
    return str2.replace(".disableTelemetry=function(){return!1}", ".disableTelemetry=function(){return!0}");
  },
  disableTelemetryProvider(str2) {
    if (!str2.includes("this.enableLightweightTelemetry=!"))
      return !1;
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
    return str2.replace("this.enableLightweightTelemetry=!", newCode + ";this.enableLightweightTelemetry=!");
  },
  disableIndexDbLogging(str2) {
    if (!str2.includes(",this.logsDb=new"))
      return !1;
    let newCode = ",this.log=()=>{}";
    return str2.replace(",this.logsDb=new", newCode + ",this.logsDb=new");
  },
  websiteLayout(str2) {
    if (!str2.includes('?"tv":"default"'))
      return !1;
    const layout = getPref(PrefKey.UI_LAYOUT) === "tv" ? "tv" : "default";
    return str2.replace('?"tv":"default"', `?"${layout}":"${layout}"`);
  },
  remotePlayDirectConnectUrl(str2) {
    const index = str2.indexOf("/direct-connect");
    if (index === -1)
      return !1;
    return str2.replace(str2.substring(index - 9, index + 15), "https://www.xbox.com/play");
  },
  remotePlayKeepAlive(str2) {
    if (!str2.includes("onServerDisconnectMessage(e){"))
      return !1;
    return str2 = str2.replace("onServerDisconnectMessage(e){", "onServerDisconnectMessage(e){" + remote_play_keep_alive_default), str2;
  },
  remotePlayConnectMode(str2) {
    if (!str2.includes('connectMode:"cloud-connect",'))
      return !1;
    return str2.replace('connectMode:"cloud-connect",', remote_play_enable_default);
  },
  remotePlayDisableAchievementToast(str2) {
    if (!str2.includes(".AchievementUnlock:{"))
      return !1;
    const newCode = `
if (!!window.BX_REMOTE_PLAY_CONFIG) {
    return;
}
`;
    return str2.replace(".AchievementUnlock:{", ".AchievementUnlock:{" + newCode);
  },
  disableTrackEvent(str2) {
    if (!str2.includes("this.trackEvent="))
      return !1;
    return str2.replace("this.trackEvent=", "this.trackEvent=e=>{},this.uwuwu=");
  },
  blockWebRtcStatsCollector(str2) {
    if (!str2.includes("this.shouldCollectStats=!0"))
      return !1;
    return str2.replace("this.shouldCollectStats=!0", "this.shouldCollectStats=!1");
  },
  patchPollGamepads(str2) {
    const index = str2.indexOf("},this.pollGamepads=()=>{");
    if (index === -1)
      return !1;
    const nextIndex = str2.indexOf("setTimeout(this.pollGamepads", index);
    if (nextIndex === -1)
      return !1;
    let codeBlock = str2.substring(index, nextIndex);
    if (getPref(PrefKey.BLOCK_TRACKING))
      codeBlock = codeBlock.replaceAll("this.inputPollingIntervalStats.addValue", "");
    const match = codeBlock.match(/this\.gamepadTimestamps\.set\((\w+)\.index/);
    if (match) {
      const gamepadVar = match[1], newCode = renderString(controller_shortcuts_default, {
        gamepadVar
      });
      codeBlock = codeBlock.replace("this.gamepadTimestamps.set", newCode + "this.gamepadTimestamps.set");
    }
    return str2.substring(0, index) + codeBlock + str2.substring(nextIndex);
  },
  enableXcloudLogger(str2) {
    if (!str2.includes("this.telemetryProvider=e}log(e,t,i){"))
      return !1;
    return str2 = str2.replaceAll("this.telemetryProvider=e}log(e,t,i){", "this.telemetryProvider=e}log(e,t,i){console.log(Array.from(arguments));"), str2;
  },
  enableConsoleLogging(str2) {
    if (!str2.includes("static isConsoleLoggingAllowed(){"))
      return !1;
    return str2 = str2.replaceAll("static isConsoleLoggingAllowed(){", "static isConsoleLoggingAllowed(){return true;"), str2;
  },
  playVibration(str2) {
    if (!str2.includes("}playVibration(e){"))
      return !1;
    return VibrationManager.updateGlobalVars(), str2 = str2.replaceAll("}playVibration(e){", "}playVibration(e){" + vibration_adjust_default), str2;
  },
  overrideSettings(str2) {
    const index = str2.indexOf(",EnableStreamGate:");
    if (index === -1)
      return !1;
    const endIndex = str2.indexOf("},", index);
    let newSettings = JSON.stringify(FeatureGates);
    newSettings = newSettings.substring(1, newSettings.length - 1);
    const newCode = newSettings;
    return str2 = str2.substring(0, endIndex) + "," + newCode + str2.substring(endIndex), str2;
  },
  disableGamepadDisconnectedScreen(str2) {
    const index = str2.indexOf('"GamepadDisconnected_Title",');
    if (index === -1)
      return !1;
    const constIndex = str2.indexOf("const", index - 30);
    return str2 = str2.substring(0, constIndex) + "e.onClose();return null;" + str2.substring(constIndex), str2;
  },
  patchUpdateInputConfigurationAsync(str2) {
    if (!str2.includes("async updateInputConfigurationAsync(e){"))
      return !1;
    const newCode = "e.enableTouchInput = true;";
    return str2 = str2.replace("async updateInputConfigurationAsync(e){", "async updateInputConfigurationAsync(e){" + newCode), str2;
  },
  loadingEndingChunks(str2) {
    if (!str2.includes('"FamilySagaManager"'))
      return !1;
    return BxLogger.info(LOG_TAG5, "Remaining patches:", PATCH_ORDERS), PATCH_ORDERS = PATCH_ORDERS.concat(PLAYING_PATCH_ORDERS), str2;
  },
  disableStreamGate(str2) {
    const index = str2.indexOf('case"partially-ready":');
    if (index === -1)
      return !1;
    const bracketIndex = str2.indexOf("=>{", index - 150) + 3;
    return str2 = str2.substring(0, bracketIndex) + "return 0;" + str2.substring(bracketIndex), str2;
  },
  exposeTouchLayoutManager(str2) {
    if (!str2.includes("this._perScopeLayoutsStream=new"))
      return !1;
    const newCode = `
true;
window.BX_EXPOSED["touchLayoutManager"] = this;
window.dispatchEvent(new Event("${BxEvent.TOUCH_LAYOUT_MANAGER_READY}"));
`;
    return str2 = str2.replace("this._perScopeLayoutsStream=new", newCode + "this._perScopeLayoutsStream=new"), str2;
  },
  patchBabylonRendererClass(str2) {
    let index = str2.indexOf(".current.render(),");
    if (index === -1)
      return !1;
    index -= 1;
    const newCode = `
if (window.BX_EXPOSED.stopTakRendering) {
    try {
        document.getElementById('BabylonCanvasContainer-main')?.parentElement.classList.add('bx-offscreen');

        ${str2[index]}.current.dispose();
    } catch (e) {}

    window.BX_EXPOSED.stopTakRendering = false;
    return;
}
`;
    return str2 = str2.substring(0, index) + newCode + str2.substring(index), str2;
  },
  supportLocalCoOp(str2) {
    if (!str2.includes("this.gamepadMappingsToSend=[],"))
      return !1;
    const newCode = `true; ${local_co_op_enable_default}; true,`;
    return str2 = str2.replace("this.gamepadMappingsToSend=[],", "this.gamepadMappingsToSend=[]," + newCode), str2;
  },
  forceFortniteConsole(str2) {
    if (!str2.includes("sendTouchInputEnabledMessage(e){"))
      return !1;
    const newCode = "window.location.pathname.includes('/launch/fortnite/') && (e = false);";
    return str2 = str2.replace("sendTouchInputEnabledMessage(e){", "sendTouchInputEnabledMessage(e){" + newCode), str2;
  },
  disableTakRenderer(str2) {
    if (!str2.includes("const{TakRenderer:"))
      return !1;
    let remotePlayCode = "";
    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== "off" && getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF))
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
    return str2 = str2.replace("const{TakRenderer:", newCode + "const{TakRenderer:"), str2;
  },
  streamCombineSources(str2) {
    if (!str2.includes("this.useCombinedAudioVideoStream=!!this.deviceInformation.isTizen"))
      return !1;
    return str2 = str2.replace("this.useCombinedAudioVideoStream=!!this.deviceInformation.isTizen", "this.useCombinedAudioVideoStream=true"), str2;
  },
  patchStreamHud(str2) {
    if (!str2.includes("let{onCollapse"))
      return !1;
    let newCode = `
// Expose onShowStreamMenu
window.BX_EXPOSED.showStreamMenu = e.onShowStreamMenu;
// Restore the "..." button
e.guideUI = null;
`;
    if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "off")
      newCode += "e.canShowTakHUD = false;";
    return str2 = str2.replace("let{onCollapse", newCode + "let{onCollapse"), str2;
  },
  broadcastPollingMode(str2) {
    if (!str2.includes(".setPollingMode=e=>{"))
      return !1;
    const newCode = `
BxEvent.dispatch(window, BxEvent.XCLOUD_POLLING_MODE_CHANGED, {mode: e});
`;
    return str2 = str2.replace(".setPollingMode=e=>{", ".setPollingMode=e=>{" + newCode), str2;
  },
  patchXcloudTitleInfo(str2) {
    let index = str2.indexOf("async cloudConnect");
    if (index === -1)
      return !1;
    let backetIndex = str2.indexOf("{", index);
    const titleInfoVar = str2.substring(index, backetIndex).match(/\(([^)]+)\)/)[1].split(",")[0], newCode = `
${titleInfoVar} = window.BX_EXPOSED.modifyTitleInfo(${titleInfoVar});
BxLogger.info('patchXcloudTitleInfo', ${titleInfoVar});
`;
    return str2 = str2.substring(0, backetIndex + 1) + newCode + str2.substring(backetIndex + 1), str2;
  },
  patchRemotePlayMkb(str2) {
    let index = str2.indexOf("async homeConsoleConnect");
    if (index === -1)
      return !1;
    let backetIndex = str2.indexOf("{", index);
    const configsVar = str2.substring(index, backetIndex).match(/\(([^)]+)\)/)[1].split(",")[1], newCode = `
Object.assign(${configsVar}.inputConfiguration, {
    enableMouseInput: false,
    enableKeyboardInput: false,
    enableAbsoluteMouse: false,
});
BxLogger.info('patchRemotePlayMkb', ${configsVar});
`;
    return str2 = str2.substring(0, backetIndex + 1) + newCode + str2.substring(backetIndex + 1), str2;
  },
  patchAudioMediaStream(str2) {
    if (!str2.includes(".srcObject=this.audioMediaStream,"))
      return !1;
    const newCode = "window.BX_EXPOSED.setupGainNode(arguments[1], this.audioMediaStream),";
    return str2 = str2.replace(".srcObject=this.audioMediaStream,", ".srcObject=this.audioMediaStream," + newCode), str2;
  },
  patchCombinedAudioVideoMediaStream(str2) {
    if (!str2.includes(".srcObject=this.combinedAudioVideoStream"))
      return !1;
    const newCode = ",window.BX_EXPOSED.setupGainNode(arguments[0], this.combinedAudioVideoStream)";
    return str2 = str2.replace(".srcObject=this.combinedAudioVideoStream", ".srcObject=this.combinedAudioVideoStream" + newCode), str2;
  },
  patchTouchControlDefaultOpacity(str2) {
    if (!str2.includes("opacityMultiplier:1"))
      return !1;
    const newCode = `opacityMultiplier: ${(getPref(PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY) / 100).toFixed(1)}`;
    return str2 = str2.replace("opacityMultiplier:1", newCode), str2;
  },
  patchShowSensorControls(str2) {
    if (!str2.includes("{shouldShowSensorControls:"))
      return !1;
    const newCode = "{shouldShowSensorControls: (window.BX_EXPOSED && window.BX_EXPOSED.shouldShowSensorControls) ||";
    return str2 = str2.replace("{shouldShowSensorControls:", newCode), str2;
  },
  exposeStreamSession(str2) {
    if (!str2.includes(",this._connectionType="))
      return !1;
    const newCode = `;
${expose_stream_session_default}
true` + ",this._connectionType=";
    return str2 = str2.replace(",this._connectionType=", newCode), str2;
  },
  skipFeedbackDialog(str2) {
    if (!str2.includes("&&this.shouldTransitionToFeedback("))
      return !1;
    return str2 = str2.replace("&&this.shouldTransitionToFeedback(", "&& false &&this.shouldTransitionToFeedback("), str2;
  },
  enableNativeMkb(str2) {
    if (!str2.includes("e.mouseSupported&&e.keyboardSupported&&e.fullscreenSupported;"))
      return !1;
    return str2 = str2.replace("e.mouseSupported&&e.keyboardSupported&&e.fullscreenSupported;", "e.mouseSupported&&e.keyboardSupported&&e.fullscreenSupported;return true;"), str2;
  },
  patchMouseAndKeyboardEnabled(str2) {
    if (!str2.includes("get mouseAndKeyboardEnabled(){"))
      return !1;
    return str2 = str2.replace("get mouseAndKeyboardEnabled(){", "get mouseAndKeyboardEnabled(){return true;"), str2;
  },
  exposeInputSink(str2) {
    if (!str2.includes("this.controlChannel=null,this.inputChannel=null"))
      return !1;
    const newCode = "window.BX_EXPOSED.inputSink = this;";
    return str2 = str2.replace("this.controlChannel=null,this.inputChannel=null", newCode + "this.controlChannel=null,this.inputChannel=null"), str2;
  },
  disableNativeRequestPointerLock(str2) {
    if (!str2.includes("async requestPointerLock(){"))
      return !1;
    return str2 = str2.replace("async requestPointerLock(){", "async requestPointerLock(){return;"), str2;
  },
  patchRequestInfoCrash(str2) {
    if (!str2.includes('if(!e)throw new Error("RequestInfo.origin is falsy");'))
      return !1;
    return str2 = str2.replace('if(!e)throw new Error("RequestInfo.origin is falsy");', 'if (!e) e = "https://www.xbox.com";'), str2;
  }
}, PATCH_ORDERS = [
  ...getPref(PrefKey.NATIVE_MKB_ENABLED) === "on" ? [
    "enableNativeMkb",
    "patchMouseAndKeyboardEnabled",
    "disableNativeRequestPointerLock",
    "exposeInputSink"
  ] : [],
  "patchRequestInfoCrash",
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
    STATES.userAgentHasTouchSupport && "patchUpdateInputConfigurationAsync"
  ] : [],
  ...BX_FLAGS.EnableXcloudLogging ? [
    "enableConsoleLogging",
    "enableXcloudLogger"
  ] : []
].filter((item2) => !!item2), PLAYING_PATCH_ORDERS = [
  "patchXcloudTitleInfo",
  "disableGamepadDisconnectedScreen",
  "patchStreamHud",
  "playVibration",
  getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && !getPref(PrefKey.STREAM_COMBINE_SOURCES) && "patchAudioMediaStream",
  getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && getPref(PrefKey.STREAM_COMBINE_SOURCES) && "patchCombinedAudioVideoMediaStream",
  getPref(PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG) && "skipFeedbackDialog",
  ...STATES.userAgentHasTouchSupport ? [
    getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "all" && "patchShowSensorControls",
    getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "all" && "exposeTouchLayoutManager",
    (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "off" || getPref(PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF)) && "disableTakRenderer",
    getPref(PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY) !== 100 && "patchTouchControlDefaultOpacity",
    "patchBabylonRendererClass"
  ] : [],
  BX_FLAGS.EnableXcloudLogging && "enableConsoleLogging",
  "patchPollGamepads",
  getPref(PrefKey.STREAM_COMBINE_SOURCES) && "streamCombineSources",
  ...getPref(PrefKey.REMOTE_PLAY_ENABLED) ? [
    "patchRemotePlayMkb",
    "remotePlayConnectMode"
  ] : []
].filter((item2) => !!item2), ALL_PATCHES = [...PATCH_ORDERS, ...PLAYING_PATCH_ORDERS];

class Patcher {
  static #patchFunctionBind() {
    const nativeBind = Function.prototype.bind;
    Function.prototype.bind = function() {
      let valid = !1;
      if (this.name.length <= 2 && arguments.length === 2 && arguments[0] === null) {
        if (arguments[1] === 0 || typeof arguments[1] === "function")
          valid = !0;
      }
      if (!valid)
        return nativeBind.apply(this, arguments);
      if (PatcherCache.init(), typeof arguments[1] === "function")
        BxLogger.info(LOG_TAG5, "Restored Function.prototype.bind()"), Function.prototype.bind = nativeBind;
      const orgFunc = this, newFunc = (a, item2) => {
        Patcher.patch(item2), orgFunc(a, item2);
      };
      return nativeBind.apply(newFunc, arguments);
    };
  }
  static patch(item) {
    let patchesToCheck, appliedPatches;
    const patchesMap = {};
    for (let id in item[1]) {
      appliedPatches = [];
      const cachedPatches = PatcherCache.getPatches(id);
      if (cachedPatches)
        patchesToCheck = cachedPatches.slice(0), patchesToCheck.push(...PATCH_ORDERS);
      else
        patchesToCheck = PATCH_ORDERS.slice(0);
      if (!patchesToCheck.length)
        continue;
      const func = item[1][id];
      let str = func.toString(), modified = !1;
      for (let patchIndex = 0;patchIndex < patchesToCheck.length; patchIndex++) {
        const patchName = patchesToCheck[patchIndex];
        if (appliedPatches.indexOf(patchName) > -1)
          continue;
        if (!PATCHES[patchName])
          continue;
        const patchedStr = PATCHES[patchName].call(null, str);
        if (!patchedStr)
          continue;
        modified = !0, str = patchedStr, BxLogger.info(LOG_TAG5, `✅ ${patchName}`), appliedPatches.push(patchName), patchesToCheck.splice(patchIndex, 1), patchIndex--, PATCH_ORDERS = PATCH_ORDERS.filter((item2) => item2 != patchName);
      }
      if (modified)
        item[1][id] = eval(str);
      if (appliedPatches.length)
        patchesMap[id] = appliedPatches;
    }
    if (Object.keys(patchesMap).length)
      PatcherCache.saveToCache(patchesMap);
  }
  static init() {
    Patcher.#patchFunctionBind();
  }
}

class PatcherCache {
  static #KEY_CACHE = "better_xcloud_patches_cache";
  static #KEY_SIGNATURE = "better_xcloud_patches_cache_signature";
  static #CACHE;
  static #isInitialized = !1;
  static #getSignature() {
    const scriptVersion = SCRIPT_VERSION, webVersion = document.querySelector("meta[name=gamepass-app-version]")?.content, patches = JSON.stringify(ALL_PATCHES);
    return hashCode(scriptVersion + webVersion + patches);
  }
  static clear() {
    window.localStorage.removeItem(PatcherCache.#KEY_CACHE), PatcherCache.#CACHE = {};
  }
  static checkSignature() {
    const storedSig = window.localStorage.getItem(PatcherCache.#KEY_SIGNATURE) || 0, currentSig = PatcherCache.#getSignature();
    if (currentSig !== parseInt(storedSig))
      BxLogger.warning(LOG_TAG5, "Signature changed"), window.localStorage.setItem(PatcherCache.#KEY_SIGNATURE, currentSig.toString()), PatcherCache.clear();
    else
      BxLogger.info(LOG_TAG5, "Signature unchanged");
  }
  static #cleanupPatches(patches) {
    return patches.filter((item2) => {
      for (let id2 in PatcherCache.#CACHE)
        if (PatcherCache.#CACHE[id2].includes(item2))
          return !1;
      return !0;
    });
  }
  static getPatches(id2) {
    return PatcherCache.#CACHE[id2];
  }
  static saveToCache(subCache) {
    for (let id2 in subCache) {
      const patchNames = subCache[id2];
      let data = PatcherCache.#CACHE[id2];
      if (!data)
        PatcherCache.#CACHE[id2] = patchNames;
      else
        for (let patchName of patchNames)
          if (!data.includes(patchName))
            data.push(patchName);
    }
    window.localStorage.setItem(PatcherCache.#KEY_CACHE, JSON.stringify(PatcherCache.#CACHE));
  }
  static init() {
    if (PatcherCache.#isInitialized)
      return;
    if (PatcherCache.#isInitialized = !0, PatcherCache.checkSignature(), PatcherCache.#CACHE = JSON.parse(window.localStorage.getItem(PatcherCache.#KEY_CACHE) || "{}"), BxLogger.info(LOG_TAG5, PatcherCache.#CACHE), window.location.pathname.includes("/play/"))
      PATCH_ORDERS.push(...PLAYING_PATCH_ORDERS);
    else
      PATCH_ORDERS.push(ENDING_CHUNKS_PATCH_NAME);
    PATCH_ORDERS = PatcherCache.#cleanupPatches(PATCH_ORDERS), PLAYING_PATCH_ORDERS = PatcherCache.#cleanupPatches(PLAYING_PATCH_ORDERS), BxLogger.info(LOG_TAG5, PATCH_ORDERS.slice(0)), BxLogger.info(LOG_TAG5, PLAYING_PATCH_ORDERS.slice(0));
  }
}

// src/modules/ui/global-settings.ts
function setupSettingsUi() {
  if (document.querySelector(".bx-settings-container"))
    return;
  const PREF_PREFERRED_REGION = getPreferredServerRegion(), PREF_LATEST_VERSION = getPref(PrefKey.LATEST_VERSION);
  let $btnReload;
  const $container = CE("div", {
    class: "bx-settings-container bx-gone"
  }), $wrapper = CE("div", { class: "bx-settings-wrapper" }, CE("div", { class: "bx-settings-title-wrapper" }, CE("a", {
    class: "bx-settings-title",
    href: "https://github.com/redphx/better-xcloud/releases",
    target: "_blank"
  }, "Better xCloud " + SCRIPT_VERSION), createButton({
    icon: BxIcon.QUESTION,
    style: ButtonStyle.FOCUSABLE,
    label: t("help"),
    url: "https://better-xcloud.github.io/features/"
  }))), topButtons = [];
  if (!SCRIPT_VERSION.includes("beta") && PREF_LATEST_VERSION && PREF_LATEST_VERSION != SCRIPT_VERSION)
    topButtons.push(createButton({
      label: `🌟 Version ${PREF_LATEST_VERSION} available`,
      style: ButtonStyle.PRIMARY | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
      url: "https://github.com/redphx/better-xcloud/releases/latest"
    }));
  if (topButtons.push(createButton({
    label: t("stream-settings"),
    icon: BxIcon.STREAM_SETTINGS,
    style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
    onClick: (e) => {
      StreamSettings.getInstance().show();
    }
  })), AppInterface)
    topButtons.push(createButton({
      label: t("android-app-settings"),
      icon: BxIcon.STREAM_SETTINGS,
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
      onClick: (e) => {
        AppInterface.openAppSettings && AppInterface.openAppSettings();
      }
    }));
  else if (UserAgent.getDefault().toLowerCase().includes("android"))
    topButtons.push(createButton({
      label: "🔥 " + t("install-android"),
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
      url: "https://better-xcloud.github.io/android"
    }));
  if (topButtons.length) {
    const $div = CE("div", { class: "bx-top-buttons" });
    for (let $button of topButtons)
      $div.appendChild($button);
    $wrapper.appendChild($div);
  }
  const onChange = async (e) => {
    PatcherCache.clear(), $btnReload.classList.add("bx-danger");
    const $btnHeaderSettings = document.querySelector(".bx-header-settings-button");
    if ($btnHeaderSettings && $btnHeaderSettings.classList.add("bx-danger"), e.target.id === "bx_setting_" + PrefKey.BETTER_XCLOUD_LOCALE) {
      if (Translations.refreshCurrentLocale(), await Translations.updateTranslations(), BX_FLAGS.ScriptUi !== "tv")
        $btnReload.textContent = t("settings-reloading"), $btnReload.click();
    }
  };
  for (let groupLabel in SETTINGS_UI) {
    const $group = CE("span", { class: "bx-settings-group-label" }, groupLabel);
    if (SETTINGS_UI[groupLabel].note) {
      const $note = CE("b", {}, SETTINGS_UI[groupLabel].note);
      $group.appendChild($note);
    }
    if ($wrapper.appendChild($group), SETTINGS_UI[groupLabel].unsupported)
      continue;
    const settingItems = SETTINGS_UI[groupLabel].items;
    for (let settingId of settingItems) {
      if (!settingId)
        continue;
      const setting = Preferences.SETTINGS[settingId];
      if (!setting)
        continue;
      let settingLabel = setting.label, settingNote = setting.note || "";
      if (setting.experimental)
        if (settingLabel = "🧪 " + settingLabel, !settingNote)
          settingNote = t("experimental");
        else
          settingNote = `${t("experimental")}: ${settingNote}`;
      let $control, $inpCustomUserAgent, labelAttrs = {
        tabindex: "-1"
      };
      if (settingId === PrefKey.USER_AGENT_PROFILE) {
        let defaultUserAgent = window.navigator.orgUserAgent || window.navigator.userAgent;
        $inpCustomUserAgent = CE("input", {
          id: `bx_setting_inp_${settingId}`,
          type: "text",
          placeholder: defaultUserAgent,
          class: "bx-settings-custom-user-agent"
        }), $inpCustomUserAgent.addEventListener("input", (e) => {
          const profile = $control.value, custom = e.target.value.trim();
          UserAgent.updateStorage(profile, custom), onChange(e);
        }), $control = toPrefElement(PrefKey.USER_AGENT_PROFILE, (e) => {
          const value = e.target.value;
          let isCustom = value === UserAgentProfile.CUSTOM, userAgent2 = UserAgent.get(value);
          UserAgent.updateStorage(value), $inpCustomUserAgent.value = userAgent2, $inpCustomUserAgent.readOnly = !isCustom, $inpCustomUserAgent.disabled = !isCustom, !e.target.disabled && onChange(e);
        });
      } else if (settingId === PrefKey.SERVER_REGION) {
        let selectedValue;
        $control = CE("select", {
          id: `bx_setting_${settingId}`,
          title: settingLabel,
          tabindex: 0
        }), $control.name = $control.id, $control.addEventListener("input", (e) => {
          setPref(settingId, e.target.value), onChange(e);
        }), selectedValue = PREF_PREFERRED_REGION, setting.options = {};
        for (let regionName in STATES.serverRegions) {
          const region4 = STATES.serverRegions[regionName];
          let value = regionName, label = `${region4.shortName} - ${regionName}`;
          if (region4.isDefault) {
            if (label += ` (${t("default")})`, value = "default", selectedValue === regionName)
              selectedValue = "default";
          }
          setting.options[value] = label;
        }
        for (let value in setting.options) {
          const label = setting.options[value], $option = CE("option", { value }, label);
          $control.appendChild($option);
        }
        $control.value = selectedValue;
      } else if (settingId === PrefKey.BETTER_XCLOUD_LOCALE)
        $control = toPrefElement(settingId, (e) => {
          localStorage.setItem("better_xcloud_locale", e.target.value), onChange(e);
        });
      else
        $control = toPrefElement(settingId, onChange);
      if ($control.id)
        labelAttrs.for = $control.id;
      else
        labelAttrs.for = `bx_setting_${settingId}`;
      if (setting.unsupported)
        $control.disabled = !0;
      if ($control.disabled && !!$control.getAttribute("tabindex"))
        $control.setAttribute("tabindex", -1);
      const $label = CE("label", labelAttrs, settingLabel);
      if (settingNote)
        $label.appendChild(CE("b", {}, settingNote));
      let $elm;
      if ($control instanceof HTMLSelectElement && BX_FLAGS.ScriptUi === "tv")
        $elm = CE("div", { class: "bx-settings-row" }, $label, BxSelectElement.wrap($control));
      else
        $elm = CE("div", { class: "bx-settings-row" }, $label, $control);
      if ($wrapper.appendChild($elm), settingId === PrefKey.USER_AGENT_PROFILE)
        $wrapper.appendChild($inpCustomUserAgent), $control.disabled = !0, $control.dispatchEvent(new Event("input")), $control.disabled = !1;
    }
  }
  $btnReload = createButton({
    label: t("settings-reload"),
    classes: ["bx-settings-reload-button"],
    style: ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH | ButtonStyle.TALL,
    onClick: (e) => {
      window.location.reload(), $btnReload.disabled = !0, $btnReload.textContent = t("settings-reloading");
    }
  }), $btnReload.setAttribute("tabindex", "0"), $wrapper.appendChild($btnReload);
  const $donationLink = CE("a", {
    class: "bx-donation-link",
    href: "https://ko-fi.com/redphx",
    target: "_blank",
    tabindex: 0
  }, `❤️ ${t("support-better-xcloud")}`);
  $wrapper.appendChild($donationLink);
  try {
    const appVersion = document.querySelector("meta[name=gamepass-app-version]").content, appDate = new Date(document.querySelector("meta[name=gamepass-app-date]").content).toISOString().substring(0, 10);
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
      PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG,
      PrefKey.SCREENSHOT_APPLY_FILTERS,
      PrefKey.AUDIO_MIC_ON_PLAYING,
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
      PrefKey.NATIVE_MKB_ENABLED,
      PrefKey.MKB_ENABLED,
      PrefKey.MKB_HIDE_IDLE_CURSOR
    ]
  },
  [t("touch-controller")]: {
    note: !STATES.userAgentHasTouchSupport ? "⚠️ " + t("device-unsupported-touch") : null,
    unsupported: !STATES.userAgentHasTouchSupport,
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
  if (!$parent)
    return;
  const PREF_PREFERRED_REGION = getPreferredServerRegion(!0), PREF_LATEST_VERSION = getPref(PrefKey.LATEST_VERSION), $headerFragment = document.createDocumentFragment();
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
      setupSettingsUi(), document.querySelector(".bx-settings-container").classList.toggle("bx-gone"), window.scrollTo(0, 0), document.activeElement && document.activeElement.blur();
    }
  });
  if (!SCRIPT_VERSION.includes("beta") && PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION)
    $settingsBtn.setAttribute("data-update-available", "true");
  $headerFragment.appendChild($settingsBtn), $parent.appendChild($headerFragment);
};
function checkHeader() {
  if (!document.querySelector(".bx-header-settings-button")) {
    const $rightHeader = document.querySelector("#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]");
    injectSettingsButton($rightHeader);
  }
}
function watchHeader() {
  const $header = document.querySelector("#PageContent header");
  if (!$header)
    return;
  let timeout;
  new MutationObserver((mutationList) => {
    timeout && clearTimeout(timeout), timeout = window.setTimeout(checkHeader, 2000);
  }).observe($header, { subtree: !0, childList: !0 }), checkHeader();
}

// src/utils/history.ts
function patchHistoryMethod(type) {
  const orig = window.history[type];
  return function(...args) {
    return BxEvent.dispatch(window, BxEvent.POPSTATE, {
      arguments: args
    }), orig.apply(this, arguments);
  };
}
function onHistoryChanged(e) {
  if (e && e.arguments && e.arguments[0] && e.arguments[0].origin === "better-xcloud")
    return;
  window.setTimeout(RemotePlay.detect, 10);
  const $settings = document.querySelector(".bx-settings-container");
  if ($settings)
    $settings.classList.add("bx-gone");
  RemotePlay.detachPopup(), LoadingScreen.reset(), window.setTimeout(checkHeader, 2000), BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
}

// src/utils/preload-state.ts
function overridePreloadState() {
  let _state;
  Object.defineProperty(window, "__PRELOADED_STATE__", {
    configurable: !0,
    get: () => {
      return _state;
    },
    set: (state) => {
      try {
        state.appContext.requestInfo.userAgent = window.navigator.userAgent;
      } catch (e) {
        BxLogger.error(LOG_TAG6, e);
      }
      if (STATES.userAgentHasTouchSupport)
        try {
          const sigls = state.xcloud.sigls;
          if (GamePassCloudGallery.TOUCH in sigls) {
            let customList = TouchController.getCustomList();
            const allGames = sigls[GamePassCloudGallery.ALL].data.products;
            customList = customList.filter((id2) => allGames.includes(id2)), sigls[GamePassCloudGallery.TOUCH]?.data.products.push(...customList);
          }
          if (BX_FLAGS.ForceNativeMkbTitles && GamePassCloudGallery.NATIVE_MKB in sigls)
            sigls[GamePassCloudGallery.NATIVE_MKB]?.data.products.push(...BX_FLAGS.ForceNativeMkbTitles);
        } catch (e) {
          BxLogger.error(LOG_TAG6, e);
        }
      if (getPref(PrefKey.UI_HOME_CONTEXT_MENU_DISABLED))
        try {
          state.experiments.experimentationInfo.data.treatments.EnableHomeContextMenu = !1;
        } catch (e) {
          BxLogger.error(LOG_TAG6, e);
        }
      _state = state, STATES.appContext = deepClone(state.appContext);
    }
  });
}
var LOG_TAG6 = "PreloadState";

// src/utils/sdp.ts
function setCodecPreferences(sdp, preferredCodec) {
  const h264Pattern = /a=fmtp:(\d+).*profile-level-id=([0-9a-f]{6})/g, profilePrefix = preferredCodec === "high" ? "4d" : preferredCodec === "low" ? "420" : "42e", preferredCodecIds = [], matches = sdp.matchAll(h264Pattern) || [];
  for (let match of matches) {
    const id2 = match[1];
    if (match[2].startsWith(profilePrefix))
      preferredCodecIds.push(id2);
  }
  if (!preferredCodecIds.length)
    return sdp;
  const lines = sdp.split("\r\n");
  for (let lineIndex = 0;lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (!line.startsWith("m=video"))
      continue;
    const tmp = line.trim().split(" ");
    let ids = tmp.slice(3);
    ids = ids.filter((item2) => !preferredCodecIds.includes(item2)), ids = preferredCodecIds.concat(ids), lines[lineIndex] = tmp.slice(0, 3).concat(ids).join(" ");
    break;
  }
  return lines.join("\r\n");
}
function patchSdpBitrate(sdp, video, audio) {
  const lines = sdp.split("\r\n"), mediaSet = new Set;
  !!video && mediaSet.add("video"), !!audio && mediaSet.add("audio");
  const bitrate = {
    video,
    audio
  };
  for (let lineNumber = 0;lineNumber < lines.length; lineNumber++) {
    let media = "", line = lines[lineNumber];
    if (!line.startsWith("m="))
      continue;
    for (let m of mediaSet)
      if (line.startsWith(`m=${m}`)) {
        media = m, mediaSet.delete(media);
        break;
      }
    if (!media)
      continue;
    const bLine = `b=AS:${bitrate[media]}`;
    while (lineNumber++, lineNumber < lines.length) {
      if (line = lines[lineNumber], line.startsWith("i=") || line.startsWith("c="))
        continue;
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
  return lines.join("\r\n");
}

// src/modules/player/shaders/clarity_boost.vert
var clarity_boost_default = "attribute vec2 position;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n}\n";

// src/modules/player/shaders/clarity_boost.fs
var clarity_boost_default2 = "const int FILTER_UNSHARP_MASKING = 1;\nconst int FILTER_CAS = 2;\n\nprecision highp float;\nuniform sampler2D data;\nuniform vec2 iResolution;\n\nuniform int filterId;\nuniform float sharpenFactor;\nuniform float brightness;\nuniform float contrast;\nuniform float saturation;\n\nvec3 textureAt(sampler2D tex, vec2 coord) {\n    return texture2D(tex, coord / iResolution.xy).rgb;\n}\n\nvec3 clarityBoost(sampler2D tex, vec2 coord)\n{\n    // Load a collection of samples in a 3x3 neighorhood, where e is the current pixel.\n    // a b c\n    // d e f\n    // g h i\n    vec3 a = textureAt(tex, coord + vec2(-1, 1));\n    vec3 b = textureAt(tex, coord + vec2(0, 1));\n    vec3 c = textureAt(tex, coord + vec2(1, 1));\n\n    vec3 d = textureAt(tex, coord + vec2(-1, 0));\n    vec3 e = textureAt(tex, coord);\n    vec3 f = textureAt(tex, coord + vec2(1, 0));\n\n    vec3 g = textureAt(tex, coord + vec2(-1, -1));\n    vec3 h = textureAt(tex, coord + vec2(0, -1));\n    vec3 i = textureAt(tex, coord + vec2(1, -1));\n\n    if (filterId == FILTER_CAS) {\n        // Soft min and max.\n        //  a b c             b\n        //  d e f * 0.5  +  d e f * 0.5\n        //  g h i             h\n        // These are 2.0x bigger (factored out the extra multiply).\n        vec3 minRgb = min(min(min(d, e), min(f, b)), h);\n        vec3 minRgb2 = min(min(a, c), min(g, i));\n        minRgb += min(minRgb, minRgb2);\n\n        vec3 maxRgb = max(max(max(d, e), max(f, b)), h);\n        vec3 maxRgb2 = max(max(a, c), max(g, i));\n        maxRgb += max(maxRgb, maxRgb2);\n\n        // Smooth minimum distance to signal limit divided by smooth max.\n        vec3 reciprocalMaxRgb = 1.0 / maxRgb;\n        vec3 amplifyRgb = clamp(min(minRgb, 2.0 - maxRgb) * reciprocalMaxRgb, 0.0, 1.0);\n\n        // Shaping amount of sharpening.\n        amplifyRgb = inversesqrt(amplifyRgb);\n\n        float contrast = 0.8;\n        float peak = -3.0 * contrast + 8.0;\n        vec3 weightRgb = -(1.0 / (amplifyRgb * peak));\n\n        vec3 reciprocalWeightRgb = 1.0 / (4.0 * weightRgb + 1.0);\n\n        //                0 w 0\n        // Filter shape:  w 1 w\n        //                0 w 0\n        vec3 window = (b + d) + (f + h);\n        vec3 outColor = clamp((window * weightRgb + e) * reciprocalWeightRgb, 0.0, 1.0);\n\n        outColor = mix(e, outColor, sharpenFactor / 2.0);\n\n        return outColor;\n    } else if (filterId == FILTER_UNSHARP_MASKING) {\n        vec3 gaussianBlur = (a * 1.0 + b * 2.0 + c * 1.0 +\n            d * 2.0 + e * 4.0 + f * 2.0 +\n            g * 1.0 + h * 2.0 + i * 1.0) / 16.0;\n\n        // Return edge detection\n        return e + (e - gaussianBlur) * sharpenFactor / 3.0;\n    }\n\n    return e;\n}\n\nvec3 adjustBrightness(vec3 color) {\n    return (1.0 + brightness) * color;\n}\n\nvec3 adjustContrast(vec3 color) {\n    return 0.5 + (1.0 + contrast) * (color - 0.5);\n}\n\nvec3 adjustSaturation(vec3 color) {\n    const vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);\n    vec3 grayscale = vec3(dot(color, luminosityFactor));\n\n    return mix(grayscale, color, 1.0 + saturation);\n}\n\nvoid main() {\n    vec3 color;\n\n    if (sharpenFactor > 0.0) {\n        color = clarityBoost(data, gl_FragCoord.xy);\n    } else {\n        color = textureAt(data, gl_FragCoord.xy);\n    }\n\n    if (saturation != 0.0) {\n        color = adjustSaturation(color);\n    }\n\n    if (contrast != 0.0) {\n        color = adjustContrast(color);\n    }\n\n    if (brightness != 0.0) {\n        color = adjustBrightness(color);\n    }\n\n    gl_FragColor = vec4(color, 1.0);\n}\n";

// src/modules/player/webgl2-player.ts
var LOG_TAG7 = "WebGL2Player";

class WebGL2Player {
  #$video;
  #$canvas;
  #gl = null;
  #resources = [];
  #program = null;
  #stopped = !1;
  #options = {
    filterId: 1,
    sharpenFactor: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0
  };
  #animFrameId = null;
  constructor($video) {
    BxLogger.info(LOG_TAG7, "Initialize"), this.#$video = $video;
    const $canvas = document.createElement("canvas");
    $canvas.width = $video.videoWidth, $canvas.height = $video.videoHeight, this.#$canvas = $canvas, this.#setupShaders(), this.#setupRendering(), $video.insertAdjacentElement("afterend", $canvas);
  }
  setFilter(filterId, update = !0) {
    this.#options.filterId = filterId, update && this.updateCanvas();
  }
  setSharpness(sharpness, update = !0) {
    this.#options.sharpenFactor = sharpness, update && this.updateCanvas();
  }
  setBrightness(brightness, update = !0) {
    this.#options.brightness = (brightness - 100) / 100, update && this.updateCanvas();
  }
  setContrast(contrast, update = !0) {
    this.#options.contrast = (contrast - 100) / 100, update && this.updateCanvas();
  }
  setSaturation(saturation, update = !0) {
    this.#options.saturation = (saturation - 100) / 100, update && this.updateCanvas();
  }
  getCanvas() {
    return this.#$canvas;
  }
  updateCanvas() {
    const gl = this.#gl, program = this.#program;
    gl.uniform2f(gl.getUniformLocation(program, "iResolution"), this.#$canvas.width, this.#$canvas.height), gl.uniform1i(gl.getUniformLocation(program, "filterId"), this.#options.filterId), gl.uniform1f(gl.getUniformLocation(program, "sharpenFactor"), this.#options.sharpenFactor), gl.uniform1f(gl.getUniformLocation(program, "brightness"), this.#options.brightness), gl.uniform1f(gl.getUniformLocation(program, "contrast"), this.#options.contrast), gl.uniform1f(gl.getUniformLocation(program, "saturation"), this.#options.saturation);
  }
  drawFrame() {
    const gl = this.#gl, $video = this.#$video;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, $video), gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  #setupRendering() {
    let animate;
    if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
      const $video = this.#$video;
      animate = () => {
        if (this.#stopped)
          return;
        this.drawFrame(), this.#animFrameId = $video.requestVideoFrameCallback(animate);
      }, this.#animFrameId = $video.requestVideoFrameCallback(animate);
    } else
      animate = () => {
        if (this.#stopped)
          return;
        this.drawFrame(), this.#animFrameId = requestAnimationFrame(animate);
      }, this.#animFrameId = requestAnimationFrame(animate);
  }
  #setupShaders() {
    const gl = this.#$canvas.getContext("webgl2", {
      isBx: !0,
      antialias: !0,
      alpha: !1,
      powerPreference: "high-performance"
    });
    this.#gl = gl, gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferWidth);
    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, clarity_boost_default), gl.compileShader(vShader);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, clarity_boost_default2), gl.compileShader(fShader);
    const program = gl.createProgram();
    if (this.#program = program, gl.attachShader(program, vShader), gl.attachShader(program, fShader), gl.linkProgram(program), gl.useProgram(program), !gl.getProgramParameter(program, gl.LINK_STATUS))
      console.error(`Link failed: ${gl.getProgramInfoLog(program)}`), console.error(`vs info-log: ${gl.getShaderInfoLog(vShader)}`), console.error(`fs info-log: ${gl.getShaderInfoLog(fShader)}`);
    this.updateCanvas();
    const buffer = gl.createBuffer();
    this.#resources.push(buffer), gl.bindBuffer(gl.ARRAY_BUFFER, buffer), gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,
      -1,
      1,
      -1,
      -1,
      1,
      -1,
      1,
      1,
      -1,
      1,
      1
    ]), gl.STATIC_DRAW), gl.enableVertexAttribArray(0), gl.vertexAttribPointer(0, 2, gl.FLOAT, !1, 0, 0);
    const texture = gl.createTexture();
    this.#resources.push(texture), gl.bindTexture(gl.TEXTURE_2D, texture), gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !0), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR), gl.uniform1i(gl.getUniformLocation(program, "data"), 0), gl.activeTexture(gl.TEXTURE0);
  }
  resume() {
    this.stop(), this.#stopped = !1, BxLogger.info(LOG_TAG7, "Resume"), this.#$canvas.classList.remove("bx-gone"), this.#setupRendering();
  }
  stop() {
    if (BxLogger.info(LOG_TAG7, "Stop"), this.#$canvas.classList.add("bx-gone"), this.#stopped = !0, this.#animFrameId) {
      if ("requestVideoFrameCallback" in HTMLVideoElement.prototype)
        this.#$video.cancelVideoFrameCallback(this.#animFrameId);
      else
        cancelAnimationFrame(this.#animFrameId);
      this.#animFrameId = null;
    }
  }
  destroy() {
    BxLogger.info(LOG_TAG7, "Destroy"), this.stop();
    const gl = this.#gl;
    if (gl) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      for (let resource of this.#resources)
        if (resource instanceof WebGLProgram)
          gl.useProgram(null), gl.deleteProgram(resource);
        else if (resource instanceof WebGLShader)
          gl.deleteShader(resource);
        else if (resource instanceof WebGLTexture)
          gl.deleteTexture(resource);
        else if (resource instanceof WebGLBuffer)
          gl.deleteBuffer(resource);
      this.#gl = null;
    }
    if (this.#$canvas.isConnected)
      this.#$canvas.parentElement?.removeChild(this.#$canvas);
    this.#$canvas.width = 1, this.#$canvas.height = 1;
  }
}

// src/modules/stream-player.ts
class StreamPlayer {
  #$video;
  #playerType = StreamPlayerType.VIDEO;
  #options = {};
  #webGL2Player = null;
  #$videoCss = null;
  #$usmMatrix = null;
  constructor($video, type, options) {
    this.#setupVideoElements(), this.#$video = $video, this.#options = options || {}, this.setPlayerType(type);
  }
  #setupVideoElements() {
    if (this.#$videoCss = document.getElementById("bx-video-css"), this.#$videoCss) {
      this.#$usmMatrix = this.#$videoCss.querySelector("#bx-filter-usm-matrix");
      return;
    }
    const $fragment = document.createDocumentFragment();
    this.#$videoCss = CE("style", { id: "bx-video-css" }), $fragment.appendChild(this.#$videoCss);
    const $svg = CE("svg", {
      id: "bx-video-filters",
      xmlns: "http://www.w3.org/2000/svg",
      class: "bx-gone"
    }, CE("defs", { xmlns: "http://www.w3.org/2000/svg" }, CE("filter", {
      id: "bx-filter-usm",
      xmlns: "http://www.w3.org/2000/svg"
    }, this.#$usmMatrix = CE("feConvolveMatrix", {
      id: "bx-filter-usm-matrix",
      order: "3",
      xmlns: "http://www.w3.org/2000/svg"
    }))));
    $fragment.appendChild($svg), document.documentElement.appendChild($fragment);
  }
  #getVideoPlayerFilterStyle() {
    const filters = [], sharpness = this.#options.sharpness || 0;
    if (sharpness != 0) {
      const matrix = `0 -1 0 -1 ${(7 - (sharpness / 2 - 1) * 0.5).toFixed(1)} -1 0 -1 0`;
      this.#$usmMatrix?.setAttributeNS(null, "kernelMatrix", matrix), filters.push("url(#bx-filter-usm)");
    }
    const saturation = this.#options.saturation || 100;
    if (saturation != 100)
      filters.push(`saturate(${saturation}%)`);
    const contrast = this.#options.contrast || 100;
    if (contrast != 100)
      filters.push(`contrast(${contrast}%)`);
    const brightness = this.#options.brightness || 100;
    if (brightness != 100)
      filters.push(`brightness(${brightness}%)`);
    return filters.join(" ");
  }
  #resizePlayer() {
    const PREF_RATIO = getPref(PrefKey.VIDEO_RATIO), $video = this.#$video, isNativeTouchGame = STATES.currentStream.titleInfo?.details.hasNativeTouchSupport;
    let $webGL2Canvas;
    if (this.#playerType == StreamPlayerType.WEBGL2)
      $webGL2Canvas = this.#webGL2Player?.getCanvas();
    let targetWidth, targetHeight, targetObjectFit;
    if (PREF_RATIO.includes(":")) {
      const tmp = PREF_RATIO.split(":"), videoRatio = parseFloat(tmp[0]) / parseFloat(tmp[1]);
      let width = 0, height = 0;
      const parentRect = $video.parentElement.getBoundingClientRect();
      if (parentRect.width / parentRect.height > videoRatio)
        height = parentRect.height, width = height * videoRatio;
      else
        width = parentRect.width, height = width / videoRatio;
      width = Math.ceil(Math.min(parentRect.width, width)), height = Math.ceil(Math.min(parentRect.height, height)), $video.dataset.width = width.toString(), $video.dataset.height = height.toString(), targetWidth = `${width}px`, targetHeight = `${height}px`, targetObjectFit = PREF_RATIO === "16:9" ? "contain" : "fill";
    } else
      targetWidth = "100%", targetHeight = "100%", targetObjectFit = PREF_RATIO, $video.dataset.width = window.innerWidth.toString(), $video.dataset.height = window.innerHeight.toString();
    if ($video.style.width = targetWidth, $video.style.height = targetHeight, $video.style.objectFit = targetObjectFit, $webGL2Canvas)
      $webGL2Canvas.style.width = targetWidth, $webGL2Canvas.style.height = targetHeight, $webGL2Canvas.style.objectFit = targetObjectFit;
    if (isNativeTouchGame && this.#playerType == StreamPlayerType.WEBGL2)
      window.BX_EXPOSED.streamSession.updateDimensions();
  }
  setPlayerType(type, refreshPlayer = !1) {
    if (this.#playerType !== type)
      if (type === StreamPlayerType.WEBGL2) {
        if (!this.#webGL2Player)
          this.#webGL2Player = new WebGL2Player(this.#$video);
        else
          this.#webGL2Player.resume();
        this.#$videoCss.textContent = "", this.#$video.classList.add("bx-pixel");
      } else
        this.#webGL2Player?.stop(), this.#$video.classList.remove("bx-pixel");
    this.#playerType = type, refreshPlayer && this.refreshPlayer();
  }
  setOptions(options, refreshPlayer = !1) {
    this.#options = options, refreshPlayer && this.refreshPlayer();
  }
  updateOptions(options, refreshPlayer = !1) {
    this.#options = Object.assign(this.#options, options), refreshPlayer && this.refreshPlayer();
  }
  getPlayerElement(playerType) {
    if (typeof playerType === "undefined")
      playerType = this.#playerType;
    if (playerType === StreamPlayerType.WEBGL2)
      return this.#webGL2Player?.getCanvas();
    return this.#$video;
  }
  getWebGL2Player() {
    return this.#webGL2Player;
  }
  refreshPlayer() {
    if (this.#playerType === StreamPlayerType.WEBGL2) {
      const options = this.#options, webGL2Player = this.#webGL2Player;
      if (options.processing === StreamVideoProcessing.USM)
        webGL2Player.setFilter(1);
      else
        webGL2Player.setFilter(2);
      Screenshot.updateCanvasFilters("none"), webGL2Player.setSharpness(options.sharpness || 0), webGL2Player.setSaturation(options.saturation || 100), webGL2Player.setContrast(options.contrast || 100), webGL2Player.setBrightness(options.brightness || 100);
    } else {
      let filters = this.#getVideoPlayerFilterStyle(), videoCss = "";
      if (filters)
        videoCss += `filter: ${filters} !important;`;
      if (getPref(PrefKey.SCREENSHOT_APPLY_FILTERS))
        Screenshot.updateCanvasFilters(filters);
      let css = "";
      if (videoCss)
        css = `#game-stream video { ${videoCss} }`;
      this.#$videoCss.textContent = css;
    }
    this.#resizePlayer();
  }
  destroy() {
    this.#webGL2Player?.destroy(), this.#webGL2Player = null;
  }
}

// src/utils/monkey-patches.ts
function patchVideoApi() {
  const PREF_SKIP_SPLASH_VIDEO = getPref(PrefKey.SKIP_SPLASH_VIDEO), showFunc = function() {
    if (this.style.visibility = "visible", this.removeEventListener("playing", showFunc), !this.videoWidth)
      return;
    const playerOptions = {
      processing: getPref(PrefKey.VIDEO_PROCESSING),
      sharpness: getPref(PrefKey.VIDEO_SHARPNESS),
      saturation: getPref(PrefKey.VIDEO_SATURATION),
      contrast: getPref(PrefKey.VIDEO_CONTRAST),
      brightness: getPref(PrefKey.VIDEO_BRIGHTNESS)
    };
    STATES.currentStream.streamPlayer = new StreamPlayer(this, getPref(PrefKey.VIDEO_PLAYER_TYPE), playerOptions), BxEvent.dispatch(window, BxEvent.STREAM_PLAYING, {
      $video: this
    });
  }, nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.nativePlay = nativePlay, HTMLMediaElement.prototype.play = function() {
    if (this.className && this.className.startsWith("XboxSplashVideo")) {
      if (PREF_SKIP_SPLASH_VIDEO)
        return this.volume = 0, this.style.display = "none", this.dispatchEvent(new Event("ended")), new Promise(() => {
        });
      return nativePlay.apply(this);
    }
    const $parent = this.parentElement;
    if (!this.src && $parent.dataset.testid === "media-container")
      this.addEventListener("playing", showFunc);
    return nativePlay.apply(this);
  };
}
function patchRtcCodecs() {
  if (getPref(PrefKey.STREAM_CODEC_PROFILE) === "default")
    return;
  if (typeof RTCRtpTransceiver === "undefined" || !("setCodecPreferences" in RTCRtpTransceiver.prototype))
    return !1;
}
function patchRtcPeerConnection() {
  const nativeCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
  RTCPeerConnection.prototype.createDataChannel = function() {
    const dataChannel = nativeCreateDataChannel.apply(this, arguments);
    return BxEvent.dispatch(window, BxEvent.DATA_CHANNEL_CREATED, {
      dataChannel
    }), dataChannel;
  };
  const maxVideoBitrate = getPref(PrefKey.BITRATE_VIDEO_MAX), codec = getPref(PrefKey.STREAM_CODEC_PROFILE);
  if (codec !== "default" || maxVideoBitrate > 0) {
    const nativeSetLocalDescription = RTCPeerConnection.prototype.setLocalDescription;
    RTCPeerConnection.prototype.setLocalDescription = function(description) {
      if (codec !== "default")
        arguments[0].sdp = setCodecPreferences(arguments[0].sdp, codec);
      try {
        if (maxVideoBitrate > 0 && description)
          arguments[0].sdp = patchSdpBitrate(arguments[0].sdp, Math.round(maxVideoBitrate / 1000));
      } catch (e) {
        BxLogger.error("setLocalDescription", e);
      }
      return BxLogger.info("setLocalDescription", arguments[0].sdp), nativeSetLocalDescription.apply(this, arguments);
    };
  }
  const OrgRTCPeerConnection = window.RTCPeerConnection;
  window.RTCPeerConnection = function() {
    const conn = new OrgRTCPeerConnection;
    return STATES.currentStream.peerConnection = conn, conn.addEventListener("connectionstatechange", (e) => {
      BxLogger.info("connectionstatechange", conn.connectionState);
    }), conn;
  };
}
function patchAudioContext() {
  const OrgAudioContext = window.AudioContext, nativeCreateGain = OrgAudioContext.prototype.createGain;
  window.AudioContext = function(options) {
    if (options && options.latencyHint)
      options.latencyHint = 0;
    const ctx = new OrgAudioContext(options);
    return BxLogger.info("patchAudioContext", ctx, options), ctx.createGain = function() {
      const gainNode = nativeCreateGain.apply(this);
      return gainNode.gain.value = getPref(PrefKey.AUDIO_VOLUME) / 100, STATES.currentStream.audioGainNode = gainNode, gainNode;
    }, STATES.currentStream.audioContext = ctx, ctx;
  };
}
function patchMeControl() {
  const overrideConfigs = {
    enableAADTelemetry: !1,
    enableTelemetry: !1,
    telEvs: "",
    oneDSUrl: ""
  }, MSA = {
    MeControl: {
      API: {
        setDisplayMode: () => {
        },
        setMobileState: () => {
        }
      }
    }
  }, MeControl = {}, MsaHandler = {
    get(target, prop, receiver) {
      return target[prop];
    },
    set(obj, prop, value) {
      if (prop === "MeControl" && value.Config)
        value.Config = Object.assign(value.Config, overrideConfigs);
      return obj[prop] = value, !0;
    }
  }, MeControlHandler = {
    get(target, prop, receiver) {
      return target[prop];
    },
    set(obj, prop, value) {
      if (prop === "Config")
        value = Object.assign(value, overrideConfigs);
      return obj[prop] = value, !0;
    }
  };
  window.MSA = new Proxy(MSA, MsaHandler), window.MeControl = new Proxy(MeControl, MeControlHandler);
}
function patchCanvasContext() {
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
    if (contextType.includes("webgl")) {
      if (contextAttributes = contextAttributes || {}, !contextAttributes.isBx) {
        if (contextAttributes.antialias = !1, contextAttributes.powerPreference === "high-performance")
          contextAttributes.powerPreference = "low-power";
      }
    }
    return nativeGetContext.apply(this, [contextType, contextAttributes]);
  };
}
function patchPointerLockApi() {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: !0,
    get() {
      return document.documentElement;
    }
  }), HTMLElement.prototype.requestFullscreen = function(options) {
    return Promise.resolve();
  };
  let pointerLockElement = null;
  Object.defineProperty(document, "pointerLockElement", {
    configurable: !0,
    get() {
      return pointerLockElement;
    }
  }), HTMLElement.prototype.requestPointerLock = function() {
    pointerLockElement = document.documentElement, window.dispatchEvent(new Event(BxEvent.POINTER_LOCK_REQUESTED));
  }, Document.prototype.exitPointerLock = function() {
    pointerLockElement = null, window.dispatchEvent(new Event(BxEvent.POINTER_LOCK_EXITED));
  };
}

// src/modules/stream/stream-ui.ts
var cloneStreamHudButton = function($orgButton, label, svgIcon) {
  const $container = $orgButton.cloneNode(!0);
  let timeout;
  const onTransitionStart = (e) => {
    if (e.propertyName !== "opacity")
      return;
    timeout && clearTimeout(timeout), $container.style.pointerEvents = "none";
  }, onTransitionEnd = (e) => {
    if (e.propertyName !== "opacity")
      return;
    if (document.getElementById("StreamHud")?.style.left === "0px")
      timeout && clearTimeout(timeout), timeout = window.setTimeout(() => {
        $container.style.pointerEvents = "auto";
      }, 100);
  };
  if (STATES.browserHasTouchSupport)
    $container.addEventListener("transitionstart", onTransitionStart), $container.addEventListener("transitionend", onTransitionEnd);
  const $button = $container.querySelector("button");
  $button.setAttribute("title", label);
  const $orgSvg = $button.querySelector("svg"), $svg = createSvgIcon(svgIcon);
  return $svg.style.fill = "none", $svg.setAttribute("class", $orgSvg.getAttribute("class") || ""), $svg.ariaHidden = "true", $orgSvg.replaceWith($svg), $container;
}, cloneCloseButton = function($$btnOrg, icon, className, onChange) {
  const $btn = $$btnOrg.cloneNode(!0), $svg = createSvgIcon(icon);
  return $svg.setAttribute("class", $btn.firstElementChild.getAttribute("class") || ""), $svg.style.fill = "none", $btn.classList.add(className), $btn.removeChild($btn.firstElementChild), $btn.appendChild($svg), $btn.addEventListener("click", onChange), $btn;
};
function injectStreamMenuButtons() {
  const $screen = document.querySelector("#PageContent section[class*=PureScreens]");
  if (!$screen)
    return;
  if ($screen.xObserving)
    return;
  $screen.xObserving = !0;
  let $btnStreamSettings, $btnStreamStats;
  const streamStats = StreamStats.getInstance();
  new MutationObserver((mutationList) => {
    mutationList.forEach((item2) => {
      if (item2.type !== "childList")
        return;
      item2.addedNodes.forEach(async ($node) => {
        if (!$node || $node.nodeType !== Node.ELEMENT_NODE)
          return;
        let $elm = $node;
        if ($elm instanceof SVGSVGElement)
          return;
        if ($elm.className?.includes("PureErrorPage")) {
          BxEvent.dispatch(window, BxEvent.STREAM_ERROR_PAGE);
          return;
        }
        if ($elm.className?.startsWith("StreamMenu-module__container")) {
          const $btnCloseHud = document.querySelector("button[class*=StreamMenu-module__backButton]");
          if (!$btnCloseHud)
            return;
          $btnCloseHud.addEventListener("click", (e) => {
            StreamSettings.getInstance().hide();
          });
          const $btnRefresh = cloneCloseButton($btnCloseHud, BxIcon.REFRESH, "bx-stream-refresh-button", () => {
            confirm(t("confirm-reload-stream")) && window.location.reload();
          }), $btnHome = cloneCloseButton($btnCloseHud, BxIcon.HOME, "bx-stream-home-button", () => {
            confirm(t("back-to-home-confirm")) && (window.location.href = window.location.href.substring(0, 31));
          });
          $btnCloseHud.insertAdjacentElement("afterend", $btnRefresh), $btnRefresh.insertAdjacentElement("afterend", $btnHome), document.querySelector("div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]")?.appendChild(await StreamBadges.getInstance().render());
          return;
        }
        if ($elm.className?.startsWith("Overlay-module_") || $elm.className?.startsWith("InProgressScreen"))
          $elm = $elm.querySelector("#StreamHud");
        if (!$elm || ($elm.id || "") !== "StreamHud")
          return;
        const $gripHandle = $elm.querySelector("button[class^=GripHandle]"), hideGripHandle = () => {
          if (!$gripHandle)
            return;
          $gripHandle.dispatchEvent(new PointerEvent("pointerdown")), $gripHandle.click(), $gripHandle.dispatchEvent(new PointerEvent("pointerdown")), $gripHandle.click();
        }, $orgButton = $elm.querySelector("div[class^=HUDButton]");
        if (!$orgButton)
          return;
        if (!$btnStreamSettings)
          $btnStreamSettings = cloneStreamHudButton($orgButton, t("stream-settings"), BxIcon.STREAM_SETTINGS), $btnStreamSettings.addEventListener("click", (e) => {
            hideGripHandle(), e.preventDefault(), StreamSettings.getInstance().show();
          });
        if (!$btnStreamStats)
          $btnStreamStats = cloneStreamHudButton($orgButton, t("stream-stats"), BxIcon.STREAM_STATS), $btnStreamStats.addEventListener("click", (e) => {
            hideGripHandle(), e.preventDefault(), streamStats.toggle();
            const btnStreamStatsOn2 = !streamStats.isHidden() && !streamStats.isGlancing();
            $btnStreamStats.classList.toggle("bx-stream-menu-button-on", btnStreamStatsOn2);
          });
        const btnStreamStatsOn = !streamStats.isHidden() && !streamStats.isGlancing();
        if ($btnStreamStats.classList.toggle("bx-stream-menu-button-on", btnStreamStatsOn), $orgButton) {
          const $btnParent = $orgButton.parentElement;
          $btnParent.insertBefore($btnStreamStats, $btnParent.lastElementChild), $btnParent.insertBefore($btnStreamSettings, $btnStreamStats);
          const $dotsButton = $btnParent.lastElementChild;
          $dotsButton.parentElement.insertBefore($dotsButton, $dotsButton.parentElement.firstElementChild);
        }
      });
    });
  }).observe($screen, { subtree: !0, childList: !0 });
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
      BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED), Screenshot.takeScreenshot();
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

// src/modules/game-bar/action-touch-control.ts
class TouchControlAction extends BaseGameBarAction {
  $content;
  constructor() {
    super();
    const onClick = (e) => {
      BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
      const $parent = e.target.closest("div[data-enabled]");
      let enabled = $parent.getAttribute("data-enabled", "true") === "true";
      $parent.setAttribute("data-enabled", (!enabled).toString()), TouchController.toggleVisibility(enabled);
    }, $btnEnable = createButton({
      style: ButtonStyle.GHOST,
      icon: BxIcon.TOUCH_CONTROL_ENABLE,
      title: t("show-touch-controller"),
      onClick,
      classes: ["bx-activated"]
    }), $btnDisable = createButton({
      style: ButtonStyle.GHOST,
      icon: BxIcon.TOUCH_CONTROL_DISABLE,
      title: t("hide-touch-controller"),
      onClick
    });
    this.$content = CE("div", {}, $btnEnable, $btnDisable), this.reset();
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
  visible = !1;
  constructor() {
    super();
    const onClick = (e) => {
      BxEvent.dispatch(window, BxEvent.GAME_BAR_ACTION_ACTIVATED);
      const enabled = MicrophoneShortcut.toggle(!1);
      this.$content.setAttribute("data-enabled", enabled.toString());
    }, $btnDefault = createButton({
      style: ButtonStyle.GHOST,
      icon: BxIcon.MICROPHONE,
      title: t("show-touch-controller"),
      onClick,
      classes: ["bx-activated"]
    }), $btnMuted = createButton({
      style: ButtonStyle.GHOST,
      icon: BxIcon.MICROPHONE_MUTED,
      title: t("hide-touch-controller"),
      onClick
    });
    this.$content = CE("div", {}, $btnDefault, $btnMuted), this.reset(), window.addEventListener(BxEvent.MICROPHONE_STATE_CHANGED, (e) => {
      const enabled = e.microphoneState === MicrophoneState.ENABLED;
      this.$content.setAttribute("data-enabled", enabled.toString()), this.$content.classList.remove("bx-gone");
    });
  }
  render() {
    return this.$content;
  }
  reset() {
    this.visible = !1, this.$content.classList.add("bx-gone"), this.$content.setAttribute("data-enabled", "false");
  }
}

// src/modules/game-bar/game-bar.ts
class GameBar {
  static instance;
  static getInstance() {
    if (!GameBar.instance)
      GameBar.instance = new GameBar;
    return GameBar.instance;
  }
  static VISIBLE_DURATION = 2000;
  $gameBar;
  $container;
  timeout = null;
  actions = [];
  constructor() {
    let $container;
    const position = getPref(PrefKey.GAME_BAR_POSITION), $gameBar = CE("div", { id: "bx-game-bar", class: "bx-gone", "data-position": position }, $container = CE("div", { class: "bx-game-bar-container bx-offscreen" }), createSvgIcon(position === "bottom-left" ? BxIcon.CARET_RIGHT : BxIcon.CARET_LEFT));
    if (this.actions = [
      new ScreenshotAction,
      ...STATES.userAgentHasTouchSupport && getPref(PrefKey.STREAM_TOUCH_CONTROLLER) !== "off" ? [new TouchControlAction] : [],
      new MicrophoneAction
    ], position === "bottom-right")
      this.actions.reverse();
    for (let action of this.actions)
      $container.appendChild(action.render());
    $gameBar.addEventListener("click", (e) => {
      if (e.target !== $gameBar)
        return;
      $container.classList.contains("bx-show") ? this.hideBar() : this.showBar();
    }), window.addEventListener(BxEvent.GAME_BAR_ACTION_ACTIVATED, this.hideBar.bind(this)), $container.addEventListener("pointerover", this.clearHideTimeout.bind(this)), $container.addEventListener("pointerout", this.beginHideTimeout.bind(this)), $container.addEventListener("transitionend", (e) => {
      const classList = $container.classList;
      if (classList.contains("bx-hide"))
        classList.remove("bx-offscreen", "bx-hide"), classList.add("bx-offscreen");
    }), document.documentElement.appendChild($gameBar), this.$gameBar = $gameBar, this.$container = $container, getPref(PrefKey.GAME_BAR_POSITION) !== "off" && window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, ((e) => {
      if (!STATES.isPlaying) {
        this.disable();
        return;
      }
      e.mode !== "None" ? this.disable() : this.enable();
    }).bind(this));
  }
  beginHideTimeout() {
    this.clearHideTimeout(), this.timeout = window.setTimeout(() => {
      this.timeout = null, this.hideBar();
    }, GameBar.VISIBLE_DURATION);
  }
  clearHideTimeout() {
    this.timeout && clearTimeout(this.timeout), this.timeout = null;
  }
  enable() {
    this.$gameBar && this.$gameBar.classList.remove("bx-gone");
  }
  disable() {
    this.hideBar(), this.$gameBar && this.$gameBar.classList.add("bx-gone");
  }
  showBar() {
    if (!this.$container)
      return;
    this.$container.classList.remove("bx-offscreen", "bx-hide"), this.$container.classList.add("bx-show"), this.beginHideTimeout();
  }
  hideBar() {
    if (!this.$container)
      return;
    this.$container.classList.remove("bx-show"), this.$container.classList.add("bx-hide");
  }
  reset() {
    for (let action of this.actions)
      action.reset();
  }
}

// src/modules/ui/guide-menu.ts
var GuideMenuTab;
(function(GuideMenuTab2) {
  GuideMenuTab2[GuideMenuTab2["HOME"] = 0] = "HOME";
})(GuideMenuTab || (GuideMenuTab = {}));

class GuideMenu {
  static #injectHome($root) {
    const $dividers = $root.querySelectorAll("div[class*=Divider-module__divider]");
    if (!$dividers)
      return;
    const $lastDivider = $dividers[$dividers.length - 1];
    if (AppInterface) {
      const $btnQuit = createButton({
        label: t("close-app"),
        style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.DANGER,
        onClick: (e) => {
          AppInterface.closeApp();
        }
      });
      $lastDivider.insertAdjacentElement("afterend", $btnQuit);
    }
  }
  static #injectHomePlaying($root) {
    const $btnQuit = $root.querySelector("a[class*=QuitGameButton]");
    if (!$btnQuit)
      return;
    const $btnReload = createButton({
      label: t("reload-stream"),
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
      onClick: (e) => {
        confirm(t("confirm-reload-stream")) && window.location.reload();
      }
    }), $btnHome = createButton({
      label: t("back-to-home"),
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
      onClick: (e) => {
        confirm(t("back-to-home-confirm")) && (window.location.href = window.location.href.substring(0, 31));
      }
    });
    $btnQuit.insertAdjacentElement("afterend", $btnReload), $btnReload.insertAdjacentElement("afterend", $btnHome);
    const $btnXcloudHome = $root.querySelector("div[class^=HomeButtonWithDivider]");
    $btnXcloudHome && ($btnXcloudHome.style.display = "none");
  }
  static async#onShown(e) {
    if (e.where === GuideMenuTab.HOME) {
      const $root = document.querySelector("#gamepass-dialog-root div[role=dialog]");
      if (STATES.isPlaying)
        GuideMenu.#injectHomePlaying($root);
      else
        GuideMenu.#injectHome($root);
    }
  }
  static observe() {
    window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, GuideMenu.#onShown);
  }
}

// src/index.ts
var unload = function() {
  if (!STATES.isPlaying)
    return;
  EmulatedMkbHandler.getInstance().destroy(), NativeMkbHandler.getInstance().destroy(), STATES.currentStream.streamPlayer?.destroy(), STATES.isPlaying = !1, STATES.currentStream = {}, window.BX_EXPOSED.shouldShowSensorControls = !1, window.BX_EXPOSED.stopTakRendering = !1, StreamSettings.getInstance().hide(), StreamStats.getInstance().onStoppedPlaying(), MouseCursorHider.stop(), TouchController.reset(), GameBar.getInstance().disable();
}, observeRootDialog = function($root) {
  let currentShown = !1;
  new MutationObserver((mutationList) => {
    for (let mutation of mutationList) {
      if (mutation.type !== "childList")
        continue;
      if (mutation.addedNodes.length === 1) {
        const $addedElm = mutation.addedNodes[0];
        if ($addedElm instanceof HTMLElement && $addedElm.className) {
          if ($addedElm.className.startsWith("NavigationAnimation") || $addedElm.className.startsWith("DialogRoutes") || $addedElm.className.startsWith("Dialog-module__container")) {
            if (document.querySelector("#gamepass-dialog-root div[class*=GuideDialog]")) {
              const $selectedTab = $addedElm.querySelector("div[class^=NavigationMenu] button[aria-selected=true");
              if ($selectedTab) {
                let $elm = $selectedTab, index;
                for (index = 0;$elm = $elm?.previousElementSibling; index++)
                  ;
                if (index === 0)
                  BxEvent.dispatch(window, BxEvent.XCLOUD_GUIDE_MENU_SHOWN, { where: GuideMenuTab.HOME });
              }
            }
          }
        }
      }
      const shown = $root.firstElementChild && $root.firstElementChild.childElementCount > 0 || !1;
      if (shown !== currentShown)
        currentShown = shown, BxEvent.dispatch(window, shown ? BxEvent.XCLOUD_DIALOG_SHOWN : BxEvent.XCLOUD_DIALOG_DISMISSED);
    }
  }).observe($root, { subtree: !0, childList: !0 });
}, waitForRootDialog = function() {
  const observer = new MutationObserver((mutationList) => {
    for (let mutation of mutationList) {
      if (mutation.type !== "childList")
        continue;
      const $target = mutation.target;
      if ($target.id && $target.id === "gamepass-dialog-root") {
        observer.disconnect(), observeRootDialog($target);
        break;
      }
    }
  });
  observer.observe(document.documentElement, { subtree: !0, childList: !0 });
}, main = function() {
  if (waitForRootDialog(), patchRtcPeerConnection(), patchRtcCodecs(), interceptHttpRequests(), patchVideoApi(), patchCanvasContext(), AppInterface && patchPointerLockApi(), getPref(PrefKey.AUDIO_ENABLE_VOLUME_CONTROL) && patchAudioContext(), getPref(PrefKey.BLOCK_TRACKING) && patchMeControl(), STATES.userAgentHasTouchSupport && TouchController.updateCustomList(), overridePreloadState(), VibrationManager.initialSetup(), BX_FLAGS.CheckForUpdate && checkForUpdate(), addCss(), preloadFonts(), Toast.setup(), getPref(PrefKey.GAME_BAR_POSITION) !== "off" && GameBar.getInstance(), BX_FLAGS.PreloadUi && setupStreamUi(), Screenshot.setup(), GuideMenu.observe(), StreamBadges.setupEvents(), StreamStats.setupEvents(), EmulatedMkbHandler.setupEvents(), Patcher.init(), disablePwa(), window.addEventListener("gamepadconnected", (e) => showGamepadToast(e.gamepad)), window.addEventListener("gamepaddisconnected", (e) => showGamepadToast(e.gamepad)), getPref(PrefKey.REMOTE_PLAY_ENABLED))
    RemotePlay.detect();
  if (getPref(PrefKey.STREAM_TOUCH_CONTROLLER) === "all")
    TouchController.setup();
  if (getPref(PrefKey.MKB_ENABLED) && AppInterface)
    STATES.pointerServerPort = AppInterface.startPointerServer() || 9269, BxLogger.info("startPointerServer", "Port", STATES.pointerServerPort.toString());
};
if (window.location.pathname.includes("/auth/msa"))
  throw window.addEventListener("load", (e) => {
    window.location.search.includes("loggedIn") && window.setTimeout(() => {
      const location2 = window.location;
      location2.pathname.includes("/play") && location2.reload(!0);
    }, 2000);
  }), new Error("[Better xCloud] Refreshing the page after logging in");
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
`, $fragment = document.createDocumentFragment();
  throw $fragment.appendChild(CE("style", {}, css2)), $fragment.appendChild(CE("div", { class: "bx-reload-overlay" }, t("safari-failed-message"))), document.documentElement.appendChild($fragment), window.location.reload(!0), new Error("[Better xCloud] Executing workaround for Safari");
}
window.addEventListener("load", (e) => {
  window.setTimeout(() => {
    if (document.body.classList.contains("legacyBackground"))
      window.stop(), window.location.reload(!0);
  }, 3000);
});
window.BX_EXPOSED = BxExposed;
window.addEventListener(BxEvent.POPSTATE, onHistoryChanged);
window.addEventListener("popstate", onHistoryChanged);
window.history.pushState = patchHistoryMethod("pushState");
window.history.replaceState = patchHistoryMethod("replaceState");
window.addEventListener(BxEvent.XCLOUD_SERVERS_READY, (e) => {
  if (document.querySelector("div[class^=UnsupportedMarketPage]"))
    window.setTimeout(watchHeader, 2000);
  else
    watchHeader();
});
window.addEventListener(BxEvent.STREAM_LOADING, (e) => {
  if (window.location.pathname.includes("/launch/")) {
    const matches = /\/launch\/(?<title_id>[^\/]+)\/(?<product_id>\w+)/.exec(window.location.pathname);
    if (matches?.groups)
      STATES.currentStream.titleId = matches.groups.title_id, STATES.currentStream.productId = matches.groups.product_id;
  } else
    STATES.currentStream.titleId = "remote-play", STATES.currentStream.productId = "";
  setupStreamUi();
});
getPref(PrefKey.UI_LOADING_SCREEN_GAME_ART) && window.addEventListener(BxEvent.TITLE_INFO_READY, LoadingScreen.setup);
window.addEventListener(BxEvent.STREAM_STARTING, (e) => {
  if (LoadingScreen.hide(), !getPref(PrefKey.MKB_ENABLED) && getPref(PrefKey.MKB_HIDE_IDLE_CURSOR))
    MouseCursorHider.start(), MouseCursorHider.hide();
});
window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
  if (STATES.isPlaying = !0, injectStreamMenuButtons(), getPref(PrefKey.GAME_BAR_POSITION) !== "off") {
    const gameBar = GameBar.getInstance();
    gameBar.reset(), gameBar.enable(), gameBar.showBar();
  }
  const $video = e.$video;
  Screenshot.updateCanvasSize($video.videoWidth, $video.videoHeight), updateVideoPlayer();
});
window.addEventListener(BxEvent.STREAM_ERROR_PAGE, (e) => {
  BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});
window.addEventListener(BxEvent.STREAM_STOPPED, unload);
window.addEventListener("pagehide", (e) => {
  BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});
window.addEventListener(BxEvent.CAPTURE_SCREENSHOT, (e) => {
  Screenshot.takeScreenshot();
});
main();
