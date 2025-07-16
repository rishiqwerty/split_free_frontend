import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AxiosResponse } from 'axios'
import { API_URL } from '../config'
import { auth } from '../firebase'
import { getAuth, signOut } from 'firebase/auth'
import './GroupPage.css'

interface User {
  id: number
  username: string
  email: string
}

interface GroupMember {
  id: number
  username: string
  email: string
}

interface SplitDetail {
  user: string
  amount: string
}

interface Split {
  amount: string
  user: number
}

interface Expense {
  id: number
  group: number
  title: string
  amount: string
  paid_by: User
  split_between: number[]
  splits_detail: SplitDetail[]
  splits: Split[]
  notes: string
  expense_date: string
  created_at: string
  expense_icon: string
}


// Overview summary types
// interface SummaryUserDetail { user: { id: number; username: string; email: string }; paid: string; owed: string; }
interface SimplifiedTransaction { from_user: { id: number; username: string; email: string; first_name: string; }; to_user: { id: number; username: string; email: string; first_name: string; }; amount: string; }
interface NonSimplifiedTransaction {
  from_user: User;
  to_user: User;
  amount: string;
  expense: string;
}

interface Summary {
  total_spend: string;
  // total_balance: string;
  // users_expense_details?: SummaryUserDetail[];
  simplified_transactions: SimplifiedTransaction[];
  non_simplified_transactions?: NonSimplifiedTransaction[];
}

