import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { daytimeAffirmations, eveningAffirmations } from '../data/affirmations';




const days = [
  { day: 'Mon', date: 7 },
  { day: 'Tue', date: 8 },
  { day: 'Wed', date: 9 },
  { day: 'Thu', date: 10 },
  { day: 'Fri', date: 11 },
  { day: 'Sat', date: 12 },
  { day: 'Sun', date: 13 },
];
type Props = {
  navigation: any;
};

export default function HomeScreen({ navigation }: Props) {

  const [selectedDate, setSelectedDate] = useState(10);
  const [affirmation, setAffirmation] = useState('');
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  
  const getAffirmation = () => {
  const hour = new Date().getHours();

  const list =
    hour < 17 ? daytimeAffirmations : eveningAffirmations;

  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
};
useEffect(() => {
  setAffirmation(getAffirmation());
    }, []);



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, User!</Text>
        </View>

        <Image
          source={{ uri: 'https://via.placeholder.com/100' }}
          style={styles.profileImage}
        />
      </View>

      <View style={styles.calendarRow}>
        {days.map((item) => {
          const isSelected = item.date === selectedDate;

          return (
            <TouchableOpacity
              key={item.date}
              style={styles.dayWrapper}
              onPress={() => setSelectedDate(item.date)}
            >
              <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
                {item.day}
              </Text>

              <View
                style={[
                  styles.dateCircle,
                  isSelected && styles.selectedDateCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dateText,
                    isSelected && styles.selectedDateText,
                  ]}
                >
                  {item.date}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    <View style={styles.affirmationBox}>
    <Text style={styles.affirmationTitle}>Daily Affirmation</Text>
    <Text style={styles.affirmationText}>{affirmation}</Text>
    </View>

    <TouchableOpacity
        style={styles.journalButton}
        onPress={() => navigation.navigate('JournalList')}
        >
        <Text style={styles.journalButtonText}>Journal Logs</Text>
    </TouchableOpacity>

    <View style={styles.sleepBox}>
  <Text style={styles.sleepTitle}>How did you sleep?</Text>

  <View style={styles.sleepOptions}>
    {[4, 5, 6, 7, 8].map((hours) => (
      <TouchableOpacity
        key={hours}
        style={[
          styles.sleepButton,
          sleepHours === hours && styles.sleepButtonSelected,
        ]}
        onPress={() => setSleepHours(hours)}
      >
        <Text
          style={[
            styles.sleepButtonText,
            sleepHours === hours && styles.sleepButtonTextSelected,
          ]}
        >
          {hours}h
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    journalButton: {
  marginTop: 32,
  marginLeft:32,
  marginRight:32,
  backgroundColor: '#648767',
  height: 59,
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
},
journalButtonText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '600',
},
  container: {
    flex: 1,
    backgroundColor: '#f7f5f2',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: {
    marginLeft:20,
    marginTop:10,
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
  },
  profileImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayWrapper: {
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 10,
  },
  selectedDayText: {
    color: '#111827',
    fontWeight: '600',
  },
  dateCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateCircle: {
    backgroundColor: '#f4b400',
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  selectedDateText: {
    color: '#111827',
    fontWeight: '700',
  },
  affirmationBox: {
    backgroundColor: '#f6ca83',
  //backgroundColor: '#eee82c',
  padding: 16,
  borderRadius: 12,
  marginTop: 33,
  marginBottom: 8,
  marginLeft:20,
  marginRight:20,
  borderLeftWidth: 20,
  borderLeftColor: '#949d6a',
},

affirmationTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#fff',
  marginBottom: 9,
},

affirmationText: {
  fontSize: 16,
  color: '#111827',
  fontStyle: 'italic',
},
sleepBox: {
  backgroundColor: '#eef2ff',
  padding: 16,
  borderRadius: 12,
  marginTop:20,
  marginBottom: 16,
  marginRight:8,
  marginLeft:8,
},

sleepTitle: {
  fontSize: 17,
  fontWeight: '600',
  marginBottom: 10,
  color: '#3730a3',
},

sleepOptions: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},

sleepButton: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 8,
  backgroundColor: '#fff',
},

sleepButtonSelected: {
  backgroundColor: '#6366f1',
},

sleepButtonText: {
  color: '#111827',
},

sleepButtonTextSelected: {
  color: '#fff',
  fontWeight: '600',
},
});