/**
 * Audio analysis sample rates, frame counts and window timings.
 * Kept in a standalone file so analyzer.ts does NOT eagerly import
 * heavy ONNX or Essentia runtimes when automix is inactive.
 */
export const BEAT_SR = 22050;
export const VOCAL_SR = 44100;
export const VOCAL_FFT = 4096;
export const VOCAL_HOP = 1024;
export const VOCAL_BINS = VOCAL_FFT / 2 + 1;
export const VOCAL_FPS = VOCAL_SR / VOCAL_HOP;
export const VOCAL_FRAMES = 960;
export const VOCAL_WINDOW_SEC = ((VOCAL_FRAMES - 2) * VOCAL_HOP) / VOCAL_SR;
