import type { OrderStatus, OrderTimelineEvent } from '@/api/orders/types';

// Sort timeline events by timestamp
export function sortTimelineEvents(
  events: OrderTimelineEvent[],
  order: 'asc' | 'desc' = 'desc'
): OrderTimelineEvent[] {
  return [...events].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return order === 'desc' ? timeB - timeA : timeA - timeB;
  });
}

// Filter timeline events by status
export function filterTimelineEventsByStatus(
  events: OrderTimelineEvent[],
  statuses: OrderStatus[]
): OrderTimelineEvent[] {
  return events.filter((event) => statuses.includes(event.status));
}

// Filter timeline events by updatedBy
export function filterTimelineEventsByUpdatedBy(
  events: OrderTimelineEvent[],
  updatedBy: OrderTimelineEvent['updatedBy'][]
): OrderTimelineEvent[] {
  return events.filter((event) => updatedBy.includes(event.updatedBy));
}

// Get the most recent event
export function getMostRecentEvent(
  events: OrderTimelineEvent[]
): OrderTimelineEvent | null {
  if (events.length === 0) return null;
  const sorted = sortTimelineEvents(events, 'desc');
  return sorted[0];
}

// Get the first event (oldest)
export function getFirstEvent(
  events: OrderTimelineEvent[]
): OrderTimelineEvent | null {
  if (events.length === 0) return null;
  const sorted = sortTimelineEvents(events, 'asc');
  return sorted[0];
}

// Calculate time between two events
export function getTimeBetweenEvents(
  event1: OrderTimelineEvent,
  event2: OrderTimelineEvent
): number {
  const time1 = new Date(event1.timestamp).getTime();
  const time2 = new Date(event2.timestamp).getTime();
  return Math.abs(time2 - time1);
}

// Format duration in human-readable format
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

// Get time since event
export function getTimeSinceEvent(event: OrderTimelineEvent): string {
  const now = new Date().getTime();
  const eventTime = new Date(event.timestamp).getTime();
  const diff = now - eventTime;
  return formatDuration(diff);
}

// Check if event is recent (within last hour)
export function isRecentEvent(
  event: OrderTimelineEvent,
  hoursThreshold = 1
): boolean {
  const now = new Date().getTime();
  const eventTime = new Date(event.timestamp).getTime();
  const diff = now - eventTime;
  return diff < hoursThreshold * 3600000;
}

// Group events by date
export function groupEventsByDate(
  events: OrderTimelineEvent[]
): Record<string, OrderTimelineEvent[]> {
  const grouped: Record<string, OrderTimelineEvent[]> = {};

  events.forEach((event) => {
    const date = new Date(event.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(event);
  });

  return grouped;
}

// Get event by status
export function getEventByStatus(
  events: OrderTimelineEvent[],
  status: OrderStatus
): OrderTimelineEvent | null {
  return events.find((event) => event.status === status) || null;
}

// Check if status has occurred
export function hasStatusOccurred(
  events: OrderTimelineEvent[],
  status: OrderStatus
): boolean {
  return events.some((event) => event.status === status);
}

// Get all unique statuses from events
export function getUniqueStatuses(events: OrderTimelineEvent[]): OrderStatus[] {
  const statuses = new Set<OrderStatus>();
  events.forEach((event) => statuses.add(event.status));
  return Array.from(statuses);
}

// Calculate average time between status changes
export function getAverageTimeBetweenStatuses(
  events: OrderTimelineEvent[]
): number {
  if (events.length < 2) return 0;

  const sorted = sortTimelineEvents(events, 'asc');
  let totalTime = 0;

  for (let i = 1; i < sorted.length; i++) {
    totalTime += getTimeBetweenEvents(sorted[i - 1], sorted[i]);
  }

  return totalTime / (sorted.length - 1);
}

// Get expected next status based on current status
export function getExpectedNextStatus(
  currentStatus: OrderStatus
): OrderStatus | null {
  const statusFlow: Record<OrderStatus, OrderStatus | null> = {
    pending: 'confirmed',
    confirmed: 'preparing',
    preparing: 'shipped',
    shipped: 'delivered',
    ready_for_pickup: 'delivered',
    delivered: null,
    cancelled: null,
  };

  return statusFlow[currentStatus] || null;
}

// Check if timeline is complete (has delivered or finished/cancelled/refunded)
export function isTimelineComplete(events: OrderTimelineEvent[]): boolean {
  return events.some(
    (event) => event.status === 'delivered' || event.status === 'cancelled'
  );
}

// Get timeline progress percentage
export function getTimelineProgress(
  events: OrderTimelineEvent[],
  currentStatus: OrderStatus
): number {
  const allStatuses: OrderStatus[] = [
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'shipped',
    'delivered',
    'cancelled',
  ];

  // Handle special cases
  if (currentStatus === 'cancelled') {
    return 100;
  }

  // Handle statuses not in the main flow by mapping them to closest ones
  let statusToFind = currentStatus;
  if (currentStatus === 'ready_for_pickup') statusToFind = 'preparing';

  const currentIndex = allStatuses.indexOf(statusToFind);
  if (currentIndex === -1) return 0;

  return ((currentIndex + 1) / allStatuses.length) * 100;
}

// Format timestamp for display
export function formatEventTimestamp(
  timestamp: string,
  format: 'short' | 'long' | 'relative' = 'short'
): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (format === 'relative') {
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  if (format === 'long') {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Short format
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
