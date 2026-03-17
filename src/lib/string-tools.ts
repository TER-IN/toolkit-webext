// ============================================
// TERIN Toolkit — String Tool Utilities
// ============================================
// Pure-function implementations for all string transformation tools.
// Used by both the Command Palette (content script) and Dashboard pages.

/**
 * Returns the length of a string.
 */
export function getStringLength(s: string): number {
    return s.length;
}

/**
 * Converts a string to UPPER CASE.
 */
export function toUpperCase(s: string): string {
    return s.toUpperCase();
}

/**
 * Converts a string to lower case.
 */
export function toLowerCase(s: string): string {
    return s.toLowerCase();
}

/**
 * Converts a string to Title Case.
 * Capitalises the first letter of every word (whitespace-delimited).
 */
export function toTitleCase(s: string): string {
    return s.replace(
        /\w\S*/g,
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    );
}

/**
 * Converts a string to Sentence case.
 * Capitalises the first letter after sentence-ending punctuation (.!?)
 * or at the very start of the string.
 */
export function toSentenceCase(s: string): string {
    // Lower-case everything first, then capitalise first letter of each sentence
    const lower = s.toLowerCase();
    return lower.replace(/(^\s*\w|[.!?]\s+\w)/g, (match) => match.toUpperCase());
}

/**
 * Removes diacritical marks (accents) from a string.
 * e.g. "café" → "cafe", "über" → "uber"
 */
export function removeAccents(s: string): string {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Removes extra whitespace from a string:
 * - Collapses multiple consecutive spaces/tabs into a single space
 * - Trims leading and trailing whitespace
 */
export function removeExtraSpaces(s: string): string {
    return s.replace(/\s+/g, " ").trim();
}

/**
 * Converts each character of a string to its 8-bit binary representation.
 * Characters are space-separated.
 * For multi-byte (UTF-8) characters, each byte is represented separately.
 */
export function stringToBinary(s: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(s);
    return Array.from(bytes)
        .map((byte) => byte.toString(2).padStart(8, "0"))
        .join(" ");
}

/**
 * Converts a space-separated binary string back to a text string.
 * Each group should be an 8-bit binary number.
 */
export function binaryToString(s: string): string {
    const trimmed = s.trim();
    if (!trimmed) return "";

    const groups = trimmed.split(/\s+/);
    const bytes = new Uint8Array(
        groups.map((group) => {
            const num = parseInt(group, 2);
            if (isNaN(num) || num < 0 || num > 255) {
                throw new Error(`Invalid binary group: "${group}"`);
            }
            return num;
        }),
    );

    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

/**
 * Base64-encodes a string (UTF-8 safe).
 */
export function base64Encode(s: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(s);
    // Convert Uint8Array to a binary string for btoa
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Base64-decodes a string back to UTF-8 text.
 * Throws if the input is not valid Base64.
 */
export function base64Decode(s: string): string {
    const binary = atob(s); // throws on invalid base64
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

/**
 * URL-encodes a string using percent-encoding.
 * Handles UTF-8 characters correctly.
 */
export function urlEncode(s: string): string {
    return encodeURIComponent(s);
}

/**
 * Decodes a URL-encoded (percent-encoded) string.
 * Throws if the input contains invalid percent-encoding.
 */
export function urlDecode(s: string): string {
    return decodeURIComponent(s);
}

// ============================================
// Text and Lists Tools (New Tools)
// ============================================

export function reverseList(s: string): string {
    if (!s) return "";
    return s.split('\n').reverse().join('\n');
}

export function randomizeList(s: string): string {
    if (!s) return "";
    const lines = s.split('\n');
    for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lines[i], lines[j]] = [lines[j], lines[i]];
    }
    return lines.join('\n');
}

export function sortList(s: string): string {
    if (!s) return "";
    return s.split('\n').sort().join('\n');
}

export function addTextToEachLine(s: string, prefix: string = '', suffix: string = ''): string {
    if (!s) return "";
    return s.split('\n').map(line => `${prefix}${line}${suffix}`).join('\n');
}

export function convertTabsToSpaces(s: string, spacesCount: number = 4): string {
    const spaces = ' '.repeat(Math.max(0, spacesCount));
    return s.replace(/\t/g, spaces);
}

export function convertSpacesToTabs(s: string, spacesCount: number = 4): string {
    if (spacesCount <= 0) return s;
    const spaces = ' '.repeat(spacesCount);
    return s.replace(new RegExp(spaces, 'g'), '\t');
}

export function removeLineBreaks(s: string): string {
    return s.replace(/[\r\n]+/g, '');
}

export function removeEmptyLines(s: string): string {
    if (!s) return "";
    return s.split('\n').filter(line => line.trim().length > 0).join('\n');
}

export function countLines(s: string): number {
    if (!s) return 0;
    return s.split('\n').length;
}

export function filterLines(s: string, search: string = '', matchMode: 'contains' | 'not_contains' = 'contains', caseSensitive: boolean = false): string {
    if (!s || !search) return s;
    const query = caseSensitive ? search : search.toLowerCase();
    
    return s.split('\n').filter(line => {
        const target = caseSensitive ? line : line.toLowerCase();
        const hasMatch = target.includes(query);
        return matchMode === 'contains' ? hasMatch : !hasMatch;
    }).join('\n');
}

export function repeatText(s: string, count: number = 2, separator: string = ''): string {
    if (count <= 0) return '';
    return Array(Math.max(0, count)).fill(s).join(separator);
}

export function findAndReplace(s: string, find: string = '', replace: string = '', useRegex: boolean = false, caseSensitive: boolean = false): string {
    if (!find) return s;
    
    if (useRegex) {
        try {
            const flags = caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(find, flags);
            return s.replace(regex, replace);
        } catch (e) {
            throw new Error(`Invalid regex: ${find}`);
        }
    } else {
        if (caseSensitive) {
            return s.split(find).join(replace);
        } else {
            const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedFind, 'gi');
            return s.replace(regex, replace);
        }
    }
}

export function countWords(s: string): number {
    const trimmed = s.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

export function countLetters(s: string): number {
    const letters = s.match(/[a-zA-Z^\u00C0-\u017F]/g); // basic support for accented letters
    return letters ? letters.length : 0;
}

export function removeDuplicateLines(s: string): string {
    if (!s) return "";
    return Array.from(new Set(s.split('\n'))).join('\n');
}

