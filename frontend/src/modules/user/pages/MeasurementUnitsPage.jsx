import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UnitToggle = ({ label, option1, option2, current, onChange }) => (
    <div className="mb-4">
        <div style={{
            width: '385px',
            maxWidth: '92vw',
            height: '62.06px',
            background: '#FFFFFF',
            borderRadius: '14px',
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.04)',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px'
        }}>
            <span style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: '16px',
                color: '#000'
            }}>
                {label}
            </span>

            <button
                type="button"
                aria-label={`Toggle ${label} unit`}
                onClick={() => onChange(current === option1 ? option2 : option1)}
                style={{
                    width: '72px',
                    height: '36.92px',
                    background: '#E9E9E9',
                    borderRadius: '13.2px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    cursor: 'pointer',
                    border: 'none',
                    outline: 'none'
                }}
            >
                {/* Sliding Thumb */}
                <div style={{
                    position: 'absolute',
                    width: '33px',
                    height: '27.69px',
                    background: '#FCFCFC',
                    borderRadius: '10px',
                    left: current === option1 ? '5px' : '34px',
                    transition: 'left 0.3s ease',
                    zIndex: 1
                }} />

                <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: '12px',
                    color: '#000',
                    opacity: current === option1 ? 1 : 0.4,
                    zIndex: 2,
                    width: '26px',
                    textAlign: 'center'
                }}>
                    {option1}
                </span>
                <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: '12px',
                    color: '#000',
                    opacity: current === option2 ? 1 : 0.4,
                    zIndex: 2,
                    width: '26px',
                    textAlign: 'center'
                }}>
                    {option2}
                </span>
            </button>
        </div>
    </div>
);

const MeasurementUnitsPage = () => {
    const navigate = useNavigate();
    const [distanceUnit, setDistanceUnit] = useState('KM'); // 'KM' or 'MI'
    const [heightUnit, setHeightUnit] = useState('FT'); // 'CM' or 'FT'

    return (
        <div className="h-screen bg-[#FCFCFC] flex flex-col max-w-[414px] mx-auto overflow-hidden relative">
            {/* Header */}
            <header style={{
                height: '70.88px',
                background: '#FCFCFC',
                boxShadow: '-2px 3px 4.9px rgba(0, 0, 0, 0.05)',
                borderRadius: '0px 0px 15px 15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 20px',
                zIndex: 10,
                flexShrink: 0
            }}>
                <h1 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '18px',
                    textAlign: 'center',
                    color: '#000',
                    opacity: 0.9
                }}>
                    Unit of measurement
                </h1>
            </header>

            <main className="flex-1 pt-8">
                <UnitToggle
                    label="Distance"
                    option1="MI"
                    option2="KM"
                    current={distanceUnit}
                    onChange={setDistanceUnit}
                />
                <UnitToggle
                    label="Height"
                    option1="FT"
                    option2="CM"
                    current={heightUnit}
                    onChange={setHeightUnit}
                />
            </main>

            {/* Floating Done Button */}
            <button
                type="button"
                aria-label="Done"
                onClick={() => navigate(-1)}
                style={{
                    position: 'absolute',
                    width: '50px',
                    height: '50px',
                    right: '25px',
                    bottom: '40px',
                    background: '#6F3BCE',
                    boxShadow: '2px 3px 3.9px rgba(111, 59, 206, 0.18)',
                    borderRadius: '27px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        </div>
    );
};

export default MeasurementUnitsPage;
