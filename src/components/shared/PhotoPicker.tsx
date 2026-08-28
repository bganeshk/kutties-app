import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../styles/kutties-styles';

interface Props {
  uri: string;
  onChange: (uri: string) => void;
  editable?: boolean;
}

export default function PhotoPicker({ uri, onChange, editable = true }: Props) {
  const pickFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) onChange(result.assets[0].uri);
  }, [onChange]);

  const pickFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) onChange(result.assets[0].uri);
  }, [onChange]);

  const handleRemove = useCallback(() => {
    Alert.alert('Remove photo', 'Remove the photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange('') },
    ]);
  }, [onChange]);

  return (
    <View style={styles.photoContainer}>
      {uri ? (
        <View style={styles.photoPreviewWrap}>
          <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
          {editable && (
            <TouchableOpacity style={styles.photoRemove} onPress={handleRemove}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={22} color={Colors.errorText} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="person-outline" size={40} color={Colors.muted} />
          <Text style={styles.photoPlaceholderText}>No photo</Text>
        </View>
      )}
      {editable && (
        <View style={styles.photoBtnRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickFromCamera} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={18} color={Colors.primary} />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={18} color={Colors.primary} />
            <Text style={styles.photoBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  photoContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  photoPreviewWrap: { position: 'relative', marginBottom: 10 },
  photoPreview: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.border,
  },
  photoRemove: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 11 },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  photoPlaceholderText: { fontSize: 11, color: Colors.muted, marginTop: 4 },
  photoBtnRow: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  photoBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
