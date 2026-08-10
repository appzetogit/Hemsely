import React from 'react';
import { useNavigate } from 'react-router-dom';

// Icons
import profileIcon from '../assets/icons/profile.png';
import coupleIcon from '../assets/icons/couple.png';
import heartIcon from '../assets/icons/heart.png';
import messageIcon from '../assets/icons/message.png';

const NavItem = ({ name, icon, isActive, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label={name}
        className="flex flex-col items-center justify-center space-y-0.5 cursor-pointer w-14 h-11 bg-transparent border-0 outline-none focus:outline-none"
    >
        <img
            src={icon}
            alt=""
            className={`object-contain transition-all duration-200 ${isActive
                ? 'w-6 h-6 opacity-100 grayscale-0 scale-105'
                : 'w-5 h-5 opacity-40 grayscale hover:opacity-70'
                }`}
        />
        <span className={`text-[10.5px] font-bold tracking-wide transition-colors duration-200 ${isActive ? 'text-[#733FE0]' : 'text-gray-400'
            }`}>
            {name}
        </span>
    </button>
);

const BottomNavigation = ({ activeTab = 'people' }) => {
    const navigate = useNavigate();

    return (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white pt-3 pb-9 px-6 border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] flex justify-between items-center z-50">
            <NavItem
                name="People"
                icon={coupleIcon}
                isActive={activeTab === 'people'}
                onClick={() => navigate('/discovery')}
            />
            <NavItem
                name="Likes"
                icon={heartIcon}
                isActive={activeTab === 'likes'}
                onClick={() => navigate('/likes')}
            />
            <NavItem
                name="Chats"
                icon={messageIcon}
                isActive={activeTab === 'chats'}
                onClick={() => navigate('/chats')}
            />
            <NavItem
                name="Profile"
                icon={profileIcon}
                isActive={activeTab === 'profile'}
                onClick={() => navigate('/profile')}
            />
        </nav>
    );
};

export default BottomNavigation;
