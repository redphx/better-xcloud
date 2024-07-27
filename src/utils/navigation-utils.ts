import type { NavigationElement, NavigationNearbyElements } from "@/modules/ui/dialog/navigation-dialog";

export class NavigationUtils {
    static setNearby($elm: NavigationElement, nearby: NavigationNearbyElements) {
        $elm.nearby = $elm.nearby || {};

        let key: keyof typeof nearby;
        for (key in nearby) {
            $elm.nearby[key] = nearby[key] as any;
        }
    }
}

export const setNearby = NavigationUtils.setNearby;
