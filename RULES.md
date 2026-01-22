# Global Project Rules

1.  **File Size Limits**: Any file exceeding **200 lines** should be reviewed for refactoring. Break down large classes into smaller, focused components or use structural patterns (e.g., partial classes, strategy pattern).
2.  **Keep it focused**: Each class or component should have a **Single Responsibility**.
3.  **Async by Default**: Prefer `async/await` for all I/O-bound operations. Avoid `.Result` or `.Wait()`.
4.  **Dependency Injection**: Use Constructor Injection for all dependencies. Avoid static service locators.
5.  **Coding Standards**: Follow standard C# naming conventions (PascalCase for public, camelCase for private/locals).
