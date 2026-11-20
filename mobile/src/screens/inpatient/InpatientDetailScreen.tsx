import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView, Switch
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getHospitalizationDetail,
  addDailyMonitoring,
  dischargeInpatient,
} from '../../services/inpatientService';
import CustomAlert from '../../components/custom-alert';

export default function InpatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State Form Daily Monitoring
  const [monitoringDate, setMonitoringDate] = useState(new Date().toISOString().split('T')[0]);
  const [appetite, setAppetite] = useState('Baik');
  const [urination, setUrination] = useState(true);
  const [defecation, setDefecation] = useState(true);
  const [vomiting, setVomiting] = useState(false);
  const [diarrhea, setDiarrhea] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // State Discharge
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any });

  const loadDetail = async () => {
    try {
      const res = await getHospitalizationDetail(id);
      setDetail(res.data);
    } catch (e) {
      console.log('Gagal memuat detail rawat inap:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/inpatient');
    }
  };

  const handleAddMonitoring = async () => {
    setSubmitting(true);
    try {
      await addDailyMonitoring(id, {
        monitoring_date: monitoringDate,
        appetite,
        urination,
        defecation,
        vomiting,
        diarrhea,
        notes: notes || null,
      });
      setNotes('');
      setAlert({ visible: true, title: 'Sukses', message: 'Catatan monitoring harian berhasil disimpan.', type: 'success', onConfirm: undefined });
      loadDetail();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal menyimpan monitoring';
      setAlert({ visible: true, title: 'Gagal', message: msg, type: 'error', onConfirm: undefined });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async () => {
    setSubmitting(true);
    try {
      const res = await dischargeInpatient(id, { discharge_date: dischargeDate });
      const summary = res.billing_summary;
      const summaryText = summary
        ? `Pasien dipulangkan.\nTotal Rawat: ${summary.total_days} hari\nTotal Biaya: Rp ${Number(summary.total_cost).toLocaleString('id-ID')}`
        : 'Pasien berhasil dipulangkan.';

      setAlert({
        visible: true,
        title: 'Pasien Pulang (Discharge)',
        message: summaryText,
        type: 'success',
        onConfirm: () => {
          setAlert((prev) => ({ ...prev, visible: false }));
          loadDetail();
        },
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal memulangkan pasien';
      setAlert({ visible: true, title: 'Gagal', message: msg, type: 'error', onConfirm: undefined });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const isInpatient = detail.status === 'inpatient';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Rawat Inap</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* KARTU INFO PASIEN */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.patientName}>{detail.patient?.name}</Text>
            <View style={[styles.badge, isInpatient ? styles.badgeActive : styles.badgeDone]}>
              <Text style={[styles.badgeText, isInpatient ? styles.badgeTextActive : styles.badgeTextDone]}>
                {isInpatient ? 'Sedang Dirawat' : 'Sudah Pulang'}
              </Text>
            </View>
          </View>
          <Text style={styles.subText}>Pemilik: {detail.patient?.owner?.name || '-'}</Text>
          <View style={styles.divider} />
          <Text style={styles.infoLine}>🏠 Kandang: <Text style={styles.bold}>{detail.cage_number}</Text></Text>
          <Text style={styles.infoLine}>📅 Masuk: <Text style={styles.bold}>{detail.admission_date}</Text></Text>
          {detail.discharge_date && (
            <Text style={styles.infoLine}>🏁 Pulang: <Text style={styles.bold}>{detail.discharge_date}</Text></Text>
          )}
          <Text style={styles.infoLine}>
            💰 Tarif Harian: <Text style={styles.bold}>Rp {Number(detail.package_price_per_day).toLocaleString('id-ID')}</Text>
          </Text>
        </View>

        {/* FORM TAMBAH DAILY MONITORING (Hanya jika masih dirawat) */}
        {isInpatient && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>+ Tambah Daily Monitoring</Text>

            <Text style={styles.label}>Tanggal Monitoring (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={monitoringDate} onChangeText={setMonitoringDate} />

            <Text style={styles.label}>Nafsu Makan</Text>
            <View style={styles.chipRow}>
              {['Baik', 'Menurun', 'Tidak Mau Makan'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, appetite === opt && styles.chipActive]}
                  onPress={() => setAppetite(opt)}
                >
                  <Text style={[styles.chipText, appetite === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>PIP (Buang Air Kecil)</Text>
              <Switch value={urination} onValueChange={setUrination} trackColor={{ true: '#0D9488' }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>PUP (Buang Air Besar)</Text>
              <Switch value={defecation} onValueChange={setDefecation} trackColor={{ true: '#0D9488' }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Muntah</Text>
              <Switch value={vomiting} onValueChange={setVomiting} trackColor={{ true: '#EF4444' }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Diare</Text>
              <Switch value={diarrhea} onValueChange={setDiarrhea} trackColor={{ true: '#EF4444' }} />
            </View>

            <Text style={styles.label}>Catatan Medis (Opsional)</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Kondisi klinis harian..."
              multiline
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleAddMonitoring} disabled={submitting}>
              <Text style={styles.btnText}>Simpan Monitoring</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RIWAYAT DAILY MONITORING */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Riwayat Daily Monitoring ({detail.daily_monitorings?.length || 0})</Text>
          {(!detail.daily_monitorings || detail.daily_monitorings.length === 0) ? (
            <Text style={styles.subText}>Belum ada catatan monitoring harian.</Text>
          ) : (
            detail.daily_monitorings.map((m: any) => (
              <View key={m.id} style={styles.monitorItem}>
                <Text style={styles.monitorDate}>📅 {m.monitoring_date} • Nafsu Makan: {m.appetite}</Text>
                <Text style={styles.monitorMeta}>
                  PIP: {m.urination ? 'Ya' : 'Tidak'} | PUP: {m.defecation ? 'Ya' : 'Tidak'} | Muntah: {m.vomiting ? 'Ya' : 'Tidak'} | Diare: {m.diarrhea ? 'Ya' : 'Tidak'}
                </Text>
                {m.notes ? <Text style={styles.monitorNotes}>Catatan: {m.notes}</Text> : null}
              </View>
            ))
          )}
        </View>

        {/* PULANGKAN PASIEN (DISCHARGE) */}
        {isInpatient && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pulangkan Pasien (Discharge)</Text>
            <Text style={styles.label}>Tanggal Pulang (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={dischargeDate} onChangeText={setDischargeDate} />
            <TouchableOpacity style={styles.btnDanger} onPress={handleDischarge} disabled={submitting}>
              <Text style={styles.btnText}>Konfirmasi Pasien Pulang & Hitung Biaya</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CustomAlert
        visible={alert.visible} title={alert.title} message={alert.message} type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })} onConfirm={alert.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 40, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginRight: 16 },
  backText: { color: '#0D9488', fontWeight: '600', fontSize: 14 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  scroll: { padding: 20, paddingBottom: 60, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  subText: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#CCFBF1' },
  badgeDone: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextActive: { color: '#0F766E' },
  badgeTextDone: { color: '#4B5563' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  infoLine: { fontSize: 13, color: '#4B5563', marginBottom: 6 },
  bold: { fontWeight: '700', color: '#111827' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#0D9488' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  switchLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  btnPrimary: { backgroundColor: '#0D9488', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  btnDanger: { backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  monitorItem: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  monitorDate: { fontSize: 13, fontWeight: '700', color: '#111827' },
  monitorMeta: { fontSize: 12, color: '#4B5563', marginTop: 4 },
  monitorNotes: { fontSize: 12, color: '#0F766E', marginTop: 4, fontStyle: 'italic' },
});
