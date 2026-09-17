# STYLD — REST API Contracts & Specification

This specification documents active and prepared endpoints for web, iOS, and Android clients.

---

## Standard Error Response Envelope

All error responses adhere to a predictable JSON envelope:

```json
{
  "ok": false,
  "error": "Human-readable description of error."
}
```

Standard HTTP Status Codes:
- `400 Bad Request`: Validation failure, invalid transition, or malformed body.
- `401 Unauthorized`: Missing or invalid session cookie/token.
- `403 Forbidden`: Insufficient role permissions or IDOR violation.
- `404 Not Found`: Resource does not exist.
- `409 Conflict`: Replay, duplicate review, or state lock conflict.
- `429 Too Many Requests`: Rate limit reached.
- `500 Internal Error`: Sanitized server error.

---

## 1. Authentication Endpoints

### `GET /api/auth/whatsapp`
- **Auth**: Public
- **Purpose**: Diagnostics and readiness check for WhatsApp OTP availability.
- **Response `200 OK`**:
  ```json
  {
    "available": true,
    "devMode": false,
    "channel": "whatsapp"
  }
  ```

### `POST /api/auth/whatsapp`
- **Auth**: Public (Browser challenge bound)
- **Body**:
  ```json
  {
    "action": "start" | "verify" | "complete",
    "phone": "+254712345678",
    "code": "123456",
    "challengeToken": "opaque-uuid",
    "firstName": "Wangari",
    "password": "optional-password"
  }
  ```
- **Rate Limit**: Max 3 requests per phone / 10 minutes.

### `GET /api/me`
- **Auth**: Session Cookie
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "user": {
      "id": "uuid",
      "firstName": "Wangari",
      "phone": "+2547****5678",
      "role": "client" | "professional" | "salon" | "admin",
      "displayName": "Wangari",
      "profileImageUrl": "https://res.cloudinary.com/..."
    }
  }
  ```

---

## 2. Booking Endpoints

### `POST /api/bookings`
- **Auth**: Required (`client`)
- **Body**:
  ```json
  {
    "localId": "client-uuid-for-idempotency",
    "providerSlug": "amani-braids",
    "providerName": "Amani Braids Studio",
    "targetType": "salons" | "professionals",
    "serviceNames": ["Knotless Braids", "Scalp Treatment"],
    "bookingDate": "2026-09-25",
    "bookingTime": "10:00 AM",
    "totalKES": 3500,
    "serviceMode": "salon" | "mobile",
    "notes": "Please use hypoallergenic braiding hair."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "bookingId": "uuid",
    "status": "pending"
  }
  ```

### `GET /api/bookings`
- **Auth**: Required
- **Query Parameters**:
  - `role=provider`: List bookings assigned to authenticated professional/salon.
  - Default: List bookings created by authenticated client.
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "bookings": [
      {
        "id": "uuid",
        "provider_name": "Amani Braids Studio",
        "service_names": ["Knotless Braids"],
        "booking_date": "2026-09-25",
        "booking_time": "10:00 AM",
        "total_kes": 3500,
        "status": "accepted",
        "payment_status": "pending"
      }
    ]
  }
  ```

### `PATCH /api/bookings`
- **Auth**: Required (Ownership enforced)
- **Body**:
  ```json
  {
    "bookingId": "uuid",
    "status": "accepted" | "declined" | "cancelled" | "completed",
    "bookingDate": "2026-09-26",
    "bookingTime": "11:00 AM",
    "reason": "Client requested alternate morning slot"
  }
  ```

---

## 3. Trust & Safety Endpoints

### `POST /api/reviews`
- **Auth**: Required (`client`)
- **Rules**: Must own the completed booking; max 1 review per booking.
- **Body**:
  ```json
  {
    "bookingId": "uuid",
    "rating": 5,
    "comment": "Exceptional attention to detail. Clean salon in Kilimani."
  }
  ```

### `POST /api/reports`
- **Auth**: Required
- **Body**:
  ```json
  {
    "targetType": "user" | "provider" | "booking" | "post",
    "targetId": "uuid",
    "reason": "Unprofessional conduct / no-show",
    "notes": "Provider did not arrive for scheduled home service appointment."
  }
  ```

### `POST /api/blocks`
- **Auth**: Required
- **Body**:
  ```json
  {
    "blockedId": "uuid"
  }
  ```

---

## 4. Analytics Telemetry

### `POST /api/analytics`
- **Auth**: Optional (accepts anonymous or authenticated telemetry)
- **Body**:
  ```json
  {
    "eventName": "search_completed",
    "anonymousId": "anon-uuid",
    "properties": {
      "category": "hair",
      "zone": "kilimani"
    }
  }
  ```
