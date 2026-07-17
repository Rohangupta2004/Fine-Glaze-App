# Windows PowerShell Execution Rules

- **Restricted Execution Policies**: On Windows, PowerShell execution policies might prevent running `.ps1` wrapper scripts for standard command-line interfaces (e.g. `npm`, `npx`, `yarn`).
- **Use .cmd Workaround**: Proactively execute node package manager commands using their `.cmd` counterparts (e.g., `npm.cmd`, `npx.cmd`) to bypass execution policy errors.
