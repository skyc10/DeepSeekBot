import { AppearanceSettingsContent } from '../../src/ui/appearance-settings';
import { useAppearance } from '../../src/ui/native-appearance';

export default function AppearanceSettingsScreen() {
  const snapshot = useAppearance();
  return <AppearanceSettingsContent snapshot={snapshot} />;
}
