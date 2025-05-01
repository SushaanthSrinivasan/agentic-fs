# Agentic File System

## Overview

The **Agentic File System** is a smart, AI-driven tool designed to enhance file management for developers, researchers, and technical teams. Built using **TypeScript**, **React**, **Electron**, and **Vite**, the system empowers users to interact with their file system using natural language commands. Whether you're creating folders, writing to files, or deleting them, the agent handles the task seamlessly and intelligently.

## Features

### 1. **Agentic File Manipulation**

- **Create**, **write**, and **delete** files and folders with simple commands.
- AI-driven understanding of file structures and context.
- No need for terminal commands or file explorer—just tell the system what you want to do.

### 2. **Contextual Workspace Spawning**

- Automatically spins up a tailored "mini-workspace" when you start a new task or project (e.g., a new feature in a codebase).
- Filters relevant files, code snippets, templates, and CLI commands, allowing you to focus on what's important.
- Boosts productivity by reducing mental overhead and the need to search through large repositories.

### 3. **Memory Mode & Smart Recall**

- The agent remembers files based on their names and context, so you can refer to them later.
- You can say, "Remember this file," and the agent will store the reference.
- Later, ask, “What was that file with the Rust example?” and the agent will pull up the right document.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/agentic-file-system.git
   ```

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

# Architecture

- Frontend: Built with React and Electron to provide a desktop app interface.

- Backend: Custom AI agents built in TypeScript, interacting with the local file system.

- Memory: A simple memory store that logs file references for contextual recall.

- Command Interface: Natural language commands are parsed and executed through the system’s agent, integrating with the local CLI.

# Acknowledgements

- Electron: For providing the cross-platform framework to build the app.

- React: For the front-end user interface.

- Vite: For fast development and building.
