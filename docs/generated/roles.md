# User roles

> Auto-generated from implementation. Do not edit manually.
> Regenerate: `npm run docs:generate`

**Entries:** 12

### Admin

Emergency role: admin

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `patient.create`, `patient.demographics.edit`, `encounter.create`, `intake.verify`, `triage.assign_acuity`, `queue.move`, `reassessment.complete`, `vitals.write`, `notes.write`, `flags.manage`, `ems.handoff.complete`, `ems.prepareBay`, `ems.convertArrival`, `ems.requestTransport`, `referral.create`, `transfers.manage`, `capacity.manage`, `boarding.manage`, `workload.reassign`, `patient.escalate`, `reception.escalate`, `patient.discharge`, `patient.assignStaff`, `patient.assignRoom`, `copilot.use`, `analytics.view`, `simulation.run`, `settings.manage`, `display.public.waitboard`, `display.public.publish`, `display.whiteboard.readonly`, `screen.admin`, `screen.command_center`, `screen.charge_nurse`, `screen.triage`, `screen.registration`, `screen.physician`, `screen.ems`

### IT Admin

Emergency role: it_admin

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `settings.manage`, `screen.admin`, `analytics.view`

### ED Manager

Emergency role: ed_manager

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `queue.move`, `reassessment.complete`, `referral.create`, `transfers.manage`, `capacity.manage`, `boarding.manage`, `workload.reassign`, `copilot.use`, `analytics.view`, `simulation.run`, `settings.manage`, `display.public.publish`, `display.whiteboard.readonly`, `screen.command_center`, `screen.charge_nurse`

### Charge Nurse

Emergency role: charge_nurse

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `patient.create`, `patient.demographics.edit`, `encounter.create`, `triage.assign_acuity`, `queue.move`, `reassessment.complete`, `vitals.write`, `notes.write`, `flags.manage`, `ems.handoff.complete`, `ems.prepareBay`, `ems.convertArrival`, `referral.create`, `transfers.manage`, `capacity.manage`, `boarding.manage`, `workload.reassign`, `patient.escalate`, `copilot.use`, `analytics.view`, `display.whiteboard.readonly`, `screen.charge_nurse`, `screen.command_center`

### Triage Nurse

Emergency role: triage_nurse

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `patient.create`, `patient.demographics.edit`, `encounter.create`, `intake.verify`, `triage.assign_acuity`, `queue.move`, `reassessment.complete`, `vitals.write`, `notes.write`, `flags.manage`, `patient.escalate`, `ems.handoff.complete`, `ems.prepareBay`, `ems.convertArrival`, `copilot.use`, `screen.triage`, `screen.registration`

### Physician

Emergency role: physician

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `patient.demographics.edit`, `queue.move`, `reassessment.complete`, `vitals.write`, `notes.write`, `flags.manage`, `patient.escalate`, `patient.discharge`, `referral.create`, `transfers.manage`, `ems.requestTransport`, `copilot.use`, `analytics.view`, `display.whiteboard.readonly`, `screen.physician`

### Registration Clerk

Emergency role: registration_clerk

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `patient.create`, `patient.demographics.edit`, `encounter.create`, `intake.verify`, `ems.convertArrival`, `reception.escalate`, `copilot.use`, `screen.registration`

### EMS User

Emergency role: ems_user

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `patient.create`, `ems.prepareBay`, `ems.convertArrival`, `ems.handoff.complete`, `display.whiteboard.readonly`, `screen.ems`

### Dispatcher

Emergency role: dispatcher

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `patient.create`, `ems.prepareBay`, `display.whiteboard.readonly`, `screen.ems`

### EMS Coordinator

Emergency role: ems_coordinator

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `patient.create`, `ems.prepareBay`, `ems.convertArrival`, `ems.handoff.complete`, `analytics.view`, `display.whiteboard.readonly`, `screen.ems`, `screen.command_center`

### Read-Only Display

Emergency role: read_only_viewer

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `analytics.view`, `display.public.waitboard`, `display.whiteboard.readonly`, `display.public.publish`

### Public Display

Emergency role: public_display

- **Source:** `emergencyRolePermissions.ts`
- **Permissions:** `display.public.waitboard`, `display.public.publish`
