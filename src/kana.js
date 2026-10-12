import { toKatakana, toRomaji } from 'wanakana';

const definitions = [
  ['basic', 'Vowels', 'あいうえお'],
  ['basic', 'K', 'かきくけこ'],
  ['basic', 'S', 'さしすせそ'],
  ['basic', 'T', 'たちつてと'],
  ['basic', 'N', 'なにぬねの'],
  ['basic', 'H', 'はひふへほ'],
  ['basic', 'M', 'まみむめも'],
  ['basic', 'Y', 'や ゆ よ'],
  ['basic', 'R', 'らりるれろ'],
  ['basic', 'W', 'わ   を'],
  ['basic', 'N (final)', 'ん'],
  ['voiced', 'G', 'がぎぐげご'],
  ['voiced', 'Z', 'ざじずぜぞ'],
  ['voiced', 'D', 'だぢづでど'],
  ['voiced', 'B', 'ばびぶべぼ'],
  ['voiced', 'P', 'ぱぴぷぺぽ'],
  ...['き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'び', 'ぴ'].map((prefix) => [
    'combination', toRomaji(prefix).toUpperCase(), ['ゃ', 'ゅ', 'ょ'].map((suffix) => prefix + suffix),
  ]),
];

export const rows = definitions.map(([group, label, symbols]) => ({
  group,
  label,
  items: (Array.isArray(symbols) ? symbols : [...symbols]).map((hiragana) => {
    if (hiragana === ' ') return null;
    const romaji = hiragana === 'ぢ' ? 'ji' : hiragana === 'づ' ? 'zu' : toRomaji(hiragana);
    return { id: hiragana, hiragana, katakana: toKatakana(hiragana), romaji, group, row: label };
  }),
}));

export const kana = rows.flatMap((row) => row.items.filter(Boolean));
export const basicIds = kana.filter((item) => item.group === 'basic').map((item) => item.id);

export function getPool(selected, script = 'hiragana') {
  const scripts = script === 'both' ? ['hiragana', 'katakana'] : [script];
  if (scripts.some((value) => !['hiragana', 'katakana'].includes(value))) return [];
  return kana.filter((item) => selected.includes(item.id)).flatMap((item) =>
    scripts.map((alphabet) => ({ ...item, symbol: item[alphabet], script: alphabet, key: `${alphabet}-${item.id}` })),
  );
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createQuiz(pool, count = 10, random = Math.random) {
  if (!pool.length) return [];
  const questions = [];
  while (questions.length < count) questions.push(...shuffle(pool, random));
  return questions.slice(0, count).map((item) => {
    const selectedAnswers = [...new Set(pool.map((entry) => entry.romaji))];
    const candidates = selectedAnswers.length >= 4 ? selectedAnswers : [...new Set([...selectedAnswers, ...kana.map((entry) => entry.romaji)])];
    const distractors = candidates.filter((answer) => answer !== item.romaji);
    return { ...item, options: shuffle([item.romaji, ...shuffle(distractors, random).slice(0, 3)], random) };
  });
}

export function isCorrect(answer, question) {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === question.romaji) return true;
  return toKatakana(normalized) === question.katakana;
}