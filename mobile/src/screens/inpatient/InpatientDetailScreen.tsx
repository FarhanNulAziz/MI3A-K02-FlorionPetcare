import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, SafeAreaView, Switch, Platform, Alert
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  getHospitalizationDetail,
  addDailyMonitoring,
  dischargeInpatient,
} from '../../services/inpatientService';

const APPETITE_OPTIONS = ['Baik / Lahap', 'Menurun', 'Tidak Mau Makan'];
const EXCRETION_OPTIONS = ['Normal', 'Sedikit', 'Tidak Ada'];

export default function InpatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const hospId = Number(Array.isArray(id) ? id[0] : id);

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // State Form Daily Monitoring
  const [monitoringDate, setMonitoringDate] = useState(new Date().toISOString().split('T')[0]);
  const [appetite, setAppetite] = useState('Baik / Lahap');
  const [pip, setPip] = useState('Normal');
  const [pup, setPup] = useState('Normal');
  const [vomiting, setVomiting] = useState(false);
  const [diarrhea, setDiarrhea] = useState(false);
  const [notes, setNotes] = useState('');

  // State Discharge
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split('T')[0]);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}

${message}`);
    else Alert.alert(title, message);
  };

  const loadDetail = useCallback(async () => {
    if (!hospId) return;
    try {
      const res = await getHospitalizationDetail(hospId);
      setDetail(res.data || res);
    } catch {
      notify('Error', 'Gagal memuat detail rawat inap.');
    } finally {
      setLoading(false);
    }
  }, [hospId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  const handleAddMonitoring = async () => {
    setSubmitting(true);
    try {
      await addDailyMonitoring(hospId, {
        monitoring_date: monitoringDate,
        appetite,
        pip,
        pup,
        vomiting,
        diarrhea,
        notes: notes.trim() || null,
      });
      setNotes('');
      setVomiting(false);
      setDiarrhea(false);
      notify('Berhasil', 'Catatan daily monitoring tersimpan.');
      loadDetail();
    } catch (error: any) {
      notify('Gagal', error?.response?.data?.detail || 'Gagal menyimpan monitoring.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async () => {
    setSubmitting(true);
    try {
      const res = await dischargeInpatient(hospId, { discharge_date: dischargeDate });
      const bill = res.billing_summary;
      const summaryText = bill
        ? `Lama rawat: ${bill.total_days} hari
