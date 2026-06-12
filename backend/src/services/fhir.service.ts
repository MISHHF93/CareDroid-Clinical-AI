export class FHIRService {
  normalizePatientSnapshot(snapshot: Record<string, any>): Record<string, any> {
    return {
      ...snapshot,
      dateOfBirth: snapshot.dateOfBirth || snapshot.birthDate || snapshot.dob,
      sex: snapshot.sex || snapshot.gender,
      externalEhrId: snapshot.externalEhrId || snapshot.fhirPatientId,
    };
  }
}

export const fhirService = new FHIRService();
