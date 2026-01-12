import React, { useState, useEffect } from 'react'
import {
  ContentIntegrityService,
  DuplicateDetectionResult,
  FileIntegrityResult,
  ResolutionOptions,
  ResolutionResult
} from '../services/ContentIntegrityService'
import { FileSystemService } from '../services/FileSystemService'
import { StorageService } from '../services/StorageService'

interface ContentIntegrityManagerProps {
  fileSystemService: FileSystemService
  storageService: StorageService
}

interface ScanProgress {
  current: number
  total: number
  operation: string
}

export const ContentIntegrityManager: React.FC<ContentIntegrityManagerProps> = ({
  fileSystemService,
  storageService
}) => {
  const [integrityService] = useState(() =>
    new ContentIntegrityService(fileSystemService, storageService)
  )

  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<ScanProgress>({ current: 0, total: 100, operation: '' })
  const [duplicates, setDuplicates] = useState<DuplicateDetectionResult | null>(null)
  const [integrity, setIntegrity] = useState<FileIntegrityResult | null>(null)
  const [resolutionResult, setResolutionResult] = useState<ResolutionResult | null>(null)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Set up event listeners
    const handleScanProgress = (progress: ScanProgress) => {
      setScanProgress(progress)
    }

    const handleDuplicatesFound = (result: DuplicateDetectionResult) => {
      setDuplicates(result)
    }

    const handleIntegrityComplete = (result: FileIntegrityResult) => {
      setIntegrity(result)
    }

    const handleResolutionComplete = (result: ResolutionResult) => {
      setResolutionResult(result)
      setIsScanning(false)
    }

    integrityService.on('scanProgress', handleScanProgress)
    integrityService.on('duplicatesFound', handleDuplicatesFound)
    integrityService.on('integrityCheckComplete', handleIntegrityComplete)
    integrityService.on('resolutionComplete', handleResolutionComplete)

    return () => {
      integrityService.off('scanProgress', handleScanProgress)
      integrityService.off('duplicatesFound', handleDuplicatesFound)
      integrityService.off('integrityCheckComplete', handleIntegrityComplete)
      integrityService.off('resolutionComplete', handleResolutionComplete)
    }
  }, [integrityService])

  const runFullHealthCheck = async () => {
    setIsScanning(true)
    setError(null)
    setDuplicates(null)
    setIntegrity(null)
    setRecommendations([])

    try {
      const report = await integrityService.generateContentHealthReport()
      setDuplicates(report.duplicates)
      setIntegrity(report.integrity)
      setRecommendations(report.recommendations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsScanning(false)
    }
  }

  const runQuickCheck = async () => {
    setIsScanning(true)
    setError(null)

    try {
      const result = await integrityService.quickHealthCheck()

      if (result.hasIssues) {
        setRecommendations([
          `Found ${result.duplicateCount} duplicate files`,
          `Found ${result.corruptedCount} corrupted files`,
          `Found ${result.missingCount} missing files`,
          'Run full health check for detailed analysis'
        ])
      } else {
        setRecommendations(['Your content library is healthy!'])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsScanning(false)
    }
  }

  const resolveIssues = async (options: ResolutionOptions) => {
    if (!duplicates || !integrity) {
      setError('Please run a health check first')
      return
    }

    setIsScanning(true)
    setError(null)

    try {
      const result = await integrityService.resolveContentIssues(duplicates, integrity, options)
      setResolutionResult(result)

      // Update recommendations based on resolution
      const newRecommendations = []
      if (result.duplicatesRemoved > 0) {
        newRecommendations.push(`Removed ${result.duplicatesRemoved} duplicate files`)
      }
      if (result.corruptedRemoved > 0) {
        newRecommendations.push(`Removed ${result.corruptedRemoved} corrupted files`)
      }
      if (result.spaceSaved > 0) {
        const spaceMB = Math.round(result.spaceSaved / (1024 * 1024))
        newRecommendations.push(`Saved ${spaceMB} MB of storage space`)
      }
      if (result.redownloadRequired.length > 0) {
        newRecommendations.push(`${result.redownloadRequired.length} files need to be re-downloaded`)
      }
      if (result.errors.length > 0) {
        newRecommendations.push(`${result.errors.length} errors occurred during resolution`)
      }

      setRecommendations(newRecommendations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsScanning(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`
  }

  return (
    <div className="content-integrity-manager">
      <div className="header">
        <h2>Content Integrity Manager</h2>
        <p>Manage duplicate files and verify content integrity</p>
      </div>

      <div className="actions">
        <button
          onClick={runQuickCheck}
          disabled={isScanning}
          className="btn btn-secondary"
        >
          Quick Health Check
        </button>
        <button
          onClick={runFullHealthCheck}
          disabled={isScanning}
          className="btn btn-primary"
        >
          Full Health Check
        </button>
      </div>

      {isScanning && (
        <div className="progress-section">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${scanProgress.current}%` }}
            />
          </div>
          <p>{scanProgress.operation} ({scanProgress.current}%)</p>
        </div>
      )}

      {error && (
        <div className="error-section">
          <h3>Error</h3>
          <p className="error-message">{error}</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>Recommendations</h3>
          <ul>
            {recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {duplicates && (
        <div className="duplicates-section">
          <h3>Duplicate Files</h3>
          <div className="stats">
            <p>Total Files: {duplicates.totalFiles}</p>
            <p>Duplicate Files: {duplicates.totalDuplicates}</p>
            <p>Potential Space Saved: {formatFileSize(duplicates.potentialSpaceSaved)}</p>
          </div>

          {duplicates.duplicateGroups.size > 0 && (
            <div className="duplicate-groups">
              <h4>Duplicate Groups</h4>
              {Array.from(duplicates.duplicateGroups.entries()).slice(0, 5).map(([hash, files], index) => (
                <div key={index} className="duplicate-group">
                  <p><strong>Group {index + 1}:</strong> {files.length} files</p>
                  <ul>
                    {files.map((file, fileIndex) => (
                      <li key={fileIndex} className="file-path">{file}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {duplicates.duplicateGroups.size > 5 && (
                <p>... and {duplicates.duplicateGroups.size - 5} more groups</p>
              )}
            </div>
          )}
        </div>
      )}

      {integrity && (
        <div className="integrity-section">
          <h3>File Integrity</h3>
          <div className="stats">
            <p>Total Files: {integrity.totalFiles}</p>
            <p>Valid Files: {integrity.validFiles}</p>
            <p>Corrupted Files: {integrity.corruptedFiles.length}</p>
            <p>Missing Files: {integrity.missingFiles.length}</p>
          </div>

          {integrity.corruptedFiles.length > 0 && (
            <div className="corrupted-files">
              <h4>Corrupted Files</h4>
              <ul>
                {integrity.corruptedFiles.slice(0, 10).map((file, index) => (
                  <li key={index} className="file-path">{file}</li>
                ))}
                {integrity.corruptedFiles.length > 10 && (
                  <li>... and {integrity.corruptedFiles.length - 10} more files</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {duplicates && integrity && (
        <div className="resolution-section">
          <h3>Resolve Issues</h3>
          <div className="resolution-options">
            <button
              onClick={() => resolveIssues({
                removeDuplicates: true,
                removeCorrupted: true,
                redownloadMissing: false,
                createBackup: false
              })}
              disabled={isScanning}
              className="btn btn-warning"
            >
              Remove Duplicates & Corrupted Files
            </button>
            <button
              onClick={() => resolveIssues({
                removeDuplicates: true,
                removeCorrupted: true,
                redownloadMissing: true,
                createBackup: false
              })}
              disabled={isScanning}
              className="btn btn-danger"
            >
              Full Cleanup & Mark for Redownload
            </button>
          </div>
        </div>
      )}

      {resolutionResult && (
        <div className="resolution-result">
          <h3>Resolution Results</h3>
          <div className="stats">
            <p>Duplicates Removed: {resolutionResult.duplicatesRemoved}</p>
            <p>Corrupted Files Removed: {resolutionResult.corruptedRemoved}</p>
            <p>Space Saved: {formatFileSize(resolutionResult.spaceSaved)}</p>
            <p>Files Marked for Redownload: {resolutionResult.redownloadRequired.length}</p>
          </div>

          {resolutionResult.errors.length > 0 && (
            <div className="resolution-errors">
              <h4>Errors</h4>
              <ul>
                {resolutionResult.errors.map((error, index) => (
                  <li key={index} className="error-message">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}