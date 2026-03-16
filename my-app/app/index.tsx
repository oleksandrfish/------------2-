import * as Notifications from "expo-notifications";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Priority = "low" | "medium" | "high";

type Todo = {
  id: number;
  todo: string;
  completed: boolean;
  priority: Priority;
  createdAt: string;
  deadline: string;
  notificationId: string | null;
};

const priorities: Priority[] = ["low", "medium", "high"];
const DEADLINE_CATEGORY_ID = "deadline-actions";
const COMPLETE_ACTION_ID = "complete-task";
const DELETE_ACTION_ID = "delete-task";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatDateTime = (date: Date) =>
  date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getDeadlineDate = (value: string) => {
  const isoDate = new Date(value);

  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate;
  }

  return parseDeadline(value);
};

const parseDeadline = (value: string) => {
  const match = value.trim().match(
    /^(\d{2})\.(\d{2})\.(\d{4})(?:[ T](\d{2}):(\d{2}))?$/
  );

  if (!match) {
    return null;
  }

  const [, day, month, year, hours = "09", minutes = "00"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes)
  );

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hours) ||
    date.getMinutes() !== Number(minutes)
  ) {
    return null;
  }

  return date;
};

async function scheduleTaskNotification(task: Todo) {
  const deadlineDate = getDeadlineDate(task.deadline);

  if (!deadlineDate || deadlineDate <= new Date()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Deadline reached",
      body: task.todo,
      categoryIdentifier: DEADLINE_CATEGORY_ID,
      data: { todoId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: deadlineDate,
      channelId: "deadline-reminders",
    },
  });
}

