import { CE, Icon } from "./html";
import { PrefKey, getPref } from "../modules/preferences";


export function addCss() {
    let css = `
:root {
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
    --bx-reload-button-z-index: 9200;
    --bx-dialog-z-index: 9101;
    --bx-dialog-overlay-z-index: 9100;
    --bx-remote-play-popup-z-index: 9090;
    --bx-stats-bar-z-index: 9001;
    --bx-stream-settings-z-index: 9000;
    --bx-mkb-pointer-lock-msg-z-index: 8999;
    --bx-screenshot-z-index: 8888;
    --bx-touch-controller-bar-z-index: 5555;
    --bx-wait-time-box-z-index: 100;
}

@font-face {
    font-family: 'promptfont';
    src: url('https://redphx.github.io/better-xcloud/fonts/promptfont.otf');
}

/* Fix Stream menu buttons not hiding */
div[class^=HUDButton-module__hiddenContainer] ~ div:not([class^=HUDButton-module__hiddenContainer]) {
    opacity: 0;
    pointer-events: none !important;
    position: absolute;
    top: -9999px;
    left: -9999px;
}

/* Remove the "Cloud Gaming" text in header when the screen is too small */
@media screen and (max-width: 600px) {
    header a[href="/play"] {
        display: none;
    }
}

a.bx-button {
    display: inline-block;
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

.bx-button:hover, .bx-button.bx-focusable:focus {
    background-color: var(--bx-default-button-hover-color);
}

.bx-button:disabled {
    cursor: default;
    background-color: var(--bx-default-button-disabled-color);
}

.bx-button.bx-ghost {
    background-color: transparent;
}

.bx-button.bx-ghost:hover, .bx-button.bx-ghost.bx-focusable:focus {
    background-color: var(--bx-default-button-hover-color);
}

.bx-button.bx-primary {
    background-color: var(--bx-primary-button-color);
}

.bx-button.bx-primary:hover, .bx-button.bx-primary.bx-focusable:focus {
    background-color: var(--bx-primary-button-hover-color);
}

.bx-button.bx-primary:disabled {
    background-color: var(--bx-primary-button-disabled-color);
}

.bx-button.bx-danger {
    background-color: var(--bx-danger-button-color);
}

.bx-button.bx-danger:hover, .bx-button.bx-danger.bx-focusable:focus {
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
    height: calc(var(--bx-button-height) - 2px);
    line-height: var(--bx-button-height);
    vertical-align: middle;
    color: #fff;
    overflow: hidden;
    white-space: nowrap;
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
}

.bx-header-settings-button[data-update-available]::before {
    content: '🌟' !important;
    line-height: var(--bx-button-height);
    display: inline-block;
    margin-left: 4px;
}

.bx-button.bx-focusable, .bx-header-settings-button {
    position: relative;
}

.bx-button.bx-focusable::after {
    border: 2px solid transparent;
    border-radius: 4px;
}

.bx-button.bx-focusable:focus::after {
    content: '';
    border-color: white;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.bx-settings-reload-button-wrapper {
    z-index: var(--bx-reload-button-z-index);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    background: #000000cf;
    padding: 10px;
}

.bx-settings-reload-button-wrapper button {
    max-width: 450px;
    margin: 0 !important;
}

.bx-settings-container {
    background-color: #151515;
    user-select: none;
    -webkit-user-select: none;
    color: #fff;
    font-family: var(--bx-normal-font);
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

.bx-settings-group-label {
    font-weight: bold;
    display: block;
    font-size: 1.1rem;
}

@media (hover: hover) {
    .bx-settings-wrapper a.bx-settings-title:hover {
        color: #83f73a;
    }
}

.bx-settings-wrapper a.bx-settings-title:focus {
    color: #83f73a;
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

.bx-settings-row {
    display: flex;
    margin-bottom: 8px;
    padding: 2px 4px;
}

.bx-settings-row label {
    flex: 1;
    align-self: center;
    margin-bottom: 0;
    padding-left: 10px;
}

.bx-settings-group-label b, .bx-settings-row label b {
    display: block;
    font-size: 12px;
    font-style: italic;
    font-weight: normal;
    color: #828282;
}

.bx-settings-group-label b {
    margin-bottom: 8px;
}

@media not (hover: hover) {
    .bx-settings-row:focus-within {
       background-color: #242424;
    }
}

.bx-settings-row input {
    align-self: center;
    accent-color: var(--bx-primary-button-color);
}

.bx-settings-row select:disabled {
    -webkit-appearance: none;
    background: transparent;
    text-align-last: right;
    border: none;
    color: #fff;
}

.bx-settings-wrapper .bx-button.bx-primary {
    margin-top: 8px;
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

.bx-settings-custom-user-agent {
    display: block;
    width: 100%;
}

div[class*=StreamMenu-module__menuContainer] > div[class*=Menu-module] {
    overflow: visible;
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
    background-color: grey;
    display: inline-block;
    padding: 2px 8px;
    border-radius: 0 4px 4px 0;
}

.bx-badge-battery[data-charging=true] span:first-of-type::after {
    content: ' ⚡️';
}

.bx-screenshot-button {
    display: none;
    opacity: 0;
    position: fixed;
    bottom: 0;
    box-sizing: border-box;
    width: 60px;
    height: 90px;
    padding: 16px 16px 46px 16px;
    background-size: cover;
    background-repeat: no-repeat;
    background-origin: content-box;
    filter: drop-shadow(0 0 2px #000000B0);
    transition: opacity 0.1s ease-in-out 0s, padding 0.1s ease-in 0s;
    z-index: var(--bx-screenshot-z-index);

    /* Credit: https://phosphoricons.com */
    background-image: url(${Icon.SCREENSHOT_B64});
}

.bx-screenshot-button[data-showing=true] {
    opacity: 0.9;
}

.bx-screenshot-button[data-capturing=true] {
    padding: 8px 8px 38px 8px;
}

.bx-screenshot-canvas {
    display: none;
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

.bx-stats-bar > div {
    display: none;
    margin-right: 8px;
    border-right: 1px solid #fff;
    padding-right: 8px;
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
    filter: drop-shadow(1px 0 0 #000000f0) drop-shadow(-1px 0 0 #000000f0) drop-shadow(0 1px 0 #000000f0) drop-shadow(0 -1px 0 #000000f0);
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

.bx-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--bx-dialog-overlay-z-index);
    background: black;
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

@media screen and (max-width: 450px) {
    .bx-dialog {
        min-width: 100%;
    }
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
    color: white;
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

.bx-stats-settings-dialog > div > div {
    display: flex;
    margin-bottom: 8px;
    padding: 2px 4px;
}

.bx-stats-settings-dialog label {
    flex: 1;
    margin-bottom: 0;
    align-self: center;
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

.bx-quick-settings-row {
    display: flex;
    border-bottom: 1px solid #40404080;
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

.bx-quick-settings-tab-contents input[type="range"] {
    display: block;
    margin: 12px auto 2px;
    width: 180px;
    color: #959595 !important;
}

.bx-quick-settings-bar-note {
    display: block;
    text-align: center;
    font-size: 12px;
    font-weight: lighter;
    font-style: italic;
    padding-top: 16px;
}

.bx-toast {
    user-select: none;
    -webkit-user-select: none;
    position: fixed;
    left: 50%;
    top: 24px;
    transform: translate(-50%, 0);
    background: #000000;
    border-radius: 16px;
    color: white;
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

.bx-number-stepper span {
    display: inline-block;
    width: 40px;
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

.bx-number-stepper input[type=range]:disabled, .bx-number-stepper button:disabled {
    display: none;
}

.bx-number-stepper button:disabled + span {
    font-family: var(--bx-title-font);
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

.bx-quick-settings-row select:disabled {
    -webkit-appearance: none;
    background: transparent;
    text-align-last: right;
    border: none;
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
    background: #000000e5;
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
    color: white;
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


.bx-stream-menu-button-on {
    fill: #000 !important;
    background-color: #2d2d2d !important;
    color: #000 !important;
}

#bx-touch-controller-bar {
    display: none;
    opacity: 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 6vh;
    z-index: var(--bx-touch-controller-bar-z-index);
}

#bx-touch-controller-bar[data-showing=true] {
    display: block;
}

.bx-wait-time-box {
    position: fixed;
    top: 0;
    right: 0;
    background-color: #000000cc;
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

/* REMOTE PLAY */

.bx-container {
    width: 480px;
    margin: 0 auto;
}

#bxUi {
    margin-top: 14px;
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
    box-shadow: #00000080 0px 0px 12px 0px;
}

@media (min-width:480px) and (min-height:calc(480px + 1px)) {
  .bx-remote-play-container {
      right: calc(env(safe-area-inset-right, 0px) + 32px)
  }
}
@media (min-width:768px) and (min-height:calc(480px + 1px)) {
  .bx-remote-play-container {
      right: calc(env(safe-area-inset-right, 0px) + 48px)
  }
}
@media (min-width:1920px) and (min-height:calc(480px + 1px)) {
  .bx-remote-play-container {
      right: calc(env(safe-area-inset-right, 0px) + 80px)
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

/* ----------- */

/* Hide UI elements */
#headerArea, #uhfSkipToMain, .uhf-footer {
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
`;

    // Hide "Play with friends" section
    if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES)) {
        css += `
div[class^=HomePage-module__bottomSpacing]:has(button[class*=SocialEmptyCard]),
button[class*=SocialEmptyCard] {
    display: none;
}
`;
    }

    // Reduce animations
    if (getPref(PrefKey.REDUCE_ANIMATIONS)) {
        css += `
div[class*=GameCard-module__gameTitleInnerWrapper],
div[class*=GameCard-module__card],
div[class*=ScrollArrows-module] {
    transition: none !important;
}
`;
    }

    // Hide the top-left dots icon while playing
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

    // Simplify Stream's menu
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

    // Hide scrollbar
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

    const $style = CE('style', {}, css);
    document.documentElement.appendChild($style);
}
