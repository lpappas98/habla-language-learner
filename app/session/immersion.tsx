import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useSessionStore } from '../../store/sessionStore';
import { useImmersionStory } from '../../hooks/useImmersionStory';

function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/[¿?¡!.,;:]/g, '').replace(/\s+/g, ' ');
  return normalize(userAnswer) === normalize(correctAnswer);
}

export default function ImmersionScreen() {
  const currentPatternId = useSessionStore(s => s.currentPatternId);

  const knownPatternIds = currentPatternId != null ? [currentPatternId] : [];
  const { story, isLoading, markComplete } = useImmersionStory(knownPatternIds, [], 'tier1');

  const [showEnglish, setShowEnglish] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean | null>>({});

  function toggleReveal(index: number) {
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function handleCheckAnswer(index: number, correctAnswer: string) {
    const userAnswer = userAnswers[index] ?? '';
    const isCorrect = checkAnswer(userAnswer, correctAnswer);
    setCheckedAnswers(prev => ({ ...prev, [index]: isCorrect }));
  }

  async function handleReadAloud() {
    if (!story) return;
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    Speech.speak(story.bodyEs, {
      language: 'es-ES',
      rate: 0.8,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }

  function handleFinish() {
    if (isSpeaking) {
      Speech.stop();
    }
    markComplete();
    router.push('/session/summary');
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color="#D4A017" />
          <Text style={{ color: '#A08060', fontSize: 14, letterSpacing: 0.5 }}>
            Generating your story…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!story) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="book-outline" size={48} color="#A08060" />
          <Text style={{
            color: '#F5E6D0',
            fontSize: 18,
            fontWeight: '700',
            textAlign: 'center',
            marginTop: 16,
            marginBottom: 8,
          }}>
            Immersion content coming soon for this pattern
          </Text>
          <Text style={{
            color: '#A08060',
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 32,
          }}>
            Check back after more stories are added.
          </Text>
          <Pressable
            onPress={handleFinish}
            style={{
              backgroundColor: '#D4A017',
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 32,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#1A1008', fontWeight: 'bold', fontSize: 16 }}>
              Finish Session
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{
            color: '#A08060',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginBottom: 6,
          }}>
            Immersion Story
          </Text>
          <Text style={{
            color: '#D4A017',
            fontSize: 22,
            fontWeight: '800',
            marginBottom: 2,
          }}>
            {story.titleEs}
          </Text>
          <Text style={{
            color: '#A08060',
            fontSize: 14,
            fontStyle: 'italic',
          }}>
            {story.titleEn}
          </Text>
        </View>

        {/* Story body */}
        <View style={{
          marginHorizontal: 20,
          marginTop: 16,
          backgroundColor: '#251808',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: '#3A2810',
        }}>
          <Text style={{
            color: '#F5E6D0',
            fontSize: 17,
            lineHeight: 28,
            fontWeight: '400',
          }}>
            {story.bodyEs}
          </Text>

          {showEnglish && (
            <Text style={{
              color: '#A08060',
              fontSize: 14,
              lineHeight: 22,
              fontStyle: 'italic',
              marginTop: 16,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#3A2810',
            }}>
              {story.bodyEn}
            </Text>
          )}
        </View>

        {/* Controls row */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          marginHorizontal: 20,
          marginTop: 12,
        }}>
          <Pressable
            onPress={() => setShowEnglish(prev => !prev)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#251808',
              borderRadius: 12,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: '#3A2810',
            }}
          >
            <Ionicons
              name={showEnglish ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#A08060"
            />
            <Text style={{ color: '#A08060', fontSize: 14, fontWeight: '600' }}>
              {showEnglish ? 'Hide English' : 'Show English'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleReadAloud}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: isSpeaking ? '#1A3A2A' : '#251808',
              borderRadius: 12,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: isSpeaking ? '#27AE60' : '#3A2810',
            }}
          >
            <Ionicons
              name={isSpeaking ? 'stop-circle-outline' : 'volume-high'}
              size={18}
              color={isSpeaking ? '#27AE60' : '#A08060'}
            />
            <Text style={{
              color: isSpeaking ? '#27AE60' : '#A08060',
              fontSize: 14,
              fontWeight: '600',
            }}>
              {isSpeaking ? 'Stop' : 'Read Aloud'}
            </Text>
          </Pressable>
        </View>

        {/* New vocabulary */}
        {story.newVocab.length > 0 && (
          <View style={{ marginHorizontal: 20, marginTop: 28 }}>
            <Text style={{
              color: '#F5E6D0',
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 12,
              letterSpacing: 0.3,
            }}>
              New Vocabulary
            </Text>
            <View style={{
              backgroundColor: '#251808',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#3A2810',
              overflow: 'hidden',
            }}>
              {story.newVocab.map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: index < story.newVocab.length - 1 ? 1 : 0,
                    borderBottomColor: '#3A2810',
                  }}
                >
                  <Text style={{
                    flex: 1,
                    color: '#D4A017',
                    fontSize: 15,
                    fontWeight: '600',
                  }}>
                    {item.word}
                  </Text>
                  <Text style={{
                    flex: 1,
                    color: '#A08060',
                    fontSize: 14,
                    textAlign: 'right',
                  }}>
                    {item.translation}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Comprehension questions */}
        <View style={{ marginHorizontal: 20, marginTop: 28 }}>
          <Text style={{
            color: '#F5E6D0',
            fontSize: 16,
            fontWeight: '700',
            marginBottom: 12,
            letterSpacing: 0.3,
          }}>
            Check Your Understanding
          </Text>

          {story.questions.map((q, index) => {
            const isRevealed = revealed.has(index);
            const answerResult = checkedAnswers[index];
            return (
              <View
                key={index}
                style={{
                  backgroundColor: '#251808',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isRevealed ? '#D4A017' : '#3A2810',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isRevealed ? '#D4A017' : '#3A2810',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                    flexShrink: 0,
                  }}>
                    <Text style={{
                      color: isRevealed ? '#1A1008' : '#A08060',
                      fontSize: 12,
                      fontWeight: '700',
                    }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: '#F5E6D0',
                      fontSize: 15,
                      fontWeight: '500',
                      lineHeight: 22,
                      marginBottom: 10,
                    }}>
                      {q.questionEn}
                    </Text>

                    {/* Answer input */}
                    {!isRevealed && (
                      <View style={{ gap: 8 }}>
                        <TextInput
                          value={userAnswers[index] ?? ''}
                          onChangeText={text =>
                            setUserAnswers(prev => ({ ...prev, [index]: text }))
                          }
                          placeholder="Answer in Spanish…"
                          placeholderTextColor="#5A4030"
                          style={{
                            backgroundColor: '#1A1008',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: answerResult === false ? '#E05252' : answerResult === true ? '#27AE60' : '#3A2810',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            color: '#F5E6D0',
                            fontSize: 15,
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable
                            onPress={() => handleCheckAnswer(index, q.answerEs)}
                            style={{
                              flex: 1,
                              backgroundColor: '#3A2810',
                              borderRadius: 10,
                              paddingVertical: 9,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#D4A017', fontSize: 13, fontWeight: '600' }}>
                              Check
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => toggleReveal(index)}
                            style={{
                              flex: 1,
                              backgroundColor: '#3A2810',
                              borderRadius: 10,
                              paddingVertical: 9,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#A08060', fontSize: 13, fontWeight: '600' }}>
                              Reveal Answer
                            </Text>
                          </Pressable>
                        </View>
                        {answerResult === true && (
                          <Text style={{ color: '#27AE60', fontSize: 13, fontWeight: '600' }}>
                            Correct!
                          </Text>
                        )}
                        {answerResult === false && (
                          <Text style={{ color: '#E05252', fontSize: 13 }}>
                            Not quite — try again or reveal the answer.
                          </Text>
                        )}
                      </View>
                    )}

                    {isRevealed && (
                      <View style={{ marginTop: 4 }}>
                        <Text style={{
                          color: '#D4A017',
                          fontSize: 15,
                          fontWeight: '600',
                          lineHeight: 22,
                          marginBottom: 4,
                        }}>
                          {q.answerEs}
                        </Text>
                        <Text style={{
                          color: '#A08060',
                          fontSize: 13,
                          fontStyle: 'italic',
                          lineHeight: 20,
                        }}>
                          {q.answerEn}
                        </Text>
                        <Pressable
                          onPress={() => toggleReveal(index)}
                          style={{ marginTop: 8 }}
                        >
                          <Text style={{ color: '#5A4030', fontSize: 12 }}>
                            Hide answer
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Finish button */}
        <View style={{ marginHorizontal: 20, marginTop: 16 }}>
          <Pressable
            onPress={handleFinish}
            style={{
              backgroundColor: '#D4A017',
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#1A1008', fontWeight: 'bold', fontSize: 16 }}>
              Finish Session
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
