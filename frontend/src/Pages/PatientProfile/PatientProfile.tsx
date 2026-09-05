// Import files
import './PatientProfile.css';

// Import context
import { useCareRecipientInfo } from '../../Context/CareRecipientContext';
import type { CareRecipientData } from '../../Context/CareRecipientContext';

import { CiExport } from "react-icons/ci";

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString('en-SG', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-SG', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function handleExport(careRecipient: CareRecipientData, firstName?: string) {
    const dataStr = JSON.stringify(careRecipient, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const safeName = (firstName ?? 'patient').replace(/\s+/g, '_').toLowerCase();
    link.download = `${safeName}_health_info_${new Date().toISOString().split('T')[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function PatientProfile(){
    const { careRecipient, loading } = useCareRecipientInfo();

    const profile = careRecipient?.recipientInfo?.profile;
    const recipientInfo = careRecipient?.recipientInfo;
    const medicalHistory = careRecipient?.medicalHistory ?? [];
    const medications = careRecipient?.medications ?? [];
    const appointments = careRecipient?.appointments ?? [];

    const firstName = profile?.first_name;
    const lastName = profile?.last_name;

    if (loading) {
        return (
            <div className="PatientProfile">
                <p>Loading...</p>
            </div>
        );
    }

    return(
        <div className="PatientProfile">
            <div className="TitleBar">
                <h1>{firstName}'s Health Info</h1>
                <button
                    className="ExportInfo"
                    onClick={() => careRecipient && handleExport(careRecipient, firstName)}
                    disabled={!careRecipient}
                >
                    <CiExport size="1.25rem" />
                </button>
            </div>

            <h3 className="heading">Personal Info</h3>
            <div className="InfoBox PersonalInfo">
                <div>
                    <p className='attribute'>Full Name</p>
                    <p className='dataField'>{firstName} {lastName}</p>
                </div>
                <div>
                    <p className='attribute'>Sex</p>
                    <p className='dataField'>{recipientInfo?.sex ?? "—"}</p>
                </div>
                <div>
                    <p className='attribute'>DOB</p>
                    <p className='dataField'>{formatDate(recipientInfo?.dateOfBirth ?? null)}</p>
                </div>
                <div>
                    <p className='attribute'>Blood Type</p>
                    <p className='dataField'>{recipientInfo?.bloodType ?? "—"}</p>
                </div>
                <div>
                    <p className='attribute'>Allergies</p>
                    <p className='dataField'>
                        {recipientInfo?.allergies?.length ? recipientInfo.allergies.join(', ') : "None known"}
                    </p>
                </div>
                <div>
                    <p className='attribute'>Primary Physician</p>
                    <p className='dataField'>{recipientInfo?.primaryPhysician ?? "—"}</p>
                </div>
            </div>

            <h3 className="heading">Medical History</h3>
            <div className="InfoBox MedicalHistory">
                {medicalHistory.length === 0 && <p className="dataField">No conditions on record.</p>}
                {medicalHistory.map((entry) => (
                    <div key={entry.id} className="HistoryEntry">
                        <div className="HistoryHeader">
                            <p className='dataField conditionName'>{entry.condition}</p>
                            <span className={`statusBadge status-${entry.status}`}>{entry.status}</span>
                        </div>
                        <p className='attribute'>Diagnosed {formatDate(entry.diagnosedDate)}</p>
                        {entry.notes && <p className='notes'>{entry.notes}</p>}
                    </div>
                ))}
            </div>

            <h3 className="heading">Medications</h3>
            <div className="InfoBox Medications">
                {medications.length === 0 && <p className="dataField">No medications on record.</p>}
                {medications.map((med) => (
                    <div key={med.id} className="MedicationEntry">
                        <div className="HistoryHeader">
                            <p className='dataField'>{med.name} ({med.dosage})</p>
                            <span className={`statusBadge status-${med.status}`}>{med.status}</span>
                        </div>
                        <p className='attribute'>{med.frequency}</p>
                        <p className='attribute'>
                            {formatDate(med.startDate)} – {med.endDate ? formatDate(med.endDate) : "Ongoing"}
                        </p>
                    </div>
                ))}
            </div>

            <h3 className="heading">Appointments</h3>
            <div className="InfoBox Appointments">
                {appointments.length === 0 && <p className="dataField">No appointments on record.</p>}
                {appointments.map((appt) => (
                    <div key={appt.id} className="AppointmentEntry">
                        <div className="HistoryHeader">
                            <p className='dataField'>{appt.type}</p>
                            <span className={`statusBadge status-${appt.status}`}>{appt.status}</span>
                        </div>
                        <p className='attribute'>{formatDateTime(appt.date)} — {appt.provider}</p>
                        {appt.notes && <p className='notes'>{appt.notes}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PatientProfile;