/**
 * Word wrapping for plain text interfaces.
 *
 * The wrapper keeps explicit line breaks and splits words that do not fit in a
 * single line, so callers always receive lines that fit in `width`.
 */

/**
 * Wraps `text` into lines of at most `width` characters.
 *
 * @param text Text to wrap. Explicit `\n` characters start a new line.
 * @param width Maximum number of characters per line (must be at least 1).
 * @returns The wrapped lines. An empty input returns an empty array.
 * @throws {RangeError} When `width` is not a positive integer.
 *
 * @example
 * ```ts
 * wrapText("hello world", 5); // ["hello", "world"]
 * ```
 */
export function wrapText(text: string, width: number): string[] {
    if (!Number.isInteger(width) || width < 1) {
        throw new RangeError("The wrap width must be a positive integer.");
    }
    if (text.length === 0) {
        return [];
    }

    const lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/)) {
        lines.push(...wrapParagraph(paragraph, width));
    }
    return lines;
}

/** Wraps a single paragraph, which contains no line breaks. */
function wrapParagraph(paragraph: string, width: number): string[] {
    if (paragraph.trim().length === 0) {
        return [""];
    }

    const lines: string[] = [];
    let currentLine = "";

    for (const word of paragraph.split(/\s+/)) {
        if (word.length === 0) {
            continue;
        }

        const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
        if (candidate.length <= width) {
            currentLine = candidate;
            continue;
        }

        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        for (const piece of splitLongWord(word, width)) {
            lines.push(piece);
        }
        currentLine = lines.pop() ?? "";
    }

    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    return lines;
}

/**
 * Splits a word into chunks of `width` characters. The final chunk is returned
 * last and is meant to continue on the current line.
 */
function splitLongWord(word: string, width: number): string[] {
    if (word.length <= width) {
        return [word];
    }

    const chunks: string[] = [];
    for (let index = 0; index < word.length; index += width) {
        chunks.push(word.slice(index, index + width));
    }
    return chunks;
}
