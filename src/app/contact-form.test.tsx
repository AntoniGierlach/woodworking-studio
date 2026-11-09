import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContactForm from "./contact-form";

describe("formularz kontaktowy", () => {
  it("również przed uruchomieniem JavaScriptu wysyła dane metodą POST", () => {
    const html = renderToStaticMarkup(createElement(ContactForm));
    expect(html).toMatch(/<form\b[^>]*action="\/api\/contact"[^>]*encType="multipart\/form-data"[^>]*method="post"/);
    expect(html).toMatch(/<input\b[^>]*id="contact-files"[^>]*name="files"/);
  });
});
