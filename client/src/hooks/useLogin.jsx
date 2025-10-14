import { useState } from 'react';
import useAuthContext from './useAuthContext';
import { loginUser } from '../services/authService';

const useLogin = () => {
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(null)
    const { dispatch } = useAuthContext()

    const login = async (identifier, password) => {
        setIsLoading(true)
        setError(null)

        const result = await loginUser(identifier, password);

        if (!result.success) {
            const raw = result.error || 'Login failed'
            let message = raw
            if (/All fields must be filled/i.test(raw)) message = 'Please enter your email or username and password.'
            else if (/Incorrect credentials/i.test(raw)) message = 'No account found with those details.'
            else if (/Incorrect password/i.test(raw)) message = 'Incorrect password. Please try again.'
            setIsLoading(false)
            setError(message)
            return false;
        }

        // Save the user to local storage
        localStorage.setItem('user', JSON.stringify(result.data))
        
        // Update the auth context
        dispatch({ type: 'LOGIN', payload: result.data })
        setIsLoading(false);
        return true;
    }
    
    return { login, isLoading, error }
}

export default useLogin;