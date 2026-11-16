import { create } from 'zustand';
import { usePlayer } from '@/state/player';
import { showToast } from '@/components/Toast';

export type SleepTimerMode = 'time' | 'end-of-track' | null;

interface SleepTimerState {
  active: boolean;
  mode: SleepTimerMode;
  remainingSeconds: number;
  initialMinutes: number | null;
  setTimer: (minutes: number) => void;
  setEndOfTrack: () => void;
  cancelTimer: () => void;
}

let countdownTimer: ReturnType<typeof setInterval> | undefined;
let trackUnsubscribe: (() => void) | undefined;

export const useSleepTimer = create<SleepTimerState>()((set, get) => ({
  active: false,
  mode: null,
  remainingSeconds: 0,
  initialMinutes: null,

  setTimer: (minutes: number) => {
    // Clear previous timers
    clearInterval(countdownTimer);
    trackUnsubscribe?.();

    const totalSeconds = Math.round(minutes * 60);
    set({
      active: true,
      mode: 'time',
      remainingSeconds: totalSeconds,
      initialMinutes: minutes,
    });

    showToast(`Sleep timer set for ${minutes} min`);

    countdownTimer = setInterval(() => {
      const current = get().remainingSeconds;
      if (current <= 1) {
        clearInterval(countdownTimer);
        set({ active: false, mode: null, remainingSeconds: 0, initialMinutes: null });
        const player = usePlayer.getState();
        if (player.status === 'playing') {
          player.togglePlay();
        }
        showToast('Sleep timer finished. Playback paused.');
      } else {
        set({ remainingSeconds: current - 1 });
      }
    }, 1000);
  },

  setEndOfTrack: () => {
    clearInterval(countdownTimer);
    trackUnsubscribe?.();

    const currentTrackId = usePlayer.getState().nowPlaying?.videoId;
    if (!currentTrackId) {
      showToast('No song is currently playing');
      return;
    }

    set({
      active: true,
      mode: 'end-of-track',
      remainingSeconds: 0,
      initialMinutes: null,
    });

    showToast('Sleep timer set: Stop after this song');

    // Subscribe to track changes or track ending
    trackUnsubscribe = usePlayer.subscribe((state, prev) => {
      // If song videoId changed or playback reached the end
      if (prev.nowPlaying?.videoId === currentTrackId && state.nowPlaying?.videoId !== currentTrackId) {
        trackUnsubscribe?.();
        set({ active: false, mode: null });
        if (state.status === 'playing') {
          state.togglePlay();
        }
        showToast('Sleep timer reached end of song. Playback paused.');
      }
    });
  },

  cancelTimer: () => {
    clearInterval(countdownTimer);
    trackUnsubscribe?.();
    set({ active: false, mode: null, remainingSeconds: 0, initialMinutes: null });
    showToast('Sleep timer cancelled');
  },
}));

export function formatSleepRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
