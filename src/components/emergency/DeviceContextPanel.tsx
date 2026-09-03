import useEmergencyDeviceContext from '../../hooks/useEmergencyDeviceContext';
import './DeviceContextPanel.css';

export default function DeviceContextPanel({ compact = false, className = '' }) {
  const deviceContext = useEmergencyDeviceContext();

  return (
    <section
      className={['device-context-panel', compact ? 'device-context-panel--compact' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label="Workstation device context"
    >
      <header className="device-context-panel__header">
        <div>
          <p className="device-context-panel__eyebrow">This workstation</p>
          <h3>{compact ? 'Device context' : 'Multi-screen device mode'}</h3>
          {!compact ? (
            <p className="device-context-panel__subtitle">
              Bind this browser to a physical screen. The same user account can sign in on
              reception, triage, charge nurse, wall, waiting room, or manager devices without a
              separate app build.
            </p>
          ) : null}
        </div>
        {deviceContext.definition ? (
          <span
            className="device-context-panel__badge"
            data-kiosk={deviceContext.isKiosk || undefined}
          >
            {deviceContext.definition.label}
          </span>
        ) : null}
      </header>

      <label className="device-context-panel__field">
        <span>Device context</span>
        <select
          value={deviceContext.deviceContextId || ''}
          onChange={(event) =>
            deviceContext.setDeviceContext(event.target.value ? (event.target.value as any) : null)
          }
        >
          <option value="">Follow role and route defaults</option>
          {deviceContext.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {deviceContext.definition ? (
        <p className="device-context-panel__detail">{deviceContext.definition.description}</p>
      ) : (
        <p className="device-context-panel__detail">
          No workstation binding saved on this device. Choose a context to pin screen mode, landing
          route, and kiosk behavior locally.
        </p>
      )}

      <div className="device-context-panel__meta">
        {deviceContext.screenMode ? (
          <span>Screen mode: {deviceContext.screenMode.replace(/_/g, ' ')}</span>
        ) : null}
        {deviceContext.landingRoute ? <span>Landing: {deviceContext.landingRoute}</span> : null}
        {deviceContext.isKiosk ? <span>Kiosk / wall display active</span> : null}
      </div>

      {deviceContext.deviceContextId ? (
        <button
          type="button"
          className="device-context-panel__clear"
          onClick={() => deviceContext.clearDeviceContext()}
        >
          Clear workstation binding
        </button>
      ) : null}
    </section>
  );
}
