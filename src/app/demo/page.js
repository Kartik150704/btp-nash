// pages/index.js
"use client"
// pages/index.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as math from 'mathjs';
import * as d3 from 'd3';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  LogarithmicScale
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  LogarithmicScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend
);

// Game presets
const gamePresets = {
  prisoners: {
    name: "Prisoner's Dilemma",
    players: 2,
    actions: 2,
    matrices: {
      0: [[3, 0], [5, 1]],
      1: [[3, 5], [0, 1]]
    },
    actionNames: ['Cooperate', 'Defect']
  },
  coordination: {
    name: "Coordination Game",
    players: 2,
    actions: 2,
    matrices: {
      0: [[5, 0], [0, 5]],
      1: [[5, 0], [0, 5]]
    },
    actionNames: ['Strategy A', 'Strategy B']
  },
  chicken: {
    name: "Chicken Game",
    players: 2,
    actions: 2,
    matrices: {
      0: [[0, 7], [2, 1]],
      1: [[0, 2], [7, 1]]
    },
    actionNames: ['Stay', 'Swerve']
  },
  rockPaperScissors: {
    name: "Rock Paper Scissors",
    players: 2,
    actions: 3,
    matrices: {
      0: [[0, -1, 1], [1, 0, -1], [-1, 1, 0]],
      1: [[0, 1, -1], [-1, 0, 1], [1, -1, 0]]
    },
    actionNames: ['Rock', 'Paper', 'Scissors']
  }
};

// Enhanced Exact Nash Solver
class ExactNashSolver {
  constructor(game) {
    this.game = game;
    this.solutions = [];
    this.epsilon = 1e-10;
    this.searchSteps = [];
    this.isRunning = true;
  }

  async solve(onProgress = () => {}, onStep = () => {}) {
    const startTime = performance.now();
    
    // Find pure strategy equilibria
    await this.findPureStrategies(onProgress, onStep);
    
    if (this.game.players === 2) {
      await this.findMixedStrategies(onProgress, onStep);
    }
    
    const endTime = performance.now();
    return {
      solutions: this.solutions,
      time: endTime - startTime,
      type: 'exact',
      searchSteps: this.searchSteps
    };
  }

