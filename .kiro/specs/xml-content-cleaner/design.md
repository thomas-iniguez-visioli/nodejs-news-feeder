# Design Document

## Overview

The XML content cleaner is a utility function that sanitizes text content to ensure XML compatibility. It will replace the current incomplete `cleancontent` function in `utils/index.js` with a comprehensive solution that handles various edge cases and provides configurable cleaning options.

The function will be designed as a pure function that takes a string input and optional configuration, returning a cleaned string that is safe for XML inclusion.

## Architecture

The cleaner will follow a pipeline architecture where the input text goes through multiple cleaning stages:

```
Input Text → Validation → Character Escaping → Formatting → Output
```

### Core Components

1. **Input Validator**: Handles null/undefined inputs and type conversion
2. **XML Character Escaper**: Escapes XML special characters (&, <, >, ", ')
3. **HTML Handler**: Strips or escapes HTML tags based on configuration
4. **Whitespace Normalizer**: Handles line endings and whitespace normalization
5. **Control Character Filter**: Removes problematic control characters

## Components and Interfaces

### Main Function Interface

```javascript
function cleancontent(text, options = {})
```

**Parameters:**
- `text` (string|any): The content to clean
- `options` (object): Configuration options

**Options Object:**
```javascript
{
  stripHtml: boolean = true,           // Strip HTML tags vs escape them
  normalizeWhitespace: boolean = true, // Normalize multiple spaces
  preserveLineBreaks: boolean = false, // Keep line breaks vs remove them
  maxLength: number = null,            // Truncate if longer than this
  encoding: string = 'utf8'            // Handle encoding normalization
}
```

**Returns:** Clean XML-safe string

### Internal Helper Functions

```javascript
// Core cleaning functions
function escapeXmlCharacters(text)
function stripHtmlTags(text)
function escapeHtmlTags(text)
function normalizeLineEndings(text)
function normalizeWhitespace(text)
function removeControlCharacters(text)
function validateAndConvertInput(input)
```

## Data Models

### Configuration Schema

```javascript
const defaultOptions = {
  stripHtml: true,
  normalizeWhitespace: true,
  preserveLineBreaks: false,
  maxLength: null,
  encoding: 'utf8'
}
```

### Character Mapping

```javascript
const xmlEscapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
}
```

## Error Handling

### Input Validation
- Null/undefined inputs return empty string
- Non-string inputs are converted using `String()` constructor
- Circular references are handled gracefully

### Character Handling
- Invalid UTF-8 sequences are replaced with replacement character
- Control characters (except tab, newline, carriage return) are removed
- Unsupported characters are either removed or replaced based on configuration

### Performance Considerations
- Large strings are processed in chunks if needed
- Regular expressions are compiled once and reused
- Early returns for empty or whitespace-only strings

## Testing Strategy

### Unit Tests
- Test each helper function independently
- Test various input types (string, number, object, null, undefined)
- Test edge cases (empty strings, very long strings, special characters)
- Test configuration options combinations

### Integration Tests
- Test with real RSS feed content
- Test with existing `composeFeedItem` function
- Verify XML validity of output

### Performance Tests
- Benchmark with large text inputs
- Memory usage testing with various input sizes
- Comparison with current basic cleaning approach

## Implementation Details

### Processing Pipeline

1. **Input Validation**
   - Check for null/undefined → return empty string
   - Convert non-strings to string representation
   - Handle circular references safely

2. **Character Escaping**
   - Apply XML character escaping using character map
   - Handle HTML entities if present

3. **HTML Processing**
   - Strip HTML tags if `stripHtml: true`
   - Escape HTML tags if `stripHtml: false`

4. **Whitespace Normalization**
   - Normalize line endings (\r\n → \n)
   - Collapse multiple whitespace if `normalizeWhitespace: true`
   - Preserve or remove line breaks based on `preserveLineBreaks`

5. **Final Cleanup**
   - Trim leading/trailing whitespace
   - Remove control characters
   - Apply length limit if specified

### Integration with Existing Code

The function will replace the empty `cleancontent` function and can be used to improve the current `composeFeedItem` function:

```javascript
// Current approach in composeFeedItem:
title.replace("\r\n","").replaceAll("&","").replaceAll("<br>","")

// New approach:
cleancontent(title, { stripHtml: true, preserveLineBreaks: false })
```

### Performance Optimizations

- Use single-pass processing where possible
- Compile regular expressions once
- Early exit for empty/whitespace-only content
- Efficient string building for large inputs