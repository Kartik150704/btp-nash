"use client"

import React, { useState } from "react"

export const Tooltip = ({ children, content, position = "top" }) => {
  const [isVisible, setIsVisible] = useState(false)

  // Calculate position classnames
  const getPositionClasses = () => {
    switch (position) {
      case "top":
        return "bottom-full left-1/2 transform -translate-x-1/2 mb-2"
      case "bottom":
        return "top-full left-1/2 transform -translate-x-1/2 mt-2"
      case "left":
        return "right-full top-1/2 transform -translate-y-1/2 mr-2"
      case "right":
        return "left-full top-1/2 transform -translate-y-1/2 ml-2"
      default:
        return "bottom-full left-1/2 transform -translate-x-1/2 mb-2"
    }
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex items-center cursor-help"
      >
        {children}
        <span className="ml-1 text-gray-400 text-sm">ⓘ</span>
      </div>
      
      {isVisible && (
        <div className={`absolute z-50 max-w-xs ${getPositionClasses()}`}>
          <div className="bg-gray-800 text-white text-sm rounded shadow-lg p-2">
            {content}
            <div className={`absolute ${position === "top" ? "top-full left-1/2 transform -translate-x-1/2 -mt-1" : 
                              position === "bottom" ? "bottom-full left-1/2 transform -translate-x-1/2 -mb-1" :
                              position === "left" ? "left-full top-1/2 transform -translate-y-1/2 -ml-1" :
                              "right-full top-1/2 transform -translate-y-1/2 -mr-1"}`}>
              <div className={`w-2 h-2 rotate-45 bg-gray-800 ${position === "top" ? "-mt-1" : 
                              position === "bottom" ? "-mb-1" :
                              position === "left" ? "-ml-1" :
                              "-mr-1"}`}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}