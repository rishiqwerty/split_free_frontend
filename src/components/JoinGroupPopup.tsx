import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './JoinGroupPopup.css';

interface GroupDetails {
  id: number;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  already_member?: boolean;
}

const JoinGroupPopup: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('authToken');
        const headers = token ? {
          'Authorization': `Token ${token}`,
        } : {};

        const response = await axios.get(
          `${API_URL}/api/v1/groups/${uuid}/`,
          { headers, withCredentials: true }
        );

        setGroupDetails(response.data);
      } catch (error: any) {
        console.error('Error fetching group details:', error);
        setError(error.response?.data?.detail || 'Failed to fetch group details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupDetails();
  }, [uuid]);

  const handleJoinGroup = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Store the group UUID in localStorage to join after login
      localStorage.setItem('pendingGroupJoin', uuid || '');
      navigate('/login');
      return;
    }
    // If user is already a member, redirect to the group page
    if (groupDetails?.already_member) {
        navigate(`/group/${groupDetails.id}`);
      }
    try {
      setIsLoading(true);
      setError(null);
      const headers = {
        'Authorization': `Token ${token}`,
      };

      const response = await axios.post(
        `${API_URL}/api/v1/groups/${uuid}/add-user/`,
        {},
        { headers, withCredentials: true }
      );

      if (response.status === 200) {
        navigate(`/group/${response.data.id}`);
      }
    } catch (error: any) {
      console.error('Error joining group:', error);
      setError(error.response?.data?.detail || 'Failed to join group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  if (isLoading && !groupDetails) {
    return (
      <div className="join-group-popup">
        <div className="popup-content">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-group-popup">
      <div className="popup-content">
        <h2>Join Group</h2>
        {groupDetails && (
          <div className="join-group-details">
            <h3 className="group-name">{groupDetails.name}</h3>
            <p className="group-description">{groupDetails.description}</p>
            <div className="group-meta">
              <p className="created-by">
                Created by: {groupDetails.created_by}
              </p>
              <p className="created-at">
                Created on: {new Date(groupDetails.created_at).toLocaleDateString()}
              </p>
            </div>
            {groupDetails.already_member && (
              <div className="already-member-message">
                You are already a member of this group
              </div>
            )}
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
        <div className="button-group">
          <button 
            className="cancel-btn"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="join-btn"
            onClick={handleJoinGroup}
            disabled={isLoading}
          >
            {isLoading ? 'Joining...' : groupDetails?.already_member ? 'Go to Group' : 'Join Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinGroupPopup; 