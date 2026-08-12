import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PatientRoomWhiteboard from '../../components/patient-experience/PatientRoomWhiteboard';
import PatientWhiteboard from '../../components/patient-experience/PatientWhiteboard';
import DigitalDoorSign from '../../components/whiteboard/DigitalDoorSign';
import { useEmergencyStore } from '../../store/emergencyStore';
import { readPatientRouteContext } from '../../utils/receptionQueryParams';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import './PatientRoomDisplay.css';

export default function PatientRoomDisplay() {
  const surfaces = usePractitionerSurfaceVisibility();
  const [searchParams] = useSearchParams();
  const { focusPatientId: patientId } = readPatientRouteContext(searchParams);
  const roomId = searchParams.get('roomId') || '';
  const mode = searchParams.get('mode') || 'whiteboard';

  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);

  const patient = useMemo(
    () => patients.find((entry) => entry.id === patientId) || null,
    [patientId, patients],
  );
  const room = useMemo(() => {
    if (roomId) return rooms.find((entry) => entry.id === roomId);
    if (patient?.roomId) return rooms.find((entry) => entry.id === patient.roomId);
    return rooms[0];
  }, [patient?.roomId, roomId, rooms]);

  if (!patient && mode !== 'door-sign') {
    return (
      <section className="patient-room-display patient-room-display--empty" role="status">
        <h1>Patient room display</h1>
        <p>Select a patient with <code>?patientId=</code> to show the in-room whiteboard.</p>
      </section>
    );
  }

  if (mode === 'door-sign' && room) {
    const roomPatient =
      patient ||
      patients.find(
        (entry) => entry.roomId === room.id || entry.id === room.patientId || entry.id === room.currentPatientId,
      ) ||
      null;
    return (
      <section className="patient-room-display patient-room-display--door-sign">
        <DigitalDoorSign room={room} patient={roomPatient} staff={staff} />
      </section>
    );
  }

  return (
    <section className="patient-room-display">
      {room && surfaces.patientRoom.showDoorSignDuplicate ? (
        <div className="patient-room-display__door-sign">
          {/* Care team is already shown below by PatientWhiteboard/PatientRoomWhiteboard
              ("Your care team") -- hideCareTeam keeps this sign's unique safety content
              (isolation precautions, fall risk, sepsis alert, allergy flags, reminders)
              without repeating the roster a second time on the same screen. */}
          <DigitalDoorSign room={room} patient={patient} staff={staff} hideCareTeam />
        </div>
      ) : null}
      {patient ? (
        mode === 'staff' ? (
          <PatientRoomWhiteboard patient={patient} staff={staff} />
        ) : (
          <PatientWhiteboard patient={patient} staff={staff} />
        )
      ) : null}
    </section>
  );
}