'use client';

import { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { Job, JobRaw } from '@/lib/types';
import { normalizeJob } from '@/lib/normalize-job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileX, CheckCircle2 } from 'lucide-react';

interface CsvUploadProps {
  onJobsLoaded: (jobs: Job[]) => void;
}

interface ParseResult {
  jobs: Job[];
  errors: string[];
  rowCount: number;
}

export function CsvUpload({ onJobsLoaded }: CsvUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseResult({
        jobs: [],
        errors: ['Please upload a CSV file'],
        rowCount: 0,
      });
      return;
    }

    setIsLoading(true);
    setParseResult(null);

    Papa.parse<JobRaw>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const jobs: Job[] = [];

        // Check for required headers
        const headers = results.meta.fields || [];
        const requiredHeaders = ['ID', 'Contact Name'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
        }

        // Normalize each row
        results.data.forEach((row, index) => {
          try {
            const job = normalizeJob(row);
            if (job.id) {
              jobs.push(job);
            }
          } catch (err) {
            errors.push(`Row ${index + 2}: Failed to parse`);
          }
        });

        const result: ParseResult = {
          jobs,
          errors,
          rowCount: results.data.length,
        };

        setParseResult(result);
        setIsLoading(false);

        if (jobs.length > 0) {
          onJobsLoaded(jobs);
        }
      },
      error: (error) => {
        setParseResult({
          jobs: [],
          errors: [error.message],
          rowCount: 0,
        });
        setIsLoading(false);
      },
    });
  }, [onJobsLoaded]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload PoolTrackr CSV
        </CardTitle>
        <CardDescription>
          Upload your recurring jobs export CSV file to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
              : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600'
            }
          `}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer block">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Parsing CSV...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV files only</p>
              </div>
            )}
          </label>
        </div>

        {parseResult && (
          <div className="space-y-2">
            {parseResult.jobs.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Successfully loaded {parseResult.jobs.length} jobs
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    from {parseResult.rowCount} CSV rows
                  </p>
                </div>
              </div>
            )}

            {parseResult.errors.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <FileX className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900 dark:text-red-100">
                    {parseResult.errors.length} issue{parseResult.errors.length > 1 ? 's' : ''} found
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 mt-1 space-y-1">
                    {parseResult.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
