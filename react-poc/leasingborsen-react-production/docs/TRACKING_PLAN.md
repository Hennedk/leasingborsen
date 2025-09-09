# Tracking Plan: Lease Terms Events

This document defines two analytics events for the listing detail terms editor and deprecates `lease_config_change`.

Deprecated:
- lease_config_change — removed

New events:
- lease_terms_open — when the editor is opened
- lease_terms_apply — when a new selection is committed

Base props are added automatically (schema_version, session_id, device_type, path, referrer_host).

## lease_terms_open
- Trigger: first open of the editor (desktop dropdown expand, mobile drawer/modal open)
- Throttle: ignore reopen within 2000ms (per listing)
- Payload:
  {
    listing_id: string,
    ui_surface: "dropdown" | "drawer" | "modal" | "inline",
    trigger_source: "chip" | "button" | "control" | "auto" | "other",
    config_session_id: string,
    current_selection?: {
      pricing_id?: string,
      mileage_km_per_year?: number,
      term_months?: number,
      first_payment_dkk?: number
    },
    editable_fields?: ["mileage_km_per_year","term_months","first_payment_dkk"],
    options_count?: number,
    initial_field_open?: "mileage_km_per_year" | "term_months" | "first_payment_dkk"
  }

Example:
{
  listing_id: "abc-123",
  ui_surface: "dropdown",
  trigger_source: "control",
  config_session_id: "8b1f9b8a-74d6-4f3a-9d9e-2fca52a5e1fd",
  current_selection: { mileage_km_per_year: 15000, term_months: 36, first_payment_dkk: 0 },
  editable_fields: ["mileage_km_per_year","term_months","first_payment_dkk"],
  initial_field_open: "mileage_km_per_year"
}

## lease_terms_apply
- Trigger: when a new value is committed (select change, confirm button, or blur that commits)
- Debounce: 350ms (coalesce rapid toggles)
- No-op guard: do not emit if values equal previous
- Config: reuse the SAME `config_session_id` from the corresponding open
- Payload:
  {
    listing_id: string,
    mileage_km_per_year: number,
    term_months: number,
    first_payment_dkk: number,
    previous?: { mileage_km_per_year?: number, term_months?: number, first_payment_dkk?: number },
    changed_keys: ("mileage_km_per_year"|"term_months"|"first_payment_dkk")[],
    changed_keys_count: number,
    selection_method: "dropdown" | "matrix" | "chip",
    ui_surface: "dropdown" | "drawer" | "modal" | "inline",
    config_session_id: string,
    pricing_id?: string,
    monthly_price_dkk?: number
  }

Example:
{
  listing_id: "abc-123",
  mileage_km_per_year: 20000,
  term_months: 36,
  first_payment_dkk: 0,
  previous: { mileage_km_per_year: 15000, term_months: 36, first_payment_dkk: 0 },
  changed_keys: ["mileage_km_per_year"],
  changed_keys_count: 1,
  selection_method: "dropdown",
  ui_surface: "drawer",
  config_session_id: "8b1f9b8a-74d6-4f3a-9d9e-2fca52a5e1fd",
  pricing_id: "p_abc",
  monthly_price_dkk: 3499
}

## Router rule
- If only `km`, `mdr`, `udb` change in the listing detail URL, suppress `page_view` and emit `lease_terms_apply` with `ui_surface: "inline"` and `selection_method: "chip"`.
- A new `config_session_id` is generated for this path if an open was not observed.

## Desktop vs Mobile
- Desktop dropdowns send `ui_surface: "dropdown"`, trigger `lease_terms_open` on first expand, and `lease_terms_apply` on commit.
- Mobile drawer sends `ui_surface: "drawer"`, triggers `lease_terms_open` on open and `lease_terms_apply` on commit.

