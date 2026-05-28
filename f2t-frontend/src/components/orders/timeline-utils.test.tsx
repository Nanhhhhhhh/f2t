// import type { OrderStatus, OrderTimelineEvent } from '@/api/orders/types';

// import {
//   filterTimelineEventsByStatus,
//   filterTimelineEventsByUpdatedBy,
//   formatDuration,
//   formatEventTimestamp,
//   getAverageTimeBetweenStatuses,
//   getEventByStatus,
//   getExpectedNextStatus,
//   getFirstEvent,
//   getMostRecentEvent,
//   getTimeBetweenEvents,
//   getTimelineProgress,
//   getTimeSinceEvent,
//   getUniqueStatuses,
//   groupEventsByDate,
//   hasStatusOccurred,
//   isRecentEvent,
//   isTimelineComplete,
//   sortTimelineEvents,
// } from './timeline-utils';

// describe('Timeline Utils', () => {
//   const createMockEvent = (
//     id: string,
//     status: OrderStatus,
//     timestamp: string,
//     options?: Partial<OrderTimelineEvent>
//   ): OrderTimelineEvent => ({
//     id,
//     status,
//     timestamp,
//     description: `Event ${id}`,
//     updatedBy: 'system',
//     ...options,
//   });

//   const mockEvents: OrderTimelineEvent[] = [
//     createMockEvent('1', 'pending', '2024-01-15T10:00:00Z'),
//     createMockEvent('2', 'confirmed', '2024-01-15T10:30:00Z', {
//       updatedBy: 'farm',
//     }),
//     createMockEvent('3', 'preparing', '2024-01-15T11:00:00Z', {
//       updatedBy: 'farm',
//     }),
//     createMockEvent('4', 'out_for_delivery', '2024-01-15T12:00:00Z', {
//       updatedBy: 'delivery',
//     }),
//   ];

//   describe('sortTimelineEvents', () => {
//     it('should sort events in descending order by default', () => {
//       const sorted = sortTimelineEvents(mockEvents);
//       expect(sorted[0].id).toBe('4');
//       expect(sorted[sorted.length - 1].id).toBe('1');
//     });

//     it('should sort events in ascending order', () => {
//       const sorted = sortTimelineEvents(mockEvents, 'asc');
//       expect(sorted[0].id).toBe('1');
//       expect(sorted[sorted.length - 1].id).toBe('4');
//     });

//     it('should not mutate original array', () => {
//       const original = [...mockEvents];
//       sortTimelineEvents(mockEvents);
//       expect(mockEvents).toEqual(original);
//     });
//   });

//   describe('filterTimelineEventsByStatus', () => {
//     it('should filter events by single status', () => {
//       const filtered = filterTimelineEventsByStatus(mockEvents, ['pending']);
//       expect(filtered).toHaveLength(1);
//       expect(filtered[0].status).toBe('pending');
//     });

//     it('should filter events by multiple statuses', () => {
//       const filtered = filterTimelineEventsByStatus(mockEvents, [
//         'pending',
//         'confirmed',
//       ]);
//       expect(filtered).toHaveLength(2);
//     });

//     it('should return empty array if no matches', () => {
//       const filtered = filterTimelineEventsByStatus(mockEvents, ['delivered']);
//       expect(filtered).toHaveLength(0);
//     });
//   });

//   describe('filterTimelineEventsByUpdatedBy', () => {
//     it('should filter events by updatedBy', () => {
//       const filtered = filterTimelineEventsByUpdatedBy(mockEvents, ['farm']);
//       expect(filtered).toHaveLength(2);
//       expect(filtered.every((e) => e.updatedBy === 'farm')).toBe(true);
//     });

//     it('should filter by multiple updatedBy values', () => {
//       const filtered = filterTimelineEventsByUpdatedBy(mockEvents, [
//         'farm',
//         'delivery',
//       ]);
//       expect(filtered).toHaveLength(3);
//     });
//   });

//   describe('getMostRecentEvent', () => {
//     it('should return the most recent event', () => {
//       const recent = getMostRecentEvent(mockEvents);
//       expect(recent?.id).toBe('4');
//     });

//     it('should return null for empty array', () => {
//       const recent = getMostRecentEvent([]);
//       expect(recent).toBeNull();
//     });
//   });

