"use client"

import { useEffect, useRef } from "react"

export function NetworkDiagram({
  matrix = Array(2)
    .fill(0)
    .map(() => Array(2).fill(0)),
  size = 2,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Validate matrix
    if (!matrix || !Array.isArray(matrix) || matrix.length === 0 || matrix.length !== size) {
      return
    }

    // Set up canvas
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate positions
    const radius = Math.min(canvas.width, canvas.height) * 0.35
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const nodePositions = []

    // Draw connections
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 2

    for (let i = 0; i < size; i++) {
      // Adjust the starting angle to align nodes better
      const angle = (i * 2 * Math.PI) / size + Math.PI / 2
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      nodePositions.push({ x, y })

      // Draw connections
      for (let j = 0; j < i; j++) {
        if (matrix[i][j] === 1 || matrix[j][i] === 1) {
          ctx.beginPath()
          ctx.moveTo(nodePositions[i].x, nodePositions[i].y)
          ctx.lineTo(nodePositions[j].x, nodePositions[j].y)
          ctx.stroke()
        }
      }
    }

    // Draw nodes with improved styling
    nodePositions.forEach((pos, i) => {
      // Draw node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 25, 0, 2 * Math.PI)
      ctx.fillStyle = "#fff"
      ctx.fill()
      ctx.strokeStyle = "#94a3b8"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw node labels with better positioning and style
      ctx.fillStyle = "#475569"
      ctx.font = "bold 16px system-ui"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(`S${i + 1}`, pos.x, pos.y)
    })
  }, [matrix, size])

  return (
    <div className="relative aspect-video w-full max-w-md mx-auto">
      <canvas ref={canvasRef} className="w-full h-full" style={{ maxHeight: "300px" }} />
    </div>
  )
}
