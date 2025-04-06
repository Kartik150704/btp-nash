
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart2, 
  Clock, 
  Plus, 
  Grid, 
  Layers,
  Users,
  Activity,
  X,
  CheckCircle,
  ChevronRight,
  Menu,
  Bookmark,
  ExternalLink
} from 'lucide-react';
import axios from "axios";

// API Functions
const authServicePort = `https://backend-auth-service.clow.in`;

const GetSimulations = async (adminId) => {
    let response = await axios.get(`${authServicePort}/simulation/admin/${adminId}`);
    return response.data;
};

const CreateSimulation = async (name, adminId) => {
    let response = await axios.post(`${authServicePort}/simulation/`, { name, adminId });
    return response.data;
};

// Helper to get adminId from localStorage
const getAdminId = () => {
  return localStorage.getItem('id') || '';
};

// Navigation helper function
const navigateToSimulation = (simulationId) => {
  window.location.href = `/simulation/${simulationId}`;
};

const NashEquilibriumSimulation = () => {
  const [open, setOpen] = useState(false);
  const [simulationName, setSimulationName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const adminId = getAdminId();
      
      if (!adminId) {
        // Redirect to login page if no ID found
        window.location.href = '/login';
        return;
      }
      
      setCheckingAuth(false);
    };
    
    // Short timeout to ensure the check happens after component mounts
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch simulations from API after auth check is complete
  useEffect(() => {
    if (checkingAuth) return; // Don't fetch if still checking auth
    
    const fetchSimulations = async () => {
      try {
        const adminId = getAdminId();
        
        if (!adminId) {
          setError('No admin ID found. Please log in to continue.');
          setLoading(false);
          return;
        }
        
        const response = await GetSimulations(adminId);
        
        if (response && response.success) {
          const formattedSimulations = response.data.map(sim => ({
            id: sim.id,
            name: sim.name,
            createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          }));
          
          setSimulations(formattedSimulations);
        } else {
          setError('Failed to fetch simulations. Please try again.');
        }
      } catch (err) {
        console.error('Error fetching simulations:', err);
        setError('Error connecting to server. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSimulations();
  }, [checkingAuth]);

  const handleCreateSimulation = async () => {
    if (!simulationName.trim()) return;
    
    try {
      const adminId = getAdminId();
      
      if (!adminId) {
        setError('No admin ID found. Please log in to continue.');
        return;
      }
      
      const response = await CreateSimulation(simulationName, adminId);
      
      if (response && response.success) {
        const newSimulation = { 
          id: response.data.id, 
          name: response.data.name,
          createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
        
        setSimulations([newSimulation, ...simulations]);
        setSimulationName('');
        setOpen(false);
        setSuccessMessage(`Simulation "${simulationName}" created successfully!`);
        setShowSuccess(true);
        
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        setError('Failed to create simulation. Please try again.');
      }
    } catch (err) {
      console.error('Error creating simulation:', err);
      setError('Error connecting to server. Please check your connection.');
    }
  };

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        document.getElementById('simulation-name')?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Show a loading screen while checking authentication
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Fixed */}
      <div className="hidden md:block h-screen fixed left-0 top-0 w-64 border-r bg-background z-40">
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="font-semibold">Nash Simulator</h1>
          </div>
          
          <Separator />
          
          <div className="px-2 py-4">
            <nav className="space-y-1">
              <Button 
                variant={activeTab === 'dashboard' ? 'default' : 'ghost'} 
                className="w-full justify-start" 
                onClick={() => setActiveTab('dashboard')}
              >
                <Grid className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button 
                variant={activeTab === 'simulations' ? 'default' : 'ghost'} 
                className="w-full justify-start" 
                onClick={() => setActiveTab('simulations')}
              >
                <Bookmark className="mr-2 h-4 w-4" />
                Simulations
              </Button>
            </nav>
          </div>
          
          <Separator />
          
          <div className="flex-grow overflow-y-auto px-2 py-4">
            {simulations.length > 0 && !loading && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium px-2 text-muted-foreground">Recent Simulations</h3>
                <div className="space-y-1">
                  {simulations.slice(0, 5).map(sim => (
                    <Button 
                      key={sim.id} 
                      variant="ghost" 
                      className="w-full justify-start text-left h-auto py-2 cursor-pointer"
                      onClick={() => navigateToSimulation(sim.id)}
                    >
                      <div>
                        <div className="font-medium text-sm">{sim.name}</div>
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{sim.createdAt}</span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 mt-auto">
            <p className="text-xs text-muted-foreground">v1.2.0</p>
          </div>
        </div>
      </div>
      
      {/* Mobile header */}
      <div className="md:hidden border-b p-4 flex items-center justify-between sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
            <BarChart2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="font-semibold">Nash Simulator</h1>
        </div>
        
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Main content */}
      <main className="md:ml-64 flex-1 overflow-auto">
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="container py-6 md:py-10 px-4 md:px-6 max-w-7xl">
            <div className="flex flex-col gap-2 mb-8">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Nash Equilibrium Simulator
              </h1>
              <p className="text-muted-foreground">
                Find and analyze strategic equilibria in game theory scenarios
              </p>
            </div>
            
            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <div className="flex items-start">
                  <X className="h-4 w-4 mr-2 mt-0.5" />
                  <div>
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-2" 
                  onClick={() => setError(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Alert>
            )}
            
            {/* Success message */}
            {showSuccess && (
              <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-full mr-2 mt-0.5 text-green-600" />
                  <div>
                    <AlertTitle className="text-green-800 ">Success</AlertTitle>
                    <AlertDescription className="text-green-700">
                      {successMessage}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
            
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {/* Create simulation card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Create a New Simulation</CardTitle>
                  <CardDescription>
                    Set up a custom Nash equilibrium scenario to model strategic decision-making
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-3 gap-4">
                    {/* Feature 1 */}
                    <Card className="bg-card hover:bg-accent transition-colors">
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center mb-3">
                          <Users className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <h3 className="font-medium text-sm mb-1">Multi-player Games</h3>
                        <p className="text-xs text-muted-foreground">Model complex strategic interactions</p>
                      </CardContent>
                    </Card>
                    
                    {/* Feature 2 */}
                    <Card className="bg-card hover:bg-accent transition-colors">
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center mb-3">
                          <Activity className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <h3 className="font-medium text-sm mb-1">Real-time Analysis</h3>
                        <p className="text-xs text-muted-foreground">Visualize equilibria instantly</p>
                      </CardContent>
                    </Card>
                    
                    {/* Feature 3 */}
                    <Card className="bg-card hover:bg-accent transition-colors">
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center mb-3">
                          <Layers className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <h3 className="font-medium text-sm mb-1">Advanced Controls</h3>
                        <p className="text-xs text-muted-foreground">Fine-tune parameters and strategies</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button className="mt-2">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Simulation
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Simulation</DialogTitle>
                        <DialogDescription>
                          Enter a name for your Nash equilibrium simulation.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="simulation-name">Simulation Name</Label>
                          <Input
                            id="simulation-name"
                            value={simulationName}
                            onChange={(e) => setSimulationName(e.target.value)}
                            placeholder="Enter simulation name"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleCreateSimulation} 
                          disabled={!simulationName.trim()}
                        >
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
              
              {/* Recent simulations card */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Simulations</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center items-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : simulations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Bookmark className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">No simulations yet</p>
                      <Button 
                        onClick={() => setOpen(true)}
                        variant="outline"
                        size="sm"
                      >
                        Create First
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {simulations.slice(0, 3).map(sim => (
                        <div 
                          key={sim.id} 
                          className="w-full justify-between h-auto px-3 py-2 text-left border rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => navigateToSimulation(sim.id)}
                        >
                          <div>
                            <div className="font-medium text-sm">{sim.name}</div>
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{sim.createdAt}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 float-right mt-2" />
                        </div>
                      ))}
                      
                      {simulations.length > 3 && (
                        <Button 
                          variant="ghost" 
                          className="w-full mt-2" 
                          size="sm"
                          onClick={() => setActiveTab('simulations')}
                        >
                          View all simulations
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* How it works */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { number: "01", title: "Create", text: "Start with a new simulation" },
                    { number: "02", title: "Define", text: "Set player strategies and payoffs" },
                    { number: "03", title: "Analyze", text: "Find Nash equilibria points" },
                    { number: "04", title: "Share", text: "Save and collaborate" }
                  ].map((step, index) => (
                    <div key={index} className="space-y-1">
                      <div className="text-xl font-bold text-muted-foreground/30">{step.number}</div>
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">{step.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Simulations View */}
        {activeTab === 'simulations' && (
          <div className="container py-6 md:py-10 px-4 md:px-6 max-w-7xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  My Simulations
                </h1>
                <p className="text-muted-foreground">
                  All your Nash equilibrium simulations in one place
                </p>
              </div>
              
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Simulation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Simulation</DialogTitle>
                    <DialogDescription>
                      Enter a name for your Nash equilibrium simulation.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="simulation-name-2">Simulation Name</Label>
                      <Input
                        id="simulation-name-2"
                        value={simulationName}
                        onChange={(e) => setSimulationName(e.target.value)}
                        placeholder="Enter simulation name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleCreateSimulation} 
                      disabled={!simulationName.trim()}
                    >
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <div className="flex items-start">
                  <X className="h-4 w-4 mr-2 mt-0.5" />
                  <div>
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-2" 
                  onClick={() => setError(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Alert>
            )}
            
            {/* Success message */}
            {showSuccess && (
              <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600" />
                  <div>
                    <AlertTitle className="text-green-800">Success</AlertTitle>
                    <AlertDescription className="text-green-700">
                      {successMessage}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
            
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : simulations.length === 0 ? (
              <Card className="w-full flex flex-col items-center justify-center py-16 text-center">
                <Bookmark className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-medium mb-2">No simulations yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Create your first Nash equilibrium simulation to start analyzing strategic interactions
                </p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Simulation
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {simulations.map(sim => (
                  <Card 
                    key={sim.id} 
                    className="overflow-hidden hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => navigateToSimulation(sim.id)}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-4 sm:p-6">
                        <div>
                          <h3 className="text-lg font-medium">{sim.name}</h3>
                          <div className="flex items-center mt-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>Created on {sim.createdAt}</span>
                          </div>
                        </div>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent parent card onClick from triggering
                            navigateToSimulation(sim.id);
                          }}
                        >
                          <span className="mr-2">Open</span>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default NashEquilibriumSimulation;