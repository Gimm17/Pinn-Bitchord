const { callMcp } = require('./figcraft_client.cjs');

async function buildArtistDiscography() {
  const frameId = 4139;
  const appBodyId = 4140;
  const parentId = 4144; // MainContentArea
  const sidebarId = 4402;
  const footerId = 4580;

  console.log('Adjusting frame dimensions for Frame ' + frameId + '...');

  // Set Frame 4139 height to 1180
  await callMcp('run_command', {
    command: 'node.set',
    params: {
      id: frameId,
      props: {
        height: 1180,
      },
    },
  });

  // Set ApplicationBody height to 1060
  await callMcp('run_command', {
    command: 'node.set',
    params: {
      id: appBodyId,
      props: {
        height: 1060,
      },
    },
  });

  // Set Sidebar height to 1060
  await callMcp('run_command', {
    command: 'node.set',
    params: {
      id: sidebarId,
      props: {
        height: 1060,
      },
    },
  });

  // Set Footer y to 1100
  await callMcp('run_command', {
    command: 'node.set',
    params: {
      id: footerId,
      props: {
        y: 1100,
      },
    },
  });

  // Clean old children from 4144
  const currentArea = await callMcp('run_command', {
    command: 'node.get',
    params: { id: parentId },
  });
  const currentChildren = JSON.parse(currentArea.content[0].text).children || [];
  if (currentChildren.length > 0) {
    console.log('Deleting existing children from 4144:', currentChildren.map((c) => c.id));
    await callMcp('run_command', {
      command: 'edit.delete',
      params: { ids: currentChildren.map((c) => c.id) },
    });
  }

  // Update MainContentArea layout and size
  await callMcp('run_command', {
    command: 'node.set',
    params: {
      id: parentId,
      props: {
        width: 1024,
        height: 1060,
        layout: {
          mode: 'vertical',
          gap: 20,
          padding: [24, 32, 28, 32],
          crossAlign: 'min',
          mainAlign: 'min',
        },
      },
    },
  });

  // Activate "Artists" in Sidebar: de-activate Home (4408) and activate Artists (4437)
  try {
    await callMcp('run_command', {
      command: 'node.set',
      params: {
        id: 4408,
        props: {
          fills: [{ type: 'solid', color: '#000000', opacity: 0 }],
        },
      },
    });
    await callMcp('run_command', {
      command: 'node.set',
      params: {
        id: 4437,
        props: {
          fills: [{ type: 'solid', color: '#2D6A5D' }],
          cornerRadius: 8,
        },
      },
    });
  } catch (e) {
    console.warn('Sidebar highlight warning:', e.message);
  }

  const commands = [
    // ==========================================
    // 1. ARTIST HERO BANNER CARD (Porcelain Bento)
    // ==========================================
    {
      command: 'node.create',
      as: 'artist_hero',
      params: {
        type: 'frame',
        name: 'Hero - Artist Header Card',
        parent: parentId,
        props: {
          width: 960,
          height: 175,
          cornerRadius: 18,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            gap: 24,
            padding: [18, 24, 18, 24],
            crossAlign: 'center',
          },
          effects: [
            {
              type: 'dropShadow',
              color: '#1322300D',
              offset: [0, 4],
              radius: 12,
              visible: true,
            },
          ],
        },
      },
    },

    // 1a. Artist Avatar Frame (110x110)
    {
      command: 'node.create',
      as: 'artist_avatar_frame',
      params: {
        type: 'frame',
        name: 'Artist Avatar Frame',
        parent: { $ref: 'artist_hero' },
        props: {
          width: 110,
          height: 110,
          cornerRadius: 55,
          fills: [{ type: 'solid', color: '#2D6A5D' }],
          strokes: [{ type: 'solid', color: '#C8DFDB' }],
          strokeWeight: 2,
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
        name: 'Avatar Monogram',
        parent: { $ref: 'artist_avatar_frame' },
        text: 'P',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 42,
          fontStyle: 'Extra Bold',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
        },
      },
    },

    // 1b. Artist Hero Info Column
    {
      command: 'node.create',
      as: 'artist_info_col',
      params: {
        type: 'frame',
        name: 'Artist Meta & Actions Column',
        parent: { $ref: 'artist_hero' },
        props: {
          width: 770,
          height: 140,
          layout: {
            mode: 'vertical',
            gap: 8,
            crossAlign: 'min',
            mainAlign: 'center',
          },
        },
      },
    },

    // Verified Artist Pill Row
    {
      command: 'node.create',
      as: 'verified_row',
      params: {
        type: 'frame',
        name: 'Verified Badge Row',
        parent: { $ref: 'artist_info_col' },
        props: {
          height: 24,
          sizingH: 'hug',
          layout: {
            mode: 'horizontal',
            gap: 8,
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      as: 'verified_pill',
      params: {
        type: 'frame',
        name: 'Verified Pill',
        parent: { $ref: 'verified_row' },
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
        name: 'Verified Text',
        parent: { $ref: 'verified_pill' },
        text: '✓ VERIFIED ARTIST',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 10,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#1A4038' }],
          letterSpacing: 0.6,
        },
      },
    },
    {
      command: 'node.create',
      as: 'genre_pill',
      params: {
        type: 'frame',
        name: 'Genre Pill',
        parent: { $ref: 'verified_row' },
        props: {
          height: 22,
          cornerRadius: 11,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#E8E4DA' }],
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
        name: 'Genre Text',
        parent: { $ref: 'genre_pill' },
        text: 'INDIE ROCK / POP • JAKARTA',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 10,
          fontStyle: 'Semi Bold',
          fills: [{ type: 'solid', color: '#5A6872' }],
          letterSpacing: 0.5,
        },
      },
    },

    // Artist Name
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Artist Heading',
        parent: { $ref: 'artist_info_col' },
        text: 'Perunggu',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 32,
          fontStyle: 'Extra Bold',
          fills: [{ type: 'solid', color: '#132230' }],
          letterSpacing: -0.8,
        },
      },
    },

    // Stats and Description Line
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Artist Stats Line',
        parent: { $ref: 'artist_info_col' },
        text: '482,190 Monthly Listeners • 12 Releases • Lossless & Master Streams (YouTube Music Source)',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Regular',
          fills: [{ type: 'solid', color: '#5A6872' }],
        },
      },
    },

    // Action Buttons Row
    {
      command: 'node.create',
      as: 'artist_actions_row',
      params: {
        type: 'frame',
        name: 'Actions Row',
        parent: { $ref: 'artist_info_col' },
        props: {
          height: 34,
          sizingH: 'hug',
          layout: {
            mode: 'horizontal',
            gap: 10,
            crossAlign: 'center',
          },
        },
      },
    },
    // Button: Play Radio
    {
      command: 'node.create',
      as: 'btn_play_radio',
      params: {
        type: 'frame',
        name: 'Button - Play Artist Radio',
        parent: { $ref: 'artist_actions_row' },
        props: {
          height: 32,
          cornerRadius: 16,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#132230' }],
          layout: {
            mode: 'horizontal',
            padding: [6, 16, 6, 16],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Play Radio Text',
        parent: { $ref: 'btn_play_radio' },
        text: '▶  Start Artist Radio',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
        },
      },
    },
    // Button: Followed
    {
      command: 'node.create',
      as: 'btn_follow',
      params: {
        type: 'frame',
        name: 'Button - Following',
        parent: { $ref: 'artist_actions_row' },
        props: {
          height: 32,
          cornerRadius: 16,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#2D6A5D' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            padding: [6, 14, 6, 14],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Follow Text',
        parent: { $ref: 'btn_follow' },
        text: '✓ Following',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Semi Bold',
          fills: [{ type: 'solid', color: '#2D6A5D' }],
        },
      },
    },
    // Button: Shuffle
    {
      command: 'node.create',
      as: 'btn_shuffle',
      params: {
        type: 'frame',
        name: 'Button - Shuffle',
        parent: { $ref: 'artist_actions_row' },
        props: {
          height: 32,
          cornerRadius: 16,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            padding: [6, 14, 6, 14],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Shuffle Text',
        parent: { $ref: 'btn_shuffle' },
        text: '🔀 Shuffle',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Medium',
          fills: [{ type: 'solid', color: '#5A6872' }],
        },
      },
    },

    // ==========================================
    // 2. POPULAR TRACKS SHELF (Top 5 Ranked)
    // ==========================================
    {
      command: 'node.create',
      as: 'popular_section',
      params: {
        type: 'frame',
        name: 'Section - Popular Tracks',
        parent: parentId,
        props: {
          width: 960,
          height: 275,
          cornerRadius: 18,
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
          layout: {
            mode: 'vertical',
            gap: 6,
            padding: [16, 20, 16, 20],
            crossAlign: 'min',
          },
        },
      },
    },

    // Popular Section Header Row
    {
      command: 'node.create',
      as: 'popular_header_row',
      params: {
        type: 'frame',
        name: 'Header Row',
        parent: { $ref: 'popular_section' },
        props: {
          width: 920,
          height: 26,
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
        name: 'Section Title',
        parent: { $ref: 'popular_header_row' },
        text: 'Popular Releases & Top Tracks',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 15,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'See More Link',
        parent: { $ref: 'popular_header_row' },
        text: 'Show all 10 tracks  ›',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Semi Bold',
          fills: [{ type: 'solid', color: '#2D6A5D' }],
        },
      },
    },
  ];

  // Helper for 5 popular song rows
  const popularSongs = [
    { rank: '1', title: 'Ini Abadi', album: 'Memorandum', plays: '12,410,500', time: '4:12', badge: 'LOSSLESS 24-BIT', active: true },
    { rank: '2', title: 'Biang Lara', album: 'Memorandum', plays: '8,924,100', time: '3:58', badge: 'LOSSLESS 24-BIT', active: false },
    { rank: '3', title: '33x', album: 'Memorandum', plays: '6,211,800', time: '4:45', badge: 'CD QUALITY', active: false },
    { rank: '4', title: 'Pastikan Riuh Akhiri Malammu', album: 'Memorandum', plays: '5,830,200', time: '5:15', badge: 'LOSSLESS 24-BIT', active: false },
    { rank: '5', title: 'Tarung Bebas', album: 'Memorandum', plays: '4,120,400', time: '3:32', badge: 'CD QUALITY', active: false },
  ];

  popularSongs.forEach((song, idx) => {
    const rowRef = `pop_row_${idx}`;
    commands.push({
      command: 'node.create',
      as: rowRef,
      params: {
        type: 'frame',
        name: `Track Row ${song.rank} - ${song.title}`,
        parent: { $ref: 'popular_section' },
        props: {
          width: 920,
          height: 38,
          cornerRadius: 8,
          fills: [{ type: 'solid', color: song.active ? '#EAF3F1' : '#FFFFFF', opacity: song.active ? 1 : 0 }],
          strokes: [{ type: 'solid', color: song.active ? '#C8DFDB' : '#FFFFFF', opacity: song.active ? 1 : 0 }],
          strokeWeight: 1,
          layout: {
            mode: 'horizontal',
            crossAlign: 'center',
            padding: [0, 12, 0, 12],
          },
        },
      },
    });

    // Rank / Playing icon
    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Rank',
        parent: { $ref: rowRef },
        text: song.active ? '▶' : song.rank,
        props: {
          width: 24,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: song.active ? 'Bold' : 'Medium',
          fills: [{ type: 'solid', color: song.active ? '#2D6A5D' : '#8B98A1' }],
        },
      },
    });

    // Song Title
    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Title',
        parent: { $ref: rowRef },
        text: song.title,
        props: {
          width: 280,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 13,
          fontStyle: song.active ? 'Bold' : 'Semi Bold',
          fills: [{ type: 'solid', color: song.active ? '#1A4038' : '#132230' }],
        },
      },
    });

    // Album Name
    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Album',
        parent: { $ref: rowRef },
        text: song.album,
        props: {
          width: 200,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Regular',
          fills: [{ type: 'solid', color: '#5A6872' }],
        },
      },
    });

    // Play count
    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Plays',
        parent: { $ref: rowRef },
        text: song.plays + ' plays',
        props: {
          width: 150,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontStyle: 'Regular',
          fills: [{ type: 'solid', color: '#8B98A1' }],
        },
      },
    });

    // Audio Quality Badge
    const badgeContainerRef = `badge_pop_${idx}`;
    commands.push({
      command: 'node.create',
      as: badgeContainerRef,
      params: {
        type: 'frame',
        name: 'Quality Badge',
        parent: { $ref: rowRef },
        props: {
          width: 130,
          layout: {
            mode: 'horizontal',
            crossAlign: 'center',
          },
        },
      },
    });
    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Badge Text',
        parent: { $ref: badgeContainerRef },
        text: song.badge,
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 9,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: song.badge.includes('24-BIT') ? '#2D6A5D' : '#66A3BF' }],
          letterSpacing: 0.5,
        },
      },
    });

    // Duration & Action
    commands.push({
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Time',
        parent: { $ref: rowRef },
        text: song.time + '  •••',
        props: {
          width: 70,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 12,
          fontStyle: 'Regular',
          fills: [{ type: 'solid', color: '#5A6872' }],
          textAlign: 'right',
        },
      },
    });
  });

  // ==========================================
  // 3. DISCOGRAPHY SECTION (Albums & Singles)
  // ==========================================
  commands.push(
    {
      command: 'node.create',
      as: 'disco_section',
      params: {
        type: 'frame',
        name: 'Section - Discography Albums',
        parent: parentId,
        props: {
          width: 960,
          height: 275,
          layout: {
            mode: 'vertical',
            gap: 12,
            crossAlign: 'min',
          },
        },
      },
    },

    // Discography Header & Filter Pills
    {
      command: 'node.create',
      as: 'disco_header_row',
      params: {
        type: 'frame',
        name: 'Discography Header Row',
        parent: { $ref: 'disco_section' },
        props: {
          width: 960,
          height: 32,
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
        parent: { $ref: 'disco_header_row' },
        text: 'Discography',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 18,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },

    // Filter Chips Container (Hug Width)
    {
      command: 'node.create',
      as: 'filter_chips',
      params: {
        type: 'frame',
        name: 'Filter Chips Container',
        parent: { $ref: 'disco_header_row' },
        props: {
          height: 28,
          sizingH: 'hug',
          layout: {
            mode: 'horizontal',
            gap: 8,
            crossAlign: 'center',
          },
        },
      },
    },
    // Filter Chip: All (Active)
    {
      command: 'node.create',
      as: 'chip_all',
      params: {
        type: 'frame',
        name: 'Chip - All Releases (Active)',
        parent: { $ref: 'filter_chips' },
        props: {
          height: 28,
          cornerRadius: 14,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#2D6A5D' }],
          layout: {
            mode: 'horizontal',
            padding: [4, 14, 4, 14],
            crossAlign: 'center',
          },
        },
      },
    },
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Text',
        parent: { $ref: 'chip_all' },
        text: 'All Releases',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
        },
      },
    },
    // Filter Chip: Albums
    {
      command: 'node.create',
      as: 'chip_albums',
      params: {
        type: 'frame',
        name: 'Chip - Albums',
        parent: { $ref: 'filter_chips' },
        props: {
          height: 28,
          cornerRadius: 14,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
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
        name: 'Text',
        parent: { $ref: 'chip_albums' },
        text: 'Albums',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontStyle: 'Medium',
          fills: [{ type: 'solid', color: '#5A6872' }],
        },
      },
    },
    // Filter Chip: Singles & EPs
    {
      command: 'node.create',
      as: 'chip_singles',
      params: {
        type: 'frame',
        name: 'Chip - Singles & EPs',
        parent: { $ref: 'filter_chips' },
        props: {
          height: 28,
          cornerRadius: 14,
          sizingH: 'hug',
          fills: [{ type: 'solid', color: '#FFFFFF' }],
          strokes: [{ type: 'solid', color: '#DED8CB' }],
          strokeWeight: 1,
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
        name: 'Text',
        parent: { $ref: 'chip_singles' },
        text: 'Singles & EPs',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11,
          fontStyle: 'Medium',
          fills: [{ type: 'solid', color: '#5A6872' }],
        },
      },
    },

    // Horizontal Albums Cards Row (4 Cards)
    {
      command: 'node.create',
      as: 'album_cards_row',
      params: {
        type: 'frame',
        name: 'Album Cards Row (4-Grid)',
        parent: { $ref: 'disco_section' },
        props: {
          width: 960,
          height: 220,
          layout: {
            mode: 'horizontal',
            gap: 16,
            crossAlign: 'center',
          },
        },
      },
    }
  );

  // 4 Album Cards
  const albums = [
    { title: 'Memorandum', type: '2022 • Studio Album • 11 Songs', color: '#DDD6C6', border: '#C8DFDB', tag: 'STUDIO ALBUM' },
    { title: 'Pendaran', type: '2023 • EP • 5 Songs', color: '#A3CCC5', border: '#7BB3A9', tag: 'EP' },
    { title: 'Biang Lara (Live Acoustic)', type: '2023 • Single • 1 Song', color: '#4B738A', border: '#3A5C70', tag: 'SINGLE' },
    { title: 'Live at Joyland Festival', type: '2024 • Live Album • 14 Songs', color: '#D47E6A', border: '#B66250', tag: 'LIVE RECORDING' },
  ];

  albums.forEach((album, idx) => {
    const cardRef = `album_card_${idx}`;
    const artRef = `album_art_${idx}`;

    commands.push(
      {
        command: 'node.create',
        as: cardRef,
        params: {
          type: 'frame',
          name: `Card - ${album.title}`,
          parent: { $ref: 'album_cards_row' },
          props: {
            width: 228,
            height: 215,
            cornerRadius: 14,
            fills: [{ type: 'solid', color: '#FFFFFF' }],
            strokes: [{ type: 'solid', color: '#DED8CB' }],
            strokeWeight: 1,
            layout: {
              mode: 'vertical',
              gap: 10,
              padding: [12, 12, 12, 12],
              crossAlign: 'min',
            },
            effects: [
              {
                type: 'dropShadow',
                color: '#1322300A',
                offset: [0, 4],
                radius: 8,
                visible: true,
              },
            ],
          },
        },
      },

      // Artwork box
      {
        command: 'node.create',
        as: artRef,
        params: {
          type: 'frame',
          name: 'Artwork Box',
          parent: { $ref: cardRef },
          props: {
            width: 204,
            height: 124,
            cornerRadius: 8,
            fills: [{ type: 'solid', color: album.color }],
            strokes: [{ type: 'solid', color: album.border }],
            strokeWeight: 1,
            layout: {
              mode: 'vertical',
              padding: [8, 10, 8, 10],
              mainAlign: 'spaceBetween',
            },
          },
        },
      },
      // Tag inside artwork
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Artwork Badge',
          parent: { $ref: artRef },
          text: album.tag,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 9,
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: '#FFFFFF' }],
            letterSpacing: 0.6,
          },
        },
      },
      // Artwork Mini Title
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Art Title',
          parent: { $ref: artRef },
          text: album.title,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 14,
            fontStyle: 'Extra Bold',
            fills: [{ type: 'solid', color: '#FFFFFF' }],
          },
        },
      },

      // Card Meta Title
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Album Title',
          parent: { $ref: cardRef },
          text: album.title,
          props: {
            width: 204,
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 13,
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: '#132230' }],
          },
        },
      },
      // Card Subtitle
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Album Subtitle',
          parent: { $ref: cardRef },
          text: album.type,
          props: {
            width: 204,
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 11,
            fontStyle: 'Regular',
            fills: [{ type: 'solid', color: '#5A6872' }],
          },
        },
      }
    );
  });

  // ==========================================
  // 4. "FANS ALSO LIKE" SIMILAR ARTISTS SHELF
  // ==========================================
  commands.push(
    {
      command: 'node.create',
      as: 'fans_section',
      params: {
        type: 'frame',
        name: 'Section - Fans Also Like',
        parent: parentId,
        props: {
          width: 960,
          height: 155,
          layout: {
            mode: 'vertical',
            gap: 12,
            crossAlign: 'min',
          },
        },
      },
    },

    // Fans Header
    {
      command: 'node.create',
      params: {
        type: 'text',
        name: 'Section Title',
        parent: { $ref: 'fans_section' },
        text: 'Fans Also Like',
        props: {
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 18,
          fontStyle: 'Bold',
          fills: [{ type: 'solid', color: '#132230' }],
        },
      },
    },

    // Horizontal Similar Artists Row (4 Cards)
    {
      command: 'node.create',
      as: 'similar_artists_row',
      params: {
        type: 'frame',
        name: 'Similar Artists Row (4-Grid)',
        parent: { $ref: 'fans_section' },
        props: {
          width: 960,
          height: 110,
          layout: {
            mode: 'horizontal',
            gap: 16,
            crossAlign: 'center',
          },
        },
      },
    }
  );

  const similarArtists = [
    { name: 'Hindia', listeners: '1,840,200 Listeners', color: '#132230', initial: 'H' },
    { name: '.Feast', listeners: '1,210,900 Listeners', color: '#2D6A5D', initial: 'F' },
    { name: 'Barasuara', listeners: '950,400 Listeners', color: '#66A3BF', initial: 'B' },
    { name: 'Efek Rumah Kaca', listeners: '890,300 Listeners', color: '#D47E6A', initial: 'E' },
  ];

  similarArtists.forEach((artist, idx) => {
    const artistCardRef = `similar_artist_${idx}`;
    const avatarRef = `similar_avatar_${idx}`;

    commands.push(
      {
        command: 'node.create',
        as: artistCardRef,
        params: {
          type: 'frame',
          name: `Artist Card - ${artist.name}`,
          parent: { $ref: 'similar_artists_row' },
          props: {
            width: 228,
            height: 96,
            cornerRadius: 14,
            fills: [{ type: 'solid', color: '#FFFFFF' }],
            strokes: [{ type: 'solid', color: '#DED8CB' }],
            strokeWeight: 1,
            layout: {
              mode: 'horizontal',
              gap: 12,
              padding: [12, 14, 12, 14],
              crossAlign: 'center',
            },
            effects: [
              {
                type: 'dropShadow',
                color: '#1322300A',
                offset: [0, 4],
                radius: 8,
                visible: true,
              },
            ],
          },
        },
      },

      // Circular Avatar
      {
        command: 'node.create',
        as: avatarRef,
        params: {
          type: 'frame',
          name: 'Avatar',
          parent: { $ref: artistCardRef },
          props: {
            width: 56,
            height: 56,
            cornerRadius: 28,
            fills: [{ type: 'solid', color: artist.color }],
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
          name: 'Initial',
          parent: { $ref: avatarRef },
          text: artist.initial,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 22,
            fontStyle: 'Extra Bold',
            fills: [{ type: 'solid', color: '#FFFFFF' }],
          },
        },
      },

      // Artist Info Col
      {
        command: 'node.create',
        as: `similar_info_${idx}`,
        params: {
          type: 'frame',
          name: 'Artist Info',
          parent: { $ref: artistCardRef },
          props: {
            width: 130,
            layout: {
              mode: 'vertical',
              gap: 4,
              crossAlign: 'min',
            },
          },
        },
      },
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Name',
          parent: { $ref: `similar_info_${idx}` },
          text: artist.name,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 13,
            fontStyle: 'Bold',
            fills: [{ type: 'solid', color: '#132230' }],
          },
        },
      },
      {
        command: 'node.create',
        params: {
          type: 'text',
          name: 'Listeners',
          parent: { $ref: `similar_info_${idx}` },
          text: artist.listeners,
          props: {
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 10,
            fontStyle: 'Regular',
            fills: [{ type: 'solid', color: '#5A6872' }],
          },
        },
      }
    );
  });

  console.log(`Executing batch of ${commands.length} atomic commands to FigCraft...`);
  await callMcp('batch', { commands });
  console.log('Batch executed successfully!');
}

buildArtistDiscography().catch(console.error);
