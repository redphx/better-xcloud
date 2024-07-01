export function setCodecPreferences(sdp: string, preferredCodec: string) {
    const h264Pattern = /a=fmtp:(\d+).*profile-level-id=([0-9a-f]{6})/g;
    const profilePrefix = preferredCodec === 'high' ? '4d' : (preferredCodec === 'low' ? '420' : '42e');

    const preferredCodecIds: string[] = [];

    // Find all H.264 codec profile IDs
    const matches = sdp.matchAll(h264Pattern) || [];
    for (const match of matches) {
        const id = match[1];
        const profileId = match[2];

        if (profileId.startsWith(profilePrefix)) {
            preferredCodecIds.push(id);
        }
    }

    // No preferred IDs found
    if (!preferredCodecIds.length) {
        return sdp;
    }

    const lines = sdp.split('\r\n');
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        if (!line.startsWith('m=video')) {
            continue;
        }

        // https://datatracker.ietf.org/doc/html/rfc4566#section-5.14
        // m=<media> <port> <proto> <fmt>
        // m=video 9 UDP/TLS/RTP/SAVPF 127 39 102 104 106 108
        const tmp = line.trim().split(' ');

        // Get array of <fmt>
        // ['127', '39', '102', '104', '106', '108']
        let ids = tmp.slice(3);

        // Remove preferred IDs in the original array
        ids = ids.filter(item => !preferredCodecIds.includes(item));

        // Put preferred IDs at the beginning
        ids = preferredCodecIds.concat(ids);

        // Update line's content
        lines[lineIndex] = tmp.slice(0, 3).concat(ids).join(' ');

        break;
    }

    return lines.join('\r\n');
}


export function patchSdpBitrate(sdp: string, video?: number, audio?: number) {
    const lines = sdp.split('\r\n');

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

    return lines.join('\r\n');
}
