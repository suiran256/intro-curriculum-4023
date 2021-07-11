import React from 'react';

export default function Layout({ user, children }) {
  return (
    <>
      <header>
        <nav area-label="navigation" className="navbar navbar-light bg-light">
          <header className="navbar-header">
            <a href="/" className="navbar-brand nav-link">
              title
            </a>
          </header>
          <ul className="navbar-nav">
            {user.id ? (
              <li className="nav-item">
                <a href="/logout" className="nav-link">
                  {user.username} ..logout
                </a>
              </li>
            ) : (
              <li className="nav-item">
                <a href="/login" className="nav-link">
                  login
                </a>
              </li>
            )}
          </ul>
        </nav>
      </header>
      {children}
    </>
  );
}
