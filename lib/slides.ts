const RAW_SLIDES_BASE =
  "https://raw.githubusercontent.com/CourageResearch/DeSciNYC_railway/main/public/slides";

export function getSlidesHref(slides: string) {
  if (/^https?:\/\//i.test(slides) || slides.startsWith("/")) {
    return slides;
  }

  return `${RAW_SLIDES_BASE}/${slides.split("/").map(encodeURIComponent).join("/")}`;
}
