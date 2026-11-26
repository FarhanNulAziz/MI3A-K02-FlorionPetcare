import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, SafeAreaView, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getHospitalizations } from '../../services/inpatientService';

export default function InpatientListScreen() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'inpatient' | 'discharged'>('inpatient');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await getHospitalizations(statusFilter);
      setData(res.data || []);
    } catch (error) {
      console.log('Gagal memuat data rawat inap:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [statusFilter])
  );

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const renderItem = ({ item }: { item: any }) => {
    const isInpatient = item.status === 'inpatient';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/inpatient-detail', params: { id: item.id } })}
      >
        <View style={styles.cardTop}>
          <View style={styles.cagePill}>
            <Text style={styles.cagePillLabel}>KANDANG</Text>
            <Text style={styles.cagePillValue}>{item.cage_number}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.patientName}>{item.patient?.name || `Pasien #${item.patient_id}`}</Text>
            <Text style={styles.ownerText}>
              Pemilik: {item.patient?.owner?.name || '-'} ? {item.patient?.species || 'Hewan'}
            </Text>
          </View>
          <View style={[styles.badge, isInpatient ? styles.badgeActive : styles.badgeDone]}>
            <Text style={[styles.badgeText, isInpatient ? styles.badgeTextActive : styles.badgeTextDone]}>
              {isInpatient ? 'Dirawat' : 'Pulang'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <Text style={styles.metaText}>Masuk: <Text style={styles.metaBold}>{item.admission_date}</Text></Text>
          <Text style={styles.priceText}>Rp {Number(item.package_price_per_day).toLocaleString('id-ID')}/hari</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backText}>? Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rawat Inap</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/inpatient-form')}
          >
            <Text style={styles.addBtnText}>+ Daftar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, statusFilter === 'inpatient' && styles.tabBtnActive]}
            onPress={() => setStatusFilter('inpatient')}
          >
            <Text style={[styles.tabText, statusFilter === 'inpatient' && styles.tabTextActive]}>
              Sedang Dirawat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, statusFilter === 'discharged' && styles.tabBtnActive]}
            onPress={() => setStatusFilter('discharged')}
          >
            <Text style={[styles.tabText, statusFilter === 'discharged' && styles.tabTextActive]}>
              Sudah Pulang
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>Memuat daftar rawat inap...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              colors={['#0D9488']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {statusFilter === 'inpatient' ? 'Tidak Ada Pasien Dirawat' : 'Belum Ada Riwayat Pulang'}
              </Text>
              <Text style={styles.emptyDesc}>
                {statusFilter === 'inpatient'
                  ? 'Tekan tombol "+ Daftar" di kanan atas untuk mendaftarkan pasien rawat inap baru.'
                  : 'Pasien yang telah menyelesaikan rawat inap akan muncul di sini.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 42, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backBtn: { paddingVertical: 4 },
  backText: { color: '#0D9488', fontWeight: '700', fontSize: 15 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  addBtn: { backgroundColor: '#0D9488', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  tabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0D9488', fontWeight: '800' },

  listContent: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cagePill: {
    backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#99F6E4',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 64,
  },
  cagePillLabel: { fontSize: 9, fontWeight: '800', color: '#0F766E' },
  cagePillValue: { fontSize: 14, fontWeight: '800', color: '#0D9488', marginTop: 1 },
  patientName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  ownerText: { fontSize: 12, color: '#64748B', marginTop: 3 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeDone: { backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextActive: { color: '#15803D' },
  badgeTextDone: { color: '#475569' },

  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#64748B' },
  metaBold: { fontWeight: '700', color: '#334155' },
  priceText: { fontSize: 13, fontWeight: '800', color: '#0D9488' },

  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 13, color: '#64748B' },
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },
});
