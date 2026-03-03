# Architecture Debug Flow Analysis

## Identified Issues & Data Flow Problems

### 1. ⚠️ Transaction Integrity Issue in Book Import Flow

**Location:** `src/services/BookService.ts:54-125`

**Problem:**
```
User selects file
    ↓
Copy file to app storage (Line 74)
    ↓
Extract metadata (Line 83-88)
    ↓
Save to database (Line 121) ← If this fails, file is ORPHANED!
```

**Risk:** If database save fails after file copy succeeds, the file remains in storage but book won't appear in library. Over time this creates storage bloat.

**Fix Required:**
- Add rollback/cleanup on database failure
- Or: Save to DB first, then copy file

---

### 2. ⚠️ Silent Error Handling

**Location:** Multiple files (`TrackingService.ts`, `SettingsService.ts`)

**Problem:** Errors are caught and logged but not re-thrown:
```typescript
catch (error) {
  console.error('Error:', error);
  // Missing: throw error; or return false/null
}
```

**Impact:** UI doesn't know operation failed - no user feedback.

**Files Affected:**
- `TrackingService.ts:36-37` - tracking status check fails silently
- `SettingsService.ts:32-33` - settings load fails silently
- `DeviceInfoService.ts:24-25` - device ID fetch fails silently

---

### 3. ⚠️ Database Initialization Race Condition

**Location:** `src/services/DatabaseService.ts:20-41`

**Problem:**
```typescript
async init(): Promise<void> {
  if (this.isInitializing && this.initPromise) {
    return this.initPromise; // Good: prevents double init
  }
  // But: No timeout mechanism - could hang indefinitely
}
```

**Risk:** If database init hangs, app becomes unresponsive.

---

### 4. ⚠️ WebView Communication Error Handling

**Location:** `src/screens/EpubReaderScreen.tsx:400-420`

**Problem:**
```typescript
try {
  const data = JSON.parse(event.nativeEvent.data);
  // If message format is wrong, error is caught but not reported to user
} catch (e) {
  console.error('WebView message error:', e);
  // Missing: User notification or recovery
}
```

**Impact:** WebView communication failures are invisible to users.

---

### 5. ⚠️ Memory Leak in PDF Reader

**Location:** `src/screens/PdfReaderScreen.tsx`

**Problem:** Base64 PDF data stored in state persists even after leaving screen.

**Risk:** Large PDFs (10MB+) in base64 (33% overhead) can cause memory issues.

---

### 6. ⚠️ Unhandled Promise Rejections

**Location:** Various screens

**Problem:** Several async operations lack `.catch()` or try/catch:
- Book cover image loading
- Library refresh operations
- Statistics calculation

---

## Recommended Fixes

### Fix 1: Add Transaction Rollback to Import Flow
```typescript
async importBook(sourcePath: string, fileType: BookFormat): Promise<Book> {
  const destPath = ...;
  let fileCopied = false;

  try {
    // Copy file
    await FileSystem.copyAsync({ from: sourcePath, to: destPath });
    fileCopied = true;

    // Extract and save
    const book = await this.createBook(destPath, fileType);
    await DatabaseService.addBook(book);
    return book;
  } catch (error) {
    // Rollback: Clean up copied file
    if (fileCopied) {
      await FileSystem.deleteAsync(destPath).catch(() => {});
    }
    throw error; // Re-throw for UI handling
  }
}
```

### Fix 2: Propagate Errors to UI
```typescript
catch (error) {
  console.error('Error:', error);
  throw error; // Add this
}
```

### Fix 3: Add Database Init Timeout
```typescript
private async doInitWithRetry(attempt: number = 1): Promise<void> {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('DB init timeout')), 10000)
  );
  await Promise.race([this.doInit(), timeout]);
}
```

### Fix 4: Clear PDF Base64 on Unmount
```typescript
useEffect(() => {
  return () => {
    setPdfBase64(''); // Clear on unmount
  };
}, []);
```

---

## Debug Flow Recommendations

1. **Add Operation IDs**: Tag each import/operation with unique ID for tracing
2. **Structured Logging**: Use log levels (debug/info/warn/error) consistently
3. **Error Boundaries**: Add React Error Boundaries for crash recovery
4. **State Inspection**: Add Redux/Zustand devtools for state debugging
5. **Network Monitoring**: Track WebView message latency and failures

---

## Files Requiring Attention

| File | Issues | Priority |
|------|--------|----------|
| `BookService.ts` | No transaction rollback | 🔴 High |
| `TrackingService.ts` | Silent failures | 🟡 Medium |
| `DatabaseService.ts` | No init timeout | 🟡 Medium |
| `EpubReaderScreen.tsx` | WebView error handling | 🟡 Medium |
| `PdfReaderScreen.tsx` | Memory leak | 🟡 Medium |
| `SettingsService.ts` | Silent failures | 🟢 Low |
