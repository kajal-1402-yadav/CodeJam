import { createContext, useEffect, useReducer } from "react"

export const AuthContext = createContext();

export const authReducer = (state, action) => {
    switch(action.type){
        case 'LOGIN':
            return { user : action.payload, isLoading: false}
        case 'LOGOUT':
            return { user: null, isLoading: false }
        case 'UPDATE_USER':
            return { user: { ...state.user, ...action.payload }, isLoading: false }
        case 'AUTH_LOADING':
            return { ...state, isLoading: true }
        default : 
            return state
    }
}

const AuthContextProvider = ({children}) => {
    const[state, dispatch] = useReducer(authReducer, {user : null, isLoading: true});

    useEffect(() => {
        dispatch({type: 'AUTH_LOADING'});
        const user = JSON.parse(localStorage.getItem("user"))

        if(user){
            dispatch({type : 'LOGIN' , payload : user})
        } else {
            dispatch({type: 'LOGOUT'});
        }
    },[])

    return(
        <AuthContext.Provider value={{...state, dispatch}}>
            { children }
        </AuthContext.Provider>
    )
}

export default AuthContextProvider;