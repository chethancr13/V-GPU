import React from 'react';

export default function StepWizard({ steps, currentStep }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
            {steps.map((step, i) => {
                const isActive = i === currentStep;
                const isPassed = i < currentStep;
                
                return (
                    <React.Fragment key={i}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 2 }}>
                            <div style={{
                                width: '30px', 
                                height: '30px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                background: isActive || isPassed ? 'var(--accent)' : 'var(--dark-gray)',
                                border: `2px solid ${isActive || isPassed ? 'var(--accent)' : 'var(--border)'}`,
                                color: isActive || isPassed ? '#000' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                boxShadow: isActive ? '0 0 15px rgba(118,185,0,0.5)' : 'none'
                            }}>
                                {i + 1}
                            </div>
                            <span style={{ 
                                fontSize: '0.75rem', 
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontWeight: isActive ? 600 : 400,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                position: 'absolute',
                                top: '40px',
                                whiteSpace: 'nowrap'
                            }}>
                                {step}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{
                                flex: 1,
                                height: '2px',
                                background: isPassed ? 'var(--accent)' : 'var(--border)',
                                marginLeft: '10px',
                                marginRight: '10px',
                                marginTop: '-20px',
                                boxShadow: isPassed ? '0 0 5px rgba(118,185,0,0.5)' : 'none'
                            }}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
