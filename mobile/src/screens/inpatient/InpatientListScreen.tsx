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
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isInpatient = item.status === 'inpatient';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/inpatient-detail', params: { id: item.id } })}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patient?.name || 'Pasien'}</Text>
            <Text style={styles.ownerText}>
              Pemilik: {item.patient?.owner?.name || '-'} • {item.patient?.species || 'Hewan'}
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
          <Text style={styles.metaText}>🏠 Kandang: <Text style={styles.metaBold}>{item.cage_number}</Text></Text>
          <Text style={styles.metaText}>📅 Masuk: <Text style={styles.metaBold}>{item.admission_date}</Text></Text>
          <Text style={styles.priceText}>Rp {Number(item.package_price_per_day).toLocaleString('id-ID')}/hari</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rawat Inap</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/inpatient-form')}>
          <Text style={styles.addBtnText}>+ Daftar</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER TABS */}
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
            Riwayat Pulang
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={['#0D9488']} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Belum ada data pasien rawat inap pada kategori ini.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 20, paddingTop: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginRight: 12 },
  backText: { color: '#0D9488', fontWeight: '600', fontSize: 14 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  addBtn: { backgroundColor: '#0D9488', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  tabRow: { flexDirection: 'row', padding: 16, gap: 10, backgroundColor: '#FFF' },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0D9488' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  ownerText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#CCFBF1' },
  badgeDone: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextActive: { color: '#0F766E' },
  badgeTextDone: { color: '#4B5563' },
  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  metaText: { fontSize: 12, color: '#6B7280' },
  metaBold: { fontWeight: '700', color: '#374151' },
  priceText: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
});
