// ==UserScript==
// @name         Better xCloud (Lite)
// @namespace    https://github.com/redphx
// @version      5.9.2
// @description  Improve Xbox Cloud Gaming (xCloud) experience
// @author       redphx
// @license      MIT
// @match        https://www.xbox.com/*/play*
// @match        https://www.xbox.com/*/auth/msa?*loggedIn*
// @run-at       document-end
// @grant        none
// ==/UserScript==
"use strict";
class BxLogger {
 static info = (tag, ...args) => BxLogger.log("#008746", tag, ...args);
 static warning = (tag, ...args) => BxLogger.log("#c1a404", tag, ...args);
 static error = (tag, ...args) => BxLogger.log("#c10404", tag, ...args);
 static log(color, tag, ...args) {
  BX_FLAGS.Debug && console.log("%c[BxC]", `color:${color};font-weight:bold;`, tag, "//", ...args);
 }
}
window.BxLogger = BxLogger;
/* ADDITIONAL CODE */
var DEFAULT_FLAGS = {
 Debug: !1,
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
} catch (e) {}
if (!BX_FLAGS.DeviceInfo.userAgent) BX_FLAGS.DeviceInfo.userAgent = window.navigator.userAgent;
BxLogger.info("BxFlags", BX_FLAGS);
var NATIVE_FETCH = window.fetch;
var SMART_TV_UNIQUE_ID = "FC4A1DA2-711C-4E9C-BC7F-047AF8A672EA", CHROMIUM_VERSION = "123.0.0.0";
if (!!window.chrome || window.navigator.userAgent.includes("Chrome")) {
 let match = window.navigator.userAgent.match(/\s(?:Chrome|Edg)\/([\d\.]+)/);
 if (match) CHROMIUM_VERSION = match[1];
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
  "smarttv-generic": `${window.navigator.userAgent} Smart-TV`,
  "smarttv-tizen": `Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROMIUM_VERSION}/7.0 TV Safari/537.36 ${SMART_TV_UNIQUE_ID}`,
  "vr-oculus": window.navigator.userAgent + " OculusBrowser VR"
 };
 static init() {
  if (UserAgent.#config = JSON.parse(window.localStorage.getItem(UserAgent.STORAGE_KEY) || "{}"), !UserAgent.#config.profile) UserAgent.#config.profile = BX_FLAGS.DeviceInfo.deviceType === "android-tv" || BX_FLAGS.DeviceInfo.deviceType === "webos" ? "vr-oculus" : "default";
  if (!UserAgent.#config.custom) UserAgent.#config.custom = "";
  UserAgent.spoof();
 }
 static updateStorage(profile, custom) {
  let config = UserAgent.#config;
  if (config.profile = profile, profile === "custom" && typeof custom !== "undefined") config.custom = custom;
  window.localStorage.setItem(UserAgent.STORAGE_KEY, JSON.stringify(config));
 }
 static getDefault() {
  return window.navigator.orgUserAgent || window.navigator.userAgent;
 }
 static get(profile) {
  let defaultUserAgent = window.navigator.userAgent;
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
  if (this.#isSafari !== null) return this.#isSafari;
  let userAgent = UserAgent.getDefault().toLowerCase(), result = userAgent.includes("safari") && !userAgent.includes("chrom");
  return this.#isSafari = result, result;
 }
 static isSafariMobile() {
  if (this.#isSafariMobile !== null) return this.#isSafariMobile;
  let userAgent = UserAgent.getDefault().toLowerCase(), result = this.isSafari() && userAgent.includes("mobile");
  return this.#isSafariMobile = result, result;
 }
 static isMobile() {
  if (this.#isMobile !== null) return this.#isMobile;
  let userAgent = UserAgent.getDefault().toLowerCase(), result = /iphone|ipad|android/.test(userAgent);
  return this.#isMobile = result, result;
 }
 static spoof() {
  let profile = UserAgent.#config.profile;
  if (profile === "default") return;
  let newUserAgent = UserAgent.get(profile);
  if ("userAgentData" in window.navigator) window.navigator.orgUserAgentData = window.navigator.userAgentData, Object.defineProperty(window.navigator, "userAgentData", {});
  window.navigator.orgUserAgent = window.navigator.userAgent, Object.defineProperty(window.navigator, "userAgent", {
   value: newUserAgent
  });
 }
}
var SCRIPT_VERSION = "5.9.2", SCRIPT_VARIANT = "lite", AppInterface = window.AppInterface;
UserAgent.init();
var userAgent = window.navigator.userAgent.toLowerCase(), isTv = userAgent.includes("smart-tv") || userAgent.includes("smarttv") || /\baft.*\b/.test(userAgent), isVr = window.navigator.userAgent.includes("VR") && window.navigator.userAgent.includes("OculusBrowser"), browserHasTouchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0, userAgentHasTouchSupport = !isTv && !isVr && browserHasTouchSupport, supportMkb = AppInterface || !userAgent.match(/(android|iphone|ipad)/), STATES = {
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
   touch: userAgentHasTouchSupport,
   mkb: supportMkb
  }
 },
 currentStream: {},
 remotePlay: {},
 pointerServerPort: 9269
}, STORAGE = {};
function deepClone(obj) {
 if ("structuredClone" in window) return structuredClone(obj);
 if (!obj) return {};
 return JSON.parse(JSON.stringify(obj));
}
var BxEvent;
((BxEvent) => {
 BxEvent.JUMP_BACK_IN_READY = "bx-jump-back-in-ready", BxEvent.POPSTATE = "bx-popstate", BxEvent.TITLE_INFO_READY = "bx-title-info-ready", BxEvent.SETTINGS_CHANGED = "bx-settings-changed", BxEvent.STREAM_LOADING = "bx-stream-loading", BxEvent.STREAM_STARTING = "bx-stream-starting", BxEvent.STREAM_STARTED = "bx-stream-started", BxEvent.STREAM_PLAYING = "bx-stream-playing", BxEvent.STREAM_STOPPED = "bx-stream-stopped", BxEvent.STREAM_ERROR_PAGE = "bx-stream-error-page", BxEvent.STREAM_WEBRTC_CONNECTED = "bx-stream-webrtc-connected", BxEvent.STREAM_WEBRTC_DISCONNECTED = "bx-stream-webrtc-disconnected", BxEvent.STREAM_SESSION_READY = "bx-stream-session-ready", BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED = "bx-custom-touch-layouts-loaded", BxEvent.TOUCH_LAYOUT_MANAGER_READY = "bx-touch-layout-manager-ready", BxEvent.REMOTE_PLAY_READY = "bx-remote-play-ready", BxEvent.REMOTE_PLAY_FAILED = "bx-remote-play-failed", BxEvent.XCLOUD_SERVERS_READY = "bx-servers-ready", BxEvent.XCLOUD_SERVERS_UNAVAILABLE = "bx-servers-unavailable", BxEvent.DATA_CHANNEL_CREATED = "bx-data-channel-created", BxEvent.GAME_BAR_ACTION_ACTIVATED = "bx-game-bar-action-activated", BxEvent.MICROPHONE_STATE_CHANGED = "bx-microphone-state-changed", BxEvent.SPEAKER_STATE_CHANGED = "bx-speaker-state-changed", BxEvent.CAPTURE_SCREENSHOT = "bx-capture-screenshot", BxEvent.POINTER_LOCK_REQUESTED = "bx-pointer-lock-requested", BxEvent.POINTER_LOCK_EXITED = "bx-pointer-lock-exited", BxEvent.NAVIGATION_FOCUS_CHANGED = "bx-nav-focus-changed", BxEvent.XCLOUD_DIALOG_SHOWN = "bx-xcloud-dialog-shown", BxEvent.XCLOUD_DIALOG_DISMISSED = "bx-xcloud-dialog-dismissed", BxEvent.XCLOUD_GUIDE_MENU_SHOWN = "bx-xcloud-guide-menu-shown", BxEvent.XCLOUD_POLLING_MODE_CHANGED = "bx-xcloud-polling-mode-changed", BxEvent.XCLOUD_RENDERING_COMPONENT = "bx-xcloud-rendering-component", BxEvent.XCLOUD_ROUTER_HISTORY_READY = "bx-xcloud-router-history-ready";
 function dispatch(target, eventName, data) {
  if (!target) return;
  if (!eventName) {
   alert("BxEvent.dispatch(): eventName is null");
   return;
  }
  let event = new Event(eventName);
  if (data) for (let key in data)
    event[key] = data[key];
  target.dispatchEvent(event), AppInterface && AppInterface.onEvent(eventName), BX_FLAGS.Debug && BxLogger.warning("BxEvent", "dispatch", eventName, data);
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
var ButtonStyleClass = {
 1: "bx-primary",
 2: "bx-danger",
 4: "bx-ghost",
 8: "bx-frosted",
 16: "bx-drop-shadow",
 32: "bx-focusable",
 64: "bx-full-width",
 128: "bx-full-height",
 256: "bx-tall",
 512: "bx-circular",
 1024: "bx-normal-case",
 2048: "bx-normal-link"
};
function createElement(elmName, props = {}, ..._) {
 let $elm, hasNs = "xmlns" in props;
 if (hasNs) $elm = document.createElementNS(props.xmlns, elmName), delete props.xmlns;
 else $elm = document.createElement(elmName);
 if (props._nearby) setNearby($elm, props._nearby), delete props._nearby;
 for (let key in props) {
  if ($elm.hasOwnProperty(key)) continue;
  if (hasNs) $elm.setAttributeNS(null, key, props[key]);
  else if (key === "on") for (let eventName in props[key])
    $elm.addEventListener(eventName, props[key][eventName]);
  else $elm.setAttribute(key, props[key]);
 }
 for (let i = 2, size = arguments.length;i < size; i++) {
  let arg = arguments[i];
  if (arg instanceof Node) $elm.appendChild(arg);
  else if (arg !== null && arg !== !1 && typeof arg !== "undefined") $elm.appendChild(document.createTextNode(arg));
 }
 return $elm;
}
var CE = createElement, domParser = new DOMParser;
function createSvgIcon(icon) {
 return domParser.parseFromString(icon.toString(), "image/svg+xml").documentElement;
}
var ButtonStyleIndices = Object.keys(ButtonStyleClass).map((i) => parseInt(i));
function createButton(options) {
 let $btn;
 if (options.url) $btn = CE("a", { class: "bx-button" }), $btn.href = options.url, $btn.target = "_blank";
 else $btn = CE("button", { class: "bx-button", type: "button" });
 let style = options.style || 0;
 if (style) {
  let index;
  for (index of ButtonStyleIndices)
   style & index && $btn.classList.add(ButtonStyleClass[index]);
 }
 options.classes && $btn.classList.add(...options.classes), options.icon && $btn.appendChild(createSvgIcon(options.icon)), options.label && $btn.appendChild(CE("span", {}, options.label)), options.title && $btn.setAttribute("title", options.title), options.disabled && ($btn.disabled = !0), options.onClick && $btn.addEventListener("click", options.onClick), $btn.tabIndex = typeof options.tabIndex === "number" ? options.tabIndex : 0;
 for (let key in options.attributes)
  if (!$btn.hasOwnProperty(key)) $btn.setAttribute(key, options.attributes[key]);
 return $btn;
}
function isElementVisible($elm) {
 let rect = $elm.getBoundingClientRect();
 return (rect.x >= 0 || rect.y >= 0) && !!rect.width && !!rect.height;
}
var CTN = document.createTextNode.bind(document);
window.BX_CE = createElement;
function removeChildElements($parent) {
 while ($parent.firstElementChild)
  $parent.firstElementChild.remove();
}
var FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"];
function humanFileSize(size) {
 let i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
 return (size / Math.pow(1024, i)).toFixed(2) + " " + FILE_SIZE_UNITS[i];
}
function secondsToHm(seconds) {
 let h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60) + 1;
 if (m === 60) h += 1, m = 0;
 let output = [];
 return h > 0 && output.push(`${h}h`), m > 0 && output.push(`${m}m`), output.join(" ");
}
var SUPPORTED_LANGUAGES = {
 "en-US": "English (US)",
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
 battery: "Battery",
 "battery-saving": "Battery saving",
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
 clock: "Clock",
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
 download: "Download",
 downloaded: "Downloaded",
 edit: "Edit",
 "enable-controller-shortcuts": "Enable controller shortcuts",
 "enable-local-co-op-support": "Enable local co-op support",
 "enable-local-co-op-support-note": "Only works with some games",
 "enable-mic-on-startup": "Enable microphone on game launch",
 "enable-mkb": "Emulate controller with Mouse & Keyboard",
 "enable-quick-glance-mode": "Enable \"Quick Glance\" mode",
 "enable-remote-play-feature": "Enable the \"Remote Play\" feature",
 "enable-volume-control": "Enable volume control feature",
 enabled: "Enabled",
 experimental: "Experimental",
 export: "Export",
 fast: "Fast",
 "fortnite-allow-stw-mode": "Allows playing \"Save the World\" mode on mobile",
 "fortnite-force-console-version": "Fortnite: force console version",
 "game-bar": "Game Bar",
 "getting-consoles-list": "Getting the list of consoles...",
 guide: "Guide",
 help: "Help",
 hide: "Hide",
 "hide-idle-cursor": "Hide mouse cursor on idle",
 "hide-scrollbar": "Hide web page's scrollbar",
 "hide-sections": "Hide sections",
 "hide-system-menu-icon": "Hide System menu's icon",
 "hide-touch-controller": "Hide touch controller",
 "high-performance": "High performance",
 "highest-quality": "Highest quality",
 "highest-quality-note": "Your device may not be powerful enough to use these settings",
 "horizontal-scroll-sensitivity": "Horizontal scroll sensitivity",
 "horizontal-sensitivity": "Horizontal sensitivity",
 "how-to-fix": "How to fix",
 "how-to-improve-app-performance": "How to improve app's performance",
 ignore: "Ignore",
 import: "Import",
 increase: "Increase",
 "install-android": "Better xCloud app for Android",
 japan: "Japan",
 jitter: "Jitter",
 "keyboard-shortcuts": "Keyboard shortcuts",
 korea: "Korea",
 language: "Language",
 large: "Large",
 layout: "Layout",
 "left-stick": "Left stick",
 "load-failed-message": "Failed to run Better xCloud",
 "loading-screen": "Loading screen",
 "local-co-op": "Local co-op",
 "lowest-quality": "Lowest quality",
 "map-mouse-to": "Map mouse to",
 "max-fps": "Max FPS",
 "may-not-work-properly": "May not work properly!",
 menu: "Menu",
 microphone: "Microphone",
 "mkb-adjust-ingame-settings": "You may also need to adjust the in-game sensitivity & deadzone settings",
 "mkb-click-to-activate": "Click to activate",
 "mkb-disclaimer": "Using this feature when playing online could be viewed as cheating",
 "mouse-and-keyboard": "Mouse & Keyboard",
 "mouse-wheel": "Mouse wheel",
 "msfs2020-force-native-mkb": "MSFS2020: force native M&KB support",
 muted: "Muted",
 name: "Name",
 "native-mkb": "Native Mouse & Keyboard",
 new: "New",
 "new-version-available": [
  e => `Version ${e.version} available`,
  ,
  ,
  e => `Version ${e.version} verfügbar`,
  e => `Versi ${e.version} tersedia`,
  e => `Versión ${e.version} disponible`,
  e => `Version ${e.version} disponible`,
  e => `Disponibile la versione ${e.version}`,
  e => `Ver ${e.version} が利用可能です`,
  e => `${e.version} 버전 사용가능`,
  e => `Dostępna jest nowa wersja ${e.version}`,
  e => `Versão ${e.version} disponível`,
  e => `Версия ${e.version} доступна`,
  e => `เวอร์ชัน ${e.version} พร้อมใช้งานแล้ว`,
  e => `${e.version} sayılı yeni sürüm mevcut`,
  e => `Доступна версія ${e.version}`,
  e => `Đã có phiên bản ${e.version}`,
  e => `版本 ${e.version} 可供更新`,
  e => `已可更新為 ${e.version} 版`
 ],
 "no-consoles-found": "No consoles found",
 normal: "Normal",
 off: "Off",
 on: "On",
 "only-supports-some-games": "Only supports some games",
 opacity: "Opacity",
 other: "Other",
 playing: "Playing",
 playtime: "Playtime",
 poland: "Poland",
 "polling-rate": "Polling rate",
 position: "Position",
 "powered-off": "Powered off",
 "powered-on": "Powered on",
 "prefer-ipv6-server": "Prefer IPv6 server",
 "preferred-game-language": "Preferred game's language",
 preset: "Preset",
 "press-esc-to-cancel": "Press Esc to cancel",
 "press-key-to-toggle-mkb": [
  e => `Press ${e.key} to toggle this feature`,
  e => `Premeu ${e.key} per alternar aquesta funció`,
  e => `Tryk på ${e.key} for at slå denne funktion til`,
  e => `${e.key}: Funktion an-/ausschalten`,
  e => `Tekan ${e.key} untuk mengaktifkan fitur ini`,
  e => `Pulsa ${e.key} para alternar esta función`,
  e => `Appuyez sur ${e.key} pour activer cette fonctionnalité`,
  e => `Premi ${e.key} per attivare questa funzionalità`,
  e => `${e.key} でこの機能を切替`,
  e => `${e.key} 키를 눌러 이 기능을 켜고 끄세요`,
  e => `Naciśnij ${e.key} aby przełączyć tę funkcję`,
  e => `Pressione ${e.key} para alternar este recurso`,
  e => `Нажмите ${e.key} для переключения этой функции`,
  e => `กด ${e.key} เพื่อสลับคุณสมบัตินี้`,
  e => `Etkinleştirmek için ${e.key} tuşuna basın`,
  e => `Натисніть ${e.key} щоб перемкнути цю функцію`,
  e => `Nhấn ${e.key} để bật/tắt tính năng này`,
  e => `按下 ${e.key} 来切换此功能`,
  e => `按下 ${e.key} 來啟用此功能`
 ],
 "press-to-bind": "Press a key or do a mouse click to bind...",
 "prompt-preset-name": "Preset's name:",
 recommended: "Recommended",
 "recommended-settings-for-device": [
  e => `Recommended settings for ${e.device}`,
  e => `Configuració recomanada per a ${e.device}`,
  ,
  e => `Empfohlene Einstellungen für ${e.device}`,
  e => `Rekomendasi pengaturan untuk ${e.device}`,
  e => `Ajustes recomendados para ${e.device}`,
  e => `Paramètres recommandés pour ${e.device}`,
  e => `Configurazioni consigliate per ${e.device}`,
  e => `${e.device} の推奨設定`,
  e => `다음 기기에서 권장되는 설정: ${e.device}`,
  e => `Zalecane ustawienia dla ${e.device}`,
  e => `Configurações recomendadas para ${e.device}`,
  e => `Рекомендуемые настройки для ${e.device}`,
  e => `การตั้งค่าที่แนะนำสำหรับ ${e.device}`,
  e => `${e.device} için önerilen ayarlar`,
  e => `Рекомендовані налаштування для ${e.device}`,
  e => `Cấu hình được đề xuất cho ${e.device}`,
  e => `${e.device} 的推荐设置`,
  e => `${e.device} 推薦的設定`
 ],
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
 "suggest-settings": "Suggest settings",
 "suggest-settings-link": "Suggest recommended settings for this device",
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
  e => `Touch control layout by ${e.name}`,
  e => `Format del control tàctil per ${e.name}`,
  e => `Touch-kontrol layout af ${e.name}`,
  e => `Touch-Steuerungslayout von ${e.name}`,
  e => `Tata letak Sentuhan layar oleh ${e.name}`,
  e => `Disposición del control táctil por ${e.nombre}`,
  e => `Disposition du contrôleur tactile par ${e.name}`,
  e => `Configurazione dei comandi su schermo creata da ${e.name}`,
  e => `タッチ操作レイアウト作成者: ${e.name}`,
  e => `${e.name} 제작, 터치 컨트롤 레이아웃`,
  e => `Układ sterowania dotykowego stworzony przez ${e.name}`,
  e => `Disposição de controle por toque feito por ${e.name}`,
  e => `Сенсорная раскладка по ${e.name}`,
  e => `รูปแบบการควบคุมแบบสัมผัสโดย ${e.name}`,
  e => `${e.name} kişisinin dokunmatik kontrolcü tuş şeması`,
  e => `Розташування сенсорного керування від ${e.name}`,
  e => `Bố cục điều khiển cảm ứng tạo bởi ${e.name}`,
  e => `由 ${e.name} 提供的虚拟按键样式`,
  e => `觸控遊玩佈局由 ${e.name} 提供`
 ],
 "touch-controller": "Touch controller",
 "transparent-background": "Transparent background",
 "true-achievements": "TrueAchievements",
 ui: "UI",
 "unexpected-behavior": "May cause unexpected behavior",
 "united-states": "United States",
 unknown: "Unknown",
 unlimited: "Unlimited",
 unmuted: "Unmuted",
 "unsharp-masking": "Unsharp masking",
 upload: "Upload",
 uploaded: "Uploaded",
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
 wallpaper: "Wallpaper",
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
  if (newLocale) localStorage.setItem(Translations.#KEY_LOCALE, newLocale), locale = newLocale;
  else locale = localStorage.getItem(Translations.#KEY_LOCALE);
  let supportedLocales = Translations.#supportedLocales;
  if (!locale) {
   if (locale = window.navigator.language || Translations.#EN_US, supportedLocales.indexOf(locale) === -1) locale = Translations.#EN_US;
   localStorage.setItem(Translations.#KEY_LOCALE, locale);
  }
  Translations.#selectedLocale = locale, Translations.#selectedLocaleIndex = supportedLocales.indexOf(locale);
 }
 static get(key, values) {
  let text = null;
  if (Translations.#foreignTranslations && Translations.#selectedLocale !== Translations.#EN_US) text = Translations.#foreignTranslations[key];
  if (!text) text = Texts[key] || alert(`Missing translation key: ${key}`);
  let translation;
  if (Array.isArray(text)) return translation = text[Translations.#selectedLocaleIndex] || text[Translations.#enUsIndex], translation(values);
  return translation = text, translation;
 }
 static async#loadTranslations() {
  if (Translations.#selectedLocale === Translations.#EN_US) return;
  try {
   Translations.#foreignTranslations = JSON.parse(window.localStorage.getItem(Translations.#KEY_TRANSLATIONS));
  } catch (e) {}
  if (!Translations.#foreignTranslations) await this.downloadTranslations(Translations.#selectedLocale);
 }
 static async updateTranslations(async = !1) {
  if (Translations.#selectedLocale === Translations.#EN_US) {
   localStorage.removeItem(Translations.#KEY_TRANSLATIONS);
   return;
  }
  if (async) Translations.downloadTranslationsAsync(Translations.#selectedLocale);
  else await Translations.downloadTranslations(Translations.#selectedLocale);
 }
 static async downloadTranslations(locale) {
  try {
   let translations = await (await NATIVE_FETCH(`https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/translations/${locale}.json`)).json();
   if (localStorage.getItem(Translations.#KEY_LOCALE) === locale) window.localStorage.setItem(Translations.#KEY_TRANSLATIONS, JSON.stringify(translations)), Translations.#foreignTranslations = translations;
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
class SettingElement {
 static #renderOptions(key, setting, currentValue, onChange) {
  let $control = CE("select", {
   tabindex: 0
  }), $parent;
  if (setting.optionsGroup) $parent = CE("optgroup", {
    label: setting.optionsGroup
   }), $control.appendChild($parent);
  else $parent = $control;
  for (let value in setting.options) {
   let label = setting.options[value], $option = CE("option", { value }, label);
   $parent.appendChild($option);
  }
  return $control.value = currentValue, onChange && $control.addEventListener("input", (e) => {
   let target = e.target, value = setting.type && setting.type === "number" ? parseInt(target.value) : target.value;
   !e.ignoreOnChange && onChange(e, value);
  }), $control.setValue = (value) => {
   $control.value = value;
  }, $control;
 }
 static #renderMultipleOptions(key, setting, currentValue, onChange, params = {}) {
  let $control = CE("select", {
   multiple: !0,
   tabindex: 0
  });
  if (params && params.size) $control.setAttribute("size", params.size.toString());
  for (let value in setting.multipleOptions) {
   let label = setting.multipleOptions[value], $option = CE("option", { value }, label);
   $option.selected = currentValue.indexOf(value) > -1, $option.addEventListener("mousedown", function(e) {
    e.preventDefault();
    let target = e.target;
    target.selected = !target.selected;
    let $parent = target.parentElement;
    $parent.focus(), BxEvent.dispatch($parent, "input");
   }), $control.appendChild($option);
  }
  return $control.addEventListener("mousedown", function(e) {
   let self = this, orgScrollTop = self.scrollTop;
   window.setTimeout(() => self.scrollTop = orgScrollTop, 0);
  }), $control.addEventListener("mousemove", (e) => e.preventDefault()), onChange && $control.addEventListener("input", (e) => {
   let target = e.target, values = Array.from(target.selectedOptions).map((i) => i.value);
   !e.ignoreOnChange && onChange(e, values);
  }), $control;
 }
 static #renderNumber(key, setting, currentValue, onChange) {
  let $control = CE("input", {
   tabindex: 0,
   type: "number",
   min: setting.min,
   max: setting.max
  });
  return $control.value = currentValue, onChange && $control.addEventListener("input", (e) => {
   let target = e.target, value = Math.max(setting.min, Math.min(setting.max, parseInt(target.value)));
   target.value = value.toString(), !e.ignoreOnChange && onChange(e, value);
  }), $control;
 }
 static #renderCheckbox(key, setting, currentValue, onChange) {
  let $control = CE("input", { type: "checkbox", tabindex: 0 });
  return $control.checked = currentValue, onChange && $control.addEventListener("input", (e) => {
   !e.ignoreOnChange && onChange(e, e.target.checked);
  }), $control.setValue = (value) => {
   $control.checked = !!value;
  }, $control;
 }
 static #renderNumberStepper(key, setting, value, onChange, options = {}) {
  options = options || {}, options.suffix = options.suffix || "", options.disabled = !!options.disabled, options.hideSlider = !!options.hideSlider;
  let $text, $btnDec, $btnInc, $range = null, controlValue = value, MIN = options.reverse ? -setting.max : setting.min, MAX = options.reverse ? -setting.min : setting.max, STEPS = Math.max(setting.steps || 1, 1), renderTextValue = (value2) => {
   value2 = parseInt(value2);
   let textContent = null;
   if (options.customTextValue) textContent = options.customTextValue(value2);
   if (textContent === null) textContent = value2.toString() + options.suffix;
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
  if (options.disabled) return $btnInc.disabled = !0, $btnInc.classList.add("bx-inactive"), $btnDec.disabled = !0, $btnDec.classList.add("bx-inactive"), $wrapper.disabled = !0, $wrapper;
  if ($range = CE("input", {
   id: `bx_setting_${key}`,
   type: "range",
   min: MIN,
   max: MAX,
   value: options.reverse ? -value : value,
   step: STEPS,
   tabindex: 0
  }), options.hideSlider && $range.classList.add("bx-gone"), $range.addEventListener("input", (e) => {
   if (value = parseInt(e.target.value), options.reverse) value *= -1;
   if (controlValue === value) return;
   controlValue = options.reverse ? -value : value, updateButtonsVisibility(), $text.textContent = renderTextValue(value), !e.ignoreOnChange && onChange && onChange(e, value);
  }), $wrapper.addEventListener("input", (e) => {
   BxEvent.dispatch($range, "input");
  }), $wrapper.appendChild($range), options.ticks || options.exactTicks) {
   let markersId = `markers-${key}`, $markers = CE("datalist", { id: markersId });
   if ($range.setAttribute("list", markersId), options.exactTicks) {
    let start = Math.max(Math.floor(setting.min / options.exactTicks), 1) * options.exactTicks;
    if (start === setting.min) start += options.exactTicks;
    for (let i = start;i < setting.max; i += options.exactTicks)
     $markers.appendChild(CE("option", {
      value: options.reverse ? -i : i
     }));
   } else for (let i = MIN + options.ticks;i < MAX; i += options.ticks)
     $markers.appendChild(CE("option", { value: i }));
   $wrapper.appendChild($markers);
  }
  updateButtonsVisibility();
  let interval, isHolding = !1, onClick = (e) => {
   if (isHolding) {
    e.preventDefault(), isHolding = !1;
    return;
   }
   let $btn = e.target, value2 = parseInt(controlValue);
   if ($btn.dataset.type === "dec") value2 = Math.max(MIN, value2 - STEPS);
   else value2 = Math.min(MAX, value2 + STEPS);
   controlValue = value2, updateButtonsVisibility(), $text.textContent = renderTextValue(value2), $range && ($range.value = value2.toString()), isHolding = !1, !e.ignoreOnChange && onChange && onChange(e, value2);
  }, onMouseDown = (e) => {
   e.preventDefault(), isHolding = !0;
   let args = arguments;
   interval && clearInterval(interval), interval = window.setInterval(() => {
    e.target && BxEvent.dispatch(e.target, "click", {
     arguments: args
    });
   }, 200);
  }, onMouseUp = (e) => {
   e.preventDefault(), interval && clearInterval(interval), isHolding = !1;
  }, onContextMenu = (e) => e.preventDefault();
  return $wrapper.setValue = (value2) => {
   $text.textContent = renderTextValue(value2), $range.value = options.reverse ? -value2 : value2;
  }, $btnDec.addEventListener("click", onClick), $btnDec.addEventListener("pointerdown", onMouseDown), $btnDec.addEventListener("pointerup", onMouseUp), $btnDec.addEventListener("contextmenu", onContextMenu), $btnInc.addEventListener("click", onClick), $btnInc.addEventListener("pointerdown", onMouseDown), $btnInc.addEventListener("pointerup", onMouseUp), $btnInc.addEventListener("contextmenu", onContextMenu), setNearby($wrapper, {
   focus: $range || $btnInc
  }), $wrapper;
 }
 static #METHOD_MAP = {
  options: SettingElement.#renderOptions,
  "multiple-options": SettingElement.#renderMultipleOptions,
  number: SettingElement.#renderNumber,
  "number-stepper": SettingElement.#renderNumberStepper,
  checkbox: SettingElement.#renderCheckbox
 };
 static render(type, key, setting, currentValue, onChange, options) {
  let method = SettingElement.#METHOD_MAP[type], $control = method(...Array.from(arguments).slice(1));
  if (type !== "number-stepper") $control.id = `bx_setting_${key}`;
  if (type === "options" || type === "multiple-options") $control.name = $control.id;
  return $control;
 }
 static fromPref(key, storage, onChange, overrideParams = {}) {
  let definition = storage.getDefinition(key), currentValue = storage.getSetting(key), type;
  if ("type" in definition) type = definition.type;
  else if ("options" in definition) type = "options";
  else if ("multipleOptions" in definition) type = "multiple-options";
  else if (typeof definition.default === "number") type = "number";
  else type = "checkbox";
  let params = {};
  if ("params" in definition) params = Object.assign(overrideParams, definition.params || {});
  if (params.disabled) currentValue = definition.default;
  return SettingElement.render(type, key, definition, currentValue, (e, value) => {
   storage.setSetting(key, value), onChange && onChange(e, value);
  }, params);
 }
}
class BaseSettingsStore {
 storage;
 storageKey;
 _settings;
 definitions;
 constructor(storageKey, definitions) {
  this.storage = window.localStorage, this.storageKey = storageKey;
  let settingId;
  for (settingId in definitions) {
   let setting = definitions[settingId];
   if (typeof setting.requiredVariants === "string") setting.requiredVariants = [setting.requiredVariants];
   setting.ready && setting.ready.call(this, setting);
  }
  this.definitions = definitions, this._settings = null;
 }
 get settings() {
  if (this._settings) return this._settings;
  let settings = JSON.parse(this.storage.getItem(this.storageKey) || "{}");
  return this._settings = settings, settings;
 }
 getDefinition(key) {
  if (!this.definitions[key]) {
   let error = "Request invalid definition: " + key;
   throw alert(error), Error(error);
  }
  return this.definitions[key];
 }
 getSetting(key, checkUnsupported = !0) {
  if (typeof key === "undefined") {
   debugger;
   return;
  }
  let definition = this.definitions[key];
  if (definition.requiredVariants && !definition.requiredVariants.includes(SCRIPT_VARIANT)) return definition.default;
  if (checkUnsupported && definition.unsupported) return definition.default;
  if (!(key in this.settings)) this.settings[key] = this.validateValue(key, null);
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
  let def = this.definitions[key];
  if (!def) return value;
  if (typeof value === "undefined" || value === null) value = def.default;
  if ("min" in def) value = Math.max(def.min, value);
  if ("max" in def) value = Math.min(def.max, value);
  if ("options" in def && !(value in def.options)) value = def.default;
  else if ("multipleOptions" in def) {
   if (value.length) {
    let validOptions = Object.keys(def.multipleOptions);
    value.forEach((item, idx) => {
     validOptions.indexOf(item) === -1 && value.splice(idx, 1);
    });
   }
   if (!value.length) value = def.default;
  }
  return value;
 }
 getLabel(key) {
  return this.definitions[key].label || key;
 }
 getValueText(key, value) {
  let definition = this.definitions[key];
  if (definition.type === "number-stepper") {
   let params = definition.params;
   if (params.customTextValue) {
    let text = params.customTextValue(value);
    if (text) return text;
   }
   return value.toString();
  } else if ("options" in definition) {
   let options = definition.options;
   if (value in options) return options[value];
  } else if (typeof value === "boolean") return value ? t("on") : t("off");
  return value.toString();
 }
}
class StreamStatsCollector {
 static instance;
 static getInstance = () => StreamStatsCollector.instance ?? (StreamStatsCollector.instance = new StreamStatsCollector);
 LOG_TAG = "StreamStatsCollector";
 static INTERVAL_BACKGROUND = 60000;
 calculateGrade(value, grades) {
  return value > grades[2] ? "bad" : value > grades[1] ? "ok" : value > grades[0] ? "good" : "";
 }
 currentStats = {
  ping: {
   current: -1,
   grades: [40, 75, 100],
   toString() {
    return this.current === -1 ? "???" : this.current.toString();
   }
  },
  jit: {
   current: 0,
   grades: [30, 40, 60],
   toString() {
    return `${this.current.toFixed(2)}ms`;
   }
  },
  fps: {
   current: 0,
   toString() {
    let maxFps = getPref("video_max_fps");
    return maxFps < 60 ? `${maxFps}/${this.current}` : this.current.toString();
   }
  },
  btr: {
   current: 0,
   toString() {
    return `${this.current.toFixed(2)} Mbps`;
   }
  },
  fl: {
   received: 0,
   dropped: 0,
   toString() {
    let framesDroppedPercentage = (this.dropped * 100 / (this.dropped + this.received || 1)).toFixed(2);
    return framesDroppedPercentage === "0.00" ? this.dropped.toString() : `${this.dropped} (${framesDroppedPercentage}%)`;
   }
  },
  pl: {
   received: 0,
   dropped: 0,
   toString() {
    let packetsLostPercentage = (this.dropped * 100 / (this.dropped + this.received || 1)).toFixed(2);
    return packetsLostPercentage === "0.00" ? this.dropped.toString() : `${this.dropped} (${packetsLostPercentage}%)`;
   }
  },
  dt: {
   current: 0,
   total: 0,
   grades: [6, 9, 12],
   toString() {
    return isNaN(this.current) ? "??ms" : `${this.current.toFixed(2)}ms`;
   }
  },
  dl: {
   total: 0,
   toString() {
    return humanFileSize(this.total);
   }
  },
  ul: {
   total: 0,
   toString() {
    return humanFileSize(this.total);
   }
  },
  play: {
   seconds: 0,
   startTime: 0,
   toString() {
    return secondsToHm(this.seconds);
   }
  },
  batt: {
   current: 100,
   start: 100,
   isCharging: !1,
   toString() {
    let text = `${this.current}%`;
    if (this.current !== this.start) {
     let diffLevel = Math.round(this.current - this.start), sign = diffLevel > 0 ? "+" : "";
     text += ` (${sign}${diffLevel}%)`;
    }
    return text;
   }
  },
  time: {
   toString() {
    return (new Date()).toLocaleTimeString([], {
     hour: "2-digit",
     minute: "2-digit",
     hour12: !1
    });
   }
  }
 };
 lastVideoStat;
 constructor() {
  BxLogger.info(this.LOG_TAG, "constructor()");
 }
 async collect() {
  let stats = await STATES.currentStream.peerConnection?.getStats();
  if (!stats) return;
  stats.forEach((stat) => {
   if (stat.type === "inbound-rtp" && stat.kind === "video") {
    let fps = this.currentStats.fps;
    fps.current = stat.framesPerSecond || 0;
    let pl = this.currentStats.pl;
    pl.dropped = Math.max(0, stat.packetsLost), pl.received = stat.packetsReceived;
    let fl = this.currentStats.fl;
    if (fl.dropped = stat.framesDropped, fl.received = stat.framesReceived, !this.lastVideoStat) {
     this.lastVideoStat = stat;
     return;
    }
    let lastStat = this.lastVideoStat, jit = this.currentStats.jit, bufferDelayDiff = stat.jitterBufferDelay - lastStat.jitterBufferDelay, emittedCountDiff = stat.jitterBufferEmittedCount - lastStat.jitterBufferEmittedCount;
    if (emittedCountDiff > 0) jit.current = bufferDelayDiff / emittedCountDiff * 1000;
    let btr = this.currentStats.btr, timeDiff = stat.timestamp - lastStat.timestamp;
    btr.current = 8 * (stat.bytesReceived - lastStat.bytesReceived) / timeDiff / 1000;
    let dt = this.currentStats.dt;
    dt.total = stat.totalDecodeTime - lastStat.totalDecodeTime;
    let framesDecodedDiff = stat.framesDecoded - lastStat.framesDecoded;
    dt.current = dt.total / framesDecodedDiff * 1000, this.lastVideoStat = stat;
   } else if (stat.type === "candidate-pair" && stat.packetsReceived > 0 && stat.state === "succeeded") {
    let ping = this.currentStats.ping;
    ping.current = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : -1;
    let dl = this.currentStats.dl;
    dl.total = stat.bytesReceived;
    let ul = this.currentStats.ul;
    ul.total = stat.bytesSent;
   }
  });
  let batteryLevel = 100, isCharging = !1;
  if (STATES.browser.capabilities.batteryApi) try {
    let bm = await navigator.getBattery();
    isCharging = bm.charging, batteryLevel = Math.round(bm.level * 100);
   } catch (e) {}
  let battery = this.currentStats.batt;
  battery.current = batteryLevel, battery.isCharging = isCharging;
  let playTime = this.currentStats.play, now = +new Date;
  playTime.seconds = Math.ceil((now - playTime.startTime) / 1000);
 }
 getStat(kind) {
  return this.currentStats[kind];
 }
 reset() {
  let playTime = this.currentStats.play;
  playTime.seconds = 0, playTime.startTime = +new Date;
  try {
   STATES.browser.capabilities.batteryApi && navigator.getBattery().then((bm) => {
    this.currentStats.batt.start = Math.round(bm.level * 100);
   });
  } catch (e) {}
 }
 static setupEvents() {
  window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
   StreamStatsCollector.getInstance().reset();
  });
 }
}
function getSupportedCodecProfiles() {
 let options = {
  default: t("default")
 };
 if (!("getCapabilities" in RTCRtpReceiver)) return options;
 let hasLowCodec = !1, hasNormalCodec = !1, hasHighCodec = !1, codecs = RTCRtpReceiver.getCapabilities("video").codecs;
 for (let codec of codecs) {
  if (codec.mimeType.toLowerCase() !== "video/h264" || !codec.sdpFmtpLine) continue;
  let fmtp = codec.sdpFmtpLine.toLowerCase();
  if (fmtp.includes("profile-level-id=4d")) hasHighCodec = !0;
  else if (fmtp.includes("profile-level-id=42e")) hasNormalCodec = !0;
  else if (fmtp.includes("profile-level-id=420")) hasLowCodec = !0;
 }
 if (hasLowCodec) if (!hasNormalCodec && !hasHighCodec) options.default = `${t("visual-quality-low")} (${t("default")})`;
  else options.low = t("visual-quality-low");
 if (hasNormalCodec) if (!hasLowCodec && !hasHighCodec) options.default = `${t("visual-quality-normal")} (${t("default")})`;
  else options.normal = t("visual-quality-normal");
 if (hasHighCodec) if (!hasLowCodec && !hasNormalCodec) options.default = `${t("visual-quality-high")} (${t("default")})`;
  else options.high = t("visual-quality-high");
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
    "en-GB": "English (UK)",
    "en-US": "English (US)",
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
   },
   suggest: {
    lowest: "720p",
    highest: "1080p"
   }
  },
  stream_codec_profile: {
   label: t("visual-quality"),
   default: "default",
   options: getSupportedCodecProfiles(),
   ready: (setting) => {
    let options = setting.options, keys = Object.keys(options);
    if (keys.length <= 1) setting.unsupported = !0, setting.unsupportedNote = "⚠️ " + t("browser-unsupported-feature");
    setting.suggest = {
     lowest: keys.length === 1 ? keys[0] : keys[1],
     highest: keys[keys.length - 1]
    };
   }
  },
  prefer_ipv6_server: {
   label: t("prefer-ipv6-server"),
   default: !1
  },
  screenshot_apply_filters: {
   requiredVariants: "full",
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
   requiredVariants: "full",
   label: t("combine-audio-video-streams"),
   default: !1,
   experimental: !0,
   note: t("combine-audio-video-streams-summary")
  },
  stream_touch_controller: {
   requiredVariants: "full",
   label: t("tc-availability"),
   default: "all",
   options: {
    default: t("default"),
    all: t("tc-all-games"),
    off: t("off")
   },
   unsupported: !STATES.userAgent.capabilities.touch,
   ready: (setting) => {
    if (setting.unsupported) setting.default = "default";
   }
  },
  stream_touch_controller_auto_off: {
   requiredVariants: "full",
   label: t("tc-auto-off"),
   default: !1,
   unsupported: !STATES.userAgent.capabilities.touch
  },
  stream_touch_controller_default_opacity: {
   requiredVariants: "full",
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
   requiredVariants: "full",
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
   requiredVariants: "full",
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
   requiredVariants: "full",
   label: t("hide-idle-cursor"),
   default: !1
  },
  stream_disable_feedback_dialog: {
   requiredVariants: "full",
   label: t("disable-post-stream-feedback-dialog"),
   default: !1
  },
  bitrate_video_max: {
   requiredVariants: "full",
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
     if (value = parseInt(value), value === 0) return t("unlimited");
     else return (value / 1024000).toFixed(1) + " Mb/s";
    }
   },
   suggest: {
    highest: 0
   }
  },
  game_bar_position: {
   requiredVariants: "full",
   label: t("position"),
   default: "bottom-left",
   options: {
    "bottom-left": t("bottom-left"),
    "bottom-right": t("bottom-right"),
    off: t("off")
   }
  },
  local_co_op_enabled: {
   requiredVariants: "full",
   label: t("enable-local-co-op-support"),
   default: !1,
   note: () => CE("a", {
    href: "https://github.com/redphx/better-xcloud/discussions/275",
    target: "_blank"
   }, t("enable-local-co-op-support-note"))
  },
  controller_show_connection_status: {
   label: t("show-controller-connection-status"),
   default: !0
  },
  controller_enable_vibration: {
   requiredVariants: "full",
   label: t("controller-vibration"),
   default: !0
  },
  controller_device_vibration: {
   requiredVariants: "full",
   label: t("device-vibration"),
   default: "off",
   options: {
    on: t("on"),
    auto: t("device-vibration-not-using-gamepad"),
    off: t("off")
   }
  },
  controller_vibration_intensity: {
   requiredVariants: "full",
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
  controller_polling_rate: {
   requiredVariants: "full",
   label: t("polling-rate"),
   type: "number-stepper",
   default: 4,
   min: 4,
   max: 60,
   steps: 4,
   params: {
    exactTicks: 20,
    reverse: !0,
    customTextValue(value) {
     value = parseInt(value);
     let text = +(1000 / value).toFixed(2) + " Hz";
     if (value === 4) text = `${text} (${t("default")})`;
     return text;
    }
   }
  },
  mkb_enabled: {
   requiredVariants: "full",
   label: t("enable-mkb"),
   default: !1,
   unsupported: !STATES.userAgent.capabilities.mkb,
   ready: (setting) => {
    let note, url;
    if (setting.unsupported) note = t("browser-unsupported-feature"), url = "https://github.com/redphx/better-xcloud/issues/206#issuecomment-1920475657";
    else note = t("mkb-disclaimer"), url = "https://better-xcloud.github.io/mouse-and-keyboard/#disclaimer";
    setting.unsupportedNote = () => CE("a", {
     href: url,
     target: "_blank"
    }, "⚠️ " + note);
   }
  },
  native_mkb_enabled: {
   requiredVariants: "full",
   label: t("native-mkb"),
   default: "default",
   options: {
    default: t("default"),
    on: t("on"),
    off: t("off")
   },
   ready: (setting) => {
    if (AppInterface) ;
    else if (UserAgent.isMobile()) setting.unsupported = !0, setting.default = "off", delete setting.options.default, delete setting.options.on;
    else delete setting.options.on;
   }
  },
  native_mkb_scroll_x_sensitivity: {
   requiredVariants: "full",
   label: t("horizontal-scroll-sensitivity"),
   type: "number-stepper",
   default: 0,
   min: 0,
   max: 1e4,
   steps: 10,
   params: {
    exactTicks: 2000,
    customTextValue: (value) => {
     if (!value) return t("default");
     return (value / 100).toFixed(1) + "x";
    }
   }
  },
  native_mkb_scroll_y_sensitivity: {
   requiredVariants: "full",
   label: t("vertical-scroll-sensitivity"),
   type: "number-stepper",
   default: 0,
   min: 0,
   max: 1e4,
   steps: 10,
   params: {
    exactTicks: 2000,
    customTextValue: (value) => {
     if (!value) return t("default");
     return (value / 100).toFixed(1) + "x";
    }
   }
  },
  mkb_default_preset_id: {
   requiredVariants: "full",
   default: 0
  },
  mkb_absolute_mouse: {
   requiredVariants: "full",
   default: !1
  },
  reduce_animations: {
   label: t("reduce-animations"),
   default: !1
  },
  ui_loading_screen_game_art: {
   requiredVariants: "full",
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
   requiredVariants: "full",
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
  ui_hide_sections: {
   requiredVariants: "full",
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
   requiredVariants: "full",
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
   },
   suggest: {
    lowest: "default",
    highest: "webgl2"
   }
  },
  video_processing: {
   label: t("clarity-boost"),
   default: "usm",
   options: {
    usm: t("unsharp-masking"),
    cas: t("amd-fidelity-cas")
   },
   suggest: {
    lowest: "usm",
    highest: "cas"
   }
  },
  video_power_preference: {
   label: t("renderer-configuration"),
   default: "default",
   options: {
    default: t("default"),
    "low-power": t("battery-saving"),
    "high-performance": t("high-performance")
   },
   suggest: {
    highest: "low-power"
   }
  },
  video_max_fps: {
   label: t("max-fps"),
   type: "number-stepper",
   default: 60,
   min: 10,
   max: 60,
   steps: 10,
   params: {
    exactTicks: 10,
    customTextValue: (value) => {
     return value = parseInt(value), value === 60 ? t("unlimited") : value + "fps";
    }
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
   },
   suggest: {
    lowest: 0,
    highest: 2
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
   requiredVariants: "full",
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
    time: `TIME: ${t("clock")}`,
    play: `PLAY: ${t("playtime")}`,
    batt: `BATT: ${t("battery")}`,
    ping: `PING: ${t("stat-ping")}`,
    jit: `JIT: ${t("jitter")}`,
    fps: `FPS: ${t("stat-fps")}`,
    btr: `BTR: ${t("stat-bitrate")}`,
    dt: `DT: ${t("stat-decode-time")}`,
    pl: `PL: ${t("stat-packets-lost")}`,
    fl: `FL: ${t("stat-frames-lost")}`,
    dl: `DL: ${t("downloaded")}`,
    ul: `UL: ${t("uploaded")}`
   },
   params: {
    size: 6
   },
   ready: (setting) => {
    let multipleOptions = setting.multipleOptions;
    if (!STATES.browser.capabilities.batteryApi) delete multipleOptions["batt"];
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
   requiredVariants: "full",
   label: t("enable-remote-play-feature"),
   default: !1
  },
  xhome_resolution: {
   requiredVariants: "full",
   default: "1080p",
   options: {
    "1080p": "1080p",
    "720p": "720p"
   }
  },
  game_fortnite_force_console: {
   requiredVariants: "full",
   label: "🎮 " + t("fortnite-force-console-version"),
   default: !1,
   note: t("fortnite-allow-stw-mode")
  },
  game_msfs2020_force_native_mkb: {
   requiredVariants: "full",
   label: "✈️ " + t("msfs2020-force-native-mkb"),
   default: !1,
   note: t("may-not-work-properly")
  }
 };
 constructor() {
  super("better_xcloud", GlobalSettingsStorage.DEFINITIONS);
 }
}
var globalSettings = new GlobalSettingsStorage, getPrefDefinition = globalSettings.getDefinition.bind(globalSettings), getPref = globalSettings.getSetting.bind(globalSettings), setPref = globalSettings.setSetting.bind(globalSettings);
STORAGE.Global = globalSettings;
var GamepadKeyName = {
 0: ["A", "⇓"],
 1: ["B", "⇒"],
 2: ["X", "⇐"],
 3: ["Y", "⇑"],
 4: ["LB", "↘"],
 5: ["RB", "↙"],
 6: ["LT", "↖"],
 7: ["RT", "↗"],
 8: ["Select", "⇺"],
 9: ["Start", "⇻"],
 16: ["Home", ""],
 12: ["D-Pad Up", "≻"],
 13: ["D-Pad Down", "≽"],
 14: ["D-Pad Left", "≺"],
 15: ["D-Pad Right", "≼"],
 10: ["L3", "↺"],
 100: ["Left Stick Up", "↾"],
 101: ["Left Stick Down", "⇂"],
 102: ["Left Stick Left", "↼"],
 103: ["Left Stick Right", "⇀"],
 11: ["R3", "↻"],
 200: ["Right Stick Up", "↿"],
 201: ["Right Stick Down", "⇃"],
 202: ["Right Stick Left", "↽"],
 203: ["Right Stick Right", "⇁"]
};
var MouseMapTo;
((MouseMapTo2) => {
 MouseMapTo2[MouseMapTo2.OFF = 0] = "OFF";
 MouseMapTo2[MouseMapTo2.LS = 1] = "LS";
 MouseMapTo2[MouseMapTo2.RS = 2] = "RS";
})(MouseMapTo ||= {});
class StreamStats {
 static instance;
 static getInstance = () => StreamStats.instance ?? (StreamStats.instance = new StreamStats);
 LOG_TAG = "StreamStats";
 intervalId;
 REFRESH_INTERVAL = 1000;
 stats = {
  time: {
   name: t("clock"),
   $element: CE("span")
  },
  play: {
   name: t("playtime"),
   $element: CE("span")
  },
  batt: {
   name: t("battery"),
   $element: CE("span")
  },
  ping: {
   name: t("stat-ping"),
   $element: CE("span")
  },
  jit: {
   name: t("jitter"),
   $element: CE("span")
  },
  fps: {
   name: t("stat-fps"),
   $element: CE("span")
  },
  btr: {
   name: t("stat-bitrate"),
   $element: CE("span")
  },
  dt: {
   name: t("stat-decode-time"),
   $element: CE("span")
  },
  pl: {
   name: t("stat-packets-lost"),
   $element: CE("span")
  },
  fl: {
   name: t("stat-frames-lost"),
   $element: CE("span")
  },
  dl: {
   name: t("downloaded"),
   $element: CE("span")
  },
  ul: {
   name: t("uploaded"),
   $element: CE("span")
  }
 };
 $container;
 quickGlanceObserver;
 constructor() {
  BxLogger.info(this.LOG_TAG, "constructor()"), this.render();
 }
 async start(glancing = !1) {
  if (!this.isHidden() || glancing && this.isGlancing()) return;
  this.intervalId && clearInterval(this.intervalId), await this.update(!0), this.$container.classList.remove("bx-gone"), this.$container.dataset.display = glancing ? "glancing" : "fixed", this.intervalId = window.setInterval(this.update.bind(this), this.REFRESH_INTERVAL);
 }
 async stop(glancing = !1) {
  if (glancing && !this.isGlancing()) return;
  this.intervalId && clearInterval(this.intervalId), this.intervalId = null, this.$container.removeAttribute("data-display"), this.$container.classList.add("bx-gone");
 }
 async toggle() {
  if (this.isGlancing()) this.$container && (this.$container.dataset.display = "fixed");
  else this.isHidden() ? await this.start() : await this.stop();
 }
 destroy() {
  this.stop(), this.quickGlanceStop(), this.hideSettingsUi();
 }
 isHidden = () => this.$container.classList.contains("bx-gone");
 isGlancing = () => this.$container.dataset.display === "glancing";
 quickGlanceSetup() {
  if (!STATES.isPlaying || this.quickGlanceObserver) return;
  let $uiContainer = document.querySelector("div[data-testid=ui-container]");
  if (!$uiContainer) return;
  this.quickGlanceObserver = new MutationObserver((mutationList, observer) => {
   for (let record of mutationList) {
    let $target = record.target;
    if (!$target.className || !$target.className.startsWith("GripHandle")) continue;
    if (record.target.ariaExpanded === "true") this.isHidden() && this.start(!0);
    else this.stop(!0);
   }
  }), this.quickGlanceObserver.observe($uiContainer, {
   attributes: !0,
   attributeFilter: ["aria-expanded"],
   subtree: !0
  });
 }
 quickGlanceStop() {
  this.quickGlanceObserver && this.quickGlanceObserver.disconnect(), this.quickGlanceObserver = null;
 }
 async update(forceUpdate = !1) {
  if (!forceUpdate && this.isHidden() || !STATES.currentStream.peerConnection) {
   this.destroy();
   return;
  }
  let PREF_STATS_CONDITIONAL_FORMATTING = getPref("stats_conditional_formatting"), grade = "", statsCollector = StreamStatsCollector.getInstance();
  await statsCollector.collect();
  let statKey;
  for (statKey in this.stats) {
   grade = "";
   let stat = this.stats[statKey], value = statsCollector.getStat(statKey), $element = stat.$element;
   if ($element.textContent = value.toString(), PREF_STATS_CONDITIONAL_FORMATTING && "grades" in value) grade = statsCollector.calculateGrade(value.current, value.grades);
   if ($element.dataset.grade !== grade) $element.dataset.grade = grade;
  }
 }
 refreshStyles() {
  let PREF_ITEMS = getPref("stats_items"), $container = this.$container;
  $container.dataset.stats = "[" + PREF_ITEMS.join("][") + "]", $container.dataset.position = getPref("stats_position"), $container.dataset.transparent = getPref("stats_transparent"), $container.style.opacity = getPref("stats_opacity") + "%", $container.style.fontSize = getPref("stats_text_size");
 }
 hideSettingsUi() {
  if (this.isGlancing() && !getPref("stats_quick_glance")) this.stop();
 }
 async render() {
  this.$container = CE("div", { class: "bx-stats-bar bx-gone" });
  let statKey;
  for (statKey in this.stats) {
   let stat = this.stats[statKey], $div = CE("div", {
    class: `bx-stat-${statKey}`,
    title: stat.name
   }, CE("label", {}, statKey.toUpperCase()), stat.$element);
   this.$container.appendChild($div);
  }
  this.refreshStyles(), document.documentElement.appendChild(this.$container);
 }
 static setupEvents() {
  window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
   let PREF_STATS_QUICK_GLANCE = getPref("stats_quick_glance"), PREF_STATS_SHOW_WHEN_PLAYING = getPref("stats_show_when_playing"), streamStats = StreamStats.getInstance();
   if (PREF_STATS_SHOW_WHEN_PLAYING) streamStats.start();
   else if (PREF_STATS_QUICK_GLANCE) streamStats.quickGlanceSetup(), !PREF_STATS_SHOW_WHEN_PLAYING && streamStats.start(!0);
  });
 }
 static refreshStyles() {
  StreamStats.getInstance().refreshStyles();
 }
}
class Toast {
 static instance;
 static getInstance = () => Toast.instance ?? (Toast.instance = new Toast);
 LOG_TAG = "Toast";
 $wrapper;
 $msg;
 $status;
 stack = [];
 isShowing = !1;
 timeoutId;
 DURATION = 3000;
 constructor() {
  BxLogger.info(this.LOG_TAG, "constructor()"), this.$wrapper = CE("div", { class: "bx-toast bx-offscreen" }, this.$msg = CE("span", { class: "bx-toast-msg" }), this.$status = CE("span", { class: "bx-toast-status" })), this.$wrapper.addEventListener("transitionend", (e) => {
   let classList = this.$wrapper.classList;
   if (classList.contains("bx-hide")) classList.remove("bx-offscreen", "bx-hide"), classList.add("bx-offscreen"), this.showNext();
  }), document.documentElement.appendChild(this.$wrapper);
 }
 show(msg, status, options = {}) {
  options = options || {};
  let args = Array.from(arguments);
  if (options.instant) this.stack = [args], this.showNext();
  else this.stack.push(args), !this.isShowing && this.showNext();
 }
 showNext() {
  if (!this.stack.length) {
   this.isShowing = !1;
   return;
  }
  this.isShowing = !0, this.timeoutId && clearTimeout(this.timeoutId), this.timeoutId = window.setTimeout(this.hide.bind(this), this.DURATION);
  let [msg, status, options] = this.stack.shift();
  if (options && options.html) this.$msg.innerHTML = msg;
  else this.$msg.textContent = msg;
  if (status) this.$status.classList.remove("bx-gone"), this.$status.textContent = status;
  else this.$status.classList.add("bx-gone");
  let classList = this.$wrapper.classList;
  classList.remove("bx-offscreen", "bx-hide"), classList.add("bx-show");
 }
 hide() {
  this.timeoutId = null;
  let classList = this.$wrapper.classList;
  classList.remove("bx-show"), classList.add("bx-hide");
 }
 static show(msg, status, options = {}) {
  Toast.getInstance().show(msg, status, options);
 }
 static showNext() {
  Toast.getInstance().showNext();
 }
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
function productTitleToSlug(title) {
 return title.replace(/[;,/?:@&=+_`~$%#^*()!^™\xae\xa9]/g, "").replace(/\|/g, "-").replace(/ {2,}/g, " ").trim().substr(0, 50).replace(/ /g, "-").toLowerCase();
}
function parseDetailsPath(path) {
 let matches = /\/games\/(?<titleSlug>[^\/]+)\/(?<productId>\w+)/.exec(path);
 if (!matches?.groups) return;
 let titleSlug = matches.groups.titleSlug.replaceAll("%" + "7C", "-"), productId = matches.groups.productId;
 return { titleSlug, productId };
}
class SoundShortcut {
 static adjustGainNodeVolume(amount) {
  if (!getPref("audio_enable_volume_control")) return 0;
  let currentValue = getPref("audio_volume"), nearestValue;
  if (amount > 0) nearestValue = ceilToNearest(currentValue, amount);
  else nearestValue = floorToNearest(currentValue, -1 * amount);
  let newValue;
  if (currentValue !== nearestValue) newValue = nearestValue;
  else newValue = currentValue + amount;
  return newValue = setPref("audio_volume", newValue, !0), SoundShortcut.setGainNodeVolume(newValue), Toast.show(`${t("stream")} ❯ ${t("volume")}`, newValue + "%", { instant: !0 }), newValue;
 }
 static setGainNodeVolume(value) {
  STATES.currentStream.audioGainNode && (STATES.currentStream.audioGainNode.gain.value = value / 100);
 }
 static muteUnmute() {
  if (getPref("audio_enable_volume_control") && STATES.currentStream.audioGainNode) {
   let gainValue = STATES.currentStream.audioGainNode.gain.value, settingValue = getPref("audio_volume"), targetValue;
   if (settingValue === 0) targetValue = 100, setPref("audio_volume", targetValue, !0);
   else if (gainValue === 0) targetValue = settingValue;
   else targetValue = 0;
   let status;
   if (targetValue === 0) status = t("muted");
   else status = targetValue + "%";
   SoundShortcut.setGainNodeVolume(targetValue), Toast.show(`${t("stream")} ❯ ${t("volume")}`, status, { instant: !0 }), BxEvent.dispatch(window, BxEvent.SPEAKER_STATE_CHANGED, {
    speakerState: targetValue === 0 ? 1 : 0
   });
   return;
  }
  let $media = document.querySelector("div[data-testid=media-container] audio") ?? document.querySelector("div[data-testid=media-container] video");
  if ($media) {
   $media.muted = !$media.muted;
   let status = $media.muted ? t("muted") : t("unmuted");
   Toast.show(`${t("stream")} ❯ ${t("volume")}`, status, { instant: !0 }), BxEvent.dispatch(window, BxEvent.SPEAKER_STATE_CHANGED, {
    speakerState: $media.muted ? 1 : 0
   });
  }
 }
}
class BxSelectElement {
 static wrap($select) {
  $select.removeAttribute("tabindex");
  let $btnPrev = createButton({
   label: "<",
   style: 32
  }), $btnNext = createButton({
   label: ">",
   style: 32
  }), isMultiple = $select.multiple, $checkBox, $label, visibleIndex = $select.selectedIndex, $content;
  if (isMultiple) $content = CE("button", {
    class: "bx-select-value bx-focusable",
    tabindex: 0
   }, $checkBox = CE("input", { type: "checkbox" }), $label = CE("span", {}, "")), $content.addEventListener("click", (e) => {
    $checkBox.click();
   }), $checkBox.addEventListener("input", (e) => {
    let $option = getOptionAtIndex(visibleIndex);
    $option && ($option.selected = e.target.checked), BxEvent.dispatch($select, "input");
   });
  else $content = CE("div", {}, $label = CE("label", { for: $select.id + "_checkbox" }, ""));
  let getOptionAtIndex = (index) => {
   return Array.from($select.querySelectorAll("option"))[index];
  }, render = (e) => {
   if (e && e.manualTrigger) visibleIndex = $select.selectedIndex;
   visibleIndex = normalizeIndex(visibleIndex);
   let $option = getOptionAtIndex(visibleIndex), content = "";
   if ($option) if (content = $option.textContent || "", content && $option.parentElement.tagName === "OPTGROUP") {
     $label.innerHTML = "";
     let fragment = document.createDocumentFragment();
     fragment.appendChild(CE("span", {}, $option.parentElement.label)), fragment.appendChild(document.createTextNode(content)), $label.appendChild(fragment);
    } else $label.textContent = content;
   else $label.textContent = content;
   if ($label.classList.toggle("bx-line-through", $option && $option.disabled), isMultiple) $checkBox.checked = $option?.selected || !1, $checkBox.classList.toggle("bx-gone", !content);
   let disablePrev = visibleIndex <= 0, disableNext = visibleIndex === $select.querySelectorAll("option").length - 1;
   $btnPrev.classList.toggle("bx-inactive", disablePrev), $btnNext.classList.toggle("bx-inactive", disableNext), disablePrev && !disableNext && document.activeElement === $btnPrev && $btnNext.focus(), disableNext && !disablePrev && document.activeElement === $btnNext && $btnPrev.focus();
  }, normalizeIndex = (index) => {
   return Math.min(Math.max(index, 0), $select.querySelectorAll("option").length - 1);
  }, onPrevNext = (e) => {
   if (!e.target) return;
   let goNext = e.target.closest("button") === $btnNext, currentIndex = visibleIndex, newIndex = goNext ? currentIndex + 1 : currentIndex - 1;
   if (newIndex = normalizeIndex(newIndex), visibleIndex = newIndex, !isMultiple && newIndex !== currentIndex) $select.selectedIndex = newIndex;
   if (isMultiple) render();
   else BxEvent.dispatch($select, "input");
  };
  $select.addEventListener("input", render), $btnPrev.addEventListener("click", onPrevNext), $btnNext.addEventListener("click", onPrevNext), new MutationObserver((mutationList, observer2) => {
   mutationList.forEach((mutation) => {
    if (mutation.type === "childList" || mutation.type === "attributes") render();
   });
  }).observe($select, {
   subtree: !0,
   childList: !0,
   attributes: !0
  }), render();
  let $div = CE("div", {
   class: "bx-select",
   _nearby: {
    orientation: "horizontal",
    focus: $btnNext
   }
  }, $select, $btnPrev, $content, $btnNext);
  return Object.defineProperty($div, "value", {
   get() {
    return $select.value;
   },
   set(value) {
    $div.setValue(value);
   }
  }), $div.addEventListener = function() {
   $select.addEventListener.apply($select, arguments);
  }, $div.removeEventListener = function() {
   $select.removeEventListener.apply($select, arguments);
  }, $div.dispatchEvent = function() {
   return $select.dispatchEvent.apply($select, arguments);
  }, $div.setValue = (value) => {
   if ("setValue" in $select) $select.setValue(value);
   else $select.value = value;
  }, $div;
 }
}
function onChangeVideoPlayerType() {
 let playerType = getPref("video_player_type"), $videoProcessing = document.getElementById(`bx_setting_${"video_processing"}`), $videoSharpness = document.getElementById(`bx_setting_${"video_sharpness"}`), $videoPowerPreference = document.getElementById(`bx_setting_${"video_power_preference"}`), $videoMaxFps = document.getElementById(`bx_setting_${"video_max_fps"}`);
 if (!$videoProcessing) return;
 let isDisabled = !1, $optCas = $videoProcessing.querySelector(`option[value=${"cas"}]`);
 if (playerType === "webgl2") $optCas && ($optCas.disabled = !1);
 else if ($videoProcessing.value = "usm", setPref("video_processing", "usm"), $optCas && ($optCas.disabled = !0), UserAgent.isSafari()) isDisabled = !0;
 $videoProcessing.disabled = isDisabled, $videoSharpness.dataset.disabled = isDisabled.toString(), $videoPowerPreference.closest(".bx-settings-row").classList.toggle("bx-gone", playerType !== "webgl2"), $videoMaxFps.closest(".bx-settings-row").classList.toggle("bx-gone", playerType !== "webgl2"), updateVideoPlayer();
}
function limitVideoPlayerFps(targetFps) {
 STATES.currentStream.streamPlayer?.getWebGL2Player()?.setTargetFps(targetFps);
}
function updateVideoPlayer() {
 let streamPlayer = STATES.currentStream.streamPlayer;
 if (!streamPlayer) return;
 limitVideoPlayerFps(getPref("video_max_fps"));
 let options = {
  processing: getPref("video_processing"),
  sharpness: getPref("video_sharpness"),
  saturation: getPref("video_saturation"),
  contrast: getPref("video_contrast"),
  brightness: getPref("video_brightness")
 };
 streamPlayer.setPlayerType(getPref("video_player_type")), streamPlayer.updateOptions(options), streamPlayer.refreshPlayer();
}
window.addEventListener("resize", updateVideoPlayer);
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
  let obj = {
   mapping: {},
   mouse: Object.assign({}, preset.mouse)
  };
  for (let buttonIndex in preset.mapping)
   for (let keyName of preset.mapping[parseInt(buttonIndex)])
    obj.mapping[keyName] = parseInt(buttonIndex);
  let mouse = obj.mouse;
  mouse["sensitivity_x"] *= EmulatedMkbHandler.DEFAULT_PANNING_SENSITIVITY, mouse["sensitivity_y"] *= EmulatedMkbHandler.DEFAULT_PANNING_SENSITIVITY, mouse["deadzone_counterweight"] *= EmulatedMkbHandler.DEFAULT_DEADZONE_COUNTERWEIGHT;
  let mouseMapTo = MouseMapTo[mouse["map_to"]];
  if (typeof mouseMapTo !== "undefined") mouse["map_to"] = mouseMapTo;
  else mouse["map_to"] = MkbPreset.MOUSE_SETTINGS["map_to"].default;
  return obj;
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
  if (e instanceof KeyboardEvent) code = e.code || e.key;
  else if (e instanceof WheelEvent) {
   if (e.deltaY < 0) code = "ScrollUp";
   else if (e.deltaY > 0) code = "ScrollDown";
   else if (e.deltaX < 0) code = "ScrollLeft";
   else if (e.deltaX > 0) code = "ScrollRight";
  } else if (e instanceof MouseEvent) code = "Mouse" + e.button;
  if (code) name = KeyHelper.codeToKeyName(code);
  return code ? { code, name } : null;
 }
 static codeToKeyName(code) {
  return KeyHelper.#NON_PRINTABLE_KEYS[code] || code.startsWith("Key") && code.substring(3) || code.startsWith("Digit") && code.substring(5) || code.startsWith("Numpad") && "Numpad " + code.substring(6) || code.startsWith("Arrow") && "Arrow " + code.substring(5) || code.endsWith("Lock") && code.replace("Lock", " Lock") || code.endsWith("Left") && "Left " + code.replace("Left", "") || code.endsWith("Right") && "Right " + code.replace("Right", "") || code;
 }
}
class PointerClient {
 static instance;
 static getInstance = () => PointerClient.instance ?? (PointerClient.instance = new PointerClient);
 LOG_TAG = "PointerClient";
 socket;
 mkbHandler;
 constructor() {
  BxLogger.info(this.LOG_TAG, "constructor()");
 }
 start(port, mkbHandler) {
  if (!port) throw new Error("PointerServer port is 0");
  this.mkbHandler = mkbHandler, this.socket = new WebSocket(`ws://localhost:${port}`), this.socket.binaryType = "arraybuffer", this.socket.addEventListener("open", (event) => {
   BxLogger.info(this.LOG_TAG, "connected");
  }), this.socket.addEventListener("error", (event) => {
   BxLogger.error(this.LOG_TAG, event), Toast.show("Cannot setup mouse: " + event);
  }), this.socket.addEventListener("close", (event) => {
   this.socket = null;
  }), this.socket.addEventListener("message", (event) => {
   let dataView = new DataView(event.data), messageType = dataView.getInt8(0), offset = Int8Array.BYTES_PER_ELEMENT;
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
  let x = dataView.getInt16(offset);
  offset += Int16Array.BYTES_PER_ELEMENT;
  let y = dataView.getInt16(offset);
  this.mkbHandler?.handleMouseMove({
   movementX: x,
   movementY: y
  });
 }
 onPress(messageType, dataView, offset) {
  let button = dataView.getUint8(offset);
  this.mkbHandler?.handleMouseClick({
   pointerButton: button,
   pressed: messageType === 2
  });
 }
 onScroll(dataView, offset) {
  let vScroll = dataView.getInt16(offset);
  offset += Int16Array.BYTES_PER_ELEMENT;
  let hScroll = dataView.getInt16(offset);
  this.mkbHandler?.handleMouseWheel({
   vertical: vScroll,
   horizontal: hScroll
  });
 }
 onPointerCaptureChanged(dataView, offset) {
  dataView.getInt8(offset) !== 1 && this.mkbHandler?.stop();
 }
 stop() {
  try {
   this.socket?.close();
  } catch (e) {}
  this.socket = null;
 }
}
class MouseDataProvider {
 mkbHandler;
 constructor(handler) {
  this.mkbHandler = handler;
 }
}
class MkbHandler {}
class LocalDb {
 static DB_NAME = "BetterXcloud";
 static DB_VERSION = 2;
 db;
 open() {
  return new Promise((resolve, reject) => {
   if (this.db) {
    resolve();
    return;
   }
   let request = window.indexedDB.open(LocalDb.DB_NAME, LocalDb.DB_VERSION);
   request.onupgradeneeded = this.onUpgradeNeeded.bind(this), request.onerror = (e) => {
    console.log(e), alert(e.target.error.message), reject && reject();
   }, request.onsuccess = (e) => {
    this.db = e.target.result, resolve();
   };
  });
 }
 table(name, type) {
  let table = this.db.transaction(name, type || "readonly").objectStore(name);
  return new Promise((resolve) => resolve(table));
 }
 call(method) {
  let table = arguments[1];
  return new Promise((resolve) => {
   let request = method.call(table, ...Array.from(arguments).slice(2));
   request.onsuccess = (e) => {
    resolve([table, e.target.result]);
   };
  });
 }
 count(table) {
  return this.call(table.count, ...arguments);
 }
 add(table, data) {
  return this.call(table.add, ...arguments);
 }
 put(table, data) {
  return this.call(table.put, ...arguments);
 }
 delete(table, data) {
  return this.call(table.delete, ...arguments);
 }
 get(table, id) {
  return this.call(table.get, ...arguments);
 }
 getAll(table) {
  return this.call(table.getAll, ...arguments);
 }
}
class MkbPresetsDb extends LocalDb {
 static instance;
 static getInstance = () => MkbPresetsDb.instance ?? (MkbPresetsDb.instance = new MkbPresetsDb);
 LOG_TAG = "MkbPresetsDb";
 TABLE_PRESETS = "mkb_presets";
 constructor() {
  super();
  BxLogger.info(this.LOG_TAG, "constructor()");
 }
 createTable(db) {
  db.createObjectStore(this.TABLE_PRESETS, {
   keyPath: "id",
   autoIncrement: !0
  }).createIndex("name_idx", "name");
 }
 onUpgradeNeeded(e) {
  let db = e.target.result;
  if (db.objectStoreNames.contains("undefined")) db.deleteObjectStore("undefined");
  if (!db.objectStoreNames.contains(this.TABLE_PRESETS)) this.createTable(db);
 }
 async presetsTable() {
  return await this.open(), await this.table(this.TABLE_PRESETS, "readwrite");
 }
 async newPreset(name, data) {
  let table = await this.presetsTable(), [, id] = await this.add(table, { name, data });
  return id;
 }
 async updatePreset(preset) {
  let table = await this.presetsTable(), [, id] = await this.put(table, preset);
  return id;
 }
 async deletePreset(id) {
  let table = await this.presetsTable();
  return await this.delete(table, id), id;
 }
 async getPreset(id) {
  let table = await this.presetsTable(), [, preset] = await this.get(table, id);
  return preset;
 }
 async getPresets() {
  let table = await this.presetsTable(), [, count] = await this.count(table);
  if (count > 0) {
   let [, items] = await this.getAll(table), presets = {};
   return items.forEach((item) => presets[item.id] = item), presets;
  }
  let preset = {
   name: t("default"),
   data: MkbPreset.DEFAULT_PRESET
  }, [, id] = await this.add(table, preset);
  return preset.id = id, setPref("mkb_default_preset_id", id), {
   [id]: preset
  };
 }
}
var PointerToMouseButton = {
 1: 0,
 2: 2,
 4: 1
}, VIRTUAL_GAMEPAD_ID = "Xbox 360 Controller";
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
 init() {}
 start() {
  window.addEventListener("mousemove", this.#onMouseMoveEvent), window.addEventListener("mousedown", this.#onMouseEvent), window.addEventListener("mouseup", this.#onMouseEvent), window.addEventListener("wheel", this.#onWheelEvent, { passive: !1 }), window.addEventListener("contextmenu", this.#disableContextMenu);
 }
 stop() {
  document.pointerLockElement && document.exitPointerLock(), window.removeEventListener("mousemove", this.#onMouseMoveEvent), window.removeEventListener("mousedown", this.#onMouseEvent), window.removeEventListener("mouseup", this.#onMouseEvent), window.removeEventListener("wheel", this.#onWheelEvent), window.removeEventListener("contextmenu", this.#disableContextMenu);
 }
 destroy() {}
 #onMouseMoveEvent = (e) => {
  this.mkbHandler.handleMouseMove({
   movementX: e.movementX,
   movementY: e.movementY
  });
 };
 #onMouseEvent = (e) => {
  e.preventDefault();
  let isMouseDown = e.type === "mousedown", data = {
   mouseButton: e.button,
   pressed: isMouseDown
  };
  this.mkbHandler.handleMouseClick(data);
 };
 #onWheelEvent = (e) => {
  if (!KeyHelper.getKeyFromEvent(e)) return;
  let data = {
   vertical: e.deltaY,
   horizontal: e.deltaX
  };
  if (this.mkbHandler.handleMouseWheel(data)) e.preventDefault();
 };
 #disableContextMenu = (e) => e.preventDefault();
}
class EmulatedMkbHandler extends MkbHandler {
 static instance;
 static getInstance = () => EmulatedMkbHandler.instance ?? (EmulatedMkbHandler.instance = new EmulatedMkbHandler);
 static LOG_TAG = "EmulatedMkbHandler";
 #CURRENT_PRESET_DATA = MkbPreset.convert(MkbPreset.DEFAULT_PRESET);
 static DEFAULT_PANNING_SENSITIVITY = 0.001;
 static DEFAULT_DEADZONE_COUNTERWEIGHT = 0.01;
 static MAXIMUM_STICK_RANGE = 1.1;
 #VIRTUAL_GAMEPAD = {
  id: VIRTUAL_GAMEPAD_ID,
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
  BxLogger.info(EmulatedMkbHandler.LOG_TAG, "constructor()"), this.#STICK_MAP = {
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
  let gamepads = this.#nativeGetGamepads() || [];
  return gamepads[this.#VIRTUAL_GAMEPAD.index] = this.#VIRTUAL_GAMEPAD, gamepads;
 };
 #getVirtualGamepad = () => this.#VIRTUAL_GAMEPAD;
 #updateStick(stick, x, y) {
  let virtualGamepad = this.#getVirtualGamepad();
  virtualGamepad.axes[stick * 2] = x, virtualGamepad.axes[stick * 2 + 1] = y, virtualGamepad.timestamp = performance.now();
 }
 #vectorLength = (x, y) => Math.sqrt(x ** 2 + y ** 2);
 #resetGamepad = () => {
  let gamepad = this.#getVirtualGamepad();
  gamepad.axes = [0, 0, 0, 0];
  for (let button of gamepad.buttons)
   button.pressed = !1, button.value = 0;
  gamepad.timestamp = performance.now();
 };
 #pressButton = (buttonIndex, pressed) => {
  let virtualGamepad = this.#getVirtualGamepad();
  if (buttonIndex >= 100) {
   let [valueArr, axisIndex] = this.#STICK_MAP[buttonIndex];
   valueArr = valueArr, axisIndex = axisIndex;
   for (let i = valueArr.length - 1;i >= 0; i--)
    if (valueArr[i] === buttonIndex) valueArr.splice(i, 1);
   pressed && valueArr.push(buttonIndex);
   let value;
   if (valueArr.length) value = this.#STICK_MAP[valueArr[valueArr.length - 1]][2];
   else value = 0;
   virtualGamepad.axes[axisIndex] = value;
  } else virtualGamepad.buttons[buttonIndex].pressed = pressed, virtualGamepad.buttons[buttonIndex].value = pressed ? 1 : 0;
  virtualGamepad.timestamp = performance.now();
 };
 #onKeyboardEvent = (e) => {
  let isKeyDown = e.type === "keydown";
  if (e.code === "F8") {
   if (!isKeyDown) e.preventDefault(), this.toggle();
   return;
  }
  if (e.code === "Escape") {
   if (e.preventDefault(), this.#enabled && isKeyDown) {
    if (this.#escKeyDownTime === -1) this.#escKeyDownTime = performance.now();
    else if (performance.now() - this.#escKeyDownTime >= 1000) this.stop();
   } else this.#escKeyDownTime = -1;
   return;
  }
  if (!this.#isPolling) return;
  let buttonIndex = this.#CURRENT_PRESET_DATA.mapping[e.code || e.key];
  if (typeof buttonIndex === "undefined") return;
  if (e.repeat) return;
  e.preventDefault(), this.#pressButton(buttonIndex, isKeyDown);
 };
 #onMouseStopped = () => {
  this.#detectMouseStoppedTimeout = null;
  let analog = this.#CURRENT_PRESET_DATA.mouse["map_to"] === 1 ? 0 : 1;
  this.#updateStick(analog, 0, 0);
 };
 handleMouseClick = (data) => {
  let mouseButton;
  if (typeof data.mouseButton !== "undefined") mouseButton = data.mouseButton;
  else if (typeof data.pointerButton !== "undefined") mouseButton = PointerToMouseButton[data.pointerButton];
  let keyCode = "Mouse" + mouseButton, key = {
   code: keyCode,
   name: KeyHelper.codeToKeyName(keyCode)
  };
  if (!key.name) return;
  let buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code];
  if (typeof buttonIndex === "undefined") return;
  this.#pressButton(buttonIndex, data.pressed);
 };
 handleMouseMove = (data) => {
  let mouseMapTo = this.#CURRENT_PRESET_DATA.mouse["map_to"];
  if (mouseMapTo === 0) return;
  this.#detectMouseStoppedTimeout && clearTimeout(this.#detectMouseStoppedTimeout), this.#detectMouseStoppedTimeout = window.setTimeout(this.#onMouseStopped.bind(this), 50);
  let deadzoneCounterweight = this.#CURRENT_PRESET_DATA.mouse["deadzone_counterweight"], x = data.movementX * this.#CURRENT_PRESET_DATA.mouse["sensitivity_x"], y = data.movementY * this.#CURRENT_PRESET_DATA.mouse["sensitivity_y"], length = this.#vectorLength(x, y);
  if (length !== 0 && length < deadzoneCounterweight) x *= deadzoneCounterweight / length, y *= deadzoneCounterweight / length;
  else if (length > EmulatedMkbHandler.MAXIMUM_STICK_RANGE) x *= EmulatedMkbHandler.MAXIMUM_STICK_RANGE / length, y *= EmulatedMkbHandler.MAXIMUM_STICK_RANGE / length;
  let analog = mouseMapTo === 1 ? 0 : 1;
  this.#updateStick(analog, x, y);
 };
 handleMouseWheel = (data) => {
  let code = "";
  if (data.vertical < 0) code = "ScrollUp";
  else if (data.vertical > 0) code = "ScrollDown";
  else if (data.horizontal < 0) code = "ScrollLeft";
  else if (data.horizontal > 0) code = "ScrollRight";
  if (!code) return !1;
  let key = {
   code,
   name: KeyHelper.codeToKeyName(code)
  }, buttonIndex = this.#CURRENT_PRESET_DATA.mapping[key.code];
  if (typeof buttonIndex === "undefined") return !1;
  if (this.#prevWheelCode === null || this.#prevWheelCode === key.code) this.#wheelStoppedTimeout && clearTimeout(this.#wheelStoppedTimeout), this.#pressButton(buttonIndex, !0);
  return this.#wheelStoppedTimeout = window.setTimeout(() => {
   this.#prevWheelCode = null, this.#pressButton(buttonIndex, !1);
  }, 20), !0;
 };
 toggle = (force) => {
  if (typeof force !== "undefined") this.#enabled = force;
  else this.#enabled = !this.#enabled;
  if (this.#enabled) document.body.requestPointerLock();
  else document.pointerLockElement && document.exitPointerLock();
 };
 #getCurrentPreset = () => {
  return new Promise((resolve) => {
   let presetId = getPref("mkb_default_preset_id");
   MkbPresetsDb.getInstance().getPreset(presetId).then((preset) => {
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
  if (!this.#$message) return;
  if (e.mode === "none") this.#$message.classList.remove("bx-offscreen");
  else this.#$message.classList.add("bx-offscreen");
 };
 #onDialogShown = () => {
  document.pointerLockElement && document.exitPointerLock();
 };
 #initMessage = () => {
  if (!this.#$message) this.#$message = CE("div", { class: "bx-mkb-pointer-lock-msg bx-gone" }, CE("div", {}, CE("p", {}, t("virtual-controller")), CE("p", {}, t("press-key-to-toggle-mkb", { key: "F8" }))), CE("div", { "data-type": "virtual" }, createButton({
    style: 1 | 256 | 64,
    label: t("activate"),
    onClick: ((e) => {
     e.preventDefault(), e.stopPropagation(), this.toggle(!0);
    }).bind(this)
   }), CE("div", {}, createButton({
    label: t("ignore"),
    style: 4,
    onClick: (e) => {
     e.preventDefault(), e.stopPropagation(), this.toggle(!1), this.waitForMouseData(!1);
    }
   }), createButton({
    label: t("edit"),
    onClick: (e) => {
     e.preventDefault(), e.stopPropagation();
     let dialog = SettingsNavigationDialog.getInstance();
     dialog.focusTab("mkb"), NavigationDialogManager.getInstance().show(dialog);
    }
   }))));
  if (!this.#$message.isConnected) document.documentElement.appendChild(this.#$message);
 };
 #onPointerLockChange = () => {
  if (document.pointerLockElement) this.start();
  else this.stop();
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
  if (this.refreshPresetData(), this.#enabled = !1, AppInterface) this.#mouseDataProvider = new WebSocketMouseDataProvider(this);
  else this.#mouseDataProvider = new PointerLockMouseDataProvider(this);
  if (this.#mouseDataProvider.init(), window.addEventListener("keydown", this.#onKeyboardEvent), window.addEventListener("keyup", this.#onKeyboardEvent), window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged), window.addEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this.#onDialogShown), AppInterface) window.addEventListener(BxEvent.POINTER_LOCK_REQUESTED, this), window.addEventListener(BxEvent.POINTER_LOCK_EXITED, this);
  else document.addEventListener("pointerlockchange", this.#onPointerLockChange), document.addEventListener("pointerlockerror", this.#onPointerLockError);
  if (this.#initMessage(), this.#$message?.classList.add("bx-gone"), AppInterface) Toast.show(t("press-key-to-toggle-mkb", { key: "<b>F8</b>" }), t("virtual-controller"), { html: !0 }), this.waitForMouseData(!1);
  else this.waitForMouseData(!0);
 };
 destroy = () => {
  if (this.#isPolling = !1, this.#enabled = !1, this.stop(), this.waitForMouseData(!1), document.pointerLockElement && document.exitPointerLock(), window.removeEventListener("keydown", this.#onKeyboardEvent), window.removeEventListener("keyup", this.#onKeyboardEvent), AppInterface) window.removeEventListener(BxEvent.POINTER_LOCK_REQUESTED, this), window.removeEventListener(BxEvent.POINTER_LOCK_EXITED, this);
  else document.removeEventListener("pointerlockchange", this.#onPointerLockChange), document.removeEventListener("pointerlockerror", this.#onPointerLockError);
  window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged), window.removeEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this.#onDialogShown), this.#mouseDataProvider?.destroy(), window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this.#onPollingModeChanged);
 };
 start = () => {
  if (!this.#enabled) this.#enabled = !0, Toast.show(t("virtual-controller"), t("enabled"), { instant: !0 });
  this.#isPolling = !0, this.#escKeyDownTime = -1, this.#resetGamepad(), window.navigator.getGamepads = this.#patchedGetGamepads, this.waitForMouseData(!1), this.#mouseDataProvider?.start();
  let virtualGamepad = this.#getVirtualGamepad();
  virtualGamepad.connected = !0, virtualGamepad.timestamp = performance.now(), BxEvent.dispatch(window, "gamepadconnected", {
   gamepad: virtualGamepad
  }), window.BX_EXPOSED.stopTakRendering = !0, Toast.show(t("virtual-controller"), t("enabled"), { instant: !0 });
 };
 stop = () => {
  this.#enabled = !1, this.#isPolling = !1, this.#escKeyDownTime = -1;
  let virtualGamepad = this.#getVirtualGamepad();
  if (virtualGamepad.connected) this.#resetGamepad(), virtualGamepad.connected = !1, virtualGamepad.timestamp = performance.now(), BxEvent.dispatch(window, "gamepaddisconnected", {
    gamepad: virtualGamepad
   }), window.navigator.getGamepads = this.#nativeGetGamepads;
  this.waitForMouseData(!0), this.#mouseDataProvider?.stop();
 };
 static setupEvents() {}
}
class NavigationDialog {
 dialogManager;
 constructor() {
  this.dialogManager = NavigationDialogManager.getInstance();
 }
 show() {
  if (NavigationDialogManager.getInstance().show(this), !this.getFocusedElement()) this.focusIfNeeded();
 }
 hide() {
  NavigationDialogManager.getInstance().hide();
 }
 getFocusedElement() {
  let $activeElement = document.activeElement;
  if (!$activeElement) return null;
  if (this.$container.contains($activeElement)) return $activeElement;
  return null;
 }
 onBeforeMount() {}
 onMounted() {}
 onBeforeUnmount() {}
 onUnmounted() {}
 handleKeyPress(key) {
  return !1;
 }
 handleGamepad(button) {
  return !1;
 }
}
class NavigationDialogManager {
 static instance;
 static getInstance = () => NavigationDialogManager.instance ?? (NavigationDialogManager.instance = new NavigationDialogManager);
 LOG_TAG = "NavigationDialogManager";
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
   4: "previousElementSibling",
   2: "nextElementSibling"
  },
  vertical: {
   1: "previousElementSibling",
   3: "nextElementSibling"
  }
 };
 gamepadPollingIntervalId = null;
 gamepadLastStates = [];
 gamepadHoldingIntervalId = null;
 $overlay;
 $container;
 dialog = null;
 constructor() {
  if (BxLogger.info(this.LOG_TAG, "constructor()"), this.$overlay = CE("div", { class: "bx-navigation-dialog-overlay bx-gone" }), this.$overlay.addEventListener("click", (e) => {
   e.preventDefault(), e.stopPropagation(), this.hide();
  }), document.documentElement.appendChild(this.$overlay), this.$container = CE("div", { class: "bx-navigation-dialog bx-gone" }), document.documentElement.appendChild(this.$container), window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, (e) => this.hide()), getPref("ui_controller_friendly"))
   new MutationObserver((mutationList) => {
    if (mutationList.length === 0 || mutationList[0].addedNodes.length === 0) return;
    let $dialog = mutationList[0].addedNodes[0];
    if (!$dialog || !($dialog instanceof HTMLElement)) return;
    this.calculateSelectBoxes($dialog);
   }).observe(this.$container, { childList: !0 });
 }
 calculateSelectBoxes($root) {
  let selects = Array.from($root.querySelectorAll(".bx-select:not([data-calculated]) select"));
  for (let $select of selects) {
   let $parent = $select.parentElement;
   if ($parent.classList.contains("bx-full-width")) {
    $parent.dataset.calculated = "true";
    return;
   }
   let rect = $select.getBoundingClientRect(), $label, width = Math.ceil(rect.width);
   if (!width) return;
   if ($select.multiple) $label = $parent.querySelector(".bx-select-value"), width += 20;
   else $label = $parent.querySelector("div");
   $label.style.minWidth = width + "px", $parent.dataset.calculated = "true";
  }
 }
 handleEvent(event) {
  switch (event.type) {
   case "keydown":
    let $target = event.target, keyboardEvent = event, keyCode = keyboardEvent.code || keyboardEvent.key, handled = this.dialog?.handleKeyPress(keyCode);
    if (handled) {
     event.preventDefault(), event.stopPropagation();
     return;
    }
    if (keyCode === "ArrowUp" || keyCode === "ArrowDown") handled = !0, this.focusDirection(keyCode === "ArrowUp" ? 1 : 3);
    else if (keyCode === "ArrowLeft" || keyCode === "ArrowRight") {
     if (!($target instanceof HTMLInputElement && ($target.type === "text" || $target.type === "range"))) handled = !0, this.focusDirection(keyCode === "ArrowLeft" ? 4 : 2);
    } else if (keyCode === "Enter" || keyCode === "NumpadEnter" || keyCode === "Space") {
     if (!($target instanceof HTMLInputElement && $target.type === "text")) handled = !0, $target.dispatchEvent(new MouseEvent("click"));
    } else if (keyCode === "Escape") handled = !0, this.hide();
    if (handled) event.preventDefault(), event.stopPropagation();
    break;
  }
 }
 isShowing() {
  return this.$container && !this.$container.classList.contains("bx-gone");
 }
 pollGamepad() {
  let gamepads = window.navigator.getGamepads();
  for (let gamepad of gamepads) {
   if (!gamepad || !gamepad.connected) continue;
   if (gamepad.id === VIRTUAL_GAMEPAD_ID) continue;
   let { axes, buttons } = gamepad, releasedButton = null, heldButton = null, lastState = this.gamepadLastStates[gamepad.index], lastTimestamp, lastKey, lastKeyPressed;
   if (lastState) [lastTimestamp, lastKey, lastKeyPressed] = lastState;
   if (lastTimestamp && lastTimestamp === gamepad.timestamp) continue;
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
     let releasedHorizontal = Math.abs(axes[0]) < 0.1 && (lastKey === 102 || lastKey === 103), releasedVertical = Math.abs(axes[1]) < 0.1 && (lastKey === 100 || lastKey === 101);
     if (releasedHorizontal || releasedVertical) releasedButton = lastKey;
     else heldButton = lastKey;
    } else if (axes[0] < -0.5) heldButton = 102;
    else if (axes[0] > 0.5) heldButton = 103;
    else if (axes[1] < -0.5) heldButton = 100;
    else if (axes[1] > 0.5) heldButton = 101;
   }
   if (heldButton !== null) {
    if (this.gamepadLastStates[gamepad.index] = [gamepad.timestamp, heldButton, !1], this.clearGamepadHoldingInterval(), NavigationDialogManager.GAMEPAD_DIRECTION_MAP[heldButton]) this.gamepadHoldingIntervalId = window.setInterval(() => {
      let lastState2 = this.gamepadLastStates[gamepad.index];
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
   if (this.gamepadLastStates[gamepad.index] = null, lastKeyPressed) return;
   if (releasedButton === 0) {
    document.activeElement && document.activeElement.dispatchEvent(new MouseEvent("click"));
    return;
   } else if (releasedButton === 1) {
    this.hide();
    return;
   }
   if (this.handleGamepad(gamepad, releasedButton)) return;
  }
 }
 handleGamepad(gamepad, key) {
  let handled = this.dialog?.handleGamepad(key);
  if (handled) return !0;
  let direction = NavigationDialogManager.GAMEPAD_DIRECTION_MAP[key];
  if (!direction) return !1;
  if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === "range") {
   let $range = document.activeElement;
   if (direction === 4 || direction === 2) $range.value = (parseInt($range.value) + parseInt($range.step) * (direction === 4 ? -1 : 1)).toString(), $range.dispatchEvent(new InputEvent("input")), handled = !0;
  }
  if (!handled) this.focusDirection(direction);
  return this.gamepadLastStates[gamepad.index] && (this.gamepadLastStates[gamepad.index][2] = !0), !0;
 }
 clearGamepadHoldingInterval() {
  this.gamepadHoldingIntervalId && window.clearInterval(this.gamepadHoldingIntervalId), this.gamepadHoldingIntervalId = null;
 }
 show(dialog) {
  if (this.clearGamepadHoldingInterval(), BxEvent.dispatch(window, BxEvent.XCLOUD_DIALOG_SHOWN), window.BX_EXPOSED.disableGamepadPolling = !0, document.body.classList.add("bx-no-scroll"), this.$overlay.classList.remove("bx-gone"), STATES.isPlaying) this.$overlay.classList.add("bx-invisible");
  this.unmountCurrentDialog(), this.dialog = dialog, dialog.onBeforeMount(), this.$container.appendChild(dialog.getContent()), dialog.onMounted(), this.$container.classList.remove("bx-gone"), this.$container.addEventListener("keydown", this), this.startGamepadPolling();
 }
 hide() {
  this.clearGamepadHoldingInterval(), document.body.classList.remove("bx-no-scroll"), BxEvent.dispatch(window, BxEvent.XCLOUD_DIALOG_DISMISSED), this.$overlay.classList.add("bx-gone"), this.$overlay.classList.remove("bx-invisible"), this.$container.classList.add("bx-gone"), this.$container.removeEventListener("keydown", this), this.stopGamepadPolling(), this.unmountCurrentDialog(), window.BX_EXPOSED.disableGamepadPolling = !1;
 }
 focus($elm) {
  if (!$elm) return !1;
  if ($elm.nearby && $elm.nearby.focus) if ($elm.nearby.focus instanceof HTMLElement) return this.focus($elm.nearby.focus);
   else return $elm.nearby.focus();
  return $elm.focus(), $elm === document.activeElement;
 }
 getOrientation($elm) {
  let nearby = $elm.nearby || {};
  if (nearby.selfOrientation) return nearby.selfOrientation;
  let orientation, $current = $elm.parentElement;
  while ($current !== this.$container) {
   let tmp = $current.nearby?.orientation;
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
  if (!$focusing || $focusing === this.$container) return null;
  if (checked.includes($focusing)) return null;
  checked.push($focusing);
  let $target = $focusing, $parent = $target.parentElement, nearby = $target.nearby || {}, orientation = this.getOrientation($target), siblingProperty = NavigationDialogManager.SIBLING_PROPERTY_MAP[orientation][direction];
  if (siblingProperty) {
   let $sibling = $target;
   while ($sibling[siblingProperty]) {
    $sibling = $sibling[siblingProperty];
    let $focusable = this.findFocusableElement($sibling, direction);
    if ($focusable) return $focusable;
   }
  }
  if (nearby.loop) {
   if (nearby.loop(direction)) return null;
  }
  if (checkParent) return this.findNextTarget($parent, direction, checkParent, checked);
  return null;
 }
 findFocusableElement($elm, direction) {
  if (!$elm) return null;
  if (!!$elm.disabled) return null;
  if (!isElementVisible($elm)) return null;
  if ($elm.tabIndex > -1) return $elm;
  let focus = $elm.nearby?.focus;
  if (focus) {
   if (focus instanceof HTMLElement) return this.findFocusableElement(focus, direction);
   else if (typeof focus === "function") {
    if (focus()) return document.activeElement;
   }
  }
  let children = Array.from($elm.children), orientation = $elm.nearby?.orientation || "vertical";
  if (orientation === "horizontal" || orientation === "vertical" && direction === 1) children.reverse();
  for (let $child of children) {
   if (!$child || !($child instanceof HTMLElement)) return null;
   let $target = this.findFocusableElement($child, direction);
   if ($target) return $target;
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
  let dialog = this.dialog;
  if (!dialog) return;
  let $focusing = dialog.getFocusedElement();
  if (!$focusing || !this.findFocusableElement($focusing, direction)) return dialog.focusIfNeeded(), null;
  let $target = this.findNextTarget($focusing, direction, !0);
  this.focus($target);
 }
 unmountCurrentDialog() {
  let dialog = this.dialog;
  dialog && dialog.onBeforeUnmount(), this.$container.firstChild?.remove(), dialog && dialog.onUnmounted(), this.dialog = null;
 }
}
var BxIcon = {
 BETTER_XCLOUD: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-miterlimit='2' stroke-width='2' viewBox='0 0 32 32'><path d='M16.001 7.236h-2.328c-.443 0-1.941-.851-2.357-.905-.824-.106-1.684 0-2.489.176a13.04 13.04 0 0 0-3.137 1.14c-.392.275-.677.668-.866 1.104v.03l-3.302 8.963-.015.015c-.288.867-.553 3.75-.5 4.279a4.89 4.89 0 0 0 1.022 2.55c.654.823 3.71 1.364 4.057 1.016l4.462-4.475c.185-.186 1.547-.706 2.01-.706h6.884c.463 0 1.825.52 2.01.706l4.462 4.475c.347.348 3.403-.193 4.057-1.016a4.89 4.89 0 0 0 1.022-2.55c.053-.529-.212-3.412-.5-4.279l-.015-.015-3.302-8.963v-.03c-.189-.436-.474-.829-.866-1.104a13.04 13.04 0 0 0-3.137-1.14c-.805-.176-1.665-.282-2.489-.176-.416.054-1.914.905-2.357.905h-2.328' fill='none' stroke='#fff'/><path d='M8.172 12.914H6.519c-.235 0-.315.267-.335.452l-.052.578c0 .193.033.384.054.576.023.202.091.511.355.511h1.631l-.001 1.652c0 .234.266.315.452.335l.578.052c.193 0 .384-.033.576-.054.203-.023.511-.091.511-.355V15.03l1.652.001c.234 0 .315-.266.335-.452l.052-.578c-.001-.193-.033-.385-.055-.577-.022-.202-.09-.51-.354-.51h-1.632v-1.652c0-.234-.266-.315-.453-.335l-.577-.052c-.193 0-.385.033-.577.054-.202.023-.51.091-.51.355v1.631m16.546 2.994h-3.487c-.206 0-.413-.043-.604-.121-.177-.072-.339-.183-.476-.316-.149-.144-.259-.315-.341-.504-.156-.361-.172-.788-.032-1.157a1.57 1.57 0 0 1 .459-.641c.106-.089.223-.164.349-.222a1.52 1.52 0 0 1 .423-.123c.167-.024.338-.02.504.012a1.83 1.83 0 0 1 .455-.482 1.62 1.62 0 0 1 .522-.252c.307-.089.651-.09.959-.003a1.75 1.75 0 0 1 1.009.764 1.83 1.83 0 0 1 .251.721c.156 0 .312.031.456.09a1.24 1.24 0 0 1 .372.248c.091.087.165.19.221.302a1.19 1.19 0 0 1-.173 1.299c-.119.132-.276.239-.441.305a1.17 1.17 0 0 1-.426.08z' fill='#fff' stroke='none'/></svg>",
 TRUE_ACHIEVEMENTS: "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' stroke='nons' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M2.497 14.127c.781-6.01 5.542-10.849 11.551-11.708V0C6.634.858.858 6.712 0 14.127h2.497zM17.952 2.419V0C25.366.858 31.142 6.712 32 14.127h-2.497c-.781-6.01-5.542-10.849-11.551-11.708zM2.497 17.873c.781 6.01 5.542 10.849 11.551 11.708V32C6.634 31.142.858 25.288 0 17.873h2.497zm27.006 0H32C31.142 25.288 25.366 31.142 17.952 32v-2.419c6.009-.859 10.77-5.698 11.551-11.708zm-19.2-4.527h2.028a.702.702 0 1 0 0-1.404h-2.107a1.37 1.37 0 0 1-1.326-1.327V9.21a.7.7 0 0 0-.703-.703c-.387 0-.703.316-.703.7v1.408c.079 1.483 1.25 2.731 2.811 2.731zm2.809 7.337h-2.888a1.37 1.37 0 0 1-1.326-1.327v-4.917c0-.387-.316-.703-.7-.703a.7.7 0 0 0-.706.703v4.917a2.77 2.77 0 0 0 2.732 2.732h2.81c.387 0 .702-.316.702-.7.078-.393-.234-.705-.624-.705zM25.6 19.2a.7.7 0 0 0-.702-.702c-.387 0-.703.316-.703.699v.081c0 .702-.546 1.326-1.248 1.326H19.98c-.702-.078-1.248-.624-1.248-1.326v-.312c0-.78.624-1.327 1.326-1.327h2.811a2.77 2.77 0 0 0 2.731-2.732v-.312a2.68 2.68 0 0 0-2.576-2.732h-4.76a.702.702 0 1 0 0 1.405h4.526a1.37 1.37 0 0 1 1.327 1.327v.234c0 .781-.624 1.327-1.327 1.327h-2.81a2.77 2.77 0 0 0-2.731 2.732v.312a2.77 2.77 0 0 0 2.731 2.732h2.967a2.74 2.74 0 0 0 2.575-2.732s.078.078.078 0z'/></svg>",
 STREAM_SETTINGS: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><g transform='matrix(.142357 0 0 .142357 -2.22021 -2.22164)' fill='none' stroke='#fff' stroke-width='16'><circle cx='128' cy='128' r='40'/><path d='M130.05 206.11h-4L94 224c-12.477-4.197-24.049-10.711-34.11-19.2l-.12-36c-.71-1.12-1.38-2.25-2-3.41L25.9 147.24a99.16 99.16 0 0 1 0-38.46l31.84-18.1c.65-1.15 1.32-2.29 2-3.41l.16-36C69.951 42.757 81.521 36.218 94 32l32 17.89h4L162 32c12.477 4.197 24.049 10.711 34.11 19.2l.12 36c.71 1.12 1.38 2.25 2 3.41l31.85 18.14a99.16 99.16 0 0 1 0 38.46l-31.84 18.1c-.65 1.15-1.32 2.29-2 3.41l-.16 36A104.59 104.59 0 0 1 162 224l-31.95-17.89z'/></g></svg>",
 STREAM_STATS: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M1.181 24.55v-3.259c0-8.19 6.576-14.952 14.767-14.98H16c8.13 0 14.819 6.69 14.819 14.819v3.42c0 .625-.515 1.14-1.14 1.14H2.321c-.625 0-1.14-.515-1.14-1.14z'/><path d='M16 6.311v4.56M12.58 25.69l9.12-12.54m4.559 5.7h4.386m-29.266 0H5.74'/></svg>",
 CLOSE: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M29.928,2.072L2.072,29.928'/><path d='M29.928,29.928L2.072,2.072'/></svg>",
 COMMAND: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M25.425 1.5c2.784 0 5.075 2.291 5.075 5.075s-2.291 5.075-5.075 5.075H20.35V6.575c0-2.784 2.291-5.075 5.075-5.075zM11.65 11.65H6.575C3.791 11.65 1.5 9.359 1.5 6.575S3.791 1.5 6.575 1.5s5.075 2.291 5.075 5.075v5.075zm8.7 8.7h5.075c2.784 0 5.075 2.291 5.075 5.075S28.209 30.5 25.425 30.5s-5.075-2.291-5.075-5.075V20.35zM6.575 30.5c-2.784 0-5.075-2.291-5.075-5.075s2.291-5.075 5.075-5.075h5.075v5.075c0 2.784-2.291 5.075-5.075 5.075z'/><path d='M11.65 11.65h8.7v8.7h-8.7z'/></svg>",
 CONTROLLER: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M19.193 12.807h3.193m-13.836 0h4.257'/><path d='M10.678 10.678v4.257'/><path d='M13.061 19.193l-5.602 6.359c-.698.698-1.646 1.09-2.633 1.09-2.044 0-3.725-1.682-3.725-3.725a3.73 3.73 0 0 1 .056-.646l2.177-11.194a6.94 6.94 0 0 1 6.799-5.721h11.722c3.795 0 6.918 3.123 6.918 6.918s-3.123 6.918-6.918 6.918h-8.793z'/><path d='M18.939 19.193l5.602 6.359c.698.698 1.646 1.09 2.633 1.09 2.044 0 3.725-1.682 3.725-3.725a3.73 3.73 0 0 0-.056-.646l-2.177-11.194'/></svg>",
 CREATE_SHORTCUT: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M13.253 3.639c0-.758-.615-1.373-1.373-1.373H3.639c-.758 0-1.373.615-1.373 1.373v8.241c0 .758.615 1.373 1.373 1.373h8.241c.758 0 1.373-.615 1.373-1.373V3.639zm0 16.481c0-.758-.615-1.373-1.373-1.373H3.639c-.758 0-1.373.615-1.373 1.373v8.241c0 .758.615 1.373 1.373 1.373h8.241c.758 0 1.373-.615 1.373-1.373V20.12zm16.481 0c0-.758-.615-1.373-1.373-1.373H20.12c-.758 0-1.373.615-1.373 1.373v8.241c0 .758.615 1.373 1.373 1.373h8.241c.758 0 1.373-.615 1.373-1.373V20.12zM19.262 7.76h9.957'/><path d='M24.24 2.781v9.957'/></svg>",
 DISPLAY: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M1.238 21.119c0 1.928 1.565 3.493 3.493 3.493H27.27c1.928 0 3.493-1.565 3.493-3.493V5.961c0-1.928-1.565-3.493-3.493-3.493H4.731c-1.928 0-3.493 1.565-3.493 3.493v15.158zm19.683 8.413H11.08'/></svg>",
 EYE: "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' stroke='none ' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><clipPath id='A'><path d='M0 0h32v32H0z'/></clipPath><g clip-path='url(#A)'><path d='M31.908 15.568c-.047-.105-1.176-2.611-3.687-5.121C24.876 7.101 20.651 5.333 16 5.333S7.124 7.101 3.779 10.447c-2.511 2.51-3.646 5.02-3.687 5.121-.123.276-.123.591 0 .867.047.105 1.176 2.609 3.687 5.12 3.345 3.344 7.57 5.112 12.221 5.112s8.876-1.768 12.221-5.112c2.511-2.511 3.64-5.015 3.687-5.12.123-.276.123-.591 0-.867zM16 24.533c-4.104 0-7.689-1.492-10.657-4.433-1.218-1.211-2.254-2.592-3.076-4.1.822-1.508 1.858-2.889 3.076-4.1C8.311 8.959 11.896 7.467 16 7.467s7.689 1.492 10.657 4.433c1.221 1.211 2.259 2.592 3.083 4.1-.961 1.795-5.149 8.533-13.74 8.533zM16 9.6c-3.511 0-6.4 2.889-6.4 6.4s2.889 6.4 6.4 6.4 6.4-2.889 6.4-6.4A6.44 6.44 0 0 0 16 9.6zm0 10.667A4.29 4.29 0 0 1 11.733 16 4.29 4.29 0 0 1 16 11.733 4.29 4.29 0 0 1 20.267 16 4.29 4.29 0 0 1 16 20.267z' fill-rule='nonzero'/></g></svg>",
 EYE_SLASH: "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' stroke='none ' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><clipPath id='A'><path d='M0 0h32v32H0z'/></clipPath><g clip-path='url(#A)'><path d='M6.123 3.549a1.07 1.07 0 0 0-.798-.359c-.585 0-1.067.482-1.067 1.067 0 .27.102.53.286.727l2.565 2.823C2.267 10.779.184 15.36.092 15.568c-.123.276-.123.591 0 .867.047.105 1.176 2.609 3.687 5.12 3.345 3.344 7.57 5.112 12.221 5.112a16.97 16.97 0 0 0 6.943-1.444l2.933 3.228c.202.228.493.359.798.359.585 0 1.067-.482 1.067-1.067a1.07 1.07 0 0 0-.286-.727L6.123 3.549zm6.31 10.112l5.556 6.114c-.612.322-1.294.49-1.986.49a4.29 4.29 0 0 1-4.267-4.266c0-.831.242-1.643.697-2.338zM16 24.533c-4.104 0-7.689-1.492-10.657-4.433A17.73 17.73 0 0 1 2.267 16c.625-1.172 2.621-4.452 6.313-6.584l2.4 2.633c-.878 1.125-1.356 2.512-1.356 3.939 0 3.511 2.89 6.4 6.4 6.4 1.221 0 2.416-.349 3.444-1.005l1.964 2.16a14.92 14.92 0 0 1-5.432.99zm.8-12.724a1.07 1.07 0 0 1-.867-1.048c0-.585.482-1.067 1.067-1.067a1.12 1.12 0 0 1 .2.019c2.784.54 4.896 2.863 5.169 5.686a1.07 1.07 0 0 1-.962 1.161c-.034.002-.067.002-.1 0a1.07 1.07 0 0 1-1.067-.968 4.29 4.29 0 0 0-3.44-3.783zm15.104 4.626c-.056.125-1.407 3.116-4.448 5.84a1.07 1.07 0 0 1-.724.283c-.585 0-1.067-.482-1.067-1.067a1.07 1.07 0 0 1 .368-.806A17.7 17.7 0 0 0 29.74 16a17.73 17.73 0 0 0-3.083-4.103C23.689 8.959 20.104 7.467 16 7.467a15.82 15.82 0 0 0-2.581.209 1.06 1.06 0 0 1-.186.016 1.07 1.07 0 0 1-1.067-1.066 1.07 1.07 0 0 1 .901-1.054A17.89 17.89 0 0 1 16 5.333c4.651 0 8.876 1.768 12.221 5.114 2.511 2.51 3.64 5.016 3.687 5.121.123.276.123.591 0 .867h-.004z' fill-rule='nonzero'/></g></svg>",
 HOME: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M12.217 30.503V20.414h7.567v10.089h10.089V15.37a1.26 1.26 0 0 0-.369-.892L16.892 1.867a1.26 1.26 0 0 0-1.784 0L2.497 14.478a1.26 1.26 0 0 0-.369.892v15.133h10.089z'/></svg>",
 NATIVE_MKB: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><g stroke-width='2.1'><path d='m15.817 6h-10.604c-2.215 0-4.013 1.798-4.013 4.013v12.213c0 2.215 1.798 4.013 4.013 4.013h11.21'/><path d='m5.698 20.617h1.124m-1.124-4.517h7.9m-7.881-4.5h7.9m-2.3 9h2.2'/></g><g stroke-width='2.13'><path d='m30.805 13.1c0-3.919-3.181-7.1-7.1-7.1s-7.1 3.181-7.1 7.1v6.4c0 3.919 3.182 7.1 7.1 7.1s7.1-3.181 7.1-7.1z'/><path d='m23.705 14.715v-4.753'/></g></svg>",
 NEW: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'><path d='M26.875 30.5H5.125c-.663 0-1.208-.545-1.208-1.208V2.708c0-.663.545-1.208 1.208-1.208h14.5l8.458 8.458v19.333c0 .663-.545 1.208-1.208 1.208z'/><path d='M19.625 1.5v8.458h8.458m-15.708 9.667h7.25'/><path d='M16 16v7.25'/></svg>",
 COPY: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'><path d='M1.498 6.772h23.73v23.73H1.498zm5.274-5.274h23.73v23.73'/></svg>",
 TRASH: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'><path d='M29.5 6.182h-27m9.818 7.363v9.818m7.364-9.818v9.818'/><path d='M27.045 6.182V29.5c0 .673-.554 1.227-1.227 1.227H6.182c-.673 0-1.227-.554-1.227-1.227V6.182m17.181 0V3.727a2.47 2.47 0 0 0-2.455-2.455h-7.364a2.47 2.47 0 0 0-2.455 2.455v2.455'/></svg>",
 CURSOR_TEXT: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'><path d='M16 7.3a5.83 5.83 0 0 1 5.8-5.8h2.9m0 29h-2.9a5.83 5.83 0 0 1-5.8-5.8'/><path d='M7.3 30.5h2.9a5.83 5.83 0 0 0 5.8-5.8V7.3a5.83 5.83 0 0 0-5.8-5.8H7.3'/><path d='M11.65 16h8.7'/></svg>",
 POWER: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M16 2.445v12.91m7.746-11.619C27.631 6.27 30.2 10.37 30.2 15.355c0 7.79-6.41 14.2-14.2 14.2s-14.2-6.41-14.2-14.2c0-4.985 2.569-9.085 6.454-11.619'/></svg>",
 QUESTION: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'><g transform='matrix(.256867 0 0 .256867 -16.878964 -18.049342)'><circle cx='128' cy='180' r='12' fill='#fff'/><path d='M128 144v-8c17.67 0 32-12.54 32-28s-14.33-28-32-28-32 12.54-32 28v4' fill='none' stroke='#fff' stroke-width='16'/></g></svg>",
 REFRESH: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M23.247 12.377h7.247V5.13'/><path d='M23.911 25.663a13.29 13.29 0 0 1-9.119 3.623C7.504 29.286 1.506 23.289 1.506 16S7.504 2.713 14.792 2.713a13.29 13.29 0 0 1 9.395 3.891l6.307 5.772'/></svg>",
 VIRTUAL_CONTROLLER: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><g stroke-width='2.06'><path d='M8.417 13.218h4.124'/><path d='M10.479 11.155v4.125'/><path d='M12.787 19.404L7.36 25.565a3.61 3.61 0 0 1-2.551 1.056A3.63 3.63 0 0 1 1.2 23.013c0-.21.018-.42.055-.626l2.108-10.845C3.923 8.356 6.714 6.007 9.949 6h5.192'/></g><g stroke-width='2.11'><path d='M30.8 13.1c0-3.919-3.181-7.1-7.1-7.1s-7.1 3.181-7.1 7.1v6.421c0 3.919 3.181 7.1 7.1 7.1s7.1-3.181 7.1-7.1V13.1z'/><path d='M23.7 14.724V9.966'/></g></svg>",
 REMOTE_PLAY: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' viewBox='0 0 32 32'><g transform='matrix(.492308 0 0 .581818 -14.7692 -11.6364)'><clipPath id='A'><path d='M30 20h65v55H30z'/></clipPath><g clip-path='url(#A)'><g transform='matrix(.395211 0 0 .334409 11.913 7.01124)'><g transform='matrix(.555556 0 0 .555556 57.8889 -20.2417)' fill='none' stroke='#fff' stroke-width='13.88'><path d='M200 140.564c-42.045-33.285-101.955-33.285-144 0M168 165c-23.783-17.3-56.217-17.3-80 0'/></g><g transform='matrix(-.555556 0 0 -.555556 200.111 262.393)'><g transform='matrix(1 0 0 1 0 11.5642)'><path d='M200 129c-17.342-13.728-37.723-21.795-58.636-24.198C111.574 101.378 80.703 109.444 56 129' fill='none' stroke='#fff' stroke-width='13.88'/></g><path d='M168 165c-23.783-17.3-56.217-17.3-80 0' fill='none' stroke='#fff' stroke-width='13.88'/></g><g transform='matrix(.75 0 0 .75 32 32)'><path d='M24 72h208v93.881H24z' fill='none' stroke='#fff' stroke-linejoin='miter' stroke-width='9.485'/><circle cx='188' cy='128' r='12' stroke-width='10' transform='matrix(.708333 0 0 .708333 71.8333 12.8333)'/><path d='M24.358 103.5h110' fill='none' stroke='#fff' stroke-linecap='butt' stroke-width='10.282'/></g></g></g></g></svg>",
 CARET_LEFT: "<svg xmlns='http://www.w3.org/2000/svg' width='100%' stroke='#fff' fill='#fff' height='100%' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'><path d='M6.755 1.924l-6 13.649c-.119.27-.119.578 0 .849l6 13.649c.234.533.857.775 1.389.541s.775-.857.541-1.389L2.871 15.997 8.685 2.773c.234-.533-.008-1.155-.541-1.389s-1.155.008-1.389.541z'/></svg>",
 CARET_RIGHT: "<svg xmlns='http://www.w3.org/2000/svg' width='100%' stroke='#fff' fill='#fff' height='100%' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'><path d='M2.685 1.924l6 13.649c.119.27.119.578 0 .849l-6 13.649c-.234.533-.857.775-1.389.541s-.775-.857-.541-1.389l5.813-13.225L.755 2.773c-.234-.533.008-1.155.541-1.389s1.155.008 1.389.541z'/></svg>",
 SCREENSHOT: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><g transform='matrix(.150985 0 0 .150985 -3.32603 -2.72209)' fill='none' stroke='#fff' stroke-width='16'><path d='M208 208H48c-8.777 0-16-7.223-16-16V80c0-8.777 7.223-16 16-16h32l16-24h64l16 24h32c8.777 0 16 7.223 16 16v112c0 8.777-7.223 16-16 16z'/><circle cx='128' cy='132' r='36'/></g></svg>",
 SPEAKER_MUTED: "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' stroke='none' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M5.462 3.4c-.205-.23-.499-.363-.808-.363-.592 0-1.079.488-1.079 1.08a1.08 1.08 0 0 0 .289.736l4.247 4.672H2.504a2.17 2.17 0 0 0-2.16 2.16v8.637a2.17 2.17 0 0 0 2.16 2.16h6.107l9.426 7.33a1.08 1.08 0 0 0 .662.227c.592 0 1.08-.487 1.08-1.079v-6.601l5.679 6.247a1.08 1.08 0 0 0 .808.363c.592 0 1.08-.487 1.08-1.079a1.08 1.08 0 0 0-.29-.736L5.462 3.4zm-2.958 8.285h5.398v8.637H2.504v-8.637zM17.62 26.752l-7.558-5.878V11.67l7.558 8.313v6.769zm5.668-8.607c1.072-1.218 1.072-3.063 0-4.281a1.08 1.08 0 0 1-.293-.74c0-.592.487-1.079 1.079-1.079a1.08 1.08 0 0 1 .834.393 5.42 5.42 0 0 1 0 7.137 1.08 1.08 0 0 1-.81.365c-.593 0-1.08-.488-1.08-1.08 0-.263.096-.517.27-.715zM12.469 7.888c-.147-.19-.228-.423-.228-.663a1.08 1.08 0 0 1 .417-.853l5.379-4.184a1.08 1.08 0 0 1 .662-.227c.593 0 1.08.488 1.08 1.08v10.105c0 .593-.487 1.08-1.08 1.08s-1.079-.487-1.079-1.08V5.255l-3.636 2.834c-.469.362-1.153.273-1.515-.196v-.005zm19.187 8.115a10.79 10.79 0 0 1-2.749 7.199 1.08 1.08 0 0 1-.793.347c-.593 0-1.08-.487-1.08-1.079 0-.26.094-.511.264-.708 2.918-3.262 2.918-8.253 0-11.516-.184-.2-.287-.461-.287-.733 0-.592.487-1.08 1.08-1.08a1.08 1.08 0 0 1 .816.373 10.78 10.78 0 0 1 2.749 7.197z' fill-rule='nonzero'/></svg>",
 TOUCH_CONTROL_ENABLE: "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'><path d='M30.021 9.448a.89.89 0 0 0-.889-.889H2.909a.89.89 0 0 0-.889.889v13.146a.89.89 0 0 0 .889.888h26.223a.89.89 0 0 0 .889-.888V9.448z' fill='none' stroke='#fff' stroke-width='2.083'/><path d='M8.147 11.981l-.053-.001-.054.001c-.55.028-.988.483-.988 1.04v6c0 .575.467 1.042 1.042 1.042l.053-.001c.55-.028.988-.484.988-1.04v-6a1.04 1.04 0 0 0-.988-1.04z'/><path d='M11.147 14.981l-.054-.001h-6a1.04 1.04 0 1 0 0 2.083h6c.575 0 1.042-.467 1.042-1.042a1.04 1.04 0 0 0-.988-1.04z'/><circle cx='25.345' cy='18.582' r='2.561' fill='none' stroke='#fff' stroke-width='1.78' transform='matrix(1.17131 0 0 1.17131 -5.74235 -5.74456)'/></svg>",
 TOUCH_CONTROL_DISABLE: "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' viewBox='0 0 32 32' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2'><g fill='none' stroke='#fff'><path d='M6.021 5.021l20 22' stroke-width='2'/><path d='M8.735 8.559H2.909a.89.89 0 0 0-.889.889v13.146a.89.89 0 0 0 .889.888h19.34m4.289 0h2.594a.89.89 0 0 0 .889-.888V9.448a.89.89 0 0 0-.889-.889H12.971' stroke-miterlimit='1.5' stroke-width='2.083'/></g><path d='M8.147 11.981l-.053-.001-.054.001c-.55.028-.988.483-.988 1.04v6c0 .575.467 1.042 1.042 1.042l.053-.001c.55-.028.988-.484.988-1.04v-6a1.04 1.04 0 0 0-.988-1.04z'/><path d='M11.147 14.981l-.054-.001h-6a1.04 1.04 0 1 0 0 2.083h6c.575 0 1.042-.467 1.042-1.042a1.04 1.04 0 0 0-.988-1.04z'/><circle cx='25.345' cy='18.582' r='2.561' fill='none' stroke='#fff' stroke-width='1.78' transform='matrix(1.17131 0 0 1.17131 -5.74235 -5.74456)'/></svg>",
 MICROPHONE: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M21.368 6.875A5.37 5.37 0 0 0 16 1.507a5.37 5.37 0 0 0-5.368 5.368v8.588A5.37 5.37 0 0 0 16 20.831a5.37 5.37 0 0 0 5.368-5.368V6.875zM16 25.125v5.368m9.662-15.03c0 5.3-4.362 9.662-9.662 9.662s-9.662-4.362-9.662-9.662'/></svg>",
 MICROPHONE_MUTED: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M16 25.125v5.368M5.265 4.728l21.471 23.618m-4.789-5.267c-1.698 1.326-3.793 2.047-5.947 2.047-5.3 0-9.662-4.362-9.662-9.662'/><path d='M25.662 15.463a9.62 9.62 0 0 1-.978 4.242m-5.64.187c-.895.616-1.957.943-3.043.939-2.945 0-5.368-2.423-5.368-5.368v-4.831m.442-5.896A5.38 5.38 0 0 1 16 1.507c2.945 0 5.368 2.423 5.368 5.368v8.588c0 .188-.01.375-.03.562'/></svg>",
 BATTERY: "<svg xmlns='http://www.w3.org/2000/svg' fill='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' stroke-miterlimit='2' viewBox='0 0 32 32'><path d='M24.774 6.71H3.097C1.398 6.71 0 8.108 0 9.806v12.387c0 1.699 1.398 3.097 3.097 3.097h21.677c1.699 0 3.097-1.398 3.097-3.097V9.806c0-1.699-1.398-3.097-3.097-3.097zm1.032 15.484a1.04 1.04 0 0 1-1.032 1.032H3.097a1.04 1.04 0 0 1-1.032-1.032V9.806a1.04 1.04 0 0 1 1.032-1.032h21.677a1.04 1.04 0 0 1 1.032 1.032v12.387zm-2.065-10.323v8.258a1.04 1.04 0 0 1-1.032 1.032H5.161a1.04 1.04 0 0 1-1.032-1.032v-8.258a1.04 1.04 0 0 1 1.032-1.032H22.71a1.04 1.04 0 0 1 1.032 1.032zm8.258 0v8.258a1.04 1.04 0 0 1-1.032 1.032 1.04 1.04 0 0 1-1.032-1.032v-8.258a1.04 1.04 0 0 1 1.032-1.032A1.04 1.04 0 0 1 32 11.871z' fill-rule='nonzero'/></svg>",
 PLAYTIME: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><g transform='matrix(.150026 0 0 .150026 -3.20332 -3.20332)' fill='none' stroke='#fff' stroke-width='16'><circle cx='128' cy='128' r='96'/><path d='M128 72v56h56'/></g></svg>",
 SERVER: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M9.773 16c0-5.694 4.685-10.379 10.379-10.379S30.53 10.306 30.53 16s-4.685 10.379-10.379 10.379H8.735c-3.982-.005-7.256-3.283-7.256-7.265s3.28-7.265 7.265-7.265c.606 0 1.21.076 1.797.226' fill='none' stroke='#fff' stroke-width='2.076'/></svg>",
 DOWNLOAD: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M16 19.955V1.5m14.5 18.455v9.227c0 .723-.595 1.318-1.318 1.318H2.818c-.723 0-1.318-.595-1.318-1.318v-9.227'/><path d='M22.591 13.364L16 19.955l-6.591-6.591'/></svg>",
 UPLOAD: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M16 19.905V1.682m14.318 18.223v9.112a1.31 1.31 0 0 1-1.302 1.302H2.983a1.31 1.31 0 0 1-1.302-1.302v-9.112'/><path d='M9.492 8.19L16 1.682l6.508 6.508'/></svg>",
 AUDIO: "<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 32 32'><path d='M8.964 21.417h-6.5a1.09 1.09 0 0 1-1.083-1.083v-8.667a1.09 1.09 0 0 1 1.083-1.083h6.5L18.714 3v26l-9.75-7.583z'/><path d='M8.964 10.583v10.833m15.167-8.28a4.35 4.35 0 0 1 0 5.728M28.149 9.5a9.79 9.79 0 0 1 0 13'/></svg>"
};
class Dialog {
 $dialog;
 $title;
 $content;
 $overlay;
 onClose;
 constructor(options) {
  let {
   title,
   className,
   content,
   hideCloseButton,
   onClose,
   helpUrl
  } = options, $overlay = document.querySelector(".bx-dialog-overlay");
  if (!$overlay) this.$overlay = CE("div", { class: "bx-dialog-overlay bx-gone" }), this.$overlay.addEventListener("contextmenu", (e) => e.preventDefault()), document.documentElement.appendChild(this.$overlay);
  else this.$overlay = $overlay;
  let $close;
  this.onClose = onClose, this.$dialog = CE("div", { class: `bx-dialog ${className || ""} bx-gone` }, this.$title = CE("h2", {}, CE("b", {}, title), helpUrl && createButton({
   icon: BxIcon.QUESTION,
   style: 4,
   title: t("help"),
   url: helpUrl
  })), this.$content = CE("div", { class: "bx-dialog-content" }, content), !hideCloseButton && ($close = CE("button", { type: "button" }, t("close")))), $close && $close.addEventListener("click", (e) => {
   this.hide(e);
  }), !title && this.$title.classList.add("bx-gone"), !content && this.$content.classList.add("bx-gone"), this.$dialog.addEventListener("contextmenu", (e) => e.preventDefault()), document.documentElement.appendChild(this.$dialog);
 }
 show(newOptions) {
  if (document.activeElement && document.activeElement.blur(), newOptions && newOptions.title) this.$title.querySelector("b").textContent = newOptions.title, this.$title.classList.remove("bx-gone");
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
 BUTTON_ORDERS = [
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
 static instance;
 static getInstance = () => MkbRemapper.instance ?? (MkbRemapper.instance = new MkbRemapper);
 LOG_TAG = "MkbRemapper";
 states = {
  currentPresetId: 0,
  presets: {},
  editingPresetData: null,
  isEditing: !1
 };
 $wrapper;
 $presetsSelect;
 $activateButton;
 $currentBindingKey;
 allKeyElements = [];
 allMouseElements = {};
 bindingDialog;
 constructor() {
  BxLogger.info(this.LOG_TAG, "constructor()"), this.states.currentPresetId = getPref("mkb_default_preset_id"), this.bindingDialog = new Dialog({
   className: "bx-binding-dialog",
   content: CE("div", {}, CE("p", {}, t("press-to-bind")), CE("i", {}, t("press-esc-to-cancel"))),
   hideCloseButton: !0
  });
 }
 clearEventListeners = () => {
  window.removeEventListener("keydown", this.onKeyDown), window.removeEventListener("mousedown", this.onMouseDown), window.removeEventListener("wheel", this.onWheel);
 };
 bindKey = ($elm, key) => {
  let buttonIndex = parseInt($elm.dataset.buttonIndex), keySlot = parseInt($elm.dataset.keySlot);
  if ($elm.dataset.keyCode === key.code) return;
  for (let $otherElm of this.allKeyElements)
   if ($otherElm.dataset.keyCode === key.code) this.unbindKey($otherElm);
  this.states.editingPresetData.mapping[buttonIndex][keySlot] = key.code, $elm.textContent = key.name, $elm.dataset.keyCode = key.code;
 };
 unbindKey = ($elm) => {
  let buttonIndex = parseInt($elm.dataset.buttonIndex), keySlot = parseInt($elm.dataset.keySlot);
  this.states.editingPresetData.mapping[buttonIndex][keySlot] = null, $elm.textContent = "", delete $elm.dataset.keyCode;
 };
 onWheel = (e) => {
  e.preventDefault(), this.clearEventListeners(), this.bindKey(this.$currentBindingKey, KeyHelper.getKeyFromEvent(e)), window.setTimeout(() => this.bindingDialog.hide(), 200);
 };
 onMouseDown = (e) => {
  e.preventDefault(), this.clearEventListeners(), this.bindKey(this.$currentBindingKey, KeyHelper.getKeyFromEvent(e)), window.setTimeout(() => this.bindingDialog.hide(), 200);
 };
 onKeyDown = (e) => {
  if (e.preventDefault(), e.stopPropagation(), this.clearEventListeners(), e.code !== "Escape") this.bindKey(this.$currentBindingKey, KeyHelper.getKeyFromEvent(e));
  window.setTimeout(() => this.bindingDialog.hide(), 200);
 };
 onBindingKey = (e) => {
  if (!this.states.isEditing || e.button !== 0) return;
  console.log(e), this.$currentBindingKey = e.target, window.addEventListener("keydown", this.onKeyDown), window.addEventListener("mousedown", this.onMouseDown), window.addEventListener("wheel", this.onWheel), this.bindingDialog.show({ title: this.$currentBindingKey.dataset.prompt });
 };
 onContextMenu = (e) => {
  if (e.preventDefault(), !this.states.isEditing) return;
  this.unbindKey(e.target);
 };
 getPreset = (presetId) => {
  return this.states.presets[presetId];
 };
 getCurrentPreset = () => {
  let preset = this.getPreset(this.states.currentPresetId);
  if (!preset) {
   let firstPresetId = parseInt(Object.keys(this.states.presets)[0]);
   preset = this.states.presets[firstPresetId], this.states.currentPresetId = firstPresetId, setPref("mkb_default_preset_id", firstPresetId);
  }
  return preset;
 };
 switchPreset = (presetId) => {
  this.states.currentPresetId = presetId;
  let presetData = this.getCurrentPreset().data;
  for (let $elm of this.allKeyElements) {
   let buttonIndex = parseInt($elm.dataset.buttonIndex), keySlot = parseInt($elm.dataset.keySlot), buttonKeys = presetData.mapping[buttonIndex];
   if (buttonKeys && buttonKeys[keySlot]) $elm.textContent = KeyHelper.codeToKeyName(buttonKeys[keySlot]), $elm.dataset.keyCode = buttonKeys[keySlot];
   else $elm.textContent = "", delete $elm.dataset.keyCode;
  }
  let key;
  for (key in this.allMouseElements) {
   let $elm = this.allMouseElements[key], value = presetData.mouse[key];
   if (typeof value === "undefined") value = MkbPreset.MOUSE_SETTINGS[key].default;
   "setValue" in $elm && $elm.setValue(value);
  }
  let activated = getPref("mkb_default_preset_id") === this.states.currentPresetId;
  this.$activateButton.disabled = activated, this.$activateButton.querySelector("span").textContent = activated ? t("activated") : t("activate");
 };
 async refresh() {
  removeChildElements(this.$presetsSelect);
  let presets = await MkbPresetsDb.getInstance().getPresets();
  this.states.presets = presets;
  let fragment = document.createDocumentFragment(), defaultPresetId;
  if (this.states.currentPresetId === 0) this.states.currentPresetId = parseInt(Object.keys(presets)[0]), defaultPresetId = this.states.currentPresetId, setPref("mkb_default_preset_id", defaultPresetId), EmulatedMkbHandler.getInstance().refreshPresetData();
  else defaultPresetId = getPref("mkb_default_preset_id");
  for (let id in presets) {
   let name = presets[id].name;
   if (id === defaultPresetId) name = "🎮 " + name;
   let $options = CE("option", { value: id }, name);
   $options.selected = parseInt(id) === this.states.currentPresetId, fragment.appendChild($options);
  }
  this.$presetsSelect.appendChild(fragment);
  let activated = defaultPresetId === this.states.currentPresetId;
  this.$activateButton.disabled = activated, this.$activateButton.querySelector("span").textContent = activated ? t("activated") : t("activate"), !this.states.isEditing && this.switchPreset(this.states.currentPresetId);
 }
 toggleEditing = (force) => {
  if (this.states.isEditing = typeof force !== "undefined" ? force : !this.states.isEditing, this.$wrapper.classList.toggle("bx-editing", this.states.isEditing), this.states.isEditing) this.states.editingPresetData = deepClone(this.getCurrentPreset().data);
  else this.states.editingPresetData = null;
  let childElements = this.$wrapper.querySelectorAll("select, button, input");
  for (let $elm of Array.from(childElements)) {
   if ($elm.parentElement.parentElement.classList.contains("bx-mkb-action-buttons")) continue;
   let disable = !this.states.isEditing;
   if ($elm.parentElement.classList.contains("bx-mkb-preset-tools")) disable = !disable;
   $elm.disabled = disable;
  }
 };
 render() {
  this.$wrapper = CE("div", { class: "bx-mkb-settings" }), this.$presetsSelect = CE("select", { tabindex: -1 }), this.$presetsSelect.addEventListener("change", (e) => {
   this.switchPreset(parseInt(e.target.value));
  });
  let promptNewName = (value) => {
   let newName = "";
   while (!newName) {
    if (newName = prompt(t("prompt-preset-name"), value), newName === null) return !1;
    newName = newName.trim();
   }
   return newName ? newName : !1;
  }, $header = CE("div", { class: "bx-mkb-preset-tools" }, this.$presetsSelect, createButton({
   title: t("rename"),
   icon: BxIcon.CURSOR_TEXT,
   tabIndex: -1,
   onClick: async () => {
    let preset = this.getCurrentPreset(), newName = promptNewName(preset.name);
    if (!newName || newName === preset.name) return;
    preset.name = newName, await MkbPresetsDb.getInstance().updatePreset(preset), await this.refresh();
   }
  }), createButton({
   icon: BxIcon.NEW,
   title: t("new"),
   tabIndex: -1,
   onClick: (e) => {
    let newName = promptNewName("");
    if (!newName) return;
    MkbPresetsDb.getInstance().newPreset(newName, MkbPreset.DEFAULT_PRESET).then((id) => {
     this.states.currentPresetId = id, this.refresh();
    });
   }
  }), createButton({
   icon: BxIcon.COPY,
   title: t("copy"),
   tabIndex: -1,
   onClick: (e) => {
    let preset = this.getCurrentPreset(), newName = promptNewName(`${preset.name} (2)`);
    if (!newName) return;
    MkbPresetsDb.getInstance().newPreset(newName, preset.data).then((id) => {
     this.states.currentPresetId = id, this.refresh();
    });
   }
  }), createButton({
   icon: BxIcon.TRASH,
   style: 2,
   title: t("delete"),
   tabIndex: -1,
   onClick: (e) => {
    if (!confirm(t("confirm-delete-preset"))) return;
    MkbPresetsDb.getInstance().deletePreset(this.states.currentPresetId).then((id) => {
     this.states.currentPresetId = 0, this.refresh();
    });
   }
  }));
  this.$wrapper.appendChild($header);
  let $rows = CE("div", { class: "bx-mkb-settings-rows" }, CE("i", { class: "bx-mkb-note" }, t("right-click-to-unbind"))), keysPerButton = 2;
  for (let buttonIndex of this.BUTTON_ORDERS) {
   let [buttonName, buttonPrompt] = GamepadKeyName[buttonIndex], $elm, $fragment = document.createDocumentFragment();
   for (let i = 0;i < keysPerButton; i++)
    $elm = CE("button", {
     type: "button",
     "data-prompt": buttonPrompt,
     "data-button-index": buttonIndex,
     "data-key-slot": i
    }, " "), $elm.addEventListener("mouseup", this.onBindingKey), $elm.addEventListener("contextmenu", this.onContextMenu), $fragment.appendChild($elm), this.allKeyElements.push($elm);
   let $keyRow = CE("div", { class: "bx-mkb-key-row" }, CE("label", { title: buttonName }, buttonPrompt), $fragment);
   $rows.appendChild($keyRow);
  }
  $rows.appendChild(CE("i", { class: "bx-mkb-note" }, t("mkb-adjust-ingame-settings")));
  let $mouseSettings = document.createDocumentFragment();
  for (let key in MkbPreset.MOUSE_SETTINGS) {
   let setting = MkbPreset.MOUSE_SETTINGS[key], value = setting.default, $elm, onChange = (e, value2) => {
    this.states.editingPresetData.mouse[key] = value2;
   }, $row = CE("label", {
    class: "bx-settings-row",
    for: `bx_setting_${key}`
   }, CE("span", { class: "bx-settings-label" }, setting.label), $elm = SettingElement.render(setting.type, key, setting, value, onChange, setting.params));
   $mouseSettings.appendChild($row), this.allMouseElements[key] = $elm;
  }
  $rows.appendChild($mouseSettings), this.$wrapper.appendChild($rows);
  let $actionButtons = CE("div", { class: "bx-mkb-action-buttons" }, CE("div", {}, createButton({
   label: t("edit"),
   tabIndex: -1,
   onClick: (e) => this.toggleEditing(!0)
  }), this.$activateButton = createButton({
   label: t("activate"),
   style: 1,
   tabIndex: -1,
   onClick: (e) => {
    setPref("mkb_default_preset_id", this.states.currentPresetId), EmulatedMkbHandler.getInstance().refreshPresetData(), this.refresh();
   }
  })), CE("div", {}, createButton({
   label: t("cancel"),
   style: 4,
   tabIndex: -1,
   onClick: (e) => {
    this.switchPreset(this.states.currentPresetId), this.toggleEditing(!1);
   }
  }), createButton({
   label: t("save"),
   style: 1,
   tabIndex: -1,
   onClick: (e) => {
    let updatedPreset = deepClone(this.getCurrentPreset());
    updatedPreset.data = this.states.editingPresetData, MkbPresetsDb.getInstance().updatePreset(updatedPreset).then((id) => {
     if (id === getPref("mkb_default_preset_id")) EmulatedMkbHandler.getInstance().refreshPresetData();
     this.toggleEditing(!1), this.refresh();
    });
   }
  })));
  return this.$wrapper.appendChild($actionButtons), this.toggleEditing(!1), this.refresh(), this.$wrapper;
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
  let intensity = Math.min(100, data.leftMotorPercent + data.rightMotorPercent / 2) * window.BX_VIBRATION_INTENSITY;
  if (intensity === 0 || intensity === 100) {
   window.navigator.vibrate(intensity ? data.durationMs : 0);
   return;
  }
  let pulseDuration = 200, onDuration = Math.floor(pulseDuration * intensity / 100), offDuration = pulseDuration - onDuration, repeats = Math.ceil(data.durationMs / pulseDuration), pulses = Array(repeats).fill([onDuration, offDuration]).flat();
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
  let value = getPref("controller_device_vibration"), enabled;
  if (value === "on") enabled = !0;
  else if (value === "auto") {
   enabled = !0;
   let gamepads = window.navigator.getGamepads();
   for (let gamepad of gamepads)
    if (gamepad) {
     enabled = !1;
     break;
    }
  } else enabled = !1;
  window.BX_ENABLE_DEVICE_VIBRATION = enabled;
 }
 static #onMessage(e) {
  if (!window.BX_ENABLE_DEVICE_VIBRATION) return;
  if (typeof e !== "object" || !(e.data instanceof ArrayBuffer)) return;
  let dataView = new DataView(e.data), offset = 0, messageType;
  if (dataView.byteLength === 13) messageType = dataView.getUint16(offset, !0), offset += Uint16Array.BYTES_PER_ELEMENT;
  else messageType = dataView.getUint8(offset), offset += Uint8Array.BYTES_PER_ELEMENT;
  if (!(messageType & 128)) return;
  let vibrationType = dataView.getUint8(offset);
  if (offset += Uint8Array.BYTES_PER_ELEMENT, vibrationType !== 0) return;
  let data = {}, key;
  for (key in VIBRATION_DATA_MAP)
   if (VIBRATION_DATA_MAP[key] === 16) data[key] = dataView.getUint16(offset, !0), offset += Uint16Array.BYTES_PER_ELEMENT;
   else data[key] = dataView.getUint8(offset), offset += Uint8Array.BYTES_PER_ELEMENT;
  VibrationManager.#playDeviceVibration(data);
 }
 static initialSetup() {
  window.addEventListener("gamepadconnected", (e) => VibrationManager.updateGlobalVars()), window.addEventListener("gamepaddisconnected", (e) => VibrationManager.updateGlobalVars()), VibrationManager.updateGlobalVars(!1), window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, (e) => {
   let dataChannel = e.dataChannel;
   if (!dataChannel || dataChannel.label !== "input") return;
   dataChannel.addEventListener("message", VibrationManager.#onMessage);
  });
 }
}
var FeatureGates = {
 PwaPrompt: !1,
 EnableWifiWarnings: !1,
 EnableUpdateRequiredPage: !1,
 ShowForcedUpdateScreen: !1
};
if (getPref("block_social_features")) FeatureGates.EnableGuideChatTab = !1;
if (BX_FLAGS.FeatureGates) FeatureGates = Object.assign(BX_FLAGS.FeatureGates, FeatureGates);
class FullscreenText {
 static instance;
 static getInstance = () => FullscreenText.instance ?? (FullscreenText.instance = new FullscreenText);
 LOG_TAG = "FullscreenText";
 $text;
 constructor() {
  BxLogger.info(this.LOG_TAG, "constructor()"), this.$text = CE("div", {
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
function showGamepadToast(gamepad) {
 if (gamepad.id === VIRTUAL_GAMEPAD_ID) return;
 BxLogger.info("Gamepad", gamepad);
 let text = "🎮";
 if (getPref("local_co_op_enabled")) text += ` #${gamepad.index + 1}`;
 let gamepadId = gamepad.id.replace(/ \(.*?Vendor: \w+ Product: \w+\)$/, "");
 text += ` - ${gamepadId}`;
 let status;
 if (gamepad.connected) status = (gamepad.vibrationActuator ? "✅" : "❌") + " " + t("vibration-status");
 else status = t("disconnected");
 Toast.show(text, status, { instant: !1 });
}
class SettingsNavigationDialog extends NavigationDialog {
 static instance;
 static getInstance = () => SettingsNavigationDialog.instance ?? (SettingsNavigationDialog.instance = new SettingsNavigationDialog);
 LOG_TAG = "SettingsNavigationDialog";
 $container;
 $tabs;
 $tabContents;
 $btnReload;
 $btnGlobalReload;
 $noteGlobalReload;
 $btnSuggestion;
 renderFullSettings;
 suggestedSettings = {
  recommended: {},
  default: {},
  lowest: {},
  highest: {}
 };
 suggestedSettingLabels = {};
 settingElements = {};
 TAB_GLOBAL_ITEMS = [{
  group: "general",
  label: t("better-xcloud"),
  helpUrl: "https://better-xcloud.github.io/features/",
  items: [
   ($parent) => {
    let PREF_LATEST_VERSION = getPref("version_latest"), topButtons = [];
    if (!SCRIPT_VERSION.includes("beta") && PREF_LATEST_VERSION && PREF_LATEST_VERSION != SCRIPT_VERSION) {
     let opts = {
      label: "🌟 " + t("new-version-available", { version: PREF_LATEST_VERSION }),
      style: 1 | 32 | 64
     };
     if (AppInterface && AppInterface.updateLatestScript) opts.onClick = (e) => AppInterface.updateLatestScript();
     else opts.url = "https://github.com/redphx/better-xcloud/releases/latest";
     topButtons.push(createButton(opts));
    }
    if (AppInterface) topButtons.push(createButton({
      label: t("app-settings"),
      icon: BxIcon.STREAM_SETTINGS,
      style: 64 | 32,
      onClick: (e) => {
       AppInterface.openAppSettings && AppInterface.openAppSettings(), this.hide();
      }
     }));
    else if (UserAgent.getDefault().toLowerCase().includes("android")) topButtons.push(createButton({
      label: "🔥 " + t("install-android"),
      style: 64 | 32,
      url: "https://better-xcloud.github.io/android"
     }));
    this.$btnGlobalReload = createButton({
     label: t("settings-reload"),
     classes: ["bx-settings-reload-button", "bx-gone"],
     style: 32 | 64,
     onClick: (e) => {
      this.reloadPage();
     }
    }), topButtons.push(this.$btnGlobalReload), this.$noteGlobalReload = CE("span", {
     class: "bx-settings-reload-note"
    }, t("settings-reload-note")), topButtons.push(this.$noteGlobalReload), this.$btnSuggestion = CE("div", {
     class: "bx-suggest-toggler bx-focusable",
     tabindex: 0
    }, CE("label", {}, t("suggest-settings")), CE("span", {}, "❯")), this.$btnSuggestion.addEventListener("click", this.renderSuggestions.bind(this)), topButtons.push(this.$btnSuggestion);
    let $div = CE("div", {
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
  requiredVariants: "full",
  group: "co-op",
  label: t("local-co-op"),
  items: [
   "local_co_op_enabled"
  ]
 }, {
  requiredVariants: "full",
  group: "mkb",
  label: t("mouse-and-keyboard"),
  unsupportedNote: !STATES.userAgent.capabilities.mkb ? CE("a", {
   href: "https://github.com/redphx/better-xcloud/issues/206#issuecomment-1920475657",
   target: "_blank"
  }, "⚠️ " + t("browser-unsupported-feature")) : null,
  unsupported: !STATES.userAgent.capabilities.mkb,
  items: [
   "native_mkb_enabled",
   "game_msfs2020_force_native_mkb",
   "mkb_enabled",
   "mkb_hide_idle_cursor"
  ]
 }, {
  requiredVariants: "full",
  group: "touch-control",
  label: t("touch-controller"),
  unsupported: !STATES.userAgent.capabilities.touch,
  unsupportedNote: !STATES.userAgent.capabilities.touch ? "⚠️ " + t("device-unsupported-touch") : null,
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
  requiredVariants: "full",
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
     let defaultUserAgent = window.navigator.orgUserAgent || window.navigator.userAgent, $inpCustomUserAgent = CE("input", {
      id: `bx_setting_inp_${setting.pref}`,
      type: "text",
      placeholder: defaultUserAgent,
      autocomplete: "off",
      class: "bx-settings-custom-user-agent",
      tabindex: 0
     });
     $inpCustomUserAgent.addEventListener("input", (e) => {
      let profile = $control.value, custom = e.target.value.trim();
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
     let appVersion = document.querySelector("meta[name=gamepass-app-version]").content, appDate = new Date(document.querySelector("meta[name=gamepass-app-date]").content).toISOString().substring(0, 10);
     $parent.appendChild(CE("div", {
      class: "bx-settings-app-version"
     }, `xCloud website version ${appVersion} (${appDate})`));
    } catch (e) {}
   },
   ($parent) => {
    let debugInfo = deepClone(BX_FLAGS.DeviceInfo);
    debugInfo.settings = JSON.parse(window.localStorage.getItem("better_xcloud") || "{}");
    let $debugInfo = CE("div", { class: "bx-debug-info" }, createButton({
     label: "Debug info",
     style: 4 | 64 | 32,
     onClick: (e) => {
      let $pre = e.target.closest("button")?.nextElementSibling;
      $pre.classList.toggle("bx-gone"), $pre.scrollIntoView();
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
  requiredVariants: "full",
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
    let $range = $elm.querySelector("input[type=range");
    window.addEventListener(BxEvent.SETTINGS_CHANGED, (e) => {
     let { storageKey, settingKey, settingValue } = e;
     if (storageKey !== "better_xcloud" || settingKey !== "audio_volume") return;
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
   pref: "video_max_fps",
   onChange: (e) => {
    limitVideoPlayerFps(parseInt(e.target.value));
   }
  }, {
   pref: "video_power_preference",
   onChange: () => {
    let streamPlayer = STATES.currentStream.streamPlayer;
    if (!streamPlayer) return;
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
   }, !1]
  },
  !1
 ];
 TAB_VIRTUAL_CONTROLLER_ITEMS = () => [{
  group: "mkb",
  label: t("virtual-controller"),
  helpUrl: "https://better-xcloud.github.io/mouse-and-keyboard/",
  content: MkbRemapper.getInstance().render()
 }];
 TAB_NATIVE_MKB_ITEMS = [{
  requiredVariants: "full",
  group: "native-mkb",
  label: t("native-mkb"),
  items: []
 }];
 TAB_SHORTCUTS_ITEMS = () => [{
  requiredVariants: "full",
  group: "controller-shortcuts",
  label: t("controller-shortcuts"),
  content: !1
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
     let streamStats = StreamStats.getInstance();
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
 SETTINGS_UI = {
  global: {
   group: "global",
   icon: BxIcon.HOME,
   items: this.TAB_GLOBAL_ITEMS
  },
  stream: {
   group: "stream",
   icon: BxIcon.DISPLAY,
   items: this.TAB_DISPLAY_ITEMS
  },
  controller: {
   group: "controller",
   icon: BxIcon.CONTROLLER,
   items: this.TAB_CONTROLLER_ITEMS,
   requiredVariants: "full"
  },
  mkb: !1,
  "native-mkb": !1,
  shortcuts: {
   group: "shortcuts",
   icon: BxIcon.COMMAND,
   items: this.TAB_SHORTCUTS_ITEMS,
   lazyContent: !0,
   requiredVariants: "full"
  },
  stats: {
   group: "stats",
   icon: BxIcon.STREAM_STATS,
   items: this.TAB_STATS_ITEMS
  }
 };
 constructor() {
  super();
  BxLogger.info(this.LOG_TAG, "constructor()"), this.renderFullSettings = STATES.supportedRegion && STATES.isSignedIn, this.setupDialog();
 }
 getDialog() {
  return this;
 }
 getContent() {
  return this.$container;
 }
 onMounted() {
  if (!this.renderFullSettings) return;
  if (onChangeVideoPlayerType(), STATES.userAgent.capabilities.touch) BxEvent.dispatch(window, BxEvent.CUSTOM_TOUCH_LAYOUTS_LOADED);
  let $selectUserAgent = document.querySelector(`#bx_setting_${"user_agent_profile"}`);
  if ($selectUserAgent) $selectUserAgent.disabled = !0, BxEvent.dispatch($selectUserAgent, "input", {}), $selectUserAgent.disabled = !1;
 }
 reloadPage() {
  this.$btnGlobalReload.disabled = !0, this.$btnGlobalReload.firstElementChild.textContent = t("settings-reloading"), this.hide(), FullscreenText.getInstance().show(t("settings-reloading")), window.location.reload();
 }
 async getRecommendedSettings(deviceCode) {
  try {
   let json = await (await NATIVE_FETCH(`https://raw.githubusercontent.com/redphx/better-xcloud/gh-pages/devices/${deviceCode.toLowerCase()}.json`)).json(), recommended = {};
   if (json.schema_version !== 1) return null;
   let scriptSettings = json.settings.script;
   if (scriptSettings._base) {
    let base = typeof scriptSettings._base === "string" ? [scriptSettings._base] : scriptSettings._base;
    for (let profile of base)
     Object.assign(recommended, this.suggestedSettings[profile]);
    delete scriptSettings._base;
   }
   let key;
   for (key in scriptSettings)
    recommended[key] = scriptSettings[key];
   return BX_FLAGS.DeviceInfo.deviceType = json.device_type, this.suggestedSettings.recommended = recommended, json.device_name;
  } catch (e) {}
  return null;
 }
 addDefaultSuggestedSetting(prefKey, value) {
  let key;
  for (key in this.suggestedSettings)
   if (key !== "default" && !(prefKey in this.suggestedSettings)) this.suggestedSettings[key][prefKey] = value;
 }
 generateDefaultSuggestedSettings() {
  let key;
  for (key in this.suggestedSettings) {
   if (key === "default") continue;
   let prefKey;
   for (prefKey in this.suggestedSettings[key])
    if (!(prefKey in this.suggestedSettings.default)) this.suggestedSettings.default[prefKey] = getPrefDefinition(prefKey).default;
  }
 }
 isSupportedVariant(requiredVariants) {
  if (typeof requiredVariants === "undefined") return !0;
  return requiredVariants = typeof requiredVariants === "string" ? [requiredVariants] : requiredVariants, requiredVariants.includes(SCRIPT_VARIANT);
 }
 async renderSuggestions(e) {
  let $btnSuggest = e.target.closest("div");
  $btnSuggest.toggleAttribute("bx-open");
  let $content = $btnSuggest.nextElementSibling;
  if ($content) {
   BxEvent.dispatch($content.querySelector("select"), "input");
   return;
  }
  let settingTabGroup;
  for (settingTabGroup in this.SETTINGS_UI) {
   let settingTab = this.SETTINGS_UI[settingTabGroup];
   if (!settingTab || !settingTab.items || typeof settingTab.items === "function") continue;
   for (let settingTabContent of settingTab.items) {
    if (!settingTabContent || !settingTabContent.items) continue;
    for (let setting of settingTabContent.items) {
     let prefKey;
     if (typeof setting === "string") prefKey = setting;
     else if (typeof setting === "object") prefKey = setting.pref;
     if (prefKey) this.suggestedSettingLabels[prefKey] = settingTabContent.label;
    }
   }
  }
  let recommendedDevice = "";
  if (BX_FLAGS.DeviceInfo.deviceType.includes("android")) {
   if (BX_FLAGS.DeviceInfo.androidInfo) {
    let deviceCode = BX_FLAGS.DeviceInfo.androidInfo.board;
    recommendedDevice = await this.getRecommendedSettings(deviceCode);
   }
  }
  let hasRecommendedSettings = Object.keys(this.suggestedSettings.recommended).length > 0, deviceType = BX_FLAGS.DeviceInfo.deviceType;
  if (deviceType === "android-handheld") this.addDefaultSuggestedSetting("stream_touch_controller", "off"), this.addDefaultSuggestedSetting("controller_device_vibration", "on");
  else if (deviceType === "android") this.addDefaultSuggestedSetting("controller_device_vibration", "auto");
  else if (deviceType === "android-tv") this.addDefaultSuggestedSetting("stream_touch_controller", "off");
  this.generateDefaultSuggestedSettings();
  let $suggestedSettings = CE("div", { class: "bx-suggest-wrapper" }), $select = CE("select", {}, hasRecommendedSettings && CE("option", { value: "recommended" }, t("recommended")), !hasRecommendedSettings && CE("option", { value: "highest" }, t("highest-quality")), CE("option", { value: "default" }, t("default")), CE("option", { value: "lowest" }, t("lowest-quality")));
  $select.addEventListener("input", (e2) => {
   let profile = $select.value;
   removeChildElements($suggestedSettings);
   let fragment = document.createDocumentFragment(), note;
   if (profile === "recommended") note = t("recommended-settings-for-device", { device: recommendedDevice });
   else if (profile === "highest") note = "⚠️ " + t("highest-quality-note");
   note && fragment.appendChild(CE("div", { class: "bx-suggest-note" }, note));
   let settings = this.suggestedSettings[profile], prefKey;
   for (prefKey in settings) {
    let currentValue = getPref(prefKey, !1), suggestedValue = settings[prefKey], currentValueText = STORAGE.Global.getValueText(prefKey, currentValue), isSameValue = currentValue === suggestedValue, $child, $value;
    if (isSameValue) $value = currentValueText;
    else {
     let suggestedValueText = STORAGE.Global.getValueText(prefKey, suggestedValue);
     $value = currentValueText + " ➔ " + suggestedValueText;
    }
    let $checkbox, breadcrumb = this.suggestedSettingLabels[prefKey] + " ❯ " + STORAGE.Global.getLabel(prefKey);
    if ($child = CE("div", {
     class: `bx-suggest-row ${isSameValue ? "bx-suggest-ok" : "bx-suggest-change"}`
    }, $checkbox = CE("input", {
     type: "checkbox",
     tabindex: 0,
     checked: !0,
     id: `bx_suggest_${prefKey}`
    }), CE("label", {
     for: `bx_suggest_${prefKey}`
    }, CE("div", {
     class: "bx-suggest-label"
    }, breadcrumb), CE("div", {
     class: "bx-suggest-value"
    }, $value))), isSameValue)
     $checkbox.disabled = !0, $checkbox.checked = !0;
    fragment.appendChild($child);
   }
   $suggestedSettings.appendChild(fragment);
  }), BxEvent.dispatch($select, "input");
  let onClickApply = () => {
   let profile = $select.value, settings = this.suggestedSettings[profile], prefKey;
   for (prefKey in settings) {
    let suggestedValue = settings[prefKey], $checkBox = $content.querySelector(`#bx_suggest_${prefKey}`);
    if (!$checkBox.checked || $checkBox.disabled) continue;
    let $control = this.settingElements[prefKey];
    if (!$control) {
     setPref(prefKey, suggestedValue);
     continue;
    }
    if ("setValue" in $control) $control.setValue(suggestedValue);
    else $control.value = suggestedValue;
    BxEvent.dispatch($control, "input", {
     manualTrigger: !0
    });
   }
   BxEvent.dispatch($select, "input");
  }, $btnApply = createButton({
   label: t("apply"),
   style: 64 | 32,
   onClick: onClickApply
  });
  $content = CE("div", {
   class: "bx-suggest-box",
   _nearby: {
    orientation: "vertical"
   }
  }, BxSelectElement.wrap($select), $suggestedSettings, $btnApply, BX_FLAGS.DeviceInfo.deviceType.includes("android") && CE("a", {
   class: "bx-suggest-link bx-focusable",
   href: "https://better-xcloud.github.io/guide/android-webview-tweaks/",
   target: "_blank",
   tabindex: 0
  }, "🤓 " + t("how-to-improve-app-performance")), BX_FLAGS.DeviceInfo.deviceType.includes("android") && !hasRecommendedSettings && CE("a", {
   class: "bx-suggest-link bx-focusable",
   href: "https://github.com/redphx/better-xcloud-devices",
   target: "_blank",
   tabindex: 0
  }, t("suggest-settings-link"))), $btnSuggest.insertAdjacentElement("afterend", $content);
 }
 onTabClicked(e) {
  let $svg = e.target.closest("svg");
  if ($svg.dataset.lazy) {
   delete $svg.dataset.lazy;
   let settingTab = this.SETTINGS_UI[$svg.dataset.group], items = settingTab.items(), $tabContent = this.renderTabContent.call(this, settingTab, items);
   this.$tabContents.appendChild($tabContent);
  }
  let $child, children = Array.from(this.$tabContents.children);
  for ($child of children)
   if ($child.dataset.tabGroup === $svg.dataset.group) {
    if ($child.classList.remove("bx-gone"), getPref("ui_controller_friendly")) this.dialogManager.calculateSelectBoxes($child);
   } else $child.classList.add("bx-gone");
  for (let $child2 of Array.from(this.$tabs.children))
   $child2.classList.remove("bx-active");
  $svg.classList.add("bx-active");
 }
 renderTab(settingTab) {
  let $svg = createSvgIcon(settingTab.icon);
  return $svg.dataset.group = settingTab.group, $svg.tabIndex = 0, settingTab.lazyContent && ($svg.dataset.lazy = settingTab.lazyContent.toString()), $svg.addEventListener("click", this.onTabClicked.bind(this)), $svg;
 }
 onGlobalSettingChanged(e) {
  this.$btnReload.classList.add("bx-danger"), this.$noteGlobalReload.classList.add("bx-gone"), this.$btnGlobalReload.classList.remove("bx-gone"), this.$btnGlobalReload.classList.add("bx-danger");
 }
 renderServerSetting(setting) {
  let selectedValue, $control = CE("select", {
   id: `bx_setting_${setting.pref}`,
   title: setting.label,
   tabindex: 0
  });
  $control.name = $control.id, $control.addEventListener("input", (e) => {
   setPref(setting.pref, e.target.value), this.onGlobalSettingChanged(e);
  }), selectedValue = getPref("server_region"), setting.options = {};
  for (let regionName in STATES.serverRegions) {
   let region = STATES.serverRegions[regionName], value = regionName, label = `${region.shortName} - ${regionName}`;
   if (region.isDefault) {
    if (label += ` (${t("default")})`, value = "default", selectedValue === regionName) selectedValue = "default";
   }
   setting.options[value] = label;
  }
  for (let value in setting.options) {
   let label = setting.options[value], $option = CE("option", { value }, label);
   $control.appendChild($option);
  }
  return $control.disabled = Object.keys(STATES.serverRegions).length === 0, $control.value = selectedValue, $control;
 }
 renderSettingRow(settingTab, $tabContent, settingTabContent, setting) {
  if (typeof setting === "string") setting = {
    pref: setting
   };
  let pref = setting.pref, $control;
  if (setting.content) if (typeof setting.content === "function") $control = setting.content.apply(this);
   else $control = setting.content;
  else if (!setting.unsupported) {
   if (pref === "server_region") $control = this.renderServerSetting(setting);
   else if (pref === "bx_locale") $control = SettingElement.fromPref(pref, STORAGE.Global, async (e) => {
     let newLocale = e.target.value;
     if (getPref("ui_controller_friendly")) {
      let timeoutId = e.target.timeoutId;
      timeoutId && window.clearTimeout(timeoutId), e.target.timeoutId = window.setTimeout(() => {
       Translations.refreshLocale(newLocale), Translations.updateTranslations();
      }, 500);
     } else Translations.refreshLocale(newLocale), Translations.updateTranslations();
     this.onGlobalSettingChanged(e);
    });
   else if (pref === "user_agent_profile") $control = SettingElement.fromPref("user_agent_profile", STORAGE.Global, (e) => {
     let value = e.target.value, isCustom = value === "custom", userAgent2 = UserAgent.get(value);
     UserAgent.updateStorage(value);
     let $inp = $control.nextElementSibling;
     $inp.value = userAgent2, $inp.readOnly = !isCustom, $inp.disabled = !isCustom, !e.target.disabled && this.onGlobalSettingChanged(e);
    });
   else {
    let onChange = setting.onChange;
    if (!onChange && settingTab.group === "global") onChange = this.onGlobalSettingChanged.bind(this);
    $control = SettingElement.fromPref(pref, STORAGE.Global, onChange, setting.params);
   }
   if ($control instanceof HTMLSelectElement && getPref("ui_controller_friendly")) $control = BxSelectElement.wrap($control);
   pref && (this.settingElements[pref] = $control);
  }
  let prefDefinition = null;
  if (pref) prefDefinition = getPrefDefinition(pref);
  if (prefDefinition && !this.isSupportedVariant(prefDefinition.requiredVariants)) return;
  let label = prefDefinition?.label || setting.label, note = prefDefinition?.note || setting.note, unsupportedNote = prefDefinition?.unsupportedNote || setting.unsupportedNote, experimental = prefDefinition?.experimental || setting.experimental;
  if (typeof note === "function") note = note();
  if (typeof unsupportedNote === "function") unsupportedNote = unsupportedNote();
  if (settingTabContent.label && setting.pref) {
   if (prefDefinition?.suggest) typeof prefDefinition.suggest.lowest !== "undefined" && (this.suggestedSettings.lowest[setting.pref] = prefDefinition.suggest.lowest), typeof prefDefinition.suggest.highest !== "undefined" && (this.suggestedSettings.highest[setting.pref] = prefDefinition.suggest.highest);
  }
  if (experimental) if (label = "🧪 " + label, !note) note = t("experimental");
   else note = `${t("experimental")}: ${note}`;
  let $note;
  if (unsupportedNote) $note = CE("div", { class: "bx-settings-dialog-note" }, unsupportedNote);
  else if (note) $note = CE("div", { class: "bx-settings-dialog-note" }, note);
  let $label, $row = CE("label", {
   class: "bx-settings-row",
   for: `bx_setting_${pref}`,
   "data-type": settingTabContent.group,
   _nearby: {
    orientation: "horizontal"
   }
  }, $label = CE("span", { class: "bx-settings-label" }, label, $note), !prefDefinition?.unsupported && $control), $link = $label.querySelector("a");
  if ($link) $link.classList.add("bx-focusable"), setNearby($label, {
    focus: $link
   });
  $tabContent.appendChild($row), !prefDefinition?.unsupported && setting.onCreated && setting.onCreated(setting, $control);
 }
 renderTabContent(settingTab, items) {
  let $tabContent = CE("div", {
   class: "bx-gone",
   "data-tab-group": settingTab.group
  });
  for (let settingTabContent of items) {
   if (!settingTabContent) continue;
   if (!this.isSupportedVariant(settingTabContent.requiredVariants)) continue;
   if (!this.renderFullSettings && settingTab.group === "global" && settingTabContent.group !== "general" && settingTabContent.group !== "footer") continue;
   let label = settingTabContent.label;
   if (label === t("better-xcloud")) {
    if (label += " " + SCRIPT_VERSION, SCRIPT_VARIANT === "lite") label += " (Lite)";
    label = createButton({
     label,
     url: "https://github.com/redphx/better-xcloud/releases",
     style: 1024 | 8 | 32
    });
   }
   if (label) {
    let $title = CE("h2", {
     _nearby: {
      orientation: "horizontal"
     }
    }, CE("span", {}, label), settingTabContent.helpUrl && createButton({
     icon: BxIcon.QUESTION,
     style: 4 | 32,
     url: settingTabContent.helpUrl,
     title: t("help")
    }));
    $tabContent.appendChild($title);
   }
   if (settingTabContent.unsupportedNote) {
    let $note = CE("b", { class: "bx-note-unsupported" }, settingTabContent.unsupportedNote);
    $tabContent.appendChild($note);
   }
   if (settingTabContent.unsupported) continue;
   if (settingTabContent.content) {
    $tabContent.appendChild(settingTabContent.content);
    continue;
   }
   settingTabContent.items = settingTabContent.items || [];
   for (let setting of settingTabContent.items) {
    if (setting === !1) continue;
    if (typeof setting === "function") {
     setting.apply(this, [$tabContent]);
     continue;
    }
    this.renderSettingRow(settingTab, $tabContent, settingTabContent, setting);
   }
  }
  return $tabContent;
 }
 setupDialog() {
  let $tabs, $tabContents, $container = CE("div", {
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
     if (direction === 1 || direction === 3) return this.focusVisibleTab(direction === 1 ? "last" : "first"), !0;
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
   style: 32 | 16,
   onClick: (e) => {
    this.reloadPage();
   }
  }), createButton({
   icon: BxIcon.CLOSE,
   style: 32 | 16,
   onClick: (e) => {
    this.dialogManager.hide();
   }
  }))), $tabContents = CE("div", {
   class: "bx-settings-tab-contents",
   _nearby: {
    orientation: "vertical",
    focus: () => this.jumpToSettingGroup("next"),
    loop: (direction) => {
     if (direction === 1 || direction === 3) return this.focusVisibleSetting(direction === 1 ? "last" : "first"), !0;
     return !1;
    }
   }
  }));
  this.$container = $container, this.$tabs = $tabs, this.$tabContents = $tabContents, $container.addEventListener("click", (e) => {
   if (e.target === $container) e.preventDefault(), e.stopPropagation(), this.hide();
  });
  let settingTabGroup;
  for (settingTabGroup in this.SETTINGS_UI) {
   let settingTab = this.SETTINGS_UI[settingTabGroup];
   if (!settingTab) continue;
   if (!this.isSupportedVariant(settingTab.requiredVariants)) continue;
   if (settingTab.group !== "global" && !this.renderFullSettings) continue;
   let $svg = this.renderTab(settingTab);
   if ($tabs.appendChild($svg), typeof settingTab.items === "function") continue;
   let $tabContent = this.renderTabContent.call(this, settingTab, settingTab.items);
   $tabContents.appendChild($tabContent);
  }
  $tabs.firstElementChild.dispatchEvent(new Event("click"));
 }
 focusTab(tabId) {
  let $tab = this.$container.querySelector(`.bx-settings-tabs svg[data-group=${tabId}]`);
  $tab && $tab.dispatchEvent(new Event("click"));
 }
 focusIfNeeded() {
  this.jumpToSettingGroup("next");
 }
 focusActiveTab() {
  let $currentTab = this.$tabs.querySelector(".bx-active");
  return $currentTab && $currentTab.focus(), !0;
 }
 focusVisibleSetting(type = "first") {
  let controls = Array.from(this.$tabContents.querySelectorAll("div[data-tab-group]:not(.bx-gone) > *"));
  if (!controls.length) return !1;
  if (type === "last") controls.reverse();
  for (let $control of controls) {
   if (!($control instanceof HTMLElement)) continue;
   let $focusable = this.dialogManager.findFocusableElement($control);
   if ($focusable) {
    if (this.dialogManager.focus($focusable)) return !0;
   }
  }
  return !1;
 }
 focusVisibleTab(type = "first") {
  let tabs = Array.from(this.$tabs.querySelectorAll("svg:not(.bx-gone)"));
  if (!tabs.length) return !1;
  if (type === "last") tabs.reverse();
  for (let $tab of tabs)
   if (this.dialogManager.focus($tab)) return !0;
  return !1;
 }
 jumpToSettingGroup(direction) {
  let $tabContent = this.$tabContents.querySelector("div[data-tab-group]:not(.bx-gone)");
  if (!$tabContent) return !1;
  let $header, $focusing = document.activeElement;
  if (!$focusing || !$tabContent.contains($focusing)) $header = $tabContent.querySelector("h2");
  else {
   let $parent = $focusing.closest("[data-tab-group] > *"), siblingProperty = direction === "next" ? "nextSibling" : "previousSibling", $tmp = $parent, times = 0;
   while (!0) {
    if (!$tmp) break;
    if ($tmp.tagName === "H2") {
     if ($header = $tmp, !$tmp.nextElementSibling?.classList.contains("bx-note-unsupported")) {
      if (++times, direction === "next" || times >= 2) break;
     }
    }
    $tmp = $tmp[siblingProperty];
   }
  }
  let $target;
  if ($header) $target = this.dialogManager.findNextTarget($header, 3, !1);
  if ($target) return this.dialogManager.focus($target);
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
var BxExposed = {
 getTitleInfo: () => STATES.currentStream.titleInfo,
 modifyTitleInfo: !1,
 setupGainNode: ($media, audioStream) => {
  if ($media instanceof HTMLAudioElement) $media.muted = !0, $media.addEventListener("playing", (e) => {
    $media.muted = !0, $media.pause();
   });
  else $media.muted = !0, $media.addEventListener("playing", (e) => {
    $media.muted = !0;
   });
  try {
   let audioCtx = STATES.currentStream.audioContext, source = audioCtx.createMediaStreamSource(audioStream), gainNode = audioCtx.createGain();
   source.connect(gainNode).connect(audioCtx.destination);
  } catch (e) {
   BxLogger.error("setupGainNode", e), STATES.currentStream.audioGainNode = null;
  }
 },
 handleControllerShortcut: !1,
 resetControllerShortcut: !1,
 overrideSettings: {
  Tv_settings: {
   hasCompletedOnboarding: !0
  }
 },
 disableGamepadPolling: !1,
 backButtonPressed: () => {
  let navigationDialogManager = NavigationDialogManager.getInstance();
  if (navigationDialogManager.isShowing()) return navigationDialogManager.hide(), !0;
  let dict = {
   bubbles: !0,
   cancelable: !0,
   key: "XF86Back",
   code: "XF86Back",
   keyCode: 4,
   which: 4
  };
  return document.body.dispatchEvent(new KeyboardEvent("keydown", dict)), document.body.dispatchEvent(new KeyboardEvent("keyup", dict)), !1;
 },
 GameSlugRegexes: [
  /[;,/?:@&=+_`~$%#^*()!^™\xae\xa9]/g,
  / {2,}/g,
  / /g
 ]
};
function localRedirect(path) {
 let url = window.location.href.substring(0, 31) + path, $pageContent = document.getElementById("PageContent");
 if (!$pageContent) return;
 let $anchor = CE("a", {
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
 if (preferredRegion in STATES.serverRegions) if (shortName && STATES.serverRegions[preferredRegion].shortName) return STATES.serverRegions[preferredRegion].shortName;
  else return preferredRegion;
 for (let regionName in STATES.serverRegions) {
  let region = STATES.serverRegions[regionName];
  if (!region.isDefault) continue;
  if (shortName && region.shortName) return region.shortName;
  else return regionName;
 }
 return null;
}
class HeaderSection {
 static instance;
 static getInstance = () => HeaderSection.instance ?? (HeaderSection.instance = new HeaderSection);
 LOG_TAG = "HeaderSection";
 $btnRemotePlay;
 $btnSettings;
 $buttonsWrapper;
 observer;
 timeoutId;
 constructor() {
  BxLogger.info(this.LOG_TAG, "constructor()"), this.$btnRemotePlay = createButton({
   classes: ["bx-header-remote-play-button", "bx-gone"],
   icon: BxIcon.REMOTE_PLAY,
   title: t("remote-play"),
   style: 4 | 32 | 512,
   onClick: (e) => RemotePlayManager.getInstance().togglePopup()
  }), this.$btnSettings = createButton({
   classes: ["bx-header-settings-button"],
   label: "???",
   style: 8 | 16 | 32 | 128,
   onClick: (e) => SettingsNavigationDialog.getInstance().show()
  }), this.$buttonsWrapper = CE("div", {}, getPref("xhome_enabled") ? this.$btnRemotePlay : null, this.$btnSettings);
 }
 injectSettingsButton($parent) {
  if (!$parent) return;
  let PREF_LATEST_VERSION = getPref("version_latest"), $btnSettings = this.$btnSettings;
  if (isElementVisible(this.$buttonsWrapper)) return;
  if ($btnSettings.querySelector("span").textContent = getPreferredServerRegion(!0) || t("better-xcloud"), !SCRIPT_VERSION.includes("beta") && PREF_LATEST_VERSION && PREF_LATEST_VERSION !== SCRIPT_VERSION) $btnSettings.setAttribute("data-update-available", "true");
  $parent.appendChild(this.$buttonsWrapper);
 }
 checkHeader() {
  let $target = document.querySelector("#PageContent div[class*=EdgewaterHeader-module__rightSectionSpacing]");
  if (!$target) $target = document.querySelector("div[class^=UnsupportedMarketPage-module__buttons]");
  $target && this.injectSettingsButton($target);
 }
 watchHeader() {
  let $root = document.querySelector("#PageContent header") || document.querySelector("#root");
  if (!$root) return;
  this.timeoutId && clearTimeout(this.timeoutId), this.timeoutId = null, this.observer && this.observer.disconnect(), this.observer = new MutationObserver((mutationList) => {
   this.timeoutId && clearTimeout(this.timeoutId), this.timeoutId = window.setTimeout(this.checkHeader.bind(this), 2000);
  }), this.observer.observe($root, { subtree: !0, childList: !0 }), this.checkHeader();
 }
 showRemotePlayButton() {
  this.$btnRemotePlay.classList.remove("bx-gone");
 }
 static watchHeader() {
  HeaderSection.getInstance().watchHeader();
 }
}
class RemotePlayNavigationDialog extends NavigationDialog {
 static instance;
 static getInstance = () => RemotePlayNavigationDialog.instance ?? (RemotePlayNavigationDialog.instance = new RemotePlayNavigationDialog);
 LOG_TAG = "RemotePlayNavigationDialog";
 STATE_LABELS = {
  On: t("powered-on"),
  Off: t("powered-off"),
  ConnectedStandby: t("standby"),
  Unknown: t("unknown")
 };
 $container;
 constructor() {
  super();
  BxLogger.info(this.LOG_TAG, "constructor()"), this.setupDialog();
 }
 setupDialog() {
  let $fragment = CE("div", { class: "bx-remote-play-container" }), $settingNote = CE("p", {}), currentResolution = getPref("xhome_resolution"), $resolutions = CE("select", {}, CE("option", { value: "1080p" }, "1080p"), CE("option", { value: "720p" }, "720p"));
  if (getPref("ui_controller_friendly")) $resolutions = BxSelectElement.wrap($resolutions);
  $resolutions.addEventListener("input", (e) => {
   let value = e.target.value;
   $settingNote.textContent = value === "1080p" ? "✅ " + t("can-stream-xbox-360-games") : "❌ " + t("cant-stream-xbox-360-games"), setPref("xhome_resolution", value);
  }), $resolutions.value = currentResolution, BxEvent.dispatch($resolutions, "input", {
   manualTrigger: !0
  });
  let $qualitySettings = CE("div", {
   class: "bx-remote-play-settings"
  }, CE("div", {}, CE("label", {}, t("target-resolution"), $settingNote), $resolutions));
  $fragment.appendChild($qualitySettings);
  let manager = RemotePlayManager.getInstance(), consoles = manager.getConsoles();
  for (let con of consoles) {
   let $child = CE("div", { class: "bx-remote-play-device-wrapper" }, CE("div", { class: "bx-remote-play-device-info" }, CE("div", {}, CE("span", { class: "bx-remote-play-device-name" }, con.deviceName), CE("span", { class: "bx-remote-play-console-type" }, con.consoleType.replace("Xbox", ""))), CE("div", { class: "bx-remote-play-power-state" }, this.STATE_LABELS[con.powerState])), createButton({
    classes: ["bx-remote-play-connect-button"],
    label: t("console-connect"),
    style: 1 | 32,
    onClick: (e) => manager.play(con.serverId)
   }));
   $fragment.appendChild($child);
  }
  $fragment.appendChild(CE("div", {
   class: "bx-remote-play-buttons",
   _nearby: {
    orientation: "horizontal"
   }
  }, createButton({
   icon: BxIcon.QUESTION,
   style: 4 | 32,
   url: "https://better-xcloud.github.io/remote-play",
   label: t("help")
  }), createButton({
   style: 4 | 32,
   label: t("close"),
   onClick: (e) => this.hide()
  }))), this.$container = $fragment;
 }
 getDialog() {
  return this;
 }
 getContent() {
  return this.$container;
 }
 focusIfNeeded() {
  let $btnConnect = this.$container.querySelector(".bx-remote-play-device-wrapper button");
  $btnConnect && $btnConnect.focus();
 }
}
class RemotePlayManager {
 static instance;
 static getInstance = () => RemotePlayManager.instance ?? (RemotePlayManager.instance = new RemotePlayManager);
 LOG_TAG = "RemotePlayManager";
 isInitialized = !1;
 XCLOUD_TOKEN;
 XHOME_TOKEN;
 consoles;
 regions = [];
 constructor() {
  BxLogger.info(this.LOG_TAG, "constructor()");
 }
 initialize() {
  if (this.isInitialized) return;
  this.isInitialized = !0, this.getXhomeToken(() => {
   this.getConsolesList(() => {
    BxLogger.info(this.LOG_TAG, "Consoles", this.consoles), STATES.supportedRegion && HeaderSection.getInstance().showRemotePlayButton(), BxEvent.dispatch(window, BxEvent.REMOTE_PLAY_READY);
   });
  });
 }
 get xcloudToken() {
  return this.XCLOUD_TOKEN;
 }
 set xcloudToken(token) {
  this.XCLOUD_TOKEN = token;
 }
 get xhomeToken() {
  return this.XHOME_TOKEN;
 }
 getConsoles() {
  return this.consoles;
 }
 getXhomeToken(callback) {
  if (this.XHOME_TOKEN) {
   callback();
   return;
  }
  let GSSV_TOKEN;
  try {
   GSSV_TOKEN = JSON.parse(localStorage.getItem("xboxcom_xbl_user_info")).tokens["http://gssv.xboxlive.com/"].token;
  } catch (e) {
   for (let i = 0;i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (!key.startsWith("Auth.User.")) continue;
    let json = JSON.parse(localStorage.getItem(key));
    for (let token of json.tokens) {
     if (!token.relyingParty.includes("gssv.xboxlive.com")) continue;
     GSSV_TOKEN = token.tokenData.token;
     break;
    }
    break;
   }
  }
  let request = new Request("https://xhome.gssv-play-prod.xboxlive.com/v2/login/user", {
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
   this.regions = json.offeringSettings.regions, this.XHOME_TOKEN = json.gsToken, callback();
  });
 }
 async getConsolesList(callback) {
  if (this.consoles) {
   callback();
   return;
  }
  let options = {
   method: "GET",
   headers: {
    Authorization: `Bearer ${this.XHOME_TOKEN}`
   }
  };
  for (let region of this.regions)
   try {
    let request = new Request(`${region.baseUri}/v6/servers/home?mr=50`, options), json = await (await fetch(request)).json();
    if (json.results.length === 0) continue;
    this.consoles = json.results, STATES.remotePlay.server = region.baseUri;
    break;
   } catch (e) {}
  if (!STATES.remotePlay.server) this.consoles = [];
  callback();
 }
 play(serverId, resolution) {
  if (resolution) setPref("xhome_resolution", resolution);
  STATES.remotePlay.config = {
   serverId
  }, window.BX_REMOTE_PLAY_CONFIG = STATES.remotePlay.config, localRedirect("/launch/fortnite/BT5P2X999VH2#remote-play");
 }
 togglePopup(force = null) {
  if (!this.isReady()) {
   Toast.show(t("getting-consoles-list"));
   return;
  }
  if (this.consoles.length === 0) {
   Toast.show(t("no-consoles-found"), "", { instant: !0 });
   return;
  }
  if (AppInterface && AppInterface.showRemotePlayDialog) {
   AppInterface.showRemotePlayDialog(JSON.stringify(this.consoles)), document.activeElement.blur();
   return;
  }
  RemotePlayNavigationDialog.getInstance().show();
 }
 static detect() {
  if (!getPref("xhome_enabled")) return;
  if (STATES.remotePlay.isPlaying = window.location.pathname.includes("/launch/") && window.location.hash.startsWith("#remote-play"), STATES.remotePlay?.isPlaying) window.BX_REMOTE_PLAY_CONFIG = STATES.remotePlay.config, window.history.replaceState({ origin: "better-xcloud" }, "", "https://www.xbox.com/" + location.pathname.substring(1, 6) + "/play");
  else window.BX_REMOTE_PLAY_CONFIG = null;
 }
 isReady() {
  return this.consoles !== null;
 }
}
class LoadingScreen {
 static $bgStyle;
 static $waitTimeBox;
 static waitTimeInterval = null;
 static orgWebTitle;
 static secondsToString(seconds) {
  let m = Math.floor(seconds / 60), s = Math.floor(seconds % 60), mDisplay = m > 0 ? `${m}m` : "", sDisplay = `${s}s`.padStart(s >= 0 ? 3 : 4, "0");
  return mDisplay + sDisplay;
 }
 static setup() {
  let titleInfo = STATES.currentStream.titleInfo;
  if (!titleInfo) return;
  if (!LoadingScreen.$bgStyle) {
   let $bgStyle = CE("style");
   document.documentElement.appendChild($bgStyle), LoadingScreen.$bgStyle = $bgStyle;
  }
  if (LoadingScreen.setBackground(titleInfo.product.heroImageUrl || titleInfo.product.titledHeroImageUrl || titleInfo.product.tileImageUrl), getPref("ui_loading_screen_rocket") === "hide") LoadingScreen.hideRocket();
 }
 static hideRocket() {
  let $bgStyle = LoadingScreen.$bgStyle;
  $bgStyle.textContent += "#game-stream div[class*=RocketAnimation-module__container] > svg{display:none}#game-stream video[class*=RocketAnimationVideo-module__video]{display:none}";
 }
 static setBackground(imageUrl) {
  let $bgStyle = LoadingScreen.$bgStyle;
  imageUrl = imageUrl + "?w=1920", $bgStyle.textContent += '#game-stream{background-color:transparent !important;background-position:center center !important;background-repeat:no-repeat !important;background-size:cover !important}#game-stream rect[width="800"]{transition:opacity .3s ease-in-out !important}' + `#game-stream {background-image: linear-gradient(#00000033, #000000e6), url(${imageUrl}) !important;}`;
  let bg = new Image;
  bg.onload = (e) => {
   $bgStyle.textContent += '#game-stream rect[width="800"]{opacity:0 !important}';
  }, bg.src = imageUrl;
 }
 static setupWaitTime(waitTime) {
  if (getPref("ui_loading_screen_rocket") === "hide-queue") LoadingScreen.hideRocket();
  let secondsLeft = waitTime, $countDown, $estimated;
  LoadingScreen.orgWebTitle = document.title;
  let endDate = new Date, timeZoneOffsetSeconds = endDate.getTimezoneOffset() * 60;
  endDate.setSeconds(endDate.getSeconds() + waitTime - timeZoneOffsetSeconds);
  let endDateStr = endDate.toISOString().slice(0, 19);
  endDateStr = endDateStr.substring(0, 10) + " " + endDateStr.substring(11, 19), endDateStr += ` (${LoadingScreen.secondsToString(waitTime)})`;
  let $waitTimeBox = LoadingScreen.$waitTimeBox;
  if (!$waitTimeBox) $waitTimeBox = CE("div", { class: "bx-wait-time-box" }, CE("label", {}, t("server")), CE("span", {}, getPreferredServerRegion()), CE("label", {}, t("wait-time-estimated")), $estimated = CE("span", {}), CE("label", {}, t("wait-time-countdown")), $countDown = CE("span", {})), document.documentElement.appendChild($waitTimeBox), LoadingScreen.$waitTimeBox = $waitTimeBox;
  else $waitTimeBox.classList.remove("bx-gone"), $estimated = $waitTimeBox.querySelector(".bx-wait-time-estimated"), $countDown = $waitTimeBox.querySelector(".bx-wait-time-countdown");
  $estimated.textContent = endDateStr, $countDown.textContent = LoadingScreen.secondsToString(secondsLeft), document.title = `[${$countDown.textContent}] ${LoadingScreen.orgWebTitle}`, LoadingScreen.waitTimeInterval = window.setInterval(() => {
   if (secondsLeft--, $countDown.textContent = LoadingScreen.secondsToString(secondsLeft), document.title = `[${$countDown.textContent}] ${LoadingScreen.orgWebTitle}`, secondsLeft <= 0) LoadingScreen.waitTimeInterval && clearInterval(LoadingScreen.waitTimeInterval), LoadingScreen.waitTimeInterval = null;
  }, 1000);
 }
 static hide() {
  if (LoadingScreen.orgWebTitle && (document.title = LoadingScreen.orgWebTitle), LoadingScreen.$waitTimeBox && LoadingScreen.$waitTimeBox.classList.add("bx-gone"), getPref("ui_loading_screen_game_art") && LoadingScreen.$bgStyle) {
   let $rocketBg = document.querySelector('#game-stream rect[width="800"]');
   $rocketBg && $rocketBg.addEventListener("transitionend", (e) => {
    LoadingScreen.$bgStyle.textContent += "#game-stream{background:#000 !important}";
   }), LoadingScreen.$bgStyle.textContent += '#game-stream rect[width="800"]{opacity:1 !important}';
  }
  setTimeout(LoadingScreen.reset, 2000);
 }
 static reset() {
  LoadingScreen.$bgStyle && (LoadingScreen.$bgStyle.textContent = ""), LoadingScreen.$waitTimeBox && LoadingScreen.$waitTimeBox.classList.add("bx-gone"), LoadingScreen.waitTimeInterval && clearInterval(LoadingScreen.waitTimeInterval), LoadingScreen.waitTimeInterval = null;
 }
}
class GuideMenu {
 static instance;
 static getInstance = () => GuideMenu.instance ?? (GuideMenu.instance = new GuideMenu);
 $renderedButtons;
 closeGuideMenu() {
  if (window.BX_EXPOSED.dialogRoutes) {
   window.BX_EXPOSED.dialogRoutes.closeAll();
   return;
  }
  let $btnClose = document.querySelector("#gamepass-dialog-root button[class^=Header-module__closeButton]");
  $btnClose && $btnClose.click();
 }
 renderButtons() {
  if (this.$renderedButtons) return this.$renderedButtons;
  let buttons = {
   scriptSettings: createButton({
    label: t("better-xcloud"),
    style: 64 | 32 | 1,
    onClick: (() => {
     window.addEventListener(BxEvent.XCLOUD_DIALOG_DISMISSED, (e) => {
      setTimeout(() => SettingsNavigationDialog.getInstance().show(), 50);
     }, { once: !0 }), this.closeGuideMenu();
    }).bind(this)
   }),
   closeApp: AppInterface && createButton({
    icon: BxIcon.POWER,
    label: t("close-app"),
    title: t("close-app"),
    style: 64 | 32 | 2,
    onClick: (e) => {
     AppInterface.closeApp();
    },
    attributes: {
     "data-state": "normal"
    }
   }),
   reloadPage: createButton({
    icon: BxIcon.REFRESH,
    label: t("reload-page"),
    title: t("reload-page"),
    style: 64 | 32,
    onClick: (() => {
     if (this.closeGuideMenu(), STATES.isPlaying) confirm(t("confirm-reload-stream")) && window.location.reload();
     else window.location.reload();
    }).bind(this)
   }),
   backToHome: createButton({
    icon: BxIcon.HOME,
    label: t("back-to-home"),
    title: t("back-to-home"),
    style: 64 | 32,
    onClick: (() => {
     this.closeGuideMenu(), confirm(t("back-to-home-confirm")) && (window.location.href = window.location.href.substring(0, 31));
    }).bind(this),
    attributes: {
     "data-state": "playing"
    }
   })
  }, buttonsLayout = [
   buttons.scriptSettings,
   [
    buttons.backToHome,
    buttons.reloadPage,
    buttons.closeApp
   ]
  ], $div = CE("div", {
   class: "bx-guide-home-buttons"
  });
  for (let $button of buttonsLayout) {
   if (!$button) continue;
   if ($button instanceof HTMLElement) $div.appendChild($button);
   else if (Array.isArray($button)) {
    let $wrapper = CE("div", {});
    for (let $child of $button)
     $child && $wrapper.appendChild($child);
    $div.appendChild($wrapper);
   }
  }
  return this.$renderedButtons = $div, $div;
 }
 injectHome($root, isPlaying = !1) {
  let $target = null;
  if (isPlaying) {
   $target = $root.querySelector("a[class*=QuitGameButton]");
   let $btnXcloudHome = $root.querySelector("div[class^=HomeButtonWithDivider]");
   $btnXcloudHome && ($btnXcloudHome.style.display = "none");
  } else {
   let $dividers = $root.querySelectorAll("div[class*=Divider-module__divider]");
   if ($dividers) $target = $dividers[$dividers.length - 1];
  }
  if (!$target) return !1;
  let $buttons = this.renderButtons();
  $buttons.dataset.isPlaying = isPlaying.toString(), $target.insertAdjacentElement("afterend", $buttons);
 }
 async onShown(e) {
  if (e.where === "home") {
   let $root = document.querySelector("#gamepass-dialog-root div[role=dialog] div[role=tabpanel] div[class*=HomeLandingPage]");
   $root && this.injectHome($root, STATES.isPlaying);
  }
 }
 addEventListeners() {
  window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, this.onShown.bind(this));
 }
 observe($addedElm) {
  let className = $addedElm.className;
  if (!className.startsWith("NavigationAnimation") && !className.startsWith("DialogRoutes") && !className.startsWith("Dialog-module__container")) return;
  let $selectedTab = $addedElm.querySelector("div[class^=NavigationMenu] button[aria-selected=true");
  if ($selectedTab) {
   let $elm = $selectedTab, index;
   for (index = 0;$elm = $elm?.previousElementSibling; index++)
    ;
   if (index === 0) BxEvent.dispatch(window, BxEvent.XCLOUD_GUIDE_MENU_SHOWN, { where: "home" });
  }
 }
}
class StreamBadges {
 static instance;
 static getInstance = () => StreamBadges.instance ?? (StreamBadges.instance = new StreamBadges);
 LOG_TAG = "StreamBadges";
 serverInfo = {};
 badges = {
  playtime: {
   name: t("playtime"),
   icon: BxIcon.PLAYTIME,
   color: "#ff004d"
  },
  battery: {
   name: t("battery"),
   icon: BxIcon.BATTERY,
   color: "#00b543"
  },
  download: {
   name: t("download"),
   icon: BxIcon.DOWNLOAD,
   color: "#29adff"
  },
  upload: {
   name: t("upload"),
   icon: BxIcon.UPLOAD,
   color: "#ff77a8"
  },
  server: {
   name: t("server"),
   icon: BxIcon.SERVER,
   color: "#ff6c24"
  },
  video: {
   name: t("video"),
   icon: BxIcon.DISPLAY,
   color: "#742f29"
  },
  audio: {
   name: t("audio"),
   icon: BxIcon.AUDIO,
   color: "#5f574f"
  }
 };
 $container;
 intervalId;
 REFRESH_INTERVAL = 3000;
 constructor() {
  BxLogger.info(this.LOG_TAG, "constructor()");
 }
 setRegion(region) {
  this.serverInfo.server = {
   region
  };
 }
 renderBadge(name, value) {
  let badgeInfo = this.badges[name], $badge;
  if (badgeInfo.$element) return $badge = badgeInfo.$element, $badge.lastElementChild.textContent = value, $badge;
  if ($badge = CE("div", { class: "bx-badge", title: badgeInfo.name }, CE("span", { class: "bx-badge-name" }, createSvgIcon(badgeInfo.icon)), CE("span", { class: "bx-badge-value", style: `background-color: ${badgeInfo.color}` }, value)), name === "battery") $badge.classList.add("bx-badge-battery");
  return this.badges[name].$element = $badge, $badge;
 }
 async updateBadges(forceUpdate = !1) {
  if (!this.$container || !forceUpdate && !this.$container.isConnected) {
   this.stop();
   return;
  }
  let statsCollector = StreamStatsCollector.getInstance();
  await statsCollector.collect();
  let play = statsCollector.getStat("play"), batt = statsCollector.getStat("batt"), dl = statsCollector.getStat("dl"), ul = statsCollector.getStat("ul"), badges = {
   download: dl.toString(),
   upload: ul.toString(),
   playtime: play.toString(),
   battery: batt.toString()
  }, name;
  for (name in badges) {
   let value = badges[name];
   if (value === null) continue;
   let $elm = this.badges[name].$element;
   if (!$elm) continue;
   if ($elm.lastElementChild.textContent = value, name === "battery") if (batt.current === 100 && batt.start === 100) $elm.classList.add("bx-gone");
    else $elm.dataset.charging = batt.isCharging.toString(), $elm.classList.remove("bx-gone");
  }
 }
 async start() {
  await this.updateBadges(!0), this.stop(), this.intervalId = window.setInterval(this.updateBadges.bind(this), this.REFRESH_INTERVAL);
 }
 stop() {
  this.intervalId && clearInterval(this.intervalId), this.intervalId = null;
 }
 destroy() {
  this.serverInfo = {}, delete this.$container;
 }
 async render() {
  if (this.$container) return this.start(), this.$container;
  await this.getServerStats();
  let batteryLevel = "";
  if (STATES.browser.capabilities.batteryApi) batteryLevel = "100%";
  let BADGES = [
   ["playtime", "1m"],
   ["battery", batteryLevel],
   ["download", humanFileSize(0)],
   ["upload", humanFileSize(0)],
   this.badges.server.$element ?? ["server", "?"],
   this.serverInfo.video ? this.badges.video.$element : ["video", "?"],
   this.serverInfo.audio ? this.badges.audio.$element : ["audio", "?"]
  ], $container = CE("div", { class: "bx-badges" });
  for (let item of BADGES) {
   if (!item) continue;
   let $badge;
   if (!(item instanceof HTMLElement)) $badge = this.renderBadge(...item);
   else $badge = item;
   $container.appendChild($badge);
  }
  return this.$container = $container, await this.start(), $container;
 }
 async getServerStats() {
  let stats = await STATES.currentStream.peerConnection.getStats(), allVideoCodecs = {}, videoCodecId, videoWidth = 0, videoHeight = 0, allAudioCodecs = {}, audioCodecId, allCandidates = {}, candidateId;
  if (stats.forEach((stat) => {
   if (stat.type === "codec") {
    let mimeType = stat.mimeType.split("/")[0];
    if (mimeType === "video") allVideoCodecs[stat.id] = stat;
    else if (mimeType === "audio") allAudioCodecs[stat.id] = stat;
   } else if (stat.type === "inbound-rtp" && stat.packetsReceived > 0) {
    if (stat.kind === "video") videoCodecId = stat.codecId, videoWidth = stat.frameWidth, videoHeight = stat.frameHeight;
    else if (stat.kind === "audio") audioCodecId = stat.codecId;
   } else if (stat.type === "candidate-pair" && stat.packetsReceived > 0 && stat.state === "succeeded") candidateId = stat.remoteCandidateId;
   else if (stat.type === "remote-candidate") allCandidates[stat.id] = stat.address;
  }), videoCodecId) {
   let videoStat = allVideoCodecs[videoCodecId], video = {
    width: videoWidth,
    height: videoHeight,
    codec: videoStat.mimeType.substring(6)
   };
   if (video.codec === "H264") {
    let match = /profile-level-id=([0-9a-f]{6})/.exec(videoStat.sdpFmtpLine);
    match && (video.profile = match[1]);
   }
   let text = videoHeight + "p";
   if (text && (text += "/"), text += video.codec, video.profile) {
    let profile = video.profile, quality = profile;
    if (profile.startsWith("4d")) quality = t("visual-quality-high");
    else if (profile.startsWith("42e")) quality = t("visual-quality-normal");
    else if (profile.startsWith("420")) quality = t("visual-quality-low");
    text += ` (${quality})`;
   }
   this.badges.video.$element = this.renderBadge("video", text), this.serverInfo.video = video;
  }
  if (audioCodecId) {
   let audioStat = allAudioCodecs[audioCodecId], audio = {
    codec: audioStat.mimeType.substring(6),
    bitrate: audioStat.clockRate
   }, bitrate = audio.bitrate / 1000, text = `${audio.codec} (${bitrate} kHz)`;
   this.badges.audio.$element = this.renderBadge("audio", text), this.serverInfo.audio = audio;
  }
  if (candidateId) {
   BxLogger.info("candidate", candidateId, allCandidates);
   let text = "", isIpv6 = allCandidates[candidateId].includes(":"), server = this.serverInfo.server;
   if (server && server.region) text += server.region;
   text += "@" + (isIpv6 ? "IPv6" : "IPv4"), this.badges.server.$element = this.renderBadge("server", text);
  }
 }
 static setupEvents() {
  window.addEventListener(BxEvent.XCLOUD_GUIDE_MENU_SHOWN, async (e) => {
   if (e.where !== "home" || !STATES.isPlaying) return;
   let $btnQuit = document.querySelector("#gamepass-dialog-root a[class*=QuitGameButton]");
   if ($btnQuit) $btnQuit.insertAdjacentElement("beforebegin", await StreamBadges.getInstance().render());
  });
 }
}
class XcloudInterceptor {
 static SERVER_EMOJIS = {
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
 static async handleLogin(request, init) {
  let bypassServer = getPref("server_bypass_restriction");
  if (bypassServer !== "off") {
   let ip = BypassServerIps[bypassServer];
   ip && request.headers.set("X-Forwarded-For", ip);
  }
  let response = await NATIVE_FETCH(request, init);
  if (response.status !== 200) return BxEvent.dispatch(window, BxEvent.XCLOUD_SERVERS_UNAVAILABLE), response;
  let obj = await response.clone().json();
  RemotePlayManager.getInstance().xcloudToken = obj.gsToken;
  let serverRegex = /\/\/(\w+)\./, serverEmojis = XcloudInterceptor.SERVER_EMOJIS;
  for (let region of obj.offeringSettings.regions) {
   let { name: regionName, name: shortName } = region;
   if (region.isDefault) STATES.selectedRegion = Object.assign({}, region);
   let match = serverRegex.exec(region.baseUri);
   if (match) {
    if (shortName = match[1], serverEmojis[regionName]) shortName = serverEmojis[regionName] + " " + shortName;
   }
   region.shortName = shortName.toUpperCase(), STATES.serverRegions[region.name] = Object.assign({}, region);
  }
  BxEvent.dispatch(window, BxEvent.XCLOUD_SERVERS_READY);
  let preferredRegion = getPreferredServerRegion();
  if (preferredRegion && preferredRegion in STATES.serverRegions) {
   let tmp = Object.assign({}, STATES.serverRegions[preferredRegion]);
   tmp.isDefault = !0, obj.offeringSettings.regions = [tmp], STATES.selectedRegion = tmp;
  }
  return STATES.gsToken = obj.gsToken, response.json = () => Promise.resolve(obj), response;
 }
 static async handlePlay(request, init) {
  BxEvent.dispatch(window, BxEvent.STREAM_LOADING);
  let PREF_STREAM_TARGET_RESOLUTION = getPref("stream_target_resolution"), PREF_STREAM_PREFERRED_LOCALE = getPref("stream_preferred_locale"), url = typeof request === "string" ? request : request.url, parsedUrl = new URL(url), badgeRegion = parsedUrl.host.split(".", 1)[0];
  for (let regionName in STATES.serverRegions) {
   let region = STATES.serverRegions[regionName];
   if (parsedUrl.origin == region.baseUri) {
    badgeRegion = regionName;
    break;
   }
  }
  StreamBadges.getInstance().setRegion(badgeRegion);
  let body = await request.clone().json();
  if (PREF_STREAM_TARGET_RESOLUTION !== "auto") {
   let osName = PREF_STREAM_TARGET_RESOLUTION === "720p" ? "android" : "windows";
   body.settings.osName = osName;
  }
  if (PREF_STREAM_PREFERRED_LOCALE !== "default") body.settings.locale = PREF_STREAM_PREFERRED_LOCALE;
  let newRequest = new Request(request, {
   body: JSON.stringify(body)
  });
  return NATIVE_FETCH(newRequest);
 }
 static async handleWaitTime(request, init) {
  let response = await NATIVE_FETCH(request, init);
  if (getPref("ui_loading_screen_wait_time")) {
   let json = await response.clone().json();
   if (json.estimatedAllocationTimeInSeconds > 0) LoadingScreen.setupWaitTime(json.estimatedTotalWaitTimeInSeconds);
  }
  return response;
 }
 static async handleConfiguration(request, init) {
  if (request.method !== "GET") return NATIVE_FETCH(request, init);
  let response = await NATIVE_FETCH(request, init), text = await response.clone().text();
  if (!text.length) return response;
  BxEvent.dispatch(window, BxEvent.STREAM_STARTING);
  let obj = JSON.parse(text), overrides = JSON.parse(obj.clientStreamingConfigOverrides || "{}") || {};
  overrides.inputConfiguration = overrides.inputConfiguration || {}, overrides.inputConfiguration.enableVibration = !0;
  let overrideMkb = null;
  if (getPref("native_mkb_enabled") === "on" || STATES.currentStream.titleInfo && BX_FLAGS.ForceNativeMkbTitles?.includes(STATES.currentStream.titleInfo.details.productId)) overrideMkb = !0;
  if (getPref("native_mkb_enabled") === "off") overrideMkb = !1;
  if (overrideMkb !== null) overrides.inputConfiguration = Object.assign(overrides.inputConfiguration, {
    enableMouseInput: overrideMkb,
    enableKeyboardInput: overrideMkb
   });
  if (getPref("audio_mic_on_playing")) overrides.audioConfiguration = overrides.audioConfiguration || {}, overrides.audioConfiguration.enableMicrophone = !0;
  return obj.clientStreamingConfigOverrides = JSON.stringify(overrides), response.json = () => Promise.resolve(obj), response.text = () => Promise.resolve(JSON.stringify(obj)), response;
 }
 static async handle(request, init) {
  let url = typeof request === "string" ? request : request.url;
  if (url.endsWith("/v2/login/user")) return XcloudInterceptor.handleLogin(request, init);
  else if (url.endsWith("/sessions/cloud/play")) return XcloudInterceptor.handlePlay(request, init);
  else if (url.includes("xboxlive.com") && url.includes("/waittime/")) return XcloudInterceptor.handleWaitTime(request, init);
  else if (url.endsWith("/configuration")) return XcloudInterceptor.handleConfiguration(request, init);
  else if (url && url.endsWith("/ice") && url.includes("/sessions/") && request.method === "GET") return patchIceCandidates(request);
  return NATIVE_FETCH(request, init);
 }
}
function clearApplicationInsightsBuffers() {
 window.sessionStorage.removeItem("AI_buffer"), window.sessionStorage.removeItem("AI_sentBuffer");
}
function clearDbLogs(dbName, table) {
 let request = window.indexedDB.open(dbName);
 request.onsuccess = (e) => {
  let db = e.target.result;
  try {
   let objectStoreRequest = db.transaction(table, "readwrite").objectStore(table).clear();
   objectStoreRequest.onsuccess = () => BxLogger.info("clearDbLogs", `Cleared ${dbName}.${table}`);
  } catch (ex) {}
 };
}
function clearAllLogs() {
 clearApplicationInsightsBuffers(), clearDbLogs("StreamClientLogHandler", "logs"), clearDbLogs("XCloudAppLogs", "logs");
}
function updateIceCandidates(candidates, options) {
 let pattern = new RegExp(/a=candidate:(?<foundation>\d+) (?<component>\d+) UDP (?<priority>\d+) (?<ip>[^\s]+) (?<port>\d+) (?<the_rest>.*)/), lst = [];
 for (let item of candidates) {
  if (item.candidate == "a=end-of-candidates") continue;
  let groups = pattern.exec(item.candidate).groups;
  lst.push(groups);
 }
 if (options.preferIpv6Server) lst.sort((a, b) => {
   let firstIp = a.ip, secondIp = b.ip;
   return !firstIp.includes(":") && secondIp.includes(":") ? 1 : -1;
  });
 let newCandidates = [], foundation = 1, newCandidate = (candidate) => {
  return {
   candidate,
   messageType: "iceCandidate",
   sdpMLineIndex: "0",
   sdpMid: "0"
  };
 };
 if (lst.forEach((item) => {
  item.foundation = foundation, item.priority = foundation == 1 ? 2130706431 : 1, newCandidates.push(newCandidate(`a=candidate:${item.foundation} 1 UDP ${item.priority} ${item.ip} ${item.port} ${item.the_rest}`)), ++foundation;
 }), options.consoleAddrs)
  for (let ip in options.consoleAddrs)
   for (let port of options.consoleAddrs[ip])
    newCandidates.push(newCandidate(`a=candidate:${newCandidates.length + 1} 1 UDP 1 ${ip} ${port} typ host`));
 return newCandidates.push(newCandidate("a=end-of-candidates")), BxLogger.info("ICE Candidates", newCandidates), newCandidates;
}
async function patchIceCandidates(request, consoleAddrs) {
 let response = await NATIVE_FETCH(request), text = await response.clone().text();
 if (!text.length) return response;
 let options = {
  preferIpv6Server: getPref("prefer_ipv6_server"),
  consoleAddrs
 }, obj = JSON.parse(text), exchangeResponse = JSON.parse(obj.exchangeResponse);
 return exchangeResponse = updateIceCandidates(exchangeResponse, options), obj.exchangeResponse = JSON.stringify(exchangeResponse), response.json = () => Promise.resolve(obj), response.text = () => Promise.resolve(JSON.stringify(obj)), response;
}
function interceptHttpRequests() {
 let BLOCKED_URLS = [];
 if (getPref("block_tracking")) clearAllLogs(), BLOCKED_URLS = BLOCKED_URLS.concat([
   "https://arc.msn.com",
   "https://browser.events.data.microsoft.com",
   "https://dc.services.visualstudio.com",
   "https://2c06dea3f26c40c69b8456d319791fd0@o427368.ingest.sentry.io",
   "https://mscom.demdex.net"
  ]);
 if (getPref("block_social_features")) BLOCKED_URLS = BLOCKED_URLS.concat([
   "https://peoplehub.xboxlive.com/users/me/people/social",
   "https://peoplehub.xboxlive.com/users/me/people/recommendations",
   "https://xblmessaging.xboxlive.com/network/xbox/users/me/inbox"
  ]);
 let xhrPrototype = XMLHttpRequest.prototype, nativeXhrOpen = xhrPrototype.open, nativeXhrSend = xhrPrototype.send;
 xhrPrototype.open = function(method, url) {
  return this._url = url, nativeXhrOpen.apply(this, arguments);
 }, xhrPrototype.send = function(...arg) {
  for (let blocked of BLOCKED_URLS)
   if (this._url.startsWith(blocked)) {
    if (blocked === "https://dc.services.visualstudio.com") window.setTimeout(clearAllLogs, 1000);
    return !1;
   }
  return nativeXhrSend.apply(this, arguments);
 };
 let gamepassAllGames = [], IGNORED_DOMAINS = [
  "accounts.xboxlive.com",
  "chat.xboxlive.com",
  "notificationinbox.xboxlive.com",
  "peoplehub.xboxlive.com",
  "rta.xboxlive.com",
  "userpresence.xboxlive.com",
  "xblmessaging.xboxlive.com",
  "consent.config.office.com",
  "arc.msn.com",
  "browser.events.data.microsoft.com",
  "dc.services.visualstudio.com",
  "2c06dea3f26c40c69b8456d319791fd0@o427368.ingest.sentry.io"
 ];
 window.BX_FETCH = window.fetch = async (request, init) => {
  let url = typeof request === "string" ? request : request.url;
  for (let blocked of BLOCKED_URLS)
   if (url.startsWith(blocked)) return new Response('{"acc":1,"webResult":{}}', {
     status: 200,
     statusText: "200 OK"
    });
  let domain = new URL(url).hostname;
  if (IGNORED_DOMAINS.includes(domain)) return NATIVE_FETCH(request, init);
  if (url.startsWith("https://emerald.xboxservices.com/xboxcomfd/experimentation")) try {
    let response = await NATIVE_FETCH(request, init), json = await response.json();
    if (json && json.exp && json.exp.treatments) for (let key in FeatureGates)
      json.exp.treatments[key] = FeatureGates[key];
    return response.json = () => Promise.resolve(json), response;
   } catch (e) {
    return console.log(e), NATIVE_FETCH(request, init);
   }
  if (STATES.userAgent.capabilities.touch && url.includes("catalog.gamepass.com/sigls/")) {
   let response = await NATIVE_FETCH(request, init), obj = await response.clone().json();
   if (url.includes("29a81209-df6f-41fd-a528-2ae6b91f719c")) for (let i = 1;i < obj.length; i++)
     gamepassAllGames.push(obj[i].id);
   else if (!1) try {} catch (e) {}
   return response.json = () => Promise.resolve(obj), response;
  }
  if (BX_FLAGS.ForceNativeMkbTitles && url.includes("catalog.gamepass.com/sigls/") && url.includes("8fa264dd-124f-4af3-97e8-596fcdf4b486")) {
   let response = await NATIVE_FETCH(request, init), obj = await response.clone().json();
   try {
    let newCustomList = BX_FLAGS.ForceNativeMkbTitles.map((item) => ({ id: item }));
    obj.push(...newCustomList);
   } catch (e) {
    console.log(e);
   }
   return response.json = () => Promise.resolve(obj), response;
  }
  let requestType;
  if (url.includes("/sessions/home") || url.includes("xhome.") || STATES.remotePlay.isPlaying && url.endsWith("/inputconfigs")) requestType = "xhome";
  else requestType = "xcloud";
  return XcloudInterceptor.handle(request, init);
 };
}
function addCss() {
 let css = `:root{--bx-title-font:Bahnschrift,Arial,Helvetica,sans-serif;--bx-title-font-semibold:Bahnschrift Semibold,Arial,Helvetica,sans-serif;--bx-normal-font:"Segoe UI",Arial,Helvetica,sans-serif;--bx-monospaced-font:Consolas,"Courier New",Courier,monospace;--bx-promptfont-font:promptfont;--bx-button-height:40px;--bx-default-button-color:#2d3036;--bx-default-button-rgb:45,48,54;--bx-default-button-hover-color:#515863;--bx-default-button-hover-rgb:81,88,99;--bx-default-button-active-color:#222428;--bx-default-button-active-rgb:34,36,40;--bx-default-button-disabled-color:#8e8e8e;--bx-default-button-disabled-rgb:142,142,142;--bx-primary-button-color:#008746;--bx-primary-button-rgb:0,135,70;--bx-primary-button-hover-color:#04b358;--bx-primary-button-hover-rgb:4,179,88;--bx-primary-button-active-color:#044e2a;--bx-primary-button-active-rgb:4,78,42;--bx-primary-button-disabled-color:#448262;--bx-primary-button-disabled-rgb:68,130,98;--bx-danger-button-color:#c10404;--bx-danger-button-rgb:193,4,4;--bx-danger-button-hover-color:#e61d1d;--bx-danger-button-hover-rgb:230,29,29;--bx-danger-button-active-color:#a26c6c;--bx-danger-button-active-rgb:162,108,108;--bx-danger-button-disabled-color:#df5656;--bx-danger-button-disabled-rgb:223,86,86;--bx-fullscreen-text-z-index:99999;--bx-toast-z-index:60000;--bx-dialog-z-index:50000;--bx-dialog-overlay-z-index:40200;--bx-stats-bar-z-index:40100;--bx-mkb-pointer-lock-msg-z-index:40000;--bx-navigation-dialog-z-index:30100;--bx-navigation-dialog-overlay-z-index:30000;--bx-game-bar-z-index:10000;--bx-screenshot-animation-z-index:9000;--bx-wait-time-box-z-index:1000}@font-face{font-family:'promptfont';src:url("https://redphx.github.io/better-xcloud/fonts/promptfont.otf")}div[class^=HUDButton-module__hiddenContainer] ~ div:not([class^=HUDButton-module__hiddenContainer]){opacity:0;pointer-events:none !important;position:absolute;top:-9999px;left:-9999px}@media screen and (max-width:640px){header a[href="/play"]{display:none}}.bx-full-width{width:100% !important}.bx-full-height{height:100% !important}.bx-no-scroll{overflow:hidden !important}.bx-hide-scroll-bar{scrollbar-width:none}.bx-hide-scroll-bar::-webkit-scrollbar{display:none}.bx-gone{display:none !important}.bx-offscreen{position:absolute !important;top:-9999px !important;left:-9999px !important;visibility:hidden !important}.bx-hidden{visibility:hidden !important}.bx-invisible{opacity:0}.bx-unclickable{pointer-events:none}.bx-pixel{width:1px !important;height:1px !important}.bx-no-margin{margin:0 !important}.bx-no-padding{padding:0 !important}.bx-prompt{font-family:var(--bx-promptfont-font)}.bx-line-through{text-decoration:line-through !important}.bx-normal-case{text-transform:none !important}.bx-normal-link{text-transform:none !important;text-align:left !important;font-weight:400 !important;font-family:var(--bx-normal-font) !important}select[multiple]{overflow:auto}#headerArea,#uhfSkipToMain,.uhf-footer{display:none}div[class*=NotFocusedDialog]{position:absolute !important;top:-9999px !important;left:-9999px !important;width:0 !important;height:0 !important}#game-stream video:not([src]){visibility:hidden}div[class*=SupportedInputsBadge]:not(:has(:nth-child(2))),div[class*=SupportedInputsBadge] svg:first-of-type{display:none}.bx-game-tile-wait-time{position:absolute;top:0;left:0;z-index:1;background:rgba(0,0,0,0.549);display:flex;border-radius:4px 0 4px 0;align-items:center;padding:4px 8px}.bx-game-tile-wait-time svg{width:14px;height:16px;margin-right:2px}.bx-game-tile-wait-time span{display:inline-block;height:16px;line-height:16px;font-size:12px;font-weight:bold;margin-left:2px}.bx-fullscreen-text{position:fixed;top:0;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);z-index:var(--bx-fullscreen-text-z-index);line-height:100vh;color:#fff;text-align:center;font-weight:400;font-family:var(--bx-normal-font);font-size:1.3rem;user-select:none;-webkit-user-select:none}#root section[class*=DeviceCodePage-module__page]{margin-left:20px !important;margin-right:20px !important;margin-top:20px !important;max-width:800px !important}#root div[class*=DeviceCodePage-module__back]{display:none}.bx-button{--button-rgb:var(--bx-default-button-rgb);--button-hover-rgb:var(--bx-default-button-hover-rgb);--button-active-rgb:var(--bx-default-button-active-rgb);--button-disabled-rgb:var(--bx-default-button-disabled-rgb);background-color:rgb(var(--button-rgb));user-select:none;-webkit-user-select:none;color:#fff;font-family:var(--bx-title-font-semibold);font-size:14px;border:none;font-weight:400;height:var(--bx-button-height);border-radius:4px;padding:0 8px;text-transform:uppercase;cursor:pointer;overflow:hidden}.bx-button:not([disabled]):active{background-color:rgb(var(--button-active-rgb))}.bx-button:focus{outline:none !important}.bx-button:not([disabled]):not(:active):hover,.bx-button:not([disabled]):not(:active).bx-focusable:focus{background-color:rgb(var(--button-hover-rgb))}.bx-button:disabled{cursor:default;background-color:rgb(var(--button-disabled-rgb))}.bx-button.bx-ghost{background-color:transparent}.bx-button.bx-ghost:not([disabled]):not(:active):hover,.bx-button.bx-ghost:not([disabled]):not(:active).bx-focusable:focus{background-color:rgb(var(--button-hover-rgb))}.bx-button.bx-primary{--button-rgb:var(--bx-primary-button-rgb)}.bx-button.bx-primary:not([disabled]):active{--button-active-rgb:var(--bx-primary-button-active-rgb)}.bx-button.bx-primary:not([disabled]):not(:active):hover,.bx-button.bx-primary:not([disabled]):not(:active).bx-focusable:focus{--button-hover-rgb:var(--bx-primary-button-hover-rgb)}.bx-button.bx-primary:disabled{--button-disabled-rgb:var(--bx-primary-button-disabled-rgb)}.bx-button.bx-danger{--button-rgb:var(--bx-danger-button-rgb)}.bx-button.bx-danger:not([disabled]):active{--button-active-rgb:var(--bx-danger-button-active-rgb)}.bx-button.bx-danger:not([disabled]):not(:active):hover,.bx-button.bx-danger:not([disabled]):not(:active).bx-focusable:focus{--button-hover-rgb:var(--bx-danger-button-hover-rgb)}.bx-button.bx-danger:disabled{--button-disabled-rgb:var(--bx-danger-button-disabled-rgb)}.bx-button.bx-frosted{--button-alpha:.2;background-color:rgba(var(--button-rgb), var(--button-alpha));backdrop-filter:blur(4px) brightness(1.5)}.bx-button.bx-frosted:not([disabled]):not(:active):hover,.bx-button.bx-frosted:not([disabled]):not(:active).bx-focusable:focus{background-color:rgba(var(--button-hover-rgb), var(--button-alpha))}.bx-button.bx-drop-shadow{box-shadow:0 0 4px rgba(0,0,0,0.502)}.bx-button.bx-tall{height:calc(var(--bx-button-height) * 1.5) !important}.bx-button.bx-circular{border-radius:var(--bx-button-height);height:var(--bx-button-height)}.bx-button svg{display:inline-block;width:16px;height:var(--bx-button-height)}.bx-button span{display:inline-block;line-height:var(--bx-button-height);vertical-align:middle;color:#fff;overflow:hidden;white-space:nowrap}.bx-button span:not(:only-child){margin-left:10px}.bx-focusable{position:relative;overflow:visible}.bx-focusable::after{border:2px solid transparent;border-radius:10px}.bx-focusable:focus::after{content:'';border-color:#fff;position:absolute;top:-6px;left:-6px;right:-6px;bottom:-6px}html[data-active-input=touch] .bx-focusable:focus::after,html[data-active-input=mouse] .bx-focusable:focus::after{border-color:transparent !important}.bx-focusable.bx-circular::after{border-radius:var(--bx-button-height)}a.bx-button{display:inline-block}a.bx-button.bx-full-width{text-align:center}button.bx-inactive{pointer-events:none;opacity:.2;background:transparent !important}.bx-header-remote-play-button{height:auto;margin-right:8px !important}.bx-header-remote-play-button svg{width:24px;height:24px}.bx-header-settings-button{line-height:30px;font-size:14px;text-transform:uppercase;position:relative}.bx-header-settings-button[data-update-available]::before{content:'🌟' !important;line-height:var(--bx-button-height);display:inline-block;margin-left:4px}.bx-dialog-overlay{position:fixed;inset:0;z-index:var(--bx-dialog-overlay-z-index);background:#000;opacity:50%}.bx-dialog{display:flex;flex-flow:column;max-height:90vh;position:fixed;top:50%;left:50%;margin-right:-50%;transform:translate(-50%,-50%);min-width:420px;padding:20px;border-radius:8px;z-index:var(--bx-dialog-z-index);background:#1a1b1e;color:#fff;font-weight:400;font-size:16px;font-family:var(--bx-normal-font);box-shadow:0 0 6px #000;user-select:none;-webkit-user-select:none}.bx-dialog *:focus{outline:none !important}.bx-dialog h2{display:flex;margin-bottom:12px}.bx-dialog h2 b{flex:1;color:#fff;display:block;font-family:var(--bx-title-font);font-size:26px;font-weight:400;line-height:var(--bx-button-height)}.bx-dialog.bx-binding-dialog h2 b{font-family:var(--bx-promptfont-font) !important}.bx-dialog > div{overflow:auto;padding:2px 0}.bx-dialog > button{padding:8px 32px;margin:10px auto 0;border:none;border-radius:4px;display:block;background-color:#2d3036;text-align:center;color:#fff;text-transform:uppercase;font-family:var(--bx-title-font);font-weight:400;line-height:18px;font-size:14px}@media (hover:hover){.bx-dialog > button:hover{background-color:#515863}}.bx-dialog > button:focus{background-color:#515863}@media screen and (max-width:450px){.bx-dialog{min-width:100%}}.bx-navigation-dialog{position:absolute;z-index:var(--bx-navigation-dialog-z-index);font-family:var(--bx-title-font)}.bx-navigation-dialog *:focus{outline:none !important}.bx-navigation-dialog-overlay{position:fixed;background:rgba(11,11,11,0.89);top:0;left:0;right:0;bottom:0;z-index:var(--bx-navigation-dialog-overlay-z-index)}.bx-navigation-dialog-overlay[data-is-playing="true"]{background:transparent}.bx-settings-dialog{display:flex;position:fixed;top:0;right:0;bottom:0;opacity:.98;user-select:none;-webkit-user-select:none}.bx-settings-dialog .bx-focusable::after{border-radius:4px}.bx-settings-dialog .bx-focusable:focus::after{top:0;left:0;right:0;bottom:0}.bx-settings-dialog .bx-settings-reload-note{font-size:.8rem;display:block;padding:8px;font-style:italic;font-weight:normal;height:var(--bx-button-height)}.bx-settings-dialog input{accent-color:var(--bx-primary-button-color)}.bx-settings-dialog input:focus{accent-color:var(--bx-danger-button-color)}.bx-settings-dialog select:disabled{-webkit-appearance:none;background:transparent;text-align-last:right;border:none;color:#fff}.bx-settings-dialog select option:disabled{display:none}.bx-settings-dialog input[type=checkbox]:focus,.bx-settings-dialog select:focus{filter:drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff)}.bx-settings-dialog a{color:#1c9d1c;text-decoration:none}.bx-settings-dialog a:hover,.bx-settings-dialog a:focus{color:#5dc21e}.bx-settings-tabs-container{position:fixed;width:48px;max-height:100vh;display:flex;flex-direction:column}.bx-settings-tabs-container > div:last-of-type{display:flex;flex-direction:column;align-items:end}.bx-settings-tabs-container > div:last-of-type button{flex-shrink:0;border-top-right-radius:0;border-bottom-right-radius:0;margin-top:8px;height:unset;padding:8px 10px}.bx-settings-tabs-container > div:last-of-type button svg{width:16px;height:16px}.bx-settings-tabs{display:flex;flex-direction:column;border-radius:0 0 0 8px;box-shadow:0 0 6px #000;overflow:overlay;flex:1}.bx-settings-tabs svg{width:24px;height:24px;padding:10px;flex-shrink:0;box-sizing:content-box;background:#131313;cursor:pointer;border-left:4px solid #1e1e1e}.bx-settings-tabs svg.bx-active{background:#222;border-color:#008746}.bx-settings-tabs svg:not(.bx-active):hover{background:#2f2f2f;border-color:#484848}.bx-settings-tabs svg:focus{border-color:#fff}.bx-settings-tabs svg[data-group=global][data-need-refresh=true]{background:var(--bx-danger-button-color) !important}.bx-settings-tabs svg[data-group=global][data-need-refresh=true]:hover{background:var(--bx-danger-button-hover-color) !important}.bx-settings-tab-contents{flex-direction:column;padding:10px;margin-left:48px;width:450px;max-width:calc(100vw - tabsWidth);background:#1a1b1e;color:#fff;font-weight:400;font-size:16px;font-family:var(--bx-title-font);text-align:center;box-shadow:0 0 6px #000;overflow:overlay;z-index:1}.bx-settings-tab-contents > div[data-tab-group=mkb]{display:flex;flex-direction:column;height:100%;overflow:hidden}.bx-settings-tab-contents > div[data-tab-group=shortcuts] > div[data-has-gamepad=true] > div:first-of-type{display:none}.bx-settings-tab-contents > div[data-tab-group=shortcuts] > div[data-has-gamepad=true] > div:last-of-type{display:block}.bx-settings-tab-contents > div[data-tab-group=shortcuts] > div[data-has-gamepad=false] > div:first-of-type{display:block}.bx-settings-tab-contents > div[data-tab-group=shortcuts] > div[data-has-gamepad=false] > div:last-of-type{display:none}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-profile{width:100%;height:36px;display:block}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-note{margin-top:10px;font-size:14px}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row{display:flex;margin-bottom:10px}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row label.bx-prompt{flex:1;font-size:26px;margin-bottom:0}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row .bx-shortcut-actions{flex:2;position:relative}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row .bx-shortcut-actions select{position:absolute;width:100%;height:100%;display:block}.bx-settings-tab-contents > div[data-tab-group=shortcuts] .bx-shortcut-row .bx-shortcut-actions select:last-of-type{opacity:0;z-index:calc(var(--bx-settings-z-index) + 1)}.bx-settings-tab-contents .bx-top-buttons{display:flex;flex-direction:column;gap:8px;margin-bottom:8px}.bx-settings-tab-contents .bx-top-buttons .bx-button{display:block}.bx-settings-tab-contents h2{margin:16px 0 8px 0;display:flex;align-items:center}.bx-settings-tab-contents h2:first-of-type{margin-top:0}.bx-settings-tab-contents h2 span{display:inline-block;font-size:20px;font-weight:bold;text-align:left;flex:1;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}@media (max-width:500px){.bx-settings-tab-contents{width:calc(100vw - 48px)}}.bx-settings-row{display:flex;gap:10px;padding:16px 10px;margin:0;background:#2a2a2a;border-bottom:1px solid #343434}.bx-settings-row:hover,.bx-settings-row:focus-within{background-color:#242424}.bx-settings-row:not(:has(> input[type=checkbox])){flex-wrap:wrap}.bx-settings-row > span.bx-settings-label{font-size:14px;display:block;text-align:left;align-self:center;margin-bottom:0 !important;flex:1}.bx-settings-row > span.bx-settings-label + *{margin:0 0 0 auto}.bx-settings-dialog-note{display:block;color:#afafb0;font-size:12px;font-weight:lighter;font-style:italic}.bx-settings-dialog-note:not(:has(a)){margin-top:4px}.bx-settings-dialog-note a{display:inline-block;padding:4px}.bx-settings-custom-user-agent{display:block;width:100%;padding:6px}.bx-donation-link{display:block;text-align:center;text-decoration:none;height:20px;line-height:20px;font-size:14px;margin-top:10px}.bx-debug-info button{margin-top:10px}.bx-debug-info pre{margin-top:10px;cursor:copy;color:#fff;padding:8px;border:1px solid #2d2d2d;background:#212121;white-space:break-spaces;text-align:left}.bx-debug-info pre:hover{background:#272727}.bx-settings-app-version{margin-top:10px;text-align:center;color:#747474;font-size:12px}.bx-note-unsupported{display:block;font-size:12px;font-style:italic;font-weight:normal;color:#828282}.bx-settings-tab-contents > div *:not(.bx-settings-row):has(+ .bx-settings-row) + .bx-settings-row:has(+ .bx-settings-row){border-top-left-radius:10px;border-top-right-radius:10px}.bx-settings-tab-contents > div .bx-settings-row:not(:has(+ .bx-settings-row)){border:none;border-bottom-left-radius:10px;border-bottom-right-radius:10px}.bx-settings-tab-contents > div *:not(.bx-settings-row):has(+ .bx-settings-row) + .bx-settings-row:not(:has(+ .bx-settings-row)){border:none;border-radius:10px}.bx-suggest-toggler{text-align:left;display:flex;border-radius:4px;overflow:hidden;background:#003861}.bx-suggest-toggler label{flex:1;margin-bottom:0;padding:10px;background:#004f87}.bx-suggest-toggler span{display:inline-block;align-self:center;padding:10px;width:40px;text-align:center}.bx-suggest-toggler:hover,.bx-suggest-toggler:focus{cursor:pointer;background:#005da1}.bx-suggest-toggler:hover label,.bx-suggest-toggler:focus label{background:#006fbe}.bx-suggest-toggler[bx-open] span{transform:rotate(90deg)}.bx-suggest-toggler[bx-open]+ .bx-suggest-box{display:block}.bx-suggest-box{display:none;background:#161616;padding:10px;box-shadow:0 0 12px #0f0f0f inset;border-radius:10px}.bx-suggest-wrapper{display:flex;flex-direction:column;gap:10px;margin:10px}.bx-suggest-note{font-size:11px;color:#8c8c8c;font-style:italic;font-weight:100}.bx-suggest-link{font-size:14px;display:inline-block;margin-top:4px;padding:4px}.bx-suggest-row{display:flex;flex-direction:row;gap:10px}.bx-suggest-row label{flex:1;overflow:overlay;border-radius:4px}.bx-suggest-row label .bx-suggest-label{background:#323232;padding:4px 10px;font-size:12px;text-align:left}.bx-suggest-row label .bx-suggest-value{padding:6px;font-size:14px}.bx-suggest-row label .bx-suggest-value.bx-suggest-change{background-color:var(--bx-warning-color)}.bx-suggest-row.bx-suggest-ok input{visibility:hidden}.bx-suggest-row.bx-suggest-ok .bx-suggest-label{background-color:#008114}.bx-suggest-row.bx-suggest-ok .bx-suggest-value{background-color:#13a72a}.bx-suggest-row.bx-suggest-change .bx-suggest-label{background-color:#a65e08}.bx-suggest-row.bx-suggest-change .bx-suggest-value{background-color:#d57f18}.bx-suggest-row.bx-suggest-change:hover label{cursor:pointer}.bx-suggest-row.bx-suggest-change:hover .bx-suggest-label{background-color:#995707}.bx-suggest-row.bx-suggest-change:hover .bx-suggest-value{background-color:#bd7115}.bx-suggest-row.bx-suggest-change input:not(:checked) + label{opacity:.5}.bx-suggest-row.bx-suggest-change input:not(:checked) + label .bx-suggest-label{background-color:#2a2a2a}.bx-suggest-row.bx-suggest-change input:not(:checked) + label .bx-suggest-value{background-color:#393939}.bx-suggest-row.bx-suggest-change:hover input:not(:checked) + label{opacity:1}.bx-suggest-row.bx-suggest-change:hover input:not(:checked) + label .bx-suggest-label{background-color:#202020}.bx-suggest-row.bx-suggest-change:hover input:not(:checked) + label .bx-suggest-value{background-color:#303030}.bx-toast{user-select:none;-webkit-user-select:none;position:fixed;left:50%;top:24px;transform:translate(-50%,0);background:#000;border-radius:16px;color:#fff;z-index:var(--bx-toast-z-index);font-family:var(--bx-normal-font);border:2px solid #fff;display:flex;align-items:center;opacity:0;overflow:clip;transition:opacity .2s ease-in}.bx-toast.bx-show{opacity:.85}.bx-toast.bx-hide{opacity:0;pointer-events:none}.bx-toast-msg{font-size:14px;display:inline-block;padding:12px 16px;white-space:pre}.bx-toast-status{font-weight:bold;font-size:14px;text-transform:uppercase;display:inline-block;background:#515863;padding:12px 16px;color:#fff;white-space:pre}.bx-wait-time-box{position:fixed;top:0;right:0;background-color:rgba(0,0,0,0.8);color:#fff;z-index:var(--bx-wait-time-box-z-index);padding:12px;border-radius:0 0 0 8px}.bx-wait-time-box label{display:block;text-transform:uppercase;text-align:right;font-size:12px;font-weight:bold;margin:0}.bx-wait-time-box span{display:block;font-family:var(--bx-monospaced-font);text-align:right;font-size:16px;margin-bottom:10px}.bx-wait-time-box span:last-of-type{margin-bottom:0}.bx-remote-play-container{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;background:#1a1b1e;border-radius:10px;width:420px;max-width:calc(100vw - 20px);margin:0 0 0 auto;padding:20px}.bx-remote-play-container > .bx-button{display:table;margin:0 0 0 auto}.bx-remote-play-settings{margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #2d2d2d}.bx-remote-play-settings > div{display:flex}.bx-remote-play-settings label{flex:1}.bx-remote-play-settings label p{margin:4px 0 0;padding:0;color:#888;font-size:12px}.bx-remote-play-resolution{display:block}.bx-remote-play-resolution input[type="radio"]{accent-color:var(--bx-primary-button-color);margin-right:6px}.bx-remote-play-resolution input[type="radio"]:focus{accent-color:var(--bx-primary-button-hover-color)}.bx-remote-play-device-wrapper{display:flex;margin-bottom:12px}.bx-remote-play-device-wrapper:last-child{margin-bottom:2px}.bx-remote-play-device-info{flex:1;padding:4px 0}.bx-remote-play-device-name{font-size:20px;font-weight:bold;display:inline-block;vertical-align:middle}.bx-remote-play-console-type{font-size:12px;background:#004c87;color:#fff;display:inline-block;border-radius:14px;padding:2px 10px;margin-left:8px;vertical-align:middle}.bx-remote-play-power-state{color:#888;font-size:12px}.bx-remote-play-connect-button{min-height:100%;margin:4px 0}.bx-remote-play-buttons{display:flex;justify-content:space-between}.bx-select{display:flex;align-items:center;flex:0 1 auto}.bx-select select{position:absolute !important;top:-9999px !important;left:-9999px !important;visibility:hidden !important}.bx-select > div,.bx-select button.bx-select-value{min-width:120px;text-align:left;margin:0 8px;line-height:24px;vertical-align:middle;background:#fff;color:#000;border-radius:4px;padding:2px 8px;flex:1}.bx-select > div{display:inline-block}.bx-select > div input{display:inline-block;margin-right:8px}.bx-select > div label{margin-bottom:0;font-size:14px;width:100%}.bx-select > div label span{display:block;font-size:10px;font-weight:bold;text-align:left;line-height:initial}.bx-select button.bx-select-value{border:none;display:inline-flex;cursor:pointer;min-height:30px;font-size:.9rem;align-items:center}.bx-select button.bx-select-value span{flex:1;text-align:left;display:inline-block}.bx-select button.bx-select-value input{margin:0 4px;accent-color:var(--bx-primary-button-color);pointer-events:none}.bx-select button.bx-select-value:hover input,.bx-select button.bx-select-value:focus input{accent-color:var(--bx-danger-button-color)}.bx-select button.bx-select-value:hover::after,.bx-select button.bx-select-value:focus::after{border-color:#4d4d4d !important}.bx-select button.bx-button{border:none;height:24px;width:24px;padding:0;line-height:24px;color:#fff;border-radius:4px;font-weight:bold;font-size:12px;font-family:var(--bx-monospaced-font);flex-shrink:0}.bx-select button.bx-button span{line-height:unset}.bx-guide-home-achievements-progress{display:flex;gap:10px;flex-direction:row}.bx-guide-home-achievements-progress .bx-button{margin-bottom:0 !important}html[data-xds-platform=tv] .bx-guide-home-achievements-progress{flex-direction:column}html:not([data-xds-platform=tv]) .bx-guide-home-achievements-progress{flex-direction:row}html:not([data-xds-platform=tv]) .bx-guide-home-achievements-progress > button:first-of-type{flex:1}html:not([data-xds-platform=tv]) .bx-guide-home-achievements-progress > button:last-of-type{width:40px}html:not([data-xds-platform=tv]) .bx-guide-home-achievements-progress > button:last-of-type span{display:none}.bx-guide-home-buttons > div{display:flex;flex-direction:row;gap:12px}html[data-xds-platform=tv] .bx-guide-home-buttons > div{flex-direction:column}html[data-xds-platform=tv] .bx-guide-home-buttons > div button{margin-bottom:0 !important}html:not([data-xds-platform=tv]) .bx-guide-home-buttons > div button span{display:none}.bx-guide-home-buttons[data-is-playing="true"] button[data-state='normal']{display:none}.bx-guide-home-buttons[data-is-playing="false"] button[data-state='playing']{display:none}div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]{overflow:visible}.bx-stream-menu-button-on{fill:#000 !important;background-color:#2d2d2d !important;color:#000 !important}.bx-stream-refresh-button{top:calc(env(safe-area-inset-top, 0px) + 10px + 50px) !important}body[data-media-type=default] .bx-stream-refresh-button{left:calc(env(safe-area-inset-left, 0px) + 11px) !important}body[data-media-type=tv] .bx-stream-refresh-button{top:calc(var(--gds-focus-borderSize) + 80px) !important}.bx-stream-home-button{top:calc(env(safe-area-inset-top, 0px) + 10px + 50px * 2) !important}body[data-media-type=default] .bx-stream-home-button{left:calc(env(safe-area-inset-left, 0px) + 12px) !important}body[data-media-type=tv] .bx-stream-home-button{top:calc(var(--gds-focus-borderSize) + 80px * 2) !important}div[data-testid=media-container]{display:flex}div[data-testid=media-container].bx-taking-screenshot:before{animation:bx-anim-taking-screenshot .5s ease;content:' ';position:absolute;width:100%;height:100%;z-index:var(--bx-screenshot-animation-z-index)}#game-stream video{margin:auto;align-self:center;background:#000}#game-stream canvas{position:absolute;align-self:center;margin:auto;left:0;right:0}#gamepass-dialog-root div[class^=Guide-module__guide] .bx-button{overflow:visible;margin-bottom:12px}@-moz-keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}@-webkit-keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}@-o-keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}@keyframes bx-anim-taking-screenshot{0%{border:0 solid rgba(255,255,255,0.502)}50%{border:8px solid rgba(255,255,255,0.502)}100%{border:0 solid rgba(255,255,255,0.502)}}.bx-number-stepper{text-align:center}.bx-number-stepper span{display:inline-block;min-width:40px;font-family:var(--bx-monospaced-font);font-size:13px;margin:0 4px}.bx-number-stepper button{border:none;width:24px;height:24px;margin:0;line-height:24px;background-color:var(--bx-default-button-color);color:#fff;border-radius:4px;font-weight:bold;font-size:14px;font-family:var(--bx-monospaced-font)}@media (hover:hover){.bx-number-stepper button:hover{background-color:var(--bx-default-button-hover-color)}}.bx-number-stepper button:active{background-color:var(--bx-default-button-hover-color)}.bx-number-stepper button:disabled + span{font-family:var(--bx-title-font)}.bx-number-stepper input[type="range"]{display:block;margin:12px auto 2px;width:180px;color:#959595 !important}.bx-number-stepper input[type=range]:disabled,.bx-number-stepper button:disabled{display:none}.bx-number-stepper[data-disabled=true] input[type=range],.bx-number-stepper[data-disabled=true] button{display:none}#bx-game-bar{z-index:var(--bx-game-bar-z-index);position:fixed;bottom:0;width:40px;height:90px;overflow:visible;cursor:pointer}#bx-game-bar > svg{display:none;pointer-events:none;position:absolute;height:28px;margin-top:16px}@media (hover:hover){#bx-game-bar:hover > svg{display:block}}#bx-game-bar .bx-game-bar-container{opacity:0;position:absolute;display:flex;overflow:hidden;background:rgba(26,27,30,0.91);box-shadow:0 0 6px #1c1c1c;transition:opacity .1s ease-in}#bx-game-bar .bx-game-bar-container.bx-show{opacity:.9}#bx-game-bar .bx-game-bar-container.bx-show + svg{display:none !important}#bx-game-bar .bx-game-bar-container.bx-hide{opacity:0;pointer-events:none}#bx-game-bar .bx-game-bar-container button{width:60px;height:60px;border-radius:0}#bx-game-bar .bx-game-bar-container button svg{width:28px;height:28px;transition:transform .08s ease 0s}#bx-game-bar .bx-game-bar-container button:hover{border-radius:0}#bx-game-bar .bx-game-bar-container button:active svg{transform:scale(.75)}#bx-game-bar .bx-game-bar-container button.bx-activated{background-color:#fff}#bx-game-bar .bx-game-bar-container button.bx-activated svg{filter:invert(1)}#bx-game-bar .bx-game-bar-container div[data-activated] button{display:none}#bx-game-bar .bx-game-bar-container div[data-activated='false'] button:first-of-type{display:block}#bx-game-bar .bx-game-bar-container div[data-activated='true'] button:last-of-type{display:block}#bx-game-bar[data-position="bottom-left"]{left:0;direction:ltr}#bx-game-bar[data-position="bottom-left"] .bx-game-bar-container{border-radius:0 10px 10px 0}#bx-game-bar[data-position="bottom-right"]{right:0;direction:rtl}#bx-game-bar[data-position="bottom-right"] .bx-game-bar-container{direction:ltr;border-radius:10px 0 0 10px}.bx-badges{margin-left:0;user-select:none;-webkit-user-select:none}.bx-badge{border:none;display:inline-block;line-height:24px;color:#fff;font-family:var(--bx-title-font-semibold);font-size:14px;font-weight:400;margin:0 8px 8px 0;box-shadow:0 0 6px #000;border-radius:4px}.bx-badge-name{background-color:#2d3036;border-radius:4px 0 0 4px}.bx-badge-name svg{width:16px;height:16px}.bx-badge-value{background-color:#808080;border-radius:0 4px 4px 0}.bx-badge-name,.bx-badge-value{display:inline-block;padding:0 8px;line-height:30px;vertical-align:bottom}.bx-badge-battery[data-charging=true] span:first-of-type::after{content:' ⚡️'}div[class^=StreamMenu-module__container] .bx-badges{position:absolute;max-width:500px}#gamepass-dialog-root .bx-badges{position:fixed;top:60px;left:460px;max-width:500px}@media (min-width:568px) and (max-height:480px){#gamepass-dialog-root .bx-badges{position:unset;top:unset;left:unset;margin:8px 0}}.bx-stats-bar{display:flex;flex-direction:row;gap:8px;user-select:none;-webkit-user-select:none;position:fixed;top:0;background-color:#000;color:#fff;font-family:var(--bx-monospaced-font);font-size:.9rem;padding-left:8px;z-index:var(--bx-stats-bar-z-index);text-wrap:nowrap}.bx-stats-bar[data-stats*="[time]"] > .bx-stat-time,.bx-stats-bar[data-stats*="[play]"] > .bx-stat-play,.bx-stats-bar[data-stats*="[batt]"] > .bx-stat-batt,.bx-stats-bar[data-stats*="[fps]"] > .bx-stat-fps,.bx-stats-bar[data-stats*="[ping]"] > .bx-stat-ping,.bx-stats-bar[data-stats*="[jit]"] > .bx-stat-jit,.bx-stats-bar[data-stats*="[btr]"] > .bx-stat-btr,.bx-stats-bar[data-stats*="[dt]"] > .bx-stat-dt,.bx-stats-bar[data-stats*="[pl]"] > .bx-stat-pl,.bx-stats-bar[data-stats*="[fl]"] > .bx-stat-fl,.bx-stats-bar[data-stats*="[dl]"] > .bx-stat-dl,.bx-stats-bar[data-stats*="[ul]"] > .bx-stat-ul{display:inline-flex;align-items:baseline}.bx-stats-bar[data-stats$="[time]"] > .bx-stat-time,.bx-stats-bar[data-stats$="[play]"] > .bx-stat-play,.bx-stats-bar[data-stats$="[batt]"] > .bx-stat-batt,.bx-stats-bar[data-stats$="[fps]"] > .bx-stat-fps,.bx-stats-bar[data-stats$="[ping]"] > .bx-stat-ping,.bx-stats-bar[data-stats$="[jit]"] > .bx-stat-jit,.bx-stats-bar[data-stats$="[btr]"] > .bx-stat-btr,.bx-stats-bar[data-stats$="[dt]"] > .bx-stat-dt,.bx-stats-bar[data-stats$="[pl]"] > .bx-stat-pl,.bx-stats-bar[data-stats$="[fl]"] > .bx-stat-fl,.bx-stats-bar[data-stats$="[dl]"] > .bx-stat-dl,.bx-stats-bar[data-stats$="[ul]"] > .bx-stat-ul{border-right:none}.bx-stats-bar::before{display:none;content:'👀';vertical-align:middle;margin-right:8px}.bx-stats-bar[data-display=glancing]::before{display:inline-block}.bx-stats-bar[data-position=top-left]{left:0;border-radius:0 0 4px 0}.bx-stats-bar[data-position=top-right]{right:0;border-radius:0 0 0 4px}.bx-stats-bar[data-position=top-center]{transform:translate(-50%,0);left:50%;border-radius:0 0 4px 4px}.bx-stats-bar[data-transparent=true]{background:none;filter:drop-shadow(1px 0 0 rgba(0,0,0,0.941)) drop-shadow(-1px 0 0 rgba(0,0,0,0.941)) drop-shadow(0 1px 0 rgba(0,0,0,0.941)) drop-shadow(0 -1px 0 rgba(0,0,0,0.941))}.bx-stats-bar > div{display:none;border-right:1px solid #fff;padding-right:8px}.bx-stats-bar label{margin:0 8px 0 0;font-family:var(--bx-title-font);font-size:70%;font-weight:bold;vertical-align:middle;cursor:help}.bx-stats-bar span{min-width:60px;display:inline-block;text-align:right;vertical-align:middle}.bx-stats-bar span[data-grade=good]{color:#6bffff}.bx-stats-bar span[data-grade=ok]{color:#fff16b}.bx-stats-bar span[data-grade=bad]{color:#ff5f5f}.bx-stats-bar span:first-of-type{min-width:22px}.bx-mkb-settings{display:flex;flex-direction:column;flex:1;padding-bottom:10px;overflow:hidden}.bx-mkb-settings select:disabled{-webkit-appearance:none;background:transparent;text-align-last:right;text-align:right;border:none;color:#fff}.bx-mkb-pointer-lock-msg{user-select:none;-webkit-user-select:none;position:fixed;left:50%;top:50%;transform:translateX(-50%) translateY(-50%);margin:auto;background:#151515;z-index:var(--bx-mkb-pointer-lock-msg-z-index);color:#fff;text-align:center;font-weight:400;font-family:"Segoe UI",Arial,Helvetica,sans-serif;font-size:1.3rem;padding:12px;border-radius:8px;align-items:center;box-shadow:0 0 6px #000;min-width:220px;opacity:.9}.bx-mkb-pointer-lock-msg:hover{opacity:1}.bx-mkb-pointer-lock-msg > div:first-of-type{display:flex;flex-direction:column;text-align:left}.bx-mkb-pointer-lock-msg p{margin:0}.bx-mkb-pointer-lock-msg p:first-child{font-size:22px;margin-bottom:4px;font-weight:bold}.bx-mkb-pointer-lock-msg p:last-child{font-size:12px;font-style:italic}.bx-mkb-pointer-lock-msg > div:last-of-type{margin-top:10px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='native'] button:first-of-type{margin-bottom:8px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div{display:flex;flex-flow:row;margin-top:8px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div button{flex:1}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div button:first-of-type{margin-right:5px}.bx-mkb-pointer-lock-msg > div:last-of-type[data-type='virtual'] div button:last-of-type{margin-left:5px}.bx-mkb-preset-tools{display:flex;margin-bottom:12px}.bx-mkb-preset-tools select{flex:1}.bx-mkb-preset-tools button{margin-left:6px}.bx-mkb-settings-rows{flex:1;overflow:scroll}.bx-mkb-key-row{display:flex;margin-bottom:10px;align-items:center}.bx-mkb-key-row label{margin-bottom:0;font-family:var(--bx-promptfont-font);font-size:26px;text-align:center;width:26px;height:32px;line-height:32px}.bx-mkb-key-row button{flex:1;height:32px;line-height:32px;margin:0 0 0 10px;background:transparent;border:none;color:#fff;border-radius:0;border-left:1px solid #373737}.bx-mkb-key-row button:hover{background:transparent;cursor:default}.bx-mkb-settings.bx-editing .bx-mkb-key-row button{background:#393939;border-radius:4px;border:none}.bx-mkb-settings.bx-editing .bx-mkb-key-row button:hover{background:#333;cursor:pointer}.bx-mkb-action-buttons > div{text-align:right;display:none}.bx-mkb-action-buttons button{margin-left:8px}.bx-mkb-settings:not(.bx-editing) .bx-mkb-action-buttons > div:first-child{display:block}.bx-mkb-settings.bx-editing .bx-mkb-action-buttons > div:last-child{display:block}.bx-mkb-note{display:block;margin:16px 0 10px;font-size:12px}.bx-mkb-note:first-of-type{margin-top:0}.bx-product-details-buttons{display:flex;gap:10px;flex-direction:row}.bx-product-details-buttons button{max-width:max-content;margin:10px 0 0 0;display:flex}@media (min-width:568px) and (max-height:480px){.bx-product-details-buttons{flex-direction:column}.bx-product-details-buttons button{margin:8px 0 0 10px}}`, PREF_HIDE_SECTIONS = getPref("ui_hide_sections"), selectorToHide = [];
 if (PREF_HIDE_SECTIONS.includes("news")) selectorToHide.push("#BodyContent > div[class*=CarouselRow-module]");
 if (PREF_HIDE_SECTIONS.includes("all-games")) selectorToHide.push("#BodyContent div[class*=AllGamesRow-module__gridContainer]"), selectorToHide.push("#BodyContent div[class*=AllGamesRow-module__rowHeader]");
 if (PREF_HIDE_SECTIONS.includes("most-popular")) selectorToHide.push('#BodyContent div[class*=HomePage-module__bottomSpacing]:has(a[href="/play/gallery/popular"])');
 if (PREF_HIDE_SECTIONS.includes("touch")) selectorToHide.push('#BodyContent div[class*=HomePage-module__bottomSpacing]:has(a[href="/play/gallery/touch"])');
 if (getPref("block_social_features")) selectorToHide.push("#gamepass-dialog-root div[class^=AchievementsPreview-module__container] + button[class*=HomeLandingPage-module__button]");
 if (selectorToHide) css += selectorToHide.join(",") + "{ display: none; }";
 if (getPref("reduce_animations")) css += "div[class*=GameCard-module__gameTitleInnerWrapper],div[class*=GameCard-module__card],div[class*=ScrollArrows-module]{transition:none !important}";
 if (getPref("hide_dots_icon")) css += "div[class*=Grip-module__container]{visibility:hidden}@media (hover:hover){button[class*=GripHandle-module__container]:hover div[class*=Grip-module__container]{visibility:visible}}button[class*=GripHandle-module__container][aria-expanded=true] div[class*=Grip-module__container]{visibility:visible}button[class*=GripHandle-module__container][aria-expanded=false]{background-color:transparent !important}div[class*=StreamHUD-module__buttonsContainer]{padding:0 !important}";
 if (css += "div[class*=StreamMenu-module__menu]{min-width:100vw !important}", getPref("stream_simplify_menu")) css += "div[class*=Menu-module__scrollable]{--bxStreamMenuItemSize:80px;--streamMenuItemSize:calc(var(--bxStreamMenuItemSize) + 40px) !important}.bx-badges{top:calc(var(--streamMenuItemSize) - 20px)}body[data-media-type=tv] .bx-badges{top:calc(var(--streamMenuItemSize) - 10px) !important}button[class*=MenuItem-module__container]{min-width:auto !important;min-height:auto !important;width:var(--bxStreamMenuItemSize) !important;height:var(--bxStreamMenuItemSize) !important}div[class*=MenuItem-module__label]{display:none !important}svg[class*=MenuItem-module__icon]{width:36px;height:100% !important;padding:0 !important;margin:0 !important}";
 else css += "body[data-media-type=tv] .bx-badges{top:calc(var(--streamMenuItemSize) + 30px)}body:not([data-media-type=tv]) .bx-badges{top:calc(var(--streamMenuItemSize) + 20px)}body:not([data-media-type=tv]) button[class*=MenuItem-module__container]{min-width:auto !important;width:100px !important}body:not([data-media-type=tv]) button[class*=MenuItem-module__container]:nth-child(n+2){margin-left:10px !important}body:not([data-media-type=tv]) div[class*=MenuItem-module__label]{margin-left:8px !important;margin-right:8px !important}";
 if (getPref("ui_scrollbar_hide")) css += "html{scrollbar-width:none}body::-webkit-scrollbar{display:none}";
 let $style = CE("style", {}, css);
 document.documentElement.appendChild($style);
}
function preloadFonts() {
 let $link = CE("link", {
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
 let orig = window.history[type];
 return function(...args) {
  return BxEvent.dispatch(window, BxEvent.POPSTATE, {
   arguments: args
  }), orig.apply(this, arguments);
 };
}
function onHistoryChanged(e) {
 if (e && e.arguments && e.arguments[0] && e.arguments[0].origin === "better-xcloud") return;
 window.setTimeout(RemotePlayManager.detect, 10);
 let $settings = document.querySelector(".bx-settings-container");
 if ($settings) $settings.classList.add("bx-gone");
 NavigationDialogManager.getInstance().hide(), LoadingScreen.reset(), window.setTimeout(HeaderSection.watchHeader, 2000), BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
}
function setCodecPreferences(sdp, preferredCodec) {
 let h264Pattern = /a=fmtp:(\d+).*profile-level-id=([0-9a-f]{6})/g, profilePrefix = preferredCodec === "high" ? "4d" : preferredCodec === "low" ? "420" : "42e", preferredCodecIds = [], matches = sdp.matchAll(h264Pattern) || [];
 for (let match of matches) {
  let id = match[1];
  if (match[2].startsWith(profilePrefix)) preferredCodecIds.push(id);
 }
 if (!preferredCodecIds.length) return sdp;
 let lines = sdp.split("\r\n");
 for (let lineIndex = 0;lineIndex < lines.length; lineIndex++) {
  let line = lines[lineIndex];
  if (!line.startsWith("m=video")) continue;
  let tmp = line.trim().split(" "), ids = tmp.slice(3);
  ids = ids.filter((item) => !preferredCodecIds.includes(item)), ids = preferredCodecIds.concat(ids), lines[lineIndex] = tmp.slice(0, 3).concat(ids).join(" ");
  break;
 }
 return lines.join("\r\n");
}
function patchSdpBitrate(sdp, video, audio) {
 let lines = sdp.split("\r\n"), mediaSet = new Set;
 !!video && mediaSet.add("video"), !!audio && mediaSet.add("audio");
 let bitrate = {
  video,
  audio
 };
 for (let lineNumber = 0;lineNumber < lines.length; lineNumber++) {
  let media = "", line = lines[lineNumber];
  if (!line.startsWith("m=")) continue;
  for (let m of mediaSet)
   if (line.startsWith(`m=${m}`)) {
    media = m, mediaSet.delete(media);
    break;
   }
  if (!media) continue;
  let bLine = `b=AS:${bitrate[media]}`;
  while (lineNumber++, lineNumber < lines.length) {
   if (line = lines[lineNumber], line.startsWith("i=") || line.startsWith("c=")) continue;
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
var clarity_boost_default = "#version 300 es\n\nin vec4 position;\n\nvoid main() {\ngl_Position = position;\n}\n";
var clarity_boost_default2 = "#version 300 es\n\nprecision mediump float;\nuniform sampler2D data;\nuniform vec2 iResolution;\n\nconst int FILTER_UNSHARP_MASKING = 1;\n\nconst float CAS_CONTRAST_PEAK = 0.8 * -3.0 + 8.0;\n\nconst vec3 LUMINOSITY_FACTOR = vec3(0.2126, 0.7152, 0.0722);\n\nuniform int filterId;\nuniform float sharpenFactor;\nuniform float brightness;\nuniform float contrast;\nuniform float saturation;\n\nout vec4 fragColor;\n\nvec3 clarityBoost(sampler2D tex, vec2 coord, vec3 e) {\nvec2 texelSize = 1.0 / iResolution.xy;\n\nvec3 a = texture(tex, coord + texelSize * vec2(-1, 1)).rgb;\nvec3 b = texture(tex, coord + texelSize * vec2(0, 1)).rgb;\nvec3 c = texture(tex, coord + texelSize * vec2(1, 1)).rgb;\n\nvec3 d = texture(tex, coord + texelSize * vec2(-1, 0)).rgb;\nvec3 f = texture(tex, coord + texelSize * vec2(1, 0)).rgb;\n\nvec3 g = texture(tex, coord + texelSize * vec2(-1, -1)).rgb;\nvec3 h = texture(tex, coord + texelSize * vec2(0, -1)).rgb;\nvec3 i = texture(tex, coord + texelSize * vec2(1, -1)).rgb;\n\nif (filterId == FILTER_UNSHARP_MASKING) {\nvec3 gaussianBlur = (a + c + g + i) * 1.0 + (b + d + f + h) * 2.0 + e * 4.0;\ngaussianBlur /= 16.0;\n\nreturn e + (e - gaussianBlur) * sharpenFactor / 3.0;\n}\n\nvec3 minRgb = min(min(min(d, e), min(f, b)), h);\nminRgb += min(min(a, c), min(g, i));\n\nvec3 maxRgb = max(max(max(d, e), max(f, b)), h);\nmaxRgb += max(max(a, c), max(g, i));\n\nvec3 reciprocalMaxRgb = 1.0 / maxRgb;\nvec3 amplifyRgb = clamp(min(minRgb, 2.0 - maxRgb) * reciprocalMaxRgb, 0.0, 1.0);\n\namplifyRgb = inversesqrt(amplifyRgb);\n\nvec3 weightRgb = -(1.0 / (amplifyRgb * CAS_CONTRAST_PEAK));\nvec3 reciprocalWeightRgb = 1.0 / (4.0 * weightRgb + 1.0);\n\nvec3 window = b + d + f + h;\nvec3 outColor = clamp((window * weightRgb + e) * reciprocalWeightRgb, 0.0, 1.0);\n\nreturn mix(e, outColor, sharpenFactor / 2.0);\n}\n\nvoid main() {\nvec2 uv = gl_FragCoord.xy / iResolution.xy;\nvec3 color = texture(data, uv).rgb;\n\ncolor = sharpenFactor > 0.0 ? clarityBoost(data, uv, color) : color;\n\ncolor = saturation != 1.0 ? mix(vec3(dot(color, LUMINOSITY_FACTOR)), color, saturation) : color;\n\ncolor = contrast * (color - 0.5) + 0.5;\n\ncolor = brightness * color;\n\nfragColor = vec4(color, 1.0);\n}\n";
class WebGL2Player {
 LOG_TAG = "WebGL2Player";
 $video;
 $canvas;
 gl = null;
 resources = [];
 program = null;
 stopped = !1;
 options = {
  filterId: 1,
  sharpenFactor: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0
 };
 targetFps = 60;
 frameInterval = 0;
 lastFrameTime = 0;
 animFrameId = null;
 constructor($video) {
  BxLogger.info(this.LOG_TAG, "Initialize"), this.$video = $video;
  let $canvas = document.createElement("canvas");
  $canvas.width = $video.videoWidth, $canvas.height = $video.videoHeight, this.$canvas = $canvas, this.setupShaders(), this.setupRendering(), $video.insertAdjacentElement("afterend", $canvas);
 }
 setFilter(filterId, update = !0) {
  this.options.filterId = filterId, update && this.updateCanvas();
 }
 setSharpness(sharpness, update = !0) {
  this.options.sharpenFactor = sharpness, update && this.updateCanvas();
 }
 setBrightness(brightness, update = !0) {
  this.options.brightness = 1 + (brightness - 100) / 100, update && this.updateCanvas();
 }
 setContrast(contrast, update = !0) {
  this.options.contrast = 1 + (contrast - 100) / 100, update && this.updateCanvas();
 }
 setSaturation(saturation, update = !0) {
  this.options.saturation = 1 + (saturation - 100) / 100, update && this.updateCanvas();
 }
 setTargetFps(target) {
  this.targetFps = target, this.lastFrameTime = 0, this.frameInterval = target ? Math.floor(1000 / target) : 0;
 }
 getCanvas() {
  return this.$canvas;
 }
 updateCanvas() {
  let gl = this.gl, program = this.program;
  gl.uniform2f(gl.getUniformLocation(program, "iResolution"), this.$canvas.width, this.$canvas.height), gl.uniform1i(gl.getUniformLocation(program, "filterId"), this.options.filterId), gl.uniform1f(gl.getUniformLocation(program, "sharpenFactor"), this.options.sharpenFactor), gl.uniform1f(gl.getUniformLocation(program, "brightness"), this.options.brightness), gl.uniform1f(gl.getUniformLocation(program, "contrast"), this.options.contrast), gl.uniform1f(gl.getUniformLocation(program, "saturation"), this.options.saturation);
 }
 drawFrame(force = !1) {
  if (!force) {
   if (this.targetFps === 0) return;
   if (this.targetFps < 60) {
    let currentTime = performance.now();
    if (currentTime - this.lastFrameTime < this.frameInterval) return;
    this.lastFrameTime = currentTime;
   }
  }
  let gl = this.gl;
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.$video), gl.drawArrays(gl.TRIANGLES, 0, 6);
 }
 setupRendering() {
  let animate;
  if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
   let $video = this.$video;
   animate = () => {
    if (!this.stopped) this.drawFrame(), this.animFrameId = $video.requestVideoFrameCallback(animate);
   }, this.animFrameId = $video.requestVideoFrameCallback(animate);
  } else animate = () => {
    if (!this.stopped) this.drawFrame(), this.animFrameId = requestAnimationFrame(animate);
   }, this.animFrameId = requestAnimationFrame(animate);
 }
 setupShaders() {
  BxLogger.info(this.LOG_TAG, "Setting up", getPref("video_power_preference"));
  let gl = this.$canvas.getContext("webgl2", {
   isBx: !0,
   antialias: !0,
   alpha: !1,
   powerPreference: getPref("video_power_preference")
  });
  this.gl = gl, gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferWidth);
  let vShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vShader, clarity_boost_default), gl.compileShader(vShader);
  let fShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fShader, clarity_boost_default2), gl.compileShader(fShader);
  let program = gl.createProgram();
  if (this.program = program, gl.attachShader(program, vShader), gl.attachShader(program, fShader), gl.linkProgram(program), gl.useProgram(program), !gl.getProgramParameter(program, gl.LINK_STATUS)) console.error(`Link failed: ${gl.getProgramInfoLog(program)}`), console.error(`vs info-log: ${gl.getShaderInfoLog(vShader)}`), console.error(`fs info-log: ${gl.getShaderInfoLog(fShader)}`);
  this.updateCanvas();
  let buffer = gl.createBuffer();
  this.resources.push(buffer), gl.bindBuffer(gl.ARRAY_BUFFER, buffer), gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW), gl.enableVertexAttribArray(0), gl.vertexAttribPointer(0, 2, gl.FLOAT, !1, 0, 0);
  let texture = gl.createTexture();
  this.resources.push(texture), gl.bindTexture(gl.TEXTURE_2D, texture), gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !0), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR), gl.uniform1i(gl.getUniformLocation(program, "data"), 0), gl.activeTexture(gl.TEXTURE0);
 }
 resume() {
  this.stop(), this.stopped = !1, BxLogger.info(this.LOG_TAG, "Resume"), this.$canvas.classList.remove("bx-gone"), this.setupRendering();
 }
 stop() {
  if (BxLogger.info(this.LOG_TAG, "Stop"), this.$canvas.classList.add("bx-gone"), this.stopped = !0, this.animFrameId) {
   if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) this.$video.cancelVideoFrameCallback(this.animFrameId);
   else cancelAnimationFrame(this.animFrameId);
   this.animFrameId = null;
  }
 }
 destroy() {
  BxLogger.info(this.LOG_TAG, "Destroy"), this.stop();
  let gl = this.gl;
  if (gl) {
   gl.getExtension("WEBGL_lose_context")?.loseContext(), gl.useProgram(null);
   for (let resource of this.resources)
    if (resource instanceof WebGLProgram) gl.deleteProgram(resource);
    else if (resource instanceof WebGLShader) gl.deleteShader(resource);
    else if (resource instanceof WebGLTexture) gl.deleteTexture(resource);
    else if (resource instanceof WebGLBuffer) gl.deleteBuffer(resource);
   this.gl = null;
  }
  if (this.$canvas.isConnected) this.$canvas.parentElement?.removeChild(this.$canvas);
  this.$canvas.width = 1, this.$canvas.height = 1;
 }
}
class StreamPlayer {
 $video;
 playerType = "default";
 options = {};
 webGL2Player = null;
 $videoCss = null;
 $usmMatrix = null;
 constructor($video, type, options) {
  this.setupVideoElements(), this.$video = $video, this.options = options || {}, this.setPlayerType(type);
 }
 setupVideoElements() {
  if (this.$videoCss = document.getElementById("bx-video-css"), this.$videoCss) {
   this.$usmMatrix = this.$videoCss.querySelector("#bx-filter-usm-matrix");
   return;
  }
  let $fragment = document.createDocumentFragment();
  this.$videoCss = CE("style", { id: "bx-video-css" }), $fragment.appendChild(this.$videoCss);
  let $svg = CE("svg", {
   id: "bx-video-filters",
   xmlns: "http://www.w3.org/2000/svg",
   class: "bx-gone"
  }, CE("defs", { xmlns: "http://www.w3.org/2000/svg" }, CE("filter", {
   id: "bx-filter-usm",
   xmlns: "http://www.w3.org/2000/svg"
  }, this.$usmMatrix = CE("feConvolveMatrix", {
   id: "bx-filter-usm-matrix",
   order: "3",
   xmlns: "http://www.w3.org/2000/svg"
  }))));
  $fragment.appendChild($svg), document.documentElement.appendChild($fragment);
 }
 getVideoPlayerFilterStyle() {
  let filters = [], sharpness = this.options.sharpness || 0;
  if (this.options.processing === "usm" && sharpness != 0) {
   let matrix = `0 -1 0 -1 ${(7 - (sharpness / 2 - 1) * 0.5).toFixed(1)} -1 0 -1 0`;
   this.$usmMatrix?.setAttributeNS(null, "kernelMatrix", matrix), filters.push("url(#bx-filter-usm)");
  }
  let saturation = this.options.saturation || 100;
  if (saturation != 100) filters.push(`saturate(${saturation}%)`);
  let contrast = this.options.contrast || 100;
  if (contrast != 100) filters.push(`contrast(${contrast}%)`);
  let brightness = this.options.brightness || 100;
  if (brightness != 100) filters.push(`brightness(${brightness}%)`);
  return filters.join(" ");
 }
 resizePlayer() {
  let PREF_RATIO = getPref("video_ratio"), $video = this.$video, isNativeTouchGame = STATES.currentStream.titleInfo?.details.hasNativeTouchSupport, $webGL2Canvas;
  if (this.playerType == "webgl2") $webGL2Canvas = this.webGL2Player?.getCanvas();
  let targetWidth, targetHeight, targetObjectFit;
  if (PREF_RATIO.includes(":")) {
   let tmp = PREF_RATIO.split(":"), videoRatio = parseFloat(tmp[0]) / parseFloat(tmp[1]), width = 0, height = 0, parentRect = $video.parentElement.getBoundingClientRect();
   if (parentRect.width / parentRect.height > videoRatio) height = parentRect.height, width = height * videoRatio;
   else width = parentRect.width, height = width / videoRatio;
   width = Math.ceil(Math.min(parentRect.width, width)), height = Math.ceil(Math.min(parentRect.height, height)), $video.dataset.width = width.toString(), $video.dataset.height = height.toString(), targetWidth = `${width}px`, targetHeight = `${height}px`, targetObjectFit = PREF_RATIO === "16:9" ? "contain" : "fill";
  } else targetWidth = "100%", targetHeight = "100%", targetObjectFit = PREF_RATIO, $video.dataset.width = window.innerWidth.toString(), $video.dataset.height = window.innerHeight.toString();
  if ($video.style.width = targetWidth, $video.style.height = targetHeight, $video.style.objectFit = targetObjectFit, $webGL2Canvas) $webGL2Canvas.style.width = targetWidth, $webGL2Canvas.style.height = targetHeight, $webGL2Canvas.style.objectFit = targetObjectFit;
  if (isNativeTouchGame && this.playerType == "webgl2") window.BX_EXPOSED.streamSession.updateDimensions();
 }
 setPlayerType(type, refreshPlayer = !1) {
  if (this.playerType !== type) {
   let videoClass = BX_FLAGS.DeviceInfo.deviceType === "android-tv" ? "bx-pixel" : "bx-gone";
   if (type === "webgl2") {
    if (!this.webGL2Player) this.webGL2Player = new WebGL2Player(this.$video);
    else this.webGL2Player.resume();
    this.$videoCss.textContent = "", this.$video.classList.add(videoClass);
   } else this.webGL2Player?.stop(), this.$video.classList.remove(videoClass);
  }
  this.playerType = type, refreshPlayer && this.refreshPlayer();
 }
 setOptions(options, refreshPlayer = !1) {
  this.options = options, refreshPlayer && this.refreshPlayer();
 }
 updateOptions(options, refreshPlayer = !1) {
  this.options = Object.assign(this.options, options), refreshPlayer && this.refreshPlayer();
 }
 getPlayerElement(playerType) {
  if (typeof playerType === "undefined") playerType = this.playerType;
  if (playerType === "webgl2") return this.webGL2Player?.getCanvas();
  return this.$video;
 }
 getWebGL2Player() {
  return this.webGL2Player;
 }
 refreshPlayer() {
  if (this.playerType === "webgl2") {
   let options = this.options, webGL2Player = this.webGL2Player;
   if (options.processing === "usm") webGL2Player.setFilter(1);
   else webGL2Player.setFilter(2);
   webGL2Player.setSharpness(options.sharpness || 0), webGL2Player.setSaturation(options.saturation || 100), webGL2Player.setContrast(options.contrast || 100), webGL2Player.setBrightness(options.brightness || 100);
  } else {
   let filters = this.getVideoPlayerFilterStyle(), videoCss = "";
   if (filters) videoCss += `filter: ${filters} !important;`;
   let css = "";
   if (videoCss) css = `#game-stream video { ${videoCss} }`;
   this.$videoCss.textContent = css;
  }
  this.resizePlayer();
 }
 reloadPlayer() {
  this.cleanUpWebGL2Player(), this.playerType = "default", this.setPlayerType("webgl2", !1);
 }
 cleanUpWebGL2Player() {
  this.webGL2Player?.destroy(), this.webGL2Player = null;
 }
 destroy() {
  this.cleanUpWebGL2Player();
 }
}
function patchVideoApi() {
 let PREF_SKIP_SPLASH_VIDEO = getPref("skip_splash_video"), showFunc = function() {
  if (this.style.visibility = "visible", !this.videoWidth) return;
  let playerOptions = {
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
   if (PREF_SKIP_SPLASH_VIDEO) return this.volume = 0, this.style.display = "none", this.dispatchEvent(new Event("ended")), new Promise(() => {});
   return nativePlay.apply(this);
  }
  let $parent = this.parentElement;
  if (!this.src && $parent.dataset.testid === "media-container") this.addEventListener("loadedmetadata", showFunc, { once: !0 });
  return nativePlay.apply(this);
 };
}
function patchRtcCodecs() {
 if (getPref("stream_codec_profile") === "default") return;
 if (typeof RTCRtpTransceiver === "undefined" || !("setCodecPreferences" in RTCRtpTransceiver.prototype)) return !1;
}
function patchRtcPeerConnection() {
 let nativeCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
 RTCPeerConnection.prototype.createDataChannel = function() {
  let dataChannel = nativeCreateDataChannel.apply(this, arguments);
  return BxEvent.dispatch(window, BxEvent.DATA_CHANNEL_CREATED, {
   dataChannel
  }), dataChannel;
 };
 let maxVideoBitrate = getPref("bitrate_video_max"), codec = getPref("stream_codec_profile");
 if (codec !== "default" || maxVideoBitrate > 0) {
  let nativeSetLocalDescription = RTCPeerConnection.prototype.setLocalDescription;
  RTCPeerConnection.prototype.setLocalDescription = function(description) {
   if (codec !== "default") arguments[0].sdp = setCodecPreferences(arguments[0].sdp, codec);
   try {
    if (maxVideoBitrate > 0 && description) arguments[0].sdp = patchSdpBitrate(arguments[0].sdp, Math.round(maxVideoBitrate / 1000));
   } catch (e) {
    BxLogger.error("setLocalDescription", e);
   }
   return nativeSetLocalDescription.apply(this, arguments);
  };
 }
 let OrgRTCPeerConnection = window.RTCPeerConnection;
 window.RTCPeerConnection = function() {
  let conn = new OrgRTCPeerConnection;
  return STATES.currentStream.peerConnection = conn, conn.addEventListener("connectionstatechange", (e) => {
   BxLogger.info("connectionstatechange", conn.connectionState);
  }), conn;
 };
}
function patchAudioContext() {
 let OrgAudioContext = window.AudioContext, nativeCreateGain = OrgAudioContext.prototype.createGain;
 window.AudioContext = function(options) {
  if (options && options.latencyHint) options.latencyHint = 0;
  let ctx = new OrgAudioContext(options);
  return BxLogger.info("patchAudioContext", ctx, options), ctx.createGain = function() {
   let gainNode = nativeCreateGain.apply(this);
   return gainNode.gain.value = getPref("audio_volume") / 100, STATES.currentStream.audioGainNode = gainNode, gainNode;
  }, STATES.currentStream.audioContext = ctx, ctx;
 };
}
function patchMeControl() {
 let overrideConfigs = {
  enableAADTelemetry: !1,
  enableTelemetry: !1,
  telEvs: "",
  oneDSUrl: ""
 }, MSA = {
  MeControl: {
   API: {
    setDisplayMode: () => {},
    setMobileState: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
   }
  }
 }, MeControl = {}, MsaHandler = {
  get(target, prop, receiver) {
   return target[prop];
  },
  set(obj, prop, value) {
   if (prop === "MeControl" && value.Config) value.Config = Object.assign(value.Config, overrideConfigs);
   return obj[prop] = value, !0;
  }
 }, MeControlHandler = {
  get(target, prop, receiver) {
   return target[prop];
  },
  set(obj, prop, value) {
   if (prop === "Config") value = Object.assign(value, overrideConfigs);
   return obj[prop] = value, !0;
  }
 };
 window.MSA = new Proxy(MSA, MsaHandler), window.MeControl = new Proxy(MeControl, MeControlHandler);
}
function disableAdobeAudienceManager() {
 window.adobe = Object.freeze({});
}
function patchCanvasContext() {
 let nativeGetContext = HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
  if (contextType.includes("webgl")) {
   if (contextAttributes = contextAttributes || {}, !contextAttributes.isBx) {
    if (contextAttributes.antialias = !1, contextAttributes.powerPreference === "high-performance") contextAttributes.powerPreference = "low-power";
   }
  }
  return nativeGetContext.apply(this, [contextType, contextAttributes]);
 };
}
class ProductDetailsPage {
 static $btnShortcut = AppInterface && createButton({
  icon: BxIcon.CREATE_SHORTCUT,
  label: t("create-shortcut"),
  style: 32,
  tabIndex: 0,
  onClick: (e) => {
   AppInterface.createShortcut(window.location.pathname.substring(6));
  }
 });
 static $btnWallpaper = AppInterface && createButton({
  icon: BxIcon.DOWNLOAD,
  label: t("wallpaper"),
  style: 32,
  tabIndex: 0,
  onClick: (e) => {
   let details = parseDetailsPath(window.location.pathname);
   details && AppInterface.downloadWallpapers(details.titleSlug, details.productId);
  }
 });
 static injectTimeoutId = null;
 static injectButtons() {
  if (!AppInterface) return;
  ProductDetailsPage.injectTimeoutId && clearTimeout(ProductDetailsPage.injectTimeoutId), ProductDetailsPage.injectTimeoutId = window.setTimeout(() => {
   let $container = document.querySelector("div[class*=ActionButtons-module__container]");
   if ($container && $container.parentElement) $container.parentElement.appendChild(CE("div", {
     class: "bx-product-details-buttons"
    }, BX_FLAGS.DeviceInfo.deviceType === "android" && ProductDetailsPage.$btnShortcut, ProductDetailsPage.$btnWallpaper));
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
  if (!$btnOrg) return null;
  let $container = $btnOrg.cloneNode(!0), timeout;
  if (STATES.browser.capabilities.touch) {
   let onTransitionStart = (e) => {
    if (e.propertyName !== "opacity") return;
    timeout && clearTimeout(timeout), e.target.style.pointerEvents = "none";
   }, onTransitionEnd = (e) => {
    if (e.propertyName !== "opacity") return;
    let $streamHud = e.target.closest("#StreamHud");
    if (!$streamHud) return;
    if ($streamHud.style.left === "0px") {
     let $target = e.target;
     timeout && clearTimeout(timeout), timeout = window.setTimeout(() => {
      $target.style.pointerEvents = "auto";
     }, 100);
    }
   };
   $container.addEventListener("transitionstart", onTransitionStart), $container.addEventListener("transitionend", onTransitionEnd);
  }
  let $button = $container.querySelector("button");
  if (!$button) return null;
  $button.setAttribute("title", label);
  let $orgSvg = $button.querySelector("svg");
  if (!$orgSvg) return null;
  let $svg = createSvgIcon(svgIcon);
  return $svg.style.fill = "none", $svg.setAttribute("class", $orgSvg.getAttribute("class") || ""), $svg.ariaHidden = "true", $orgSvg.replaceWith($svg), $container;
 }
 static cloneCloseButton($btnOrg, icon, className, onChange) {
  if (!$btnOrg) return null;
  let $btn = $btnOrg.cloneNode(!0), $svg = createSvgIcon(icon);
  return $svg.setAttribute("class", $btn.firstElementChild.getAttribute("class") || ""), $svg.style.fill = "none", $btn.classList.add(className), $btn.removeChild($btn.firstElementChild), $btn.appendChild($svg), $btn.addEventListener("click", onChange), $btn;
 }
 static async handleStreamMenu() {
  let $btnCloseHud = document.querySelector("button[class*=StreamMenu-module__backButton]");
  if (!$btnCloseHud) return;
  let { $btnRefresh, $btnHome } = StreamUiHandler;
  if (typeof $btnRefresh === "undefined") $btnRefresh = StreamUiHandler.cloneCloseButton($btnCloseHud, BxIcon.REFRESH, "bx-stream-refresh-button", () => {
    confirm(t("confirm-reload-stream")) && window.location.reload();
   });
  if (typeof $btnHome === "undefined") $btnHome = StreamUiHandler.cloneCloseButton($btnCloseHud, BxIcon.HOME, "bx-stream-home-button", () => {
    confirm(t("back-to-home-confirm")) && (window.location.href = window.location.href.substring(0, 31));
   });
  if ($btnRefresh && $btnHome) $btnCloseHud.insertAdjacentElement("afterend", $btnRefresh), $btnRefresh.insertAdjacentElement("afterend", $btnHome);
  document.querySelector("div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module]")?.appendChild(await StreamBadges.getInstance().render());
 }
 static handleSystemMenu($streamHud) {
  let $orgButton = $streamHud.querySelector("div[class^=HUDButton]");
  if (!$orgButton) return;
  let hideGripHandle = () => {
   let $gripHandle = document.querySelector("#StreamHud button[class^=GripHandle]");
   if ($gripHandle && $gripHandle.ariaExpanded === "true") $gripHandle.dispatchEvent(new PointerEvent("pointerdown")), $gripHandle.click(), $gripHandle.dispatchEvent(new PointerEvent("pointerdown")), $gripHandle.click();
  }, $btnStreamSettings = StreamUiHandler.$btnStreamSettings;
  if (typeof $btnStreamSettings === "undefined") $btnStreamSettings = StreamUiHandler.cloneStreamHudButton($orgButton, t("better-xcloud"), BxIcon.BETTER_XCLOUD), $btnStreamSettings?.addEventListener("click", (e) => {
    hideGripHandle(), e.preventDefault(), SettingsNavigationDialog.getInstance().show();
   }), StreamUiHandler.$btnStreamSettings = $btnStreamSettings;
  let streamStats = StreamStats.getInstance(), $btnStreamStats = StreamUiHandler.$btnStreamStats;
  if (typeof $btnStreamStats === "undefined") $btnStreamStats = StreamUiHandler.cloneStreamHudButton($orgButton, t("stream-stats"), BxIcon.STREAM_STATS), $btnStreamStats?.addEventListener("click", async (e) => {
    hideGripHandle(), e.preventDefault(), await streamStats.toggle();
    let btnStreamStatsOn = !streamStats.isHidden() && !streamStats.isGlancing();
    $btnStreamStats.classList.toggle("bx-stream-menu-button-on", btnStreamStatsOn);
   }), StreamUiHandler.$btnStreamStats = $btnStreamStats;
  let $btnParent = $orgButton.parentElement;
  if ($btnStreamSettings && $btnStreamStats) {
   let btnStreamStatsOn = !streamStats.isHidden() && !streamStats.isGlancing();
   $btnStreamStats.classList.toggle("bx-stream-menu-button-on", btnStreamStatsOn), $btnParent.insertBefore($btnStreamStats, $btnParent.lastElementChild), $btnParent.insertBefore($btnStreamSettings, $btnStreamStats);
  }
  let $dotsButton = $btnParent.lastElementChild;
  $dotsButton.parentElement.insertBefore($dotsButton, $dotsButton.parentElement.firstElementChild);
 }
 static reset() {
  StreamUiHandler.$btnStreamSettings = void 0, StreamUiHandler.$btnStreamStats = void 0, StreamUiHandler.$btnRefresh = void 0, StreamUiHandler.$btnHome = void 0, StreamUiHandler.observer && StreamUiHandler.observer.disconnect(), StreamUiHandler.observer = void 0;
 }
 static observe() {
  StreamUiHandler.reset();
  let $screen = document.querySelector("#PageContent section[class*=PureScreens]");
  if (!$screen) return;
  let observer = new MutationObserver((mutationList) => {
   let item;
   for (item of mutationList) {
    if (item.type !== "childList") continue;
    item.addedNodes.forEach(async ($node) => {
     if (!$node || $node.nodeType !== Node.ELEMENT_NODE) return;
     let $elm = $node;
     if (!($elm instanceof HTMLElement)) return;
     let className = $elm.className || "";
     if (className.includes("PureErrorPage")) {
      BxEvent.dispatch(window, BxEvent.STREAM_ERROR_PAGE);
      return;
     }
     if (className.startsWith("StreamMenu-module__container")) {
      StreamUiHandler.handleStreamMenu();
      return;
     }
     if (className.startsWith("Overlay-module_") || className.startsWith("InProgressScreen")) $elm = $elm.querySelector("#StreamHud");
     if (!$elm || ($elm.id || "") !== "StreamHud") return;
     StreamUiHandler.handleSystemMenu($elm);
    });
   }
  });
  observer.observe($screen, { subtree: !0, childList: !0 }), StreamUiHandler.observer = observer;
 }
}
class XboxApi {
 static CACHED_TITLES = {};
 static async getProductTitle(xboxTitleId) {
  if (xboxTitleId = xboxTitleId.toString(), XboxApi.CACHED_TITLES[xboxTitleId]) return XboxApi.CACHED_TITLES[xboxTitleId];
  try {
   let url = `https://displaycatalog.mp.microsoft.com/v7.0/products/lookup?market=US&languages=en&value=${xboxTitleId}&alternateId=XboxTitleId&fieldsTemplate=browse`, productTitle = (await (await NATIVE_FETCH(url)).json()).Products[0].LocalizedProperties[0].ProductTitle;
   return XboxApi.CACHED_TITLES[xboxTitleId] = productTitle, productTitle;
  } catch (e) {}
  return null;
 }
}
class RootDialogObserver {
 static $btnShortcut = AppInterface && createButton({
  icon: BxIcon.CREATE_SHORTCUT,
  label: t("create-shortcut"),
  style: 32 | 4 | 64 | 1024 | 2048,
  tabIndex: 0,
  onClick: (e) => {
   window.BX_EXPOSED.dialogRoutes?.closeAll();
   let $btn = e.target.closest("button");
   AppInterface.createShortcut($btn?.dataset.path);
  }
 });
 static $btnWallpaper = AppInterface && createButton({
  icon: BxIcon.DOWNLOAD,
  label: t("wallpaper"),
  style: 32 | 4 | 64 | 1024 | 2048,
  tabIndex: 0,
  onClick: (e) => {
   window.BX_EXPOSED.dialogRoutes?.closeAll();
   let $btn = e.target.closest("button"), details = parseDetailsPath($btn.dataset.path);
   details && AppInterface.downloadWallpapers(details.titleSlug, details.productId);
  }
 });
 static handleGameCardMenu($root) {
  let $detail = $root.querySelector('a[href^="/play/"]');
  if (!$detail) return;
  let path = $detail.getAttribute("href");
  RootDialogObserver.$btnShortcut.dataset.path = path, RootDialogObserver.$btnWallpaper.dataset.path = path, $root.append(RootDialogObserver.$btnShortcut, RootDialogObserver.$btnWallpaper);
 }
 static handleAddedElement($root, $addedElm) {
  if (AppInterface && $addedElm.className.startsWith("SlideSheet-module__container")) {
   let $gameCardMenu = $addedElm.querySelector("div[class^=MruContextMenu],div[class^=GameCardContextMenu]");
   if ($gameCardMenu) return RootDialogObserver.handleGameCardMenu($gameCardMenu), !0;
  } else if ($root.querySelector("div[class*=GuideDialog]")) return GuideMenu.getInstance().observe($addedElm), !0;
  return !1;
 }
 static observe($root) {
  let beingShown = !1;
  new MutationObserver((mutationList) => {
   for (let mutation of mutationList) {
    if (mutation.type !== "childList") continue;
    if (BX_FLAGS.Debug && BxLogger.warning("RootDialog", "added", mutation.addedNodes), mutation.addedNodes.length === 1) {
     let $addedElm = mutation.addedNodes[0];
     if ($addedElm instanceof HTMLElement && $addedElm.className) RootDialogObserver.handleAddedElement($root, $addedElm);
    }
    let shown = !!($root.firstElementChild && $root.firstElementChild.childElementCount > 0);
    if (shown !== beingShown) beingShown = shown, BxEvent.dispatch(window, shown ? BxEvent.XCLOUD_DIALOG_SHOWN : BxEvent.XCLOUD_DIALOG_DISMISSED);
   }
  }).observe($root, { subtree: !0, childList: !0 });
 }
 static waitForRootDialog() {
  let observer = new MutationObserver((mutationList) => {
   for (let mutation of mutationList) {
    if (mutation.type !== "childList") continue;
    let $target = mutation.target;
    if ($target.id && $target.id === "gamepass-dialog-root") {
     observer.disconnect(), RootDialogObserver.observe($target);
     break;
    }
   }
  });
  observer.observe(document.documentElement, { subtree: !0, childList: !0 });
 }
}
if (window.location.pathname.includes("/auth/msa")) {
 let nativePushState = window.history.pushState;
 throw window.history.pushState = function(...args) {
  let url = args[2];
  if (url && (url.startsWith("/play") || url.substring(6).startsWith("/play"))) {
   console.log("Redirecting to xbox.com/play"), window.stop(), window.location.href = "https://www.xbox.com" + url;
   return;
  }
  return nativePushState.apply(this, arguments);
 }, new Error("[Better xCloud] Refreshing the page after logging in");
}
BxLogger.info("readyState", document.readyState);
window.addEventListener("load", (e) => {
 window.setTimeout(() => {
  if (document.body.classList.contains("legacyBackground")) window.stop(), window.location.reload(!0);
 }, 3000);
});
document.addEventListener("readystatechange", (e) => {
 if (document.readyState !== "interactive") return;
 if (STATES.isSignedIn = !!window.xbcUser?.isSignedIn, STATES.isSignedIn) getPref("xhome_enabled") && RemotePlayManager.getInstance().initialize();
 else window.setTimeout(HeaderSection.watchHeader, 2000);
 if (getPref("ui_hide_sections").includes("friends")) {
  let $parent = document.querySelector("div[class*=PlayWithFriendsSkeleton]")?.closest("div[class*=HomePage-module]");
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
 if (STATES.supportedRegion = !1, window.setTimeout(HeaderSection.watchHeader, 2000), document.querySelector("div[class^=UnsupportedMarketPage-module__container]")) SettingsNavigationDialog.getInstance().show();
}, { once: !0 });
window.addEventListener(BxEvent.XCLOUD_SERVERS_READY, (e) => {
 STATES.isSignedIn = !0, window.setTimeout(HeaderSection.watchHeader, 2000);
});
window.addEventListener(BxEvent.STREAM_LOADING, (e) => {
 if (window.location.pathname.includes("/launch/") && STATES.currentStream.titleInfo) STATES.currentStream.titleSlug = productTitleToSlug(STATES.currentStream.titleInfo.product.title);
 else STATES.currentStream.titleSlug = "remote-play";
});
getPref("ui_loading_screen_game_art") && window.addEventListener(BxEvent.TITLE_INFO_READY, LoadingScreen.setup);
window.addEventListener(BxEvent.STREAM_STARTING, (e) => {
 if (LoadingScreen.hide(), !getPref("mkb_enabled") && getPref("mkb_hide_idle_cursor")) MouseCursorHider.start(), MouseCursorHider.hide();
});
window.addEventListener(BxEvent.STREAM_PLAYING, (e) => {
 STATES.isPlaying = !0, StreamUiHandler.observe(), updateVideoPlayer();
});
window.addEventListener(BxEvent.STREAM_ERROR_PAGE, (e) => {
 BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});
window.addEventListener(BxEvent.XCLOUD_RENDERING_COMPONENT, (e) => {
 if (e.component === "product-details") ProductDetailsPage.injectButtons();
});
window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, (e) => {
 let dataChannel = e.dataChannel;
 if (!dataChannel || dataChannel.label !== "message") return;
 dataChannel.addEventListener("message", async (msg) => {
  if (msg.origin === "better-xcloud" || typeof msg.data !== "string") return;
  if (msg.data.includes("/titleinfo")) {
   let json = JSON.parse(JSON.parse(msg.data).content), xboxTitleId = parseInt(json.titleid, 16);
   if (STATES.currentStream.xboxTitleId = xboxTitleId, STATES.remotePlay.isPlaying) {
    if (STATES.currentStream.titleSlug = "remote-play", json.focused) {
     let productTitle = await XboxApi.getProductTitle(xboxTitleId);
     if (productTitle) STATES.currentStream.titleSlug = productTitleToSlug(productTitle);
    }
   }
  }
 });
});
function unload() {
 if (!STATES.isPlaying) return;
 STATES.currentStream.streamPlayer?.destroy(), STATES.isPlaying = !1, STATES.currentStream = {}, window.BX_EXPOSED.shouldShowSensorControls = !1, window.BX_EXPOSED.stopTakRendering = !1, NavigationDialogManager.getInstance().hide(), StreamStats.getInstance().destroy(), StreamBadges.getInstance().destroy();
}
window.addEventListener(BxEvent.STREAM_STOPPED, unload);
window.addEventListener("pagehide", (e) => {
 BxEvent.dispatch(window, BxEvent.STREAM_STOPPED);
});
function main() {
 if (getPref("game_msfs2020_force_native_mkb")) BX_FLAGS.ForceNativeMkbTitles.push("9PMQDM08SNK9");
 if (patchRtcPeerConnection(), patchRtcCodecs(), interceptHttpRequests(), patchVideoApi(), patchCanvasContext(), getPref("audio_enable_volume_control") && patchAudioContext(), getPref("block_tracking")) patchMeControl(), disableAdobeAudienceManager();
 if (RootDialogObserver.waitForRootDialog(), addCss(), GuideMenu.getInstance().addEventListeners(), StreamStatsCollector.setupEvents(), StreamBadges.setupEvents(), StreamStats.setupEvents(), getPref("controller_show_connection_status")) window.addEventListener("gamepadconnected", (e) => showGamepadToast(e.gamepad)), window.addEventListener("gamepaddisconnected", (e) => showGamepadToast(e.gamepad));
}
main();
