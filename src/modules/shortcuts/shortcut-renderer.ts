export class RendererShortcut {
    static toggleVisibility(): boolean {
        const $mediaContainer = document.querySelector('#game-stream div[data-testid="media-container"]');
        if (!$mediaContainer) {
            return true;
        }

        $mediaContainer.classList.toggle('bx-gone');
        return !$mediaContainer.classList.contains('bx-gone');
    }
}
