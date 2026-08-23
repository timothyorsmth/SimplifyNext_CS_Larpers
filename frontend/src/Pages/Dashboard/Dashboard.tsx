// Import Dependencies


// Import files
import './Dashboard.css';
import { useCaregiver } from '../../Context/CaregiverContext';

function Dashboard(){
    const { activeCaregiverFirstName, loading } = useCaregiver();

    return(
        <>
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

        </>
    );
}

export default Dashboard;
