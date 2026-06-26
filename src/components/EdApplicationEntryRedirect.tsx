import { Navigate, useLocation } from 'react-router-dom';
import { getEdApplicationHomeRoute } from '../config/edApplication.config';

/**
 * Platform entry aliases (/start, /) resolve to the ED application home — not a separate product shell.
 */
export default function EdApplicationEntryRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: getEdApplicationHomeRoute(), search: location.search, hash: location.hash }}
      replace
    />
  );
}