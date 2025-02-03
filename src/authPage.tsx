import { Outlet, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import './App.css'

type AuthOutletContext = {
  token: string,
};

function AuthPage() {
  const [token, setToken] = useState('');

  useEffect(() => {
    (async() => {
      const p_token = localStorage.getItem('p_token');
      if (p_token === null || p_token === "null" || +(new Date()) > JSON.parse(atob(p_token.split('.')[1])).exp*1000) {
        const request = await fetch(`${import.meta.env.VITE_API_BASE}/auth/guest`, {
          method: 'POST'
        });
        const res = await request.json();
        // TODO: error validation
        if (res.data.token === null) {
          console.error('WAAAAA');
        }
        setToken(res.data.token);
        localStorage.setItem('p_token', res.data.token);
      } else {
        setToken(p_token);
      }
    })();
  }, []);

  return (
    <>
      { token ?
        <Outlet
          context={
            {
              token,
            } satisfies AuthOutletContext
          }
        />
      :
        <h1>Loading...</h1>
      }
    </>
  );
}

function useAuthOutletContext() {
  return useOutletContext<AuthOutletContext>();
}

export { useAuthOutletContext };
export default AuthPage;