export default function Index() {
  const [items, setItems] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [error, setError] = useState("");
  const today = useMemo(() => formatDisplayDate(new Date()), []);

  useEffect(() => {
    const prepareNotifications = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const permission = await Notifications.requestPermissionsAsync();
        finalStatus = permission.status;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("deadline-reminders", {
          name: "Deadline reminders",
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      await Notifications.setNotificationCategoryAsync(DEADLINE_CATEGORY_ID, [
        {
          identifier: COMPLETE_ACTION_ID,
          buttonTitle: "Complete",
        },
        {
          identifier: DELETE_ACTION_ID,
          buttonTitle: "Delete",
          options: {
            isDestructive: true,
          },
        },
      ]);

      if (finalStatus !== "granted") {
        setError("Notifications are disabled. Allow them in system settings.");
      }
    };

    void prepareNotifications();
  }, []);

  useEffect(() => {
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const todoId = Number(response.notification.request.content.data?.todoId);

        if (!todoId) {
          return;
        }

        if (response.actionIdentifier === COMPLETE_ACTION_ID) {
          setItems((currentItems) =>
            currentItems.map((item) =>
              item.id === todoId
                ? {
                    ...item,
                    completed: true,
                    notificationId: null,
                  }
                : item
            )
          );
          return;
        }

        if (response.actionIdentifier === DELETE_ACTION_ID) {
          setItems((currentItems) => currentItems.filter((item) => item.id !== todoId));
        }
      });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  const addTodo = async () => {
    setError("");

    const trimmedTitle = title.trim();
    const trimmedDeadline = deadline.trim();
    const parsedDeadline = parseDeadline(trimmedDeadline);

    if (!trimmedTitle || !trimmedDeadline) {
      setError("Enter task name and deadline.");
      return;
    }

    if (!parsedDeadline) {
      setError("Deadline format: DD.MM.YYYY HH:MM");
      return;
    }

    if (parsedDeadline <= new Date()) {
      setError("Deadline must be in the future.");
      return;
    }

    const newItem: Todo = {
      id: Date.now(),
      todo: trimmedTitle,
      completed: false,
      priority,
      createdAt: formatDateTime(new Date()),
      deadline: parsedDeadline.toISOString(),
      notificationId: null,
    };

    const notificationId = await scheduleTaskNotification(newItem);

    setItems((prev) => [{ ...newItem, notificationId }, ...prev]);
    setTitle("");
    setDeadline("");
    setPriority("medium");
  };

  const deleteTodo = async (item: Todo) => {
    if (item.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(item.notificationId);
    }

    setItems((prev) => prev.filter((todo) => todo.id !== item.id));
  };

  const completeTodo = async (item: Todo) => {
    if (item.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(item.notificationId);
    }

    setItems((prev) =>
      prev.map((todo) =>
        todo.id === item.id
          ? {
              ...todo,
              completed: true,
              notificationId: null,
            }
          : todo
      )
    );
  };

  const confirmDelete = (item: Todo) => {
    Alert.alert("Delete task?", item.todo, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteTodo(item);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>TODO List</Text>
        <Text style={styles.date}>{today}</Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Task name"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />
          <TextInput
            placeholder="Deadline (e.g. 20.03.2026 18:30)"
            value={deadline}
            onChangeText={setDeadline}
            style={styles.input}
          />
          <View style={styles.priorityRow}>
            {priorities.map((item) => (
              <Text
                key={item}
                onPress={() => setPriority(item)}
                style={[
                  styles.priorityBtn,
                  priority === item && styles.priorityBtnActive,
                ]}
              >
                {item}
              </Text>
            ))}
            <Text onPress={() => void addTodo()} style={styles.addBtn}>
              Add
            </Text>
          </View>
          <Text style={styles.helperText}>
            Created date and time are added automatically. Enter only the
            deadline in format DD.MM.YYYY HH:MM
          </Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>List is empty. Add your first task.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.dot, item.completed && styles.dotCompleted]} />
                <View style={styles.itemContent}>
                  <Text style={styles.itemText}>{item.todo}</Text>
                  <Text style={styles.itemMeta}>
                    {item.priority} | created: {item.createdAt}
                  </Text>
                  <Text style={styles.itemMeta}>
                    deadline: {formatDateTime(getDeadlineDate(item.deadline) ?? new Date())}
                  </Text>
                </View>
              </View>
              <View style={styles.itemActions}>
                <Pressable onPress={() => void completeTodo(item)} style={styles.completeBtn}>
                  <Text style={styles.completeText}>Complete</Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    padding: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1e1e1e",
    marginBottom: 8,
    textAlign: "center",
  },
  date: {
    fontSize: 16,
    color: "#5f6470",
    marginBottom: 14,
    textAlign: "center",
  },
  form: {
    marginBottom: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d7dce5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fafbfe",
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  priorityBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#eef2f8",
    color: "#2e3a4d",
    textTransform: "capitalize",
  },
  priorityBtnActive: {
    backgroundColor: "#2f80ed",
    color: "#fff",
  },
  addBtn: {
    marginLeft: "auto",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#27ae60",
    color: "#fff",
    fontWeight: "600",
  },
  helperText: {
    color: "#6f7785",
    fontSize: 12,
  },
  errorText: {
    color: "#c0392b",
    fontSize: 13,
  },
  list: {
    gap: 8,
    paddingBottom: 10,
  },
  emptyText: {
    textAlign: "center",
    color: "#6f7785",
    marginTop: 24,
    fontSize: 14,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#f5f7fb",
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 8,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemContent: {
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ff8a00",
    marginRight: 10,
  },
  dotCompleted: {
    backgroundColor: "#27ae60",
  },
  itemText: {
    fontSize: 15,
    color: "#1e1e1e",
    flexShrink: 1,
  },
  itemMeta: {
    fontSize: 12,
    color: "#6f7785",
    textTransform: "capitalize",
    marginTop: 4,
  },
  deleteBtn: {
    backgroundColor: "#fbe8e6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemActions: {
    gap: 8,
  },
  completeBtn: {
    backgroundColor: "#e8f7ee",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  completeText: {
    color: "#1f8f4c",
    fontWeight: "600",
  },
  deleteText: {
    color: "#c0392b",
    fontWeight: "600",
  },
});
