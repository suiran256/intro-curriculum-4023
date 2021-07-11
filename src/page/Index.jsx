import React from 'react';

export default function Index({ user }) {
  const username = user.id ? user.username : '(notLogin)';
  return <p>username:{username}</p>;
}
