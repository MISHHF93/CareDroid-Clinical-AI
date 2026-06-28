export const NETWORK_NAME = 'CareDroid Virtual City Health Network';

export const HOSPITAL_SITES = Object.freeze({
  CENTRAL_CITY: 'Central City Hospital',
  NORTHSIDE: 'Northside Emergency Centre',
  RIVERSIDE: 'Riverside General Hospital',
  EASTVIEW: "Eastview Children's Hospital",
  WESTBRIDGE: "Westbridge Women's & Trauma Centre",
} as const);

export type HospitalSite = (typeof HOSPITAL_SITES)[keyof typeof HOSPITAL_SITES];

export const CITY_ZONES = Object.freeze({
  CENTRAL: 'Central',
  NORTH: 'North',
  SOUTH: 'South',
  EAST: 'East',
  WEST: 'West',
} as const);

export type CityZone = (typeof CITY_ZONES)[keyof typeof CITY_ZONES];

export const HOSPITAL_SITE_ZONES: Readonly<Record<HospitalSite, CityZone>> = Object.freeze({
  [HOSPITAL_SITES.CENTRAL_CITY]: CITY_ZONES.CENTRAL,
  [HOSPITAL_SITES.NORTHSIDE]: CITY_ZONES.NORTH,
  [HOSPITAL_SITES.RIVERSIDE]: CITY_ZONES.SOUTH,
  [HOSPITAL_SITES.EASTVIEW]: CITY_ZONES.EAST,
  [HOSPITAL_SITES.WESTBRIDGE]: CITY_ZONES.WEST,
});

export const DEPARTMENTS = Object.freeze({
  EMERGENCY: 'Emergency Department',
  TRIAGE: 'Triage',
  REGISTRATION: 'Registration',
  ICU: 'ICU',
  CARDIOLOGY: 'Cardiology',
  NEUROLOGY: 'Neurology',
  RADIOLOGY: 'Radiology',
  LABORATORY: 'Laboratory',
  PHARMACY: 'Pharmacy',
  PEDIATRICS: 'Pediatrics',
  OBSTETRICS: 'Obstetrics',
  SURGERY: 'Surgery',
  MENTAL_HEALTH: 'Mental Health',
  SECURITY: 'Security',
  ADMINISTRATION: 'Administration',
  IT: 'IT',
  PATIENT_FLOW: 'Patient Flow',
} as const);

export type Department = (typeof DEPARTMENTS)[keyof typeof DEPARTMENTS];
