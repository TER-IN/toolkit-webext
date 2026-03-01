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
