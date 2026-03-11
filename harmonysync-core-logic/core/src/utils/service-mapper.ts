import { SermonData, PresentationManifest, Slide, ItemConfig } from '../types/models';
import { XMLParser } from 'fast-xml-parser';

export class ServiceMapper {
    /**
     * Parses the Service_Order.txt or Service_Order.xml content
     * Auto-detects XML based on first non-whitespace character.
     */
    static parse(content: string): SermonData {
        const trimmed = content.trim();
        if (trimmed.startsWith('<')) {
            return this.parseXml(trimmed);
        }
        return this.parseLegacyText(content);
    }

    /**
     * Parse XML-based Service Maps
     */
    private static parseXml(content: string): SermonData {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            textNodeName: "#text"
        });
        
        let parsed: any;
        try {
            parsed = parser.parse(content);
        } catch (e) {
            console.error("Failed to parse Service Map XML", e);
            return { manifest: {}, slides: [] };
        }

        const root = parsed.serviceOrder || parsed.manifest;
        if (!root) {
            return { manifest: {}, slides: [] };
        }

        const manifest: PresentationManifest = {
            folderMidi: {},
            slideMidi: {}
        };

        // Parse Playlist
        if (root.playlist) {
            let services: any[] = [];
            if (Array.isArray(root.playlist.service)) {
                services = root.playlist.service;
            } else if (root.playlist.service) {
                services = [root.playlist.service];
            }

            // Using the first service times globally for now, or just storing the URL as requested by legacy code
            if (root.playlist["@_url"]) {
                manifest.music = {
                    playlist: root.playlist["@_url"],
                    start: services[0] ? services[0]["@_start"] || '' : '',
                    end: services[0] ? services[0]["@_end"] || '' : ''
                };
            }
        }

        // Parse Canva
        if (root.canva && root.canva["@_url"]) {
            manifest.canva = root.canva["@_url"];
        } else if (typeof root.canva === 'string') {
            manifest.canva = root.canva;
        }

        // Parse Items
        let items: any[] = [];
        if (Array.isArray(root.item)) {
            items = root.item;
        } else if (root.item) {
            items = [root.item];
        }

        for (const item of items) {
            const name = item["@_name"];
            if (!name) continue;

            const config: ItemConfig = {};

            if (item.midi) {
                config.midi = String(item.midi).split(',').map(m => m.trim());
            }

            if (item.url) {
                config.url = String(item.url).trim();
            }

            if (item["@_start"]) {
                config.startTime = String(item["@_start"]).trim();
            }

            if (item["@_end"]) {
                config.endTime = String(item["@_end"]).trim();
            }

            if (item.timer) {
                // If it's a direct slide action config we pass it via config
                (config as any).timer = String(item.timer).trim();
            }

            if (item.timerTarget) {
                (config as any).timerTarget = String(item.timerTarget).split(',').map((t: string) => t.trim());
            }

            if (String(item.autoAdvanceWhenComplete).toLowerCase() === 'true') {
                manifest.autoStartNextItem = true;
                (config as any).autoAdvanceWhenComplete = true; // store specifically for this item if needed
            }

            // Differentiate between folders and files. Usually files have extensions natively in our usage.
            if (name.includes('.')) {
                manifest.slideMidi![name] = config;
            } else {
                manifest.folderMidi![name] = config;
            }
        }

        return {
            manifest,
            slides: [] // The new specification leaves out pure slide text from the XML mapper
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
