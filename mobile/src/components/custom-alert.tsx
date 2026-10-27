import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'confirm';
    onClose: () => void;
    onConfirm?: () => void;
    loading?: boolean;
}

export default function CustomAlert({
    visible, title, message, type = 'info', onClose, onConfirm, loading
}: CustomAlertProps) {

    const btnColor = type === 'error' || type === 'confirm' ? '#EF4444' : '#0D9488';

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonWrap}>
                        {/* Tombol Batal hanya muncul jika tipe 'confirm' */}
                        {type === 'confirm' && (
                            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose} disabled={loading}>
                                <Text style={styles.btnTextCancel}>Batal</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: btnColor }]}
                            onPress={() => {
                                // Jika ada fungsi onConfirm, jalankan itu (misal untuk pindah halaman)
                                if (onConfirm) {
                                    onConfirm();
                                } else {
                                    // Jika tidak ada, tutup pop-up saja
                                    onClose();
                                }
                            }}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.btnText}>
                                    {type === 'confirm' ? 'Ya, Lanjutkan' : 'OK'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modal: { backgroundColor: '#FFF', width: '100%', maxWidth: 400, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
    message: { fontSize: 14, color: '#4B5563', marginBottom: 24, lineHeight: 22 },
    buttonWrap: { flexDirection: 'row', gap: 12 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnCancel: { backgroundColor: '#F3F4F6' },
    btnTextCancel: { color: '#374151', fontWeight: 'bold', fontSize: 14 },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});
