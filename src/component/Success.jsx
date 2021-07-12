import React, { useEffect } from 'react';
import { fetchDataIndex } from '../hook/hookData.js';

export default function Success({ setUserId }) {
  useEffect(() => {
    setUserId(1);
    window.location = 'http://localhost:8080/';
  });
  return (
    <React.Fragment>
      <p>success</p>
    </React.Fragment>
  );
}
