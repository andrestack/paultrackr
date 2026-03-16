'use client';

import { useMemo, useState } from 'react';
import { Job, Zone } from '@/lib/types';
import { clusterJobsByZone } from '@/lib/zone-clustering';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, Building2, Home, AlertCircle } from 'lucide-react';

interface ZonesPanelProps {
  jobs: Job[];
}

export function ZonesPanel({ jobs }: ZonesPanelProps) {
  const zones = useMemo(() => clusterJobsByZone(jobs), [jobs]);

  if (zones.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Geographic Zones
          </CardTitle>
          <CardDescription>No zones to display</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Geographic Zones
        </CardTitle>
        <CardDescription>
          {zones.length} zones identified from {jobs.length} jobs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {zones.map((zone, index) => (
            <AccordionItem key={zone.key} value={zone.key}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 text-left w-full pr-4">
                  <div className="flex items-center gap-2 min-w-[60px]">
                    <span className="text-sm font-mono text-muted-foreground">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {zone.key === 'UNKNOWN' ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span className="font-semibold text-amber-600">Unknown Location</span>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="font-mono">
                            {zone.key}
                          </Badge>
                          {zone.city && (
                            <span className="text-sm text-muted-foreground truncate">
                              {zone.city}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Home className="w-4 h-4" />
                      <span>{zone.count} job{zone.count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <div className="pt-2 pb-4 space-y-4">
                  {zone.streetsSample.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Sample addresses:</span>
                      <ul className="mt-1 space-y-1">
                        {zone.streetsSample.map((street, i) => (
                          <li key={i} className="text-muted-foreground truncate">
                            {street}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {zone.count} total job{zone.count !== 1 ? 's' : ''} in this zone
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
