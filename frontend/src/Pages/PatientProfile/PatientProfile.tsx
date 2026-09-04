// Import files
import './PatientProfile.css';

// Import context
import { getCareRecipientInfo } from '../../Context/CareRecipientContext';

import { CiExport } from "react-icons/ci";

function PatientProfile(){
    const { careRecipient, loading } = getCareRecipientInfo();

    const firstName = careRecipient?.recipientInfo.profile.first_name;
    const lastName = careRecipient?.recipientInfo.profile.last_name;

    // TODO: format the page to include more information
    // Refer to CareRecipientContext to add more info
    
    return(
        <div className="PatientProfile">
            <div className="TitleBar">
                <h1>{loading ? "" : firstName}'s Health Info</h1>
                <button className="ExportInfo">
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
                    <p className='dataField'>F</p>
                </div>
                <div>
                    <p className='attribute'>DOB</p>
                    <p className='dataField'>12/03/1948</p>
                </div>
            </div>
            
        </div>
    );
}

export default PatientProfile;