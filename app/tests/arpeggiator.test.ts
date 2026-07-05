import { describe, expect, it } from 'vitest';
import {
  arpToCodeLine,
  arpToTokens,
  chordNotes,
  defaultArpConfig,
} from '../src/arpeggiator';
import { parse } from '../src/parser';
import { STEP_COUNT } from '../src/stepgrid';

describe('arpeggiator: chordNotes', () => {
  it('builds a C major triad', () => {
    expect(chordNotes({ root: 'c', octave: 3, quality: 'maj' })).toEqual(['c3', 'e3', 'g3']);
  });

  it('builds an A minor triad crossing into the next octave', () => {
    // a(9) minor: root a, +3 (c, next octave since 9+3=12), +7 (e)
    expect(chordNotes({ root: 'a', octave: 3, quality: 'min' })).toEqual(['a3', 'c4', 'e4']);
  });

  it('builds a Cmaj7 (4 notes)', () => {
    expect(chordNotes({ root: 'c', octave: 2, quality: 'maj7' })).toEqual([
      'c2',
      'e2',
      'g2',
      'b2',
    ]);
  });
});

describe('arpeggiator: arpToTokens', () => {
  const base = { enabled: true, root: 'c' as const, octave: 3, quality: 'maj' as const };

  it('up: cycles the chord tones upward, filling stepCount', () => {
    const tokens = arpToTokens({ ...base, pattern: 'up' }, 16);
    expect(tokens).toHaveLength(16);
    expect(tokens.slice(0, 3)).toEqual(['c3', 'e3', 'g3']);
    expect(tokens.slice(3, 6)).toEqual(['c3', 'e3', 'g3']);
  });

  it('down: reverses the chord tones', () => {
    const tokens = arpToTokens({ ...base, pattern: 'down' }, 6);
    expect(tokens).toEqual(['g3', 'e3', 'c3', 'g3', 'e3', 'c3']);
  });

  it('updown: goes up then back down without repeating the ends', () => {
    const tokens = arpToTokens({ ...base, pattern: 'updown' }, 4);
    expect(tokens).toEqual(['c3', 'e3', 'g3', 'e3']);
  });

  it('random: is deterministic (same config -> same output)', () => {
    const a = arpToTokens({ ...base, pattern: 'random' }, 16);
    const b = arpToTokens({ ...base, pattern: 'random' }, 16);
    expect(a).toEqual(b);
    expect(a).toHaveLength(16);
    expect(a.every((t) => ['c3', 'e3', 'g3'].includes(t))).toBe(true);
  });
});

describe('arpeggiator: arpToCodeLine', () => {
  it('returns empty string when disabled', () => {
    expect(arpToCodeLine(defaultArpConfig(), STEP_COUNT)).toBe('');
  });

  it('produces a parseable, playable line of note tokens when enabled', () => {
    const config = { ...defaultArpConfig(), enabled: true };
    const line = arpToCodeLine(config, STEP_COUNT);
    expect(line.split(' ')).toHaveLength(STEP_COUNT);
    const result = parse(line);
    expect(result.ok).toBe(true);
  });
});
