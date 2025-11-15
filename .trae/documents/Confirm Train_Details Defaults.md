## Goal
Remove UI inputs that ask for database names and keep defaults: `rac` for Stations DB and `PassengersDB` for Passengers DB.

## Changes (Frontend)
1. Update `frontend/src/pages/ConfigPage.jsx` initial state:
   - Set `stationsDb: 'rac'` and `passengersDb: 'PassengersDB'`.
   - Remove `sameDb` from state entirely.
2. Stations section:
   - Remove the "Database" input field; keep the "Collection" input as-is.
3. Passengers section:
   - Remove the "Use same database as Stations" checkbox.
   - Remove the "Database" input field; keep the "Collection" input as-is.
4. Submit payload:
   - Use `passengersDb: form.passengersDb` directly (no same-db logic).
   - Continue sending `stationsDb` from state (now defaulted to `rac`).

## Backend Compatibility
- `backend/config/db.js` requires `mongoUri`, `stationsDb`, `passengersDb`, `stationsCollection`, `passengersCollection` — these remain provided by the frontend, with DBs defaulted.
- Train_Details continues to default to `stationsDb` and `Trains_Details`.

## Verification
- Build and run the frontend; verify no errors.
- In the Config page:
  - Confirm DB inputs are gone; only collection inputs remain for Stations and Passengers.
  - Apply configuration and ensure backend connects to `rac` (Stations) and `PassengersDB` (Passengers).

## Notes
- No other parts of the UI or API are changed.
- If you want, we can display read-only labels showing the default DB names for clarity instead of inputs.