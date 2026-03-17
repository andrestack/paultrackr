'use client';

import { useMemo, useState } from 'react';
import { Job, Plan, PlannedJob } from '@/lib/types';
import { generateDraftPlan, moveJobInPlan } from '@/lib/generate-draft-plan';
import { exportPlanCsv, exportPoolTrackrCsv, downloadCsv } from '@/lib/export-csv';
import { getNextMonday, formatDateISO, formatDateShort } from '@/lib/date-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, AlertCircle, RotateCcw, Sparkles, Undo2, Download } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface SchedulePanelProps {
  jobs: Job[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MAX_JOBS_PER_DAY = 20;

// Draggable Job Card Component
interface DraggableJobCardProps {
  job: PlannedJob;
  isOverlay?: boolean;
}

function DraggableJobCard({ job, isOverlay = false }: DraggableJobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  if (isDragging && !isOverlay) {
    return <div ref={setNodeRef} className="h-12 bg-muted/50 rounded border border-dashed" />;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`text-xs p-2 rounded border cursor-grab active:cursor-grabbing ${
        job.flags.includes('needs-review')
          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
          : 'bg-muted border-border hover:bg-muted/80'
      } ${isOverlay ? 'shadow-lg rotate-2 scale-105' : ''}`}
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
  );
}

// Droppable Day Cell Component
interface DroppableDayCellProps {
  weekIndex: number;
  dayIndex: number;
  dateStr: string;
  jobs: PlannedJob[];
  onJobMove: (jobId: string, toDate: string) => void;
}

function DroppableDayCell({ weekIndex, dayIndex, dateStr, jobs, onJobMove }: DroppableDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${weekIndex}-${dayIndex}`,
    data: { weekIndex, dayIndex, dateStr },
  });

  const dayName = DAYS[dayIndex];
  const jobCount = jobs.length;
  
  // Display short format (DD-MM) but keep full date for data
  const displayDate = dateStr ? dateStr.substring(0, 5) : '';

  return (
    <div
      ref={setNodeRef}
      className={`bg-background p-3 min-h-[200px] transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-400' : ''
      }`}
    >
      <div className="text-sm font-medium mb-2">
        {dayName}
        <span className="text-muted-foreground ml-2 text-xs">
          {displayDate}
        </span>
      </div>
      
      <div className="mb-2">
        <Badge 
          variant={jobCount > 16 ? "destructive" : jobCount > 14 ? "default" : "secondary"}
          className="text-xs"
        >
          {jobCount} jobs
        </Badge>
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {jobs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Drop jobs here
          </p>
        ) : (
          jobs.map((job) => (
            <DraggableJobCard key={job.id} job={job} />
          ))
        )}
      </div>
    </div>
  );
}

export function SchedulePanel({ jobs }: SchedulePanelProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [startDate, setStartDate] = useState<string>(formatDateISO(getNextMonday()));
  const [activeJob, setActiveJob] = useState<PlannedJob | null>(null);
  const [history, setHistory] = useState<Plan[]>([]);

  const handleGeneratePlan = () => {
    if (jobs.length === 0) return;
    
    const newPlan = generateDraftPlan({
      jobs,
      startDate,
      weeks: 4,
    });
    
    setPlan(newPlan);
    setHistory([]);
  };

  const handleResetPlan = () => {
    setPlan(null);
    setHistory([]);
  };

  const handleUndo = () => {
    if (history.length > 0 && plan) {
      const previousPlan = history[history.length - 1];
      setPlan(previousPlan);
      setHistory(history.slice(0, -1));
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const job = event.active.data.current?.job as PlannedJob;
    if (job) {
      setActiveJob(job);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveJob(null);
    
    const { active, over } = event;
    
    if (!over || !plan) {
      console.log('Drop failed: no drop target or no plan');
      return;
    }
    
    const jobId = active.id as string;
    const targetDate = over.data.current?.dateStr as string;
    
    console.log('Drag end:', { jobId, targetDate, overId: over.id, overData: over.data.current });
    
    if (!targetDate) {
      console.log('Drop failed: no target date');
      return;
    }
    
    // Find the job's current date
    const job = plan.plannedJobs.find(j => j.id === jobId);
    if (!job) {
      console.log('Drop failed: job not found', jobId);
      return;
    }
    
    if (job.plannedDate === targetDate) {
      console.log('Drop failed: same date');
      return;
    }
    
    console.log('Moving job:', job.contactName, 'from', job.plannedDate, 'to', targetDate);
    
    // Save current state to history
    setHistory([...history, plan]);
    
    // Move the job
    const newPlan = moveJobInPlan(plan, jobId, targetDate);
    console.log('New plan stats:', { planned: newPlan.plannedJobs.length, unplanned: newPlan.unplannedJobs.length });
    setPlan(newPlan);
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
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
    const [d, m, y] = plan.startDate.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + week * 7);
      
      const weekDays = [];
      for (let day = 0; day < 5; day++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + day);
        // Use full DD-MM-YYYY format for proper date handling
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
    canUndo: history.length > 0,
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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUndo}
              disabled={!stats.canUndo}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Undo
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetPlan}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (plan) {
                  const csv = exportPlanCsv(plan);
                  downloadCsv(csv, 'schedule-plan.csv');
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Plan
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => {
                if (plan && jobs.length > 0) {
                  const csv = exportPoolTrackrCsv(jobs, plan);
                  downloadCsv(csv, 'pooltrackr-update.csv');
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export for PoolTrackr
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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
                    {DAYS.map((_, dayIndex) => {
                      const weekMap = jobsByWeekAndDay.get(weekIndex);
                      const dayJobs: PlannedJob[] = weekMap?.get(dayIndex + 1) || [];
                      const dateStr = weekDates[weekIndex]?.[dayIndex] || '';
                      
                      return (
                        <DroppableDayCell
                          key={dayIndex}
                          weekIndex={weekIndex}
                          dayIndex={dayIndex}
                          dateStr={dateStr}
                          jobs={dayJobs}
                          onJobMove={(jobId, toDate) => {
                            setHistory([...history, plan]);
                            setPlan(moveJobInPlan(plan, jobId, toDate));
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeJob ? (
              <DraggableJobCard job={activeJob} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>

        {stats.unplanned > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {stats.unplanned} job{stats.unplanned !== 1 ? 's' : ''} could not be scheduled
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
