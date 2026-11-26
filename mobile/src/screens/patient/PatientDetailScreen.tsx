import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, RefreshControl
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getUser } from '../../utils/storage';
import { getPatientMedicalRecords } from '../../services/emrService';

const getSpeciesEmoji = (species: string) => {
  const s = species?.toLowerCase() || '';
  if (s.includes('anjing')) return '\u{1F436}';
  if (s.includes('kucing')) return '\u{1F431}';
  if (s.includes('kelinci')) return '\u{1F430}';
  if (s.includes('burung')) return '\u{1F426}';
  return '\u{1F43E}';
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

function SOAPSection({ label, title, color, text }: { label: string; title: string; color: string; text: string }) {
  return (
    <View style={styles.soapRow}>
      <View style={[styles.soapBadge, { backgroundColor: color }]}>
        <Text style={styles.soapBadgeText}>{label}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.soapFieldTitle, { color }]}>{title}</Text>
        <Text style={styles.soapText}>{text}</Text>
      </View>
    </View>
  );
}

function TimelineItem({ item, isLast, onCreatePrescription }: { item: any; isLast: boolean; onCreatePrescription: () => void }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLine}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineConnector} />}
      </View>

      <TouchableOpacity
        style={styles.timelineCard}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={styles.timelineHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineDate}>{formatDate(item.created_at)}</Text>
            <Text style={styles.timelineTime}>Pukul {formatTime(item.created_at)} WIB</Text>
          </View>
          <View style={styles.expandPill}>
            <Text style={styles.expandIcon}>{expanded ? 'Tutup \u25B2' : 'Detail \u25BC'}</Text>
          </View>
        </View>

        <View style={styles.doctorRow}>
          <Text style={styles.doctorName}>{'\u{1FA7A}'} {item.doctor_name || 'Dokter Klinik'}</Text>
          {item.temperature != null && (
            <View style={styles.tempBadge}>
              <Text style={styles.tempText}>{'\u{1F321}\u{FE0F}'} {item.temperature}{'\u00B0'}C</Text>
            </View>
          )}
        </View>

        {expanded ? (
          <View style={styles.soapContainer}>
            <SOAPSection label="S" title="Subjective (Keluhan)" color="#2563EB" text={item.subjective} />
            <SOAPSection label="O" title="Objective (Pemeriksaan Fisik)" color="#0D9488" text={item.objective} />
            <SOAPSection label="A" title="Assessment (Diagnosis)" color="#D97706" text={item.assessment} />
            <SOAPSection label="P" title="Plan (Rencana Terapi)" color="#DC2626" text={item.plan} />

            <TouchableOpacity style={styles.rxInlineBtn} onPress={onCreatePrescription}>
              <Text style={styles.rxInlineBtnText}>{'\u{1F48A}'} Buat Resep & Tindakan untuk Kunjungan Ini</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.previewText} numberOfLines={2}>
            Diagnosis: {item.assessment || item.subjective}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function PatientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  let patient: any = {};
  try {
    patient = JSON.parse(params.patient as string);
  } catch {
    patient = { id: params.patientId, name: params.patientName || 'Detail Pasien' };
  }

  const [userRole, setUserRole] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const canAccessEMR = ['admin', 'dokter', 'paramedik'].includes(String(userRole || '').toLowerCase());

  const loadData = useCallback(async () => {
    try {
      const user = await getUser();
      const role = user?.role || null;
      setUserRole(role);
      setLoadingUser(false);

      if (['admin', 'dokter', 'paramedik'].includes(String(role || '').toLowerCase()) && patient.id) {
        setLoadingTimeline(true);
        setTimelineError(null);
        const result = await getPatientMedicalRecords(patient.id);
        const records = result.timeline || [];
        records.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTimeline(records);
      }
    } catch (err: any) {
      setTimelineError(err.message || 'Gagal memuat riwayat medis');
    } finally {
      setLoadingUser(false);
      setLoadingTimeline(false);
      setRefreshing(false);
    }
  }, [patient.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pasien');
  };

  if (loadingUser) {
    return (
      <View style={styles.centerFull}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'\u2190'} Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail & Rekam Medis</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            colors={['#0D9488']}
          />
        }
      >
        {/* Kartu Profil Pasien */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getSpeciesEmoji(patient.species)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.patientName}>{patient.name || 'Nama Pasien'}</Text>
              <Text style={styles.patientSpecies}>
                {patient.species || '-'} {patient.breed ? `\u2022 ${patient.breed}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Kelamin</Text>
              <Text style={styles.statValue}>{patient.gender || '-'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Umur</Text>
              <Text style={styles.statValue}>{patient.age ? `${patient.age} bln` : '-'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Berat</Text>
              <Text style={styles.statValue}>{patient.weight ? `${patient.weight} kg` : '-'}</Text>
            </View>
          </View>

          <View style={styles.ownerRow}>
            <Text style={styles.ownerIcon}>{'\u{1F464}'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerLabel}>Pemilik Hewan</Text>
              <Text style={styles.ownerName}>{patient.owner?.name || patient.owner_name || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Aksi Klinis (US-2002 & US-2003) */}
        {canAccessEMR && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() =>
                router.push({
                  pathname: '/soap-form',
                  params: { patientId: patient.id, patientName: patient.name },
                })
              }
            >
              <Text style={styles.primaryActionText}>{'\u{1FA7A}'} + Catat SOAP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() =>
                router.push({
                  pathname: '/prescription-form',
                  params: { patientId: patient.id, patientName: patient.name },
                })
              }
            >
              <Text style={styles.secondaryActionText}>{'\u{1F48A}'} + Resep & Tindakan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline Riwayat Medis (US-2001) */}
        {canAccessEMR ? (
          <View style={styles.timelineSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Timeline Rekam Medis</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{timeline.length} Kunjungan</Text>
              </View>
            </View>

            {loadingTimeline && (
              <View style={styles.centerWrap}>
                <ActivityIndicator size="small" color="#0D9488" />
                <Text style={styles.loadingText}>Memuat riwayat medis...</Text>
              </View>
            )}

            {!loadingTimeline && timelineError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorIcon}>{'\u26A0\uFE0F'}</Text>
                <Text style={styles.errorText}>{timelineError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
                  <Text style={styles.retryText}>Coba Lagi</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loadingTimeline && !timelineError && timeline.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>{'\u{1F4CB}'}</Text>
                <Text style={styles.emptyTitle}>Belum Ada Riwayat Medis</Text>
                <Text style={styles.emptyDesc}>
                  Klik tombol &quot;+ Catat SOAP&quot; di atas untuk menambahkan pemeriksaan pertama pasien ini.
                </Text>
              </View>
            )}

            {!loadingTimeline &&
              !timelineError &&
              timeline.map((item: any, index: number) => (
                <TimelineItem
                  key={item.id || index}
                  item={item}
                  isLast={index === timeline.length - 1}
                  onCreatePrescription={() =>
                    router.push({
                      pathname: '/prescription-form',
                      params: {
                        patientId: patient.id,
                        patientName: patient.name,
                        medicalRecordId: item.id,
                      },
                    })
                  }
                />
              ))}
          </View>
        ) : (
          <View style={styles.noAccessCard}>
            <Text style={styles.noAccessIcon}>{'\u{1F512}'}</Text>
            <Text style={styles.noAccessTitle}>Akses Terbatas</Text>
            <Text style={styles.noAccessDesc}>
              Riwayat pemeriksaan medis (EMR) hanya dapat diakses oleh Dokter dan Paramedik.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerFull: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 20, paddingTop: 42, paddingBottom: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { marginRight: 14, paddingVertical: 4 },
  backText: { color: '#0D9488', fontWeight: '700', fontSize: 15 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 20, paddingBottom: 44 },

  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
    borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  avatar: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: '#CCFBF1',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 30 },
  profileInfo: { flex: 1 },
  patientName: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  patientSpecies: { fontSize: 14, color: '#64748B', marginTop: 3 },

  statsRow: {
    flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#F8FAFC',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },

  ownerRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  ownerIcon: { fontSize: 20, marginRight: 12 },
  ownerLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  ownerName: { fontSize: 15, fontWeight: '700', color: '#0D9488', marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  primaryActionBtn: {
    flex: 1, backgroundColor: '#0D9488', paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  primaryActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  secondaryActionBtn: {
    flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#0D9488',
  },
  secondaryActionText: { color: '#0D9488', fontWeight: '700', fontSize: 13 },

  timelineSection: { marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  countBadge: { backgroundColor: '#CCFBF1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#0F766E' },

  timelineItem: { flexDirection: 'row' },
  timelineLine: { width: 28, alignItems: 'center' },
  timelineDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#0D9488',
    borderWidth: 3, borderColor: '#CCFBF1', marginTop: 4,
  },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#CBD5E1', marginTop: 2 },
  timelineCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginLeft: 8, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  timelineHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  timelineDate: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  timelineTime: { fontSize: 12, color: '#64748B', marginTop: 2 },
  expandPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  expandIcon: { fontSize: 11, fontWeight: '600', color: '#475569' },

  doctorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  doctorName: { fontSize: 13, fontWeight: '600', color: '#334155', flex: 1 },
  tempBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  tempText: { fontSize: 12, fontWeight: '700', color: '#92400E' },

  previewText: { fontSize: 13, color: '#475569', marginTop: 2 },
  soapContainer: { marginTop: 4, gap: 10 },
  soapRow: { flexDirection: 'row', alignItems: 'flex-start' },
  soapBadge: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center',
    justifyContent: 'center', marginRight: 10, marginTop: 2,
  },
  soapBadgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  soapFieldTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  soapText: { fontSize: 13, color: '#1E293B', lineHeight: 19 },

  rxInlineBtn: {
    marginTop: 6, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#99F6E4',
    paddingVertical: 9, borderRadius: 8, alignItems: 'center',
  },
  rxInlineBtnText: { fontSize: 12, fontWeight: '700', color: '#0F766E' },

  centerWrap: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { fontSize: 13, color: '#64748B', marginTop: 10 },
  errorCard: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#FECACA',
  },
  errorIcon: { fontSize: 28, marginBottom: 6 },
  errorText: { fontSize: 13, color: '#991B1B', textAlign: 'center', marginBottom: 14 },
  retryBtn: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 9, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#334155', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },

  noAccessCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8,
  },
  noAccessIcon: { fontSize: 36, marginBottom: 10 },
  noAccessTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 6 },
  noAccessDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },
});
