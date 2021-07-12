import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import Layout from './component/Layout.jsx';
import Index from './page/Index.jsx';
import Login from './page/Login.jsx';
import Success from './component/Success.jsx';
import { fetchDataIndex } from './hook/hookData.js';

export default function App() {
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState({});
  const [schedules, setSchedules] = useState([]);
  // useEffect(() => {
  //   setUser({ id: 1, username: 'suiran256' });
  // }, []);
  // useEffect(() =>
  //   (async () => {
  //     if (!user.id) {
  //       return fetchDataIndex().then((obj) => {
  //         if (obj.user && obj.user.id !== user.id) {
  //           setUser(obj.user);
  //         }
  //       });
  //     }
  //   })()
  // );

  // useEffect(() => {
  //   setSchedules([
  //     {
  //       scheduleId: 'aaa',
  //       scheduleName: 'scheduleName1',
  //       memo: 'memo1',
  //       createdBy: 1,
  //       updatedAt: new Date(),
  //     },
  //   ]);
  // }, []);
  // useEffect(() => {
  //   setUser({ id: 0, username: 'testUser' });
  // }, []);
  return (
    <Router>
      <Layout user={user}>
        <Route
          exact
          path="/"
          render={() => (
            <Index userId={userId} user={user} schedules={schedules} />
          )}
        />
        <Route exact path="/login" render={() => <Login />} />
        <Route
          exact
          path="/success"
          render={() => <Success setUserId={setUserId} />}
        />
        <Route
          exact
          path="/logout"
          render={() =>
            (async () => {
              return await fetch('/api/logout')
                .then((res) => res.json())
                .then((obj) => {
                  setUserId(null);
                  setUser({});
                  window.location = '/';
                });
            })().catch(console.log)
          }
        />
      </Layout>
    </Router>
  );
}
