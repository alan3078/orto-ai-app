/**
 * Application route constants
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  
  // Admin routes
  ADMIN: {
    HOME: '/admin/home',
    STAFF: '/admin/staff',
    STAFF_GROUPS: '/admin/staff-groups',
    ROSTER_MANAGEMENT: '/admin/roster-management',
    CONFIG: '/admin/config',
    PROFILE: '/admin/profile',
  },
  
  // Auth routes
  AUTH: {
    LOGIN: '/admin/home', // TODO: Replace with actual login page when auth is implemented
    LOGOUT: '/',
  },
  
  // Landing page sections (anchor links)
  SECTIONS: {
    FEATURES: '#features',
    TESTIMONIALS: '#testimonials',
    PRICING: '#pricing',
    CONTACT: '#contact',
  },
} as const

// Type helper for route values
export type Route = 
  | typeof ROUTES.HOME
  | typeof ROUTES.ADMIN[keyof typeof ROUTES.ADMIN]
  | typeof ROUTES.AUTH[keyof typeof ROUTES.AUTH]
  | typeof ROUTES.SECTIONS[keyof typeof ROUTES.SECTIONS]
