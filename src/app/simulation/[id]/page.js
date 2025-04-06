
"use client"
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation'; // For App Router
// import { useRouter } from 'next/router'; // Uncomment for Pages Router
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle, 
  Settings, 
  X, 
  AlertTriangle, 
  ChevronRight, 
  Users, 
  Shield, 
  Eye, 
  Edit as EditIcon,
  Loader2,
  Mail
} from 'lucide-react';
import SmartPatchSimulator from '@/app/page';

// API functions with timeout and error handling
const authServicePort = 'https://backend-auth-service.clow.in';

const AddPermission = async (simulationId, userId, requestingUserId, type) => {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${authServicePort}/simulation/${simulationId}/permissions/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        requestingUserId,
        type
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("AddPermission error:", error);
    // Return a standardized error response
    return { 
      success: false, 
      message: error.name === 'AbortError' 
        ? 'Request timed out' 
        : 'Failed to add permission'
    };
  }
};

// Add proper RemovePermission function that uses fetch instead of axios
const RemovePermission = async (simulationId, userId, requestingUserId, type) => {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${authServicePort}/simulation/${simulationId}/permissions/${userId}/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        requestingUserId,
        type
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("RemovePermission error:", error);
    // Return a standardized error response
    return { 
      success: false, 
      message: error.name === 'AbortError' 
        ? 'Request timed out' 
        : 'Failed to remove permission'
    };
  }
};

const GetSimulationData = async (userId, simulationId) => {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${authServicePort}/simulation/${simulationId}/permissions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("GetSimulationData error:", error);
    // Return a standardized error response
    return { 
      success: false, 
      message: error.name === 'AbortError' 
        ? 'Request timed out' 
        : 'Failed to fetch simulation data'
    };
  }
};

// Simulation Component
const SimulationComponent = ({ permissionType, simulationId }) => {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 mb-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 shadow-sm">
        <div className="flex items-center">
          {permissionType === 'edit' ? (
            <EditIcon className="h-5 w-5 text-blue-600 mr-2" />
          ) : (
            <Eye className="h-5 w-5 text-blue-600 mr-2" />
          )}
          <p className="font-medium text-blue-700">
            You have {permissionType === 'edit' ? 'Edit' : 'View-only'} access
          </p>
        </div>
      </div>
      <div className="flex-grow">
        <SmartPatchSimulator />
      </div>
    </div>
  );
};

