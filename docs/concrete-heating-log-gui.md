# Concrete heating log GUI

Apply pending migrations through 000079 and restart the backend. Migration 000079 registers the heating journal route and menu for admin and construction_site_manager. The existing migration 000076 and journal access policies enforce CRUD access and current assigned-site restrictions, including create destinations and existing rows on updates/deletes.

The handwritten list service normalizes date-only placement filters before fetching the list projection; rows and totals retain policy enforcement. The schema marks list as manual so code generation preserves it.

The frontend adds a “Прогрев бетона” workspace tab and a standalone “Журнал прогрева бетона” menu page. It includes the Excel columns and merged measurement header, date range, permitted-site and section filters, and modal CRUD.

Three optional temperature fields use integer dropdowns from -30 to 38 °C inclusive. Measurement timestamp and concrete temperature must be supplied or cleared together. Placement dates are calendar dates; measurement timestamps are entered/displayed in the browser's local time. Editing other fields preserves an unchanged timestamp including its seconds and milliseconds. Each record stores one measurement, as in the existing schema. Specimen strength is entered in MPa.

Narrow-screen tables scroll within their own viewport and keep all spreadsheet headers visible. Existing general work-log and other workspace improvements are included.

Validation: full backend tests, both application builds, frontend TypeScript/production build, heating GUI runtime checks, Excel header/span checks, and service regeneration comparison passed. Browser visual verification and live database migration testing were not available.
