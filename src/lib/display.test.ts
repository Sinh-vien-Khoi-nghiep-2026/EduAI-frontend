import { expect, test } from "bun:test";
import { formatDate, notificationText, safeExternalUrl } from "./display";

test("formatDate never renders an invalid date", () => {
  expect(formatDate(null)).toBe("—");
  expect(formatDate("not-a-date")).toBe("—");
  expect(formatDate("2026-01-02T03:04:05Z")).not.toBe("—");
});

test("notificationText renders unknown values without object coercion", () => {
  expect(notificationText({ empty: null, enabled: true, count: 123, labels: ["a", "b"], nested: { state: "ready" } })).toBe("empty: null · enabled: true · count: 123 · labels: a, b · nested: state: ready");
  expect(notificationText({ nested: { state: "ready" } })).toBe("nested: state: ready");
  expect(notificationText({})).toBe("Notification received.");
});

test("safeExternalUrl permits only web links", () => {
  expect(safeExternalUrl("https://example.com")).toBe("https://example.com/");
  expect(safeExternalUrl("http://example.com")).toBe("http://example.com/");
  for (const value of ["javascript:alert(1)", "data:text/html,hello", "ftp://example.com", "not-a-url"]) expect(safeExternalUrl(value)).toBeUndefined();
});
