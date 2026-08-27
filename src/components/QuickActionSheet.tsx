import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CornerLogo from './CornerLogo';
import { colors } from '../theme/colors';

export default function QuickActionSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CornerLogo size={34} variant="inline" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{title}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primarySoft,
            }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}
