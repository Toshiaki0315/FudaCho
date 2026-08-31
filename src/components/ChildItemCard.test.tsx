import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createChildItem } from "../domain/childItem";
import { ChildItemCard } from "./ChildItemCard";

describe("ChildItemCard", () => {
  it("IDと作業内容を表示する", () => {
    const item = createChildItem({
      id: "C-1",
      parentId: "P-1",
      description: "テストを書く",
    });
    render(<ChildItemCard item={item} />);
    expect(screen.getByText("C-1")).toBeInTheDocument();
    expect(screen.getByText("テストを書く")).toBeInTheDocument();
  });
});
