import { Drawer } from 'expo-router/drawer';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { getUser, clearSession } from '../../utils/storage';
import { useRouter, usePathname } from 'expo-router';
import api from '../../config/api';

// --- KOMPONEN MENU PROFIL (DROPDOWN) ---
function ProfileMenu({ visible, onClose, user, onLogout }: any) {
  const router = useRouter();

  const goToProfile = () => {
    onClose();
    router.push('/profil');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.dropdownMenu}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownName}>{user?.name || 'Pengguna'}</Text>
            <Text style={styles.dropdownRole}>{user?.role?.toUpperCase()}</Text>
          </View>

          <TouchableOpacity style={styles.dropdownItem} onPress={goToProfile}>
            <Text style={styles.dropdownIcon}>{'\u2699\uFE0F'}</Text>
            <Text style={styles.dropdownText}>Profil Saya</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.dropdownItem} onPress={onLogout}>
            <Text style={styles.dropdownIcon}>{'\u{1F6AA}'}</Text>
            <Text style={[styles.dropdownText, { color: '#EF4444' }]}>Keluar (Logout)</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// --- SIDEBAR CUSTOM ---
function CustomDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const navigateTo = (path: string) => {
    router.push(path as any);
    if (Platform.OS !== 'web') {
      props.navigation.closeDrawer();
    }
  };

  const MenuItem = ({ title, icon, path }: { title: string; icon: string; path: string }) => {
    const isActive = pathname === path;
    return (
      <TouchableOpacity
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={() => navigateTo(path)}
      >
        <Text style={styles.menuIcon}>{icon}</Text>
        <Text style={[styles.menuText, isActive && styles.menuTextActive]}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const role = String(user?.role || '').toLowerCase();
  const canAccessPemilik = ['admin', 'manajer', 'paramedik'].includes(role);
  const canAccessPasien = ['admin', 'manajer', 'dokter', 'paramedik', 'pemilik'].includes(role);
  const canAccessRawatInap = ['admin', 'manajer', 'dokter', 'paramedik'].includes(role);
  const canAccessLayanan = ['admin', 'manajer'].includes(role);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={styles.drawerHeader}>
        <View style={styles.logoBox}>
          <Text style={{ fontSize: 28 }}>{'\u{1F43E}'}</Text>
        </View>
        <View>
          <Text style={styles.logoTitle}>Florion Petcare</Text>
          <Text style={styles.logoSubtitle}>Sistem Informasi Klinik</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.menuContainer} showsVerticalScrollIndicator={false}>
        <MenuItem title="Dashboard" icon={'\u{1F4CA}'} path="/" />
        {canAccessPemilik && <MenuItem title="Data Pemilik" icon={'\u{1F464}'} path="/pemilik" />}
        {canAccessPasien && (
          <MenuItem
            title={role === 'pemilik' ? 'Hewan Saya' : 'Data Pasien'}
            icon={'\u{1F436}'}
            path="/pasien"
          />
        )}
        {canAccessRawatInap && (
          <MenuItem title="Rawat Inap" icon={'\u{1F3E5}'} path="/inpatient" />
        )}
        {canAccessLayanan && <MenuItem title="Master Layanan" icon={'\u{1F489}'} path="/layanan" />}
        <MenuItem title="Profil Saya" icon={'\u2699\uFE0F'} path="/profil" />
      </ScrollView>

      <View style={styles.drawerFooter}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Memuat...'}</Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase() || 'USER'}</Text>
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const handleLogout = async () => {
    setMenuVisible(false);
    await clearSession();
    api.post('/logout').catch(() => {});
    router.replace('/login');
  };

  return (
    <>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
          headerTitleStyle: {
            fontWeight: '900',
            color: '#0D9488',
            fontSize: 20,
          },
          headerRight: () => (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 10 }}
              onPress={() => setMenuVisible(true)}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#4B5563' }}>
                Halo, {user?.name || '...'}
              </Text>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0D9488', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            </TouchableOpacity>
          ),
          drawerType: 'front',
          drawerStyle: {
            width: 280,
            borderRightWidth: 1,
            borderRightColor: '#F3F4F6',
          },
          overlayColor: 'rgba(0,0,0,0.4)',
        }}
      >
        <Drawer.Screen name="index" options={{ title: 'Dashboard' }} />
        <Drawer.Screen name="pemilik" options={{ title: 'Data Pemilik' }} />
        <Drawer.Screen name="pasien" options={{ title: 'Data Pasien' }} />
        <Drawer.Screen name="layanan" options={{ title: 'Master Layanan' }} />
        <Drawer.Screen name="profil" options={{ title: 'Profil Saya' }} />
      </Drawer>

      <ProfileMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        user={user}
        onLogout={handleLogout}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  dropdownRole: { fontSize: 11, fontWeight: '700', color: '#0D9488', marginTop: 4 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  dropdownIcon: { fontSize: 18, marginRight: 12 },
  dropdownText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },

  drawerHeader: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoBox: {
    width: 48,
    height: 48,
    backgroundColor: '#E6F4F1',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: { fontSize: 18, fontWeight: '900', color: '#0D9488' },
  logoSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  menuContainer: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  menuItemActive: { backgroundColor: '#E6F4F1' },
  menuIcon: { fontSize: 20, marginRight: 16 },
  menuText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  menuTextActive: { color: '#0D9488', fontWeight: '800' },
  drawerFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFAFA',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  userName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  userRole: { fontSize: 11, fontWeight: '700', color: '#0D9488', marginTop: 2 },
});
