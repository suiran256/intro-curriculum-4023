import React, { useEffect } from 'react';
import moment from 'moment-timezone';
import { fetchDataIndex } from '../hook/hookData.js';

function formatDate(date) {
  return moment(date).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm');
}
export default function Index({ userId, user, schedules }) {
  useEffect(() => {
    return (async () => {
      fetchDataIndex().then((obj) => {
        if (userId !== obj.user.userId) {
          setUserId(obj.user.userId);
        }
        setUser(obj.user);
        setSchedules(obj.schedules);
      });
    })().catch(console.log);
  }, [userId]);
  const username = userId ? user.username : '(notLogin)';
  const Header = () => (
    <header className="jumbotron my-3">
      <hgroup>
        <h1 className="display-4">title</h1>
        <h2 className="lead">explanation</h2>
      </hgroup>
    </header>
  );
  const Button = () => (
    <a href="/schedules/new" className="btn btn-info">
      createSchedule
    </a>
  );
  const ScheduleRows = () => {
    const scheduleRows = schedules.map((s) => (
      <tr key={s.scheduleId}>
        <td>
          <a href="/schedules/{s.scheduleId}">{s.scheduleName}</a>
        </td>
        <td>{formatDate(s.updatedAt)}</td>
      </tr>
    ));
    return (
      <React.Fragment>
        <h3 className="my-3">schedulesShow</h3>
        <table className="table">
          <thead>
            <tr>
              <th>scheduleName</th>
              <th>updatedAt</th>
            </tr>
          </thead>
          <tbody>{scheduleRows}</tbody>
        </table>
      </React.Fragment>
    );
  };
  return (
    <React.Fragment>
      <Header />
      {userId ? (
        <React.Fragment>
          <Button />
          <ScheduleRows />
        </React.Fragment>
      ) : (
        false
      )}
    </React.Fragment>
  );
}
