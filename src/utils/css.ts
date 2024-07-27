import { CE } from "@utils/html";
import { compressCss, renderStylus } from "@macros/build" with {type: "macro"};
import { UiSection } from "@/enums/ui-sections";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "./settings-storages/global-settings-storage";


export function addCss() {
    const STYLUS_CSS = renderStylus();
    let css = STYLUS_CSS;

    const PREF_HIDE_SECTIONS = getPref(PrefKey.UI_HIDE_SECTIONS);
    const selectorToHide = [];

    // Hide "News" section
    if (PREF_HIDE_SECTIONS.includes(UiSection.NEWS)) {
        selectorToHide.push('#BodyContent > div[class*=CarouselRow-module]');
    }

    // Hide "All games" section
    if (PREF_HIDE_SECTIONS.includes(UiSection.ALL_GAMES)) {
        selectorToHide.push('#BodyContent div[class*=AllGamesRow-module__gridContainer]');
        selectorToHide.push('#BodyContent div[class*=AllGamesRow-module__rowHeader]');
    }

    // Hide "Most popular" section
    if (PREF_HIDE_SECTIONS.includes(UiSection.MOST_POPULAR)) {
        selectorToHide.push('#BodyContent div[class*=HomePage-module__bottomSpacing]:has(a[href="/play/gallery/popular"])');
    }

    // Hide "Play with touch" section
    if (PREF_HIDE_SECTIONS.includes(UiSection.TOUCH)) {
        selectorToHide.push('#BodyContent div[class*=HomePage-module__bottomSpacing]:has(a[href="/play/gallery/touch"])');
    }

   // Hide "Start a party" button in the Guide menu
    if (getPref(PrefKey.BLOCK_SOCIAL_FEATURES)) {
        selectorToHide.push('#gamepass-dialog-root div[class^=AchievementsPreview-module__container] + button[class*=HomeLandingPage-module__button]');
    }

    if (selectorToHide) {
        css += selectorToHide.join(',') + '{ display: none; }';
    }

    // Reduce animations
    if (getPref(PrefKey.REDUCE_ANIMATIONS)) {
        css += compressCss(`
div[class*=GameCard-module__gameTitleInnerWrapper],
div[class*=GameCard-module__card],
div[class*=ScrollArrows-module] {
    transition: none !important;
}
`);
    }

    // Hide the top-left dots icon while playing
    if (getPref(PrefKey.HIDE_DOTS_ICON)) {
        css += compressCss(`
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
`);
    }

    css += compressCss(`
div[class*=StreamMenu-module__menu] {
    min-width: 100vw !important;
}
`);

    // Simplify Stream's menu
    if (getPref(PrefKey.STREAM_SIMPLIFY_MENU)) {
        css += compressCss(`
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
`);
    } else {
        css += compressCss(`
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
`);
    }

    // Hide scrollbar
    if (getPref(PrefKey.UI_SCROLLBAR_HIDE)) {
        css += compressCss(`
html {
    scrollbar-width: none;
}

body::-webkit-scrollbar {
    display: none;
}
`);
    }

    const $style = CE('style', {}, css);
    document.documentElement.appendChild($style);
}


export function preloadFonts() {
    const $link = CE<HTMLLinkElement>('link', {
            rel: 'preload',
            href: 'https://redphx.github.io/better-xcloud/fonts/promptfont.otf',
            as: 'font',
            type: 'font/otf',
            crossorigin: '',
        });

    document.querySelector('head')?.appendChild($link);
}
