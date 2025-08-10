// --- TYPES ---
export type SessionComment = {
  author: string;
  avatarUrl: string;
  text: string;
};

export interface Session {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  duration: number; // in minutes
}

export interface SessionDetails extends Session {
  creator: string;
  category: 'Relaxation' | 'Focus' | 'Energy';
  intensity: 'Mild' | 'Moderate' | 'Intense';
  audioUrl: string;
  events: { time: number; colors: number[][] }[];
  comments: SessionComment[];
}

// --- MOCK DATA ---
const MOCK_SESSION_DETAILS: { [id: string]: SessionDetails } = {
  'nft-001': {
    id: 'nft-001',
    name: 'Oceanic Calm',
    description: 'Gentle blue and green lights synced with calming ocean waves.',
    imageUrl: '/images/oceanic_calm.png',
    duration: 15,
    creator: 'ChromaMind Labs',
    category: 'Relaxation',
    intensity: 'Mild',
    audioUrl: '/audio/ocean-waves.mp3',
    events: [ /* ... event data from previous step ... */ ],
    comments: [
      { author: 'ZenMaster', avatarUrl: '/avatars/avatar1.png', text: 'Pure bliss. I felt like I was floating in the ocean. Highly recommended for de-stressing after a long day.' },
      { author: 'LucidDreamer', avatarUrl: '/avatars/avatar2.png', text: 'The color transitions are so smooth. Put me in a perfect state for meditation.' },
    ],
  },
  'nft-002': {
    id: 'nft-002',
    name: 'Forest Focus',
    description: 'Pulsating green and amber lights designed to enhance focus.',
    imageUrl: '/images/forest_focus.png',
    duration: 20,
    creator: 'Dr. Aura Bright',
    category: 'Focus',
    intensity: 'Moderate',
    audioUrl: '/audio/forest-sounds.mp3',
    events: [ /* ... event data from previous step ... */ ],
    comments: [
      { author: 'DeepWork', avatarUrl: '/avatars/avatar3.png', text: 'My go-to for deep work sessions. The amber light pulses really help me lock in and ignore distractions. A game-changer.' },
    ],
  },
  'nft-003': {
    id: 'nft-003',
    name: 'Sunrise Energizer',
    description: 'A vibrant sequence of reds and oranges to start your day.',
    imageUrl: '/images/sunrise_energizer.png',
    duration: 10,
    creator: 'ChromaMind Labs',
    category: 'Energy',
    intensity: 'Intense',
    audioUrl: '/audio/uplifting-music.mp3',
    events: [ /* ... event data from previous step ... */ ],
    comments: [
      { author: 'MorningGlow', avatarUrl: '/avatars/avatar4.png', text: 'Better than a cup of coffee! The vibrant reds and oranges really wake up my mind. I feel ready to take on the day.' },
      { author: 'Apollo', avatarUrl: '/avatars/avatar1.png', text: 'The intensity is no joke. A powerful and quick way to get energized.' },
    ],
  },
};

// --- SERVICE FUNCTIONS ---
export const getSessionsForOwner = async (ownerAddress: string): Promise<Session[]> => {
  console.log(`Fetching sessions for owner: ${ownerAddress}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (!ownerAddress) return [];
  // We return the detailed object cast to the simpler Session type for the list page
  return Object.values(MOCK_SESSION_DETAILS).map(({ events, comments, ...session }) => session);
};

export const getSessionDetails = async (sessionId: string): Promise<SessionDetails | null> => {
  console.log(`Fetching details for session: ${sessionId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_SESSION_DETAILS[sessionId] || null;
};