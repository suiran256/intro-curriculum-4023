import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import Layout from './component/Layout.jsx';
import Index from './page/Index.jsx';
import Login from './page/Login.jsx';

export default function App() {
  const [user, setUser] = useState({});
  useEffect(() => {
    if (!user.id) {
      fetch('/auth/success')
        .then((res) => res.json())
        .then((obj) => {
          if (obj.user && obj.user.id !== user.id) {
            setUser(obj.user);
          }
        });
    }
  });
  // useEffect(() => {
  //   setUser({ id: 0, username: 'testUser' });
  // }, []);
  return (
    <Router>
      <Layout user={user}>
        <Route exact path="/" render={() => <Index user={user} />} />
        <Route exact path="/login" render={() => <Login user={user} />} />
      </Layout>
    </Router>
  );
  // return <Header user={user} />;
}
