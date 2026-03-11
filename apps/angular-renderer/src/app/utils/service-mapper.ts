
export interface SermonSlide {
    id: string;
    type: 'lyric' | 'youtube' | 'image' | 'video' | 'canva';
    content: string;
    text?: string[];
    url?: string;
    name: string;
}

export interface SermonData {
    midiNotes: string[];
    slides: SermonSlide[];
}

export class ServiceMapper {
    static parse(content: string): SermonData {
        const lines = content.split('\n');
        const data: SermonData = {
            midiNotes: [],
            slides: []
        };

        let currentType: 'lyric' | 'youtube' | 'image' | 'video' | 'canva' = 'lyric';
        let currentContent: string[] = [];
        let currentTitle = '';

        const addSlide = () => {
            const contentStr = currentContent.join('\n').trim();
            if (!contentStr && !currentTitle) return;

            // Auto-detect type if it's currently 'lyric' but looks like a URL
            let type = currentType;
            if (type === 'lyric' && contentStr.startsWith('http')) {
                if (contentStr.includes('youtube.com') || contentStr.includes('youtu.be')) {
                    type = 'youtube';
                } else if (contentStr.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
                    type = 'image';
                } else if (contentStr.includes('canva.com')) {
                    type = 'canva';
                }
            }

            data.slides.push({
                id: `sermon-${data.slides.length}-${Date.now()}`,
                type: type,
                name: currentTitle || (type === 'lyric' ? 'Scripture' : type.charAt(0).toUpperCase() + type.slice(1)),
                content: contentStr,
                text: type === 'lyric' ? [contentStr] : undefined,
                url: (type === 'youtube' || type === 'image' || type === 'video' || type === 'canva') ? contentStr : undefined
            });

            currentContent = [];
            currentTitle = '';
            currentType = 'lyric'; // Reset to lyric/scripture as default
        };

        for (let line of lines) {
            let trimmed = line.trim();
            if (!line && currentContent.length === 0) continue;

            // Check for MIDI notes (case insensitive)
            if (trimmed.toLowerCase().startsWith('send midi note(s):')) {
                const notesStr = trimmed.split(':')[1] || '';
                const notes = notesStr.split(',').map(n => n.trim()).filter(Boolean);
                data.midiNotes.push(...notes);
                continue;
            }

            // Check for tags like [Song Title] or [youtube]
            if (trimmed.startsWith('[') && trimmed.includes(']')) {
                addSlide();

                const tagMatch = trimmed.match(/\[(.*?)\]/);
                const tagText = tagMatch ? tagMatch[1] : '';
                const tagLower = tagText.toLowerCase();

                if (tagLower === 'youtube') {
                    currentType = 'youtube';
                    currentTitle = 'YouTube';
                } else if (tagLower === 'image') {
                    currentType = 'image';
                    currentTitle = 'Image';
                } else if (tagLower === 'video') {
                    currentType = 'video';
                    currentTitle = 'Video';
                } else if (tagLower === 'canva') {
                    currentType = 'canva';
                    currentTitle = 'Canva Presentation';
                } else {
                    currentType = 'lyric';
                    currentTitle = tagText; // e.g. [Genesis 1:1]
                }

                // If there's content after the tag on the same line
                const afterTag = trimmed.replace(/\[.*?\]/, '').trim();
                if (afterTag) {
                    currentContent.push(afterTag);
                }
                continue;
            }

            if (!trimmed) {
                if (currentContent.length > 0) {
                    addSlide();
                }
                continue;
            }

            currentContent.push(trimmed);
        }

        addSlide();
        return data;
    }
}
