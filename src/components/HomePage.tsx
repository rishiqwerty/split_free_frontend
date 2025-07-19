import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { auth } from '../firebase';
import { getAuth, signOut } from 'firebase/auth';
import './HomePage.css';

interface Group {
  id: number;
  name: string;
  description: string;
  group_icon: string;
  created_at: string;
  members: any[];
  uuid: string;
}

interface Expense {
  id: number;
  group: number;
  expense_icon: string;
  title: string;
  amount: string;
  paid_by: {
    id: number;
    username: string;
    email: string;
    first_name: string;
  };
  split_between: number[];
  splits_detail: {
    user: string;
    amount: string;
  }[];
  notes: string;
  created_at: string;
  expense_date: string;
}

interface PersonExpenseSummary {
  expenses: Expense[];
  total_spent: number;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    group_icon: '👥'
  });
  const [copiedGroupId, setCopiedGroupId] = useState<number | null>(null);
  const [personExpenses, setPersonExpenses] = useState<PersonExpenseSummary | null>(null);
  const [collapsedPersonMonths, setCollapsedPersonMonths] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState<'groups' | 'expenses'>('groups');
  const [personTotalMonthExpenses, setPersonTotalMonthExpenses] = useState<any>(null);

  // Minimal cursor pagination state
  const [nextGroupsUrl, setNextGroupsUrl] = useState<string | null>(null);
  const [nextExpensesUrl, setNextExpensesUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          return;
        }

        const idToken = await user.getIdToken();
        const headers = {
          'Authorization': `Bearer ${idToken}`,
        };

        const [groupsResponse, userResponse, personExpensesResponse, personTotalMonthExpenses] = await Promise.all([
          axios.get(`${API_URL}/api/v1/groups/`, {
            headers,
            withCredentials: true
          }),
          axios.get(`${API_URL}/auth/get-user/`, {
            headers,
            withCredentials: true
          }),
          axios.get(`${API_URL}/api/v1/expenses/person-expenses/`, {
            headers,
            withCredentials: true
          }),
          axios.get(`${API_URL}/api/v1/expenses/person-monthly-expenses/`, {
            headers,
            withCredentials: true
          })
        ]);

        if (groupsResponse.status === 401 || userResponse.status === 401) {
          navigate('/login');
          return;
        }

        setGroups(groupsResponse.data.results);
        setNextGroupsUrl(groupsResponse.data.next);
        setUserName(userResponse.data.first_name);
        setPersonExpenses(personExpensesResponse.data.results);
        setNextExpensesUrl(personExpensesResponse.data.next);
        setPersonTotalMonthExpenses(personTotalMonthExpenses.data);

        // Set initial collapsed state for months
        if (personExpensesResponse.data && personExpensesResponse.data.results) {
          const months = personExpensesResponse.data.results.reduce((acc: Set<string>, expense: Expense) => {
            const date = new Date(expense.expense_date);
            const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            acc.add(month);
            return acc;
          }, new Set<string>());

          const monthArray = Array.from(months) as string[];
          const initialCollapsedState = monthArray.reduce((acc: { [key: string]: boolean }, month: string, index: number) => {
            acc[month] = index !== 0; // Collapse all except first month
            return acc;
          }, {});

          setCollapsedPersonMonths(initialCollapsedState);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Minimal load more for groups
  const loadMoreGroups = async () => {
    if (!nextGroupsUrl) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const headers = { 'Authorization': `Bearer ${idToken}` };
      const res = await axios.get(nextGroupsUrl, { headers, withCredentials: true });
      setGroups(prev => [...prev, ...res.data.results]);
      setNextGroupsUrl(res.data.next);
    } catch (error) {
      setError('Failed to load more groups.');
    }
  };

  // Minimal load more for person expenses
  const loadMoreExpenses = async () => {
    if (!nextExpensesUrl) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const headers = { 'Authorization': `Bearer ${idToken}` };
      const res = await axios.get(nextExpensesUrl, { headers, withCredentials: true });
      setPersonExpenses(prev => prev && Array.isArray(prev)
        ? [...prev, ...res.data.results]
        : res.data.results);
      setNextExpensesUrl(res.data.next);
    } catch (error) {
      setError('Failed to load more expenses.');
    }
  };

  // const handleGroupClick = (groupId: number) => {
  //   navigate(`/group/${groupId}`);
  // };

  const handleCreateGroup = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const idToken = await user.getIdToken();
      const headers = {
        'Authorization': `Bearer ${idToken}`,
      };

      // Validate icon: must be an emoji, else use default
      const defaultIcon = '👥';
      const emojiRegex = /^\p{Extended_Pictographic}+$/u;
      const iconVal = newGroup.group_icon.trim();
      const validIcon = emojiRegex.test(iconVal) ? iconVal : defaultIcon;
      const userSelectedIcon = emojiRegex.test(iconVal) ? true : false;
      const payload = { name: newGroup.name, description: newGroup.description, group_icon: validIcon, user_selected_icon: userSelectedIcon };
      const response = await axios.post(
        `${API_URL}/api/v1/groups/create/`,
        payload,
        { headers, withCredentials: true }
      );

      if (response.status === 201) {
        console.log('Group creation response:', response.data);

        const newGroupData = {
          id: response.data.id,
          uuid: response.data.uuid,
          name: response.data.name,
          description: response.data.description,
          created_at: response.data.created_at,
          members: response.data.members || [],
          group_icon: response.data.group_icon
        };

        setGroups(prevGroups => {
          const updatedGroups = [newGroupData, ...prevGroups];
          console.log('Updated groups:', updatedGroups);
          return updatedGroups;
        });

        setShowCreateGroup(false);
        setNewGroup({ name: '', description: '', group_icon: defaultIcon });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group. Please try again.');
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error)
    }
  };

  // const handleShareGroup = (groupId: number, groupUuid: string) => {
  //   const groupUrl = `${window.location.origin}/group/${groupUuid}/join`;
  //   navigator.clipboard.writeText(groupUrl).then(() => {
  //     setCopiedGroupId(groupId);
  //     setTimeout(() => setCopiedGroupId(null), 2000);
  //   });
  // };

  // const toggleMonth = (month: string) => {
  //   setCollapsedPersonMonths(prev => ({
  //     ...prev,
  //     [month]: !prev[month]
  //   }));
  // };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-page">
      {error && <div className="error-message">{error}</div>}

      <div className="header">
        <div className="header-top">
          <div className="brand">
            <h1 className="brand-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
              <img src="/splitfree_transp.svg" alt="SplitFree Logo" style={{ height: '2em', width: '2em' }} />
              SplitFree
            </h1>
            <p className="brand-tagline">Split expenses, stay free</p>
          </div>
          <div className="group-info">
            <h2 className="group-name">Your Groups</h2>
            <p className="group-subheader">Manage your expenses</p>
          </div>
        </div>
        <div className="header-bottom">
          <div className="user-info">
            <span className="user-name">Welcome, {userName}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
        <button
          className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Your Expenses
        </button>
      </div>

      {activeTab === 'groups' && (
        <div className="groups-section">
          <div className="groups-grid">
            {groups.map((group) => (
              <div
                key={group.id}
                className="group-card"
                onClick={() => navigate(`/group/${group.id}`)}
              >
                <div className="group-icon">{group.group_icon}</div>
                <div className="group-details">
                  <h3 className="group-name">{group.name}</h3>
                  <p className="group-meta">
                    <span className="members-count">{group.members.length} members</span>
                    <span className="created-date">
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </span>
                  </p>
                </div>
                <button
                  className="share-btn"
                  style={{ marginLeft: 'auto', position: 'static' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const groupUrl = `${window.location.origin}/group/${group.uuid}/join`;
                    navigator.clipboard.writeText(groupUrl).then(() => {
                      setCopiedGroupId(group.id);
                      setTimeout(() => setCopiedGroupId(null), 2000);
                    });
                  }}
                >
                  {copiedGroupId === group.id ? 'Copied' : 'Share'}
                </button>
              </div>
            ))}
            {nextGroupsUrl && (
              <button className="load-more-btn" onClick={loadMoreGroups}>
                Load More Groups
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'expenses' && personExpenses && (
        <div className="expenses-section">
          <p className="beta-message" >*BETA: Expenses include other person expenses too</p>
          <div className="person-summary">
            <div className="summary-card">
              <h3>Total Spent (This Month)</h3>
              <p className="amount">₹{(personTotalMonthExpenses as any).total_spent?.toFixed(2) ?? ''}</p>
            </div>
          </div>

          <div className="person-expenses-list">
            {Object.entries(
              (Array.isArray(personExpenses)
                ? personExpenses
                : (personExpenses && (personExpenses as { expenses?: Expense[] }).expenses)
                  ? (personExpenses as { expenses: Expense[] }).expenses
                  : []
              ).reduce((acc: Record<string, { month: string; total: number; expenses: Expense[] }>, expense: Expense) => {
                const date = new Date(expense.expense_date);
                const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                if (!acc[month]) {
                  acc[month] = {
                    month,
                    total: 0,
                    expenses: []
                  };
                }
                acc[month].total += parseFloat(expense.amount);
                acc[month].expenses.push(expense);
                return acc;
              }, {} as Record<string, { month: string; total: number; expenses: Expense[] }>))
            .map(([month, data]) => {
              const d = data as { month: string; total: number; expenses: Expense[] };
              const isCollapsed = collapsedPersonMonths[month] ?? false;

              return (
                <div key={month} className="month-group">
                  <div
                    className="month-header"
                    onClick={() => setCollapsedPersonMonths(prev => ({ ...prev, [month]: !prev[month] }))}
                  >
                    <h3>{d.month}</h3>
                    <span className="month-total">₹{d.total.toFixed(2)}</span>
                    <span className="collapse-icon">{isCollapsed ? '+' : '-'}</span>
                  </div>

                  {!isCollapsed && (
                    <div className="homepage-expenses-list">
                      {d.expenses.map(expense => (
                        <div key={expense.id} className="expense-card">
                          <div className="expense-icon">{expense.expense_icon}</div>
                          <div className="expense-details">
                            <h4>{expense.title}</h4>
                            <p className="expense-amount">₹{expense.amount}</p>
                            <p className="expense-date">
                              {new Date(expense.expense_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="expense-status">
                            {expense.paid_by.username === userName ? (
                              <span className="status paid">Paid</span>
                            ) : (
                              <span className="status owed">Owed</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {nextExpensesUrl && (
              <button className="load-more-btn" onClick={loadMoreExpenses}>
                Load More Expenses
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <button
          className="create-group-btn"
          onClick={() => setShowCreateGroup(true)}
        >
          Create New Group
        </button>
      )}

      {showCreateGroup && (
        <div className="create-group-modal">
          <div className="modal-content">
            <h3>Create New Group</h3>
            <div className="form-group" key="name-group">
              <label htmlFor="group-name">Group Name</label>
              <input
                type="text"
                id="group-name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="Enter group name"
              />
            </div>
            <div className="form-group" key="description-group">
              <label htmlFor="group-description">Description</label>
              <input
                type="text"
                id="group-description"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder="Enter group description"
              />
            </div>
            <div className="form-group" key="icon-group">
              <label htmlFor="group-icon">Icon</label>
              <input
                type="text"
                id="group-icon"
                value={newGroup.group_icon}
                onChange={(e) => setNewGroup({ ...newGroup, group_icon: e.target.value })}
                placeholder="Enter an emoji"
                maxLength={2}
              />
            </div>
            <div className="modal-actions" key="actions-group">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowCreateGroup(false);
                  setNewGroup({ name: '', description: '', group_icon: '👥' });
                }}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={handleCreateGroup}
                disabled={!newGroup.name.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage; 