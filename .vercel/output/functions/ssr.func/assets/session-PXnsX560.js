import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jsx } from "react/jsx-runtime";
//#region src/lib/session.tsx
var KEY = "tms.session";
var OPERATOR_ID = "admin";
var OPERATOR_PASSWORD = "testplay";
var SessionContext = createContext(null);
function SessionProvider({ children }) {
	const [user, setUser] = useState(null);
	const [ready, setReady] = useState(false);
	useEffect(() => {
		setUser(window.localStorage.getItem(KEY));
		setReady(true);
	}, []);
	const signIn = useCallback((id, password) => {
		if (id.trim().toLowerCase() !== OPERATOR_ID || password !== OPERATOR_PASSWORD) return false;
		window.localStorage.setItem(KEY, OPERATOR_ID);
		setUser(OPERATOR_ID);
		return true;
	}, []);
	const signOut = useCallback(() => {
		window.localStorage.removeItem(KEY);
		setUser(null);
	}, []);
	const value = useMemo(() => ({
		ready,
		user,
		signIn,
		signOut
	}), [
		ready,
		user,
		signIn,
		signOut
	]);
	return /* @__PURE__ */ jsx(SessionContext.Provider, {
		value,
		children
	});
}
function useSession() {
	const ctx = useContext(SessionContext);
	if (!ctx) throw new Error("useSession must be used inside SessionProvider");
	return ctx;
}
//#endregion
export { useSession as n, SessionProvider as t };
