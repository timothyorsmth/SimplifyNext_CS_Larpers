import { createContext, useContext, useState, useEffect } from 'react';
import { fetchCareRecipientData } from '../API/CareCircleData'

// Things to import from JSON data
type MedicalHistoryEntry = {
    id: string;
    condition: string;
    diagnosedDate: string;
    status: string;
    notes: string | null;
};

type Medication = {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate: string | null;
    status: string;
    prescribedFor: string | null;
};

type Appointment = {
    id: string,
    type: string,
    date: string | null,
    provider: string,
    location: string,
    status: string,
    notes: string | null
};

export type CareRecipientData = {
    recipientInfo: {
        id: string;
        profile: {
            first_name: string;
            last_name: string;
        };
        dateOfBirth: string;
        sex: string;
        bloodType: string;
        allergies: string[];
        primaryPhysician: string;
    };
    medicalHistory: MedicalHistoryEntry[];
    medications: Medication[];
    appointments: Appointment[];
};

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

export function useCareRecipientInfo() {
    const context = useContext(CareRecipientContext);
    if (!context) {
        throw new Error('useCareRecipientInfo must be used within a CareRecipientProvider');
    }
    return context;
}