import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_URL } from '../config'
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
  created_at: string
}

interface Balance {
  user: string
  owes: { [key: string]: number }
}

// Overview summary types
interface SummaryUserDetail { user: { id: number; username: string; email: string }; paid: string; owed: string; }
interface SimplifiedTransaction { from_user: { id: number; username: string; email: string; first_name: string; }; to_user: { id: number; username: string; email: string; first_name: string; }; amount: string; }
interface Summary { total_spend: string; users_expense_details: SummaryUserDetail[]; total_balance: string; simplified_transactions: SimplifiedTransaction[]; }

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
    date: new Date().toISOString().split('T')[0]
  })
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'expenses' | 'overview' | 'activity'>('expenses')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [simplify, setSimplify] = useState<boolean>(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers = {
          'Authorization': `Token ${token}`,
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
      axios.get(`${API_URL}/api/v1/expenses/expenses/${groupId}/summary/?simplify=${simplify}`, {
        headers: { 'Authorization': `Token ${localStorage.getItem('authToken')}` },
        withCredentials: true,
      })
      .then(res => setSummary(res.data))
      .catch(err => setSummaryError(err.response?.data?.detail || 'Failed to load overview'))
      .finally(() => setSummaryLoading(false))
    }
  }, [activeTab, groupId, simplify])

  // Fetch activities when Tab is Activity
  useEffect(() => {
    if (activeTab === 'activity') {
      setActivitiesLoading(true)
      setActivitiesError(null)
      axios
        .get(`${API_URL}/api/v1/groups/${groupId}/activities/`, {
          headers: { Authorization: `Token ${localStorage.getItem('authToken')}` },
          withCredentials: true,
        })
        .then(res => setActivities(res.data))
        .catch(err => setActivitiesError(err.response?.data?.detail || 'Failed to load activities'))
        .finally(() => setActivitiesLoading(false))
    }
  }, [activeTab, groupId])

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
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Token ${token}`,
      };

      const splits = Object.entries(newExpense.splits).map(([userId, amount]) => ({
        amount: amount,
        user: parseInt(userId)
      }))

      const response = await axios.post(`${API_URL}/api/v1/expenses/expenses/`, {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        splits: splits
      }, { 
        headers,
        withCredentials: true 
      })
      setExpenses(prev => ({ ...prev, [response.data.id]: response.data }))
      setIsModalOpen(false)
      setNewExpense({
        title: '',
        amount: '',
        group: 1,
        paid_by_id: 1,
        split_between: [] as number[],
        splits: {} as { [key: number]: string },
        notes: '',
        date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Error creating expense:', error)
      setError('Failed to create expense')
    }
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Token ${token}`,
      };

      const response = await fetch(`${API_URL}/api/auth/logout/`, {
        method: 'POST',
        headers,
        credentials: 'include'
      })
      if (response.ok) {
        localStorage.removeItem('authToken');
        navigate('/')
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="group-page">
      {error && <div className="error-message">{error}</div>}
      
      <div className="header">
        <div className="header-top">
          <div className="brand">
            <h1 className="brand-name">SplitFree</h1>
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
        <div className="expenses-list">
          {Object.values(expenses).map((expense) => (
            <div 
              key={expense.id} 
              className="expense-card"
              onClick={() => setSelectedExpense(expense)}
            >
              <div className="expense-icon">💰</div>
              <div className="expense-details">
                <div className="expense-description">{expense.title}</div>
                <div className="expense-meta">
                  <span className="expense-amount">₹{expense.amount}</span>
                  <span className="expense-payer">paid by {expense.paid_by.username}</span>
                  <span className="expense-date">
                    {new Date(expense.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
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
                <div className="user-summary">
                  {summary.users_expense_details.map(detail => (
                    <div key={detail.user.id} className="summary-card">
                      <h3>{detail.user.username}</h3>
                      <p>Paid: ₹{detail.paid}</p>
                      <p>Owed: ₹{detail.owed}</p>
                    </div>
                  ))}
                </div>
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
                            <span className="transaction-from" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
                              {from?.username}
                            </span>
                            <span> to pay → </span>
                            <span className="transaction-to" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
                              {to?.username}
                            </span>
                            <span>: </span>
                            <span className="transaction-amount" style={{ color: 'lightgreen', fontWeight: 600 }}>
                              ₹{tran.amount}
                            </span>
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
      <button className="add-expense-btn" onClick={() => setIsModalOpen(true)}>
        Add Expense
      </button>
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Expense</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <input
                    type="date"
                    id="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
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
                  Add Expense
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
              <button className="close-btn" onClick={() => setSelectedExpense(null)}>×</button>
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
                    <span>Date:</span>
                    <span>{new Date(selectedExpense.created_at).toLocaleString()}</span>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupPage 