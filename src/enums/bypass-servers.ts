import { t } from "@/utils/translation"

export const BypassServers = {
    'br': t('brazil'),
    'jp': t('japan'),
    'kr': t('korea'),
    'pl': t('poland'),
    'us': t('united-states'),
}

export const BypassServerIps: Record<keyof typeof BypassServers, string> = {
    'br': '169.150.198.66',
    'kr': '121.125.60.151',
    'jp': '138.199.21.239',
    'pl': '45.134.212.66',
    'us': '143.244.47.65',
}