// Main component
const SimulationTabs = () => {
  // For App Router
  const params = useParams();
  const simulationId = params?.id;
  
  // For Pages Router (uncomment if using Pages Router)
  // const router = useRouter();
  // const { id: simulationId } = router.query;
  
  const [isMounted, setIsMounted] = useState(false);
  const [simulationName, setSimulationName] = useState('Weather Prediction Model');
  
  // State variables
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [isAdmin, setIsAdmin] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [permissionType, setPermissionType] = useState('view');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('settings'); // Default to settings tab

  // Handle component mounting and initial data loading
  useEffect(() => {
    // Set mounted first to avoid localStorage errors
    setIsMounted(true);
    
    // Don't proceed if we don't have a simulationId
    if (!simulationId) return;
    
    // Set a loading timeout
   
    
    // Check permissions if we have simulationId
    if (simulationId) {
      checkPermissions();
    }
    
    // Clear timeout on cleanup
    return () => clearTimeout(loadingTimeout);
  }, [simulationId]);

  const checkPermissions = async () => {
    try {
      setPermissionStatus('checking');
      
      // Safely get values from localStorage with try/catch
      let id, userEmail;
      try {
        id = localStorage.getItem('id');
        userEmail = localStorage.getItem('userEmail');
      } catch (e) {
        console.error('Error accessing localStorage:', e);
        // Continue with null values
      }
      
      // Skip API calls if we don't have any auth info
      if (!id && !userEmail) {
        setPermissionStatus('denied');
        return;
      }
      
      // First try with id from localStorage
      if (id) {
        try {
          // Add timeout for fetch
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await GetSimulationData(id, simulationId);
          clearTimeout(timeoutId);
          
          if (response && response.success) {
            setPermissionStatus('granted');
            setUsers(response.data || []);
            setIsAdmin(true);
            setPermissionType(response.permissionType || 'view');
            setActiveTab('simulation'); // Show simulation tab when permission is granted
            return;
          }
        } catch (idError) {
          console.error('Error checking permissions with ID:', idError);
          // Continue to next method
        }
      }
      
      // If first attempt fails, try with userEmail
      if (userEmail) {
        try {
          // Add timeout for fetch
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await GetSimulationData(userEmail, simulationId);
          clearTimeout(timeoutId);
          
          if (response && response.success) {
            setPermissionStatus('granted');
            setIsAdmin(false);
            setPermissionType(response.permissionType || 'view');
            setActiveTab('simulation'); // Show simulation tab when permission is granted
            return;
          }
        } catch (emailError) {
          console.error('Error checking permissions with email:', emailError);
          // Fall through to denied
        }
      }
      
      // If both fail, no permission
      setPermissionStatus('denied');
      setActiveTab('settings'); // Keep settings tab as default when permission is denied
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionStatus('error');
      setActiveTab('settings'); // Keep settings tab as default when there's an error
    }
  };

  const handleAddPermission = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const requestingUserId = localStorage.getItem('id');
      const response = await AddPermission(simulationId, newEmail, requestingUserId, permissionType);
      
      if (response.success) {
        // Add to local state (in a real app, you'd refresh data from server)
        setUsers([...users, { userId: newEmail, permission: permissionType }]);
        setNewEmail('');
        setPermissionType('view');
        setIsAddDialogOpen(false);
      } else {
        setErrorMessage(response.message || 'Failed to add permission');
      }
    } catch (error) {
      console.error('Error adding permission:', error);
      setErrorMessage('An error occurred while adding permission');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to show confirmation dialog
  const showRemoveConfirmation = (user) => {
    setUserToRemove(user);
    setIsConfirmDialogOpen(true);
  };

  // Function to handle user removal with the proper parameters
  const handleRemoveUser = async () => {
    if (!userToRemove) return;
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const requestingUserId = localStorage.getItem('id');
      
      // Call the RemovePermission API with the exact parameters as defined
      const response = await RemovePermission(
        simulationId,
        userToRemove.userId,
        requestingUserId,
        userToRemove.permission
      );
      
      if (response.success) {
        // Update the users list after successful removal
        setUsers(users.filter(user => user.userId !== userToRemove.userId));
        setIsConfirmDialogOpen(false);
      } else {
        setErrorMessage(response.message || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      setErrorMessage('An error occurred while removing the user');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPermissionStatus = () => {
    switch (permissionStatus) {
      case 'checking':
        return (
          <div className="space-y-4">
            <Alert className="border border-gray-200 bg-gray-50 shadow-sm">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-gray-600" />
                <AlertTitle>Checking permissions...</AlertTitle>
              </div>
              <AlertDescription className="pl-6 mt-2 text-gray-600">
                Verifying your access level for this simulation
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkPermissions} 
              className="w-full transition-all hover:bg-gray-100 flex items-center justify-center"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Retry Check
            </Button>
          </div>
        );
      case 'granted':
        return (
          <Alert className="border-0 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500 shadow-sm">
            <CheckCircle className="h-5 w-full text-green-600" />
            <AlertTitle className="text-green-800 font-medium">Access Granted</AlertTitle>
            <AlertDescription className="text-green-700 mt-1">
              You have {isAdmin ? (
                <span className="font-medium">administrator</span>
              ) : (
                <span className="font-medium">{permissionType}</span>
              )} access to this simulation.
            </AlertDescription>
          </Alert>
        );
      case 'denied':
        return (
          <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-l-red-500 shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800 font-medium">Access Denied</AlertTitle>
            <AlertDescription className="text-red-700 mt-1">
              You do not have permission to access this simulation.
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 transition-all"
              >
                Request Access from Owner
              </Button>
            </AlertDescription>
          </Alert>
        );
      case 'error':
        return (
          <div className="space-y-4">
            <Alert className="border-0 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-l-amber-500 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertTitle className="text-amber-800 font-medium">Connection Error</AlertTitle>
              <AlertDescription className="text-amber-700 mt-1">
                Unable to verify permissions. The server might be unavailable.
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkPermissions} 
              className="w-full border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-all flex items-center justify-center"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Retry Connection
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  // Simplified initial rendering
  if (!isMounted || !simulationId) {
    return (
      <div className="w-full h-screen p-6 flex items-center justify-center bg-gray-50">
        {!isMounted ? (
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Loading simulation...</p>
          </div>
        ) : (
          <div className="max-w-md bg-white p-8 rounded-xl shadow-lg border border-red-100">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-700 text-center mb-2">Simulation Not Found</h3>
            <p className="text-gray-600 text-center mb-6">
              The simulation ID was not found. Please check the URL and try again.
            </p>
            <Button 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">{simulationName}</h1>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={permissionStatus === 'granted' ? 'default' : 'secondary'}
              className={`rounded-full px-3 ${permissionStatus === 'granted' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800'}`}
            >
              {isAdmin ? 'Admin' : permissionType === 'edit' ? 'Editor' : 'Viewer'}
            </Badge>
            <Badge variant="outline" className="rounded-full bg-gray-100 text-gray-700 border-gray-300">
              ID: {simulationId.slice(0, 8)}...
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-screen-xl mx-auto">
            <TabsList className="h-12 bg-transparent w-full justify-start border-b-0">
              {/* Only show simulation tab if permission is granted */}
              {permissionStatus === 'granted' ? (
                <>
                  <TabsTrigger 
                    value="simulation" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none rounded-none h-12 px-6 text-base"
                  >
                    Simulation
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none rounded-none h-12 px-6 text-base"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </TabsTrigger>
                </>
              ) : (
                // If permission is not granted, only show settings tab
                <TabsTrigger 
                  value="settings" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none rounded-none h-12 px-6 text-base"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        </div>
        
        <div className="flex-grow overflow-auto p-4 md:p-6">
          <div className="max-w-screen-xl mx-auto">
            {permissionStatus === 'granted' && (
              <TabsContent value="simulation" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b border-gray-100 py-4">
                    <div className="flex items-center">
                      <div className="mr-4 p-2 rounded-full bg-indigo-50">
                        <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-1">{simulationName}</CardTitle>
                        <CardDescription className="text-gray-500">
                          Run your simulation and visualize the results in real-time
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge 
                          className={`${permissionType === 'edit' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} mr-3`}
                        >
                          {permissionType === 'edit' ? (
                            <span className="flex items-center">
                              <EditIcon className="h-3 w-3 mr-1" /> Editor
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <Eye className="h-3 w-3 mr-1" /> Viewer
                            </span>
                          )}
                        </Badge>
                        <span className="text-sm text-gray-500">Simulation ID: {simulationId.slice(0, 12)}...</span>
                      </div>
                      {permissionType === 'edit' && (
                        <Button size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                          <EditIcon className="h-3.5 w-3.5 mr-1.5" /> Edit Configuration
                        </Button>
                      )}
                    </div>
                    <div className="p-6">
                      <SimulationComponent permissionType={permissionType} simulationId={simulationId} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            
            <TabsContent value="settings" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="bg-white border-b border-gray-100 py-4">
                  <div className="flex items-center">
                    <div className="mr-4 p-2 rounded-full bg-gray-100">
                      <Settings className="h-6 w-6 text-gray-700" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-1">Simulation Settings</CardTitle>
                      <CardDescription className="text-gray-500">
                        Manage access controls and permissions for this simulation
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* Permission Status Alert */}
                  <div className="mb-8">
                    {renderPermissionStatus()}
                  </div>

                  {/* Permission Management (Admin only) */}
                  {isAdmin && permissionStatus === 'granted' && (
                    <div className="space-y-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-gray-700 mr-2" />
                          <h3 className="text-lg font-medium text-gray-800">Access Management</h3>
                        </div>
                        
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                              Add User
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md rounded-xl">
                            <DialogHeader className="pb-2">
                              <DialogTitle className="text-xl">Add User Permission</DialogTitle>
                              <DialogDescription className="text-gray-600">
                                Enter email address and permission level for the new user.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              {errorMessage && (
                                <Alert className="border-red-200 bg-red-50 text-red-700">
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                  <AlertDescription className="ml-2">{errorMessage}</AlertDescription>
                                </Alert>
                              )}
                              
                              <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input 
                                    id="email" 
                                    placeholder="user@example.com" 
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="pl-10 py-2 border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 rounded-md shadow-sm"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="permission-type" className="text-gray-700">Permission Type</Label>
                                <Select 
                                  value={permissionType} 
                                  onValueChange={setPermissionType}
                                >
                                  <SelectTrigger id="permission-type" className="border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 rounded-md shadow-sm">
                                    <SelectValue placeholder="Select permission type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="view" className="flex items-center py-2.5">
                                      <div className="flex items-center">
                                        <Eye className="h-4 w-4 mr-2 text-gray-600" />
                                        <span>View Only</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="edit" className="flex items-center py-2.5">
                                      <div className="flex items-center">
                                        <EditIcon className="h-4 w-4 mr-2 text-gray-600" />
                                        <span>Edit Access</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <DialogFooter className="gap-2 flex-row sm:justify-end">
                              <Button 
                                variant="outline" 
                                onClick={() => setIsAddDialogOpen(false)}
                                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleAddPermission}
                                disabled={isLoading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
                              >
                                {isLoading ? (
                                  <div className="flex items-center">
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Adding...
                                  </div>
                                ) : 'Add User'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      {/* Confirmation Dialog for User Removal */}
                      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                        <DialogContent className="sm:max-w-md rounded-xl">
                          <DialogHeader className="space-y-2">
                            <DialogTitle className="text-xl text-gray-800">
                              Remove User Access
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                              Are you sure you want to remove <span className="font-medium text-red-600">{userToRemove?.userId}</span>? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          
                          {errorMessage && (
                            <Alert className="mt-4 border-red-200 bg-red-50 text-red-700">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                          )}
                          
                          <DialogFooter className="mt-6 gap-2 flex-row sm:justify-end">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsConfirmDialogOpen(false)}
                              className="border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                              Cancel
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={handleRemoveUser}
                              disabled={isLoading}
                              className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
                            >
                              {isLoading ? (
                                <div className="flex items-center">
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Removing...
                                </div>
                              ) : 'Remove User'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <div className="px-6 pb-6">
                        <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
                          <div className="grid grid-cols-12 py-3 px-4 bg-gray-50 font-medium text-sm text-gray-700 border-b border-gray-200">
                            <div className="col-span-7">Email</div>
                            <div className="col-span-4">Permission</div>
                            <div className="col-span-1"></div>
                          </div>
                          
                          <div className="divide-y divide-gray-200 bg-white">
                            {users.map((user, index) => (
                              <div key={index} className="grid grid-cols-12 py-3 px-4 items-center text-sm hover:bg-gray-50 transition-colors">
                                <div className="col-span-7 truncate flex items-center">
                                  <Mail className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                                  <span className="truncate text-gray-700">{user.userId}</span>
                                </div>
                                <div className="col-span-4">
                                  <Badge variant={user.permission === 'edit' ? 'default' : 'outline'} 
                                    className={user.permission === 'edit' 
                                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 flex w-fit items-center' 
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 flex w-fit items-center'
                                    }
                                  >
                                    {user.permission === 'edit' ? (
                                      <>
                                        <EditIcon className="h-3 w-3 mr-1" />
                                        Edit Access
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="h-3 w-3 mr-1" />
                                        View Only
                                      </>
                                    )}
                                  </Badge>
                                </div>
                                <div className="col-span-1 text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => showRemoveConfirmation(user)}
                                    className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-700 text-gray-500"
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remove</span>
                                  </Button>
                                </div>
                              </div>
                            ))}
                            
                            {users.length === 0 && (
                              <div className="py-8 text-center text-gray-500 bg-gray-50">
                                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p>No users have been added yet</p>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-3 border-gray-300 text-gray-700 hover:bg-gray-100"
                                  onClick={() => setIsAddDialogOpen(true)}
                                >
                                  Add your first user
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default SimulationTabs;