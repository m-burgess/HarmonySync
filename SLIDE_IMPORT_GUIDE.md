# Slide Import Feature

## Overview

HarmonySync now supports importing slides from various sources, making it easy to integrate presentations into your worship services.

## Supported Formats

### PDF Documents
- Import multi-page PDF files as individual slides
- Each page is converted to a high-quality image
- Ideal for sermon notes, bulletins, or exported presentations

### PowerPoint Presentations
- Import .pptx and .ppt files
- **Requires LibreOffice** to be installed on your system
- Automatically converts PowerPoint slides to images

### Batch Import
- Import multiple files from a folder at once
- Supports both PDF and PowerPoint files
- Automatically processes all compatible files

## How to Import Slides

### 1. Open the Import Dialog

1. Navigate to the **Slides** panel in the main window
2. Click the **upload icon** (↑) button next to "Slides" heading
3. The Slide Import dialog will open

### 2. Choose Import Source

Select one of three import types:

- **PDF**: Import from a PDF document
- **PowerPoint**: Import from a PowerPoint presentation
- **Folder**: Batch import from a folder

### 3. Select File or Folder

1. Click the **Browse** button
2. Navigate to your file or folder
3. Select the file/folder you want to import
4. The path will appear in the text field

### 4. Configure Import Options

#### Resolution (DPI)
Choose the image quality for imported slides:

- **96 DPI (Low)**: Faster import, smaller file size, lower quality
- **150 DPI (Medium)**: Balanced quality and file size (recommended)
- **200 DPI (High)**: Better quality, larger file size
- **300 DPI (Very High)**: Best quality, largest file size

#### Image Format
Choose the output format:

- **PNG**: Better quality, larger file size, supports transparency
- **JPEG**: Smaller file size, good quality, no transparency

### 5. Import

1. Click the **Import Slides** button
2. Wait for the import to complete
3. Progress will be shown in real-time
4. Imported slides will be added to your slide list

## Tips & Best Practices

### For PDF Import

- Ensure PDFs are high resolution for best results
- Single-page PDFs work great for images and graphics
- Multi-page PDFs are split into individual slides automatically

### For PowerPoint Import

- **Install LibreOffice first**: Download from [libreoffice.org](https://www.libreoffice.org/)
- Works with both .pptx (modern) and .ppt (legacy) formats
- Complex animations are converted to static images
- Embedded videos are not preserved

### For Folder Import

- Organize your presentation files in a dedicated folder
- Mix of PDF and PowerPoint files is supported
- Files are processed in alphabetical order
- Failed imports (e.g., corrupted files) are skipped with a warning

## Resolution Guidelines

Choose the right DPI for your use case:

| DPI | Use Case | File Size | Quality |
|-----|----------|-----------|---------|
| 96  | Quick previews, small screens | Small | Basic |
| 150 | **Standard presentations** (recommended) | Medium | Good |
| 200 | High-quality displays, large screens | Large | Great |
| 300 | Professional presentations, archival | Very Large | Excellent |

**Recommendation**: Start with 150 DPI. Increase to 200-300 DPI only if you notice quality issues on your display.

## Import Progress

During import, you'll see:

- **Current slide number** being processed
- **Total slides** to import
- **Progress bar** showing completion percentage
- **Status message** describing current operation

For PowerPoint imports, you'll see two phases:
1. Converting PowerPoint to PDF
2. Converting PDF pages to images

## Troubleshooting

### "LibreOffice is required for PowerPoint import"

**Solution**: Install LibreOffice:
1. Visit [libreoffice.org](https://www.libreoffice.org/)
2. Download the installer for your operating system
3. Install LibreOffice
4. Restart HarmonySync
5. Try importing again

### "Invalid PDF file"

**Causes**:
- File is corrupted
- File is password-protected
- File is not a valid PDF

**Solution**:
- Try opening the PDF in a PDF reader to verify it works
- Remove password protection if present
- Re-export the PDF from the source application

### "No slides were imported"

**Causes**:
- Selected folder contains no compatible files
- All files failed to import
- File permissions issue

**Solution**:
- Check that the folder contains .pdf, .pptx, or .ppt files
- Ensure you have read permissions for the files
- Try importing a single known-good file first

### Import is slow

**Causes**:
- High DPI setting (200-300)
- Large files with many pages/slides
- System resources

**Solutions**:
- Use 150 DPI for faster imports
- Close other applications to free up memory
- Import large presentations in smaller batches

### Slides appear blurry on display

**Causes**:
- DPI too low for your screen resolution
- Source file has low resolution

**Solutions**:
- Re-import with higher DPI (200-300)
- Use a higher-resolution source file
- Check your display output resolution settings

## File Validation

Before importing, HarmonySync validates files:

- **File exists**: Checks if the file is accessible
- **File type**: Verifies the file extension
- **File integrity**: Attempts to read the file structure
- **File size**: Ensures the file is not empty

Invalid files will show an error message and won't be imported.

## Imported Slide Metadata

Each imported slide includes:

- **Source type**: PDF, PowerPoint, or folder
- **Original file path**: Reference to the source file
- **Page/slide number**: Position in the original document
- **Dimensions**: 1920x1080 (Full HD)
- **Format**: PNG or JPEG based on your selection

## Performance Considerations

### Memory Usage

- **During import**: 50-150 MB (temporary)
- **After import**: Memory is reclaimed
- **Per slide**: ~1-5 MB depending on DPI and format

### Import Speed

Approximate times (150 DPI, medium-power laptop):

- **PDF (10 pages)**: 10-20 seconds
- **PowerPoint (10 slides)**: 30-45 seconds
- **Folder (5 files, 50 total slides)**: 2-3 minutes

PowerPoint imports take longer due to the conversion step.

## Keyboard Shortcuts

While the import dialog is open:

- **Escape**: Close the dialog (if not importing)
- **Enter**: Start import (when file is selected)

## Integration with Existing Slides

Imported slides are added to the end of your current slide list. You can:

- Drag and drop to reorder slides
- Mix imported slides with video and text slides
- Delete slides you don't need
- Display slides on audience and confidence monitors

## Advanced Usage

### Custom Background Images

After importing text slides, you can:

1. Select the imported slide
2. Edit the slide properties
3. Add a custom background image
4. Adjust text styling

### Batch Processing

For large presentations:

1. Split your presentation into sections
2. Import each section separately
3. Organize slides by dragging between sections
4. Save time by importing only what you need

## Limitations

- **PowerPoint animations**: Converted to static images
- **Embedded videos**: Not preserved (import separately)
- **Slide transitions**: Not supported
- **Speaker notes**: Not imported
- **Linked files**: External resources not included

## Future Enhancements

Planned features for future releases:

- Google Slides direct import (API integration)
- Keynote support (macOS)
- Speaker notes import
- Slide editing and annotation
- Cloud storage integration (Dropbox, OneDrive)

## Support

If you encounter issues:

1. Check this documentation for troubleshooting tips
2. Verify your file is compatible and accessible
3. Ensure LibreOffice is installed (for PowerPoint)
4. Try importing a simple test file first
5. Report persistent issues with sample files

---

*Last updated: January 2026*  
*Feature version: 1.0.0*
