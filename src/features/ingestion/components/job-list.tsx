'use client';

import { Job } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface JobListProps {
  jobs: Job[];
  maxRows?: number;
}

export function JobList({ jobs, maxRows = 20 }: JobListProps) {
  const displayJobs = jobs.slice(0, maxRows);
  const hasMore = jobs.length > maxRows;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Contact Name</TableHead>
            <TableHead>Street</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Postcode</TableHead>
            <TableHead>Technician</TableHead>
            <TableHead>Next Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayJobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-mono text-xs">{job.id}</TableCell>
              <TableCell className="font-medium">{job.contactName || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                {job.addressStreetOne || '-'}
              </TableCell>
              <TableCell>{job.addressCity || '-'}</TableCell>
              <TableCell>
                {job.addressPostcode ? (
                  <Badge variant="secondary" className="font-mono">
                    {job.addressPostcode}
                  </Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>{job.technicianName || '-'}</TableCell>
              <TableCell className="text-sm">
                {job.nextDateParsed ? (
                  <span className="text-green-600 dark:text-green-400">
                    {job.nextDateParsed.toISOString().split('T')[0]}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{job.nextDateRaw || '-'}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {hasMore && (
        <div className="p-4 text-center text-sm text-muted-foreground border-t">
          Showing {maxRows} of {jobs.length} jobs. 
          <span className="text-foreground font-medium"> {jobs.length - maxRows} more not shown.</span>
        </div>
      )}
    </div>
  );
}
