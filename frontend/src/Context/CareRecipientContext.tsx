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
}

// Values that the other files reference
type CareRecipientContextValue = {
    recipientId: string | null;
    careRecipient: CareRecipientData | null; // for dev purposes, remove for better data abstraction
    careRecipientFirstName: string | null;
    careRecipientLastName: string | null;
    loading: boolean;

}

// thank you claude
const CareRecipientContext = createContext<CareRecipientContextValue | null>(null);

export function CareRecipientProvider({ children }: { children: React.ReactNode }) {
    const [careRecipient, setCareRecipient] = useState<CareRecipientData>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCareRecipientData().then((recipientData) => {
            // finish loading data
            setCareRecipient(recipientData ?? null); // set fallback
            setLoading(false);
        })
    });

    if (loading == false) {
        const careRecipientId = careRecipient?.recipientInfo.id;
        const firstName = careRecipient?.recipientInfo.profile.first_name;
        const lastName = careRecipient?.recipientInfo.profile.last_name;

        console.log(firstName);

        // set care recipient values
        const value: CareRecipientContextValue = {
            careRecipient: careRecipient ?? null,
            recipientId: careRecipientId ?? '',
            careRecipientFirstName: firstName ?? '',
            careRecipientLastName: lastName ?? '',
            loading: loading ?? false
        }

        // Return the provider 
        return (
            <CareRecipientContext.Provider value = {value}>
                { children }
            </CareRecipientContext.Provider>
        )
    }
}

export function getCareRecipientInfo() {
    const context = useContext(CareRecipientContext);
    if (!context) {
        throw new Error('getCareRecipientInfo must be used within a CareRecipientProvider');
    }
    return context;
}