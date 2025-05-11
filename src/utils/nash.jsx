// Nash equilibrium calculator for the security game
const calculateNashEquilibrium = (vulnerabilityDetails, players) => {
    // Group players
    const attackers = players.filter(p => p.group === "attackers" && p.active);
    const defenders = players.filter(p => p.group === "defenders" && p.active);
    
    // If either group is empty, we can't calculate Nash equilibrium
    if (attackers.length === 0 || defenders.length === 0 || vulnerabilityDetails.length === 0) {
      return { 
        hasNash: false, 
        message: "Cannot calculate Nash equilibrium: Missing players or vulnerabilities"
      };
    }
    
    // Build payoff matrix [defender strategy][attacker strategy]
    // Each cell contains [defenderPayoff, attackerPayoff]
    const payoffMatrix = [];
    
    // For each defender strategy (which vulnerabilities to patch)
    for (let defMask = 0; defMask < (1 << vulnerabilityDetails.length); defMask++) {
      const defRow = [];
      
      // For each attacker strategy (which vulnerabilities to exploit)
      for (let attMask = 0; attMask < (1 << vulnerabilityDetails.length); attMask++) {
        // Calculate payoffs for this strategy combination
        let defenderPayoff = 0;
        let attackerPayoff = 0;
        
        for (let i = 0; i < vulnerabilityDetails.length; i++) {
          const vul = vulnerabilityDetails[i];
          const isPatchedByDefender = (defMask & (1 << i)) !== 0;
          const isExploitedByAttacker = (attMask & (1 << i)) !== 0;
          
          if (isPatchedByDefender) {
            // Defender incurs the cost of patching
            defenderPayoff -= vul.cD;
            
            // But prevents the damage if the attacker tried to exploit
            if (isExploitedByAttacker) {
              defenderPayoff += vul.iA;
              attackerPayoff -= vul.cA; // Attacker wasted resources
            }
          } else if (isExploitedByAttacker) {
            // Successful attack
            defenderPayoff -= vul.iA;
            attackerPayoff += vul.prA;
          }
        }
        
        // Add payoffs for this strategy combination
        defRow.push([defenderPayoff, attackerPayoff]);
      }
      payoffMatrix.push(defRow);
    }
    
    // Find pure strategy Nash equilibria
    const pureNashEquilibria = [];
    
    for (let i = 0; i < payoffMatrix.length; i++) {
      for (let j = 0; j < payoffMatrix[i].length; j++) {
        const [defenderPayoff, attackerPayoff] = payoffMatrix[i][j];
        
        // Check if this cell is a Nash equilibrium
        let isNash = true;
        
        // Check if defender wants to deviate
        for (let i2 = 0; i2 < payoffMatrix.length; i2++) {
          if (i2 !== i && payoffMatrix[i2][j][0] > defenderPayoff) {
            isNash = false;
            break;
          }
        }
        
        // Check if attacker wants to deviate
        if (isNash) {
          for (let j2 = 0; j2 < payoffMatrix[i].length; j2++) {
            if (j2 !== j && payoffMatrix[i][j2][1] > attackerPayoff) {
              isNash = false;
              break;
            }
          }
        }
        
        if (isNash) {
          pureNashEquilibria.push({
            defenderStrategy: i,
            attackerStrategy: j,
            defenderPayoff,
            attackerPayoff
          });
        }
      }
    }
    
    // Implement approximate mixed Nash equilibrium using replicator dynamics
    const approximateMixedNash = (iterations = 10000) => {
      // Initialize mixed strategies with uniform distribution
      let defenderMixed = Array(payoffMatrix.length).fill(1/payoffMatrix.length);
      let attackerMixed = Array(payoffMatrix[0].length).fill(1/payoffMatrix[0].length);
      
      // Learning rate
      const alpha = 0.1;
      
      for (let iter = 0; iter < iterations; iter++) {
        // Calculate expected payoffs for each strategy
        const defExpectedPayoffs = Array(defenderMixed.length).fill(0);
        const attExpectedPayoffs = Array(attackerMixed.length).fill(0);
        
        // Calculate expected payoff for each pure strategy against mixed opponent
        for (let i = 0; i < defenderMixed.length; i++) {
          for (let j = 0; j < attackerMixed.length; j++) {
            defExpectedPayoffs[i] += attackerMixed[j] * payoffMatrix[i][j][0];
            attExpectedPayoffs[j] += defenderMixed[i] * payoffMatrix[i][j][1];
          }
        }
        
        // Calculate average expected payoff
        const defAvgPayoff = defenderMixed.reduce((sum, prob, idx) => sum + prob * defExpectedPayoffs[idx], 0);
        const attAvgPayoff = attackerMixed.reduce((sum, prob, idx) => sum + prob * attExpectedPayoffs[idx], 0);
        
        // Update mixed strategies using replicator dynamics
        const newDefenderMixed = defenderMixed.map((prob, idx) => 
          prob * (1 + alpha * (defExpectedPayoffs[idx] - defAvgPayoff))
        );
        
        const newAttackerMixed = attackerMixed.map((prob, idx) => 
          prob * (1 + alpha * (attExpectedPayoffs[idx] - attAvgPayoff))
        );
        
        // Normalize
        const defSum = newDefenderMixed.reduce((a, b) => a + b, 0);
        const attSum = newAttackerMixed.reduce((a, b) => a + b, 0);
        
        defenderMixed = newDefenderMixed.map(p => p / defSum);
        attackerMixed = newAttackerMixed.map(p => p / attSum);
      }
      
      // Calculate expected payoffs for the mixed strategy
      let defenderPayoff = 0; // FIXED: Changed variable name from defPayoff to defenderPayoff
      let attackerPayoff = 0; // FIXED: Changed variable name from attPayoff to attackerPayoff
      
      for (let i = 0; i < defenderMixed.length; i++) {
        for (let j = 0; j < attackerMixed.length; j++) {
          defenderPayoff += defenderMixed[i] * attackerMixed[j] * payoffMatrix[i][j][0];
          attackerPayoff += defenderMixed[i] * attackerMixed[j] * payoffMatrix[i][j][1];
        }
      }
      
      return {
        defenderStrategy: defenderMixed,
        attackerStrategy: attackerMixed,
        defenderPayoff,
        attackerPayoff
      };
    };
    
    const mixedNash = approximateMixedNash();
    
    return {
      hasNash: true,
      pureNashEquilibria,
      mixedNash,
      payoffMatrix
    };
  };

