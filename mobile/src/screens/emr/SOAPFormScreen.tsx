import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/pasien');
    }
  };

  const handleSave = async () => {
    console.log('TOMBOL SIMPAN SOAP DIKLIK');

    if (
      !patientId ||
      !temperature.trim() ||
      !subjective.trim() ||
      !objective.trim() ||
      !assessment.trim() ||
      !plan.trim()
    ) {
      showMessage('Peringatan', 'Semua kolom wajib diisi.');
      return;
    }

    const temp = Number(temperature);

    if (Number.isNaN(temp) || temp < 30 || temp > 45) {
      showMessage('Peringatan', 'Suhu harus berupa angka antara 30–45°C.');
      return;
    }

    setLoading(true);

    try {
      const result = await createSOAPRecord({
        patient_id: Number(patientId),
        temperature: temp,
        subjective: subjective.trim(),
        objective: objective.trim(),
        assessment: assessment.trim(),
        plan: plan.trim(),
      });

      console.log('SOAP BERHASIL DISIMPAN:', result);

      showMessage('Berhasil', 'Catatan SOAP berhasil disimpan.');
      handleBack();
    } catch (error: any) {
      console.error('GAGAL MENYIMPAN SOAP:', error);

      showMessage(
        'Gagal',
        error?.message || 'Gagal menyimpan catatan SOAP.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    multiline = true
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Catat Diagnostik SOAP</Text>
        <Text style={styles.subtitle}>
          Isi hasil pemeriksaan medis pasien.
        </Text>

        <View style={styles.patientCard}>
          <Text style={styles.patientLabel}>Pasien</Text>
          <Text style={styles.patientName}>
            {patientName || 'Pasien belum dipilih'}
          </Text>
        </View>

        {renderField(
          'Suhu Tubuh (°C)',
          temperature,
          setTemperature,
          'Contoh: 38.5',
          false
        )}

        {renderField(
          'S - Subjective',
          subjective,
          setSubjective,
          'Masukkan keluhan atau informasi dari pemilik...'
        )}

        {renderField(
          'O - Objective',
          objective,
          setObjective,
          'Masukkan hasil pemeriksaan fisik...'
        )}

        {renderField(
          'A - Assessment',
          assessment,
          setAssessment,
          'Masukkan hasil penilaian atau diagnosis...'
        )}

        {renderField(
          'P - Plan',
          plan,
          setPlan,
          'Masukkan rencana tindakan atau pengobatan...'
        )}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              Simpan Catatan SOAP
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  backText: {
    color: '#3976B9',
    fontSize: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#243447',
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 6,
    marginBottom: 20,
  },
  patientCard: {
    backgroundColor: '#EAF2FA',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  patientLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  patientName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#243447',
    marginTop: 5,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DDE7',
    borderRadius: 9,
    padding: 13,
    fontSize: 14,
    color: '#243447',
  },
  multilineInput: {
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#3976B9',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
