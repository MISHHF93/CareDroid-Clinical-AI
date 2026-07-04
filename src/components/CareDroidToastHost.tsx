import { Toaster } from 'sonner';
import { CARE_DROID_INTERACTION } from '../config/careDroidInteractionModel';
import './CareDroidToastHost.css';

/** Minimal toasts for user feedback only — operational alerts use the notification center. */
export default function CareDroidToastHost() {
  return (
    <Toaster
      className="caredroid-toast-host"
      position="top-center"
      visibleToasts={1}
      duration={CARE_DROID_INTERACTION.feedbackDurationMs}
      closeButton
      richColors={false}
      expand={false}
      gap={6}
      toastOptions={{
        classNames: {
          toast: 'caredroid-toast',
          title: 'caredroid-toast__title',
          description: 'caredroid-toast__description',
          closeButton: 'caredroid-toast__close',
        },
      }}
    />
  );
}