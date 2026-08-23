// Import Dependencies


// Import files
import './Dashboard.css';
import { getCaregiverInfo } from '../../Context/CaregiverContext';

function Dashboard(){
    const { activeCaregiverFirstName, loading } = getCaregiverInfo();

    return(
        <div className="Dashboard">
            {/* Welcome Banner */}
            <div className="WelcomeHeader">
                <div>
                    <p>Good morning,</p>
                    <h1>{loading ? '' : `${activeCaregiverFirstName ?? 'User'}!`}</h1>
                </div>
                <div className="UserProfilePic">

                </div>
            </div>

            {/*  */}

        </div>
    );
}

export default Dashboard;
