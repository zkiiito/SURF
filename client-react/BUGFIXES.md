# React Version Bug Fixes

## Round 1 Fixes

### Bug #1: Double-click/tap to Reply
**Issue:** No double-click handler on messages  
**Fixed in:** `MessageItem.tsx`  
**Solution:** Added `onDoubleClick` handler to table element

### Bug #2: Own Messages Marked as Unread
**Issue:** All incoming messages defaulted to unread  
**Fixed in:** `communicator.ts`  
**Solution:** Check if message is from current user before marking as unread

### Bug #3: Duplicate Avatars in Wave
**Issue:** `wave.userIds` array contained duplicates  
**Fixed in:** `waveStore.ts`  
**Solution:** Deduplicate user IDs using Set before mapping to users

## Round 2 Fixes

### Bug #4: Reply Forms Don't Close When Opening Another
**Issue:** Multiple reply forms could be open simultaneously  
**Fixed in:** `WaveView.tsx`, `MessageItem.tsx`  
**Solution:** 
- Moved reply form state management to `WaveView` level
- Track single `openReplyFormId` in state
- Pass handlers down to all `MessageItem` components
- Only one form can be open at a time

**Changes:**
```tsx
// WaveView.tsx
const [openReplyFormId, setOpenReplyFormId] = useState<string | null>(null)

const handleOpenReplyForm = (messageId: string) => {
  setOpenReplyFormId(messageId) // Closes others automatically
}

// MessageItem.tsx
<MessageItem 
  isReplyFormOpen={openReplyFormId === message._id}
  onOpenReplyForm={handleOpenReplyForm}
  onCloseReplyForm={handleCloseReplyForm}
/>
```

### Bug #5: Wave Message List Not Scrollable
**Issue:** Messages container had no overflow styling  
**Fixed in:** `App.css` (new file), `App.tsx`  
**Solution:** 
- Created `App.css` with proper overflow styling
- Set `.waves-container` to have `overflow-y: auto`
- Added fixed height calculation: `height: calc(100vh - 120px)`

**CSS Added:**
```css
.waves-container {
  overflow-y: auto;
  height: calc(100vh - 120px);
}
```

### Bug #6: No Current Wave Indication
**Issue:** No visual indicator of which wave is currently selected  
**Fixed in:** `WaveListItem.tsx`, `App.css`  
**Solution:**
- Use `useParams` to get current wave ID
- Add `active` class when wave is current
- Style active wave with background color and border

**Changes:**
```tsx
// WaveListItem.tsx
const { id } = useParams<{ id: string }>()
const isActive = id === wave._id

<Link className={`waveitem${isActive ? ' active' : ''}`}>
```

**CSS Added:**
```css
.waveitem.active {
  background-color: #e8e4f3;
  border-left: 3px solid #847099;
}

.waveitem.active h2 {
  color: #847099;
  font-weight: bold;
}
```

## Summary

All 6 bugs have been fixed:

✅ Double-click to reply works  
✅ Own messages not marked as unread  
✅ No duplicate avatars in waves  
✅ Only one reply form open at a time  
✅ Wave message list is scrollable  
✅ Current wave is highlighted in sidebar  

## Testing

Build passes successfully:
```bash
npm run build
# ✓ built in 597ms
# Bundle: 280.78 KB (89.78 KB gzipped)
```

All TypeScript checks pass with no errors.

