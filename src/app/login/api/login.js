import axios from "axios"

const authServicePort =  `https://backend-auth-service.clow.in`

export const Login= async (email) => {
    
    let response =await axios.post(`${authServicePort}/auth/login`, { email});
    return response.data;
}