# Council Session Automated Booking System

## Overview

The Mentra platform features a fully automated council booking system where users select 3-5 mentors for a single one-hour session. The system automatically coordinates availability and confirms sessions without requiring admin intervention.

## Automated Coordination Approach

**Challenge**: Users want to book multiple mentors for one session without manual coordination.

**Solution**: Intelligent availability matching that instantly confirms sessions when possible or provides smart alternative suggestions with real-time booking.

## System Architecture

### Database Enhancements

#### Council Sessions Table (Enhanced)
- `proposedTimeSlots`: JSON array of potential meeting times with priority scoring
- `mentorResponseDeadline`: Deadline for mentor availability confirmation
- `finalTimeConfirmed`: Boolean flag indicating coordination completion
- `coordinatorNotes`: Admin notes for complex scheduling scenarios
- `mentorMinimum/Maximum`: Flexible mentor count requirements (3-5)
- `coordinationStatus`: Tracks progress through scheduling phases

#### Council Mentors Table (Enhanced)
- `availabilityResponse`: Mentor response status (pending/available/unavailable/tentative)
- `responseDate`: Timestamp of mentor response
- `availableTimeSlots`: Mentor-specific available times for this session
- `conflictNotes`: Explanation of scheduling conflicts
- `alternativeProposals`: Alternative times suggested by mentor
- `notificationSent`: Tracking for reminder system
- `lastReminderSent`: Automated follow-up management

## Coordination Workflow

### Phase 1: Initial Setup
1. Admin creates council session with 3-5 proposed time slots
2. System identifies and assigns 3-5 mentors based on expertise match
3. Coordination status set to "pending"
4. Response deadline set (typically 72 hours)

### Phase 2: Mentor Availability Collection
1. Automated notifications sent to all assigned mentors
2. Mentors respond with:
   - Available for proposed times
   - Specific time preferences within proposed slots
   - Alternative time proposals if needed
   - Conflict explanations if unavailable
3. System tracks response progress and sends reminders

### Phase 3: Intelligent Time Selection
1. Algorithm analyzes all mentor responses
2. Identifies optimal time slot with maximum mentor availability
3. Prioritizes lead mentor availability if designated
4. Falls back to minimum mentor requirement (3) if needed
5. Final time confirmation triggers mentee notifications

### Phase 4: Confirmation & Finalization
1. Final session time locked in
2. All participants (mentors + mentees) receive confirmation
3. Calendar invites generated with video link
4. Preparation materials distributed

## Test User Created

**Council Plan User:**
- Email: council@example.com
- Password: password123
- Plan: Council ($99/month)
- Limits: 500 AI messages, 5 human sessions + council access
- User ID: 9

This test user can access the council scheduling interface and register for council sessions.

## Enhanced Features

### Intelligent Scheduling Algorithm
- **Priority Scoring**: Weights mentor seniority, expertise match, and availability
- **Conflict Resolution**: Automatic handling of partial availability
- **Fallback Options**: Graceful degradation to minimum mentor count
- **Time Zone Handling**: Multi-timezone coordination for distributed mentors

### Automated Coordination
- **Smart Reminders**: Escalating reminder system for non-responsive mentors
- **Deadline Management**: Automatic progression through coordination phases
- **Alternative Proposals**: System-generated backup time suggestions
- **Coordinator Alerts**: Admin notifications for coordination failures

### Mentor Experience
- **Simple Response Interface**: One-click availability confirmation
- **Flexible Input**: Support for partial availability and alternative suggestions
- **Conflict Transparency**: Clear communication about scheduling issues
- **Preparation Time**: Advance notice for session preparation

## Current Implementation Status

✅ **Database Schema Enhanced**: New coordination fields added to council sessions and mentors tables
✅ **Council User Created**: Test user with council subscription plan available
✅ **Access Control Implemented**: Council features restricted to council plan subscribers only
✅ **Basic Council Interface**: Frontend displays upcoming council sessions with mentor information
✅ **Registration System**: Users can register for council sessions with goals and questions

## Next Implementation Phase

🔄 **Mentor Availability Collection Interface**: Admin panel for mentor response management
🔄 **Intelligent Time Selection Algorithm**: Automated optimal time slot identification
🔄 **Enhanced Notification System**: Multi-channel mentor communication
🔄 **Coordination Status Dashboard**: Real-time tracking of scheduling progress
🔄 **Fallback Coordination**: Manual admin override for complex scheduling scenarios

## Technical Notes

- **Calendar Integration**: Designed to work with existing Calendly integration for individual mentors
- **Scalability**: System supports multiple concurrent council sessions
- **Performance**: Efficient query patterns for mentor availability aggregation
- **Reliability**: Robust error handling for mentor non-response scenarios

This coordination system transforms council session scheduling from a manual administrative burden into an automated, intelligent process that maximizes mentor participation while providing excellent user experience for both mentors and mentees.