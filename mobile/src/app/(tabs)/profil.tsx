import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getUser, clearSession } from '../../utils/storage';
import api from '../../config/api';
import CustomAlert from '../../components/custom-alert';

export default function Profil() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any, onConfirm: undefined as any });

  useEffect(() => {
    const fetchUser = async () => {
      const data = await getUser();
      setUser(data);
    };
    fetchUser();
  }, []);

  const prosesLogout = async () => {
    await clearSession();
    api.post('/logout').catch(() => {});
    router.replace('/login');
  };

  const handleLogoutClick = () => {
    setAlert({
      visible: true, title: 'Konfirmasi Keluar', message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
      type: 'confirm', onConfirm: prosesLogout
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil Saya</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Memuat...'}</Text>
        <Text style={styles.email}>{user?.email || '...'}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'USER'}</Text>
        </View>
      </View>

      <View style={styles.menuWrap}>
        <TouchableOpacity style={styles.btnLogout} onPress={handleLogoutClick}>
          <Text style={styles.btnLogoutText}>🚪 Keluar Aplikasi</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Versi 1.0.0 © 2026 Florion Petcare</Text>

      <CustomAlert
        visible={alert.visible} title={alert.title} message={alert.message} type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })} onConfirm={alert.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 24, paddingTop: 40 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  profileCard: { backgroundColor: '#FFFFFF', marginHorizontal: 24, padding: 32, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E6F4F1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#0D9488' },
  name: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  roleBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '700', color: '#374151', letterSpacing: 1 },
  menuWrap: { paddingHorizontal: 24, marginTop: 32 },
  btnLogout: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  btnLogoutText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 'auto', marginBottom: 32 }
});
