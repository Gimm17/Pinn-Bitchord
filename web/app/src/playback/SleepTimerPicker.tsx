import { Check, ChevronLeft, Moon, Timer } from 'lucide-react';
import { MenuHeader, MenuItem, MenuSeparator } from '@/components/Menu';
import { useSleepTimer, formatSleepRemaining } from './sleepTimer';

interface SleepTimerPickerProps {
  onBack: () => void;
  onDone: () => void;
}

export function SleepTimerChoices({ onBack, onDone }: SleepTimerPickerProps) {
  const { active, mode, remainingSeconds, initialMinutes, setTimer, setEndOfTrack, cancelTimer } = useSleepTimer();

  const handleSelect = (action: () => void) => {
    action();
    onDone();
  };

  return (
    <>
      <MenuItem icon={<ChevronLeft size={14} />} onSelect={onBack}>
        Back
      </MenuItem>
      <MenuSeparator />
      <MenuHeader>
        Sleep Timer {active && mode === 'time' && `(${formatSleepRemaining(remainingSeconds)})`}
        {active && mode === 'end-of-track' && '(End of song)'}
      </MenuHeader>

      <MenuItem
        icon={<Timer size={14} />}
        checked={!active}
        onSelect={() => handleSelect(cancelTimer)}
      >
        Off
      </MenuItem>

      <MenuItem
        icon={<Moon size={14} />}
        checked={active && initialMinutes === 15}
        onSelect={() => handleSelect(() => setTimer(15))}
      >
        15 Minutes
      </MenuItem>

      <MenuItem
        icon={<Moon size={14} />}
        checked={active && initialMinutes === 30}
        onSelect={() => handleSelect(() => setTimer(30))}
      >
        30 Minutes
      </MenuItem>

      <MenuItem
        icon={<Moon size={14} />}
        checked={active && initialMinutes === 45}
        onSelect={() => handleSelect(() => setTimer(45))}
      >
        45 Minutes
      </MenuItem>

      <MenuItem
        icon={<Moon size={14} />}
        checked={active && initialMinutes === 60}
        onSelect={() => handleSelect(() => setTimer(60))}
      >
        1 Hour
      </MenuItem>

      <MenuSeparator />

      <MenuItem
        icon={<Timer size={14} />}
        checked={active && mode === 'end-of-track'}
        onSelect={() => handleSelect(setEndOfTrack)}
      >
        End of This Song
      </MenuItem>
    </>
  );
}
