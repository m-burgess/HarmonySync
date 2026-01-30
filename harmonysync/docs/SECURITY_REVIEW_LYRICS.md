# Security Review for Lyrics Fetching Feature

## Review Date
$(date)

## Areas Reviewed

### 1. External API Calls
- **Genius API Integration**: Uses HTTPS for all requests
- **URL Encoding**: Properly encodes user input using urlencoding crate
- **Timeout**: 30-second timeout prevents hanging requests
- **Error Handling**: All API errors are caught and reported

### 2. User Input Validation
- **Song Title**: Trimmed and validated before use
- **Artist Name**: Optional, trimmed if provided
- **Path Traversal**: Folder paths come from file system, not user input
- **XSS Prevention**: React handles all rendering, no dangerouslySetInnerHTML

### 3. File System Operations
- **Write Operations**: Uses Node.js fs API with proper error handling
- **Path Construction**: Uses Node.js path module for safe path manipulation
- **No Directory Traversal**: Paths are constructed from validated folder paths
- **Permissions**: Uses default file permissions

### 4. HTML Parsing/Scraping
- **No External Parser**: Uses simple string operations
- **No Code Execution**: Only extracts text content
- **Entity Decoding**: Limited to common HTML entities
- **No Script Execution**: Text-only extraction

### 5. Dependencies
- **urlencoding 2.1.0**: No known vulnerabilities
- **reqwest**: Already used in project, maintained library
- **anyhow**: Error handling only, no security concerns

## Identified Concerns

### Low Risk
1. **Web Scraping Fragility**: If Genius changes HTML structure, extraction may fail
   - Impact: Feature stops working
   - Mitigation: Graceful error handling, user can manually create lyrics.txt

2. **Rate Limiting**: No client-side rate limit tracking
   - Impact: Could hit Genius API limits
   - Mitigation: Genius enforces server-side limits, user gets clear error

### No Risk Found
- Input sanitization is proper
- No SQL injection vectors
- No command injection vectors
- No file path traversal
- No XSS vulnerabilities
- Proper memory and resource management

## Recommendations

### Implemented
✅ Proper error handling for all operations
✅ Timeout on HTTP requests
✅ URL encoding of user input
✅ No execution of fetched content
✅ Clear user feedback on errors

### Future Enhancements
- Add client-side rate limit tracking
- Consider using a proper HTML parser (e.g., scraper crate)
- Add retry logic with exponential backoff
- Cache fetched lyrics to reduce API calls

## Conclusion
The lyrics fetching feature is secure for production use. All user inputs are properly validated and sanitized. External API calls are protected with timeouts and error handling. File system operations are safe and use validated paths.
