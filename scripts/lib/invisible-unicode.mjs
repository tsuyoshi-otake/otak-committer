/**
 * Shared detector for invisible and display-spoofing Unicode code points.
 *
 * This dependency-free ESM module is the single source of truth for the
 * ESLint rule and the repository/artifact scanner, both of which run before
 * TypeScript compilation.
 */

export const INVISIBLE_CATEGORIES = Object.freeze([
    {
        id: 'tag',
        label: 'Unicode tag character',
        start: 0xe0000,
        end: 0xe007f,
        reason: 'Invisible tag characters can carry a hidden payload (GlassWorm).',
    },
    {
        id: 'special-purpose-unassigned',
        label: 'unassigned special-purpose plane code point',
        start: 0xe0080,
        end: 0xe00ff,
        reason: 'Unassigned plane-14 code points render as nothing and can carry a payload.',
    },
    {
        id: 'variation-selector-supplement',
        label: 'variation selector supplement',
        start: 0xe0100,
        end: 0xe01ef,
        reason: 'Variation selectors encode arbitrary bytes invisibly (GlassWorm).',
    },
    {
        id: 'special-purpose-unassigned',
        label: 'unassigned special-purpose plane code point',
        start: 0xe01f0,
        end: 0xe0fff,
        reason: 'Unassigned plane-14 code points render as nothing and can carry a payload.',
    },
    {
        id: 'variation-selector',
        label: 'variation selector',
        start: 0xfe00,
        end: 0xfe0f,
        reason: 'Variation selectors encode arbitrary bytes invisibly (GlassWorm).',
    },
    {
        id: 'bidi-control',
        label: 'bidirectional override',
        start: 0x202a,
        end: 0x202e,
        reason: 'Bidi overrides make displayed code differ from parsed code (Trojan Source).',
    },
    {
        id: 'bidi-isolate',
        label: 'bidirectional isolate',
        start: 0x2066,
        end: 0x2069,
        reason: 'Bidi isolates make displayed code differ from parsed code (Trojan Source).',
    },
    {
        id: 'directional-mark',
        label: 'directional mark',
        start: 0x200e,
        end: 0x200f,
        reason: 'Invisible directional marks can reorder displayed text.',
    },
    {
        id: 'arabic-letter-mark',
        label: 'Arabic letter mark',
        start: 0x061c,
        end: 0x061c,
        reason: 'Invisible directional mark; same reordering risk as U+200E/U+200F.',
    },
    {
        id: 'zero-width',
        label: 'zero-width character',
        start: 0x200b,
        end: 0x200d,
        reason: 'Zero-width characters are invisible and can hide or split identifiers.',
    },
    {
        id: 'invisible-operator',
        label: 'invisible operator / word joiner',
        start: 0x2060,
        end: 0x2064,
        reason: 'Invisible formatting characters with no legitimate use in sources.',
    },
    {
        id: 'deprecated-format',
        label: 'deprecated format character',
        start: 0x206a,
        end: 0x206f,
        reason: 'Invisible formatting characters with no legitimate use in sources.',
    },
    {
        id: 'line-separator',
        label: 'line/paragraph separator',
        start: 0x2028,
        end: 0x2029,
        reason: 'Separators terminate lines for the parser but not for most viewers.',
    },
    {
        id: 'soft-hyphen',
        label: 'soft hyphen',
        start: 0x00ad,
        end: 0x00ad,
        reason: 'Invisible in most renderings; can hide a break inside a token.',
    },
    {
        id: 'mongolian-format',
        label: 'Mongolian format control',
        start: 0x180b,
        end: 0x180e,
        reason: 'Invisible format controls with no legitimate use in sources.',
    },
    {
        id: 'hangul-filler',
        label: 'Hangul filler',
        start: 0x115f,
        end: 0x1160,
        reason: 'Hangul fillers render as blank space and are valid identifier characters.',
    },
    {
        id: 'hangul-filler',
        label: 'Hangul filler',
        start: 0x3164,
        end: 0x3164,
        reason: 'Hangul fillers render as blank space and are valid identifier characters.',
    },
    {
        id: 'hangul-filler',
        label: 'Hangul filler',
        start: 0xffa0,
        end: 0xffa0,
        reason: 'Hangul fillers render as blank space and are valid identifier characters.',
    },
    {
        id: 'combining-grapheme-joiner',
        label: 'combining grapheme joiner',
        start: 0x034f,
        end: 0x034f,
        reason: 'An invisible combining mark that can hide inside identifiers.',
    },
    {
        id: 'khmer-inherent-vowel',
        label: 'Khmer inherent vowel',
        start: 0x17b4,
        end: 0x17b5,
        reason: 'Invisible vowel signs that can hide inside identifiers.',
    },
    {
        id: 'braille-blank',
        label: 'Braille pattern blank',
        start: 0x2800,
        end: 0x2800,
        reason: 'Renders as blank space but is not whitespace to the parser.',
    },
    {
        id: 'musical-format',
        label: 'musical symbol format control',
        start: 0x1d173,
        end: 0x1d17a,
        reason: 'Invisible format controls with no legitimate use in sources.',
    },
    {
        id: 'private-use',
        label: 'private use character',
        start: 0xe000,
        end: 0xf8ff,
        reason: 'Private use characters have no standard glyph and can carry a payload.',
    },
    {
        id: 'private-use',
        label: 'private use character',
        start: 0xf0000,
        end: 0x10ffff,
        reason: 'Private use characters have no standard glyph and can carry a payload.',
    },
    {
        id: 'interlinear-annotation',
        label: 'interlinear annotation',
        start: 0xfff9,
        end: 0xfffb,
        reason: 'Annotation controls can hide text from the reader.',
    },
    {
        id: 'byte-order-mark',
        label: 'zero-width no-break space / BOM',
        start: 0xfeff,
        end: 0xfeff,
        reason: 'A BOM anywhere but the first offset is an invisible embedded character.',
    },
    {
        id: 'c1-control',
        label: 'C1 control',
        start: 0x0080,
        end: 0x009f,
        reason: 'Non-printable control characters do not belong in sources.',
    },
    {
        id: 'c0-control',
        label: 'C0 control',
        start: 0x0000,
        end: 0x001f,
        reason: 'Non-printable control characters do not belong in sources.',
    },
    {
        id: 'delete-control',
        label: 'DEL control',
        start: 0x007f,
        end: 0x007f,
        reason: 'Non-printable control character.',
    },
]);

const ALLOWED_C0 = new Set([0x09, 0x0a, 0x0d]);
const EMOJI_BASE_PATTERN = /\p{Extended_Pictographic}/u;
const KEYCAP_BASE_PATTERN = /[0-9#*]/;

function categoryOf(codePoint) {
    return INVISIBLE_CATEGORIES.find(
        (category) => codePoint >= category.start && codePoint <= category.end,
    );
}

function isEmojiPresentationBase(codePoint) {
    if (codePoint < 0) {
        return false;
    }
    const character = String.fromCodePoint(codePoint);
    return EMOJI_BASE_PATTERN.test(character) || KEYCAP_BASE_PATTERN.test(character);
}

function isExemptOccurrence({
    codePoint,
    index,
    previousCodePoint,
    previousWasSelector,
    allowEmojiPresentation,
}) {
    if (ALLOWED_C0.has(codePoint)) {
        return true;
    }
    if (codePoint === 0xfeff) {
        return index === 0;
    }
    if ((codePoint === 0xfe0e || codePoint === 0xfe0f) && allowEmojiPresentation) {
        return !previousWasSelector && isEmojiPresentationBase(previousCodePoint);
    }
    return false;
}

/**
 * Scan text for invisible or display-spoofing code points.
 * A leading BOM and one presentation selector after an emoji/keycap base are
 * exempt. Selector runs remain findings because they can encode payload bytes.
 */
export function scanTextForInvisibleUnicode(text, options = {}) {
    const { allowEmojiPresentation = true } = options;
    const findings = [];
    let index = 0;
    let line = 1;
    let column = 1;
    let previousCodePoint = -1;
    let previousWasSelector = false;

    for (const character of text) {
        const codePoint = character.codePointAt(0) ?? 0;
        const category = categoryOf(codePoint);
        const isPresentationSelector = codePoint === 0xfe0e || codePoint === 0xfe0f;
        const exempt = isExemptOccurrence({
            codePoint,
            index,
            previousCodePoint,
            previousWasSelector,
            allowEmojiPresentation,
        });

        if (category && !exempt) {
            findings.push({
                index,
                line,
                column,
                codePoint,
                escape: formatCodePoint(codePoint),
                categoryId: category.id,
                label: category.label,
                reason: category.reason,
            });
        }

        if (character === '\n') {
            line += 1;
            column = 1;
        } else {
            column += character.length;
        }
        index += character.length;
        previousCodePoint = codePoint;
        previousWasSelector = isPresentationSelector;
    }

    return findings;
}

// \u{X} and \uXXXX escapes. A bundler such as esbuild writes non-ASCII characters in
// string literals this way, so a payload smuggled in through a dependency reaches the
// shipped bundle as escapes rather than as raw characters.
const ESCAPE_PATTERN = /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})/g;
const ALWAYS_PAYLOAD_IDS = new Set([
    'tag',
    'variation-selector-supplement',
    'special-purpose-unassigned',
]);
const SELECTOR_RUN_MINIMUM = 3;

