import { getAll } from '../service/serviceApi.js';
export async function fetchDataIndex() {
  return await getAll({ path: '/api/index' });
}
