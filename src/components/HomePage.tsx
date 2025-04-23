import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './HomePage.css';

interface Group {
  id: number;
  name: string;
  description: string;
  created_at: string;
  members: any[];
  uuid: string;
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
    description: ''
  });
  const [copiedGroupId, setCopiedGroupId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers = {
          'Authorization': `Token ${token}`,
        };

        const [groupsResponse, userResponse] = await Promise.all([
          axios.get(`${API_URL}/api/v1/groups/`, {
            headers,
            withCredentials: true
          }),
          axios.get(`${API_URL}/auth/get-user/`, {
            headers,
            withCredentials: true
          })
        ]);

        if (groupsResponse.status === 401 || userResponse.status === 401) {
          navigate('/login');
          return;
        }

        setGroups(groupsResponse.data);
        setUserName(userResponse.data.first_name);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleGroupClick = (groupId: number) => {
    navigate(`/group/${groupId}`);
  };

  const handleCreateGroup = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Token ${token}`,
      };

      const response = await axios.post(
        `${API_URL}/api/v1/groups/create/`,
        newGroup,
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
          members: response.data.members || []
        };

        setGroups(prevGroups => {
          const updatedGroups = [newGroupData, ...prevGroups];
          console.log('Updated groups:', updatedGroups);
          return updatedGroups;
        });

        setShowCreateGroup(false);
        setNewGroup({ name: '', description: '' });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group. Please try again.');
    }
  };

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
      });
      if (response.ok) {
        localStorage.removeItem('authToken');
        navigate('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleShareGroup = (groupId: number, groupUuid: string) => {
    const groupUrl = `${window.location.origin}/group/${groupUuid}/join`;
    navigator.clipboard.writeText(groupUrl).then(() => {
      setCopiedGroupId(groupId);
      setTimeout(() => setCopiedGroupId(null), 2000);
    });
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-page">
      {error && <div className="error-message">{error}</div>}
      
      <div className="header">
        <div className="header-top">
          <div className="brand">
            <h1 className="brand-name">SplitFree</h1>
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

      <div className="groups-section">
        <div className="groups-grid">
          {groups.map((group) => (
            <div 
              key={group.id} 
              className="group-card"
              onClick={() => handleGroupClick(group.id)}
            >
              <div className="group-icon">👥</div>
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareGroup(group.id, group.uuid);
                }}
              >
                {copiedGroupId === group.id ? 'Copied!' : 'Share'}
              </button>
            </div>
          ))}
        </div>
        <button 
          className="create-group-btn"
          onClick={() => setShowCreateGroup(true)}
        >
          Create New Group
        </button>
      </div>

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
            <div className="modal-actions" key="actions-group">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowCreateGroup(false);
                  setNewGroup({ name: '', description: '' });
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