'use client';

import { useMemo, useState } from 'react';
import { Job, Plan, PlannedJob } from '@/lib/types';
import { generateDraftPlan } from '@/lib/generate-draft-plan';
import { getNextMonday, formatDateISO, getFullDayName } from '@/lib/date-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, AlertCircle, RotateCcw, Sparkles } from 'lucide-react';

interface SchedulePanelProps {
  jobs: Job[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function SchedulePanel({ jobs }: SchedulePanelProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [startDate, setStartDate] = useState<string>(formatDateISO(getNextMonday()));

  const handleGeneratePlan = () => {
    if (jobs.length === 0) return;
    
    const newPlan = generateDraftPlan({
      jobs,
      startDate,
      weeks: 4,
    });
    
    setPlan(newPlan);
  };

  const handleResetPlan = () => {
    setPlan(null);
  };

  // Group planned jobs by week and day
  const jobsByWeekAndDay = useMemo(() => {
    if (!plan) return new Map();

    const map = new Map<number, Map<number, PlannedJob[]>>();
    
    for (const job of plan.plannedJobs) {
      if (!map.has(job.plannedWeekIndex)) {
        map.set(job.plannedWeekIndex, new Map());
      }
      const weekMap = map.get(job.plannedWeekIndex)!;
      
      if (!weekMap.has(job.plannedDayIndex)) {
        weekMap.set(job.plannedDayIndex, []);
      }
      weekMap.get(job.plannedDayIndex)!.push(job);
    }

    return map;
  }, [plan]);

  const weekDates = useMemo(() => {
    if (!plan) return [];
    
    const dates = [];
    const start = new Date(plan.startDate);
    
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + week * 7);
      
      const weekDays = [];
      for (let day = 0; day < 5; day++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + day);
        weekDays.push(formatDateISO(date));
      }
      dates.push(weekDays);
    }
    
    return dates;
  }, [plan]);

  if (!plan) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            4-Week Schedule
          </CardTitle>
          <CardDescription>
            Generate a draft schedule for your jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Start from:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>
            
            <Button 
              onClick={handleGeneratePlan}
              disabled={jobs.length === 0}
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Draft Schedule
            </Button>
            
            {jobs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Upload jobs first to generate a schedule
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = {
    totalPlanned: plan.plannedJobs.length,
    unplanned: plan.unplannedJobs.length,
    withFlags: plan.plannedJobs.filter(j => j.flags.length > 0).length,
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              4-Week Schedule
            </CardTitle>
            <CardDescription>
              {stats.totalPlanned} jobs planned • {stats.unplanned} unplanned
              {stats.withFlags > 0 && ` • ${stats.withFlags} need review`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetPlan}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="week-0" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <TabsTrigger key={i} value={`week-${i}`}>
                Week {i + 1}
              </TabsTrigger>
            ))}
          </TabsList>

          {Array.from({ length: 4 }, (_, weekIndex) => (
            <TabsContent key={weekIndex} value={`week-${weekIndex}`}>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 gap-px bg-border">
                  {DAYS.map((day, dayIndex) => {
                    const weekMap = jobsByWeekAndDay.get(weekIndex);
                    const dayJobs: PlannedJob[] = weekMap?.get(dayIndex + 1) || []; // +1 because Mon=1
                    const dateStr = weekDates[weekIndex]?.[dayIndex] || '';
                    
                    return (
                      <div 
                        key={day} 
                        className="bg-background p-3 min-h-[200px]"
                      >
                        <div className="text-sm font-medium mb-2">
                          {day}
                          <span className="text-muted-foreground ml-2 text-xs">
                            {dateStr.slice(5)}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {dayJobs.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">
                              No jobs
                            </p>
                          ) : (
                            dayJobs.slice(0, 5).map((job) => (
                              <div
                                key={job.id}
                                className={`text-xs p-2 rounded border ${
                                  job.flags.includes('needs-review')
                                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
                                    : 'bg-muted border-border'
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="font-medium truncate">
                                    {job.contactName || 'Unknown'}
                                  </span>
                                  {job.flags.includes('needs-review') && (
                                    <AlertCircle className="w-3 h-3 text-amber-500" />
                                  )}
                                </div>
                                <div className="text-muted-foreground truncate">
                                  {job.addressCity || job.addressPostcode}
                                </div>
                              </div>
                            ))
                          )}
                          
                          {dayJobs.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{dayJobs.length - 5} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {stats.unplanned > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {stats.unplanned} job{stats.unplanned !== 1 ? 's' : ''} couldn't be scheduled
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
