import * as React from "react"

/**
 * A simple Badge component without external dependencies
 */
function Badge({
  className = "",
  variant = "default",
  children,
  ...props
}) {
  // Base classes for all badges
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
  
  // Variant-specific classes
  const variantClasses = {
    default: "bg-primary text-white hover:bg-primary/80",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-100",
  };
  
  // Combine classes
  const combinedClasses = `${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`;
  
  return (
    <div className={combinedClasses} {...props}>
      {children}
    </div>
  );
}

export { Badge };