import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert
} from 'react-native';






// import { auth } from './firebase';

import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "yo",
  authDomain: "gurt",
  projectId: "yo",
  storageBucket: "gurt",
  messagingSenderId: "yo",
  appId: "gurt"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);













import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';

// Screens
import ProfileScreen from './ProfileScreen';
import VitalsEntryScreen from './VitalsEntryScreen';
import CalorieTrackerScreen from './CalorieTrackerScreen';
import MedicalReportsScreen from './MedicalReportsScreen';

const Stack = createNativeStackNavigator();

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  const handleLogin = async () => {
    try {
      if (isNewUser) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLogin(); // Flip to logged in view
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SuperHealthApp</Text>

      <Text>Email:</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text>Password:</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        title={isNewUser ? "Sign Up" : "Log In"}
        onPress={handleLogin}
      />

      <Button
        title={`Switch to ${isNewUser ? "Login" : "Sign Up"}`}
        onPress={() => setIsNewUser(!isNewUser)}
      />
    </View>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {!loggedIn ? (
        <LoginScreen onLogin={() => setLoggedIn(true)} />
      ) : (
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Profile">
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Enter Vitals" component={VitalsEntryScreen} />
            <Stack.Screen name="Calories" component={CalorieTrackerScreen} />
            <Stack.Screen name="Scan Report" component={MedicalReportsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8
  }
});
