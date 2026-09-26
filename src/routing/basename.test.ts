import { routerBasename } from "./basename";

describe("routerBasename", () => {
  it("returns undefined for local roots", () => {
    expect(routerBasename("/")).toBeUndefined();
    expect(routerBasename("")).toBeUndefined();
  });

  it("strips a trailing slash from the Pages base", () => {
    expect(routerBasename("/articles/")).toBe("/articles");
    expect(routerBasename("/articles")).toBe("/articles");
  });
});
