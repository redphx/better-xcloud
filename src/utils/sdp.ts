export function patchSdpBitrate(sdp: string, video?: number, audio?: number) {
    const lines = sdp.split('\n');

    const mediaSet: Set<string> = new Set();
    !!video && mediaSet.add('video');
    !!audio && mediaSet.add('audio');

    const bitrate = {
        video,
        audio,
    };

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        let media: string = '';

        let line = lines[lineNumber];
        if (!line.startsWith('m=')) {
            continue;
        }

        for (const m of mediaSet) {
            if (line.startsWith(`m=${m}`)) {
                media = m;
                // Remove matched media from set
                mediaSet.delete(media);
                break;
            }
        }

        // Invalid media, continue looking
        if (!media) {
            continue;
        }

        const bLine = `b=AS:${bitrate[media as keyof typeof bitrate]}`;

        while (lineNumber++, lineNumber < lines.length) {
            line = lines[lineNumber];
            // Ignore lines that start with "i=" or "c="
            if (line.startsWith('i=') || line.startsWith('c=')) {
                continue;
            }

            if (line.startsWith('b=AS:')) {
                // Replace bitrate
                lines[lineNumber] = bLine;
                // Stop lookine for "b=AS:" line
                break;
            }

            if (line.startsWith('m=')) {
                // "b=AS:" line not found, add "b" line before "m="
                lines.splice(lineNumber, 0, bLine);
                // Stop
                break;
            }
        }
    }

    return lines.join('\n');
}
