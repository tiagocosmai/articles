import { storageAccessResponseHeaders } from "./storageAccess";

it("asks the browser to retry an embedded page with the session cookie", () => {
  expect(storageAccessResponseHeaders({ access: "inactive", destination: "document", method: "GET" })).toMatchObject({
    "Activate-Storage-Access": "retry; allowed-origin=*",
  });
});

it("loads an embedded page once cookie access is active", () => {
  expect(storageAccessResponseHeaders({ access: "active", destination: "document", method: "GET" })).toMatchObject({
    "Activate-Storage-Access": "load",
  });
});

it("leaves first-party responses alone", () => {
  expect(storageAccessResponseHeaders({ access: null, destination: "document", method: "GET" })).toBeNull();
});
