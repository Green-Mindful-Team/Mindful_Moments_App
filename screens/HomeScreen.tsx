import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { daytimeAffirmations, eveningAffirmations } from '../data/affirmations';
import { useTheme } from '../constants/ThemeContext';





type Props = {
  navigation: any;
};

export default function HomeScreen({ navigation }: Props) {

  const colors = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [affirmation, setAffirmation] = useState('');
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const sleepOptions = Array.from({ length: 25 }, (_, i) => i);


  //week row code (top of page)

  const today = new Date();

  const monthName = today.toLocaleString('default', { month: 'long' });
  const year = today.getFullYear();

  const getWeekDays = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sun) → 6 (Sat)

  const monday = new Date(today);
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  monday.setDate(diff);

  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    days.push({
      day: d.toLocaleString('default', { weekday: 'short' }),
      date: d.getDate(),
    });
  }

  return days;
};
//end of week row code 

const days = getWeekDays();
  
  const getAffirmation = () => {
  const hour = new Date().getHours();

  const list =
    hour < 17 ? daytimeAffirmations : eveningAffirmations;

  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
};

useEffect(() => { setAffirmation(getAffirmation()); }, []);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, User!</Text>
        </View>

        <Image
          source={{ uri: 'https://via.placeholder.com/100' }}
          style={styles.profileImage}
        />
      </View>

      <Text style={styles.monthText}>
      {monthName} {year}
      </Text>

      <View style={styles.calendarRow}>
        {days.map((item) => {
          const isSelected = item.date === selectedDate;

          return (
            <TouchableOpacity
              key={item.date}
              style={styles.dayWrapper}
              onPress={() => setSelectedDate(item.date)}
            >
              <Text style={[styles.dayText, {color: isSelected ? colors.selectedDay : colors.textMuted}, isSelected && styles.selectedDayText]}>
                {item.day}
              </Text>

              <View
                style={[
                  styles.dateCircle, {backgroundColor: colors.dateCircle },
                  isSelected && styles.selectedDateCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dateText, { color: colors.text },
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



    <View
  style={[
    styles.affirmationBox,
    {
      backgroundColor: colors.affirmationBox,
      borderLeftColor: colors.affirmationBorder,
    },
  ]}
>
  {/* 🔹 Header Row */}
  <View style={styles.affirmationHeader}>
    <View style={styles.iconCircle}>
      <Image
        source={require('../assets/images/lightbulb.png')}
        style={styles.lightbulb}
      />
    </View>

    <Text style={styles.affirmationTitle}>Tip of the day</Text>
  </View>

  {/* 🔹 Tip text */}
  <Text
    style={[
      styles.affirmationText,
      { color: colors.affirmationText },
    ]}
  >
    {affirmation}
  </Text>
</View>

    <TouchableOpacity
  style={styles.newEntryButton}
  onPress={() => navigation.navigate('NewEntry')}
>
  <Ionicons name="add" size={22} color="white" />
  <Text style={styles.newEntryButtonText}>New Entry</Text>
</TouchableOpacity>

    <TouchableOpacity
        style={[styles.journalButton, {backgroundColor: colors.journalButton }]}
        onPress={() => navigation.navigate('JournalList')}
        >
        <Text style={styles.journalButtonText}>Journal Logs</Text>
    </TouchableOpacity>




  <View style={styles.sleepBox}>
  <Text style={styles.sleepTitle}>Sleep</Text>

  <Text style={styles.sleepValue}>
    {sleepHours !== null ? `${sleepHours} hrs` : '-- hrs'}
  </Text>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.sleepScroll}
  >
    {sleepOptions.map((hour) => {
      const isSelected = sleepHours === hour;

      return (
        <TouchableOpacity
          key={hour}
          style={[
            styles.sleepOption,
            isSelected && styles.selectedSleepOption,
          ]}
          onPress={() => setSleepHours(hour)}
        >
          <Text
            style={[
              styles.sleepOptionText,
              isSelected && styles.selectedSleepOptionText,
            ]}
          >
            {hour}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
</View>
</SafeAreaView>
  );
}

const styles = StyleSheet.create({
 container:            { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  greeting:             { marginLeft: 20, marginTop: 10, fontSize: 20, fontWeight: '600' },
  profileImage:         { width: 54, height: 54, borderRadius: 27 },


  monthText: {
  fontSize: 22,
  fontWeight: '800',
  color:'#648767',
  textAlign: 'center',
  marginBottom: 20,
  },


  calendarRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dayWrapper:           { alignItems: 'center' },
  dayText:              { fontSize: 14, marginBottom: 10 },
  selectedDayText:      { fontWeight: '600' },
  dateCircle:           { width: 40, height: 40, borderRadius: 22, justifyContent: 'center', alignItems: 'center',marginLeft:7,marginRight:7},
  selectedDateCircle:   { backgroundColor: '#f4b400' },
  dateText:             { fontSize: 16, fontWeight: '500' },
  selectedDateText:     { fontWeight: '700' },


  //tip of the day box 

  affirmationHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},

iconCircle: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: 'white',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
},

lightbulb: {
  width: 20,
  height: 20,
  resizeMode: 'contain',
},

affirmationTitle: {
  fontSize: 16,
  fontWeight: '700',
},


  
  //lightbulb:            { width: 30, height: 30, resizeMode: 'contain', marginBottom: 24 },
  affirmationBox:       { padding: 16, borderRadius: 12, marginTop: 33, marginBottom: 8, marginLeft: 20, marginRight: 20, borderLeftWidth: 10 },
  //affirmationTitle:     { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 9 },
  affirmationText:      { fontSize: 16, fontStyle: 'italic' },
 

  journalButton:        { marginTop: 32, marginLeft: 32, marginRight: 32, height: 59, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  journalButtonText:    { color: '#fff', fontSize: 18, fontWeight: '600' },



 newEntryButton: {
  backgroundColor: '#84960d',
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: 8,
  marginHorizontal: 24,
  marginTop: 20,
  height: 59,
  marginLeft: 32, marginRight: 32,
},

newEntryButtonText: {
  color: 'white',
  fontSize: 18,
  fontWeight: '700',
},
  

  sleepBox: {
  marginTop:20,
  marginLeft:20,
  width: 160,
  height: 160,
  borderRadius: 20,
  backgroundColor: '#F4EFEA',
  padding: 16,
  justifyContent: 'space-between',
},

sleepTitle: {
  fontSize: 16,
  fontWeight: '600',
},

sleepValue: {
  fontSize: 28,
  fontWeight: '700',
  textAlign: 'center',
},

sleepScroll: {
  alignItems: 'center',
  paddingHorizontal: 4,
},

sleepOption: {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 8,
  backgroundColor: '#E4DDD5',
},

selectedSleepOption: {
  backgroundColor: '#7A9E7E',
},

sleepOptionText: {
  fontSize: 14,
  fontWeight: '600',
},

selectedSleepOptionText: {
  color: 'white',
},

  
 
});