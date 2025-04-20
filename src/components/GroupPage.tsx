import React, { useState, useEffect } from 'react'
import axios from 'axios'
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

const GroupPage: React.FC = () => {
  const [expenses, setExpenses] = useState<{ [key: string]: Expense }>({})
  const [balances, setBalances] = useState<Balance[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    group: 1,
    paid_by_id: 1,
    split_between: [] as number[],
    splits: [] as Split[],
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses')

  useEffect(() => {
    fetchExpenses()
    fetchGroupMembers()
  }, [])

  const fetchGroupMembers = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/v1/groups/1/', {
        headers: {
          'Authorization': 'Token d8be9494aeb7180bb06592b068eb8a29cd9a0154'
        }
      })
      // The response is an object with a "0" key containing the group data
      const groupData = response.data["0"]
      setGroupMembers(groupData.members)
    } catch (error) {
      console.error('Error fetching group members:', error)
      setError('Failed to fetch group members')
    }
  }

  const fetchExpenses = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/v1/expenses/expenses/1/', {
        headers: {
          // 'Authorization': `Token ${localStorage.getItem('token')}`
          'Authorization': 'Token d8be9494aeb7180bb06592b068eb8a29cd9a0154'
        }
      })
      setExpenses(response.data)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setError('Failed to fetch expenses')
    }
  }

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
        return { ...newExpense, splits: newSplits }
      }
      
      return newExpense
    })
  }

  const handleSplitChange = (userId: number, amount: string) => {
    setNewExpense(prev => {
      const newSplits = [...prev.splits]
      const totalAmount = parseFloat(prev.amount)
      
      // Update the changed user's amount
      const existingSplitIndex = newSplits.findIndex(split => split.user === userId)
      if (existingSplitIndex >= 0) {
        if (amount === '') {
          newSplits.splice(existingSplitIndex, 1)
        } else {
          newSplits[existingSplitIndex] = { user: userId, amount }
        }
      } else if (amount !== '') {
        newSplits.push({ user: userId, amount })
      }

      // Calculate remaining amount and users
      const changedAmount = amount === '' ? 0 : parseFloat(amount)
      const otherUsers = prev.split_between.filter(id => id !== userId)
      const remainingAmount = totalAmount - changedAmount

      // Distribute remaining amount equally among other users
      if (otherUsers.length > 0) {
        const equalAmount = (remainingAmount / otherUsers.length).toFixed(2)
        otherUsers.forEach(otherUserId => {
          const otherIndex = newSplits.findIndex(split => split.user === otherUserId)
          if (otherIndex >= 0) {
            newSplits[otherIndex] = { user: otherUserId, amount: equalAmount }
          } else {
            newSplits.push({ user: otherUserId, amount: equalAmount })
          }
        })
      }

      return { ...prev, splits: newSplits }
    })
  }

  const validateSplits = () => {
    const totalAmount = parseFloat(newExpense.amount)
    const totalSplitAmount = newExpense.splits.reduce((sum, split) => sum + parseFloat(split.amount), 0)
    
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
      // Convert splits_detail format to splits format for API
      const splits = newExpense.splits.map(split => ({
        amount: split.amount,
        user: split.user
      }))

      await axios.post('http://127.0.0.1:8000/api/v1/expenses/expenses/', {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        splits: splits
      }, {
        headers: {
          'Authorization': 'Token d8be9494aeb7180bb06592b068eb8a29cd9a0154'
        }
      })
      fetchExpenses()
      setIsModalOpen(false)
      setNewExpense({
        title: '',
        amount: '',
        group: 1,
        paid_by_id: 1,
        split_between: [],
        splits: [],
        notes: '',
        date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Error creating expense:', error)
      setError('Failed to create expense')
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
          <h2 className="group-subheader">Group Expenses</h2>
        </div>
        <div className="header-bottom">
          <button className="add-expense-btn" onClick={() => setIsModalOpen(true)}>
            Add Expense
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
          className={`tab ${activeTab === 'balances' ? 'active' : ''}`}
          onClick={() => setActiveTab('balances')}
        >
          Balances
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
      ) : (
        <div className="balances-section">
          <div className="balances-summary">
            <h2>Balances</h2>
            <div className="balance-cards">
              {balances.map((balance) => (
                <div key={balance.user} className="balance-card">
                  <div className="balance-user">{balance.user}</div>
                  <div className="balance-details">
                    {Object.entries(balance.owes).map(([user, amount]) => (
                      <div key={user} className="balance-owe">
                        <span className="owe-label">owes {user}</span>
                        <span className="owe-amount">${amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                                  splits: newSplits
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
                                value={newExpense.splits.find(split => split.user === member.id)?.amount || ''}
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