Total biaya inap: Rp ${Number(bill.total_cost).toLocaleString('id-ID')}`
        : 'Pasien telah dipulangkan.';
      notify('Pasien Pulang (Discharge)', summaryText);
      loadDetail();
    } catch (error: any) {
      notify('Gagal', error?.response?.data?.detail || 'Gagal memulangkan pasien.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !detail) {
    return (
      <View style={styles.centerFull}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const isInpatient = detail.status === 'inpatient';
  const monitorings = detail.daily_monitorings || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/inpatient'))}>
          <Text style={styles.backText}>? Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Rawat Inap</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Kartu Ringkasan Pasien */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.patientName}>{detail.patient?.name || `Pasien #${detail.patient_id}`}</Text>
            <View style={[styles.badge, isInpatient ? styles.badgeActive : styles.badgeDone]}>
              <Text style={[styles.badgeText, isInpatient ? styles.badgeTextActive : styles.badgeTextDone]}>
                {isInpatient ? 'Dirawat' : 'Pulang'}
              </Text>
            </View>
          </View>
          <Text style={styles.subText}>Pemilik: {detail.patient?.owner?.name || '-'}</Text>

          <View style={styles.divider} />
          <Text style={styles.infoLine}>Kandang: <Text style={styles.bold}>{detail.cage_number}</Text></Text>
          <Text style={styles.infoLine}>Tanggal Masuk: <Text style={styles.bold}>{detail.admission_date}</Text></Text>
          {detail.discharge_date && (
            <Text style={styles.infoLine}>Tanggal Pulang: <Text style={styles.bold}>{detail.discharge_date}</Text></Text>
          )}
          <Text style={styles.infoLine}>
            Tarif Harian: <Text style={[styles.bold, { color: '#0D9488' }]}>Rp {Number(detail.package_price_per_day).toLocaleString('id-ID')}/hari</Text>
          </Text>
        </View>

        {/* Form Daily Monitoring (Hanya saat status inpatient) */}
        {isInpatient && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Catat Daily Monitoring</Text>

            <Text style={styles.label}>Tanggal Pemantauan</Text>
            <TextInput style={styles.input} value={monitoringDate} onChangeText={setMonitoringDate} />

            <Text style={styles.label}>Nafsu Makan</Text>
            <View style={styles.chipRow}>
              {APPETITE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, appetite === opt && styles.chipActive]}
                  onPress={() => setAppetite(opt)}
                >
                  <Text style={[styles.chipText, appetite === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Buang Air Kecil (PIP)</Text>
            <View style={styles.chipRow}>
              {EXCRETION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, pip === opt && styles.chipActive]}
                  onPress={() => setPip(opt)}
                >
                  <Text style={[styles.chipText, pip === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Buang Air Besar (PUP)</Text>
            <View style={styles.chipRow}>
              {EXCRETION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, pup === opt && styles.chipActive]}
                  onPress={() => setPup(opt)}
                >
                  <Text style={[styles.chipText, pup === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Muntah (Vomiting)</Text>
              <Switch value={vomiting} onValueChange={setVomiting} trackColor={{ true: '#0D9488' }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Diare (Diarrhea)</Text>
              <Switch value={diarrhea} onValueChange={setDiarrhea} trackColor={{ true: '#0D9488' }} />
            </View>

            <Text style={styles.label}>Catatan Tambahan</Text>
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Kondisi umum, suhu, respon obat..."
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleAddMonitoring} disabled={submitting}>
              <Text style={styles.btnText}>Simpan Daily Monitoring</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Riwayat Daily Monitoring */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Riwayat Monitoring ({monitorings.length})</Text>
          {monitorings.length === 0 ? (
            <Text style={styles.subText}>Belum ada catatan monitoring harian.</Text>
          ) : (
            monitorings.map((m: any) => (
              <View key={m.id} style={styles.monItem}>
                <Text style={styles.monDate}>{m.monitoring_date}</Text>
                <Text style={styles.monLine}>Nafsu Makan: {m.appetite || '-'} ? PIP: {m.pip || '-'} ? PUP: {m.pup || '-'}</Text>
                <Text style={styles.monLine}>
                  Muntah: {m.vomiting ? 'Ya' : 'Tidak'} ? Diare: {m.diarrhea ? 'Ya' : 'Tidak'}
                </Text>
                {m.notes ? <Text style={styles.monNotes}>Catatan: {m.notes}</Text> : null}
              </View>
            ))
          )}
        </View>

        {/* Pulangkan Pasien (Discharge) */}
        {isInpatient && (
          <View style={[styles.card, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.sectionTitle, { color: '#991B1B' }]}>Pulangkan Pasien (Discharge)</Text>
            <Text style={styles.label}>Tanggal Pulang (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={dischargeDate} onChangeText={setDischargeDate} />
            <TouchableOpacity style={styles.btnDanger} onPress={handleDischarge} disabled={submitting}>
              <Text style={styles.btnText}>Konfirmasi Pasien Pulang & Hitung Biaya</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: 20, paddingTop: 42, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backText: { color: '#0D9488', fontWeight: '700', fontSize: 15, marginRight: 14 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20, paddingBottom: 44 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  subText: { fontSize: 13, color: '#64748B', marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeDone: { backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextActive: { color: '#15803D' },
  badgeTextDone: { color: '#475569' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  infoLine: { fontSize: 13, color: '#475569', marginBottom: 5 },
  bold: { fontWeight: '700', color: '#0F172A' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: 10, padding: 11, fontSize: 14, color: '#0F172A',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#CCFBF1', borderColor: '#0D9488' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#0F766E', fontWeight: '800' },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  switchLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },

  btnPrimary: {
    backgroundColor: '#0D9488', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 14,
  },
  btnDanger: {
    backgroundColor: '#DC2626', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 12,
  },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  monItem: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  monDate: { fontSize: 13, fontWeight: '800', color: '#0D9488', marginBottom: 4 },
  monLine: { fontSize: 12, color: '#334155', marginBottom: 2 },
  monNotes: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginTop: 4 },
});
