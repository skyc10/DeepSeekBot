import { useRouter } from 'expo-router';

import { SHEET_GROUP } from '../chat/sheet';
import { DeliveryReceiptSetting } from '../shell/delivery-receipt-setting';
import { MessageDisplaySetting } from '../shell/message-display-settings';
import { SendJumpSetting } from '../shell/send-jump-setting';
import { SettingsForm, SettingsFormItem } from '../primitives/settings-form';
import { SettingsRow, SettingsSection } from '../primitives/settings-row';
import { Text } from '../primitives/text';
import { useStrings } from '../strings';

export default function MessagingScreen() {
  const t = useStrings();
  const router = useRouter();
  return (
    <SettingsForm testID="settings-messaging">
      <SettingsFormItem>
        <Text variant="meta" tone="muted">
          {t.settingsHome.messagingHint}
        </Text>
      </SettingsFormItem>
      <SettingsSection title={t.settingsHome.messaging} on={SHEET_GROUP}>
        <MessageDisplaySetting />
        <SendJumpSetting />
        <DeliveryReceiptSetting />
        <SettingsRow
          on={SHEET_GROUP}
          title={t.chatBackground.global}
          icon="background"
          disclosure
          testID="settings-messaging-chat-background"
          onPress={() => router.push('/settings/chat-background')}
        />
      </SettingsSection>
    </SettingsForm>
  );
}
