// ═══════════════════════════════════════════
// FormMate — Voice Input Pipeline
// ═══════════════════════════════════════════
//
// Captures voice from the user's microphone,
// transcribes via Whisper (whisper-large-v3) on Groq,
// and returns clean text for the answer pipeline.
// ═══════════════════════════════════════════

import { transcribeAudio } from './ai-service.js';
import { getState } from '../state.js';

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

/**
 * Check if the browser supports voice recording.
 */
export function isVoiceSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Start recording audio from the microphone.
 * @returns {Promise<void>}
 */
export async function startRecording() {
  if (isRecording) return;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
    }
  });

  audioChunks = [];

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: getPreferredMimeType(),
  });

  mediaRecorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  });

  mediaRecorder.start(250); // Collect in 250ms chunks
  isRecording = true;
}

/**
 * Stop recording and transcribe the audio.
 * @returns {Promise<string>} Transcribed text
 */
export async function stopAndTranscribe() {
  if (!isRecording || !mediaRecorder) {
    return '';
  }

  return new Promise((resolve, reject) => {
    mediaRecorder.addEventListener('stop', async () => {
      isRecording = false;

      // Create audio blob
      const mimeType = mediaRecorder.mimeType;
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      audioChunks = [];

      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      mediaRecorder = null;

      // Transcribe
      try {
        const { groqApiKey } = getState();
        if (!groqApiKey) {
          reject(new Error('No Groq API key configured'));
          return;
        }

        const transcript = await transcribeAudio(audioBlob, groqApiKey);
        resolve(cleanTranscript(transcript));
      } catch (err) {
        console.error('[Voice] Transcription failed:', err);
        reject(err);
      }
    });

    mediaRecorder.stop();
  });
}

/**
 * Cancel recording without transcribing.
 */
export function cancelRecording() {
  if (!isRecording || !mediaRecorder) return;

  mediaRecorder.stream.getTracks().forEach(track => track.stop());
  mediaRecorder.stop();
  mediaRecorder = null;
  audioChunks = [];
  isRecording = false;
}

/**
 * Get the current recording state.
 */
export function getRecordingState() {
  return { isRecording };
}

// ─── Helpers ─────────────────────────────────

function getPreferredMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm'; // fallback
}

function cleanTranscript(text) {
  if (!text) return '';

  return text
    .trim()
    // Remove common filler words at the start
    .replace(/^(um|uh|so|well|like|okay|alright),?\s*/i, '')
    // Capitalize first letter
    .replace(/^./, c => c.toUpperCase())
    // Ensure ends with period if it's a statement
    .replace(/([^.!?])$/, '$1.');
}
