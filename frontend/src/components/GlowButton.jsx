import React from 'react';

export default function GlowButton({ children, onClick, disabled, variant = 'primary', style = {}, ...props }) {
    const isPrimary = variant === 'primary';
    
    return (
        <button 
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={{
                background: isPrimary ? 'var(--accent)' : 'var(--dark-gray)',
                border: isPrimary ? '1px solid var(--accent)' : '1px solid var(--border)',
                color: isPrimary ? '#000000' : 'var(--text-primary)',
                padding: '0.75rem 1.5rem',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isPrimary && !disabled ? '0 0 15px rgba(118, 185, 0, 0.3)' : 'none',
                opacity: disabled ? 0.5 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                ...style
            }}
            onMouseOver={(e) => {
                if(!disabled && isPrimary) e.currentTarget.style.boxShadow = '0 0 25px rgba(118, 185, 0, 0.6)';
                if(!disabled && !isPrimary) e.currentTarget.style.background = 'var(--gray)';
            }}
            onMouseOut={(e) => {
                if(!disabled && isPrimary) e.currentTarget.style.boxShadow = '0 0 15px rgba(118, 185, 0, 0.3)';
                if(!disabled && !isPrimary) e.currentTarget.style.background = 'var(--dark-gray)';
            }}
            {...props}
        >
            {children}
        </button>
    );
}
