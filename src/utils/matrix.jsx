export const parseMatrix = (jsonString) => {
    try {
        const matrix = JSON.parse(jsonString)
        return matrix
    } catch (error) {
        console.error("Invalid JSON for matrix:", error)
        return []
    }
}

export const computeRiskScores = (
    W_adj,
    N_topology,
    numSubsystems,
    w1,
    w2
) => {
    const sFunDepArray = []
    const sTDepArray = []
    const rAdjArray = []

    for (let s = 0; s < numSubsystems; s++) {
        const sFunDep = W_adj[s].reduce((sum, val) => sum + val, 0)
        const sTDep = N_topology[s].reduce((sum, val) => sum + val, 0)
        const rAdj = w1 * sFunDep + w2 * sTDep

        sFunDepArray.push(sFunDep)
        sTDepArray.push(sTDep)
        rAdjArray.push(rAdj)
    }

    return rAdjArray
}
