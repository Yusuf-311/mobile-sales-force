import { createContext, useContext, useState } from 'react';

const USERS = [
  { label: 'Andi',  userName: 'Andi',  role: 'mr',  token: 'token-mr1' },
  { label: 'Sari',  userName: 'Sari',  role: 'mr',  token: 'token-mr2' },
  { label: 'Doni',  userName: 'Doni',  role: 'dm',  token: 'token-dm'  },
  { label: 'Citra', userName: 'Citra', role: 'rsm', token: 'token-rsm' },
  { label: 'Budi',  userName: 'Budi',  role: 'mm',  token: 'token-mm'  },
];

export { USERS };

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token    = localStorage.getItem('token');
    const role     = localStorage.getItem('role');
    const userName = localStorage.getItem('userName');
    if (token && role && userName) return { token, role, userName };
    return null;
  });

  function login(selectedUser) {
    localStorage.setItem('token',    selectedUser.token);
    localStorage.setItem('role',     selectedUser.role);
    localStorage.setItem('userName', selectedUser.userName);
    setUser({ token: selectedUser.token, role: selectedUser.role, userName: selectedUser.userName });
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
