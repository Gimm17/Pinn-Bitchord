const { callMcp } = require('./figcraft_client.cjs');

async function buildPlaylistDetail() {
  const parentId = 3487; // MainContentArea in Frame 7 (3482)

  // Configure layout on parent
  await callMcp('run_command', {
    command: 'node.set',
    params: {
      id: parentId,
      props: {
        width: 1024,
        layout: {
          mode: 'vertical',
          gap: 20,
          padding: [24, 32, 32, 32],
          crossAlign: 'min',
          mainAlign: 'min',
        },
      },
    },
  });

  const commands = [
    // 1. Hero Header Container
    {
      command: 'node.create',
      as: 'hero_container',
      params: {
        type: 'frame',
        name: 'Header - Playlist Hero Card',
        parent: parentId,
        props: {
          width: 960,
          height: 200,
          layout: {
            mode: 'horizontal',
            gap: 28,
            padding: [0, 0, 0, 0],
            crossAlign: 'center',
          },
          fills: [{ type: 'solid', color: '#FFFFFF', opacity: 0 }],
        },
      },
    },

    // 1a. Artwork Box
    {
      command: 'node.create',
      as: 'artwork_box',
      params: {
        type: 'frame',
        name: 'Playlist Artwork Mosaic (4-Grid)',
        parent: { $ref: 'hero_container' },
        props: {
          width: 190,
          height: 190,
          cornerRadius: 16,
          fills: [{ type: 'solid', color: '#D8EAE6' }],
          strokes: [{ type: 'solid', color: '#C8DFDB' }],
          strokeWeight: 1,
          effects: [
            {
              type: 'dropShadow',
              color: '#132230',
              
              offset: [0, 8],
              radius: 20,
              visible: true,
            },
          ],
        },
      },
    },

    // 1b. Artwork Decorative quadrants
    {
      command: 'node.create',
      params: {
        type: 'rectangle',
        name: 'Quad 1 (Sage Blue)',
        parent: { $ref: 'artwork_box' },
        x: 0,
        y: 0,
        width: 95,
        height: 95,
        props: { fills: [{ type: 'solid', color: '#A3CCC5' }] },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'rectangle',
        name: 'Quad 2 (Earthy Sand)',
        parent: { $ref: 'artwork_box' },
        x: 95,
        y: 0,
        width: 95,
        height: 95,
        props: { fills: [{ type: 'solid', color: '#DDD6C6' }] },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'rectangle',
        name: 'Quad 3 (Slate Navy)',
        parent: { $ref: 'artwork_box' },
        x: 0,
        y: 95,
        width: 95,
        height: 95,
        props: { fills: [{ type: 'solid', color: '#4B738A' }] },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'rectangle',
        name: 'Quad 4 (Terracotta)',
        parent: { $ref: 'artwork_box' },
        x: 95,
        y: 95,
        width: 95,
        height: 95,
        props: { fills: [{ type: 'solid', color: '#D47E6A' }] },
      },
    },

    // 1c. Hero Info Column
    {
      command: 'node.create',
      as: 'hero_info',
      params: {
        type: 'frame',
        name: 'Info & Actions Column',
        parent: { $ref: 'hero_container' },
        props: {
          width: 730,
          layout: {
            mode: 'vertical',
            gap: 12,
            crossAlign: 'min',
            mainAlign: 'center',
          },
        },
      },
    },

    // Badge
    {
      command: 'node.create',
      as: 'badge_container',
      params: {
        type: 'frame',
        name: 'Badge - Spotify Import',
        parent: { $ref: 'hero_info' },
        props: {
          cornerRadius: 9999,
          fills: [{ type: 'solid', color: '#C8DFDB' }],
          layout: {
            mode: 'horizontal',
            padding: [4, 12, 4, 12],
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
        parent: { $ref: 'badge_container' },
        text: 'SPOTIFY IMPORTED PLAYLIST • HIGH FIDELITY',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 10,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#1A4038' }],
          letterSpacing: 0.8,
        },
      },
    },

    // Playlist Title
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Playlist Title',
        parent: { $ref: 'hero_info' },
        text: 'hadeh hadeh',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 34,
          fontStyle: 'Extra Bold',
          fills: [{ type: 'solid', color: '#132230' }],
          letterSpacing: -0.8,
        },
      },
    },

    // Subtitle & Meta
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Subtitle Meta',
        parent: { $ref: 'hero_info' },
        text: 'Created by Pian • 31 songs, 1 hr 48 min • All Matched to YouTube Music Lossless Streams',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 13,
          fontStyle: 'Medium',
          fills: [{ type: 'solid', color: '#5A6E78' }],
        },
      },
    },

    // Actions Row
    {
      command: 'node.create',
      as: 'hero_actions',
      params: {
        type: 'frame',
        name: 'Hero Action Buttons',
        parent: { $ref: 'hero_info' },
        props: {
          layout: {
            mode: 'horizontal',
            gap: 12,
            crossAlign: 'center',
          },
        },
      },
    },

    // Primary Play Button
    {
      command: 'node.create',
      as: 'btn_play',
      params: {
        type: 'frame',
        name: 'Button - Play All',
        parent: { $ref: 'hero_actions' },
        props: {
          width: 110,
          height: 38,
          cornerRadius: 19,
          fills: [{ type: 'solid', color: '#132230' }],
          layout: {
            mode: 'horizontal',
            gap: 8,
            padding: [0, 18, 0, 18],
            mainAlign: 'center',
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: '▶  Play',
        parent: { $ref: 'btn_play' },
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 13,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
        },
      },
    },

    // Secondary Shuffle Button
    {
      command: 'node.create',
      as: 'btn_shuffle',
      params: {
        type: 'frame',
        name: 'Button - Shuffle',
        parent: { $ref: 'hero_actions' },
        props: {
          width: 110,
          height: 38,
          cornerRadius: 19,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            gap: 8,
            padding: [0, 18, 0, 18],
            mainAlign: 'center',
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: '🔀  Shuffle',
        parent: { $ref: 'btn_shuffle' },
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 13,
          fontStyle: 'SemiBold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },

    // Radio Button
    {
      command: 'node.create',
      as: 'btn_radio',
      params: {
        type: 'frame',
        name: 'Button - Radio',
        parent: { $ref: 'hero_actions' },
        props: {
          width: 100,
          height: 38,
          cornerRadius: 19,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            gap: 6,
            padding: [0, 14, 0, 14],
            mainAlign: 'center',
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: '📻  Radio',
        parent: { $ref: 'btn_radio' },
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 13,
          fontStyle: 'SemiBold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },

    // Saved Bookmark Button
    {
      command: 'node.create',
      as: 'btn_save',
      params: {
        type: 'frame',
        name: 'Button - Saved In Library',
        parent: { $ref: 'hero_actions' },
        props: {
          width: 40,
          height: 38,
          cornerRadius: 19,
          fills: [{ type: 'solid', color: '#E4F0ED' }],
          strokes: [{ type: 'solid', color: '#C8DFDB' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            mainAlign: 'center',
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: '✓',
        parent: { $ref: 'btn_save' },
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 15,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#2D6A5D' }],
        },
      },
    },

    // Delete Button
    {
      command: 'node.create',
      as: 'btn_del',
      params: {
        type: 'frame',
        name: 'Button - Delete',
        parent: { $ref: 'hero_actions' },
        props: {
          width: 40,
          height: 38,
          cornerRadius: 19,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            mainAlign: 'center',
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: '🗑',
        parent: { $ref: 'btn_del' },
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 14,
          fills: [{ type: 'solid', color: '#8E8E93' }],
        },
      },
    },

    // 2. Status Banner (Synchronized)
    {
      command: 'node.create',
      as: 'sync_banner',
      params: {
        type: 'frame',
        name: 'Sync Status Banner',
        parent: parentId,
        props: {
          width: 960,
          height: 44,
          cornerRadius: 12,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            padding: [0, 16, 0, 16],
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
        text: '🟢 All 31 Songs Matched & Ready • High-Res Lossless Audio Priority',
        parent: { $ref: 'sync_banner' },
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'SemiBold',
          fills: [{ type: 'solid', color: '#2D6A5D' }],
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: 'BitChord Local Database • No API Key Required',
        parent: { $ref: 'sync_banner' },
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontStyle: 'Regular',
          fills: [{ type: 'solid', color: '#8E8E93' }],
        },
      },
    },

    // 3. Tracklist Table Container
    {
      command: 'node.create',
      as: 'table_container',
      params: {
        type: 'frame',
        name: 'Tracklist Table Container',
        parent: parentId,
        props: {
          width: 960,
          cornerRadius: 14,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'vertical',
            padding: [10, 12, 12, 12],
            gap: 2,
          },
        },
      },
    },

    // Table Header Row
    {
      command: 'node.create',
      as: 'table_header',
      params: {
        type: 'frame',
        name: 'Table Header',
        parent: { $ref: 'table_container' },
        props: {
          width: 936,
          height: 32,
          layout: {
            mode: 'horizontal',
            padding: [0, 12, 0, 12],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: '#',
        parent: { $ref: 'table_header' },
        props: { width: 36, fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontStyle: 'Bold', fills: [{ type: 'solid', color: '#8E8E93' }] },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: 'TITLE',
        parent: { $ref: 'table_header' },
        props: { width: 330, fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontStyle: 'Bold', fills: [{ type: 'solid', color: '#8E8E93' }] },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: 'ARTIST',
        parent: { $ref: 'table_header' },
        props: { width: 200, fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontStyle: 'Bold', fills: [{ type: 'solid', color: '#8E8E93' }] },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: 'ALBUM',
        parent: { $ref: 'table_header' },
        props: { width: 170, fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontStyle: 'Bold', fills: [{ type: 'solid', color: '#8E8E93' }] },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: 'QUALITY',
        parent: { $ref: 'table_header' },
        props: { width: 110, fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontStyle: 'Bold', fills: [{ type: 'solid', color: '#8E8E93' }] },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        text: 'TIME',
        parent: { $ref: 'table_header' },
        props: { width: 50, textAlign: 'right', fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontStyle: 'Bold', fills: [{ type: 'solid', color: '#8E8E93' }] },
      },
    },
  ];

  // Helper for adding track rows
  const tracks = [
    { num: '1', title: 'Titik Nadir (feat. Monita Tahalea)', artist: 'Kahitna, Monita Tahalea', album: 'Titik Nadir', quality: 'FLAC · 1411k', time: '4:06', isPlaying: true },
    { num: '2', title: "Merry Christmas, Please Don't Call", artist: 'Bleachers', album: 'Merry Christmas...', quality: 'FLAC · 1411k', time: '3:23' },
    { num: '3', title: 'I miss you (Remastered 2026)', artist: 'Gracie Abrams', album: 'Minor', quality: 'Lossless 24-bit', time: '4:44' },
    { num: '4', title: 'La La Lost You (Acoustic Version)', artist: 'NIKI, 88rising', album: 'NIKI Acoustic', quality: 'FLAC · 1411k', time: '3:29' },
    { num: '5', title: 'Sampai Jadi Debu', artist: 'Banda Neira', album: 'Yang Patah Tumbuh', quality: 'Lossless 16-bit', time: '4:18' },
    { num: '6', title: 'Ini Abadi', artist: 'Perunggu', album: 'Memorandum', quality: 'Hi-Res 24/96k', time: '3:52' },
    { num: '7', title: "Ain't In LA", artist: 'ADÉLA', album: 'PRIMA', quality: 'FLAC · 1411k', time: '3:45' },
    { num: '8', title: 'On Bended Knee', artist: 'Boyz II Men', album: 'II - Yo Te Voy A...', quality: 'Lossless 16-bit', time: '5:32' },
  ];

  tracks.forEach((t, i) => {
    const rowAs = `track_row_${i}`;
    commands.push({
      command: 'node.create',
      as: rowAs,
      params: {
        type: 'frame',
        name: `Row ${t.num} - ${t.title}`,
        parent: { $ref: 'table_container' },
        props: {
          width: 936,
          height: 48,
          cornerRadius: 8,
          fills: t.isPlaying ? [{ type: 'solid', color: '#EAF3F1' }] : [{ type: 'solid', color: '#FFFFFF', opacity: 0 }],
          layout: {
            mode: 'horizontal',
            padding: [0, 12, 0, 12],
            crossAlign: 'center',
          },
        },
      },
    });

    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        text: t.isPlaying ? '🔊' : t.num,
        parent: { $ref: rowAs },
        props: {
          width: 36,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: t.isPlaying ? 'Bold' : 'Regular',
          fills: [{ type: 'solid', color: t.isPlaying ? '#2D6A5D' : '#8E8E93' }],
        },
      },
    });

    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        text: t.title,
        parent: { $ref: rowAs },
        props: {
          width: 330,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 13,
          fontStyle: t.isPlaying ? 'Bold' : 'Medium',
          fills: [{ type: 'solid', color: t.isPlaying ? '#1A4038' : '#132230' }],
        },
      },
    });

    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        text: t.artist,
        parent: { $ref: rowAs },
        props: {
          width: 200,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Regular',
          fills: [{ type: 'solid', color: '#5A6E78' }],
        },
      },
    });

    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        text: t.album,
        parent: { $ref: rowAs },
        props: {
          width: 170,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Regular',
          fills: [{ type: 'solid', color: '#8E8E93' }],
        },
      },
    });

    // Quality Badge
    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        text: t.quality,
        parent: { $ref: rowAs },
        props: {
          width: 110,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontStyle: 'SemiBold',
          fills: [{ type: 'solid', color: '#2D6A5D' }],
        },
      },
    });

    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        text: t.time,
        parent: { $ref: rowAs },
        props: {
          width: 50,
          textAlign: 'right',
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Medium',
          fills: [{ type: 'solid', color: t.isPlaying ? '#2D6A5D' : '#8E8E93' }],
        },
      },
    });
  });

  console.log(`Sending batch with ${commands.length} commands...`);
  const res = await callMcp('batch', { commands, onError: 'abort' });
  console.log('Result:', res);
}

buildPlaylistDetail().catch(console.error);
