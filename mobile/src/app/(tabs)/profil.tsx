import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getUser, updateStoredUser, clearSession } from '../../utils/storage';
import api from '../../config/api';
import CustomAlert from '../../components/custom-alert';

export default function Profil() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Mode edit & form state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Form ubah kata sandi (opsional)
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as any,
    onConfirm: undefined as any,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const localUser = await getUser();
      if (localUser) {
        setUser(localUser);
        setName(localUser.name || '');
        setEmail(localUser.email || '');
      }
      try {
        const res = await api.get('/me');
        if (res.data?.user) {
          setUser(res.data.user);
          setName(res.data.user.name || '');
          setEmail(res.data.user.email || '');
          await updateStoredUser(res.data.user);
        }
      } catch {
        // Gunakan data sesi lokal jika offline
      }
    };
    fetchUser();
  }, []);

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordSection(false);
  };

  const handleCancelEdit = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    resetPasswordFields();
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      setAlert({
        visible: true,
        title: 'Validasi Gagal',
        message: 'Nama lengkap dan alamat email wajib diisi.',
        type: 'error',
        onConfirm: undefined,
      });
      return;
    }

    if (showPasswordSection && (currentPassword || newPassword || confirmPassword)) {
      if (!currentPassword) {
        setAlert({
          visible: true,
          title: 'Validasi Gagal',
          message: 'Masukkan kata sandi saat ini terlebih dahulu.',
          type: 'error',
          onConfirm: undefined,
        });
        return;
      }
      if (newPassword.length < 6) {
        setAlert({
          visible: true,
          title: 'Validasi Gagal',
          message: 'Kata sandi baru minimal 6 karakter.',
          type: 'error',
          onConfirm: undefined,
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        setAlert({
          visible: true,
          title: 'Validasi Gagal',
          message: 'Konfirmasi kata sandi baru tidak cocok.',
          type: 'error',
          onConfirm: undefined,
        });
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
      };

      if (showPasswordSection && newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
        payload.new_password_confirmation = confirmPassword;
      }

      const res = await api.put('/profile', payload);
      const updatedUser = res.data?.user || { ...user, name: name.trim(), email: email.trim() };

      setUser(updatedUser);
      await updateStoredUser(updatedUser);
      resetPasswordFields();
      setIsEditing(false);

      setAlert({
        visible: true,
        title: 'Berhasil',
        message: res.data?.message || 'Profil akun berhasil diperbarui.',
        type: 'success',
        onConfirm: undefined,
      });
    } catch (error: any) {
      const errors = error?.response?.data?.errors;
      const firstValidationError = errors ? Object.values(errors).flat()[0] : null;
      const msg =
        (typeof firstValidationError === 'string' && firstValidationError) ||
        error?.response?.data?.message ||
        'Gagal memperbarui profil. Periksa koneksi server.';

      setAlert({
        visible: true,
        title: 'Gagal Menyimpan',
        message: msg,
        type: 'error',
        onConfirm: undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const prosesLogout = async () => {
    await clearSession();
    api.post('/logout').catch(() => {});
    router.replace('/login');
  };

  const handleLogoutClick = () => {
    setAlert({
      visible: true,
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
      type: 'confirm',
      onConfirm: prosesLogout,
    });
  };

  const getRoleLabel = (role?: string) => {
    const map: Record<string, string> = {
      admin: 'Administrator Klinik',
      manajer: 'Manajer Klinik',
      dokter: 'Dokter Hewan',
      paramedik: 'Paramedik Veteriner',
      pemilik: 'Pemilik Hewan',
    };
    return map[String(role || '').toLowerCase()] || String(role || 'USER').toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header Halaman */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Profil Saya</Text>
              <Text style={styles.headerSubtitle}>Kelola informasi akun dan keamanan</Text>
            </View>
            {!isEditing && (
              <TouchableOpacity style={styles.editTopBtn} onPress={() => setIsEditing(true)}>
                <Text style={styles.editTopBtnText}>{'\u270F\uFE0F'} Edit Profil</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Kartu Ringkasan Identitas */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>
                {(name || user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{user?.name || 'Memuat...'}</Text>
            <Text style={styles.email}>{user?.email || '...'}</Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
            </View>
          </View>

          {/* Kartu Detail / Form Edit Akun */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>
              {isEditing ? 'Perbarui Data Akun' : 'Informasi Akun'}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama Lengkap</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor="#94A3B8"
                />
              ) : (
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyText}>{user?.name || '-'}</Text>
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Alamat Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="contoh@florion.test"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyText}>{user?.email || '-'}</Text>
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Peran / Hak Akses</Text>
              <View style={[styles.readOnlyBox, { backgroundColor: '#F1F5F9' }]}>
                <Text style={[styles.readOnlyText, { color: '#64748B' }]}>
                  {getRoleLabel(user?.role)}
                </Text>
              </View>
            </View>

            {/* Bagian Ubah Kata Sandi (saat mode edit) */}
            {isEditing && (
              <View style={styles.passwordSection}>
                <TouchableOpacity
                  style={styles.passwordToggleBtn}
                  onPress={() => setShowPasswordSection(!showPasswordSection)}
                >
                  <Text style={styles.passwordToggleText}>
                    {'\u{1F512}'} {showPasswordSection ? 'Batal Ubah Kata Sandi' : 'Ubah Kata Sandi (Opsional)'}
                  </Text>
                  <Text style={styles.passwordToggleArrow}>
                    {showPasswordSection ? '\u25B2' : '\u25BC'}
                  </Text>
                </TouchableOpacity>

                {showPasswordSection && (
                  <View style={styles.passwordFields}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>Kata Sandi Saat Ini</Text>
                      <TextInput
                        style={styles.input}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Masukkan kata sandi lama"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPasswords}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>Kata Sandi Baru (Min. 6 karakter)</Text>
                      <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Masukkan kata sandi baru"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPasswords}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>Konfirmasi Kata Sandi Baru</Text>
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Ulangi kata sandi baru"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPasswords}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.showPassRow}
                      onPress={() => setShowPasswords(!showPasswords)}
                    >
                      <Text style={styles.showPassText}>
                        {showPasswords ? '\u2611 Sembunyikan kata sandi' : '\u2610 Tampilkan kata sandi'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Tombol Simpan & Batal saat Mode Edit */}
            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={handleCancelEdit}
                  disabled={saving}
                >
                  <Text style={styles.btnCancelText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnSave, saving && { opacity: 0.65 }]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.btnSaveText}>Simpan Perubahan</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Tombol Keluar Aplikasi */}
          <View style={styles.menuWrap}>
            <TouchableOpacity style={styles.btnLogout} onPress={handleLogoutClick}>
              <Text style={styles.btnLogoutText}>{'\u{1F6AA}'} Keluar Aplikasi</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>Versi 1.0.0 {'\u00A9'} 2026 Florion Petcare</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
        onConfirm={alert.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  editTopBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  editTopBtnText: { color: '#0D9488', fontWeight: '800', fontSize: 13 },

  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#0D9488' },
  name: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  email: { fontSize: 14, color: '#64748B', marginBottom: 14 },
  roleBadge: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: { fontSize: 12, fontWeight: '800', color: '#0F766E' },

  formCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  readOnlyBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },

  passwordSection: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  passwordToggleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  passwordToggleText: { fontSize: 13, fontWeight: '700', color: '#0F766E' },
  passwordToggleArrow: { fontSize: 11, color: '#64748B' },
  passwordFields: { marginTop: 14 },
  showPassRow: { paddingVertical: 4 },
  showPassText: { fontSize: 13, fontWeight: '600', color: '#475569' },

  editActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  btnCancel: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnCancelText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  btnSave: {
    flex: 2,
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSaveText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  menuWrap: { marginBottom: 24 },
  btnLogout: {
    backgroundColor: '#FEF2F2',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnLogoutText: { color: '#DC2626', fontSize: 15, fontWeight: '800' },
  version: { textAlign: 'center', color: '#94A3B8', fontSize: 12 },
});
