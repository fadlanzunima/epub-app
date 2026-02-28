# Expo SDK Update Guide

This guide helps prevent compatibility issues when updating Expo SDK versions.

## Current Working Configuration

**Expo SDK Version:** 54
**Expo Go App Version:** SDK 54 (must match!)

## Critical Files to Preserve

### 1. babel.config.js
```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['react-native-worklets/plugin'],
};
```

**⚠️ Important:** With Reanimated v4+, use ONLY `react-native-worklets/plugin`. Do NOT add `react-native-reanimated/plugin` - it will cause duplicate plugin errors.

### 2. package.json Key Dependencies
```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-reanimated": "~4.1.1",
    "react-native-worklets": "^4.1.1"
  }
}
```

## Before Updating Expo SDK

### 1. Check Expo Go App Version
- Open Expo Go on your phone
- Check the SDK version it supports (shown in app settings or on startup)
- **MUST match** your project's SDK version

### 2. Backup Working Configuration
```bash
# Save current working package.json
copy package.json package.json.backup

# Save babel config
copy babel.config.js babel.config.js.backup
```

### 3. Clear All Caches
```bash
rmdir /s /q .expo
rmdir /s /q .metro
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
```

## Update Process

### Step 1: Update Expo
```bash
npx expo install expo@latest
```

### Step 2: Fix Dependencies
```bash
npx expo install --fix
```

If there are peer dependency conflicts:
```bash
npm install --legacy-peer-deps
```

### Step 3: Handle Reanimated/Worklets

**Check Reanimated version after update:**
- If v3.x: Use `plugins: ['react-native-reanimated/plugin']`
- If v4.x: Use `plugins: ['react-native-worklets/plugin']`

### Step 4: Clear Cache and Start
```bash
rmdir /s /q .expo
rmdir /s /q .metro
npx expo start --clear
```

## Common Issues & Solutions

### Issue: "Project is incompatible with this version of Expo Go"
**Cause:** Expo Go app SDK version doesn't match project SDK version
**Solution:** Either:
- Update project to match Expo Go's SDK version (recommended)
- Or install older Expo Go version from https://expo.dev/go

### Issue: "Cannot find module 'react-native-worklets/plugin'"
**Cause:** Missing worklets package (required by Reanimated v4+)
**Solution:**
```bash
npm install react-native-worklets --legacy-peer-deps
```

### Issue: "Duplicate plugin/preset detected"
**Cause:** Both reanimated and worklets plugins in babel.config.js
**Solution:** Use ONLY `react-native-worklets/plugin` for Reanimated v4+

### Issue: Java/IO errors
**Cause:** Corrupted Metro cache
**Solution:** Clear all caches (see section above)

## Version Compatibility Table

| Expo SDK | React Native | Reanimated | Babel Plugin |
|----------|--------------|------------|--------------|
| 52 | 0.76.x | 3.x | `react-native-reanimated/plugin` |
| 54 | 0.81.x | 4.x | `react-native-worklets/plugin` |

## Emergency Rollback

If update fails:
```bash
# Restore backups
copy package.json.backup package.json
copy babel.config.js.backup babel.config.js

# Reinstall
rmdir /s /q node_modules
del package-lock.json
npm install --legacy-peer-deps

# Clear cache
rmdir /s /q .expo
rmdir /s /q .metro
```

## Checklist Before Updating

- [ ] Backup package.json and babel.config.js
- [ ] Check Expo Go app SDK version
- [ ] Review Expo SDK release notes
- [ ] Check if major dependencies (Reanimated) have breaking changes
- [ ] Ensure stable internet connection for downloads
- [ ] Have this guide ready!

---

**Last Updated:** 2026-02-28
**Working SDK Version:** 54
