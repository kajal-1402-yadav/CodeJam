import { useState } from 'react';
import useAuthContext from './useAuthContext';
import { signupUser } from '../services/authService';

const useSignup = () => {
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(null)
    const { dispatch } = useAuthContext()

    const signup = async (username, email, password) => {
        setIsLoading(true)
        setError(null)

        const result = await signupUser(username, email, password);

        if (!result.success) {
            const raw = result.error || 'Signup failed';
            let message = raw;
            if (/All fields must be filled/i.test(raw)) message = 'Please fill in all fields.';
            else if (/Email is not valid/i.test(raw)) message = 'Please enter a valid email address.';
            else if (/Password is not strong enough/i.test(raw)) message = 'Password must be 8+ chars with upper, lower, number and symbol.';
            else if (/Email already exists/i.test(raw)) message = 'An account with this email already exists.';
            else if (/username/i.test(raw) && /exists|required/i.test(raw)) message = 'Please choose a different username.';
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
    
    return { signup, isLoading, error }
}

export default useSignup;