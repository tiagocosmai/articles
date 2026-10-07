import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminGate } from "./AdminGate";
import { adminDeniedMessage } from "./gate";

beforeEach(() => {
  localStorage.setItem("articles-locale", "pt");
});

it("shows the login modal and hides admin content when logged out", async () => {
  const user = userEvent.setup();
  render(
    <AdminGate role={null} returnPath="admin">
      <p>Relatório</p>
    </AdminGate>,
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByText("Relatório")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Agora não" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByText(adminDeniedMessage)).not.toBeInTheDocument();
  expect(screen.queryByText("Relatório")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it("renders admin content for an administrator", () => {
  render(
    <AdminGate role="admin" returnPath="admin">
      <p>Relatório</p>
    </AdminGate>,
  );
  expect(screen.getByText("Relatório")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("tells another signed-in account and keeps the login open", () => {
  render(
    <AdminGate role="member" returnPath="admin">
      <p>Relatório</p>
    </AdminGate>,
  );
  expect(screen.getByText(adminDeniedMessage)).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByText("Relatório")).not.toBeInTheDocument();
});
