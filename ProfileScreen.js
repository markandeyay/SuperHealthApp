import React, { useEffect, useState } from 'react';
import {
  View, Text, Button, FlatList, StyleSheet, Dimensions, TextInput,
  Image, Alert, TouchableOpacity, ScrollView
} from 'react-native';
import { auth, db, storage } from './firebase';
import * as ImagePicker from 'expo-image-picker';
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LineChart } from 'react-native-chart-kit';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedGestureHandler, withTiming
} from 'react-native-reanimated';
import { PinchGestureHandler } from 'react-native-gesture-handler';

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;
  const [photo, setPhoto] = useState(null);
  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [vitals, setVitals] = useState([]);
  const [streak, setStreak] = useState(0);

  const scale = useSharedValue(1);

  useEffect(() => {
    fetchVitals();
    fetchProfileInfo();
  }, []);

  const fetchProfileInfo = async () => {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setPhoto(data.photoURL || null);
      setUsername(data.username || '');
      setNewUsername(data.username || '');
    }
  };

  const saveUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Invalid Username", "Username cannot be empty.");
      return;
    }

    try {
      await setDoc(doc(db, 'users', user.uid), {
        username: newUsername.trim(),
        photoURL: photo || ''
      }, { merge: true });
      setUsername(newUsername.trim());
      Alert.alert("Saved", "Username updated.");
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const pickProfilePic = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `profile_pics/${user.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      setPhoto(downloadURL);

      await setDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL,
        username: newUsername || username
      }, { merge: true });

      scale.value = 1;
    }
  };

  const fetchVitals = async () => {
    const q = query(
      collection(db, 'vitals'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    const history = snapshot.docs.map(doc => doc.data());
    setVitals(history);
    calculateStreak(history);
  };

  const calculateStreak = (data) => {
    const dates = data.map(entry => new Date(entry.timestamp).toDateString());
    const today = new Date();
    let streakCount = 0;
    for (let i = 0; i < 100; i++) {
      const checkDate = new Date();
      checkDate.setDate(today.getDate() - i);
      const checkStr = checkDate.toDateString();
      if (dates.includes(checkStr)) {
        streakCount++;
      } else {
        break;
      }
    }
    setStreak(streakCount);
  };

  const pinchHandler = useAnimatedGestureHandler({
    onActive: (event) => { scale.value = event.scale; },
    onEnd: () => { scale.value = withTiming(1); }
  });

  const animatedStyle = useAnimatedStyle(() => {
    return { transform: [{ scale: scale.value }] };
  });

  const getChartData = () => {
    const labels = vitals.map(item =>
      new Date(item.timestamp).toLocaleDateString()
    ).reverse();
    const weights = vitals.map(item => parseFloat(item.weight)).reverse();
    return {
      labels: labels.slice(-5),
      datasets: [{ data: weights.slice(-5), strokeWidth: 2 }]
    };
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Hi, {username || 'User'}!</Text>

      <PinchGestureHandler onGestureEvent={pinchHandler}>
        <Animated.View style={[styles.imageContainer, animatedStyle]}>
          <Image
            source={{ uri: photo || 'https://via.placeholder.com/100' }}
            style={styles.profileImage}
          />
        </Animated.View>
      </PinchGestureHandler>

      <TouchableOpacity onPress={pickProfilePic}>
        <Text style={styles.uploadText}>Pick Profile Picture</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Enter username"
        style={styles.input}
        value={newUsername}
        onChangeText={setNewUsername}
      />
      <Button title="Save Username" onPress={saveUsername} />

      <Text style={styles.streak}>🍎🔥 {streak}-day streak</Text>

      <View style={styles.buttonGroup}>
        <Button title="Enter Vitals" onPress={() => navigation.navigate('Enter Vitals')} />
        <Button title="Calorie Tracker" onPress={() => navigation.navigate('Calories')} />
        <Button title="Scan Medical Report" onPress={() => navigation.navigate("Scan Report")} />
      </View>

      <Text style={styles.subheading}>Historical Vitals</Text>
      <FlatList
        data={vitals}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={styles.vitalItem}>
            {new Date(item.timestamp).toLocaleString()} — {item.weight} {item.unitSystem === 'metric' ? 'kg' : 'lbs'}, {item.height} {item.unitSystem === 'metric' ? 'cm' : 'in'}, BP: {item.bp}
          </Text>
        )}
      />

      {vitals.length > 0 && (
        <>
          <Text style={styles.subheading}>Weight Trend</Text>
          <LineChart
            data={getChartData()}
            width={Dimensions.get('window').width - 40}
            height={220}
            yAxisSuffix="kg"
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#f0f0f0",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
            }}
            bezier
            style={{ borderRadius: 10, marginVertical: 10 }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 18, marginBottom: 10, textAlign: 'center' },
  subheading: { fontSize: 16, marginTop: 20, marginBottom: 10, fontWeight: 'bold' },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  imageContainer: {
    alignSelf: 'center',
    overflow: 'hidden',
    marginBottom: 10
  },
  uploadText: {
    color: 'blue',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 10
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    height: 40
  },
  streak: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10
  },
  buttonGroup: {
    gap: 10,
    marginBottom: 20
  },
  vitalItem: { fontSize: 14, marginBottom: 5 }
});
