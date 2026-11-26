import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { admitInpatient, getPatientsList } from '../../services/inpatientService';

const PACKAGES = [
  { price: '35000', title: 'Paket Standar', desc: 'Kandang standar, pakan harian, observasi rutin' },
  { price: '50000', title: 'Paket Intensif', desc: 'Kandang luas, pakan khusus, pemantauan intensif' },
];

export default function InpatientFormScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [packagePrice, setPackagePrice] = useState('35000');
  const [cageNumber, setCageNumber] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const notify = (title: string, message: string, onDone?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      onDone?.();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: onDone }]);
    }
  };

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await getPatientsList();
        const list = res.data || res || [];
        setPatients(Array.isArray(list) ? list : []);
      } catch {
        notify('Peringatan', 'Gagal memuat daftar pasien dari server.');
      } finally {
        setLoadingPatients(false);
      }
    };
    loadPatients();
  }, []);

  const handleSubmit = async () => {
    if (!selectedPatientId || !cageNumber.trim() || !admissionDate.trim() || !packagePrice) {
      notify('Peringatan', 'Pilih pasien, paket rawat inap, dan nomor kandang terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      await admitInpatient({
        patient_id: selectedPatientId,
        package_price_per_day: parseInt(packagePrice, 10),
        cage_number: cageNumber.trim(),
        admission_date: admissionDate.trim(),
      });
      notify('Berhasil', 'Pasien berhasil didaftarkan ke rawat inap.', () => {
        if (router.canGoBack()) router.back();
        else router.replace('/inpatient');
      });
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || 'Gagal mendaftarkan rawat inap.';
      notify('Gagal', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/inpatient'))}>
          <Text style={styles.backText}>? Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Rawat Inap</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>1. Pilih Pasien</Text>
          {loadingPatients ? (
            <ActivityIndicator color="#0D9488" style={{ marginVertical: 16 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientScroll}>
              {patients.map((p) => {
                const selected = selectedPatientId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.patientChip, selected && styles.patientChipActive]}
                    onPress={() => setSelectedPatientId(p.id)}
                  >
                    <Text style={[styles.patientChipName, selected && styles.patientChipNameActive]}>{p.name}</Text>
                    <Text style={[styles.patientChipSub, selected && { color: '#CCFBF1' }]}>
                      {p.species} ? {p.owner?.name || 'Pemilik'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.sectionLabel}>2. Pilih Paket Tarif Harian</Text>
          <View style={styles.packageRow}>
            {PACKAGES.map((pkg) => {
              const active = packagePrice === pkg.price;
              return (
                <TouchableOpacity
                  key={pkg.price}
                  style={[styles.packageCard, active && styles.packageCardActive]}
                  onPress={() => setPackagePrice(pkg.price)}
                >
                  <Text style={[styles.packageTitle, active && { color: '#0D9488' }]}>{pkg.title}</Text>
                  <Text style={styles.packagePrice}>Rp {Number(pkg.price).toLocaleString('id-ID')}/hari</Text>
                  <Text style={styles.packageDesc}>{pkg.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.fieldCard}>
            <Text style={styles.inputLabel}>3. Nomor / Kode Kandang</Text>
            <TextInput
              style={styles.input}
              value={cageNumber}
              onChangeText={setCageNumber}
              placeholder="Contoh: KDG-01 atau VIP-A2"
              placeholderTextColor="#94A3B8"
            />

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>4. Tanggal Masuk (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={admissionDate}
              onChangeText={setAdmissionDate}
              placeholder="2026-11-26"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Simpan Pendaftaran Rawat Inap</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: 20, paddingTop: 42, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backText: { color: '#0D9488', fontWeight: '700', fontSize: 15, marginRight: 14 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20, paddingBottom: 44 },

  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  patientScroll: { marginBottom: 20 },
  patientChip: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 14, marginRight: 10, minWidth: 150,
  },
  patientChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  patientChipName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  patientChipNameActive: { color: '#FFFFFF' },
  patientChipSub: { fontSize: 12, color: '#64748B', marginTop: 3 },

  packageRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  packageCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  packageCardActive: { borderColor: '#0D9488', backgroundColor: '#F0FDFA' },
  packageTitle: { fontSize: 14, fontWeight: '800', color: '#334155' },
  packagePrice: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginVertical: 4 },
  packageDesc: { fontSize: 11, color: '#64748B', lineHeight: 16 },

  fieldCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20,
  },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#0D9488', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
