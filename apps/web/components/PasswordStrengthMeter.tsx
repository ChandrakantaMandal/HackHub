"use client"

import React, { useState, useEffect } from "react"
import { Check, X } from "lucide-react"

interface PasswordStrengthProps {
  password?: string
}

const PasswordCriteria = ({ password = "" }: PasswordStrengthProps) => {
  const criteria = [
    { label: "At Least 8 Characters", met: password.length >= 8 },
    { label: "Contains Uppercase Letter", met: /[A-Z]/.test(password) },
    { label: "Contains Lowercase Letter", met: /[a-z]/.test(password) },
    { label: "Contains a Number", met: /\d/.test(password) },
    {
      label: "Contains a Special Character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ]

  return (
    <div className="mt-3 space-y-2">
      {criteria.map((item) => (
        <div key={item.label} className="flex items-center text-xs">
          {item.met ? (
            <Check className="mr-2 h-4 w-4 shrink-0 text-green-400" />
          ) : (
            <X className="mr-2 h-4 w-4 shrink-0 text-white/30" />
          )}
          <span className={item.met ? "text-green-400" : "text-white/50"}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

const PasswordStrengthMeter = ({ password = "" }: PasswordStrengthProps) => {
  const [hasMounted, setHasMounted] = useState(false)

  // Ensure initial client render matches SSR HTML to prevent hydration error
  useEffect(() => {
    setHasMounted(true)
  }, [])

  const getStrength = (pass: string) => {
    let strength = 0
    if (pass.length >= 8) strength++
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++
    if (/\d/.test(pass)) strength++
    if (/[^a-zA-Z\d]/.test(pass)) strength++
    return strength
  }

  const strength = getStrength(password)

  const getColor = (strengthLevel: number) => {
    if (strengthLevel === 0) return "bg-red-400"
    if (strengthLevel === 1) return "bg-orange-400"
    if (strengthLevel === 2) return "bg-yellow-400"
    if (strengthLevel === 3) return "bg-lime-400"
    return "bg-green-400"
  }

  const getStrengthText = (strengthLevel: number) => {
    if (strengthLevel === 0) return "Very Weak"
    if (strengthLevel === 1) return "Weak"
    if (strengthLevel === 2) return "Fair"
    if (strengthLevel === 3) return "Good"
    return "Strong"
  }

  // Static placeholder during SSR / before mount
  if (!hasMounted) {
    return (
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-white/60">
            Password Strength
          </span>
        </div>
        <div className="flex space-x-1.5">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-1.5 w-1/4 rounded-full bg-white/10" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">
          Password Strength
        </span>
        <span className="text-xs font-semibold text-white/80">
          {getStrengthText(strength)}
        </span>
      </div>

      <div className="flex space-x-1.5">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className={`h-1.5 w-1/4 rounded-full transition-all duration-300 ${
              index < strength ? getColor(strength) : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <PasswordCriteria password={password} />
    </div>
  )
}

export default PasswordStrengthMeter
