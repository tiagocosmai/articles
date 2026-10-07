type StorageDocument = Document & {
  hasStorageAccess?: () => Promise<boolean>;
  requestStorageAccess?: () => Promise<void>;
};

export function allowLoginCookie(): Promise<boolean> {
  const storage = document as StorageDocument;
  if (window.top === window.self || !storage.requestStorageAccess) return Promise.resolve(true);
  try {
    return storage.requestStorageAccess().then(
      () => true,
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

export const loginSignalKey = "tiagocosmai-auth";

export function publishLoginFinished() {
  localStorage.setItem(loginSignalKey, String(Date.now()));
}

export async function readSignedIn(): Promise<boolean> {
  try {
    const session = (await (await fetch("/api/auth/session", { credentials: "include" })).json()) as {
      userId?: string;
    };
    return Boolean(session.userId);
  } catch {
    return false;
  }
}

export async function waitForSignedIn(): Promise<boolean> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await readSignedIn()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}
