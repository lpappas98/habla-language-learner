import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { evaluateResponse, MatchResult } from '../lib/fuzzyMatch';

interface UseSpeechRecognitionProps {
  expectedEs: string;
  acceptableEs: string[];
  onResult: (result: {
    transcript: string;
    matchResult: MatchResult;
    bestMatch: string;
  }) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
}

export function useSpeechRecognition({
  expectedEs,
  acceptableEs,
  onResult,
}: UseSpeechRecognitionProps): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const finalTranscriptRef = useRef('');

  // Keep latest values in refs so event handlers never go stale
  const onResultRef = useRef(onResult);
  const expectedEsRef = useRef(expectedEs);
  const acceptableEsRef = useRef(acceptableEs);
  useEffect(() => { onResultRef.current = onResult; });
  useEffect(() => { expectedEsRef.current = expectedEs; });
  useEffect(() => { acceptableEsRef.current = acceptableEs; });

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
    setTranscript('');
    finalTranscriptRef.current = '';
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    if (finalTranscriptRef.current) {
      const { result, bestMatch } = evaluateResponse(
        finalTranscriptRef.current,
        expectedEsRef.current,
        acceptableEsRef.current,
      );
      onResultRef.current({
        transcript: finalTranscriptRef.current,
        matchResult: result,
        bestMatch,
      });
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal) {
      finalTranscriptRef.current = text;
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setError(event.error ?? 'Speech recognition failed');
  });

  const startListening = useCallback(async () => {
    try {
      const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission is required');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'es-ES',
        interimResults: true,
        maxAlternatives: 3,
        contextualStrings: [expectedEsRef.current, ...acceptableEsRef.current],
      });
    } catch (e) {
      setError('Could not start speech recognition');
    }
  }, []);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { isListening, transcript, startListening, stopListening, error };
}
