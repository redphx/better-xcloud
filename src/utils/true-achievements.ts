import { BxIcon } from "./bx-icon";
import { AppInterface, STATES } from "./global";
import { ButtonStyle, CE, clearDataSet, createButton, getReactProps } from "./html";
import { t } from "./translation";

export class TrueAchievements {
    private static $link = createButton({
        label: t('true-achievements'),
        url: '#',
        icon: BxIcon.TRUE_ACHIEVEMENTS,
        style: ButtonStyle.FOCUSABLE | ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH | ButtonStyle.NORMAL_LINK,
        onClick: TrueAchievements.onClick,
    }) as HTMLAnchorElement;

    static $button = createButton({
        label: t('true-achievements'),
        title: t('true-achievements'),
        icon: BxIcon.TRUE_ACHIEVEMENTS,
        style: ButtonStyle.FOCUSABLE,
        onClick: TrueAchievements.onClick,
    }) as HTMLAnchorElement;

    private static onClick(e: Event) {
        e.preventDefault();

        const dataset = TrueAchievements.$link.dataset;
        TrueAchievements.open(true, dataset.xboxTitleId, dataset.id);

        // Close all xCloud's dialogs
        window.BX_EXPOSED.dialogRoutes.closeAll();
    }

    private static $hiddenLink = CE<HTMLAnchorElement>('a', {
        target: '_blank',
    });

    private static updateIds(xboxTitleId?: string, id?: string) {
        const $link = TrueAchievements.$link;
        const $button = TrueAchievements.$button;

        clearDataSet($link);
        clearDataSet($button);

        if (xboxTitleId) {
            $link.dataset.xboxTitleId = xboxTitleId;
            $button.dataset.xboxTitleId = xboxTitleId;
        }

        if (id) {
            $link.dataset.id = id;
            $button.dataset.id = id;
        }
    }

    static injectAchievementsProgress($elm: HTMLElement) {
        const $parent = $elm.parentElement!;

        // Wrap xCloud's element with our own
        const $div = CE('div', {
            class: 'bx-guide-home-achievements-progress',
        }, $elm);

        // Get xboxTitleId of the game
        let xboxTitleId: string | number | undefined;
        try {
            const $container = $parent.closest('div[class*=AchievementsPreview-module__container]') as HTMLElement;
            if ($container) {
                const props = getReactProps($container);
                xboxTitleId = props.children.props.data.data.xboxTitleId;
            }
        } catch (e) {}

        if (!xboxTitleId) {
            xboxTitleId = TrueAchievements.getStreamXboxTitleId();
        }

        if (typeof xboxTitleId !== 'undefined') {
            xboxTitleId = xboxTitleId.toString();
        }
        TrueAchievements.updateIds(xboxTitleId);

        if (document.documentElement.dataset.xdsPlatform === 'tv') {
            $div.appendChild(TrueAchievements.$link);
        } else {
            $div.appendChild(TrueAchievements.$button);
        }

        $parent.appendChild($div);
    }

    static injectAchievementDetailPage($parent: HTMLElement) {
        const props = getReactProps($parent);
        if (!props) {
            return;
        }

        try {
            // Achievement list
            const achievementList: XboxAchievement[] = props.children.props.data.data;

            // Get current achievement name
            const $header = $parent.querySelector('div[class*=AchievementDetailHeader]') as HTMLElement;
            const achievementName = getReactProps($header).children[0].props.achievementName;

            // Find achievement based on name
            let id: string | undefined;
            let xboxTitleId: string | undefined;
            for (const achiev of achievementList) {
                if (achiev.name === achievementName) {
                    id = achiev.id;
                    xboxTitleId = achiev.title.id;
                    break;
                }
            }

            // Found achievement -> add TrueAchievements button
            if (id) {
                TrueAchievements.updateIds(xboxTitleId, id);
                $parent.appendChild(TrueAchievements.$link);
            }
        } catch (e) {};
    }

    private static getStreamXboxTitleId() : number | undefined {
        return STATES.currentStream.xboxTitleId || STATES.currentStream.titleInfo?.details.xboxTitleId;
    }

    static open(override: boolean, xboxTitleId?: number | string, id?: number | string) {
        if (!xboxTitleId || xboxTitleId === 'undefined') {
            xboxTitleId = TrueAchievements.getStreamXboxTitleId();
        }

        if (AppInterface && AppInterface.openTrueAchievementsLink) {
            AppInterface.openTrueAchievementsLink(override, xboxTitleId?.toString(), id?.toString());
            return;
        }

        let url = 'https://www.trueachievements.com';
        if (xboxTitleId) {
            url += `/deeplink/${xboxTitleId}`;

            if (id) {
                url += `/${id}`;
            }
        }

        TrueAchievements.$hiddenLink.href = url;
        TrueAchievements.$hiddenLink.click();
    }
}
