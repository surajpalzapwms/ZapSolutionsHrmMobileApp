import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// SDK 54's default `expo-file-system` export is the new File/Directory API,
// which does NOT have documentDirectory/writeAsStringAsync/EncodingType —
// that's why FileSystem.documentDirectory was coming back undefined. The
// `/legacy` subpath is Expo's own recommended way to keep the old,
// string-path based API working on SDK 54+.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { downloadPayslipPdf, getMyPayrolls } from '../../../services/api';
import type { PayrollRecord } from '../../../services/api';
import { payslips as mockPayslips } from '../../data/mockData';
import { colors, radius, shadow } from '../../theme/colors';
import { Badge, SampleDataBadge } from './ModuleUI';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatPeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  const name = MONTHS[(month || 1) - 1] || period;
  return `${name} ${year}`;
}

type Payslip = {
  id: string;
  month: string;
  amount: number;
  status: string;
  live: boolean;
};

// Map the backend's status onto the badge tone the row expects.
const STATUS_TONE: Record<string, 'primary' | 'success' | 'danger' | 'warning'> = {
  paid: 'success',
  partial: 'warning',
  pending: 'primary',
  cancelled: 'danger',
  Generated: 'success',
};

function toPayslips(records: PayrollRecord[]): Payslip[] {
  return records.map((r) => ({
    id: r._id,
    month: formatPeriod(r.period),
    amount: r.netSalaryExact ?? r.netSalary,
    status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    live: true,
  }));
}

export default function PayslipPanel() {
  const [items, setItems] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyPayrolls()
      .then((res) => {
        if (cancelled) return;
        const records = res.data ?? [];
        if (records.length > 0) {
          setItems(toPayslips(records));
        } else {
          setItems(mockPayslips.map((p) => ({ ...p, live: false })));
          setUsingSampleData(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setItems(mockPayslips.map((p) => ({ ...p, live: false })));
        setUsingSampleData(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDownload(p: Payslip) {
    if (!p.live) {
      Alert.alert(
        'Sample payslip',
        `${p.month} payslip will be downloadable once the payslip endpoint is connected.`
      );
      return;
    }
    if (downloadingId) return;

    setDownloadingId(p.id);
    try {
      const base64Data = await downloadPayslipPdf(p.id);

      if (!base64Data || typeof base64Data !== 'string' || base64Data.length === 0) {
        throw new Error('Received empty or invalid PDF data');
      }

      // documentDirectory / cacheDirectory only exist on the legacy API —
      // fall back between the two rather than assuming one is set.
      const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

      if (!directory) {
        throw new Error('Unable to access a writable directory on this device');
      }

      const fileName = `Payslip-${p.month.replace(/\s+/g, '-')}.pdf`;
      const fileUri = `${directory}${fileName}`;

      // Write the file
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File was not created successfully');
      }

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${p.month} Payslip`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Downloaded', `File saved successfully`);
      }
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert(
        'Download failed',
        err instanceof Error ? err.message : `Could not download the ${p.month} payslip.`
      );
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}>
      {usingSampleData && <SampleDataBadge />}

      {items.length === 0 ? (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            ...shadow.soft,
          }}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>No payslips generated yet.</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {items.map((p) => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                ...shadow.soft,
              }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor: colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  {p.month}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Net pay ₹{Math.round(p.amount).toLocaleString('en-IN')}
                </Text>
              </View>
              <Badge label={p.status} tone={STATUS_TONE[p.status.toLowerCase()] ?? 'primary'} />
              <TouchableOpacity
                onPress={() => handleDownload(p)}
                disabled={downloadingId === p.id}
                style={{
                  marginLeft: 10,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.track,
                }}>
                {downloadingId === p.id ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={colors.text} />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}