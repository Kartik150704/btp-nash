"use client"

import React, { useState, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/card.jsx"
import { Button } from "../components/ui/button.jsx"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert.jsx"
import { Tooltip } from "../components/tooltip.jsx"

export function FileUpload({ onDataLoaded, supportedFormats = [".json", ".csv", ".xml"] }) {
  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const resetState = () => {
    setFile(null)
    setError(null)
  }

  const handleFileChange = (event) => {
    resetState()
    const selectedFile = event.target.files[0]
    processFile(selectedFile)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    resetState()

    const droppedFile = e.dataTransfer.files[0]
    processFile(droppedFile)
  }

  const processFile = (selectedFile) => {
    if (!selectedFile) return

    // Check file type
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase()
    const isValidFormat = supportedFormats.some(format => 
      format.toLowerCase() === `.${fileExtension}` || 
      format.toLowerCase() === fileExtension
    )

    if (!isValidFormat) {
      setError(`Invalid file format. Supported formats: ${supportedFormats.join(', ')}`)
      return
    }

    setFile(selectedFile)
    parseFile(selectedFile)
  }

  const parseFile = (file) => {
    setIsLoading(true)
    setError(null)

    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const fileExtension = file.name.split('.').pop().toLowerCase()
        let parsedData

        if (fileExtension === 'json') {
          parsedData = JSON.parse(event.target.result)
        } else if (fileExtension === 'csv') {
          // Basic CSV parsing
          parsedData = parseCSV(event.target.result)
        } else if (fileExtension === 'xml') {
          // Basic XML parsing
          const parser = new DOMParser()
          const xmlDoc = parser.parseFromString(event.target.result, "text/xml")
          parsedData = xmlToJson(xmlDoc)
        } else {
          throw new Error(`Unsupported file format: .${fileExtension}`)
        }

        // Validate the data structure
        validateData(parsedData, fileExtension)
        
        // Call the parent handler with the parsed data
        onDataLoaded(parsedData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error parsing file:", error)
        setError(`Error parsing file: ${error.message}`)
        setIsLoading(false)
      }
    }

    reader.onerror = () => {
      setError("Error reading file")
      setIsLoading(false)
    }

    if (file.type === "application/json" || file.name.endsWith('.json')) {
      reader.readAsText(file)
    } else if (file.type === "text/csv" || file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else if (file.type === "text/xml" || file.name.endsWith('.xml')) {
      reader.readAsText(file)
    } else {
      setError(`Unsupported file type: ${file.type}`)
      setIsLoading(false)
    }
  }

  // Basic CSV parser
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',').map(header => header.trim())
    
    const result = []
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue // Skip empty lines
      
      const values = lines[i].split(',')
      const entry = {}
      
      for (let j = 0; j < headers.length; j++) {
        let value = values[j] ? values[j].trim() : ''
        
        // Try to convert numeric values
        if (!isNaN(value) && value !== '') {
          value = Number(value)
        }
        
        entry[headers[j]] = value
      }
      
      result.push(entry)
    }
    
    return result
  }

  // Helper function to convert XML to JSON
  const xmlToJson = (xml) => {
    // Create the return object
    let obj = {}

    if (xml.nodeType === 1) { // element
      // Attributes
      if (xml.attributes.length > 0) {
        obj["@attributes"] = {}
        for (let j = 0; j < xml.attributes.length; j++) {
          const attribute = xml.attributes.item(j)
          obj["@attributes"][attribute.nodeName] = attribute.nodeValue
        }
      }
    } else if (xml.nodeType === 3) { // text
      obj = xml.nodeValue
    }

    // Children
    if (xml.hasChildNodes()) {
      for (let i = 0; i < xml.childNodes.length; i++) {
        const item = xml.childNodes.item(i)
        const nodeName = item.nodeName
        
        if (nodeName === "#text" && item.nodeValue.trim() === "") continue
        
        if (typeof(obj[nodeName]) === "undefined") {
          obj[nodeName] = xmlToJson(item)
        } else {
          if (typeof(obj[nodeName].push) === "undefined") {
            const old = obj[nodeName]
            obj[nodeName] = []
            obj[nodeName].push(old)
          }
          obj[nodeName].push(xmlToJson(item))
        }
      }
    }
    
    return obj
  }

  // Validate the data structure
  const validateData = (data, fileExtension) => {
    // Example validation for specific file types
    if (fileExtension === 'json') {
      // Check if it's an array
      if (!Array.isArray(data) && typeof data !== 'object') {
        throw new Error("Invalid JSON structure: Expected an array or object")
      }
    } else if (fileExtension === 'csv') {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Invalid CSV structure: No data rows found")
      }
    }
    
    // You can add more specific validation based on your application's requirements
    // For example, checking for required fields in each entry
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Import System Configuration</CardTitle>
        <CardDescription>
          Upload system data in {supportedFormats.join(', ')} format
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
            isDragging 
              ? 'border-blue-400 bg-blue-50' 
              : file 
                ? 'border-green-400 bg-green-50' 
                : error 
                  ? 'border-red-400 bg-red-50' 
                  : 'border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={supportedFormats.join(',')}
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          
          {isLoading ? (
            <div className="py-4">
              <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-sm text-gray-600">Processing file...</p>
            </div>
          ) : file ? (
            <div className="py-4">
              <div className="flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  resetState();
                }}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Change File
              </Button>
            </div>
          ) : (
            <div className="py-4">
              <div className="flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">
                Drag and drop your file here or <span className="text-blue-600">browse</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: {supportedFormats.join(', ')}
              </p>
            </div>
          )}
        </div>

        {error && (
          <Alert className="mt-4 bg-red-50 border-red-200 text-red-700">
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <AlertTitle className="text-red-800">Error</AlertTitle>
                <AlertDescription className="text-red-700 mt-1">
                  {error}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        <div className="mt-4">
          <Tooltip content="Expected file format contains system configuration data including subsystems, dependencies, and vulnerability information.">
            <p className="text-xs text-gray-500 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Learn more about the expected file format
            </p>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  )
}