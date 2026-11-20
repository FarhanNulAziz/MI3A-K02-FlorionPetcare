import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';

import { admitInpatient, getPatientsList } from '../../services/inpatientService';
import CustomAlert from '../../components/custom-alert';

export default function InpatientFormScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [packagePrice, setPackagePrice] = useState('35000');
  const [cageNumber, setCageNumber] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any });

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await getPatientsList();
        setPatients(res.data || []);
      } catch (e) {
        console.log('Gagal memuat pasien:', e);
      } finally {
        setLoadingPatients(false);
      }
    };
    loadPatients();
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/inpatient');
    }
  };

  const handleSave = async () => {
    if (!selectedPatientId || !cageNumber || !admissionDate || !packagePrice) {
      setAlert({ visible: true, title: 'Validasi Gagal', message: 'Pilih pasien dan lengkapi seluruh kolom wajib!', type: 'error', onConfirm: undefined });
      return;
    }

    setLoading(true);
    try {
      await admitInpatient({
        patient_id: selectedPatientId,
        package_price_per_day: parseFloat(packagePrice),
        cage_number: cageNumber,
        admission_date: admissionDate,
      });

      setAlert({
        visible: true,
        title: 'Sukses',
        message: 'Pasien berhasil didaftarkan ke rawat inap.',
        type: 'success',
        onConfirm: () => {
          setAlert((prev) => ({ ...prev, visible: false }));
          handleBack();
        },
      });
    } catch (error: any) {
      let msg = error.response?.data?.message || 'Gagal mendaftarkan rawat inap';
      if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0];
        msg = Array.isArray(firstError) ? firstError[0] : firstError;
      }
      setAlert({ visible: true, title: 'Gagal', message: msg, type: 'error', onConfirm: undefined });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Rawat Inap</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.label}>Pilih Pasien *</Text>
          {loadingPatients ? (
            <ActivityIndicator color="#0D9488" style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.chipWrap}>
              {patients.map((p) => {
                const active = selectedPatientId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setSelectedPatientId(p.id)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {p.name} ({p.owner?.name || 'Tanpa Pemilik'})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={styles.label}>Pilih Paket Perawatan / Hari *</Text>
          <View style={styles.packageRow}>
            {[
              { label: 'Paket Standar', price: '35000' },
              { label: 'Paket Intensif', price: '50000' },
            ].map((pkg) => {
              const active = packagePrice === pkg.price;
              return (
                <TouchableOpacity
                  key={pkg.price}
                  style={[styles.pkgCard, active && styles.pkgCardActive]}
                  onPress={() => setPackagePrice(pkg.price)}
                >
                  <Text style={[styles.pkgTitle, active && styles.pkgTextActive]}>{pkg.label}</Text>
                  <Text style={[styles.pkgPrice, active && styles.pkgTextActive]}>
                    Rp {Number(pkg.price).toLocaleString('id-ID')}/hari
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Nomor Kandang *</Text>
          <TextInput
            style={styles.input}
            value={cageNumber}
            onChangeText={setCageNumber}
            placeholder="Contoh: KDG-01"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Tanggal Masuk (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={admissionDate}
            onChangeText={setAdmissionDate}
            placeholder="2026-11-20"
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Daftarkan Rawat Inap</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alert.visible} title={alert.title} message={alert.message} type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })} onConfirm={alert.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 24, paddingTop: 40, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginRight: 16 },
  backText: { color: '#0D9488', fontWeight: '600', fontSize: 14 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  scroll: { padding: 24, maxWidth: 800, width: '100%', alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  packageRow: { flexDirection: 'row', gap: 12 },
  pkgCard: { flex: 1, backgroundColor: '#FFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  pkgCardActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  pkgTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  pkgPrice: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  pkgTextActive: { color: '#FFF' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#111827' },
  btnSave: { backgroundColor: '#0D9488', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 32, elevation: 4 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  });
