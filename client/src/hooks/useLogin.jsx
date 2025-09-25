import { useState } from 'react';
import useAuthContext from './useAuthContext';


const useLogin = () => {
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(null)
    const { dispatch } = useAuthContext()

    const login = async (identifier, password) => {
        setIsLoading(true)
        setError(null)

        try {
            const baseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:4000'
            const response = await fetch(`${baseUrl}/api/auth/login`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identifier, password })
            })

            const json = await response.json()

            if (!response.ok) {
                // Friendlier error messages
                const raw = json?.error || 'Login failed'
                let message = raw
                if (/All fields must be filled/i.test(raw)) message = 'Please enter your email or username and password.'
                else if (/Incorrect credentials/i.test(raw)) message = 'No account found with those details.'
                else if (/Incorrect password/i.test(raw)) message = 'Incorrect password. Please try again.'
                setIsLoading(false)
                setError(message)
                return;
            }

            if (response.ok) {
                //save the user to local storage
                localStorage.setItem('user', JSON.stringify(json))
                //update the auth context

                dispatch({ type: 'LOGIN', payload: json })
                setIsLoading(false);
            }
        }
        catch (err) {
            setError('An error occurred during login')
            setIsLoading(false)
        }

    }
    return { login, isLoading, error }

}

export default useLogin;