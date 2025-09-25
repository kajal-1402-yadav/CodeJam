import {useState} from 'react';
import useAuthContext  from './useAuthContext';


const useSignup = () =>{
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(null)
    const {dispatch} = useAuthContext()

    const signup = async (username ,email, password) =>{
        setIsLoading(true)
        setError(null)

        const baseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:4000'
        const response = await fetch(`${baseUrl}/api/auth/signup`, {
            method : "POST",
            headers : {
                'Content-Type' : 'application/json'
            },
            body : JSON.stringify({username,email, password})
        })

        const json = await response.json()

        if(!response.ok){
            const raw = json?.error || 'Signup failed';
            let message = raw;
            if (/All fields must be filled/i.test(raw)) message = 'Please fill in all fields.';
            else if (/Email is not valid/i.test(raw)) message = 'Please enter a valid email address.';
            else if (/Password is not strong enough/i.test(raw)) message = 'Password must be 8+ chars with upper, lower, number and symbol.';
            else if (/Email already exists/i.test(raw)) message = 'An account with this email already exists.';
            else if (/username/i.test(raw) && /exists|required/i.test(raw)) message = 'Please choose a different username.';
            setIsLoading(false)
            setError(message)
            return;
        }

        if (response.ok){

            //save the user to local storage
            localStorage.setItem('user', JSON.stringify(json))
            //update the auth context

            dispatch({type : 'LOGIN', payload : json})
            setIsLoading(false);
        } 
        
    } 
    return {signup, isLoading, error}

}

export default  useSignup;