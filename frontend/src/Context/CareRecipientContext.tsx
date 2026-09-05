import { createContext, useContext, useState, useEffect } from 'react';
import { fetchCareRecipientData } from '../API/CareCircleData'

// Things to import from JSON data
type CareRecipientData = {
    recipientInfo: {
        id: string;
        profile: {
            first_name: string
            last_name: string
        }
    }
    appointments: {
        id: string,
        type: string,
        date: string | null,
        provider: string,
        location: string,
        status: string,
        notes: string | null
    }[]
}

// Values that the other files reference
type CareRecipientContextValue = {
    recipientId: string | null;
    careRecipient: CareRecipientData | null; // for dev purposes, remove for better data abstraction
    careRecipientFirstName: string | null;
    careRecipientLastName: string | null;
    appointments: CareRecipientData['appointments']; // convenience field, mirrors careRecipient.appointments
    loading: boolean;
}

// thank you claude
const CareRecipientContext = createContext<CareRecipientContextValue | null>(null);

export function CareRecipientProvider({ children }: { children: React.ReactNode }) {
    const [careRecipient, setCareRecipient] = useState<CareRecipientData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCareRecipientData().then((recipientData) => {
            setCareRecipient(recipientData ?? null);
            setLoading(false);
        });
    }, []);

    const value: CareRecipientContextValue = {
        careRecipient,
        recipientId: careRecipient?.recipientInfo.id ?? '',
        careRecipientFirstName: careRecipient?.recipientInfo.profile.first_name ?? '',
        careRecipientLastName: careRecipient?.recipientInfo.profile.last_name ?? '',
        appointments: careRecipient?.appointments ?? [], // default to [] so consumers can .map/.filter without a null check
        loading,
    };

    return (
        <CareRecipientContext.Provider value={value}>
            {children}
        </CareRecipientContext.Provider>
    );
}

export function getCareRecipientInfo() {
    const context = useContext(CareRecipientContext);
    if (!context) {
        throw new Error('getCareRecipientInfo must be used within a CareRecipientProvider');
    }
    return context;
}