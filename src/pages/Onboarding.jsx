import { Navigate } from 'react-router-dom';

/** @deprecated Use /welcome for user onboarding; /onboarding is organization setup. */
export default function OnboardingRedirect() {
  return <Navigate to="/welcome" replace />;
}
