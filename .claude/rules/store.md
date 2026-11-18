---

paths:
- "src/renderer/src/store/**"

---

# Store

- Every store change goes through `mutate()` (or `patchReading` / `patchRoadmap`), otherwise it is not saved.
