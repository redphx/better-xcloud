import { BxIcon } from "./bx-icon";
import { BxLogger } from "./bx-logger";
import { AppInterface, SCRIPT_VARIANT, STATES } from "./global";
import { ButtonStyle, CE, clearDataSet, createButton, getReactProps } from "./html";
import { t } from "./translation";

export class TrueAchievements {
    private static instance: TrueAchievements;
    public static getInstance = () => TrueAchievements.instance ?? (TrueAchievements.instance = new TrueAchievements());
    private readonly LOG_TAG = 'TrueAchievements';

    private $link: HTMLElement;
    private $button: HTMLElement;
    private $hiddenLink: HTMLAnchorElement;

    constructor() {
        BxLogger.info(this.LOG_TAG, 'constructor()');

        this.$link = createButton<HTMLAnchorElement>({
            label: t('true-achievements'),
            url: '#',
            icon: BxIcon.TRUE_ACHIEVEMENTS,
            style: ButtonStyle.FOCUSABLE | ButtonStyle.GHOST | ButtonStyle.FULL_WIDTH | ButtonStyle.NORMAL_LINK,
            onClick: this.onClick.bind(this),
        });

        this.$button = createButton<HTMLAnchorElement>({
            label: t('true-achievements'),
            title: t('true-achievements'),
            icon: BxIcon.TRUE_ACHIEVEMENTS,
            style: ButtonStyle.FOCUSABLE,
            onClick: this.onClick.bind(this),
        });

        this.$hiddenLink = CE<HTMLAnchorElement>('a', {
            target: '_blank',
        });
    }

    private onClick(e: Event) {
        e.preventDefault();

        // Close all xCloud's dialogs
        window.BX_EXPOSED.dialogRoutes?.closeAll();

        const dataset = this.$link.dataset;
        this.open(true, dataset.xboxTitleId, dataset.id);
    }

    private updateIds(xboxTitleId?: string, id?: string) {
        const $link = this.$link;
        const $button = this.$button;

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

    injectAchievementsProgress($elm: HTMLElement) {
        // Only do this in Full version
        if (SCRIPT_VARIANT !== 'full') {
            return;
        }

        const $parent = $elm.parentElement!;

        // Wrap xCloud's element with our own
        const $div = CE('div', {
            class: 'bx-guide-home-achievements-progress',
        }, $elm);

        // Get xboxTitleId of the game
        let xboxTitleId: string | number | undefined;
        try {
            const $container = $parent.closest<HTMLElement>('div[class*=AchievementsPreview-module__container]');
            if ($container) {
                const props = getReactProps($container);
                xboxTitleId = props.children.props.data.data.xboxTitleId;
            }
        } catch (e) {}

        if (!xboxTitleId) {
            xboxTitleId = this.getStreamXboxTitleId();
        }

        if (typeof xboxTitleId !== 'undefined') {
            xboxTitleId = xboxTitleId.toString();
        }
        this.updateIds(xboxTitleId);

        if (document.documentElement.dataset.xdsPlatform === 'tv') {
            $div.appendChild(this.$link);
        } else {
            $div.appendChild(this.$button);
        }

        $parent.appendChild($div);
    }

    injectAchievementDetailPage($parent: HTMLElement) {
        // Only do this in Full version
        if (SCRIPT_VARIANT !== 'full') {
            return;
        }

        const props = getReactProps($parent);
        if (!props) {
            return;
        }

        try {
            // Achievement list
            const achievementList: XboxAchievement[] = props.children.props.data.data;

            // Get current achievement name
            const $header = $parent.querySelector<HTMLElement>('div[class*=AchievementDetailHeader]')!;
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
                this.updateIds(xboxTitleId, id);
                $parent.appendChild(this.$link);
            }
        } catch (e) {};
    }

    private getStreamXboxTitleId() : number | undefined {
        return STATES.currentStream.xboxTitleId || STATES.currentStream.titleInfo?.details.xboxTitleId;
    }

    open(override: boolean, xboxTitleId?: number | string, id?: number | string) {
        if (!xboxTitleId || xboxTitleId === 'undefined') {
            xboxTitleId = this.getStreamXboxTitleId();
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

        this.$hiddenLink.href = url;
        this.$hiddenLink.click();
    }
}
