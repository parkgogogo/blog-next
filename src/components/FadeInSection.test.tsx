import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FadeInSection } from "@/components/FadeInSection";

describe("FadeInSection", () => {
  it("keeps delayed sections on the first keyframe before the animation starts", () => {
    const html = renderToStaticMarkup(
      <FadeInSection delay="0.4s">Contact</FadeInSection>
    );

    expect(html).toContain('animation-delay:0.4s');
    expect(html).toContain('animation-fill-mode:both');
  });
});
