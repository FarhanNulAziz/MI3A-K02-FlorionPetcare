import { Tabs } from 'expo-router';
import { Text, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { getUser } from '../../utils/storage';

export default function TabLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const user = await getUser();
      if (user) setRole(user.role);
      setLoading(false);
    };
    fetchRole();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  // LOGIKA HAK AKSES ROLE
  const canAccessPemilik = role === 'admin' || role === 'manajer' || role === 'paramedik';
  const canAccessPasien = role === 'admin' || role === 'manajer' || role === 'dokter' || role === 'paramedik' || role === 'pemilik';
  const canAccessLayanan = role === 'admin' || role === 'manajer';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0D9488',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { height: 65, paddingBottom: 10, paddingTop: 10 }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda', // Ini akan menjadi "Beranda | Florion Petcare" di tab browser
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />

      <Tabs.Screen
        name="pemilik"
        options={{
          title: 'Pemilik', // Mengubah tab browser menjadi "Pemilik | Florion Petcare"
          href: canAccessPemilik ? '/pemilik' : undefined,
          tabBarButton: canAccessPemilik ? undefined : () => null,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />

      <Tabs.Screen
        name="pasien"
        options={{
          title: role === 'pemilik' ? 'Hewan Saya' : 'Pasien', // Dinamis untuk Pemilik
          href: canAccessPasien ? '/pasien' : undefined,
          tabBarButton: canAccessPasien ? undefined : () => null,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🐶</Text>,
        }}
      />

      <Tabs.Screen
        name="layanan"
        options={{
          title: 'Layanan',
          href: canAccessLayanan ? '/layanan' : undefined,
          tabBarButton: canAccessLayanan ? undefined : () => null,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💉</Text>,
        }}
      />

      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
