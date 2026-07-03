export function withUtmSource(href: string, source: string) {
  if (!href || href.startsWith("#")) {
    return href;
  }

  try {
    const url = new URL(href);
    url.searchParams.set("utm_source", source);
    return url.toString();
  } catch {
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}utm_source=${encodeURIComponent(source)}`;
  }
}
