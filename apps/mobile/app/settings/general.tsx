import { useRouter } from 'expo-router';

import { SHEET_GROUP } from '../chat/sheet';
import { HapticFeedbackSetting } from '../shell/haptic-feedback-setting';
import { AppearanceSetting, InterfaceSaveNotice, LanguageSetting } from '../interface-settings';
import { SettingsForm, SettingsFormItem } from '../primitives/settings-form';
import { SettingsRow, SettingsSection } from '../primitives/settings-row';
import { Text } from '../primitives/text';
import { useStrings } from '../strings';

export default function GeneralScreen() {
  const t = useStrings();
  const router = useRouter();
  return (
    <SettingsForm testID="settings-general">
      <SettingsFormItem>
        <Text variant="meta" tone="muted">
          {t.settingsHome.generalHint}
        </Text>
      </SettingsFormItem>
      <SettingsSection title={t.settingsHome.general} on={SHEET_GROUP}>
        <LanguageSetting on={SHEET_GROUP} />
        <AppearanceSetting on={SHEET_GROUP} />
        <SettingsRow
          on={SHEET_GROUP}
          title={t.appIcon}
          icon="appIcon"
          disclosure
          testID="settings-general-app-icon"
          onPress={() => router.push('/settings/app-icon')}
        />
        <SettingsRow
          on={SHEET_GROUP}
          title={t.activityCountSettings.title}
          icon="activityCount"
          disclosure
          testID="settings-general-activity-count"
          onPress={() => router.push('/settings/activity-count')}
        />
        <HapticFeedbackSetting />
      </SettingsSection>
      <InterfaceSaveNotice />
    </SettingsForm>
  );
}
