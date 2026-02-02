import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '@/types'

interface UserTokenInputProps {
  users: User[]
  selectedUserIds: string[]
  onAdd: (userId: string) => void
  placeholder?: string
}

export default function UserTokenInput({ 
  users, 
  selectedUserIds, 
  onAdd,
  placeholder = 'Type to add...'
}: UserTokenInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLUListElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get users that match the search and aren't already selected
  const availableUsers = users.filter(user => 
    !selectedUserIds.includes(user._id)
  )

  const filteredUsers = inputValue.trim() 
    ? availableUsers.filter(user => 
        user.name.toLowerCase().includes(inputValue.toLowerCase())
      )
    : availableUsers

  // Get selected users for display
  const selectedUsers = users.filter(user => selectedUserIds.includes(user._id))

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredUsers.length])

  // Update dropdown position when shown
  useEffect(() => {
    if (showDropdown && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [showDropdown])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputFocus = () => {
    setShowDropdown(true)
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    setShowDropdown(true)
  }

  const handleSelectUser = (user: User) => {
    onAdd(user._id)
    setInputValue('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredUsers.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setShowDropdown(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredUsers[selectedIndex]) {
          handleSelectUser(filteredUsers[selectedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        break
    }
  }

  // Highlight matching text in results
  const highlightMatch = (name: string, query: string) => {
    if (!query.trim()) return name
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = name.split(regex)
    
    return parts.map((part, i) => 
      regex.test(part) 
        ? <strong key={i}>{part}</strong> 
        : part
    )
  }

  const dropdown = showDropdown && createPortal(
    <div 
      ref={dropdownRef}
      className="token-input-dropdown-facebook"
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width
      }}
    >
      {filteredUsers.length > 0 ? (
        <ul>
          {filteredUsers.map((user, index) => (
            <li
              key={user._id}
              className={
                index === selectedIndex 
                  ? 'token-input-selected-dropdown-item-facebook' 
                  : index % 2 === 0 
                    ? 'token-input-dropdown-item-facebook'
                    : 'token-input-dropdown-item2-facebook'
              }
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelectUser(user)
              }}
            >
              {highlightMatch(user.name, inputValue)}
            </li>
          ))}
        </ul>
      ) : (
        <p>{inputValue ? 'No matching users' : 'No more users to add'}</p>
      )}
    </div>,
    document.body
  )

  return (
    <div>
      <ul 
        ref={containerRef}
        className="token-input-list-facebook" 
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected tokens */}
        {selectedUsers.map(user => (
          <li key={user._id} className="token-input-token-facebook">
            <p>{user.name}</p>
          </li>
        ))}
        
        {/* Input field */}
        <li className="token-input-input-token-facebook">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={selectedUsers.length === 0 ? placeholder : ''}
            autoComplete="off"
          />
        </li>
      </ul>

      {dropdown}
    </div>
  )
}
