import { SermonData, PresentationManifest, Slide, ItemConfig } from '../types/models';

/**
 * ServiceMapper handles the parsing of Service Order files.
 * XML parsing has been moved to a basic implementation to remove fast-xml-parser.
 */
export class ServiceMapper {
    /**
     * Parses the Service_Order.txt or Service_Order.xml content
     * Auto-detects XML based on first non-whitespace character.
     */
    static parse(content: string): SermonData {
        const trimmed = content.trim();
        if (trimmed.startsWith('<')) {
            return this.parseBasicXml(trimmed);
        }
        return this.parseLegacyText(content);
    }

    /**
     * Parse XML-based Service Maps using basic regex to avoid external dependencies.
     */
    private static parseBasicXml(content: string): SermonData {
        const manifest: PresentationManifest = {
            folderMidi: {},
            slideMidi: {}
        };

        try {
            // Parse Playlist
            const playlistMatch = content.match(/<playlist(.*?)>([\s\S]*?)<\/playlist>/);
            if (playlistMatch) {
                const attrs = playlistMatch[1];
                const urlMatch = attrs.match(/url="(.*?)"/);
                
                const servicesMatch = playlistMatch[2].match(/<service(.*?)[\/]?>/g);
                let start = '';
                let end = '';
                if (servicesMatch && servicesMatch[0]) {
                    const sAttrs = servicesMatch[0];
                    const startMatch = sAttrs.match(/start="(.*?)"/);
                    const endMatch = sAttrs.match(/end="(.*?)"/);
                    if (startMatch) start = startMatch[1];
                    if (endMatch) end = endMatch[1];
                }

                if (urlMatch) {
                    manifest.music = {
                        playlist: urlMatch[1],
                        start,
                        end
                    };
                }
            }

            // Parse Canva
            const canvaMatch = content.match(/<canva(.*?)>(.*?)<\/canva>/) || content.match(/<canva(.*?)[\/]?>/);
            if (canvaMatch) {
                const attrs = canvaMatch[1];
                const urlAttrMatch = attrs.match(/url="(.*?)"/);
                if (urlAttrMatch) {
                    manifest.canva = urlAttrMatch[1];
                } else if (canvaMatch[2]) {
                    manifest.canva = canvaMatch[2].trim();
                }
            }

            // Parse Items
            const itemRegex = /<item name="(.*?)">([\s\S]*?)<\/item>|<item name="(.*?)" (.*?)[\/]?>/g;
            let match;
            while ((match = itemRegex.exec(content)) !== null) {
                const name = match[1] || match[3];
                const innerOrAttrs = match[2] || match[4];
                if (!name) continue;

                const config: ItemConfig = {};
                
                // Extract from inner content or attributes
                if (match[2]) {
                    const midiMatch = match[2].match(/<midi>(.*?)<\/midi>/);
                    if (midiMatch) config.midi = midiMatch[1].split(',').map(m => m.trim());

                    const urlMatch = match[2].match(/<url>(.*?)<\/url>/);
                    if (urlMatch) config.url = urlMatch[1].trim();

                    const timerMatch = match[2].match(/<timer>(.*?)<\/timer>/);
                    if (timerMatch) (config as any).timer = timerMatch[1].trim();

                    const targetMatch = match[2].match(/<timerTarget>(.*?)<\/timerTarget>/);
                    if (targetMatch) (config as any).timerTarget = targetMatch[1].split(',').map((t: string) => t.trim());

                    const autoAdvanceMatch = match[2].match(/<autoAdvanceWhenComplete>(.*?)<\/autoAdvanceWhenComplete>/);
                    if (autoAdvanceMatch && autoAdvanceMatch[1].toLowerCase() === 'true') {
                        manifest.autoStartNextItem = true;
                        (config as any).autoAdvanceWhenComplete = true;
                    }
                }

                // Attributes
                const startMatch = (match[2] || match[4] || '').match(/start="(.*?)"/);
                if (startMatch) config.startTime = startMatch[1].trim();

                const endMatch = (match[2] || match[4] || '').match(/end="(.*?)"/);
                if (endMatch) config.endTime = endMatch[1].trim();

                if (name.includes('.')) {
                    manifest.slideMidi![name] = config;
                } else {
                    manifest.folderMidi![name] = config;
                }
            }
        } catch (e) {
            console.error("[ServiceMapper] Basic XML parse failed", e);
        }

        return {
            manifest,
            slides: []
        };
    }

    /**
     * Parses the legacy bracket-based Service_Order.txt
     */
    private static parseLegacyText(content: string): SermonData {
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
                    // Parse music: playlist_url | start_time | end_time
                    const parts = value.split('|').map(p => p.trim());
                    manifest.music = {
                        playlist: parts[0] || '',
                        start: parts[1] || '',
                        end: parts[2] || ''
                    };
                    break;
                default:
                    // Check for folder or slide midi triggers: [Key:note1,note2]
                    if (trimmed.startsWith('[') && trimmed.includes(']')) {
                        // Global auto start
                        if (trimmed.toLowerCase() === '[autostart next item]') {
                            manifest.autoStartNextItem = true;
                            continue;
                        }

                        const match = trimmed.match(/\[(.*?):(.*?)\]/);
                        if (match) {
                            const itemKey = match[1].trim();
                            const parts = match[2].split(',').map(n => n.trim()).filter(Boolean);

                            const config: import('../types/models').ItemConfig = { midi: [] };

                            for (const part of parts) {
                                if (part.startsWith('http')) {
                                    config.url = part;
                                } else if (part.match(/\d{1,2}:\d{2}(?:AM|PM|am|pm)?/i)) {
                                    if (!config.startTime) config.startTime = part;
                                    else config.endTime = part;
                                } else {
                                    config.midi!.push(part);
                                }
                            }
                            if (config.midi!.length === 0) delete config.midi;

                            if (itemKey.includes('.')) {
                                // Likely a file
                                manifest.slideMidi![itemKey] = config;
                            } else {
                                // Likely a folder
                                manifest.folderMidi![itemKey] = config;
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

            // Check for slide-specific config in manifest
            let slideConfig: import('../types/models').ItemConfig | undefined = undefined;
            if (currentTitle && manifest.slideMidi && manifest.slideMidi[currentTitle]) {
                slideConfig = manifest.slideMidi[currentTitle];
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
                    midi: slideConfig?.midi,
                    startTime: slideConfig?.startTime,
                    endTime: slideConfig?.endTime,
                    url: slideConfig?.url
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
