import test from 'node:test';
import assert from 'node:assert/strict';
import { kana, basicIds, getPool, createQuiz, isCorrect } from './kana.js';

test('kana chart contains all 46 basic, 25 voiced, and 33 combined kana', () => {
  assert.equal(basicIds.length, 46);
  assert.equal(kana.filter((item) => item.group === 'voiced').length, 25);
  assert.equal(kana.filter((item) => item.group === 'combination').length, 33);
  assert.equal(new Set(kana.map((item) => item.id)).size, 104);
  assert.equal(getPool(kana.map((item) => item.id), 'both').length, 208);
});

test('questions respect the selected symbols and script', () => {
  for (const script of ['hiragana', 'katakana', 'both']) {
    const pool = getPool(['あ', 'し', 'きゃ'], script);
    const questions = createQuiz(pool, 20);
    assert.equal(questions.length, 20);
    assert.ok(questions.every((question) => pool.some((item) => item.key === question.key)));
    assert.ok(questions.every((question) => question.options.includes(question.romaji)));
    assert.ok(questions.every((question) => new Set(question.options).size === 4));
  }
});

test('empty selections do not generate questions and single selections work', () => {
  assert.deepEqual(createQuiz([]), []);
  assert.equal(createQuiz(getPool(['ん']), 10).length, 10);
  assert.deepEqual(getPool(['invalid']), []);
});

test('answer options stay within the selected set when there are enough unique sounds', () => {
  const pool = getPool(['あ', 'い', 'う', 'え', 'お'], 'both');
  const sounds = pool.map((item) => item.romaji);
  assert.ok(createQuiz(pool, 30).every((question) => question.options.every((option) => sounds.includes(option))));
});

test('typed answers accept common romanization variants', () => {
  for (const [symbol, answers] of [['し', ['shi', 'si', ' SHI ']], ['ち', ['chi', 'ti']], ['つ', ['tsu', 'tu']], ['ふ', ['fu', 'hu']], ['ぢ', ['ji', 'di']], ['づ', ['zu', 'du']], ['きゃ', ['kya']]]) {
    const question = getPool([symbol])[0];
    for (const answer of answers) assert.ok(isCorrect(answer, question), `${symbol}: ${answer}`);
    assert.equal(isCorrect('wrong', question), false);
    assert.equal(isCorrect('', question), false);
  }
});