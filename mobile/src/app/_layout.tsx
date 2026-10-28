import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, usePathname } from 'expo-router';

export default function RootLayout() {
  const pathname = usePathname();

  // EFEK GLOBAL UNTUK MENGUBAH JUDUL TAB BROWSER
  useEffect(() => {
    if (Platform.OS === 'web') {
      let pageTitle = 'Florion Petcare';

      if (pathname === '/') pageTitle = 'Beranda | Florion Petcare';
      else if (pathname.includes('login')) pageTitle = 'Masuk | Florion Petcare';
      else if (pathname.includes('register')) pageTitle = 'Daftar Akun | Florion Petcare';

      else if (pathname.includes('pemilik')) pageTitle = 'Data Pemilik | Florion Petcare';
      else if (pathname.includes('pasien')) pageTitle = 'Data Pasien | Florion Petcare';
      else if (pathname.includes('layanan')) pageTitle = 'Master Layanan | Florion Petcare';
      else if (pathname.includes('profil')) pageTitle = 'Profil Saya | Florion Petcare';

      else if (pathname.includes('patient-form')) pageTitle = 'Form Pasien | Florion Petcare';
      else if (pathname.includes('owner-form')) pageTitle = 'Form Pemilik | Florion Petcare';
      else if (pathname.includes('service-form')) pageTitle = 'Form Layanan | Florion Petcare';
      else if (pathname.includes('owner-detail')) pageTitle = 'Detail Pemilik | Florion Petcare';

      // Ubah judul di tab browser
      document.title = pageTitle;
    }
  }, [pathname]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Saya set headerShown: false agar tombol kembali buatan kalian yang dipakai */}
      <Stack.Screen name="patient-form" options={{ headerShown: false }} />
      <Stack.Screen name="owner-form" options={{ headerShown: false }} />
      <Stack.Screen name="service-form" options={{ headerShown: false }} />
      <Stack.Screen name="owner-detail" options={{ headerShown: false }} />
    </Stack>
  );
}
