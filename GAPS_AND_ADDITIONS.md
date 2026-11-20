# Gaps & Architectural Additions Register

This document tracks product gaps, missing capabilities, and new features introduced during end-to-end quality assurance.

---

### 1. Implemented Features & Additions

| ID | Title | Priority | Business Justification | Status |
|:---|:---|:---:|:---|:---:|
| **GAP-01** | **Global System Settings Cockpit (`/settings`)** | High | Users previously had no centralized dashboard to review all active configurations across branding, numbering, financial controls, and Tally gateway. | Implemented |
| **GAP-02** | **Three-Persona Accounting Mode Switcher** | Critical | Solo traders and invoicing-only users were overwhelmed by Tally bridges, journal entries, and BRS. CAs needed Tally sync. Added `Standalone Cloud`, `Tally Prime Sync`, and `Invoicing Only` modes. | Implemented |
| **GAP-03** | **Dynamic Invoicing-Only Adaptive Sidebar** | High | Invoicing-only companies now see a streamlined 3-section sidebar (`Billing & Sales`, `Collections & Payments`, `Setup & Branding`), hiding all complex accounting clutter. | Implemented |
| **GAP-04** | **Client-Side Smart Canvas Image Optimization** | Medium | High-resolution 4K/8K logos caused network lag and storage bloat. Added automatic client-side canvas scaling to 1200px (crystal-clear 300 DPI for A4 print). | Implemented |
| **GAP-05** | **Statutory Amount in Words on Modern Template** | High | GST Rule 46 requires `Amount Chargeable (in words)`. Integrated `numberToIndianWords` into `ModernBrandTemplate`. | Implemented |
| **GAP-06** | **Conditional Tally Ledger & Group Aliases** | Medium | Hidden technical Tally alias inputs in Chart of Accounts modals when Tally is disabled to prevent confusion for non-Tally users. | Implemented |
| **GAP-07** | **Interactive Tally Prime Controller in Global Settings** | High | Users and CAs can toggle Tally synchronization ON/OFF with a single click directly from `/settings`. | Implemented |

---

### 2. Proposed Future Enhancements (For Stakeholder Decision)

| ID | Title | Priority | Proposed Architecture |
|:---|:---|:---:|:---|
| **PROP-01** | **Direct Local DSC Signer Bridge (emSigner Utility)** | Medium | A lightweight local desktop utility (Node.js/Go) running on `http://127.0.0.1:1585` to enable 1-click browser signing with physical USB tokens without opening Adobe Acrobat. |
| **PROP-02** | **Direct WhatsApp Invoice Dispatch via Cloud API** | Medium | Integration with Meta WhatsApp Business Cloud API to dispatch signed PDF invoices and UPI payment links with delivery status webhooks. |
| **PROP-03** | **Direct GSTN / IRP e-Invoice API Gateway** | High | Direct integration with NIC / ClearTax / Cygnet GSP to push B2B invoices and receive signed QR codes and IRN (Invoice Reference Numbers) automatically. |

