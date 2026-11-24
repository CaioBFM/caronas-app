import { Directory, File } from "expo-file-system";

export async function saveBackupFile(content: string): Promise<boolean> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "ERR_PICKER_CANCELLED")
      return false;
    throw error;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = directory.createFile(
    `caronas-backup-${stamp}.json`,
    "application/json",
  );
  try {
    file.write(content);
  } catch (error) {
    try {
      file.delete();
    } catch {
      // Preserve the original write error.
    }
    throw error;
  }
  return true;
}

export async function pickBackupFile(): Promise<string | undefined> {
  const picked = await File.pickFileAsync();
  if (!picked.canceled) return picked.result.text();
}
