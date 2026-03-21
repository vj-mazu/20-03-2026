/**
 * Permission Checker Utility
 * 
 * Defines permission matrix for all roles and actions in the Sample Entry workflow.
 * Implements Manager role restriction (can only create Supervisor accounts).
 */

const ROLE_PERMISSIONS = {
  // Admin/Owner - Full access
  admin: {
    canCreate: ['sample_entry', 'quality_supervisor', 'physical_supervisor', 'inventory_staff', 'financial_account', 'manager', 'staff'],
    canRead: ['all'],
    canUpdate: ['all'],
    canDelete: ['all'],
    canApprove: ['all'],
    canTransition: ['all']
  },
  
  // Manager - Can create supervisors, allot lots, add financial calculations
  manager: {
    canCreate: ['quality_supervisor', 'physical_supervisor'], // RESTRICTED: Cannot create Owner/Admin
    canRead: ['sample_entry', 'quality_parameters', 'cooking_report', 'lot_allotment', 'physical_inspection', 'inventory_data', 'financial_calculation'],
    canUpdate: ['lot_allotment', 'financial_calculation'],
    canDelete: [],
    canApprove: ['lot_selection', 'cooking_report'],
    canTransition: ['lot_selection', 'cooking_report', 'final_report', 'manager_financial', 'final_review']
  },
  
  // Quality Supervisor - Reviews staff entries, adds quality parameters
  quality_supervisor: {
    canCreate: ['quality_parameters'],
    canRead: ['sample_entry', 'quality_parameters'],
    canUpdate: ['quality_parameters'],
    canDelete: [],
    canApprove: [],
    canTransition: ['quality_check']
  },
  
  // Physical Supervisor - Receives allotted lots, adds physical inspection
  physical_supervisor: {
    canCreate: ['physical_inspection'],
    canRead: ['sample_entry', 'lot_allotment', 'physical_inspection'],
    canUpdate: ['physical_inspection'],
    canDelete: [],
    canApprove: [],
    canTransition: ['physical_inspection']
  },
  
  // Inventory Staff - Adds weight and location data
  inventory_staff: {
    canCreate: ['inventory_data'],
    canRead: ['sample_entry', 'physical_inspection', 'inventory_data'],
    canUpdate: ['inventory_data'],
    canDelete: [],
    canApprove: [],
    canTransition: ['inventory_entry']
  },
  
  // Staff - Creates initial sample entries
  staff: {
    canCreate: ['sample_entry'],
    canRead: ['sample_entry'],
    canUpdate: ['sample_entry'], // Only their own entries
    canDelete: [],
    canApprove: [],
    canTransition: ['staff_entry']
  },
  
  // Financial Account - View-only access
  financial_account: {
    canCreate: [],
    canRead: ['sample_entry', 'quality_parameters', 'cooking_report', 'lot_allotment', 'physical_inspection', 'inventory_data', 'financial_calculation'],
    canUpdate: [],
    canDelete: [],
    canApprove: [],
    canTransition: []
  }
};

/**
 * Check if a role can perform a specific action on a resource
 */
function canPerformAction(role, action, resource) {
  const permissions = ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    return false;
  }
  
  // Admin has full access
  if (role === 'admin' && permissions[action]) {
    return permissions[action].includes('all') || permissions[action].includes(resource);
  }
  
  // Check specific permission
  if (permissions[action]) {
    return permissions[action].includes(resource);
  }
  
  return false;
}

/**
 * Check if a role can create a specific user role
 * Implements Manager restriction: can only create Supervisor accounts
 */
function canCreateUserRole(creatorRole, targetRole) {
  const permissions = ROLE_PERMISSIONS[creatorRole];
  
  if (!permissions || !permissions.canCreate) {
    return false;
  }
  
  // Admin can create any role
  if (creatorRole === 'admin') {
    return true;
  }
  
  // Manager can only create supervisor roles
  if (creatorRole === 'manager') {
    return ['quality_supervisor', 'physical_supervisor'].includes(targetRole);
  }
  
  return false;
}

/**
 * Check if a user can access a specific workflow phase
 */
function canAccessWorkflowPhase(role, workflowStatus) {
  const phaseAccess = {
    'STAFF_ENTRY': ['staff', 'admin', 'manager'],
    'QUALITY_CHECK': ['quality_supervisor', 'admin', 'manager'],
    'LOT_SELECTION': ['admin', 'manager'],
    'COOKING_REPORT': ['admin', 'manager'],
    'FINAL_REPORT': ['admin', 'manager'],
    'LOT_ALLOTMENT': ['manager', 'admin'],
    'PHYSICAL_INSPECTION': ['physical_supervisor', 'admin', 'manager'],
    'INVENTORY_ENTRY': ['inventory_staff', 'admin', 'manager'],
    'OWNER_FINANCIAL': ['admin', 'manager'],
    'MANAGER_FINANCIAL': ['manager', 'admin'],
    'FINAL_REVIEW': ['admin', 'manager'],
    'COMPLETED': ['admin', 'manager', 'financial_account'],
    'FAILED': ['admin', 'manager']
  };
  
  const allowedRoles = phaseAccess[workflowStatus];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

/**
 * Get all workflow phases accessible by a role
 */
function getAccessibleWorkflowPhases(role) {
  const phases = [
    'STAFF_ENTRY', 'QUALITY_CHECK', 'LOT_SELECTION', 'COOKING_REPORT',
    'FINAL_REPORT', 'LOT_ALLOTMENT', 'PHYSICAL_INSPECTION', 'INVENTORY_ENTRY',
    'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW', 'COMPLETED', 'FAILED'
  ];
  
  return phases.filter(phase => canAccessWorkflowPhase(role, phase));
}

module.exports = {
  ROLE_PERMISSIONS,
  canPerformAction,
  canCreateUserRole,
  canAccessWorkflowPhase,
  getAccessibleWorkflowPhases
};
