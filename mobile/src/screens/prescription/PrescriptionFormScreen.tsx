import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  getMasterMedicines,
  getMasterTreatments,
  createPrescription,
  getPrescriptions,
  deletePrescription,
  getPharmacyErrorMessage,
} from '../../services/pharmacyService';
import { getPatientMedicalRecords } from '../../services/emrService';
import { getPatientsList } from '../../services/inpatientService';
import { getUser } from '../../utils/storage';
import CustomAlert from '../../components/custom-alert';

type AlertType = 'success' | 'error' | 'info' | 'confirm';

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
  loading?: boolean;
  onConfirm?: (() => void) | undefined;
};

type Medicine = {
  id: number;
  name: string;
  unit: string;
  stock: number;
  price: number;
  description?: string | null;
  is_active?: boolean;
};

type Treatment = {
  id: number;
  name: string;
  price_min: number | null;
  price_max: number | null;
  price: number | null;
  price_type: 'fixed' | 'range' | 'relative';
  is_relative: boolean;
  requires_consent: boolean;
};

type SelectedMedicine = {
  medicine: Medicine;
  quantity: number;
  dosageRule: string;
  mustFinish: boolean;
};

type SelectedTreatment = {
  key: string;
  treatment: Treatment;
  price: string;
  customName: string;
  consentGiven: boolean;
  consentBy: string;
};

const ALLOWED_ROLES = ['dokter', 'paramedik', 'admin'];

const normalizeParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

