import React, { useState, useLayoutEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { createService, updateService } from '../../services/serviceService';

export default function ServiceFormScreen({ route, navigation }) {
    const editing = route.params?.service;
    const isEdit = !!editing;

    const [name, setName] = useState(editing?.name || '');
    const [price, setPrice] = useState(
        editing?.price ? String(parseFloat(editing.price)) : ''
    );
    const [description, setDescription] = useState(editing?.description || '');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useLayoutEffect(() => {
        navigation.setOptions({
            title: isEdit ? 'Edit Layanan' : 'Tambah Layanan',
        });
    }, [navigation, isEdit]);

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Nama layanan wajib diisi';
        if (!price) e.price = 'Tarif wajib diisi';
        else if (isNaN(parseFloat(price))) e.price = 'Tarif harus berupa angka';
        else if (parseFloat(price) < 0) e.price = 'Tarif tidak boleh negatif';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const payload = {
                name: name.trim(),
                price: parseFloat(price),
                description: description.trim() || null,
            };

            const response = isEdit
                ? await updateService(editing.id, payload)
                : await createService(payload);

            if (response.success) {
                Alert.alert('Sukses', response.message, [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            }
        } catch (error) {
            const apiErrors = error.response?.data?.errors;
            if (apiErrors) {
                const mapped = {};
                Object.keys(apiErrors).forEach((k) => {
                    mapped[k] = apiErrors[k][0];
                });
                setErrors(mapped);
            } else {
                Alert.alert(
                    'Gagal',
                    error.response?.data?.message || 'Terjadi kesalahan saat menyimpan'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Nama */}
                    <Text style={styles.label}>
                        Nama Layanan <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={[styles.input, errors.name && styles.inputError]}
                        value={name}
                        onChangeText={(t) => {
                            setName(t);
                            if (errors.name) setErrors({ ...errors, name: null });
                        }}
                        placeholder="Contoh: Vaksinasi"
                        placeholderTextColor="#9CA3AF"
                        maxLength={100}
                    />
                    {errors.name ? (
                        <Text style={styles.errorText}>{errors.name}</Text>
                    ) : null}

                    {/* Tarif */}
                    <Text style={styles.label}>
                        Tarif (Rp) <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={[styles.input, errors.price && styles.inputError]}
                        value={price}
                        onChangeText={(t) => {
                            setPrice(t.replace(/[^0-9]/g, ''));
                            if (errors.price) setErrors({ ...errors, price: null });
                        }}
                        placeholder="Contoh: 150000"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                    />
                    {errors.price ? (
                        <Text style={styles.errorText}>{errors.price}</Text>
                    ) : (
                        <Text style={styles.hintText}>
                            {price
                                ? 'Rp ' + parseInt(price || 0).toLocaleString('id-ID')
                                : 'Masukkan angka tanpa titik atau koma'}
                        </Text>
                    )}

                    {/* Deskripsi */}
                    <Text style={styles.label}>Deskripsi</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Deskripsi layanan (opsional)"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />

                    {/* Tombol Simpan */}
                    <TouchableOpacity
                        style={[styles.btnSubmit, loading && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.btnSubmitText}>
                                {isEdit ? 'Perbarui Layanan' : 'Simpan Layanan'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Tombol Batal */}
                    <TouchableOpacity
                        style={styles.btnCancel}
                        onPress={() => navigation.goBack()}
                        disabled={loading}
                    >
                        <Text style={styles.btnCancelText}>Batal</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    scroll: { padding: 16, paddingBottom: 40 },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
        marginTop: 16,
    },
    required: { color: '#EF4444' },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    inputError: {
        borderColor: '#EF4444',
    },
    textarea: {
        height: 110,
        paddingTop: 12,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 6,
    },
    hintText: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 6,
    },
    btnSubmit: {
        backgroundColor: '#2AB3A6',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 28,
    },
    btnSubmitText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    btnCancel: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    btnCancelText: {
        color: '#6B7280',
        fontSize: 15,
        fontWeight: '600',
    },
});
