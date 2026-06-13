import { useEffect, useState } from 'react';
import {
  fetchBoardingStatus,
  fetchEDCopilot,
  fetchEMSIntake,
  fetchEmergencyQueues,
  fetchPatientJourney,
  fetchProvincialHealth,
  fetchReassessmentQueue,
  fetchReferrals,
} from '../services/emergencyOsApi';
import { fetchPatientManagementBundle } from '../services/patientManagementApi';
import type { PatientTimelineContext } from '../utils/patientTimeline';

type TimelineContextState = {
  loading: boolean;
  error: string;
  context: PatientTimelineContext;
};

const emptyState: TimelineContextState = {
  loading: false,
  error: '',
  context: {},
};

function isTestMode(): boolean {
  return (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'test';
}

function dataOf(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && 'data' in value) {
    const data = (value as { data?: unknown }).data;
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  }
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function arrayOf(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
}

function fulfilledValue(results: PromiseSettledResult<unknown>[], index: number): unknown {
  const result = results[index];
  return result?.status === 'fulfilled' ? result.value : null;
}

function rejectedMessages(results: PromiseSettledResult<unknown>[]): string[] {
  return results.flatMap((result) => {
    if (result.status === 'fulfilled') return [];
    const reason = result.reason as { message?: string };
    return [reason?.message || 'Timeline source unavailable'];
  });
}

export function usePatientTimelineContext(patientId: string | null): TimelineContextState {
  const [state, setState] = useState<TimelineContextState>(emptyState);

  useEffect(() => {
    if (!patientId || isTestMode()) {
      setState(emptyState);
      return undefined;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: '' }));

    Promise.allSettled([
      fetchPatientJourney(),
      fetchEMSIntake(),
      fetchEmergencyQueues(),
      fetchReassessmentQueue(),
      fetchBoardingStatus(),
      fetchReferrals(),
      fetchProvincialHealth(),
      fetchEDCopilot(),
      fetchPatientManagementBundle(patientId),
    ]).then((results) => {
      if (cancelled) return;

      const journey = dataOf(fulfilledValue(results, 0));
      const ems = dataOf(fulfilledValue(results, 1));
      const queues = dataOf(fulfilledValue(results, 2));
      const reassessment = dataOf(fulfilledValue(results, 3));
      const boarding = dataOf(fulfilledValue(results, 4));
      const referrals = dataOf(fulfilledValue(results, 5));
      const provincial = dataOf(fulfilledValue(results, 6));
      const copilot = dataOf(fulfilledValue(results, 7));
      const patientManagement = fulfilledValue(results, 8) as { ok?: boolean; data?: { timelineEvents?: unknown[] }; error?: string } | null;
      const failures = rejectedMessages(results);
      if (patientManagement && patientManagement.ok === false && patientManagement.error) {
        failures.push(patientManagement.error);
      }

      setState({
        loading: false,
        error: failures.length ? `Backend timeline enrichment partial: ${failures.join('; ')}` : '',
        context: {
          journeyEvents: arrayOf(journey.events),
          emsArrivals: arrayOf(ems.arrivals),
          queues: arrayOf(queues.queues),
          reassessmentPatients: arrayOf(reassessment.patients),
          boardingPatients: arrayOf(boarding.patients),
          referrals: arrayOf(referrals.referrals),
          provincialRecords: arrayOf(provincial.records),
          copilotContext: dataOf(copilot.promptContext),
          backendTimelineEvents: arrayOf(patientManagement?.data?.timelineEvents),
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return state;
}
