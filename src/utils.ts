import { access, mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';

export const checkOrCreateFolder = async (dirPath: string) => {
  try {
    await access(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
  }
};

export const checkFileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const writeBinary = async (filePath: string, uint8Array: Uint8Array) => {
  await writeFile(filePath, Buffer.from(uint8Array));
};

export const readBinary = async (filePath: string) => {
  const buffer = await readFile(filePath);
  return new Uint8Array(buffer);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const writeJSON = async (filePath: string, data: any) => {
  await writeFile(filePath, JSON.stringify(data, null, 2));
};

export const readJSON = async (filePath: string) => {
  const data = await readFile(filePath, 'utf-8');
  return JSON.parse(data);
};

export const safeDeleteFile = async (filePath: string) => {
  await rm(filePath, { recursive: true, force: true });
};

export const listFiles = async (dir: string): Promise<string[]> => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return [];
  }
};

export const listDirs = async (dir: string): Promise<string[]> => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
};
