// ═══════════════════════════════════════════
// FormMate — Voice Input Pipeline
// ═══════════════════════════════════════════

import { transcribeAudio } from './ai-service.js';

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

export function isVoiceSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export async function startRecording() {
  if (isRecording) return;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
  });

  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: getPreferredMimeType() });

  mediaRecorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) audioChunks.push(event.data);
  });

  mediaRecorder.start(250);
  isRecording = true;
}

export async function stopAndTranscribe() {
  if (!isRecording || !mediaRecorder) return '';

  return new Promise((resolve, reject) => {
    mediaRecorder.addEventListener('stop', async () => {
      isRecording = false;
      const mimeType = mediaRecorder.mimeType;
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      audioChunks = [];
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      mediaRecorder = null;

      try {
        const transcript = await transcribeAudio(audioBlob);
        resolve(cleanTranscript(transcript));
      } catch (err) {
        console.error('[Voice] Transcription failed:', err);
        reject(err);
      }
    });

    mediaRecorder.stop();
  });
}

export function cancelRecording() {
  if (!isRecording || !mediaRecorder) return;
  mediaRecorder.stream.getTracks().forEach(track => track.stop());
  mediaRecorder.stop();
  mediaRecorder = null;
  audioChunks = [];
  isRecording = false;
}

export function getRecordingState() {
  return { isRecording };
}

function getPreferredMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm';
}

function cleanTranscript(text) {
  if (!text) return '';
  return text.trim()
    .replace(/^(um|uh|so|well|like|okay|alright),?\s*/i, '')
    .replace(/^./, c => c.toUpperCase())
    .replace(/([^.!?])$/, '$1.');
}
