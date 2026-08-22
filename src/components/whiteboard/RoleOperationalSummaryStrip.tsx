import { useMemo } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState } from '../../types/emergency';
import { buildStaffWorkloads } from '../../utils/staffManagement';
import {
  resolveRoleOperationalFocus,
  shouldShowRoleSummaryCard,
} from '../../config/roleOperationalDashboardModel';
import './RoleOperationalSummaryStrip.css';

type RoleOperationalSummaryStripProps = {
  waitingCount?: number;
  escalationCount?: number;
  capacityLabel?: string;
  roleId?: string;
  className?: string;
};

type RoleCard = {
  id: string;
  title: string;
  lines: string[];
  tone?: 'critical' | 'warning' | 'healthy' | 'inactive';
};

function countByRole(workloads: ReturnType<typeof buildStaffWorkloads>, roleMatchers: string[]) {
  return workloads.filter((member) =>
    roleMatchers.some((token) => String(member.role || '').toLowerCase().includes(token)),
  );
}

export default function RoleOperationalSummaryStrip({
  waitingCount = 0,
  escalationCount = 0,
  capacityLabel = '—',
  roleId,
  className = '',
}: RoleOperationalSummaryStripProps) {
  const staff = useEmergencyStore((state) => state.staff);
  const patients = useEmergencyStore((state) => state.patients);
  const activeShift = useEmergencyStore((state) => state.activeShift);

  const roleFocus = useMemo(() => resolveRoleOperationalFocus(roleId), [roleId]);

  const cards = useMemo(() => {
    const workloads = buildStaffWorkloads(staff, patients, activeShift as any);
    // Was Discharge-only -- a Deceased patient with a matching flag still
    // inflated "Active patients"/"Critical" below despite no longer being on
    // the board.
    const activePatients = patients.filter(
      (patient) => patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
    );
    const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);
    const registrationPending = patients.filter(
      (patient) =>
        patient.state === PatientState.Arrival || patient.state === PatientState.Registration,
    ).length;
    const criticalCount = activePatients.filter((patient) =>
      (patient.flags || []).some((flag) =>
        String(typeof flag === 'string' ? flag : (flag as { type?: string })?.type || '')
          .toLowerCase()
          .match(/high|sepsis|deteriorat|lwbs|stroke/),
      ),
    ).length;

    const chargeNurses = countByRole(workloads, ['charge', 'nurse manager']);
    const physicians = countByRole(workloads, ['physician', 'doctor', 'attending']);
    const bedsideNurses = countByRole(workloads, ['nurse', 'rn']).filter(
      (member) => !chargeNurses.some((lead) => lead.id === member.id),
    );

    const physicianAssigned = physicians.reduce((sum, member) => sum + member.assignedCount, 0);
    const nurseAssigned = bedsideNurses.reduce((sum, member) => sum + member.assignedCount, 0);
    const nursesAvailable = bedsideNurses.filter((member) => member.assignedCount <= 2).length;
    const unassignedBeds = Math.max(0, waitingPatients.length - nurseAssigned);

    const catalog: RoleCard[] = [
      {
        id: 'reception',
        title: 'Reception',
        tone: registrationPending > 0 ? 'warning' : 'healthy',
        lines: [
          `Arrivals pending · ${registrationPending}`,
          `Waiting · ${waitingCount}`,
          `Identity gaps · ${registrationPending}`,
        ],
      },
      {
        id: 'charge',
        title: 'Charge Nurse',
        tone: escalationCount > 0 ? 'critical' : waitingCount > 15 ? 'warning' : 'healthy',
        lines: [
          `Active patients · ${activePatients.length}`,
          `Waiting · ${waitingCount}`,
          `Escalations · ${escalationCount}`,
          `Capacity · ${capacityLabel}`,
        ],
      },
      {
        id: 'physician',
        title: 'Physician',
        tone: criticalCount > 0 ? 'critical' : physicianAssigned > 0 ? 'healthy' : 'inactive',
        lines: [
          `Assigned · ${physicianAssigned}`,
          `Critical · ${criticalCount}`,
          `On duty · ${physicians.length}`,
        ],
      },
      {
        id: 'nurse',
        title: 'Nurse',
        tone: nurseAssigned > 18 ? 'warning' : 'healthy',
        lines: [
          `Assigned · ${nurseAssigned}`,
          `On duty · ${bedsideNurses.length}`,
          `Available · ${nursesAvailable}`,
        ],
      },
      {
        id: 'flow',
        title: 'Patient Flow',
        tone: waitingCount > 20 ? 'warning' : 'healthy',
        lines: [
          `Waiting · ${waitingCount}`,
          `Unassigned load · ${unassignedBeds}`,
          `Capacity · ${capacityLabel}`,
        ],
      },
      {
        id: 'ems',
        title: 'EMS',
        tone: escalationCount > 0 ? 'warning' : 'healthy',
        lines: [
          `Inbound pressure · ${escalationCount}`,
          `Waiting offload · ${waitingCount > 0 ? 'Review board' : 'Clear'}`,
        ],
      },
    ];

    if (chargeNurses.length) {
      const chargeCard = catalog.find((card) => card.id === 'charge');
      if (chargeCard) {
        chargeCard.lines.unshift(`Coverage · ${chargeNurses.map((m) => m.displayName).join(', ')}`);
      }
    }

    return catalog.filter((card) => shouldShowRoleSummaryCard(card.id, roleId));
  }, [
    activeShift,
    capacityLabel,
    escalationCount,
    patients,
    roleId,
    staff,
    waitingCount,
  ]);

  if (!cards.length) return null;

  return (
    <section
      className={[
        'role-operational-summary',
        cards.length === 1 ? 'role-operational-summary--single' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${roleFocus.roleLabel} operational summary`}
    >
      {cards.map((card) => (
        <article
          key={card.id}
          className={[
            'role-operational-summary__card',
            card.tone ? `role-operational-summary__card--${card.tone}` : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <h3 className="role-operational-summary__title">{card.title}</h3>
          <ul className="role-operational-summary__lines">
            {card.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}