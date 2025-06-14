import React, { useState } from 'react';
import {
  View, Text, Button, Image, StyleSheet,
  Alert, ActivityIndicator, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { storage, db, auth } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

const GOOGLE_KEY = 'gurt';

export default function MedicalReportsScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);

  /* ─── pickers ─────────────────────────────────── */
  const pickGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });
    if (!r.canceled) setImageUri(r.assets[0].uri);
  };

  const pickFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['image/*', 'application/pdf']
    });
    if (r.type === 'success') setImageUri(r.uri);
  };

  /* ─── OCR helper ──────────────────────────────── */
  const visionRequest = async (base64, feature) => {
    const body = {
      requests: [
        {
          image: { content: base64 },
          features: [{ type: feature }],
          imageContext: { languageHints: ['en'] }
        }
      ]
    };
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    return res.json();
  };

  const runOCR = async () => {
    if (!imageUri) return Alert.alert('Select an image first');
    try {
      setLoading(true);
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64
      });

      /* try DOCUMENT_TEXT_DETECTION first */
      let visionJson = await visionRequest(base64, 'DOCUMENT_TEXT_DETECTION');
      let text =
        visionJson?.responses?.[0]?.fullTextAnnotation?.text?.trim() || '';

      /* fallback to TEXT_DETECTION if empty */
      if (!text) {
        visionJson = await visionRequest(base64, 'TEXT_DETECTION');
        text =
          visionJson?.responses?.[0]?.textAnnotations?.[0]?.description?.trim() ||
          '';
      }

      if (!text) {
        Alert.alert('No text found 🤷‍♂️', 'Try a clearer image or a PDF.');
        setExtractedText('');
        return;
      }

      setExtractedText(text);

      /* upload to Storage & save meta */
      const blob = await (await fetch(imageUri)).blob();
      const filename = `medical_reports/${auth.currentUser.uid}_${Date.now()}`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'medical_reports'), {
        uid: auth.currentUser.uid,
        timestamp: Timestamp.now(),
        imageUrl: downloadURL,
        text
      });

      Alert.alert('Saved', 'Report + OCR text stored in Firestore/Storage');
    } catch (e) {
      console.error(e);
      Alert.alert('OCR Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─── UI ──────────────────────────────────────── */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload Medical Report</Text>

      <Button title="🖼  Upload from Gallery" onPress={pickGallery} />
      <Button title="📁  Upload from Files"   onPress={pickFile} />

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {imageUri && !loading && (
        <>
          <Text style={styles.preview}>Preview:</Text>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <Button title="🧠  Run OCR + Save" onPress={runOCR} color="#0a84ff" />

          {!!extractedText && (
            <View style={styles.textBox}>
              <Text style={styles.header}>Extracted Text</Text>
              <Text>{extractedText}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  preview: { marginTop: 20, fontWeight: 'bold' },
  image: { width: '100%', height: 300, borderRadius: 10, marginTop: 10 },
  textBox: {
    backgroundColor: '#f4f4f4',
    padding: 15,
    borderRadius: 10,
    marginTop: 20
  },
  header: { fontWeight: 'bold', marginBottom: 10 }
});