//   describe('getFirstEvent', () => {
//     it('should return the first (oldest) event', () => {
//       const first = getFirstEvent(mockEvents);
//       expect(first?.id).toBe('1');
//     });

//     it('should return null for empty array', () => {
//       const first = getFirstEvent([]);
//       expect(first).toBeNull();
//     });
//   });

//   describe('getTimeBetweenEvents', () => {
//     it('should calculate time difference between events', () => {
//       const time = getTimeBetweenEvents(mockEvents[0], mockEvents[1]);
//       expect(time).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
//     });

//     it('should return absolute difference', () => {
//       const time1 = getTimeBetweenEvents(mockEvents[0], mockEvents[1]);
//       const time2 = getTimeBetweenEvents(mockEvents[1], mockEvents[0]);
//       expect(time1).toBe(time2);
//     });
//   });

//   describe('formatDuration', () => {
//     it('should format seconds', () => {
//       expect(formatDuration(5000)).toBe('5 seconds');
//       expect(formatDuration(1000)).toBe('1 second');
//     });

//     it('should format minutes', () => {
//       expect(formatDuration(60000)).toBe('1 minute');
//       expect(formatDuration(120000)).toBe('2 minutes');
//     });

//     it('should format hours', () => {
//       expect(formatDuration(3600000)).toBe('1 hour');
//       expect(formatDuration(7200000)).toBe('2 hours');
//     });

//     it('should format days', () => {
//       expect(formatDuration(86400000)).toBe('1 day');
//       expect(formatDuration(172800000)).toBe('2 days');
//     });
//   });

//   describe('getTimeSinceEvent', () => {
//     it('should return formatted time since event', () => {
//       const recentEvent = createMockEvent(
//         '5',
//         'pending',
//         new Date(Date.now() - 60000).toISOString()
//       );
//       const timeSince = getTimeSinceEvent(recentEvent);
//       expect(timeSince).toContain('minute');
//     });
//   });

//   describe('isRecentEvent', () => {
//     it('should return true for recent events', () => {
//       const recentEvent = createMockEvent(
//         '5',
//         'pending',
//         new Date(Date.now() - 30 * 60000).toISOString()
//       );
//       expect(isRecentEvent(recentEvent)).toBe(true);
//     });

//     it('should return false for old events', () => {
//       const oldEvent = createMockEvent('5', 'pending', '2024-01-15T10:00:00Z');
//       expect(isRecentEvent(oldEvent)).toBe(false);
//     });

//     it('should respect custom threshold', () => {
//       const event = createMockEvent(
//         '5',
//         'pending',
//         new Date(Date.now() - 90 * 60000).toISOString()
//       );
//       expect(isRecentEvent(event, 1)).toBe(false);
//       expect(isRecentEvent(event, 2)).toBe(true);
//     });
//   });

//   describe('groupEventsByDate', () => {
//     it('should group events by date', () => {
//       const events = [
//         createMockEvent('1', 'pending', '2024-01-15T10:00:00Z'),
//         createMockEvent('2', 'confirmed', '2024-01-15T11:00:00Z'),
//         createMockEvent('3', 'preparing', '2024-01-16T10:00:00Z'),
//       ];

//       const grouped = groupEventsByDate(events);
//       const dates = Object.keys(grouped);

//       expect(dates).toHaveLength(2);
//       expect(grouped[dates[0]]).toHaveLength(2);
//       expect(grouped[dates[1]]).toHaveLength(1);
//     });
//   });

//   describe('getEventByStatus', () => {
//     it('should return event with matching status', () => {
//       const event = getEventByStatus(mockEvents, 'confirmed');
//       expect(event?.status).toBe('confirmed');
//     });

//     it('should return null if status not found', () => {
//       const event = getEventByStatus(mockEvents, 'delivered');
//       expect(event).toBeNull();
//     });
//   });

//   describe('hasStatusOccurred', () => {
//     it('should return true if status exists', () => {
//       expect(hasStatusOccurred(mockEvents, 'confirmed')).toBe(true);
//     });

//     it('should return false if status does not exist', () => {
//       expect(hasStatusOccurred(mockEvents, 'delivered')).toBe(false);
//     });
//   });

