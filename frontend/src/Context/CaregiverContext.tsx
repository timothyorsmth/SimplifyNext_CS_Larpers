import { createContext, useContext, useState, useEffect } from 'react';
import { fetchUserData } from '../API/careCircleData.tsx';

type CaregiverData = {
  id: string;
  recipientId: string;
  profile: {
    first_name: string;
    last_name: string;
  };
  profile_picture_url: string;
};

type CaregiverContextValue = {
  recipientId: string | null;
  caregivers: CaregiverData[];
  activeCaregiverId: string | null;
  activeCaregiver: CaregiverData | null;
  setActiveCaregiverId: React.Dispatch<React.SetStateAction<string | null>>;
  activeCaregiverFirstName: string | null;
  activeCaregiverLastName: string | null;
  activeCaregiverPFPUrl: string | null;
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
        });
    }, []);
    
    // Run if loading is done already
    if (loading == false) {
        const activeCaregiver = caregivers.find((u) => u.id === activeCaregiverId) ?? null;
        console.log('activeCaregiverId:', activeCaregiverId, 'activeCaregiver:', activeCaregiver);

        const activeCaregiverFirstName = activeCaregiver?.profile.first_name ?? null;
        const activeCaregiverLastName = activeCaregiver?.profile.last_name ?? null;
        const activeCaregiverPFPUrl = activeCaregiver?.profile_picture_url ?? null;

        console.log(activeCaregiverFirstName);

        const value: CaregiverContextValue = {
            caregivers,
            activeCaregiverId,
            activeCaregiver,
            setActiveCaregiverId,
            activeCaregiverFirstName,
            activeCaregiverLastName,
            activeCaregiverPFPUrl,
            recipientId: activeCaregiver?.recipientId ?? null,
            loading,
        };

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
    throw new Error('useCaregiver must be used within a CaregiverProvider');
  }
  return context;
}