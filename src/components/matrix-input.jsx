"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Info, Trash2, Grid } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function MatrixInput({ size, value, onChange, label, description }) {
  const [matrix, setMatrix] = useState(value)

  useEffect(() => {
    const newMatrix = Array(size)
      .fill(0)
      .map(() => Array(size).fill(0))
    for (let i = 0; i < Math.min(size, value.length); i++) {
      for (let j = 0; j < Math.min(size, value[i].length); j++) {
        newMatrix[i][j] = value[i][j]
      }
    }
    setMatrix(newMatrix)
    onChange(newMatrix)
  }, [size])

  const handleCellChange = (row, col, value) => {
    const newValue = Number.parseInt(value) || 0
    if (newValue !== 0 && newValue !== 1) return

    const newMatrix = matrix.map((r, i) => r.map((c, j) => (i === row && j === col ? newValue : c)))
    setMatrix(newMatrix)
    onChange(newMatrix)
  }

  const clearMatrix = () => {
    const newMatrix = Array(size)
      .fill(0)
      .map(() => Array(size).fill(0))
    setMatrix(newMatrix)
    onChange(newMatrix)
  }

  const fillExample = () => {
    const exampleMatrix = Array(size)
      .fill(0)
      .map(() => Array(size).fill(0))
    for (let i = 0; i < size; i++) {
      if (i < size - 1) {
        exampleMatrix[i][i + 1] = 1
        exampleMatrix[i + 1][i] = 1
      }
    }
    setMatrix(exampleMatrix)
    onChange(exampleMatrix)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">{label}</CardTitle>
            {description && (
              <CardDescription className="mt-1.5">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  <span>{description}</span>
                </div>
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={clearMatrix}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset all values to zero</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={fillExample}>
                    <Grid className="h-4 w-4 mr-1" />
                    Example
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fill with a sample adjacency matrix</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full rounded-md border h-full max-h-[500px]">
          <div className="p-3">
            <div className="grid gap-3">
              {/* Column headers in a row */}
              <div 
                className="grid gap-2 items-center sticky top-0 bg-background z-10 pb-2 border-b" 
                style={{ 
                  gridTemplateColumns: `120px repeat(${size}, minmax(50px, 1fr))` 
                }}
              >
                <div className="text-sm font-medium text-muted-foreground pl-3">To ↓ From →</div>
                {Array(size)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="text-center text-sm font-medium">
                      S{i + 1}
                    </div>
                  ))}
              </div>

              {/* Matrix rows */}
              {matrix.map((row, i) => (
                <div
                  key={i}
                  className="grid gap-2 items-center hover:bg-muted/20 rounded-sm transition-colors"
                  style={{ 
                    gridTemplateColumns: `120px repeat(${size}, minmax(50px, 1fr))` 
                  }}
                >
                  <div className="text-sm font-medium pl-3">S{i + 1}</div>
                  {row.map((cell, j) => (
                    <Input
                      key={j}
                      type="number"
                      value={cell}
                      onChange={(e) => handleCellChange(i, j, e.target.value)}
                      min={0}
                      max={1}
                      className="w-full text-center h-9"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
