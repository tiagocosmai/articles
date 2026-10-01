function copyWithExecCommand(value: string): boolean {
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.focus();
  area.select();
  let ok = false;
  const onCopy = (event: ClipboardEvent) => {
    event.clipboardData?.setData("text/plain", value);
    event.preventDefault();
    ok = true;
  };
  document.addEventListener("copy", onCopy);
  try {
    ok = document.execCommand("copy") || ok;
  } catch {
    ok = false;
  }
  document.removeEventListener("copy", onCopy);
  area.remove();
  return ok;
}

/** Copies during the click. The selection fallback still works inside the blog iframe. */
export function copyToClipboard(value: string): Promise<boolean> {
  const writeText = navigator.clipboard?.writeText?.bind(navigator.clipboard);
  const pending = writeText ? writeText(value) : null;
  const legacyOk = copyWithExecCommand(value);
  if (!pending) return Promise.resolve(legacyOk);
  return pending.then(
    () => true,
    () => legacyOk,
  );
}
