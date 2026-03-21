/**
 * Centralized API configuration
 * Works with both CRA (process.env.REACT_APP_*) and Vite (import.meta.env.VITE_*)
 */

// Support both Vite and CRA env variable patterns
const getApiUrl = (): string => {
    // Vite environment
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // CRA environment fallback
    if (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    // Default
    return 'http://localhost:5000/api';
};

export const API_URL = getApiUrl();
export default API_URL;
