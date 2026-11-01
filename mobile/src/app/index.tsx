import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  useWindowDimensions, Animated, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const cardAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.stagger(200,
      cardAnims.map((anim) =>
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true })
      )
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -15, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.navbar, { opacity: fadeAnim }]}>
          <View style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <Text style={{ fontSize: 20 }}>🐾</Text>
            </View>
            <Text style={styles.logoText}>Florion Petcare</Text>
          </View>
          <Pressable style={styles.btnNavLogin} onPress={() => router.push('/login')}>
            <Text style={styles.btnNavLoginText}>Masuk Aplikasi</Text>
          </Pressable>
        </Animated.View>

        <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>
          <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* REVISI TEKS TAGLINE */}
            <Text style={styles.heroTag}>Praktek Dokter Hewan Sawahlunto</Text>

            {/* REVISI TEKS JUDUL */}
            <Text style={[styles.heroTitle, isDesktop && { fontSize: 48 }]}>
              Berikan yang Terbaik untuk{'\n'}
              <Text style={{ color: '#0D9488' }}>Hewan Kesayangan</Text> Anda.
            </Text>

            <Text style={styles.heroSubtitle}>
              Florion Petcare menyediakan layanan medis, perawatan, dan rawat inap untuk hewan kecil dengan fasilitas modern dan tenaga ahli profesional.
            </Text>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable style={styles.btnPrimary} onPress={() => router.push('/login')} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <Text style={styles.btnPrimaryText}>Mulai Gunakan Aplikasi</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.heroImagePlaceholder, { opacity: fadeAnim, transform: [{ translateY: floatAnim }] }]}>
            {/* REVISI GAMBAR (ANJING & KUCING) */}
            <Image source={{ uri: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=800&auto=format&fit=crop' }} style={styles.heroImage} />
          </Animated.View>
        </View>

        <View style={styles.section}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Layanan Unggulan Kami</Text>
            <Text style={styles.sectionSubtitle}>Berbagai perawatan terbaik untuk sahabat berbulu Anda.</Text>
          </Animated.View>

          <View style={styles.gridWrap}>
            <Animated.View style={[styles.cardService, { opacity: cardAnims[0], transform: [{ translateY: Animated.multiply(cardAnims[0], 20) }] }]}>
              <Text style={styles.iconService}>🩺</Text>
              <Text style={styles.titleService}>Konsultasi & Diagnostik</Text>
              <Text style={styles.descService}>Pemeriksaan menyeluruh oleh dokter hewan berpengalaman.</Text>
            </Animated.View>

            <Animated.View style={[styles.cardService, { opacity: cardAnims[1], transform: [{ translateY: Animated.multiply(cardAnims[1], 20) }] }]}>
              <Text style={styles.iconService}>💉</Text>
              <Text style={styles.titleService}>Vaksinasi & Sterilisasi</Text>
              <Text style={styles.descService}>Mencegah penyakit dan mengontrol populasi dengan aman.</Text>
            </Animated.View>

            <Animated.View style={[styles.cardService, { opacity: cardAnims[2], transform: [{ translateY: Animated.multiply(cardAnims[2], 20) }] }]}>
              <Text style={styles.iconService}>🛁</Text>
              <Text style={styles.titleService}>Grooming & Perawatan</Text>
              <Text style={styles.descService}>Memandikan dan merapikan bulu agar hewan tetap bersih.</Text>
            </Animated.View>

            <Animated.View style={[styles.cardService, { opacity: cardAnims[3], transform: [{ translateY: Animated.multiply(cardAnims[3], 20) }] }]}>
              <Text style={styles.iconService}>🏥</Text>
              <Text style={styles.titleService}>Rawat Inap</Text>
              <Text style={styles.descService}>Fasilitas kandang yang nyaman untuk pemulihan hewan.</Text>
            </Animated.View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Florion Petcare. Sawahlunto, Sumatera Barat.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: { width: 36, height: 36, backgroundColor: '#E6F4F1', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: '#0D9488' },
  btnNavLogin: { backgroundColor: '#E6F4F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnNavLoginText: { color: '#0D9488', fontWeight: '700', fontSize: 14 },
  heroSection: { padding: 24, paddingVertical: 40, backgroundColor: '#F9FAFB', alignItems: 'center' },
  heroSectionDesktop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: '10%', paddingVertical: 80 },
  heroContent: { flex: 1, maxWidth: 600, marginBottom: 32 },
  heroTag: { color: '#0D9488', fontWeight: '700', fontSize: 14, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { fontSize: 36, fontWeight: '800', color: '#111827', marginBottom: 16, lineHeight: 44 },
  heroSubtitle: { fontSize: 16, color: '#6B7280', lineHeight: 24, marginBottom: 32 },
  btnPrimary: { backgroundColor: '#0D9488', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignSelf: 'flex-start' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  heroImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 20, backgroundColor: '#E6F4F1', width: '100%', maxWidth: 400, height: 250, borderRadius: 24, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  section: { padding: 24, paddingVertical: 60, backgroundColor: '#FFFFFF', alignItems: 'center' },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  sectionSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 40, textAlign: 'center' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, maxWidth: 1000 },
  cardService: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, padding: 24, width: '100%', maxWidth: 280, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 16 },
  iconService: { fontSize: 32, marginBottom: 16 },
  titleService: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  descService: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  footer: { padding: 24, backgroundColor: '#F9FAFB', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerText: { fontSize: 12, color: '#9CA3AF' },
});
