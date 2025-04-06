
"use client"
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Settings, X, AlertTriangle } from 'lucide-react';

// API functions
const authServicePort = 'https://backend-auth-service.clow.in';

const AddPermission = async (simulationId, userId, requestingUserId, type) => {
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
  });
  return response.json();
};

// Fixed RemovePermission function to use fetch instead of axios
const RemovePermission = async (simulationId, userId, requestingUserId, type) => {
  const response = await fetch(`${authServicePort}/simulation/${simulationId}/permissions/${requestingUserId}/remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      requestingUserId,
      type
    }),
  });
  return response.json();
};

const GetSimulationData = async (userId, simulationId) => {
  const response = await fetch(`${authServicePort}/simulation/${simulationId}/permissions/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });
  return response.json();
};

// Simulation Component
const SimulationComponent = ({ permissionType }) => {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 bg-blue-50 mb-4 rounded-md">
        <p className="text-blue-700 font-medium">You have {permissionType === 'edit' ? 'Edit' : 'View-only'} access</p>
      </div>
      <div className="flex-grow flex items-center justify-center bg-gray-100 rounded-md">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Simulation content would appear here</p>
          {permissionType === 'edit' && (
            <Button>Edit Simulation</Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main component
const SimulationTabs = () => {
  // Example simulation ID
  const simulationId = '0be62a3a-ebcd-4f67-ab49-3774b2695809';
  const simulationName = 'Weather Prediction Model';
  
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
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      setPermissionStatus('checking');
      
      // First try with id from localStorage
      const id = localStorage.getItem('id');
      if (id) {
        const response = await GetSimulationData(id, simulationId);
        
        if (response.success) {
          setPermissionStatus('granted');
          setUsers(response.data || []);
          setIsAdmin(true);
          setPermissionType(response.permissionType || 'view');
          setActiveTab('simulation'); // Show simulation tab when permission is granted
          return;
        }
      }
      
      // If first attempt fails, try with userEmail
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        const response = await GetSimulationData(userEmail, simulationId);
        if (response.success) {
          setPermissionStatus('granted');
          setIsAdmin(false);
          setPermissionType(response.permissionType || 'view');
          setActiveTab('simulation'); // Show simulation tab when permission is granted
          return;
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
          <Alert className="border-gray-400 bg-gray-100">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Checking permissions...</AlertTitle>
          </Alert>
        );
      case 'granted':
        return (
          <Alert className="border-green-600 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Access Granted</AlertTitle>
            <AlertDescription>
              You have {isAdmin ? 'administrator' : permissionType} access to this simulation.
            </AlertDescription>
          </Alert>
        );
      case 'denied':
        return (
          <Alert className="border-red-600 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-600">Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access this simulation.
              <Button variant="outline" size="sm" className="mt-2">
                Request Access from Owner
              </Button>
            </AlertDescription>
          </Alert>
        );
      case 'error':
        return (
          <Alert className="border-yellow-600 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-600">Connection Error</AlertTitle>
            <AlertDescription>
              Unable to verify permissions. Please try again later.
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10 bg-white border-b">
          {/* Only show simulation tab if permission is granted */}
          {permissionStatus === 'granted' ? (
            <>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </>
          ) : (
            // If permission is not granted, only show settings tab
            <TabsTrigger value="settings" className="col-span-2">Settings</TabsTrigger>
          )}
        </TabsList>
        
        <div className="flex-grow overflow-auto p-6">
          {permissionStatus === 'granted' && (
            <TabsContent value="simulation" className="h-full mt-0">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>{simulationName}</CardTitle>
                  <CardDescription>
                    Run and view simulation results
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <SimulationComponent permissionType={permissionType} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          <TabsContent value="settings" className="h-full mt-0">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Simulation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 flex-grow overflow-auto">
                {/* Permission Status Alert */}
                {renderPermissionStatus()}

                {/* Permission Management (Admin only) */}
                {isAdmin && permissionStatus === 'granted' && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Access Management</h3>
                      
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">Add User</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add User Permission</DialogTitle>
                            <DialogDescription>
                              Enter email address and permission level for the new user.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            {errorMessage && (
                              <Alert variant="destructive" className="text-red-600 bg-red-50 border-red-200">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{errorMessage}</AlertDescription>
                              </Alert>
                            )}
                            
                            <div className="space-y-2">
                              <Label htmlFor="email">Email Address</Label>
                              <Input 
                                id="email" 
                                placeholder="user@example.com" 
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="permission-type">Permission Type</Label>
                              <Select 
                                value={permissionType} 
                                onValueChange={setPermissionType}
                              >
                                <SelectTrigger id="permission-type">
                                  <SelectValue placeholder="Select permission type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="view">View Only</SelectItem>
                                  <SelectItem value="edit">Edit Access</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setIsAddDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleAddPermission}
                              disabled={isLoading}
                            >
                              {isLoading ? 'Adding...' : 'Add User'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {/* Confirmation Dialog for User Removal */}
                    <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Confirm User Removal</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to remove {userToRemove?.userId}? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        
                        {errorMessage && (
                          <Alert variant="destructive" className="mt-4 text-red-600 bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{errorMessage}</AlertDescription>
                          </Alert>
                        )}
                        
                        <DialogFooter className="mt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsConfirmDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={handleRemoveUser}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Removing...' : 'Remove User'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <div className="border rounded-md">
                      <div className="grid grid-cols-12 py-3 px-4 bg-gray-50 font-medium text-sm">
                        <div className="col-span-7">Email</div>
                        <div className="col-span-4">Permission</div>
                        <div className="col-span-1"></div>
                      </div>
                      
                      <div className="divide-y">
                        {users.map((user, index) => (
                          <div key={index} className="grid grid-cols-12 py-3 px-4 items-center text-sm">
                            <div className="col-span-7 truncate">{user.userId}</div>
                            <div className="col-span-4">
                              <Badge variant={user.permission === 'edit' ? 'default' : 'outline'}>
                                {user.permission === 'edit' ? 'Edit Access' : 'View Only'}
                              </Badge>
                            </div>
                            <div className="col-span-1 text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => showRemoveConfirmation(user)}
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {users.length === 0 && (
                          <div className="py-6 text-center text-gray-500">
                            No users have been added yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SimulationTabs;