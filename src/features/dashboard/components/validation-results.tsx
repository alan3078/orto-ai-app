'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, XCircle, Loader2, CheckCircle, Calendar, Users } from 'lucide-react'
import { validateRosterAction } from '@/app/actions/validate-roster.action'
import type { ValidateResponse, ConstraintValidationResult, VerticalSummary, HorizontalSummary } from '@/lib/validations/validator'

interface ValidationResultsProps {
  rosterId: string
}

/**
 * ValidationResults Component
 * Part of FN/BE/ENG/002 - Roster Validator (Audit Mode)
 * 
 * Displays validation results inline below the roster grid.
 */
export function ValidationResults({ rosterId }: ValidationResultsProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [result, setResult] = useState<ValidateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleValidate = async () => {
    setIsValidating(true)
    setError(null)

    const response = await validateRosterAction(rosterId)

    setIsValidating(false)

    if (response.success && response.data) {
      setResult(response.data)
    } else {
      setError(response.error || 'Validation failed')
    }
  }

  // Show validate button if no results yet
  if (!result && !isValidating && !error) {
    return (
      <div className="flex justify-center">
        <Button 
          onClick={handleValidate}
          size="lg"
          variant="outline"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Validate Roster
        </Button>
      </div>
    )
  }

  if (isValidating) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Running validation...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
            <Button onClick={handleValidate} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return null
  }

  const summary = result.summary

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.overall_status === 'PASS' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span>Validation Status: {result.overall_status}</span>
            </div>
            <Button 
              onClick={handleValidate} 
              variant="outline"
              size="sm"
            >
              Re-validate
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{result.total_constraints}</div>
              <div className="text-sm text-muted-foreground">Total Constraints</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.passed_constraints}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{result.failed_constraints}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            {result.validation_time_ms && (
              <div className="text-center">
                <div className="text-2xl font-bold">{result.validation_time_ms.toFixed(2)}ms</div>
                <div className="text-sm text-muted-foreground">Validation Time</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content: Summary & Constraints */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily Summary
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Summary
          </TabsTrigger>
          <TabsTrigger value="constraints">
            Constraint Details
          </TabsTrigger>
        </TabsList>

        {/* Daily Summary Tab (Vertical) */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Shift Summary</CardTitle>
              <CardDescription>Number of staff assigned to each shift type per day</CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.vertical_summary && summary.vertical_summary.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Day</TableHead>
                        {Object.keys(summary.vertical_summary[0]?.counts || {}).map((state) => (
                          <TableHead key={state} className="text-center min-w-[80px]">
                            {state}
                          </TableHead>
                        ))}
                        <TableHead className="text-center min-w-[60px] bg-green-50 dark:bg-green-950">IC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.vertical_summary.map((day: VerticalSummary) => (
                        <TableRow key={day.time_slot}>
                          <TableCell className="sticky left-0 bg-background font-medium">
                            Day {day.time_slot}
                            {day.date && <span className="text-xs text-muted-foreground ml-2">{day.date}</span>}
                          </TableCell>
                          {Object.entries(day.counts).map(([state, count]) => (
                            <TableCell key={state} className="text-center">
                              <Badge 
                                variant="outline" 
                                className={
                                  state === '7' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                  state === 'E' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                                  state === 'O' ? 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400' :
                                  ''
                                }
                              >
                                {count}
                              </Badge>
                            </TableCell>
                          ))}
                          <TableCell className="text-center bg-green-50/50 dark:bg-green-950/30">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              {day.ic_count}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No daily summary data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Summary Tab (Horizontal) */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Shift Summary</CardTitle>
              <CardDescription>Total shifts assigned to each staff member</CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.horizontal_summary && summary.horizontal_summary.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Staff</TableHead>
                        {Object.keys(summary.horizontal_summary[0]?.counts || {}).map((state) => (
                          <TableHead key={state} className="text-center min-w-[80px]">
                            {state}
                          </TableHead>
                        ))}
                        <TableHead className="text-center min-w-[60px] bg-green-50 dark:bg-green-950">IC</TableHead>
                        <TableHead className="text-center min-w-[80px]">Total Work</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.horizontal_summary.map((staff: HorizontalSummary) => {
                        // Calculate total work days (exclude O=Off)
                        const totalWork = Object.entries(staff.counts)
                          .filter(([state]) => state !== 'O')
                          .reduce((sum, [, count]) => sum + count, 0)
                        
                        return (
                          <TableRow key={staff.resource}>
                            <TableCell className="sticky left-0 bg-background font-medium">
                              {staff.resource}
                            </TableCell>
                            {Object.entries(staff.counts).map(([state, count]) => (
                              <TableCell key={state} className="text-center">
                                <Badge 
                                  variant="outline" 
                                  className={
                                    state === '7' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                    state === 'E' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                                    state === 'O' ? 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400' :
                                    ''
                                  }
                                >
                                  {count}
                                </Badge>
                              </TableCell>
                            ))}
                            <TableCell className="text-center bg-green-50/50 dark:bg-green-950/30">
                              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                {staff.ic_count}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default">
                                {totalWork}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No staff summary data available
                </div>
              )}
              
              {/* Total IC Summary */}
              {summary?.total_ic_count !== undefined && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg flex items-center justify-between">
                  <span className="font-medium">Total IC Assignments</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-lg px-4 py-1">
                    {summary.total_ic_count}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Constraint Details Tab */}
        <TabsContent value="constraints">
          <Card>
            <CardHeader>
              <CardTitle>Constraint Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[150px]">Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="w-[100px] text-center">Violations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.results.map((constraintResult, idx) => (
                      <TableRow 
                        key={idx}
                        className={constraintResult.status === 'FAIL' ? 'bg-destructive/5' : 'bg-green-50/50 dark:bg-green-950/20'}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {constraintResult.status === 'PASS' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <Badge variant={constraintResult.status === 'PASS' ? 'default' : 'destructive'}>
                              {constraintResult.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {constraintResult.constraint_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {constraintResult.constraint_name || 'Unnamed Constraint'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {constraintResult.details}
                            </p>
                            {constraintResult.violations && constraintResult.violations.length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-destructive cursor-pointer hover:underline">
                                  Show violations
                                </summary>
                                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                  {constraintResult.violations.slice(0, 5).map((violation, vidx) => (
                                    <div key={vidx} className="text-xs bg-destructive/10 p-2 rounded">
                                      <pre className="whitespace-pre-wrap font-mono text-xs">
                                        {JSON.stringify(violation, null, 2)}
                                      </pre>
                                    </div>
                                  ))}
                                  {constraintResult.violations.length > 5 && (
                                    <p className="text-xs text-muted-foreground italic">
                                      ... and {constraintResult.violations.length - 5} more violations
                                    </p>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {constraintResult.violations && constraintResult.violations.length > 0 ? (
                            <Badge variant="destructive">{constraintResult.violations.length}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
