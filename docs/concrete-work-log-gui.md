# Concrete work log GUI

Apply pending migrations through `000080` and restart the backend. Migration `000080` registers the `concreteWorkLogs` route at `/concrete-work-logs` and its menu entries for admin and construction site manager. It also supplies an active concrete type row for each missing canonical design-class choice: `В7,5`, `В12,5`, `В25`, `В30`, and `В35`.

The design-class dropdown continues to store `design_concrete_type_id`, as defined in the existing schema. The list projection supplies `design_strength_class` for display. These class choices are independent of the full mix designation in `concrete_type_id`; measured actual strengths remain numeric values. Migration `000080` preserves existing catalogue names, IDs, active states, classes, and journal references. Rollback retains any inserted catalogue rows that are now referenced or were edited.

Both admin and construction site manager already have list, detail, create, update, and delete method grants from migration `000076`. They also have read access to suppliers, concrete types, building elements, axes, and elevations. Admin can access all journal entries. Construction site managers can access only their currently assigned sites, including the original entry and any submitted destination on update. The new list method retains these policy restrictions for both rows and totals.

Concrete placement dates retain their time component. Calendar filters are normalized before model validation; a date range should use an inclusive start and an exclusive midnight after the selected end date to include every placement on that final day. The schema marks the handwritten list method as manual so regeneration preserves this behavior.

The frontend displays all 19 spreadsheet columns and grouped headers, with permitted-site, section and placement-date filters. Editing uses a modal. Its outdoor temperature input uses the reusable `TemperatureSelect` component (-30 to 38 °C, step 1), shared with all three heating-journal temperature fields. `ConcreteStrengthClassSelect` shares canonical choices from `src/constants/concreteStrengthClasses.ts`.

The design dropdown maps a selected class to an active concrete type with matching strength_class. Latin B and decimal-dot class labels are recognized alongside the canonical Cyrillic В/comma labels. Existing matching references remain intact, including retired entries already used by an edited record. Missing class catalogue data blocks saving rather than discarding the choice. Measured actual class/strength values remain numeric.

The modal and list display placement timestamps in browser local time. Updating other fields preserves the original timestamp, including milliseconds. On narrow screens the table scrolls inside its own viewport so the full Excel header hierarchy remains readable.

Validation: full backend tests and both builds passed; generated services match fresh code generation. Frontend TypeScript/production build, shared-selector runtime checks, concrete/heating/general journal runtime checks, named routes, and Excel captions/spans passed. Live database migration execution and browser visual verification were unavailable. Rebuilt dist and previous GUI changes are included.
