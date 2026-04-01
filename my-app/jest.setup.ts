jest.mock("expo-notifications", () => {
  const listeners: Array<(response: any) => void> = [];

  return {
    AndroidImportance: {
      MAX: "max",
    },
    SchedulableTriggerInputTypes: {
      DATE: "date",
    },
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
    requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
    setNotificationChannelAsync: jest.fn(async () => undefined),
    setNotificationCategoryAsync: jest.fn(async () => undefined),
    scheduleNotificationAsync: jest.fn(async () => "notification-id"),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
    addNotificationResponseReceivedListener: jest.fn((listener) => {
      listeners.push(listener);

      return {
        remove: jest.fn(() => {
          const index = listeners.indexOf(listener);

          if (index >= 0) {
            listeners.splice(index, 1);
          }
        }),
      };
    }),
  };
});
