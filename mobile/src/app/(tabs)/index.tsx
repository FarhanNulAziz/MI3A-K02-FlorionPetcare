import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getUser } from '../../utils/storage';
import api from '../../config/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function Beranda() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalPemilik: 0,
    totalPasien: 0,
    totalLayanan: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const currentUser = await getUser();
        setUser(currentUser);

        if (currentUser?.role === 'pemilik') {
          const resPasien = await api.get('/patients');
          if (resPasien.data.success) {
            setStats(prev => ({ ...prev, totalPasien: resPasien.data.data.length }));
          }
        }
        else if (currentUser?.role === 'admin' || currentUser?.role === 'manajer') {
          const [resPemilik, resPasien, resLayanan] = await Promise.all([
            api.get('/owners'),
            api.get('/patients'),
            api.get('/services')
          ]);
          setStats({
            totalPemilik: resPemilik.data.data.length || 0,
            totalPasien: resPasien.data.data.length || 0,
            totalLayanan: resLayanan.data.data.length || 0,
          });
        }
        else if (currentUser?.role === 'dokter' || currentUser?.role === 'paramedik') {
          const resPasien = await api.get('/patients');
          if (resPasien.data.success) {
            setStats(prev => ({ ...prev, totalPasien: resPasien.data.data.length }));
          }
        }
      } catch (error) {
        console.log("Gagal memuat statistik:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const chartData = user?.role === 'pemilik'
    ? [{ label: 'Hewan Saya', value: stats.totalPasien, color: '#0D9488' }]
    : [
        { label: 'Pemilik', value: stats.totalPemilik, color: '#3B82F6' },
        { label: 'Pasien', value: stats.totalPasien, color: '#0D9488' },
        { label: 'Layanan', value: stats.totalLayanan, color: '#F59E0B' }
      ];

  const maxVal = Math.max(...chartData.map(d => d.value), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      <View style={styles.contentWrapper}>

        {/* WELCOME BANNER (Gradient Modern) */}
        <LinearGradient
          colors={['#0D9488', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeBanner}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>Halo, {user?.name}! 👋</Text>
            <Text style={styles.welcomeSubtitle}>Selamat datang kembali di Dashboard Florion Petcare.</Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Text style={{ fontSize: 32 }}>🐾</Text>
          </View>
        </LinearGradient>

        {/* IDENTITAS KLINIK & STATISTIK */}
        <View style={styles.row}>

          {/* Kolom Kiri: Identitas */}
          <View style={styles.colLeft}>
            <View style={styles.clinicCard}>
              <View style={styles.clinicHeader}>
                <View style={styles.clinicLogo}>
                  <Text style={{ fontSize: 24 }}>🏥</Text>
                </View>
                <View>
                  <Text style={styles.clinicName}>Florion Petcare</Text>
                  <Text style={styles.clinicType}>Praktek Dokter Hewan & Petshop</Text>
                </View>
              </View>

              <View style={styles.clinicInfoWrap}>
                <View style={styles.clinicInfoRow}>
                  <Text style={styles.clinicIcon}>📍</Text>
                  <Text style={styles.clinicInfoText}>Sawahlunto, Sumatera Barat</Text>
                </View>
                <View style={styles.clinicInfoRow}>
                  <Text style={styles.clinicIcon}>📞</Text>
                  <Text style={styles.clinicInfoText}>0853-6366-0544</Text>
                </View>
                <View style={styles.clinicInfoRow}>
                  <Text style={styles.clinicIcon}>🩺</Text>
                  <Text style={styles.clinicInfoText}>PJ: drh. Resti Aulia Putri</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Kolom Kanan: Grafik */}
          <View style={styles.colRight}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Ringkasan Data</Text>
              <View style={styles.chartContainer}>
                {chartData.map((item, index) => {
                  const barHeight = (item.value / maxVal) * 120; // Grafik sedikit lebih pendek
                  return (
                    <View key={index} style={styles.barGroup}>
                      <Text style={styles.barValue}>{item.value}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: Math.max(barHeight, 4), backgroundColor: item.color }]} />
                      </View>
                      <Text style={styles.barLabel}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' }, // Background abu-abu muda agar card menonjol
  scroll: { padding: 24, paddingBottom: 60, alignItems: 'center' },
  contentWrapper: { width: '100%', maxWidth: 1000 }, // Lebar maksimal agar tidak melar di web

  // WELCOME BANNER
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  welcomeSubtitle: { fontSize: 14, color: '#E6F4F1', fontWeight: '500' },
  welcomeIcon: { width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // LAYOUT BERDAMPINGAN (FLEXBOX)
  row: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' }, // Flex wrap agar turun ke bawah di HP
  colLeft: { flex: 1, minWidth: 300 },
  colRight: { flex: 1, minWidth: 300 },

  // KARTU KLINIK
  clinicCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, height: '100%' },
  clinicHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  clinicLogo: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#E6F4F1', alignItems: 'center', justifyContent: 'center' },
  clinicName: { fontSize: 20, fontWeight: '900', color: '#111827' },
  clinicType: { fontSize: 13, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  clinicInfoWrap: { paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 16 },
  clinicInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clinicIcon: { fontSize: 18 },
  clinicInfoText: { fontSize: 14, color: '#374151', fontWeight: '600' },

  // KARTU GRAFIK
  chartCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, height: '100%' },
  chartTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 24 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 180 },
  barGroup: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 8 },
  barTrack: { width: '60%', maxWidth: 50, height: 120, backgroundColor: '#F3F4F6', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginTop: 12 },
});
