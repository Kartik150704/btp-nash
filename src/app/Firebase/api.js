import axios from "axios"

const authServicePort = `http://localhost:5000`

export const Login= async (email) => {
    
    let response =await axios.post(`${authServicePort}/rider/login`, { email});
    return response.data;
}