  async findPureStrategies(onProgress, onStep) {
    if (!this.isRunning) return;
    
    this.addStep({
      type: 'phase',
      message: 'Searching for pure strategy equilibria...',
      phase: 'pure_search',
      progress: 10
    });
    
    const actionCombinations = this.generateActionCombinations();
    
    for (let i = 0; i < actionCombinations.length; i++) {
      if (!this.isRunning) return;
      
      const combo = actionCombinations[i];
      const progress = 10 + (i / actionCombinations.length) * 40;
      
      this.addStep({
        type: 'testing',
        message: `Testing: ${this.formatActionProfile(combo)}`,
        candidate: combo,
        phase: 'pure_testing',
        progress
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      onProgress(progress);
      onStep(this.searchSteps[this.searchSteps.length - 1]);
      
      if (this.isPureNashEquilibrium(combo)) {
        const strategies = this.createPureStrategyProfile(combo);
        const payoffs = this.calculatePayoffs(strategies);
        
        this.solutions.push({
          type: 'pure',
          strategies,
          payoffs,
          actionProfile: combo
        });
        
        this.addStep({
          type: 'found',
          message: `Found pure Nash: ${this.formatActionProfile(combo)}`,
          solution: { type: 'pure', strategies, payoffs },
          phase: 'found_pure',
          progress
        });
      }
    }
  }

  async findMixedStrategies(onProgress, onStep) {
    if (!this.isRunning) return;
    
    this.addStep({
      type: 'phase',
      message: 'Searching for mixed strategy equilibria...',
      phase: 'mixed_search',
      progress: 50
    });
    
    if (this.game.actions === 2) {
      await this.solve2x2MixedStrategy(onProgress, onStep);
    }
  }

  async solve2x2MixedStrategy(onProgress, onStep) {
    if (!this.isRunning) return;
    
    this.addStep({
      type: 'calculating',
      message: 'Calculating indifference probabilities...',
      phase: 'mixed_calculation',
      progress: 60
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    onProgress(60);
    
    const A = this.game.matrices[0];
    const B = this.game.matrices[1];
    
    try {
      const denomP = B[0][0] - B[0][1] - B[1][0] + B[1][1];
      const denomQ = A[0][0] - A[1][0] - A[0][1] + A[1][1];
      
      if (Math.abs(denomP) < this.epsilon || Math.abs(denomQ) < this.epsilon) {
        this.addStep({
          type: 'warning',
          message: 'No mixed strategy equilibrium found',
          phase: 'mixed_complete',
          progress: 80
        });
        return;
      }
      
      const p = (B[1][1] - B[0][1]) / denomP;
      const q = (A[1][1] - A[1][0]) / denomQ;
      
      if (this.isValidProbability(p) && this.isValidProbability(q)) {
        const strategies = [
          { player: 0, distribution: [p, 1 - p] },
          { player: 1, distribution: [q, 1 - q] }
        ];
        
        const payoffs = this.calculatePayoffs(strategies);
        
        this.solutions.push({
          type: 'mixed',
          strategies,
          payoffs,
          indifference: { p, q }
        });
        
        this.addStep({
          type: 'found',
          message: 'Found mixed strategy equilibrium',
          solution: { type: 'mixed', strategies, payoffs },
          phase: 'found_mixed',
          progress: 80
        });
      }
    } catch (error) {
      this.addStep({
        type: 'error',
        message: 'Error in mixed strategy calculation',
        phase: 'error',
        progress: 80
      });
    }
  }

  stop() {
    this.isRunning = false;
  }

  // Helper methods
  addStep(step) {
    this.searchSteps.push({
      ...step,
      timestamp: Date.now(),
      solutionsFound: this.solutions.length
    });
  }

  generateActionCombinations() {
    if (this.game.players === 2) {
      const combinations = [];
      for (let i = 0; i < this.game.actions; i++) {
        for (let j = 0; j < this.game.actions; j++) {
          combinations.push([i, j]);
        }
      }
      return combinations;
    }
    return [];
  }

  isPureNashEquilibrium(actionProfile) {
    for (let player = 0; player < this.game.players; player++) {
      const currentPayoff = this.game.matrices[player][actionProfile[0]][actionProfile[1]];
      
      for (let action = 0; action < this.game.actions; action++) {
        const testProfile = [...actionProfile];
        testProfile[player] = action;
        
        const deviationPayoff = this.game.matrices[player][testProfile[0]][testProfile[1]];
        
        if (deviationPayoff > currentPayoff + this.epsilon) {
          return false;
        }
      }
    }
    return true;
  }

  createPureStrategyProfile(actionProfile) {
    return actionProfile.map((action, player) => ({
      player,
      distribution: this.createPureStrategy(action, this.game.actions)
    }));
  }

  createPureStrategy(action, numActions) {
    const strategy = new Array(numActions).fill(0);
    strategy[action] = 1;
    return strategy;
  }

  calculatePayoffs(strategies) {
    const payoffs = new Array(this.game.players).fill(0);
    
    if (this.game.players === 2) {
      for (let player = 0; player < 2; player++) {
        const matrix = this.game.matrices[player];
        
        for (let i = 0; i < strategies[0].distribution.length; i++) {
          for (let j = 0; j < strategies[1].distribution.length; j++) {
            payoffs[player] += strategies[0].distribution[i] * strategies[1].distribution[j] * matrix[i][j];
          }
        }
      }
    }
    
    return payoffs;
  }

  isValidProbability(p) {
    return p >= 0 && p <= 1 && !isNaN(p);
  }

  formatActionProfile(profile) {
    return profile.map((action, player) => 
      `P${player + 1}: ${this.game.actionNames[action]}`
    ).join(', ');
  }
}

// Enhanced Approximation Solver
class ApproximatedNashSolver {
  constructor(game, epsilon = 0.01, maxIterations = 100) {
    this.game = game;
    this.epsilon = epsilon;
    this.maxIterations = maxIterations;
    this.strategies = this.initializeStrategies();
    this.history = [];
    this.metrics = {
      improvements: [],
      payoffHistory: [],
      strategyHistory: []
    };
    this.isRunning = true;
  }

  initializeStrategies() {
    const strategies = [];
    for (let player = 0; player < this.game.players; player++) {
      // Random initialization
      const distribution = Array(this.game.actions).fill().map(() => Math.random());
      this.normalizeDistribution(distribution);
      strategies.push({ player, distribution });
    }
    return strategies;
  }

  async solve(onProgress = () => {}, onStep = () => {}, onMetrics = () => {}) {
    const startTime = performance.now();
    let iteration = 0;
    let converged = false;
    
    // Initial state
    this.addHistory({
      iteration: 0,
      strategies: JSON.parse(JSON.stringify(this.strategies)),
      payoffs: this.calculateCurrentPayoffs(),
      improvements: {},
      totalImprovement: 0,
      action: 'Initialized strategies'
    });
    
    while (iteration < this.maxIterations && !converged && this.isRunning) {
      converged = true;
      let totalImprovement = 0;
      const improvements = {};
      
      for (let player = 0; player < this.game.players; player++) {
        if (!this.isRunning) break;
        
        const result = await this.updatePlayerStrategy(player);
        improvements[player] = result.improvement;
        totalImprovement += result.improvement;
        
        if (result.improvement > this.epsilon) {
          converged = false;
        }
        
        // Create animation step
        const step = {
          iteration: iteration + 1,
          player,
          strategies: JSON.parse(JSON.stringify(this.strategies)),
          payoffs: this.calculateCurrentPayoffs(),
          improvement: result.improvement,
          improvements,
          totalImprovement,
          action: `Player ${player + 1} updates (Δ = ${result.improvement.toFixed(4)})`,
          bestResponse: result.bestResponse,
          learningRate: 0.1
        };
        
        this.addHistory(step);
        onStep(step);
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Update metrics
      this.updateMetrics(iteration, improvements, totalImprovement);
      onMetrics(this.metrics);
      
      iteration++;
      onProgress((iteration / this.maxIterations) * 100);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = performance.now();
    
    return {
      solution: {
        type: 'approximate',
        strategies: JSON.parse(JSON.stringify(this.strategies)),
        payoffs: this.calculateCurrentPayoffs(),
        epsilon: this.epsilon
      },
      time: endTime - startTime,
      iterations: iteration,
      converged,
      history: this.history,
      metrics: this.metrics
    };
  }

  stop() {
    this.isRunning = false;
  }

  async updatePlayerStrategy(player) {
    const currentPayoff = this.calculatePlayerPayoff(player);
    const bestResponse = this.findBestResponse(player);
    const bestPayoff = bestResponse.payoff;
    
    const improvement = bestPayoff - currentPayoff;
    
    if (improvement > this.epsilon) {
      const learningRate = Math.min(0.2, Math.max(0.01, improvement / 10));
      const currentDist = this.strategies[player].distribution;
      const bestDist = bestResponse.strategy;
      
      for (let i = 0; i < this.game.actions; i++) {
        currentDist[i] = (1 - learningRate) * currentDist[i] + learningRate * bestDist[i];
      }
      
      this.normalizeDistribution(currentDist);
    }
    
    return {
      improvement,
      bestResponse
    };
  }

  findBestResponse(player) {
    let bestAction = 0;
    let bestPayoff = -Infinity;
    const actionPayoffs = [];
    
    for (let action = 0; action < this.game.actions; action++) {
      const payoff = this.calculateActionPayoff(player, action);
      actionPayoffs.push(payoff);
      
      if (payoff > bestPayoff) {
        bestPayoff = payoff;
        bestAction = action;
      }
    }
    
    // Create best response strategy
    const strategy = new Array(this.game.actions).fill(0);
    strategy[bestAction] = 0.9;
    
    const remainingProb = 0.1;
    for (let i = 0; i < this.game.actions; i++) {
      if (i !== bestAction) {
        strategy[i] = remainingProb / (this.game.actions - 1);
      }
    }
    
    return {
      strategy,
      payoff: bestPayoff,
      actionPayoffs,
      bestAction
    };
  }

  calculateActionPayoff(player, action) {
    if (this.game.players !== 2) return 0;
    
    const matrix = this.game.matrices[player];
    const other = 1 - player;
    const otherDist = this.strategies[other].distribution;
    
    let payoff = 0;
    for (let j = 0; j < otherDist.length; j++) {
      if (player === 0) {
        payoff += otherDist[j] * matrix[action][j];
      } else {
        payoff += otherDist[j] * matrix[j][action];
      }
    }
    
    return payoff;
  }

  calculatePlayerPayoff(player) {
    let payoff = 0;
    const dist = this.strategies[player].distribution;
    
    for (let action = 0; action < this.game.actions; action++) {
      payoff += dist[action] * this.calculateActionPayoff(player, action);
    }
    
    return payoff;
  }

  calculateCurrentPayoffs() {
    return this.game.players === 2 ? [
      this.calculatePlayerPayoff(0),
      this.calculatePlayerPayoff(1)
    ] : [];
  }

  normalizeDistribution(distribution) {
    const sum = distribution.reduce((acc, val) => acc + val, 0);
    if (sum > 0) {
      for (let i = 0; i < distribution.length; i++) {
        distribution[i] /= sum;
      }
    }
  }

  addHistory(state) {
    this.history.push(state);
  }

  updateMetrics(iteration, improvements, totalImprovement) {
    this.metrics.improvements.push(totalImprovement);
    this.metrics.payoffHistory.push(this.calculateCurrentPayoffs());
    this.metrics.strategyHistory.push(JSON.parse(JSON.stringify(this.strategies)));
  }
}

// Clean Visualization Component
const ClearSimulation = ({ game, currentStep, isExact, exactSteps }) => {
  const svgRef = useRef();
  
  useEffect(() => {
    if (!svgRef.current || !game) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = 800;
    const height = 500;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    if (isExact && exactSteps) {
      renderExactVisualization(g, exactSteps, innerWidth, innerHeight);
    } else if (!isExact && currentStep) {
      renderApproximateVisualization(g, game, currentStep, innerWidth, innerHeight);
    }
    
  }, [game, currentStep, isExact, exactSteps]);
  
  const renderExactVisualization = (g, steps, width, height) => {
    const recentSteps = steps.slice(-10);
    const stepHeight = height / Math.max(recentSteps.length, 6);
    
    recentSteps.forEach((step, i) => {
      const y = i * stepHeight;
      
      // Clean backgrounds
      g.append("rect")
        .attr("x", 0)
        .attr("y", y)
        .attr("width", width)
        .attr("height", stepHeight - 4)
        .attr("fill", step.type === 'found' ? '#f0f0f0' : 'white')
        .attr("stroke", "#000")
        .attr("stroke-width", 1);
      
      // Step description
      g.append("text")
        .attr("x", 10)
        .attr("y", y + stepHeight / 2)
        .attr("dy", "0.35em")
        .text(step.message)
        .attr("font-size", "14px")
        .attr("fill", "#000");
      
      // Progress indicator
      if (step.progress !== undefined) {
        const progressWidth = (step.progress / 100) * 100;
        g.append("rect")
          .attr("x", width - 120)
          .attr("y", y + stepHeight / 2 - 6)
          .attr("width", progressWidth)
          .attr("height", 12)
          .attr("fill", "#000");
        
        g.append("text")
          .attr("x", width - 120 + progressWidth + 5)
          .attr("y", y + stepHeight / 2)
          .attr("dy", "0.35em")
          .text(`${step.progress.toFixed(0)}%`)
          .attr("font-size", "12px")
          .attr("fill", "#000");
      }
    });
  };
  
  const renderApproximateVisualization = (g, game, step, width, height) => {
    if (!step || !step.strategies) return;
    
    // Clean bar chart for strategy distributions
    const playerHeight = height / 2;
    const barWidth = width / (game.actions + 1);
    const maxValue = 1;
    
    // Title
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .text(`Iteration ${step.iteration}: ${step.action}`)
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#000");
    
    // Draw strategy bars for each player
    step.strategies.forEach((strategy, player) => {
      const y = player * playerHeight + 40;
      
      // Player label
      g.append("text")
        .attr("x", -10)
        .attr("y", y + playerHeight / 2)
        .attr("text-anchor", "end")
        .attr("dy", "0.35em")
        .text(`Player ${player + 1}`)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "#000");
      
      // Strategy bars
      strategy.distribution.forEach((prob, action) => {
        const barX = action * barWidth + 20;
        const barHeight = prob * (playerHeight - 80);
        
        g.append("rect")
          .attr("x", barX)
          .attr("y", y + playerHeight - 40 - barHeight)
          .attr("width", barWidth - 4)
          .attr("height", barHeight)
          .attr("fill", action === 0 ? "#000" : "#666")
          .attr("stroke", "#000")
          .attr("stroke-width", 1);
        
        // Probability label
        if (prob > 0.02) {
          g.append("text")
            .attr("x", barX + barWidth / 2)
            .attr("y", y + playerHeight - 40 - barHeight / 2)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .text(prob.toFixed(3))
            .attr("font-size", "12px")
            .attr("fill", "white");
        }
      });
      
      // Action labels
      game.actionNames.forEach((name, i) => {
        g.append("text")
          .attr("x", i * barWidth + 20 + barWidth / 2)
          .attr("y", y + playerHeight - 20)
          .attr("text-anchor", "middle")
          .text(name)
          .attr("font-size", "12px")
          .attr("fill", "#000");
      });
    });
    
    // Payoffs
    if (step.payoffs) {
      const payoffY = height - 20;
      step.payoffs.forEach((payoff, player) => {
        g.append("text")
          .attr("x", 60 + player * 120)
          .attr("y", payoffY)
          .attr("text-anchor", "middle")
          .text(`P${player + 1} Payoff: ${payoff.toFixed(3)}`)
          .attr("font-size", "14px")
          .attr("fill", "#000");
      });
    }
    
    // Improvement indicator
    if (step.improvement !== undefined) {
      g.append("text")
        .attr("x", width - 150)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .text(`Improvement: ${step.improvement.toFixed(6)}`)
        .attr("font-size", "12px")
        .attr("fill", "#000");
    }
  };
  
  return (
    <div className="bg-white p-6">
      <svg ref={svgRef} width="100%" height="500" viewBox="0 0 800 500" />
    </div>
  );
};

// Main Component
export default function MinimalistNashSimulator() {
  const [gameType, setGameType] = useState('prisoners');
  const [currentGame, setCurrentGame] = useState(null);
  const [customConfig, setCustomConfig] = useState({ players: 2, actions: 3 });
  const [parameters, setParameters] = useState({
    epsilon: 0.01,
    maxIterations: 200,
    animationSpeed: 300
  });
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('both');
  const [currentStep, setCurrentStep] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState('simulation');
  const [solvers, setSolvers] = useState({ exact: null, approximate: null });
  
  // Initialize game
  useEffect(() => {
    if (gameType !== 'custom') {
      setCurrentGame(JSON.parse(JSON.stringify(gamePresets[gameType])));
    } else {
      generateCustomGame();
    }
  }, [gameType]);
  
  const generateCustomGame = () => {
    const game = {
      name: "Custom Game",
      players: customConfig.players,
      actions: customConfig.actions,
      matrices: {},
      actionNames: Array(customConfig.actions).fill().map((_, i) => `Action ${i + 1}`)
    };
    
    for (let player = 0; player < customConfig.players; player++) {
      game.matrices[player] = Array(customConfig.actions).fill().map(() =>
        Array(customConfig.actions).fill().map(() => 
          Math.floor(Math.random() * 10) - 5
        )
      );
    }
    
    setCurrentGame(game);
  };
  
  const runSimulation = async () => {
    if (!currentGame) return;
    
    setIsRunning(true);
    setProgress(0);
    setResults(null);
    setCurrentStep(null);
    setMetrics(null);
    
    const results = { exact: null, approximate: null };
    const newSolvers = { exact: null, approximate: null };
    
    try {
      if (selectedAlgorithm === 'both' || selectedAlgorithm === 'exact') {
        const exactSolver = new ExactNashSolver(currentGame);
        newSolvers.exact = exactSolver;
        results.exact = await exactSolver.solve(
          setProgress,
          setCurrentStep
        );
      }
      
      if (selectedAlgorithm === 'both' || selectedAlgorithm === 'approximate') {
        const approxSolver = new ApproximatedNashSolver(
          currentGame, 
          parameters.epsilon, 
          parameters.maxIterations
        );
        newSolvers.approximate = approxSolver;
        
        results.approximate = await approxSolver.solve(
          setProgress,
          (step) => {
            setCurrentStep(step);
            if (step.iteration % 5 === 0) {
              setProgress((step.iteration / parameters.maxIterations) * 100);
            }
          },
          setMetrics
        );
      }
      
      setResults(results);
      setSolvers(newSolvers);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsRunning(false);
      setProgress(0);
    }
  };
  
  const stopSimulation = () => {
    if (solvers.exact) solvers.exact.stop();
    if (solvers.approximate) solvers.approximate.stop();
    setIsRunning(false);
  };
  
  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#000',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Iteration',
          color: '#000'
        },
        ticks: {
          color: '#000'
        },
        grid: {
          color: '#ddd'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Improvement',
          color: '#000'
        },
        ticks: {
          color: '#000'
        },
        grid: {
          color: '#ddd'
        }
      }
    }
  };
  
  const convergenceData = useMemo(() => {
    if (!metrics || !metrics.improvements) return null;
    
    return {
      labels: metrics.improvements.map((_, i) => i + 1),
      datasets: [
        {
          label: 'Total Improvement',
          data: metrics.improvements,
          borderColor: '#000',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        }
      ]
    };
  }, [metrics]);
  
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="bg-white p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-black">
                Nash Equilibrium Simulator
              </h1>
              <p className="text-black mt-2">
                Interactive simulation with clean visualization
              </p>
            </div>
            <div className="flex space-x-2">
              {['simulation', 'analytics', 'theory'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 capitalize transition-all ${
                    activeTab === tab 
                      ? 'bg-black text-white' 
                      : 'bg-white text-black'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>
        
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            {/* Game Selection */}
            <div className="bg-white p-6">
              <h2 className="text-xl font-semibold mb-4">Select Game</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(gamePresets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setGameType(key)}
                    className={`p-4 ${
                      gameType === key
                        ? 'bg-black text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">{preset.name}</div>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setGameType('custom')}
                  className={`p-4 ${
                    gameType === 'custom'
                      ? 'bg-black text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-medium">Custom</div>
                  </div>
                </button>
              </div>
              
              {gameType === 'custom' && (
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Players</label>
                    <input
                      type="number"
                      min="2"
                      max="4"
                      value={customConfig.players}
                      onChange={(e) => setCustomConfig({...customConfig, players: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-white text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Actions per Player</label>
                    <input
                      type="number"
                      min="2"
                      max="5"
                      value={customConfig.actions}
                      onChange={(e) => setCustomConfig({...customConfig, actions: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-white text-black"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Simulation Controls */}
            <div className="bg-white p-6">
              <h2 className="text-xl font-semibold mb-4">Simulation Parameters</h2>
              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Algorithm</label>
                  <select
                    value={selectedAlgorithm}
                    onChange={(e) => setSelectedAlgorithm(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-black"
                  >
                    <option value="both">Both Algorithms</option>
                    <option value="exact">Exact Only</option>
                    <option value="approximate">Approximate Only</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Epsilon (ε)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max="0.1"
                    value={parameters.epsilon}
                    onChange={(e) => setParameters({...parameters, epsilon: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 bg-white text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Max Iterations</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={parameters.maxIterations}
                    onChange={(e) => setParameters({...parameters, maxIterations: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-white text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Animation Speed</label>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="100"
                    value={parameters.animationSpeed}
                    onChange={(e) => setParameters({...parameters, animationSpeed: parseInt(e.target.value)})}
                    className="w-full mt-2"
                  />
                  <div className="text-xs text-center mt-1">{parameters.animationSpeed}ms</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <div className="flex space-x-4">
                  <button
                    onClick={runSimulation}
                    disabled={!currentGame || isRunning}
                    className={`px-8 py-3 text-white font-medium ${
                      !currentGame || isRunning
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-black hover:bg-gray-800'
                    }`}
                  >
                    {isRunning ? 'Running...' : 'Start Simulation'}
                  </button>
                  
                  {isRunning && (
                    <button
                      onClick={stopSimulation}
                      className="px-8 py-3 bg-white text-black font-medium"
                    >
                      Stop
                    </button>
                  )}
                </div>
                
                {isRunning && (
                  <div className="flex-1 ml-8">
                    <div className="h-2 bg-gray-200">
                      <div
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-center mt-1">{progress.toFixed(1)}% Complete</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Payoff Matrices */}
            {currentGame && (
              <div className="bg-white p-6">
                <h2 className="text-xl font-semibold mb-4">Payoff Matrices</h2>
                <div className="grid gap-6">
                  {Array(currentGame.players).fill().map((_, player) => (
                    <div key={player} className="bg-gray-50 p-4">
                      <h3 className="font-medium mb-3">Player {player + 1} Payoffs</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="p-2"></th>
                              {currentGame.actionNames.map((name, j) => (
                                <th key={j} className="p-2 text-center text-sm">
                                  {name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentGame.matrices[player].map((row, i) => (
                              <tr key={i}>
                                <td className="p-2 font-medium text-sm">
                                  {currentGame.actionNames[i]}
                                </td>
                                {row.map((cell, j) => (
                                  <td key={j} className="p-2">
                                    <input
                                      type="number"
                                      value={cell}
                                      onChange={(e) => {
                                        const newGame = { ...currentGame };
                                        newGame.matrices[player][i][j] = parseFloat(e.target.value) || 0;
                                        setCurrentGame(newGame);
                                      }}
                                      className="w-16 px-2 py-1 text-center bg-white text-black"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Animation Visualization */}
            {(currentStep || results) && (
              <ClearSimulation
                game={currentGame}
                currentStep={currentStep}
                isExact={selectedAlgorithm === 'exact'}
                exactSteps={results?.exact?.searchSteps}
              />
            )}
            
            {/* Results Display */}
            {results && (
              <div className="grid md:grid-cols-2 gap-6">
                {results.exact && (
                  <div className="bg-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-black mb-4">
                      Exact Nash Equilibrium
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-black">Computation Time:</span>
                        <span className="font-medium">{results.exact.time.toFixed(1)}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black">Equilibria Found:</span>
                        <span className="font-medium">{results.exact.solutions.length}</span>
                      </div>
                      
                      {results.exact.solutions.map((solution, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-4 mt-4"
                        >
                          <div className="font-medium text-black mb-2">
                            Equilibrium {idx + 1} ({solution.type})
                          </div>
                          {solution.strategies.map((strategy, player) => (
                            <div key={player} className="text-sm text-black">
                              Player {player + 1}: [{strategy.distribution.map(p => p.toFixed(3)).join(', ')}]
                            </div>
                          ))}
                          <div className="text-sm text-black mt-1">
                            Payoffs: [{solution.payoffs.map(p => p.toFixed(2)).join(', ')}]
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.approximate && (
                  <div className="bg-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-black mb-4">
                      Approximate Nash Equilibrium
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-black">Computation Time:</span>
                        <span className="font-medium">{results.approximate.time.toFixed(1)}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black">Iterations:</span>
                        <span className="font-medium">{results.approximate.iterations}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black">Converged:</span>
                        <span className="font-medium">
                          {results.approximate.converged ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black">Epsilon:</span>
                        <span className="font-medium">{results.approximate.solution.epsilon}</span>
                      </div>
                      
                      <div className="bg-white p-4 mt-4">
                        <div className="font-medium text-black mb-2">Final Strategy Profile</div>
                        {results.approximate.solution.strategies.map((strategy, player) => (
                          <div key={player} className="text-sm text-black">
                            Player {player + 1}: [{strategy.distribution.map(p => p.toFixed(3)).join(', ')}]
                          </div>
                        ))}
                        <div className="text-sm text-black mt-1">
                          Payoffs: [{results.approximate.solution.payoffs.map(p => p.toFixed(2)).join(', ')}]
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {metrics ? (
              <>
                <div className="bg-white p-6">
                  <h2 className="text-xl font-semibold mb-4">Convergence Analysis</h2>
                  <div className="h-64">
                    <Line data={convergenceData} options={chartOptions} />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-gray-100 p-6">
                    <h3 className="font-semibold text-black mb-2">Algorithm Performance</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Iterations:</span>
                        <span className="font-medium">{metrics.improvements.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Final Improvement:</span>
                        <span className="font-medium">
                          {metrics.improvements[metrics.improvements.length - 1]?.toFixed(6) || '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 p-6">
                    <h3 className="font-semibold text-black mb-2">Final Strategies</h3>
                    <div className="space-y-2 text-sm">
                      {currentGame?.actionNames?.map((action, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{action}:</span>
                          <span className="font-medium">
                            {(metrics.strategyHistory[metrics.strategyHistory.length - 1]?.[0]?.distribution[i] * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 p-6">
                    <h3 className="font-semibold text-black mb-2">Equilibrium Quality</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Epsilon:</span>
                        <span className="font-medium">{parameters.epsilon}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Convergence:</span>
                        <span className="font-medium">
                          {metrics.improvements[metrics.improvements.length - 1] < parameters.epsilon ? 'Achieved' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-black mb-2">No Analytics Data</h2>
                <p className="text-black">Run a simulation to see detailed analytics.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'theory' && (
          <div className="space-y-6">
            <div className="bg-white p-8">
              <h2 className="text-2xl font-bold mb-6">Game Theory Fundamentals</h2>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-black mb-3">Exact Nash Equilibrium</h3>
                  <p className="text-black mb-4">
                    A strategy profile where no player can improve their payoff by unilaterally changing their strategy.
                  </p>
                  <div className="bg-gray-100 p-4">
                    <div className="font-mono text-sm text-center">
                      ∀i: u<sub>i</sub>(s*<sub>i</sub>, s*<sub>-i</sub>) ≥ u<sub>i</sub>(s<sub>i</sub>, s*<sub>-i</sub>) ∀ s<sub>i</sub>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-black mb-3">ε-Nash Equilibrium</h3>
                  <p className="text-black mb-4">
                    An approximate solution where no player can improve by more than ε by changing strategy.
                  </p>
                  <div className="bg-gray-100 p-4">
                    <div className="font-mono text-sm text-center">
                      ∀i: u<sub>i</sub>(s'<sub>i</sub>, s'<sub>-i</sub>) + ε ≥ u<sub>i</sub>(s<sub>i</sub>, s'<sub>-i</sub>) ∀ s<sub>i</sub>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-black">Aspect</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-black">Exact Nash</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-black">Approximate Nash</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm text-black">Time Complexity</td>
                      <td className="px-6 py-4 text-sm text-center text-black">O(2<sup>n×m</sup>)</td>
                      <td className="px-6 py-4 text-sm text-center text-black">O(k×n<sup>m</sup>×m)</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm text-black">Solution Quality</td>
                      <td className="px-6 py-4 text-sm text-center text-black">Exact</td>
                      <td className="px-6 py-4 text-sm text-center text-black">ε-optimal</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm text-black">Scalability</td>
                      <td className="px-6 py-4 text-sm text-center text-black">Poor</td>
                      <td className="px-6 py-4 text-sm text-center text-black">Excellent</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm text-black">Real-world Usage</td>
                      <td className="px-6 py-4 text-sm text-center text-black">Limited</td>
                      <td className="px-6 py-4 text-sm text-center text-black">Widespread</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <footer className="text-center text-black py-8">
          <p className="text-sm">© 2025 Nash Equilibrium Simulator</p>
        </footer>
      </div>
    </div>
  );
}