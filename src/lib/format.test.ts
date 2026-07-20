import { describe, expect, it } from 'vitest';

import { eventMeta, formatDuration, formatRunway, watchDisplay } from './format';

describe('formatDuration', () => {
  it('renders the two most-significant units', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3_600)).toBe('1h 0m');
    expect(formatDuration(90_000)).toBe('1d 1h');
  });
});

describe('formatRunway', () => {
  it('reports no drain when nothing is watching', () => {
    expect(formatRunway(1000, 0)).toBe('not draining');
  });
  it('divides balance by the watch-rate', () => {
    // 2 watches draining a 1-day balance ⇒ ~12h of runway.
    expect(formatRunway(86_400, 2)).toBe('12h 0m');
  });
});

describe('event/watch display', () => {
  it('maps new deliveries to a success tone', () => {
    expect(eventMeta('new').tone).toBe('success');
  });
  it('shows a paused (inactive) watch as muted', () => {
    const meta = watchDisplay(false);
    expect(meta.label).toBe('Paused');
    expect(meta.tone).toBe('muted');
    expect(meta.pulse).toBe(false);
  });
  it('marks a watching connection as pulsing success', () => {
    const meta = watchDisplay(true, 'watching');
    expect(meta.tone).toBe('success');
    expect(meta.pulse).toBe(true);
  });
  it('marks an error connection as non-pulsing destructive', () => {
    const meta = watchDisplay(true, 'error');
    expect(meta.tone).toBe('destructive');
    expect(meta.pulse).toBe(false);
  });
});
