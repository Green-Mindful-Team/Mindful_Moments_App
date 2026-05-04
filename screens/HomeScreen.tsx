import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, addDays, startOfDay, isSameDay } from 'date-fns';
import { daytimeAffirmations, eveningAffirmations } from '../data/affirmations';
import { useTheme } from '../constants/ThemeContext';
import { useAuth } from '../constants/AuthContext';

type Props = {
  navigation: any;
};

export default function HomeScreen({ navigation }: Props) {
  const colors = useTheme();
  const { logout } = useAuth();
  const colorScheme = useColorScheme();
  const greetingColor = colorScheme === 'dark' ? '#9CA3AF' : '#000000';
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [affirmation, setAffirmation] = useState('');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return {
      key: format(d, 'yyyy-MM-dd'),
      label: format(d, 'EEE'),
      date: d,
      dayNum: d.getDate(),
    };
  });

  const monthYearLabel = format(new Date(), 'MMMM yyyy');

  const getAffirmation = () => {
    const hour = new Date().getHours();
    const list = hour < 17 ? daytimeAffirmations : eveningAffirmations;
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  };

  useEffect(() => {
    setAffirmation(getAffirmation());
  }, []);

  const journalLogsBg =
    colorScheme === 'dark' ? '#4a5d4c' : '#5a755e';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: greetingColor }]}>Hi, User!</Text>
        </View>

        <Image
          source={{ uri: 'https://via.placeholder.com/100' }}
          style={styles.profileImage}
        />
      </View>

      <Text style={[styles.monthYear, { color: colors.journalButton }]}>{monthYearLabel}</Text>

      <View style={styles.calendarRow}>
        {weekDays.map((item) => {
          const isSelected = isSameDay(item.date, selectedDate);

          return (
            <TouchableOpacity
              key={item.key}
              style={styles.dayWrapper}
              onPress={() => setSelectedDate(startOfDay(item.date))}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: isSelected ? colors.selectedDay : colors.textMuted },
                  isSelected && styles.selectedDayText,
                ]}
              >
                {item.label}
              </Text>

              <View
                style={[
                  styles.dateCircle,
                  { backgroundColor: colors.dateCircle },
                  isSelected && styles.selectedDateCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dateText,
                    { color: colors.text },
                    isSelected && styles.selectedDateText,
                  ]}
                >
                  {item.dayNum}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={[
          styles.affirmationBox,
          { backgroundColor: colors.affirmationBox, borderLeftColor: colors.affirmationBorder },
        ]}
      >
        <Text style={[styles.affirmationTitle, { color: colors.text }]}>Tip of the day</Text>
        <Image source={require('../assets/images/lightbulb.png')} style={styles.lightbulb} />
        <Text style={[styles.affirmationText, { color: colors.affirmationText }]}>{affirmation}</Text>
      </View>

      <TouchableOpacity
        style={[styles.newEntryButton, { backgroundColor: colors.journalButton }]}
        onPress={() => navigation.navigate('NewEntry')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.newEntryButtonText}> New Entry</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.journalLogsButton, { backgroundColor: journalLogsBg }]}
        onPress={() => navigation.navigate('JournalList')}
        activeOpacity={0.85}
      >
        <Text style={styles.journalButtonText}>Journal Logs</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutRow}
        onPress={() => {
          Alert.alert('Log out?', 'You will need to sign in again to use the app.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: () => void logout() },
          ]);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
        <Text style={[styles.logoutText, { color: colors.textMuted }]}>Log out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { marginLeft: 20, marginTop: 10, fontSize: 28, fontWeight: '600' },
  profileImage: { width: 54, height: 54, borderRadius: 27 },
  monthYear: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayWrapper: { alignItems: 'center' },
  dayText: { fontSize: 14, marginBottom: 10 },
  selectedDayText: { fontWeight: '600' },
  dateCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateCircle: { backgroundColor: '#f4b400' },
  dateText: { fontSize: 16, fontWeight: '500' },
  selectedDateText: { fontWeight: '700' },
  affirmationBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 20,
    marginRight: 20,
    borderLeftWidth: 20,
  },
  affirmationTitle: { fontSize: 18, fontWeight: '600', marginBottom: 9 },
  affirmationText: { fontSize: 16, fontStyle: 'italic' },
  newEntryButton: {
    marginTop: 24,
    marginLeft: 32,
    marginRight: 32,
    height: 59,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newEntryButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  journalLogsButton: {
    marginTop: 14,
    marginLeft: 32,
    marginRight: 32,
    height: 59,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journalButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  lightbulb: { width: 60, height: 60, resizeMode: 'contain', marginBottom: 24 },
  logoutRow: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
