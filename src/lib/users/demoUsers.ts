import type { CareDroidUserProfile } from './userTypes';
import { HOSPITAL_SITES, CITY_ZONES, DEPARTMENTS } from './hospitalNetwork';
import { getPermissionsForRole, canRoleReceiveCriticalAlerts, canRoleUseAIChief } from './permissions';
import { normalizeCareDroidProfile } from './canonicalAccess';

const now = new Date().toISOString();

function makeDemoUser(
  partial: Partial<CareDroidUserProfile> &
    Pick<
      CareDroidUserProfile,
      | 'id'
      | 'employeeId'
      | 'fullName'
      | 'preferredName'
      | 'email'
      | 'phone'
      | 'avatarUrl'
      | 'role'
      | 'title'
      | 'department'
      | 'hospitalSite'
      | 'cityZone'
      | 'shiftStatus'
      | 'shiftStart'
      | 'shiftEnd'
      | 'licenseNumber'
      | 'specialties'
      | 'availabilityStatus'
      | 'escalationLevel'
    >
): CareDroidUserProfile {
  return normalizeCareDroidProfile({
    ...partial,
    permissions: getPermissionsForRole(partial.role),
    assignedPatients: [],
    currentLoad: 0,
    canReceiveCriticalAlerts: canRoleReceiveCriticalAlerts(partial.role),
    canUseAIChief: canRoleUseAIChief(partial.role),
    lastActiveAt: now,
  });
}

