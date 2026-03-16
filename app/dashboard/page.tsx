'use client';

import { useState } from 'react';
import { Job } from '@/lib/types';
import { CsvUpload } from '@/src/features/ingestion/components/csv-upload';
import { JobList } from '@/src/features/ingestion/components/job-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users } from 'lucide-react';

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  const handleJobsLoaded = (loadedJobs: Job[]) => {
    setJobs(loadedJobs);
  };

  // Calculate stats
  const totalJobs = jobs.length;
  const uniquePostcodes = new Set(jobs.map(j => j.addressPostcode).filter(Boolean)).size;
  const uniqueTechnicians = new Set(jobs.map(j => j.technicianName).filter(Boolean)).size;
  const jobsWithDates = jobs.filter(j => j.nextDateParsed).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">
              Paultrackr
            </h1>
            <Badge variant="outline" className="text-sm">
              Phase 1 MVP
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Upload Section */}
          <CsvUpload onJobsLoaded={handleJobsLoaded} />

          {/* Stats Section */}
          {jobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalJobs}</div>
                  <p className="text-xs text-muted-foreground">loaded from CSV</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Postcodes</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uniquePostcodes}</div>
                  <p className="text-xs text-muted-foreground">geographic zones</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Technicians</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uniqueTechnicians}</div>
                  <p className="text-xs text-muted-foreground">assigned staff</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">With Dates</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{jobsWithDates}</div>
                  <p className="text-xs text-muted-foreground">next date set</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Jobs Table */}
          {jobs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Job Preview</h2>
                <Badge variant="secondary">First 20 jobs shown</Badge>
              </div>
              <JobList jobs={jobs} maxRows={20} />
            </div>
          )}

          {/* Empty State */}
          {jobs.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Upload a CSV file to see your jobs here
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
