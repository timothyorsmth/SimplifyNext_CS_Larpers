import { createContext, useContext, useState, useEffect } from 'react';
import { fetchUserData } from '../API/CareCircleData';

// What we import from the JSON file
// MUST MATCH JSON DATA
type CaregiverData = {
  id: string;
  recipientId: string;
  profile: {
    first_name: string;
    last_name: string;
  };
  profile_picture_url: string;
};

// What the other files reference
type CaregiverContextValue = {
  activeCaregiverId: string | null;
  activeCaregiver: CaregiverData | null; // for dev purposes only, remove for better data abstraction
  activeCaregiverFirstName: string | null;
  activeCaregiverLastName: string | null;
  activeCaregiverPFPUrl: string | null;
  recipientId: string | null;
  loading: boolean;
};

// Hardcoded for demo purposes — swap this to real auth/session logic later
const CURRENT_USER_ID = "user_00001";

// A context is a way to pass information to different files
// Priyanka lmk if this is like the correct way to use this because im legit dont knows
const CaregiverContext = createContext<CaregiverContextValue | null>(null);

// 
export function CaregiverProvider({ children }: { children: React.ReactNode }) {
  // Not supposed to be in the full application if we do scale this
  // But for the demo since we only have 2 users, we can like lowkirkenuinely cheat this
  const [currentCaregiver, setCurrentCaregiver] = useState<CaregiverData>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      fetchUserData().then((users: CaregiverData[]) => {
      const matched = users.find((u) => u.id === CURRENT_USER_ID);
      // Falls back to the first user if the hardcoded id doesn't match anything,
      // so a typo'd id doesn't silently break the whole app during the demo
      setCurrentCaregiver(matched ?? users[0] ?? null);
      setLoading(false);
    });
  }, []);
  
  // Run ONLY if loading is done
  if (loading == false) {
    const firstName = currentCaregiver?.profile.first_name ?? null;
    const lastName = currentCaregiver?.profile.last_name ?? null;
    const activeCaregiverPFPUrl = currentCaregiver?.profile_picture_url ?? null;
    const activeCaregiverId = currentCaregiver?.id ?? null;


    // Set current user values :)
    const value: CaregiverContextValue = {
      activeCaregiverId: activeCaregiverId ?? null,
      activeCaregiver: currentCaregiver ?? null,
      activeCaregiverFirstName: firstName ?? "",
      activeCaregiverLastName: lastName ?? "",
      activeCaregiverPFPUrl,
      recipientId: currentCaregiver?.recipientId ?? null,
      loading,
    };

    // Return the providers
    // Don't actually know what this does  ¯\_(ツ)_/¯
    return (
        <CaregiverContext.Provider value={value}>
        {children}
        </CaregiverContext.Provider>
    );
  }
}

export function getCaregiverInfo() {
  const context = useContext(CaregiverContext);
  if (!context) {
    throw new Error('getCaregiverInfo must be used within a CaregiverProvider');
  }
  return context;
}