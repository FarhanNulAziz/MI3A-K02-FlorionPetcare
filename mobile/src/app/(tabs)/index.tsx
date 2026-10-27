import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUser } from '../../utils/storage';

export default function Beranda() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const data = await getUser();
      setUser(data);
    };
    fetchUser();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Halo, {user?.name || 'Pengguna'} 👋</Text>
            <Text style={styles.subtitle}>Selamat datang di Florion Petcare</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
        </View>

        {/* Card Info */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Sistem Informasi Klinik Hewan</Text>
          <Text style={styles.welcomeDesc}>
            Kelola data pemilik, pasien hewan, layanan, dan transaksi klinik dengan mudah dan cepat.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Akses Cepat</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.menuCard}>
            <Text style={styles.menuIcon}>📅</Text>
            <Text style={styles.menuText}>Jadwal Hari Ini</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuCard}>
            <Text style={styles.menuIcon}>📊</Text>
            <Text style={styles.menuText}>Laporan Klinik</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E6F4F1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#0D9488' },
  welcomeCard: { backgroundColor: '#0D9488', padding: 24, borderRadius: 20, marginBottom: 32, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  welcomeTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  welcomeDesc: { fontSize: 13, color: '#E6F4F1', lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  grid: { flexDirection: 'row', gap: 16 },
  menuCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  menuIcon: { fontSize: 32, marginBottom: 12 },
  menuText: { fontSize: 13, fontWeight: '700', color: '#374151' },
});
