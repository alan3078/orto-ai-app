import { StaffList } from '@/features/dashboard/components/staff-list';

export default function StaffPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Staff</h1>
        <p className='text-muted-foreground'>Manage your staff members</p>
      </div>
      <StaffList />
    </div>
  );
}
