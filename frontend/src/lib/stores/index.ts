// Zustand stores
// Examples: authStore, uiStore, etc.

export { useAuthStore, initializeAuth, type User } from './authStore';

// Authentication Context (DI wrapper for auth store)
export { useAuth, AuthProvider } from '../auth/AuthContext';
