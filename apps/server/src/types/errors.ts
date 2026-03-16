// Error types and interfaces for comprehensive error handling

export enum ErrorType {
  NETWORK = 'NETWORK',
  FILE_SYSTEM = 'FILE_SYSTEM',
  SCRAPING = 'SCRAPING',
  STORAGE = 'STORAGE',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  details?: string
  timestamp: Date
  context?: Record<string, any>
  stack?: string
  retryable: boolean
  userMessage: string
}

export interface ErrorAction {
  label: string
  action: () => void | Promise<void>
  primary?: boolean
}

export interface ErrorState {
  hasError: boolean
  error: AppError | null
  isRetrying: boolean
  retryCount: number
  maxRetries: number
}

// Network specific errors
export interface NetworkError extends AppError {
  type: ErrorType.NETWORK
  statusCode?: number
  url?: string
  isOffline?: boolean
}

// File system specific errors
export interface FileSystemError extends AppError {
  type: ErrorType.FILE_SYSTEM
  filePath?: string
  operation?: 'read' | 'write' | 'delete' | 'create'
  permissions?: boolean
}

// Scraping specific errors
export interface ScrapingError extends AppError {
  type: ErrorType.SCRAPING
  sourceUrl?: string
  selector?: string
  rateLimited?: boolean
}

// Storage specific errors
export interface StorageError extends AppError {
  type: ErrorType.STORAGE
  operation?: 'save' | 'load' | 'delete' | 'update'
  dataType?: string
}

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  canRecover: (error: AppError) => boolean
  recover: (error: AppError) => Promise<void>
  fallback?: () => Promise<void>
}

// Error reporting interface
export interface ErrorReporter {
  report: (error: AppError) => Promise<void>
  reportCrash: (error: Error, context?: Record<string, any>) => Promise<void>
}