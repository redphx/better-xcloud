import { BxIcon } from "./bx-icon";
import { AppInterface, STATES } from "./global";
import { ButtonStyle, CE, createButton, getReactProps } from "./html";
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
        style: ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH,
        onClick: TrueAchievements.onClick,
    }) as HTMLAnchorElement;

    private static onClick(e: Event) {
        e.preventDefault();

        const dataset = TrueAchievements.$link.dataset;
        TrueAchievements.open(true, dataset.xboxTitleId, dataset.id);
    }

    private static $hiddenLink = CE<HTMLAnchorElement>('a', {
        target: '_blank',
    });

    private static updateLinks(xboxTitleId?: string, id?: string) {
        TrueAchievements.$link.dataset.xboxTitleId = xboxTitleId;
        TrueAchievements.$link.dataset.id = id;

        TrueAchievements.$button.dataset.xboxTitleId = xboxTitleId;
        TrueAchievements.$button.dataset.id = id;
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
                TrueAchievements.updateLinks(xboxTitleId, id);
                $parent.appendChild(TrueAchievements.$link);
            }
        } catch (e) {};
    }

    static open(override: boolean, xboxTitleId?: number | string, id?: number | string) {
        if (!xboxTitleId || xboxTitleId === 'undefined') {
            xboxTitleId = STATES.currentStream.xboxTitleId || STATES.currentStream.titleInfo?.details.xboxTitleId;
        }

        if (AppInterface && AppInterface.openTrueAchievementsLink) {
            AppInterface.openTrueAchievementsLink(override, xboxTitleId?.toString(), id?.toString());
            return;
        }

        let url = 'https://www.trueachievements.com';
        if (xboxTitleId) {
            if (id && id !== 'undefined') {
                url += `/deeplink/${xboxTitleId}/${id}`;
            } else {
                url += `/deeplink/${xboxTitleId}`;
            }
        }

        TrueAchievements.$hiddenLink.href = url;
        TrueAchievements.$hiddenLink.click();
    }
}
