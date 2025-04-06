"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card.jsx"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs.jsx"
import { Input } from "@/components/ui/input.jsx"
import { Button } from "../../../components/ui/button.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.jsx"
import { Label } from "../../../components/ui/label.jsx"
import { Separator } from "../../../components/ui/separator.jsx"
import { MatrixInput } from "../../../components/matrix-input.jsx"
import { VulnerabilityForm } from "../../../components/enhanced-vulnerability-form.jsx"
import { NetworkDiagram } from "../../../components/network-diagram.jsx"
import { computeRiskScores } from "../../../lib/utils.js"
import { computeVulnerabilityDetails, prioritizePatches } from "../../../utils/vulnerability.jsx"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert.jsx"
import { Tooltip } from "../../../components/tooltip.jsx"
import { SystemConfigImport } from "../../../components/file-import-integration.jsx"
import { Badge } from "@/components/ui/badge.jsx"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx"
import { Switch } from "@/components/ui/switch.jsx"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.jsx"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, Info, AlertTriangle, Shield, Database } from 'lucide-react';
import { Progress } from "@/components/ui/progress.jsx"

// NVD API service
const NVD_API_BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

// NVD API service function
const fetchNvdVulnerabilities = async (searchParams) => {
  let queryParams = new URLSearchParams();

  if (searchParams.keyword) {
    queryParams.append('keywordSearch', searchParams.keyword);
  }

  if (searchParams.cveId) {
    queryParams.append('cveId', searchParams.cveId);
  }

  if (searchParams.pubStartDate) {
    queryParams.append('pubStartDate', searchParams.pubStartDate);
  }

  if (searchParams.pubEndDate) {
    queryParams.append('pubEndDate', searchParams.pubEndDate);
  }

  // Default to 20 results if not specified
  queryParams.append('resultsPerPage', searchParams.resultsPerPage || 20);

  const url = `${NVD_API_BASE_URL}?${queryParams.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NVD API returned ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching NVD data:', error);
    throw error;
  }
};

// Map CVSS severity to color
const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'bg-red-600 text-white';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    case 'low': return 'bg-blue-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

// Map CVSS score to severity text
const getCvssSeverityText = (score) => {
  if (score >= 9.0) return 'Critical';
  if (score >= 7.0) return 'High';
  if (score >= 4.0) return 'Medium';
  if (score >= 0.1) return 'Low';
  return 'None';
};

// Tooltip descriptions for variables
const tooltipDescriptions = {
  // Main glossary of all variables and terms used in the application
  systemSize: "The number of subsystems in your network. Each subsystem can have different vulnerabilities and dependencies.",
  functionalMatrix: "Defines the functional dependencies between subsystems. A value of 1 in cell (i,j) indicates subsystem i depends on subsystem j.",
  topologyMatrix: "Represents the network connections between subsystems. A value of 1 in cell (i,j) indicates subsystems i and j are connected.",
  w1: "Weight factor for the influence of functional dependencies on risk calculation. Higher values give more importance to functional relationships.",
  w2: "Weight factor for the influence of network topology on risk calculation. Higher values give more importance to network connections.",
  k4: "Weight coefficient for the exploitability score in vulnerability assessment. Higher values increase the impact of how easily a vulnerability can be exploited.",
  k5: "Weight coefficient for the presence of known exploits. Higher values increase the risk contribution of vulnerabilities with existing exploits.",
  impactScore: "CVSS Impact score (1-10) indicating the potential damage if the vulnerability is exploited.",
  exploitScore: "CVSS Exploitability score (1-10) indicating how easy it is to exploit the vulnerability.",
  exploitExists: "Binary indicator (0 or 1) of whether a public exploit exists for this vulnerability.",
  riskScores: "Calculated risk score for each subsystem based on functional dependencies and network topology.",
  vulSeverity: "Overall severity rating combining impact, exploitability, and system importance.",
  iA: "Attacker's Impact (I_A): The potential damage an attacker can cause by exploiting the vulnerability.",
  cD: "Defender's Cost (C_D): The cost associated with patching the vulnerability.",
  cA: "Attacker's Cost (C_A): The effort required for an attacker to exploit the vulnerability.",
  prA: "Attacker's Profit (Pr_A): The net benefit an attacker gains from exploiting the vulnerability.",

  // Player roles and groups
  playerGroups: "Players are organized into groups with specific roles and responsibilities.",
  defenderGroup: "Players assigned to protect the system by applying patches and security measures.",
  attackerGroup: "Players attempting to exploit vulnerabilities in the system.",

  // Profit distribution
  profitDistribution: "How profits are distributed among players in each group based on their actions and contributions.",
  attackerProfit: "Profit gained by attackers who successfully exploit vulnerabilities.",
  defenderProfit: "Profit (or savings) gained by defenders who successfully prevent or patch vulnerabilities.",

  // NVD related
  nvdSearch: "Search for real vulnerabilities from the National Vulnerability Database (NVD).",
  cvssScore: "Common Vulnerability Scoring System score indicating severity on a scale of 0-10.",
  cve: "Common Vulnerabilities and Exposures - standard identifiers for publicly known security vulnerabilities.",
  cwe: "Common Weakness Enumeration - a list of software and hardware weakness types.",

  // Original detailed descriptions preserved
  confidentialityImpact: "Impact on data confidentiality if the vulnerability is exploited (1-10). Higher values indicate more severe information disclosure.",
  integrityImpact: "Impact on data integrity if the vulnerability is exploited (1-10). Higher values indicate more severe data modification risks.",
  availabilityImpact: "Impact on system availability if the vulnerability is exploited (1-10). Higher values indicate more severe service disruption risks.",
  attackVector: "How the vulnerability can be exploited (1-10). Higher values indicate easier remote exploitation.",
  attackComplexity: "Technical difficulty of exploiting the vulnerability (1-10). Higher values indicate simpler exploitation techniques.",
  privilegesRequired: "Level of access needed to exploit the vulnerability (1-10). Higher values indicate fewer privileges needed.",
  userInteraction: "Whether user interaction is required for exploitation (1-10). Higher values indicate no user interaction needed.",
  baseCVSS: "Base CVSS score calculated from impact and exploitability components (1-10).",
  temporalScore: "CVSS score adjusted for current exploit maturity and remediation status (1-10).",
  environmentalScore: "CVSS score adjusted for specific environment and asset importance (1-10).",
  directRisk: "Risk calculated solely based on the vulnerability's own scores.",
  propagatedRisk: "Additional risk due to dependencies on this subsystem.",
  aggregateRisk: "Total risk combining direct and propagated components.",
  patchEffort: "Estimated effort required to develop and deploy the patch (1-10).",
  patchImpact: "Potential impact of the patch on system functionality (1-10).",
  patchPriority: "Calculated priority for patch deployment based on risk/effort ratio.",
  centrality: "Measure of subsystem importance in the network topology.",
  criticalPath: "Whether the subsystem is on critical functional paths.",
  redundancy: "Level of redundancy available for this subsystem's functionality.",
  attackerROI: "Return on Investment for the attacker if they exploit this vulnerability.",
  defenderROI: "Return on Investment for the defender by patching this vulnerability.",
  businessImpact: "Estimated financial impact on business operations if exploited.",
  reputationImpact: "Estimated impact on organizational reputation if exploited.",
  complianceImpact: "Potential regulatory or compliance issues if exploited."
}

// Preset player configurations
const presetConfigurations = {
  "1att-2def": {
    name: "1 Attacker, 2 Defenders",
    players: [
      { id: 1, name: "Defender Alpha", group: "defenders", avatar: "/avatars/defender1.png", active: true, role: "System Administrator", profit: 0 },
      { id: 2, name: "Defender Beta", group: "defenders", avatar: "/avatars/defender2.png", active: true, role: "Security Analyst", profit: 0 },
      { id: 3, name: "Attacker X", group: "attackers", avatar: "/avatars/attacker1.png", active: true, role: "External Threat", profit: 0 }
    ]
  },
  "2att-1def": {
    name: "2 Attackers, 1 Defender",
    players: [
      { id: 1, name: "Defender Prime", group: "defenders", avatar: "/avatars/defender1.png", active: true, role: "Security Lead", profit: 0 },
      { id: 2, name: "Attacker Alpha", group: "attackers", avatar: "/avatars/attacker1.png", active: true, role: "Malicious Actor", profit: 0 },
      { id: 3, name: "Attacker Beta", group: "attackers", avatar: "/avatars/attacker2.png", active: true, role: "Exploit Developer", profit: 0 }
    ]
  },
  "1att-3def": {
    name: "1 Attacker, 3 Defenders",
    players: [
      { id: 1, name: "Defender Alpha", group: "defenders", avatar: "/avatars/defender1.png", active: true, role: "System Administrator", profit: 0 },
      { id: 2, name: "Defender Beta", group: "defenders", avatar: "/avatars/defender2.png", active: true, role: "Security Analyst", profit: 0 },
      { id: 3, name: "Defender Gamma", group: "defenders", avatar: "/avatars/defender3.png", active: true, role: "Network Specialist", profit: 0 },
      { id: 4, name: "Attacker X", group: "attackers", avatar: "/avatars/attacker1.png", active: true, role: "Advanced Persistent Threat", profit: 0 }
    ]
  },
  "3att-1def": {
    name: "3 Attackers, 1 Defender",
    players: [
      { id: 1, name: "Defender Prime", group: "defenders", avatar: "/avatars/defender1.png", active: true, role: "Chief Security Officer", profit: 0 },
      { id: 2, name: "Attacker Alpha", group: "attackers", avatar: "/avatars/attacker1.png", active: true, role: "Threat Actor", profit: 0 },
      { id: 3, name: "Attacker Beta", group: "attackers", avatar: "/avatars/attacker2.png", active: true, role: "Zero-Day Hunter", profit: 0 },
      { id: 4, name: "Attacker Gamma", group: "attackers", avatar: "/avatars/attacker3.png", active: true, role: "Social Engineer", profit: 0 }
    ]
  },
  "custom": {
    name: "Custom Configuration",
    players: [
      { id: 1, name: "Defender 1", group: "defenders", avatar: "/avatars/defender1.png", active: true, role: "System Administrator", profit: 0 },
      { id: 2, name: "Attacker 1", group: "attackers", avatar: "/avatars/attacker1.png", active: true, role: "Red Team Lead", profit: 0 },
      { id: 3, name: "Attacker 2", group: "attackers", avatar: "/avatars/attacker2.png", active: true, role: "Exploit Developer", profit: 0 }
    ]
  }
};

// Sample subsystem types for NVD mapping - renamed to SUBSYSTEM_TYPES to avoid conflict
const SUBSYSTEM_TYPES = [
  { id: 'web', name: 'Web Server', keywords: ['web', 'http', 'apache', 'nginx', 'iis', 'tomcat'] },
  { id: 'db', name: 'Database', keywords: ['database', 'sql', 'mysql', 'postgresql', 'oracle', 'mongodb'] },
  { id: 'os', name: 'Operating System', keywords: ['windows', 'linux', 'unix', 'macos', 'os'] },
  { id: 'network', name: 'Network Infrastructure', keywords: ['network', 'router', 'switch', 'firewall', 'vpn'] },
  { id: 'app', name: 'Application Server', keywords: ['application', 'server', 'jboss', 'websphere', 'weblogic'] }
];

export default function SmartPatchSimulator() {
  // Original state variables
  const [numSubsystems, setNumSubsystems] = useState(3)
  const [functionalMatrix, setFunctionalMatrix] = useState(
    Array(3)
      .fill(0)
      .map(() => Array(3).fill(0))
  )
  const [topologyMatrix, setTopologyMatrix] = useState(
    Array(3)
      .fill(0)
      .map(() => Array(3).fill(0))
  )
  const [w1, setW1] = useState(1)
  const [w2, setW2] = useState(1)
  const [vulnerabilities, setVulnerabilities] = useState([
    { subsystemIndex: 0, impactScore: 5, exploitScore: 7, exploitExists: 1 },
    { subsystemIndex: 1, impactScore: 4, exploitScore: 3, exploitExists: 0 },
    { subsystemIndex: 2, impactScore: 7, exploitScore: 8, exploitExists: 1 },
  ])
  const [k4, setK4] = useState(1)
  const [k5, setK5] = useState(2)

  const [riskScores, setRiskScores] = useState([])
  const [vulnerabilityDetails, setVulnerabilityDetails] = useState([])
  const [patchPriority, setPatchPriority] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [hasResults, setHasResults] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [activeTab, setActiveTab] = useState("manual")

  // Player configuration state
  const [currentConfigId, setCurrentConfigId] = useState("custom")
  const [players, setPlayers] = useState(presetConfigurations.custom.players)
  const [totalDefenderProfit, setTotalDefenderProfit] = useState(0)
  const [totalAttackerProfit, setTotalAttackerProfit] = useState(0)

  const [playerGroups, setPlayerGroups] = useState([
    { id: "defenders", name: "Defenders", color: "blue", description: "Responsible for patching vulnerabilities and securing systems" },
    { id: "attackers", name: "Attackers", color: "red", description: "Attempt to exploit vulnerabilities in the system" }
  ])

  const [currentRound, setCurrentRound] = useState(1)
  const [maxRounds, setMaxRounds] = useState(10)
  const [turnBasedMode, setTurnBasedMode] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(null)
  const [showPlayerManager, setShowPlayerManager] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerGroup, setNewPlayerGroup] = useState("defenders")
  const [newPlayerRole, setNewPlayerRole] = useState("")

  // Player action history
  const [playerActions, setPlayerActions] = useState([])

  // Distribution of profit based on player actions
  const [profitDistribution, setProfitDistribution] = useState({
    attackers: [],
    defenders: []
  })

  // NVD integration states
  const [showNvdSearch, setShowNvdSearch] = useState(false)
  const [nvdSearchTerm, setNvdSearchTerm] = useState("")
  const [nvdSearchResults, setNvdSearchResults] = useState([])
  const [isLoadingNvd, setIsLoadingNvd] = useState(false)
  const [nvdError, setNvdError] = useState(null)
  const [selectedNvdVulnerabilities, setSelectedNvdVulnerabilities] = useState([])

  // Now using SUBSYSTEM_TYPES instead of subsystemTypes in the initialization
  const [subsystemTypes, setSubsystemTypes] = useState(
    Array(numSubsystems).fill('').map((_, idx) => ({
      index: idx,
      type: SUBSYSTEM_TYPES[idx % SUBSYSTEM_TYPES.length].id,
      name: `Subsystem ${idx + 1} (${SUBSYSTEM_TYPES[idx % SUBSYSTEM_TYPES.length].name})`
    }))
  )

  const [cveDetailsOpen, setCveDetailsOpen] = useState(false)
  const [currentCveDetails, setCurrentCveDetails] = useState(null)

  // Load a preset configuration
  const loadPresetConfiguration = (configId) => {
    if (presetConfigurations[configId]) {
      setCurrentConfigId(configId);
      setPlayers(JSON.parse(JSON.stringify(presetConfigurations[configId].players)));
    }
  };

  // Update subsystem types when number of subsystems changes
  useEffect(() => {
    setSubsystemTypes(
      Array(numSubsystems).fill('').map((_, idx) => ({
        index: idx,
        type: SUBSYSTEM_TYPES[idx % SUBSYSTEM_TYPES.length]?.id || 'web',
        name: `Subsystem ${idx + 1} (${SUBSYSTEM_TYPES[idx % SUBSYSTEM_TYPES.length]?.name || 'Web Server'})`
      }))
    );
  }, [numSubsystems]);

  // Update player profits when results change
  useEffect(() => {
    if (hasResults && vulnerabilityDetails.length > 0) {
      distributePlayerProfits();
    }
  }, [hasResults, vulnerabilityDetails]);

  // Search NVD for vulnerabilities
  const handleNvdSearch = async () => {
    if (!nvdSearchTerm.trim()) return;

    setIsLoadingNvd(true);
    setNvdError(null);

    try {
      const results = await fetchNvdVulnerabilities({
        keyword: nvdSearchTerm,
        resultsPerPage: 10
      });

      setNvdSearchResults(results.vulnerabilities || []);
    } catch (error) {
      setNvdError(`Error searching NVD: ${error.message}`);
    } finally {
      setIsLoadingNvd(false);
    }
  };

  // Select CVE for a subsystem
  const handleSelectCve = (cve, subsystemIndex) => {
    // Extract CVSS data
    const metrics = cve.cve?.metrics?.cvssMetricV31?.[0] || cve.cve?.metrics?.cvssMetricV30?.[0] || cve.cve?.metrics?.cvssMetricV2?.[0];

    if (!metrics) {
      console.error('No CVSS metrics found for', cve.cve?.id);
      return;
    }

    const cvssData = metrics.cvssData;
    const baseScore = cvssData?.baseScore || 5;
    const impactScore = cvssData?.impactScore || baseScore * 0.6;
    const exploitabilityScore = cvssData?.exploitabilityScore || baseScore * 0.4;

    // Check if there are known exploits (approximation based on description)
    const description = cve.cve?.descriptions?.find(d => d.lang === 'en')?.value || '';
    const hasExploit =
      description.toLowerCase().includes('exploit') ||
      description.toLowerCase().includes('poc') ||
      description.toLowerCase().includes('proof of concept');

    // Create new vulnerability
    const newVulnerability = {
      subsystemIndex,
      impactScore: parseFloat((impactScore / 10 * 9 + 1).toFixed(1)), // Scale to 1-10
      exploitScore: parseFloat((exploitabilityScore / 10 * 9 + 1).toFixed(1)), // Scale to 1-10
      exploitExists: hasExploit ? 1 : 0,
      cveId: cve.cve?.id,
      cveDescription: description,
      cvssScore: baseScore,
      cvePublished: cve.cve?.published,
      cveLastModified: cve.cve?.lastModified
    };

    // Update vulnerabilities
    const updatedVulnerabilities = [...vulnerabilities];

    // Find if there's already a vulnerability for this subsystem
    const existingIndex = updatedVulnerabilities.findIndex(v => v.subsystemIndex === subsystemIndex);

    if (existingIndex >= 0) {
      updatedVulnerabilities[existingIndex] = newVulnerability;
    } else {
      updatedVulnerabilities.push(newVulnerability);
    }

    setVulnerabilities(updatedVulnerabilities);

    // Add to selected vulnerabilities
    setSelectedNvdVulnerabilities([...selectedNvdVulnerabilities, {
      ...newVulnerability,
      subsystemName: subsystemTypes.find(s => s.index === subsystemIndex)?.name
    }]);
  };

  // Show CVE details dialog
  const handleShowCveDetails = (cve) => {
    setCurrentCveDetails(cve);
    setCveDetailsOpen(true);
  };

  // Apply NVD vulnerabilities automatically based on subsystem types
  const autoApplyNvdVulnerabilities = async () => {
    setIsLoadingNvd(true);
    setNvdError(null);

    const appliedVulnerabilities = [];

    // For each subsystem, search for related vulnerabilities
    for (const subsystem of subsystemTypes) {
      try {
        // Get keywords for the subsystem type
        const typeInfo = SUBSYSTEM_TYPES.find(t => t.id === subsystem.type) || SUBSYSTEM_TYPES[0];
        const searchKeyword = typeInfo.keywords[Math.floor(Math.random() * typeInfo.keywords.length)];

        // Fetch vulnerabilities
        const results = await fetchNvdVulnerabilities({
          keyword: searchKeyword,
          resultsPerPage: 5
        });

        // Select a random vulnerability
        if (results.vulnerabilities && results.vulnerabilities.length > 0) {
          const randomIndex = Math.floor(Math.random() * results.vulnerabilities.length);
          const selectedVul = results.vulnerabilities[randomIndex];

          // Apply to the subsystem
          handleSelectCve(selectedVul, subsystem.index);
          appliedVulnerabilities.push(selectedVul);
        }
      } catch (error) {
        console.error(`Error applying vulnerability for subsystem ${subsystem.index}:`, error);
      }
    }

    setIsLoadingNvd(false);

    return appliedVulnerabilities.length;
  };

  // Distribute profits among players based on their roles and the vulnerability details
  const distributePlayerProfits = () => {
    const attackers = players.filter(p => p.group === "attackers" && p.active);
    const defenders = players.filter(p => p.group === "defenders" && p.active);

    if (attackers.length === 0 || defenders.length === 0 || vulnerabilityDetails.length === 0) {
      return;
    }

    // Calculate total profits for each group
    let totalAttackerProfit = vulnerabilityDetails.reduce((sum, v) => sum + v.prA, 0);
    let totalDefenderProfit = vulnerabilityDetails.reduce((sum, v) => sum + v.iA - v.cD, 0);

    setTotalAttackerProfit(totalAttackerProfit);
    setTotalDefenderProfit(totalDefenderProfit);

    // Distribute attacker profits equally among attackers
    const attackerProfitShare = totalAttackerProfit / attackers.length;
    const updatedAttackers = attackers.map(attacker => ({
      ...attacker,
      profit: attackerProfitShare
    }));

    // Distribute defender profits equally among defenders
    const defenderProfitShare = totalDefenderProfit / defenders.length;
    const updatedDefenders = defenders.map(defender => ({
      ...defender,
      profit: defenderProfitShare
    }));

    // Update player profits
    const updatedPlayers = players.map(player => {
      if (player.group === "attackers" && player.active) {
        return updatedAttackers.find(a => a.id === player.id);
      } else if (player.group === "defenders" && player.active) {
        return updatedDefenders.find(d => d.id === player.id);
      }
      return player;
    });

    setPlayers(updatedPlayers);

    // Set up data for charts
    setProfitDistribution({
      attackers: updatedAttackers.map(a => ({
        name: a.name,
        profit: a.profit
      })),
      defenders: updatedDefenders.map(d => ({
        name: d.name,
        profit: d.profit
      }))
    });
  };

  const handleSizeChange = (value) => {
    const newSize = Number.parseInt(value)
    setNumSubsystems(newSize)
  }

  const handleSubsystemTypeChange = (index, typeId) => {
    setSubsystemTypes(subsystemTypes.map(s =>
      s.index === index
        ? {
          ...s,
          type: typeId,
          name: `Subsystem ${index + 1} (${SUBSYSTEM_TYPES.find(t => t.id === typeId)?.name || 'Unknown'})`
        }
        : s
    ));
  };

  const handleSimulate = async () => {
    setIsSimulating(true)

    // Add a small delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const rAdjArray = computeRiskScores(functionalMatrix, topologyMatrix, numSubsystems, w1, w2)
    setRiskScores(rAdjArray)

    const vDetails = computeVulnerabilityDetails(vulnerabilities, rAdjArray, k4, k5)
    setVulnerabilityDetails(vDetails)

    const patchOrder = prioritizePatches(vDetails)
    setPatchPriority(patchOrder)

    setIsSimulating(false)
    setHasResults(true)
  }

  const recordPlayerAction = (playerId, action, target, outcome) => {
    const player = getPlayerById(playerId);
    const newAction = {
      id: playerActions.length + 1,
      round: currentRound,
      playerId,
      playerName: player.name,
      playerGroup: player.group,
      action,
      target,
      outcome,
      timestamp: new Date().toISOString()
    };

    setPlayerActions([...playerActions, newAction]);
  };

  const handleConfigLoaded = (config) => {
    // Update all state variables with the loaded configuration
    if (config) {
      setNumSubsystems(config.numSubsystems || 3);
      setFunctionalMatrix(config.functionalMatrix || Array(config.numSubsystems).fill(0).map(() => Array(config.numSubsystems).fill(0)));
      setTopologyMatrix(config.topologyMatrix || Array(config.numSubsystems).fill(0).map(() => Array(config.numSubsystems).fill(0)));
      setW1(config.w1 || 1);
      setW2(config.w2 || 1);
      setK4(config.k4 || 1);
      setK5(config.k5 || 2);
      setVulnerabilities(config.vulnerabilities || []);

      // Close the import panel after successful import
      setShowImport(false);

      // Switch back to manual tab
      setActiveTab("manual");
    }
  };

  // Player management functions
  const handleAddPlayer = () => {
    if (!newPlayerName) return;

    const newPlayer = {
      id: players.length + 1,
      name: newPlayerName,
      group: newPlayerGroup,
      avatar: `/avatars/default.png`,
      active: true,
      role: newPlayerRole || "Team Member",
      profit: 0
    };

    setPlayers([...players, newPlayer]);
    setNewPlayerName("");
    setNewPlayerRole("");

    // When adding custom players, switch to custom configuration
    setCurrentConfigId("custom");
  };

  const handleTogglePlayerActive = (playerId) => {
    setPlayers(players.map(player =>
      player.id === playerId ? { ...player, active: !player.active } : player
    ));

    // When modifying players, switch to custom configuration
    setCurrentConfigId("custom");
  };

  const handleRemovePlayer = (playerId) => {
    setPlayers(players.filter(player => player.id !== playerId));

    // When modifying players, switch to custom configuration
    setCurrentConfigId("custom");
  };

  const handleStartTurnBasedMode = () => {
    setTurnBasedMode(true);
    // Set the first player's turn
    const activePlayerIds = players.filter(p => p.active).map(p => p.id);
    if (activePlayerIds.length > 0) {
      setCurrentTurn(activePlayerIds[0]);
    }
  };

  const handleNextTurn = () => {
    const activePlayerIds = players.filter(p => p.active).map(p => p.id);
    if (activePlayerIds.length === 0) return;

    const currentIndex = activePlayerIds.indexOf(currentTurn);
    const nextIndex = (currentIndex + 1) % activePlayerIds.length;

    if (nextIndex === 0) {
      // If we've gone through all players, advance to the next round
      setCurrentRound(currentRound + 1);
      if (currentRound >= maxRounds) {
        // End the game if we've reached max rounds
        setTurnBasedMode(false);
        setCurrentTurn(null);
        return;
      }
    }

    setCurrentTurn(activePlayerIds[nextIndex]);
  };

  const simulatePlayerAction = (playerId, action, targetId) => {
    const player = getPlayerById(playerId);
    const target = `Subsystem ${targetId + 1}`;

    // Define outcomes based on player group and action
    const possibleOutcomes = {
      defenders: {
        "patch": ["Success", "Partial Success", "Failed"],
        "harden": ["System Hardened", "Minimal Improvement", "No Change"],
        "scan": ["Vulnerabilities Detected", "Scan Complete", "No New Findings"]
      },
      attackers: {
        "exploit": ["Successful Exploitation", "Partial Access Gained", "Failed"],
        "recon": ["Critical Information Found", "Some Data Gathered", "No Useful Intelligence"],
        "develop": ["New Exploit Created", "Exploit In Progress", "Development Failed"]
      }
    };

    // Select a random outcome
    const outcomes = possibleOutcomes[player.group][action];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    // Record the action
    recordPlayerAction(playerId, action, target, outcome);

    // If this is a successful exploit, update the profit
    if (player.group === "attackers" && action === "exploit" && outcome === "Successful Exploitation") {
      // Find the matching vulnerability
      const vul = vulnerabilityDetails.find(v => v.subsystemIndex === targetId);
      if (vul) {
        // Update the player's profit
        const profit = vul.prA;
        setPlayers(players.map(p =>
          p.id === playerId ? { ...p, profit: p.profit + profit } : p
        ));
      }
    }

    // If this is a successful patch, update the profit
    if (player.group === "defenders" && action === "patch" && outcome === "Success") {
      // Find the matching vulnerability
      const vul = vulnerabilityDetails.find(v => v.subsystemIndex === targetId);
      if (vul) {
        // Update the player's profit
        const profit = vul.iA - vul.cD;
        setPlayers(players.map(p =>
          p.id === playerId ? { ...p, profit: p.profit + profit } : p
        ));
      }
    }

    // Move to the next turn after an action
    handleNextTurn();
  };

  const getActivePlayersByGroup = (groupId) => {
    return players.filter(player => player.group === groupId && player.active);
  };

  const getPlayerById = (playerId) => {
    return players.find(player => player.id === playerId) || {};
  };

  const getPlayerGroupById = (groupId) => {
    return playerGroups.find(group => group.id === groupId) || {};
  };

  const getProfitDataForChart = () => {
    const activePlayers = players.filter(p => p.active);
    return activePlayers.map(player => ({
      name: player.name,
      profit: player.profit,
      group: player.group
    }));
  };

  return (
    <div className="container mx-auto py-6 px-4 bg-gray-50">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-slate-900 text-white">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-semibold">Smart Patch Simulator</CardTitle>
              <CardDescription className="text-slate-300">
                Configure system dependencies and vulnerabilities to prioritize patching
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-white text-slate-900 hover:bg-slate-100"
                onClick={() => setShowNvdSearch(!showNvdSearch)}
              >
                <Database className="mr-2 h-4 w-4" />
                {showNvdSearch ? "Hide NVD" : "NVD Vulnerabilities"}
              </Button>
              <Button
                variant="outline"
                className="bg-white text-slate-900 hover:bg-slate-100"
                onClick={() => setShowPlayerManager(!showPlayerManager)}
              >
                {showPlayerManager ? "Hide Players" : "Manage Players"}
              </Button>
              <Button
                variant="outline"
                className="bg-white text-slate-900 hover:bg-slate-100"
                onClick={() => setShowImport(!showImport)}
              >
                {showImport ? "Hide Import" : "Import / Export"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-8">
            {/* NVD Integration Section */}
            {showNvdSearch && (
              <>
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">
                      <div className="flex items-center">
                        <Database className="mr-2 h-5 w-5" />
                        National Vulnerability Database (NVD) Integration
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Search and apply real vulnerability data from the National Vulnerability Database
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="subsystemTypes">Configure Subsystem Types</Label>
                          <div className="grid gap-3 mt-2">
                            {subsystemTypes.map((subsystem) => (
                              <div key={subsystem.index} className="flex items-center space-x-3">
                                <Label className="w-32">Subsystem {subsystem.index + 1}</Label>
                                <Select
                                  value={subsystem.type}
                                  onValueChange={(value) => handleSubsystemTypeChange(subsystem.index, value)}
                                >
                                  <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Select subsystem type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SUBSYSTEM_TYPES.map((type) => (
                                      <SelectItem key={type.id} value={type.id}>
                                        {type.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={autoApplyNvdVulnerabilities}
                            disabled={isLoadingNvd}
                          >
                            {isLoadingNvd ? (
                              <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading vulnerabilities...
                              </div>
                            ) : (
                              <>
                                <Database className="mr-2 h-4 w-4" />
                                Auto-apply vulnerabilities from NVD
                              </>
                            )}
                          </Button>

                          <div className="text-sm text-gray-500 italic text-center">
                            Or search for specific vulnerabilities below
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <Label htmlFor="nvdSearch">Search NVD for Vulnerabilities</Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              id="nvdSearch"
                              placeholder="Enter keyword, product name, or CVE ID..."
                              value={nvdSearchTerm}
                              onChange={(e) => setNvdSearchTerm(e.target.value)}
                              disabled={isLoadingNvd}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleNvdSearch}
                              disabled={!nvdSearchTerm.trim() || isLoadingNvd}
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Search
                            </Button>
                          </div>
                        </div>

                        {isLoadingNvd && (
                          <div className="flex flex-col items-center gap-2 py-4">
                            <div className="text-sm font-medium">Loading vulnerabilities...</div>
                            <Progress value={33} className="w-full" />
                          </div>
                        )}

                        {nvdError && (
                          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{nvdError}</AlertDescription>
                          </Alert>
                        )}

                        {/* NVD Search Results */}
                        {!isLoadingNvd && nvdSearchResults.length > 0 && (
                          <div>
                            <h3 className="text-md font-medium mb-3">Search Results</h3>
                            <div className="rounded-md border border-gray-200 overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-100">
                                    <TableHead>CVE ID</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Published</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {nvdSearchResults.map((item) => {
                                    const cve = item.cve;
                                    const metrics = cve?.metrics?.cvssMetricV31?.[0] || cve?.metrics?.cvssMetricV30?.[0] || cve?.metrics?.cvssMetricV2?.[0];
                                    const score = metrics?.cvssData?.baseScore || 0;
                                    const severity = metrics?.cvssData?.baseSeverity || getCvssSeverityText(score);
                                    const description = cve?.descriptions?.find(d => d.lang === 'en')?.value || 'No description available';
                                    const published = new Date(cve?.published).toLocaleDateString();

                                    return (
                                      <TableRow key={cve?.id}>
                                        <TableCell className="font-medium">{cve?.id}</TableCell>
                                        <TableCell className="max-w-md truncate">
                                          {description.length > 100 ? description.substring(0, 100) + '...' : description}
                                        </TableCell>
                                        <TableCell>
                                          <Badge className={getSeverityColor(severity)}>
                                            {severity} ({score})
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{published}</TableCell>
                                        <TableCell>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7"
                                              onClick={() => handleShowCveDetails(item)}
                                            >
                                              <Info className="h-3.5 w-3.5 mr-1" />
                                              Details
                                            </Button>
                                            <Select onValueChange={(value) => handleSelectCve(item, parseInt(value))}>
                                              <SelectTrigger className="w-[180px] h-7">
                                                <SelectValue placeholder="Apply to subsystem" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {subsystemTypes.map((system) => (
                                                  <SelectItem key={system.index} value={system.index.toString()}>
                                                    {system.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Selected NVD Vulnerabilities */}
                        {selectedNvdVulnerabilities.length > 0 && (
                          <div>
                            <h3 className="text-md font-medium mb-3">Applied Vulnerabilities</h3>
                            <div className="grid gap-3">
                              {selectedNvdVulnerabilities.map((vul, index) => (
                                <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium">
                                        {vul.cveId} - {vul.subsystemName}
                                      </div>
                                      <div className="text-sm text-gray-700 mt-1 max-w-2xl">
                                        {vul.cveDescription?.length > 100
                                          ? vul.cveDescription.substring(0, 100) + '...'
                                          : vul.cveDescription}
                                      </div>
                                      <div className="flex gap-3 mt-2">
                                        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                          Impact: {vul.impactScore.toFixed(1)}
                                        </div>
                                        <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                          Exploit: {vul.exploitScore.toFixed(1)}
                                        </div>
                                        <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                          CVSS: {vul.cvssScore.toFixed(1)}
                                        </div>
                                        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                          Exploit Exists: {vul.exploitExists ? 'Yes' : 'No'}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setSelectedNvdVulnerabilities(
                                          selectedNvdVulnerabilities.filter((_, i) => i !== index)
                                        );
                                        setVulnerabilities(
                                          vulnerabilities.filter(v =>
                                            !(v.subsystemIndex === vul.subsystemIndex && v.cveId === vul.cveId)
                                          )
                                        );
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Separator />
              </>
            )}

            {/* CVE Details Dialog */}
            <Dialog open={cveDetailsOpen} onOpenChange={setCveDetailsOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>{currentCveDetails?.cve?.id || 'CVE Details'}</DialogTitle>
                  <DialogDescription>
                    Vulnerability details from the National Vulnerability Database
                  </DialogDescription>
                </DialogHeader>

                {currentCveDetails && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                      <p className="text-sm">
                        {currentCveDetails.cve?.descriptions?.find(d => d.lang === 'en')?.value || 'No description available'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Published</h4>
                        <p className="text-sm">
                          {new Date(currentCveDetails.cve?.published).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Last Modified</h4>
                        <p className="text-sm">
                          {new Date(currentCveDetails.cve?.lastModified).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">CVSS Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* CVSS v3.1 */}
                        {currentCveDetails.cve?.metrics?.cvssMetricV31?.map((metric, idx) => (
                          <div key={`v31-${idx}`} className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <div className="text-xs font-medium mb-2">CVSS v3.1</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Base Score:</span>
                                <span className="text-xs font-medium">{metric.cvssData?.baseScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Severity:</span>
                                <span className="text-xs font-medium">{metric.cvssData?.baseSeverity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Impact:</span>
                                <span className="text-xs font-medium">{metric.impactScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Exploitability:</span>
                                <span className="text-xs font-medium">{metric.exploitabilityScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Vector:</span>
                                <span className="text-xs font-medium">{metric.cvssData?.vectorString}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* CVSS v3.0 */}
                        {currentCveDetails.cve?.metrics?.cvssMetricV30?.map((metric, idx) => (
                          <div key={`v30-${idx}`} className="p-3 bg-green-50 border border-green-200 rounded">
                            <div className="text-xs font-medium mb-2">CVSS v3.0</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Base Score:</span>
                                <span className="text-xs font-medium">{metric.cvssData?.baseScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Severity:</span>
                                <span className="text-xs font-medium">{metric.cvssData?.baseSeverity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Impact:</span>
                                <span className="text-xs font-medium">{metric.impactScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Exploitability:</span>
                                <span className="text-xs font-medium">{metric.exploitabilityScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Vector:</span>
                                <span className="text-xs font-medium">{metric.cvssData?.vectorString}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* CVSS v2.0 */}
                        {currentCveDetails.cve?.metrics?.cvssMetricV2?.map((metric, idx) => (
                          <div key={`v2-${idx}`} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="text-xs font-medium mb-2">CVSS v2.0</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Base Score:</span>
                                <span className="text-xs font-medium">{metric.cvssData?.baseScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Severity:</span>
                                <span className="text-xs font-medium">{getCvssSeverityText(metric.cvssData?.baseScore)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Impact:</span>
                                <span className="text-xs font-medium">{metric.impactScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Exploitability:</span>
                                <span className="text-xs font-medium">{metric.exploitabilityScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-gray-600">Vector:</span>
                                <span className="text-xs font-medium">{metric.cvssData?.vectorString}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {currentCveDetails.cve?.weaknesses && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Weaknesses (CWEs)</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentCveDetails.cve.weaknesses.map((weakness, idx) => (
                            weakness.description.map((desc, descIdx) => (
                              <Badge key={`${idx}-${descIdx}`} variant="outline" className="bg-purple-50">
                                {desc.value}
                              </Badge>
                            ))
                          ))}
                        </div>
                      </div>
                    )}

                    {currentCveDetails.cve?.references && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">References</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {currentCveDetails.cve.references.map((ref, idx) => (
                            <li key={idx}>
                              <a
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {ref.url}
                              </a>
                              {ref.tags && ref.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {ref.tags.map((tag, tagIdx) => (
                                    <Badge key={tagIdx} variant="outline" className="text-xs py-0 px-1 h-5">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button onClick={() => setCveDetailsOpen(false)}>Close</Button>
                      <Select onValueChange={(value) => {
                        handleSelectCve(currentCveDetails, parseInt(value));
                        setCveDetailsOpen(false);
                      }}>
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Apply to subsystem" />
                        </SelectTrigger>
                        <SelectContent>
                          {subsystemTypes.map((system) => (
                            <SelectItem key={system.index} value={system.index.toString()}>
                              {system.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Player Management Section */}
            {showPlayerManager && (
              <>
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Player Management</CardTitle>
                    <CardDescription>
                      Configure players and their groups for the simulation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div>
                        <Label>Preset Configurations</Label>
                        <Select value={currentConfigId} onValueChange={loadPresetConfiguration}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select configuration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1att-2def">1 Attacker, 2 Defenders</SelectItem>
                            <SelectItem value="2att-1def">2 Attackers, 1 Defender</SelectItem>
                            <SelectItem value="1att-3def">1 Attacker, 3 Defenders</SelectItem>
                            <SelectItem value="3att-1def">3 Attackers, 1 Defender</SelectItem>
                            <SelectItem value="custom">Custom Configuration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                        <div>
                          <h3 className="text-md font-medium mb-4">Current Players</h3>

                          {playerGroups.map(group => (
                            <div key={group.id} className="mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge style={{ backgroundColor: group.color }} className="text-white">{group.name}</Badge>
                                <span className="text-sm text-gray-500">{group.description}</span>
                              </div>

                              {getActivePlayersByGroup(group.id).length > 0 ? (
                                <div className="space-y-2">
                                  {getActivePlayersByGroup(group.id).map(player => (
                                    <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={player.avatar} alt={player.name} />
                                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="font-medium">{player.name}</div>
                                          <div className="text-xs text-gray-500">{player.role}</div>
                                          {hasResults && (
                                            <div className="text-xs font-medium mt-1">
                                              Profit: <span className={player.profit >= 0 ? "text-green-600" : "text-red-600"}>
                                                {player.profit.toFixed(2)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={player.active}
                                          onCheckedChange={() => handleTogglePlayerActive(player.id)}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-500 hover:text-red-700"
                                          onClick={() => handleRemovePlayer(player.id)}
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic p-2">No players in this group</div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div>
                          <h3 className="text-md font-medium mb-4">Add New Player</h3>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="playerName">Player Name</Label>
                              <Input
                                id="playerName"
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label htmlFor="playerRole">Role</Label>
                              <Input
                                id="playerRole"
                                value={newPlayerRole}
                                onChange={(e) => setNewPlayerRole(e.target.value)}
                                placeholder="e.g., Security Analyst, Penetration Tester"
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label htmlFor="playerGroup">Group</Label>
                              <Select value={newPlayerGroup} onValueChange={setNewPlayerGroup}>
                                <SelectTrigger id="playerGroup" className="mt-1">
                                  <SelectValue placeholder="Select group" />
                                </SelectTrigger>
                                <SelectContent>
                                  {playerGroups.map(group => (
                                    <SelectItem key={group.id} value={group.id}>
                                      {group.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button onClick={handleAddPlayer} className="w-full">
                              Add Player
                            </Button>
                          </div>

                          <Separator className="my-6" />

                          <h3 className="text-md font-medium mb-4">Simulation Controls</h3>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="maxRounds">Maximum Rounds</Label>
                              <Input
                                id="maxRounds"
                                type="number"
                                min="1"
                                value={maxRounds}
                                onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                                className="mt-1"
                              />
                            </div>

                            {turnBasedMode ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                                  <div>
                                    <div className="font-medium">Round {currentRound} of {maxRounds}</div>
                                    {currentTurn && (
                                      <div className="text-sm">
                                        Current Turn: {getPlayerById(currentTurn)?.name}
                                        <Badge className="ml-2" style={{ backgroundColor: getPlayerGroupById(getPlayerById(currentTurn)?.group)?.color }}>
                                          {getPlayerGroupById(getPlayerById(currentTurn)?.group)?.name}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  <Button onClick={handleNextTurn}>Next Turn</Button>
                                </div>

                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => setTurnBasedMode(false)}
                                >
                                  End Turn-Based Mode
                                </Button>
                              </div>
                            ) : (
                              <Button
                                className="w-full"
                                onClick={handleStartTurnBasedMode}
                                disabled={players.filter(p => p.active).length === 0}
                              >
                                Start Turn-Based Mode
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Profit Distribution Chart */}
                      {hasResults && (
                        <div className="mt-4">
                          <h3 className="text-md font-medium mb-4">Profit Distribution</h3>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={getProfitDataForChart()}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip
                                  formatter={(value, name, props) => [
                                    `${value.toFixed(2)}`, 'Profit'
                                  ]}
                                />
                                <Legend />
                                <Bar
                                  dataKey="profit"
                                  name="Profit"
                                  fill={(data) => data.group === "defenders" ? "#3b82f6" : "#ef4444"}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                              <div className="text-sm font-medium">Total Defender Profit</div>
                              <div className="text-lg font-bold text-blue-700">{totalDefenderProfit.toFixed(2)}</div>
                              <div className="text-xs text-gray-600">Shared among {getActivePlayersByGroup("defenders").length} defenders</div>
                            </div>
                            <div className="p-3 bg-red-50 border border-red-200 rounded">
                              <div className="text-sm font-medium">Total Attacker Profit</div>
                              <div className="text-lg font-bold text-red-700">{totalAttackerProfit.toFixed(2)}</div>
                              <div className="text-xs text-gray-600">Shared among {getActivePlayersByGroup("attackers").length} attackers</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Separator />
              </>
            )}

            {showImport && (
              <>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <SystemConfigImport onConfigLoaded={handleConfigLoaded} />
                </div>
                <Separator />
              </>
            )}

            {/* Configuration Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-96 mb-6">
                <TabsTrigger value="manual">Manual Configuration</TabsTrigger>
                <TabsTrigger value="visualization">Visualization</TabsTrigger>
                <TabsTrigger value="player-actions">Player Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* System Configuration */}
                  <div className="space-y-6">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">System Configuration</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-6">
                          <div>
                            <Tooltip content={tooltipDescriptions.systemSize}>
                              <Label className="text-gray-700">System Size</Label>
                            </Tooltip>
                            <Select onValueChange={handleSizeChange} value={numSubsystems.toString()}>
                              <SelectTrigger className="w-[180px] border-gray-300 mt-1">
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2 Subsystems</SelectItem>
                                <SelectItem value="3">3 Subsystems</SelectItem>
                                <SelectItem value="4">4 Subsystems</SelectItem>
                                <SelectItem value="5">5 Subsystems</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Separator />

                          <div className="grid gap-6">
                            <div>
                              <Tooltip content={tooltipDescriptions.functionalMatrix}>
                                <span className="inline-block mb-2">Functional Dependency Matrix</span>
                              </Tooltip>
                              <MatrixInput
                                size={numSubsystems}
                                value={functionalMatrix}
                                onChange={setFunctionalMatrix}
                                label=""
                                description="Enter 1 if subsystem i depends on subsystem j"
                              />
                            </div>
                            <div>
                              <Tooltip content={tooltipDescriptions.topologyMatrix}>
                                <span className="inline-block mb-2">Network Topology Matrix</span>
                              </Tooltip>
                              <MatrixInput
                                size={numSubsystems}
                                value={topologyMatrix}
                                onChange={setTopologyMatrix}
                                label=""
                                description="Enter 1 if subsystems i and j are connected"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Tooltip content={tooltipDescriptions.w1}>
                                <Label>w1 (Functional Weight)</Label>
                              </Tooltip>
                              <Input
                                type="number"
                                value={w1}
                                onChange={(e) => setW1(Number.parseFloat(e.target.value))}
                                step="0.1"
                                className="border-gray-300"
                              />
                            </div>
                            <div className="space-y-2">
                              <Tooltip content={tooltipDescriptions.w2}>
                                <Label>w2 (Topological Weight)</Label>
                              </Tooltip>
                              <Input
                                type="number"
                                value={w2}
                                onChange={(e) => setW2(Number.parseFloat(e.target.value))}
                                step="0.1"
                                className="border-gray-300"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Vulnerability Configuration */}
                  <div className="space-y-6">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">Vulnerability Configuration</CardTitle>
                        <CardDescription>
                          Configure subsystem vulnerabilities with their
                          <Tooltip content={tooltipDescriptions.impactScore} position="bottom">
                            <span className="font-medium text-slate-700"> impact scores</span>
                          </Tooltip>,
                          <Tooltip content={tooltipDescriptions.exploitScore} position="bottom">
                            <span className="font-medium text-slate-700"> exploit scores</span>
                          </Tooltip>, and
                          <Tooltip content={tooltipDescriptions.exploitExists} position="bottom">
                            <span className="font-medium text-slate-700"> exploit existence</span>
                          </Tooltip>.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <VulnerabilityForm
                          numSubsystems={numSubsystems}
                          value={vulnerabilities}
                          onChange={setVulnerabilities}
                        />

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Tooltip content={tooltipDescriptions.k4}>
                              <Label>k4 (Exploitability Weight)</Label>
                            </Tooltip>
                            <Input
                              type="number"
                              value={k4}
                              onChange={(e) => setK4(Number.parseFloat(e.target.value))}
                              step="0.1"
                              className="border-gray-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <Tooltip content={tooltipDescriptions.k5}>
                              <Label>k5 (Exploit Presence Weight)</Label>
                            </Tooltip>
                            <Input
                              type="number"
                              value={k5}
                              onChange={(e) => setK5(Number.parseFloat(e.target.value))}
                              step="0.1"
                              className="border-gray-300"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSimulate}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2"
                        disabled={isSimulating}
                      >
                        {isSimulating ?
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Simulating...
                          </span> :
                          "Calculate Patch Priority"
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="visualization" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Network Visualization</CardTitle>
                      <CardDescription>
                        Visual representation of network connections between subsystems
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <NetworkDiagram matrix={topologyMatrix} size={numSubsystems} />
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Functional Dependencies</CardTitle>
                      <CardDescription>
                        Visualization of subsystem functional dependencies
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-100">
                              <TableHead className="font-medium">Subsystem</TableHead>
                              <TableHead className="font-medium">Dependencies</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {functionalMatrix.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  {subsystemTypes.find(s => s.index === idx)?.name || `Subsystem ${idx + 1}`}
                                </TableCell>
                                <TableCell>
                                  {row.map((val, depIdx) => val === 1 ? depIdx + 1 : null)
                                    .filter(Boolean)
                                    .map((depIdx, i, arr) => (
                                      <span key={depIdx}>
                                        {subsystemTypes.find(s => s.index === depIdx - 1)?.name || `Subsystem ${depIdx}`}
                                        {i < arr.length - 1 ? ', ' : ''}
                                      </span>
                                    ))}
                                  {!row.some(val => val === 1) && (
                                    <span className="text-gray-500 italic">No dependencies</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="player-actions" className="mt-0">
                <div className="grid grid-cols-1 gap-6">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Player Actions</CardTitle>
                      <CardDescription>
                        Available actions for players based on their roles
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-md font-medium mb-3">Defender Actions</h3>
                          <div className="space-y-2">
                            {hasResults && vulnerabilityDetails.length > 0 ? (
                              vulnerabilityDetails.map((vul) => (
                                <div key={vul.id} className="p-3 bg-blue-50 border border-blue-200 rounded">
                                  <div className="font-medium">
                                    Apply Patch to {subsystemTypes.find(s => s.index === vul.subsystemIndex)?.name || `Subsystem ${vul.subsystemIndex + 1}`}
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    Fix vulnerability {vul.id}
                                    {vul.cveId ? ` (${vul.cveId})` : ''}
                                    with impact score {vul.iA.toFixed(1)}
                                  </div>
                                  <div className="mt-2 flex justify-end">
                                    <Button
                                      size="sm"
                                      disabled={!turnBasedMode || getPlayerById(currentTurn)?.group !== "defenders"}
                                      onClick={() => simulatePlayerAction(currentTurn, "patch", vul.subsystemIndex)}
                                    >
                                      Use Action
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <>
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                  <div className="font-medium">Apply Patch</div>
                                  <div className="text-sm text-gray-700">Fix a vulnerability in a subsystem</div>
                                  <div className="mt-2 flex justify-end">
                                    <Button size="sm" disabled={true}>
                                      Use Action
                                    </Button>
                                  </div>
                                </div>

                                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                  <div className="font-medium">System Hardening</div>
                                  <div className="text-sm text-gray-700">Increase security of a subsystem without patching</div>
                                  <div className="mt-2 flex justify-end">
                                    <Button size="sm" disabled={true}>
                                      Use Action
                                    </Button>
                                  </div>
                                </div>

                                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                  <div className="font-medium">Scan for Vulnerabilities</div>
                                  <div className="text-sm text-gray-700">Reveal hidden vulnerabilities in the system</div>
                                  <div className="mt-2 flex justify-end">
                                    <Button size="sm" disabled={true}>
                                      Use Action
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-md font-medium mb-3">Attacker Actions</h3>
                          <div className="space-y-2">
                            {hasResults && vulnerabilityDetails.length > 0 ? (
                              vulnerabilityDetails.map((vul) => (
                                <div key={vul.id} className="p-3 bg-red-50 border border-red-200 rounded">
                                  <div className="font-medium">
                                    Exploit Vulnerability in {subsystemTypes.find(s => s.index === vul.subsystemIndex)?.name || `Subsystem ${vul.subsystemIndex + 1}`}
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    Attempt to exploit {vul.id}
                                    {vul.cveId ? ` (${vul.cveId})` : ''}
                                    with potential profit {vul.prA.toFixed(1)}
                                  </div>
                                  <div className="mt-2 flex justify-end">
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={!turnBasedMode || getPlayerById(currentTurn)?.group !== "attackers"}
                                      onClick={() => simulatePlayerAction(currentTurn, "exploit", vul.subsystemIndex)}
                                    >
                                      Use Action
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <>
                                <div className="p-3 bg-red-50 border border-red-200 rounded">
                                  <div className="font-medium">Exploit Vulnerability</div>
                                  <div className="text-sm text-gray-700">Attempt to exploit a known vulnerability</div>
                                  <div className="mt-2 flex justify-end">
                                    <Button size="sm" variant="destructive" disabled={true}>
                                      Use Action
                                    </Button>
                                  </div>
                                </div>

                                <div className="p-3 bg-red-50 border border-red-200 rounded">
                                  <div className="font-medium">Reconnaissance</div>
                                  <div className="text-sm text-gray-700">Gather information about system configurations</div>
                                  <div className="mt-2 flex justify-end">
                                    <Button size="sm" variant="destructive" disabled={true}>
                                      Use Action
                                    </Button>
                                  </div>
                                </div>

                                <div className="p-3 bg-red-50 border border-red-200 rounded">
                                  <div className="font-medium">Develop Exploit</div>
                                  <div className="text-sm text-gray-700">Create a new exploit for a vulnerability</div>
                                  <div className="mt-2 flex justify-end">
                                    <Button size="sm" variant="destructive" disabled={true}>
                                      Use Action
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Player Action History */}
                      {playerActions.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-md font-medium mb-3">Action History</h3>
                          <div className="rounded-md border border-gray-200 overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-100">
                                  <TableHead>Round</TableHead>
                                  <TableHead>Player</TableHead>
                                  <TableHead>Action</TableHead>
                                  <TableHead>Target</TableHead>
                                  <TableHead>Outcome</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {playerActions.map((action) => (
                                  <TableRow key={action.id}>
                                    <TableCell>{action.round}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {action.playerName}
                                        <Badge style={{ backgroundColor: getPlayerGroupById(action.playerGroup)?.color }} className="text-white text-xs">
                                          {getPlayerGroupById(action.playerGroup)?.name.slice(0, -1)}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell>{action.action}</TableCell>
                                    <TableCell>{action.target}</TableCell>
                                    <TableCell>{action.outcome}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {!turnBasedMode && (
                        <div className="mt-6">
                          <Alert className="bg-amber-50 border-amber-200">
                            <AlertTitle>Turn-Based Mode Not Active</AlertTitle>
                            <AlertDescription>
                              Player actions are available only in turn-based mode. Go to Player Management to start turn-based mode.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}

                      {!hasResults && (
                        <div className="mt-6">
                          <Alert className="bg-blue-50 border-blue-200">
                            <AlertTitle>No Simulation Results</AlertTitle>
                            <AlertDescription>
                              Run the simulation first to enable specific actions on vulnerabilities. Go to the Manual Configuration tab and click Calculate Patch Priority.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Results Section */}
            <Separator className="my-4" />

            <div>
              <h2 className="text-xl font-semibold mb-4">Simulation Results</h2>

              {hasResults ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Risk Scores */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">
                        <Tooltip content={tooltipDescriptions.riskScores}>
                          <span>Risk Scores</span>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {riskScores.map((r, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded bg-gray-50">
                            <span className="font-medium">
                              {subsystemTypes.find(s => s.index === idx)?.name || `Subsystem ${idx + 1}`}:
                            </span>
                            <span>R_adj = {r.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vulnerability Analysis */}
                  <Card className="shadow-sm lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Vulnerability Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border border-gray-200 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-100">
                              <TableHead>ID</TableHead>
                              <TableHead>Subsystem</TableHead>
                              <TableHead>
                                <Tooltip content={tooltipDescriptions.vulSeverity}>
                                  <span>Severity</span>
                                </Tooltip>
                              </TableHead>
                              <TableHead>
                                <Tooltip content={tooltipDescriptions.iA}>
                                  <span>Impact (I_A)</span>
                                </Tooltip>
                              </TableHead>
                              <TableHead>
                                <Tooltip content={tooltipDescriptions.cD}>
                                  <span>Cost (C_D)</span>
                                </Tooltip>
                              </TableHead>
                              <TableHead>
                                <Tooltip content={tooltipDescriptions.cA}>
                                  <span>Attacker Cost (C_A)</span>
                                </Tooltip>
                              </TableHead>
                              <TableHead>
                                <Tooltip content={tooltipDescriptions.prA}>
                                  <span>Profit (Pr_A)</span>
                                </Tooltip>
                              </TableHead>
                              <TableHead>CVE ID</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vulnerabilityDetails.map((v) => (
                              <TableRow key={v.id}>
                                <TableCell>{v.id}</TableCell>
                                <TableCell>
                                  {subsystemTypes.find(s => s.index === v.subsystemIndex)?.name || `Subsystem ${v.subsystemIndex + 1}`}
                                </TableCell>
                                <TableCell>{v.vulSeverity}</TableCell>
                                <TableCell>{v.iA.toFixed(2)}</TableCell>
                                <TableCell>{v.cD.toFixed(2)}</TableCell>
                                <TableCell>{v.cA.toFixed(2)}</TableCell>
                                <TableCell>{v.prA.toFixed(2)}</TableCell>
                                <TableCell>
                                  {v.cveId ? (
                                    <Badge variant="outline" className="bg-blue-50 hover:bg-blue-100 cursor-pointer"
                                      onClick={() => {
                                        setCurrentCveDetails(
                                          nvdSearchResults.find(r => r.cve?.id === v.cveId) ||
                                          { cve: { id: v.cveId, description: v.cveDescription } }
                                        );
                                        setCveDetailsOpen(true);
                                      }}
                                    >
                                      {v.cveId}
                                    </Badge>
                                  ) : "N/A"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Patch Priority */}
                  <Card className="shadow-sm lg:col-span-3">
                    <CardHeader className="pb-2 bg-slate-50">
                      <CardTitle className="text-lg font-medium">
                        <Tooltip content={tooltipDescriptions.patchPriority}>
                          <span>Recommended Patch Priority</span>
                        </Tooltip>
                      </CardTitle>
                      <CardDescription>
                        Vulnerabilities sorted by impact/cost ratio for optimal patching sequence
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {patchPriority.map((p, index) => {
                          const ratio = p.iA / (p.cD + 0.01);
                          return (
                            <div key={p.id} className={`flex items-center gap-3 p-3 border rounded ${index < 3 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                              <span className={`font-medium text-lg w-8 h-8 flex items-center justify-center rounded-full ${index < 3 ? 'bg-amber-500' : 'bg-slate-700'} text-white`}>{index + 1}</span>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {p.id} ({subsystemTypes.find(s => s.index === p.subsystemIndex)?.name || `Subsystem ${p.subsystemIndex + 1}`})
                                  {p.cveId && <div className="text-xs text-gray-600">{p.cveId}</div>}
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                  <div className="text-sm text-gray-600">
                                    <Tooltip content={tooltipDescriptions.iA} position="bottom">
                                      <span className="text-gray-700 font-medium">Impact:</span>
                                    </Tooltip> {p.iA.toFixed(2)}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    <Tooltip content={tooltipDescriptions.cD} position="bottom">
                                      <span className="text-gray-700 font-medium">Cost:</span>
                                    </Tooltip> {p.cD.toFixed(2)}
                                  </div>
                                  <div className="text-sm text-gray-600 col-span-2">
                                    <Tooltip content={tooltipDescriptions.defenderROI} position="bottom">
                                      <span className="text-gray-700 font-medium">ROI Ratio:</span>
                                    </Tooltip> {ratio.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Legend</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
                          <div className="flex items-center gap-2">
                            <Tooltip content={tooltipDescriptions.iA} position="right">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">Impact (I_A)</span>
                            </Tooltip>
                            <span className="text-xs text-gray-600">Potential damage to the system</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tooltip content={tooltipDescriptions.cD} position="right">
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Cost (C_D)</span>
                            </Tooltip>
                            <span className="text-xs text-gray-600">Resources needed to patch</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tooltip content={tooltipDescriptions.cA} position="right">
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">Attacker Cost (C_A)</span>
                            </Tooltip>
                            <span className="text-xs text-gray-600">Effort for attackers to exploit</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tooltip content={tooltipDescriptions.defenderROI} position="right">
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">ROI Ratio</span>
                            </Tooltip>
                            <span className="text-xs text-gray-600">Value gained per resource spent</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* NVD Vulnerability Summary */}
                  {selectedNvdVulnerabilities.length > 0 && (
                    <Card className="shadow-sm lg:col-span-3">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">
                          <div className="flex items-center">
                            <Database className="mr-2 h-5 w-5" />
                            NVD Vulnerability Summary
                          </div>
                        </CardTitle>
                        <CardDescription>
                          Overview of vulnerabilities imported from the National Vulnerability Database
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col p-4 bg-blue-50 border border-blue-200 rounded">
                            <div className="text-lg font-medium text-blue-900">
                              {selectedNvdVulnerabilities.length}
                              <span className="text-sm ml-1">Vulnerabilities Applied</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Sourced from the National Vulnerability Database
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {Array.from(new Set(selectedNvdVulnerabilities.map(v => v.subsystemIndex))).map(idx => (
                                <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200">
                                  {subsystemTypes.find(s => s.index === idx)?.name || `Subsystem ${idx + 1}`}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col p-4 bg-purple-50 border border-purple-200 rounded">
                            <div className="text-lg font-medium text-purple-900">
                              CVSS Severity Distribution
                            </div>
                            <div className="space-y-2 mt-3">
                              {['Critical', 'High', 'Medium', 'Low'].map(severity => {
                                const count = selectedNvdVulnerabilities.filter(v => {
                                  if (severity === 'Critical') return v.cvssScore >= 9.0;
                                  if (severity === 'High') return v.cvssScore >= 7.0 && v.cvssScore < 9.0;
                                  if (severity === 'Medium') return v.cvssScore >= 4.0 && v.cvssScore < 7.0;
                                  return v.cvssScore < 4.0;
                                }).length;
                                const percentage = selectedNvdVulnerabilities.length > 0
                                  ? (count / selectedNvdVulnerabilities.length * 100)
                                  : 0;

                                return (
                                  <div key={severity}>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm font-medium">{severity}</span>
                                      <span className="text-sm text-gray-600">{count} ({percentage.toFixed(0)}%)</span>
                                    </div>
                                    <Progress value={percentage}
                                      className={
                                        severity === 'Critical' ? 'bg-red-200' :
                                          severity === 'High' ? 'bg-orange-200' :
                                            severity === 'Medium' ? 'bg-yellow-200' : 'bg-blue-200'
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Alert className="bg-slate-50 border-slate-200">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <AlertTitle className="text-lg font-medium text-slate-800">No Results Yet</AlertTitle>
                  </div>
                  <AlertDescription className="mt-2 text-slate-600">
                    Configure your system and vulnerabilities above, then click Calculate Patch Priority to generate simulation results.
                    {selectedNvdVulnerabilities.length > 0 && (
                      <div className="mt-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          {selectedNvdVulnerabilities.length} NVD vulnerabilities applied
                        </Badge>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}