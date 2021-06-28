import React, { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [res, setRes] = useState({ data: { val: 'init' } });
  // const SERVER_URL = 'http://localhost:8080';
  const handleClick = async () => {
    const ret = await axios.get('/api/api2');
    setRes(ret);
  };
  return (
    <>
      <p>{res.data.val}</p>
      <button type="button" onClick={handleClick}>
        click
      </button>
    </>
  );
}
