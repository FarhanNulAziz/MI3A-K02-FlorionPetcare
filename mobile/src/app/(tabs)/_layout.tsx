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

  // Fungsi helper untuk mengecek akses
  const canAccessPemilik = role === 'admin' || role === 'paramedik' || role === 'manajer';
  const canAccessPasien = role === 'admin' || role === 'paramedik' || role === 'dokter' || role === 'manajer' || role === 'pemilik';
  const canAccessLayanan = role === 'admin' || role === 'paramedik' || role === 'manajer';

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
          title: 'Beranda',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />

      <Tabs.Screen
        name="pemilik"
        options={{
          title: 'Pemilik',
          href: canAccessPemilik ? '/pemilik' : undefined,
          tabBarButton: canAccessPemilik ? undefined : () => null, // Sembunyikan total jika tidak punya akses
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />

      <Tabs.Screen
        name="pasien"
        options={{
          title: 'Pasien',
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
