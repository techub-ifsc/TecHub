import assert from "node:assert/strict";
import { test } from "node:test";
import { looksLikeHtml } from "../src/utils/richText.js";

test("reconhece descrição formatada pelo editor", () => {
  assert.equal(looksLikeHtml("<b>negrito</b>"), true);
  assert.equal(looksLikeHtml('<div style="text-align: center">x</div>'), true);
  assert.equal(looksLikeHtml("<ul><li>item</li></ul>"), true);
});

test("descrição antiga em texto puro não é tratada como HTML", () => {
  assert.equal(looksLikeHtml("Projeto legal\nsegunda linha"), false);
  assert.equal(looksLikeHtml("se a < b e b > c"), false);
  assert.equal(looksLikeHtml(""), false);
  assert.equal(looksLikeHtml(null), false);
});
