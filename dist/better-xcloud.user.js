// ==UserScript==
// @name         Better xCloud
// @namespace    https://github.com/redphx
// @version      5.5.5-beta
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
"use strict";

/* ADDITIONAL CODE */

var DEFAULT_FLAGS = {
  CheckForUpdate: !0,
  EnableXcloudLogging: !1,
  SafariWorkaround: !0,
  ForceNativeMkbTitles: [],
  FeatureGates: null,
  DeviceInfo: {
    deviceType: "unknown"
  }
}, BX_FLAGS = Object.assign(DEFAULT_FLAGS, window.BX_FLAGS || {});
try {
  delete window.BX_FLAGS;
} catch (e) {
}
if (!BX_FLAGS.DeviceInfo.userAgent)
  BX_FLAGS.DeviceInfo.userAgent = window.navigator.userAgent;
var NATIVE_FETCH = window.fetch;

var SMART_TV_UNIQUE_ID = "FC4A1DA2-711C-4E9C-BC7F-047AF8A672EA", CHROMIUM_VERSION = "123.0.0.0";
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
    "windows-edge": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION} Safari/537.36 Edg/${CHROMIUM_VERSION}`,
    "macos-safari": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.1",
    "smarttv-generic": `${window.navigator.userAgent} SmartTV`,
    "smarttv-tizen": `Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROMIUM_VERSION}/7.0 TV Safari/537.36 ${SMART_TV_UNIQUE_ID}`,
    "vr-oculus": window.navigator.userAgent + " OculusBrowser VR"
  };
  static init() {
    if (UserAgent.#config = JSON.parse(window.localStorage.getItem(UserAgent.STORAGE_KEY) || "{}"), !UserAgent.#config.profile)
      UserAgent.#config.profile = BX_FLAGS.DeviceInfo.deviceType === "android-tv" || BX_FLAGS.DeviceInfo.deviceType === "webos" ? "vr-oculus" : "default";
    if (!UserAgent.#config.custom)
      UserAgent.#config.custom = "";
    UserAgent.spoof();
  }
  static updateStorage(profile, custom) {
    const config = UserAgent.#config;
    if (config.profile = profile, profile === "custom" && typeof custom !== "undefined")
      config.custom = custom;
    window.localStorage.setItem(UserAgent.STORAGE_KEY, JSON.stringify(config));
  }
  static getDefault() {
    return window.navigator.orgUserAgent || window.navigator.userAgent;
  }
  static get(profile) {
    const defaultUserAgent = window.navigator.userAgent;
    switch (profile) {
      case "default":
        return defaultUserAgent;
      case "custom":
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
    if (profile === "default")
      return;
    let newUserAgent = UserAgent.get(profile);
    if ("userAgentData" in window.navigator)
      window.navigator.orgUserAgentData = window.navigator.userAgentData, Object.defineProperty(window.navigator, "userAgentData", {});
    window.navigator.orgUserAgent = window.navigator.userAgent, Object.defineProperty(window.navigator, "userAgent", {
      value: newUserAgent
    });
  }
}

function deepClone(obj) {
  if ("structuredClone" in window)
    return structuredClone(obj);
  if (!obj)
    return {};
  return JSON.parse(JSON.stringify(obj));
}
var SCRIPT_VERSION = "5.5.5-beta", AppInterface = window.AppInterface;
UserAgent.init();
var userAgent = window.navigator.userAgent.toLowerCase(), isTv = userAgent.includes("smart-tv") || userAgent.includes("smarttv") || /\baft.*\b/.test(userAgent), isVr = window.navigator.userAgent.includes("VR") && window.navigator.userAgent.includes("OculusBrowser"), browserHasTouchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0, userAgentHasTouchSupport = !isTv && !isVr && browserHasTouchSupport, STATES = {
  supportedRegion: !0,
  serverRegions: {},
  selectedRegion: {},
  gsToken: "",
  isSignedIn: !1,
  isPlaying: !1,
  appContext: {},
  browser: {
    capabilities: {
      touch: browserHasTouchSupport,
      batteryApi: "getBattery" in window.navigator
    }
  },
  userAgent: {
    isTv,
    capabilities: {
      touch: userAgentHasTouchSupport
    }
  },
  currentStream: {},
  remotePlay: {},
  pointerServerPort: 9269
}, STORAGE = {};

var BxEvent;
((BxEvent) => {
  BxEvent.JUMP_BACK_IN_READY = "bx-jump-back-in-ready", BxEvent.POPSTATE = "bx-popstate", BxEvent.TITLE_INFO_READY = "bx-title-info-ready", BxEvent.SETTINGS_CHANGED = "bx-settings-changed", BxEvent.STREAM_LOADING = "bx-stream-loading", BxEvent.STREAM_STARTING = "bx-stream-starting", BxEvent.STREAM_STARTED = "bx-stream-started", BxEvent.STREAM_PLAYING = "bx-stream-playing", BxEvent.STREAM_STOPPED = "bx-stream-stopped", BxEvent.STREAM_ERROR_PAGE = "bx-stream-error-page", BxEvent.STREAM_WEBRTC_CONNECTED = "bx-stream-webrtc-connected", BxEvent.STREAM_WEBRTC_DISCONNECTED = "bx-stream-webrtc-disconnected", BxEvent.STREAM_SESSION_READY = "bx-stream-session-ready", BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED = "bx-custom-touch-layouts-loaded", BxEvent.TOUCH_LAYOUT_MANAGER_READY = "bx-touch-layout-manager-ready", BxEvent.REMOTE_PLAY_READY = "bx-remote-play-ready", BxEvent.REMOTE_PLAY_FAILED = "bx-remote-play-failed", BxEvent.XCLOUD_SERVERS_READY = "bx-servers-ready", BxEvent.XCLOUD_SERVERS_UNAVAILABLE = "bx-servers-unavailable", BxEvent.DATA_CHANNEL_CREATED = "bx-data-channel-created", BxEvent.GAME_BAR_ACTION_ACTIVATED = "bx-game-bar-action-activated", BxEvent.MICROPHONE_STATE_CHANGED = "bx-microphone-state-changed", BxEvent.CAPTURE_SCREENSHOT = "bx-capture-screenshot", BxEvent.POINTER_LOCK_REQUESTED = "bx-pointer-lock-requested", BxEvent.POINTER_LOCK_EXITED = "bx-pointer-lock-exited", BxEvent.NAVIGATION_FOCUS_CHANGED = "bx-nav-focus-changed", BxEvent.XCLOUD_DIALOG_SHOWN = "bx-xcloud-dialog-shown", BxEvent.XCLOUD_DIALOG_DISMISSED = "bx-xcloud-dialog-dismissed", BxEvent.XCLOUD_GUIDE_MENU_SHOWN = "bx-xcloud-guide-menu-shown", BxEvent.XCLOUD_POLLING_MODE_CHANGED = "bx-xcloud-polling-mode-changed", BxEvent.XCLOUD_RENDERING_COMPONENT = "bx-xcloud-rendering-page", BxEvent.XCLOUD_ROUTER_HISTORY_READY = "bx-xcloud-router-history-ready";
  function dispatch(target, eventName, data) {
    if (!target)
      return;
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
})(BxEvent ||= {});
window.BxEvent = BxEvent;

class NavigationUtils {
  static setNearby($elm, nearby) {
    $elm.nearby = $elm.nearby || {};
    let key;
    for (key in nearby)
      $elm.nearby[key] = nearby[key];
  }
}
var setNearby = NavigationUtils.setNearby;

function createElement(elmName, props = {}, ..._) {
  let $elm;
  const hasNs = "xmlns" in props;
  if (hasNs)
    $elm = document.createElementNS(props.xmlns, elmName), delete props.xmlns;
  else
    $elm = document.createElement(elmName);
  if (props._nearby)
    setNearby($elm, props._nearby), delete props._nearby;
  for (let key in props) {
    if ($elm.hasOwnProperty(key))
      continue;
    if (hasNs)
      $elm.setAttributeNS(null, key, props[key]);
    else if (key === "on")
      for (let eventName in props[key])
        $elm.addEventListener(eventName, props[key][eventName]);
    else
      $elm.setAttribute(key, props[key]);
  }
  for (let i = 2, size = arguments.length;i < size; i++) {
    const arg = arguments[i];
    if (arg instanceof Node)
      $elm.appendChild(arg);
    else if (arg !== null && arg !== !1 && typeof arg !== "undefined")
      $elm.appendChild(document.createTextNode(arg));
  }
  return $elm;
}
function getReactProps($elm) {
  for (let key in $elm)
    if (key.startsWith("__reactProps"))
      return $elm[key];
  return null;
}
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
ButtonStyle[ButtonStyle.FROSTED = 8] = "bx-frosted";
ButtonStyle[ButtonStyle.DROP_SHADOW = 16] = "bx-drop-shadow";
ButtonStyle[ButtonStyle.FOCUSABLE = 32] = "bx-focusable";
ButtonStyle[ButtonStyle.FULL_WIDTH = 64] = "bx-full-width";
ButtonStyle[ButtonStyle.FULL_HEIGHT = 128] = "bx-full-height";
ButtonStyle[ButtonStyle.TALL = 256] = "bx-tall";
ButtonStyle[ButtonStyle.CIRCULAR = 512] = "bx-circular";
ButtonStyle[ButtonStyle.NORMAL_CASE = 1024] = "bx-normal-case";
var ButtonStyleIndices = Object.keys(ButtonStyle).splice(0, Object.keys(ButtonStyle).length / 2).map((i) => parseInt(i)), createButton = (options) => {
  let $btn;
  if (options.url)
    $btn = CE("a", { class: "bx-button" }), $btn.href = options.url, $btn.target = "_blank";
  else
    $btn = CE("button", { class: "bx-button", type: "button" });
  const style = options.style || 0;
  style && ButtonStyleIndices.forEach((index) => {
    style & index && $btn.classList.add(ButtonStyle[index]);
  }), options.classes && $btn.classList.add(...options.classes), options.icon && $btn.appendChild(createSvgIcon(options.icon)), options.label && $btn.appendChild(CE("span", {}, options.label)), options.title && $btn.setAttribute("title", options.title), options.disabled && ($btn.disabled = !0), options.onClick && $btn.addEventListener("click", options.onClick), $btn.tabIndex = typeof options.tabIndex === "number" ? options.tabIndex : 0;
  for (let key in options.attributes)
    if (!$btn.hasOwnProperty(key))
      $btn.setAttribute(key, options.attributes[key]);
  return $btn;
}, CTN = document.createTextNode.bind(document);
window.BX_CE = createElement;

class BxLogger {
  static #PREFIX = "[BxC]";
  static info(tag, ...args) {
    BxLogger.#log("#008746", tag, ...args);
  }
  static warning(tag, ...args) {
    BxLogger.#log("#c1a404", tag, ...args);
  }
  static error(tag, ...args) {
    BxLogger.#log("#c10404", tag, ...args);
  }
  static #log(color, tag, ...args) {
    console.log(`%c${BxLogger.#PREFIX}`, `color:${color};font-weight:bold;`, tag, "//", ...args);
  }
}
window.BxLogger = BxLogger;

