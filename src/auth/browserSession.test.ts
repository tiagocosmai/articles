import { allowLoginCookie } from "./browserSession";

it("asks for embedded cookie access in the click, before any other check", () => {
  const order: string[] = [];
  Object.defineProperty(window, "top", { configurable: true, value: {} });
  Object.assign(document, {
    hasStorageAccess: () => {
      order.push("has");
      return Promise.resolve(false);
    },
    requestStorageAccess: () => {
      order.push("request");
      return Promise.resolve();
    },
  });

  void allowLoginCookie();

  expect(order[0]).toBe("request");
  Object.defineProperty(window, "top", { configurable: true, value: window });
});
