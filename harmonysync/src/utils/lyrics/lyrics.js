
/**
 * Parse lyrics with vertical section-based grouping
 * Each section becomes a single slide with all its lines displayed vertically
 * This makes it easier for volunteers to work with complete song sections
 */
export function parseLyricsToSlides(lyricsText) {
	const slides = [];
	let currentSection = 'Intro';
	let currentSectionLines = [];

	const lines = lyricsText.split(/\r?\n/).map(line => line.trim());

	for (const line of lines) {
		// Check if this line is a section marker like [Verse 1] or [Chorus]
		const sectionMatch = line.match(/^\[(.*)\]$/);
		if (sectionMatch) {
			// Save the previous section if it has any lines
			if (currentSectionLines.length > 0) {
				slides.push({ 
					text: currentSectionLines, 
					section: currentSection,
					type: 'lyric',
					displayMode: 'vertical-section' // Mark this as a vertical section display
				});
				currentSectionLines = [];
			}
			// Start a new section
			currentSection = sectionMatch[1];
			continue;
		}

		// Add non-empty lines to the current section
		if (line.length > 0) {
			currentSectionLines.push(line);
		}
	}

	// Handle any remaining lines for the last section
	if (currentSectionLines.length > 0) {
		slides.push({ 
			text: currentSectionLines, 
			section: currentSection,
			type: 'lyric',
			displayMode: 'vertical-section'
		});
	}

	return slides;
}

