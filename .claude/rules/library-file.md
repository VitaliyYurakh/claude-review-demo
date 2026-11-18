---

paths:
- "src/main/**"

---

# Library file

- Write `library.json` only through `saveLibrary()`: it writes a temp file and renames it, so a crash mid-write does not corrupt the library. Never write to `dataFile()` directly.