// Activity types
interface Activity {
  user: { id: number; username: string; email: string; first_name?: string };
  name: string;
  description: string;
  timestamp: string;
}

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<{ [key: number]: Expense }>({})
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [groupName, setGroupName] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    group: 1,
    paid_by_id: 1,
    split_between: [] as number[],
    splits: {} as { [key: number]: string },
    notes: '',
    expense_date: new Date().toISOString().slice(0, 16)
  })
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'expenses' | 'overview' | 'activity'>('expenses')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [aiOverview, setAiOverview] = useState<string>('')
  const [aiOverviewLoading, setAiOverviewLoading] = useState(false)
  const [aiOverviewError, setAiOverviewError] = useState<string | null>(null)
  const [simplify, setSimplify] = useState<boolean>(false)
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null)
  const [collapsedMonths, setCollapsedMonths] = useState<{ [key: string]: boolean }>({})
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false)
  const [settleForm, setSettleForm] = useState<{ from_user: number; to_user: number; amount: string; description: string; transaction_date: string; maxAmount: number }>({
    from_user: 0,
    to_user: 0,
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().slice(0, 16),
    maxAmount: 0
  })

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

        const [membersResponse, expensesResponse] = await Promise.all([
          axios.get(`${API_URL}/api/v1/groups/${groupId}/`, {
            headers,
            withCredentials: true
          }),
          axios.get(`${API_URL}/api/v1/expenses/expenses/${groupId}/`, {
            headers,
            withCredentials: true
          })
        ])

        if (membersResponse.status === 401 || expensesResponse.status === 401) {
          navigate('/')
          return
        }

        setGroupName(membersResponse.data["0"].name)
        setGroupMembers(membersResponse.data["0"].members)
        setUserName(membersResponse.data["0"].logged_in_user)
        setSimplify(membersResponse.data["0"].simplify_debt)
        const expensesMap = expensesResponse.data.reduce((acc: { [key: number]: Expense }, expense: Expense) => {
          acc[expense.id] = expense
          return acc
        }, {})
        setExpenses(expensesMap)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load data. Please try again later.')
      }
    }

    fetchData()
  }, [groupId, navigate])

  // Fetch overview summary when Tab is Overview
  useEffect(() => {
    if (activeTab === 'overview') {
      setSummaryLoading(true)
      setSummaryError(null)
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      user.getIdToken().then(idToken => {
        axios.get(`${API_URL}/api/v1/expenses/expenses/${groupId}/summary/?simplify=${simplify}`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          withCredentials: true,
        })
          .then(res => setSummary(res.data))
          .catch(err => setSummaryError(err.response?.data?.detail || 'Failed to load overview'))
          .finally(() => setSummaryLoading(false))
      });
    }
  }, [activeTab, groupId, simplify, navigate])

  // Fetch activities when Tab is Activity
  useEffect(() => {
    if (activeTab === 'activity') {
      setActivitiesLoading(true)
      setActivitiesError(null)
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      user.getIdToken().then(idToken => {
        axios.get(`${API_URL}/api/v1/groups/${groupId}/activities/`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          withCredentials: true,
        })
          .then(res => setActivities(res.data))
          .catch(err => setActivitiesError(err.response?.data?.detail || 'Failed to load activities'))
          .finally(() => setActivitiesLoading(false))
      });
    }
  }, [activeTab, groupId, navigate])

  // Fetch AI overview
  useEffect(() => {
    const fetchAiOverview = async () => {
      try {
        setAiOverviewLoading(true)
        setAiOverviewError(null)
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          return;
        }
        const idToken = await user.getIdToken();
        const headers = {
          'Authorization': `Bearer ${idToken}`,
        }

        const response = await axios.get(`${API_URL}/api/v1/groups/${groupId}/overview/`, {
          headers,
          withCredentials: true
        })

        setAiOverview(response.data.ai_overview)
      } catch (error) {
        console.error('Error fetching AI overview:', error)
        setAiOverviewError('Failed to load AI overview')
      } finally {
        setAiOverviewLoading(false)
      }
    }

    fetchAiOverview()
  }, [groupId, navigate])

  const handleAmountChange = (amount: string) => {
    setNewExpense(prev => {
      const newExpense = { ...prev, amount }

      // If there are selected users, update their split amounts
      if (newExpense.split_between.length > 0) {
        const equalAmount = (parseFloat(amount) / newExpense.split_between.length).toFixed(2)
        const newSplits = newExpense.split_between.map(userId => ({
          user: userId,
          amount: equalAmount
        }))
        return { ...newExpense, splits: newSplits.reduce((acc, split) => ({ ...acc, [split.user]: split.amount }), {}) }
      }

      return newExpense
    })
  }

  const handleSplitChange = (userId: number, amount: string) => {
    setNewExpense(prev => {
      const newSplits = { ...prev.splits }
      const totalAmount = parseFloat(prev.amount)

      // Update the changed user's amount
      if (amount === '') {
        delete newSplits[userId]
      } else {
        newSplits[userId] = amount
      }

      // Calculate remaining amount and users
      const changedAmount = amount === '' ? 0 : parseFloat(amount)
      const otherUsers = prev.split_between.filter(id => id !== userId)
      const remainingAmount = totalAmount - changedAmount

      // Distribute remaining amount equally among other users
      if (otherUsers.length > 0) {
        const equalAmount = (remainingAmount / otherUsers.length).toFixed(2)
        otherUsers.forEach(otherUserId => {
          newSplits[otherUserId] = equalAmount
        })
      }

      return { ...prev, splits: newSplits }
    })
  }

  const validateSplits = () => {
    const totalAmount = parseFloat(newExpense.amount)
    const totalSplitAmount = Object.values(newExpense.splits).reduce((sum, amount) => sum + parseFloat(amount), 0)

    if (totalSplitAmount > totalAmount) {
      setError('Total split amount cannot exceed the expense amount')
      return false
    }

    if (totalSplitAmount < totalAmount) {
      setError('Total split amount must equal the expense amount')
      return false
    }

    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateSplits()) {
      return
    }

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

      const splits = Object.entries(newExpense.splits).map(([userId, amount]) => ({
        amount: amount,
        user: parseInt(userId)
      }))
      let response: AxiosResponse<Expense>
      if (editingExpenseId) {
        response = await axios.put(
          `${API_URL}/api/v1/expenses/expense/update/${editingExpenseId}/`,
          { ...newExpense, amount: parseFloat(newExpense.amount), splits },
          { headers, withCredentials: true }
        )
      } else {
        response = await axios.post(
          `${API_URL}/api/v1/expenses/expenses/`,
          { ...newExpense, amount: parseFloat(newExpense.amount), splits },
          { headers, withCredentials: true }
        )
      }
      setExpenses(prev => ({ ...prev, [response.data.id]: response.data }))
      setIsModalOpen(false)
      setEditingExpenseId(null)
      setNewExpense({
        title: '',
        amount: '',
        group: parseInt(groupId ?? '1', 10),
        paid_by_id: 1,
        split_between: [] as number[],
        splits: {} as { [key: number]: string },
        notes: '',
        expense_date: new Date().toISOString().slice(0, 16)
      })
    } catch (error) {
      console.error('Error creating expense:', error)
      setError('Failed to create expense')
    }
  }

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error)
    }
  };

  // Handler to delete an expense
  const handleDeleteExpense = async (expenseId: number) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      const idToken = await user.getIdToken();
      await axios.delete(`${API_URL}/api/v1/expenses/expense/delete/${expenseId}/`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
        withCredentials: true,
      });
      // Remove from local state
      setExpenses(prev => {
        const updated = { ...prev };
        delete updated[expenseId];
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  // Handler to settle a simplified transaction
  // const settleTransaction = async (tran: SimplifiedTransaction) => {
  //   try {
  //     const token = localStorage.getItem('authToken');
  //     const headers = { 'Authorization': `Token ${token}` };
  //     // Create transaction
  //     await axios.post(
  //       `${API_URL}/api/v1/transactions/`,
  //       {
  //         group: parseInt(groupId ?? '0', 10),
  //         from_user: tran.from_user.id,
  //         to_user: tran.to_user.id,
  //         amount: parseFloat(tran.amount),
  //         transaction_date: new Date().toISOString().slice(0,16)
  //       },
  //       { headers, withCredentials: true }
  //     );
  //     // Refresh summary
  //     const summaryRes = await axios.get(
  //       `${API_URL}/api/v1/expenses/expenses/${groupId}/summary/?simplify=${simplify}`,
  //       { headers, withCredentials: true }
  //     );
  //     setSummary(summaryRes.data);
  //   } catch (error) {
  //     console.error('Error settling transaction:', error);
  //     setSummaryError('Failed to settle transaction');
  //   }
  // }

  // Open settlement dialog with pre-filled values
  const openSettleModal = (tran: SimplifiedTransaction) => {
    setSettleForm({
      from_user: tran.from_user.id,
      to_user: tran.to_user.id,
      amount: tran.amount,
      description: '',
      transaction_date: new Date().toISOString().slice(0, 16),
      maxAmount: parseFloat(tran.amount)
    });
    setIsSettleModalOpen(true);
  };

  // Open settlement dialog for a summary user (non-simplified)
  // const openSettleFromSummary = (detail: SummaryUserDetail) => {
  //   const current = groupMembers.find(m => m.username === userName);
  //   setSettleForm({
  //     from_user: detail.user.id,
  //     to_user: current?.id ?? 0,
  //     amount: detail.owed,
  //     description: '',
  //     transaction_date: new Date().toISOString().slice(0,16),
  //     maxAmount: parseFloat(detail.owed)
  //   });
  //   setIsSettleModalOpen(true);
  // };

  // Open settlement dialog for a non-simplified transaction
  const openSettleFromTransaction = (tx: NonSimplifiedTransaction) => {
    setSettleForm({
      from_user: tx.from_user.id,
      to_user: tx.to_user.id,
      amount: tx.amount,
      description: tx.expense,
      transaction_date: new Date().toISOString().slice(0, 16),
      maxAmount: parseFloat(tx.amount)
    });
    setIsSettleModalOpen(true);
  };

  // Confirm settlement with edited values
  const handleConfirmSettle = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      const idToken = await user.getIdToken();
      const headers = { 'Authorization': `Bearer ${idToken}` };
      await axios.post(
        `${API_URL}/api/v1/transactions/`,
        {
          group: parseInt(groupId ?? '0', 10),
          from_user: settleForm.from_user,
          to_user: settleForm.to_user,
          description: settleForm.description,
          amount: parseFloat(settleForm.amount),
          transaction_date: settleForm.transaction_date
        },
        { headers, withCredentials: true }
      );
      const summaryRes = await axios.get(
        `${API_URL}/api/v1/expenses/expenses/${groupId}/summary/?simplify=${simplify}`,
        { headers, withCredentials: true }
      );
      setSummary(summaryRes.data);
      setIsSettleModalOpen(false);
    } catch (error) {
      console.error('Error settling transaction:', error);
      setSummaryError('Failed to settle transaction');
    }
  };

  return (
    <div className="group-page">
      {error && <div className="error-message">{error}</div>}

      <div className="header">
        <div className="header-top">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <h1 className="brand-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <img src="/splitfree_transp.svg" alt="SplitFree Logo" style={{ height: '2em', width: '2em' }} />
            SplitFree
            </h1>
            <p className="brand-tagline">Split expenses, stay free</p>
          </div>
          <div className="group-info">
            <h2 className="group-name">{groupName}</h2>
            <p className="group-subheader">Group Expenses</p>
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

      {/* AI Overview Section */}
      <div className="ai-overview-section">
        {aiOverviewLoading ? (
          <div className="ai-overview-loading">Loading AI overview...</div>
        ) : aiOverviewError ? (
          <div className="ai-overview-error">{aiOverviewError}</div>
        ) : (
          <div className="ai-overview-content">
            <p>{aiOverview}</p>
          </div>
        )}
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses
        </button>
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
      </div>

      {activeTab === 'expenses' ? (
        <div className="group-page-expenses-list">
          {(() => {
            const expensesArray = Object.values(expenses);
            expensesArray.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
            const groups: { [key: string]: Expense[] } = {};
            expensesArray.forEach(exp => {
              const d = new Date(exp.expense_date);
              const key = `${d.getFullYear()}-${d.getMonth()}`;
              (groups[key] = groups[key] || []).push(exp);
            });
            const entries = Object.entries(groups);
            return entries.map(([key, exps], index) => {
              const [year, month] = key.split('-');
              const label = new Intl.DateTimeFormat('default', { month: 'long', year: 'numeric' }).format(new Date(Number(year), Number(month)));
              const defaultCollapsed = index !== 0;
              const collapsed = collapsedMonths[key] !== undefined ? collapsedMonths[key] : defaultCollapsed;
              return (
                <div key={key} className="expenses-month-group">
                  <div className="month-header" onClick={() => setCollapsedMonths(prev => ({ ...prev, [key]: !prev[key] }))}>
                    {label} {collapsed ? '+' : '-'}
                  </div>
                  {!collapsed && exps.map(expense => (
                    <div key={expense.id} className="expense-card" onClick={() => setSelectedExpense(expense)}>
                      <div className="expense-icon">{expense.expense_icon}</div>
                      <div className="expense-details">
                        <div className="expense-description">{expense.title}</div>
                        <div className="expense-payer">paid by {expense.paid_by.username}</div>
                      </div>
                      <div className="expense-date">{new Date(expense.expense_date).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              );
            });
          })()}
        </div>
      ) : activeTab === 'overview' ? (
        <div className="overview-section">
          <div className="overview-toggle">
            <label>
              <input
                type="checkbox"
                checked={simplify}
                onChange={() => setSimplify(!simplify)}
              />
              Simplify Transactions
            </label>
          </div>

          {summaryLoading && <div className="loading">Loading overview...</div>}
          {summaryError && <div className="error-message">{summaryError}</div>}
          {summary && (
            <>
              <h2>Total Spent: ₹{summary.total_spend}</h2>
              {!simplify && (
                <>
                  <h3>Balance</h3>
                  {(summary.non_simplified_transactions && summary.non_simplified_transactions.length > 0) ? (
                    <div className="transaction-list">
                      {summary.non_simplified_transactions.map((tx, idx) => (
                        <div key={idx} className="transaction-card">
                          <span><span className="transaction-from">{tx.from_user.username}</span> to pay → <span className="transaction-to">{tx.to_user.username}</span></span>
                          <span className='transaction-amount'> ₹{tx.amount}</span>

                          <button className="settle-btn" onClick={() => openSettleFromTransaction(tx)}>
                            Settle
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No transactions available.</p>
                  )}
                </>
              )}
              {simplify && (
                <>
                  <h3>Simplified Transactions</h3>
                  {Array.isArray(summary?.simplified_transactions) && summary.simplified_transactions.length > 0 ? (
                    <div className="transaction-list">
                      {summary.simplified_transactions.map((tran, idx) => {
                        const from = groupMembers.find(m => m.id === tran.from_user.id)
                        const to = groupMembers.find(m => m.id === tran.to_user.id)
                        return (
                          <div key={idx} className="transaction-card">
                            <span>
                              <span className="transaction-from" style={{ fontWeight: 600 }}>{from?.username}</span> to pay → <span className="transaction-to" style={{ fontWeight: 600 }}>{to?.username}</span>
                            </span>

                            <span className="transaction-amount" style={{ color: '#00a68c', fontWeight: 600 }}>
                              ₹{tran.amount}
                            </span>
                            <button className="settle-btn" onClick={() => openSettleModal(tran)}>
                              Settle
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p>No simplified transactions available.</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      ) : activeTab === 'activity' ? (
        <div className="activity-section">
          {activitiesLoading && <div className="loading">Loading activities...</div>}
          {activitiesError && <div className="error-message">{activitiesError}</div>}
          {activities.length > 0 ? (
            <div className="activity-list">
              {activities.map((act, idx) => (
                <div key={idx} className="activity-card">
                  <p><strong className="transaction-from">{act.user.username}</strong> → {act.name}</p>
                  <p>{act.description}</p>
                  <span className="activity-timestamp">{new Date(act.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No activities yet.</p>
          )}
        </div>
      ) : null}
      <button
        className="add-expense-btn"
        onClick={() => {
          // Reset form for new expense (datetime-local)
          setEditingExpenseId(null);
          setNewExpense({
            title: '',
            amount: '',
            group: parseInt(groupId ?? '1', 10),
            paid_by_id: groupMembers[0]?.id || 1,
            split_between: [] as number[],
            splits: {} as { [key: number]: string },
            notes: '',
            expense_date: new Date().toISOString().slice(0, 16)
          });
          setIsModalOpen(true);
        }}
      >
        Add Expense
      </button>
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingExpenseId ? 'Edit Expense' : 'Add New Expense'}</h3>
              <button className="close-btn" onClick={() => { setIsModalOpen(false); setEditingExpenseId(null); }}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="date">Expense Date</label>
                  <input
                    type="datetime-local"
                    id="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    type="text"
                    id="title"
                    value={newExpense.title}
                    onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                    placeholder="What was this expense for?"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount</label>
                  <div className="amount-input">
                    <span className="currency">₹</span>
                    <input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Paid By</label>
                  <select
                    value={newExpense.paid_by_id}
                    onChange={(e) => setNewExpense({ ...newExpense, paid_by_id: parseInt(e.target.value) })}
                    required
                  >
                    {groupMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.username}
                      </option>
                    ))}
                  </select>
                </div>

                {newExpense.amount && (
                  <div className="form-group">
                    <label>Split Between</label>
                    <div className="members-list">
                      {groupMembers.map((member) => (
                        <div key={member.id} className="member-split">
                          <div className="member-checkbox">
                            <input
                              type="checkbox"
                              id={`member-${member.id}`}
                              checked={newExpense.split_between.includes(member.id)}
                              onChange={(e) => {
                                const newSplitBetween = e.target.checked
                                  ? [...newExpense.split_between, member.id]
                                  : newExpense.split_between.filter(id => id !== member.id);

                                // Update splits when users are added/removed
                                const equalAmount = (parseFloat(newExpense.amount) / (newSplitBetween.length || 1)).toFixed(2)
                                const newSplits = newSplitBetween.map(userId => ({
                                  user: userId,
                                  amount: equalAmount
                                }))

                                setNewExpense({
                                  ...newExpense,
                                  split_between: newSplitBetween,
                                  splits: newSplits.reduce((acc, split) => ({ ...acc, [split.user]: split.amount }), {})
                                });
                              }}
                            />
                            <label htmlFor={`member-${member.id}`}>{member.username}</label>
                          </div>
                          {newExpense.split_between.includes(member.id) && (
                            <div className="split-amount-input">
                              <span className="currency">₹</span>
                              <input
                                type="number"
                                value={newExpense.splits[member.id] || ''}
                                onChange={(e) => handleSplitChange(member.id, e.target.value)}
                                placeholder="Amount"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    placeholder="Add any notes (optional)"
                  />
                </div>

                <button type="submit" className="submit-btn">
                  {editingExpenseId ? 'Update Expense' : 'Add Expense'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedExpense && (
        <div className="modal-overlay" onClick={() => setSelectedExpense(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Expense Details</h3>
              <div className="modal-actions">
                <button
                  className="edit-btn"
                  onClick={() => {
                    if (!selectedExpense) return;
                    const expenseToEdit = selectedExpense;
                    const splitsArray = expenseToEdit.splits && expenseToEdit.splits.length > 0
                      ? expenseToEdit.splits
                      : expenseToEdit.splits_detail.map(detail => {
                        const member = groupMembers.find(m => m.username === detail.user);
                        return { user: member?.id ?? 0, amount: detail.amount };
                      });
                    setSelectedExpense(null);
                    setEditingExpenseId(expenseToEdit.id);
                    setNewExpense({
                      title: expenseToEdit.title,
                      amount: expenseToEdit.amount,
                      group: expenseToEdit.group,
                      paid_by_id: expenseToEdit.paid_by.id,
                      split_between: splitsArray.map(s => s.user),
                      splits: splitsArray.reduce((acc, s) => ({ ...acc, [s.user]: s.amount }), {}),
                      notes: expenseToEdit.notes,
                      expense_date: expenseToEdit.created_at.slice(0, 16)
                    });
                    setIsModalOpen(true);
                  }}
                  title="Edit Expense"
                >
                  Edit
                </button>
                <button
                  className="delete-btn"
                  onClick={() => { handleDeleteExpense(selectedExpense!.id); setSelectedExpense(null); }}
                  title="Delete Expense"
                >
                  Delete
                </button>
                <button
                  className="close-btn"
                  onClick={() => setSelectedExpense(null)}
                >×</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="expense-detail">
                <h4>{selectedExpense.title}</h4>
                {selectedExpense.notes && (
                  <p className="expense-notes">{selectedExpense.notes}</p>
                )}
                <div className="expense-amount-detail">
                  <div className="expense-amount-row">
                    <span>Total Amount:</span>
                    <span>₹{selectedExpense.amount}</span>
                  </div>
                  <div className="expense-amount-row">
                    <span>Paid by:</span>
                    <span>{selectedExpense.paid_by.username}</span>
                  </div>
                  <div className="expense-amount-row">
                    <span>Expense Date:</span>
                    <span>{new Date(selectedExpense.expense_date).toLocaleString()}</span>
                  </div>
                </div>
                <div className="expense-splits">
                  <h5>Split Details</h5>
                  {selectedExpense.splits_detail && selectedExpense.splits_detail.length > 0 ? (
                    selectedExpense.splits_detail.map((split, index) => (
                      <div key={index} className="split-item">
                        <span>{split.user}</span>
                        <span>₹{split.amount}</span>
                      </div>
                    ))
                  ) : (
                    selectedExpense.split_between.map((userId, index) => {
                      const equalAmount = (parseFloat(selectedExpense.amount) / selectedExpense.split_between.length).toFixed(2);
                      const member = groupMembers.find(member => member.id === userId);
                      return (
                        <div key={index} className="split-item">
                          <span>{member ? member.username : `User ${userId}`}</span>
                          <span>₹{equalAmount}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="expense-date-detail">
                  <span>Creation Date:</span>
                  <span>{new Date(selectedExpense.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSettleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSettleModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Settlement</h3>
              <button className="close-btn" onClick={() => setIsSettleModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={e => { e.preventDefault(); handleConfirmSettle(); }}>
                <div className="form-group">
                  <label htmlFor="settle-from">Payer</label>
                  <select
                    id="settle-from"
                    value={settleForm.from_user}
                    onChange={e => setSettleForm(prev => ({ ...prev, from_user: parseInt(e.target.value) }))}
                    required
                  >
                    {groupMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.username}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="settle-to">Receiver</label>
                  <select
                    id="settle-to"
                    value={settleForm.to_user}
                    onChange={e => setSettleForm(prev => ({ ...prev, to_user: parseInt(e.target.value) }))}
                    required
                  >
                    {groupMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.username}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="settle-amount">Amount</label>
                  <input
                    type="number"
                    id="settle-amount"
                    min="0"
                    max={settleForm.maxAmount}
                    step="0.01"
                    value={settleForm.amount}
                    onChange={e => setSettleForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
                {parseFloat(settleForm.amount) > settleForm.maxAmount && (
                  <p className="error-message">Amount cannot exceed ₹{settleForm.maxAmount}</p>
                )}
                <div className="form-group">
                  <label htmlFor="settle-description">Description</label>
                  <input
                    type="text"
                    id="settle-description"
                    value={settleForm.description}
                    onChange={e => setSettleForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="settle-date">Date</label>
                  <input
                    type="datetime-local"
                    id="settle-date"
                    value={settleForm.transaction_date}
                    onChange={e => setSettleForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsSettleModalOpen(false)}>Cancel</button>
                  <button type="submit" className="confirm-btn" disabled={parseFloat(settleForm.amount) > settleForm.maxAmount}>Confirm</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupPage 