/**
 * Lorem Ipsum Generator — text generation utility
 */

// ---- Types ----

export type LoremMode = 'paragraphs' | 'sentences' | 'words' | 'lists' | 'html' | 'markdown';

export type ListStyle = 'markdown-unordered' | 'plain-unordered' | 'plain-ordered' | 'html';

export type HtmlWrapper = 'none' | 'div' | 'article' | 'section';

export type LineBreakStyle = 'single' | 'double';

export interface LoremGeneratorOptions {
  mode: LoremMode;
  count: number;
  startClassic: boolean;
  capitalizeSentences: boolean;
  includePunctuation: boolean;
  minWordsPerSentence: number;
  maxWordsPerSentence: number;
  minSentencesPerParagraph: number;
  maxSentencesPerParagraph: number;
  listStyle: ListStyle;
  htmlWrapper: HtmlWrapper;
  lineBreakStyle: LineBreakStyle;
}

export interface LoremOutput {
  text: string;
  wordCount: number;
  characterCount: number;
  paragraphCount?: number;
  sentenceCount?: number;
  estimatedReadingMinutes: number;
}

// ---- Constants ----

// Classic lorem ipsum vocabulary
const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'pellentesque', 'habitant',
  'morbi', 'tristique', 'senectus', 'netus', 'malesuada', 'fames', 'turpis',
  'egestas', 'proin', 'sagittis', 'nisl', 'rhoncus', 'mattis', 'massa', 'vitae',
  'tortor', 'condimentum', 'lacinia', 'quis', 'vel', 'eros', 'donec', 'odio',
  'quisque', 'fermentum', 'viverra', 'na', 'cubilia', 'curae', 'nulla', 'diam',
  'duis', 'biandit', 'tincidunt', 'interdum', 'mauris', 'lacinia', 'ornare',
  'lectus', 'sit', 'amet', 'libero', 'nunc', 'aliquet', 'bibendum', 'enim',
  'facilisis', 'gravida', 'neque', 'convallis', 'a', 'crs', 'metus', 'vulputate',
  'eu', 'sapien', 'pretium', 'quis', 'lectus', 'suspendisse', 'potenti',
  'massa', 'ac', 'feugiat', 'litora', 'blandit', 'donec', 'porta', 'vitae',
  'augue', 'neque', 'vestibulum', 'ante', 'ipsum', 'primis', 'faucibus',
  'orci', 'luctus', 'et', 'ultrices', 'posuere', 'cubilia', 'curae', 'morbi',
  'leo', 'volutpat', 'odio', 'mattis', 'nibh', 'enim', 'pellentesque',
  'finibus', 'risus', 'ante', 'quis', 'faucibus', 'ligula', 'molestie',
  'augue', 'praesent', 'blandit', 'laoreet', 'ac', 'dolor', 'morbi', 'quis',
  'tellus', 'eget', 'orci', 'varius', 'natoque', 'penatibus', 'magnis',
  'dis', 'parturient', 'montes', 'nascetur', 'ridiculus', 'mus', 'vivamus',
  'bibendum', 'vestibulum', 'quam', 'lobortis', 'nibh', 'tincidunt',
  'sapien', 'cras', 'eget', 'arcu', 'nisi', 'ornare', 'iaculis', 'risus',
  'phasellus', 'vulputate', 'massa', 'sed', 'aliquam', 'lacinia', 'odio',
  'sed', 'blandit', 'massa', 'nunc', 'fermentum', 'justo', 'nec', 'faucibus',
  'arcu', 'vestibulum', 'ante', 'morbi', 'imperdiet', 'finibus', 'fermentum',
];

const CLASSIC_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

// Punctuation sets
const SENTENCE_ENDINGS = ['.', '.', '.', '.', '!', '?'];
const BETWEEN_SENTENCES = ' ';

// ---- Helper Functions ----

/**
 * Seeded pseudo-random number generator for deterministic output
 * Uses a simple mulberry32 PRNG
 */
function createRng(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get a random integer between min (inclusive) and max (inclusive)
 */
function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array
 */
function pickRandom<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate a single lorem ipsum word
 */
function getWord(rng: () => number): string {
  return pickRandom(rng, LOREM_WORDS);
}

/**
 * Capitalize the first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate words count
 */
function generateWords(rng: () => number, count: number, startClassic: boolean): string[] {
  const words: string[] = [];

  if (startClassic && count >= 4) {
    // Start with classic "Lorem ipsum dolor sit amet"
    const classic = CLASSIC_START.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    words.push(...classic.slice(0, 4));
  }

  while (words.length < count) {
    words.push(getWord(rng));
  }

  return words.slice(0, count);
}

/**
 * Generate a single sentence
 */
function generateSentence(
  rng: () => number,
  minWords: number,
  maxWords: number,
  shouldCapitalize: boolean,
  includePunctuation: boolean
): string {
  const wordCount = randomInt(rng, minWords, maxWords);
  const words: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    words.push(getWord(rng));
  }

  let sentence = words.join(' ');

  if (shouldCapitalize) {
    sentence = capitalize(sentence);
  }

  if (includePunctuation) {
    sentence += pickRandom(rng, SENTENCE_ENDINGS);
  }

  return sentence;
}

/**
 * Generate multiple sentences
 */
function generateSentences(
  rng: () => number,
  count: number,
  minWords: number,
  maxWords: number,
  capitalizeSentences: boolean,
  includePunctuation: boolean,
  startClassic: boolean
): string[] {
  const sentences: string[] = [];

  if (startClassic && count >= 1) {
    sentences.push(CLASSIC_START);
  }

  while (sentences.length < count) {
    const needsCap = sentences.length === 0 && !startClassic;
    const sentence = generateSentence(
      rng,
      minWords,
      maxWords,
      needsCap || capitalizeSentences,
      includePunctuation
    );
    sentences.push(sentence);
  }

  return sentences.slice(0, count);
}

// ---- Main Generator ----

/**
 * Generate lorem ipsum text based on options
 */
export function generateLoremIpsum(options: LoremGeneratorOptions): LoremOutput {
  const {
    mode,
    count,
    startClassic,
    capitalizeSentences,
    includePunctuation,
    minWordsPerSentence,
    maxWordsPerSentence,
    minSentencesPerParagraph,
    maxSentencesPerParagraph,
    listStyle,
    htmlWrapper,
    lineBreakStyle,
  } = options;

  // Create a seed based on options for semi-deterministic output
  const seed = count * 1000 + mode.charCodeAt(0) * 100 + (startClassic ? 1 : 0);
  const rng = createRng(seed);

  const lineBreak = lineBreakStyle === 'double' ? '\n\n' : '\n';
  let text = '';
  let paragraphCount = 0;
  let sentenceCount = 0;

  switch (mode) {
    case 'words': {
      const words = generateWords(rng, count, startClassic);
      text = words.join(' ');
      if (includePunctuation && words.length > 0) {
        // Add period at end
        text += '.';
      }
      break;
    }

    case 'sentences': {
      const sentences = generateSentences(
        rng,
        count,
        minWordsPerSentence,
        maxWordsPerSentence,
        capitalizeSentences,
        includePunctuation,
        startClassic
      );
      text = sentences.join(BETWEEN_SENTENCES);
      sentenceCount = sentences.length;
      break;
    }

    case 'paragraphs': {
      const paragraphs: string[] = [];
      for (let p = 0; p < count; p++) {
        const sentenceCountInPara = randomInt(
          rng,
          minSentencesPerParagraph,
          maxSentencesPerParagraph
        );
        const sentences = generateSentences(
          rng,
          sentenceCountInPara,
          minWordsPerSentence,
          maxWordsPerSentence,
          capitalizeSentences,
          includePunctuation,
          p === 0 && startClassic
        );
        paragraphs.push(sentences.join(BETWEEN_SENTENCES));
        sentenceCount += sentences.length;
      }
      text = paragraphs.join(lineBreak);
      paragraphCount = paragraphs.length;
      break;
    }

    case 'lists': {
      const items: string[] = [];
      for (let i = 0; i < count; i++) {
        const wordCount = randomInt(rng, minWordsPerSentence, maxWordsPerSentence);
        const words = generateWords(rng, wordCount, false);
        let itemText = words.join(' ');
        if (capitalizeSentences) {
          itemText = capitalize(itemText);
        }
        if (includePunctuation) {
          itemText += pickRandom(rng, SENTENCE_ENDINGS);
        }
        items.push(itemText);
      }

      switch (listStyle) {
        case 'markdown-unordered':
          text = items.map((item) => `- ${item}`).join(lineBreak);
          break;
        case 'plain-unordered':
          text = items.map((item) => `• ${item}`).join(lineBreak);
          break;
        case 'plain-ordered':
          text = items.map((item, i) => `${i + 1}. ${item}`).join(lineBreak);
          break;
        case 'html':
          text = `<ul>\n${items.map((item) => `  <li>${item}</li>`).join('\n')}\n</ul>`;
          break;
      }
      break;
    }

    case 'html': {
      const paragraphs: string[] = [];
      for (let p = 0; p < count; p++) {
        const sentenceCountInPara = randomInt(
          rng,
          minSentencesPerParagraph,
          maxSentencesPerParagraph
        );
        const sentences = generateSentences(
          rng,
          sentenceCountInPara,
          minWordsPerSentence,
          maxWordsPerSentence,
          capitalizeSentences,
          includePunctuation,
          p === 0 && startClassic
        );
        paragraphs.push(sentences.join(BETWEEN_SENTENCES));
        sentenceCount += sentences.length;
      }

      if (htmlWrapper === 'none') {
        text = paragraphs.map((p) => `<p>${p}</p>`).join('\n');
      } else {
        const wrapper = `<${htmlWrapper}>`;
        const closing = `</${htmlWrapper}>`;
        text = `${wrapper}\n${paragraphs.map((p) => `  <p>${p}</p>`).join('\n')}\n${closing}`;
      }
      paragraphCount = paragraphs.length;
      break;
    }

    case 'markdown': {
      const paragraphs: string[] = [];
      for (let p = 0; p < count; p++) {
        const sentenceCountInPara = randomInt(
          rng,
          minSentencesPerParagraph,
          maxSentencesPerParagraph
        );
        const sentences = generateSentences(
          rng,
          sentenceCountInPara,
          minWordsPerSentence,
          maxWordsPerSentence,
          capitalizeSentences,
          includePunctuation,
          p === 0 && startClassic
        );
        paragraphs.push(sentences.join(BETWEEN_SENTENCES));
        sentenceCount += sentences.length;
      }
      text = paragraphs.join(lineBreak);
      paragraphCount = paragraphs.length;
      break;
    }
  }

  // Calculate stats
  const wordCount = text
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags for word count
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const characterCount = text.length;

  // Average reading speed: ~200 words per minute
  const estimatedReadingMinutes = wordCount / 200;

  return {
    text,
    wordCount,
    characterCount,
    paragraphCount: paragraphCount || undefined,
    sentenceCount: sentenceCount || undefined,
    estimatedReadingMinutes: Math.round(estimatedReadingMinutes * 10) / 10,
  };
}

