/**
 * memories.js — the only file that needs your handwriting.
 *
 * Every entry becomes an object in the world she can walk up to and open.
 * Add one and it appears; remove one and it's gone. Nothing else needs to
 * change, and the order here is the order they're placed along the path.
 *
 *   title  short, how you'd refer to it out loud
 *   when   rough is better than precise — "a Tuesday in March"
 *   text   one or two sentences, in your voice
 *   prop   what it looks like in the world, see PROPS below
 *
 * These twelve are placeholders so the game runs. Replace the text; keep
 * the shape.
 */

export const PROPS = [
  'table',    // small café table with two cups
  'bench',    // park bench
  'sign',     // signpost
  'radio',    // little boombox
  'cake',     // a cake with a candle
  'book',     // open book on a stand
  'lantern',  // standing lantern
  'flowers',  // flower pot
  'gift',     // wrapped box
  'cup',      // single mug
  'boat',     // tiny rowboat
  'star',     // floating star
];

export const MEMORIES = [
  {
    id: 'first-talk',
    prop: 'table',
    title: 'PLACEHOLDER — where we first talked',
    when: 'the beginning',
    text: 'Replace me. One or two sentences about the first proper conversation, in your voice.',
  },
  {
    id: 'the-walk',
    prop: 'bench',
    title: 'PLACEHOLDER — the long walk',
    when: 'early on',
    text: 'Replace me. The walk that went on much longer than either of you planned.',
  },
  {
    id: 'the-song',
    prop: 'radio',
    title: 'PLACEHOLDER — the song',
    when: 'still stuck in my head',
    text: 'Replace me. The song that became yours, and why.',
  },
  {
    id: 'the-food',
    prop: 'cake',
    title: 'PLACEHOLDER — the thing we always order',
    when: 'every time',
    text: 'Replace me. The food you always get, and the running joke attached to it.',
  },
  {
    id: 'the-trip',
    prop: 'sign',
    title: 'PLACEHOLDER — the day out',
    when: 'that weekend',
    text: 'Replace me. The trip, the drive, the day that felt longer than a day.',
  },
  {
    id: 'the-rain',
    prop: 'lantern',
    title: 'PLACEHOLDER — caught in the rain',
    when: 'unplanned',
    text: 'Replace me. Something that went wrong and turned out better than the plan.',
  },
  {
    id: 'the-call',
    prop: 'cup',
    title: 'PLACEHOLDER — the 2am phone call',
    when: 'a Tuesday, probably',
    text: 'Replace me. The ordinary night that mattered more than the big ones.',
  },
  {
    id: 'the-book',
    prop: 'book',
    title: 'PLACEHOLDER — the thing you told me',
    when: 'you might not remember this',
    text: 'Replace me. Something she said in passing that you never forgot.',
  },
  {
    id: 'the-gift',
    prop: 'gift',
    title: 'PLACEHOLDER — the present',
    when: 'your birthday',
    text: 'Replace me. A gift given or received, and the face she made.',
  },
  {
    id: 'the-water',
    prop: 'boat',
    title: 'PLACEHOLDER — by the water',
    when: 'late summer',
    text: 'Replace me. Somewhere quiet you both ended up.',
  },
  {
    id: 'the-flowers',
    prop: 'flowers',
    title: 'PLACEHOLDER — the flowers',
    when: 'no occasion',
    text: 'Replace me. A small thing done for no reason at all.',
  },
  {
    id: 'the-now',
    prop: 'star',
    title: 'PLACEHOLDER — lately',
    when: 'now',
    text: 'Replace me. What the last few weeks have felt like.',
  },
];

/** How many she needs before the lookout opens. */
export const GATE_REQUIREMENT = Math.max(1, MEMORIES.length - 2);

/** The ending. Lines appear one at a time. Your words go here. */
export const ENDING_LINES = [
  'PLACEHOLDER — line one.',
  'PLACEHOLDER — line two.',
  'PLACEHOLDER — line three.',
];

export const THE_QUESTION = 'PLACEHOLDER — will you be my girlfriend?';
export const YES_LABEL = 'Yes';
export const OTHER_LABEL = 'Ask me again out loud';
