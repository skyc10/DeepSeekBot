import { View } from 'react-native';

import {
  APPEARANCE_PRESETS,
  type Scheme,
  type ThemePreset,
  type ThemeStyle,
} from './appearance-model';
import { SHEET_GROUP } from './chat/sheet';
import { appearanceStore, type AppearanceSnapshot } from './native-appearance';
import { PreferenceRow } from './primitives/preference-row';
import { SettingsRow, SettingsSection } from './primitives/settings-row';
import { SettingsForm } from './primitives/settings-form';
import { Text } from './primitives/text';
import { space } from './design/tokens';
import { useStrings } from './strings';

const STYLES: readonly ThemeStyle[] = ['default', 'glass', 'image'];

/** Theme settings screen body: preset selection per scheme, surface style, and the glass
 * toggle. Every change goes straight through the appearance store, so the whole app updates
 * live via useDesignTheme — this screen needs no separate preview state. */
export function AppearanceSettingsContent({ snapshot }: { snapshot: AppearanceSnapshot }) {
  const copy = useStrings();
  const t = copy.themeSettings;
  const doc = snapshot.document;
  const interfaceCopy = copy.interfacePreferences;
  const styleLabels: Record<ThemeStyle, string> = {
    default: interfaceCopy.system,
    glass: t.glass,
    image: copy.chatBackground.image,
  };

  return (
    <SettingsForm>
      <SettingsSection title={t.preset} on={SHEET_GROUP} footer={t.presetHint}>
        <SchemePresetRow
          scheme="light"
          title={interfaceCopy.light}
          value={doc.modes.light.preset}
          presetNames={t.presetNames}
        />
        <SchemePresetRow
          scheme="dark"
          title={interfaceCopy.dark}
          value={doc.modes.dark.preset}
          presetNames={t.presetNames}
        />
        <PreferenceRow
          on={SHEET_GROUP}
          title={copy.chatBackground.type}
          icon="appearance"
          testID="theme-style"
          value={doc.style}
          options={STYLES.map((style) => ({
            value: style,
            label: styleLabels[style],
            // Use an existing glyph from the row icon set; all presets share one identifier.
            icon: 'appearance' as const,
          }))}
          onChange={(style) => appearanceStore.setStyle(style)}
        />
      </SettingsSection>
      <SettingsSection on={SHEET_GROUP} footer={t.glassHint}>
        <SettingsRow
          on={SHEET_GROUP}
          title={t.glass}
          control={{
            kind: 'switch',
            value: doc.materialEnabled,
            onChange: (enabled) => {
              appearanceStore.setMaterialEnabled(enabled);
              // Glass resolves only for the glass/image styles. If the user just opted in from
              // the default style, move them to glass so the toggle takes effect immediately.
              if (enabled && doc.style === 'default') appearanceStore.setStyle('glass');
            },
            disabled: !snapshot.loaded,
            testID: 'theme-glass-toggle',
          }}
        />
      </SettingsSection>
      {snapshot.storageError ? (
        <SettingsSection on={SHEET_GROUP}>
          <View style={{ padding: space.x5 }}>
            <Text variant="meta" tone="danger">
              {t.storageError}
            </Text>
          </View>
        </SettingsSection>
      ) : null}
    </SettingsForm>
  );
}

function SchemePresetRow({
  scheme,
  title,
  value,
  presetNames,
}: {
  scheme: Scheme;
  title: string;
  value: ThemePreset;
  presetNames: Record<ThemePreset, string>;
}) {
  return (
    <PreferenceRow
      on={SHEET_GROUP}
      title={title}
      icon="appearance"
      testID={`theme-preset-${scheme}`}
      value={value}
      options={APPEARANCE_PRESETS.map((preset) => ({
        value: preset,
        label: presetNames[preset],
        icon: 'appearance' as const,
      }))}
      onChange={(preset) => appearanceStore.setPreset(scheme, preset)}
    />
  );
}
