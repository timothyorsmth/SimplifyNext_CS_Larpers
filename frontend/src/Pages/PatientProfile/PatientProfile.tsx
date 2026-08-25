// Import files
import './PatientProfile.css';

// Import context
import { getCareRecipientInfo } from '../../Context/CareRecipientContext';

function PatientProfile(){
    const { careRecipient, loading } = getCareRecipientInfo();

    const firstName = careRecipient?.recipientInfo.profile.first_name;

    return(
        <div className="PatientProfile">
            <div className="TitleBar">
                <h1>{loading ? "" : firstName}'s Health Info</h1>
            </div>
            
            
        </div>
    );
}

export default PatientProfile;