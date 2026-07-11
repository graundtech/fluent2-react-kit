import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("axe pipeline", () => {
  it("reports no violations for an accessible button", async () => {
    const { container } = render(
      <button type="button">Save changes</button>
    );

    await expect(container).toHaveNoAxeViolations();
  });
});
