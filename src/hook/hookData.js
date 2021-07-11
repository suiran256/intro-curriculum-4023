import { getAll } from '../service/serviceApi.js';
export const fetchDataIndex = async () => {
  return await getAll('/api/index');
};

export default const hookData={fetchDataIndex}
