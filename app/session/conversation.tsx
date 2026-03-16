import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { useAllProgress } from '../../hooks/useAllProgress';
import { theme } from '../../lib/theme';
import { getDb, recordAttemptIncremental } from '../../lib/db';
import type { ErrorType } from '../../types';

const MAX_TURNS = 8;
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000';

interface ConversationTurn {
  role: 'npc' | 'user';
  text_es: string;
  text_en?: string;
  feedback?: {
    grammar_ok: boolean;
    naturalness: string;
    coaching_note: string;
    error_type: ErrorType | null;
  } | null;
  showTranslation: boolean;
  showFeedback: boolean;
}

const SCENARIOS: Record<string, { label: string }> = {
  ordering_coffee: { label: 'Ordering Coffee' },
  asking_directions: { label: 'Asking Directions' },
  meeting_neighbor: { label: 'Meeting a Neighbor' },
  market_shopping: { label: 'Market Shopping' },
  asking_time: { label: 'Asking the Time' },
};

export default function ConversationScreen() {
  const { scenario = 'ordering_coffee' } = useLocalSearchParams<{ scenario: string }>();
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isNpcLoading, setIsNpcLoading] = useState(false);
  const [turnNumber, setTurnNumber] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hasRetriedRef = useRef(false);
  const npcEnRef = useRef<string | null>(null);
  const userId = useUserStore(s => s.userId) ?? '';
  const db = getDb();
  const { data: progressArray } = useAllProgress();
  const knownPatternIds = (progressArray ?? [])
    .filter(p => p.status !== 'locked')
    .map(p => p.patternId);

  useEffect(() => {
    sendNpcTurn([], false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendNpcTurn = async (history: ConversationTurn[], evaluateLast: boolean) => {
    hasRetriedRef.current = false;
    npcEnRef.current = null;
    setIsNpcLoading(true);

    const conversationHistory = history.map(t => ({
      role: t.role,
      text_es: t.text_es,
    }));

    let npcText = '';

    // Add placeholder bubble before fetch so the user sees something immediately
    setTurns(prev => [
      ...prev,
      { role: 'npc', text_es: '...', showTranslation: false, showFeedback: false },
    ]);

    try {
      const response = await Promise.race([
        fetch(`${SERVER_URL}/ai/conversation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
          body: JSON.stringify({
            scenario,
            turn_number: turnNumber,
            conversation_history: conversationHistory,
            user_known_pattern_ids: knownPatternIds,
            evaluate_last_turn: evaluateLast,
          }),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 15000)
        ),
      ]);

      const reader = (response as Response).body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let feedbackData: ConversationTurn['feedback'] = null;
      let conversationDone = false;
      let eventType = '';

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === 'npc_token' && data.token !== undefined) {
                npcText += data.token;
                setTurns(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'npc' && last.text_es === '...') {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, text_es: npcText },
                    ];
                  }
                  return prev;
                });
              } else if (eventType === 'translation') {
                npcEnRef.current = data.npc_response_en;
              } else if (eventType === 'feedback') {
                feedbackData = data.user_turn_feedback;
              } else if (eventType === 'done') {
                conversationDone = data.conversation_complete ?? false;
                if (conversationDone) setIsComplete(true);
              }
            } catch {
              // malformed SSE data line — skip
            }
          }
        }
      }

      setTurns(prev => {
        // Remove placeholder
        const withoutPlaceholder = prev.filter(
          t => !(t.role === 'npc' && t.text_es === '...')
        );
        let updated = withoutPlaceholder;

        // Attach feedback to the last user turn
        if (evaluateLast && feedbackData !== null) {
          updated = updated.map((t, i) =>
            i === updated.length - 1 && t.role === 'user'
              ? { ...t, feedback: feedbackData }
              : t
          );

          // Record attempt if there was an error
          if (feedbackData?.error_type) {
            recordAttemptIncremental(db, userId, {
              sessionId: 0,
              patternId: null,
              exerciseId: null,
              verdict: feedbackData.grammar_ok ? 'correct' : 'incorrect',
              responseTimeMs: 0,
              hintLevelUsed: 0,
              errorType: feedbackData.error_type as ErrorType,
              source: 'conversation',
            }).catch(() => {});
          }
        }

        return [
          ...updated,
          {
            role: 'npc',
            text_es: npcText.trim() || '...',
            text_en: npcEnRef.current ?? undefined,
            showTranslation: false,
            showFeedback: false,
          },
        ];
      });
    } catch {
      if (!hasRetriedRef.current) {
        hasRetriedRef.current = true;
        // Remove the placeholder bubble before retrying
        setTurns(prev => prev.filter(t => !(t.role === 'npc' && t.text_es === '...')));
        setTimeout(() => sendNpcTurn(history, evaluateLast), 1000);
        return;
      }
      // Remove the placeholder bubble on final failure
      setTurns(prev => prev.filter(t => !(t.role === 'npc' && t.text_es === '...')));
      Alert.alert(
        'Connection lost',
        'Your progress is saved. Ending conversation.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsNpcLoading(false);
      setTurnNumber(n => n + 1);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleUserSubmit = () => {
    if (!userInput.trim() || isNpcLoading || isComplete) return;

    const newTurn: ConversationTurn = {
      role: 'user',
      text_es: userInput.trim(),
      showTranslation: false,
      showFeedback: false,
    };

    setTurns(prev => [...prev, newTurn]);
    setUserInput('');

    if (turnNumber >= MAX_TURNS) {
      setIsComplete(true);
      return;
    }

    sendNpcTurn([...turns, newTurn], true);
  };

  const toggleTranslation = (index: number) => {
    setTurns(prev =>
      prev.map((t, i) =>
        i === index ? { ...t, showTranslation: !t.showTranslation } : t
      )
    );
  };

  const toggleFeedback = (index: number) => {
    setTurns(prev =>
      prev.map((t, i) =>
        i === index ? { ...t, showFeedback: !t.showFeedback } : t
      )
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Exit</Text>
        </TouchableOpacity>
        <Text style={styles.scenarioLabel}>
          {SCENARIOS[scenario as string]?.label ?? scenario}
        </Text>
        <Text style={styles.turnCounter}>
          Turn {Math.min(turnNumber, MAX_TURNS)}/{MAX_TURNS}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
      >
        {turns.map((turn, i) => (
          <View key={i} style={turn.role === 'npc' ? styles.npcRow : styles.userRow}>
            <View style={turn.role === 'npc' ? styles.npcBubble : styles.userBubble}>
              <Text style={turn.role === 'npc' ? styles.npcText : styles.userText}>
                {turn.text_es}
              </Text>

              {turn.role === 'npc' && (
                <TouchableOpacity onPress={() => toggleTranslation(i)}>
                  <Text style={styles.translationToggle}>
                    {turn.showTranslation ? '▲ Hide translation' : '▼ Show translation'}
                  </Text>
                  {turn.showTranslation && turn.text_en ? (
                    <Text style={styles.translationText}>{turn.text_en}</Text>
                  ) : null}
                </TouchableOpacity>
              )}

              {turn.role === 'user' && turn.feedback ? (
                <TouchableOpacity onPress={() => toggleFeedback(i)}>
                  <Text style={styles.feedbackToggle}>
                    {turn.showFeedback ? '▲ Hide feedback' : '▼ Show feedback'}
                  </Text>
                  {turn.showFeedback ? (
                    <Text style={styles.feedbackText}>
                      {turn.feedback.coaching_note}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      {!isComplete ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inputRow}
        >
          <TextInput
            style={styles.input}
            value={userInput}
            onChangeText={setUserInput}
            placeholder="Respond in Spanish..."
            placeholderTextColor={theme.colors.brownTan}
            onSubmitEditing={handleUserSubmit}
            returnKeyType="send"
            editable={!isNpcLoading}
          />
          <TouchableOpacity
            onPress={handleUserSubmit}
            style={[styles.sendButton, isNpcLoading && styles.sendButtonDisabled]}
            disabled={isNpcLoading}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.completeBar}>
          <Text style={styles.completeText}>Conversation complete!</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.doneButton}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.brown,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.brownMid,
  },
  backButton: {
    color: theme.colors.gold,
    fontSize: 16,
  },
  scenarioLabel: {
    color: theme.colors.cream,
    fontSize: 16,
    fontWeight: '600',
  },
  turnCounter: {
    color: theme.colors.brownTan,
    fontSize: 14,
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  npcRow: {
    alignItems: 'flex-start',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  npcBubble: {
    backgroundColor: theme.colors.brownMid,
    borderRadius: 12,
    padding: 12,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: theme.colors.gold,
    borderRadius: 12,
    padding: 12,
    maxWidth: '80%',
  },
  npcText: {
    color: theme.colors.cream,
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: theme.colors.brown,
    fontSize: 16,
    lineHeight: 22,
  },
  translationToggle: {
    color: theme.colors.goldLight,
    fontSize: 12,
    marginTop: 6,
  },
  translationText: {
    color: theme.colors.creamLight,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  feedbackToggle: {
    color: theme.colors.creamLight,
    fontSize: 12,
    marginTop: 6,
    opacity: 0.7,
  },
  feedbackText: {
    color: theme.colors.brown,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.brownMid,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.brownMid,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.cream,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: theme.colors.brown,
    fontWeight: '700',
  },
  completeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.brownMid,
  },
  completeText: {
    color: theme.colors.cream,
    fontSize: 16,
  },
  doneButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  doneText: {
    color: theme.colors.brown,
    fontWeight: '700',
  },
});
