import { SermonData, PresentationManifest, Slide } from '../types/models';

export class SermonParser {
    /**
     * Parses the Service_Order.txt (formerly sermon.txt) content
     */
    static parse(content: string): SermonData {
        const data: SermonData = {
            manifest: {},
            slides: []
        };

        let lines = content.split('\n');
        let manifestLines: string[] = [];
        let contentLines: string[] = [];
        let inHeader = false;
        let headerCount = 0;

        // Split header and content
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '---') {
                headerCount++;
                inHeader = headerCount === 1;
                continue;
            }

            if (inHeader) {
                manifestLines.push(lines[i]);
            } else {
                contentLines.push(lines[i]);
            }
        }

        // Parse Manifest (YAML-ish)
        data.manifest = this.parseManifest(manifestLines);

        // Parse Slides
        data.slides = this.parseSlides(contentLines, data.manifest);

        return data;
    }

    private static parseManifest(lines: string[]): PresentationManifest {
        const manifest: PresentationManifest = {
            slideMidi: {},
            folderMidi: {}
        };

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) continue;

            const key = trimmed.slice(0, colonIndex).trim().toLowerCase();
            const value = trimmed.slice(colonIndex + 1).trim();

            switch (key) {
                case 'youtube':
                    manifest.youtube = value;
                    break;
                case 'canva':
                    manifest.canva = value;
                    break;
                case 'midi':
                    manifest.midi = value.split(',').map(n => n.trim()).filter(Boolean);
                    break;
                case 'music':
                    // Handle music object if possible, or skip for now if too complex
                    break;
                default:
                    // Check for folder or slide midi triggers: [Key:note1,note2]
                    if (trimmed.startsWith('[') && trimmed.includes(']')) {
                        const match = trimmed.match(/\[(.*?):(.*?)\]/);
                        if (match) {
                            const itemKey = match[1].trim();
                            const notes = match[2].split(',').map(n => n.trim()).filter(Boolean);

                            if (itemKey.includes('.')) {
                                // Likely a file
                                manifest.slideMidi![itemKey] = notes;
                            } else {
                                // Likely a folder
                                manifest.folderMidi![itemKey] = notes;
                            }
                        }
                    }
            }
        }

        return manifest;
    }

    private static parseSlides(lines: string[], manifest: PresentationManifest): Slide[] {
        const slides: Slide[] = [];
        let currentType: Slide['type'] = 'text';
        let currentContent: string[] = [];
        let currentTitle = '';
        let currentTimer = '';
        let currentTargets: string[] = [];

        const addSlide = () => {
            const contentStr = currentContent.join('\n').trim();
            if (!contentStr && !currentTitle) return;

            // Auto-detect type
            let type = currentType;
            if (type === 'text' && contentStr.startsWith('http')) {
                if (contentStr.includes('youtube.com') || contentStr.includes('youtu.be')) type = 'youtube';
                else if (contentStr.match(/\.(jpeg|jpg|gif|png|webp)/i)) type = 'image';
                else if (contentStr.includes('canva.com')) type = 'canva';
            }

            // Check for slide-specific MIDI in manifest
            let slideMidi: string[] | undefined = undefined;
            if (currentTitle && manifest.slideMidi && manifest.slideMidi[currentTitle]) {
                slideMidi = manifest.slideMidi[currentTitle];
            }

            slides.push({
                id: `slide-${slides.length}-${Date.now()}`,
                title: currentTitle || (type === 'text' ? 'Scripture' : type.charAt(0).toUpperCase() + type.slice(1)),
                type: type,
                content: {
                    type: type === 'lyrics' ? 'lyrics' : (type === 'image' ? 'image' : (type === 'video' ? 'video' : 'text')),
                    content: contentStr
                },
                action: {
                    timer: currentTimer || undefined,
                    targets: currentTargets.length > 0 ? currentTargets : undefined,
                    midi: slideMidi
                }
            });

            currentContent = [];
            currentTitle = '';
            currentType = 'text';
            currentTimer = '';
            currentTargets = [];
        };

        for (const line of lines) {
            const trimmed = line.trim();

            // Timer/Target tag: [timer: MM:SS | target: audience, confidence]
            if (trimmed.startsWith('[timer:')) {
                const timerMatch = trimmed.match(/\[timer:\s*([\d:]+)(?:\s*\|\s*target:\s*(.*?))?\]/);
                if (timerMatch) {
                    currentTimer = timerMatch[1];
                    if (timerMatch[2]) {
                        currentTargets = timerMatch[2].split(',').map(t => t.trim()).filter(Boolean);
                    }
                    continue;
                }
            }

            // Standard slide tags: [Title] or [youtube]
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                addSlide();
                const tagText = trimmed.slice(1, -1);
                const tagLower = tagText.toLowerCase();

                if (tagLower === 'youtube') currentType = 'youtube';
                else if (tagLower === 'image') currentType = 'image';
                else if (tagLower === 'video') currentType = 'video';
                else if (tagLower === 'canva') currentType = 'canva';
                else {
                    currentType = 'text';
                    currentTitle = tagText;
                }
                continue;
            }

            if (!trimmed && currentContent.length > 0) {
                addSlide();
                continue;
            }

            currentContent.push(line);
        }

        addSlide();
        return slides;
    }
}
