# P1 Shared Modules

P1 extends the R$0/self-hosted/open-source ArtiSys core with eight generic capabilities:

- `artisys-contracts`
- `artisys-deadlines`
- `artisys-compliance`
- `artisys-inspections`
- `artisys-occurrences`
- `artisys-measurements`
- `artisys-costing`
- `artisys-document-templates`

The base canonical catalogs remain stable and the P1 entries are loaded from `catalog/modules.p1.json` and `catalog/module-display.p1.pt-BR.json` by the central verifier. This keeps IDs and existing automation stable while making P1 part of the verified module inventory.

## Boundary

These modules provide generic records, calculations and lifecycle primitives only. Vehicle, EPI, livestock, crop, freight, PMOC, procurement, tender, rental, tool and agricultural-machine rules belong in consuming vertical repositories.

The same delivery also hardens `artisys-audit-log`, `artisys-sync`, `artisys-inventory`, `artisys-reporting`, `artisys-backup`, `artisys-os` and `artisys-dashboard` additively, preserving their existing APIs.
