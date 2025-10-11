import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useInputMode } from '@/context/InputModeContext';

const ChangeUser: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, resetUser } = useUser();
  const { setHandMode } = useInputMode();

  const [username, setUsername] = useState<string>(user?.username ?? '');

  // Force keyboard/mouse mode on mount for this page
  useEffect(() => {
    setHandMode(false);
  }, [setHandMode]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setUser({ username: trimmed });
    navigate('/');
  };

  const onReset = () => {
    resetUser();
    navigate('/');
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Change User</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter a username"
          style={{ display: 'block', width: '100%', padding: 8, marginTop: 8, marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">Change User</button>
          <button type="button" onClick={onReset}>Reset User</button>
        </div>
      </form>
    </div>
  );
};

export default ChangeUser;
