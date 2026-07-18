import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { CollaborationHubController } from './collaboration-hub.controller';

describe('CollaborationHubController', () => {
  // Every other route here is intentionally ungated beyond JWT auth --
  // CollaborationHubService.assertAccess() enforces channel-membership
  // instead (the same Slack/Teams-style model the controller's own header
  // comment documents), so a random authenticated user still can't read or
  // post into a channel they haven't joined. getPatientThread is different:
  // it's the entry point that GRANTS membership to a patient's clinical
  // thread in the first place, for any patientId the caller supplies, with
  // no PHI-specific check at all before this fix -- any authenticated user
  // in the org could join and read/post into any patient's thread.
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CollaborationHubController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('getPatientThread requires READ_PHI permission', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      CollaborationHubController.prototype.getPatientThread,
    );
    expect(permissions).toEqual([Permission.READ_PHI]);
  });

  it('the rest of the routes stay membership-scoped, not permission-gated', () => {
    const membershipScopedMethods: Array<keyof CollaborationHubController> = [
      'listChannels',
      'createChannel',
      'archiveChannel',
      'listMessages',
      'postMessage',
      'editMessage',
      'deleteMessage',
      'addReaction',
      'removeReaction',
      'pinMessage',
      'unpinMessage',
      'listPinned',
      'markRead',
      'updateMembership',
      'typing',
      'uploadAttachment',
      'linkExternalProvider',
      'unlinkExternalProvider',
      'search',
      'createIncident',
      'resolveIncident',
      'analyticsSummary',
    ];
    for (const method of membershipScopedMethods) {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        CollaborationHubController.prototype[method],
      );
      expect(permissions).toBeUndefined();
    }
  });
});
