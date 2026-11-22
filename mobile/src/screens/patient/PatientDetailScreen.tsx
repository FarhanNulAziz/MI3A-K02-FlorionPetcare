import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUser } from '../../utils/storage';
import { getPatientMedicalRecords } from '../../services/emrService';

// ─── Helper ────────────────────────────────────────────────────────
const getSpeciesEmoji = (species: string) => {
    const s = species?.toLowerCase() || '';
    if (s.includes('anjing')) return '🐶';
    if (s.includes('kucing')) return '🐱';
    if (s.includes('kelinci')) return '🐰';
    if (s.includes('burung')) return '🐦';
    return '🐾';
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
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
};

// ─── Komponen SOAP Card ────────────────────────────────────────────
function SOAPSection({ label, color, text }: { label: string; color: string; text: string }) {
    return (
        <View style={styles.soapRow}>
            <View style={[styles.soapBadge, { backgroundColor: color }]}>
                <Text style={styles.soapBadgeText}>{label}</Text>
            </View>
            <Text style={styles.soapText}>{text}</Text>
        </View>
    );
}

// ─── Komponen Timeline Item ────────────────────────────────────────
function TimelineItem({ item, isLast }: { item: any; isLast: boolean }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.timelineItem}>
            {/* Garis Timeline */}
            <View style={styles.timelineLine}>
                <View style={styles.timelineDot} />
                {!isLast && <View style={styles.timelineConnector} />}
            </View>

            {/* Konten */}
            <TouchableOpacity
                style={styles.timelineCard}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <View style={styles.timelineHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.timelineDate}>
                            {formatDate(item.created_at)}
                        </Text>
                        <Text style={styles.timelineTime}>
                            {formatTime(item.created_at)}
                        </Text>
                    </View>
                    <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
                </View>

                <View style={styles.doctorRow}>
                    <Text style={styles.doctorIcon}>🩺</Text>
                    <Text style={styles.doctorName}>{item.doctor_name || 'Dokter'}</Text>
                    {item.temperature != null && (
                        <View style={styles.tempBadge}>
                            <Text style={styles.tempText}>🌡 {item.temperature}°C</Text>
                        </View>
                    )}
                </View>

                {expanded && (
                    <View style={styles.soapContainer}>
                        <SOAPSection
                            label="S"
                            color="#3B82F6"
                            text={item.subjective}
                        />
                        <SOAPSection
                            label="O"
                            color="#10B981"
                            text={item.objective}
                        />
                        <SOAPSection
                            label="A"
                            color="#F59E0B"
                            text={item.assessment}
                        />
                        <SOAPSection
                            label="P"
                            color="#EF4444"
                            text={item.plan}
                        />
                    </View>
                )}

                {!expanded && item.subjective && (
                    <Text style={styles.previewText} numberOfLines={1}>
                        S: {item.subjective}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ─── Halaman Utama ─────────────────────────────────────────────────
export default function PatientDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    let patient: any = {};
    try {
        patient = JSON.parse(params.patient as string);
    } catch {
        // fallback
    }

    const [userRole, setUserRole] = useState<string | null>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [timelineError, setTimelineError] = useState<string | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const canAccessEMR = userRole === 'dokter' || userRole === 'paramedik';

    useEffect(() => {
        const init = async () => {
            try {
                const user = await getUser();
                setUserRole(user?.role || null);
            } catch {
                setUserRole(null);
            } finally {
                setLoadingUser(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!canAccessEMR || !patient.id) return;

        const fetchTimeline = async () => {
            setLoadingTimeline(true);
            setTimelineError(null);
            try {
                const result = await getPatientMedicalRecords(patient.id);
                // Response: { patient_id, total, timeline: [...] }
                const records = result.timeline || [];
                // Urutkan dari terbaru ke terlama
                records.sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setTimeline(records);
            } catch (err: any) {
                setTimelineError(err.message || 'Gagal memuat riwayat medis');
            } finally {
                setLoadingTimeline(false);
            }
        };
        fetchTimeline();
    }, [canAccessEMR, patient.id]);

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/pasien');
    };

    if (loadingUser) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
                <ActivityIndicator size="large" color="#0D9488" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Kembali</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detail Pasien</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* ── Profil Pasien ─────────────────────────── */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {getSpeciesEmoji(patient.species)}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.patientName}>{patient.name || '-'}</Text>
                            <Text style={styles.patientSpecies}>
                                {patient.species || '-'}
                                {patient.breed && patient.breed !== '-'
                                    ? ` • ${patient.breed}`
                                    : ''}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Jenis Kelamin</Text>
                            <Text style={styles.statValue}>{patient.gender || '-'}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Umur</Text>
                            <Text style={styles.statValue}>
                                {patient.age != null ? `${patient.age} bln` : '-'}
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Berat</Text>
                            <Text style={styles.statValue}>
                                {patient.weight != null ? `${patient.weight} kg` : '-'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.ownerRow}>
                        <Text style={styles.ownerIcon}>👤</Text>
                        <View>
                            <Text style={styles.ownerLabel}>Pemilik</Text>
                            <Text style={styles.ownerName}>
                                {patient.owner?.name || '-'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Timeline Riwayat Medis ────────────────── */}
                {canAccessEMR && (
                    <View style={styles.timelineSection}>
                        <Text style={styles.sectionTitle}>
                            Riwayat Pemeriksaan
                            {timeline.length > 0 ? ` (${timeline.length})` : ''}
                        </Text>

                        {loadingTimeline && (
                            <View style={styles.centerWrap}>
                                <ActivityIndicator size="large" color="#0D9488" />
                                <Text style={styles.loadingText}>
                                    Memuat riwayat medis...
                                </Text>
                            </View>
                        )}

                        {!loadingTimeline && timelineError && (
                            <View style={styles.errorCard}>
                                <Text style={styles.errorIcon}>⚠️</Text>
                                <Text style={styles.errorText}>{timelineError}</Text>
                                <TouchableOpacity
                                    style={styles.retryBtn}
                                    onPress={() => {
                                        setTimelineError(null);
                                        setLoadingTimeline(true);
                                        getPatientMedicalRecords(patient.id)
                                            .then((result) => {
                                                const records = result.timeline || [];
                                                records.sort((a: any, b: any) =>
                                                    new Date(b.created_at).getTime() -
                                                    new Date(a.created_at).getTime()
                                                );
                                                setTimeline(records);
                                            })
                                            .catch((err: any) =>
                                                setTimelineError(
                                                    err.message || 'Gagal memuat riwayat medis'
                                                )
                                            )
                                            .finally(() => setLoadingTimeline(false));
                                    }}
                                >
                                    <Text style={styles.retryText}>Coba Lagi</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {!loadingTimeline && !timelineError && timeline.length === 0 && (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyIcon}>📋</Text>
                                <Text style={styles.emptyTitle}>
                                    Belum Ada Riwayat
                                </Text>
                                <Text style={styles.emptyDesc}>
                                    Pasien ini belum memiliki catatan pemeriksaan medis.
                                </Text>
                            </View>
                        )}

                        {!loadingTimeline &&
                            !timelineError &&
                            timeline.length > 0 &&
                            timeline.map((item: any, index: number) => (
                                <TimelineItem
                                    key={item.id || index}
                                    item={item}
                                    isLast={index === timeline.length - 1}
                                />
                            ))}
                    </View>
                )}

                {/* Pesan jika role tidak punya akses EMR */}
                {!canAccessEMR && (
                    <View style={styles.noAccessCard}>
                        <Text style={styles.noAccessIcon}>🔒</Text>
                        <Text style={styles.noAccessTitle}>Akses Terbatas</Text>
                        <Text style={styles.noAccessDesc}>
                            Riwayat pemeriksaan medis hanya dapat dilihat oleh Dokter dan Paramedik.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: {
        padding: 24, paddingTop: 40, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    backBtn: { marginRight: 16 },
    backText: { color: '#0D9488', fontWeight: '600', fontSize: 14 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    scroll: { padding: 24, paddingBottom: 40 },

    // Profil Card
    profileCard: {
        backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1,
        borderColor: '#F3F4F6', overflow: 'hidden', marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    profileHeader: {
        flexDirection: 'row', alignItems: 'center', padding: 20,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    avatar: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: '#E6F4F1',
        alignItems: 'center', justifyContent: 'center', marginRight: 16,
    },
    avatarText: { fontSize: 32 },
    profileInfo: { flex: 1 },
    patientName: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    patientSpecies: { fontSize: 14, color: '#6B7280', marginTop: 4 },

    statsRow: {
        flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginTop: 4 },
    statDivider: { width: 1, backgroundColor: '#F3F4F6' },

    ownerRow: {
        flexDirection: 'row', alignItems: 'center', padding: 20,
    },
    ownerIcon: { fontSize: 20, marginRight: 12 },
    ownerLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    ownerName: { fontSize: 15, fontWeight: '600', color: '#0D9488', marginTop: 2 },

    // Section Title
    timelineSection: { marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },

    // Timeline
    timelineItem: { flexDirection: 'row', marginBottom: 0 },
    timelineLine: { width: 32, alignItems: 'center' },
    timelineDot: {
        width: 14, height: 14, borderRadius: 7, backgroundColor: '#0D9488',
        borderWidth: 3, borderColor: '#E6F4F1', zIndex: 1,
    },
    timelineConnector: {
        width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: -1,
    },
    timelineCard: {
        flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
        marginLeft: 8, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
    },
    timelineHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    timelineDate: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
    timelineTime: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    expandIcon: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

    doctorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    doctorIcon: { fontSize: 14, marginRight: 6 },
    doctorName: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 },
    tempBadge: {
        backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8,
    },
    tempText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

    previewText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4 },

    // SOAP
    soapContainer: { marginTop: 12, gap: 8 },
    soapRow: { flexDirection: 'row', alignItems: 'flex-start' },
    soapBadge: {
        width: 24, height: 24, borderRadius: 6, alignItems: 'center',
        justifyContent: 'center', marginRight: 10, marginTop: 1,
    },
    soapBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
    soapText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },

    // States
    centerWrap: { alignItems: 'center', paddingVertical: 32 },
    loadingText: { fontSize: 13, color: '#9CA3AF', marginTop: 12 },

    errorCard: {
        backgroundColor: '#FEF2F2', borderRadius: 12, padding: 24,
        alignItems: 'center', borderWidth: 1, borderColor: '#FECACA',
    },
    errorIcon: { fontSize: 32, marginBottom: 8 },
    errorText: { fontSize: 14, color: '#991B1B', textAlign: 'center', marginBottom: 16 },
    retryBtn: {
        backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 10,
        borderRadius: 10,
    },
    retryText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },

    emptyCard: {
        backgroundColor: '#F9FAFB', borderRadius: 12, padding: 32,
        alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6',
    },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
    emptyDesc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

    noAccessCard: {
        backgroundColor: '#F9FAFB', borderRadius: 12, padding: 32,
        alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', marginTop: 8,
    },
    noAccessIcon: { fontSize: 40, marginBottom: 12 },
    noAccessTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
    noAccessDesc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});
