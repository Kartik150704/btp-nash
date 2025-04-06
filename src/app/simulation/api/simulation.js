import axios from "axios"

const authServicePort = `https://backend-auth-service.clow.in`

export const GetSimulations = async (adminId) => {

    let response = await axios.get(`${authServicePort}/simulation/admin/${adminId}`);
    return response.data;
}

export const CreateSimulation = async (name, adminId) => {
    let response = await axios.post(`${authServicePort}/simulation/`, { name, adminId });
    return response.data;
}

export const GetSimulationData = async (userId, simulationId) => {
    let response = await axios.post(`${authServicePort}/simulation/${simulationId}`, { userId });
    return response.data;
}

export const AddPermission=async (simulationId, userId,requestingUserId,type)=>{
    let response = await axios.post(`${authServicePort}/simulation/${simulationId}/permissions/add`, { userId, requestingUserId, type });
    return response.data;
} 

export const RemovePermission=async (simulationId, userId,requestingUserId,type)=>{
    let response = await axios.post(`${authServicePort}/simulation/${simulationId}/permissions/${requestingUserId}/remove`, { userId, requestingUserId, type });
    return response.data;
}