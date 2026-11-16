import { useEffect, useRef } from 'react';
import { VolumeIcon } from '@/components/icons/Transport';
import { usePlayer } from '@/state/player';
import { nextVolumeFromWheel } from './wheelVolume';

/**
 * Apple's volume control (report §1): the speaker mutes, and hovering it
 * slides the level in where the actions beside it were. Those actions fade
 * out while it's open, which is what [fadeForVolume] is for; both the player
 * pill and the full-screen player hold it in a `group/actions` row that
 * carries `data-volume-open`.
 *
 * The level slides in from the row's right edge, clearing the speaker: set
 * `--volume-gap` on the row where the speaker is a different size.
 */
/*
 * The track and thumb, on their own: the player bar keeps the level visible
 * beside the speaker (reference: #66A3BF fill on #E8E4DA, 5px tall, a solid
 * #3368A0 thumb), while the full-screen player still slides it in on hover.
 */
const trackRules = [
  '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--volume-fill)_var(--fill),var(--volume-track)_var(--fill))]',
  '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[linear-gradient(to_right,var(--volume-fill)_var(--fill),var(--volume-track)_var(--fill))]',
  '[&::-webkit-slider-thumb]:-mt-[3px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--volume-thumb)] [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_var(--bgPorcelain)]',
  '[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--volume-thumb)] [&::-moz-range-thumb]:shadow-[0_0_0_2px_var(--bgPorcelain)]',
].join(' ');

const slider = [
  'absolute top-1/2 right-[var(--volume-gap,33px)] mx-0 mb-0 -mt-2 block h-4 w-24 cursor-pointer appearance-none bg-transparent',
  'pointer-events-none translate-x-2 opacity-0 transition-[opacity,translate]',
  'data-open:pointer-events-auto data-open:translate-none data-open:opacity-100',
  trackRules,
].join(' ');

/** The level in place, next to the speaker: the player bar's own row. */
const inlineSlider = ['block h-4 w-[78px] flex-none cursor-pointer appearance-none bg-transparent', trackRules].join(' ');

/** What the level slides in over: the actions sharing the row get out of its way. */
export const fadeForVolume =
  'transition-opacity group-data-volume-open/actions:pointer-events-none group-data-volume-open/actions:opacity-0';

interface VolumeControlProps {
  open: boolean;
  onOpen: () => void;
  /** The speaker button's own styling, so it sits with the buttons around it. */
  className: string;
  iconSize?: number;
  /**
   * Keep the level on screen instead of sliding it in on hover. The player
   * bar does (the reference shows the slider at rest); the full-screen player
   * slides it in, because there the actions beside it need the room.
   */
  inline?: boolean;
}

/**
 * Mouse-wheel volume over the control: React registers onWheel as a passive
 * listener, so preventDefault there would be ignored and the page would
 * scroll behind the pill — this native listener opts out with
 * { passive: false }. The page only stops scrolling while the wheel actually
 * changes the volume; at the limits it does nothing, because the player pill
 * sits outside the page's scroll area and wheeling over any part of it never
 * scrolls the page. Each step calls onOpen (it opens the slider, so the level
 * shows while it moves), and reading the store via getState keeps the handler
 * free of stale volume/mute values — setVolume also clears mute, so scrolling
 * up while muted unmutes.
 */
function useVolumeWheel(onStep: () => void) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { volume, setVolume } = usePlayer.getState();
      const next = nextVolumeFromWheel(volume, e.deltaY);
      if (next === volume) return;
      e.preventDefault();
      onStep();
      setVolume(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onStep]);
  return ref;
}

export function VolumeControl({ open, onOpen, className, iconSize = 20, inline = false }: VolumeControlProps) {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const level = muted ? 0 : volume;
  const wheelRef = useVolumeWheel(onOpen);
  const input = (
    <input
      className={inline ? inlineSlider : slider}
      data-open={inline || open || undefined}
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={level}
      aria-label="Volume"
      tabIndex={inline || open ? 0 : -1}
      style={{ '--fill': `${level * 100}%` } as React.CSSProperties}
      onChange={(e) => setVolume(Number(e.currentTarget.value))}
    />
  );
  const speaker = (
    <button
      className={className}
      aria-label={muted ? 'Unmute' : 'Mute'}
      aria-pressed={muted}
      onClick={toggleMute}
      onPointerEnter={onOpen}
      onFocus={onOpen}
    >
      <VolumeIcon level={level} size={iconSize} />
    </button>
  );

  // Inline follows the reference: speaker first, the level beside it.
  if (inline) {
    return (
      <span ref={wheelRef} className="flex items-center gap-1.5">
        {speaker}
        {input}
      </span>
    );
  }
  return (
    <span ref={wheelRef}>
      {input}
      {speaker}
    </span>
  );
}
