import { describe, it, expect } from 'vitest';
import {
  APPEARANCE_PRESETS,
  coerceAppearanceDocument,
  coerceWallpaper,
  defaultAppearanceDocument,
  modeFor,
  paintSource,
  parseAppearanceDocument,
  setMaterialEnabled,
  setPreset,
  setStyle,
  setWallpaper,
  usesGlass,
} from '../src/ui/appearance-model';

describe('appearance model - document coercion', () => {
  it('defaults are versioned and revision-bearing', () => {
    const doc = defaultAppearanceDocument();
    expect(doc.version).toBe(1);
    expect(doc.revision).toBe(1);
    expect(doc.preference).toBe('system');
    expect(doc.style).toBe('default');
    expect(doc.materialEnabled).toBe(false);
    expect(doc.modes.light.preset).toBe('classic-blue');
  });

  it('rejects unsupported version and bad revision', () => {
    expect(coerceAppearanceDocument({ version: 2, revision: 1 })).toBeUndefined();
    expect(coerceAppearanceDocument({ version: 1, revision: 0 })).toBeUndefined();
    expect(coerceAppearanceDocument({ version: 1, revision: 1.5 })).toBeUndefined();
    expect(coerceAppearanceDocument(undefined)).toBeUndefined();
  });

  it('normalizes unknown fields with safe fallbacks', () => {
    const doc = coerceAppearanceDocument({
      version: 1,
      revision: 7,
      preference: 'bogus',
      style: 'bogus',
      modes: { light: { preset: 'nope' } },
      materialEnabled: 'yes',
    });
    expect(doc).toBeDefined();
    expect(doc?.preference).toBe('system');
    expect(doc?.style).toBe('default');
    expect(doc?.modes.light.preset).toBe('classic-blue');
    expect(doc?.materialEnabled).toBe(false);
    expect(doc?.revision).toBe(7);
  });

  it('parse throws on invalid json and bad documents', () => {
    expect(() => parseAppearanceDocument('{nope')).toThrow('appearance-invalid-json');
    expect(() => parseAppearanceDocument('[]')).toThrow('appearance-invalid-document');
    expect(() => parseAppearanceDocument('{"version":99,"revision":1}')).toThrow(
      'appearance-invalid-document',
    );
  });

  it('keeps valid primary and material fields', () => {
    const doc = coerceAppearanceDocument({
      version: 1,
      revision: 3,
      modes: {
        dark: {
          preset: 'forest-green',
          primary: '#AABBCC',
          materials: { header: { opacity: 55, blur: 12, color: 'bad' } },
        },
      },
    });
    expect(doc?.modes.dark.preset).toBe('forest-green');
    expect(doc?.modes.dark.primary).toBe('#aabbcc');
    expect(doc?.modes.dark.materials?.header).toEqual({ opacity: 55, blur: 12 });
  });
});

describe('appearance model - wallpaper media', () => {
  it('coerces image and video placements', () => {
    expect(
      coerceWallpaper({ kind: 'image', id: 'sunset.jpg', fit: 'contain', x: 2, y: -1, fade: 500 }),
    ).toEqual({ kind: 'image', id: 'sunset.jpg', fit: 'contain', x: 0.5, y: 0.5, fade: 100 });
    expect(
      coerceWallpaper({
        kind: 'video',
        id: 'loop.mp4',
        posterId: 'loop.jpg',
        fit: 'cover',
        x: 0.3,
        y: 0.4,
        fade: 60,
      }),
    ).toMatchObject({ kind: 'video', id: 'loop.mp4', posterId: 'loop.jpg' });
  });

  it('rejects malformed media ids and colors', () => {
    expect(coerceWallpaper({ kind: 'image', id: '../evil.jpg' })).toBeUndefined();
    expect(coerceWallpaper({ kind: 'video', id: 'x.exe' })).toBeUndefined();
    expect(coerceWallpaper({ kind: 'color', color: 'red' })).toBeUndefined();
    expect(coerceWallpaper({ kind: 'color', color: '#abcdef' })).toEqual({
      kind: 'color',
      color: '#abcdef',
    });
  });

  it('paintSource falls back to video poster', () => {
    expect(paintSource(undefined)).toBeUndefined();
    expect(paintSource({ kind: 'color', color: '#fff' })).toBeUndefined();
    expect(paintSource({ kind: 'image', id: 'a.jpg', fit: 'cover', x: 0.5, y: 0.5, fade: 60 })).toBe(
      'a.jpg',
    );
    expect(
      paintSource({
        kind: 'video',
        id: 'v.mp4',
        posterId: 'p.jpg',
        fit: 'cover',
        x: 0.5,
        y: 0.5,
        fade: 60,
      }),
    ).toBe('p.jpg');
    expect(
      paintSource({ kind: 'video', id: 'v.mp4', fit: 'cover', x: 0.5, y: 0.5, fade: 60 }),
    ).toBe('v.mp4');
  });
});