const toNumberOrNull = (value?: string) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatRupiah = (value: number | null | undefined) =>
  `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const summarizeAssessment = (value?: string | null) => {
  if (!value) return 'Tanpa ringkasan';
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean;
};

const formatTreatmentPrice = (treatment: Treatment) => {
  if (treatment.price_type === 'relative') return 'Tarif relatif';
  if (treatment.price_type === 'fixed') {
    return formatRupiah(treatment.price ?? treatment.price_min ?? 0);
  }
  return `${formatRupiah(treatment.price_min)} – ${formatRupiah(treatment.price_max)}`;
};

const getRecordErrorMessage = (error: any) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (!error?.response) {
    return 'Tidak dapat terhubung ke server, periksa koneksi/IP gateway';
  }
  return 'Gagal memuat rekam medis pasien';
};

export default function PrescriptionFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialPatientId = toNumberOrNull(normalizeParam(params.patientId));
  const initialPatientName = normalizeParam(params.patientName) || '';
  const initialRecordId = toNumberOrNull(normalizeParam(params.medicalRecordId));

  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  const [alert, setAlert] = useState<AlertState>({
    visible: false, title: '', message: '', type: 'info', onConfirm: undefined,
  });

  const [patientId, setPatientId] = useState<number | null>(initialPatientId);
  const [patientName, setPatientName] = useState(initialPatientName);
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientsError, setPatientsError] = useState('');

  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(initialRecordId);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState('');

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [medicinesError, setMedicinesError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [treatmentsError, setTreatmentsError] = useState('');

  const [selectedMedicines, setSelectedMedicines] = useState<SelectedMedicine[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([]);
  const treatmentKeyRef = useRef(0);
  const [notes, setNotes] = useState('');

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [prescriptionsError, setPrescriptionsError] = useState('');

  const [saving, setSaving] = useState(false);

  const isAllowed = role !== null && ALLOWED_ROLES.includes(role);
  const isDoctor = role === 'dokter';

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    setPatientsError('');
    try {
      const res = await getPatientsList();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setPatients(Array.isArray(list) ? list : []);
    } catch (error) {
      setPatientsError(getPharmacyErrorMessage(error));
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const loadRecords = useCallback(async (pid: number) => {
    setLoadingRecords(true);
    setRecordsError('');
    try {
      const res = await getPatientMedicalRecords(pid);
      const timeline = Array.isArray(res?.timeline) ? res.timeline : [];
      setRecords(timeline);
      if (timeline.length > 0) {
        setSelectedRecordId((prev) => {
          const stillExists = prev !== null && timeline.some((r: any) => Number(r.id) === Number(prev));
          return stillExists ? prev : Number(timeline[0].id);
        });
      } else {
        setSelectedRecordId(null);
      }
    } catch (error) {
      setRecordsError(getRecordErrorMessage(error));
      setRecords([]);
      setSelectedRecordId(null);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  const loadMedicines = useCallback(async (keyword: string) => {
    setLoadingMedicines(true);
    setMedicinesError('');
    try {
      const res = await getMasterMedicines(keyword);
      const list = Array.isArray(res) ? res : [];
      setMedicines(list);
      setSelectedMedicines((prev) =>
        prev.map((item) => {
          const fresh = list.find((medicine: Medicine) => medicine.id === item.medicine.id);
          if (!fresh) return item;
          return {
            ...item,
            medicine: fresh,
            quantity: Math.min(item.quantity, Math.max(1, fresh.stock)),
          };
        }),
      );
    } catch (error) {
      setMedicinesError(getPharmacyErrorMessage(error));
      setMedicines([]);
    } finally {
      setLoadingMedicines(false);
    }
  }, []);

  const loadTreatments = useCallback(async () => {
    setLoadingTreatments(true);
    setTreatmentsError('');
    try {
      const res = await getMasterTreatments();
      setTreatments(Array.isArray(res) ? res : []);
    } catch (error) {
      setTreatmentsError(getPharmacyErrorMessage(error));
      setTreatments([]);
    } finally {
      setLoadingTreatments(false);
    }
  }, []);

  const loadPrescriptions = useCallback(async (recordId: number) => {
    setLoadingPrescriptions(true);
    setPrescriptionsError('');
    try {
      const res = await getPrescriptions({ medicalRecordId: recordId });
      setPrescriptions(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      setPrescriptionsError(getPharmacyErrorMessage(error));
      setPrescriptions([]);
    } finally {
      setLoadingPrescriptions(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkRole = async () => {
      const user = await getUser();
      if (!mounted) return;
      const currentRole = user?.role || null;
      setRole(currentRole);
      setRoleChecked(true);

      if (!currentRole || !ALLOWED_ROLES.includes(currentRole)) {
        setAlert({
          visible: true,
          title: 'Akses Ditolak',
          message: 'Halaman resep hanya dapat dibuka oleh dokter, paramedik, atau admin.',
          type: 'error',
          onConfirm: () => {
            setAlert((prev) => ({ ...prev, visible: false }));
            handleBack();
          },
        });
      }
    };
    checkRole();
    return () => { mounted = false; };
  }, [handleBack]);

  useEffect(() => {
    if (!roleChecked) return;
    if (!initialPatientId) loadPatients();
  }, [roleChecked, initialPatientId, loadPatients]);

  useEffect(() => {
    if (!roleChecked || !patientId) return;
    if (initialRecordId) {
      setSelectedRecordId(initialRecordId);
      return;
    }
    loadRecords(patientId);
  }, [roleChecked, patientId, initialRecordId, loadRecords]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!roleChecked || role !== 'dokter') return;
    loadMedicines(debouncedSearch);
  }, [roleChecked, role, debouncedSearch, loadMedicines]);

  useEffect(() => {
    if (!roleChecked || role !== 'dokter') return;
    loadTreatments();
  }, [roleChecked, role, loadTreatments]);

  useEffect(() => {
    if (!roleChecked) return;
    if (!selectedRecordId) {
      setPrescriptions([]);
      return;
    }
    loadPrescriptions(selectedRecordId);
  }, [roleChecked, selectedRecordId, loadPrescriptions]);

  const handleSelectPatient = (patient: any) => {
    setPatientId(patient.id);
    setPatientName(patient.name || '');
    setRecords([]);
    setSelectedRecordId(null);
    setPrescriptions([]);
    setSelectedMedicines([]);
    setSelectedTreatments([]);
    setNotes('');
  };

  const addMedicine = (medicine: Medicine) => {
    if (medicine.stock <= 0) return;
    setSelectedMedicines((prev) => {
      if (prev.some((item) => item.medicine.id === medicine.id)) return prev;
      return [...prev, { medicine, quantity: 1, dosageRule: '', mustFinish: false }];
    });
  };

  const updateMedicine = (id: number, patch: Partial<SelectedMedicine>) => {
    setSelectedMedicines((prev) =>
      prev.map((item) => (item.medicine.id === id ? { ...item, ...patch } : item)),
    );
  };

  const changeQuantity = (id: number, delta: number) => {
    setSelectedMedicines((prev) =>
      prev.map((item) => {
        if (item.medicine.id !== id) return item;
        const next = Math.min(item.medicine.stock, Math.max(1, item.quantity + delta));
        return { ...item, quantity: next };
      }),
    );
  };

  const removeMedicine = (id: number) => {
    setSelectedMedicines((prev) => prev.filter((item) => item.medicine.id !== id));
  };

  const nextTreatmentKey = () => {
    treatmentKeyRef.current += 1;
    return `trx-${treatmentKeyRef.current}`;
  };

  const addTreatment = (treatment: Treatment) => {
    const key = nextTreatmentKey();
    setSelectedTreatments((prev) => [
      ...prev,
      {
        key,
        treatment,
        price: '',
        customName: '',
        consentGiven: false,
        consentBy: '',
      },
    ]);
  };

  const toggleTreatment = (treatment: Treatment) => {
    if (treatment.price_type === 'relative') {
      addTreatment(treatment);
      return;
    }

    const exists = selectedTreatments.some((item) => item.treatment.id === treatment.id);
    if (exists) {
      setSelectedTreatments((prev) =>
        prev.filter((item) => item.treatment.id !== treatment.id),
      );
      return;
    }
    addTreatment(treatment);
  };

  const updateTreatment = (key: string, patch: Partial<SelectedTreatment>) => {
    setSelectedTreatments((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeTreatment = (key: string) => {
    setSelectedTreatments((prev) => prev.filter((item) => item.key !== key));
  };

  const estimatedTotal = selectedMedicines.reduce(
    (sum, item) => sum + Number(item.medicine.price || 0) * item.quantity,
    0,
  ) + selectedTreatments.reduce((sum, item) => {
    const type = item.treatment.price_type;
    if (type === 'relative' || type === 'range') {
      return sum + (Number(item.price) || 0);
    }
    return sum + Number(item.treatment.price ?? item.treatment.price_min ?? 0);
  }, 0);

  const relativeTreatment = treatments.find((item) => item.price_type === 'relative');

  const validateForm = (): string | null => {
    if (!patientId) return 'Pilih pasien terlebih dahulu.';
    if (!selectedRecordId) return 'Pilih rekam medis pasien terlebih dahulu.';
    if (selectedMedicines.length === 0 && selectedTreatments.length === 0) {
      return 'Minimal pilih satu obat atau satu tindakan.';
    }

    for (const item of selectedMedicines) {
      if (
        !Number.isInteger(item.quantity)
        || item.quantity < 1
        || item.quantity > item.medicine.stock
      ) {
        return `Jumlah ${item.medicine.name} harus antara 1 dan ${item.medicine.stock}.`;
      }
      if (!item.dosageRule.trim()) {
        return `Aturan pakai untuk ${item.medicine.name} wajib diisi.`;
      }
    }

    for (const item of selectedTreatments) {
      const treatment = item.treatment;

      if (treatment.price_type === 'relative') {
        if (!item.customName.trim()) return 'Nama tindakan lain wajib diisi.';
        if (item.customName.trim().length > 150) {
          return 'Nama tindakan lain maksimal 150 karakter.';
        }
        const price = Number(item.price);
        if (!item.price.trim() || Number.isNaN(price) || price < 0) {
          return 'Tarif tindakan lain wajib diisi dan tidak boleh negatif.';
        }
      } else if (treatment.price_type === 'range') {
        const price = Number(item.price);
        const min = Number(treatment.price_min ?? 0);
        const max = Number(treatment.price_max ?? 0);
        if (!item.price.trim() || Number.isNaN(price)) {
          return `Tarif ${treatment.name} wajib diisi antara ${formatRupiah(min)} dan ${formatRupiah(max)}.`;
        }
        if (price < min || price > max) {
          return `Tarif ${treatment.name} harus di antara ${formatRupiah(min)} dan ${formatRupiah(max)}.`;
        }
      }

      if (treatment.requires_consent) {
        if (!item.consentGiven) {
          return `Centang persetujuan pemilik untuk tindakan ${treatment.name}.`;
        }
        if (!item.consentBy.trim()) {
          return `Nama pemilik/wali yang menyetujui tindakan ${treatment.name} wajib diisi.`;
        }
      }
    }

    if (notes.length > 255) return 'Catatan maksimal 255 karakter.';
    return null;
  };

  const buildPayload = () => {
    const medicinePayload = selectedMedicines.map((item) => ({
      medicine_id: item.medicine.id,
      quantity: item.quantity,
      dosage_rule: item.dosageRule.trim(),
      must_finish: item.mustFinish,
    }));

    const treatmentPayload = selectedTreatments.map((item) => {
      const payload: any = { treatment_id: item.treatment.id };

      if (item.treatment.price_type === 'relative') {
        payload.custom_name = item.customName.trim();
        payload.price = Number(item.price);
      } else if (item.treatment.price_type === 'range') {
        payload.price = Number(item.price);
      }

      if (item.treatment.requires_consent) {
        payload.consent_given = item.consentGiven;
        payload.consent_by = item.consentBy.trim();
      }

      return payload;
    });

    return {
      medical_record_id: selectedRecordId,
      patient_id: patientId,
      notes: notes.trim() ? notes.trim() : null,
      medicines: medicinePayload,
      treatments: treatmentPayload,
    };
  };

  const handleSave = async () => {
    if (saving) return;

    const validationMessage = validateForm();
    if (validationMessage) {
      setAlert({
        visible: true,
        title: 'Validasi Gagal',
        message: validationMessage,
        type: 'error',
        onConfirm: undefined,
      });
      return;
    }

    setSaving(true);
    try {
      await createPrescription(buildPayload());
      setSelectedMedicines([]);
      setSelectedTreatments([]);
      setNotes('');

      setAlert({
        visible: true,
        title: 'Sukses',
        message: 'Resep & tindakan medis berhasil disimpan.',
        type: 'success',
        onConfirm: undefined,
      });

      await Promise.all([
        loadMedicines(debouncedSearch),
        selectedRecordId ? loadPrescriptions(selectedRecordId) : Promise.resolve(),
      ]);
    } catch (error) {
      setAlert({
        visible: true,
        title: 'Gagal',
        message: getPharmacyErrorMessage(error),
        type: 'error',
        onConfirm: undefined,
      });
      loadMedicines(debouncedSearch);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeletePrescription = (prescription: any) => {
    setAlert({
      visible: true,
      title: 'Batalkan Resep',
      message: `Yakin ingin membatalkan resep tanggal ${formatDateTime(prescription.created_at)}? Stok obat akan dikembalikan.`,
      type: 'confirm',
      loading: false,
      onConfirm: async () => {
        setAlert((prev) => ({ ...prev, loading: true }));
        try {
          await deletePrescription(prescription.id);
          setAlert({
            visible: true,
            title: 'Sukses',
            message: 'Resep dibatalkan dan stok obat telah dikembalikan.',
            type: 'success',
            loading: false,
            onConfirm: undefined,
          });
          await Promise.all([
            selectedRecordId ? loadPrescriptions(selectedRecordId) : Promise.resolve(),
            loadMedicines(debouncedSearch),
          ]);
        } catch (error) {
          setAlert({
            visible: true,
            title: 'Gagal',
            message: getPharmacyErrorMessage(error),
            type: 'error',
            loading: false,
            onConfirm: undefined,
          });
        }
      },
    });
  };

  const renderErrorBox = (message: string, onRetry: () => void) => (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Coba lagi</Text>
      </TouchableOpacity>
    </View>
  );

  if (!roleChecked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>Memeriksa akses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resep & Tindakan</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {!isAllowed ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Anda tidak memiliki akses ke halaman ini.</Text>
            </View>
          ) : (
            <>
              <View style={styles.contextCard}>
                <Text style={styles.sectionTitle}>Konteks Resep</Text>
                {patientName ? <Text style={styles.patientName}>Pasien: {patientName}</Text> : null}

                {!initialPatientId && (
                  <>
                    <Text style={styles.fieldLabel}>Pilih pasien</Text>
                    {loadingPatients ? (
                      <ActivityIndicator color="#0D9488" style={{ marginVertical: 10 }} />
                    ) : patientsError ? (
                      renderErrorBox(patientsError, loadPatients)
                    ) : patients.length === 0 ? (
                      <Text style={styles.emptyText}>Belum ada data pasien.</Text>
                    ) : (
                      <View style={styles.chipWrap}>
                        {patients.map((patient) => {
                          const active = patientId === patient.id;
                          return (
                            <TouchableOpacity
                              key={patient.id}
                              style={[styles.chip, active && styles.chipActive]}
                              onPress={() => handleSelectPatient(patient)}
                            >
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {patient.name}
                              </Text>
                              <Text style={[styles.chipPrice, active && styles.chipTextActive]}>
                                {patient.owner?.name || '-'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}

                {initialRecordId ? (
                  <Text style={styles.recordInfo}>Rekam medis ID #{initialRecordId}</Text>
                ) : patientId ? (
                  <>
                    <Text style={styles.fieldLabel}>Pilih rekam medis (SOAP)</Text>
                    {loadingRecords ? (
                      <ActivityIndicator color="#0D9488" style={{ marginVertical: 10 }} />
                    ) : recordsError ? (
                      renderErrorBox(recordsError, () => loadRecords(patientId))
                    ) : records.length === 0 ? (
                      <Text style={styles.emptyText}>
                        Buat catatan SOAP dulu sebelum menulis resep.
                      </Text>
                    ) : (
                      <View style={styles.chipWrap}>
                        {records.map((record) => {
                          const active = selectedRecordId === Number(record.id);
                          return (
                            <TouchableOpacity
                              key={record.id}
                              style={[styles.chip, active && styles.chipActive]}
                              onPress={() => setSelectedRecordId(Number(record.id))}
                            >
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {formatDate(record.created_at)}
                              </Text>
                              <Text
                                style={[styles.chipPrice, active && styles.chipTextActive]}
                                numberOfLines={1}
                              >
                                {summarizeAssessment(record.assessment)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                ) : null}
              </View>

              {isDoctor && selectedRecordId ? (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Obat</Text>

                    <View style={styles.searchWrap}>
                      <Text style={styles.searchIcon}>🔍</Text>
                      <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Cari nama obat..."
                        placeholderTextColor="#9CA3AF"
                      />
                      {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                          <Text style={styles.clearIcon}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {loadingMedicines ? (
                      <ActivityIndicator color="#0D9488" style={{ marginVertical: 10 }} />
                    ) : medicinesError ? (
                      renderErrorBox(medicinesError, () => loadMedicines(debouncedSearch))
                    ) : medicines.length === 0 ? (
                      <Text style={styles.emptyText}>Obat tidak ditemukan.</Text>
                    ) : (
                      <View style={styles.medicineList}>
                        {medicines.map((medicine) => {
                          const selected = selectedMedicines.some(
                            (item) => item.medicine.id === medicine.id,
                          );
                          const habis = medicine.stock <= 0;
                          return (
                            <TouchableOpacity
                              key={medicine.id}
                              style={[styles.medCard, (selected || habis) && styles.medCardDisabled]}
                              disabled={selected || habis}
                              onPress={() => addMedicine(medicine)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.medName}>{medicine.name}</Text>
                                <Text style={styles.medMeta}>
                                  {medicine.unit} • Stok {medicine.stock} • {formatRupiah(medicine.price)}
                                </Text>
                              </View>
                              <Text style={[styles.medAction, habis && styles.medActionDisabled]}>
                                {habis ? 'Habis' : selected ? 'Ditambahkan' : '+ Tambah'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {selectedMedicines.length > 0 && (
                      <View style={styles.selectedWrap}>
                        <Text style={styles.subLabel}>Obat terpilih</Text>
                        {selectedMedicines.map((item) => (
                          <View key={item.medicine.id} style={styles.selectedCard}>
                            <View style={styles.selectedHeader}>
                              <Text style={styles.selectedName}>{item.medicine.name}</Text>
                              <TouchableOpacity onPress={() => removeMedicine(item.medicine.id)}>
                                <Text style={styles.removeText}>Hapus</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.stepperRow}>
                              <Text style={styles.fieldLabel}>Jumlah</Text>
                              <View style={styles.stepper}>
                                <TouchableOpacity
                                  style={styles.stepBtn}
                                  disabled={item.quantity <= 1}
                                  onPress={() => changeQuantity(item.medicine.id, -1)}
                                >
                                  <Text style={styles.stepBtnText}>−</Text>
                                </TouchableOpacity>
                                <Text style={styles.stepValue}>{item.quantity}</Text>
                                <TouchableOpacity
                                  style={styles.stepBtn}
                                  disabled={item.quantity >= item.medicine.stock}
                                  onPress={() => changeQuantity(item.medicine.id, 1)}
                                >
                                  <Text style={styles.stepBtnText}>+</Text>
                                </TouchableOpacity>
                              </View>
                              <Text style={styles.stepHint}>maks {item.medicine.stock}</Text>
                            </View>

                            <Text style={styles.fieldLabel}>Aturan pakai *</Text>
                            <TextInput
                              style={styles.input}
                              value={item.dosageRule}
                              onChangeText={(value) =>
                                updateMedicine(item.medicine.id, { dosageRule: value })
                              }
                              placeholder="Contoh: 3x1 sesudah makan"
                              placeholderTextColor="#9CA3AF"
                              maxLength={150}
                            />

                            <View style={styles.switchRow}>
                              <Text style={styles.fieldLabel}>Wajib dihabiskan</Text>
                              <Switch
                                value={item.mustFinish}
                                onValueChange={(value) =>
                                  updateMedicine(item.medicine.id, { mustFinish: value })
                                }
                                trackColor={{ false: '#D1D5DB', true: '#0D9488' }}
                                thumbColor="#FFFFFF"
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tindakan</Text>

                    {loadingTreatments ? (
                      <ActivityIndicator color="#0D9488" style={{ marginVertical: 10 }} />
                    ) : treatmentsError ? (
                      renderErrorBox(treatmentsError, loadTreatments)
                    ) : treatments.length === 0 ? (
                      <Text style={styles.emptyText}>Tindakan tidak tersedia.</Text>
                    ) : (
                      <View style={styles.chipWrap}>
                        {treatments.map((treatment) => {
                          const relative = treatment.price_type === 'relative';
                          const selected = !relative && selectedTreatments.some(
                            (item) => item.treatment.id === treatment.id,
                          );
                          return (
                            <TouchableOpacity
                              key={treatment.id}
                              style={[styles.chip, selected && styles.chipActive]}
                              onPress={() => toggleTreatment(treatment)}
                            >
                              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                                {treatment.name}
                              </Text>
                              <Text style={[styles.chipPrice, selected && styles.chipTextActive]}>
                                {formatTreatmentPrice(treatment)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {relativeTreatment && (
                      <TouchableOpacity
                        style={styles.addOtherBtn}
                        onPress={() => addTreatment(relativeTreatment)}
                      >
                        <Text style={styles.addOtherText}>+ Tambah tindakan lain</Text>
                      </TouchableOpacity>
                    )}

                    {selectedTreatments.length > 0 && (
                      <View style={styles.selectedWrap}>
                        <Text style={styles.subLabel}>Tindakan terpilih</Text>
                        {selectedTreatments.map((item) => {
                          const treatment = item.treatment;
                          return (
                            <View key={item.key} style={styles.selectedCard}>
                              <View style={styles.selectedHeader}>
                                <Text style={styles.selectedName}>
                                  {treatment.price_type === 'relative'
                                    ? 'Tindakan Lainnya'
                                    : treatment.name}
                                </Text>
                                <TouchableOpacity onPress={() => removeTreatment(item.key)}>
                                  <Text style={styles.removeText}>Hapus</Text>
                                </TouchableOpacity>
                              </View>

                              {treatment.price_type === 'relative' && (
                                <>
                                  <Text style={styles.fieldLabel}>Nama tindakan *</Text>
                                  <TextInput
                                    style={styles.input}
                                    value={item.customName}
                                    onChangeText={(value) =>
                                      updateTreatment(item.key, { customName: value })
                                    }
                                    placeholder="Contoh: Perawatan luka"
                                    placeholderTextColor="#9CA3AF"
                                    maxLength={150}
                                  />
                                </>
                              )}

                              {treatment.price_type === 'range' && (
                                <>
                                  <Text style={styles.fieldLabel}>
                                    Tarif ({formatRupiah(treatment.price_min)} – {formatRupiah(treatment.price_max)}) *
                                  </Text>
                                  <TextInput
                                    style={styles.input}
                                    value={item.price}
                                    onChangeText={(value) =>
                                      updateTreatment(item.key, { price: value })
                                    }
                                    placeholder={`Contoh: ${treatment.price_min ?? 0}`}
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                  />
                                </>
                              )}

                              {treatment.price_type === 'relative' && (
                                <>
                                  <Text style={styles.fieldLabel}>Tarif *</Text>
                                  <TextInput
                                    style={styles.input}
                                    value={item.price}
                                    onChangeText={(value) =>
                                      updateTreatment(item.key, { price: value })
                                    }
                                    placeholder="Contoh: 75000"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                  />
                                </>
                              )}

                              {treatment.requires_consent && (
                                <View style={styles.consentWrap}>
                                  <TouchableOpacity
                                    style={styles.checkRow}
                                    onPress={() =>
                                      updateTreatment(item.key, {
                                        consentGiven: !item.consentGiven,
                                      })
                                    }
                                  >
                                    <View
                                      style={[
                                        styles.checkbox,
                                        item.consentGiven && styles.checkboxChecked,
                                      ]}
                                    >
                                      {item.consentGiven && <Text style={styles.checkMark}>✓</Text>}
                                    </View>
                                    <Text style={styles.checkLabel}>
                                      Pemilik hewan telah menyetujui tindakan
                                    </Text>
                                  </TouchableOpacity>

                                  <Text style={styles.fieldLabel}>
                                    Nama pemilik/wali yang menyetujui *
                                  </Text>
                                  <TextInput
                                    style={styles.input}
                                    value={item.consentBy}
                                    onChangeText={(value) =>
                                      updateTreatment(item.key, { consentBy: value })
                                    }
                                    placeholder="Contoh: Budi Santoso"
                                    placeholderTextColor="#9CA3AF"
                                    maxLength={150}
                                  />
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Catatan</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Catatan tambahan (opsional)"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      maxLength={255}
                    />
                    <Text style={styles.counter}>{notes.length}/255</Text>
                  </View>

                  <View style={styles.estimateCard}>
                    <Text style={styles.estimateLabel}>Estimasi biaya</Text>
                    <Text style={styles.estimateValue}>{formatRupiah(estimatedTotal)}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.btnSave, saving && styles.btnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.btnText}>Simpan Resep & Tindakan</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}

              {selectedRecordId ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Resep Tersimpan</Text>

                  {loadingPrescriptions ? (
                    <ActivityIndicator color="#0D9488" style={{ marginVertical: 10 }} />
                  ) : prescriptionsError ? (
                    renderErrorBox(prescriptionsError, () => loadPrescriptions(selectedRecordId))
                  ) : prescriptions.length === 0 ? (
                    <Text style={styles.emptyText}>Belum ada resep tersimpan.</Text>
                  ) : (
                    prescriptions.map((prescription) => (
                      <View key={prescription.id} style={styles.prescriptionCard}>
                        <View style={styles.prescriptionHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.prescriptionDate}>
                              {formatDateTime(prescription.created_at)}
                            </Text>
                            <Text style={styles.prescriptionDoctor}>
                              Dokter: {prescription.doctor_name || '-'}
                            </Text>
                          </View>
                          <Text style={styles.prescriptionTotal}>
                            {formatRupiah(prescription.total)}
                          </Text>
                        </View>

                        {prescription.notes ? (
                          <Text style={styles.prescriptionNotes}>{prescription.notes}</Text>
                        ) : null}

                        {Array.isArray(prescription.medicines) && prescription.medicines.length > 0 && (
                          <View style={styles.rxBlock}>
                            <Text style={styles.rxBlockTitle}>Obat</Text>
                            {prescription.medicines.map((medicine: any, index: number) => (
                              <View key={medicine.id ?? index} style={styles.rxItem}>
                                <View style={styles.rxItemRow}>
                                  <Text style={styles.rxItemName}>
                                    {medicine.medicine_name} ({medicine.unit}) × {medicine.quantity}
                                  </Text>
                                  <Text style={styles.rxItemPrice}>
                                    {formatRupiah(
                                      Number(medicine.unit_price || 0) * Number(medicine.quantity || 0),
                                    )}
                                  </Text>
                                </View>
                                <Text style={styles.rxItemSub}>
                                  Aturan pakai: {medicine.dosage_rule}
                                </Text>
                                {medicine.must_finish && (
                                  <View style={styles.badgeRow}>
                                    <View style={styles.badge}>
                                      <Text style={styles.badgeText}>Wajib dihabiskan</Text>
                                    </View>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>
                        )}

                        {Array.isArray(prescription.treatments) && prescription.treatments.length > 0 && (
                          <View style={styles.rxBlock}>
                            <Text style={styles.rxBlockTitle}>Tindakan</Text>
                            {prescription.treatments.map((treatment: any, index: number) => (
                              <View key={treatment.id ?? index} style={styles.rxItem}>
                                <View style={styles.rxItemRow}>
                                  <Text style={styles.rxItemName}>
                                    {treatment.custom_name || treatment.treatment_name}
                                  </Text>
                                  <Text style={styles.rxItemPrice}>
                                    {formatRupiah(treatment.price)}
                                  </Text>
                                </View>
                                {treatment.consent_given && (
                                  <View style={styles.badgeRow}>
                                    <View style={styles.badge}>
                                      <Text style={styles.badgeText}>
                                        Disetujui oleh {treatment.consent_by || '-'}
                                      </Text>
                                    </View>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>
                        )}

                        {isDoctor && (
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => confirmDeletePrescription(prescription)}
                          >
                            <Text style={styles.cancelText}>Batalkan resep</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        loading={alert.loading}
        onClose={closeAlert}
        onConfirm={alert.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 13 },
  header: { padding: 24, paddingTop: 40, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginRight: 16 },
  backText: { color: '#0D9488', fontWeight: '600', fontSize: 14 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  scroll: { padding: 24, maxWidth: 800, width: '100%', alignSelf: 'center' },
  contextCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', padding: 16, marginBottom: 16 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  patientName: { fontSize: 13, fontWeight: '600', color: '#0D9488', marginBottom: 8 },
  recordInfo: { fontSize: 13, color: '#374151', marginTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  subLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 16 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', maxWidth: 280 },
  chipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  chipPrice: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { fontSize: 13, marginRight: 8, color: '#9CA3AF' },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  clearBtn: { padding: 8 },
  clearIcon: { fontSize: 13, color: '#9CA3AF', fontWeight: 'bold' },
  medicineList: { gap: 8 },
  medCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  medCardDisabled: { backgroundColor: '#F9FAFB' },
  medName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  medMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  medAction: { fontSize: 12, fontWeight: '700', color: '#0D9488', marginLeft: 12 },
  medActionDisabled: { color: '#9CA3AF' },
  selectedWrap: { marginTop: 4 },
  selectedCard: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 10 },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  selectedName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  removeText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#FFFFFF' },
  stepBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  stepBtnText: { fontSize: 16, fontWeight: 'bold', color: '#0D9488' },
  stepValue: { minWidth: 32, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#111827' },
  stepHint: { fontSize: 12, color: '#6B7280' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827' },
  textArea: { minHeight: 84, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  addOtherBtn: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#0D9488' },
  addOtherText: { fontSize: 13, fontWeight: '700', color: '#0D9488' },
  consentWrap: { marginTop: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: '#FFFFFF' },
  checkboxChecked: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  checkMark: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  checkLabel: { flex: 1, fontSize: 13, color: '#374151' },
  estimateCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E6F4F1', borderRadius: 16, padding: 16, marginBottom: 16 },
  estimateLabel: { fontSize: 14, fontWeight: '700', color: '#0F766E' },
  estimateValue: { fontSize: 18, fontWeight: '900', color: '#0D9488' },
  btnSave: { backgroundColor: '#0D9488', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 24, elevation: 4 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginVertical: 8 },
  errorText: { fontSize: 13, color: '#B91C1C', marginBottom: 8 },
  retryBtn: { alignSelf: 'flex-start', backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  retryText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  emptyText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', marginVertical: 8 },
  prescriptionCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 12 },
  prescriptionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  prescriptionDate: { fontSize: 13, fontWeight: '700', color: '#111827' },
  prescriptionDoctor: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  prescriptionTotal: { fontSize: 14, fontWeight: '900', color: '#0D9488', marginLeft: 12 },
  prescriptionNotes: { fontSize: 12, color: '#4B5563', fontStyle: 'italic', marginBottom: 8 },
  rxBlock: { marginTop: 8 },
  rxBlockTitle: { fontSize: 12, fontWeight: '800', color: '#0F766E', marginBottom: 6, textTransform: 'uppercase' },
  rxItem: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, marginTop: 8 },
  rxItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rxItemName: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  rxItemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  rxItemPrice: { fontSize: 13, fontWeight: '700', color: '#111827' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#E6F4F1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0F766E' },
  cancelBtn: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  cancelText: { fontSize: 12, fontWeight: '700', color: '#B91C1C' },
});
