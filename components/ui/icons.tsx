/**
 * Custom SVG Icons for OptiWealth
 * ================================
 * High-quality SVG icons for consistent branding.
 * Use these instead of icon libraries for key UI elements.
 */

import React from 'react';

interface IconProps {
    className?: string;
    size?: number;
}

/**
 * OptiWealth Logo Icon - Stylized trending arrow
 */
export const LogoIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#logoGradient)" />
        <path 
            d="M12 32L20 24L26 28L36 16M36 16H28M36 16V24" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
        />
    </svg>
);

/**
 * Portfolio Icon - Briefcase with chart
 */
export const PortfolioIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M7 14L10 11L13 14L17 10" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Analytics Icon - Line chart with nodes
 */
export const AnalyticsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M3 3V21H21" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M7 16L11 11L15 14L21 7" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <circle cx="7" cy="16" r="2" fill="currentColor" />
        <circle cx="11" cy="11" r="2" fill="currentColor" />
        <circle cx="15" cy="14" r="2" fill="currentColor" />
        <circle cx="21" cy="7" r="2" fill="currentColor" />
    </svg>
);

/**
 * Shield Icon - Security/Protection
 */
export const ShieldIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M9 12L11 14L15 10" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Telegram Icon - For notification settings
 */
export const TelegramIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M22 2L11 13" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M22 2L15 22L11 13L2 9L22 2Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Rebalance Icon - Circular arrows
 */
export const RebalanceIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M21 2V8H15" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M3 22V16H9" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M19.07 16.93A8 8 0 0 0 4.93 7.07M21 8C19.5 4.5 16 2 12 2C8.68 2 5.73 3.82 4 6.5" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M3 16C4.5 19.5 8 22 12 22C15.32 22 18.27 20.18 20 17.5" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Import Icon - File with arrow
 */
export const ImportIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M14 2V8H20" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M12 18V12M12 12L9 15M12 12L15 15" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Export Icon - File with download arrow  
 */
export const ExportIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M14 2V8H20" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M12 12V18M12 18L9 15M12 18L15 15" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Success Checkmark - Animated check in circle
 */
export const SuccessIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
        <path 
            d="M8 12L11 15L16 9" 
            stroke="#22c55e" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Error Icon - X in circle
 */
export const ErrorIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
        <path 
            d="M15 9L9 15M9 9L15 15" 
            stroke="#ef4444" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Warning Icon - Triangle with exclamation
 */
export const WarningIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 19C1.55 19.36 1.64 19.7 1.82 20C2 20.3 2.26 20.56 2.56 20.74C2.86 20.92 3.2 21.01 3.55 21H20.45C20.8 21.01 21.14 20.92 21.44 20.74C21.74 20.56 22 20.3 22.18 20C22.36 19.7 22.45 19.36 22.45 19C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.27 3.32 12.97 3.15C12.67 2.98 12.34 2.89 12 2.89C11.66 2.89 11.33 2.98 11.03 3.15C10.73 3.32 10.47 3.56 10.29 3.86Z" 
            stroke="#f59e0b" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path d="M12 9V13" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1" fill="#f59e0b" />
    </svg>
);