var SUPPORTED_LANGUAGES = {
  "en-US": "English (United States)",
  "ca-CA": "Català",
  "da-DK": "dansk",
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
  "zh-CN": "中文(简体)",
  "zh-TW": "中文(繁體)"
}, Texts = {
  activate: "Activate",
  activated: "Activated",
  active: "Active",
  advanced: "Advanced",
  "always-off": "Always off",
  "always-on": "Always on",
  "amd-fidelity-cas": "AMD FidelityFX CAS",
  "app-settings": "App settings",
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
  "better-xcloud": "Better xCloud",
  "bitrate-audio-maximum": "Maximum audio bitrate",
  "bitrate-video-maximum": "Maximum video bitrate",
  "bottom-left": "Bottom-left",
  "bottom-right": "Bottom-right",
  brazil: "Brazil",
  brightness: "Brightness",
  "browser-unsupported-feature": "Your browser doesn't support this feature",
  "bypass-region-restriction": "Bypass region restriction",
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
  "controller-friendly-ui": "Controller-friendly UI",
  "controller-shortcuts": "Controller shortcuts",
  "controller-shortcuts-connect-note": "Connect a controller to use this feature",
  "controller-shortcuts-xbox-note": "Button to open the Guide menu",
  "controller-vibration": "Controller vibration",
  copy: "Copy",
  "create-shortcut": "Shortcut",
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
  "hide-sections": "Hide sections",
  "hide-system-menu-icon": "Hide System menu's icon",
  "hide-touch-controller": "Hide touch controller",
  "high-performance": "High performance",
  "horizontal-scroll-sensitivity": "Horizontal scroll sensitivity",
  "horizontal-sensitivity": "Horizontal sensitivity",
  ignore: "Ignore",
  import: "Import",
  increase: "Increase",
  "install-android": "Better xCloud app for Android",
  japan: "Japan",
  "keyboard-shortcuts": "Keyboard shortcuts",
  korea: "Korea",
  language: "Language",
  large: "Large",
  layout: "Layout",
  "left-stick": "Left stick",
  "loading-screen": "Loading screen",
  "local-co-op": "Local co-op",
  "low-power": "Low power",
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
  poland: "Poland",
  position: "Position",
  "powered-off": "Powered off",
  "powered-on": "Powered on",
  "prefer-ipv6-server": "Prefer IPv6 server",
  "preferred-game-language": "Preferred game's language",
  preset: "Preset",
  "press-esc-to-cancel": "Press Esc to cancel",
  "press-key-to-toggle-mkb": [
    (e) => `Press ${e.key} to toggle this feature`,
    (e) => `Premeu ${e.key} per alternar aquesta funció`,
    (e) => `Tryk på ${e.key} for at slå denne funktion til`,
    (e) => `${e.key}: Funktion an-/ausschalten`,
    (e) => `Tekan ${e.key} untuk mengaktifkan fitur ini`,
    (e) => `Pulsa ${e.key} para alternar esta función`,
    (e) => `Appuyez sur ${e.key} pour activer cette fonctionnalité`,
    (e) => `Premi ${e.key} per attivare questa funzionalità`,
    (e) => `${e.key} でこの機能を切替`,
    (e) => `${e.key} 키를 눌러 이 기능을 켜고 끄세요`,
    (e) => `Naciśnij ${e.key} aby przełączyć tę funkcję`,
    (e) => `Pressione ${e.key} para alternar este recurso`,
    (e) => `Нажмите ${e.key} для переключения этой функции`,
    (e) => `กด ${e.key} เพื่อสลับคุณสมบัตินี้`,
    (e) => `Etkinleştirmek için ${e.key} tuşuna basın`,
    (e) => `Натисніть ${e.key} щоб перемкнути цю функцію`,
    (e) => `Nhấn ${e.key} để bật/tắt tính năng này`,
    (e) => `按下 ${e.key} 来切换此功能`,
    (e) => `按下 ${e.key} 來啟用此功能`
  ],
  "press-to-bind": "Press a key or do a mouse click to bind...",
  "prompt-preset-name": "Preset's name:",
  "reduce-animations": "Reduce UI animations",
  region: "Region",
  "reload-page": "Reload page",
  "remote-play": "Remote Play",
  rename: "Rename",
  renderer: "Renderer",
  "renderer-configuration": "Renderer configuration",
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
  "screenshot-apply-filters": "Apply video filters to screenshots",
  "section-all-games": "All games",
  "section-most-popular": "Most popular",
  "section-native-mkb": "Play with mouse & keyboard",
  "section-news": "News",
  "section-play-with-friends": "Play with friends",
  "section-touch": "Play with touch",
  "separate-touch-controller": "Separate Touch controller & Controller #1",
  "separate-touch-controller-note": "Touch controller is Player 1, Controller #1 is Player 2",
  server: "Server",
  settings: "Settings",
  "settings-reload": "Reload page to reflect changes",
  "settings-reload-note": "Settings in this tab only go into effect on the next page load",
  "settings-reloading": "Reloading...",
  sharpness: "Sharpness",
  "shortcut-keys": "Shortcut keys",
  show: "Show",
  "show-controller-connection-status": "Show controller connection status",
  "show-game-art": "Show game art",
  "show-hide": "Show/hide",
  "show-stats-on-startup": "Show stats when starting the game",
  "show-touch-controller": "Show touch controller",
  "show-wait-time": "Show the estimated wait time",
  "show-wait-time-in-game-card": "Show wait time in game card",
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
    (e) => `Touch-kontrol layout af ${e.name}`,
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
    (e) => `รูปแบบการควบคุมแบบสัมผัสโดย ${e.name}`,
    (e) => `${e.name} kişisinin dokunmatik kontrolcü tuş şeması`,
    (e) => `Розташування сенсорного керування від ${e.name}`,
    (e) => `Bố cục điều khiển cảm ứng tạo bởi ${e.name}`,
    (e) => `由 ${e.name} 提供的虚拟按键样式`,
    (e) => `觸控遊玩佈局由 ${e.name} 提供`
  ],
  "touch-controller": "Touch controller",
  "transparent-background": "Transparent background",
  ui: "UI",
  "unexpected-behavior": "May cause unexpected behavior",
  "united-states": "United States",
  unknown: "Unknown",
  unlimited: "Unlimited",
  unmuted: "Unmuted",
  "unsharp-masking": "Unsharp masking",
  "use-mouse-absolute-position": "Use mouse's absolute position",
  "use-this-at-your-own-risk": "Use this at your own risk",
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
    Translations.#enUsIndex = Translations.#supportedLocales.indexOf(Translations.#EN_US), Translations.refreshLocale(), await Translations.#loadTranslations();
  }
  static refreshLocale(newLocale) {
    let locale;
    if (newLocale)
      localStorage.setItem(Translations.#KEY_LOCALE, newLocale), locale = newLocale;
    else
      locale = localStorage.getItem(Translations.#KEY_LOCALE);
    const supportedLocales = Translations.#supportedLocales;
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
    if (Translations.#selectedLocale === Translations.#EN_US) {
      localStorage.removeItem(Translations.#KEY_TRANSLATIONS);
      return;
    }
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
  static switchLocale(locale) {
    localStorage.setItem(Translations.#KEY_LOCALE, locale);
  }
}
var t = Translations.get;
Translations.init();

var BypassServers = {
  br: t("brazil"),
  jp: t("japan"),
  kr: t("korea"),
  pl: t("poland"),
  us: t("united-states")
}, BypassServerIps = {
  br: "169.150.198.66",
  kr: "121.125.60.151",
  jp: "138.199.21.239",
  pl: "45.134.212.66",
  us: "143.244.47.65"
};

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
    const startTime = performance.now(), PREF_STATS_CONDITIONAL_FORMATTING = getPref("stats_conditional_formatting"), stats = await STATES.currentStream.peerConnection.getStats();
    let grade = "";
    stats.forEach((stat) => {
      if (stat.type === "inbound-rtp" && stat.kind === "video") {
        this.#$fps.textContent = stat.framesPerSecond || 0;
        const packetsLost = Math.max(0, stat.packetsLost), packetsReceived = stat.packetsReceived, packetsLostPercentage = (packetsLost * 100 / (packetsLost + packetsReceived || 1)).toFixed(2);
        this.#$pl.textContent = packetsLostPercentage === "0.00" ? packetsLost.toString() : `${packetsLost} (${packetsLostPercentage}%)`;
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
    const PREF_ITEMS = getPref("stats_items"), PREF_POSITION = getPref("stats_position"), PREF_TRANSPARENT = getPref("stats_transparent"), PREF_OPACITY = getPref("stats_opacity"), PREF_TEXT_SIZE = getPref("stats_text_size"), $container = this.#$container;
    $container.dataset.stats = "[" + PREF_ITEMS.join("][") + "]", $container.dataset.position = PREF_POSITION, $container.dataset.transparent = PREF_TRANSPARENT, $container.style.opacity = PREF_OPACITY + "%", $container.style.fontSize = PREF_TEXT_SIZE;
  }
  hideSettingsUi() {
    if (this.isGlancing() && !getPref("stats_quick_glance"))
      this.stop();
  }
  #render() {
    const stats = {
      ["ping"]: [t("stat-ping"), this.#$ping = CE("span", {}, "0")],
      ["fps"]: [t("stat-fps"), this.#$fps = CE("span", {}, "0")],
      ["btr"]: [t("stat-bitrate"), this.#$br = CE("span", {}, "0 Mbps")],
      ["dt"]: [t("stat-decode-time"), this.#$dt = CE("span", {}, "0ms")],
      ["pl"]: [t("stat-packets-lost"), this.#$pl = CE("span", {}, "0")],
      ["fl"]: [t("stat-frames-lost"), this.#$fl = CE("span", {}, "0")]
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
      const PREF_STATS_QUICK_GLANCE = getPref("stats_quick_glance"), PREF_STATS_SHOW_WHEN_PLAYING = getPref("stats_show_when_playing"), streamStats = StreamStats.getInstance();
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

class BaseSettingsStore {
  storage;
  storageKey;
  _settings;
  definitions;
  constructor(storageKey, definitions) {
    this.storage = window.localStorage, this.storageKey = storageKey;
    for (let settingId in definitions) {
      const setting = definitions[settingId];
      setting.ready && setting.ready.call(this, setting);
    }
    this.definitions = definitions, this._settings = null;
  }
  get settings() {
    if (this._settings)
      return this._settings;
    const settings = JSON.parse(this.storage.getItem(this.storageKey) || "{}");
    return this._settings = settings, settings;
  }
  getDefinition(key) {
    if (!this.definitions[key]) {
      const error = "Request invalid definition: " + key;
      throw alert(error), Error(error);
    }
    return this.definitions[key];
  }
  getSetting(key) {
    if (typeof key === "undefined") {
      debugger;
      return;
    }
    if (this.definitions[key].unsupported)
      return this.definitions[key].default;
    if (!(key in this.settings))
      this.settings[key] = this.validateValue(key, null);
    return this.settings[key];
  }
  setSetting(key, value, emitEvent = !1) {
    return value = this.validateValue(key, value), this.settings[key] = value, this.saveSettings(), emitEvent && BxEvent.dispatch(window, BxEvent.SETTINGS_CHANGED, {
      storageKey: this.storageKey,
      settingKey: key,
      settingValue: value
    }), value;
  }
  saveSettings() {
    this.storage.setItem(this.storageKey, JSON.stringify(this.settings));
  }
  validateValue(key, value) {
    const def = this.definitions[key];
    if (!def)
      return value;
    if (typeof value === "undefined" || value === null)
      value = def.default;
    if ("min" in def)
      value = Math.max(def.min, value);
    if ("max" in def)
      value = Math.min(def.max, value);
    if ("options" in def && !(value in def.options))
      value = def.default;
    else if ("multipleOptions" in def) {
      if (value.length) {
        const validOptions = Object.keys(def.multipleOptions);
        value.forEach((item2, idx) => {
          validOptions.indexOf(item2) === -1 && value.splice(idx, 1);
        });
      }
      if (!value.length)
        value = def.default;
    }
    return value;
  }
}

class SettingElement {
  static #renderOptions(key, setting, currentValue, onChange) {
    const $control = CE("select", {
      tabindex: 0
    });
    let $parent;
    if (setting.optionsGroup)
      $parent = CE("optgroup", { label: setting.optionsGroup }), $control.appendChild($parent);
    else
      $parent = $control;
    for (let value in setting.options) {
      const label = setting.options[value], $option = CE("option", { value }, label);
      $parent.appendChild($option);
    }
    return $control.value = currentValue, onChange && $control.addEventListener("input", (e) => {
      const target = e.target, value = setting.type && setting.type === "number" ? parseInt(target.value) : target.value;
      !e.ignoreOnChange && onChange(e, value);
    }), $control.setValue = (value) => {
      $control.value = value;
    }, $control;
  }
  static #renderMultipleOptions(key, setting, currentValue, onChange, params = {}) {
    const $control = CE("select", {
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
      !e.ignoreOnChange && onChange(e, values);
    }), $control;
  }
  static #renderNumber(key, setting, currentValue, onChange) {
    const $control = CE("input", { tabindex: 0, type: "number", min: setting.min, max: setting.max });
    return $control.value = currentValue, onChange && $control.addEventListener("change", (e) => {
      const target = e.target, value = Math.max(setting.min, Math.min(setting.max, parseInt(target.value)));
      target.value = value.toString(), !e.ignoreOnChange && onChange(e, value);
    }), $control;
  }
  static #renderCheckbox(key, setting, currentValue, onChange) {
    const $control = CE("input", { type: "checkbox", tabindex: 0 });
    return $control.checked = currentValue, onChange && $control.addEventListener("change", (e) => {
      !e.ignoreOnChange && onChange(e, e.target.checked);
    }), $control;
  }
  static #renderNumberStepper(key, setting, value, onChange, options = {}) {
    options = options || {}, options.suffix = options.suffix || "", options.disabled = !!options.disabled, options.hideSlider = !!options.hideSlider;
    let $text, $btnDec, $btnInc, $range = null, controlValue = value;
    const { min: MIN, max: MAX } = setting, STEPS = Math.max(setting.steps || 1, 1), renderTextValue = (value2) => {
      value2 = parseInt(value2);
      let textContent = null;
      if (options.customTextValue)
        textContent = options.customTextValue(value2);
      if (textContent === null)
        textContent = value2.toString() + options.suffix;
      return textContent;
    }, updateButtonsVisibility = () => {
      $btnDec.classList.toggle("bx-inactive", controlValue === MIN), $btnInc.classList.toggle("bx-inactive", controlValue === MAX);
    }, $wrapper = CE("div", { class: "bx-number-stepper", id: `bx_setting_${key}` }, $btnDec = CE("button", {
      "data-type": "dec",
      type: "button",
      class: options.hideSlider ? "bx-focusable" : "",
      tabindex: options.hideSlider ? 0 : -1
    }, "-"), $text = CE("span", {}, renderTextValue(value)), $btnInc = CE("button", {
      "data-type": "inc",
      type: "button",
      class: options.hideSlider ? "bx-focusable" : "",
      tabindex: options.hideSlider ? 0 : -1
    }, "+"));
    if (options.disabled)
      $wrapper.disabled = !0;
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
        if (value = parseInt(e.target.value), controlValue === value)
          return;
        controlValue = value, updateButtonsVisibility(), $text.textContent = renderTextValue(value), !e.ignoreOnChange && onChange && onChange(e, value);
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
      return $btnInc.disabled = !0, $btnInc.classList.add("bx-inactive"), $btnDec.disabled = !0, $btnDec.classList.add("bx-inactive"), $wrapper;
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
      controlValue = value2, updateButtonsVisibility(), $text.textContent = renderTextValue(value2), $range && ($range.value = value2.toString()), isHolding = !1, !e.ignoreOnChange && onChange && onChange(e, value2);
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
    }, $btnDec.addEventListener("click", onClick), $btnDec.addEventListener("pointerdown", onMouseDown), $btnDec.addEventListener("pointerup", onMouseUp), $btnDec.addEventListener("contextmenu", onContextMenu), $btnInc.addEventListener("click", onClick), $btnInc.addEventListener("pointerdown", onMouseDown), $btnInc.addEventListener("pointerup", onMouseUp), $btnInc.addEventListener("contextmenu", onContextMenu), setNearby($wrapper, {
      focus: $range || $btnInc
    }), $wrapper;
  }
  static #METHOD_MAP = {
    ["options"]: SettingElement.#renderOptions,
    ["multiple-options"]: SettingElement.#renderMultipleOptions,
    ["number"]: SettingElement.#renderNumber,
    ["number-stepper"]: SettingElement.#renderNumberStepper,
    ["checkbox"]: SettingElement.#renderCheckbox
  };
  static render(type, key, setting, currentValue, onChange, options) {
    const method = SettingElement.#METHOD_MAP[type], $control = method(...Array.from(arguments).slice(1));
    if (type !== "number-stepper")
      $control.id = `bx_setting_${key}`;
    if (type === "options" || type === "multiple-options")
      $control.name = $control.id;
    return $control;
  }
  static fromPref(key, storage, onChange, overrideParams = {}) {
    const definition = storage.getDefinition(key);
    let currentValue = storage.getSetting(key), type;
    if ("type" in definition)
      type = definition.type;
    else if ("options" in definition)
      type = "options";
    else if ("multipleOptions" in definition)
      type = "multiple-options";
    else if (typeof definition.default === "number")
      type = "number";
    else
      type = "checkbox";
    let params = {};
    if ("params" in definition)
      params = Object.assign(overrideParams, definition.params || {});
    if (params.disabled)
      currentValue = definition.default;
    return SettingElement.render(type, key, definition, currentValue, (e, value) => {
      storage.setSetting(key, value), onChange && onChange(e, value);
    }, params);
  }
}

function getSupportedCodecProfiles() {
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
    if (fmtp.includes("profile-level-id=4d"))
      hasHighCodec = !0;
    else if (fmtp.includes("profile-level-id=42e"))
      hasNormalCodec = !0;
    else if (fmtp.includes("profile-level-id=420"))
      hasLowCodec = !0;
  }
  if (hasLowCodec)
    if (!hasNormalCodec && !hasHighCodec)
      options.default = `${t("visual-quality-low")} (${t("default")})`;
    else
      options.low = t("visual-quality-low");
  if (hasNormalCodec)
    if (!hasLowCodec && !hasHighCodec)
      options.default = `${t("visual-quality-normal")} (${t("default")})`;
    else
      options.normal = t("visual-quality-normal");
  if (hasHighCodec)
    if (!hasLowCodec && !hasNormalCodec)
      options.default = `${t("visual-quality-high")} (${t("default")})`;
    else
      options.high = t("visual-quality-high");
  return options;
}

class GlobalSettingsStorage extends BaseSettingsStore {
  static DEFINITIONS = {
    version_last_check: {
      default: 0
    },
    version_latest: {
      default: ""
    },
    version_current: {
      default: ""
    },
    bx_locale: {
      label: t("language"),
      default: localStorage.getItem("better_xcloud_locale") || "en-US",
      options: SUPPORTED_LANGUAGES
    },
    server_region: {
      label: t("region"),
      default: "default"
    },
    server_bypass_restriction: {
      label: t("bypass-region-restriction"),
      note: "⚠️ " + t("use-this-at-your-own-risk"),
      default: "off",
      optionsGroup: t("region"),
      options: Object.assign({
        off: t("off")
      }, BypassServers)
    },
    stream_preferred_locale: {
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
    stream_target_resolution: {
      label: t("target-resolution"),
      default: "auto",
      options: {
        auto: t("default"),
        "720p": "720p",
        "1080p": "1080p"
      }
    },
    stream_codec_profile: {
      label: t("visual-quality"),
      default: "default",
      options: getSupportedCodecProfiles(),
      ready: (setting) => {
        const options = setting.options;
        if (Object.keys(options).length <= 1)
          setting.unsupported = !0, setting.note = "⚠️ " + t("browser-unsupported-feature");
      }
    },
    prefer_ipv6_server: {
      label: t("prefer-ipv6-server"),
      default: !1
    },
    screenshot_apply_filters: {
      label: t("screenshot-apply-filters"),
      default: !1
    },
    skip_splash_video: {
      label: t("skip-splash-video"),
      default: !1
    },
    hide_dots_icon: {
      label: t("hide-system-menu-icon"),
      default: !1
    },
    stream_combine_sources: {
      label: t("combine-audio-video-streams"),
      default: !1,
      experimental: !0,
      note: t("combine-audio-video-streams-summary")
    },
    stream_touch_controller: {
      label: t("tc-availability"),
      default: "all",
      options: {
        default: t("default"),
        all: t("tc-all-games"),
        off: t("off")
      },
      unsupported: !STATES.userAgent.capabilities.touch,
      ready: (setting) => {
        if (setting.unsupported)
          setting.default = "default";
      }
    },
    stream_touch_controller_auto_off: {
      label: t("tc-auto-off"),
      default: !1,
      unsupported: !STATES.userAgent.capabilities.touch
    },
    stream_touch_controller_default_opacity: {
      type: "number-stepper",
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
      unsupported: !STATES.userAgent.capabilities.touch
    },
    stream_touch_controller_style_standard: {
      label: t("tc-standard-layout-style"),
      default: "default",
      options: {
        default: t("default"),
        white: t("tc-all-white"),
        muted: t("tc-muted-colors")
      },
      unsupported: !STATES.userAgent.capabilities.touch
    },
    stream_touch_controller_style_custom: {
      label: t("tc-custom-layout-style"),
      default: "default",
      options: {
        default: t("default"),
        muted: t("tc-muted-colors")
      },
      unsupported: !STATES.userAgent.capabilities.touch
    },
    stream_simplify_menu: {
      label: t("simplify-stream-menu"),
      default: !1
    },
    mkb_hide_idle_cursor: {
      label: t("hide-idle-cursor"),
      default: !1
    },
    stream_disable_feedback_dialog: {
      label: t("disable-post-stream-feedback-dialog"),
      default: !1
    },
    bitrate_video_max: {
      type: "number-stepper",
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
      }
    },
    game_bar_position: {
      label: t("position"),
      default: "bottom-left",
      options: {
        "bottom-left": t("bottom-left"),
        "bottom-right": t("bottom-right"),
        off: t("off")
      }
    },
    local_co_op_enabled: {
      label: t("enable-local-co-op-support"),
      default: !1,
      note: CE("a", {
        href: "https://github.com/redphx/better-xcloud/discussions/275",
        target: "_blank"
      }, t("enable-local-co-op-support-note"))
    },
    controller_show_connection_status: {
      label: t("show-controller-connection-status"),
      default: !0
    },
    controller_enable_shortcuts: {
      default: !1
    },
    controller_enable_vibration: {
      label: t("controller-vibration"),
      default: !0
    },
    controller_device_vibration: {
      label: t("device-vibration"),
      default: "off",
      options: {
        on: t("on"),
        auto: t("device-vibration-not-using-gamepad"),
        off: t("off")
      }
    },
    controller_vibration_intensity: {
      label: t("vibration-intensity"),
      type: "number-stepper",
      default: 100,
      min: 0,
      max: 100,
      steps: 10,
      params: {
        suffix: "%",
        ticks: 10
      }
    },
    mkb_enabled: {
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
    native_mkb_enabled: {
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
    native_mkb_scroll_x_sensitivity: {
      label: t("horizontal-scroll-sensitivity"),
      type: "number-stepper",
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
    native_mkb_scroll_y_sensitivity: {
      label: t("vertical-scroll-sensitivity"),
      type: "number-stepper",
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
    mkb_default_preset_id: {
      default: 0
    },
    mkb_absolute_mouse: {
      default: !1
    },
    reduce_animations: {
      label: t("reduce-animations"),
      default: !1
    },
    ui_loading_screen_game_art: {
      label: t("show-game-art"),
      default: !0
    },
    ui_loading_screen_wait_time: {
      label: t("show-wait-time"),
      default: !0
    },
    ui_loading_screen_rocket: {
      label: t("rocket-animation"),
      default: "show",
      options: {
        show: t("rocket-always-show"),
        "hide-queue": t("rocket-hide-queue"),
        hide: t("rocket-always-hide")
      }
    },
    ui_controller_friendly: {
      label: t("controller-friendly-ui"),
      default: BX_FLAGS.DeviceInfo.deviceType !== "unknown"
    },
    ui_layout: {
      label: t("layout"),
      default: "default",
      options: {
        default: t("default"),
        normal: t("normal"),
        tv: t("smart-tv")
      }
    },
    ui_scrollbar_hide: {
      label: t("hide-scrollbar"),
      default: !1
    },
    ui_home_context_menu_disabled: {
      label: t("disable-home-context-menu"),
      default: STATES.browser.capabilities.touch
    },
    ui_hide_sections: {
      label: t("hide-sections"),
      default: [],
      multipleOptions: {
        news: t("section-news"),
        friends: t("section-play-with-friends"),
        "native-mkb": t("section-native-mkb"),
        touch: t("section-touch"),
        "most-popular": t("section-most-popular"),
        "all-games": t("section-all-games")
      },
      params: {
        size: 6
      }
    },
    ui_game_card_show_wait_time: {
      label: t("show-wait-time-in-game-card"),
      default: !1
    },
    block_social_features: {
      label: t("disable-social-features"),
      default: !1
    },
    block_tracking: {
      label: t("disable-xcloud-analytics"),
      default: !1
    },
    user_agent_profile: {
      label: t("user-agent-profile"),
      note: "⚠️ " + t("unexpected-behavior"),
      default: BX_FLAGS.DeviceInfo.deviceType === "android-tv" || BX_FLAGS.DeviceInfo.deviceType === "webos" ? "vr-oculus" : "default",
      options: {
        default: t("default"),
        "windows-edge": "Edge + Windows",
        "macos-safari": "Safari + macOS",
        "vr-oculus": "Android TV",
        "smarttv-generic": "Smart TV",
        "smarttv-tizen": "Samsung Smart TV",
        custom: t("custom")
      }
    },
    video_player_type: {
      label: t("renderer"),
      default: "default",
      options: {
        default: t("default"),
        webgl2: t("webgl2")
      }
    },
    video_processing: {
      label: t("clarity-boost"),
      default: "usm",
      options: {
        usm: t("unsharp-masking"),
        cas: t("amd-fidelity-cas")
      }
    },
    video_power_preference: {
      label: t("renderer-configuration"),
      default: "default",
      options: {
        default: t("default"),
        "low-power": t("low-power"),
        "high-performance": t("high-performance")
      }
    },
    video_sharpness: {
      label: t("sharpness"),
      type: "number-stepper",
      default: 0,
      min: 0,
      max: 10,
      params: {
        exactTicks: 2,
        customTextValue: (value) => {
          return value = parseInt(value), value === 0 ? t("off") : value.toString();
        }
      }
    },
    video_ratio: {
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
    video_saturation: {
      label: t("saturation"),
      type: "number-stepper",
      default: 100,
      min: 50,
      max: 150,
      params: {
        suffix: "%",
        ticks: 25
      }
    },
    video_contrast: {
      label: t("contrast"),
      type: "number-stepper",
      default: 100,
      min: 50,
      max: 150,
      params: {
        suffix: "%",
        ticks: 25
      }
    },
    video_brightness: {
      label: t("brightness"),
      type: "number-stepper",
      default: 100,
      min: 50,
      max: 150,
      params: {
        suffix: "%",
        ticks: 25
      }
    },
    audio_mic_on_playing: {
      label: t("enable-mic-on-startup"),
      default: !1
    },
    audio_enable_volume_control: {
      label: t("enable-volume-control"),
      default: !1
    },
    audio_volume: {
      label: t("volume"),
      type: "number-stepper",
      default: 100,
      min: 0,
      max: 600,
      steps: 10,
      params: {
        suffix: "%",
        ticks: 100
      }
    },
    stats_items: {
      label: t("stats"),
      default: ["ping", "fps", "btr", "dt", "pl", "fl"],
      multipleOptions: {
        ping: `${"ping".toUpperCase()}: ${t("stat-ping")}`,
        fps: `${"fps".toUpperCase()}: ${t("stat-fps")}`,
        btr: `${"btr".toUpperCase()}: ${t("stat-bitrate")}`,
        dt: `${"dt".toUpperCase()}: ${t("stat-decode-time")}`,
        pl: `${"pl".toUpperCase()}: ${t("stat-packets-lost")}`,
        fl: `${"fl".toUpperCase()}: ${t("stat-frames-lost")}`
      },
      params: {
        size: 6
      }
    },
    stats_show_when_playing: {
      label: t("show-stats-on-startup"),
      default: !1
    },
    stats_quick_glance: {
      label: "👀 " + t("enable-quick-glance-mode"),
      default: !0
    },
    stats_position: {
      label: t("position"),
      default: "top-right",
      options: {
        "top-left": t("top-left"),
        "top-center": t("top-center"),
        "top-right": t("top-right")
      }
    },
    stats_text_size: {
      label: t("text-size"),
      default: "0.9rem",
      options: {
        "0.9rem": t("small"),
        "1.0rem": t("normal"),
        "1.1rem": t("large")
      }
    },
    stats_transparent: {
      label: t("transparent-background"),
      default: !1
    },
    stats_opacity: {
      label: t("opacity"),
      type: "number-stepper",
      default: 80,
      min: 50,
      max: 100,
      steps: 10,
      params: {
        suffix: "%",
        ticks: 10
      }
    },
    stats_conditional_formatting: {
      label: t("conditional-formatting"),
      default: !1
    },
    xhome_enabled: {
      label: t("enable-remote-play-feature"),
      default: !1
    },
    xhome_resolution: {
      default: "1080p",
      options: {
        "1080p": "1080p",
        "720p": "720p"
      }
    },
    game_fortnite_force_console: {
      label: "🎮 " + t("fortnite-force-console-version"),
      default: !1,
      note: t("fortnite-allow-stw-mode")
    }
  };
  constructor() {
    super("better_xcloud", GlobalSettingsStorage.DEFINITIONS);
  }
}
var globalSettings = new GlobalSettingsStorage, getPrefDefinition = globalSettings.getDefinition.bind(globalSettings), getPref = globalSettings.getSetting.bind(globalSettings), setPref = globalSettings.setSetting.bind(globalSettings);
STORAGE.Global = globalSettings;

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
    if (getPref("screenshot_apply_filters"))
      $player = streamPlayer.getPlayerElement();
    else
      $player = streamPlayer.getPlayerElement("default");
    if (!$player || !$player.isConnected)
      return;
    $player.parentElement.addEventListener("animationend", this.#onAnimationEnd, { once: !0 }), $player.parentElement.classList.add("bx-taking-screenshot");
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

var GamepadKeyName = {
  [0]: ["A", "⇓"],
  [1]: ["B", "⇒"],
  [2]: ["X", "⇐"],
  [3]: ["Y", "⇑"],
  [4]: ["LB", "↘"],
  [5]: ["RB", "↙"],
  [6]: ["LT", "↖"],
  [7]: ["RT", "↗"],
  [8]: ["Select", "⇺"],
  [9]: ["Start", "⇻"],
  [16]: ["Home", ""],
  [12]: ["D-Pad Up", "≻"],
  [13]: ["D-Pad Down", "≽"],
  [14]: ["D-Pad Left", "≺"],
  [15]: ["D-Pad Right", "≼"],
  [10]: ["L3", "↺"],
  [100]: ["Left Stick Up", "↾"],
  [101]: ["Left Stick Down", "⇂"],
  [102]: ["Left Stick Left", "↼"],
  [103]: ["Left Stick Right", "⇀"],
  [11]: ["R3", "↻"],
  [200]: ["Right Stick Up", "↿"],
  [201]: ["Right Stick Down", "⇃"],
  [202]: ["Right Stick Left", "↽"],
  [203]: ["Right Stick Right", "⇁"]
};
var MouseMapTo;
((MouseMapTo2) => {
  MouseMapTo2[MouseMapTo2.OFF = 0] = "OFF";
  MouseMapTo2[MouseMapTo2.LS = 1] = "LS";
  MouseMapTo2[MouseMapTo2.RS = 2] = "RS";
})(MouseMapTo ||= {});

class MkbPreset {
  static MOUSE_SETTINGS = {
    map_to: {
      label: t("map-mouse-to"),
      type: "options",
      default: MouseMapTo[2],
      options: {
        [MouseMapTo[2]]: t("right-stick"),
        [MouseMapTo[1]]: t("left-stick"),
        [MouseMapTo[0]]: t("off")
      }
    },
    sensitivity_y: {
      label: t("horizontal-sensitivity"),
      type: "number-stepper",
      default: 50,
      min: 1,
      max: 300,
      params: {
        suffix: "%",
        exactTicks: 50
      }
    },
    sensitivity_x: {
      label: t("vertical-sensitivity"),
      type: "number-stepper",
      default: 50,
      min: 1,
      max: 300,
      params: {
        suffix: "%",
        exactTicks: 50
      }
    },
    deadzone_counterweight: {
      label: t("deadzone-counterweight"),
      type: "number-stepper",
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
      12: ["ArrowUp"],
      13: ["ArrowDown"],
      14: ["ArrowLeft"],
      15: ["ArrowRight"],
      100: ["KeyW"],
      101: ["KeyS"],
      102: ["KeyA"],
      103: ["KeyD"],
      200: ["KeyI"],
      201: ["KeyK"],
      202: ["KeyJ"],
      203: ["KeyL"],
      0: ["Space", "KeyE"],
      2: ["KeyR"],
      1: ["ControlLeft", "Backspace"],
      3: ["KeyV"],
      9: ["Enter"],
      8: ["Tab"],
      4: ["KeyC", "KeyG"],
      5: ["KeyQ"],
      16: ["Backquote"],
      7: ["Mouse0"],
      6: ["Mouse2"],
      10: ["ShiftLeft"],
      11: ["KeyF"]
    },
    mouse: {
      map_to: MouseMapTo[2],
      sensitivity_x: 100,
      sensitivity_y: 100,
      deadzone_counterweight: 20
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
    mouse["sensitivity_x"] *= EmulatedMkbHandler.DEFAULT_PANNING_SENSITIVITY, mouse["sensitivity_y"] *= EmulatedMkbHandler.DEFAULT_PANNING_SENSITIVITY, mouse["deadzone_counterweight"] *= EmulatedMkbHandler.DEFAULT_DEADZONE_COUNTERWEIGHT;
    const mouseMapTo = MouseMapTo[mouse["map_to"]];
    if (typeof mouseMapTo !== "undefined")
      mouse["map_to"] = mouseMapTo;
    else
      mouse["map_to"] = MkbPreset.MOUSE_SETTINGS["map_to"].default;
    return console.log(obj), obj;
  }
}

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
          preset.id = id2, setPref("mkb_default_preset_id", id2), resolve({ [id2]: preset });
        });
      });
    });
  }
}

class KeyHelper {
  static #NON_PRINTABLE_KEYS = {
    Backquote: "`",
    Mouse0: "Left Click",
    Mouse2: "Right Click",
    Mouse1: "Middle Click",
    ScrollUp: "Scroll Up",
    ScrollDown: "Scroll Down",
    ScrollLeft: "Scroll Left",
    ScrollRight: "Scroll Right"
  };
  static getKeyFromEvent(e) {
    let code, name;
    if (e instanceof KeyboardEvent)
      code = e.code || e.key;
    else if (e instanceof WheelEvent) {
      if (e.deltaY < 0)
        code = "ScrollUp";
      else if (e.deltaY > 0)
        code = "ScrollDown";
      else if (e.deltaX < 0)
        code = "ScrollLeft";
      else if (e.deltaX > 0)
        code = "ScrollRight";
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

var LOG_TAG = "PointerClient";
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
        case 1:
          this.onMove(dataView, offset);
          break;
        case 2:
        case 3:
          this.onPress(messageType, dataView, offset);
          break;
        case 4:
          this.onScroll(dataView, offset);
          break;
        case 5:
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
      pressed: messageType === 2
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

class MouseDataProvider {
  mkbHandler;
  constructor(handler) {
    this.mkbHandler = handler;
  }
}

class MkbHandler {
}

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
    if (this.#mouseVerticalMultiply = getPref("native_mkb_scroll_y_sensitivity"), this.#mouseHorizontalMultiply = getPref("native_mkb_scroll_x_sensitivity"), window.addEventListener("keyup", this), window.addEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this), window.addEventListener(BxEvent.POINTER_LOCK_REQUESTED, this), window.addEventListener(BxEvent.POINTER_LOCK_EXITED, this), window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this), this.#initMessage(), AppInterface)
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

function onChangeVideoPlayerType() {
  const playerType = getPref("video_player_type"), $videoProcessing = document.getElementById("bx_setting_video_processing"), $videoSharpness = document.getElementById("bx_setting_video_sharpness"), $videoPowerPreference = document.getElementById("bx_setting_video_power_preference");
  if (!$videoProcessing)
    return;
  let isDisabled = !1;
  const $optCas = $videoProcessing.querySelector(`option[value=${"cas"}]`);
  if (playerType === "webgl2")
    $optCas && ($optCas.disabled = !1);
  else if ($videoProcessing.value = "usm", setPref("video_processing", "usm"), $optCas && ($optCas.disabled = !0), UserAgent.isSafari())
    isDisabled = !0;
  $videoProcessing.disabled = isDisabled, $videoSharpness.dataset.disabled = isDisabled.toString(), $videoPowerPreference.closest(".bx-settings-row").classList.toggle("bx-gone", playerType !== "webgl2"), updateVideoPlayer();
}
function updateVideoPlayer() {
  const streamPlayer = STATES.currentStream.streamPlayer;
  if (!streamPlayer)
    return;
  const options = {
    processing: getPref("video_processing"),
    sharpness: getPref("video_sharpness"),
    saturation: getPref("video_saturation"),
    contrast: getPref("video_contrast"),
    brightness: getPref("video_brightness")
  };
  streamPlayer.setPlayerType(getPref("video_player_type")), streamPlayer.updateOptions(options), streamPlayer.refreshPlayer();
}
window.addEventListener("resize", updateVideoPlayer);

class NavigationDialog {
  dialogManager;
  constructor() {
    this.dialogManager = NavigationDialogManager.getInstance();
  }
  show() {
    if (NavigationDialogManager.getInstance().show(this), !this.getFocusedElement())
      this.focusIfNeeded();
  }
  hide() {
    NavigationDialogManager.getInstance().hide();
  }
  getFocusedElement() {
    const $activeElement = document.activeElement;
    if (!$activeElement)
      return null;
    if (this.$container.contains($activeElement))
      return $activeElement;
    return null;
  }
  onBeforeMount() {
  }
  onMounted() {
  }
  onBeforeUnmount() {
  }
  onUnmounted() {
  }
  handleKeyPress(key) {
    return !1;
  }
  handleGamepad(button) {
    return !0;
  }
}

class NavigationDialogManager {
  static instance;
  static getInstance() {
    if (!NavigationDialogManager.instance)
      NavigationDialogManager.instance = new NavigationDialogManager;
    return NavigationDialogManager.instance;
  }
  static GAMEPAD_POLLING_INTERVAL = 50;
  static GAMEPAD_KEYS = [
    12,
    13,
    14,
    15,
    0,
    1,
    4,
    5,
    6,
    7
  ];
  static GAMEPAD_DIRECTION_MAP = {
    12: 1,
    13: 3,
    14: 4,
    15: 2,
    100: 1,
    101: 3,
    102: 4,
    103: 2
  };
  static SIBLING_PROPERTY_MAP = {
    horizontal: {
      [4]: "previousElementSibling",
      [2]: "nextElementSibling"
    },
    vertical: {
      [1]: "previousElementSibling",
      [3]: "nextElementSibling"
    }
  };
  gamepadPollingIntervalId = null;
  gamepadLastStates = [];
  gamepadHoldingIntervalId = null;
  $overlay;
  $container;
  dialog = null;
  constructor() {
    this.$overlay = CE("div", { class: "bx-navigation-dialog-overlay bx-gone" }), this.$overlay.addEventListener("click", (e) => {
      e.preventDefault(), e.stopPropagation(), this.hide();
    }), document.documentElement.appendChild(this.$overlay), this.$container = CE("div", { class: "bx-navigation-dialog bx-gone" }), document.documentElement.appendChild(this.$container), window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, (e) => this.hide());
  }
  handleEvent(event) {
    switch (event.type) {
      case "keydown":
        const $target = event.target, keyboardEvent = event, keyCode = keyboardEvent.code || keyboardEvent.key;
        let handled = this.dialog?.handleKeyPress(keyCode);
        if (handled) {
          event.preventDefault(), event.stopPropagation();
          return;
        }
        if (keyCode === "ArrowUp" || keyCode === "ArrowDown")
          handled = !0, this.focusDirection(keyCode === "ArrowUp" ? 1 : 3);
        else if (keyCode === "ArrowLeft" || keyCode === "ArrowRight") {
          if (!($target instanceof HTMLInputElement && ($target.type === "text" || $target.type === "range")))
            handled = !0, this.focusDirection(keyCode === "ArrowLeft" ? 4 : 2);
        } else if (keyCode === "Enter" || keyCode === "NumpadEnter" || keyCode === "Space") {
          if (!($target instanceof HTMLInputElement && $target.type === "text"))
            handled = !0, $target.dispatchEvent(new MouseEvent("click"));
        } else if (keyCode === "Escape")
          handled = !0, this.hide();
        if (handled)
          event.preventDefault(), event.stopPropagation();
        break;
    }
  }
  isShowing() {
    return this.$container && !this.$container.classList.contains("bx-gone");
  }
  pollGamepad() {
    const gamepads = window.navigator.getGamepads();
    for (let gamepad of gamepads) {
      if (!gamepad || !gamepad.connected)
        continue;
      if (gamepad.id === EmulatedMkbHandler.VIRTUAL_GAMEPAD_ID)
        continue;
      const { axes, buttons } = gamepad;
      let releasedButton = null, heldButton = null, lastState = this.gamepadLastStates[gamepad.index], lastTimestamp, lastKey, lastKeyPressed;
      if (lastState)
        [lastTimestamp, lastKey, lastKeyPressed] = lastState;
      if (lastTimestamp && lastTimestamp === gamepad.timestamp)
        continue;
      for (let key of NavigationDialogManager.GAMEPAD_KEYS)
        if (lastKey === key && !buttons[key].pressed) {
          releasedButton = key;
          break;
        } else if (buttons[key].pressed) {
          heldButton = key;
          break;
        }
      if (heldButton === null && releasedButton === null && axes && axes.length >= 2) {
        if (lastKey) {
          const releasedHorizontal = Math.abs(axes[0]) < 0.1 && (lastKey === 102 || lastKey === 103), releasedVertical = Math.abs(axes[1]) < 0.1 && (lastKey === 100 || lastKey === 101);
          if (releasedHorizontal || releasedVertical)
            releasedButton = lastKey;
          else
            heldButton = lastKey;
        } else if (axes[0] < -0.5)
          heldButton = 102;
        else if (axes[0] > 0.5)
          heldButton = 103;
        else if (axes[1] < -0.5)
          heldButton = 100;
        else if (axes[1] > 0.5)
          heldButton = 101;
      }
      if (heldButton !== null) {
        if (this.gamepadLastStates[gamepad.index] = [gamepad.timestamp, heldButton, !1], this.clearGamepadHoldingInterval(), NavigationDialogManager.GAMEPAD_DIRECTION_MAP[heldButton])
          this.gamepadHoldingIntervalId = window.setInterval(() => {
            const lastState2 = this.gamepadLastStates[gamepad.index];
            if (lastState2) {
              if ([lastTimestamp, lastKey, lastKeyPressed] = lastState2, lastKey === heldButton) {
                this.handleGamepad(gamepad, heldButton);
                return;
              }
            }
            this.clearGamepadHoldingInterval();
          }, 200);
        continue;
      }
      if (releasedButton === null) {
        this.clearGamepadHoldingInterval();
        continue;
      }
      if (this.gamepadLastStates[gamepad.index] = null, lastKeyPressed)
        return;
      if (releasedButton === 0) {
        document.activeElement && document.activeElement.dispatchEvent(new MouseEvent("click"));
        return;
      } else if (releasedButton === 1) {
        this.hide();
        return;
      }
      if (this.handleGamepad(gamepad, releasedButton))
        return;
    }
  }
  handleGamepad(gamepad, key) {
    let handled = this.dialog?.handleGamepad(key);
    if (handled)
      return !0;
    let direction = NavigationDialogManager.GAMEPAD_DIRECTION_MAP[key];
    if (!direction)
      return !1;
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === "range") {
      const $range = document.activeElement;
      if (direction === 4 || direction === 2)
        $range.value = (parseInt($range.value) + parseInt($range.step) * (direction === 4 ? -1 : 1)).toString(), $range.dispatchEvent(new InputEvent("input")), handled = !0;
    }
    if (!handled)
      this.focusDirection(direction);
    return this.gamepadLastStates[gamepad.index] && (this.gamepadLastStates[gamepad.index][2] = !0), !0;
  }
  clearGamepadHoldingInterval() {
    this.gamepadHoldingIntervalId && window.clearInterval(this.gamepadHoldingIntervalId), this.gamepadHoldingIntervalId = null;
  }
  show(dialog) {
    if (this.clearGamepadHoldingInterval(), BxEvent.dispatch(window, BxEvent.XCLOUD_DIALOG_SHOWN), window.BX_EXPOSED.disableGamepadPolling = !0, document.body.classList.add("bx-no-scroll"), this.$overlay.classList.remove("bx-gone"), STATES.isPlaying)
      this.$overlay.classList.add("bx-invisible");
    this.unmountCurrentDialog(), this.dialog = dialog, dialog.onBeforeMount(), this.$container.appendChild(dialog.getContent()), dialog.onMounted(), this.$container.classList.remove("bx-gone"), this.$container.addEventListener("keydown", this), this.startGamepadPolling();
  }
  hide() {
    this.clearGamepadHoldingInterval(), document.body.classList.remove("bx-no-scroll"), BxEvent.dispatch(window, BxEvent.XCLOUD_DIALOG_DISMISSED), this.$overlay.classList.add("bx-gone"), this.$overlay.classList.remove("bx-invisible"), this.$container.classList.add("bx-gone"), this.$container.removeEventListener("keydown", this), this.stopGamepadPolling(), this.unmountCurrentDialog(), window.BX_EXPOSED.disableGamepadPolling = !1;
  }
  focus($elm) {
    if (!$elm)
      return !1;
    if ($elm.nearby && $elm.nearby.focus)
      if ($elm.nearby.focus instanceof HTMLElement)
        return this.focus($elm.nearby.focus);
      else
        return $elm.nearby.focus();
    return $elm.focus(), $elm === document.activeElement;
  }
  getOrientation($elm) {
    const nearby = $elm.nearby || {};
    if (nearby.selfOrientation)
      return nearby.selfOrientation;
    let orientation, $current = $elm.parentElement;
    while ($current !== this.$container) {
      const tmp = $current.nearby?.orientation;
      if ($current.nearby && tmp) {
        orientation = tmp;
        break;
      }
      $current = $current.parentElement;
    }
    return orientation = orientation || "vertical", setNearby($elm, {
      selfOrientation: orientation
    }), orientation;
  }
  findNextTarget($focusing, direction, checkParent = !1, checked = []) {
    if (!$focusing || $focusing === this.$container)
      return null;
    if (checked.includes($focusing))
      return null;
    checked.push($focusing);
    let $target = $focusing;
    const $parent = $target.parentElement, nearby = $target.nearby || {}, orientation = this.getOrientation($target);
    let siblingProperty = NavigationDialogManager.SIBLING_PROPERTY_MAP[orientation][direction];
    if (siblingProperty) {
      let $sibling = $target;
      while ($sibling[siblingProperty]) {
        $sibling = $sibling[siblingProperty];
        const $focusable = this.findFocusableElement($sibling, direction);
        if ($focusable)
          return $focusable;
      }
    }
    if (nearby.loop) {
      if (nearby.loop(direction))
        return null;
    }
    if (checkParent)
      return this.findNextTarget($parent, direction, checkParent, checked);
    return null;
  }
  findFocusableElement($elm, direction) {
    if (!$elm)
      return null;
    if (!!$elm.disabled)
      return null;
    const rect = $elm.getBoundingClientRect();
    if (!(!!rect.width && !!rect.height))
      return null;
    if ($elm.tabIndex > -1)
      return $elm;
    const focus = $elm.nearby?.focus;
    if (focus) {
      if (focus instanceof HTMLElement)
        return this.findFocusableElement(focus, direction);
      else if (typeof focus === "function") {
        if (focus())
          return document.activeElement;
      }
    }
    const children = Array.from($elm.children), orientation = $elm.nearby?.orientation;
    if (orientation === "horizontal" || orientation === "vertical" && direction === 1)
      children.reverse();
    for (let $child of children) {
      if (!$child || !($child instanceof HTMLElement))
        return null;
      const $target = this.findFocusableElement($child, direction);
      if ($target)
        return $target;
    }
    return null;
  }
  startGamepadPolling() {
    this.stopGamepadPolling(), this.gamepadPollingIntervalId = window.setInterval(this.pollGamepad.bind(this), NavigationDialogManager.GAMEPAD_POLLING_INTERVAL);
  }
  stopGamepadPolling() {
    this.gamepadLastStates = [], this.gamepadPollingIntervalId && window.clearInterval(this.gamepadPollingIntervalId), this.gamepadPollingIntervalId = null;
  }
  focusDirection(direction) {
    const dialog = this.dialog;
    if (!dialog)
      return;
    const $focusing = dialog.getFocusedElement();
    if (!$focusing || !this.findFocusableElement($focusing, direction))
      return dialog.focusIfNeeded(), null;
    const $target = this.findNextTarget($focusing, direction, !0);
    this.focus($target);
  }
  unmountCurrentDialog() {
    const dialog = this.dialog;
    dialog && dialog.onBeforeUnmount(), this.$container.firstChild?.remove(), dialog && dialog.onUnmounted(), this.dialog = null;
  }
}

var better_xcloud_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-miterlimit='2' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M16.001 7.236h-2.328c-.443 0-1.941-.851-2.357-.905-.824-.106-1.684 0-2.489.176a13.04 13.04 0 0 0-3.137 1.14c-.392.275-.677.668-.866 1.104v.03l-3.302 8.963-.015.015c-.288.867-.553 3.75-.5 4.279a4.89 4.89 0 0 0 1.022 2.55c.654.823 3.71 1.364 4.057 1.016l4.462-4.475c.185-.186 1.547-.706 2.01-.706h6.884c.463 0 1.825.52 2.01.706l4.462 4.475c.347.348 3.403-.193 4.057-1.016a4.89 4.89 0 0 0 1.022-2.55c.053-.529-.212-3.412-.5-4.279l-.015-.015-3.302-8.963v-.03c-.189-.436-.474-.829-.866-1.104a13.04 13.04 0 0 0-3.137-1.14c-.805-.176-1.665-.282-2.489-.176-.416.054-1.914.905-2.357.905h-2.328' fill='none' stroke='#fff'/>\n    <path d='M8.172 12.914H6.519c-.235 0-.315.267-.335.452l-.052.578c0 .193.033.384.054.576.023.202.091.511.355.511h1.631l-.001 1.652c0 .234.266.315.452.335l.578.052c.193 0 .384-.033.576-.054.203-.023.511-.091.511-.355V15.03l1.652.001c.234 0 .315-.266.335-.452l.052-.578c-.001-.193-.033-.385-.055-.577-.022-.202-.09-.51-.354-.51h-1.632v-1.652c0-.234-.266-.315-.453-.335l-.577-.052c-.193 0-.385.033-.577.054-.202.023-.51.091-.51.355v1.631m16.546 2.994h-3.487c-.206 0-.413-.043-.604-.121-.177-.072-.339-.183-.476-.316-.149-.144-.259-.315-.341-.504-.156-.361-.172-.788-.032-1.157a1.57 1.57 0 0 1 .459-.641c.106-.089.223-.164.349-.222a1.52 1.52 0 0 1 .423-.123c.167-.024.338-.02.504.012a1.83 1.83 0 0 1 .455-.482 1.62 1.62 0 0 1 .522-.252c.307-.089.651-.09.959-.003a1.75 1.75 0 0 1 1.009.764 1.83 1.83 0 0 1 .251.721c.156 0 .312.031.456.09a1.24 1.24 0 0 1 .372.248c.091.087.165.19.221.302a1.19 1.19 0 0 1-.173 1.299c-.119.132-.276.239-.441.305a1.17 1.17 0 0 1-.426.08z' fill='#fff' stroke='none'/>\n</svg>\n";

var close_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M29.928,2.072L2.072,29.928'/>\n    <path d='M29.928,29.928L2.072,2.072'/>\n</svg>\n";

var command_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M25.425 1.5c2.784 0 5.075 2.291 5.075 5.075s-2.291 5.075-5.075 5.075H20.35V6.575c0-2.784 2.291-5.075 5.075-5.075zM11.65 11.65H6.575C3.791 11.65 1.5 9.359 1.5 6.575S3.791 1.5 6.575 1.5s5.075 2.291 5.075 5.075v5.075zm8.7 8.7h5.075c2.784 0 5.075 2.291 5.075 5.075S28.209 30.5 25.425 30.5s-5.075-2.291-5.075-5.075V20.35zM6.575 30.5c-2.784 0-5.075-2.291-5.075-5.075s2.291-5.075 5.075-5.075h5.075v5.075c0 2.784-2.291 5.075-5.075 5.075z'/>\n    <path d='M11.65 11.65h8.7v8.7h-8.7z'/>\n</svg>\n";

var controller_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M19.193 12.807h3.193m-13.836 0h4.257'/><path d='M10.678 10.678v4.257'/><path d='M13.061 19.193l-5.602 6.359c-.698.698-1.646 1.09-2.633 1.09-2.044 0-3.725-1.682-3.725-3.725a3.73 3.73 0 0 1 .056-.646l2.177-11.194a6.94 6.94 0 0 1 6.799-5.721h11.722c3.795 0 6.918 3.123 6.918 6.918s-3.123 6.918-6.918 6.918h-8.793z'/><path d='M18.939 19.193l5.602 6.359c.698.698 1.646 1.09 2.633 1.09 2.044 0 3.725-1.682 3.725-3.725a3.73 3.73 0 0 0-.056-.646l-2.177-11.194'/>\n</svg>\n";

var copy_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M1.498 6.772h23.73v23.73H1.498zm5.274-5.274h23.73v23.73'/>\n</svg>\n";

var create_shortcut_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M13.253 3.639c0-.758-.615-1.373-1.373-1.373H3.639c-.758 0-1.373.615-1.373 1.373v8.241c0 .758.615 1.373 1.373 1.373h8.241c.758 0 1.373-.615 1.373-1.373V3.639zm0 16.481c0-.758-.615-1.373-1.373-1.373H3.639c-.758 0-1.373.615-1.373 1.373v8.241c0 .758.615 1.373 1.373 1.373h8.241c.758 0 1.373-.615 1.373-1.373V20.12zm16.481 0c0-.758-.615-1.373-1.373-1.373H20.12c-.758 0-1.373.615-1.373 1.373v8.241c0 .758.615 1.373 1.373 1.373h8.241c.758 0 1.373-.615 1.373-1.373V20.12zM19.262 7.76h9.957'/>\n    <path d='M24.24 2.781v9.957'/>\n</svg>\n";

var cursor_text_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M16 7.3a5.83 5.83 0 0 1 5.8-5.8h2.9m0 29h-2.9a5.83 5.83 0 0 1-5.8-5.8'/><path d='M7.3 30.5h2.9a5.83 5.83 0 0 0 5.8-5.8V7.3a5.83 5.83 0 0 0-5.8-5.8H7.3'/><path d='M11.65 16h8.7'/>\n</svg>\n";

var display_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M1.238 21.119c0 1.928 1.565 3.493 3.493 3.493H27.27c1.928 0 3.493-1.565 3.493-3.493V5.961c0-1.928-1.565-3.493-3.493-3.493H4.731c-1.928 0-3.493 1.565-3.493 3.493v15.158zm19.683 8.413H11.08'/>\n</svg>\n";

var home_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M12.217 30.503V20.414h7.567v10.089h10.089V15.37a1.26 1.26 0 0 0-.369-.892L16.892 1.867a1.26 1.26 0 0 0-1.784 0L2.497 14.478a1.26 1.26 0 0 0-.369.892v15.133h10.089z'/>\n</svg>\n";

var native_mkb_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g stroke-width='2.1'>\n        <path d='m15.817 6h-10.604c-2.215 0-4.013 1.798-4.013 4.013v12.213c0 2.215 1.798 4.013 4.013 4.013h11.21'/>\n        <path d='m5.698 20.617h1.124m-1.124-4.517h7.9m-7.881-4.5h7.9m-2.3 9h2.2'/>\n    </g>\n    <g stroke-width='2.13'>\n        <path d='m30.805 13.1c0-3.919-3.181-7.1-7.1-7.1s-7.1 3.181-7.1 7.1v6.4c0 3.919 3.182 7.1 7.1 7.1s7.1-3.181 7.1-7.1z'/>\n        <path d='m23.705 14.715v-4.753'/>\n    </g>\n</svg>\n";

var new_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M26.875 30.5H5.125c-.663 0-1.208-.545-1.208-1.208V2.708c0-.663.545-1.208 1.208-1.208h14.5l8.458 8.458v19.333c0 .663-.545 1.208-1.208 1.208z'/><path d='M19.625 1.5v8.458h8.458m-15.708 9.667h7.25'/><path d='M16 16v7.25'/>\n</svg>\n";

var question_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <g transform='matrix(.256867 0 0 .256867 -16.878964 -18.049342)'><circle cx='128' cy='180' r='12' fill='#fff'/><path d='M128 144v-8c17.67 0 32-12.54 32-28s-14.33-28-32-28-32 12.54-32 28v4' fill='none' stroke='#fff' stroke-width='16'/></g>\n</svg>\n";

var refresh_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M23.247 12.377h7.247V5.13'/><path d='M23.911 25.663a13.29 13.29 0 0 1-9.119 3.623C7.504 29.286 1.506 23.289 1.506 16S7.504 2.713 14.792 2.713a13.29 13.29 0 0 1 9.395 3.891l6.307 5.772'/>\n</svg>\n";

var remote_play_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <g transform='matrix(.492308 0 0 .581818 -14.7692 -11.6364)'><clipPath id='A'><path d='M30 20h65v55H30z'/></clipPath><g clip-path='url(#A)'><g transform='matrix(.395211 0 0 .334409 11.913 7.01124)'><g transform='matrix(.555556 0 0 .555556 57.8889 -20.2417)' fill='none' stroke='#fff' stroke-width='13.88'><path d='M200 140.564c-42.045-33.285-101.955-33.285-144 0M168 165c-23.783-17.3-56.217-17.3-80 0'/></g><g transform='matrix(-.555556 0 0 -.555556 200.111 262.393)'><g transform='matrix(1 0 0 1 0 11.5642)'><path d='M200 129c-17.342-13.728-37.723-21.795-58.636-24.198C111.574 101.378 80.703 109.444 56 129' fill='none' stroke='#fff' stroke-width='13.88'/></g><path d='M168 165c-23.783-17.3-56.217-17.3-80 0' fill='none' stroke='#fff' stroke-width='13.88'/></g><g transform='matrix(.75 0 0 .75 32 32)'><path d='M24 72h208v93.881H24z' fill='none' stroke='#fff' stroke-linejoin='miter' stroke-width='9.485'/><circle cx='188' cy='128' r='12' stroke-width='10' transform='matrix(.708333 0 0 .708333 71.8333 12.8333)'/><path d='M24.358 103.5h110' fill='none' stroke='#fff' stroke-linecap='butt' stroke-width='10.282'/></g></g></g></g>\n</svg>\n";

var stream_settings_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g transform='matrix(.142357 0 0 .142357 -2.22021 -2.22164)' fill='none' stroke='#fff' stroke-width='16'><circle cx='128' cy='128' r='40'/><path d='M130.05 206.11h-4L94 224c-12.477-4.197-24.049-10.711-34.11-19.2l-.12-36c-.71-1.12-1.38-2.25-2-3.41L25.9 147.24a99.16 99.16 0 0 1 0-38.46l31.84-18.1c.65-1.15 1.32-2.29 2-3.41l.16-36C69.951 42.757 81.521 36.218 94 32l32 17.89h4L162 32c12.477 4.197 24.049 10.711 34.11 19.2l.12 36c.71 1.12 1.38 2.25 2 3.41l31.85 18.14a99.16 99.16 0 0 1 0 38.46l-31.84 18.1c-.65 1.15-1.32 2.29-2 3.41l-.16 36A104.59 104.59 0 0 1 162 224l-31.95-17.89z'/></g>\n</svg>\n";

var stream_stats_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M1.181 24.55v-3.259c0-8.19 6.576-14.952 14.767-14.98H16c8.13 0 14.819 6.69 14.819 14.819v3.42c0 .625-.515 1.14-1.14 1.14H2.321c-.625 0-1.14-.515-1.14-1.14z'/><path d='M16 6.311v4.56M12.58 25.69l9.12-12.54m4.559 5.7h4.386m-29.266 0H5.74'/>\n</svg>\n";

var touch_control_disable_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'>\n    <g fill='none' stroke='#fff'>\n        <path d='M6.021 5.021l20 22' stroke-width='2'/>\n        <path d='M8.735 8.559H2.909a.89.89 0 0 0-.889.889v13.146a.89.89 0 0 0 .889.888h19.34m4.289 0h2.594a.89.89 0 0 0 .889-.888V9.448a.89.89 0 0 0-.889-.889H12.971' stroke-miterlimit='1.5' stroke-width='2.083'/>\n    </g>\n    <path d='M8.147 11.981l-.053-.001-.054.001c-.55.028-.988.483-.988 1.04v6c0 .575.467 1.042 1.042 1.042l.053-.001c.55-.028.988-.484.988-1.04v-6a1.04 1.04 0 0 0-.988-1.04z'/>\n    <path d='M11.147 14.981l-.054-.001h-6a1.04 1.04 0 1 0 0 2.083h6c.575 0 1.042-.467 1.042-1.042a1.04 1.04 0 0 0-.988-1.04z'/>\n    <circle cx='25.345' cy='18.582' r='2.561' fill='none' stroke='#fff' stroke-width='1.78' transform='matrix(1.17131 0 0 1.17131 -5.74235 -5.74456)'/>\n</svg>\n";

var touch_control_enable_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'>\n    <path d='M30.021 9.448a.89.89 0 0 0-.889-.889H2.909a.89.89 0 0 0-.889.889v13.146a.89.89 0 0 0 .889.888h26.223a.89.89 0 0 0 .889-.888V9.448z' fill='none' stroke='#fff' stroke-width='2.083'/>\n    <path d='M8.147 11.981l-.053-.001-.054.001c-.55.028-.988.483-.988 1.04v6c0 .575.467 1.042 1.042 1.042l.053-.001c.55-.028.988-.484.988-1.04v-6a1.04 1.04 0 0 0-.988-1.04z'/>\n    <path d='M11.147 14.981l-.054-.001h-6a1.04 1.04 0 1 0 0 2.083h6c.575 0 1.042-.467 1.042-1.042a1.04 1.04 0 0 0-.988-1.04z'/>\n    <circle cx='25.345' cy='18.582' r='2.561' fill='none' stroke='#fff' stroke-width='1.78' transform='matrix(1.17131 0 0 1.17131 -5.74235 -5.74456)'/>\n</svg>\n";

var trash_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'>\n    <path d='M29.5 6.182h-27m9.818 7.363v9.818m7.364-9.818v9.818'/><path d='M27.045 6.182V29.5c0 .673-.554 1.227-1.227 1.227H6.182c-.673 0-1.227-.554-1.227-1.227V6.182m17.181 0V3.727a2.47 2.47 0 0 0-2.455-2.455h-7.364a2.47 2.47 0 0 0-2.455 2.455v2.455'/>\n</svg>\n";

var virtual_controller_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g stroke-width='2.06'>\n        <path d='M8.417 13.218h4.124'/>\n        <path d='M10.479 11.155v4.125'/>\n        <path d='M12.787 19.404L7.36 25.565a3.61 3.61 0 0 1-2.551 1.056A3.63 3.63 0 0 1 1.2 23.013c0-.21.018-.42.055-.626l2.108-10.845C3.923 8.356 6.714 6.007 9.949 6h5.192'/>\n    </g>\n    <g stroke-width='2.11'>\n        <path d='M30.8 13.1c0-3.919-3.181-7.1-7.1-7.1s-7.1 3.181-7.1 7.1v6.421c0 3.919 3.181 7.1 7.1 7.1s7.1-3.181 7.1-7.1V13.1z'/>\n        <path d='M23.7 14.724V9.966'/>\n    </g>\n</svg>\n";

var caret_left_default = "<svg xmlns='http://www.w3.org/2000/svg' width='100%' stroke='#fff' fill='#fff' height='100%' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'>\n    <path d='M6.755 1.924l-6 13.649c-.119.27-.119.578 0 .849l6 13.649c.234.533.857.775 1.389.541s.775-.857.541-1.389L2.871 15.997 8.685 2.773c.234-.533-.008-1.155-.541-1.389s-1.155.008-1.389.541z'/>\n</svg>\n";

var caret_right_default = "<svg xmlns='http://www.w3.org/2000/svg' width='100%' stroke='#fff' fill='#fff' height='100%' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'>\n    <path d='M2.685 1.924l6 13.649c.119.27.119.578 0 .849l-6 13.649c-.234.533-.857.775-1.389.541s-.775-.857-.541-1.389l5.813-13.225L.755 2.773c-.234-.533.008-1.155.541-1.389s1.155.008 1.389.541z'/>\n</svg>\n";

var camera_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g transform='matrix(.150985 0 0 .150985 -3.32603 -2.72209)' fill='none' stroke='#fff' stroke-width='16'>\n        <path d='M208 208H48c-8.777 0-16-7.223-16-16V80c0-8.777 7.223-16 16-16h32l16-24h64l16 24h32c8.777 0 16 7.223 16 16v112c0 8.777-7.223 16-16 16z'/>\n        <circle cx='128' cy='132' r='36'/>\n    </g>\n</svg>\n";

var microphone_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M21.368 6.875A5.37 5.37 0 0 0 16 1.507a5.37 5.37 0 0 0-5.368 5.368v8.588A5.37 5.37 0 0 0 16 20.831a5.37 5.37 0 0 0 5.368-5.368V6.875zM16 25.125v5.368m9.662-15.03c0 5.3-4.362 9.662-9.662 9.662s-9.662-4.362-9.662-9.662'/>\n</svg>\n";

var microphone_slash_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M16 25.125v5.368M5.265 4.728l21.471 23.618m-4.789-5.267c-1.698 1.326-3.793 2.047-5.947 2.047-5.3 0-9.662-4.362-9.662-9.662'/>\n    <path d='M25.662 15.463a9.62 9.62 0 0 1-.978 4.242m-5.64.187c-.895.616-1.957.943-3.043.939-2.945 0-5.368-2.423-5.368-5.368v-4.831m.442-5.896A5.38 5.38 0 0 1 16 1.507c2.945 0 5.368 2.423 5.368 5.368v8.588c0 .188-.01.375-.03.562'/>\n</svg>\n";

var battery_full_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' stroke-miterlimit='2' viewBox='0 0 32 32'>\n    <path d='M24.774 6.71H3.097C1.398 6.71 0 8.108 0 9.806v12.387c0 1.699 1.398 3.097 3.097 3.097h21.677c1.699 0 3.097-1.398 3.097-3.097V9.806c0-1.699-1.398-3.097-3.097-3.097zm1.032 15.484a1.04 1.04 0 0 1-1.032 1.032H3.097a1.04 1.04 0 0 1-1.032-1.032V9.806a1.04 1.04 0 0 1 1.032-1.032h21.677a1.04 1.04 0 0 1 1.032 1.032v12.387zm-2.065-10.323v8.258a1.04 1.04 0 0 1-1.032 1.032H5.161a1.04 1.04 0 0 1-1.032-1.032v-8.258a1.04 1.04 0 0 1 1.032-1.032H22.71a1.04 1.04 0 0 1 1.032 1.032zm8.258 0v8.258a1.04 1.04 0 0 1-1.032 1.032 1.04 1.04 0 0 1-1.032-1.032v-8.258a1.04 1.04 0 0 1 1.032-1.032A1.04 1.04 0 0 1 32 11.871z' fill-rule='nonzero'/>\n</svg>\n";

var clock_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <g transform='matrix(.150026 0 0 .150026 -3.20332 -3.20332)' fill='none' stroke='#fff' stroke-width='16'>\n        <circle cx='128' cy='128' r='96'/>\n        <path d='M128 72v56h56'/>\n    </g>\n</svg>\n";

var cloud_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M9.773 16c0-5.694 4.685-10.379 10.379-10.379S30.53 10.306 30.53 16s-4.685 10.379-10.379 10.379H8.735c-3.982-.005-7.256-3.283-7.256-7.265s3.28-7.265 7.265-7.265c.606 0 1.21.076 1.797.226' fill='none' stroke='#fff' stroke-width='2.076'/>\n</svg>\n";

var download_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M16 19.955V1.5m14.5 18.455v9.227c0 .723-.595 1.318-1.318 1.318H2.818c-.723 0-1.318-.595-1.318-1.318v-9.227'/>\n    <path d='M22.591 13.364L16 19.955l-6.591-6.591'/>\n</svg>\n";

var speaker_high_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M8.964 21.417h-6.5a1.09 1.09 0 0 1-1.083-1.083v-8.667a1.09 1.09 0 0 1 1.083-1.083h6.5L18.714 3v26l-9.75-7.583z'/>\n    <path d='M8.964 10.583v10.833m15.167-8.28a4.35 4.35 0 0 1 0 5.728M28.149 9.5a9.79 9.79 0 0 1 0 13'/>\n</svg>\n";

var upload_default = "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'>\n    <path d='M16 19.905V1.682m14.318 18.223v9.112a1.31 1.31 0 0 1-1.302 1.302H2.983a1.31 1.31 0 0 1-1.302-1.302v-9.112'/>\n    <path d='M9.492 8.19L16 1.682l6.508 6.508'/>\n</svg>\n";

var BxIcon = {
  BETTER_XCLOUD: better_xcloud_default,
  STREAM_SETTINGS: stream_settings_default,
  STREAM_STATS: stream_stats_default,
  CLOSE: close_default,
  COMMAND: command_default,
  CONTROLLER: controller_default,
  CREATE_SHORTCUT: create_shortcut_default,
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

class MkbRemapper {
  #BUTTON_ORDERS = [
    12,
    13,
    14,
    15,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    16,
    10,
    100,
    101,
    102,
    103,
    11,
    200,
    201,
    202,
    203
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
    this.#STATE.currentPresetId = getPref("mkb_default_preset_id"), this.bindingDialog = new Dialog({
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
    const activated = getPref("mkb_default_preset_id") === this.#STATE.currentPresetId;
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
        this.#STATE.currentPresetId = parseInt(Object.keys(presets)[0]), defaultPresetId = this.#STATE.currentPresetId, setPref("mkb_default_preset_id", defaultPresetId), EmulatedMkbHandler.getInstance().refreshPresetData();
      else
        defaultPresetId = getPref("mkb_default_preset_id");
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
    this.#$.wrapper = CE("div", { class: "bx-mkb-settings" }), this.#$.presetsSelect = CE("select", { tabindex: -1 }), this.#$.presetsSelect.addEventListener("change", (e) => {
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
      tabIndex: -1,
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
      tabIndex: -1,
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
      tabIndex: -1,
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
      tabIndex: -1,
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
      }, $row = CE("label", {
        class: "bx-settings-row",
        for: `bx_setting_${key}`
      }, CE("span", { class: "bx-settings-label" }, setting.label), $elm = SettingElement.render(setting.type, key, setting, value, onChange, setting.params));
      $mouseSettings.appendChild($row), this.#$.allMouseElements[key] = $elm;
    }
    $rows.appendChild($mouseSettings), this.#$.wrapper.appendChild($rows);
    const $actionButtons = CE("div", { class: "bx-mkb-action-buttons" }, CE("div", {}, createButton({
      label: t("edit"),
      tabIndex: -1,
      onClick: (e) => this.#toggleEditing(!0)
    }), this.#$.activateButton = createButton({
      label: t("activate"),
      style: ButtonStyle.PRIMARY,
      tabIndex: -1,
      onClick: (e) => {
        setPref("mkb_default_preset_id", this.#STATE.currentPresetId), EmulatedMkbHandler.getInstance().refreshPresetData(), this.#refresh();
      }
    })), CE("div", {}, createButton({
      label: t("cancel"),
      style: ButtonStyle.GHOST,
      tabIndex: -1,
      onClick: (e) => {
        this.#switchPreset(this.#STATE.currentPresetId), this.#toggleEditing(!1);
      }
    }), createButton({
      label: t("save"),
      style: ButtonStyle.PRIMARY,
      tabIndex: -1,
      onClick: (e) => {
        const updatedPreset = deepClone(this.#getCurrentPreset());
        updatedPreset.data = this.#STATE.editingPresetData, LocalDb.INSTANCE.updatePreset(updatedPreset).then((id2) => {
          if (id2 === getPref("mkb_default_preset_id"))
            EmulatedMkbHandler.getInstance().refreshPresetData();
          this.#toggleEditing(!1), this.#refresh();
        });
      }
    })));
    return this.#$.wrapper.appendChild($actionButtons), this.#toggleEditing(!1), this.#refresh(), this.#$.wrapper;
  }
}

function checkForUpdate() {
  if (SCRIPT_VERSION.includes("beta"))
    return;
  const CHECK_INTERVAL_SECONDS = 7200, currentVersion = getPref("version_current"), lastCheck = getPref("version_last_check"), now = Math.round(+new Date / 1000);
  if (currentVersion === SCRIPT_VERSION && now - lastCheck < CHECK_INTERVAL_SECONDS)
    return;
  setPref("version_last_check", now), fetch("https://api.github.com/repos/redphx/better-xcloud/releases/latest").then((response) => response.json()).then((json) => {
    setPref("version_latest", json.tag_name.substring(1)), setPref("version_current", SCRIPT_VERSION);
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
function hashCode(str) {
  let hash = 0;
  for (let i = 0, len = str.length;i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr, hash |= 0;
  }
  return hash;
}
function renderString(str, obj) {
  return str.replace(/\$\{.+?\}/g, (match) => {
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
async function copyToClipboard(text, showToast = !0) {
  try {
    return await navigator.clipboard.writeText(text), showToast && Toast.show("Copied to clipboard", "", { instant: !0 }), !0;
  } catch (err) {
    console.error("Failed to copy: ", err), showToast && Toast.show("Failed to copy", "", { instant: !0 });
  }
  return !1;
}

class SoundShortcut {
  static adjustGainNodeVolume(amount) {
    if (!getPref("audio_enable_volume_control"))
      return 0;
    const currentValue = getPref("audio_volume");
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
    return newValue = setPref("audio_volume", newValue, !0), SoundShortcut.setGainNodeVolume(newValue), Toast.show(`${t("stream")} ❯ ${t("volume")}`, newValue + "%", { instant: !0 }), newValue;
  }
  static setGainNodeVolume(value) {
    STATES.currentStream.audioGainNode && (STATES.currentStream.audioGainNode.gain.value = value / 100);
  }
  static muteUnmute() {
    if (getPref("audio_enable_volume_control") && STATES.currentStream.audioGainNode) {
      const gainValue = STATES.currentStream.audioGainNode.gain.value, settingValue = getPref("audio_volume");
      let targetValue;
      if (settingValue === 0)
        targetValue = 100, setPref("audio_volume", targetValue, !0);
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
  static #enabled = !1;
  static #dataChannel;
  static #customLayouts = {};
  static #baseCustomLayouts = {};
  static #currentLayoutId;
  static #customList;
  static #xboxTitleId = null;
  static setXboxTitleId(xboxTitleId) {
    TouchController.#xboxTitleId = xboxTitleId;
  }
  static getCustomLayouts() {
    const xboxTitleId = TouchController.#xboxTitleId;
    if (!xboxTitleId)
      return null;
    return TouchController.#customLayouts[xboxTitleId];
  }
  static enable() {
    TouchController.#enabled = !0;
  }
  static disable() {
    TouchController.#enabled = !1;
  }
  static isEnabled() {
    return TouchController.#enabled;
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
    TouchController.#enabled = !1, TouchController.#dataChannel = null, TouchController.#xboxTitleId = null, TouchController.#$style && (TouchController.#$style.textContent = "");
  }
  static #dispatchMessage(msg) {
    TouchController.#dataChannel && window.setTimeout(() => {
      TouchController.#dataChannel.dispatchEvent(msg);
    }, 10);
  }
  static #dispatchLayouts(data) {
    TouchController.applyCustomLayout(null, 1000), BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED);
  }
  static async requestCustomLayouts(retries = 1) {
    const xboxTitleId = TouchController.#xboxTitleId;
    if (!xboxTitleId)
      return;
    if (xboxTitleId in TouchController.#customLayouts) {
      TouchController.#dispatchLayouts(TouchController.#customLayouts[xboxTitleId]);
      return;
    }
    if (retries = retries || 1, retries > 2) {
      TouchController.#customLayouts[xboxTitleId] = null, window.setTimeout(() => TouchController.#dispatchLayouts(null), 1000);
      return;
    }
    const baseUrl = "https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/touch-layouts", url = `${baseUrl}/${xboxTitleId}.json`;
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
      TouchController.requestCustomLayouts(retries + 1);
    }
  }
  static applyCustomLayout(layoutId, delay = 0) {
    if (!window.BX_EXPOSED.touchLayoutManager) {
      const listener = (e) => {
        if (window.removeEventListener(BxEvent.TOUCH_LAYOUT_MANAGER_READY, listener), TouchController.#enabled)
          TouchController.applyCustomLayout(layoutId, 0);
      };
      window.addEventListener(BxEvent.TOUCH_LAYOUT_MANAGER_READY, listener);
      return;
    }
    const xboxTitleId = TouchController.#xboxTitleId;
    if (!xboxTitleId) {
      BxLogger.error(LOG_TAG2, "Invalid xboxTitleId");
      return;
    }
    if (!layoutId)
      layoutId = TouchController.#customLayouts[xboxTitleId]?.default_layout || null;
    if (!layoutId) {
      BxLogger.error(LOG_TAG2, "Invalid layoutId, show default controller"), TouchController.#enabled && TouchController.#showDefault();
      return;
    }
    const layoutChanged = TouchController.#currentLayoutId !== layoutId;
    TouchController.#currentLayoutId = layoutId;
    const layoutData = TouchController.#customLayouts[xboxTitleId];
    if (!xboxTitleId || !layoutId || !layoutData) {
      TouchController.#enabled && TouchController.#showDefault();
      return;
    }
    const layout = layoutData.layouts[layoutId] || layoutData.layouts[layoutData.default_layout];
    if (!layout)
      return;
    let msg, html11 = !1;
    if (layout.author) {
      const author = `<b>${escapeHtml(layout.author)}</b>`;
      msg = t("touch-control-layout-by", { name: author }), html11 = !0;
    } else
      msg = t("touch-control-layout");
    layoutChanged && Toast.show(msg, layout.name, { html: html11 }), window.setTimeout(() => {
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
        scope: "" + TouchController.#xboxTitleId,
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
    const PREF_STYLE_STANDARD = getPref("stream_touch_controller_style_standard"), PREF_STYLE_CUSTOM = getPref("stream_touch_controller_style_custom");
    window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, (e) => {
      const dataChannel = e.dataChannel;
      if (!dataChannel || dataChannel.label !== "message")
        return;
      let filter = "";
      if (TouchController.#enabled) {
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
          if (TouchController.#enabled)
            if (focused)
              TouchController.requestCustomLayouts();
            else
              TouchController.#showDefault();
          return;
        }
        try {
          if (msg.data.includes("/titleinfo")) {
            const json = JSON.parse(JSON.parse(msg.data).content);
            if (focused = json.focused, !json.focused)
              TouchController.#show();
            TouchController.setXboxTitleId(parseInt(json.titleid, 16).toString());
          }
        } catch (e2) {
          BxLogger.error(LOG_TAG2, "Load custom layout", e2);
        }
      });
    });
  }
}

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
    if (window.BX_ENABLE_CONTROLLER_VIBRATION = VibrationManager.supportControllerVibration() ? getPref("controller_enable_vibration") : !1, window.BX_VIBRATION_INTENSITY = getPref("controller_vibration_intensity") / 100, !VibrationManager.supportDeviceVibration()) {
      window.BX_ENABLE_DEVICE_VIBRATION = !1;
      return;
    }
    stopVibration && window.navigator.vibrate(0);
    const value = getPref("controller_device_vibration");
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

class BxSelectElement {
  static wrap($select) {
    $select.removeAttribute("tabindex");
    const $btnPrev = createButton({
      label: "<",
      style: ButtonStyle.FOCUSABLE
    }), $btnNext = createButton({
      label: ">",
      style: ButtonStyle.FOCUSABLE
    }), isMultiple = $select.multiple;
    let $checkBox, $label, visibleIndex = $select.selectedIndex, $content;
    if (isMultiple)
      $content = CE("button", {
        class: "bx-select-value bx-focusable",
        tabindex: 0
      }, $checkBox = CE("input", { type: "checkbox" }), $label = CE("span", {}, "")), $content.addEventListener("click", (e) => {
        $checkBox.click();
      }), $checkBox.addEventListener("input", (e) => {
        const $option = getOptionAtIndex(visibleIndex);
        $option && ($option.selected = e.target.checked), $select.dispatchEvent(new Event("input"));
      });
    else
      $content = CE("div", {}, $label = CE("label", { for: $select.id + "_checkbox" }, ""));
    const getOptionAtIndex = (index) => {
      return Array.from($select.querySelectorAll("option"))[index];
    }, render = (e) => {
      if (e && e.manualTrigger)
        visibleIndex = $select.selectedIndex;
      visibleIndex = normalizeIndex(visibleIndex);
      const $option = getOptionAtIndex(visibleIndex);
      let content = "";
      if ($option)
        if (content = $option.textContent || "", content && $option.parentElement.tagName === "OPTGROUP") {
          $label.innerHTML = "";
          const fragment = document.createDocumentFragment();
          fragment.appendChild(CE("span", {}, $option.parentElement.label)), fragment.appendChild(document.createTextNode(content)), $label.appendChild(fragment);
        } else
          $label.textContent = content;
      else
        $label.textContent = content;
      if ($label.classList.toggle("bx-line-through", $option && $option.disabled), isMultiple)
        $checkBox.checked = $option?.selected || !1, $checkBox.classList.toggle("bx-gone", !content);
      const disablePrev = visibleIndex <= 0, disableNext = visibleIndex === $select.querySelectorAll("option").length - 1;
      $btnPrev.classList.toggle("bx-inactive", disablePrev), $btnNext.classList.toggle("bx-inactive", disableNext), disablePrev && !disableNext && document.activeElement === $btnPrev && $btnNext.focus(), disableNext && !disablePrev && document.activeElement === $btnNext && $btnPrev.focus();
    }, normalizeIndex = (index) => {
      return Math.min(Math.max(index, 0), $select.querySelectorAll("option").length - 1);
    }, onPrevNext = (e) => {
      if (!e.target)
        return;
      const goNext = e.target.closest("button") === $btnNext, currentIndex = visibleIndex;
      let newIndex = goNext ? currentIndex + 1 : currentIndex - 1;
      if (newIndex = normalizeIndex(newIndex), visibleIndex = newIndex, !isMultiple && newIndex !== currentIndex)
        $select.selectedIndex = newIndex;
      if (isMultiple)
        render();
      else
        $select.dispatchEvent(new Event("input"));
    };
    $select.addEventListener("input", render), $btnPrev.addEventListener("click", onPrevNext), $btnNext.addEventListener("click", onPrevNext), new MutationObserver((mutationList, observer2) => {
      mutationList.forEach((mutation) => {
        if (mutation.type === "childList" || mutation.type === "attributes")
          render();
      });
    }).observe($select, {
      subtree: !0,
      childList: !0,
      attributes: !0
    }), render();
    const $div = CE("div", {
      class: "bx-select",
      _nearby: {
        orientation: "horizontal",
        focus: $btnNext
      }
    }, $select, $btnPrev, $content, $btnNext);
    return Object.defineProperty($div, "value", {
      get() {
        return $select.value;
      }
    }), $div.addEventListener = function() {
      $select.addEventListener.apply($select, arguments);
    }, $div.removeEventListener = function() {
      $select.removeEventListener.apply($select, arguments);
    }, $div.dispatchEvent = function() {
      return $select.dispatchEvent.apply($select, arguments);
    }, $div;
  }
}

var controller_shortcuts_default = "if (window.BX_EXPOSED.disableGamepadPolling) {\n    this.inputConfiguration.useIntervalWorkerThreadForInput && this.intervalWorker ? this.intervalWorker.scheduleTimer(50) : this.pollGamepadssetTimeoutTimerID = setTimeout(this.pollGamepads, 50);\n    return;\n}\n\nconst currentGamepad = ${gamepadVar};\n\n// Share button on XS controller\nif (currentGamepad.buttons[17] && currentGamepad.buttons[17].pressed) {\n    window.dispatchEvent(new Event(BxEvent.CAPTURE_SCREENSHOT));\n}\n\nconst btnHome = currentGamepad.buttons[16];\nif (btnHome) {\n    if (!this.bxHomeStates) {\n        this.bxHomeStates = {};\n    }\n\n    let intervalMs = 0;\n    let hijack = false;\n\n    if (btnHome.pressed) {\n        hijack = true;\n        intervalMs = 16;\n        this.gamepadIsIdle.set(currentGamepad.index, false);\n\n        if (this.bxHomeStates[currentGamepad.index]) {\n            const lastTimestamp = this.bxHomeStates[currentGamepad.index].timestamp;\n\n            if (currentGamepad.timestamp !== lastTimestamp) {\n                this.bxHomeStates[currentGamepad.index].timestamp = currentGamepad.timestamp;\n\n                const handled = window.BX_EXPOSED.handleControllerShortcut(currentGamepad);\n                if (handled) {\n                    this.bxHomeStates[currentGamepad.index].shortcutPressed += 1;\n                }\n            }\n        } else {\n            // First time pressing > save current timestamp\n            window.BX_EXPOSED.resetControllerShortcut(currentGamepad.index);\n            this.bxHomeStates[currentGamepad.index] = {\n                shortcutPressed: 0,\n                timestamp: currentGamepad.timestamp,\n            };\n        }\n    } else if (this.bxHomeStates[currentGamepad.index]) {\n        hijack = true;\n        const info = structuredClone(this.bxHomeStates[currentGamepad.index]);\n\n        // Home button released\n        this.bxHomeStates[currentGamepad.index] = null;\n\n        if (info.shortcutPressed === 0) {\n            const fakeGamepadMappings = [{\n                GamepadIndex: currentGamepad.index,\n                A: 0,\n                B: 0,\n                X: 0,\n                Y: 0,\n                LeftShoulder: 0,\n                RightShoulder: 0,\n                LeftTrigger: 0,\n                RightTrigger: 0,\n                View: 0,\n                Menu: 0,\n                LeftThumb: 0,\n                RightThumb: 0,\n                DPadUp: 0,\n                DPadDown: 0,\n                DPadLeft: 0,\n                DPadRight: 0,\n                Nexus: 1,\n                LeftThumbXAxis: 0,\n                LeftThumbYAxis: 0,\n                RightThumbXAxis: 0,\n                RightThumbYAxis: 0,\n                PhysicalPhysicality: 0,\n                VirtualPhysicality: 0,\n                Dirty: true,\n                Virtual: false,\n            }];\n\n            const isLongPress = (currentGamepad.timestamp - info.timestamp) >= 500;\n            intervalMs = isLongPress ? 500 : 100;\n\n            this.inputSink.onGamepadInput(performance.now() - intervalMs, fakeGamepadMappings);\n        } else {\n            intervalMs = 4;\n        }\n    }\n\n    if (hijack && intervalMs) {\n        // Listen to next button press\n        this.inputConfiguration.useIntervalWorkerThreadForInput && this.intervalWorker ? this.intervalWorker.scheduleTimer(intervalMs) : this.pollGamepadssetTimeoutTimerID = setTimeout(this.pollGamepads, intervalMs);\n\n        // Hijack this button\n        return;\n    }\n}\n";

var expose_stream_session_default = "window.BX_EXPOSED.streamSession = this;\n\nconst orgSetMicrophoneState = this.setMicrophoneState.bind(this);\nthis.setMicrophoneState = state => {\n    orgSetMicrophoneState(state);\n\n    const evt = new Event(BxEvent.MICROPHONE_STATE_CHANGED);\n    evt.microphoneState = state;\n\n    window.dispatchEvent(evt);\n};\n\nwindow.dispatchEvent(new Event(BxEvent.STREAM_SESSION_READY));\n\n// Patch updateDimensions() to make native touch work correctly with WebGL2\nlet updateDimensionsStr = this.updateDimensions.toString();\n\nif (updateDimensionsStr.startsWith('function ')) {\n    updateDimensionsStr = updateDimensionsStr.substring(9);\n}\n\n// if(r){\nconst renderTargetVar = updateDimensionsStr.match(/if\\((\\w+)\\){/)[1];\n\nupdateDimensionsStr = updateDimensionsStr.replaceAll(renderTargetVar + '.scroll', 'scroll');\n\nupdateDimensionsStr = updateDimensionsStr.replace(`if(${renderTargetVar}){`, `\nif (${renderTargetVar}) {\n    const scrollWidth = ${renderTargetVar}.dataset.width ? parseInt(${renderTargetVar}.dataset.width) : ${renderTargetVar}.scrollWidth;\n    const scrollHeight = ${renderTargetVar}.dataset.height ? parseInt(${renderTargetVar}.dataset.height) : ${renderTargetVar}.scrollHeight;\n`);\n\neval(`this.updateDimensions = function ${updateDimensionsStr}`);\n";

var local_co_op_enable_default = "let match;\nlet onGamepadChangedStr = this.onGamepadChanged.toString();\n\nif (onGamepadChangedStr.startsWith('function ')) {\n    onGamepadChangedStr = onGamepadChangedStr.substring(9);\n}\n\nonGamepadChangedStr = onGamepadChangedStr.replaceAll('0', 'arguments[1]');\neval(`this.onGamepadChanged = function ${onGamepadChangedStr}`);\n\nlet onGamepadInputStr = this.onGamepadInput.toString();\n\nmatch = onGamepadInputStr.match(/(\\w+\\.GamepadIndex)/);\nif (match) {\n    const gamepadIndexVar = match[0];\n    onGamepadInputStr = onGamepadInputStr.replace('this.gamepadStates.get(', `this.gamepadStates.get(${gamepadIndexVar},`);\n    eval(`this.onGamepadInput = function ${onGamepadInputStr}`);\n    BxLogger.info('supportLocalCoOp', '✅ Successfully patched local co-op support');\n} else {\n    BxLogger.error('supportLocalCoOp', '❌ Unable to patch local co-op support');\n}\n";

var set_currently_focused_interactable_default = "e && BxEvent.dispatch(window, BxEvent.NAVIGATION_FOCUS_CHANGED, {element: e});\n";

var remote_play_enable_default = "connectMode: window.BX_REMOTE_PLAY_CONFIG ? \"xhome-connect\" : \"cloud-connect\",\nremotePlayServerId: (window.BX_REMOTE_PLAY_CONFIG && window.BX_REMOTE_PLAY_CONFIG.serverId) || '',\n";

var remote_play_keep_alive_default = "const msg = JSON.parse(e);\nif (msg.reason === 'WarningForBeingIdle' && !window.location.pathname.includes('/launch/')) {\n    try {\n        this.sendKeepAlive();\n        return;\n    } catch (ex) { console.log(ex); }\n}\n";

var vibration_adjust_default = "if (!window.BX_ENABLE_CONTROLLER_VIBRATION) {\n    return void(0);\n}\n\nconst intensity = window.BX_VIBRATION_INTENSITY;\nif (intensity === 0) {\n    return void(0);\n}\n\nif (intensity < 1) {\n    e.leftMotorPercent *= intensity;\n    e.rightMotorPercent *= intensity;\n    e.leftTriggerMotorPercent *= intensity;\n    e.rightTriggerMotorPercent *= intensity;\n}\n";

var FeatureGates = {
  PwaPrompt: !1,
  EnableWifiWarnings: !1,
  EnableUpdateRequiredPage: !1,
  ShowForcedUpdateScreen: !1
};
if (getPref("ui_home_context_menu_disabled"))
  FeatureGates.EnableHomeContextMenu = !1;
if (getPref("block_social_features"))
  FeatureGates.EnableGuideChatTab = !1;
if (BX_FLAGS.FeatureGates)
  FeatureGates = Object.assign(BX_FLAGS.FeatureGates, FeatureGates);

class PatcherUtils {
  static indexOf(txt, searchString, startIndex, maxRange) {
    const index = txt.indexOf(searchString, startIndex);
    if (index < 0 || maxRange && index - startIndex > maxRange)
      return -1;
    return index;
  }
  static lastIndexOf(txt, searchString, startIndex, maxRange) {
    const index = txt.lastIndexOf(searchString, startIndex);
    if (index < 0 || maxRange && startIndex - index > maxRange)
      return -1;
    return index;
  }
  static insertAt(txt, index, insertString) {
    return txt.substring(0, index) + insertString + txt.substring(index);
  }
  static replaceWith(txt, index, fromString, toString) {
    return txt.substring(0, index) + toString + txt.substring(index + fromString.length);
  }
}
var ENDING_CHUNKS_PATCH_NAME = "loadingEndingChunks", LOG_TAG3 = "Patcher", PATCHES = {
  disableAiTrack(str) {
    const index = str.indexOf(".track=function(");
    if (index < 0)
      return !1;
    if (PatcherUtils.indexOf(str, '"AppInsightsCore', index, 200) < 0)
      return !1;
    return PatcherUtils.replaceWith(str, index, ".track=function(", ".track=function(e){},!!function(");
  },
  disableTelemetry(str) {
    if (!str.includes(".disableTelemetry=function(){return!1}"))
      return !1;
    return str.replace(".disableTelemetry=function(){return!1}", ".disableTelemetry=function(){return!0}");
  },
  disableTelemetryProvider(str) {
    if (!str.includes("this.enableLightweightTelemetry=!"))
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
    return str.replace("this.enableLightweightTelemetry=!", newCode + ";this.enableLightweightTelemetry=!");
  },
  disableIndexDbLogging(str) {
    if (!str.includes(",this.logsDb=new"))
      return !1;
    let newCode = ",this.log=()=>{}";
    return str.replace(",this.logsDb=new", newCode + ",this.logsDb=new");
  },
  websiteLayout(str) {
    if (!str.includes('?"tv":"default"'))
      return !1;
    const layout = getPref("ui_layout") === "tv" ? "tv" : "default";
    return str.replace('?"tv":"default"', `?"${layout}":"${layout}"`);
  },
  remotePlayDirectConnectUrl(str) {
    const index = str.indexOf("/direct-connect");
    if (index < 0)
      return !1;
    return str.replace(str.substring(index - 9, index + 15), "https://www.xbox.com/play");
  },
  remotePlayKeepAlive(str) {
    if (!str.includes("onServerDisconnectMessage(e){"))
      return !1;
    return str = str.replace("onServerDisconnectMessage(e){", "onServerDisconnectMessage(e){" + remote_play_keep_alive_default), str;
  },
  remotePlayConnectMode(str) {
    if (!str.includes('connectMode:"cloud-connect",'))
      return !1;
    return str.replace('connectMode:"cloud-connect",', remote_play_enable_default);
  },
  remotePlayDisableAchievementToast(str) {
    if (!str.includes(".AchievementUnlock:{"))
      return !1;
    const newCode = `
if (!!window.BX_REMOTE_PLAY_CONFIG) {
    return;
}
`;
    return str.replace(".AchievementUnlock:{", ".AchievementUnlock:{" + newCode);
  },
  blockWebRtcStatsCollector(str) {
    if (!str.includes("this.shouldCollectStats=!0"))
      return !1;
    return str.replace("this.shouldCollectStats=!0", "this.shouldCollectStats=!1");
  },
  patchPollGamepads(str) {
    const index = str.indexOf("},this.pollGamepads=()=>{");
    if (index < 0)
      return !1;
    const nextIndex = str.indexOf("setTimeout(this.pollGamepads", index);
    if (nextIndex === -1)
      return !1;
    let codeBlock = str.substring(index, nextIndex);
    if (getPref("block_tracking"))
      codeBlock = codeBlock.replaceAll("this.inputPollingIntervalStats.addValue", "");
    const match = codeBlock.match(/this\.gamepadTimestamps\.set\((\w+)\.index/);
    if (match) {
      const gamepadVar = match[1], newCode = renderString(controller_shortcuts_default, {
        gamepadVar
      });
      codeBlock = codeBlock.replace("this.gamepadTimestamps.set", newCode + "this.gamepadTimestamps.set");
    }
    return str.substring(0, index) + codeBlock + str.substring(nextIndex);
  },
  enableXcloudLogger(str) {
    if (!str.includes("this.telemetryProvider=e}log(e,t,r){"))
      return !1;
    const newCode = `
const [logTag, logLevel, logMessage] = Array.from(arguments);
const logFunc = [console.debug, console.log, console.warn, console.error][logLevel];
logFunc(logTag, '//', logMessage);
`;
    return str = str.replaceAll("this.telemetryProvider=e}log(e,t,r){", "this.telemetryProvider=e}log(e,t,r){" + newCode), str;
  },
  enableConsoleLogging(str) {
    if (!str.includes("static isConsoleLoggingAllowed(){"))
      return !1;
    return str = str.replaceAll("static isConsoleLoggingAllowed(){", "static isConsoleLoggingAllowed(){return true;"), str;
  },
  playVibration(str) {
    if (!str.includes("}playVibration(e){"))
      return !1;
    return VibrationManager.updateGlobalVars(), str = str.replaceAll("}playVibration(e){", "}playVibration(e){" + vibration_adjust_default), str;
  },
  overrideSettings(str) {
    const index = str.indexOf(",EnableStreamGate:");
    if (index < 0)
      return !1;
    const endIndex = str.indexOf("},", index);
    let newSettings = JSON.stringify(FeatureGates);
    newSettings = newSettings.substring(1, newSettings.length - 1);
    const newCode = newSettings;
    return str = str.substring(0, endIndex) + "," + newCode + str.substring(endIndex), str;
  },
  disableGamepadDisconnectedScreen(str) {
    const index = str.indexOf('"GamepadDisconnected_Title",');
    if (index < 0)
      return !1;
    const constIndex = str.indexOf("const", index - 30);
    return str = str.substring(0, constIndex) + "e.onClose();return null;" + str.substring(constIndex), str;
  },
  patchUpdateInputConfigurationAsync(str) {
    if (!str.includes("async updateInputConfigurationAsync(e){"))
      return !1;
    const newCode = "e.enableTouchInput = true;";
    return str = str.replace("async updateInputConfigurationAsync(e){", "async updateInputConfigurationAsync(e){" + newCode), str;
  },
  loadingEndingChunks(str) {
    if (!str.includes('"FamilySagaManager"'))
      return !1;
    return BxLogger.info(LOG_TAG3, "Remaining patches:", PATCH_ORDERS), PATCH_ORDERS = PATCH_ORDERS.concat(PLAYING_PATCH_ORDERS), str;
  },
  disableStreamGate(str) {
    const index = str.indexOf('case"partially-ready":');
    if (index < 0)
      return !1;
    const bracketIndex = str.indexOf("=>{", index - 150) + 3;
    return str = str.substring(0, bracketIndex) + "return 0;" + str.substring(bracketIndex), str;
  },
  exposeTouchLayoutManager(str) {
    if (!str.includes("this._perScopeLayoutsStream=new"))
      return !1;
    const newCode = `
true;
window.BX_EXPOSED["touchLayoutManager"] = this;
window.dispatchEvent(new Event("${BxEvent.TOUCH_LAYOUT_MANAGER_READY}"));
`;
    return str = str.replace("this._perScopeLayoutsStream=new", newCode + "this._perScopeLayoutsStream=new"), str;
  },
  patchBabylonRendererClass(str) {
    let index = str.indexOf(".current.render(),");
    if (index < 0)
      return !1;
    index -= 1;
    const newCode = `
if (window.BX_EXPOSED.stopTakRendering) {
    try {
        document.getElementById('BabylonCanvasContainer-main')?.parentElement.classList.add('bx-offscreen');

        ${str[index]}.current.dispose();
    } catch (e) {}

    window.BX_EXPOSED.stopTakRendering = false;
    return;
}
`;
    return str = str.substring(0, index) + newCode + str.substring(index), str;
  },
  supportLocalCoOp(str) {
    if (!str.includes("this.gamepadMappingsToSend=[],"))
      return !1;
    const newCode = `true; ${local_co_op_enable_default}; true,`;
    return str = str.replace("this.gamepadMappingsToSend=[],", "this.gamepadMappingsToSend=[]," + newCode), str;
  },
  forceFortniteConsole(str) {
    if (!str.includes("sendTouchInputEnabledMessage(e){"))
      return !1;
    const newCode = "window.location.pathname.includes('/launch/fortnite/') && (e = false);";
    return str = str.replace("sendTouchInputEnabledMessage(e){", "sendTouchInputEnabledMessage(e){" + newCode), str;
  },
  disableTakRenderer(str) {
    if (!str.includes("const{TakRenderer:"))
      return !1;
    let remotePlayCode = "";
    if (getPref("stream_touch_controller") !== "off" && getPref("stream_touch_controller_auto_off"))
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
    return str = str.replace("const{TakRenderer:", newCode + "const{TakRenderer:"), str;
  },
  streamCombineSources(str) {
    if (!str.includes("this.useCombinedAudioVideoStream=!!this.deviceInformation.isTizen"))
      return !1;
    return str = str.replace("this.useCombinedAudioVideoStream=!!this.deviceInformation.isTizen", "this.useCombinedAudioVideoStream=true"), str;
  },
  patchStreamHud(str) {
    if (!str.includes("let{onCollapse"))
      return !1;
    let newCode = `
// Expose onShowStreamMenu
window.BX_EXPOSED.showStreamMenu = e.onShowStreamMenu;
// Restore the "..." button
e.guideUI = null;
`;
    if (getPref("stream_touch_controller") === "off")
      newCode += "e.canShowTakHUD = false;";
    return str = str.replace("let{onCollapse", newCode + "let{onCollapse"), str;
  },
  broadcastPollingMode(str) {
    if (!str.includes(".setPollingMode=e=>{"))
      return !1;
    const newCode = `
BxEvent.dispatch(window, BxEvent.XCLOUD_POLLING_MODE_CHANGED, {mode: e});
`;
    return str = str.replace(".setPollingMode=e=>{", ".setPollingMode=e=>{" + newCode), str;
  },
  patchGamepadPolling(str) {
    let index = str.indexOf(".shouldHandleGamepadInput)())return void");
    if (index < 0)
      return !1;
    return index = str.indexOf("{", index - 20) + 1, str = str.substring(0, index) + "if (window.BX_EXPOSED.disableGamepadPolling) return;" + str.substring(index), str;
  },
  patchXcloudTitleInfo(str) {
    let index = str.indexOf("async cloudConnect");
    if (index < 0)
      return !1;
    let backetIndex = str.indexOf("{", index);
    const titleInfoVar = str.substring(index, backetIndex).match(/\(([^)]+)\)/)[1].split(",")[0], newCode = `
${titleInfoVar} = window.BX_EXPOSED.modifyTitleInfo(${titleInfoVar});
BxLogger.info('patchXcloudTitleInfo', ${titleInfoVar});
`;
    return str = str.substring(0, backetIndex + 1) + newCode + str.substring(backetIndex + 1), str;
  },
  patchRemotePlayMkb(str) {
    let index = str.indexOf("async homeConsoleConnect");
    if (index < 0)
      return !1;
    let backetIndex = str.indexOf("{", index);
    const configsVar = str.substring(index, backetIndex).match(/\(([^)]+)\)/)[1].split(",")[1], newCode = `
Object.assign(${configsVar}.inputConfiguration, {
    enableMouseInput: false,
    enableKeyboardInput: false,
    enableAbsoluteMouse: false,
});
BxLogger.info('patchRemotePlayMkb', ${configsVar});
`;
    return str = str.substring(0, backetIndex + 1) + newCode + str.substring(backetIndex + 1), str;
  },
  patchAudioMediaStream(str) {
    if (!str.includes(".srcObject=this.audioMediaStream,"))
      return !1;
    const newCode = "window.BX_EXPOSED.setupGainNode(arguments[1], this.audioMediaStream),";
    return str = str.replace(".srcObject=this.audioMediaStream,", ".srcObject=this.audioMediaStream," + newCode), str;
  },
  patchCombinedAudioVideoMediaStream(str) {
    if (!str.includes(".srcObject=this.combinedAudioVideoStream"))
      return !1;
    const newCode = ",window.BX_EXPOSED.setupGainNode(arguments[0], this.combinedAudioVideoStream)";
    return str = str.replace(".srcObject=this.combinedAudioVideoStream", ".srcObject=this.combinedAudioVideoStream" + newCode), str;
  },
  patchTouchControlDefaultOpacity(str) {
    if (!str.includes("opacityMultiplier:1"))
      return !1;
    const newCode = `opacityMultiplier: ${(getPref("stream_touch_controller_default_opacity") / 100).toFixed(1)}`;
    return str = str.replace("opacityMultiplier:1", newCode), str;
  },
  patchShowSensorControls(str) {
    if (!str.includes("{shouldShowSensorControls:"))
      return !1;
    const newCode = "{shouldShowSensorControls: (window.BX_EXPOSED && window.BX_EXPOSED.shouldShowSensorControls) ||";
    return str = str.replace("{shouldShowSensorControls:", newCode), str;
  },
  exposeStreamSession(str) {
    if (!str.includes(",this._connectionType="))
      return !1;
    const newCode = `;
${expose_stream_session_default}
true,this._connectionType=`;
    return str = str.replace(",this._connectionType=", newCode), str;
  },
  skipFeedbackDialog(str) {
    if (!str.includes("&&this.shouldTransitionToFeedback("))
      return !1;
    return str = str.replace("&&this.shouldTransitionToFeedback(", "&& false &&this.shouldTransitionToFeedback("), str;
  },
  enableNativeMkb(str) {
    if (!str.includes("e.mouseSupported&&e.keyboardSupported&&e.fullscreenSupported;"))
      return !1;
    return str = str.replace("e.mouseSupported&&e.keyboardSupported&&e.fullscreenSupported;", "e.mouseSupported&&e.keyboardSupported&&e.fullscreenSupported;return true;"), str;
  },
  patchMouseAndKeyboardEnabled(str) {
    if (!str.includes("get mouseAndKeyboardEnabled(){"))
      return !1;
    return str = str.replace("get mouseAndKeyboardEnabled(){", "get mouseAndKeyboardEnabled(){return true;"), str;
  },
  exposeInputSink(str) {
    if (!str.includes("this.controlChannel=null,this.inputChannel=null"))
      return !1;
    const newCode = "window.BX_EXPOSED.inputSink = this;";
    return str = str.replace("this.controlChannel=null,this.inputChannel=null", newCode + "this.controlChannel=null,this.inputChannel=null"), str;
  },
  disableNativeRequestPointerLock(str) {
    if (!str.includes("async requestPointerLock(){"))
      return !1;
    return str = str.replace("async requestPointerLock(){", "async requestPointerLock(){return;"), str;
  },
  patchRequestInfoCrash(str) {
    if (!str.includes('if(!e)throw new Error("RequestInfo.origin is falsy");'))
      return !1;
    return str = str.replace('if(!e)throw new Error("RequestInfo.origin is falsy");', 'if (!e) e = "https://www.xbox.com";'), str;
  },
  exposeDialogRoutes(str) {
    if (!str.includes("return{goBack:function(){"))
      return !1;
    return str = str.replace("return{goBack:function(){", "return window.BX_EXPOSED.dialogRoutes = {goBack:function(){"), str;
  },
  enableTvRoutes(str) {
    let index = str.indexOf(".LoginDeviceCode.path,");
    if (index < 0)
      return !1;
    const match = /render:.*?jsx\)\(([^,]+),/.exec(str.substring(index, index + 100));
    if (!match)
      return !1;
    const funcName = match[1];
    if (index = str.indexOf(`const ${funcName}=e=>{`), index > -1 && (index = str.indexOf("return ", index)), index > -1 && (index = str.indexOf("?", index)), index < 0)
      return !1;
    return str = str.substring(0, index) + "|| true" + str.substring(index), str;
  },
  ignorePlayWithFriendsSection(str) {
    let index = str.indexOf('location:"PlayWithFriendsRow",');
    if (index < 0)
      return !1;
    if (index = PatcherUtils.lastIndexOf(str, "return", index, 50), index < 0)
      return !1;
    return str = PatcherUtils.replaceWith(str, index, "return", "return null;"), str;
  },
  ignoreAllGamesSection(str) {
    let index = str.indexOf('className:"AllGamesRow-module__allGamesRowContainer');
    if (index < 0)
      return !1;
    if (index = PatcherUtils.indexOf(str, "grid:!0,", index, 1500), index < 0)
      return !1;
    if (index = PatcherUtils.lastIndexOf(str, "(0,", index, 70), index < 0)
      return !1;
    return str = PatcherUtils.insertAt(str, index, "true ? null :"), str;
  },
  ignorePlayWithTouchSection(str) {
    let index = str.indexOf('("Play_With_Touch"),');
    if (index < 0)
      return !1;
    if (index = PatcherUtils.lastIndexOf(str, "const ", index, 30), index < 0)
      return !1;
    return str = PatcherUtils.insertAt(str, index, "return null;"), str;
  },
  ignoreSiglSections(str) {
    let index = str.indexOf("SiglRow-module__heroCard___");
    if (index < 0)
      return !1;
    if (index = PatcherUtils.lastIndexOf(str, "const[", index, 300), index < 0)
      return !1;
    const PREF_HIDE_SECTIONS = getPref("ui_hide_sections"), siglIds = [], sections = {
      "native-mkb": "8fa264dd-124f-4af3-97e8-596fcdf4b486",
      "most-popular": "e7590b22-e299-44db-ae22-25c61405454c"
    };
    PREF_HIDE_SECTIONS.forEach((section) => {
      const galleryId = sections[section];
      galleryId && siglIds.push(galleryId);
    });
    const newCode = `
if (e && e.id) {
    const siglId = e.id;
    if (${siglIds.map((item2) => `siglId === "${item2}"`).join(" || ")}) {
        return null;
    }
}
`;
    return str = PatcherUtils.insertAt(str, index, newCode), str;
  },
  overrideStorageGetSettings(str) {
    if (!str.includes("}getSetting(e){"))
      return !1;
    const newCode = `
// console.log('setting', this.baseStorageKey, e);
if (this.baseStorageKey in window.BX_EXPOSED.overrideSettings) {
    const settings = window.BX_EXPOSED.overrideSettings[this.baseStorageKey];
    if (e in settings) {
        return settings[e];
    }
}
`;
    return str = str.replace("}getSetting(e){", "}getSetting(e){" + newCode), str;
  },
  alwaysShowStreamHud(str) {
    let index = str.indexOf(",{onShowStreamMenu:");
    if (index < 0)
      return !1;
    if (index = str.indexOf("&&(0,", index - 100), index < 0)
      return !1;
    const commaIndex = str.indexOf(",", index - 10);
    return str = str.substring(0, commaIndex) + ",true" + str.substring(index), str;
  },
  patchSetCurrentlyFocusedInteractable(str) {
    let index = str.indexOf(".setCurrentlyFocusedInteractable=(");
    if (index < 0)
      return !1;
    return index = str.indexOf("{", index) + 1, str = str.substring(0, index) + set_currently_focused_interactable_default + str.substring(index), str;
  },
  detectProductDetailsPage(str) {
    let index = str.indexOf('{location:"ProductDetailPage",');
    if (index < 0)
      return !1;
    if (index = str.indexOf("return", index - 40), index < 0)
      return !1;
    return str = str.substring(0, index) + 'BxEvent.dispatch(window, BxEvent.XCLOUD_RENDERING_COMPONENT, {component: "product-details"});' + str.substring(index), str;
  },
  detectBrowserRouterReady(str) {
    if (!str.includes("BrowserRouter:()=>"))
      return !1;
    let index = str.indexOf("{history:this.history,");
    if (index < 0)
      return !1;
    if (index = PatcherUtils.lastIndexOf(str, "return", index, 100), index < 0)
      return !1;
    return str = PatcherUtils.insertAt(str, index, "window.BxEvent.dispatch(window, window.BxEvent.XCLOUD_ROUTER_HISTORY_READY, {history: this.history});"), str;
  }
}, PATCH_ORDERS = [
  ...getPref("native_mkb_enabled") === "on" ? [
    "enableNativeMkb",
    "patchMouseAndKeyboardEnabled",
    "disableNativeRequestPointerLock",
    "exposeInputSink"
  ] : [],
  "detectBrowserRouterReady",
  "patchRequestInfoCrash",
  "disableStreamGate",
  "overrideSettings",
  "broadcastPollingMode",
  "patchGamepadPolling",
  "exposeStreamSession",
  "exposeDialogRoutes",
  "enableTvRoutes",
  AppInterface && "detectProductDetailsPage",
  "overrideStorageGetSettings",
  getPref("ui_game_card_show_wait_time") && "patchSetCurrentlyFocusedInteractable",
  getPref("ui_layout") !== "default" && "websiteLayout",
  getPref("local_co_op_enabled") && "supportLocalCoOp",
  getPref("game_fortnite_force_console") && "forceFortniteConsole",
  getPref("ui_hide_sections").includes("friends") && "ignorePlayWithFriendsSection",
  getPref("ui_hide_sections").includes("all-games") && "ignoreAllGamesSection",
  getPref("ui_hide_sections").includes("touch") && "ignorePlayWithTouchSection",
  (getPref("ui_hide_sections").includes("native-mkb") || getPref("ui_hide_sections").includes("most-popular")) && "ignoreSiglSections",
  ...getPref("block_tracking") ? [
    "disableAiTrack",
    "disableTelemetry",
    "blockWebRtcStatsCollector",
    "disableIndexDbLogging",
    "disableTelemetryProvider"
  ] : [],
  ...getPref("xhome_enabled") ? [
    "remotePlayKeepAlive",
    "remotePlayDirectConnectUrl",
    "remotePlayDisableAchievementToast",
    STATES.userAgent.capabilities.touch && "patchUpdateInputConfigurationAsync"
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
  "alwaysShowStreamHud",
  getPref("audio_enable_volume_control") && !getPref("stream_combine_sources") && "patchAudioMediaStream",
  getPref("audio_enable_volume_control") && getPref("stream_combine_sources") && "patchCombinedAudioVideoMediaStream",
  getPref("stream_disable_feedback_dialog") && "skipFeedbackDialog",
  ...STATES.userAgent.capabilities.touch ? [
    getPref("stream_touch_controller") === "all" && "patchShowSensorControls",
    getPref("stream_touch_controller") === "all" && "exposeTouchLayoutManager",
    (getPref("stream_touch_controller") === "off" || getPref("stream_touch_controller_auto_off") || !STATES.userAgent.capabilities.touch) && "disableTakRenderer",
    getPref("stream_touch_controller_default_opacity") !== 100 && "patchTouchControlDefaultOpacity",
    "patchBabylonRendererClass"
  ] : [],
  BX_FLAGS.EnableXcloudLogging && "enableConsoleLogging",
  "patchPollGamepads",
  getPref("stream_combine_sources") && "streamCombineSources",
  ...getPref("xhome_enabled") ? [
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
        BxLogger.info(LOG_TAG3, "Restored Function.prototype.bind()"), Function.prototype.bind = nativeBind;
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
      const func = item[1][id], funcStr = func.toString();
      let patchedFuncStr = funcStr, modified = !1;
      for (let patchIndex = 0;patchIndex < patchesToCheck.length; patchIndex++) {
        const patchName = patchesToCheck[patchIndex];
        if (appliedPatches.indexOf(patchName) > -1)
          continue;
        if (!PATCHES[patchName])
          continue;
        const tmpStr = PATCHES[patchName].call(null, patchedFuncStr);
        if (!tmpStr)
          continue;
        modified = !0, patchedFuncStr = tmpStr, BxLogger.info(LOG_TAG3, `✅ ${patchName}`), appliedPatches.push(patchName), patchesToCheck.splice(patchIndex, 1), patchIndex--, PATCH_ORDERS = PATCH_ORDERS.filter((item2) => item2 != patchName);
      }
      if (modified)
        try {
          item[1][id] = eval(patchedFuncStr);
        } catch (e) {
          if (e instanceof Error)
            BxLogger.error(LOG_TAG3, "Error", appliedPatches, e.message, patchedFuncStr);
        }
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
      BxLogger.warning(LOG_TAG3, "Signature changed"), window.localStorage.setItem(PatcherCache.#KEY_SIGNATURE, currentSig.toString()), PatcherCache.clear();
    else
      BxLogger.info(LOG_TAG3, "Signature unchanged");
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
    if (PatcherCache.#isInitialized = !0, PatcherCache.checkSignature(), PatcherCache.#CACHE = JSON.parse(window.localStorage.getItem(PatcherCache.#KEY_CACHE) || "{}"), BxLogger.info(LOG_TAG3, PatcherCache.#CACHE), window.location.pathname.includes("/play/"))
      PATCH_ORDERS.push(...PLAYING_PATCH_ORDERS);
    else
      PATCH_ORDERS.push(ENDING_CHUNKS_PATCH_NAME);
    PATCH_ORDERS = PatcherCache.#cleanupPatches(PATCH_ORDERS), PLAYING_PATCH_ORDERS = PatcherCache.#cleanupPatches(PLAYING_PATCH_ORDERS), BxLogger.info(LOG_TAG3, PATCH_ORDERS.slice(0)), BxLogger.info(LOG_TAG3, PLAYING_PATCH_ORDERS.slice(0));
  }
}

class FullscreenText {
  static instance;
  static getInstance() {
    if (!FullscreenText.instance)
      FullscreenText.instance = new FullscreenText;
    return FullscreenText.instance;
  }
  $text;
  constructor() {
    this.$text = CE("div", {
      class: "bx-fullscreen-text bx-gone"
    }), document.documentElement.appendChild(this.$text);
  }
  show(msg) {
    document.body.classList.add("bx-no-scroll"), this.$text.classList.remove("bx-gone"), this.$text.textContent = msg;
  }
  hide() {
    document.body.classList.remove("bx-no-scroll"), this.$text.classList.add("bx-gone");
  }
}

class SettingsNavigationDialog extends NavigationDialog {
  static instance;
  static getInstance() {
    if (!SettingsNavigationDialog.instance)
      SettingsNavigationDialog.instance = new SettingsNavigationDialog;
    return SettingsNavigationDialog.instance;
  }
  $container;
  $tabs;
  $settings;
  $btnReload;
  $btnGlobalReload;
  $noteGlobalReload;
  renderFullSettings;
  TAB_GLOBAL_ITEMS = [{
    group: "general",
    label: t("better-xcloud"),
    helpUrl: "https://better-xcloud.github.io/features/",
    items: [
      ($parent) => {
        const PREF_LATEST_VERSION = getPref("version_latest"), topButtons = [];
        if (!SCRIPT_VERSION.includes("beta") && PREF_LATEST_VERSION && PREF_LATEST_VERSION != SCRIPT_VERSION)
          topButtons.push(createButton({
            label: `🌟 Version ${PREF_LATEST_VERSION} available`,
            style: ButtonStyle.PRIMARY | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
            url: "https://github.com/redphx/better-xcloud/releases/latest"
          }));
        if (AppInterface)
          topButtons.push(createButton({
            label: t("app-settings"),
            icon: BxIcon.STREAM_SETTINGS,
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: (e) => {
              AppInterface.openAppSettings && AppInterface.openAppSettings(), this.hide();
            }
          }));
        else if (UserAgent.getDefault().toLowerCase().includes("android"))
          topButtons.push(createButton({
            label: "🔥 " + t("install-android"),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            url: "https://better-xcloud.github.io/android"
          }));
        this.$btnGlobalReload = createButton({
          label: t("settings-reload"),
          classes: ["bx-settings-reload-button", "bx-gone"],
          style: ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
          onClick: (e) => {
            this.reloadPage();
          }
        }), topButtons.push(this.$btnGlobalReload), this.$noteGlobalReload = CE("span", {
          class: "bx-settings-reload-note"
        }, t("settings-reload-note")), topButtons.push(this.$noteGlobalReload);
        const $div = CE("div", {
          class: "bx-top-buttons",
          _nearby: {
            orientation: "vertical"
          }
        }, ...topButtons);
        $parent.appendChild($div);
      },
      "bx_locale",
      "server_bypass_restriction",
      "ui_controller_friendly",
      "xhome_enabled"
    ]
  }, {
    group: "server",
    label: t("server"),
    items: [
      "server_region",
      "stream_preferred_locale",
      "prefer_ipv6_server"
    ]
  }, {
    group: "stream",
    label: t("stream"),
    items: [
      "stream_target_resolution",
      "stream_codec_profile",
      "bitrate_video_max",
      "audio_enable_volume_control",
      "stream_disable_feedback_dialog",
      "screenshot_apply_filters",
      "audio_mic_on_playing",
      "game_fortnite_force_console",
      "stream_combine_sources"
    ]
  }, {
    group: "co-op",
    label: t("local-co-op"),
    items: [
      "local_co_op_enabled"
    ]
  }, {
    group: "mkb",
    label: t("mouse-and-keyboard"),
    items: [
      "native_mkb_enabled",
      "mkb_enabled",
      "mkb_hide_idle_cursor"
    ]
  }, {
    group: "touch-control",
    label: t("touch-controller"),
    note: !STATES.userAgent.capabilities.touch ? "⚠️ " + t("device-unsupported-touch") : null,
    unsupported: !STATES.userAgent.capabilities.touch,
    items: [
      "stream_touch_controller",
      "stream_touch_controller_auto_off",
      "stream_touch_controller_default_opacity",
      "stream_touch_controller_style_standard",
      "stream_touch_controller_style_custom"
    ]
  }, {
    group: "ui",
    label: t("ui"),
    items: [
      "ui_layout",
      "ui_game_card_show_wait_time",
      "ui_home_context_menu_disabled",
      "controller_show_connection_status",
      "stream_simplify_menu",
      "skip_splash_video",
      !AppInterface && "ui_scrollbar_hide",
      "hide_dots_icon",
      "reduce_animations",
      "block_social_features",
      "ui_hide_sections"
    ]
  }, {
    group: "game-bar",
    label: t("game-bar"),
    items: [
      "game_bar_position"
    ]
  }, {
    group: "loading-screen",
    label: t("loading-screen"),
    items: [
      "ui_loading_screen_game_art",
      "ui_loading_screen_wait_time",
      "ui_loading_screen_rocket"
    ]
  }, {
    group: "other",
    label: t("other"),
    items: [
      "block_tracking"
    ]
  }, {
    group: "advanced",
    label: t("advanced"),
    items: [
      {
        pref: "user_agent_profile",
        onCreated: (setting, $control) => {
          const defaultUserAgent = window.navigator.orgUserAgent || window.navigator.userAgent, $inpCustomUserAgent = CE("input", {
            id: `bx_setting_inp_${setting.pref}`,
            type: "text",
            placeholder: defaultUserAgent,
            autocomplete: "off",
            class: "bx-settings-custom-user-agent",
            tabindex: 0
          });
          $inpCustomUserAgent.addEventListener("input", (e) => {
            const profile = $control.value, custom = e.target.value.trim();
            UserAgent.updateStorage(profile, custom), this.onGlobalSettingChanged(e);
          }), $control.insertAdjacentElement("afterend", $inpCustomUserAgent), setNearby($inpCustomUserAgent.parentElement, {
            orientation: "vertical"
          });
        }
      }
    ]
  }, {
    group: "footer",
    items: [
      ($parent) => {
        $parent.appendChild(CE("a", {
          class: "bx-donation-link",
          href: "https://ko-fi.com/redphx",
          target: "_blank",
          tabindex: 0
        }, `❤️ ${t("support-better-xcloud")}`));
      },
      ($parent) => {
        try {
          const appVersion = document.querySelector("meta[name=gamepass-app-version]").content, appDate = new Date(document.querySelector("meta[name=gamepass-app-date]").content).toISOString().substring(0, 10);
          $parent.appendChild(CE("div", {
            class: "bx-settings-app-version"
          }, `xCloud website version ${appVersion} (${appDate})`));
        } catch (e) {
        }
      },
      ($parent) => {
        const debugInfo = deepClone(BX_FLAGS.DeviceInfo);
        debugInfo.settings = JSON.parse(window.localStorage.getItem("better_xcloud") || "{}");
        const $debugInfo = CE("div", { class: "bx-debug-info" }, createButton({
          label: "Debug info",
          style: ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
          onClick: (e) => {
            e.target.closest("button")?.nextElementSibling?.classList.toggle("bx-gone");
          }
        }), CE("pre", {
          class: "bx-focusable bx-gone",
          tabindex: 0,
          on: {
            click: async (e) => {
              await copyToClipboard(e.target.innerText);
            }
          }
        }, "```\n" + JSON.stringify(debugInfo, null, "  ") + "\n```"));
        $parent.appendChild($debugInfo);
      }
    ]
  }];
  TAB_DISPLAY_ITEMS = [{
    group: "audio",
    label: t("audio"),
    helpUrl: "https://better-xcloud.github.io/ingame-features/#audio",
    items: [{
      pref: "audio_volume",
      onChange: (e, value) => {
        SoundShortcut.setGainNodeVolume(value);
      },
      params: {
        disabled: !getPref("audio_enable_volume_control")
      },
      onCreated: (setting, $elm) => {
        const $range = $elm.querySelector("input[type=range");
        window.addEventListener(BxEvent.SETTINGS_CHANGED, (e) => {
          const { storageKey, settingKey, settingValue } = e;
          if (storageKey !== "better_xcloud" || settingKey !== "audio_volume")
            return;
          $range.value = settingValue, BxEvent.dispatch($range, "input", {
            ignoreOnChange: !0
          });
        });
      }
    }]
  }, {
    group: "video",
    label: t("video"),
    helpUrl: "https://better-xcloud.github.io/ingame-features/#video",
    items: [{
      pref: "video_player_type",
      onChange: onChangeVideoPlayerType
    }, {
      pref: "video_power_preference",
      onChange: () => {
        const streamPlayer = STATES.currentStream.streamPlayer;
        if (!streamPlayer)
          return;
        streamPlayer.reloadPlayer(), updateVideoPlayer();
      }
    }, {
      pref: "video_processing",
      onChange: updateVideoPlayer
    }, {
      pref: "video_ratio",
      onChange: updateVideoPlayer
    }, {
      pref: "video_sharpness",
      onChange: updateVideoPlayer
    }, {
      pref: "video_saturation",
      onChange: updateVideoPlayer
    }, {
      pref: "video_contrast",
      onChange: updateVideoPlayer
    }, {
      pref: "video_brightness",
      onChange: updateVideoPlayer
    }]
  }];
  TAB_CONTROLLER_ITEMS = [
    {
      group: "controller",
      label: t("controller"),
      helpUrl: "https://better-xcloud.github.io/ingame-features/#controller",
      items: [{
        pref: "controller_enable_vibration",
        unsupported: !VibrationManager.supportControllerVibration(),
        onChange: () => VibrationManager.updateGlobalVars()
      }, {
        pref: "controller_device_vibration",
        unsupported: !VibrationManager.supportDeviceVibration(),
        onChange: () => VibrationManager.updateGlobalVars()
      }, (VibrationManager.supportControllerVibration() || VibrationManager.supportDeviceVibration()) && {
        pref: "controller_vibration_intensity",
        unsupported: !VibrationManager.supportDeviceVibration(),
        onChange: () => VibrationManager.updateGlobalVars()
      }]
    },
    STATES.userAgent.capabilities.touch && {
      group: "touch-control",
      label: t("touch-controller"),
      items: [{
        label: t("layout"),
        content: CE("select", {
          disabled: !0
        }, CE("option", {}, t("default"))),
        onCreated: (setting, $elm) => {
          $elm.addEventListener("input", (e) => {
            TouchController.applyCustomLayout($elm.value, 1000);
          }), window.addEventListener(BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, (e) => {
            const customLayouts = TouchController.getCustomLayouts();
            while ($elm.firstChild)
              $elm.removeChild($elm.firstChild);
            if ($elm.disabled = !customLayouts, !customLayouts) {
              $elm.appendChild(CE("option", { value: "" }, t("default"))), $elm.value = "", $elm.dispatchEvent(new Event("input"));
              return;
            }
            const $fragment = document.createDocumentFragment();
            for (let key in customLayouts.layouts) {
              const layout = customLayouts.layouts[key];
              let name;
              if (layout.author)
                name = `${layout.name} (${layout.author})`;
              else
                name = layout.name;
              const $option = CE("option", { value: key }, name);
              $fragment.appendChild($option);
            }
            $elm.appendChild($fragment), $elm.value = customLayouts.default_layout;
          });
        }
      }]
    }
  ];
  TAB_VIRTUAL_CONTROLLER_ITEMS = [{
    group: "mkb",
    label: t("virtual-controller"),
    helpUrl: "https://better-xcloud.github.io/mouse-and-keyboard/",
    content: MkbRemapper.INSTANCE.render()
  }];
  TAB_NATIVE_MKB_ITEMS = [{
    group: "native-mkb",
    label: t("native-mkb"),
    items: [{
      pref: "native_mkb_scroll_y_sensitivity",
      onChange: (e, value) => {
        NativeMkbHandler.getInstance().setVerticalScrollMultiplier(value / 100);
      }
    }, {
      pref: "native_mkb_scroll_x_sensitivity",
      onChange: (e, value) => {
        NativeMkbHandler.getInstance().setHorizontalScrollMultiplier(value / 100);
      }
    }]
  }];
  TAB_SHORTCUTS_ITEMS = [{
    group: "controller-shortcuts",
    label: t("controller-shortcuts"),
    content: ControllerShortcut.renderSettings()
  }];
  TAB_STATS_ITEMS = [{
    group: "stats",
    label: t("stream-stats"),
    helpUrl: "https://better-xcloud.github.io/stream-stats/",
    items: [
      {
        pref: "stats_show_when_playing"
      },
      {
        pref: "stats_quick_glance",
        onChange: (e) => {
          const streamStats = StreamStats.getInstance();
          e.target.checked ? streamStats.quickGlanceSetup() : streamStats.quickGlanceStop();
        }
      },
      {
        pref: "stats_items",
        onChange: StreamStats.refreshStyles
      },
      {
        pref: "stats_position",
        onChange: StreamStats.refreshStyles
      },
      {
        pref: "stats_text_size",
        onChange: StreamStats.refreshStyles
      },
      {
        pref: "stats_opacity",
        onChange: StreamStats.refreshStyles
      },
      {
        pref: "stats_transparent",
        onChange: StreamStats.refreshStyles
      },
      {
        pref: "stats_conditional_formatting",
        onChange: StreamStats.refreshStyles
      }
    ]
  }];
  SETTINGS_UI = [
    {
      icon: BxIcon.HOME,
      group: "global",
      items: this.TAB_GLOBAL_ITEMS
    },
    {
      icon: BxIcon.DISPLAY,
      group: "stream",
      items: this.TAB_DISPLAY_ITEMS
    },
    {
      icon: BxIcon.CONTROLLER,
      group: "controller",
      items: this.TAB_CONTROLLER_ITEMS
    },
    getPref("mkb_enabled") && {
      icon: BxIcon.VIRTUAL_CONTROLLER,
      group: "mkb",
      items: this.TAB_VIRTUAL_CONTROLLER_ITEMS
    },
    AppInterface && getPref("native_mkb_enabled") === "on" && {
      icon: BxIcon.NATIVE_MKB,
      group: "native-mkb",
      items: this.TAB_NATIVE_MKB_ITEMS
    },
    {
      icon: BxIcon.COMMAND,
      group: "shortcuts",
      items: this.TAB_SHORTCUTS_ITEMS
    },
    {
      icon: BxIcon.STREAM_STATS,
      group: "stats",
      items: this.TAB_STATS_ITEMS
    }
  ];
  constructor() {
    super();
    this.renderFullSettings = STATES.supportedRegion && STATES.isSignedIn, this.setupDialog();
  }
  getDialog() {
    return this;
  }
  getContent() {
    return this.$container;
  }
  onMounted() {
    if (!this.renderFullSettings)
      return;
    if (onChangeVideoPlayerType(), STATES.userAgent.capabilities.touch)
      BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED);
    const $selectUserAgent = document.querySelector(`#bx_setting_${"user_agent_profile"}`);
    if ($selectUserAgent)
      $selectUserAgent.disabled = !0, BxEvent.dispatch($selectUserAgent, "input", {}), $selectUserAgent.disabled = !1;
  }
  reloadPage() {
    this.$btnGlobalReload.disabled = !0, this.$btnGlobalReload.firstElementChild.textContent = t("settings-reloading"), this.hide(), FullscreenText.getInstance().show(t("settings-reloading")), window.location.reload();
  }
  renderTab(settingTab) {
    const $svg = createSvgIcon(settingTab.icon);
    return $svg.dataset.group = settingTab.group, $svg.tabIndex = 0, $svg.addEventListener("click", (e) => {
      for (let $child of Array.from(this.$settings.children))
        if ($child.getAttribute("data-tab-group") === settingTab.group)
          $child.classList.remove("bx-gone");
        else
          $child.classList.add("bx-gone");
      for (let $child of Array.from(this.$tabs.children))
        $child.classList.remove("bx-active");
      $svg.classList.add("bx-active");
    }), $svg;
  }
  onGlobalSettingChanged(e) {
    PatcherCache.clear(), this.$btnReload.classList.add("bx-danger"), this.$noteGlobalReload.classList.add("bx-gone"), this.$btnGlobalReload.classList.remove("bx-gone"), this.$btnGlobalReload.classList.add("bx-danger");
  }
  renderServerSetting(setting) {
    let selectedValue;
    const $control = CE("select", {
      id: `bx_setting_${setting.pref}`,
      title: setting.label,
      tabindex: 0
    });
    $control.name = $control.id, $control.addEventListener("input", (e) => {
      setPref(setting.pref, e.target.value), this.onGlobalSettingChanged(e);
    }), selectedValue = getPref("server_region"), setting.options = {};
    for (let regionName in STATES.serverRegions) {
      const region = STATES.serverRegions[regionName];
      let value = regionName, label = `${region.shortName} - ${regionName}`;
      if (region.isDefault) {
        if (label += ` (${t("default")})`, value = "default", selectedValue === regionName)
          selectedValue = "default";
      }
      setting.options[value] = label;
    }
    for (let value in setting.options) {
      const label = setting.options[value], $option = CE("option", { value }, label);
      $control.appendChild($option);
    }
    return $control.disabled = Object.keys(STATES.serverRegions).length === 0, $control.value = selectedValue, $control;
  }
  renderSettingRow(settingTab, $tabContent, settingTabContent, setting) {
    if (typeof setting === "string")
      setting = {
        pref: setting
      };
    const pref = setting.pref;
    let $control;
    if (setting.content)
      if (typeof setting.content === "function")
        $control = setting.content.apply(this);
      else
        $control = setting.content;
    else if (!setting.unsupported) {
      if (pref === "server_region")
        $control = this.renderServerSetting(setting);
      else if (pref === "bx_locale")
        $control = SettingElement.fromPref(pref, STORAGE.Global, async (e) => {
          const newLocale = e.target.value;
          if (getPref("ui_controller_friendly")) {
            let timeoutId = e.target.timeoutId;
            timeoutId && window.clearTimeout(timeoutId), e.target.timeoutId = window.setTimeout(() => {
              Translations.refreshLocale(newLocale), Translations.updateTranslations();
            }, 500);
          } else
            Translations.refreshLocale(newLocale), Translations.updateTranslations();
          this.onGlobalSettingChanged(e);
        });
      else if (pref === "user_agent_profile")
        $control = SettingElement.fromPref("user_agent_profile", STORAGE.Global, (e) => {
          const value = e.target.value;
          let isCustom = value === "custom", userAgent2 = UserAgent.get(value);
          UserAgent.updateStorage(value);
          const $inp = $control.nextElementSibling;
          $inp.value = userAgent2, $inp.readOnly = !isCustom, $inp.disabled = !isCustom, !e.target.disabled && this.onGlobalSettingChanged(e);
        });
      else {
        let onChange = setting.onChange;
        if (!onChange && settingTab.group === "global")
          onChange = this.onGlobalSettingChanged.bind(this);
        $control = SettingElement.fromPref(pref, STORAGE.Global, onChange, setting.params);
      }
      if ($control instanceof HTMLSelectElement && getPref("ui_controller_friendly"))
        $control = BxSelectElement.wrap($control);
    }
    let prefDefinition = null;
    if (pref)
      prefDefinition = getPrefDefinition(pref);
    let label = prefDefinition?.label || setting.label, note = prefDefinition?.note || setting.note;
    if (prefDefinition?.experimental || setting.experimental)
      if (label = "🧪 " + label, !note)
        note = t("experimental");
      else
        note = `${t("experimental")}: ${note}`;
    let $label;
    const $row = CE("label", {
      class: "bx-settings-row",
      for: `bx_setting_${pref}`,
      "data-type": settingTabContent.group,
      _nearby: {
        orientation: "horizontal"
      }
    }, $label = CE("span", { class: "bx-settings-label" }, label, note && CE("div", { class: "bx-settings-dialog-note" }, note), setting.unsupported && CE("div", { class: "bx-settings-dialog-note" }, t("browser-unsupported-feature"))), !setting.unsupported && $control), $link = $label.querySelector("a");
    if ($link)
      $link.classList.add("bx-focusable"), setNearby($label, {
        focus: $link
      });
    $tabContent.appendChild($row), setting.onCreated && setting.onCreated(setting, $control);
  }
  setupDialog() {
    let $tabs, $settings;
    const $container = CE("div", {
      class: "bx-settings-dialog",
      _nearby: {
        orientation: "horizontal"
      }
    }, CE("div", {
      class: "bx-settings-tabs-container",
      _nearby: {
        orientation: "vertical",
        focus: () => {
          return this.dialogManager.focus($tabs);
        },
        loop: (direction) => {
          if (direction === 1 || direction === 3)
            return this.focusVisibleTab(direction === 1 ? "last" : "first"), !0;
          return !1;
        }
      }
    }, $tabs = CE("div", {
      class: "bx-settings-tabs bx-hide-scroll-bar",
      _nearby: {
        focus: () => this.focusActiveTab()
      }
    }), CE("div", {}, this.$btnReload = createButton({
      icon: BxIcon.REFRESH,
      style: ButtonStyle.FOCUSABLE | ButtonStyle.DROP_SHADOW,
      onClick: (e) => {
        this.reloadPage();
      }
    }), createButton({
      icon: BxIcon.CLOSE,
      style: ButtonStyle.FOCUSABLE | ButtonStyle.DROP_SHADOW,
      onClick: (e) => {
        this.dialogManager.hide();
      }
    }))), $settings = CE("div", {
      class: "bx-settings-tab-contents",
      _nearby: {
        orientation: "vertical",
        focus: () => this.jumpToSettingGroup("next"),
        loop: (direction) => {
          if (direction === 1 || direction === 3)
            return this.focusVisibleSetting(direction === 1 ? "last" : "first"), !0;
          return !1;
        }
      }
    }));
    this.$container = $container, this.$tabs = $tabs, this.$settings = $settings, $container.addEventListener("click", (e) => {
      if (e.target === $container)
        e.preventDefault(), e.stopPropagation(), this.hide();
    });
    for (let settingTab of this.SETTINGS_UI) {
      if (!settingTab)
        continue;
      if (settingTab.group !== "global" && !this.renderFullSettings)
        continue;
      const $svg = this.renderTab(settingTab);
      $tabs.appendChild($svg);
      const $tabContent = CE("div", {
        class: "bx-gone",
        "data-tab-group": settingTab.group
      });
      for (let settingTabContent of settingTab.items) {
        if (settingTabContent === !1)
          continue;
        if (!this.renderFullSettings && settingTab.group === "global" && settingTabContent.group !== "general" && settingTabContent.group !== "footer")
          continue;
        let label = settingTabContent.label;
        if (label === t("better-xcloud"))
          label += " " + SCRIPT_VERSION, label = createButton({
            label,
            url: "https://github.com/redphx/better-xcloud/releases",
            style: ButtonStyle.NORMAL_CASE | ButtonStyle.FROSTED | ButtonStyle.FOCUSABLE
          });
        if (label) {
          const $title = CE("h2", {
            _nearby: {
              orientation: "horizontal"
            }
          }, CE("span", {}, label), settingTabContent.helpUrl && createButton({
            icon: BxIcon.QUESTION,
            style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE,
            url: settingTabContent.helpUrl,
            title: t("help")
          }));
          $tabContent.appendChild($title);
        }
        if (settingTabContent.note) {
          let $note;
          if (typeof settingTabContent.note === "string")
            $note = CE("b", { class: "bx-note-unsupported" }, settingTabContent.note);
          else
            $note = settingTabContent.note;
          $tabContent.appendChild($note);
        }
        if (settingTabContent.unsupported)
          continue;
        if (settingTabContent.content) {
          $tabContent.appendChild(settingTabContent.content);
          continue;
        }
        settingTabContent.items = settingTabContent.items || [];
        for (let setting of settingTabContent.items) {
          if (setting === !1)
            continue;
          if (typeof setting === "function") {
            setting.apply(this, [$tabContent]);
            continue;
          }
          this.renderSettingRow(settingTab, $tabContent, settingTabContent, setting);
        }
      }
      $settings.appendChild($tabContent);
    }
    $tabs.firstElementChild.dispatchEvent(new Event("click"));
  }
  focusTab(tabId) {
    const $tab = this.$container.querySelector(`.bx-settings-tabs svg[data-group=${tabId}]`);
    $tab && $tab.dispatchEvent(new Event("click"));
  }
  focusIfNeeded() {
    this.jumpToSettingGroup("next");
  }
  focusActiveTab() {
    const $currentTab = this.$tabs.querySelector(".bx-active");
    return $currentTab && $currentTab.focus(), !0;
  }
  focusVisibleSetting(type = "first") {
    const controls = Array.from(this.$settings.querySelectorAll("div[data-tab-group]:not(.bx-gone) > *"));
    if (!controls.length)
      return !1;
    if (type === "last")
      controls.reverse();
    for (let $control of controls) {
      if (!($control instanceof HTMLElement))
        continue;
      const $focusable = this.dialogManager.findFocusableElement($control);
      if ($focusable) {
        if (this.dialogManager.focus($focusable))
          return !0;
      }
    }
    return !1;
  }
  focusVisibleTab(type = "first") {
    const tabs = Array.from(this.$tabs.querySelectorAll("svg:not(.bx-gone)"));
    if (!tabs.length)
      return !1;
    if (type === "last")
      tabs.reverse();
    for (let $tab of tabs)
      if (this.dialogManager.focus($tab))
        return !0;
    return !1;
  }
  jumpToSettingGroup(direction) {
    const $tabContent = this.$settings.querySelector("div[data-tab-group]:not(.bx-gone)");
    if (!$tabContent)
      return !1;
    let $header;
    const $focusing = document.activeElement;
    if (!$focusing || !$tabContent.contains($focusing))
      $header = $tabContent.querySelector("h2");
    else {
      const $parent = $focusing.closest("[data-tab-group] > *"), siblingProperty = direction === "next" ? "nextSibling" : "previousSibling";
      let $tmp = $parent, times = 0;
      while (!0) {
        if (!$tmp)
          break;
        if ($tmp.tagName === "H2") {
          if ($header = $tmp, !$tmp.nextElementSibling?.classList.contains("bx-note-unsupported")) {
            if (++times, direction === "next" || times >= 2)
              break;
          }
        }
        $tmp = $tmp[siblingProperty];
      }
    }
    let $target;
    if ($header)
      $target = this.dialogManager.findNextTarget($header, 3, !1);
    if ($target)
      return this.dialogManager.focus($target);
    return !1;
  }
  handleKeyPress(key) {
    let handled = !0;
    switch (key) {
      case "Tab":
        this.focusActiveTab();
        break;
      case "Home":
        this.focusVisibleSetting("first");
        break;
      case "End":
        this.focusVisibleSetting("last");
        break;
      case "PageUp":
        this.jumpToSettingGroup("previous");
        break;
      case "PageDown":
        this.jumpToSettingGroup("next");
        break;
      default:
        handled = !1;
        break;
    }
    return handled;
  }
  handleGamepad(button) {
    let handled = !0;
    switch (button) {
      case 4:
      case 5:
        this.focusActiveTab();
        break;
      case 6:
        this.jumpToSettingGroup("previous");
        break;
      case 7:
        this.jumpToSettingGroup("next");
        break;
      default:
        handled = !1;
        break;
    }
    return handled;
  }
}

var LOG_TAG4 = "MkbHandler", PointerToMouseButton = {
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
      102: [this.#LEFT_STICK_X, 0, -1],
      103: [this.#LEFT_STICK_X, 0, 1],
      100: [this.#LEFT_STICK_Y, 1, -1],
      101: [this.#LEFT_STICK_Y, 1, 1],
      202: [this.#RIGHT_STICK_X, 2, -1],
      203: [this.#RIGHT_STICK_X, 2, 1],
      200: [this.#RIGHT_STICK_Y, 3, -1],
      201: [this.#RIGHT_STICK_Y, 3, 1]
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
    const analog = this.#CURRENT_PRESET_DATA.mouse["map_to"] === 1 ? 0 : 1;
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
    const mouseMapTo = this.#CURRENT_PRESET_DATA.mouse["map_to"];
    if (mouseMapTo === 0)
      return;
    this.#detectMouseStoppedTimeout && clearTimeout(this.#detectMouseStoppedTimeout), this.#detectMouseStoppedTimeout = window.setTimeout(this.#onMouseStopped.bind(this), 50);
    const deadzoneCounterweight = this.#CURRENT_PRESET_DATA.mouse["deadzone_counterweight"];
    let x = data.movementX * this.#CURRENT_PRESET_DATA.mouse["sensitivity_x"], y = data.movementY * this.#CURRENT_PRESET_DATA.mouse["sensitivity_y"], length = this.#vectorLength(x, y);
    if (length !== 0 && length < deadzoneCounterweight)
      x *= deadzoneCounterweight / length, y *= deadzoneCounterweight / length;
    else if (length > EmulatedMkbHandler.MAXIMUM_STICK_RANGE)
      x *= EmulatedMkbHandler.MAXIMUM_STICK_RANGE / length, y *= EmulatedMkbHandler.MAXIMUM_STICK_RANGE / length;
    const analog = mouseMapTo === 1 ? 0 : 1;
    this.#updateStick(analog, x, y);
  };
  handleMouseWheel = (data) => {
    let code = "";
    if (data.vertical < 0)
      code = "ScrollUp";
    else if (data.vertical > 0)
      code = "ScrollDown";
    else if (data.horizontal < 0)
      code = "ScrollLeft";
    else if (data.horizontal > 0)
      code = "ScrollRight";
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
      const presetId = getPref("mkb_default_preset_id");
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
          e.preventDefault(), e.stopPropagation();
          const dialog2 = SettingsNavigationDialog.getInstance();
          dialog2.focusTab("mkb"), NavigationDialogManager.getInstance().show(dialog2);
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
        if (AppInterface && getPref("native_mkb_enabled") === "on")
          AppInterface && NativeMkbHandler.getInstance().init();
      } else if (getPref("mkb_enabled") && (AppInterface || !UserAgent.isMobile()))
        BxLogger.info(LOG_TAG4, "Emulate MKB"), EmulatedMkbHandler.getInstance().init();
    });
  }
}

class MicrophoneShortcut {
  static toggle(showToast = !0) {
    if (!window.BX_EXPOSED.streamSession)
      return !1;
    const enableMic = window.BX_EXPOSED.streamSession._microphoneState === "Enabled" ? !1 : !0;
    try {
      return window.BX_EXPOSED.streamSession.tryEnableChatAsync(enableMic), showToast && Toast.show(t("microphone"), t(enableMic ? "unmuted" : "muted"), { instant: !0 }), enableMic;
    } catch (e) {
      console.log(e);
    }
    return !1;
  }
}

class StreamUiShortcut {
  static showHideStreamMenu() {
    window.BX_EXPOSED.showStreamMenu && window.BX_EXPOSED.showStreamMenu();
  }
}

class ControllerShortcut {
  static #STORAGE_KEY = "better_xcloud_controller_shortcuts";
  static #buttonsCache = {};
  static #buttonsStatus = {};
  static #$selectProfile;
  static #$selectActions = {};
  static #$container;
  static #ACTIONS = null;
  static reset(index) {
    ControllerShortcut.#buttonsCache[index] = [], ControllerShortcut.#buttonsStatus[index] = [];
  }
  static handle(gamepad) {
    if (!ControllerShortcut.#ACTIONS)
      ControllerShortcut.#ACTIONS = ControllerShortcut.#getActionsFromStorage();
    const gamepadIndex = gamepad.index, actions = ControllerShortcut.#ACTIONS[gamepad.id];
    if (!actions)
      return !1;
    ControllerShortcut.#buttonsCache[gamepadIndex] = ControllerShortcut.#buttonsStatus[gamepadIndex].slice(0), ControllerShortcut.#buttonsStatus[gamepadIndex] = [];
    const pressed = [];
    let otherButtonPressed = !1;
    return gamepad.buttons.forEach((button, index) => {
      if (button.pressed && index !== 16) {
        if (otherButtonPressed = !0, pressed[index] = !0, actions[index] && !ControllerShortcut.#buttonsCache[gamepadIndex][index])
          setTimeout(() => ControllerShortcut.#runAction(actions[index]), 0);
      }
    }), ControllerShortcut.#buttonsStatus[gamepadIndex] = pressed, otherButtonPressed;
  }
  static #runAction(action) {
    switch (action) {
      case "bx-settings-show":
        SettingsNavigationDialog.getInstance().show();
        break;
      case "stream-screenshot-capture":
        Screenshot.takeScreenshot();
        break;
      case "stream-stats-toggle":
        StreamStats.getInstance().toggle();
        break;
      case "stream-microphone-toggle":
        MicrophoneShortcut.toggle();
        break;
      case "stream-menu-show":
        StreamUiShortcut.showHideStreamMenu();
        break;
      case "stream-sound-toggle":
        SoundShortcut.muteUnmute();
        break;
      case "stream-volume-inc":
        SoundShortcut.adjustGainNodeVolume(10);
        break;
      case "stream-volume-dec":
        SoundShortcut.adjustGainNodeVolume(-10);
        break;
      case "device-brightness-inc":
      case "device-brightness-dec":
      case "device-sound-toggle":
      case "device-volume-inc":
      case "device-volume-dec":
        AppInterface && AppInterface.runShortcut && AppInterface.runShortcut(action);
        break;
    }
  }
  static #updateAction(profile, button, action) {
    const actions = ControllerShortcut.#ACTIONS;
    if (!(profile in actions))
      actions[profile] = [];
    if (!action)
      action = null;
    actions[profile][button] = action;
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
    if ($container.dataset.hasGamepad = hasGamepad.toString(), hasGamepad)
      $select.appendChild($fragment), $select.selectedIndex = 0, $select.dispatchEvent(new Event("input"));
  }
  static #switchProfile(profile) {
    let actions = ControllerShortcut.#ACTIONS[profile];
    if (!actions)
      actions = [];
    let button;
    for (button in ControllerShortcut.#$selectActions) {
      const $select = ControllerShortcut.#$selectActions[button];
      $select.value = actions[button] || "", BxEvent.dispatch($select, "input", {
        ignoreOnChange: !0,
        manualTrigger: !0
      });
    }
  }
  static #getActionsFromStorage() {
    return JSON.parse(window.localStorage.getItem(ControllerShortcut.#STORAGE_KEY) || "{}");
  }
  static renderSettings() {
    const PREF_CONTROLLER_FRIENDLY_UI = getPref("ui_controller_friendly");
    ControllerShortcut.#ACTIONS = ControllerShortcut.#getActionsFromStorage();
    const buttons = new Map;
    buttons.set(3, "⇑"), buttons.set(0, "⇓"), buttons.set(1, "⇒"), buttons.set(2, "⇐"), buttons.set(12, "≻"), buttons.set(13, "≽"), buttons.set(14, "≺"), buttons.set(15, "≼"), buttons.set(8, "⇺"), buttons.set(9, "⇻"), buttons.set(4, "↘"), buttons.set(5, "↙"), buttons.set(6, "↖"), buttons.set(7, "↗"), buttons.set(10, "↺"), buttons.set(11, "↻");
    const actions = {
      [t("better-xcloud")]: {
        ["bx-settings-show"]: [t("settings"), t("show")]
      },
      [t("device")]: AppInterface && {
        ["device-sound-toggle"]: [t("sound"), t("toggle")],
        ["device-volume-inc"]: [t("volume"), t("increase")],
        ["device-volume-dec"]: [t("volume"), t("decrease")],
        ["device-brightness-inc"]: [t("brightness"), t("increase")],
        ["device-brightness-dec"]: [t("brightness"), t("decrease")]
      },
      [t("stream")]: {
        ["stream-screenshot-capture"]: t("take-screenshot"),
        ["stream-sound-toggle"]: [t("sound"), t("toggle")],
        ["stream-volume-inc"]: getPref("audio_enable_volume_control") && [t("volume"), t("increase")],
        ["stream-volume-dec"]: getPref("audio_enable_volume_control") && [t("volume"), t("decrease")],
        ["stream-menu-show"]: [t("menu"), t("show")],
        ["stream-stats-toggle"]: [t("stats"), t("show-hide")],
        ["stream-microphone-toggle"]: [t("microphone"), t("toggle")]
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
    let $remap;
    const $selectProfile = CE("select", { class: "bx-shortcut-profile", autocomplete: "off" }), $profile = PREF_CONTROLLER_FRIENDLY_UI ? BxSelectElement.wrap($selectProfile) : $selectProfile, $container = CE("div", {
      "data-has-gamepad": "false",
      _nearby: {
        focus: $profile
      }
    }, CE("div", {}, CE("p", { class: "bx-shortcut-note" }, t("controller-shortcuts-connect-note"))), $remap = CE("div", {}, CE("div", {
      _nearby: {
        focus: $profile
      }
    }, $profile), CE("p", { class: "bx-shortcut-note" }, CE("span", { class: "bx-prompt" }, ""), ": " + t("controller-shortcuts-xbox-note"))));
    $selectProfile.addEventListener("input", (e) => {
      ControllerShortcut.#switchProfile($selectProfile.value);
    });
    const onActionChanged = (e) => {
      const $target = e.target, profile = $selectProfile.value, button = $target.dataset.button, action = $target.value;
      if (!PREF_CONTROLLER_FRIENDLY_UI) {
        const $fakeSelect = $target.previousElementSibling;
        let fakeText = "---";
        if (action) {
          const $selectedOption = $target.options[$target.selectedIndex];
          fakeText = $selectedOption.parentElement.label + " ❯ " + $selectedOption.text;
        }
        $fakeSelect.firstElementChild.text = fakeText;
      }
      !e.ignoreOnChange && ControllerShortcut.#updateAction(profile, button, action);
    };
    for (let [button, prompt2] of buttons) {
      const $row = CE("div", {
        class: "bx-shortcut-row"
      }), $label = CE("label", { class: "bx-prompt" }, `${""} + ${prompt2}`), $div = CE("div", { class: "bx-shortcut-actions" });
      if (!PREF_CONTROLLER_FRIENDLY_UI) {
        const $fakeSelect = CE("select", { autocomplete: "off" }, CE("option", {}, "---"));
        $div.appendChild($fakeSelect);
      }
      const $select = $baseSelect.cloneNode(!0);
      if ($select.dataset.button = button.toString(), $select.addEventListener("input", onActionChanged), ControllerShortcut.#$selectActions[button] = $select, PREF_CONTROLLER_FRIENDLY_UI) {
        const $bxSelect = BxSelectElement.wrap($select);
        $div.appendChild($bxSelect), setNearby($row, {
          focus: $bxSelect
        });
      } else
        $div.appendChild($select), setNearby($row, {
          focus: $select
        });
      $row.appendChild($label), $row.appendChild($div), $remap.appendChild($row);
    }
    return $container.appendChild($remap), ControllerShortcut.#$selectProfile = $selectProfile, ControllerShortcut.#$container = $container, window.addEventListener("gamepadconnected", ControllerShortcut.#updateProfileList), window.addEventListener("gamepaddisconnected", ControllerShortcut.#updateProfileList), ControllerShortcut.#updateProfileList(), $container;
  }
}

var BxExposed = {
  getTitleInfo: () => STATES.currentStream.titleInfo,
  modifyTitleInfo: (titleInfo) => {
    titleInfo = deepClone(titleInfo);
    let supportedInputTypes = titleInfo.details.supportedInputTypes;
    if (BX_FLAGS.ForceNativeMkbTitles?.includes(titleInfo.details.productId))
      supportedInputTypes.push("MKB");
    if (getPref("native_mkb_enabled") === "off")
      supportedInputTypes = supportedInputTypes.filter((i) => i !== "MKB");
    if (titleInfo.details.hasMkbSupport = supportedInputTypes.includes("MKB"), STATES.userAgent.capabilities.touch) {
      let touchControllerAvailability = getPref("stream_touch_controller");
      if (touchControllerAvailability !== "off" && getPref("stream_touch_controller_auto_off")) {
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
        supportedInputTypes = supportedInputTypes.filter((i) => i !== "CustomTouchOverlay" && i !== "GenericTouch"), titleInfo.details.supportedTabs = [];
      if (titleInfo.details.hasNativeTouchSupport = supportedInputTypes.includes("NativeTouch"), titleInfo.details.hasTouchSupport = titleInfo.details.hasNativeTouchSupport || supportedInputTypes.includes("CustomTouchOverlay") || supportedInputTypes.includes("GenericTouch"), !titleInfo.details.hasTouchSupport && touchControllerAvailability === "all")
        titleInfo.details.hasFakeTouchSupport = !0, supportedInputTypes.push("GenericTouch");
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
  resetControllerShortcut: ControllerShortcut.reset,
  overrideSettings: {
    Tv_settings: {
      hasCompletedOnboarding: !0
    }
  },
  disableGamepadPolling: !1,
  backButtonPressed: () => {
    const navigationDialogManager = NavigationDialogManager.getInstance();
    if (navigationDialogManager.isShowing())
      return navigationDialogManager.hide(), !0;
    return !1;
  }
};

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
window.localRedirect = localRedirect;

function getPreferredServerRegion(shortName = !1) {
  let preferredRegion = getPref("server_region");
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
  return null;
}

class HeaderSection {
  static #$remotePlayBtn = createButton({
    classes: ["bx-header-remote-play-button", "bx-gone"],
    icon: BxIcon.REMOTE_PLAY,
    title: t("remote-play"),
    style: ButtonStyle.GHOST | ButtonStyle.FOCUSABLE | ButtonStyle.CIRCULAR,
    onClick: (e) => {
      RemotePlay.togglePopup();
    }
  });
  static #$settingsBtn = createButton({
    classes: ["bx-header-settings-button"],
    label: "???",
    style: ButtonStyle.FROSTED | ButtonStyle.DROP_SHADOW | ButtonStyle.FOCUSABLE | ButtonStyle.FULL_HEIGHT,
    onClick: (e) => {
      SettingsNavigationDialog.getInstance().show();
    }
  });
  static #$buttonsWrapper = CE("div", {}, getPref("xhome_enabled") ? HeaderSection.#$remotePlayBtn : null, HeaderSection.#$settingsBtn);
  static #observer;
  static #timeout;
  static #injectSettingsButton($parent) {
    if (!$parent)
      return;
    const PREF_LATEST_VERSION = getPref("version_latest"), $settingsBtn = HeaderSection.#$settingsBtn;
    if ($settingsBtn.querySelector("span").textContent = getPreferredServerRegion(!0) || t("better-xcloud"), !SCRIPT_VERSION.includes("beta") && PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION)
      $settingsBtn.setAttribute("data-update-available", "true");
    $parent.appendChild(HeaderSection.#$buttonsWrapper);
  }
  static checkHeader() {
    let $target = document.querySelector("#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]");
    if (!$target)
      $target = document.querySelector("div[class^=UnsupportedMarketPage-module__buttons]");
    $target && HeaderSection.#injectSettingsButton($target);
  }
  static showRemotePlayButton() {
    HeaderSection.#$remotePlayBtn.classList.remove("bx-gone");
  }
  static watchHeader() {
    const $root = document.querySelector("#PageContent header") || document.querySelector("#root");
    if (!$root)
      return;
    HeaderSection.#observer && HeaderSection.#observer.disconnect(), HeaderSection.#observer = new MutationObserver((mutationList) => {
      HeaderSection.#timeout && clearTimeout(HeaderSection.#timeout), HeaderSection.#timeout = window.setTimeout(HeaderSection.checkHeader, 2000);
    }), HeaderSection.#observer.observe($root, { subtree: !0, childList: !0 }), HeaderSection.checkHeader();
  }
}

var LOG_TAG5 = "RemotePlay";
class RemotePlay {
  static XCLOUD_TOKEN;
  static XHOME_TOKEN;
  static #CONSOLES;
  static #REGIONS;
  static #STATE_LABELS = {
    ["On"]: t("powered-on"),
    ["Off"]: t("powered-off"),
    ["ConnectedStandby"]: t("standby"),
    ["Unknown"]: t("unknown")
  };
  static BASE_DEVICE_INFO = {
    appInfo: {
      env: {
        clientAppId: window.location.host,
        clientAppType: "browser",
        clientAppVersion: "24.17.36",
        clientSdkVersion: "10.1.14",
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
        browserVersion: "125.0"
      }
    }
  };
  static #$content;
  static #initialize() {
    if (RemotePlay.#$content)
      return;
    RemotePlay.#$content = CE("div", {}, t("getting-consoles-list")), RemotePlay.#getXhomeToken(() => {
      RemotePlay.#getConsolesList(() => {
        if (BxLogger.info(LOG_TAG5, "Consoles", RemotePlay.#CONSOLES), RemotePlay.#CONSOLES && RemotePlay.#CONSOLES.length > 0)
          STATES.supportedRegion && HeaderSection.showRemotePlayButton();
        RemotePlay.#renderConsoles(), BxEvent.dispatch(window, BxEvent.REMOTE_PLAY_READY);
      });
    });
  }
  static #renderConsoles() {
    const $fragment = CE("div", { class: "bx-remote-play-container" });
    if (!RemotePlay.#CONSOLES || RemotePlay.#CONSOLES.length === 0) {
      $fragment.appendChild(CE("span", {}, t("no-consoles-found"))), RemotePlay.#$content = CE("div", {}, $fragment);
      return;
    }
    const $settingNote = CE("p", {}), resolutions = [1080, 720], currentResolution = getPref("xhome_resolution"), $resolutionGroup = CE("div", {});
    for (let resolution of resolutions) {
      const value = `${resolution}p`, id2 = `bx_radio_xhome_resolution_${resolution}`, $radio = CE("input", {
        type: "radio",
        value,
        id: id2,
        name: "bx_radio_xhome_resolution"
      }, value);
      $radio.addEventListener("change", (e) => {
        const value2 = e.target.value;
        $settingNote.textContent = value2 === "1080p" ? "✅ " + t("can-stream-xbox-360-games") : "❌ " + t("cant-stream-xbox-360-games"), setPref("xhome_resolution", value2);
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
      setPref("xhome_resolution", resolution);
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
    if (!getPref("xhome_enabled") || !RemotePlay.isReady()) {
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
    if (!getPref("xhome_enabled"))
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
    const processPorts = (port) => {
      const ports = new Set;
      return ports.add(port), ports.add(9002), Array.from(ports);
    }, serverDetails = obj.serverDetails;
    if (serverDetails.ipAddress)
      XhomeInterceptor.#consoleAddrs[serverDetails.ipAddress] = processPorts(serverDetails.port);
    if (serverDetails.ipV4Address)
      XhomeInterceptor.#consoleAddrs[serverDetails.ipV4Address] = processPorts(serverDetails.ipV4Port);
    if (serverDetails.ipV6Address)
      XhomeInterceptor.#consoleAddrs[serverDetails.ipV6Address] = processPorts(serverDetails.ipV6Port);
    return response.json = () => Promise.resolve(obj), response.text = () => Promise.resolve(JSON.stringify(obj)), response;
  }
  static async#handleInputConfigs(request, opts) {
    const response = await NATIVE_FETCH(request);
    if (getPref("stream_touch_controller") !== "all")
      return response;
    const obj = await response.clone().json(), xboxTitleId = JSON.parse(opts.body).titleIds[0];
    TouchController.setXboxTitleId(xboxTitleId);
    const inputConfigs = obj[0];
    let hasTouchSupport = inputConfigs.supportedTabs.length > 0;
    if (!hasTouchSupport) {
      const supportedInputTypes = inputConfigs.supportedInputTypes;
      hasTouchSupport = supportedInputTypes.includes("NativeTouch") || supportedInputTypes.includes("CustomTouchOverlay");
    }
    if (hasTouchSupport)
      TouchController.disable(), BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED, {
        data: null
      });
    else
      TouchController.enable(), TouchController.requestCustomLayouts(xboxTitleId);
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
    if (getPref("xhome_resolution") === "720p")
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
    if (LoadingScreen.#setBackground(titleInfo.product.heroImageUrl || titleInfo.product.titledHeroImageUrl || titleInfo.product.tileImageUrl), getPref("ui_loading_screen_rocket") === "hide")
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
    if (getPref("ui_loading_screen_rocket") === "hide-queue")
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
    if (LoadingScreen.#orgWebTitle && (document.title = LoadingScreen.#orgWebTitle), LoadingScreen.#$waitTimeBox && LoadingScreen.#$waitTimeBox.classList.add("bx-gone"), getPref("ui_loading_screen_game_art") && LoadingScreen.#$bgStyle) {
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

var StreamBadgeIcon = {
  ["playtime"]: BxIcon.PLAYTIME,
  ["video"]: BxIcon.DISPLAY,
  ["battery"]: BxIcon.BATTERY,
  ["in"]: BxIcon.DOWNLOAD,
  ["out"]: BxIcon.UPLOAD,
  ["server"]: BxIcon.SERVER,
  ["audio"]: BxIcon.AUDIO
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
  setRegion(region3) {
    this.#region = region3;
  }
  #renderBadge(name, value, color) {
    let $badge;
    if (this.#cachedDoms[name])
      return $badge = this.#cachedDoms[name], $badge.lastElementChild.textContent = value, $badge;
    if ($badge = CE("div", { class: "bx-badge", title: t(`badge-${name}`) }, CE("span", { class: "bx-badge-name" }, createSvgIcon(StreamBadgeIcon[name])), CE("span", { class: "bx-badge-value", style: `background-color: ${color}` }, value)), name === "battery")
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
    if (STATES.browser.capabilities.batteryApi)
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
      ["in"]: totalIn ? this.#humanFileSize(totalIn) : null,
      ["out"]: totalOut ? this.#humanFileSize(totalOut) : null,
      ["playtime"]: playtime,
      ["battery"]: batteryLevel
    };
    let name;
    for (name in badges) {
      const value = badges[name];
      if (value === null)
        continue;
      const $elm = this.#cachedDoms[name];
      if ($elm && ($elm.lastElementChild.textContent = value), name === "battery")
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
    if (STATES.browser.capabilities.batteryApi)
      batteryLevel = "100%";
    let server = this.#region;
    server += "@" + (this.#ipv6 ? "IPv6" : "IPv4");
    const BADGES = [
      ["playtime", "1m", "#ff004d"],
      ["battery", batteryLevel, "#00b543"],
      ["in", this.#humanFileSize(0), "#29adff"],
      ["out", this.#humanFileSize(0), "#ff77a8"],
      ["server", server, "#ff6c24"],
      video ? ["video", video, "#742f29"] : null,
      audio ? ["audio", audio, "#5f574f"] : null
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
        STATES.browser.capabilities.batteryApi && navigator.getBattery().then((bm) => {
          streamBadges.startBatteryLevel = Math.round(bm.level * 100);
        });
      } catch (e2) {
      }
    });
  }
}

class XcloudInterceptor {
  static async#handleLogin(request, init) {
    const bypassServer = getPref("server_bypass_restriction");
    if (bypassServer !== "off") {
      const ip = BypassServerIps[bypassServer];
      ip && request.headers.set("X-Forwarded-For", ip);
    }
    const response = await NATIVE_FETCH(request, init);
    if (response.status !== 200)
      return BxEvent.dispatch(window, BxEvent.XCLOUD_SERVERS_UNAVAILABLE), response;
    const obj = await response.clone().json();
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
    }, serverRegex = /\/\/(\w+)\./;
    for (let region4 of obj.offeringSettings.regions) {
      const regionName = region4.name;
      let shortName = region4.name;
      if (region4.isDefault)
        STATES.selectedRegion = Object.assign({}, region4);
      let match = serverRegex.exec(region4.baseUri);
      if (match) {
        if (shortName = match[1], serverEmojis[regionName])
          shortName = serverEmojis[regionName] + " " + shortName;
      }
      region4.shortName = shortName.toUpperCase(), STATES.serverRegions[region4.name] = Object.assign({}, region4);
    }
    BxEvent.dispatch(window, BxEvent.XCLOUD_SERVERS_READY);
    const preferredRegion = getPreferredServerRegion();
    if (preferredRegion && preferredRegion in STATES.serverRegions) {
      const tmp = Object.assign({}, STATES.serverRegions[preferredRegion]);
      tmp.isDefault = !0, obj.offeringSettings.regions = [tmp], STATES.selectedRegion = tmp;
    }
    return STATES.gsToken = obj.gsToken, response.json = () => Promise.resolve(obj), response;
  }
  static async#handlePlay(request, init) {
    const PREF_STREAM_TARGET_RESOLUTION = getPref("stream_target_resolution"), PREF_STREAM_PREFERRED_LOCALE = getPref("stream_preferred_locale"), url = typeof request === "string" ? request : request.url, parsedUrl = new URL(url);
    let badgeRegion = parsedUrl.host.split(".", 1)[0];
    for (let regionName in STATES.serverRegions) {
      const region4 = STATES.serverRegions[regionName];
      if (parsedUrl.origin == region4.baseUri) {
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
    if (getPref("ui_loading_screen_wait_time")) {
      const json = await response.clone().json();
      if (json.estimatedAllocationTimeInSeconds > 0)
        LoadingScreen.setupWaitTime(json.estimatedTotalWaitTimeInSeconds);
    }
    return response;
  }
  static async#handleConfiguration(request, init) {
    if (request.method !== "GET")
      return NATIVE_FETCH(request, init);
    if (getPref("stream_touch_controller") === "all")
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
    if (getPref("native_mkb_enabled") === "on" || STATES.currentStream.titleInfo && BX_FLAGS.ForceNativeMkbTitles?.includes(STATES.currentStream.titleInfo.details.productId))
      overrideMkb = !0;
    if (getPref("native_mkb_enabled") === "off")
      overrideMkb = !1;
    if (overrideMkb !== null)
      overrides.inputConfiguration = Object.assign(overrides.inputConfiguration, {
        enableMouseInput: overrideMkb,
        enableKeyboardInput: overrideMkb
      });
    if (TouchController.isEnabled())
      overrides.inputConfiguration.enableTouchInput = !0, overrides.inputConfiguration.maxTouchPoints = 10;
    if (getPref("audio_mic_on_playing"))
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

function clearApplicationInsightsBuffers() {
  window.sessionStorage.removeItem("AI_buffer"), window.sessionStorage.removeItem("AI_sentBuffer");
}
function clearDbLogs(dbName, table) {
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
}
function clearAllLogs() {
  clearApplicationInsightsBuffers(), clearDbLogs("StreamClientLogHandler", "logs"), clearDbLogs("XCloudAppLogs", "logs");
}
function updateIceCandidates(candidates, options) {
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
    for (let ip in options.consoleAddrs)
      for (let port of options.consoleAddrs[ip])
        newCandidates.push(newCandidate(`a=candidate:${newCandidates.length + 1} 1 UDP 1 ${ip} ${port} typ host`));
  return newCandidates.push(newCandidate("a=end-of-candidates")), BxLogger.info("ICE Candidates", newCandidates), newCandidates;
}
async function patchIceCandidates(request, consoleAddrs) {
  const response = await NATIVE_FETCH(request), text = await response.clone().text();
  if (!text.length)
    return response;
  const options = {
    preferIpv6Server: getPref("prefer_ipv6_server"),
    consoleAddrs
  }, obj = JSON.parse(text);
  let exchangeResponse = JSON.parse(obj.exchangeResponse);
  return exchangeResponse = updateIceCandidates(exchangeResponse, options), obj.exchangeResponse = JSON.stringify(exchangeResponse), response.json = () => Promise.resolve(obj), response.text = () => Promise.resolve(JSON.stringify(obj)), response;
}
function interceptHttpRequests() {
  let BLOCKED_URLS = [];
  if (getPref("block_tracking"))
    clearAllLogs(), BLOCKED_URLS = BLOCKED_URLS.concat([
      "https://arc.msn.com",
      "https://browser.events.data.microsoft.com",
      "https://dc.services.visualstudio.com",
      "https://2c06dea3f26c40c69b8456d319791fd0@o427368.ingest.sentry.io"
    ]);
  if (getPref("block_social_features"))
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
        if (json && json.exp && json.exp.treatments)
          for (let key in FeatureGates)
            json.exp.treatments[key] = FeatureGates[key];
        return response.json = () => Promise.resolve(json), response;
      } catch (e) {
        console.log(e);
      }
    if (STATES.userAgent.capabilities.touch && url.includes("catalog.gamepass.com/sigls/")) {
      const response = await NATIVE_FETCH(request, init), obj = await response.clone().json();
      if (url.includes("29a81209-df6f-41fd-a528-2ae6b91f719c"))
        for (let i = 1;i < obj.length; i++)
          gamepassAllGames.push(obj[i].id);
      else if (url.includes("9c86f07a-f3e8-45ad-82a0-a1f759597059"))
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
    if (BX_FLAGS.ForceNativeMkbTitles && url.includes("catalog.gamepass.com/sigls/") && url.includes("8fa264dd-124f-4af3-97e8-596fcdf4b486")) {
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
      requestType = "xhome";
    else
      requestType = "xcloud";
    if (requestType === "xhome")
      return XhomeInterceptor.handle(request);
    return XcloudInterceptor.handle(request, init);
  };
}

function showGamepadToast(gamepad) {
  if (gamepad.id === EmulatedMkbHandler.VIRTUAL_GAMEPAD_ID)
    return;
  BxLogger.info("Gamepad", gamepad);
  let text = "🎮";
  if (getPref("local_co_op_enabled"))
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

function addCss() {
  let css = `:root{--bx-title-font:Bahnschrift,Arial,Helvetica,sans-serif;--bx-title-font-semibold:Bahnschrift Semibold,Arial,Helvetica,sans-serif;--bx-normal-font:"Segoe UI",Arial,Helvetica,sans-serif;--bx-monospaced-font:Consolas,"Courier New",Courier,monospace;--bx-promptfont-font:promptfont;--bx-button-height:40px;--bx-default-button-color:#2d3036;--bx-default-button-rgb:45,48,54;--bx-default-button-hover-color:#515863;--bx-default-button-hover-rgb:81,88,99;--bx-default-button-active-color:#222428;--bx-default-button-active-rgb:34,36,40;--bx-default-button-disabled-color:#8e8e8e;--bx-default-button-disabled-rgb:142,142,142;--bx-primary-button-color:#008746;--bx-primary-button-rgb:0,135,70;--bx-primary-button-hover-color:#04b358;--bx-primary-button-hover-rgb:4,179,88;--bx-primary-button-active-color:#044e2a;--bx-primary-button-active-rgb:4,78,42;--bx-primary-button-disabled-color:#448262;--bx-primary-button-disabled-rgb:68,130,98;--bx-danger-button-color:#c10404;--bx-danger-button-rgb:193,4,4;--bx-danger-button-hover-color:#e61d1d;--bx-danger-button-hover-rgb:230,29,29;--bx-danger-button-active-color:#a26c6c;--bx-danger-button-active-rgb:162,108,108;--bx-danger-button-disabled-color:#df5656;--bx-danger-button-disabled-rgb:223,86,86;--bx-fullscreen-text-z-index:9999;--bx-toast-z-index:6000;--bx-dialog-z-index:5000;--bx-dialog-overlay-z-index:4020;--bx-stats-bar-z-index:4010;--bx-mkb-pointer-lock-msg-z-index:4000;--bx-navigation-dialog-z-index:3010;--bx-navigation-dialog-overlay-z-index:3000;--bx-remote-play-popup-z-index:2000;--bx-game-bar-z-index:1000;--bx-wait-time-box-z-index:100;--bx-screenshot-animation-z-index:10}@font-face{font-family:'promptfont';src:url("https://redphx.github.io/better-xcloud/fonts/promptfont.otf")}div[class^=HUDButton-module__hiddenContainer] ~ div:not([class^=HUDButton-module__hiddenContainer]){opacity:0;pointer-events:none !important;position:absolute;top:-9999px;left:-9999px}@media screen and (max-width:600px){header a[href="/play"]{display:none}}.bx-full-width{width:100% !important}.bx-full-height{height:100% !important}.bx-no-scroll{overflow:hidden !important}.bx-hide-scroll-bar{scrollbar-width:none}.bx-hide-scroll-bar::-webkit-scrollbar{display:none}.bx-gone{display:none !important}.bx-offscreen{position:absolute !important;top:-9999px !important;left:-9999px !important;visibility:hidden !important}.bx-hidden{visibility:hidden !important}.bx-invisible{opacity:0}.bx-unclickable{pointer-events:none}.bx-pixel{width:1px !important;height:1px !important}.bx-no-margin{margin:0 !important}.bx-no-padding{padding:0 !important}.bx-prompt{font-family:var(--bx-promptfont-font)}.bx-line-through{text-decoration:line-through !important}.bx-normal-case{text-transform:none !important}select[multiple]{overflow:auto}#headerArea,#uhfSkipToMain,.uhf-footer{display:none}div[class*=NotFocusedDialog]{position:absolute !important;top:-9999px !important;left:-9999px !important;width:0 !important;height:0 !important}#game-stream video:not([src]){visibility:hidden}div[class*=SupportedInputsBadge]:not(:has(:nth-child(2))),div[class*=SupportedInputsBadge] svg:first-of-type{display:none}.bx-game-tile-wait-time{position:absolute;top:0;left:0;z-index:1;background:rgba(0,0,0,0.549);display:none;border-radius:0 0 4px 0;align-items:center;padding:4px 8px}a[class^=BaseItem-module__container]:focus .bx-game-tile-wait-time,button[class^=BaseItem-module__container]:focus .bx-game-tile-wait-time{display:flex}.bx-game-tile-wait-time svg{width:14px;height:16px;margin-right:2px}.bx-game-tile-wait-time span{display:inline-block;height:16px;line-height:16px;font-size:12px;font-weight:bold}.bx-fullscreen-text{position:fixed;top:0;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);z-index:var(--bx-fullscreen-text-z-index);line-height:100vh;color:#fff;text-align:center;font-weight:400;font-family:var(--bx-normal-font);font-size:1.3rem;user-select:none;-webkit-user-select:none}#root section[class*=DeviceCodePage-module__page]{margin-left:20px !important;margin-right:20px !important;margin-top:20px !important;max-width:800px !important}#root div[class*=DeviceCodePage-module__back]{display:none}.bx-button{--button-rgb:var(--bx-default-button-rgb);--button-hover-rgb:var(--bx-default-button-hover-rgb);--button-active-rgb:var(--bx-default-button-active-rgb);--button-disabled-rgb:var(--bx-default-button-disabled-rgb);background-color:rgb(var(--button-rgb));user-select:none;-webkit-user-select:none;color:#fff;font-family:var(--bx-title-font-semibold);font-size:14px;border:none;font-weight:400;height:var(--bx-button-height);border-radius:4px;padding:0 8px;text-transform:uppercase;cursor:pointer;overflow:hidden}.bx-button:not([disabled]):active{background-color:rgb(var(--button-active-rgb))}.bx-button:focus{outline:none !important}.bx-button:not([disabled]):not(:active):hover,.bx-button:not([disabled]):not(:active).bx-focusable:focus{background-color:rgb(var(--button-hover-rgb))}.bx-button:disabled{cursor:default;background-color:rgb(var(--button-disabled-rgb))}.bx-button.bx-ghost{background-color:transparent}.bx-button.bx-ghost:not([disabled]):not(:active):hover,.bx-button.bx-ghost:not([disabled]):not(:active).bx-focusable:focus{background-color:rgb(var(--button-hover-rgb))}.bx-button.bx-primary{--button-rgb:var(--bx-primary-button-rgb)}.bx-button.bx-primary:not([disabled]):active{--button-active-rgb:var(--bx-primary-button-active-rgb)}.bx-button.bx-primary:not([disabled]):not(:active):hover,.bx-button.bx-primary:not([disabled]):not(:active).bx-focusable:focus{--button-hover-rgb:var(--bx-primary-button-hover-rgb)}.bx-button.bx-primary:disabled{--button-disabled-rgb:var(--bx-primary-button-disabled-rgb)}.bx-button.bx-danger{--button-rgb:var(--bx-danger-button-rgb)}.bx-button.bx-danger:not([disabled]):active{--button-active-rgb:var(--bx-danger-button-active-rgb)}.bx-button.bx-danger:not([disabled]):not(:active):hover,.bx-button.bx-danger:not([disabled]):not(:active).bx-focusable:focus{--button-hover-rgb:var(--bx-danger-button-hover-rgb)}.bx-button.bx-danger:disabled{--button-disabled-rgb:var(--bx-danger-button-disabled-rgb)}.bx-button.bx-frosted{--button-alpha:.2;background-color:rgba(var(--button-rgb), var(--button-alpha));backdrop-filter:blur(4px) brightness(1.5)}.bx-button.bx-frosted:not([disabled]):not(:active):hover,.bx-button.bx-frosted:not([disabled]):not(:active).bx-focusable:focus{background-color:rgba(var(--button-hover-rgb), var(--button-alpha))}.bx-button.bx-drop-shadow{box-shadow:0 0 4px rgba(0,0,0,0.502)}.bx-button.bx-tall{height:calc(var(--bx-button-height) * 1.5) !important}.bx-button.bx-circular{border-radius:var(--bx-button-height);height:var(--bx-button-height)}.bx-button svg{display:inline-block;width:16px;height:var(--bx-button-height)}.bx-button span{display:inline-block;line-height:var(--bx-button-height);vertical-align:middle;color:#fff;overflow:hidden;white-space:nowrap}.bx-button span:not(:only-child){margin-left:10px}.bx-focusable{position:relative;overflow:visible}.bx-focusable::after{border:2px solid transparent;border-radius:10px}.bx-focusable:focus::after{content:'';border-color:#fff;position:absolute;top:-6px;left:-6px;right:-6px;bottom:-6px}body[data-input-mode=Touch] .bx-focusable:focus::after,body[data-input-mode=Mouse] .bx-focusable:focus::after{border-color:transparent !important}.bx-focusable.bx-circular::after{border-radius:var(--bx-button-height)}a.bx-button{display:inline-block}a.bx-button.bx-full-width{text-align:center}button.bx-inactive{pointer-events:none;opacity:.2;background:transparent !important}.bx-button-shortcut{max-width:max-content;margin:10px 0 0 0;flex:1 0 auto}@media (min-width:568px) and (max-height:480px){.bx-button-shortcut{margin:8px 0 0 10px}}.bx-header-remote-play-button{height:auto;margin-right:8px !important}.bx-header-remote-play-button svg{width:24px;height:24px}.bx-header-settings-button{line-height:30px;font-size:14px;text-transform:uppercase;position:relative}.bx-header-settings-button[data-update-available]::before{content:'🌟' !important;line-height:var(--bx-button-height);display:inline-block;margin-left:4px}.bx-dialog-overlay{position:fixed;inset:0;z-index:var(--bx-dialog-overlay-z-index);background:#000;opacity:50%}.bx-dialog{display:flex;flex-flow:column;max-height:90vh;position:fixed;top:50%;left:50%;margin-right:-50%;transform:translate(-50%,-50%);min-width:420px;padding:20px;border-radius:8px;z-index:var(--bx-dialog-z-index);background:#1a1b1e;color:#fff;font-weight:400;font-size:16px;font-family:var(--bx-normal-font);box-shadow:0 0 6px #000;user-select:none;-webkit-user-select:none}.bx-dialog *:focus{outline:none !important}.bx-dialog h2{display:flex;margin-bottom:12px}.bx-dialog h2 b{flex:1;color:#fff;display:block;font-family:var(--bx-title-font);font-size:26px;font-weight:400;line-height:var(--bx-button-height)}.bx-dialog.bx-binding-dialog h2 b{font-family:var(--bx-promptfont-font) !important}.bx-dialog > div{overflow:auto;padding:2px 0}.bx-dialog > button{padding:8px 32px;margin:10px auto 0;border:none;border-radius:4px;display:block;background-color:#2d3036;text-align:center;color:#fff;text-transform:uppercase;font-family:var(--bx-title-font);font-weight:400;line-height:18px;font-size:14px}@media (hover:hover){.bx-dialog > button:hover{background-color:#515863}}.bx-dialog > button:focus{background-color:#515863}@media screen and (max-width:450px){.bx-dialog{min-width:100%}}.bx-navigation-dialog{position:absolute;z-index:var(--bx-navigation-dialog-z-index)}.bx-navigation-dialog-overlay{position:fixed;background:rgba(11,11,11,0.89);top:0;left:0;right:0;bottom:0;z-index:var(--bx-navigation-dialog-overlay-z-index)}.bx-navigation-dialog-overlay[data-is-playing="true"]{background:transparent}.bx-settings-dialog{display:flex;position:fixed;top:0;right:0;bottom:0;opacity:.98;user-select:none;-webkit-user-select:none}.bx-settings-dialog .bx-focusable::after{border-radius:4px}.bx-settings-dialog .bx-focusable:focus::after{top:0;left:0;right:0;bottom:0}.bx-settings-dialog .bx-settings-reload-note{font-size:.8rem;display:block;padding:8px;font-style:italic;font-weight:normal;height:var(--bx-button-height)}.bx-settings-tabs-container{position:fixed;width:48px;max-height:100vh;display:flex;flex-direction:column}.bx-settings-tabs-container > div:last-of-type{display:flex;flex-direction:column;align-items:end}.bx-settings-tabs-container > div:last-of-type button{flex-shrink:0;border-top-right-radius:0;border-bottom-right-radius:0;margin-top:8px;height:unset;padding:8px 10px}.bx-settings-tabs-container > div:last-of-type button svg{width:16px;height:16px}.bx-settings-tabs{display:flex;flex-direction:column;border-radius:0 0 0 8px;box-shadow:0 0 6px #000;overflow:overlay;flex:1}.bx-settings-tabs svg{width:24px;height:24px;padding:10px;flex-shrink:0;box-sizing:content-box;background:#131313;cursor:pointer;border-left:4px solid #1e1e1e}.bx-settings-tabs svg.bx-active{background:#222;border-color:#008746}.bx-settings-tabs svg:not(.bx-active):hover{background:#2f2f2f;border-color:#484848}.bx-settings-tabs svg:focus{border-color:#fff;outline:none}.bx-settings-tabs svg[data-group=global][data-need-refresh=true]{background:var(--bx-danger-button-color) !important}.bx-settings-tabs svg[data-group=global][data-need-refresh=true]:hover{background:var(--bx-danger-button-hover-color) !important}.bx-settings-tab-contents{flex-direction:column;padding:10px;margin-left:48px;width:450px;max-width:calc(100vw - tabsWidth);background:#1a1b1e;color:#fff;font-weight:400;font-size:16px;font-family:var(--bx-title-font);text-align:center;box-shadow:0 0 6px #000;overflow:overlay;z-index:1}.bx-settings-tab-contents > div[data-tab-group=mkb]{display:flex;flex-direction:column;height:100%;overflow:hidden}.bx-settings-tab-contents > div[data-tab-group=shortcuts] > div[data-has-gamepad=true] > div:first-of-type{display:none}.bx-settings-tab-contents > div[data-tab-group=shortcuts] > div[data-has-gamepad=true] > div:last-of-type{display:block}.bx-settings-tab-contents > div[data-tab-group=shortcuts] > div[data-has-gamepad=false] > div:first-of-type{display:block}.bx-settings-tab-contents > div[data-tab-group=shortcuts] > div[data-has-gamepad=false] > div:last-of-type{display:none}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-profile{width:100%;height:36px;display:block}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-note{margin-top:10px;font-size:14px}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row{display:flex;margin-bottom:10px}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row label.bx-prompt{flex:1;font-size:26px;margin-bottom:0}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row .bx-shortcut-actions{flex:2;position:relative}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row .bx-shortcut-actions select{position:absolute;width:100%;height:100%;display:block}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row .bx-shortcut-actions select:last-of-type{opacity:0;z-index:calc(var(--bx-settings-z-index) + 1)}.bx-settings-tab-contents:focus,.bx-settings-tab-contents *:focus{outline:none !important}.bx-settings-tab-contents .bx-top-buttons{display:flex;flex-direction:column;gap:8px;margin-bottom:8px}.bx-settings-tab-contents .bx-top-buttons .bx-button{display:block}.bx-settings-tab-contents h2{margin:16px 0 8px 0;display:flex;align-items:center}.bx-settings-tab-contents h2:first-of-type{margin-top:0}.bx-settings-tab-contents h2 span{display:inline-block;font-size:20px;font-weight:bold;text-align:left;flex:1;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}@media (max-width:500px){.bx-settings-tab-contents{width:calc(100vw - 48px)}}.bx-settings-row{display:flex;gap:10px;border-bottom:1px solid #2c2c2e;padding:16px 8px;margin:0;border-left:2px solid transparent}.bx-settings-row:hover,.bx-settings-row:focus-within{background-color:#242424}.bx-settings-row:not(:has(> input[type=checkbox])){flex-wrap:wrap}.bx-settings-row input[type=checkbox]:focus,.bx-settings-row select:focus{filter:drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff)}.bx-settings-row:has(input:focus),.bx-settings-row:has(select:focus),.bx-settings-row:has(button:focus){border-left-color:#fff}.bx-settings-row > span.bx-settings-label{font-size:14px;display:block;text-align:left;align-self:center;margin-bottom:0 !important}.bx-settings-row > span.bx-settings-label + *{margin:0 0 0 auto}.bx-settings-row input{accent-color:var(--bx-primary-button-color)}.bx-settings-row input:focus{accent-color:var(--bx-danger-button-color)}.bx-settings-row select:disabled{-webkit-appearance:none;background:transparent;text-align-last:right;border:none;color:#fff}.bx-settings-row select option:disabled{display:none}.bx-settings-dialog-note{display:block;color:#afafb0;font-size:12px;font-weight:lighter;font-style:italic}.bx-settings-dialog-note:not(:has(a)){margin-top:4px}.bx-settings-dialog-note a{display:inline-block;padding:4px}.bx-settings-custom-user-agent{display:block;width:100%;padding:6px}.bx-donation-link{display:block;text-align:center;text-decoration:none;height:20px;line-height:20px;font-size:14px;margin-top:10px;color:#5dc21e}.bx-donation-link:hover{color:#6dd72b}.bx-donation-link:focus{text-decoration:underline}.bx-debug-info button{margin-top:10px}.bx-debug-info pre{margin-top:10px;cursor:copy;color:#fff;padding:8px;border:1px solid #2d2d2d;background:#212121;white-space:break-spaces;text-align:left}.bx-debug-info pre:hover{background:#272727}.bx-settings-app-version{margin-top:10px;text-align:center;color:#747474;font-size:12px}.bx-note-unsupported{display:block;font-size:12px;font-style:italic;font-weight:normal;color:#828282}.bx-toast{user-select:none;-webkit-user-select:none;position:fixed;left:50%;top:24px;transform:translate(-50%,0);background:#000;border-radius:16px;color:#fff;z-index:var(--bx-toast-z-index);font-family:var(--bx-normal-font);border:2px solid #fff;display:flex;align-items:center;opacity:0;overflow:clip;transition:opacity .2s ease-in}.bx-toast.bx-show{opacity:.85}.bx-toast.bx-hide{opacity:0;pointer-events:none}.bx-toast-msg{font-size:14px;display:inline-block;padding:12px 16px;white-space:pre}.bx-toast-status{font-weight:bold;font-size:14px;text-transform:uppercase;display:inline-block;background:#515863;padding:12px 16px;color:#fff;white-space:pre}.bx-wait-time-box{position:fixed;top:0;right:0;background-color:rgba(0,0,0,0.8);color:#fff;z-index:var(--bx-wait-time-box-z-index);padding:12px;border-radius:0 0 0 8px}.bx-wait-time-box label{display:block;text-transform:uppercase;text-align:right;font-size:12px;font-weight:bold;margin:0}.bx-wait-time-box span{display:block;font-family:var(--bx-monospaced-font);text-align:right;font-size:16px;margin-bottom:10px}.bx-wait-time-box span:last-of-type{margin-bottom:0}.bx-remote-play-popup{width:100%;max-width:1920px;margin:auto;position:relative;height:.1px;overflow:visible;z-index:var(--bx-remote-play-popup-z-index)}.bx-remote-play-container{position:absolute;right:10px;top:0;background:#1a1b1e;border-radius:10px;width:420px;max-width:calc(100vw - 20px);margin:0 0 0 auto;padding:20px;box-shadow:rgba(0,0,0,0.502) 0 0 12px 0}@media (min-width:480px) and (min-height:calc(480px + 1px)){.bx-remote-play-container{right:calc(env(safe-area-inset-right, 0px) + 32px)}}@media (min-width:768px) and (min-height:calc(480px + 1px)){.bx-remote-play-container{right:calc(env(safe-area-inset-right, 0px) + 48px)}}@media (min-width:1920px) and (min-height:calc(480px + 1px)){.bx-remote-play-container{right:calc(env(safe-area-inset-right, 0px) + 80px)}}.bx-remote-play-container > .bx-button{display:table;margin:0 0 0 auto}.bx-remote-play-settings{margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #2d2d2d}.bx-remote-play-settings > div{display:flex}.bx-remote-play-settings label{flex:1}.bx-remote-play-settings label p{margin:4px 0 0;padding:0;color:#888;font-size:12px}.bx-remote-play-settings span{font-weight:bold;font-size:18px;display:block;margin-bottom:8px;text-align:center}.bx-remote-play-resolution{display:block}.bx-remote-play-resolution input[type="radio"]{accent-color:var(--bx-primary-button-color);margin-right:6px}.bx-remote-play-resolution input[type="radio"]:focus{accent-color:var(--bx-primary-button-hover-color)}.bx-remote-play-device-wrapper{display:flex;margin-bottom:12px}.bx-remote-play-device-wrapper:last-child{margin-bottom:2px}.bx-remote-play-device-info{flex:1;padding:4px 0}.bx-remote-play-device-name{font-size:20px;font-weight:bold;display:inline-block;vertical-align:middle}.bx-remote-play-console-type{font-size:12px;background:#004c87;color:#fff;display:inline-block;border-radius:14px;padding:2px 10px;margin-left:8px;vertical-align:middle}.bx-remote-play-power-state{color:#888;font-size:14px}.bx-remote-play-connect-button{min-height:100%;margin:4px 0}.bx-select{display:flex;align-items:center;flex:0 1 auto}.bx-select select{display:none !important}.bx-select > div,.bx-select button.bx-select-value{min-width:110px;text-align:center;margin:0 8px;line-height:24px;vertical-align:middle;background:#fff;color:#000;border-radius:4px;padding:2px 8px;flex:1}.bx-select > div{display:inline-block}.bx-select > div input{display:inline-block;margin-right:8px}.bx-select > div label{margin-bottom:0;font-size:14px;width:100%}.bx-select > div label span{display:block;font-size:10px;font-weight:bold;text-align:left;line-height:initial}.bx-select button.bx-select-value{border:none;display:inline-flex;cursor:pointer;min-height:30px;font-size:.9rem;align-items:center}.bx-select button.bx-select-value span{flex:1;text-align:center;display:inline-block}.bx-select button.bx-select-value input{margin:0 4px;accent-color:var(--bx-primary-button-color)}.bx-select button.bx-select-value:hover input,.bx-select button.bx-select-value:focus input{accent-color:var(--bx-danger-button-color)}.bx-select button.bx-select-value:hover::after,.bx-select button.bx-select-value:focus::after{border-color:#4d4d4d !important}.bx-select button.bx-button{border:none;height:24px;width:24px;padding:0;line-height:24px;color:#fff;border-radius:4px;font-weight:bold;font-size:12px;font-family:var(--bx-monospaced-font);flex-shrink:0}.bx-select button.bx-button span{line-height:unset}div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]{overflow:visible}.bx-stream-menu-button-on{fill:#000 !important;background-color:#2d2d2d !important;color:#000 !important}.bx-stream-refresh-button{top:calc(env(safe-area-inset-top, 0px) + 10px + 50px) !important}body[data-media-type=default] .bx-stream-refresh-button{left:calc(env(safe-area-inset-left, 0px) + 11px) !important}body[data-media-type=tv] .bx-stream-refresh-button{top:calc(var(--gds-focus-borderSize) + 80px) !important}.bx-stream-home-button{top:calc(env(safe-area-inset-top, 0px) + 10px + 50px * 2) !important}body[data-media-type=default] .bx-stream-home-button{left:calc(env(safe-area-inset-left, 0px) + 12px) !important}body[data-media-type=tv] .bx-stream-home-button{top:calc(var(--gds-focus-borderSize) + 80px * 2) !important}div[data-testid=media-container]{display:flex}div[data-testid=media-container].bx-taking-screenshot:before{animation:bx-anim-taking-screenshot .5s ease;content:' ';position:absolute;width:100%;height:100%;z-index:var(--bx-screenshot-animation-z-index)}#game-stream video{margin:auto;align-self:center;background:#000}#game-stream canvas{position:absolute;align-self:center;margin:auto;left:0;right:0}#gamepass-dialog-root div[class^=Guide-module__guide] .bx-button{overflow:visible;margin-bottom:12px}@-moz-keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}@-webkit-keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}@-o-keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}@keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}.bx-number-stepper{text-align:center}.bx-number-stepper span{display:inline-block;min-width:40px;font-family:var(--bx-monospaced-font);font-size:12px;margin:0 4px}.bx-number-stepper button{border:none;width:24px;height:24px;margin:0;line-height:24px;background-color:var(--bx-default-button-color);color:#fff;border-radius:4px;font-weight:bold;font-size:14px;font-family:var(--bx-monospaced-font)}@media (hover:hover){.bx-number-stepper button:hover{background-color:var(--bx-default-button-hover-color)}}.bx-number-stepper button:active{background-color:var(--bx-default-button-hover-color)}.bx-number-stepper button:disabled + span{font-family:var(--bx-title-font)}.bx-number-stepper input[type="range"]{display:block;margin:12px auto 2px;width:180px;color:#959595 !important}.bx-number-stepper input[type=range]:disabled,.bx-number-stepper button:disabled{display:none}.bx-number-stepper[data-disabled=true] input[type=range],.bx-number-stepper[data-disabled=true] button{display:none}#bx-game-bar{z-index:var(--bx-game-bar-z-index);position:fixed;bottom:0;width:40px;height:90px;overflow:visible;cursor:pointer}#bx-game-bar > svg{display:none;pointer-events:none;position:absolute;height:28px;margin-top:16px}@media (hover:hover){#bx-game-bar:hover > svg{display:block}}#bx-game-bar .bx-game-bar-container{opacity:0;position:absolute;display:flex;overflow:hidden;background:rgba(26,27,30,0.91);box-shadow:0 0 6px #1c1c1c;transition:opacity .1s ease-in}#bx-game-bar .bx-game-bar-container.bx-show{opacity:.9}#bx-game-bar .bx-game-bar-container.bx-show + svg{display:none !important}#bx-game-bar .bx-game-bar-container.bx-hide{opacity:0;pointer-events:none}#bx-game-bar .bx-game-bar-container button{width:60px;height:60px;border-radius:0}#bx-game-bar .bx-game-bar-container button svg{width:28px;height:28px;transition:transform .08s ease 0s}#bx-game-bar .bx-game-bar-container button:hover{border-radius:0}#bx-game-bar .bx-game-bar-container button:active svg{transform:scale(.75)}#bx-game-bar .bx-game-bar-container button.bx-activated{background-color:#fff}#bx-game-bar .bx-game-bar-container button.bx-activated svg{filter:invert(1)}#bx-game-bar .bx-game-bar-container div[data-enabled] button{display:none}#bx-game-bar .bx-game-bar-container div[data-enabled='true'] button:first-of-type{display:block}#bx-game-bar .bx-game-bar-container div[data-enabled='false'] button:last-of-type{display:block}#bx-game-bar[data-position="bottom-left"]{left:0;direction:ltr}#bx-game-bar[data-position="bottom-left"] .bx-game-bar-container{border-radius:0 10px 10px 0}#bx-game-bar[data-position="bottom-right"]{right:0;direction:rtl}#bx-game-bar[data-position="bottom-right"] .bx-game-bar-container{direction:ltr;border-radius:10px 0 0 10px}.bx-badges{margin-left:0;user-select:none;-webkit-user-select:none}.bx-badge{border:none;display:inline-block;line-height:24px;color:#fff;font-family:var(--bx-title-font-semibold);font-size:14px;font-weight:400;margin:0 8px 8px 0;box-shadow:0 0 6px #000;border-radius:4px}.bx-badge-name{background-color:#2d3036;border-radius:4px 0 0 4px}.bx-badge-name svg{width:16px;height:16px}.bx-badge-value{background-color:#808080;border-radius:0 4px 4px 0}.bx-badge-name,.bx-badge-value{display:inline-block;padding:0 8px;line-height:30px;vertical-align:bottom}.bx-badge-battery[data-charging=true] span:first-of-type::after{content:' ⚡️'}div[class^=StreamMenu-module__container] .bx-badges{position:absolute;max-width:500px}#gamepass-dialog-root .bx-badges{position:fixed;top:60px;left:460px;max-width:500px}@media (min-width:568px) and (max-height:480px){#gamepass-dialog-root .bx-badges{position:unset;top:unset;left:unset;margin:8px 0}}.bx-stats-bar{display:block;user-select:none;-webkit-user-select:none;position:fixed;top:0;background-color:#000;color:#fff;font-family:var(--bx-monospaced-font);font-size:.9rem;padding-left:8px;z-index:var(--bx-stats-bar-z-index);text-wrap:nowrap}.bx-stats-bar[data-stats*="[fps]"] > .bx-stat-fps,.bx-stats-bar[data-stats*="[ping]"] > .bx-stat-ping,.bx-stats-bar[data-stats*="[btr]"] > .bx-stat-btr,.bx-stats-bar[data-stats*="[dt]"] > .bx-stat-dt,.bx-stats-bar[data-stats*="[pl]"] > .bx-stat-pl,.bx-stats-bar[data-stats*="[fl]"] > .bx-stat-fl{display:inline-block}.bx-stats-bar[data-stats$="[fps]"] > .bx-stat-fps,.bx-stats-bar[data-stats$="[ping]"] > .bx-stat-ping,.bx-stats-bar[data-stats$="[btr]"] > .bx-stat-btr,.bx-stats-bar[data-stats$="[dt]"] > .bx-stat-dt,.bx-stats-bar[data-stats$="[pl]"] > .bx-stat-pl,.bx-stats-bar[data-stats$="[fl]"] > .bx-stat-fl{margin-right:0;border-right:none}.bx-stats-bar::before{display:none;content:'👀';vertical-align:middle;margin-right:8px}.bx-stats-bar[data-display=glancing]::before{display:inline-block}.bx-stats-bar[data-position=top-left]{left:0;border-radius:0 0 4px 0}.bx-stats-bar[data-position=top-right]{right:0;border-radius:0 0 0 4px}.bx-stats-bar[data-position=top-center]{transform:translate(-50%,0);left:50%;border-radius:0 0 4px 4px}.bx-stats-bar[data-transparent=true]{background:none;filter:drop-shadow(1px 0 0 rgba(0,0,0,0.941)) drop-shadow(-1px 0 0 rgba(0,0,0,0.941)) drop-shadow(0 1px 0 rgba(0,0,0,0.941)) drop-shadow(0 -1px 0 rgba(0,0,0,0.941))}.bx-stats-bar > div{display:none;margin-right:8px;border-right:1px solid #fff;padding-right:8px}.bx-stats-bar label{margin:0 8px 0 0;font-family:var(--bx-title-font);font-size:inherit;font-weight:bold;vertical-align:middle;cursor:help}.bx-stats-bar span{min-width:60px;display:inline-block;text-align:right;vertical-align:middle}.bx-stats-bar span[data-grade=good]{color:#6bffff}.bx-stats-bar span[data-grade=ok]{color:#fff16b}.bx-stats-bar span[data-grade=bad]{color:#ff5f5f}.bx-stats-bar span:first-of-type{min-width:22px}.bx-mkb-settings{display:flex;flex-direction:column;flex:1;padding-bottom:10px;overflow:hidden}.bx-mkb-settings select:disabled{-webkit-appearance:none;background:transparent;text-align-last:right;text-align:right;border:none;color:#fff}.bx-mkb-pointer-lock-msg{user-select:none;-webkit-user-select:none;position:fixed;left:50%;top:50%;transform:translateX(-50%) translateY(-50%);margin:auto;background:#151515;z-index:var(--bx-mkb-pointer-lock-msg-z-index);color:#fff;text-align:center;font-weight:400;font-family:"Segoe UI",Arial,Helvetica,sans-serif;font-size:1.3rem;padding:12px;border-radius:8px;align-items:center;box-shadow:0 0 6px #000;min-width:220px;opacity:.9}.bx-mkb-pointer-lock-msg:hover{opacity:1}.bx-mkb-pointer-lock-msg > div:first-of-type{display:flex;flex-direction:column;text-align:left}.bx-mkb-pointer-lock-msg p{margin:0}.bx-mkb-pointer-lock-msg p:first-child{font-size:22px;margin-bottom:4px;font-weight:bold}.bx-mkb-pointer-lock-msg p:last-child{font-size:12px;font-style:italic}.bx-mkb-pointer-lock-msg > div:last-of-type{margin-top:10px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='native'] button:first-of-type{margin-bottom:8px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div{display:flex;flex-flow:row;margin-top:8px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div button{flex:1}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div button:first-of-type{margin-right:5px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div button:last-of-type{margin-left:5px}.bx-mkb-preset-tools{display:flex;margin-bottom:12px}.bx-mkb-preset-tools select{flex:1}.bx-mkb-preset-tools button{margin-left:6px}.bx-mkb-settings-rows{flex:1;overflow:scroll}.bx-mkb-key-row{display:flex;margin-bottom:10px;align-items:center}.bx-mkb-key-row label{margin-bottom:0;font-family:var(--bx-promptfont-font);font-size:26px;text-align:center;width:26px;height:32px;line-height:32px}.bx-mkb-key-row button{flex:1;height:32px;line-height:32px;margin:0 0 0 10px;background:transparent;border:none;color:#fff;border-radius:0;border-left:1px solid #373737}.bx-mkb-key-row button:hover{background:transparent;cursor:default}.bx-mkb-settings.bx-editing .bx-mkb-key-row button{background:#393939;border-radius:4px;border:none}.bx-mkb-settings.bx-editing .bx-mkb-key-row button:hover{background:#333;cursor:pointer}.bx-mkb-action-buttons > div{text-align:right;display:none}.bx-mkb-action-buttons button{margin-left:8px}.bx-mkb-settings:not(.bx-editing) .bx-mkb-action-buttons > div:first-child{display:block}.bx-mkb-settings.bx-editing .bx-mkb-action-buttons > div:last-child{display:block}.bx-mkb-note{display:block;margin:16px 0 10px;font-size:12px}.bx-mkb-note:first-of-type{margin-top:0}`;
  const PREF_HIDE_SECTIONS = getPref("ui_hide_sections"), selectorToHide = [];
  if (PREF_HIDE_SECTIONS.includes("news"))
    selectorToHide.push("#BodyContent > div[class*=CarouselRow-module]");
  if (PREF_HIDE_SECTIONS.includes("all-games"))
    selectorToHide.push("#BodyContent div[class*=AllGamesRow-module__gridContainer]"), selectorToHide.push("#BodyContent div[class*=AllGamesRow-module__rowHeader]");
  if (PREF_HIDE_SECTIONS.includes("most-popular"))
    selectorToHide.push('#BodyContent div[class*=HomePage-module__bottomSpacing]:has(a[href="/play/gallery/popular"])');
  if (PREF_HIDE_SECTIONS.includes("touch"))
    selectorToHide.push('#BodyContent div[class*=HomePage-module__bottomSpacing]:has(a[href="/play/gallery/touch"])');
  if (getPref("block_social_features"))
    selectorToHide.push("#gamepass-dialog-root div[class^=AchievementsPreview-module__container] + button[class*=HomeLandingPage-module__button]");
  if (selectorToHide)
    css += selectorToHide.join(",") + "{ display: none; }";
  if (getPref("reduce_animations"))
    css += "div[class*=GameCard-module__gameTitleInnerWrapper],div[class*=GameCard-module__card],div[class*=ScrollArrows-module]{transition:none !important}";
  if (getPref("hide_dots_icon"))
    css += "div[class*=Grip-module__container]{visibility:hidden}@media (hover:hover){button[class*=GripHandle-module__container]:hover div[class*=Grip-module__container]{visibility:visible}}button[class*=GripHandle-module__container][aria-expanded=true] div[class*=Grip-module__container]{visibility:visible}button[class*=GripHandle-module__container][aria-expanded=false]{background-color:transparent !important}div[class*=StreamHUD-module__buttonsContainer]{padding:0 !important}";
  if (css += "div[class*=StreamMenu-module__menu]{min-width:100vw !important}", getPref("stream_simplify_menu"))
    css += "div[class*=Menu-module__scrollable]{--bxStreamMenuItemSize:80px;--streamMenuItemSize:calc(var(--bxStreamMenuItemSize) + 40px) !important}.bx-badges{top:calc(var(--streamMenuItemSize) - 20px)}body[data-media-type=tv] .bx-badges{top:calc(var(--streamMenuItemSize) - 10px) !important}button[class*=MenuItem-module__container]{min-width:auto !important;min-height:auto !important;width:var(--bxStreamMenuItemSize) !important;height:var(--bxStreamMenuItemSize) !important}div[class*=MenuItem-module__label]{display:none !important}svg[class*=MenuItem-module__icon]{width:36px;height:100% !important;padding:0 !important;margin:0 !important}";
  else
    css += "body[data-media-type=tv] .bx-badges{top:calc(var(--streamMenuItemSize) + 30px)}body:not([data-media-type=tv]) .bx-badges{top:calc(var(--streamMenuItemSize) + 20px)}body:not([data-media-type=tv]) button[class*=MenuItem-module__container]{min-width:auto !important;width:100px !important}body:not([data-media-type=tv]) button[class*=MenuItem-module__container]:nth-child(n+2){margin-left:10px !important}body:not([data-media-type=tv]) div[class*=MenuItem-module__label]{margin-left:8px !important;margin-right:8px !important}";
  if (getPref("ui_scrollbar_hide"))
    css += "html{scrollbar-width:none}body::-webkit-scrollbar{display:none}";
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
  NavigationDialogManager.getInstance().hide(), RemotePlay.detachPopup(), LoadingScreen.reset(), window.setTimeout(HeaderSection.watchHeader, 2000), BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
}

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
      if (STATES.userAgent.capabilities.touch)
        try {
          const sigls = state.xcloud.sigls;
          if ("9c86f07a-f3e8-45ad-82a0-a1f759597059" in sigls) {
            let customList = TouchController.getCustomList();
            const allGames = sigls["29a81209-df6f-41fd-a528-2ae6b91f719c"].data.products;
            customList = customList.filter((id2) => allGames.includes(id2)), sigls["9c86f07a-f3e8-45ad-82a0-a1f759597059"]?.data.products.push(...customList);
          }
          if (BX_FLAGS.ForceNativeMkbTitles && "8fa264dd-124f-4af3-97e8-596fcdf4b486" in sigls)
            sigls["8fa264dd-124f-4af3-97e8-596fcdf4b486"]?.data.products.push(...BX_FLAGS.ForceNativeMkbTitles);
        } catch (e) {
          BxLogger.error(LOG_TAG6, e);
        }
      if (getPref("ui_home_context_menu_disabled"))
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

var clarity_boost_default = "attribute vec2 position;\n\nvoid main() {\n    gl_Position = vec4(position, 0, 1);\n}\n";

var clarity_boost_default2 = "const int FILTER_UNSHARP_MASKING = 1;\nconst int FILTER_CAS = 2;\n\nprecision highp float;\nuniform sampler2D data;\nuniform vec2 iResolution;\n\nuniform int filterId;\nuniform float sharpenFactor;\nuniform float brightness;\nuniform float contrast;\nuniform float saturation;\n\nvec3 textureAt(sampler2D tex, vec2 coord) {\n    return texture2D(tex, coord / iResolution.xy).rgb;\n}\n\nvec3 clarityBoost(sampler2D tex, vec2 coord)\n{\n    // Load a collection of samples in a 3x3 neighorhood, where e is the current pixel.\n    // a b c\n    // d e f\n    // g h i\n    vec3 a = textureAt(tex, coord + vec2(-1, 1));\n    vec3 b = textureAt(tex, coord + vec2(0, 1));\n    vec3 c = textureAt(tex, coord + vec2(1, 1));\n\n    vec3 d = textureAt(tex, coord + vec2(-1, 0));\n    vec3 e = textureAt(tex, coord);\n    vec3 f = textureAt(tex, coord + vec2(1, 0));\n\n    vec3 g = textureAt(tex, coord + vec2(-1, -1));\n    vec3 h = textureAt(tex, coord + vec2(0, -1));\n    vec3 i = textureAt(tex, coord + vec2(1, -1));\n\n    if (filterId == FILTER_CAS) {\n        // Soft min and max.\n        //  a b c             b\n        //  d e f * 0.5  +  d e f * 0.5\n        //  g h i             h\n        // These are 2.0x bigger (factored out the extra multiply).\n        vec3 minRgb = min(min(min(d, e), min(f, b)), h);\n        vec3 minRgb2 = min(min(a, c), min(g, i));\n        minRgb += min(minRgb, minRgb2);\n\n        vec3 maxRgb = max(max(max(d, e), max(f, b)), h);\n        vec3 maxRgb2 = max(max(a, c), max(g, i));\n        maxRgb += max(maxRgb, maxRgb2);\n\n        // Smooth minimum distance to signal limit divided by smooth max.\n        vec3 reciprocalMaxRgb = 1.0 / maxRgb;\n        vec3 amplifyRgb = clamp(min(minRgb, 2.0 - maxRgb) * reciprocalMaxRgb, 0.0, 1.0);\n\n        // Shaping amount of sharpening.\n        amplifyRgb = inversesqrt(amplifyRgb);\n\n        float contrast = 0.8;\n        float peak = -3.0 * contrast + 8.0;\n        vec3 weightRgb = -(1.0 / (amplifyRgb * peak));\n\n        vec3 reciprocalWeightRgb = 1.0 / (4.0 * weightRgb + 1.0);\n\n        //                0 w 0\n        // Filter shape:  w 1 w\n        //                0 w 0\n        vec3 window = (b + d) + (f + h);\n        vec3 outColor = clamp((window * weightRgb + e) * reciprocalWeightRgb, 0.0, 1.0);\n\n        outColor = mix(e, outColor, sharpenFactor / 2.0);\n\n        return outColor;\n    } else if (filterId == FILTER_UNSHARP_MASKING) {\n        vec3 gaussianBlur = (a * 1.0 + b * 2.0 + c * 1.0 +\n            d * 2.0 + e * 4.0 + f * 2.0 +\n            g * 1.0 + h * 2.0 + i * 1.0) / 16.0;\n\n        // Return edge detection\n        return e + (e - gaussianBlur) * sharpenFactor / 3.0;\n    }\n\n    return e;\n}\n\nvec3 adjustBrightness(vec3 color) {\n    return (1.0 + brightness) * color;\n}\n\nvec3 adjustContrast(vec3 color) {\n    return 0.5 + (1.0 + contrast) * (color - 0.5);\n}\n\nvec3 adjustSaturation(vec3 color) {\n    const vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);\n    vec3 grayscale = vec3(dot(color, luminosityFactor));\n\n    return mix(grayscale, color, 1.0 + saturation);\n}\n\nvoid main() {\n    vec3 color;\n\n    if (sharpenFactor > 0.0) {\n        color = clarityBoost(data, gl_FragCoord.xy);\n    } else {\n        color = textureAt(data, gl_FragCoord.xy);\n    }\n\n    if (saturation != 0.0) {\n        color = adjustSaturation(color);\n    }\n\n    if (contrast != 0.0) {\n        color = adjustContrast(color);\n    }\n\n    if (brightness != 0.0) {\n        color = adjustBrightness(color);\n    }\n\n    gl_FragColor = vec4(color, 1.0);\n}\n";

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
    BxLogger.info(LOG_TAG7, "Setting up", getPref("video_power_preference"));
    const gl = this.#$canvas.getContext("webgl", {
      isBx: !0,
      antialias: !0,
      alpha: !1,
      powerPreference: getPref("video_power_preference")
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

class StreamPlayer {
  #$video;
  #playerType = "default";
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
    if (this.#options.processing === "usm" && sharpness != 0) {
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
    const PREF_RATIO = getPref("video_ratio"), $video = this.#$video, isNativeTouchGame = STATES.currentStream.titleInfo?.details.hasNativeTouchSupport;
    let $webGL2Canvas;
    if (this.#playerType == "webgl2")
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
    if (isNativeTouchGame && this.#playerType == "webgl2")
      window.BX_EXPOSED.streamSession.updateDimensions();
  }
  setPlayerType(type, refreshPlayer = !1) {
    if (this.#playerType !== type)
      if (type === "webgl2") {
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
    if (playerType === "webgl2")
      return this.#webGL2Player?.getCanvas();
    return this.#$video;
  }
  getWebGL2Player() {
    return this.#webGL2Player;
  }
  refreshPlayer() {
    if (this.#playerType === "webgl2") {
      const options = this.#options, webGL2Player = this.#webGL2Player;
      if (options.processing === "usm")
        webGL2Player.setFilter(1);
      else
        webGL2Player.setFilter(2);
      Screenshot.updateCanvasFilters("none"), webGL2Player.setSharpness(options.sharpness || 0), webGL2Player.setSaturation(options.saturation || 100), webGL2Player.setContrast(options.contrast || 100), webGL2Player.setBrightness(options.brightness || 100);
    } else {
      let filters = this.#getVideoPlayerFilterStyle(), videoCss = "";
      if (filters)
        videoCss += `filter: ${filters} !important;`;
      if (getPref("screenshot_apply_filters"))
        Screenshot.updateCanvasFilters(filters);
      let css = "";
      if (videoCss)
        css = `#game-stream video { ${videoCss} }`;
      this.#$videoCss.textContent = css;
    }
    this.#resizePlayer();
  }
  reloadPlayer() {
    this.#cleanUpWebGL2Player(), this.#playerType = "default", this.setPlayerType("webgl2", !1);
  }
  #cleanUpWebGL2Player() {
    this.#webGL2Player?.destroy(), this.#webGL2Player = null;
  }
  destroy() {
    this.#cleanUpWebGL2Player();
  }
}

function patchVideoApi() {
  const PREF_SKIP_SPLASH_VIDEO = getPref("skip_splash_video"), showFunc = function() {
    if (this.style.visibility = "visible", !this.videoWidth)
      return;
    const playerOptions = {
      processing: getPref("video_processing"),
      sharpness: getPref("video_sharpness"),
      saturation: getPref("video_saturation"),
      contrast: getPref("video_contrast"),
      brightness: getPref("video_brightness")
    };
    STATES.currentStream.streamPlayer = new StreamPlayer(this, getPref("video_player_type"), playerOptions), BxEvent.dispatch(window, BxEvent.STREAM_PLAYING, {
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
      this.addEventListener("loadedmetadata", showFunc, { once: !0 });
    return nativePlay.apply(this);
  };
}
function patchRtcCodecs() {
  if (getPref("stream_codec_profile") === "default")
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
  const maxVideoBitrate = getPref("bitrate_video_max"), codec = getPref("stream_codec_profile");
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
      return nativeSetLocalDescription.apply(this, arguments);
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
      return gainNode.gain.value = getPref("audio_volume") / 100, STATES.currentStream.audioGainNode = gainNode, gainNode;
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
        },
        addEventListener: () => {
        },
        removeEventListener: () => {
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
function disableAdobeAudienceManager() {
  window.adobe = Object.freeze({});
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

class BaseGameBarAction {
  constructor() {
  }
  reset() {
  }
}

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
      const enabled = e.microphoneState === "Enabled";
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
    const position = getPref("game_bar_position"), $gameBar = CE("div", { id: "bx-game-bar", class: "bx-gone", "data-position": position }, $container = CE("div", { class: "bx-game-bar-container bx-offscreen" }), createSvgIcon(position === "bottom-left" ? BxIcon.CARET_RIGHT : BxIcon.CARET_LEFT));
    if (this.actions = [
      new ScreenshotAction,
      ...STATES.userAgent.capabilities.touch && getPref("stream_touch_controller") !== "off" ? [new TouchControlAction] : [],
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
    }), document.documentElement.appendChild($gameBar), this.$gameBar = $gameBar, this.$container = $container, getPref("game_bar_position") !== "off" && window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, ((e) => {
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

class GuideMenu {
  static #BUTTONS = {
    scriptSettings: createButton({
      label: t("better-xcloud"),
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.PRIMARY,
      onClick: (e) => {
        window.addEventListener(BxEvent.XCLOUD_DIALOG_DISMISSED, (e2) => {
          setTimeout(() => SettingsNavigationDialog.getInstance().show(), 50);
        }, { once: !0 }), window.BX_EXPOSED.dialogRoutes.closeAll();
      }
    }),
    appSettings: createButton({
      label: t("app-settings"),
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
      onClick: (e) => {
        window.BX_EXPOSED.dialogRoutes.closeAll(), AppInterface.openAppSettings && AppInterface.openAppSettings();
      }
    }),
    closeApp: createButton({
      label: t("close-app"),
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE | ButtonStyle.DANGER,
      onClick: (e) => {
        AppInterface.closeApp();
      }
    }),
    reloadPage: createButton({
      label: t("reload-page"),
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
      onClick: (e) => {
        if (STATES.isPlaying)
          confirm(t("confirm-reload-stream")) && window.location.reload();
        else
          window.location.reload();
        window.BX_EXPOSED.dialogRoutes.closeAll();
      }
    }),
    backToHome: createButton({
      label: t("back-to-home"),
      style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
      onClick: (e) => {
        confirm(t("back-to-home-confirm")) && (window.location.href = window.location.href.substring(0, 31));
      }
    })
  };
  static #renderButtons(buttons) {
    const $div = CE("div", {});
    for (let $button of buttons)
      $div.appendChild($button);
    return $div;
  }
  static #injectHome($root) {
    const $dividers = $root.querySelectorAll("div[class*=Divider-module__divider]");
    if (!$dividers)
      return;
    const buttons = [];
    buttons.push(GuideMenu.#BUTTONS.scriptSettings), AppInterface && buttons.push(GuideMenu.#BUTTONS.appSettings), buttons.push(GuideMenu.#BUTTONS.reloadPage), AppInterface && buttons.push(GuideMenu.#BUTTONS.closeApp);
    const $buttons = GuideMenu.#renderButtons(buttons);
    $dividers[$dividers.length - 1].insertAdjacentElement("afterend", $buttons);
  }
  static #injectHomePlaying($root) {
    const $btnQuit = $root.querySelector("a[class*=QuitGameButton]");
    if (!$btnQuit)
      return;
    const buttons = [];
    buttons.push(GuideMenu.#BUTTONS.scriptSettings), AppInterface && buttons.push(GuideMenu.#BUTTONS.appSettings), buttons.push(GuideMenu.#BUTTONS.reloadPage), buttons.push(GuideMenu.#BUTTONS.backToHome);
    const $buttons = GuideMenu.#renderButtons(buttons);
    $btnQuit.insertAdjacentElement("afterend", $buttons);
    const $btnXcloudHome = $root.querySelector("div[class^=HomeButtonWithDivider]");
    $btnXcloudHome && ($btnXcloudHome.style.display = "none");
  }
  static async#onShown(e) {
    if (e.where === "home") {
      const $root = document.querySelector("#gamepass-dialog-root div[role=dialog] div[role=tabpanel] div[class*=HomeLandingPage]");
      if ($root)
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

class XcloudApi {
  static instance;
  static getInstance() {
    if (!XcloudApi.instance)
      XcloudApi.instance = new XcloudApi;
    return XcloudApi.instance;
  }
  #CACHE_TITLES = {};
  #CACHE_WAIT_TIME = {};
  async getTitleInfo(id2) {
    if (id2 in this.#CACHE_TITLES)
      return this.#CACHE_TITLES[id2];
    const baseUri = STATES.selectedRegion.baseUri;
    if (!baseUri || !STATES.gsToken)
      return null;
    let json;
    try {
      json = (await (await NATIVE_FETCH(`${baseUri}/v2/titles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STATES.gsToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          alternateIds: [id2],
          alternateIdType: "productId"
        })
      })).json()).results[0];
    } catch (e) {
      json = {};
    }
    return this.#CACHE_TITLES[id2] = json, json;
  }
  async getWaitTime(id2) {
    if (id2 in this.#CACHE_WAIT_TIME)
      return this.#CACHE_WAIT_TIME[id2];
    const baseUri = STATES.selectedRegion.baseUri;
    if (!baseUri || !STATES.gsToken)
      return null;
    let json;
    try {
      json = await (await NATIVE_FETCH(`${baseUri}/v1/waittime/${id2}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${STATES.gsToken}`
        }
      })).json();
    } catch (e) {
      json = {};
    }
    return this.#CACHE_WAIT_TIME[id2] = json, json;
  }
}

class GameTile {
  static #timeout;
  static #secondsToHms(seconds) {
    let h = Math.floor(seconds / 3600);
    seconds %= 3600;
    let m = Math.floor(seconds / 60), s = seconds % 60;
    const output = [];
    if (h > 0 && output.push(`${h}h`), m > 0 && output.push(`${m}m`), s > 0 || output.length === 0)
      output.push(`${s}s`);
    return output.join(" ");
  }
  static async#showWaitTime($elm, productId) {
    let totalWaitTime;
    const api = XcloudApi.getInstance(), info = await api.getTitleInfo(productId);
    if (info) {
      const waitTime = await api.getWaitTime(info.titleId);
      if (waitTime)
        totalWaitTime = waitTime.estimatedAllocationTimeInSeconds;
    }
    if (typeof totalWaitTime === "number" && $elm.isConnected) {
      const $div = CE("div", { class: "bx-game-tile-wait-time" }, createSvgIcon(BxIcon.PLAYTIME), CE("span", {}, GameTile.#secondsToHms(totalWaitTime)));
      $elm.insertAdjacentElement("afterbegin", $div);
    }
  }
  static requestWaitTime($elm, productId) {
    GameTile.#timeout && clearTimeout(GameTile.#timeout), GameTile.#timeout = window.setTimeout(async () => {
      if (!$elm.hasWaitTime)
        $elm.hasWaitTime = !0, GameTile.#showWaitTime($elm, productId);
    }, 1000);
  }
  static setup() {
    window.addEventListener(BxEvent.NAVIGATION_FOCUS_CHANGED, (e) => {
      let productId;
      const $elm = e.element;
      try {
        if ($elm.tagName === "BUTTON" && $elm.className.includes("MruGameCard") || $elm.tagName === "A" && $elm.className.includes("GameCard")) {
          let props = getReactProps($elm.parentElement);
          if (Array.isArray(props.children))
            productId = props.children[0].props.productId;
          else
            productId = props.children.props.productId;
        } else if ($elm.tagName === "A" && $elm.className.includes("GameItem")) {
          let props = getReactProps($elm.parentElement);
          if (props = props.children.props, props.location !== "NonStreamableGameItem")
            if ("productId" in props)
              productId = props.productId;
            else
              productId = props.children.props.productId;
        }
      } catch (e2) {
      }
      productId && GameTile.requestWaitTime($elm, productId);
    });
  }
}

class ProductDetailsPage {
  static $btnShortcut = createButton({
    classes: ["bx-button-shortcut"],
    icon: BxIcon.CREATE_SHORTCUT,
    label: t("create-shortcut"),
    style: ButtonStyle.FOCUSABLE,
    tabIndex: 0,
    onClick: (e) => {
      AppInterface && AppInterface.createShortcut(window.location.pathname.substring(6));
    }
  });
  static shortcutTimeoutId = null;
  static injectShortcutButton() {
    if (!AppInterface || BX_FLAGS.DeviceInfo.deviceType !== "android")
      return;
    ProductDetailsPage.shortcutTimeoutId && clearTimeout(ProductDetailsPage.shortcutTimeoutId), ProductDetailsPage.shortcutTimeoutId = window.setTimeout(() => {
      const $container = document.querySelector("div[class*=ActionButtons-module__container]");
      if ($container)
        $container.parentElement?.appendChild(ProductDetailsPage.$btnShortcut);
    }, 500);
  }
}

class StreamUiHandler {
  static $btnStreamSettings;
  static $btnStreamStats;
  static $btnRefresh;
  static $btnHome;
  static observer;
  static cloneStreamHudButton($btnOrg, label, svgIcon) {
    if (!$btnOrg)
      return null;
    const $container = $btnOrg.cloneNode(!0);
    let timeout;
    if (STATES.browser.capabilities.touch) {
      const onTransitionStart = (e) => {
        if (e.propertyName !== "opacity")
          return;
        timeout && clearTimeout(timeout), e.target.style.pointerEvents = "none";
      }, onTransitionEnd = (e) => {
        if (e.propertyName !== "opacity")
          return;
        const $streamHud = e.target.closest("#StreamHud");
        if (!$streamHud)
          return;
        if ($streamHud.style.left === "0px") {
          const $target = e.target;
          timeout && clearTimeout(timeout), timeout = window.setTimeout(() => {
            $target.style.pointerEvents = "auto";
          }, 100);
        }
      };
      $container.addEventListener("transitionstart", onTransitionStart), $container.addEventListener("transitionend", onTransitionEnd);
    }
    const $button = $container.querySelector("button");
    if (!$button)
      return null;
    $button.setAttribute("title", label);
    const $orgSvg = $button.querySelector("svg");
    if (!$orgSvg)
      return null;
    const $svg = createSvgIcon(svgIcon);
    return $svg.style.fill = "none", $svg.setAttribute("class", $orgSvg.getAttribute("class") || ""), $svg.ariaHidden = "true", $orgSvg.replaceWith($svg), $container;
  }
  static cloneCloseButton($btnOrg, icon, className, onChange) {
    if (!$btnOrg)
      return null;
    const $btn = $btnOrg.cloneNode(!0), $svg = createSvgIcon(icon);
    return $svg.setAttribute("class", $btn.firstElementChild.getAttribute("class") || ""), $svg.style.fill = "none", $btn.classList.add(className), $btn.removeChild($btn.firstElementChild), $btn.appendChild($svg), $btn.addEventListener("click", onChange), $btn;
  }
  static async handleStreamMenu() {
    const $btnCloseHud = document.querySelector("button[class*=StreamMenu-module__backButton]");
    if (!$btnCloseHud)
      return;
    let { $btnRefresh, $btnHome } = StreamUiHandler;
    if (typeof $btnRefresh === "undefined")
      $btnRefresh = StreamUiHandler.cloneCloseButton($btnCloseHud, BxIcon.REFRESH, "bx-stream-refresh-button", () => {
        confirm(t("confirm-reload-stream")) && window.location.reload();
      });
    if (typeof $btnHome === "undefined")
      $btnHome = StreamUiHandler.cloneCloseButton($btnCloseHud, BxIcon.HOME, "bx-stream-home-button", () => {
        confirm(t("back-to-home-confirm")) && (window.location.href = window.location.href.substring(0, 31));
      });
    if ($btnRefresh && $btnHome)
      $btnCloseHud.insertAdjacentElement("afterend", $btnRefresh), $btnRefresh.insertAdjacentElement("afterend", $btnHome);
    document.querySelector("div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]")?.appendChild(await StreamBadges.getInstance().render());
  }
  static handleSystemMenu($streamHud) {
    const $gripHandle = $streamHud.querySelector("button[class^=GripHandle]");
    if (!$gripHandle)
      return;
    const $orgButton = $streamHud.querySelector("div[class^=HUDButton]");
    if (!$orgButton)
      return;
    const hideGripHandle = () => {
      if (!$gripHandle)
        return;
      $gripHandle.dispatchEvent(new PointerEvent("pointerdown")), $gripHandle.click(), $gripHandle.dispatchEvent(new PointerEvent("pointerdown")), $gripHandle.click();
    };
    let $btnStreamSettings = StreamUiHandler.$btnStreamSettings;
    if (typeof $btnStreamSettings === "undefined")
      $btnStreamSettings = StreamUiHandler.cloneStreamHudButton($orgButton, t("better-xcloud"), BxIcon.BETTER_XCLOUD), $btnStreamSettings?.addEventListener("click", (e) => {
        hideGripHandle(), e.preventDefault(), SettingsNavigationDialog.getInstance().show();
      }), StreamUiHandler.$btnStreamSettings = $btnStreamSettings;
    const streamStats = StreamStats.getInstance();
    let $btnStreamStats = StreamUiHandler.$btnStreamStats;
    if (typeof $btnStreamStats === "undefined")
      $btnStreamStats = StreamUiHandler.cloneStreamHudButton($orgButton, t("stream-stats"), BxIcon.STREAM_STATS), $btnStreamStats?.addEventListener("click", (e) => {
        hideGripHandle(), e.preventDefault(), streamStats.toggle();
        const btnStreamStatsOn = !streamStats.isHidden() && !streamStats.isGlancing();
        $btnStreamStats.classList.toggle("bx-stream-menu-button-on", btnStreamStatsOn);
      }), StreamUiHandler.$btnStreamStats = $btnStreamStats;
    const $btnParent = $orgButton.parentElement;
    if ($btnStreamSettings && $btnStreamStats) {
      const btnStreamStatsOn = !streamStats.isHidden() && !streamStats.isGlancing();
      $btnStreamStats.classList.toggle("bx-stream-menu-button-on", btnStreamStatsOn), $btnParent.insertBefore($btnStreamStats, $btnParent.lastElementChild), $btnParent.insertBefore($btnStreamSettings, $btnStreamStats);
    }
    const $dotsButton = $btnParent.lastElementChild;
    $dotsButton.parentElement.insertBefore($dotsButton, $dotsButton.parentElement.firstElementChild);
  }
  static reset() {
    StreamUiHandler.$btnStreamSettings = void 0, StreamUiHandler.$btnStreamStats = void 0, StreamUiHandler.$btnRefresh = void 0, StreamUiHandler.$btnHome = void 0, StreamUiHandler.observer && StreamUiHandler.observer.disconnect(), StreamUiHandler.observer = void 0;
  }
  static observe() {
    StreamUiHandler.reset();
    const $screen = document.querySelector("#PageContent section[class*=PureScreens]");
    if (!$screen)
      return;
    const observer = new MutationObserver((mutationList) => {
      mutationList.forEach((item2) => {
        if (item2.type !== "childList")
          return;
        item2.addedNodes.forEach(async ($node) => {
          if (!$node || $node.nodeType !== Node.ELEMENT_NODE)
            return;
          let $elm = $node;
          if (!($elm instanceof HTMLElement))
            return;
          const className = $elm.className || "";
          if (className.includes("PureErrorPage")) {
            BxEvent.dispatch(window, BxEvent.STREAM_ERROR_PAGE);
            return;
          }
          if (className.startsWith("StreamMenu-module__container")) {
            StreamUiHandler.handleStreamMenu();
            return;
          }
          if (className.startsWith("Overlay-module_") || className.startsWith("InProgressScreen"))
            $elm = $elm.querySelector("#StreamHud");
          if (!$elm || ($elm.id || "") !== "StreamHud")
            return;
          StreamUiHandler.handleSystemMenu($elm);
        });
      });
    });
    observer.observe($screen, { subtree: !0, childList: !0 }), StreamUiHandler.observer = observer;
  }
}

function unload() {
  if (!STATES.isPlaying)
    return;
  EmulatedMkbHandler.getInstance().destroy(), NativeMkbHandler.getInstance().destroy(), STATES.currentStream.streamPlayer?.destroy(), STATES.isPlaying = !1, STATES.currentStream = {}, window.BX_EXPOSED.shouldShowSensorControls = !1, window.BX_EXPOSED.stopTakRendering = !1, NavigationDialogManager.getInstance().hide(), StreamStats.getInstance().onStoppedPlaying(), MouseCursorHider.stop(), TouchController.reset(), GameBar.getInstance().disable();
}
function observeRootDialog($root) {
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
                  BxEvent.dispatch(window, BxEvent.XCLOUD_GUIDE_MENU_SHOWN, { where: "home" });
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
}
function waitForRootDialog() {
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
}
function main() {
  if (waitForRootDialog(), patchRtcPeerConnection(), patchRtcCodecs(), interceptHttpRequests(), patchVideoApi(), patchCanvasContext(), AppInterface && patchPointerLockApi(), getPref("audio_enable_volume_control") && patchAudioContext(), getPref("block_tracking"))
    patchMeControl(), disableAdobeAudienceManager();
  if (STATES.userAgent.capabilities.touch && TouchController.updateCustomList(), overridePreloadState(), VibrationManager.initialSetup(), BX_FLAGS.CheckForUpdate && checkForUpdate(), addCss(), Toast.setup(), getPref("game_bar_position") !== "off" && GameBar.getInstance(), Screenshot.setup(), GuideMenu.observe(), StreamBadges.setupEvents(), StreamStats.setupEvents(), EmulatedMkbHandler.setupEvents(), Patcher.init(), disablePwa(), getPref("controller_show_connection_status"))
    window.addEventListener("gamepadconnected", (e) => showGamepadToast(e.gamepad)), window.addEventListener("gamepaddisconnected", (e) => showGamepadToast(e.gamepad));
  if (getPref("xhome_enabled"))
    RemotePlay.detect();
  if (getPref("stream_touch_controller") === "all")
    TouchController.setup();
  if (getPref("mkb_enabled") && AppInterface)
    STATES.pointerServerPort = AppInterface.startPointerServer() || 9269, BxLogger.info("startPointerServer", "Port", STATES.pointerServerPort.toString());
  getPref("ui_game_card_show_wait_time") && GameTile.setup();
}
if (window.location.pathname.includes("/auth/msa")) {
  const nativePushState = window.history.pushState;
  throw window.history.pushState = function(...args) {
    const url = args[2];
    if (url && (url.startsWith("/play") || url.substring(6).startsWith("/play"))) {
      console.log("Redirecting to xbox.com/play"), window.stop(), window.location.href = "https://www.xbox.com" + url;
      return;
    }
    return nativePushState.apply(this, arguments);
  }, new Error("[Better xCloud] Refreshing the page after logging in");
}
BxLogger.info("readyState", document.readyState);
if (BX_FLAGS.SafariWorkaround && document.readyState !== "loading") {
  window.stop();
  const css2 = '.bx-reload-overlay{position:fixed;top:0;background:rgba(0,0,0,0.8);z-index:9999;width:100%;line-height:100vh;color:#fff;text-align:center;font-weight:400;font-family:"Segoe UI",Arial,Helvetica,sans-serif;font-size:1.3rem}', $fragment = document.createDocumentFragment();
  throw $fragment.appendChild(CE("style", {}, '.bx-reload-overlay{position:fixed;top:0;background:rgba(0,0,0,0.8);z-index:9999;width:100%;line-height:100vh;color:#fff;text-align:center;font-weight:400;font-family:"Segoe UI",Arial,Helvetica,sans-serif;font-size:1.3rem}')), $fragment.appendChild(CE("div", { class: "bx-reload-overlay" }, t("safari-failed-message"))), document.documentElement.appendChild($fragment), window.location.reload(!0), new Error("[Better xCloud] Executing workaround for Safari");
}
window.addEventListener("load", (e) => {
  window.setTimeout(() => {
    if (document.body.classList.contains("legacyBackground"))
      window.stop(), window.location.reload(!0);
  }, 3000);
});
document.addEventListener("readystatechange", (e) => {
  if (document.readyState !== "interactive")
    return;
  if (STATES.isSignedIn = !!window.xbcUser?.isSignedIn, STATES.isSignedIn)
    getPref("xhome_enabled") && RemotePlay.preload();
  else
    HeaderSection.watchHeader();
  if (getPref("ui_hide_sections").includes("friends")) {
    const $parent = document.querySelector("div[class*=PlayWithFriendsSkeleton]")?.closest("div[class*=HomePage-module]");
    $parent && ($parent.style.display = "none");
  }
  preloadFonts();
});
window.BX_EXPOSED = BxExposed;
window.addEventListener(BxEvent.POPSTATE, onHistoryChanged);
window.addEventListener("popstate", onHistoryChanged);
window.history.pushState = patchHistoryMethod("pushState");
window.history.replaceState = patchHistoryMethod("replaceState");
window.addEventListener(BxEvent.XCLOUD_SERVERS_UNAVAILABLE, (e) => {
  STATES.supportedRegion = !1, window.setTimeout(HeaderSection.watchHeader, 2000), SettingsNavigationDialog.getInstance().show();
});
window.addEventListener(BxEvent.XCLOUD_SERVERS_READY, (e) => {
  STATES.isSignedIn = !0, HeaderSection.watchHeader();
});
window.addEventListener(BxEvent.STREAM_LOADING, (e) => {
  if (window.location.pathname.includes("/launch/")) {
    const matches = /\/launch\/(?<title_id>[^\/]+)\/(?<product_id>\w+)/.exec(window.location.pathname);
    if (matches?.groups)
      STATES.currentStream.titleId = matches.groups.title_id, STATES.currentStream.productId = matches.groups.product_id;
  } else
    STATES.currentStream.titleId = "remote-play", STATES.currentStream.productId = "";
});
getPref("ui_loading_screen_game_art") && window.addEventListener(BxEvent.TITLE_INFO_READY, LoadingScreen.setup);
window.addEventListener(BxEvent.STREAM_STARTING, (e) => {
  if (LoadingScreen.hide(), !getPref("mkb_enabled") && getPref("mkb_hide_idle_cursor"))
    MouseCursorHider.start(), MouseCursorHider.hide();
});
window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
  if (STATES.isPlaying = !0, StreamUiHandler.observe(), getPref("game_bar_position") !== "off") {
    const gameBar = GameBar.getInstance();
    gameBar.reset(), gameBar.enable(), gameBar.showBar();
  }
  const $video = e.$video;
  Screenshot.updateCanvasSize($video.videoWidth, $video.videoHeight), updateVideoPlayer();
});
window.addEventListener(BxEvent.STREAM_ERROR_PAGE, (e) => {
  BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});
window.addEventListener(BxEvent.XCLOUD_RENDERING_COMPONENT, (e) => {
  if (e.component === "product-details")
    ProductDetailsPage.injectShortcutButton();
});
window.addEventListener(BxEvent.STREAM_STOPPED, unload);
window.addEventListener("pagehide", (e) => {
  BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});
window.addEventListener(BxEvent.CAPTURE_SCREENSHOT, (e) => {
  Screenshot.takeScreenshot();
});
main();
