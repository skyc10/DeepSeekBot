import { describe, expect, it } from 'vitest';

import {
  filterCatalog,
  SETTINGS_CATALOG,
  SETTINGS_GROUPS,
  type SettingsLabelKey,
} from '../src/ui/settings-catalog';

const labels: Record<SettingsLabelKey, string> = {
  account: 'Profile',
  general: 'General',
  appearance: 'Appearance',
  models: 'Models & execution',
  autoApproval: 'Auto approval',
  prompts: 'Prompts',
  voice: 'Voice',
  messaging: 'Messaging',
  notifications: 'Notifications',
  shortcuts: 'Keyboard shortcuts',
  imApps: 'IM apps',
  computerControl: 'Computer control',
  browserControl: 'Browser control',
  companion: 'Window companion',
  connections: 'Connections',
  dataPrivacy: 'Data & privacy',
  advanced: 'Advanced',
  plugins: 'Plugins',
  about: 'About',
};
const label = (key: SettingsLabelKey) => labels[key];

describe('settings home catalog', () => {
  it('lists all 19 Web-aligned entries in four groups', () => {
    expect(SETTINGS_CATALOG).toHaveLength(19);
    expect(SETTINGS_GROUPS).toEqual(['identity', 'agent', 'capability', 'system']);
    expect(new Set(SETTINGS_CATALOG.map((entry) => entry.id)).size).toBe(19);
    for (const group of SETTINGS_GROUPS) {
      expect(SETTINGS_CATALOG.some((entry) => entry.group === group)).toBe(true);
    }
  });

  it('marks all implemented entries as ready with routes', () => {
    const ready = SETTINGS_CATALOG.filter((entry) => entry.status === 'ready');
    expect(ready.map((entry) => entry.id)).toEqual([
      'account',
      'general',
      'appearance',
      'models',
      'autoApproval',
      'messaging',
      'notifications',
      'imApps',
      'computerControl',
      'browserControl',
      'connections',
      'dataPrivacy',
      'advanced',
      'about',
    ]);
    expect(SETTINGS_CATALOG.find((entry) => entry.id === 'models')?.route).toBe(
      '/settings/model-runtime',
    );
    expect(SETTINGS_CATALOG.find((entry) => entry.id === 'advanced')?.route).toBe(
      '/settings/advanced',
    );
    expect(ready.every((entry) => entry.route?.startsWith('/settings/'))).toBe(true);
  });

  it('keeps phone-unusable rows visible but non-navigable', () => {
    const desktop = SETTINGS_CATALOG.filter((entry) => entry.status === 'desktop');
    expect(desktop.map((entry) => entry.id)).toEqual([
      'prompts',
      'voice',
      'shortcuts',
      'companion',
      'plugins',
    ]);
    expect(SETTINGS_CATALOG.filter((entry) => entry.status === 'soon')).toHaveLength(0);
    expect(desktop.every((entry) => entry.route === undefined)).toBe(true);
  });

  it('filters by localized label and id', () => {
    expect(filterCatalog('voice', label).map((entry) => entry.id)).toEqual(['voice']);
    expect(filterCatalog('PRIVACY', label).map((entry) => entry.id)).toEqual(['dataPrivacy']);
    expect(filterCatalog('', label)).toHaveLength(19);
  });
});
