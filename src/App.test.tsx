import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("アプリ名「札帖」を見出しとして表示する", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /札帖/ })).toBeInTheDocument();
  });
});
