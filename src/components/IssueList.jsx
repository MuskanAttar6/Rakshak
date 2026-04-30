import React from 'react';
import IssueItem from './IssueItem.jsx';
import { groupResults, getGroupIcon } from '../friendly.js';

export default function IssueList({ results = [], isFiltered = false }) {
  if (!results.length) {
    return (
      <div className="empty">
        <div className="empty-icon">{isFiltered ? '🔍' : '🔍'}</div>
        <div className="empty-text">
          {isFiltered
            ? 'No results match your search. Try a different keyword.'
            : <span>Click <b>Check My System</b> to start</span>}
        </div>
      </div>
    );
  }

  const groups = groupResults(results);

  return (
    <div className="groups">
      {groups.map(({ group, items }) => {
        const issueCount = items.filter(i => i.status !== 'ok').length;
        return (
          <div className="group" key={group}>
            <div className="group-header">
              <div className="group-title">
                <span className="group-icon">{getGroupIcon(group)}</span>
                <span>{group}</span>
              </div>
              <div className="group-count">
                {issueCount === 0 ? '✓ All Good' : `${issueCount} issue${issueCount > 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="tiles">
              {items.map(r => <IssueItem key={r.id} issue={r} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
