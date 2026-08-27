/**
 * memories.js — the content.
 *
 * Every entry becomes an object in the world she can walk up to and open.
 * Add one and it appears; remove one and it's gone. The order here is the
 * order they sit along the path, so it is also the chronology.
 *
 *   title   short, how you'd refer to it out loud
 *   when    rough is better than precise
 *   text    one or two sentences, in your voice
 *   prop    what it looks like in the world, see PROPS
 *   turns   optional: 'night' tips the world into dusk when she finds it
 *
 * >>> These are DRAFTS built from what you sent me. Your phrases are in
 * >>> there deliberately. Rewrite anything that doesn't sound like you —
 * >>> nothing else in the codebase cares what these say.
 */

export const PROPS = [
  'table', 'bench', 'sign', 'radio', 'cake', 'book', 'lantern', 'flowers',
  'gift', 'cup', 'boat', 'star', 'racket', 'shuttle', 'plate', 'bed', 'weights',
];

export const MEMORIES = [
  {
    id: 'first-chat',
    prop: 'table',
    title: 'The lunch table',
    when: 'the first proper chat',
    text: 'You said you played badminton too and my mouth actually dropped. '
        + 'We spent the rest of lunch talking about the gym. I got nothing '
        + 'done that afternoon.',
  },
  {
    id: 'outside-the-club',
    prop: 'lantern',
    title: 'Outside the club',
    when: 'the night you said it first',
    text: 'You pulled me outside to tell me you were really interested in '
        + 'getting to know me. Straight out, no games. That was the moment I '
        + 'knew you were the mature kind of girl I look for.',
  },
  {
    id: 'kitchen-5am',
    prop: 'cup',
    title: 'Your kitchen, 5am',
    when: 'until the sun came up',
    text: 'We came back from the club and talked in your kitchen until five in '
        + 'the morning. I skipped home. Actually skipped, in daylight, like an '
        + 'idiot.',
  },
  {
    id: 'tennis',
    prop: 'racket',
    title: 'Tennis with everyone',
    when: 'the first game',
    text: 'So much fun and so much banter. I also could not stop thinking '
        + 'about how good you looked, which did absolutely nothing for my '
        + 'serve.',
  },
  {
    id: 'nandos',
    prop: 'plate',
    title: 'The gym, then Nando’s',
    when: 'our first proper day out',
    text: 'We trained, then spent the whole day in town. Nothing special, and '
        + 'the best day I’d had in ages. You kissed me goodbye and I could '
        + 'not wipe the smile off my face. That was when I thought this could '
        + 'be something real.',
  },
  {
    id: 'meteors',
    prop: 'star',
    turns: 'night',
    title: 'The meteor shower',
    when: 'the one that changed it',
    text: 'We lay there waiting for meteors and had our first cuddle. '
        + 'Somewhere in the middle of it I stopped watching the sky. That was '
        + 'when I knew I really felt for you.',
  },
  {
    id: 'badminton',
    prop: 'shuttle',
    title: 'Badminton, properly',
    when: 'and every time since',
    text: 'You’d fallen out of love with it. Two games in, you were back. '
        + 'An unstoppable duo, and the chemistry somehow gets better every '
        + 'single time we play.',
  },
  {
    id: 'the-bench',
    prop: 'bench',
    title: 'The bench above the town',
    when: 'the magical one',
    text: 'All of Guildford underneath us and neither of us in any hurry to '
        + 'move. We talked about what we actually wanted. Then we stopped '
        + 'talking.',
  },
  {
    id: 'first-nights',
    prop: 'bed',
    title: 'No plans, no rush',
    when: 'lately',
    text: 'Cuddling, talking rubbish, laughing, and working through an '
        + 'unreasonable quantity of snacks. The first nights I didn’t want '
        + 'to go home.',
  },
];

/** How many she needs before the lookout opens. */
export const GATE_REQUIREMENT = Math.max(1, MEMORIES.length - 2);

/**
 * The ending. Lines appear one at a time.
 * >>> DRAFT. This is the part that should be yours — say it how you'd say it.
 */
export const ENDING_LINES = [
  'You found all of it.',
  'Every one of those days, I was paying attention.',
  'So there’s only one thing left to ask.',
];

/** >>> DRAFT. Your words. */
export const THE_QUESTION = 'Will you be my girlfriend?';
export const YES_LABEL = 'Yes';
export const OTHER_LABEL = 'Ask me again out loud';
