import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { auth, db } from './firebase';
import { USDA_API_KEY } from './secrets';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';

export default function CalorieTrackerScreen() {
  const user = auth.currentUser;
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);
  const [log, setLog] = useState([]);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    fetchTodaysLog();
  }, []);

  const fetchFood = async () => {
    if (!queryText) return;

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${queryText}&pageSize=5&api_key=${USDA_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const parsed = data.foods.map(food => {
      const nutrients = {};
      for (let n of food.foodNutrients) {
        if (n.nutrientName) {
          nutrients[n.nutrientName.toLowerCase()] = n.value;
        }
      }

      return {
        id: food.fdcId,
        name: food.description,
        calories: nutrients['energy'] || 0,
        protein: nutrients['protein'] || 0,
        carbs: nutrients['carbohydrate, by difference'] || 0,
        fat: nutrients['total lipid (fat)'] || 0,
        fiber: nutrients['fiber, total dietary'] || 0,
        sugar: nutrients['sugars, total including NLEA'] || 0
      };
    });

    setResults(parsed);
  };

  const logFood = async (item) => {
    const today = new Date().toDateString();

    await addDoc(collection(db, 'calories'), {
      uid: user.uid,
      date: today,
      ...item,
      timestamp: Timestamp.now()
    });

    setLog(prev => [...prev, item]);
  };

  const fetchTodaysLog = async () => {
    const today = new Date().toDateString();

    const q = query(
      collection(db, 'calories'),
      where('uid', '==', user.uid),
      where('date', '==', today)
    );

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => doc.data());
    setLog(items);
  };

  const getTotal = (field) =>
    log.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0).toFixed(1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calorie Tracker</Text>

      <TextInput
        style={styles.input}
        placeholder="Search for food..."
        value={queryText}
        onChangeText={setQueryText}
      />
      <Button title="Search" onPress={fetchFood} />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => logFood(item)} style={styles.resultItem}>
            <Text>{item.name}</Text>
            <Text style={styles.subText}>Calories: {item.calories} kcal</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={<Text style={styles.sectionHeader}>Search Results</Text>}
      />

      <View style={styles.totalsBox}>
        <Text style={styles.sectionHeader}>Today's Totals</Text>
        <Text>Calories: {getTotal('calories')} kcal</Text>
        <Text>Protein: {getTotal('protein')} g ({(getTotal('protein') * 4).toFixed(0)} kcal)</Text>
        <Text>Carbs: {getTotal('carbs')} g ({(getTotal('carbs') * 4).toFixed(0)} kcal)</Text>
        <Text>Fat: {getTotal('fat')} g ({(getTotal('fat') * 9).toFixed(0)} kcal)</Text>

        {showMore && (
          <>
            <Text>Fiber: {getTotal('fiber')} g</Text>
            <Text>Sugar: {getTotal('sugar')} g</Text>
          </>
        )}

        <TouchableOpacity onPress={() => setShowMore(!showMore)}>
          <Text style={styles.toggleText}>{showMore ? 'Hide' : 'Show more macros'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  input: {
    height: 40,
    borderColor: '#aaa',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10
  },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', marginVertical: 10 },
  resultItem: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginBottom: 8,
    borderRadius: 5
  },
  subText: { fontSize: 12, color: '#555' },
  totalsBox: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6
  },
  toggleText: {
    color: 'blue',
    marginTop: 10,
    textDecorationLine: 'underline'
  }
});
