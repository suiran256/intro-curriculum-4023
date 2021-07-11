import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import Layout from './component/Layout.jsx';
import Index from './page/Index.jsx';
import Login from './page/Login.jsx';
import { fetchDataIndex } from './hook/hookData.js';

export default function App() {
  const [user, setUser] = useState({});
  const [schedules, setSchedules] = useState([]);
  // useEffect(() => {
  //   fetchDataIndex().then(({ user: newUser, schedules: newSchedules }) => {
  //     setUser(newUser);
  //     setSchedules(newSchedules);
  //   }, []);
  // });
  // useEffect(() => {
  //   if (!user.id) {
  //     // fetch('/auth/success')
  //     fetchDataIndex()
  //       .then((res) => res.json())
  //       .then((obj) => {
  //         if (obj.user && obj.user.id !== user.id) {
  //           setUser(obj.user);
  //         }
  //       });
  //   }
  // });
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
          render={() => <Index user={user} schedules={schedules} />}
        />
        {/* <Route exact path="/login" render={() => <Login user={user} />} /> */}
      </Layout>
    </Router>
  );
}
