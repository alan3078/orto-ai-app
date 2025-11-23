import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { getRosterByIdAction } from '@/app/actions/generate-roster.action'
import { ValidationModal } from '@/features/dashboard/components/validation-modal'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export default async function RosterDetailPage({ params }: { params: { id: string } }) {
  const result = await getRosterByIdAction(params.id)

  if (!result.success || !result.roster) {
    return (
      <div className="container mx-auto py-10 max-w-4xl">
        <div className="mb-8">
          <Link href="/test-roster" className="text-sm text-blue-600 hover:underline">
            ← Back to Rosters
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Error: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { roster } = result
  const timeSlots = roster.timeSlots || 7

  // Group shifts by staff
  const shiftsByStaff = roster.shifts.reduce((acc, shift) => {
    const staffName = shift.staff.name
    if (!acc[staffName]) {
      acc[staffName] = {
        staff: shift.staff,
        shifts: [],
      }
    }
    acc[staffName].shifts.push(shift)
    return acc
  }, {} as Record<string, { staff: any; shifts: any[] }>)

  // Sort shifts by timeSlot
  Object.values(shiftsByStaff).forEach((item) => {
    item.shifts.sort((a, b) => a.timeSlot - b.timeSlot)
  })

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="mb-8">
        <Link href="/test-roster" className="text-sm text-blue-600 hover:underline">
          ← Back to Rosters
        </Link>
      </div>

      {/* Roster Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{roster.name}</CardTitle>
              <CardDescription>
                {new Date(roster.startDate).toLocaleDateString()} - {' '}
                {new Date(roster.endDate).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {roster.status === 'COMPLETED' && (
                <ValidationModal rosterId={roster.id}>
                  <Button variant="outline" size="sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate Roster
                  </Button>
                </ValidationModal>
              )}
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  roster.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-800'
                    : roster.status === 'SOLVING'
                    ? 'bg-blue-100 text-blue-800'
                    : roster.status === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : roster.status === 'INFEASIBLE'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {roster.status}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total Shifts</p>
              <p className="text-2xl font-bold">{roster.shifts.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Time Slots</p>
              <p className="text-2xl font-bold">{timeSlots} days</p>
            </div>
            <div>
              <p className="text-gray-500">Staff Members</p>
              <p className="text-2xl font-bold">{Object.keys(shiftsByStaff).length}</p>
            </div>
          </div>

          {roster.solveTimeMs && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Solved in <span className="font-semibold">{roster.solveTimeMs.toFixed(0)}ms</span>
                {roster.solverStatus && ` (${roster.solverStatus})`}
              </p>
            </div>
          )}

          {roster.errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{roster.errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      {roster.shifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Weekly shift assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Staff</th>
                    {Array.from({ length: timeSlots }, (_, i) => (
                      <th key={i} className="text-center p-3 font-medium min-w-[60px]">
                        Day {i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(shiftsByStaff).map(([staffName, data]) => (
                    <tr key={staffName} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{staffName}</td>
                      {data.shifts.map((shift) => (
                        <td key={shift.timeSlot} className="text-center p-3">
                          {shift.state === 1 ? (
                            <span className="inline-block w-8 h-8 bg-green-500 rounded-full text-white text-xl leading-8">
                              ✓
                            </span>
                          ) : shift.state === 0 ? (
                            <span className="inline-block w-8 h-8 bg-gray-200 rounded-full text-gray-500 text-xl leading-8">
                              ✕
                            </span>
                          ) : (
                            <span className="inline-block w-8 h-8 bg-blue-500 rounded-full text-white text-xl leading-8">
                              {shift.state}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-block w-6 h-6 bg-green-500 rounded-full"></span>
                <span>Working (1)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-6 h-6 bg-gray-200 rounded-full"></span>
                <span>Off (0)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Constraints Applied */}
      {roster.constraints && roster.constraints.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Constraints Applied</CardTitle>
            <CardDescription>Rules used to generate this schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roster.constraints.map((constraint) => (
                <div key={constraint.id} className="p-3 border rounded-lg">
                  <h4 className="font-medium">{constraint.name}</h4>
                  {constraint.description && (
                    <p className="text-sm text-gray-600 mt-1">{constraint.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">Type: {constraint.type}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Priority: {constraint.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
