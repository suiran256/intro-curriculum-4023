import React from 'react';

export default function Login() {
  const handleClick = () => {
    window.location = '/auth/github';
  };
  return (
    <React.Fragment>
      <button type="button" className="btn btn-info my-3" onClick={handleClick}>
        login
      </button>
    </React.Fragment>
  );
}