// ---- Default Options ----

export const DEFAULT_LOREM_OPTIONS: LoremGeneratorOptions = {
  mode: 'paragraphs',
  count: 3,
  startClassic: true,
  capitalizeSentences: true,
  includePunctuation: true,
  minWordsPerSentence: 8,
  maxWordsPerSentence: 15,
  minSentencesPerParagraph: 3,
  maxSentencesPerParagraph: 8,
  listStyle: 'markdown-unordered',
  htmlWrapper: 'div',
  lineBreakStyle: 'double',
};

// ---- Presets ----

export interface LoremPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<LoremGeneratorOptions>;
}

export const LOREM_PRESETS: LoremPreset[] = [
  {
    id: '3-paragraphs',
    name: '3 Paragraphs',
    description: 'Classic 3-paragraph lorem ipsum',
    options: { mode: 'paragraphs', count: 3, startClassic: true },
  },
  {
    id: '5-paragraphs',
    name: '5 Paragraphs',
    description: 'Five paragraphs of placeholder text',
    options: { mode: 'paragraphs', count: 5, startClassic: true },
  },
  {
    id: '10-sentences',
    name: '10 Sentences',
    description: 'Ten individual sentences',
    options: { mode: 'sentences', count: 10, startClassic: true },
  },
  {
    id: '50-words',
    name: '50 Words',
    description: 'Fifty random words',
    options: { mode: 'words', count: 50, startClassic: true },
  },
  {
    id: 'hero-body',
    name: 'Hero + Body Mockup',
    description: 'A heading-like line plus 2-3 paragraphs',
    options: { mode: 'paragraphs', count: 3, startClassic: false, minSentencesPerParagraph: 1, maxSentencesPerParagraph: 2 },
  },
  {
    id: 'article',
    name: 'Article Mockup',
    description: 'Title line and several paragraphs',
    options: { mode: 'paragraphs', count: 5, startClassic: true, minSentencesPerParagraph: 4, maxSentencesPerParagraph: 7 },
  },
  {
    id: 'bullet-list',
    name: 'Bullet List Mockup',
    description: 'A bullet list with multiple items',
    options: { mode: 'lists', count: 6, listStyle: 'markdown-unordered', startClassic: false },
  },
];

// ---- Validation Helpers ----

export function validateAndClampOptions(opts: Partial<LoremGeneratorOptions>): LoremGeneratorOptions {
  const defaults = { ...DEFAULT_LOREM_OPTIONS };

  const count = clamp(opts.count ?? defaults.count, 1, 1000);
  const minWordsPerSentence = clamp(opts.minWordsPerSentence ?? defaults.minWordsPerSentence, 1, 50);
  const maxWordsPerSentence = clamp(opts.maxWordsPerSentence ?? defaults.maxWordsPerSentence, minWordsPerSentence, 100);
  const minSentencesPerParagraph = clamp(opts.minSentencesPerParagraph ?? defaults.minSentencesPerParagraph, 1, 20);
  const maxSentencesPerParagraph = clamp(opts.maxSentencesPerParagraph ?? defaults.maxSentencesPerParagraph, minSentencesPerParagraph, 30);

  return {
    ...defaults,
    ...opts,
    count,
    minWordsPerSentence,
    maxWordsPerSentence,
    minSentencesPerParagraph,
    maxSentencesPerParagraph,
  };
}