// Function to translate strategy indices to actual patch/exploit actions
const interpretNashEquilibriumStrategies = (nashResult, vulnerabilityDetails) => {
  if (!nashResult.hasNash) {
    return { message: nashResult.message };
  }
  
  const results = {
    pureStrategies: [],
    mixedStrategy: null
  };
  
  // Interpret pure strategy equilibria
  if (nashResult.pureNashEquilibria.length > 0) {
    results.pureStrategies = nashResult.pureNashEquilibria.map(eq => {
      const defStrat = eq.defenderStrategy;
      const attStrat = eq.attackerStrategy;
      
      const defenderActions = vulnerabilityDetails
        .map((vul, idx) => ((defStrat & (1 << idx)) !== 0) ? vul.subsystemIndex : null)
        .filter(idx => idx !== null)
        .map(idx => `Patch Subsystem ${idx + 1}`);
      
      const attackerActions = vulnerabilityDetails
        .map((vul, idx) => ((attStrat & (1 << idx)) !== 0) ? vul.subsystemIndex : null)
        .filter(idx => idx !== null)
        .map(idx => `Exploit Subsystem ${idx + 1}`);
      
      return {
        defenderActions,
        attackerActions,
        defenderPayoff: eq.defenderPayoff,
        attackerPayoff: eq.attackerPayoff
      };
    });
  }
  
  // Interpret mixed strategy equilibrium
  if (nashResult.mixedNash) {
    const defenderStrategyDistribution = nashResult.mixedNash.defenderStrategy.map((prob, idx) => {
      // Convert strategy index to binary representation of patches
      const patches = vulnerabilityDetails
        .map((vul, i) => ((idx & (1 << i)) !== 0) ? vul.subsystemIndex : null)
        .filter(idx => idx !== null)
        .map(idx => `Subsystem ${idx + 1}`);
      
      return {
        strategy: patches.length > 0 ? `Patch ${patches.join(', ')}` : 'Patch nothing',
        probability: prob
      };
    }).filter(strat => strat.probability > 0.01); // Filter out very low probability strategies
    
    const attackerStrategyDistribution = nashResult.mixedNash.attackerStrategy.map((prob, idx) => {
      // Convert strategy index to binary representation of exploits
      const exploits = vulnerabilityDetails
        .map((vul, i) => ((idx & (1 << i)) !== 0) ? vul.subsystemIndex : null)
        .filter(idx => idx !== null)
        .map(idx => `Subsystem ${idx + 1}`);
      
      return {
        strategy: exploits.length > 0 ? `Exploit ${exploits.join(', ')}` : 'Exploit nothing',
        probability: prob
      };
    }).filter(strat => strat.probability > 0.01); // Filter out very low probability strategies
    
    results.mixedStrategy = {
      defenderStrategyDistribution,
      attackerStrategyDistribution,
      defenderPayoff: nashResult.mixedNash.defenderPayoff,
      attackerPayoff: nashResult.mixedNash.attackerPayoff
    };
  }
  
  return results;
};

// You would call these functions after running your simulation
const calculateAndDisplayNashEquilibrium = () => {
  const nashResult = calculateNashEquilibrium(vulnerabilityDetails, players);
  const interpretedNash = interpretNashEquilibriumStrategies(nashResult, vulnerabilityDetails);
  
  // Now you can display or use these results in your UI
  return { nashResult, interpretedNash };
};

export {calculateNashEquilibrium, interpretNashEquilibriumStrategies, calculateAndDisplayNashEquilibrium};