import React, { useState, useEffect } from 'react';
import Header from './Header.jsx';

export default function Layout({ children, user }) {
  return (
    <>
      <Header user={user} />
      {children}
    </>
  );
}
