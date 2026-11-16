import { ArrowDown, ArrowUp, Plus, Puzzle, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SiYoutubemusic } from 'react-icons/si';
import { DEFAULT_PRESET_SOURCES, useSources } from '@/data/sources/store';

const section = 'mx-1 mt-[18px] mb-1.5 type-subhead-emphasized uppercase text-secondary';
const note = 'mx-1 mb-2 type-callout text-secondary';
const group = 'overflow-hidden rounded-[10px] bg-quinary';
const row = 'flex items-center gap-3 py-2.5 pr-3 pl-3.5';
const moveButton =
  'grid size-[26px] place-items-center rounded-[6px] text-secondary enabled:hover:bg-quaternary disabled:opacity-25 transition-colors';

export function SourcesSettings({ onClose }: { onClose: () => void }) {
  const {
    sources,
    preferLossless,
    toggleSource,
    moveSource,
    removeSource,
    addSourceByUrl,
    setPreferLossless,
    resetToDefaults,
  } = useSources();

  const [inputUrl, setInputUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || adding) return;
    setAdding(true);
    setAddError(null);
    try {
      await addSourceByUrl(inputUrl.trim());
      setInputUrl('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  };

  const handlePresetAdd = async (url: string) => {
    setAdding(true);
    setAddError(null);
    try {
      await addSourceByUrl(url);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-(--z-modal) grid animate-fade place-items-center bg-scrim p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex max-h-[min(760px,calc(100vh-32px))] w-[min(560px,calc(100vw-32px))] animate-zoom flex-col rounded-[16px] border border-border-subtle bg-page shadow-glass"
        role="dialog"
        aria-modal="true"
        aria-label="Audio Sources"
      >
        <header className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-divider/40">
          <div>
            <h2 className="type-title-2-emphasized font-bold text-lg">Sources</h2>
            <p className="text-xs text-secondary mt-0.5">High-Res FLAC & Lossless Audio Add-ons</p>
          </div>
          <button
            className="grid size-[30px] place-items-center rounded-full bg-quinary text-secondary hover:text-primary transition-colors cursor-pointer"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className={`${group} flex items-center justify-between py-3 px-4 cursor-pointer`}>
              <div className="flex flex-col">
                <span className="type-body-emphasized font-medium">Prefer Lossless Audio</span>
                <span className="type-callout text-secondary text-xs">
                  Probe active addons for bit-perfect FLAC / Hi-Res before YouTube Music.
                </span>
              </div>
              <input
                type="checkbox"
                className="size-5 accent-[#fa2d48] cursor-pointer"
                checked={preferLossless}
                onChange={(e) => setPreferLossless(e.currentTarget.checked)}
              />
            </label>
          </div>

          <div>
            <h3 className={section}>Sources, tried in this order</h3>
            <p className={note}>
              If a source does not have a track or cannot be reached, BitChord steps over it and tries the next one.
            </p>

            <ol className={group}>
              {sources.map((source, index) => {
                const isYt = source.kind === 'youtube';
                const rank = index + 1;
                return (
                  <li
                    key={source.id}
                    className={`${row} [&+&]:border-t-[0.5px] [&+&]:border-t-divider/40 transition-colors ${
                      source.enabled ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <span className="w-4 text-xs font-semibold text-secondary">{rank}</span>

                    <div className="grid size-7 place-items-center rounded-lg bg-quinary text-primary">
                      {isYt ? <SiYoutubemusic size={16} className="text-[#fa2d48]" /> : <Puzzle size={15} className="text-accent-ink" />}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="type-body-emphasized font-medium truncate text-sm">{source.name}</span>
                        {source.version && (
                          <span className="text-[10px] text-tertiary px-1 py-0.2 rounded bg-quinary">v{source.version}</span>
                        )}
                      </div>
                      <span className="truncate type-callout text-secondary text-xs">
                        {source.tags?.join(' · ') || (isYt ? 'Always on' : 'Addon')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isYt && (
                        <>
                          <button
                            className={moveButton}
                            title="Move up"
                            disabled={index === 0}
                            onClick={() => moveSource(source.id, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            className={moveButton}
                            title="Move down"
                            disabled={index >= sources.length - 2}
                            onClick={() => moveSource(source.id, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            className={`${moveButton} hover:text-danger`}
                            title="Remove"
                            onClick={() => removeSource(source.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}

                      <label className="ml-2 relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isYt}
                          className="sr-only peer"
                          checked={source.enabled}
                          onChange={(e) => toggleSource(source.id, e.currentTarget.checked)}
                        />
                        <div className="h-5 w-10 rounded-full bg-gray-4 peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-porcelain after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-porcelain after:border-gray-3 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#fa2d48] peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <h3 className={section}>Add New Add-on</h3>
            <p className={note}>Paste the root URL or manifest.json of any BitChord-compatible addon server.</p>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com/a/manifest.json"
                className="flex-1 rounded-[8px] border border-border-subtle bg-quinary px-3.5 py-2 text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-key"
              />
              <button
                type="submit"
                disabled={adding || !inputUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#fa2d48] text-white text-sm font-medium hover:bg-[#e0263f] disabled:opacity-40 cursor-pointer transition-colors"
              >
                <Plus size={15} />
                <span>{adding ? 'Adding…' : 'Add'}</span>
              </button>
            </form>
            {addError && <p className="text-xs text-danger mt-1.5 px-1">{addError}</p>}
          </div>

          <div>
            <h3 className={section}>Quick Presets</h3>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PRESET_SOURCES.filter((s) => s.kind === 'addon').map((preset) => {
                const installed = sources.some((s) => s.baseUrl === preset.baseUrl);
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetAdd(preset.baseUrl)}
                    disabled={installed}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-quinary text-xs text-secondary hover:text-primary hover:bg-quaternary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Puzzle size={13} className="text-accent-ink" />
                    <span>{preset.name}</span>
                    {installed && <span className="text-[10px] text-success ml-1">✓ active</span>}
                  </button>
                );
              })}
              <button
                onClick={resetToDefaults}
                className="px-3 py-1.5 rounded-[8px] bg-quinary text-xs text-tertiary hover:text-secondary transition-colors ml-auto"
              >
                Reset Default Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
