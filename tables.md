# Bassh Database Tables Schema

This document contains the complete schema for all database tables in the Bassh platform.

---

## Table of Contents

- [customers](#customers)
- [clubs](#clubs)
- [events](#events)
- [event_ticket_pricing](#event_ticket_pricing)
- [bookings](#bookings)
- [transactions](#transactions)
- [reviews](#reviews)
- [discounts](#discounts)
- [discount_events](#discount_events)
- [bookmarks](#bookmarks)
- [notifications](#notifications)

---

## customers

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | — |
| email | text | ✅ | null |
| first_name | text | ✅ | null |
| last_name | text | ✅ | null |
| username | text | ✅ | null |
| phone_number | text | ✅ | null |
| gender | text | ✅ | null |
| dob | date | ✅ | null |
| instagram | text | ✅ | null |
| twitter | text | ✅ | null |
| snapchat | text | ✅ | null |
| avatar_url | text | ✅ | null |
| onboarding_completed | boolean | ❌ | false |
| wallet_balance | numeric | ❌ | 0 |
| created_at | timestamptz | ❌ | now() |
| updated_at | timestamptz | ❌ | now() |

---

## clubs

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | — |
| club_name | text | ❌ | — |
| club_email | text | ❌ | — |
| club_token | text | ❌ | — |
| address_text | text | ✅ | null |
| latitude | double | ✅ | null |
| longitude | double | ✅ | null |
| guest_count | integer | ✅ | 0 |
| rating | numeric | ✅ | 0 |
| tier | integer | ✅ | null |
| prices | jsonb | ❌ | {} |
| opening_hours | jsonb | ❌ | [] |
| gallery | jsonb | ❌ | [] |
| club_desc | text | ✅ | null |
| club_logo | text | ✅ | null |
| cover_photo | text | ✅ | null |
| notes | text | ✅ | null |
| terms_and_conditions | text | ✅ | null |
| privacy_policy | text | ✅ | null |
| insta_link | text | ✅ | null |
| facebook_link | text | ✅ | null |
| twitter_link | text | ✅ | null |
| phone_number | text | ✅ | null |
| contact_email | text | ✅ | null |
| created_at | timestamptz | ✅ | now() |

---

## events

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | gen_random_uuid() |
| club_id | uuid | ❌ | — |
| name | text | ❌ | — |
| event_date | date | ❌ | — |
| start_time | time | ❌ | — |
| max_attendees | integer | ✅ | null |
| age_limit | text | ✅ | null |
| categories | text[] | ✅ | {} |
| about | text | ✅ | null |
| terms_and_conditions | text | ✅ | null |
| dj_name | text | ✅ | null |
| dj_instagram | text | ✅ | null |
| dj_image_url | text | ✅ | null |
| banner_image_url | text | ✅ | null |
| created_at | timestamptz | ✅ | now() |
| updated_at | timestamptz | ✅ | now() |

---

## event_ticket_pricing

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | gen_random_uuid() |
| event_id | uuid | ❌ | — |
| label | text | ❌ | — |
| price | numeric | ❌ | — |
| stag_price | bigint | ✅ | null |
| couple_price | bigint | ✅ | null |
| created_at | timestamptz | ✅ | now() |

---

## bookings

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | gen_random_uuid() |
| user_id | uuid | ❌ | — |
| event_id | uuid | ✅ | null |
| club_id | uuid | ✅ | null |
| bookmark_type | text | ❌ | — |
| created_at | timestamptz | ❌ | timezone('utc', now()) |
| updated_at | timestamptz | ❌ | timezone('utc', now()) |

---

## transactions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | gen_random_uuid() |
| user_id | uuid | ❌ | — |
| booking_id | uuid | ✅ | null |
| club_id | uuid | ✅ | null |
| event_id | uuid | ✅ | null |
| amount | numeric | ❌ | — |
| status | text | ❌ | — |
| is_wallet | boolean | ❌ | false |
| wallet_added | boolean | ✅ | null |
| wallet_used | boolean | ✅ | null |
| razorpay_order_id | text | ✅ | null |
| razorpay_payment_id | text | ✅ | null |
| created_at | timestamptz | ✅ | now() |

---

## reviews

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | gen_random_uuid() |
| user_id | uuid | ❌ | — |
| club_id | uuid | ❌ | — |
| event_id | uuid | ✅ | null |
| booking_id | uuid | ✅ | null |
| rating | integer | ❌ | — |
| comment | text | ✅ | null |
| is_verified | boolean | ✅ | false |
| is_hidden | boolean | ✅ | false |
| hidden_reason | text | ✅ | null |
| created_at | timestamptz | ✅ | now() |
| updated_at | timestamptz | ✅ | now() |

---

## discounts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | gen_random_uuid() |
| club_id | uuid | ❌ | — |
| name | text | ❌ | — |
| code | text | ❌ | — |
| discount_type | text | ❌ | — |
| discount_value | numeric | ❌ | — |
| min_purchase | numeric | ✅ | null |
| max_discount | numeric | ✅ | null |
| applicable_days | integer[] | ❌ | — |
| start_date | date | ❌ | — |
| end_date | date | ❌ | — |
| start_time | time | ✅ | null |
| end_time | time | ✅ | null |
| event_specific | boolean | ✅ | false |
| on_bill | boolean | ✅ | null |
| is_active | boolean | ✅ | true |
| used_times | integer | ❌ | 0 |
| description | text | ✅ | null |
| exclusions | text | ✅ | null |
| created_at | timestamptz | ✅ | now() |
| updated_at | timestamptz | ✅ | now() |

---

## discount_events

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| discount_id | uuid | ❌ | — |
| event_id | uuid | ❌ | — |
| created_at | timestamptz | ✅ | now() |

---

## bookmarks

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | gen_random_uuid() |
| user_id | uuid | ❌ | — |
| event_id | uuid | ✅ | null |
| club_id | uuid | ✅ | null |
| bookmark_type | text | ❌ | — |
| created_at | timestamptz | ❌ | timezone('utc', now()) |
| updated_at | timestamptz | ❌ | timezone('utc', now()) |

---

## notifications

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | ❌ | uuid_generate_v4() |
| user_id | uuid | ❌ | — |
| title | text | ❌ | — |
| message | text | ❌ | — |
| type | text | ✅ | 'general' |
| metadata | jsonb | ✅ | {} |
| is_read | boolean | ✅ | false |
| read_at | timestamptz | ✅ | null |
| created_at | timestamptz | ✅ | now() |
| updated_at | timestamptz | ✅ | now() |
