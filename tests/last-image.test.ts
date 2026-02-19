import test from "node:test";
import assert from "node:assert/strict";
import {
  isLastImageRequest,
  extractStoredMediaId,
} from "../src/lib/messaging/last-image.ts";

test("isLastImageRequest matches common last-image prompts", () => {
  assert.equal(isLastImageRequest("Send me the last image I sent you"), true);
  assert.equal(isLastImageRequest("can you show my latest photo?"), true);
  assert.equal(isLastImageRequest("resend the previous picture from me"), true);
});

test("isLastImageRequest ignores unrelated prompts", () => {
  assert.equal(isLastImageRequest("show me an image of a tree"), false);
  assert.equal(isLastImageRequest("what did I say yesterday"), false);
});

test("extractStoredMediaId parses media-prefixed URLs", () => {
  assert.equal(extractStoredMediaId("media:abc123"), "abc123");
  assert.equal(extractStoredMediaId("media:  xyz  "), "xyz");
  assert.equal(extractStoredMediaId("https://example.com/file.jpg"), null);
  assert.equal(extractStoredMediaId(null), null);
});
