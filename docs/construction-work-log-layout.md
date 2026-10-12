# General construction work log layout

The collection table displays the workbook's 15 columns individually, with two header rows and merged groups for work details, four axes, and time. Section is additionally displayed when the selected site has more than one section. Editing continues to use a modal and the existing admin/construction-site-manager role checks.

On small screens the table scrolls inside its own viewport, retaining the spreadsheet headers and all columns. Other workspace tabs keep their existing responsive layouts.

Readiness is optional and is selected as a numeric percentage: 10, 20, ..., 100. If an older record has a different percentage, select a permitted value or clear it before saving; it is not silently rounded.

Axis controls show “Ось от” / “Ось до”; their original sequence remains letters from/to, then numbers from/to. Both letter and number lookups sort ascending by sort_order, name, and id. Apply backend migration 000078 and regenerate backend models before using this frontend. No new migration beyond the earlier axis-order change is required. This archive includes the regenerated frontend axis fields and editable ordering column.

Validation: TypeScript and production build passed; eight Vue setup runtime checks passed, including selected numeric readiness and invalid values. Excel header labels/spans and axis sort parameters were checked. Browser rendering could not be verified in this environment.
