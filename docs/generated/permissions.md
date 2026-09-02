# Permissions

> Auto-generated from implementation. Do not edit manually.
> Regenerate: `npm run docs:generate`

**Entries:** 38

### Create patient

Register new patients and walk-ins.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `patient.create`

### Edit demographics

Update identity and demographic fields during intake.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `patient.demographics.edit`

### Create encounter

Open clinical encounters after registration.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `encounter.create`

### Verify intake

Complete identity verification and Smart Intake review.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `intake.verify`

### Assign triage acuity

Record triage priority and acuity assignment.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `triage.assign_acuity`

### Move queue

Advance patients between journey states and queues.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `queue.move`

### Complete reassessment

Clear reassessment tasks and document review.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `reassessment.complete`

### Write vitals

Record patient vital signs.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `vitals.write`

### Write notes

Add clinical and operational notes.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `notes.write`

### Manage flags

Add or clear patient safety flags.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `flags.manage`

### Complete EMS handoff

Finalize ambulance offload and handoff checklist.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `ems.handoff.complete`

### Prepare EMS bay

Stage receiving area for inbound EMS.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `ems.prepareBay`

### Convert EMS arrival

Convert pre-arrival EMS unit to registered patient.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `ems.convertArrival`

### Request emergency transport

Physician-initiated SIMULATED emergency transport request from a patient chart -- not connected to a real ambulance or dispatch system.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `ems.requestTransport`

### Create referral

Initiate specialty referrals and consult requests.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `referral.create`

### Manage transfers

Coordinate inter-facility transfers.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `transfers.manage`

### Manage capacity

Adjust capacity thresholds and surge posture.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `capacity.manage`

### Manage boarding

Admission boarding workflow controls.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `boarding.manage`

### Reassign workload

Shift staff assignments and workload balancing.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `workload.reassign`

### Escalate patient

Clinical escalation for deteriorating patients.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `patient.escalate`

### Reception escalate

Front-desk escalation to triage or charge nurse.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `reception.escalate`

### Discharge patient

Complete discharge workflow.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `patient.discharge`

### Assign staff

Assign responsible clinicians to patients.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `patient.assignStaff`

### Assign room

Assign patient care locations and rooms.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `patient.assignRoom`

### Use copilot

Access CareDroid Copilot.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `copilot.use`

### View analytics

Open operational analytics surfaces.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `analytics.view`

### Run simulation

Execute ED simulation scenarios.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `simulation.run`

### Manage settings

Configure tenant CareDroid settings.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `settings.manage`

### Public waiting board

View aggregate public waiting-room wall display.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `display.public.waitboard`

### Publish public display

Publish or update public waiting-room and hallway wall displays.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `display.public.publish`

### Read-only whiteboard

View departmental read-only whiteboard display.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `display.whiteboard.readonly`

### Triage screen

Operate triage nurse screen mode.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `screen.triage`

### Registration screen

Operate reception registration screen mode.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `screen.registration`

### Charge nurse screen

Operate charge nurse command screen mode.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `screen.charge_nurse`

### Physician screen

Operate physician clinical screen mode.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `screen.physician`

### EMS screen

Operate EMS handoff screen mode.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `screen.ems`

### Command center screen

Operate department command center display.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `screen.command_center`

### Admin screen

Operate site admin configuration screen mode.

- **Source:** `emergencyPermissionRegistry.ts`
- **Permissions:** `screen.admin`
