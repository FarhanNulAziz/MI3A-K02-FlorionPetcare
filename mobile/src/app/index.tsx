import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  useWindowDimensions, Animated, Image, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  // --- SETUP ANIMASI ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const cardAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  // State untuk efek Hover di Web
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.stagger(150,
      cardAnims.map((anim) =>
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true })
      )
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <View style={styles.container}>
      {/* BACKGROUND DECORATIONS (Blobs) */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* --- NAVBAR --- */}
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

        {/* --- HERO SECTION --- */}
        <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>

          <Animated.View
            style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.badgeTag}>
              <Text style={styles.badgeTagText}>✨ Klinik Hewan No. 1 di Sawahlunto</Text>
            </View>
            <Text style={[styles.heroTitle, isDesktop && { fontSize: 56 }]}>
              Berikan yang Terbaik untuk{'\n'}
              <Text style={{ color: '#0D9488' }}>Sahabat Berbulu</Text> Anda.
            </Text>
            <Text style={styles.heroSubtitle}>
              Layanan medis, vaksinasi, dan grooming profesional. Kami siap merawat hewan kesayangan Anda dengan penuh kasih sayang.
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  style={styles.btnPrimary}
                  onPress={() => router.push('/login')}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                >
                  <LinearGradient
                    colors={['#0D9488', '#0F766E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnGradient}
                  >
                    <Text style={styles.btnPrimaryText}>Mulai Gunakan Aplikasi</Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              <Pressable style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Lihat Layanan ▾</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Hero Image dengan Overlap Badge */}
          <Animated.View
            style={[
              styles.heroImageContainer,
              { opacity: fadeAnim, transform: [{ translateY: floatAnim }] }
            ]}
          >
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=800&auto=format&fit=crop' }}
              style={styles.heroImage}
            />

            {/* Floating Badge 1 */}
            <View style={[styles.floatingBadge, { top: 20, right: -20 }]}>
              <Text style={{ fontSize: 20 }}>⭐</Text>
              <View>
                <Text style={{ fontWeight: 'bold', color: '#111827' }}>4.9/5</Text>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Rating Klien</Text>
              </View>
            </View>

            {/* Floating Badge 2 */}
            <View style={[styles.floatingBadge, { bottom: 30, left: -20 }]}>
              <Text style={{ fontSize: 20 }}>🐶</Text>
              <View>
                <Text style={{ fontWeight: 'bold', color: '#111827' }}>1000+</Text>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Hewan Sembuh</Text>
              </View>
            </View>
          </Animated.View>

        </View>

        {/* --- LAYANAN SECTION --- */}
        <View style={styles.section}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', marginBottom: 40 }}>
            <Text style={styles.sectionTitle}>Layanan Unggulan Kami</Text>
            <View style={{ width: 60, height: 4, backgroundColor: '#0D9488', borderRadius: 2, marginTop: 12 }} />
          </Animated.View>

          <View style={styles.gridWrap}>
            {[
              { icon: '🩺', title: 'Konsultasi', desc: 'Pemeriksaan menyeluruh oleh dokter hewan berpengalaman.', color: '#E6F4F1' },
              { icon: '💉', title: 'Vaksinasi', desc: 'Mencegah penyakit dan mengontrol populasi dengan aman.', color: '#FEF3C7' },
              { icon: '🛁', title: 'Grooming', desc: 'Memandikan dan merapikan bulu agar hewan tetap bersih.', color: '#DBEAFE' },
              { icon: '🏥', title: 'Rawat Inap', desc: 'Fasilitas kandang yang nyaman untuk pemulihan hewan.', color: '#FCE7F3' },
            ].map((item, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.cardService,
                  { opacity: cardAnims[index], transform: [{ translateY: Animated.multiply(cardAnims[index], 20) }] }
                ]}
              >
                <Pressable
                  onHoverIn={() => setHoveredIndex(index)}
                  onHoverOut={() => setHoveredIndex(null)}
                  style={({ pressed }) => [
                    styles.cardPressable,
                    (hoveredIndex === index || pressed) && styles.cardHovered
                  ]}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: item.color }]}>
                    <Text style={{ fontSize: 28 }}>{item.icon}</Text>
                  </View>
                  <Text style={styles.titleService}>{item.title}</Text>
                  <Text style={styles.descService}>{item.desc}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* --- FOOTER --- */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Florion Petcare. Sawahlunto, Sumatera Barat.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  // DEKORASI BACKGROUND BLOB
  blob1: { position: 'absolute', top: -100, right: -50, width: 400, height: 400, backgroundColor: '#E6F4F1', borderRadius: 200, opacity: 0.6 },
  blob2: { position: 'absolute', bottom: 200, left: -100, width: 300, height: 300, backgroundColor: '#E6F4F1', borderRadius: 150, opacity: 0.4 },

  // NAVBAR
  navbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20,
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: { width: 40, height: 40, backgroundColor: '#E6F4F1', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: '800', color: '#111827' },
  btnNavLogin: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  btnNavLoginText: { color: '#0D9488', fontWeight: '700', fontSize: 14 },

  // HERO
  heroSection: { padding: 24, paddingVertical: 40, alignItems: 'center' },
  heroSectionDesktop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: '8%', paddingVertical: 60, gap: 40 },
  heroContent: { flex: 1, maxWidth: 600, marginBottom: 40 },
  badgeTag: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  badgeTagText: { color: '#0D9488', fontWeight: '700', fontSize: 12 },
  heroTitle: { fontSize: 40, fontWeight: '900', color: '#111827', marginBottom: 20, lineHeight: 52, letterSpacing: -1 },
  heroSubtitle: { fontSize: 16, color: '#4B5563', lineHeight: 26, marginBottom: 32 },

  btnPrimary: { borderRadius: 14, overflow: 'hidden', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 6 },
  btnGradient: { paddingVertical: 16, paddingHorizontal: 28, alignItems: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  btnSecondary: { paddingVertical: 16, paddingHorizontal: 20 },
  btnSecondaryText: { color: '#0D9488', fontSize: 16, fontWeight: '700' },

  // HERO IMAGE & BADGES
  heroImageContainer: { flex: 1, width: '100%', maxWidth: 450, aspectRatio: 1, borderRadius: 30, position: 'relative' },
  heroImage: { width: '100%', height: '100%', borderRadius: 30, resizeMode: 'cover' },
  floatingBadge: { position: 'absolute', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },

  // SECTION LAYANAN
  section: { padding: 24, paddingVertical: 80, alignItems: 'center', zIndex: 10 },
  sectionTitle: { fontSize: 32, fontWeight: '900', color: '#111827', textAlign: 'center' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24, maxWidth: 1100 },
  cardService: { width: '100%', maxWidth: 250, borderRadius: 24 },
  cardPressable: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', transitionDuration: '0.3s' }, // transitionDuration hanya untuk web
  cardHovered: { transform: [{ translateY: -8 }], shadowColor: '#0D9488', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, borderColor: '#0D9488' },
  iconWrapper: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  titleService: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10 },
  descService: { fontSize: 14, color: '#6B7280', lineHeight: 22 },

  // FOOTER
  footer: { padding: 40, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 40 },
  footerText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
});
