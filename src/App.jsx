import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Layout from './pages/Layout.jsx';
import Index from './pages/Index.jsx';
import Errors from './pages/Errors.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [schedules, setSchedules] = useState([]);
  useEffect(() => {
    const userInitial = { id: 0, username: 'testUser' };
    setUser(userInitial);
    const schedulesInitial = [
      {
        scheduleId: 'aaa',
        scheduleName: 'scheduleName1',
        updatedAt: new Date(),
      },
    ];
    setSchedules(schedulesInitial);
  }, []);
  return (
    <Router>
      <Layout user={user}>
        <Switch>
          <Route
            exact
            path="/"
            render={() => <Index user={user} schedules={schedules} />}
          />
          <Route children={<Errors code={404} />} />
        </Switch>
      </Layout>
    </Router>
  );
}
