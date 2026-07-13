jest.mock('./rag.service', () => ({
  RAGService: class RAGService {},
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { RAGController } from './rag.controller';

describe('RAGController security', () => {
  it('requires JWT authorization and analytics permission', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, RAGController) as unknown[];
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, RAGController) as Permission[];

    expect(guards).toHaveLength(2);
    expect(permissions).toEqual([Permission.VIEW_ANALYTICS]);
  });
});
