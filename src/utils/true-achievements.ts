import { BX_FLAGS } from "./bx-flags";
import { AppInterface, STATES } from "./global";
import { ButtonStyle, CE, createButton, getReactProps } from "./html";
import { t } from "./translation";

export class TrueAchievements {
    private static $taLink = createButton({
        label: t('true-achievements'),
        url: 'https://www.trueachievements.com',
        style: ButtonStyle.FOCUSABLE | ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH | ButtonStyle.NORMAL_LINK,
        onClick: e => {
            e.preventDefault();

            const dataset = TrueAchievements.$taLink.dataset;
            TrueAchievements.open(true, dataset.xboxTitleId, dataset.id);
        },
    }) as HTMLAnchorElement;

    private static $hiddenLink = CE<HTMLAnchorElement>('a', {
        target: '_blank',
    });

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
                TrueAchievements.$taLink.dataset.xboxTitleId = xboxTitleId;
                TrueAchievements.$taLink.dataset.id = id;

                TrueAchievements.$taLink.href = `https://www.trueachievements.com/deeplink/${xboxTitleId}/${id}`;
                $parent.appendChild(TrueAchievements.$taLink);
            }
        } catch (e) {};
    }

    static open(override: boolean, xboxTitleId?: number | string, id?: number | string) {
        if (!xboxTitleId) {
            xboxTitleId = STATES.currentStream.xboxTitleId || STATES.currentStream.titleInfo?.details.xboxTitleId;
        }

        if (AppInterface && AppInterface.openTrueAchievementsLink) {
            AppInterface.openTrueAchievementsLink(override, xboxTitleId?.toString(), id?.toString());
            return;
        }

        let url = 'https://www.trueachievements.com';
        if (xboxTitleId) {
            if (id) {
                url += `/deeplink/${xboxTitleId}/${id}`;
            } else {
                url += `/deeplink/${xboxTitleId}`;
            }
        }

        TrueAchievements.$hiddenLink.href = url;
        TrueAchievements.$hiddenLink.click();
    }
}
