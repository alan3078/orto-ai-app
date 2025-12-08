/**
 * Leave type and status configuration constants
 * Used for display in UI components
 */

export type LeaveType = 'SL' | 'PH' | 'AL' | 'UL' | 'ML' | 'CL';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Leave type display configuration
export const LEAVE_TYPE_CONFIG: Record<LeaveType, { label: string; abbr: string; color: string }> =
  {
    SL: {
      label: 'Sick Leave',
      abbr: 'SL',
      color: 'bg-red-100 text-red-700 border-red-200',
    },
    PH: {
      label: 'Public Holiday',
      abbr: 'PH',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    AL: {
      label: 'Annual Leave',
      abbr: 'AL',
      color: 'bg-green-100 text-green-700 border-green-200',
    },
    UL: {
      label: 'Unpaid Leave',
      abbr: 'UL',
      color: 'bg-gray-100 text-gray-700 border-gray-200',
    },
    ML: {
      label: 'Maternity Leave',
      abbr: 'ML',
      color: 'bg-pink-100 text-pink-700 border-pink-200',
    },
    CL: {
      label: 'Compassionate Leave',
      abbr: 'CL',
      color: 'bg-purple-100 text-purple-700 border-purple-200',
    },
  };

// Leave status display configuration
export const LEAVE_STATUS_CONFIG: Record<LeaveStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

// Leave record type for UI components
export interface LeaveRecord {
  id: string;
  staffId: string;
  startDate: Date | string;
  endDate: Date | string;
  leaveType: string;
  status: string;
  notes: string | null;
  staff?: {
    id?: string;
    visibleId?: string;
    user?: {
      name?: string;
      email?: string | null;
    } | null;
  } | null;
}

// Public holiday type
export interface PublicHoliday {
  id: string;
  date: Date | string;
  name: string;
  year: number;
  isRecurring: boolean;
}
