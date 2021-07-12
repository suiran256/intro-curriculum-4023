export async function getAll({ path } = {}) {
  if (!path) throw new Error("don't exist path");
  const res = await fetch(path, {
    credentials: 'include',
  });
  return await res.json();
}
