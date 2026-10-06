# CareDroid — Responsible AI Governance & Clinical Safety Framework

**Document Version:** 2.2.0  
**Status:** Living Governance Specification  
**Lead Authors:** Chief AI Ethics Officer, Clinical Medical Director, Regulatory Lead  
**Regulatory Guidance:** Health Canada SaMD Guidelines, FDA Clinical Decision Support (CDS) Guidance, EU AI Act (High-Risk Classification)  

---

## 1. Ethical AI Principles in Acute Care

CareDroid establishes five non-negotiable principles for all artificial intelligence and machine learning modules deployed across acute healthcare settings:

1. **Primacy of Human Clinical Judgment:** AI models are assistive decision support tools; they never usurp or bypass licensed clinical authority.
2. **Deterministic Arithmetic:** Numerical clinical calculations (drug dosing, clearance rates, physical trauma scales) must run on 100% deterministic code paths, completely isolated from generative LLMs.
3. **Continuous Bias & Disparity Auditing:** Automated regular evaluations ensure triage recommendations do not reflect demographic, gender, age, or socioeconomic bias.
4. **Transparent Explainability & Provenance:** Every AI suggestion must surface its input features, confidence intervals, and reference literature.
5. **No Synthetic Patient Data in Foundational Model Training:** Real patient data is never transmitted to public or shared model training pipelines.

---

## 2. Regulatory Alignment & Classification

| Jurisdiction | Regulatory Body | Classification / Guidance | Compliance Architecture |
| :--- | :--- | :--- | :--- |
| **Canada** | Health Canada | Software as a Medical Device (SaMD) Class II | Deterministic CDS falls under exempt decision support; generative notes maintain human review barrier. |
| **United States** | US FDA | Section 520(o) Non-Device CDS | Clinicians can independently review the basis for the recommendation; transparent formulas. |
| **European Union** | European Commission | EU AI Act — High-Risk AI System | Robust risk management system, high-quality training datasets, post-market surveillance logging. |

---

## 3. Disparity & Algorithmic Drift Monitoring

- **Acuity Disparity Watch:** Weekly statistical auditing compares CTAS triage distribution across demographic subsets to flag algorithmic under-triage.
- **Clinician Override Tracking:** Overrides of AI recommendations are aggregated and categorized (e.g., "AI recommended CTAS 3, nurse assigned CTAS 2 due to clinical intuition/subtle pallor"). High override rates trigger immediate clinical review and retraining.

---