//   describe('getUniqueStatuses', () => {
//     it('should return unique statuses', () => {
//       const statuses = getUniqueStatuses(mockEvents);
//       expect(statuses).toHaveLength(4);
//       expect(statuses).toContain('pending');
//       expect(statuses).toContain('confirmed');
//       expect(statuses).toContain('preparing');
//       expect(statuses).toContain('out_for_delivery');
//     });

//     it('should handle duplicate statuses', () => {
//       const events = [
//         ...mockEvents,
//         createMockEvent('5', 'pending', '2024-01-15T13:00:00Z'),
//       ];
//       const statuses = getUniqueStatuses(events);
//       expect(statuses).toHaveLength(4);
//     });
//   });

//   describe('getAverageTimeBetweenStatuses', () => {
//     it('should calculate average time between status changes', () => {
//       const avgTime = getAverageTimeBetweenStatuses(mockEvents);
//       expect(avgTime).toBeGreaterThan(0);
//       expect(avgTime).toBe(40 * 60 * 1000); // 40 minutes average
//     });

//     it('should return 0 for single event', () => {
//       const avgTime = getAverageTimeBetweenStatuses([mockEvents[0]]);
//       expect(avgTime).toBe(0);
//     });
//   });

//   describe('getExpectedNextStatus', () => {
//     it('should return expected next status', () => {
//       expect(getExpectedNextStatus('pending')).toBe('confirmed');
//       expect(getExpectedNextStatus('confirmed')).toBe('preparing');
//       expect(getExpectedNextStatus('preparing')).toBe('ready_for_pickup');
//       expect(getExpectedNextStatus('ready_for_pickup')).toBe(
//         'out_for_delivery'
//       );
//       expect(getExpectedNextStatus('out_for_delivery')).toBe('delivered');
//     });

//     it('should return null for terminal statuses', () => {
//       expect(getExpectedNextStatus('delivered')).toBeNull();
//       expect(getExpectedNextStatus('cancelled')).toBeNull();
//       expect(getExpectedNextStatus('refunded')).toBeNull();
//     });
//   });

//   describe('isTimelineComplete', () => {
//     it('should return true for delivered orders', () => {
//       const events = [
//         ...mockEvents,
//         createMockEvent('5', 'delivered', '2024-01-15T13:00:00Z'),
//       ];
//       expect(isTimelineComplete(events)).toBe(true);
//     });

//     it('should return true for cancelled orders', () => {
//       const events = [
//         ...mockEvents,
//         createMockEvent('5', 'cancelled', '2024-01-15T13:00:00Z'),
//       ];
//       expect(isTimelineComplete(events)).toBe(true);
//     });

//     it('should return false for incomplete orders', () => {
//       expect(isTimelineComplete(mockEvents)).toBe(false);
//     });
//   });

//   describe('getTimelineProgress', () => {
//     it('should calculate progress percentage', () => {
//       expect(getTimelineProgress(mockEvents, 'pending')).toBeCloseTo(
//         100 / 6,
//         2
//       );
//       expect(getTimelineProgress(mockEvents, 'confirmed')).toBeCloseTo(
//         200 / 6,
//         2
//       );
//       expect(getTimelineProgress(mockEvents, 'preparing')).toBeCloseTo(
//         300 / 6,
//         2
//       );
//       expect(getTimelineProgress(mockEvents, 'delivered')).toBe(100);
//     });

//     it('should return 100 for terminal statuses', () => {
//       expect(getTimelineProgress(mockEvents, 'cancelled')).toBe(100);
//       expect(getTimelineProgress(mockEvents, 'refunded')).toBe(100);
//     });
//   });

//   describe('formatEventTimestamp', () => {
//     it('should format in short format', () => {
//       const formatted = formatEventTimestamp('2024-01-15T10:00:00Z', 'short');
//       expect(formatted).toContain('Jan');
//       expect(formatted).toContain('15');
//     });

//     it('should format in long format', () => {
//       const formatted = formatEventTimestamp('2024-01-15T10:00:00Z', 'long');
//       expect(formatted).toContain('January');
//       expect(formatted).toContain('15');
//       expect(formatted).toContain('2024');
//     });

//     it('should format in relative format for recent events', () => {
//       const recentTime = new Date(Date.now() - 5 * 60000).toISOString();
//       const formatted = formatEventTimestamp(recentTime, 'relative');
//       expect(formatted).toContain('min');
//       expect(formatted).toContain('ago');
//     });
//   });
// });
