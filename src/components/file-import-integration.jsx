"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card.jsx"
import { Button } from "../components/ui/button.jsx"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.jsx"
import { FileUpload } from "../components/file-upload.jsx"
import { SystemDataParser } from "../utils/system-data-parser.jsx"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert.jsx"
import { Tooltip } from "../components/tooltip.jsx"

export function SystemConfigImport({ onConfigLoaded }) {
  const [activeTab, setActiveTab] = useState("upload")
  const [isGeneratingExample, setIsGeneratingExample] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  
  const handleFileData = (fileData) => {
    try {
      // Attempt to detect file type from the data structure
      let fileType = 'json';
      if (Array.isArray(fileData) && fileData.length > 0 && fileData[0].type) {
        fileType = 'csv';
      } else if (fileData.systemConfiguration) {
        fileType = 'xml';
      }
      
      // Parse and validate the data
      const parsedConfig = SystemDataParser.parseSystemData(fileData, fileType);
      
      // Show success message
      setSuccessMessage("Configuration loaded successfully!");
      setErrorMessage(null);
      
      // Pass the config to the parent component
      onConfigLoaded(parsedConfig);
      
      // Automatically clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error("Error processing file data:", error);
      setErrorMessage(error.message || "Failed to process the uploaded file.");
      setSuccessMessage(null);
    }
  };
  
  const generateAndDownloadExample = (format) => {
    setIsGeneratingExample(true);
    
    try {
      // Generate example data
      const exampleContent = SystemDataParser.generateExampleFile(format, 3);
      
      // Create file blob
      const blob = new Blob([exampleContent], { 
        type: format === 'json' ? 'application/json' : 
              format === 'csv' ? 'text/csv' : 'application/xml' 
      });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `example-system-config.${format}`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMessage(`Example ${format.toUpperCase()} file generated!`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error("Error generating example:", error);
      setErrorMessage(`Failed to generate example: ${error.message}`);
    } finally {
      setIsGeneratingExample(false);
    }
  };
  
  return (
    <Card className="w-full shadow-md border-0">
      <CardHeader className="bg-slate-50">
        <CardTitle className="text-xl font-semibold">System Configuration</CardTitle>
        <CardDescription>
          Import your system configuration or generate an example
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="upload">Upload Configuration</TabsTrigger>
            <TabsTrigger value="example">Generate Example</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-0">
            <FileUpload 
              onDataLoaded={handleFileData}
              supportedFormats={[".json", ".csv", ".xml"]}
            />
          </TabsContent>
          
          <TabsContent value="example" className="mt-0">
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Generate Example Configuration</CardTitle>
                <CardDescription>
                  Download an example configuration file in your preferred format
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="border bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                    <CardContent className="p-4 text-center" onClick={() => generateAndDownloadExample('json')}>
                      <div className="rounded-full h-12 w-12 flex items-center justify-center bg-blue-100 text-blue-600 mx-auto mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="font-medium">JSON Format</div>
                      <div className="text-xs text-gray-500 mt-1">Standard data interchange format</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                    <CardContent className="p-4 text-center" onClick={() => generateAndDownloadExample('csv')}>
                      <div className="rounded-full h-12 w-12 flex items-center justify-center bg-green-100 text-green-600 mx-auto mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="font-medium">CSV Format</div>
                      <div className="text-xs text-gray-500 mt-1">Spreadsheet-compatible data format</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                    <CardContent className="p-4 text-center" onClick={() => generateAndDownloadExample('xml')}>
                      <div className="rounded-full h-12 w-12 flex items-center justify-center bg-purple-100 text-purple-600 mx-auto mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="font-medium">XML Format</div>
                      <div className="text-xs text-gray-500 mt-1">Structured markup format</div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-4">
                  <Tooltip content="Examples include randomized functional and topology matrices, along with vulnerability data for each subsystem. You can use these as templates to create your own configurations.">
                    <p className="text-xs text-gray-500 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Example files contain randomly generated system data
                    </p>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {errorMessage && (
          <Alert className="mt-4 bg-red-50 border-red-200 text-red-700">
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <AlertTitle className="text-red-800">Error</AlertTitle>
                <AlertDescription className="text-red-700 mt-1">
                  {errorMessage}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="mt-4 bg-green-50 border-green-200 text-green-700">
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700 mt-1">
                  {successMessage}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
      
      {isGeneratingExample && (
        <CardFooter className="bg-gray-50 py-3 px-6 border-t flex justify-center">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 text-slate-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating example file...
          </div>
        </CardFooter>
      )}
    </Card>
  );
}