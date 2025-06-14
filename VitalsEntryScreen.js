import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { auth, db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function VitalsEntryScreen({ navigation }) {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bp, setBp] = useState('');
  const [unitSystem, setUnitSystem] = useState('metric'); // 'metric' or 'imperial'

  const isMetric = unitSystem === 'metric';

  const saveVitals = async () => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Error", "User not logged in");

    try {
      await addDoc(collection(db, 'vitals'), {
        uid: user.uid,
        weight,
        height,
        bp,
        unitSystem,
        timestamp: new Date().toISOString()
      });
      Alert.alert("Success", "Vitals saved!");
      navigation.goBack(); // return to ProfileScreen
    } catch (error) {
      Alert.alert("Error saving vitals", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <Text style={styles.title}>Enter Vitals</Text>
        <TouchableOpacity onPress={() => setUnitSystem(isMetric ? 'imperial' : 'metric')}>
          <Text style={styles.toggleText}>
            {isMetric ? 'Switch to lbs/in' : 'Switch to kg/cm'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text>Weight ({isMetric ? 'kg' : 'lbs'}):</Text>
      <TextInput
        style={styles.input}
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
      />

      <Text>Height ({isMetric ? 'cm' : 'in'}):</Text>
      <TextInput
        style={styles.input}
        value={height}
        onChangeText={setHeight}
        keyboardType="numeric"
      />

      <Text>Blood Pressure:</Text>
      <TextInput
        style={styles.input}
        value={bp}
        onChangeText={setBp}
        placeholder="e.g., 120/80"
      />

      <Button title="Save Vitals" onPress={saveVitals} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  toggleText: {
    fontSize: 14,
    color: 'blue',
    textDecorationLine: 'underline'
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8
  }
});
