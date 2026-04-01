import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import Index from "../app/index";

describe("Todo List", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the task name input", () => {
    render(<Index />);

    expect(screen.getByPlaceholderText("Task name")).toBeTruthy();
  });

  it("adds a new todo after pressing Add", async () => {
    render(<Index />);

    fireEvent.changeText(screen.getByPlaceholderText("Task name"), "Buy milk");
    fireEvent.changeText(
      screen.getByPlaceholderText("Deadline (e.g. 20.03.2026 18:30)"),
      "31.12.2099 10:00"
    );
    fireEvent.press(screen.getByText("Add"));

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeTruthy();
    });
  });

  it("removes the todo after pressing Delete", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      const deleteButton = buttons?.find((button) => button.text === "Delete");

      if (deleteButton?.onPress) {
        deleteButton.onPress();
      }
    });

    render(<Index />);

    fireEvent.changeText(screen.getByPlaceholderText("Task name"), "Buy bread");
    fireEvent.changeText(
      screen.getByPlaceholderText("Deadline (e.g. 20.03.2026 18:30)"),
      "31.12.2099 10:00"
    );
    fireEvent.press(screen.getByText("Add"));

    await waitFor(() => {
      expect(screen.getByText("Buy bread")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Delete"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(screen.queryByText("Buy bread")).toBeNull();
    });
  });
});
