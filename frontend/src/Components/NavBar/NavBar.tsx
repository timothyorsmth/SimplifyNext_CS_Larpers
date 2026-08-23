import { NavLink } from "react-router-dom";

// icons
import { BsHouse , BsFillHouseFill  } from "react-icons/bs";
import { FaRegCalendarAlt, FaCalendarAlt } from "react-icons/fa";
import { IoCheckboxOutline, IoCheckbox  } from "react-icons/io5";
import { BsFileEarmarkPerson, BsFillFileEarmarkPersonFill  } from "react-icons/bs";
import { BsChatLeftDots, BsChatLeftDotsFill  } from "react-icons/bs";

import './NavBar.css';

// The list of navigation bar items that is on the left of the chat icon
const NAV_ITEMS_LEFT = [
  { to: '/', label: 'Home', icon: BsHouse, activeIcon: BsFillHouseFill },
  { to: '/schedule', label: 'Schedule', icon: FaRegCalendarAlt, activeIcon: FaCalendarAlt },
];

// Same as above but on the right
const NAV_ITEMS_RIGHT = [
  { to: '/tasks', label: 'Tasks', icon: IoCheckboxOutline, activeIcon: IoCheckbox },
  { to: '/recipient', label: 'Recipient', icon: BsFileEarmarkPerson, activeIcon: BsFillFileEarmarkPersonFill },
];


function NavBar() {
  return (
    <div className="navPanel">
        {NAV_ITEMS_LEFT.map(({ to, label, icon: Icon, activeIcon: ActiveIcon }) => (
            <NavLink
                key={to}
                to={to}
            className={({ isActive }) =>
                // Checks if is active, if active then we put the correct class tag
                isActive ? 'PanelItem active' : 'PanelItem nonactive'
            }
            >
            {({ isActive }) => (
                // Swap icon component based on the SAME isActive flag —
                // no separate state needed, it's derived straight from the URL.
                <>
                {isActive ? <ActiveIcon size="1.25rem" /> : <Icon size="1.25rem" />}
                <p>{label}</p>
                </>
            )}
            </NavLink>
        ))}

        <div className = "ChatContainer">
            <NavLink to="/chat" className={({ isActive }) => (isActive ? 'ChatButton active' : 'ChatButton nonactive')}>
            {({ isActive }) =>
                isActive ? <BsChatLeftDotsFill size="1.75rem" /> : <BsChatLeftDots size="1.75rem" />
            }
            </NavLink>
        </div>
        

        {NAV_ITEMS_RIGHT.map(({ to, label, icon: Icon, activeIcon: ActiveIcon }) => (
             <NavLink
                key={to}
                to={to}
                // NavLink calls this function itself, passing { isActive } —
                // we use it to conditionally add an "active" class for styling.
                className={({ isActive }) =>
                    isActive ? 'PanelItem active' : 'PanelItem nonactive'
                }
                >
                {({ isActive }) => (
                    // Swap icon component based on the SAME isActive flag —
                    // no separate state needed, it's derived straight from the URL.
                    <>
                    {isActive ? <ActiveIcon size="1.25rem" /> : <Icon size="1.25rem" />}
                    <p>{label}</p>
                    </>
                )}
            </NavLink>
        ))}
    </div>
  );
}

export default NavBar;