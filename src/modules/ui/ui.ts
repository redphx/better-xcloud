import { CE } from "@utils/html";


export function localRedirect(path: string) {
    const url = window.location.href.substring(0, 31) + path;

    const $pageContent = document.getElementById('PageContent');
    if (!$pageContent) {
        return;
    }

    const $anchor = CE<HTMLAnchorElement>('a', {
            href: url,
            class: 'bx-hidden bx-offscreen',
        }, '');
    $anchor.addEventListener('click', e => {
        // Remove element after clicking on it
        window.setTimeout(() => {
            $pageContent.removeChild($anchor);
        }, 1000);
    });

    $pageContent.appendChild($anchor);
    $anchor.click();
}

(window as any).localRedirect = localRedirect;
