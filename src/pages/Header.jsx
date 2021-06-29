import React from 'react';

export default function Header({ user }) {
  return (
    <>
      <nav className="navbar navbar-light bg-light">
        <div className="navbar-header">
          <a href="/" className="navbar-brand nav-link">
            title
          </a>
        </div>
        <ul className="navbar-nav">
          {user ? (
            <li className="nav-item">
              <a href="/logout" className="nav-link">
                {`${user.username} ..logout`}
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
    </>
  );
}
