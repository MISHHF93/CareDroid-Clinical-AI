import { useCareDroidUser, type UseCareDroidUserResult } from './useCareDroidUser';

export type UseCurrentUserResult = UseCareDroidUserResult;

export function useCurrentUser(): UseCurrentUserResult {
  return useCareDroidUser();
}

export default useCurrentUser;
