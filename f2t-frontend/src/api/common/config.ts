/**
 * Global API Configuration
 *
 * Cấu hình toàn cục cho các API calls
 * Set USE_MOCK_DATA = true để sử dụng mock data cho tất cả API
 * Set USE_MOCK_DATA = false để sử dụng real API
 */

export const USE_MOCK_DATA = false;

/**
 * Network delay simulation (milliseconds)
 * Mô phỏng độ trễ mạng khi sử dụng mock data
 */
export const MOCK_DELAY = 500;

/**
 * Helper function để simulate network delay
 */
export function simulateNetworkDelay(
  delay: number = MOCK_DELAY
): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
