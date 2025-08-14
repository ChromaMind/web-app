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
  name: string;
  intensity: 'Mild' | 'Moderate' | 'Intense';
  audioUrl: string;
  events: { time: number; colors: number[][] }[];
  comments: SessionComment[];
}
// --- MOCK DATA ---
const MOCK_SESSION_DETAILS: { [id: string]: SessionDetails } = {
    'nft-001': {
        id: 'nft-001',
        name: 'Rave',
        description:
            'High-energy, club-style stims. ',
        imageUrl: '/images/oceanic_calm.png',
        duration: 10,
        creator: 'ChromaMind Labs',
        category: 'Relaxation',
        intensity: 'Mild',
        audioUrl: '/audios/rave.mp3',
        events: [ /* ... event data from previous step ... */ ],
        comments: [
            { author: 'ZenMaster', avatarUrl: '/avatars/avatar1.png', text: 'Pure bliss. I felt like I was floating in the ocean. Highly recommended for de-stressing after a long day.' },
            { author: 'LucidDreamer', avatarUrl: '/avatars/avatar2.png', text: 'The color transitions are so smooth. Put me in a perfect state for meditation.' },
        ],
    },
    'nft-002': {
        id: 'nft-002',
        name: 'NSDR',
        description:
            'Non-Sleep Deep Relaxation: a guided, eyes-closed (or soft gaze) reset.',
        imageUrl: '/images/forest_focus.png',
        duration: 11,
        creator: 'ChromaMind Labs',
        category: 'Focus',
        intensity: 'Moderate',
        audioUrl: '/audios/nsdr.mp3',
        events: [ /* ... event data from previous step ... */ ],
        comments: [
            { author: 'DeepWork', avatarUrl: '/avatars/avatar3.png', text: 'My go-to for deep work sessions. The amber light pulses really help me lock in and ignore distractions. A game-changer.' },
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