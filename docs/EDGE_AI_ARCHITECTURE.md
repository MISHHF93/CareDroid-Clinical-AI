# CareDroid — Edge AI & Low-Latency Biometrics Processing

**Document Version:** 2.2.0  
**Status:** Living Edge Architecture Specification  
**Lead Authors:** Principal Embedded Systems Architect, Edge ML Engineer  

---

## 1. Edge Processing Rationale

In critical resuscitation and acute trauma care, high-frequency vital signs (e.g. 500 Hz multi-lead ECG, continuous photoplethysmography) cannot rely solely on wide-area cloud connections due to latency variance, jitter, and intermittent internet dropouts. CareDroid deploys **Clinical Edge Gateways** on-premise within the hospital network.

```mermaid
flowchart LR
    Monitors[Patient Bedside Monitors] -->|Raw 500Hz Stream| Edge[CareDroid Clinical Edge Gateway]
    Edge -->|Local Feature Extraction & Filtering| EdgeML[Quantized ONNX Sepsis / Arrhythmia Detector]
    EdgeML -->|Instant Local Alert (<50ms)| BedsideAlarm[Bedside Terminal Alert]
    Edge -->|Downsampled 1Hz Stream| CloudCore[CareDroid Cloud Core & Whiteboard]
```

---

## 2. Quantized Model Deployment

- **Edge Runtime:** ONNX Runtime / TensorRT running on local hospital server nodes or specialized edge appliances.
- **Model Quantization:** INT8 / FP16 quantized models for continuous arrhythmia detection and QRS-interval drift monitoring.
- **Fail-Safe Offline Mode:** If cloud communication severed, edge gateways retain complete local autonomous alerting and recording capabilities indefinitely.

---

