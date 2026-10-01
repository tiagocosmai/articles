/** Opens the browser print dialog for the article printout. */
export function printArticle(htmlDocument: string, title: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", title);
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(htmlDocument);
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };
  const doPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* The browser blocked the print dialog. */
    }
    window.setTimeout(cleanup, 500);
  };
  window.requestAnimationFrame(() => window.requestAnimationFrame(doPrint));
}
