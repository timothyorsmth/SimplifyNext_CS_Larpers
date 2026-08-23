// Import Dependencies

// Import files
import './Dashboard.css';

import { getCaregiverInfo } from '../../Context/CaregiverContext';

function Dashboard(){
    const { activeCaregiver, loading } = getCaregiverInfo();

    const defaultProfilePic = '/Assets/profile_pic_default.jpg';
    const pictureUrl = (loading ? defaultProfilePic : activeCaregiver?.profile_picture_url) ?? defaultProfilePic;
    console.log(pictureUrl);

    const profilePictureStyle = {
        backgroundImage: `url(${pictureUrl})`,
    };
    
    return(
        <div className="Dashboard">
            {/* Welcome Banner */}
            <div className="WelcomeHeader">
                <div>
                    <p>Good morning,</p>
                    <h1>{loading ? '' : `${activeCaregiver?.profile.first_name ?? 'User'}.`}</h1>
                </div>
                <div className="ProfilePicContainer">
                    <div className="UserProfilePic" style={profilePictureStyle}></div>
                </div>
            </div>

            {/*  */}

        </div>
    );
}

export default Dashboard;
