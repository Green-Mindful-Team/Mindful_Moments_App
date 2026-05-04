import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { coerceStoredMoodToThree, MoodThree } from '../constants/moodScale';

const GLYPH = {
  1: 'emoticon-sad-outline',
  // Subtle curved smile (not a straight mouth like emoticon-neutral-outline)
  2: 'emoticon-happy-outline',
  3: 'emoticon-excited-outline',
} as const satisfies Record<MoodThree, keyof typeof MaterialCommunityIcons.glyphMap>;

type Props = {
  mood: number;
  size?: number;
  color: string;
};

/**
 * One consistent outline style for all three moods (sad / soft smile / very happy).
 */
export default function MoodGlyph({ mood, size = 32, color }: Props) {
  const t = coerceStoredMoodToThree(mood);
  return <MaterialCommunityIcons name={GLYPH[t]} size={size} color={color} />;
}
