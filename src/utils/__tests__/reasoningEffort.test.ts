import { describe, it, expect } from 'vitest';
import { clampEffort, lowestEffort, parseSupportedEfforts } from '../reasoning';

describe('clampEffort', () => {
  it('keeps a supported level', () => {
    expect(clampEffort('low', ['low', 'high'])).toBe('low');
  });

  it('leaves the level alone when support is unknown', () => {
    expect(clampEffort('medium')).toBe('medium');
  });

  it('moves to the nearest level, ties going up', () => {
    expect(clampEffort('medium', ['low', 'high'])).toBe('high');
    expect(clampEffort('low', ['medium', 'xhigh'])).toBe('medium');
    expect(clampEffort('high', ['minimal', 'low'])).toBe('low');
  });

  it('gives up when the model accepts no level', () => {
    expect(clampEffort('low', [])).toBeNull();
    expect(clampEffort('low', ['none'])).toBeNull();
  });
});

describe('lowestEffort', () => {
  it('ignores none and order', () => {
    expect(lowestEffort(['max', 'none', 'medium', 'low'])).toBe('low');
    expect(lowestEffort(undefined)).toBeNull();
  });
});

describe('parseSupportedEfforts', () => {
  it("reads OpenAI's rejection", () => {
    expect(
      parseSupportedEfforts(
        "[400] Unsupported value: 'reasoning_effort' does not support 'none' with this model. Supported values are: 'minimal', 'low', 'medium', and 'high'.",
      ),
    ).toEqual(['minimal', 'low', 'medium', 'high']);
  });

  it('returns null when nothing is listed', () => {
    expect(parseSupportedEfforts('Unknown parameter: reasoning_effort')).toBe(
      null,
    );
  });
});