function decodeEscapes(text) {
    const escapes = [];
    for (const match of text.matchAll(ESCAPE_PATTERN)) {
        const codePoint = parseInt(match[1] ?? match[2], 16);
        const previous = escapes[escapes.length - 1];
        const isLowSurrogateOfPrevious =
            previous !== undefined &&
            previous.end === match.index &&
            previous.codePoint >= 0xd800 &&
            previous.codePoint <= 0xdbff &&
            codePoint >= 0xdc00 &&
            codePoint <= 0xdfff;
        if (isLowSurrogateOfPrevious) {
            previous.codePoint =
                0x10000 + ((previous.codePoint - 0xd800) << 10) + (codePoint - 0xdc00);
            previous.end = match.index + match[0].length;
        } else {
            escapes.push({ index: match.index, end: match.index + match[0].length, codePoint });
        }
    }
    return escapes;
}

function lineStartsOf(text) {
    const starts = [0];
    for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) {
        starts.push(index + 1);
    }
    return starts;
}

function positionOf(lineStarts, index) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
        const middle = (low + high + 1) >> 1;
        if (lineStarts[middle] <= index) {
            low = middle;
        } else {
            high = middle - 1;
        }
    }
    return { line: low + 1, column: index - lineStarts[low] + 1 };
}

function escapedRunFindings(run, lineStarts) {
    const categories = run.map((item) => categoryOf(item.codePoint));
    const selectorCount = categories.filter(
        (category) => category?.id === 'variation-selector',
    ).length;
    const findings = [];
    run.forEach((item, position) => {
        const category = categories[position];
        const flagged =
            category !== undefined &&
            (ALWAYS_PAYLOAD_IDS.has(category.id) ||
                (category.id === 'variation-selector' && selectorCount >= SELECTOR_RUN_MINIMUM));
        if (flagged) {
            findings.push({
                index: item.index,
                ...positionOf(lineStarts, item.index),
                codePoint: item.codePoint,
                escape: formatCodePoint(item.codePoint),
                categoryId: category.id,
                label: `escaped ${category.label}`,
                reason: category.reason,
            });
        }
    });
    return findings;
}

/**
 * Scan JavaScript or JSON text for escape sequences that spell out a hidden payload.
 * Escaped tag, supplementary variation selector and unassigned plane-14 code points
 * are always findings. Escaped BMP variation selectors are findings only in a run of
 * three or more adjacent escapes, because regular expressions legitimately name single
 * selectors and ranges such as U+FE00-U+FE0F.
 */
export function scanTextForEscapedPayloads(text) {
    const lineStarts = lineStartsOf(text);
    const findings = [];
    let run = [];
    for (const item of decodeEscapes(text)) {
        if (run.length > 0 && run[run.length - 1].end !== item.index) {
            findings.push(...escapedRunFindings(run, lineStarts));
            run = [];
        }
        run.push(item);
    }
    findings.push(...escapedRunFindings(run, lineStarts));
    return findings;
}

export function formatCodePoint(codePoint) {
    return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

export function formatFinding(finding, filePath) {
    return `${filePath}:${finding.line}:${finding.column}  ${finding.escape} (${finding.label}) - ${finding.reason}`;
}
