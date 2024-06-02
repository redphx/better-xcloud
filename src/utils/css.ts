import { CE } from "@utils/html";
import { PrefKey, getPref } from "@utils/preferences";
import { renderStylus } from "@macros/build" with {type: "macro"};


export function addCss() {
    let css = renderStylus();

    if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES)) {
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
    }

    if (getPref(PrefKey.BLOCK_TRACKING)) {
        css += `
/* Remove Feedback button in the Guide menu */
#gamepass-dialog-root #Home-panel button[class*=FeedbackButton] {
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

    css += `
div[class*=StreamMenu-module__menu] {
    min-width: 100vw !important;
}
`;

    // Simplify Stream's menu
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