export const DEMO_USERS: readonly CareDroidUserProfile[] = Object.freeze([
  makeDemoUser({
    id: 'demo-maya-chen',
    employeeId: 'EMP-001',
    fullName: 'Dr. Maya Chen',
    preferredName: 'Maya',
    email: 'maya.chen@centralcity.caredroid.local',
    phone: '555-0101',
    avatarUrl: '',
    role: 'emergency_physician',
    title: 'Emergency Physician',
    department: DEPARTMENTS.EMERGENCY,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '07:00',
    shiftEnd: '19:00',
    licenseNumber: 'MD-44821',
    specialties: ['Emergency Medicine'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-omar-patel',
    employeeId: 'EMP-002',
    fullName: 'Nurse Omar Patel',
    preferredName: 'Omar',
    email: 'omar.patel@centralcity.caredroid.local',
    phone: '555-0102',
    avatarUrl: '',
    role: 'charge_nurse',
    title: 'Charge Nurse',
    department: DEPARTMENTS.EMERGENCY,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '07:00',
    shiftEnd: '19:00',
    licenseNumber: 'RN-28341',
    specialties: ['Emergency Nursing', 'Triage'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-sofia-alvarez',
    employeeId: 'EMP-003',
    fullName: 'Nurse Sofia Alvarez',
    preferredName: 'Sofia',
    email: 'sofia.alvarez@centralcity.caredroid.local',
    phone: '555-0103',
    avatarUrl: '',
    role: 'triage_nurse',
    title: 'Triage Nurse',
    department: DEPARTMENTS.TRIAGE,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '07:00',
    shiftEnd: '15:00',
    licenseNumber: 'RN-19204',
    specialties: ['Triage', 'Emergency Nursing'],
    availabilityStatus: 'busy',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-grace-kim',
    employeeId: 'EMP-004',
    fullName: 'Grace Kim',
    preferredName: 'Grace',
    email: 'grace.kim@centralcity.caredroid.local',
    phone: '555-0104',
    avatarUrl: '',
    role: 'registration_clerk',
    title: 'Registration Clerk',
    department: DEPARTMENTS.REGISTRATION,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '08:00',
    shiftEnd: '16:00',
    licenseNumber: null,
    specialties: [],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-aisha-morgan',
    employeeId: 'EMP-005',
    fullName: 'Dr. Aisha Morgan',
    preferredName: 'Aisha',
    email: 'aisha.morgan@centralcity.caredroid.local',
    phone: '555-0105',
    avatarUrl: '',
    role: 'ed_director',
    title: 'ED Director',
    department: DEPARTMENTS.EMERGENCY,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '08:00',
    shiftEnd: '18:00',
    licenseNumber: 'MD-31175',
    specialties: ['Emergency Medicine', 'Healthcare Administration'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-leo-brooks',
    employeeId: 'EMP-006',
    fullName: 'Leo Brooks',
    preferredName: 'Leo',
    email: 'leo.brooks@centralcity.caredroid.local',
    phone: '555-0106',
    avatarUrl: '',
    role: 'patient_flow_coordinator',
    title: 'Patient Flow Coordinator',
    department: DEPARTMENTS.PATIENT_FLOW,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '07:00',
    shiftEnd: '19:00',
    licenseNumber: null,
    specialties: ['Bed Management', 'Queue Optimization'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-samuel-okafor',
    employeeId: 'EMP-007',
    fullName: 'Dr. Samuel Okafor',
    preferredName: 'Samuel',
    email: 'samuel.okafor@riverside.caredroid.local',
    phone: '555-0107',
    avatarUrl: '',
    role: 'specialist',
    title: 'Cardiologist',
    department: DEPARTMENTS.CARDIOLOGY,
    hospitalSite: HOSPITAL_SITES.RIVERSIDE,
    cityZone: CITY_ZONES.SOUTH,
    shiftStatus: 'on_call',
    shiftStart: '08:00',
    shiftEnd: '18:00',
    licenseNumber: 'MD-52903',
    specialties: ['Cardiology', 'Interventional Cardiology'],
    availabilityStatus: 'on_call',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-elena-rossi',
    employeeId: 'EMP-008',
    fullName: 'Dr. Elena Rossi',
    preferredName: 'Elena',
    email: 'elena.rossi@northside.caredroid.local',
    phone: '555-0108',
    avatarUrl: '',
    role: 'specialist',
    title: 'Neurologist',
    department: DEPARTMENTS.NEUROLOGY,
    hospitalSite: HOSPITAL_SITES.NORTHSIDE,
    cityZone: CITY_ZONES.NORTH,
    shiftStatus: 'on_call',
    shiftStart: '09:00',
    shiftEnd: '17:00',
    licenseNumber: 'MD-67821',
    specialties: ['Neurology', 'Stroke'],
    availabilityStatus: 'on_call',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-priya-shah',
    employeeId: 'EMP-009',
    fullName: 'Priya Shah',
    preferredName: 'Priya',
    email: 'priya.shah@centralcity.caredroid.local',
    phone: '555-0109',
    avatarUrl: '',
    role: 'pharmacist',
    title: 'Clinical Pharmacist',
    department: DEPARTMENTS.PHARMACY,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '08:00',
    shiftEnd: '16:00',
    licenseNumber: 'RPh-11034',
    specialties: ['Clinical Pharmacy', 'Drug Interactions'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-marcus-lee',
    employeeId: 'EMP-010',
    fullName: 'Marcus Lee',
    preferredName: 'Marcus',
    email: 'marcus.lee@centralcity.caredroid.local',
    phone: '555-0110',
    avatarUrl: '',
    role: 'lab_technician',
    title: 'Lab Technician',
    department: DEPARTMENTS.LABORATORY,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '07:00',
    shiftEnd: '15:00',
    licenseNumber: null,
    specialties: ['Haematology', 'Biochemistry'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-hannah-wright',
    employeeId: 'EMP-011',
    fullName: 'Hannah Wright',
    preferredName: 'Hannah',
    email: 'hannah.wright@centralcity.caredroid.local',
    phone: '555-0111',
    avatarUrl: '',
    role: 'radiology_technician',
    title: 'Radiology Technician',
    department: DEPARTMENTS.RADIOLOGY,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '08:00',
    shiftEnd: '16:00',
    licenseNumber: null,
    specialties: ['CT Imaging', 'X-Ray'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-jordan-miles',
    employeeId: 'EMP-012',
    fullName: 'Jordan Miles',
    preferredName: 'Jordan',
    email: 'jordan.miles@centralcity.caredroid.local',
    phone: '555-0112',
    avatarUrl: '',
    role: 'hospital_admin',
    title: 'Hospital Administrator',
    department: DEPARTMENTS.ADMINISTRATION,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '09:00',
    shiftEnd: '17:00',
    licenseNumber: null,
    specialties: ['Healthcare Administration'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-riley-thompson',
    employeeId: 'EMP-013',
    fullName: 'Riley Thompson',
    preferredName: 'Riley',
    email: 'riley.thompson@centralcity.caredroid.local',
    phone: '555-0113',
    avatarUrl: '',
    role: 'it_admin',
    title: 'IT Administrator',
    department: DEPARTMENTS.IT,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '09:00',
    shiftEnd: '17:00',
    licenseNumber: null,
    specialties: ['Healthcare IT', 'Clinical Systems'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-morgan-ellis',
    employeeId: 'EMP-014',
    fullName: 'Morgan Ellis',
    preferredName: 'Morgan',
    email: 'morgan.ellis@centralcity.caredroid.local',
    phone: '555-0114',
    avatarUrl: '',
    role: 'quality_safety_officer',
    title: 'Quality & Safety Officer',
    department: DEPARTMENTS.ADMINISTRATION,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: '09:00',
    shiftEnd: '17:00',
    licenseNumber: null,
    specialties: ['Quality Improvement', 'Patient Safety', 'Clinical Audit'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-alex-rivera',
    employeeId: 'EMP-015',
    fullName: 'Alex Rivera',
    preferredName: 'Alex',
    email: 'alex.rivera@northside.caredroid.local',
    phone: '555-0115',
    avatarUrl: '',
    role: 'paramedic',
    title: 'Paramedic',
    department: DEPARTMENTS.EMERGENCY,
    hospitalSite: HOSPITAL_SITES.NORTHSIDE,
    cityZone: CITY_ZONES.NORTH,
    shiftStatus: 'on_shift',
    shiftStart: '06:00',
    shiftEnd: '18:00',
    licenseNumber: 'PM-08892',
    specialties: ['Advanced Life Support', 'Trauma'],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),

  makeDemoUser({
    id: 'demo-viewer',
    employeeId: 'EMP-016',
    fullName: 'Demo Viewer',
    preferredName: 'Demo',
    email: 'demo.viewer@caredroid.local',
    phone: '',
    avatarUrl: '',
    role: 'demo_observer',
    title: 'Demo Observer',
    department: DEPARTMENTS.ADMINISTRATION,
    hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
    cityZone: CITY_ZONES.CENTRAL,
    shiftStatus: 'on_shift',
    shiftStart: null,
    shiftEnd: null,
    licenseNumber: null,
    specialties: [],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  }),
]);

export function getDemoUserById(id: string): CareDroidUserProfile | undefined {
  return DEMO_USERS.find((u) => u.id === id);
}

export function getDemoUsersByRole(role: CareDroidUserProfile['role']): CareDroidUserProfile[] {
  return DEMO_USERS.filter((u) => u.role === role);
}

export function getDemoUsersByHospital(hospitalSite: string): CareDroidUserProfile[] {
  return DEMO_USERS.filter((u) => u.hospitalSite === hospitalSite);
}

export const DEFAULT_DEMO_USER_ID = 'demo-aisha-morgan';

export function getDefaultDemoUser(): CareDroidUserProfile {
  return getDemoUserById(DEFAULT_DEMO_USER_ID) ?? DEMO_USERS[0];
}
