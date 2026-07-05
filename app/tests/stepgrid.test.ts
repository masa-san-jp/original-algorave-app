import { describe, expect, it } from 'vitest';
import { emptyGrid, gridToCode, codeToGrid, STEP_LANES, STEP_COUNT } from '../src/stepgrid';
import { parse } from '../src/parser';
import { query } from '../src/pattern';

describe('stepgrid: emptyGrid', () => {
  it('has all 8 lanes (drums + bass/pad/sampler), all false, length STEP_COUNT', () => {
    const g = emptyGrid();
    expect(STEP_LANES.length).toBe(8);
    expect(STEP_LANES).toEqual(['bd', 'sd', 'hh', 'oh', 'cp', 'bs', 'pd', 'sm']);
    for (const lane of STEP_LANES) {
      expect(g[lane]).toHaveLength(STEP_COUNT);
      expect(g[lane].every((v) => v === false)).toBe(true);
    }
  });
});

describe('stepgrid: gridToCode', () => {
  it('returns empty string for an all-empty grid', () => {
    expect(gridToCode(emptyGrid())).toBe('');
  });

  it('emits one line per active lane, in STEP_LANES order', () => {
    const g = emptyGrid();
    g.bd[0] = true;
    g.bd[8] = true;
    g.sd[4] = true;
    g.sd[12] = true;
    const code = gridToCode(g);
    const lines = code.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0].split(' ')).toHaveLength(STEP_COUNT);
    expect(lines[0].split(' ')[0]).toBe('bd');
    expect(lines[0].split(' ')[8]).toBe('bd');
    expect(lines[1].split(' ')[4]).toBe('sd');
  });

  it('produces code that parses and plays at the toggled positions', () => {
    const g = emptyGrid();
    g.bd[0] = true;
    g.hh[2] = true;
    const code = gridToCode(g);
    const result = parse(code);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const events = query(result.layers, 0, () => 0.5);
    const bdEvent = events.find((e) => e.tok === 'bd');
    const hhEvent = events.find((e) => e.tok === 'hh');
    expect(bdEvent?.pos).toBeCloseTo(0, 9);
    expect(hhEvent?.pos).toBeCloseTo(2 / STEP_COUNT, 9);
  });
});

describe('stepgrid: codeToGrid', () => {
  it('round-trips gridToCode output exactly', () => {
    const g = emptyGrid();
    g.bd[0] = true;
    g.bd[8] = true;
    g.oh[15] = true;
    const { grid, exact } = codeToGrid(gridToCode(g));
    expect(exact).toBe(true);
    expect(grid).toEqual(g);
  });

  it('round-trips an empty grid (empty code) as exact', () => {
    const { grid, exact } = codeToGrid('');
    expect(exact).toBe(true);
    expect(grid).toEqual(emptyGrid());
  });

  it('flags non-16-step code as inexact and starts empty', () => {
    const { grid, exact } = codeToGrid('bd ~ ~ bd');
    expect(exact).toBe(false);
    expect(grid).toEqual(emptyGrid());
  });

  it('flags code using unsupported notation (groups, modifiers) as inexact', () => {
    const { exact } = codeToGrid('bd ~ bd ~\n~ sn ~ sn\nhh*8');
    expect(exact).toBe(false);
  });

  it('recognizes drum aliases (sn -> sd lane)', () => {
    const line = Array.from({ length: STEP_COUNT }, (_, i) => (i === 4 ? 'sn' : '~')).join(' ');
    const { grid, exact } = codeToGrid(line);
    expect(exact).toBe(true);
    expect(grid.sd[4]).toBe(true);
  });

  it('flags a single line mixing two lanes as inexact', () => {
    const toks = Array.from({ length: STEP_COUNT }, (_, i) =>
      i === 0 ? 'bd' : i === 1 ? 'sd' : '~',
    );
    const { exact } = codeToGrid(toks.join(' '));
    expect(exact).toBe(false);
  });

  it('supports the bass/pad/sampler lanes and their aliases', () => {
    const bsLine = Array.from({ length: STEP_COUNT }, (_, i) => (i === 0 ? 'bass' : '~')).join(
      ' ',
    );
    const pdLine = Array.from({ length: STEP_COUNT }, (_, i) => (i === 4 ? 'pad' : '~')).join(' ');
    const smLine = Array.from({ length: STEP_COUNT }, (_, i) => (i === 8 ? 'smp' : '~')).join(' ');
    const { grid, exact } = codeToGrid([bsLine, pdLine, smLine].join('\n'));
    expect(exact).toBe(true);
    expect(grid.bs[0]).toBe(true);
    expect(grid.pd[4]).toBe(true);
    expect(grid.sm[8]).toBe(true);
  });
});
