import React from 'react';
import moment from 'moment-timezone';

function formatDate(date) {
  return moment(date).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm');
}

export default function Index({ user, schedules }) {
  return (
    <>
      <div className="jumbotron my-3">
        <h1 className="display-4">title</h1>
        <p className="lead">explanation</p>
      </div>
      {(() => {
        if (user) {
          return (
            <div>
              <a href="/schedules/new" className="btn btn-info">
                createSchedule
              </a>
              <h3 className="my-3">schedulesShow</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>scheduleName</th>
                    <th>updatedAt</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.scheduleId}>
                      <td>
                        <a href={`/schedules/${s.scheduleId}`}>
                          {s.scheduleName}
                        </a>
                      </td>
                      <td>{formatDate(s.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        } else {
          return false;
        }
      })()}
    </>
  );
}
