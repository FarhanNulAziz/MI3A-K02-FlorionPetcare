import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createSOAPRecord } from '../../services/emrService';

export default function SOAPFormScreen() {
  const router = useRouter();
  const { patientId, patientName } = useLocalSearchParams();

  const [temperature, setTemperature] = useState('');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);

  const notify = (title: string, message: string, onDone?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      onDone?.();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: onDone }]);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pasien');
  };

  const handleSave = async () => {
    if (
      !patientId ||
      !temperature.trim() ||
      !subjective.trim() ||
      !objective.trim() ||
      !assessment.trim() ||
      !plan.trim()
    ) {
      notify('Peringatan', 'Semua kolom pemeriksaan SOAP & suhu tubuh wajib diisi.');
      return;
    }

    const temp = Number(temperature.replace(',', '.'));
    if (Number.isNaN(temp) || temp < 30 || temp > 45) {
      notify('Peringatan', 'Suhu tubuh harus berupa angka valid antara 30 - 45\u00B0C.');
      return;
    }

    setLoading(true);
    try {
      await createSOAPRecord({
        patient_id: Number(patientId),
        temperature: temp,
        subjective: subjective.trim(),
        objective: objective.trim(),
        assessment: assessment.trim(),
        plan: plan.trim(),
      });
      notify('Berhasil', 'Catatan diagnostik SOAP berhasil disimpan ke rekam medis.', handleBack);
    } catch (error: any) {
      notify('Gagal Menyimpan', error?.message || 'Terjadi kesalahan saat menyimpan catatan SOAP.');
    } finally {
      setLoading(false);
    }
  };

  const renderSOAPField = (
    badge: string,
    badgeColor: string,
    title: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string
  ) => (
    <View style={styles.cardField}>
      <View style={styles.fieldHeader}>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
        <Text style={styles.label}>{title}</Text>
      </View>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline
        textAlignVertical="top"
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backText}>{'\u2190'} Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Diagnostik SOAP</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.patientBanner}>
          <Text style={styles.patientEmoji}>{'\u{1FA7A}'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientLabel}>Pemeriksaan Pasien</Text>
            <Text style={styles.patientName}>{patientName || `Pasien #${patientId}`}</Text>
          </View>
        </View>

        <View style={styles.cardField}>
          <Text style={styles.label}>{'\u{1F321}\u{FE0F}'} Suhu Tubuh ({'\u00B0'}C)</Text>
          <TextInput
            style={styles.input}
            value={temperature}
            onChangeText={setTemperature}
            placeholder="Contoh: 38.5 (Normal anjing/kucing: 38.0 - 39.2)"
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
          />
        </View>

        {renderSOAPField(
          'S', '#2563EB', 'Subjective (Keluhan & Anamnesis)',
          subjective, setSubjective,
          'Catat keluhan pemilik hewan, nafsu makan, durasi gejala...'
        )}

        {renderSOAPField(
          'O', '#0D9488', 'Objective (Pemeriksaan Fisik & Klinis)',
          objective, setObjective,
          'Catat hasil inspeksi fisik, palpasi, auskultasi, mukosa...'
        )}

        {renderSOAPField(
          'A', '#D97706', 'Assessment (Diagnosis / Diferensial)',
          assessment, setAssessment,
          'Catat diagnosis utama atau dugaan penyakit...'
        )}

        {renderSOAPField(
          'P', '#DC2626', 'Plan (Rencana Terapi & Tindakan)',
          plan, setPlan,
          'Catat rencana pengobatan, resep obat, tindakan, atau rawat inap...'
        )}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Simpan Catatan SOAP</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    paddingHorizontal: 20, paddingTop: 42, paddingBottom: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backText: { color: '#0D9488', fontSize: 15, fontWeight: '700', marginRight: 14 },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20, paddingBottom: 48 },

  patientBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA',
    borderWidth: 1, borderColor: '#99F6E4', padding: 16, borderRadius: 14, marginBottom: 18,
  },
  patientEmoji: { fontSize: 28, marginRight: 12 },
  patientLabel: { fontSize: 11, fontWeight: '700', color: '#0F766E', textTransform: 'uppercase' },
  patientName: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginTop: 2 },

  cardField: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  badge: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center',
    justifyContent: 'center', marginRight: 8,
  },
  badgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  label: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A',
  },
  multilineInput: { minHeight: 88, marginTop: 2 },
  saveButton: {
    backgroundColor: '#0D9488', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8, shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
