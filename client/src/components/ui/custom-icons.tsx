import React from 'react';

// Custom SVG icons that feel more emotionally connected and less "tool-ish"
export const WisdomIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3L13.09 8.26L18 9L13.09 9.74L12 15L10.91 9.74L6 9L10.91 8.26L12 3Z"
      fill="currentColor"
      fillOpacity="0.8"
    />
    <path
      d="M19 12L19.5 14L21 14.5L19.5 15L19 17L18.5 15L17 14.5L18.5 14L19 12Z"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <path
      d="M5 6L5.5 7.5L7 8L5.5 8.5L5 10L4.5 8.5L3 8L4.5 7.5L5 6Z"
      fill="currentColor"
      fillOpacity="0.4"
    />
  </svg>
);

export const JourneyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M3 12C3 7.58172 6.58172 4 11 4C13.2091 4 15.2091 4.89543 16.6569 6.34315"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M21 12C21 16.4183 17.4183 20 13 20C10.7909 20 8.79086 19.1046 7.34314 17.6569"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.6" />
    <path
      d="M17 7L15 9M15 9L17 11M15 9H19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ConnectionIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="15" cy="15" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M12 12L12.5 11.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M9 21V20C9 18.8954 9.89543 18 11 18H13C14.1046 18 15 18.8954 15 20V21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M15 3V4C15 5.10457 14.1046 6 13 6H11C9.89543 6 9 5.10457 9 4V3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const HeartPathIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.99858 7.05 2.99858C5.59096 2.99858 4.19169 3.5783 3.16 4.61C2.1283 5.6417 1.54858 7.04097 1.54858 8.5C1.54858 9.95903 2.1283 11.3583 3.16 12.39L12 21.23L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39457C21.7563 5.72703 21.351 5.12063 20.84 4.61Z"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <path
      d="M3 8.5L6 11.5L9 8.5L12 11.5L15 8.5L18 11.5L21 8.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ThoughtIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" fillOpacity="0.1" fill="currentColor" />
    <circle cx="8" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" fillOpacity="0.2" fill="currentColor" />
    <circle cx="16" cy="18" r="1.5" stroke="currentColor" strokeWidth="1.5" fillOpacity="0.3" fill="currentColor" />
    <path
      d="M10 11C10.5 11 11 10.5 11 10C11 9.5 10.5 9 10 9C9.5 9 9 9.5 9 10C9 10.5 9.5 11 10 11Z"
      fill="currentColor"
    />
    <path
      d="M14 11C14.5 11 15 10.5 15 10C15 9.5 14.5 9 14 9C13.5 9 13 9.5 13 10C13 10.5 13.5 11 14 11Z"
      fill="currentColor"
    />
  </svg>
);