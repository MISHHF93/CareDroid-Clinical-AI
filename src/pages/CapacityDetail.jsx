import { MEDICAL_THEME } from '../config/medicalTheme.constants';
export default function CapacityDetail() {
  return (
    <div style={{padding:24}}>
      <h1 style={{fontSize:20,fontWeight:500,
        color: 'var(--medical-ink, #111827)'}}>Capacity Detail</h1>
      <p style={{color:MEDICAL_THEME.inkSubtle,marginTop:8}}>
        Loading department data...</p>
    </div>
  );
}
