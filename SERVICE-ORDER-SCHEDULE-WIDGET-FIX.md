# Service Order Schedule Widget - Implementation & Fix

## Overview
Added a dedicated schedule widget to the service order detail page that allows users to view and edit scheduled start and end dates using Medusa native components and patterns.

## Issue Fixed
**Error:** `{"error":"Failed to update service order schedule","details":"Unknown error"}`

**Root Cause:** The workflow's status history creation step was using an incorrect method signature for `createServiceOrderStatusHistories`. The method expected:
- `to_status` (not `status`)
- `changed_at` (Date object)
- `reason` (not `comment`)

**Solution:** Updated the workflow to:
1. Use the correct method signature with proper field names
2. Added try-catch to prevent status history failures from breaking the entire schedule update
3. Log warnings instead of failing when status history creation fails

## Files Created

### `src/admin/components/widgets/service-order-schedule.tsx`
A new widget component following Medusa UI patterns with:

**Features:**
- View mode showing scheduled dates and duration
- Edit mode with DatePicker components (with time selection)
- Validation rules:
  - Start date must be before end date
  - Minimum duration of 30 minutes
  - Both dates must be set together or both null
- Clear schedule button to remove dates
- Optimistic UI updates with React Query
- Toast notifications for success/error states
- Proper loading states

**Medusa Components Used:**
- `Container` - Widget container
- `Heading` - Section title
- `Label` - Form labels
- `Text` - Display text
- `Button` - Actions
- `DatePicker` - Date/time selection with `showTimePicker`
- `toast` - User feedback
- `Calendar` icon - Visual indicator

**Integration:**
- Uses existing `/admin/service-orders/:id/schedule` API endpoint
- Integrates with `updateServiceOrderScheduleWorkflow`
- Invalidates React Query cache on success
- Follows two-column layout pattern

## Files Modified

### `src/admin/routes/service-orders/[id]/page.tsx`
- Added import for `ServiceOrderScheduleWidget`
- Added widget to sidebar between Overview and Characteristics widgets

### `src/workflows/service-orders/update-service-order-schedule.ts`
- Fixed `createServiceOrderStatusHistories` method call
- Changed `status` → `to_status`
- Changed `comment` → `reason`
- Added `changed_at` field
- Wrapped in try-catch to prevent failures from breaking the workflow
- Added console warning for debugging

## User Experience

### View Mode
When not scheduled:
- Shows calendar icon
- "No schedule set" message
- Helpful hint to click edit

When scheduled:
- Displays formatted start date/time
- Displays formatted end date/time
- Shows calculated duration (e.g., "2h 30m", "1d 4h")

### Edit Mode
- Two DatePicker fields with time selection
- `minDate` on end date picker prevents selecting before start
- Clear schedule button when dates are set
- Cancel button restores original values
- Save button with loading state
- Validation feedback via toast notifications

## Validation Rules

1. **Start before end:** Start date must be before end date
2. **Minimum duration:** 30 minutes minimum
3. **Both or neither:** Can't set only one date
4. **Date format:** Validates ISO string format

## API Integration

**Endpoint:** `POST /admin/service-orders/:id/schedule`

**Request Body:**
```json
{
  "scheduled_start_date": "2025-10-26T10:00:00.000Z",
  "scheduled_end_date": "2025-10-26T12:00:00.000Z"
}
```

**Response:**
```json
{
  "service_order": { /* updated service order */ },
  "message": "Service order schedule updated successfully"
}
```

## Testing Checklist

- [x] Widget displays correctly in sidebar
- [x] View mode shows dates when scheduled
- [x] View mode shows placeholder when not scheduled
- [x] Edit button opens edit mode
- [x] DatePicker components work correctly
- [x] Time picker functionality works
- [x] Validation prevents invalid dates
- [x] Validation prevents too short duration
- [x] Clear schedule button works
- [x] Cancel button restores original values
- [x] Save button updates schedule
- [x] Toast notifications appear
- [x] React Query cache invalidates
- [x] Calendar view updates after save
- [x] No linter errors

## Integration with Calendar View

The schedule widget integrates seamlessly with the drag-and-drop calendar view implemented in TEM-242:

1. **Cache Invalidation:** Saving schedule in widget invalidates `service-orders-calendar` query
2. **Consistent API:** Both use the same `/admin/service-orders/:id/schedule` endpoint
3. **Same Workflow:** Both trigger `updateServiceOrderScheduleWorkflow`
4. **Bidirectional Updates:** Changes in calendar reflect in detail page and vice versa

## Best Practices Followed

1. **Medusa Native Components:** Used only `@medusajs/ui` components
2. **React Query:** Proper cache management and invalidation
3. **Error Handling:** Try-catch with user-friendly messages
4. **Validation:** Client-side and server-side validation
5. **Loading States:** Proper loading indicators
6. **Accessibility:** Proper labels and semantic HTML
7. **TypeScript:** Full type safety
8. **Code Organization:** Separate widget component
9. **Workflow Pattern:** Uses existing workflow infrastructure
10. **User Feedback:** Toast notifications for all actions

## Future Enhancements

1. **Recurring Schedules:** Support for recurring service orders
2. **Conflict Detection:** Warn about technician/resource conflicts
3. **Suggested Times:** AI-powered schedule suggestions
4. **Bulk Scheduling:** Schedule multiple orders at once
5. **Calendar Integration:** Export to external calendars (iCal, Google)
6. **Reminders:** Automated reminders before scheduled time
7. **Time Zone Support:** Handle multiple time zones
8. **Duration Presets:** Quick buttons for common durations (1h, 2h, 4h, 8h)

## Conclusion

The service order schedule widget provides a user-friendly interface for managing scheduled dates directly from the detail page, complementing the calendar view's drag-and-drop functionality. It follows all Medusa best practices and integrates seamlessly with the existing infrastructure.

