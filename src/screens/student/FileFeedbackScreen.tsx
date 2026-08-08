import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TextInput } from 'react-native';

import { Feather } from '@expo/vector-icons';
import { GlassCard, PrimaryButton, SectionTitle } from '../../components';
import { useUiState } from '../../context/UiStateContext';
import { submitFeedback } from '../../api/feedback';
import { useThemePalette } from '../../context/ThemeContext';

export default function FileFeedbackScreen() {
  const palette = useThemePalette();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const [starRating, setStarRating] = useState(4);
  const [mealWindow, setMealWindow] = useState('Lunch');
  const [comment, setComment] = useState('');

  const { processing, launchProcessing } = useUiState();

  const handleSubmit = () => {
    launchProcessing('send-feedback', async () => {
      try {
        await submitFeedback(starRating, mealWindow, comment);
        Alert.alert('Feedback Submitted', `Your ${starRating}-star feedback for ${mealWindow} has been recorded.`);
        setComment('');
      } catch (err: any) {
        Alert.alert('Feedback Error', err.message || 'Failed to submit feedback.');
      }
    });
  };

  return (
    <View>
      <SectionTitle eyebrow="" title="Submit Meal Feedback" subtitle="Provide ratings for mess dining quality." />

      <GlassCard>
        <Text style={styles.ratingPrompt}>Tap to rate the latest meal service</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setStarRating(star)}
              accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
              style={({ pressed }) => [styles.starButton, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <Feather
                name="star"
                size={22}
                color={star <= starRating ? '#facc15' : 'rgba(255,255,255,0.18)'}
              />
            </Pressable>
          ))}
        </View>
        <View style={styles.mealChips}>
          {['Breakfast', 'Lunch', 'Dinner'].map((item) => (
            <Pressable
              key={item}
              onPress={() => setMealWindow(item)}
              style={[
                styles.mealChip,
                mealWindow === item && {
                  backgroundColor: 'rgba(16,185,129,0.18)',
                  borderColor: 'rgba(16,185,129,0.38)',
                },
              ]}
            >
              <Text style={styles.mealChipText}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.commentLabel}>Optional comment</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Any additional thoughts..."
          placeholderTextColor={palette.muted}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />
        <PrimaryButton
          label="Send Feedback"
          icon="send"
          tone="violet"
          onPress={handleSubmit}
          loading={processing === 'send-feedback'}
        />
      </GlassCard>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useThemePalette>) => StyleSheet.create({
  ratingPrompt: { color: palette.text, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  starRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  starButton: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  mealChips: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  mealChip: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  mealChipText: { color: palette.text, fontWeight: '700', fontSize: 12.5 },
  commentLabel: { color: palette.muted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  commentInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', color: palette.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
});
