import { NATIVE_FETCH } from "@/utils/bx-flags";
import { STATES } from "@/utils/global";
import { ButtonStyle, CE, createButton } from "@/utils/html";
import { t } from "@/utils/translation";

// Latency test for gssv regions — pings every region's provisioning endpoint
// and recommends the fastest one, to help pick `server.region`.
//
// Why NATIVE_FETCH + `?probe=1` : the script rewrites requests to
// `/v5/sessions/cloud/play` (region selection). The test must measure the real
// network path to the target region, so it bypasses every fetch hook and makes
// the URL unmistakable (`probe=1`).
export const LatencyTest = {
    render($parent: HTMLElement): void {
        const $list = CE('div', { class: 'bx-latency-test-list' });
        const $btn = createButton({
            label: t('latency-test-button'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: () => {
                void LatencyTest.run($btn, $list);
            },
        });
        $parent.appendChild($btn);
        $parent.appendChild($list);
    },

    async run($btn: HTMLButtonElement, $list: HTMLElement): Promise<void> {
        const regions = STATES.serverRegions;
        const names = Object.keys(regions).sort();

        $btn.disabled = true;
        const original = $btn.textContent || '';
        $btn.textContent = t('latency-test-running');
        $list.textContent = '';

        if (!names.length) {
            $list.appendChild(CE('div', { style: 'opacity:.7;padding:6px 0;' }, t('latency-test-no-regions')));
            $btn.disabled = false;
            $btn.textContent = original;
            return;
        }

        const results: { code: string; label: string; ms: number; isDefault: boolean }[] = [];
        for (const name of names) {
            const region = regions[name];
            // Hôte propre : baseUri (ex. https://eus.core.gssv-play-prod.xboxlive.com) —
            // PAS shortName (contient l'emoji drapeau « 🇺🇸 EUS » → hôte invalide)
            const url = (region.baseUri || `https://${(region.name || name).toLowerCase()}.core.gssv-play-prod.xboxlive.com`)
                + '/v5/sessions/cloud/play?probe=1';
            const t0 = performance.now();
            let ms = -1;
            try {
                await Promise.race([
                    NATIVE_FETCH(url, { mode: 'no-cors', cache: 'no-store' }),
                    new Promise((_resolve, reject) => {
                        setTimeout(() => reject(new Error('timeout')), 3000);
                    }),
                ]);
                ms = performance.now() - t0;
            } catch {
                ms = -1;
            }

            const code = region.shortName || region.name || name;
            const label = region.displayName || name;
            results.push({ code, label, ms, isDefault: !!region.isDefault });

            $list.appendChild(CE('div', { style: 'display:flex;justify-content:space-between;gap:8px;padding:2px 4px;' },
                CE('span', {}, `${code} — ${label}${region.isDefault ? ` (${t('latency-test-default')})` : ''}`),
                CE('span', {}, ms >= 0 ? `${Math.round(ms)} ms` : '—')));
        }

        results.sort((a, b) => (a.ms < 0 ? 1e5 : a.ms) - (b.ms < 0 ? 1e5 : b.ms));
        if (results.length && results[0].ms >= 0) {
            const best = results[0];
            $list.insertBefore(CE('div', { style: 'padding:6px 4px;font-weight:700;color:#7ed321;' },
                `⭐ ${best.code} (${Math.round(best.ms)} ms) — ${t('latency-test-recommended')}`), $list.firstChild);
        }

        $btn.disabled = false;
        $btn.textContent = t('latency-test-again');
    },
};
