const fs = require('fs');
const file = 'web/app/src/pages/ArtistPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = content.match(/<button\s*\/\/\s*The 56px[\s\S]*?<\/button>/);
if (target) {
  const replacement = `<div className="mt-3 flex items-center gap-3">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#132230] px-6 text-xs font-bold text-white shadow-[0_2px_8px_#13223025] transition-all hover:bg-[#1a2f42] hover:scale-102 active:scale-98 disabled:opacity-40"
              aria-label={\`Play \${data.name}\`}
              disabled={!data.topSongs.length}
              onClick={() => playList(data.topSongs, 0, { source: topSongs })}
            >
              <PlayIcon size={18} />
              <span>Play All</span>
            </button>
            {data.topSongs[0] && (
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#DED8CB] bg-white/90 px-5 text-xs font-bold text-[#132230] shadow-xs transition-all hover:border-[#C8DFDB] hover:bg-[#F2EFE7] hover:scale-102 active:scale-98"
                onClick={() => {
                  void usePlayer.getState().startRadio(data.topSongs[0]!);
                }}
              >
                <span>Start Artist Radio</span>
              </button>
            )}
          </div>`;
  content = content.replace(target[0], replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Target not found');
}
