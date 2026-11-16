const { callMcp } = require('./figcraft_client.cjs');

async function polishModals() {
  const frameId = 5079;

  // Find and delete the 4 modals and scrim to rebuild polished version
  const currentFrame = await callMcp('run_command', {
    command: 'node.get',
    params: { id: frameId },
  });
  const children = JSON.parse(currentFrame.content[0].text).children || [];
  // The modals and scrim are the ones we added (scrim, spotify_modal, context_menu, audio_specs_modal, timer_modal)
  const targetNames = [
    'Backdrop Scrim Overlay (Focus Mode)',
    'Modal - Spotify Playlist Importer',
    'Popover - Track Context Menu',
    'Popover - Audio Specs & Hardware DAC',
    'Popover - Sleep Timer Picker',
  ];
  const toDelete = children.filter((c) => targetNames.includes(c.name)).map((c) => c.id);
  if (toDelete.length > 0) {
    console.log('Deleting previous modals:', toDelete);
    await callMcp('run_command', {
      command: 'edit.delete',
      params: { ids: toDelete },
    });
  }

  const commands = [
    // 0. Backdrop Scrim Overlay
    {
      command: 'node.create',
      as: 'modal_scrim',
      params: {
        type: 'rectangle',
        name: 'Backdrop Scrim Overlay (Focus Mode)',
        parent: frameId,
        x: 0,
        y: 0,
        width: 1280,
        height: 1024,
        props: {
          fills: [{ type: 'solid', color: '#132230', opacity: 0.28 }],
        },
      },
    },

    // 1. MODAL 1: SPOTIFY PLAYLIST IMPORTER DIALOG (Center-Left)
    {
      command: 'node.create',
      as: 'spotify_modal',
      params: {
        type: 'frame',
        name: 'Modal - Spotify Playlist Importer',
        parent: frameId,
        x: 60,
        y: 130,
        props: {
          width: 480,
          height: 480,
          cornerRadius: 20,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'vertical',
            gap: 16,
            padding: [24, 24, 24, 24],
            crossAlign: 'min',
          },
          effects: [
            {
              type: 'dropShadow',
              color: '#13223026',
              offset: [0, 16],
              radius: 36,
              visible: true,
            },
          ],
        },
      },
    },

    // Modal Header Row
    {
      command: 'node.create',
      as: 'spotify_header_row',
      params: {
        type: 'frame',
        name: 'Header Row',
        parent: { $ref: 'spotify_modal' },
        props: {
          width: 432,
          height: 36,
          layout: {
            mode: 'horizontal',
            crossAlign: 'center',
            mainAlign: 'spaceBetween',
          },
        },
      },
    },
    // Left: Spotify Pill
    {
      command: 'node.create',
      as: 'spotify_badge',
      params: {
        type: 'frame',
        name: 'Spotify Badge',
        parent: { $ref: 'spotify_header_row' },
        props: {
          height: 26,
          cornerRadius: 13,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#E8F5E9' }],
          strokes: [{ type: 'solid', color: '#A5D6A7' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            gap: 6,
            padding: [3, 10, 3, 10],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Spotify Badge Text',
        parent: { $ref: 'spotify_badge' },
        text: '🟢 SPOTIFY SYNC ENGINE',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 10,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#1B5E20' }],
          letterSpacing: 0.6,
        },
      },
    },
    // Right: Close Button "✕"
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Close Button',
        parent: { $ref: 'spotify_header_row' },
        text: '✕',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 16,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#8B98A1' }],
        },
      },
    },

    // Modal Title & Description
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Title',
        parent: { $ref: 'spotify_modal' },
        text: 'Import Spotify Playlist',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 20,
          fontStyle: 'Extra Bold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Description',
        parent: { $ref: 'spotify_modal' },
        text: 'Paste any public Spotify playlist link. BitChord automatically resolves each song into YouTube Music lossless streams with metadata.',
        props: {
          width: 432,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Regular',
          fills: [{ type: 'solid', color: '#5A6872' }],
          lineHeight: '140%',
        },
      },
    },

    // Input URL Box Container
    {
      command: 'node.create',
      as: 'url_input_box',
      params: {
        type: 'frame',
        name: 'Input URL Box',
        parent: { $ref: 'spotify_modal' },
        props: {
          width: 432,
          height: 44,
          cornerRadius: 10,
          fills: [{ type: 'solid', color: '#F2EFE7' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            padding: [6, 12, 6, 8],
            crossAlign: 'center',
            mainAlign: 'spaceBetween',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Input URL Text',
        parent: { $ref: 'url_input_box' },
        text: 'https://open.spotify.com/playlist/37i9dQZF1DXcBW...',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Medium',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },
    {
      command: 'node.create',
      as: 'btn_paste_pill',
      params: {
        type: 'frame',
        name: 'Paste Pill',
        parent: { $ref: 'url_input_box' },
        props: {
          height: 28,
          cornerRadius: 6,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            padding: [4, 10, 4, 10],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Paste Text',
        parent: { $ref: 'btn_paste_pill' },
        text: 'Paste',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontStyle: 'Semi Bold',
          fills: [{ type: 'solid', color: '#2D6A5D' }],
        },
      },
    },

    // Progress Card (Matching State 68%)
    {
      command: 'node.create',
      as: 'progress_card',
      params: {
        type: 'frame',
        name: 'Matching Progress Card',
        parent: { $ref: 'spotify_modal' },
        props: {
          width: 432,
          height: 140,
          cornerRadius: 12,
          fills: [{ type: 'solid', color: '#F7F5F0' }],
          strokes: [{ type: 'solid', color: '#E8E4DA' }],
          strokeWeight: 1,
          layout: {
            mode: 'vertical',
            gap: 10,
            padding: [12, 14, 12, 14],
            crossAlign: 'min',
          },
        },
      },
    },
    // Progress Header
    {
      command: 'node.create',
      as: 'progress_header_row',
      params: {
        type: 'frame',
        name: 'Progress Header',
        parent: { $ref: 'progress_card' },
        props: {
          width: 404,
          height: 20,
          layout: {
            mode: 'horizontal',
            crossAlign: 'center',
            mainAlign: 'spaceBetween',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Progress Label',
        parent: { $ref: 'progress_header_row' },
        text: 'Matching tracks with lossless audio...',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Progress Percent',
        parent: { $ref: 'progress_header_row' },
        text: '21 / 31 (68%)',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#2D6A5D' }],
        },
      },
    },

    // Progress Bar Track & Fill
    {
      command: 'node.create',
      as: 'progress_bar_track',
      params: {
        type: 'frame',
        name: 'Progress Bar Track',
        parent: { $ref: 'progress_card' },
        props: {
          width: 404,
          height: 6,
          cornerRadius: 3,
          fills: [{ type: 'solid', color: '#E8E4DA' }],
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'rectangle',
        name: 'Progress Bar Fill',
        parent: { $ref: 'progress_bar_track' },
        x: 0,
        y: 0,
        width: 275,
        height: 6,
        props: {
          cornerRadius: 3,
          fills: [{ type: 'solid', color: '#2D6A5D' }],
        },
      },
    },

    // Matched Item Chips List
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Matched Item 1',
        parent: { $ref: 'progress_card' },
        text: '✓  Titik Nadir (Kahitna, Monita) • Matched 24-bit 96kHz FLAC',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 10,
          fontStyle: 'Medium',
          fills: [{ type: 'solid', color: '#2D6A5D' }],
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Matched Item 2',
        parent: { $ref: 'progress_card' },
        text: '✓  Merry Christmas, Please Don\'t Call • Lossless Matched',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 10,
          fontStyle: 'Medium',
          fills: [{ type: 'solid', color: '#5A6872' }],
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Matched Item 3',
        parent: { $ref: 'progress_card' },
        text: '⏳  Matching: I miss you (Remastered 2026)...',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 10,
          fontStyle: 'Medium',
          fills: [{ type: 'solid', color: '#8B98A1' }],
        },
      },
    },

    // Modal Action Footer Row
    {
      command: 'node.create',
      as: 'modal_actions_row',
      params: {
        type: 'frame',
        name: 'Modal Actions Footer',
        parent: { $ref: 'spotify_modal' },
        props: {
          width: 432,
          height: 40,
          layout: {
            mode: 'horizontal',
            crossAlign: 'center',
            mainAlign: 'spaceBetween',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Cancel Link',
        parent: { $ref: 'modal_actions_row' },
        text: 'Cancel',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 13,
          fontStyle: 'Semi Bold',
          fills: [{ type: 'solid', color: '#5A6872' }],
        },
      },
    },
    {
      command: 'node.create',
      as: 'btn_confirm_import',
      params: {
        type: 'frame',
        name: 'Button - Save & Play',
        parent: { $ref: 'modal_actions_row' },
        props: {
          height: 38,
          cornerRadius: 19,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#132230' }],
          layout: {
            mode: 'horizontal',
            padding: [8, 20, 8, 20],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Button Text',
        parent: { $ref: 'btn_confirm_import' },
        text: 'Save to Local Library & Play ▶',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
        },
      },
    },

    // 2. POPOVER 2: TRACK CONTEXT MENU (Center)
    {
      command: 'node.create',
      as: 'context_menu',
      params: {
        type: 'frame',
        name: 'Popover - Track Context Menu',
        parent: frameId,
        x: 580,
        y: 190,
        props: {
          width: 245,
          height: 410,
          cornerRadius: 14,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'vertical',
            gap: 6,
            padding: [12, 12, 12, 12],
            crossAlign: 'min',
          },
          effects: [
            {
              type: 'dropShadow',
              color: '#13223026',
              offset: [0, 12],
              radius: 28,
              visible: true,
            },
          ],
        },
      },
    },

    // Context Track Header Box
    {
      command: 'node.create',
      as: 'ctx_track_header',
      params: {
        type: 'frame',
        name: 'Track Header Info Box',
        parent: { $ref: 'context_menu' },
        props: {
          width: 221,
          height: 42,
          layout: {
            mode: 'horizontal',
            gap: 10,
            padding: [4, 4, 4, 4],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      as: 'ctx_thumb',
      params: {
        type: 'frame',
        name: 'Thumbnail',
        parent: { $ref: 'ctx_track_header' },
        props: {
          width: 32,
          height: 32,
          cornerRadius: 6,
          fills: [{ type: 'solid', color: '#2D6A5D' }],
          layout: {
            mode: 'vertical',
            crossAlign: 'center',
            mainAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Thumb Icon',
        parent: { $ref: 'ctx_thumb' },
        text: '♪',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 16,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
        },
      },
    },
    {
      command: 'node.create',
      as: 'ctx_title_col',
      params: {
        type: 'frame',
        name: 'Title Col',
        parent: { $ref: 'ctx_track_header' },
        props: {
          width: 170,
          height: 34,
          layout: {
            mode: 'vertical',
            gap: 2,
            crossAlign: 'min',
            mainAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Title',
        parent: { $ref: 'ctx_title_col' },
        text: 'Ini Abadi',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Artist',
        parent: { $ref: 'ctx_title_col' },
        text: 'Perunggu • Memorandum',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 10,
          fontStyle: 'Regular',
          fills: [{ type: 'solid', color: '#8B98A1' }],
        },
      },
    },

    // Divider Line
    {
      command: 'node.create',
      params: {
        type: 'rectangle',
        name: 'Divider',
        parent: { $ref: 'context_menu' },
        x: 0,
        y: 0,
        width: 221,
        height: 1,
        props: {
          fills: [{ type: 'solid', color: '#E8E4DA' }],
        },
      },
    }
  ];

  // Helper for context menu items
  const menuItems = [
    { label: '▶  Play Next', active: false },
    { label: '➕ Add to Queue', active: false },
    { label: '📻 Start Song Radio', active: true, tag: 'INSTANT' },
    { label: '❤️ Save to Favorites', active: false },
    { label: '📁 Add to Playlist  ›', active: false },
    { label: 'ℹ️ Audio Quality Specs', active: false },
    { label: '↗ Go to Artist (Perunggu)', active: false },
    { label: '💿 View Full Album', active: false },
    { label: '🔗 Copy Shareable Link', active: false },
  ];

  menuItems.forEach((item, idx) => {
    const itemRef = `ctx_item_${idx}`;
    commands.push(
      {
        command: 'node.create',
        as: itemRef,
        params: {
          type: 'frame',
          name: `Menu Item - ${item.label}`,
          parent: { $ref: 'context_menu' },
          props: {
            width: 221,
            height: 32,
            cornerRadius: 7,
            fills: [{ type: 'solid', color: item.active ? '#EAF3F1' : '#FFFFFF', opacity: item.active ? 1 : 0 }],
            strokes: [{ type: 'solid', color: item.active ? '#C8DFDB' : '#FFFFFF', opacity: item.active ? 1 : 0 }],
            strokeWeight: 1,
            layout: {
              mode: 'horizontal',
              padding: [0, 10, 0, 10],
              crossAlign: 'center',
              mainAlign: 'spaceBetween',
            },
          },
        },
      },
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Item Text',
          parent: { $ref: itemRef },
          text: item.label,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 11,
            fontStyle: item.active ? 'Bold' : 'Medium',
            fills: [{ type: 'solid', color: item.active ? '#1A4038' : '#132230' }],
          },
        },
      }
    );

    if (item.tag) {
      commands.push({
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Tag',
          parent: { $ref: itemRef },
          text: item.tag,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 9,
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: '#2D6A5D' }],
            letterSpacing: 0.5,
          },
        },
      });
    }
  });

  // 3. POPOVER 3: AUDIOPHILE AUDIO SPECS & DAC (Top-Right)
  commands.push(
    {
      command: 'node.create',
      as: 'audio_specs_modal',
      params: {
        type: 'frame',
        name: 'Popover - Audio Specs & Hardware DAC',
        parent: frameId,
        x: 860,
        y: 80,
        props: {
          width: 360,
          height: 480,
          cornerRadius: 18,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'vertical',
            gap: 12,
            padding: [20, 20, 20, 20],
            crossAlign: 'min',
          },
          effects: [
            {
              type: 'dropShadow',
              color: '#13223026',
              offset: [0, 16],
              radius: 36,
              visible: true,
            },
          ],
        },
      },
    },

    // Specs Header
    {
      command: 'node.create',
      as: 'specs_badge',
      params: {
        type: 'frame',
        name: 'Badge',
        parent: { $ref: 'audio_specs_modal' },
        props: {
          height: 22,
          cornerRadius: 11,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#C8DFDB' }],
          layout: {
            mode: 'horizontal',
            padding: [2, 10, 2, 10],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Badge Text',
        parent: { $ref: 'specs_badge' },
        text: 'HI-RES LOSSLESS AUDIO PIPELINE',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 9,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#1A4038' }],
          letterSpacing: 0.6,
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Title',
        parent: { $ref: 'audio_specs_modal' },
        text: 'Audio Stream & DAC Specs',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 18,
          fontStyle: 'Extra Bold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    }
  );

  // Key-Value Nerd Stats Rows
  const nerdStats = [
    { label: 'Container & Codec', value: 'FLAC (Lossless) / Opus Transmux' },
    { label: 'Sample Rate', value: '96.0 kHz / 24-bit Master', highlight: true },
    { label: 'Calculated Bitrate', value: '1,411 kbps (Bit-Perfect)' },
    { label: 'Audio Driver API', value: 'WASAPI Exclusive Mode' },
    { label: 'Active DAC Endpoint', value: 'Realtek High Definition Audio' },
    { label: 'Processing Latency', value: '12 ms (Zero Resampling)' },
    { label: 'Equalizer Filter', value: 'Audiophile Flat Bypass' },
  ];

  nerdStats.forEach((stat, idx) => {
    const rowRef = `stat_row_${idx}`;
    commands.push(
      {
        command: 'node.create',
        as: rowRef,
        params: {
          type: 'frame',
          name: `Stat - ${stat.label}`,
          parent: { $ref: 'audio_specs_modal' },
          props: {
            width: 320,
            height: 32,
            cornerRadius: 6,
            fills: [{ type: 'solid', color: stat.highlight ? '#EAF3F1' : '#F7F5F0' }],
            strokes: [{ type: 'solid', color: stat.highlight ? '#C8DFDB' : '#E8E4DA' }],
            strokeWeight: 1,
            layout: {
              mode: 'horizontal',
              padding: [0, 10, 0, 10],
              crossAlign: 'center',
              mainAlign: 'spaceBetween',
            },
          },
        },
      },
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Label',
          parent: { $ref: rowRef },
          text: stat.label,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 10,
            fontStyle: 'Medium',
            fills: [{ type: 'solid', color: '#5A6872' }],
          },
        },
      },
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Value',
          parent: { $ref: rowRef },
          text: stat.value,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 11,
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: stat.highlight ? '#1A4038' : '#132230' }],
          },
        },
      }
    );
  });

  // Mini Equalizer Waveform Graphic Box
  commands.push(
    {
      command: 'node.create',
      as: 'eq_visual_box',
      params: {
        type: 'frame',
        name: 'Waveform Spectrum Box',
        parent: { $ref: 'audio_specs_modal' },
        props: {
          width: 320,
          height: 38,
          cornerRadius: 8,
          fills: [{ type: 'solid', color: '#2D6A5D' }],
          layout: {
            mode: 'horizontal',
            gap: 6,
            padding: [6, 12, 6, 12],
            crossAlign: 'center',
            mainAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'EQ Indicator Text',
        parent: { $ref: 'eq_visual_box' },
        text: '▮ ▰ ▰ ▮ ▰ ▮ ▰ ▰ ▮ ▰ ▮  BIT-PERFECT OUTPUT VERIFIED',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 10,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          letterSpacing: 0.8,
        },
      },
    }
  );

  // 4. POPOVER 4: SLEEP TIMER & RADIO PICKER (Bottom-Right)
  commands.push(
    {
      command: 'node.create',
      as: 'timer_modal',
      params: {
        type: 'frame',
        name: 'Popover - Sleep Timer Picker',
        parent: frameId,
        x: 740,
        y: 610,
        props: {
          width: 280,
          height: 290,
          cornerRadius: 16,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'vertical',
            gap: 8,
            padding: [16, 16, 16, 16],
            crossAlign: 'min',
          },
          effects: [
            {
              type: 'dropShadow',
              color: '#13223026',
              offset: [0, 12],
              radius: 28,
              visible: true,
            },
          ],
        },
      },
    },

    // Timer Title Row
    {
      command: 'node.create',
      as: 'timer_header_row',
      params: {
        type: 'frame',
        name: 'Timer Header',
        parent: { $ref: 'timer_modal' },
        props: {
          width: 248,
          height: 24,
          layout: {
            mode: 'horizontal',
            crossAlign: 'center',
            mainAlign: 'spaceBetween',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Title',
        parent: { $ref: 'timer_header_row' },
        text: 'Playback Sleep Timer',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 14,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Timer Icon',
        parent: { $ref: 'timer_header_row' },
        text: '⏱️',
        props: {
          fontSize: 14,
        },
      },
    }
  );

  const timerOptions = [
    { label: 'Off', active: false },
    { label: '15 Minutes', active: false },
    { label: '30 Minutes', active: false },
    { label: 'End of Current Track', active: true, tag: 'ACTIVE' },
    { label: '1 Hour', active: false },
  ];

  timerOptions.forEach((opt, idx) => {
    const optRef = `opt_timer_${idx}`;
    commands.push(
      {
        command: 'node.create',
        as: optRef,
        params: {
          type: 'frame',
          name: `Option - ${opt.label}`,
          parent: { $ref: 'timer_modal' },
          props: {
            width: 248,
            height: 32,
            cornerRadius: 8,
            fills: [{ type: 'solid', color: opt.active ? '#EAF3F1' : '#FFFFFF', opacity: opt.active ? 1 : 0 }],
            strokes: [{ type: 'solid', color: opt.active ? '#C8DFDB' : '#FFFFFF', opacity: opt.active ? 1 : 0 }],
            strokeWeight: 1,
            layout: {
              mode: 'horizontal',
              padding: [0, 10, 0, 10],
              crossAlign: 'center',
              mainAlign: 'spaceBetween',
            },
          },
        },
      },
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Label',
          parent: { $ref: optRef },
          text: (opt.active ? '● ' : '○ ') + opt.label,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 12,
            fontStyle: opt.active ? 'Bold' : 'Regular',
            fills: [{ type: 'solid', color: opt.active ? '#2D6A5D' : '#132230' }],
          },
        },
      }
    );

    if (opt.tag) {
      commands.push({
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Tag',
          parent: { $ref: optRef },
          text: '✓ In ~2:45 min',
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 10,
            fontStyle: 'Semi Bold',
            fills: [{ type: 'solid', color: '#2D6A5D' }],
          },
        },
      });
    }
  });

  console.log(`Executing batch of ${commands.length} atomic commands...`);
  await callMcp('batch', { commands });
  console.log('Polished modals batch executed successfully!');
}

polishModals().catch(console.error);
