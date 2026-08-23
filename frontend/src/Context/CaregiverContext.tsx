import { createContext, useContext, useState, useEffect } from 'react';
import { fetchUserData } from '../API/careCircleData.tsx';

type CaregiverData = {
  id: string;
  recipientId: string;
  profile: {
    first_name: string;
    last_name: string;
  };
};

type CaregiverContextValue = {
  caregivers: CaregiverData[];
  activeCaregiverId: string | null;
  activeCaregiver: CaregiverData | null;
  setActiveCaregiverId: React.Dispatch<React.SetStateAction<string | null>>;
  activeCaregiverFirstName: string | null;
  activeCaregiverLastName: string | null;
  recipientId: string | null;
  loading: boolean;
};

const CaregiverContext = createContext<CaregiverContextValue | null>(null);

export function CaregiverProvider({ children }: { children: React.ReactNode }) {
    // Not supposed to be in the full application if we do scale this
    // But for the demo since we only have 2 users, we can like lowkirkenuinely cheat this
    const [caregivers, setCaregivers] = useState<CaregiverData[]>([]);
    const [activeCaregiverId, setActiveCaregiverId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserData().then((users) => {
            setCaregivers(users);
            setActiveCaregiverId(users[0]?.id ?? null); // default to first user
            setLoading(false);
            console.log(users);
        });
    }, []);

  // Derive the active user by finding the match in `caregivers`, using
  // `activeCaregiverId` as the source of truth. This is the key fix —
  // whenever activeCaregiverId changes (e.g. via a switcher), this
  // recalculates automatically on the next render. No separate state
  // to fall out of sync.
  const activeCaregiver = caregivers.find((u) => u.id === activeCaregiverId) ?? null;

  const activeCaregiverFirstName = activeCaregiver?.profile.first_name ?? null;
  const activeCaregiverLastName = activeCaregiver?.profile.last_name ?? null;

  const value: CaregiverContextValue = {
    caregivers,
    activeCaregiverId,
    activeCaregiver,
    setActiveCaregiverId,
    activeCaregiverFirstName,
    activeCaregiverLastName,
    recipientId: activeCaregiver?.recipientId ?? null,
    loading,
  };

  return (
    <CaregiverContext.Provider value={value}>
      {children}
    </CaregiverContext.Provider>
  );
}

export function useCaregiver() {
  const context = useContext(CaregiverContext);
  if (!context) {
    throw new Error('useCaregiver must be used within a CaregiverProvider');
  }
  return context;
}