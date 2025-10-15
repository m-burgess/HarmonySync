
export function parseLyricsToSlides(lyricsText) {
	const slides = [];
	let currentSection = 'Intro';
	let currentSlideLines = [];

	const lines = lyricsText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

	for (const line of lines) {
		const sectionMatch = line.match(/^\[(.*)\]$/);
		if (sectionMatch) {
			currentSection = sectionMatch[1];
			continue;
		}

		currentSlideLines.push(line);

		if (currentSlideLines.length === 2) {
			slides.push({ text: currentSlideLines, section: currentSection });
			currentSlideLines = [];
		}
	}

	// Handle any remaining lines for the last slide
	if (currentSlideLines.length > 0) {
		slides.push({ text: currentSlideLines, section: currentSection });
	}

	return slides;
}

