import React from 'react';

export default function Login() {
  const handleClick = () => {
    window.location = '/auth/github';
  };
  return (
    <React.Fragment>
      <button type="button" onClick={handleClick}>
        login
      </button>
    </React.Fragment>
  );
}
