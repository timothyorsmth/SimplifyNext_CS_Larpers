import { createContext, useContext, useState, useEffect } from 'react';
import { fetchCareRecipientData } from '../API/careCircleData'

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

// Exported so Schedule.tsx and Chat.tsx can both reference the same shape
// instead of each declaring their own copy.
export type Appointment = {
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
    // Adds a new appointment to the shared store (assigns its id). This is
    // the one write path into `appointments` — Schedule.tsx's manual "+"
    // popup and Chat.tsx's AI-approved scheduling action both go through
    // this, so neither one keeps its own separate local copy that the
    // other can't see.
    addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
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

    function addAppointment(appointment: Omit<Appointment, 'id'>) {
        setCareRecipient((prev) => {
            // No-op if the initial fetch hasn't resolved yet — there's
            // nothing to append to. Callers should generally wait for
            // `loading` to be false before allowing this to be triggered.
            if (!prev) return prev;
            const newAppointment: Appointment = {
                ...appointment,
                id: crypto.randomUUID(), // temporary client-side id; swap for server-assigned id once a real endpoint exists
            };
            return {
                ...prev,
                appointments: [...prev.appointments, newAppointment],
            };
        });
    }

    const value: CareRecipientContextValue = {
        careRecipient,
        recipientId: careRecipient?.recipientInfo.id ?? '',
        careRecipientFirstName: careRecipient?.recipientInfo.profile.first_name ?? '',
        careRecipientLastName: careRecipient?.recipientInfo.profile.last_name ?? '',
        appointments: careRecipient?.appointments ?? [], // default to [] so consumers can .map/.filter without a null check
        loading,
        addAppointment,
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