describe('appearance model - edits and resolution', () => {
  it('every edit bumps revision exactly once', () => {
    let doc = defaultAppearanceDocument();
    doc = setStyle(doc, 'glass');
    expect(doc.revision).toBe(2);
    doc = setMaterialEnabled(doc, true);
    expect(doc.revision).toBe(3);
    doc = setPreset(doc, 'dark', 'warm-amber');
    expect(doc.revision).toBe(4);
    doc = setWallpaper(doc, { kind: 'color', color: '#112233' });
    expect(doc.revision).toBe(5);
    expect(doc.style).toBe('glass');
    expect(doc.materialEnabled).toBe(true);
    expect(doc.modes.dark.preset).toBe('warm-amber');
    expect(doc.wallpaper).toEqual({ kind: 'color', color: '#112233' });
  });

  it('setWallpaper(undefined) removes the field and bumps revision', () => {
    let doc = setWallpaper(defaultAppearanceDocument(), {
      kind: 'image',
      id: 'wall.jpg',
      fit: 'cover',
      x: 0.5,
      y: 0.5,
      fade: 60,
    });
    expect(doc.wallpaper).toBeDefined();
    const before = doc.revision;
    doc = setWallpaper(doc, undefined);
    expect('wallpaper' in doc).toBe(false);
    expect(doc.wallpaper).toBeUndefined();
    expect(doc.revision).toBe(before + 1);
  });

  it('setPreset touches only one scheme', () => {
    const doc = setPreset(defaultAppearanceDocument(), 'light', 'mist-purple');
    expect(doc.modes.light.preset).toBe('mist-purple');
    expect(doc.modes.dark.preset).toBe('classic-blue');
  });

  it('modeFor resolves system and explicit preference', () => {
    const base = defaultAppearanceDocument();
    expect(modeFor(base, 'dark').preset).toBe('classic-blue');
    const explicit = setPreset({ ...base, preference: 'dark' }, 'dark', 'forest-green');
    expect(modeFor(explicit, 'light').preset).toBe('forest-green');
  });

  it('usesGlass requires opt-in and a supporting style/platform', () => {
    const base = defaultAppearanceDocument();
    expect(usesGlass(base, 'ios')).toBe(false);
    expect(usesGlass(setMaterialEnabled(setStyle(base, 'glass'), true), 'ios')).toBe(true);
    expect(usesGlass(setMaterialEnabled(setStyle(base, 'glass'), true), 'android')).toBe(true);
    expect(usesGlass(setMaterialEnabled(base, true), 'ios')).toBe(false);
  });

  it('all presets round-trip through coercion', () => {
    for (const preset of APPEARANCE_PRESETS) {
      const doc = coerceAppearanceDocument({
        version: 1,
        revision: 1,
        modes: { light: { preset } },
      });
      expect(doc?.modes.light.preset).toBe(preset);
    }
  });
});
