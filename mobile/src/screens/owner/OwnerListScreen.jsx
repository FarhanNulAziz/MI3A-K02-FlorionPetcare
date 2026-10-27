import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OwnerListScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text>Halaman Daftar Pemilik</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
