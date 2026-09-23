const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const img = (filename: string) => `${base}/images/${filename}`;
