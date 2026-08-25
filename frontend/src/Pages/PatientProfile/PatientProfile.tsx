// Import files
import './PatientProfile.css';

// Import context
import { getCareRecipientInfo } from '../../Context/CareRecipientContext';

function PatientProfile(){
    const { careRecipient, loading } = getCareRecipientInfo();

    const firstName = careRecipient?.recipientInfo.profile.first_name;
    console.log(loading + " " + firstName);

    return(
        <div className="PatientProfile">
            <p>patient is {loading ? "no name": firstName}</p>
        </div>
    );
}

export default PatientProfile;