import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { generateRosterAction, getRostersAction } from '@/app/actions/generate-roster.action'

export default async function TestRosterPage() {
  // Fetch existing rosters
  const rostersResult = await getRostersAction()

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Test Roster Generation</h1>

      {/* Generate Roster Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Generate New Roster</CardTitle>
          <CardDescription>
            This will fetch all active staff and constraints from the database,
            call the Python solver engine, and generate a weekly schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={generateRosterAction} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Roster Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={`Week of ${new Date().toISOString().split('T')[0]}`}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                defaultValue="2025-01-20"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label htmlFor="timeSlots" className="block text-sm font-medium mb-2">
                Number of Days
              </label>
              <input
                type="number"
                id="timeSlots"
                name="timeSlots"
                defaultValue="7"
                min="1"
                max="31"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              Generate Schedule
            </Button>
          </form>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Prerequisites:</strong>
            </p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
              <li>Python solver engine must be running on http://localhost:8000</li>
              <li>Database must be seeded with staff and constraints</li>
            </ul>
            <p className="text-xs text-yellow-600 mt-2">
              Run: <code className="bg-yellow-100 px-1 py-0.5 rounded">cd engine && uv run uvicorn src.main:app --reload</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Rosters */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Rosters</CardTitle>
          <CardDescription>Previously generated schedules</CardDescription>
        </CardHeader>
        <CardContent>
          {rostersResult.success && rostersResult.rosters ? (
            rostersResult.rosters.length > 0 ? (
              <div className="space-y-3">
                {rostersResult.rosters.map((roster) => (
                  <Link
                    key={roster.id}
                    href={`/test-roster/${roster.id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{roster.name}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(roster.startDate).toLocaleDateString()} - {' '}
                          {new Date(roster.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {roster._count.shifts} shifts
                        </p>
                      </div>
                      <div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No rosters generated yet. Create one above!
              </p>
            )
          ) : (
            <p className="text-red-500">Error loading rosters: {rostersResult.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
